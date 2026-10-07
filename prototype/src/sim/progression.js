'use strict';
// ---------------------------------------------------------------------------
// Boss rewards (docs/META_LOOP.md): trophies raise the village level, eagles
// unlock new systems. Every 5th wave is a mini-boss, every 10th a mega-boss.
// ---------------------------------------------------------------------------
const MAX_TOWN = GAME_DATA.progression.village.max;
const SYSTEMS = GAME_DATA.progression.systems; // see data/progression.json

function bossReward(wave) {
  const bosses = GAME_DATA.progression.bosses;
  if (wave % bosses.megaEvery === 0) return { ...bosses.mega };
  if (wave % bosses.miniEvery === 0) return { ...bosses.mini };
  return null;
}

// Village level L needs the boss of wave 5·(L−1) beaten and one trophy.
function townWaveRequirement(level) {
  return 5 * (level - 1);
}

// The village must keep up with the frontier: wave w needs village 1 + ⌊(w−1)/5⌋.
function requiredTown(wave) {
  return Math.min(MAX_TOWN, 1 + Math.floor((wave - 1) / 5));
}

function canUpgradeTown() {
  const next = state.townLevel + 1;
  return state.phase !== 'wave' && state.townLevel < MAX_TOWN && state.trophies >= 1
    && state.wavesCleared >= townWaveRequirement(next);
}

function systemUnlocked(id) {
  return state.systems.includes(id);
}

function canUnlockSystem(id) {
  const sys = SYSTEMS.find((item) => item.id === id);
  return Boolean(sys) && !sys.soon && !systemUnlocked(id) && state.phase !== 'wave' && state.eagles >= 1 && state.wavesCleared >= sys.wave;
}

function unlockSystem(id) {
  if (!canUnlockSystem(id)) return false;
  const sys = SYSTEMS.find((item) => item.id === id);
  state.eagles -= 1;
  state.systems.push(id);
  recordStat('buy', { item: `system-${id}` });
  showNotice('EAGLE OFFERED', `${sys.name.toUpperCase()} OPENED`, sys.text);
  emit('sfx', { name: 'fanfare' });
  return true;
}

// ---------------------------------------------------------------------------
// Armory (eagle of wave 10): bosses drop gear, elites sometimes. Three slots per
// hero. Weapon: +% damage. Armour: −% damage taken. Charm: −% spell cooldown.
// ---------------------------------------------------------------------------
const GEAR_SLOTS = GAME_DATA.systems.armory.slots;
const RARITY = GAME_DATA.systems.armory.rarity;
const ELITE_DROP_EVERY = GAME_DATA.systems.armory.eliteDropEvery; // every Nth elite kill drops an item   // every 6th elite kill (troll / elite orc) drops an item

function gearRarityFor(wave, mega) {
  if (wave >= 30) return mega ? 2 : 1;
  if (wave >= 20) return mega ? 1 : (wave >= 25 ? 1 : 0);
  return mega ? 1 : 0;
}

function dropGear(wave, mega) {
  const order = ['weapon', 'armor', 'charm'];
  const slot = order[state.gearDrops % order.length];
  const rarity = gearRarityFor(wave, mega);
  const item = { id: state.gearDrops + 1, slot, rarity, owner: null };
  state.gearDrops += 1;
  state.gear.push(item);
  return item;
}

function gearName(item) {
  return GEAR_SLOTS[item.slot].names[item.rarity];
}

function gearBonus(heroId, slot) {
  return state.gear.filter((item) => item.owner === heroId && item.slot === slot)
    .reduce((sum, item) => sum + GEAR_SLOTS[item.slot].values[item.rarity], 0);
}

// Give the item to the next hero in line (or take it off). One item per slot per hero.
function cycleGearOwner(itemId) {
  if (state.phase === 'wave') return false;
  const item = state.gear.find((entry) => entry.id === itemId);
  if (!item) return false;
  const heroes = Object.keys(heroDefs).filter((id) => state.heroes[id].unlocked && !heroDefs[id].machine);
  const order = [null, ...heroes];
  const next = order[(order.indexOf(item.owner) + 1) % order.length];
  if (next) for (const other of state.gear) if (other !== item && other.owner === next && other.slot === item.slot) other.owner = null;
  item.owner = next;
  return true;
}

// Best items to the heroes on the field, front first.
function autoEquip() {
  if (state.phase === 'wave') return;
  for (const item of state.gear) item.owner = null;
  const heroes = activeHeroes().filter((id) => !heroDefs[id].machine);
  for (const slot of Object.keys(GEAR_SLOTS)) {
    const items = state.gear.filter((item) => item.slot === slot).sort((a, b) => b.rarity - a.rarity);
    heroes.forEach((id, i) => { if (items[i]) items[i].owner = id; });
  }
}

// ---------------------------------------------------------------------------
// Barracks (eagle of wave 20): every hero trains with food, levels without a cap.
// Temple (eagle of wave 30): offerings to three gods, each with its own levels.
// ---------------------------------------------------------------------------
const BARRACKS = GAME_DATA.systems.barracks;
const GODS = GAME_DATA.systems.gods;

function heroLevel(id) {
  return (state.heroes[id] && state.heroes[id].level) || 1;
}

function trainPrice(id) {
  return Math.round(BARRACKS.base * Math.pow(BARRACKS.growth, heroLevel(id) - 1));
}

function canTrain(id) {
  const hero = state.heroes[id];
  return systemUnlocked('barracks') && hero && hero.unlocked && !heroDefs[id].machine
    && state.phase !== 'wave' && state.food >= trainPrice(id);
}

function trainHero(id) {
  if (!canTrain(id)) return false;
  state.food -= trainPrice(id);
  state.heroes[id].level = heroLevel(id) + 1;
  recordStat('buy', { item: `train-${id}`, level: heroLevel(id) });
  return true;
}

function offeringPrice(god) {
  const def = GODS[god];
  return Math.round(def.base * Math.pow(def.growth, state.temple[god]));
}

function canOffer(god) {
  return systemUnlocked('temple') && Boolean(GODS[god]) && state.phase !== 'wave'
    && state[GODS[god].resource] >= offeringPrice(god);
}

function makeOffering(god) {
  if (!canOffer(god)) return false;
  state[GODS[god].resource] -= offeringPrice(god);
  state.temple[god] += 1;
  recordStat('buy', { item: `offer-${god}`, level: state.temple[god] });
  return true;
}

function godBonus(god) {
  const def = GODS[god];
  return Math.min(def.cap ?? Infinity, def.per * state.temple[god]);
}

// One multiplier for every source of hero damage: fatigue/rest, gear, training, Mars.
function heroDamageMult(id) {
  return heroPowerMult(id) * (1 + gearBonus(id, 'weapon')) * (1 + BARRACKS.damage * (heroLevel(id) - 1)) * (1 + godBonus('mars'));
}

// Food per farm tick (every 3 s), with Ceres.
function foodPerTick() {
  return Math.round(state.farmLevel * (1 + godBonus('ceres')));
}

function upgradeTown() {
  if (!canUpgradeTown()) return;
  state.trophies -= 1;
  state.townLevel += 1;
  recordStat('buy', { item: 'village', level: state.townLevel });
  applyUnlocks();
}
