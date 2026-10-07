'use strict';
 // relative to the legionary

// ---------------------------------------------------------------------------
// Heroes, slots and rotation (GAME_DESIGN: «Герои, слоты и ротация»).
// A hero is a unit with its own spell. Upgrades belong to the slot, so a
// substitute fights at the same level and rotation never costs resources.
// The catapult is a tower machine: no spell and it never gets tired.
// ---------------------------------------------------------------------------
const HOPLITE_UNLOCK_WAVE = GAME_DATA.heroes.hopliteUnlockWave;
const RESTED_BONUS = GAME_DATA.heroes.fatigue.restedBonus;      // «Свежие силы»: +damage for one wave      // «Свежие силы»: +25% damage for one wave
const FATIGUE_PENALTY = GAME_DATA.heroes.fatigue.penaltyPerWave; // per wave beyond the first in a row    // per wave beyond the first in a row
const FATIGUE_MAX = GAME_DATA.heroes.fatigue.max;
const heroDefs = GAME_DATA.heroes.heroes; // see data/heroes.json
const slotDefs = GAME_DATA.heroes.slots;
const BASH_STUN = GAME_DATA.heroes.spells.shieldBash.stun;
const BASH_KNOCK = GAME_DATA.heroes.spells.shieldBash.knockback;
const HOLD_LINE_TIME = GAME_DATA.heroes.spells.holdLine.seconds;
const HOLD_LINE_TAKEN = GAME_DATA.heroes.spells.holdLine.damageTaken;
const BLESSING_HEAL = GAME_DATA.heroes.spells.blessing.healShare;

function freshHeroes() {
  const heroes = {};
  for (const id of Object.keys(heroDefs)) heroes[id] = { unlocked: id === 'legionary', fatigue: 0, rested: false, cd: 0, level: 1 };
  return heroes;
}

function slotUnlocked(role) {
  if (role === 'front') return true;
  if (role === 'tower') return state.archerUnlocked || state.catapultUnlocked;
  return state.townLevel >= 4;
}

function slotHero(role) {
  if (!slotUnlocked(role)) return null;
  if (role === 'front') return state.frontHero;
  if (role === 'tower') return state.towerSlot;
  return state.supportHero;
}

function activeHeroes() {
  return slotDefs.map((slot) => slotHero(slot.role)).filter(Boolean);
}

function heroesForRole(role) {
  return Object.keys(heroDefs).filter((id) => heroDefs[id].role === role && state.heroes[id].unlocked);
}

// Rotation only matters when someone could take the slot over.
function roleHasBench(role) {
  return heroesForRole(role).length > 1;
}

function heroPowerMult(id) {
  const hero = state.heroes[id];
  if (!hero || heroDefs[id].machine) return 1;
  if (hero.rested) return 1 + RESTED_BONUS;
  return 1 - FATIGUE_PENALTY * Math.max(0, hero.fatigue - 1);
}

function heroCondition(id) {
  const hero = state.heroes[id];
  if (heroDefs[id].machine) return { label: 'never tires', tone: 'neutral' };
  if (hero.rested) return { label: `rested +${Math.round(RESTED_BONUS * 100)}%`, tone: 'good' };
  if (hero.fatigue >= 2) return { label: `tired −${Math.round(FATIGUE_PENALTY * (hero.fatigue - 1) * 100)}%`, tone: 'bad' };
  if (hero.fatigue === 1 && roleHasBench(heroDefs[id].role)) return { label: '1 wave in a row', tone: 'neutral' };
  return { label: 'fit', tone: 'neutral' };
}

function frontName() {
  return heroDefs[state.frontHero].name;
}

function cycleSlot(role) {
  if (state.phase === 'wave' || !slotUnlocked(role)) return false;
  const options = heroesForRole(role);
  if (options.length < 2) return false;
  const current = slotHero(role);
  const next = options[(options.indexOf(current) + 1) % options.length];
  if (role === 'front') state.frontHero = next;
  else if (role === 'tower') state.towerSlot = next;
  else state.supportHero = next;
  return true;
}

// Put the freshest hero into every slot: used by the balance bot and the «Авто» button.
function autoLineup() {
  if (state.phase === 'wave') return;
  for (const slot of slotDefs) {
    if (!slotUnlocked(slot.role)) continue;
    const options = heroesForRole(slot.role);
    if (!options.length) continue;
    // Tower options have their own upgrade levels, so compare level × freshness there.
    const value = (id) => heroPowerMult(id) * (slot.role === 'tower' ? Math.max(1, state[`${id}Level`] || 0) : 1);
    const best = options.reduce((a, b) => (value(b) > value(a) ? b : a), slotHero(slot.role) || options[0]);
    if (slot.role === 'front') state.frontHero = best;
    else if (slot.role === 'tower') state.towerSlot = best;
    else state.supportHero = best;
  }
}

// Called once per finished or failed wave.
function applyWaveFatigue() {
  const active = new Set(activeHeroes());
  for (const [id, hero] of Object.entries(state.heroes)) {
    if (!hero.unlocked || heroDefs[id].machine) continue;
    if (active.has(id)) {
      hero.rested = false;
      hero.fatigue = roleHasBench(heroDefs[id].role) ? Math.min(FATIGUE_MAX, hero.fatigue + 1) : 0;
    } else {
      hero.fatigue = 0;
      hero.rested = true;
    }
  }
}

function prepareHeroesForWave() {
  for (const id of activeHeroes()) {
    const def = heroDefs[id];
    if (!def.spell) continue;
    const hero = state.heroes[id];
    // A rested hero walks in with the spell charged; others need half a cooldown.
    hero.cd = hero.rested ? 0 : Math.max(hero.cd, def.spell.cooldown * 0.5);
  }
}

function unlockHero(id, kicker, subtitle) {
  if (state.heroes[id].unlocked) return;
  state.heroes[id].unlocked = true;
  showNotice(kicker, `NEW HERO · ${heroDefs[id].name.toUpperCase()}`, subtitle);
}

function spellBlocked(id) {
  const def = heroDefs[id];
  if (!def || !def.spell || !state.heroes[id].unlocked) return 'none';
  if (!activeHeroes().includes(id)) return 'benched';
  if (!state.running) return 'paused';
  if (state.heroes[id].cd > 0) return `${Math.ceil(state.heroes[id].cd)} s`;
  if (def.spell.id === 'blessing') return state.guardHp > 0 && state.guardHp < state.maxGuardHp ? null : 'full HP';
  if (def.spell.id === 'shieldBash') return bashTarget(1170) ? null : 'no target';
  if (def.spell.id === 'volley' && state.volleyFx > 0) return 'in flight';
  return aliveMobs().length ? null : 'no enemies';
}

function bashTarget(width) {
  const guardX = width * 0.52;
  return aliveMobs().reduce((lead, mob) => (
    mob.x > guardX - 150 && mob.x < guardX - 10 && (!lead || mob.x > lead.x) ? mob : lead
  ), null);
}

function castSpell(id, width = 1170) {
  if (spellBlocked(id)) return false;
  const def = heroDefs[id];
  const guardX = width * 0.52;
  const mult = heroDamageMult(id);
  if (def.spell.id === 'shieldBash') {
    const target = bashTarget(width);
    const boss = enemyTypes[target.type]?.isBoss;
    const dealt = damageMob(target, 2 * state.guardLevel * mult, 'melee');
    target.stun = boss ? 1.2 : BASH_STUN;
    target.knock = boss ? 40 : BASH_KNOCK;
    target.attackCooldown = Math.max(target.attackCooldown, target.stun);
    state.bashFx = 0.4;
    markHint('bash');
    emit('sfx', { name: 'bash' });
    state.shake = Math.max(state.shake, 0.18);
    state.floaters.push({ kind: 'bash', amount: Math.round(dealt * 10) / 10, x: guardX - 60, life: 1.2, duration: 1.2 });
  } else if (def.spell.id === 'holdLine') {
    state.holdLine = HOLD_LINE_TIME;
    emit('sfx', { name: 'shield' });
    state.floaters.push({ kind: 'hold', amount: 70, x: guardX, life: 1.4, duration: 1.4 });
  } else if (def.spell.id === 'volley') {
    const difficulty = state.phase === 'wave' ? getWaveDifficulty(state.wave) : { hp: 1 };
    state.volleyDamage = Math.ceil(4 * difficulty.hp * mult);
    state.volleyFx = VOLLEY_FALL;
    emit('sfx', { name: 'volley' });
  } else if (def.spell.id === 'blessing') {
    const heal = Math.round(state.maxGuardHp * BLESSING_HEAL * mult);
    state.guardHp = Math.min(state.maxGuardHp, state.guardHp + heal);
    state.blessFx = 0.8;
    emit('sfx', { name: 'bless' });
    state.floaters.push({ kind: 'bless', amount: heal, x: guardX, life: 1.4, duration: 1.4 });
  }
  state.heroes[id].cd = def.spell.cooldown * (1 - Math.min(0.5, gearBonus(id, 'charm'))) * (1 - godBonus('minerva'));
  return true;
}

// Every hit on the frontline hero goes through here (melee and enemy arrows).
function hurtGuard(raw, guardX) {
  let damage = raw * (heroDefs[state.frontHero].guardTaken ?? 1) * (1 - Math.min(0.6, gearBonus(state.frontHero, 'armor')))
    / (1 + BARRACKS.toughness * (heroLevel(state.frontHero) - 1));
  if (state.holdLine > 0) damage *= HOLD_LINE_TAKEN;
  damage = Math.max(1, Math.round(damage));
  state.guardHp = Math.max(0, state.guardHp - damage);
  state.floaters.push({ kind: 'hurt', amount: damage, x: guardX, life: 1.05, duration: 1.05 });
  emit('sfx', { name: 'hurt' });
  return damage;
}

state.heroes = freshHeroes();

// Simple «Авто» policy: also used by the balance bot.
function autoCastSpells(width = 1170) {
  const guardX = width * 0.52;
  for (const id of activeHeroes()) {
    const spell = heroDefs[id].spell;
    if (!spell || spellBlocked(id)) continue;
    if (spell.id === 'volley' && !aliveMobs().some((m) => m.x > guardX - 400 && m.x < guardX - 20)) continue;
    if (spell.id === 'holdLine' && !aliveMobs().some((m) => m.x >= guardX - 80 - (m.formationX ?? 0) - 1)) continue;
    if (spell.id === 'blessing' && state.guardHp > state.maxGuardHp * 0.5) continue;
    castSpell(id, width);
  }
}
