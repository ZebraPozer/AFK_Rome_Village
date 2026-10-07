'use strict';
const state = {
  townLevel: 1, patrolKills: 0, regenDelay: 0, regenFlash: 0, regenParticleTimer: 0,
  running: true,
  speed: 1,
  wave: 1,
  phase: 'preparation',
  guardHp: 100,
  maxGuardHp: 100,
  food: 0,
  coins: 0,
  kills: 0,
  guardLevel: 1,
  spikesLevel: 0,
  farmLevel: 1,
  waveTotal: 0,
  spawned: 0,
  defeated: 0,
  archerUnlocked: false,
  archerLevel: 0,
  archerCooldown: 0,
  arrows: [],
  volleyFx: 0,
  volleyDamage: 0,
  shake: 0,
  towerSlot: null,
  catapultUnlocked: false,
  catapultLevel: 0,
  catapultCooldown: 0,
  rocks: [],
  enemyShots: [],
  dust: [],
  notice: null,
  heroes: null, // filled by freshHeroes() once heroDefs exist
  frontHero: 'legionary',
  supportHero: null,
  autoSpells: false,
  holdLine: 0,
  bashFx: 0,
  blessFx: 0,
  hornFx: 0,
  hintsSeen: [],
  trophies: 0,
  eagles: 0,
  systems: [],
  gear: [],
  gearDrops: 0,
  eliteKills: 0,
  temple: { mars: 0, ceres: 0, minerva: 0 },
  towerFx: 0,
  wavePlan: [],
  waveDifficulties: {},
  mobs: [],
  spawnTimer: 0.6,
  patrolTimer: 4,
  patrolSpawned: 0,
  foodTimer: 3,
  attackCooldown: 0,
  attackTimer: 0,
  hitFlash: 0,
  floaters: [],
  time: 0,
  last: 0,
  // Village growth: stage is derived from cleared waves; override is a debug shortcut.
  wavesCleared: 0,
  villageStage: 1,
  stageOverride: null,
  growthFx: 0,
  growthBanner: 0
};

// Settlement growth is claimed after the bosses of waves 5 and 10.
const villageStages = {
  1: 'Camp',
  2: 'Village',
  3: 'Thriving Town'
};
const GROWTH_POP = 0.9;
const GROWTH_BANNER = 3.2;

function computeVillageStage() {
  if (state.stageOverride) return state.stageOverride;
  return Math.min(3, state.townLevel); // three drawn stages so far; more need modular art
}

function spawnMob(type = 'orc', countsForWave = true) {
  const stats = enemyTypes[type] || enemyTypes.orc;
  // Ambient patrols stay weak; only finite waves use the locked difficulty.
  const difficulty = countsForWave ? getWaveDifficulty(state.wave) : { hp: 1, damage: 1 };
  const hp = Math.round(stats.hp * difficulty.hp);
  // Spread each wave across shallow depth lanes so the horde does not run
  // through the battlefield as one overlapping horizontal line.
  const laneOffsets = [-24, 14, -8, 26, 3, -18, 20];
  const spawnIndex = countsForWave ? state.spawned : state.patrolSpawned;
  const laneY = stats.isBoss ? 0 : laneOffsets[spawnIndex % laneOffsets.length];
  // Ranged orcs keep wide gaps, so a single catapult rock rarely hits more than one.
  const formationX = stats.isBoss ? 0 : (spawnIndex % 4) * (traitsOf(type).includes('ranged') ? 45 : 14);
  state.mobs.push({
    x: -70, laneY, formationX, attackMotion: 0,
    bob: simRandom() * Math.PI * 2, hit: 0, dead: false, type,
    countsForWave,
    hp,
    maxHp: hp,
    damage: Math.round(stats.damage * difficulty.damage),
    attackRate: stats.attackRate,
    speed: stats.speed,
    reward: stats.reward,
    loot: stats.loot,
    attackCooldown: simRandom() * 0.35,
    barrier: 0,
    charged: false,
    auraTimer: 2.5,
    auraFx: 0
  });
}

function startWave() {
  if (state.phase === 'wave' || state.phase === 'complete' || state.townLevel < requiredTown(state.wave)) return;
  if (state.phase === 'defeat') markHint('defeat');
  clearProjectiles();
  state.attackCooldown = 0;
  state.attackTimer = 0;
  state.regenDelay = 0;
  state.regenFlash = 0;
  state.floaters = state.floaters.filter(floater => floater.kind !== 'heal');
  // Keep the first attempt's stats on retries so upgrades can overcome a defeat.
  state.waveDifficulties[state.wave] = getWaveDifficulty(state.wave);
  state.phase = 'wave';
  state.running = true;
  state.guardHp = state.maxGuardHp; // always enter a wave at full health
  state.mobs = [];
  state.wavePlan = buildWavePlan(state.wave);
  state.waveTotal = state.wavePlan.length;
  state.spawned = 0;
  state.defeated = 0;
  state.spawnTimer = 0.2;
  state.holdLine = 0;
  prepareHeroesForWave();
  state.hornFx = HORN_TIME;
  markHint('call');
  if (isBossWave(state.wave)) markHint('boss');
  stats.waveStartedAt = state.time;
  state.shake = Math.max(state.shake, 0.2);
  emit('sfx', { name: 'horn' });
}

// ---------------------------------------------------------------------------
// Sound: everything is synthesized with Web Audio, no sound files.
// Silently does nothing where Web Audio is unavailable (tests, old browsers).
// ---------------------------------------------------------------------------
const HORN_TIME = 1.6;

function isBossWave(wave) {
  return buildWavePlan(wave).some((type) => enemyTypes[type]?.isBoss);
}

function nextWaveInfo(next) {
  return `${isBossWave(next) ? `Next: BOSS (wave ${next})` : `Next: wave ${next}`} · frontline lv ${recommendedLevel(next)} recommended`;
}

// Every first clear gets its own small moment; bosses get a big one.
function announceVictory(reward, loot) {
  const boss = buildWavePlan(state.wave).find((type) => enemyTypes[type]?.isBoss);
  const next = state.wave + 1;
  const lootText = loot ? `+${loot.trophies} ${loot.trophies > 1 ? 'trophies' : 'trophy'}${loot.eagles ? ` · +${loot.eagles} eagle` : ''}${loot.items ? ` · ${loot.items.map(gearName).join(', ')}` : ''} · ` : '';
  const after = lootText + (state.phase === 'complete' ? 'Every wave held — the frontier is safe'
    : canUpgradeTown() ? 'Raise your village in Upgrades'
    : state.wave === 3 ? 'Spikes unlocked · build them in Upgrades'
    : nextWaveInfo(next));
  if (boss) showNotice('BOSS DEFEATED', `${wavePreviewNames[boss].toUpperCase()} FALLS · +${reward} GOLD`, after);
  else showNotice(`WAVE ${state.wave} CLEARED`, `+${reward} GOLD`, after);
}

function finishWave() {
  state.regenDelay = 0.35;
  state.phase = state.wave === FINAL_WAVE ? 'complete' : 'victory';
  state.running = true;
  const gold = GAME_DATA.waves.firstClearGold;
  const reward = state.wave > state.wavesCleared ? gold.base + state.wave * gold.perWave : 0;
  state.wavesCleared = Math.max(state.wavesCleared, state.wave);
  state.coins += reward;
  if (reward) state.floaters.push({ kind: 'reward', amount: reward, x: 585, life: 1.8, duration: 1.8 });
  emit('sfx', { name: 'fanfare', option: reward > 0 });
  recordStat('wave', { result: 'victory', first: reward > 0, seconds: Math.round(state.time - stats.waveStartedAt), hp: Math.round(state.guardHp / state.maxGuardHp * 100), guard: state.guardLevel });
  const loot = reward ? bossReward(state.wave) : null;
  if (loot) {
    state.trophies += loot.trophies;
    state.eagles += loot.eagles;
    if (systemUnlocked('armory')) {
      const items = Array.from({ length: loot.eagles ? 2 : 1 }, () => dropGear(state.wave, Boolean(loot.eagles)));
      loot.items = items;
    }
  }
  if (reward) announceVictory(reward, loot);
  state.patrolTimer = 5;
  clearProjectiles();
  applyWaveFatigue();
  if (state.wavesCleared >= HOPLITE_UNLOCK_WAVE) {
    unlockHero('hoplite', 'REINFORCEMENTS', 'Can hold the front instead of the Legionary · rested heroes hit harder');
  }
}
// The boss-gated town opens new hero slots: tower at II, wall at III.
function applyUnlocks() {
  if (state.townLevel >= 2 && !state.archerUnlocked) {
    state.archerUnlocked = true;
    state.archerLevel = 1;
    state.towerSlot = 'archer';
    state.catapultUnlocked = true;
    state.catapultLevel = 1;
    state.towerFx = TOWER_POP;
    state.heroes.archer.unlocked = true;
    state.heroes.catapult.unlocked = true;
    state.heroes.archer.cd = 0;
    showNotice('TOWN II', 'NEW HERO · ARCHER', 'Tower slot: Archer with Volley, or the Catapult · key 2');
  }
  if (state.townLevel >= 4 && !state.heroes.priestess.unlocked) {
    state.supportHero = 'priestess';
    unlockHero('priestess', 'VILLAGE 4', 'Third slot: Wall · Blessing heals the frontline · key 3');
  }
}
function showNotice(kicker, title, subtitle) {
  const notice = { kicker, title, subtitle, t: NOTICE_TIME };
  if (!state.notice) state.notice = notice;
  else {
    let last = state.notice;
    while (last.next) last = last.next;
    last.next = notice;
  }
}

function failWave() {
  state.regenDelay = 0.35;
  state.phase = 'defeat';
  state.running = true;
  state.mobs = [];
  clearProjectiles();
  state.guardHp = Math.ceil(state.maxGuardHp * 0.3);
  state.holdLine = 0;
  const rec = recommendedLevel(state.wave);
  state.notice = null; // the defeat message replaces anything queued
  recordStat('wave', { result: 'defeat', seconds: Math.round(state.time - stats.waveStartedAt), hp: 0, guard: state.guardLevel });
  showNotice('DEFEAT', `${frontName().toUpperCase()} FELL`, state.guardLevel < rec
    ? `Upgrade the frontline to lv ${rec}, then retry`
    : state.townLevel < 2 ? 'Build spikes and time your Bash, then retry'
    : 'Upgrade the tower or spikes and use your spells, then retry');
  applyWaveFatigue();
}

function clearProjectiles() {
  state.arrows = [];
  state.rocks = [];
  state.enemyShots = [];
  state.dust = [];
  state.volleyFx = 0;
  state.volleyDamage = 0;
}
