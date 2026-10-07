'use strict';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const ui = Object.fromEntries([
  'food','coins','wave','kills','mob-count','pause','speed',
  'reset','wave-button','wave-difficulty','wave-preview','boss-progress','specialization-note','state-label','live-dot','guard-status','farm-status','loading',
  'guard-upgrade','spikes-upgrade','farm-upgrade','guard-level','spikes-level','farm-level',
  'guard-cost','spikes-cost','farm-cost','guard-health-value','guard-health-bar','archer-row','archer-status','archer-note',
  'spell-bar','lineup','auto-lineup','auto-spells',
  'archer-upgrade','archer-level','archer-cost',
  'catapult-upgrade','catapult-level','catapult-cost','tower-slot',
  'village-stage','town-upgrade','town-level','town-cost','sound-toggle','sound-volume',
  'hud-pause','hud-sound','hud-wave','hud-speed','hud-upgrade','hud-panel',
  'hud-tab-upgrades','hud-tab-heroes','hud-close','hud-gear',
  'away','away-time','away-food','away-gold','away-cap','away-collect','hint',
  'trophies','eagles','trophy-pill','eagle-pill','hud-upgrades','hud-heroes','hud-lineup','hud-auto-lineup'
].map((id) => [id, document.getElementById(id)]));

// Runtime sprites are pre-cut, web-sized copies built from art/ by tools/build_assets.py.
const sources = {
  guard: { src: 'assets/characters/roman-legionary.png' },
  orc: { src: 'assets/characters/orc-raider.png' },
  orcDual: { src: 'assets/characters/orc-dual-swords.png' },
  orcShield: { src: 'assets/characters/orc-shield-guard.png' },
  orcRed: { src: 'assets/characters/orc-red-elite.png' },
  boss: { src: 'assets/characters/orc-brute-boss.png' },
  farmer: { src: 'assets/characters/roman-farmer.png' },
  archer: { src: 'assets/characters/roman-archer.png' },
  spikes: { src: 'assets/obstacles/palisade.png' }
};

const enemyTypes = {
  orc:       { hp: 4,  damage: 3,  attackRate: 1.2,  speed: 1,    reward: 2, loot: 2, height: 126, bar: '#8ba45e' },
  orcDual:   { hp: 3,  damage: 5,  attackRate: 0.9,  speed: 1.15, reward: 3, loot: 2, height: 113.4, bar: '#d28b45' },
  orcShield: { hp: 8,  damage: 2,  attackRate: 1.4,  speed: 0.8,  reward: 3, loot: 3, height: 132, bar: '#6f8ea2', traits: ['shield'] },
  orcRed:    { hp: 16, damage: 6,  attackRate: 1.8,  speed: 0.6,  reward: 6, loot: 4, height: 148, bar: '#c6533f' },
  boss:      { hp: 22, damage: 14, attackRate: 1.45, speed: 0.52, reward: 8, loot: 6, height: 151.2, bar: '#a93336', isBoss: true },
  // Act II (waves 6–10). Placeholder looks reuse the orc sprites, see enemyLooks.
  goblin:    { hp: 2,  damage: 1,  attackRate: 0.8,  speed: 1.4,  reward: 1, loot: 1,  height: 84,  bar: '#b5c24a', traits: ['swarm'] },
  orcArcher: { hp: 4,  damage: 3,  attackRate: 2.0,  speed: 1.2,  reward: 3, loot: 2, height: 118, bar: '#9a7bc0', traits: ['ranged'], range: 250 },
  boar:      { hp: 6,  damage: 5,  attackRate: 1.3,  speed: 1.8,  reward: 4, loot: 4, height: 104, bar: '#8a5a3a', traits: ['charge', 'armor'], armor: 1 },
  shaman:    { hp: 30, damage: 9, attackRate: 1.6,  speed: 0.45, reward: 15, loot: 5, height: 150, bar: '#7a4fc4', traits: ['aura'], isBoss: true },
  // Act III (waves 11–30). Placeholders until the art in ASSET_REQUESTS.md lands.
  troll:      { hp: 14, damage: 6,  attackRate: 1.9, speed: 0.55, reward: 6,  loot: 4,  height: 160, bar: '#7d8f6a', traits: ['armor'], armor: 2 },
  wolfRider:  { hp: 5,  damage: 4,  attackRate: 1.0, speed: 2.3,  reward: 3,  loot: 3,  height: 104, bar: '#9aa0a6', traits: ['charge'] },
  berserker:  { hp: 9,  damage: 7,  attackRate: 1.0, speed: 1.3,  reward: 5,  loot: 3,  height: 126, bar: '#e0573f', traits: ['enrage'] },
  goblinKing: { hp: 30, damage: 9, attackRate: 1.5, speed: 0.6,  reward: 20, loot: 8,  height: 128, bar: '#c9d24a', isBoss: true },
  warlord:    { hp: 34, damage: 10, attackRate: 1.6, speed: 0.5,  reward: 30, loot: 10, height: 172, bar: '#b33a2b', traits: ['armor'], armor: 2, isBoss: true },
  ogreChief:  { hp: 40, damage: 11, attackRate: 1.7, speed: 0.5,  reward: 35, loot: 12, height: 176, bar: '#a0723f', traits: ['charge'], isBoss: true },
  cyclops:    { hp: 48, damage: 12, attackRate: 1.8, speed: 0.45, reward: 50, loot: 15, height: 186, bar: '#5f7fa8', traits: ['armor', 'aura'], armor: 2, isBoss: true }
};

// Trait glyphs shown on the wave roster and what they mean (see GAME_DESIGN 13.2).
const traitInfo = {
  shield: { glyph: '◐', color: '#a9c6cf', name: 'shield: −50% from arrows' },
  armor:  { glyph: '▣', color: '#c9c3b5', name: 'armor: −1 per hit, except area' },
  swarm:  { glyph: '✦', color: '#e6e36a', name: 'swarm: slips past the frontline' },
  ranged: { glyph: '➶', color: '#c7a6f0', name: 'shoots the frontline from range' },
  charge: { glyph: '»', color: '#f0a160', name: 'charge: first hit ×2' },
  aura:   { glyph: '✚', color: '#9fd0ff', name: 'aura: shields allies every 6 s' },
  enrage: { glyph: '♨', color: '#ff7a59', name: 'enrage: +50% damage below half HP' }
};

function traitsOf(type) {
  return (enemyTypes[type] && enemyTypes[type].traits) || [];
}

// Placeholder art for act II: tinted orc sprites plus drawn props.
const enemyLooks = {
  goblin:    { sprite: 'orc', filter: 'hue-rotate(38deg) saturate(1.3) brightness(1.1)' },
  orcArcher: { sprite: 'orcDual', filter: 'hue-rotate(-55deg) saturate(0.85)', prop: 'bow' },
  boar:      { sprite: 'orc', prop: 'boar' },
  shaman:    { sprite: 'orcRed', filter: 'hue-rotate(245deg) saturate(1.15)', prop: 'staff' },
  troll:      { sprite: 'orcShield', filter: 'hue-rotate(70deg) saturate(0.6) brightness(0.85)' },
  wolfRider:  { sprite: 'orc', prop: 'boar', filter: 'saturate(0.35) brightness(0.95)' },
  berserker:  { sprite: 'orcDual', filter: 'hue-rotate(-30deg) saturate(1.6) contrast(1.1)' },
  goblinKing: { sprite: 'orc', filter: 'hue-rotate(38deg) saturate(1.5) brightness(1.15)' },
  warlord:    { sprite: 'orcRed', filter: 'brightness(0.75) saturate(1.3)' },
  ogreChief:  { sprite: 'boss', filter: 'hue-rotate(25deg) saturate(1.2)' },
  cyclops:    { sprite: 'boss', filter: 'hue-rotate(190deg) saturate(0.8)' }
};

function enemySprite(type) {
  const look = enemyLooks[type];
  return sprites[(look && look.sprite) || type] || sprites.orc;
}

function buildWavePlan(wave) {
  const plans = {
    1: ['orc'],
    2: ['orc', 'orc'],
    3: ['orc', 'orcDual'],
    4: ['orc', 'orc', 'orcDual'],
    5: ['orc', 'orcDual', 'orcShield', 'boss'],
    // Act II: each wave introduces one trait, wave 9 mixes them, wave 10 is the shaman.
    6: ['orc', 'goblin', 'goblin', 'goblin'],
    7: ['orc', 'orcArcher', 'orcShield', 'orcArcher'],
    8: ['orcDual', 'boar', 'orcShield', 'boar'],
    9: ['goblin', 'orcShield', 'orcArcher', 'goblin', 'orcRed'],
    10: ['orcShield', 'orcArcher', 'boar', 'goblin', 'shaman'],
    // Act III: trolls (armour), wolf riders (fast charge), berserkers (enrage); bosses every 5.
    11: ['orc', 'troll', 'orcArcher', 'orc', 'goblin'],
    12: ['wolfRider', 'wolfRider', 'orcShield', 'orcArcher', 'goblin'],
    13: ['troll', 'orcDual', 'wolfRider', 'orcArcher', 'orcShield'],
    14: ['troll', 'troll', 'goblin', 'goblin', 'orcArcher', 'orcRed'],
    15: ['wolfRider', 'orcShield', 'goblin', 'goblin', 'goblinKing'],
    16: ['troll', 'wolfRider', 'orcArcher', 'orcArcher', 'orcShield', 'goblin'],
    17: ['orcRed', 'troll', 'wolfRider', 'wolfRider', 'orcArcher', 'goblin'],
    18: ['troll', 'troll', 'orcShield', 'orcArcher', 'boar', 'goblin'],
    19: ['orcRed', 'orcRed', 'wolfRider', 'orcArcher', 'troll', 'goblin'],
    20: ['troll', 'orcShield', 'orcArcher', 'wolfRider', 'warlord'],
    21: ['berserker', 'berserker', 'orcArcher', 'troll', 'goblin', 'goblin'],
    22: ['berserker', 'troll', 'wolfRider', 'orcArcher', 'orcShield', 'goblin'],
    23: ['berserker', 'berserker', 'troll', 'orcArcher', 'orcArcher', 'wolfRider'],
    24: ['troll', 'troll', 'berserker', 'orcRed', 'orcArcher', 'goblin', 'goblin'],
    25: ['berserker', 'troll', 'orcArcher', 'wolfRider', 'ogreChief'],
    26: ['berserker', 'berserker', 'troll', 'troll', 'orcArcher', 'wolfRider', 'goblin'],
    27: ['orcRed', 'berserker', 'troll', 'orcArcher', 'orcArcher', 'wolfRider', 'goblin'],
    28: ['troll', 'troll', 'troll', 'berserker', 'orcArcher', 'wolfRider', 'goblin'],
    29: ['berserker', 'berserker', 'orcRed', 'troll', 'orcArcher', 'orcArcher', 'wolfRider'],
    30: ['troll', 'berserker', 'orcArcher', 'wolfRider', 'orcShield', 'cyclops']
  };
  return [...(plans[wave] || plans[FINAL_WAVE])];
}

const wavePreviewNames = {
  orc: 'Orc', orcDual: 'Twin Blades', orcShield: 'Shield Bearer', orcRed: 'Elite', boss: 'Brute',
  goblin: 'Goblin', orcArcher: 'Orc Archer', boar: 'Boar Rider', shaman: 'Shaman',
  troll: 'Troll', wolfRider: 'Wolf Rider', berserker: 'Berserker',
  goblinKing: 'Goblin King', warlord: 'Orc Warlord', ogreChief: 'Ogre Chief', cyclops: 'Cyclops'
};

// From wave 21 three wave enemies may fight at once (bosses still enter alone).
function maxConcurrent(wave) {
  return wave > 20 ? 3 : 2;
}

function wavePreviewText(wave) {
  const plan = buildWavePlan(wave);
  const counts = new Map();
  for (const type of plan) counts.set(type, (counts.get(type) || 0) + 1);
  return [...counts].map(([type, count]) => `${count}× ${wavePreviewNames[type] || type}`).join(' · ');
}

function guardAttackInterval(level) {
  return Math.max(0.4, 0.72 - (level - 1) * 0.06);
}

function calculateOpeningDifficulty(wave, progress) {
  // The roster itself becomes more dangerous (more shield units, elites and a
  // boss), so raw stat growth must not also rise monotonically. These factors
  // are calibrated by tools/balance-bot.cjs against a farm/upgrade/play loop.
  // Early waves: fewer HP and harder hits, so fights are short but you feel every blow.
  const rosterHpTuning = OPENING_HP_TUNING;
  if (wave === 1) return { hp: rosterHpTuning[0], damage: OPENING_DAMAGE_TUNING[0] };
  const step = wave - 1;
  const dpsRatio = progress.guardLevel * 0.72 / guardAttackInterval(progress.guardLevel);
  // Sublinear adaptation preserves the advantage of investing in combat.
  // Economy, stored resources, gate upgrades and current health never raise difficulty.
  const offense = 1 + 0.35 * (Math.sqrt(dpsRatio) - 1)
    + 0.12 * Math.pow(progress.spikesLevel, 0.75);
  return {
    hp: (1 + 0.3 * step + 0.06 * step * step) * offense * (rosterHpTuning[wave - 1] || 0.5),
    damage: (1 + 0.12 * step) * Math.pow(progress.maxGuardHp / 100, 0.25) * (OPENING_DAMAGE_TUNING[wave - 1] || 1)
  };
}
const OPENING_HP_TUNING = [3.62, 2.44, 4.70, 2.78, 0.70];
const OPENING_DAMAGE_TUNING = [3.0, 2.8, 1.4, 1.6, 1.15];
// Act II assumes the player uses hero spells and rotation (balance bot «Авто»).
const ACT2_HP_TUNING = [1, 2.4, 1.3, 1.2, 1];
const ACT2_DAMAGE_TUNING = [1, 2.8, 1.8, 3.4, 1.4];
// Act III (waves 11–30), tuned with the balance bot (spells, rotation and gear).
const ACT3_HP_TUNING = [1.1, 3.3, 2.5, 0.85, 0.85, 0.85, 2.5, 2.5, 1.1, 0.42, 0.55, 1.45, 0.44, 0.85, 0.28, 0.38, 0.2, 0.2, 1.1, 0.38];
const ACT3_DAMAGE_TUNING = [2, 1.25, 1.25, 1, 1, 2, 1.25, 1, 1.6, 1, 1.6, 1, 1.25, 1.25, 1, 1, 2, 1.25, 0.8, 0.8];

function calculateWaveDifficulty(wave, progress) {
  if (wave <= 5) return calculateOpeningDifficulty(wave, progress);
  // Act II starts a gentler curve while introducing new enemy traits.
  const step = wave <= 5 ? wave - 1 : (wave - 6) + 2.5;
  const dpsRatio = progress.guardLevel * 0.72 / guardAttackInterval(progress.guardLevel);
  // Sublinear adaptation preserves the advantage of investing in combat.
  // Economy, stored resources and current health never raise difficulty.
  const offense = 1 + 0.35 * (Math.sqrt(dpsRatio) - 1)
    + 0.12 * Math.pow(progress.spikesLevel, 0.75)
    + 0.1 * Math.max(progress.archerLevel || 0, progress.catapultLevel || 0);
  const tuneHp = wave <= 10 ? ACT2_HP_TUNING[wave - 6] : (ACT3_HP_TUNING[wave - 11] ?? 1);
  const tuneDamage = wave <= 10 ? ACT2_DAMAGE_TUNING[wave - 6] : (ACT3_DAMAGE_TUNING[wave - 11] ?? 1);
  return {
    hp: (1 + 0.3 * step + 0.06 * step * step) * offense * tuneHp,
    damage: (1 + 0.12 * step) * Math.pow(progress.maxGuardHp / 100, 0.25) * tuneDamage
  };
}

// Each wave is tuned for the player the game EXPECTS at that wave (idle-genre rule):
// under-levelled players lose and must grow, over-levelled players win easily.
// Values match the balance bot's build at each wave.
const EXPECTED_PROGRESS = [
  null,
  { guardLevel: 1, spikesLevel: 0 }, { guardLevel: 2, spikesLevel: 0 }, { guardLevel: 3, spikesLevel: 0 },
  { guardLevel: 4, spikesLevel: 1 }, { guardLevel: 5, spikesLevel: 1 },
  { guardLevel: 6, spikesLevel: 2, archerLevel: 2, catapultLevel: 2 }, { guardLevel: 7, spikesLevel: 2, archerLevel: 3, catapultLevel: 3 },
  { guardLevel: 8, spikesLevel: 2, archerLevel: 4, catapultLevel: 3 }, { guardLevel: 9, spikesLevel: 2, archerLevel: 5, catapultLevel: 4 },
  { guardLevel: 10, spikesLevel: 2, archerLevel: 5, catapultLevel: 5 }
];
function expectedProgress(wave) {
  const known = EXPECTED_PROGRESS[wave];
  // Beyond wave 10 the expected build grows slower than the wave number.
  const late = Math.max(0, wave - 10);
  const base = known || { guardLevel: 10 + Math.round(late * 0.75), spikesLevel: 2 + Math.floor(late / 5),
    archerLevel: 5 + Math.round(late * 0.5), catapultLevel: 5 + Math.round(late * 0.5) };
  return { archerLevel: 0, catapultLevel: 0, ...base, maxGuardHp: 80 + 20 * base.guardLevel };
}

// Frontline level the wave was tuned for — shown to the player as a recommendation.
function recommendedLevel(wave) {
  return expectedProgress(wave).guardLevel;
}

// Is the current build at least what this wave was tuned for?
function meetsExpected(wave) {
  const t = expectedProgress(wave);
  return state.guardLevel >= t.guardLevel && state.spikesLevel >= t.spikesLevel
    && (state.townLevel < 2 || Math.max(state.archerLevel, state.catapultLevel) >= t.archerLevel);
}

function getWaveDifficulty(wave) {
  return state.waveDifficulties[wave] || calculateWaveDifficulty(wave, expectedProgress(wave));
}

const sprites = {};
const skyLayers = {};
const skySources = {
  bank: 'assets/sky/cloud-bank-far.png',
  cumulus: 'assets/sky/cloud-cumulus.png',
  wisp: 'assets/sky/cloud-wisp.png',
  sunlit: 'assets/sky/cloud-sunlit.png'
};
const landscapeLayers = {};
const landscapeSources = {
  mountains: 'assets/landscape/mountains.png',
  hills: 'assets/landscape/hills.png',
  treeline: 'assets/landscape/treeline.png',
  grass: 'assets/landscape/grass-tile.jpg'
};
const structureSources = {
  guardTower: 'assets/buildings/wooden-guard-tower.png'
};
const structures = {};
const resourceSources = { food: 'assets/icons/food.png', gold: 'assets/icons/gold.png' };
const resourceIcons = {};
// Cut-out head icons for the wave roster. Only the raider and the boss have
// real heads so far; other enemies reuse the raider head with a tint until
// their own heads are rendered (see ASSET_REQUESTS.md).
const portraitSources = {
  orc: 'assets/icons/orc-raider-head.png',
  boss: 'assets/icons/orc-brute-boss-head.png'
};
const portraitTints = {
  orcRed: 'hue-rotate(-75deg) saturate(1.4)',
  orcShield: 'saturate(0.55) brightness(0.9)',
  orcDual: 'hue-rotate(-20deg)'
};
const portraits = {};
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

function removeConnectedBackground(image, type) {
  const { width, height, data } = image;
  const corners = [0, width - 1, (height - 1) * width, width * height - 1];
  const samples = corners.map((index) => {
    const p = index * 4;
    return [data[p], data[p + 1], data[p + 2]];
  });
  const threshold = type === 'sage' ? 58 : 43;
  const thresholdSquared = threshold * threshold;
  const isBackground = (index) => {
    const p = index * 4;
    for (const sample of samples) {
      const dr = data[p] - sample[0];
      const dg = data[p + 1] - sample[1];
      const db = data[p + 2] - sample[2];
      if (dr * dr + dg * dg + db * db < thresholdSquared) return true;
    }
    return false;
  };
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const add = (index) => {
    if (seen[index]) return;
    if (!isBackground(index)) return;
    seen[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index / width) | 0;
    if (x > 0) add(index - 1);
    if (x + 1 < width) add(index + 1);
    if (y > 0) add(index - width);
    if (y + 1 < height) add(index + width);
  }
  for (let i = 0; i < seen.length; i++) {
    if (seen[i]) data[i * 4 + 3] = 0;
  }

  if (type === 'checker') {
    // Generated checkerboards can leave enclosed gray cells and decorative dark
    // marks between the timbers. Keep saturated wood/rope/metal plus a narrow
    // outline around it, and clear neutral pixels everywhere else.
    let foreground = new Uint8Array(width * height);
    for (let i = 0; i < foreground.length; i++) {
      const p = i * 4;
      if (data[p + 3] < 20) continue;
      const max = Math.max(data[p], data[p + 1], data[p + 2]);
      const min = Math.min(data[p], data[p + 1], data[p + 2]);
      if (max - min > 22) foreground[i] = 1;
    }
    for (let pass = 0; pass < 4; pass++) {
      const expanded = foreground.slice();
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = y * width + x;
          if (foreground[index]) continue;
          if (foreground[index - 1] || foreground[index + 1] || foreground[index - width] || foreground[index + width]) {
            expanded[index] = 1;
          }
        }
      }
      foreground = expanded;
    }
    for (let i = 0; i < foreground.length; i++) {
      if (!foreground[i]) data[i * 4 + 3] = 0;
    }
  }
}

function keepLargestShape(image) {
  const { width, height, data } = image;
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let largest = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] < 40) continue;
    let head = 0;
    let tail = 0;
    const component = [];
    queue[tail++] = start;
    seen[start] = 1;
    while (head < tail) {
      const index = queue[head++];
      component.push(index);
      const x = index % width;
      const y = (index / width) | 0;
      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (let n = 0; n < 4; n++) {
        const next = neighbors[n];
        if (next < 0 || next >= seen.length || seen[next] || data[next * 4 + 3] < 40) continue;
        if ((n === 0 && x === 0) || (n === 1 && x === width - 1) || (n === 2 && y === 0) || (n === 3 && y === height - 1)) continue;
        seen[next] = 1;
        queue[tail++] = next;
      }
    }
    if (component.length > largest.length) largest = component;
  }
  const keep = new Uint8Array(width * height);
  for (const index of largest) keep[index] = 1;
  for (let i = 0; i < keep.length; i++) if (!keep[i]) data[i * 4 + 3] = 0;
}

function trimCanvas(sourceCanvas) {
  const sourceCtx = sourceCanvas.getContext('2d');
  const image = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  let minX = image.width;
  let minY = image.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] < 20) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  const width = Math.max(1, maxX - minX + 1);
  const height = Math.max(1, maxY - minY + 1);
  const trimmed = document.createElement('canvas');
  trimmed.width = width;
  trimmed.height = height;
  trimmed.getContext('2d').drawImage(sourceCanvas, minX, minY, width, height, 0, 0, width, height);
  return trimmed;
}

function loadSprite(config) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const [x, y, width, height] = config.crop || [0, 0, image.naturalWidth, image.naturalHeight];
      const work = document.createElement('canvas');
      work.width = width;
      work.height = height;
      const workCtx = work.getContext('2d', { willReadFrequently: true });
      workCtx.drawImage(image, x, y, width, height, 0, 0, width, height);
      const pixels = workCtx.getImageData(0, 0, width, height);
      if (config.background) removeConnectedBackground(pixels, config.background);
      keepLargestShape(pixels);
      workCtx.putImageData(pixels, 0, 0);
      resolve(trimCanvas(work));
    };
    image.onerror = reject;
    image.src = config.src;
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function spawnMob(type = 'orc', countsForWave = true) {
  const stats = enemyTypes[type] || enemyTypes.orc;
  // Ambient patrols stay weak; only finite waves use the locked difficulty.
  const difficulty = countsForWave ? getWaveDifficulty(state.wave) : { hp: 1, damage: 1 };
  const hp = Math.round(stats.hp * difficulty.hp);
  // Spread each wave across shallow depth lanes so the horde does not run
  // through the battlefield as one overlapping horizontal line.
  const laneOffsets = [-30, 18, -10, 32, 4, -22, 25];
  const spawnIndex = countsForWave ? state.spawned : state.patrolSpawned;
  const laneY = stats.isBoss ? 0 : laneOffsets[spawnIndex % laneOffsets.length];
  // Ranged orcs keep wide gaps, so a single catapult rock rarely hits more than one.
  const formationX = stats.isBoss ? 0 : (spawnIndex % 4) * (traitsOf(type).includes('ranged') ? 45 : 14);
  state.mobs.push({
    x: -70, laneY, formationX, attackMotion: 0,
    bob: Math.random() * Math.PI * 2, hit: 0, dead: false, type,
    countsForWave,
    hp,
    maxHp: hp,
    damage: Math.round(stats.damage * difficulty.damage),
    attackRate: stats.attackRate,
    speed: stats.speed,
    reward: stats.reward,
    loot: stats.loot,
    attackCooldown: Math.random() * 0.35,
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
  state.shake = Math.max(state.shake, 0.2);
  playHorn();
  ui.pause.textContent = 'Ⅱ Pause';
}

// ---------------------------------------------------------------------------
// Sound: everything is synthesized with Web Audio, no sound files.
// Silently does nothing where Web Audio is unavailable (tests, old browsers).
// ---------------------------------------------------------------------------
const HORN_TIME = 1.6;
const sound = { enabled: true, volume: 0.7, ctx: null, master: null, noise: null, last: {} };
try {
  const saved = JSON.parse(localStorage.getItem('afkRomeSound') || 'null');
  if (saved) Object.assign(sound, { enabled: saved.enabled !== false, volume: Number(saved.volume ?? 0.7) });
} catch (error) { /* storage is optional */ }

function saveSound() {
  try { localStorage.setItem('afkRomeSound', JSON.stringify({ enabled: sound.enabled, volume: sound.volume })); } catch (error) { /* optional */ }
}

function audio() {
  if (sound.ctx) return sound.ctx;
  const AudioCtor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtor) return null;
  try {
    const ac = new AudioCtor();
    sound.master = ac.createGain();
    sound.master.gain.value = sound.volume;
    sound.master.connect(ac.destination);
    const length = ac.sampleRate;
    sound.noise = ac.createBuffer(1, length, ac.sampleRate);
    const data = sound.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    sound.ctx = ac;
  } catch (error) { return null; }
  return sound.ctx;
}

function setVolume(value) {
  sound.volume = Math.max(0, Math.min(1, value));
  if (sound.master) sound.master.gain.value = sound.volume;
  saveSound();
}

// Envelope helper: quick attack, exponential decay.
function env(ac, at, peak, attack, decay) {
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  gain.connect(sound.master);
  return gain;
}

function tone(ac, at, { type = 'sine', freq, to, peak = 0.2, attack = 0.005, decay = 0.2, detune = 0 }) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + attack + decay);
  osc.detune.value = detune;
  osc.connect(env(ac, at, peak, attack, decay));
  osc.start(at);
  osc.stop(at + attack + decay + 0.05);
}

function noise(ac, at, { filter = 'bandpass', freq = 2000, to, q = 1, peak = 0.2, attack = 0.005, decay = 0.15 }) {
  const src = ac.createBufferSource();
  src.buffer = sound.noise;
  const f = ac.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, at);
  if (to) f.frequency.exponentialRampToValueAtTime(to, at + attack + decay);
  f.Q.value = q;
  src.connect(f).connect(env(ac, at, peak, attack, decay));
  src.start(at, Math.random() * 0.5);
  src.stop(at + attack + decay + 0.05);
}

// Metallic ring: a few inharmonic partials.
function clang(ac, at, base, peak, decay) {
  for (const [ratio, level] of [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.93, 0.15]]) {
    tone(ac, at, { type: 'sine', freq: base * ratio, peak: peak * level, attack: 0.002, decay: decay / Math.sqrt(ratio) });
  }
}

const sfxGap = { sword: 0.06, hurt: 0.08, arrow: 0.05, coin: 0.05, click: 0.03, ready: 0.15 };
const sfxLib = {
  // Legionary sword: swish then a bright clink on contact.
  sword(ac, t) {
    noise(ac, t, { filter: 'bandpass', freq: 900, to: 4200, q: 1.2, peak: 0.18, attack: 0.02, decay: 0.09 });
    clang(ac, t + 0.07, 1250 + Math.random() * 200, 0.11, 0.18);
    noise(ac, t + 0.07, { filter: 'highpass', freq: 3000, peak: 0.08, decay: 0.05 });
  },
  // An orc hits the shield: dull wooden thud plus a low metal ring.
  hurt(ac, t) {
    tone(ac, t, { type: 'triangle', freq: 170, to: 70, peak: 0.28, decay: 0.16 });
    noise(ac, t, { filter: 'lowpass', freq: 900, peak: 0.22, decay: 0.12 });
    clang(ac, t + 0.005, 420, 0.05, 0.25);
  },
  // «Удар щитом»: heavy body slam and a big shield ring.
  bash(ac, t) {
    tone(ac, t, { type: 'sine', freq: 120, to: 45, peak: 0.45, attack: 0.004, decay: 0.3 });
    noise(ac, t, { filter: 'lowpass', freq: 1400, to: 300, peak: 0.35, decay: 0.22 });
    clang(ac, t + 0.01, 520, 0.14, 0.6);
  },
  // «Удержать строй»: shields lock together.
  shield(ac, t) {
    clang(ac, t, 610, 0.1, 0.4);
    clang(ac, t + 0.09, 700, 0.1, 0.5);
    noise(ac, t, { filter: 'lowpass', freq: 700, peak: 0.15, decay: 0.1 });
  },
  // Bow twang plus a short airy whoosh.
  arrow(ac, t, quiet) {
    const k = quiet ? 0.5 : 1;
    tone(ac, t, { type: 'triangle', freq: 330, to: 180, peak: 0.12 * k, attack: 0.002, decay: 0.09 });
    noise(ac, t + 0.02, { filter: 'bandpass', freq: 2600, to: 900, q: 2.2, peak: 0.1 * k, attack: 0.04, decay: 0.22 });
  },
  // «Залп»: a cloud of arrows whistling in, staggered.
  volley(ac, t) {
    for (let i = 0; i < 7; i++) {
      const at = t + i * 0.045 + Math.random() * 0.02;
      noise(ac, at, { filter: 'bandpass', freq: 3200 + Math.random() * 1200, to: 1100, q: 3, peak: 0.07, attack: 0.08, decay: 0.45 });
    }
    tone(ac, t, { type: 'triangle', freq: 300, to: 160, peak: 0.14, attack: 0.002, decay: 0.12 });
  },
  // Bright two-note coin.
  coin(ac, t) {
    tone(ac, t, { type: 'square', freq: 988, peak: 0.1, attack: 0.002, decay: 0.07 });
    tone(ac, t + 0.07, { type: 'square', freq: 1319, peak: 0.1, attack: 0.002, decay: 0.32 });
    tone(ac, t + 0.07, { type: 'sine', freq: 2638, peak: 0.08, attack: 0.002, decay: 0.25 });
  },
  // Victory: short brass fanfare G-C-E-G with a held chord.
  fanfare(ac, t, withCoins) {
    if (withCoins) { sfxLib.coin(ac, t + 0.95); sfxLib.coin(ac, t + 1.1); }
    const notes = [[392, 0, 0.12], [523, 0.13, 0.12], [659, 0.26, 0.12], [784, 0.39, 0.9]];
    for (const [freq, at, decay] of notes) {
      for (const detune of [-6, 6]) tone(ac, t + at, { type: 'sawtooth', freq, peak: 0.045, attack: 0.02, decay: decay + 0.1, detune });
      tone(ac, t + at, { type: 'triangle', freq: freq / 2, peak: 0.06, attack: 0.02, decay: decay + 0.1 });
    }
    for (const freq of [523, 659]) tone(ac, t + 0.39, { type: 'sawtooth', freq, peak: 0.025, attack: 0.03, decay: 1 });
    noise(ac, t + 0.39, { filter: 'highpass', freq: 6000, peak: 0.05, attack: 0.01, decay: 0.6 });
  },
  // Soft wooden UI tick.
  click(ac, t) {
    tone(ac, t, { type: 'triangle', freq: 1800, to: 900, peak: 0.06, attack: 0.001, decay: 0.035 });
  },
  // Spell ready: rising sparkle.
  ready(ac, t) {
    tone(ac, t, { type: 'sine', freq: 880, peak: 0.1, attack: 0.005, decay: 0.12 });
    tone(ac, t + 0.08, { type: 'sine', freq: 1319, peak: 0.1, attack: 0.005, decay: 0.3 });
    tone(ac, t + 0.08, { type: 'sine', freq: 1760, peak: 0.03, attack: 0.005, decay: 0.3 });
  },
  bless(ac, t) {
    for (const [freq, at] of [[784, 0], [988, 0.06], [1175, 0.12], [1568, 0.18]]) tone(ac, t + at, { type: 'sine', freq, peak: 0.06, attack: 0.01, decay: 0.5 });
  },
  horn(ac, t) {
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.12);
    gain.gain.setValueAtTime(0.16, t + 0.75);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 900;
    gain.connect(filter).connect(sound.master);
    for (const [freq, detune] of [[110, 0], [110, 9], [165, -6]]) {
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * 0.94, t);
      osc.frequency.linearRampToValueAtTime(freq, t + 0.18);
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 1.3);
    }
  }
};

// At 100× the simulation would turn sounds into noise, so only key cues remain.
function sfx(name, option) {
  if (!sound.enabled || !sfxLib[name]) return;
  if (state.speed > 2 && !['fanfare', 'click', 'horn'].includes(name)) return;
  const ac = sound.ctx;
  if (!ac || ac.state === 'closed') return;
  const now = ac.currentTime;
  if (sfxGap[name] && now - (sound.last[name] ?? -1) < sfxGap[name]) return;
  sound.last[name] = now;
  try { sfxLib[name](ac, now + 0.005, option); } catch (error) { /* decoration only */ }
}

function playHorn() { sfx('horn'); }

// Browsers start audio only after a user gesture: unlock on the first input.
function unlockAudio() {
  const ac = audio();
  if (ac && ac.state === 'suspended') ac.resume();
}

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
  const reward = state.wave > state.wavesCleared ? 6 + state.wave * 3 : 0;
  state.wavesCleared = Math.max(state.wavesCleared, state.wave);
  state.coins += reward;
  if (reward) state.floaters.push({ kind: 'reward', amount: reward, x: 585, life: 1.8, duration: 1.8 });
  sfx('fanfare', reward > 0);
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
// ---------------------------------------------------------------------------
// Archer, hero volley, catapult and unlocks.
// ---------------------------------------------------------------------------
const ARCHER_UNLOCK_WAVE = 5;
// Economy: idle-style exponential prices, so resources (not caps) set the pace.
// Tuned with the human-like session bot (tools/balance-bot.cjs → session()).
const ECONOMY = {
  guardBase: 36, guardGrowth: 1.5,       // food
  farmBase: 24, farmGrowth: 1.6,         // gold
  spikesBase: 24, spikesGrowth: 1.5,     // gold
  archerBase: 24, archerGrowth: 1.35,    // gold
  catapultBase: 28, catapultGrowth: 1.35 // gold
};
// Steep growth for the first 10 levels (fast early pacing), gentle after that so the
// long game stays reachable with AFK income.
const LATE_GROWTH = 1.12;
const priceAt = (base, growth, level) => Math.round(base * Math.pow(growth, Math.min(9, Math.max(0, level - 1)))
  * Math.pow(LATE_GROWTH, Math.max(0, level - 10)));
function farmPrice() { return priceAt(ECONOMY.farmBase, ECONOMY.farmGrowth, state.farmLevel); }
function spikesPrice() { return priceAt(ECONOMY.spikesBase, ECONOMY.spikesGrowth, state.spikesLevel); }
const TOWER_POP = 0.9;
const NOTICE_TIME = 3.6;
const CATAPULT_UNLOCK_WAVE = 5;
const FINAL_WAVE = 30;
const CATAPULT_RANGE = 540;
const CATAPULT_MIN_RANGE = 280; // cannot lob at enemies right under the wall
const CATAPULT_SPLASH = 62;
const ARCHER_RANGE = 430;
const VOLLEY_COOLDOWN = 18;
const VOLLEY_FALL = 0.75;
const VOLLEY_ZONE = [-400, -20]; // relative to the legionary

// ---------------------------------------------------------------------------
// Heroes, slots and rotation (GAME_DESIGN: «Герои, слоты и ротация»).
// A hero is a unit with its own spell. Upgrades belong to the slot, so a
// substitute fights at the same level and rotation never costs resources.
// The catapult is a tower machine: no spell and it never gets tired.
// ---------------------------------------------------------------------------
const HOPLITE_UNLOCK_WAVE = 7;
const RESTED_BONUS = 0.25;      // «Свежие силы»: +25% damage for one wave
const FATIGUE_PENALTY = 0.1;    // per wave beyond the first in a row
const FATIGUE_MAX = 3;
const heroDefs = {
  legionary: { name: 'Legionary', role: 'front', damageMult: 1, guardTaken: 1,
    spell: { id: 'shieldBash', name: 'Shield Bash', short: 'Bash', icon: '⛨', cooldown: 12, hint: 'stuns and knocks back the nearest enemy' } },
  hoplite: { name: 'Hoplite', role: 'front', damageMult: 0.85, guardTaken: 0.85,
    spell: { id: 'holdLine', name: 'Hold the Line', short: 'Hold', icon: '▥', cooldown: 16, hint: 'takes 70% less damage for 5 s' } },
  archer: { name: 'Archer', role: 'tower', damageMult: 1,
    spell: { id: 'volley', name: 'Volley', short: 'Volley', icon: '➶', cooldown: VOLLEY_COOLDOWN, hint: 'arrows rain on everything in front of the line' } },
  catapult: { name: 'Catapult', role: 'tower', machine: true, damageMult: 1, spell: null },
  priestess: { name: 'Priestess', role: 'support', damageMult: 1,
    spell: { id: 'blessing', name: 'Blessing', short: 'Bless', icon: '✚', cooldown: 20, hint: 'heals the frontline hero by 40% HP' } }
};
const slotDefs = [
  { role: 'front', name: 'Front', key: '1' },
  { role: 'tower', name: 'Tower', key: '2' },
  { role: 'support', name: 'Wall', key: '3' }
];
const BASH_STUN = 2.5;
const BASH_KNOCK = 120;
const HOLD_LINE_TIME = 5;
const HOLD_LINE_TAKEN = 0.3;
const BLESSING_HEAL = 0.4;

function freshHeroes() {
  const heroes = {};
  for (const id of Object.keys(heroDefs)) heroes[id] = { unlocked: id === 'legionary', fatigue: 0, rested: false, cd: 0 };
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
  const mult = heroPowerMult(id) * (1 + gearBonus(id, 'weapon'));
  if (def.spell.id === 'shieldBash') {
    const target = bashTarget(width);
    const boss = enemyTypes[target.type]?.isBoss;
    const dealt = damageMob(target, 2 * state.guardLevel * mult, 'melee');
    target.stun = boss ? 1.2 : BASH_STUN;
    target.knock = boss ? 40 : BASH_KNOCK;
    target.attackCooldown = Math.max(target.attackCooldown, target.stun);
    state.bashFx = 0.4;
    markHint('bash');
    sfx('bash');
    state.shake = Math.max(state.shake, 0.18);
    state.floaters.push({ kind: 'bash', amount: Math.round(dealt * 10) / 10, x: guardX - 60, life: 1.2, duration: 1.2 });
  } else if (def.spell.id === 'holdLine') {
    state.holdLine = HOLD_LINE_TIME;
    sfx('shield');
    state.floaters.push({ kind: 'hold', amount: 70, x: guardX, life: 1.4, duration: 1.4 });
  } else if (def.spell.id === 'volley') {
    const difficulty = state.phase === 'wave' ? getWaveDifficulty(state.wave) : { hp: 1 };
    state.volleyDamage = Math.ceil(4 * difficulty.hp * mult);
    state.volleyFx = VOLLEY_FALL;
    sfx('volley');
  } else if (def.spell.id === 'blessing') {
    const heal = Math.round(state.maxGuardHp * BLESSING_HEAL * mult);
    state.guardHp = Math.min(state.maxGuardHp, state.guardHp + heal);
    state.blessFx = 0.8;
    sfx('bless');
    state.floaters.push({ kind: 'bless', amount: heal, x: guardX, life: 1.4, duration: 1.4 });
  }
  state.heroes[id].cd = def.spell.cooldown * (1 - Math.min(0.5, gearBonus(id, 'charm')));
  return true;
}

// Every hit on the frontline hero goes through here (melee and enemy arrows).
function hurtGuard(raw, guardX) {
  let damage = raw * (heroDefs[state.frontHero].guardTaken ?? 1) * (1 - Math.min(0.6, gearBonus(state.frontHero, 'armor')));
  if (state.holdLine > 0) damage *= HOLD_LINE_TAKEN;
  damage = Math.max(1, Math.round(damage));
  state.guardHp = Math.max(0, state.guardHp - damage);
  state.floaters.push({ kind: 'hurt', amount: damage, x: guardX, life: 1.05, duration: 1.05 });
  sfx('hurt');
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

// Legionary upgrades get steeper so food alone cannot outpace the waves.
function guardUpgradePrice() {
  return priceAt(ECONOMY.guardBase, ECONOMY.guardGrowth, state.guardLevel);
}

function archerInterval(level) {
  return Math.max(0.55, 1.3 - (level - 1) * 0.12);
}

function archerPrice() {
  return priceAt(ECONOMY.archerBase, ECONOMY.archerGrowth, state.archerLevel);
}

// Shared tower geometry for update() and drawScene() (world is 1170×540).
function towerGeometry(width, height = 540) {
  const ground = height * 0.82;
  const towerX = width * 0.6;
  const towerHeight = Math.min(300, height * 0.64);
  const platformY = ground - towerHeight * 0.72;
  return { ground, towerX, towerHeight, platformY };
}

function catapultInterval(level) {
  return Math.max(2.0, 3.4 - (level - 1) * 0.3);
}

// Fixed upgrade damage keeps small enemy groups relevant at higher difficulties.
function catapultDamage(level) {
  return 3 + 2 * (level - 1);
}

// Faster single-target fire complements the catapult's slower area attacks.
function archerDamage(level) {
  return 0.75 * level;
}

function catapultPrice() {
  return priceAt(ECONOMY.catapultBase, ECONOMY.catapultGrowth, state.catapultLevel);
}

// Damage types: melee (legionary), pierce (archer), area (volley, catapult), contact (spikes).
function effectiveDamage(mob, raw, type) {
  const stats = enemyTypes[mob.type] || {};
  let damage = raw;
  if (type === 'pierce' && traitsOf(mob.type).includes('shield')) damage *= 0.5;
  if (stats.armor && type !== 'area') damage = Math.max(raw * 0.25, damage - stats.armor);
  return damage;
}

function damageMob(mob, raw, type = 'melee') {
  if (mob.dead) return 0;
  let damage = effectiveDamage(mob, raw, type);
  if (mob.barrier > 0) {
    const absorbed = Math.min(mob.barrier, damage);
    mob.barrier -= absorbed;
    damage -= absorbed;
  }
  mob.hp -= damage;
  mob.hit = 0.18;
  if (mob.hp <= 1e-6) {
    mob.dead = true;
    state.kills += 1;
    if (mob.countsForWave) state.defeated += 1;
    collectKillReward(mob);
  }
  return damage;
}

// An enemy that slips past the legionary runs into the village and steals coins (then food).
function stealLoot(mob, width) {
  let left = mob.loot || 1;
  const fromCoins = Math.min(state.coins, left);
  state.coins -= fromCoins;
  left -= fromCoins;
  const fromFood = Math.min(state.food, left);
  state.food -= fromFood;
  const stolen = fromCoins + fromFood;
  if (stolen > 0) state.floaters.push({ kind: 'stolen', amount: stolen, x: width * 0.84, life: 1.6, duration: 1.6 });
}

function aliveMobs() {
  return state.mobs.filter((mob) => !mob.dead);
}

// The volley now belongs to the archer hero on the tower.
function castVolley() {
  return castSpell('archer');
}

function updateDefenders(dt, width) {
  const guardX = width * 0.52;
  const { towerX, platformY } = towerGeometry(width);
  state.archerCooldown = Math.max(0, state.archerCooldown - dt);
  const onField = activeHeroes();
  for (const [id, hero] of Object.entries(state.heroes)) {
    const before = hero.cd;
    hero.cd = Math.max(0, hero.cd - dt);
    if (before > 0 && hero.cd === 0 && onField.includes(id)) sfx('ready');
  }
  state.holdLine = Math.max(0, state.holdLine - dt);
  state.bashFx = Math.max(0, state.bashFx - dt);
  state.blessFx = Math.max(0, state.blessFx - dt);
  state.shake = Math.max(0, state.shake - dt);

  // Archer: fires at the foremost enemy in range, damage lands when the arrow arrives.
  if (state.archerUnlocked && state.towerSlot === 'archer' && state.archerCooldown <= 0) {
    // Priority: enemy archers first (only our archer outranges them), then the foremost enemy.
    const inRange = aliveMobs().filter((mob) => mob.x > guardX - ARCHER_RANGE && mob.x < guardX + 8);
    const ranged = inRange.filter((mob) => traitsOf(mob.type).includes('ranged'));
    const pool = ranged.length ? ranged : inRange;
    const target = pool.reduce((lead, mob) => (!lead || mob.x > lead.x ? mob : lead), null);
    if (target) {
      state.arrows.push({ sx: towerX - 30, sy: platformY - 62, mob: target, t: 0, dur: 0.42, damage: archerDamage(state.archerLevel) * heroPowerMult('archer') * (1 + gearBonus('archer', 'weapon')) });
      state.archerCooldown = archerInterval(state.archerLevel);
      sfx('arrow');
    }
  }
  for (const arrow of state.arrows) {
    arrow.t += dt;
    if (arrow.t >= arrow.dur) damageMob(arrow.mob, arrow.damage, 'pierce');
  }
  state.arrows = state.arrows.filter((arrow) => arrow.t < arrow.dur && !arrow.mob.dead);

  // Catapult: lobs a rock at the densest group, splash damage ignores armor.
  state.catapultCooldown = Math.max(0, state.catapultCooldown - dt);
  if (state.catapultUnlocked && state.towerSlot === 'catapult' && state.catapultCooldown <= 0) {
    const inRange = aliveMobs().filter((mob) => mob.x > guardX - CATAPULT_RANGE && mob.x < guardX - CATAPULT_MIN_RANGE);
    let best = null;
    let bestScore = -1;
    for (const mob of inRange) {
      const score = inRange.filter((other) => Math.abs(other.x - mob.x) <= CATAPULT_SPLASH).length + mob.x / 10000;
      if (score > bestScore) { best = mob; bestScore = score; }
    }
    if (best) {
      const flight = 0.9;
      const blocked = best.x >= guardX - 72 - (best.formationX ?? 0) - 1;
      const lead = blocked ? 0 : (28 + state.wave * 2.5) * best.speed * flight * 0.8;
      state.rocks.push({ sx: towerX - 34, sy: platformY - 40, tx: Math.min(best.x + lead, guardX - CATAPULT_MIN_RANGE + 40), laneY: best.laneY ?? 0, t: 0, dur: flight, damage: catapultDamage(state.catapultLevel) });
      state.catapultCooldown = catapultInterval(state.catapultLevel);
    }
  }
  for (const rock of state.rocks) {
    rock.t += dt;
    if (rock.t >= rock.dur && !rock.done) {
      rock.done = true;
      for (const mob of aliveMobs()) if (Math.abs(mob.x - rock.tx) <= CATAPULT_SPLASH) damageMob(mob, rock.damage, 'area');
      state.dust.push({ x: rock.tx, laneY: rock.laneY, t: 0 });
      state.shake = Math.max(state.shake, 0.12);
    }
  }
  state.rocks = state.rocks.filter((rock) => !rock.done);
  for (const puff of state.dust) puff.t += dt;
  state.dust = state.dust.filter((puff) => puff.t < 0.6);

  // Enemy arrows from orc archers hit the legionary on arrival.
  for (const shot of state.enemyShots) {
    shot.t += dt;
    if (shot.t >= shot.dur && !shot.done) {
      shot.done = true;
      if (state.guardHp > 0) hurtGuard(shot.damage, guardX);
    }
  }
  state.enemyShots = state.enemyShots.filter((shot) => !shot.done);

  // Hero volley: arrows rain on the zone in front of the legionary, then hit everything there.
  if (state.volleyFx > 0) {
    state.volleyFx = Math.max(0, state.volleyFx - dt);
    if (state.volleyFx === 0) {
      const [from, to] = VOLLEY_ZONE;
      for (const mob of aliveMobs()) {
        if (mob.x >= guardX + from && mob.x <= guardX + to) damageMob(mob, state.volleyDamage, 'area');
      }
      state.floaters.push({ kind: 'volley', amount: state.volleyDamage, x: guardX + (from + to) / 2, life: 1.4, duration: 1.4 });
      state.shake = 0.28;
    }
  }

}

function resetGame() {
  Object.assign(state, {
    townLevel: 1, patrolKills: 0, regenDelay: 0, regenFlash: 0, regenParticleTimer: 0,
    running: true, speed: 1, wave: 1, phase: 'preparation',
    guardHp: 100, maxGuardHp: 100,
    food: 0, coins: 0, kills: 0, guardLevel: 1, spikesLevel: 0, farmLevel: 1,
    waveTotal: 0, spawned: 0, defeated: 0, archerUnlocked: false, wavePlan: [], waveDifficulties: {},
    archerLevel: 0, archerCooldown: 0, arrows: [], volleyFx: 0, volleyDamage: 0, shake: 0,
    towerSlot: null, catapultUnlocked: false, catapultLevel: 0, catapultCooldown: 0, rocks: [], enemyShots: [], dust: [], notice: null, towerFx: 0,
    heroes: freshHeroes(), frontHero: 'legionary', supportHero: null, autoSpells: false, holdLine: 0, bashFx: 0, blessFx: 0, hornFx: 0, hintsSeen: [], trophies: 0, eagles: 0, systems: [], gear: [], gearDrops: 0, eliteKills: 0,
    mobs: [], spawnTimer: 0.6, patrolTimer: 4, patrolSpawned: 0, foodTimer: 3, attackCooldown: 0, attackTimer: 0,
    hitFlash: 0, floaters: [], time: 0, last: 0,
    wavesCleared: 0, villageStage: 1, stageOverride: null, growthFx: 0, growthBanner: 0
  });
  ui.speed.textContent = '⏩ 1×';
  ui.pause.textContent = 'Ⅱ Pause';
}

function upgradeLimit(kind) {
  if (kind === 'spikes') return state.wavesCleared < 3 ? 0 : state.townLevel * 2;
  if (kind === 'archer' || kind === 'catapult') return state.townLevel < 2 ? 0 : (state.townLevel - 1) * 5;
  return state.townLevel * 5;
}


function canUpgrade(kind) {
  if (!['guard', 'spikes', 'farm', 'archer', 'catapult'].includes(kind)) return false;
  return state.phase !== 'wave' && state[`${kind}Level`] < upgradeLimit(kind);
}


function collectKillReward(mob) {
  let reward = mob.reward;
  if (mob.countsForWave && systemUnlocked('armory') && (mob.type === 'troll' || mob.type === 'orcRed')) {
    state.eliteKills += 1;
    if (state.eliteKills % ELITE_DROP_EVERY === 0) {
      const item = dropGear(state.wave, false);
      state.floaters.push({ kind: 'gear', amount: gearName(item), x: mob.x, life: 1.8, duration: 1.8 });
    }
  }
  if (!mob.countsForWave) {
    state.patrolKills += 1;
    reward = 1; // patrols are the steady gold drip between waves
  }
  state.coins += reward;
  if (reward > 0) {
    state.floaters.push({ kind: 'kill', amount: reward, x: mob.x, life: 1.35, duration: 1.35 });
    sfx('coin');
  }
}

// ---------------------------------------------------------------------------
// Boss rewards (docs/META_LOOP.md): trophies raise the village level, eagles
// unlock new systems. Every 5th wave is a mini-boss, every 10th a mega-boss.
// ---------------------------------------------------------------------------
const MAX_TOWN = 7;
const SYSTEMS = [
  { id: 'armory', name: 'Armory', icon: '⚒', wave: 10, text: 'Bosses drop gear for your heroes' },
  // Barracks and Temple are designed (META_LOOP.md) but not built yet: eagles keep.
  { id: 'barracks', name: 'Barracks', icon: '⚑', wave: 20, text: 'Train heroes with food — levels without a cap', soon: true },
  { id: 'temple', name: 'Temple', icon: '☉', wave: 30, text: 'Offerings to Mars, Ceres and Minerva', soon: true }
];

function bossReward(wave) {
  if (wave % 10 === 0) return { trophies: 2, eagles: 1 };
  if (wave % 5 === 0) return { trophies: 1, eagles: 0 };
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
  showNotice('EAGLE OFFERED', `${sys.name.toUpperCase()} OPENED`, sys.text);
  sfx('fanfare');
  return true;
}

// ---------------------------------------------------------------------------
// Armory (eagle of wave 10): bosses drop gear, elites sometimes. Three slots per
// hero. Weapon: +% damage. Armour: −% damage taken. Charm: −% spell cooldown.
// ---------------------------------------------------------------------------
const GEAR_SLOTS = {
  weapon: { icon: '⚔', label: 'damage', values: [0.1, 0.2, 0.35], names: ['Iron Gladius', 'Centurion Gladius', 'Gladius of Mars'] },
  armor:  { icon: '⛨', label: 'damage taken', values: [0.08, 0.15, 0.25], names: ['Leather Lorica', 'Segmented Lorica', 'Lorica of Jupiter'] },
  charm:  { icon: '✦', label: 'spell cooldown', values: [0.08, 0.15, 0.25], names: ['Bronze Bulla', 'Silver Bulla', 'Bulla of Minerva'] }
};
const RARITY = ['Common', 'Rare', 'Epic'];
const ELITE_DROP_EVERY = 6;   // every 6th elite kill (troll / elite orc) drops an item

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

function upgradeTown() {
  if (!canUpgradeTown()) return;
  state.trophies -= 1;
  state.townLevel += 1;
  applyUnlocks();
  syncUi();
}

// Presentation timers run on real time, so banners stay readable at 2× and 100×.
function tickPresentation(delta) {
  state.growthFx = Math.max(0, state.growthFx - delta);
  state.growthBanner = Math.max(0, state.growthBanner - delta);
  if (state.notice) {
    state.notice.t -= delta;
    if (state.notice.t <= 0) state.notice = state.notice.next || null;
  }
  state.towerFx = Math.max(0, state.towerFx - delta);
  state.hornFx = Math.max(0, state.hornFx - delta);
}

function update(delta, width, simulationStep = false) {
  if (!state.running) return;
  if (!simulationStep) tickPresentation(delta);
  if (!simulationStep && state.speed > 1) {
    let remaining = delta * state.speed;
    while (remaining > 1e-9 && state.running) {
      const step = Math.min(remaining, 1 / 60);
      update(step, width, true);
      remaining -= step;
    }
    return;
  }
  const dt = delta;
  state.time += dt;
  if (state.phase === 'wave') state.spawnTimer -= dt;
  const betweenWaves = state.phase !== 'wave';
  if (betweenWaves) state.patrolTimer -= dt;
  state.foodTimer -= dt;
  state.attackCooldown = Math.max(0, state.attackCooldown - dt);
  state.attackTimer = Math.max(0, state.attackTimer - dt);
  state.hitFlash = Math.max(0, state.hitFlash - dt);

  if (state.autoSpells && state.running) autoCastSpells(width);
  const nextStage = computeVillageStage();
  if (nextStage !== state.villageStage) {
    if (nextStage > state.villageStage) {
      state.growthFx = GROWTH_POP;
      showNotice('VILLAGE', 'YOUR VILLAGE GREW!', `Stage ${nextStage}: ${villageStages[nextStage]}`);
    }
    state.villageStage = nextStage;
  }
  for (const floater of state.floaters) floater.life -= dt;
  state.floaters = state.floaters.filter((floater) => floater.life > 0);

  const opening = state.wave <= 5;
  const activeWaveMobs = state.mobs.filter(mob => mob.countsForWave && !mob.dead).length;
  const nextIsBoss = Boolean(enemyTypes[state.wavePlan[state.spawned]]?.isBoss);
  if (state.phase === 'wave' && state.spawned < state.waveTotal && state.spawnTimer <= 0
      && activeWaveMobs < (nextIsBoss ? 1 : maxConcurrent(state.wave))) {
    const nextType = state.wavePlan[state.spawned] || 'orc';
    spawnMob(nextType);
    if (enemyTypes[nextType]?.isBoss && state.notice?.kicker !== 'BOSS') {
      showNotice('BOSS', `${(wavePreviewNames[nextType] || 'Boss').toUpperCase()} APPEARS`, 'Hold the line and use your spells!');
      state.shake = Math.max(state.shake, 0.4);
      sfx('horn');
    }
    state.spawned += 1;
    state.spawnTimer = 4;
  }
  const activePatrols = state.mobs.filter((mob) => !mob.countsForWave && !mob.dead).length;
  if (betweenWaves && state.patrolTimer <= 0 && activePatrols < 2) {
    const patrolType = state.wave >= 3 && state.patrolSpawned % 4 === 3 ? 'orcDual' : 'orc';
    spawnMob(patrolType, false);
    state.patrolSpawned += 1;
    state.patrolTimer = 8 + Math.random() * 4;
  }
  state.regenDelay = Math.max(0, state.regenDelay - dt);
  state.regenFlash = Math.max(0, state.regenFlash - dt);
  state.regenParticleTimer = Math.max(0, state.regenParticleTimer - dt);
  // Check after spawning: even an approaching patrol interrupts recovery.
  const combatActive = state.phase === 'wave' || state.mobs.some((mob) => !mob.dead);
  if (combatActive) {
    state.regenDelay = 0.35;
    state.regenFlash = 0;
    state.regenParticleTimer = 0;
    state.floaters = state.floaters.filter((floater) => floater.kind !== 'heal');
  } else if (state.regenDelay === 0 && state.guardHp < state.maxGuardHp) {
    // Recover only after the entire skirmish ends, in about two seconds.
    // Recovery is deliberately calm and readable: a full heal takes about four seconds.
    state.guardHp = Math.min(state.maxGuardHp, state.guardHp + state.maxGuardHp * 0.25 * dt);
    state.regenFlash = 0.45;
    if (state.regenParticleTimer === 0) {
      for (const offset of [-32, 0, 32]) {
        state.floaters.push({ kind: 'heal', x: width * 0.52 + offset,
          offsetY: offset === 0 ? 18 : 0, life: 1.35, duration: 1.35 });
      }
      state.regenParticleTimer = 0.55;
    }
  }
  if (state.foodTimer <= 0) {
    state.food += state.farmLevel;
    state.floaters.push({ kind: 'food', amount: state.farmLevel, x: width * 0.84, life: 1.45, duration: 1.45 });
    state.foodTimer = 3;
  }

  const guardX = width * 0.52;
  const mobSpeed = 28 + state.wave * 2.5;
  // Only blockers (not swarm, not ranged while the legionary stands) fight the legionary in melee.
  const blocks = (mob) => !traitsOf(mob.type).includes('swarm') && !(traitsOf(mob.type).includes('ranged') && state.guardHp > 0);
  const frontline = state.mobs.reduce((lead, mob) => !mob.dead && blocks(mob) && (!lead || mob.x > lead.x) ? mob : lead, null);
  for (const mob of state.mobs) {
    mob.hit = Math.max(0, mob.hit - dt);
    mob.attackMotion = Math.max(0, (mob.attackMotion ?? 0) - dt);
    mob.attackCooldown = Math.max(0, mob.attackCooldown - dt);
    if (mob.dead) continue;
    // «Удар щитом»: a short shove back, then the enemy stands dazed.
    if (mob.knock > 0) {
      const shove = Math.min(mob.knock, 650 * dt);
      mob.x -= shove;
      mob.knock -= shove;
    }
    if (mob.stun > 0) {
      mob.stun = Math.max(0, mob.stun - dt);
      continue;
    }
    const traits = traitsOf(mob.type);
    if (traits.includes('aura') && !mob.dead) {
      mob.auraTimer -= dt;
      mob.auraFx = Math.max(0, mob.auraFx - dt);
      if (mob.auraTimer <= 0) {
        const amount = Math.ceil(3 * (mob.countsForWave ? getWaveDifficulty(state.wave).hp : 1));
        for (const ally of state.mobs) {
          if (ally !== mob && !ally.dead && Math.abs(ally.x - mob.x) <= 240) ally.barrier = Math.max(ally.barrier || 0, amount);
        }
        mob.auraTimer = 6;
        mob.auraFx = 0.7;
      }
    }
    const rangedNow = !mob.dead && traits.includes('ranged') && state.guardHp > 0;
    const holdX = guardX - ((enemyTypes[mob.type] || {}).range || 0) - (mob.formationX ?? 0);
    const attackX = guardX - 72 - (mob.formationX ?? 0);
    const atGuard = blocks(mob) && state.guardHp > 0 && mob.x >= attackX;
    if (rangedNow && mob.x >= holdX) {
      mob.x = Math.min(mob.x, holdX);
      if (mob.attackCooldown <= 0) {
        state.enemyShots.push({ sx: mob.x + 18, laneY: mob.laneY ?? 0, t: 0, dur: 0.55, damage: mob.damage });
        sfx('arrow', true);
        mob.attackMotion = 0.32;
        mob.attackCooldown = mob.attackRate;
      }
    } else if (atGuard) {
      mob.x = Math.min(mob.x, attackX);
      if (mob === frontline && mob.attackCooldown <= 0) {
        const charge = traits.includes('charge') && !mob.charged;
        mob.charged = true;
        const enraged = traits.includes('enrage') && mob.hp < mob.maxHp / 2;
        hurtGuard((charge ? mob.damage * 2 : mob.damage) * (enraged ? 1.5 : 1), guardX);
        mob.attackMotion = 0.32;
        mob.attackCooldown = mob.attackRate;
      }
    } else {
      mob.x += mobSpeed * mob.speed * (opening ? 2.5 : 1) * dt;
    }

    if (state.spikesLevel > 0 && !mob.dead && mob.x >= guardX - 212 && mob.x <= guardX - 156) {
      mob.spikesCooldown = Math.max(0, (mob.spikesCooldown ?? 0) - dt);
      if (mob.spikesCooldown <= 0) {
        mob.spikesCooldown = 0.75;
        const dealt = damageMob(mob, state.spikesLevel, 'contact');
        state.floaters.push({ kind: 'spikes', amount: Math.round(dealt * 10) / 10, x: mob.x, life: 0.9, duration: 0.9 });
      }
    }
  }

  const target = state.mobs.reduce((lead, mob) => (
    !mob.dead && mob.x > guardX - 130 && mob.x < guardX - 10 && (!lead || mob.x > lead.x) ? mob : lead
  ), null);
  if (state.guardHp > 0 && target && state.attackCooldown <= 0) {
    damageMob(target, state.guardLevel * heroDefs[state.frontHero].damageMult * heroPowerMult(state.frontHero) * (1 + gearBonus(state.frontHero, 'weapon')), 'melee');
    sfx('sword');
    state.attackTimer = 0.28;
    state.hitFlash = 0.14;
    state.attackCooldown = guardAttackInterval(state.guardLevel);
  }

  updateDefenders(dt, width);

  state.mobs = state.mobs.filter((mob) => {
    if (mob.dead) return mob.hit > 0;
    if (mob.x > guardX + 8) {
      // Mark it gone so arrows or rocks already in flight cannot count it twice.
      mob.dead = true;
      mob.hit = 0;
      if (mob.countsForWave) state.defeated += 1;
      stealLoot(mob, width);
      return false;
    }
    return mob.x < width + 120;
  });
  if (state.phase === 'wave' && state.guardHp <= 0) failWave();
  else if (state.phase === 'wave' && state.spawned === state.waveTotal && state.defeated === state.waveTotal && state.mobs.length === 0) finishWave();
}

function roundedRect(x, y, width, height, radius, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCloud(image, width, height, options) {
  if (!image) return;
  const spriteWidth = width * options.width;
  const spriteHeight = spriteWidth * image.height / image.width;
  const travel = width + spriteWidth * 1.5;
  const start = options.x * width + spriteWidth * 0.25;
  const x = ((start + state.time * options.speed + spriteWidth * 0.75) % travel) - spriteWidth * 0.75;
  const bob = Math.sin(state.time * options.bobSpeed + options.phase) * options.bob;
  const pulse = 1 + Math.sin(state.time * options.pulseSpeed + options.phase) * options.pulse;
  ctx.save();
  ctx.globalAlpha = options.opacity * pulse;
  ctx.translate(x + spriteWidth / 2, options.y * height + bob + spriteHeight / 2);
  if (options.flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
  ctx.restore();
}

function drawSkyLayers(width, height) {
  // A restrained sunlight bloom keeps the center readable and warms the village side.
  const glow = ctx.createRadialGradient(width * 0.76, height * 0.10, 0, width * 0.76, height * 0.10, width * 0.42);
  glow.addColorStop(0, '#fff0bd5c');
  glow.addColorStop(0.42, '#fff4ce24');
  glow.addColorStop(1, '#fff4ce00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height * 0.72);

  drawCloud(skyLayers.wisp, width, height, {
    x: 0.03, y: 0.03, width: 0.24, opacity: 0.30, speed: 2.2, phase: 0.6,
    bob: 2, bobSpeed: 0.18, pulse: 0.025, pulseSpeed: 0.22
  });
  drawCloud(skyLayers.bank, width, height, {
    x: 0.20, y: 0.13, width: 0.34, opacity: 0.24, speed: 1.1, phase: 1.7,
    bob: 1.5, bobSpeed: 0.12, pulse: 0.02, pulseSpeed: 0.17
  });
  drawCloud(skyLayers.cumulus, width, height, {
    x: 0.52, y: 0.035, width: 0.22, opacity: 0.43, speed: 1.7, phase: 2.8,
    bob: 3, bobSpeed: 0.20, pulse: 0.035, pulseSpeed: 0.26, flip: true
  });
  drawCloud(skyLayers.wisp, width, height, {
    x: 0.76, y: 0.20, width: 0.17, opacity: 0.25, speed: 2.6, phase: 4.1,
    bob: 2.5, bobSpeed: 0.24, pulse: 0.03, pulseSpeed: 0.24, flip: true
  });
  drawCloud(skyLayers.sunlit, width, height, {
    x: 0.88, y: -0.015, width: 0.16, opacity: 0.23, speed: 1.35, phase: 5.3,
    bob: 2, bobSpeed: 0.15, pulse: 0.08, pulseSpeed: 0.34
  });
  drawCloud(skyLayers.cumulus, width, height, {
    x: -0.12, y: 0.23, width: 0.13, opacity: 0.27, speed: 1.9, phase: 3.4,
    bob: 2, bobSpeed: 0.21, pulse: 0.025, pulseSpeed: 0.20
  });
}

function drawLandscapeImage(image, width, bottom, scale, opacity, drift = 0, heightScale = 1) {
  if (!image) return;
  const drawWidth = width * scale;
  const drawHeight = drawWidth * image.height / image.width * heightScale;
  const x = (width - drawWidth) / 2 + Math.sin(state.time * 0.035) * drift;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, x, bottom - drawHeight, drawWidth, drawHeight);
  ctx.restore();
}

function drawLandscapeTileStrip(image, width, bottom, tileScale, drift = 0) {
  if (!image) return;
  const tileWidth = width * tileScale;
  const tileHeight = tileWidth * image.height / image.width;
  const shift = Math.sin(state.time * 0.03) * drift;
  const firstX = -tileWidth + shift;
  const tileCount = Math.ceil((width - firstX) / tileWidth) + 1;

  ctx.save();
  for (let index = 0; index < tileCount; index++) {
    const x = firstX + index * tileWidth;
    ctx.drawImage(image, x, bottom - tileHeight, tileWidth, tileHeight);
  }
  ctx.restore();
}

function tintLandscapeLayer(image, color, amount, haze = 0) {
  const tinted = document.createElement('canvas');
  tinted.width = image.width;
  tinted.height = image.height;
  const tintedCtx = tinted.getContext('2d');
  tintedCtx.drawImage(image, 0, 0);
  tintedCtx.globalCompositeOperation = 'source-atop';
  tintedCtx.globalAlpha = amount;
  tintedCtx.fillStyle = color;
  tintedCtx.fillRect(0, 0, tinted.width, tinted.height);
  if (haze > 0) {
    tintedCtx.globalCompositeOperation = 'source-atop';
    tintedCtx.globalAlpha = haze;
    tintedCtx.fillStyle = '#c9e5ed';
    tintedCtx.fillRect(0, 0, tinted.width, tinted.height);
  }
  tintedCtx.globalAlpha = 1;
  tintedCtx.globalCompositeOperation = 'source-over';
  return tinted;
}

function drawCartoonTree(x, baseY, scale, type = 'olive', phase = 0, opacity = 1) {
  const sway = Math.sin(state.time * 0.52 + phase) * 0.009;
  const outline = '#33452f';
  const dark = '#3f6139';
  const mid = '#668b48';
  const light = '#9fba58';
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, baseY);
  ctx.rotate(sway);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (type === 'cypress') {
    ctx.strokeStyle = '#58402d';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath(); ctx.moveTo(0, 2 * scale); ctx.lineTo(0, -43 * scale); ctx.stroke();
    ctx.fillStyle = dark;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(0, -92 * scale);
    ctx.bezierCurveTo(17 * scale, -70 * scale, 13 * scale, -28 * scale, 0, -12 * scale);
    ctx.bezierCurveTo(-13 * scale, -28 * scale, -17 * scale, -70 * scale, 0, -92 * scale);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.ellipse(-3 * scale, -57 * scale, 5 * scale, 23 * scale, 0.08, 0, Math.PI * 2); ctx.fill();
  } else {
    const trunkHeight = type === 'pine' ? 52 : 42;
    ctx.strokeStyle = '#513827';
    ctx.lineWidth = 8 * scale;
    ctx.beginPath(); ctx.moveTo(0, 3 * scale); ctx.lineTo(-1 * scale, -trunkHeight * scale); ctx.stroke();
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(-2 * scale, -32 * scale); ctx.lineTo(-18 * scale, -49 * scale);
    ctx.moveTo(0, -35 * scale); ctx.lineTo(18 * scale, -52 * scale);
    ctx.stroke();

    const blobs = type === 'pine'
      ? [[-22,-57,27,17], [5,-64,33,20], [30,-56,25,16], [-1,-76,25,16]]
      : [[-23,-48,22,19], [2,-57,28,22], [27,-47,22,18], [-4,-39,27,18]];
    for (const [bx, by, rx, ry] of blobs) {
      ctx.fillStyle = dark; ctx.strokeStyle = outline; ctx.lineWidth = 2.2 * scale;
      ctx.beginPath(); ctx.ellipse(bx * scale, by * scale, rx * scale, ry * scale, -0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.ellipse(-8 * scale, -60 * scale, 27 * scale, 14 * scale, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.ellipse(-15 * scale, -67 * scale, 13 * scale, 6 * scale, -0.18, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawLandscapeLayers(width, height, ground) {
  // Only the remote mountains are gently compressed. Tree strips keep their native aspect ratio.
  drawLandscapeImage(landscapeLayers.mountains, width, ground * 0.78, 1.02, 1, 2, 0.76);
  drawLandscapeTileStrip(landscapeLayers.hills, width, ground * 0.82, 0.52, 2.5);
  drawLandscapeTileStrip(landscapeLayers.treeline, width, ground * 0.84, 0.38, 3.5);
}

// ---------------------------------------------------------------------------
// Ground layer: meadow + dirt road. Everything here is static, so it is
// painted once into an offscreen canvas and reused every frame.
// ---------------------------------------------------------------------------
let groundCache = null;
let groundCacheKey = '';

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRoadGeometry(width, ground) {
  const top = ground - 44;
  const bottom = ground + 74;
  const end = width * 0.64; // ends at the tower so the village side stays grass
  // Soft, organic edges: two slow waves plus a small irregular wobble.
  const topEdge = x => top + Math.sin(x * 0.021 + 0.7) * 3.2 + Math.sin(x * 0.067) * 1.4 + Math.sin(x * 0.19 + 2) * 0.6;
  const bottomEdge = x => bottom + Math.sin(x * 0.017 + 2.1) * 3.6 + Math.sin(x * 0.059 + 1) * 1.6 + Math.sin(x * 0.23) * 0.7;
  return { top, bottom, end, topEdge, bottomEdge };
}

function traceRoadShape(g, road, inset = 0) {
  g.beginPath();
  g.moveTo(-4, road.topEdge(0) + inset);
  for (let x = 0; x <= road.end; x += 6) g.lineTo(x, road.topEdge(x) + inset);
  // Rounded tail that tucks under the farm plot.
  g.quadraticCurveTo(road.end + 26, (road.top + road.bottom) / 2, road.end, road.bottomEdge(road.end) - inset);
  for (let x = Math.floor(road.end / 6) * 6; x >= 0; x -= 6) g.lineTo(x, road.bottomEdge(x) - inset);
  g.lineTo(-4, road.bottomEdge(0) - inset);
  g.closePath();
}

function drawGrassClump(g, x, y, size, rng, palette) {
  const blades = 3 + Math.floor(rng() * 3);
  const lean = (rng() - 0.5) * 0.6;
  g.lineJoin = 'round';
  for (let b = 0; b < blades; b++) {
    const t = blades === 1 ? 0 : b / (blades - 1) - 0.5;
    const h = size * (0.65 + rng() * 0.55) * (1 - Math.abs(t) * 0.45);
    const baseX = x + t * size * 0.55;
    const tipX = baseX + (t * 0.9 + lean) * size * 0.75;
    const tipY = y - h;
    const w = size * 0.13;
    g.beginPath();
    g.moveTo(baseX - w, y);
    g.quadraticCurveTo(baseX - w * 0.4 + (tipX - baseX) * 0.25, y - h * 0.55, tipX, tipY);
    g.quadraticCurveTo(baseX + w * 0.6 + (tipX - baseX) * 0.35, y - h * 0.5, baseX + w, y);
    g.closePath();
    g.fillStyle = b % 2 ? palette.mid : palette.dark;
    g.fill();
    g.strokeStyle = palette.outline;
    g.lineWidth = Math.max(0.8, size * 0.06);
    g.stroke();
  }
  // A single highlight blade keeps the clump readable against the meadow.
  g.beginPath();
  g.moveTo(x - size * 0.05, y - 0.5);
  g.quadraticCurveTo(x + lean * size * 0.3, y - size * 0.5, x + lean * size * 0.6 + size * 0.06, y - size * 0.85);
  g.strokeStyle = palette.light;
  g.lineWidth = Math.max(0.8, size * 0.07);
  g.stroke();
}

function paintGroundLayer(g, width, height, ground) {
  const rng = makeRng(1337);
  const road = getRoadGeometry(width, ground);
  const meadowTop = x => ground * 0.79 + Math.sin(x * 0.006 + 1.2) * 4 + Math.sin(x * 0.017) * 2;

  // 1. Far meadow ridge that tucks the treeline in.
  // Its top sits just above the base of the tree strip so no sky gap shows through.
  const farTop = x => ground * 0.732 + Math.sin(x * 0.009 + 0.4) * 2.5 + Math.sin(x * 0.031) * 1.2;
  const farMeadow = g.createLinearGradient(0, ground * 0.72, 0, ground * 0.8);
  farMeadow.addColorStop(0, '#6f9446');
  farMeadow.addColorStop(0.25, '#7ea452');
  farMeadow.addColorStop(1, '#88af5a');
  g.fillStyle = farMeadow;
  g.beginPath();
  g.moveTo(0, farTop(0));
  for (let x = 0; x <= width; x += 10) g.lineTo(x, farTop(x));
  g.lineTo(width, height); g.lineTo(0, height); g.closePath();
  g.fill();
  if (landscapeLayers.grass) {
    const farPattern = g.createPattern(landscapeLayers.grass, 'repeat');
    if (farPattern) {
      farPattern.setTransform(new DOMMatrix().scale(0.12, 0.08));
      g.save();
      g.clip();
      g.globalCompositeOperation = 'soft-light';
      g.globalAlpha = 0.6;
      g.fillStyle = farPattern;
      g.fillRect(0, ground * 0.7, width, ground * 0.12);
      g.restore();
    }
  }
  // Small bushes hide the seam between the tree strip and the meadow.
  for (let x = -6; x < width + 6; x += 9 + rng() * 14) {
    const y = farTop(x) + 1;
    const r = 3 + rng() * 4;
    g.fillStyle = rng() > 0.5 ? '#5f8a3e' : '#6c9645';
    g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0, Math.PI, 0); g.fill();
  }

  // 2. Main meadow with a gentle wavy horizon instead of a ruler-straight edge.
  const meadow = g.createLinearGradient(0, ground * 0.77, 0, height);
  meadow.addColorStop(0, '#96bd5e');
  meadow.addColorStop(0.35, '#8db657');
  meadow.addColorStop(0.75, '#7ca64b');
  meadow.addColorStop(1, '#68903f');
  g.fillStyle = meadow;
  g.beginPath();
  g.moveTo(0, meadowTop(0));
  for (let x = 0; x <= width; x += 10) g.lineTo(x, meadowTop(x));
  g.lineTo(width, height); g.lineTo(0, height); g.closePath();
  g.fill();
  g.save();
  g.clip();

  // Painted grass texture, blended so it adds detail but keeps the cartoon palette.
  if (landscapeLayers.grass) {
    const pattern = g.createPattern(landscapeLayers.grass, 'repeat');
    if (pattern) {
      pattern.setTransform(new DOMMatrix().translate(0, ground * 0.79).scale(0.2));
      g.globalCompositeOperation = 'soft-light';
      g.globalAlpha = 0.85;
      g.fillStyle = pattern;
      g.fillRect(0, ground * 0.7, width, height);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
  }

  // Sunlit patches and soft cloud shadows break up the flat green.
  for (let i = 0; i < 9; i++) {
    const x = rng() * width;
    const y = ground * 0.82 + rng() * (height - ground * 0.82);
    const rx = 60 + rng() * 110;
    const sunny = i % 3 !== 0;
    const patch = g.createRadialGradient(x, y, 0, x, y, rx);
    patch.addColorStop(0, sunny ? 'rgba(214, 236, 140, 0.22)' : 'rgba(54, 92, 40, 0.16)');
    patch.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = patch;
    g.save();
    g.translate(x, y); g.scale(1, 0.28); g.translate(-x, -y);
    g.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    g.restore();
  }

  // Soft shading right under the horizon so the meadow reads as a separate plane.
  const horizonShade = g.createLinearGradient(0, ground * 0.78, 0, ground * 0.86);
  horizonShade.addColorStop(0, 'rgba(60, 96, 44, 0.28)');
  horizonShade.addColorStop(1, 'rgba(60, 96, 44, 0)');
  g.fillStyle = horizonShade;
  g.fillRect(0, ground * 0.77, width, ground * 0.1);
  g.restore();

  // Rim light along the meadow horizon.
  g.beginPath();
  g.moveTo(0, meadowTop(0));
  for (let x = 0; x <= width; x += 10) g.lineTo(x, meadowTop(x));
  g.strokeStyle = 'rgba(196, 224, 140, 0.45)';
  g.lineWidth = 1.5;
  g.stroke();

  // 3. Dirt road.
  g.save();
  traceRoadShape(g, road);
  // Contact shadow so the road sits slightly lower than the grass.
  g.shadowColor = 'rgba(52, 64, 30, 0.35)';
  g.shadowBlur = 6;
  g.shadowOffsetY = -2;
  const dirt = g.createLinearGradient(0, road.top, 0, road.bottom);
  dirt.addColorStop(0, '#c9a467');
  dirt.addColorStop(0.18, '#ddbf84');
  dirt.addColorStop(0.55, '#e6cc93');
  dirt.addColorStop(0.85, '#d9b97c');
  dirt.addColorStop(1, '#c39e63');
  g.fillStyle = dirt;
  g.fill();
  g.shadowColor = 'transparent';
  g.clip();

  // Inner edge darkening, like packed dirt meeting the turf.
  g.strokeStyle = 'rgba(140, 104, 58, 0.45)';
  g.lineWidth = 7;
  traceRoadShape(g, road);
  g.stroke();

  // Large mottled dirt patches.
  for (let i = 0; i < road.end / 28; i++) {
    const x = rng() * road.end;
    const y = road.top + 8 + rng() * (road.bottom - road.top - 16);
    const rx = 14 + rng() * 34;
    const light = rng() > 0.45;
    g.fillStyle = light ? 'rgba(246, 226, 172, 0.28)' : 'rgba(176, 136, 82, 0.10)';
    g.beginPath(); g.ellipse(x, y, rx, rx * (0.22 + rng() * 0.12), (rng() - 0.5) * 0.2, 0, Math.PI * 2); g.fill();
  }

  // Two worn cart ruts running toward the gate.
  for (const [k, phase] of [[0.36, 0.4], [0.7, 2.2]]) {
    const ry = x => road.top + (road.bottom - road.top) * k + Math.sin(x * 0.013 + phase) * 2.2;
    // A horizontal gradient fades the rut in and out so it reads as wear, not a stripe.
    const fade = (r, gC, bC, maxA) => {
      const grad = g.createLinearGradient(0, 0, road.end, 0);
      for (let i = 0; i <= 10; i++) grad.addColorStop(i / 10, `rgba(${r}, ${gC}, ${bC}, ${(maxA * (0.25 + rng() * 0.75)).toFixed(3)})`);
      return grad;
    };
    const rutPath = dy => {
      g.beginPath();
      for (let x = 0; x <= road.end; x += 6) x === 0 ? g.moveTo(x, ry(x) + dy) : g.lineTo(x, ry(x) + dy);
    };
    rutPath(0); g.strokeStyle = fade(150, 110, 60, 0.22); g.lineWidth = 8; g.stroke();
    rutPath(-0.5); g.strokeStyle = fade(140, 100, 54, 0.18); g.lineWidth = 3; g.stroke();
    rutPath(4.5); g.strokeStyle = fade(252, 238, 196, 0.5); g.lineWidth = 1.4; g.stroke();
  }

  // Fine grit.
  for (let i = 0; i < road.end / 3; i++) {
    const x = rng() * road.end;
    const y = road.top + 4 + rng() * (road.bottom - road.top - 8);
    g.fillStyle = rng() > 0.5 ? 'rgba(150, 112, 64, 0.35)' : 'rgba(255, 244, 210, 0.5)';
    g.fillRect(x, y, 1 + rng() * 1.4, 1);
  }

  // Cartoon pebbles with outline, highlight and a tiny shadow.
  for (let i = 0; i < road.end / 22; i++) {
    const x = rng() * road.end;
    const nearEdge = rng() < 0.55;
    const y = nearEdge
      ? (rng() < 0.5 ? road.topEdge(x) + 6 + rng() * 8 : road.bottomEdge(x) - 6 - rng() * 8)
      : road.top + 14 + rng() * (road.bottom - road.top - 28);
    const r = 1.6 + rng() * (nearEdge ? 3.2 : 2);
    g.fillStyle = 'rgba(110, 82, 46, 0.35)';
    g.beginPath(); g.ellipse(x + 1, y + r * 0.55, r * 1.25, r * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = ['#b7ab8c', '#c9bb98', '#a59a7e', '#d3c5a1'][i % 4];
    g.strokeStyle = '#7d6a4c';
    g.lineWidth = 0.9;
    g.beginPath(); g.ellipse(x, y, r * 1.2, r * 0.8, (rng() - 0.5) * 0.6, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255, 250, 230, 0.75)';
    g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.3, r * 0.45, r * 0.22, -0.3, 0, Math.PI * 2); g.fill();
  }
  g.restore();

  // 4. Grass spilling over both road edges hides the hard border.
  const edgePalette = { dark: '#5f8a3c', mid: '#76a347', light: '#b5d77a', outline: '#3f6029' };
  const edgeFringe = (edge, offset, minSize, spread) => {
    for (let x = -4; x < road.end - 4; ) {
      // Occasional bare gaps and bigger clumps keep the fringe from looking like a fence.
      if (rng() < 0.12) { x += 14 + rng() * 26; continue; }
      const big = rng() < 0.18;
      const size = minSize + rng() * spread + (big ? spread : 0);
      drawGrassClump(g, x, edge(x) + offset + rng() * 3, size, rng, edgePalette);
      x += (big ? 10 : 5) + rng() * 10;
    }
  };
  edgeFringe(road.topEdge, 3, 4, 5);
  edgeFringe(road.bottomEdge, 6, 7, 7);

  // 5. Meadow tufts and a few tiny flowers, larger toward the viewer.
  const fieldTop = ground * 0.8;
  const onRoad = (x, y) => x < road.end + 30 && y > road.topEdge(x) - 4 && y < road.bottomEdge(x) + 14;
  const tuftPalette = { dark: '#5d873a', mid: '#6f9c43', light: '#a9cf6e', outline: '#44652c' };
  for (let i = 0; i < 70; i++) {
    const x = rng() * width;
    const y = fieldTop + Math.pow(rng(), 0.8) * (height - fieldTop);
    if (onRoad(x, y)) continue;
    const depth = (y - fieldTop) / (height - fieldTop);
    drawGrassClump(g, x, y, 4 + depth * 11 + rng() * 3, rng, tuftPalette);
  }
  const flowerColors = ['#fff6dc', '#f7d65a', '#f2a7b5'];
  for (let i = 0; i < 26; i++) {
    const x = rng() * width;
    const y = fieldTop + 6 + rng() * (height - fieldTop - 6);
    if (onRoad(x, y)) continue;
    const r = 1.2 + (y - fieldTop) / (height - fieldTop) * 1.6;
    g.fillStyle = '#4f7432';
    g.fillRect(x - 0.4, y, 0.8, r * 2.4);
    g.fillStyle = flowerColors[i % flowerColors.length];
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d99a2b';
    g.beginPath(); g.arc(x, y, r * 0.38, 0, Math.PI * 2); g.fill();
  }
}

function drawGroundLayer(width, height, ground) {
  const key = `${canvas.width}x${canvas.height}:${landscapeLayers.grass ? 1 : 0}`;
  if (!groundCache || groundCacheKey !== key) {
    groundCache = groundCache || document.createElement('canvas');
    groundCache.width = canvas.width;
    groundCache.height = canvas.height;
    const g = groundCache.getContext('2d');
    g.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    g.clearRect(0, 0, width, height);
    paintGroundLayer(g, width, height, ground);
    groundCacheKey = key;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(groundCache, 0, 0);
  ctx.restore();
}

function drawBackground(width, height) {
  const ground = height * 0.82;
  const sky = ctx.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, '#b9ddec');
  sky.addColorStop(0.58, '#d9e8d5');
  sky.addColorStop(1, '#eef0c9');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  drawSkyLayers(width, height);
  drawLandscapeLayers(width, height, ground);

  drawGroundLayer(width, height, ground);

  // The farm and buildings are drawn by drawVillage*() so they can grow by stage.
}

// ---------------------------------------------------------------------------
// Village growth — hyper-casual style matched to the character sheets:
// chunky rounded shapes, thick dark-brown outline, flat fills with one
// light and one shade tone, warm saturated palette.
// ---------------------------------------------------------------------------
const INK = '#3a2516';

function strokeInk(width = 3) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.stroke();
}

function fillInk(fill, width = 3) {
  ctx.fillStyle = fill;
  ctx.fill();
  strokeInk(width);
}

function easeOutBack(t) {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Elements introduced by the current stage pop in with a bounce.
function growthScale(introducedAt) {
  if (introducedAt !== state.villageStage || state.growthFx <= 0) return 1;
  return Math.max(0.01, easeOutBack(1 - state.growthFx / GROWTH_POP));
}

function placed(x, baseY, scale, introducedAt, draw) {
  const pop = growthScale(introducedAt);
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale * pop, scale * (pop < 1 ? Math.min(1.12, pop * 1.06) : 1));
  draw();
  ctx.restore();
}

function drawWarmWindow(x, y, w, h) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, [w / 2, w / 2, 3, 3]);
  fillInk('#ffd56e', 2.5);
  ctx.fillStyle = '#ffeeb0';
  ctx.beginPath(); ctx.roundRect(x + 3, y + 4, w * 0.35, h * 0.45, 3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + 2); ctx.lineTo(x + w / 2, y + h); strokeInk(2);
}

function drawTileRoof(halfBottom, halfTop, height, color, shade, light) {
  ctx.beginPath();
  ctx.moveTo(-halfBottom, 0);
  ctx.lineTo(-halfTop, -height);
  ctx.quadraticCurveTo(0, -height - 8, halfTop, -height);
  ctx.lineTo(halfBottom, 0);
  ctx.quadraticCurveTo(0, 6, -halfBottom, 0);
  fillInk(color);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = shade;
  ctx.lineWidth = 2.5;
  for (let row = 1; row < 4; row++) {
    const y = -height * row / 4;
    ctx.beginPath();
    for (let x = -halfBottom; x < halfBottom; x += 14) {
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 7, y + 6, x + 14, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = light;
  ctx.fillRect(-halfBottom, -height - 10, halfBottom * 2, 9);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-halfBottom, 0);
  ctx.lineTo(-halfTop, -height);
  ctx.quadraticCurveTo(0, -height - 8, halfTop, -height);
  ctx.lineTo(halfBottom, 0);
  ctx.quadraticCurveTo(0, 6, -halfBottom, 0);
  strokeInk(3);
}

function drawSmoke(x, y) {
  for (let i = 0; i < 3; i++) {
    const phase = (state.time * 0.45 + i / 3) % 1;
    ctx.globalAlpha = 0.65 * (1 - phase);
    ctx.fillStyle = '#f6f1e6';
    ctx.beginPath();
    ctx.arc(x + Math.sin(phase * 5 + i) * 5, y - phase * 46, 5 + phase * 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Stage 1 — plank hut on a stone footing with a layered thatch roof.
function drawHut() {
  // Woodpile leaning on the right wall.
  for (const [lx, ly] of [[48, -7], [61, -7], [74, -7], [54.5, -18], [67.5, -18], [61, -29]]) {
    ctx.beginPath(); ctx.arc(lx, ly, 5.5, 0, Math.PI * 2); fillInk('#e3b77a', 2);
    ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2); ctx.strokeStyle = '#b07a43'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  // Plank walls.
  ctx.beginPath(); ctx.roundRect(-50, -66, 100, 58, 5); fillInk('#cf8f4e');
  ctx.save();
  ctx.beginPath(); ctx.roundRect(-50, -66, 100, 58, 5); ctx.clip();
  ctx.fillStyle = '#b07038'; ctx.fillRect(28, -66, 22, 58);
  ctx.strokeStyle = '#a2652f'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const py of [-52, -38, -24]) { ctx.moveTo(-50, py); ctx.lineTo(50, py); }
  ctx.stroke();
  ctx.fillStyle = '#e2a865';
  ctx.fillRect(-48, -64, 76, 4);
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(-50, -66, 100, 58, 5); strokeInk(3);
  // Corner posts.
  for (const px of [-50, 46]) { ctx.beginPath(); ctx.roundRect(px - 2, -68, 8, 62, 3); fillInk('#8c552c', 2.5); }
  // Stone footing.
  ctx.beginPath(); ctx.roundRect(-56, -12, 112, 14, 6); fillInk('#b9ad97');
  ctx.fillStyle = '#d6ccb6';
  for (const sx of [-44, -18, 10, 36]) { ctx.beginPath(); ctx.ellipse(sx, -7, 9, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#8f846f'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const sx of [-31, -4, 23]) { ctx.moveTo(sx, -11); ctx.lineTo(sx, 1); }
  ctx.stroke();
  // Door with frame, planks and a step.
  ctx.beginPath(); ctx.roundRect(-17, -50, 34, 40, [17, 17, 0, 0]); fillInk('#8c552c', 2.5);
  ctx.beginPath(); ctx.roundRect(-13, -46, 26, 36, [13, 13, 0, 0]); fillInk('#6e3f22', 2);
  ctx.strokeStyle = '#5a321a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-4, -44); ctx.lineTo(-4, -10); ctx.moveTo(5, -44); ctx.lineTo(5, -10); ctx.stroke();
  ctx.beginPath(); ctx.arc(8, -26, 2, 0, Math.PI * 2); ctx.fillStyle = '#f0c35a'; ctx.fill();
  ctx.beginPath(); ctx.roundRect(-20, -4, 40, 6, 3); fillInk('#a79a82', 2);
  // Window with shutters.
  ctx.beginPath(); ctx.roundRect(-46, -56, 7, 22, 2); fillInk('#5f8a3e', 2);
  ctx.beginPath(); ctx.roundRect(-23, -56, 7, 22, 2); fillInk('#5f8a3e', 2);
  drawWarmWindow(-39, -56, 16, 22);
  // Layered thatch: back mass, scalloped fringe, highlight strands.
  ctx.beginPath();
  ctx.moveTo(-70, -56);
  ctx.quadraticCurveTo(-38, -112, 0, -124);
  ctx.quadraticCurveTo(38, -112, 70, -56);
  ctx.quadraticCurveTo(0, -66, -70, -56);
  fillInk('#e2ad48');
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#c99436';
  ctx.beginPath(); ctx.moveTo(20, -120); ctx.quadraticCurveTo(48, -100, 72, -56); ctx.lineTo(30, -60); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#b5832e'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const t of [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]) { ctx.moveTo(t * 34, -114 + Math.abs(t) * 34); ctx.lineTo(t * 76, -60); }
  ctx.stroke();
  ctx.strokeStyle = '#f7d77f'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const t of [-0.62, -0.37, -0.12]) { ctx.moveTo(t * 30, -108 + Math.abs(t) * 30); ctx.lineTo(t * 54, -82); }
  ctx.stroke();
  ctx.restore();
  // Scalloped eave fringe.
  ctx.beginPath();
  ctx.moveTo(-72, -58);
  for (let x = -72; x < 72; x += 12) ctx.quadraticCurveTo(x + 6, -46, x + 12, -58 + (x > -10 && x < 10 ? 0 : 0));
  ctx.quadraticCurveTo(0, -68, -72, -58);
  fillInk('#d49b3c', 2.5);
  // Ridge binding.
  ctx.beginPath(); ctx.ellipse(0, -122, 12, 5, 0, 0, Math.PI * 2); fillInk('#b5832e', 2.5);
  ctx.fillStyle = '#fbe6a4';
  ctx.beginPath(); ctx.ellipse(-22, -98, 13, 4.5, -0.55, 0, Math.PI * 2); ctx.fill();
  drawSmoke(26, -128);
}

// Stage 2 — plastered farmhouse with timber frame and tile roof.
function drawHouse() {
  ctx.beginPath(); ctx.roundRect(-58, -78, 116, 78, 5); fillInk('#f3e0b8');
  ctx.fillStyle = '#dcc196'; ctx.fillRect(34, -75, 21, 72);
  ctx.strokeStyle = '#7b4a2b'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-56, -40); ctx.lineTo(56, -40);
  ctx.moveTo(-30, -76); ctx.lineTo(-30, -2);
  ctx.moveTo(30, -76); ctx.lineTo(30, -2);
  ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-58, -78, 116, 78, 5); strokeInk(3);
  ctx.beginPath(); ctx.roundRect(-14, -38, 28, 38, [14, 14, 0, 0]); fillInk('#7a4425');
  drawWarmWindow(-50, -70, 16, 22);
  drawWarmWindow(36, -70, 16, 22);
  drawWarmWindow(-8, -72, 16, 22);
  // Chimney sits behind the roof line.
  ctx.beginPath(); ctx.roundRect(28, -130, 16, 34, 3); fillInk('#a59584');
  drawSmoke(36, -136);
  ctx.save(); ctx.translate(0, -74); drawTileRoof(72, 46, 46, '#d35a34', '#a8402a', '#ee7b47'); ctx.restore();
  // Flower box.
  ctx.beginPath(); ctx.roundRect(-54, -48, 24, 7, 3); fillInk('#8a5430', 2);
  for (const [fx, c] of [[-50, '#e2574c'], [-43, '#ffd56e'], [-36, '#e2574c']]) {
    ctx.beginPath(); ctx.arc(fx, -51, 3, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
  }
}

// Stage 3 — two-storey Roman villa with columns and banner.
function drawVilla() {
  ctx.beginPath(); ctx.roundRect(-80, -128, 160, 128, 6); fillInk('#f7ead0');
  ctx.fillStyle = '#e2cfa8'; ctx.fillRect(52, -125, 25, 122);
  ctx.beginPath(); ctx.roundRect(-80, -128, 160, 128, 6); strokeInk(3);
  // Floor ledge.
  ctx.beginPath(); ctx.roundRect(-86, -68, 172, 12, 4); fillInk('#c9b28a');
  // Ground floor colonnade.
  for (const cx of [-58, -22, 22, 58]) {
    ctx.beginPath(); ctx.roundRect(cx - 7, -56, 14, 56, 3); fillInk('#ffffff', 2.5);
    ctx.beginPath(); ctx.roundRect(cx - 10, -60, 20, 6, 2); fillInk('#e9dcc2', 2);
  }
  ctx.beginPath(); ctx.roundRect(-12, -46, 24, 46, [12, 12, 0, 0]); fillInk('#7a4425');
  // Upper windows.
  for (const wx of [-62, -28, 6, 40]) drawWarmWindow(wx, -112, 18, 26);
  ctx.beginPath(); ctx.roundRect(-36, -152, 14, 28, 3); fillInk('#a59584');
  drawSmoke(-29, -156);
  ctx.save(); ctx.translate(0, -124); drawTileRoof(96, 64, 44, '#d35a34', '#a8402a', '#ee7b47'); ctx.restore();
  // Pediment emblem.
  ctx.beginPath(); ctx.arc(0, -146, 9, 0, Math.PI * 2); fillInk('#f0c35a', 2.5);
  // Hanging banner.
  const sway = Math.sin(state.time * 1.6) * 2;
  ctx.beginPath();
  ctx.moveTo(66, -122); ctx.lineTo(88, -122); ctx.lineTo(88 + sway, -70); ctx.lineTo(77 + sway, -78); ctx.lineTo(66 + sway, -70);
  ctx.closePath(); fillInk('#c23b32', 2.5);
  ctx.beginPath(); ctx.arc(77 + sway * 0.5, -102, 6, 0, Math.PI * 2); fillInk('#f0c35a', 2);
}

function drawWindmill() {
  ctx.beginPath();
  ctx.moveTo(-26, 0); ctx.lineTo(-15, -118); ctx.lineTo(15, -118); ctx.lineTo(26, 0);
  ctx.quadraticCurveTo(0, 5, -26, 0);
  fillInk('#ece0c6');
  ctx.fillStyle = '#d6c6a3';
  ctx.beginPath(); ctx.moveTo(10, -116); ctx.lineTo(23, -3); ctx.lineTo(13, -2); ctx.lineTo(4, -116); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-8, -30, 16, 30, [8, 8, 0, 0]); fillInk('#7a4425', 2.5);
  drawWarmWindow(-6, -78, 12, 15);
  ctx.beginPath(); ctx.moveTo(-22, -114); ctx.quadraticCurveTo(0, -150, 22, -114); ctx.closePath(); fillInk('#d35a34');
  // Rotating sails.
  ctx.save();
  ctx.translate(0, -122);
  ctx.rotate(state.time * 0.9);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -72); strokeInk(4);
    ctx.beginPath(); ctx.roundRect(2, -72, 18, 56, 3); fillInk('#fbf3df', 2.5);
    ctx.strokeStyle = '#c9b28a'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let y = -62; y < -18; y += 11) { ctx.moveTo(4, y); ctx.lineTo(18, y); }
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, -122, 6, 0, Math.PI * 2); fillInk('#7b4a2b', 2.5);
}

function drawHaystack() {
  ctx.beginPath();
  ctx.moveTo(-30, 0); ctx.quadraticCurveTo(-32, -40, 0, -46); ctx.quadraticCurveTo(32, -40, 30, 0);
  ctx.quadraticCurveTo(0, 5, -30, 0);
  fillInk('#efc04f');
  ctx.strokeStyle = '#c4912f'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, -30); ctx.lineTo(-10, -14); ctx.moveTo(4, -38); ctx.lineTo(8, -20); ctx.moveTo(18, -24); ctx.lineTo(22, -8);
  ctx.stroke();
  ctx.fillStyle = '#fbe08c';
  ctx.beginPath(); ctx.ellipse(-8, -34, 9, 4, -0.4, 0, Math.PI * 2); ctx.fill();
}

function drawCow(phase = 0) {
  const chew = Math.sin(state.time * 3 + phase) * 1.2;
  for (const lx of [-16, -6, 10, 18]) { ctx.beginPath(); ctx.roundRect(lx - 3, -14, 6, 14, 2); fillInk('#fbf7ef', 2.5); }
  ctx.beginPath(); ctx.ellipse(0, -24, 26, 15, 0, 0, Math.PI * 2); fillInk('#fbf7ef');
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, -24, 26, 15, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(6, -30, 9, 6, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-12, -18, 6, 5, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(25, -28); ctx.quadraticCurveTo(34, -22 + chew, 31, -12); strokeInk(2.5);
  // Head faces the village (left side of the cow).
  ctx.save(); ctx.translate(-26, -30 + chew * 0.4);
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2); fillInk('#fbf7ef');
  ctx.beginPath(); ctx.ellipse(-4, 5, 8, 5, 0, 0, Math.PI * 2); fillInk('#f2a7a0', 2);
  ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(-7, -15); ctx.moveTo(5, -9); ctx.lineTo(8, -15); strokeInk(2.5);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-2, -2, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFence(x1, x2, y) {
  ctx.beginPath();
  ctx.roundRect(x1, y - 22, x2 - x1, 5, 2);
  ctx.roundRect(x1, y - 12, x2 - x1, 5, 2);
  fillInk('#c58a4f', 2);
  for (let x = x1 + 4; x <= x2 - 4; x += 28) {
    ctx.beginPath(); ctx.roundRect(x - 3.5, y - 30, 7, 30, [3.5, 3.5, 1, 1]); fillInk('#b57843', 2.5);
  }
}

// One tilled bed. `crop` picks what grows on it.
function drawField(x, y, w, h, crop, introducedAt) {
  drawShadow(x, y + h / 2 + 2, w * 1.05, 0.14);
  placed(x, y, 1, introducedAt, () => {
    // Soil body with a sunlit top lip and darker front face.
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); fillInk('#8f5d36');
    ctx.save();
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); ctx.clip();
    ctx.fillStyle = '#a8703f'; ctx.fillRect(-w / 2, -h / 2, w, 5);
    ctx.fillStyle = '#74462a'; ctx.fillRect(-w / 2, h / 2 - 6, w, 6);
    const rows = 2;
    for (let r = 0; r < rows; r++) {
      const fy = -h / 2 + (r + 1) * h / (rows + 1);
      ctx.strokeStyle = '#6b4024'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 8, fy + 1); ctx.lineTo(w / 2 - 8, fy + 1); ctx.stroke();
      ctx.strokeStyle = '#b07a48'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 8, fy + 4); ctx.lineTo(w / 2 - 8, fy + 4); ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); strokeInk(3);
    // Little corner pegs with a string line.
    for (const px of [-w / 2 + 3, w / 2 - 3]) {
      ctx.beginPath(); ctx.roundRect(px - 2.5, -h / 2 - 12, 5, 16, 2); fillInk('#c58a4f', 2);
    }

    // Crops along both furrows; back row first so the front one overlaps it.
    for (let r = 0; r < 2; r++) {
      const by = -h / 2 + (r + 1) * h / 3 + 1;
      const step = crop === 'wheat' ? 10 : crop === 'carrot' ? 15 : 19;
      for (let tx = -w / 2 + 12 + (r ? step / 2 : 0); tx < w / 2 - 8; tx += step) {
        const sway = Math.sin(state.time * 1.8 + tx * 0.2 + r) * 1.6;
        if (crop === 'wheat') {
          ctx.beginPath(); ctx.moveTo(tx, by); ctx.quadraticCurveTo(tx + sway * 0.4, by - 10, tx + sway, by - 18); strokeInk(1.6);
          ctx.beginPath(); ctx.moveTo(tx, by - 6); ctx.lineTo(tx - 4, by - 11); ctx.strokeStyle = '#7a9a3a'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(tx + sway, by - 22, 3.6, 7, sway * 0.08, 0, Math.PI * 2);
          fillInk(r ? '#f6cf55' : '#e9b740', 1.6);
          ctx.strokeStyle = '#c4912f'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(tx + sway - 2, by - 22); ctx.lineTo(tx + sway + 2, by - 24); ctx.moveTo(tx + sway - 2, by - 18); ctx.lineTo(tx + sway + 2, by - 20); ctx.stroke();
        } else if (crop === 'cabbage') {
          ctx.beginPath(); ctx.ellipse(tx, by - 6, 8.5, 7, 0, 0, Math.PI * 2); fillInk('#6fa84a', 2);
          ctx.beginPath(); ctx.ellipse(tx, by - 7, 5, 4.5, 0, 0, Math.PI * 2); fillInk('#a8d877', 1.5);
          ctx.beginPath(); ctx.moveTo(tx - 7, by - 4); ctx.quadraticCurveTo(tx - 12, by - 12, tx - 4, by - 13); strokeInk(1.5);
          ctx.fillStyle = '#d6f0a8'; ctx.beginPath(); ctx.ellipse(tx - 2, by - 9, 2, 1.2, -0.4, 0, Math.PI * 2); ctx.fill();
        } else if (crop === 'carrot') {
          ctx.beginPath(); ctx.moveTo(tx - 4.5, by - 3); ctx.quadraticCurveTo(tx, by - 7, tx + 4.5, by - 3); ctx.lineTo(tx, by + 4); ctx.closePath(); fillInk('#ef8a32', 1.5);
          for (const a of [-0.5, 0, 0.5]) {
            ctx.beginPath(); ctx.moveTo(tx, by - 2);
            ctx.quadraticCurveTo(tx + a * 6 + sway * 0.3, by - 9, tx + a * 9 + sway, by - 15);
            ctx.strokeStyle = '#4f8a32'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke();
            ctx.strokeStyle = '#7fbf4c'; ctx.lineWidth = 1.2; ctx.stroke();
          }
        } else {
          // Pumpkins with a curly vine.
          ctx.beginPath(); ctx.moveTo(tx - 12, by - 2); ctx.quadraticCurveTo(tx - 6, by - 10, tx, by - 4); ctx.strokeStyle = '#4f8a32'; ctx.lineWidth = 2; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(tx, by - 6, 8, 6.5, 0, 0, Math.PI * 2); fillInk('#ee9a3a', 2);
          ctx.strokeStyle = '#c96f22'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.ellipse(tx, by - 6, 3.5, 6, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.roundRect(tx - 1.5, by - 15, 3, 5, 1); fillInk('#6b8a32', 1.4);
          ctx.fillStyle = '#ffc77a'; ctx.beginPath(); ctx.ellipse(tx - 3, by - 9, 2.4, 1.4, -0.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  });
}

function drawVillager(x, groundY, height, range, speed, phase) {
  if (!sprites.farmer) return;
  const t = state.time * speed + phase;
  const vx = x + Math.sin(t) * range;
  const facingLeft = Math.cos(t) < 0;
  const bob = Math.abs(Math.sin(state.time * 5.2 + phase)) * -2;
  drawSprite(sprites.farmer, vx, groundY, height, facingLeft, bob, 1, 0.6, 0.14);
}

// Background row: windmill and a distant house appear at stage 3.
function drawVillageBack(width, ground) {
  const stage = state.villageStage;
  if (stage >= 3) {
    placed(1140, ground - 50, 0.95, 3, drawWindmill);
    placed(872, ground - 64, 0.7, 3, drawHouse);
  }
}

// Main row: the home grows hut → farmhouse → villa; extras join per stage.
function drawVillageFront(width, ground) {
  const stage = state.villageStage;
  const homeX = 1010;
  // The opening is an open field. The first house appears with settlement II.
  if (stage >= 2) {
    drawShadow(homeX, ground - 4, stage >= 3 ? 260 : 230, 0.2);
    if (stage === 2) placed(homeX, ground - 6, 1.6, 2, drawHouse);
    if (stage >= 3) placed(homeX - 10, ground - 6, 1.35, 3, drawVilla);
  }
  if (stage >= 2) {
    drawFence(845, 1165, ground + 6);
    placed(870, ground + 4, 1.1, 2, drawHaystack);
    placed(1132, ground + 10, 1.1, 2, () => drawCow(0));
  }
  if (stage >= 3) placed(952, ground + 12, 0.95, 3, () => drawCow(1.7));
}

// Crop beds grow with the farm level (1 → 4 beds in a 2×2 plot), independent of stage.
const fieldBeds = [
  { dx: -76, dy: 34, crop: 'wheat' },
  { dx: 76, dy: 34, crop: 'cabbage' },
  { dx: -76, dy: 68, crop: 'carrot' },
  { dx: 76, dy: 68, crop: 'pumpkin' }
];
function drawVillageFields(width, ground) {
  const patches = Math.min(fieldBeds.length, state.farmLevel);
  for (let i = 0; i < patches; i++) {
    const bed = fieldBeds[i];
    drawField(1000 + bed.dx, ground + bed.dy, 140, 26, bed.crop, null);
  }
}

function drawVillageVillagers(width, ground) {
  if (state.villageStage >= 2) drawVillager(1000, ground + 20, 90, 60, 0.45, 1.3);
  if (state.villageStage >= 3) drawVillager(1085, ground + 24, 84, 32, 0.7, 4.1);
}

// Hero (gold-crested centurion) and archer on the tower platform.
const LOW_HP = 0.35;
// Canvas panels share the HUD look: one translucent surface, no outlines.
const HUD_SURFACE = 'rgba(22, 28, 24, 0.72)';
const HUD_TEXT = '#f4eedb';
const HUD_MUTED = '#b8b39f';
const HUD_ACCENT = '#e8bf55';

function heroPosition(width, height) {
  const { towerX, platformY } = towerGeometry(width, height);
  return { x: towerX - 24, y: platformY };
}

function drawBow(x, y, drawn) {
  ctx.beginPath(); ctx.arc(x, y, 20, -1.25, 1.25); strokeInk(4.5);
  ctx.beginPath(); ctx.arc(x, y, 20, -1.25, 1.25); ctx.strokeStyle = '#a8693a'; ctx.lineWidth = 2.5; ctx.stroke();
  const pull = drawn ? 9 : 0;
  ctx.beginPath();
  ctx.moveTo(x + 20 * Math.cos(-1.25), y + 20 * Math.sin(-1.25));
  ctx.lineTo(x + 6 - pull, y);
  ctx.lineTo(x + 20 * Math.cos(1.25), y + 20 * Math.sin(1.25));
  ctx.strokeStyle = '#f3ead2'; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawTowerDefenders(width, height) {
  const { towerX, platformY } = towerGeometry(width, height);
  const size = Math.min(104, height * 0.21);
  if (state.towerSlot === 'catapult') drawCatapult(towerX - 30, platformY);
  if (state.towerSlot === 'archer') {
    const archerX = towerX - 24;
    const drawn = state.archerCooldown > archerInterval(state.archerLevel) - 0.18;
    const recoil = drawn ? 3 : 0;
    drawSprite(sprites.archer, archerX + recoil, platformY, size * 1.18, false, Math.sin(state.time * 2) * -1);
  }
}

// Cooldown ring above a hero; pulses when the spell is ready to use.
function drawSpellBadge(id, bx, by) {
  const spell = heroDefs[id].spell;
  if (!spell) return;
  const cd = state.heroes[id].cd;
  const ready = cd <= 0;
  const usable = !spellBlocked(id);
  const pulse = usable ? 1 + Math.sin(state.time * 6) * 0.08 : 1;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(pulse, pulse);
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); fillInk(ready ? '#ffcf4a' : '#5b4a3c', 3);
  if (!ready) {
    const progress = 1 - cd / spell.cooldown;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 14, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2); ctx.closePath();
    ctx.fillStyle = '#c9a34488'; ctx.fill();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = ready ? '900 16px system-ui, sans-serif' : '800 12px system-ui, sans-serif';
  ctx.fillStyle = ready ? '#5a321a' : '#fff3d2';
  ctx.fillText(ready ? spell.icon : Math.ceil(cd), 0, 1);
  ctx.restore();
  if (usable && state.phase === 'wave') {
    ctx.save();
    ctx.font = '900 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
    const label = spell.name.toUpperCase() + '!';
    ctx.strokeText(label, bx, by - 26); ctx.fillStyle = '#ffcf4a'; ctx.fillText(label, bx, by - 26);
    ctx.restore();
  }
}

function supportPosition(width, height) {
  const { towerX, ground } = towerGeometry(width, height);
  return { x: towerX + 58, y: ground + 4 };
}

function drawSupportHero(width, height) {
  if (state.supportHero !== 'priestess') return;
  const pos = supportPosition(width, height);
  const size = Math.min(118, height * 0.23);
  ctx.save();
  ctx.filter = 'hue-rotate(190deg) saturate(0.7) brightness(1.15)';
  drawSprite(sprites.archer, pos.x, pos.y, size, true, Math.sin(state.time * 1.8) * -1.2);
  ctx.restore();
  // Halo marks her as a healer until she gets her own sprite.
  ctx.save();
  ctx.globalAlpha = 0.75 + Math.sin(state.time * 3) * 0.15;
  ctx.beginPath(); ctx.ellipse(pos.x, pos.y - size - 4, 15, 5, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}

function drawFrontHero(width, height, guardX, ground) {
  const size = Math.min(160, height * 0.32);
  const low = state.phase === 'wave' && state.guardHp > 0 && state.guardHp / state.maxGuardHp < LOW_HP;
  const filters = [];
  if (state.frontHero === 'hoplite') filters.push('sepia(0.55) saturate(1.5) hue-rotate(-12deg)');
  if (low) filters.push(`drop-shadow(0 0 ${4 + 4 * Math.abs(Math.sin(state.time * 7))}px #ff3b2f)`);
  const tremble = low ? Math.sin(state.time * 38) * 1.6 : 0;
  ctx.save();
  if (filters.length) ctx.filter = filters.join(' ');
  drawSprite(sprites.guard, guardX + tremble, ground, size, true, Math.sin(state.time * 2.4) * -1.2);
  ctx.restore();
  if (state.frontHero === 'hoplite') {
    // Tall crest so the hoplite reads differently from the legionary.
    ctx.save();
    ctx.beginPath(); ctx.ellipse(guardX + tremble + 4, ground - size * 0.98, 22, 9, -0.2, Math.PI, 0);
    fillInk('#c0392b', 2.5);
    ctx.restore();
  }
  if (state.holdLine > 0) {
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(state.time * 10);
    ctx.beginPath(); ctx.ellipse(guardX, ground - size * 0.5, size * 0.42, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd34d33'; ctx.fill();
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  }
  if (state.blessFx > 0) {
    ctx.save();
    ctx.globalAlpha = state.blessFx / 0.8;
    const beam = ctx.createLinearGradient(0, 0, 0, ground);
    beam.addColorStop(0, '#fff6c800'); beam.addColorStop(1, '#b8ffb0aa');
    ctx.fillStyle = beam;
    ctx.fillRect(guardX - 46, 0, 92, ground);
    ctx.restore();
  }
  if (state.bashFx > 0) {
    const p = 1 - state.bashFx / 0.4;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.beginPath(); ctx.arc(guardX - 50, ground - 60, 20 + p * 70, Math.PI * 0.6, Math.PI * 1.4);
    ctx.strokeStyle = '#fff3bd'; ctx.lineWidth = 7 * (1 - p) + 2; ctx.stroke();
    ctx.restore();
  }
}

// Between waves the next attackers wait at the forest edge: the threat is always in view.
function drawLurkingHorde(width, height) {
  if (state.phase === 'wave' || state.phase === 'complete') return;
  if (state.phase === 'victory' && state.townLevel < requiredTown(state.wave + 1)) return;
  const nextWave = state.phase === 'victory' ? state.wave + 1 : state.wave;
  const plan = buildWavePlan(nextWave);
  const ground = height * 0.82;
  // The next wave waits at the very edge of the screen, half hidden in drifting fog.
  // Real colours (no black silhouettes) so it reads as "orcs waiting", not a bug.
  plan.forEach((type, i) => {
    const stats = enemyTypes[type] || enemyTypes.orc;
    const look = enemyLooks[type] || {};
    const x = 8 + i * 20 + (stats.isBoss ? 26 : 0);
    const y = ground + 4 - (i % 2) * 9;
    const h = Math.min(stats.height, height * (stats.height / 510)) * 0.8;
    const sway = Math.sin(state.time * 1.4 + i * 1.3) * 3;
    ctx.save();
    ctx.filter = `${look.filter || ''} saturate(0.75) brightness(0.92)`.trim();
    drawSprite(enemySprite(type), x + sway, y, h, false, 0, 0.9, 0, 0);
    ctx.restore();
  });
  drawEdgeFog(height, ground);
}

// Soft fog banks over the left edge; puffs drift and breathe slowly.
function drawEdgeFog(height, ground) {
  ctx.save();
  // Elliptical fog bank: fades out in every direction, no hard edges.
  ctx.save();
  ctx.translate(0, ground - 60);
  ctx.scale(1.35, 1);
  const wall = ctx.createRadialGradient(0, 0, 0, 0, 0, 175);
  wall.addColorStop(0, 'rgba(236, 240, 232, 0.6)');
  wall.addColorStop(0.5, 'rgba(236, 240, 232, 0.3)');
  wall.addColorStop(1, 'rgba(236, 240, 232, 0)');
  ctx.fillStyle = wall;
  ctx.beginPath(); ctx.arc(0, 0, 175, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  for (let i = 0; i < 9; i++) {
    const t = state.time * (0.12 + (i % 3) * 0.04) + i * 1.7;
    const px = 20 + (i * 37) % 170 + Math.sin(t) * 18;
    const py = ground - 20 - (i * 29) % 150 + Math.cos(t * 0.8) * 6;
    const r = 46 + (i % 4) * 14 + Math.sin(t * 1.3) * 5;
    const puff = ctx.createRadialGradient(px, py, 0, px, py, r);
    const a = 0.32 - (px / 230) * 0.18;
    puff.addColorStop(0, `rgba(245, 247, 242, ${a})`);
    puff.addColorStop(1, 'rgba(245, 247, 242, 0)');
    ctx.fillStyle = puff;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Red edges and a heartbeat pulse when the frontline hero is about to fall.
function drawDangerOverlay(width, height) {
  const ratio = state.guardHp / state.maxGuardHp;
  let strength = 0;
  if (state.phase === 'wave' && state.guardHp > 0 && ratio < LOW_HP) {
    const beat = Math.pow(Math.max(0, Math.sin(state.time * 5.2)), 6);
    strength = 0.22 + (1 - ratio / LOW_HP) * 0.4 + beat * 0.25;
  }
  if (state.hornFx > 0) strength = Math.max(strength, (state.hornFx / HORN_TIME) * 0.35);
  if (strength <= 0.01) return;
  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.25, width / 2, height / 2, width * 0.58);
  vignette.addColorStop(0, '#b0181800');
  vignette.addColorStop(1, `rgba(150, 18, 18, ${Math.min(0.75, strength)})`);
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  if (state.hornFx > 0) {
    const p = 1 - state.hornFx / HORN_TIME;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - p) * 2);
    ctx.font = '700 20px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const text = `WAVE ${state.wave} · ORCS INCOMING`;
    const slot = bannerSlot(width);
    const ty = slot.y - p * 8;
    const w = ctx.measureText(text).width + 40;
    roundedRect(slot.x - w / 2, ty - 22, w, 44, HUD_R, BANNER_SURFACE);
    ctx.fillStyle = HUD_ACCENT; ctx.fillText(text, slot.x, ty + 1);
    ctx.restore();
  }
}

function drawArrowShape(x, y, angle, length = 24) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(-length / 2, 0); ctx.lineTo(length / 2, 0); strokeInk(3.5);
  ctx.beginPath(); ctx.moveTo(-length / 2, 0); ctx.lineTo(length / 2, 0); ctx.strokeStyle = '#c58a4f'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(length / 2 + 6, 0); ctx.lineTo(length / 2 - 2, -4); ctx.lineTo(length / 2 - 2, 4); ctx.closePath();
  fillInk('#d9d4c7', 1.5);
  ctx.beginPath(); ctx.moveTo(-length / 2, 0); ctx.lineTo(-length / 2 - 5, -4); ctx.lineTo(-length / 2 + 3, 0); ctx.lineTo(-length / 2 - 5, 4); ctx.closePath();
  fillInk('#e2574c', 1.2);
  ctx.restore();
}

function arrowTarget(mob, height) {
  return { x: mob.x, y: height * 0.82 + 18 + (mob.laneY ?? 0) - 62 };
}

function drawArrows(height) {
  for (const arrow of state.arrows) {
    const p = Math.min(1, arrow.t / arrow.dur);
    const target = arrowTarget(arrow.mob, height);
    const arc = 70;
    const x = arrow.sx + (target.x - arrow.sx) * p;
    const y = arrow.sy + (target.y - arrow.sy) * p - Math.sin(p * Math.PI) * arc;
    const dx = target.x - arrow.sx;
    const dy = target.y - arrow.sy - Math.cos(p * Math.PI) * Math.PI * arc;
    drawArrowShape(x, y, Math.atan2(dy, dx));
  }
}

function drawVolley(width, height) {
  if (state.volleyFx <= 0) return;
  const guardX = width * 0.52;
  const [from, to] = VOLLEY_ZONE;
  const elapsed = VOLLEY_FALL - state.volleyFx;
  const groundY = height * 0.82 + 20;
  // Danger zone marker on the road.
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.15 * Math.sin(elapsed * 30);
  ctx.beginPath(); ctx.ellipse(guardX + (from + to) / 2, groundY + 6, (to - from) / 2, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffcf4a'; ctx.fill();
  ctx.restore();
  for (let i = 0; i < 26; i++) {
    const delay = (i % 7) * 0.035;
    const p = Math.max(0, Math.min(1, (elapsed - delay) / (VOLLEY_FALL - 0.26)));
    if (p <= 0) continue;
    const x = guardX + from + ((i * 53) % (to - from)) + (1 - p) * 60;
    const endY = groundY - 10 + (i % 4) * 10;
    const y = -30 - (i % 5) * 26 + (endY + 30 + (i % 5) * 26) * p;
    drawArrowShape(x, y, Math.PI * 0.5 + 0.35, 26);
  }
}

function drawBoar(x, groundY, scale, phase) {
  const trot = Math.sin(state.time * 14 + phase) * 3;
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(scale, scale);
  for (const [lx, off] of [[-22, 0], [-10, Math.PI], [12, Math.PI], [24, 0]]) {
    ctx.beginPath(); ctx.roundRect(lx - 4, -18 + Math.sin(state.time * 14 + phase + off) * 2, 8, 18, 3); fillInk('#5e3b25', 2.5);
  }
  ctx.beginPath(); ctx.ellipse(0, -30 + trot * 0.3, 38, 20, 0, 0, Math.PI * 2); fillInk('#8a5a3a');
  ctx.fillStyle = '#6e4529';
  ctx.beginPath(); ctx.moveTo(-26, -46); ctx.lineTo(-14, -54); ctx.lineTo(-2, -48); ctx.lineTo(10, -55); ctx.lineTo(20, -47); ctx.lineTo(26, -40); ctx.lineTo(-30, -38); ctx.fill();
  // Head faces right (towards the village).
  ctx.save(); ctx.translate(38, -30 + trot * 0.3);
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 13, 0.2, 0, Math.PI * 2); fillInk('#8a5a3a');
  ctx.beginPath(); ctx.ellipse(13, 4, 7, 6, 0, 0, Math.PI * 2); fillInk('#c98f76', 2);
  ctx.beginPath(); ctx.moveTo(8, 8); ctx.quadraticCurveTo(16, 2, 14, -8); strokeInk(4);
  ctx.beginPath(); ctx.moveTo(8, 8); ctx.quadraticCurveTo(16, 2, 14, -8); ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(2, -4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-4, -20); ctx.lineTo(0, -10); fillInk('#6e4529', 2);
  ctx.restore();
  ctx.restore();
}

function drawEnemy(mob, x, groundY, height, bob, opacity, shadowScale) {
  const look = enemyLooks[mob.type] || {};
  const sprite = enemySprite(mob.type);
  if (look.prop === 'boar') {
    drawShadow(x, groundY + 2, 96, 0.14);
    ctx.save(); ctx.globalAlpha = opacity;
    if (look.filter && mob.type === 'wolfRider') ctx.filter = look.filter; // grey "wolf" until real art
    drawBoar(x, groundY + bob * 0.5, 1, mob.bob);
    ctx.restore();
    // Rider sits on the boar's back.
    ctx.save(); if (look.filter) ctx.filter = look.filter;
    drawSprite(sprite, x - 4, groundY - 36 + bob, height * 0.78, false, 0, opacity, 0, 0);
    ctx.restore();
  } else {
    ctx.save();
    if (look.filter) ctx.filter = look.filter;
    drawSprite(sprite, x, groundY, height, false, bob, opacity, shadowScale, 0.11);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = opacity;
  if (look.prop === 'bow') {
    const drawn = mob.attackMotion > 0;
    drawBow(x + 26, groundY - height * 0.52 + bob, drawn);
  }
  if (look.prop === 'staff') {
    const sx = x + 34;
    const sy = groundY + bob;
    ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 6, sy - height * 0.95); strokeInk(5);
    ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 6, sy - height * 0.95); ctx.strokeStyle = '#8c552c'; ctx.lineWidth = 3; ctx.stroke();
    const glow = 0.6 + Math.sin(state.time * 5) * 0.2 + mob.auraFx;
    ctx.save(); ctx.shadowColor = '#7fc4ff'; ctx.shadowBlur = 14 * glow;
    ctx.beginPath(); ctx.arc(sx + 6, sy - height * 0.95 - 8, 9, 0, Math.PI * 2); fillInk('#9fd0ff', 2.5);
    ctx.restore();
  }
  // Shaman pulse and barrier bubbles.
  if (mob.auraFx > 0) {
    const p = 1 - mob.auraFx / 0.7;
    ctx.globalAlpha = opacity * (1 - p) * 0.7;
    ctx.beginPath(); ctx.ellipse(x, groundY - height * 0.5, 40 + p * 200, 20 + p * 60, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#9fd0ff'; ctx.lineWidth = 4; ctx.stroke();
  }
  if (mob.barrier > 0 && !mob.dead) {
    ctx.globalAlpha = opacity * (0.35 + Math.sin(state.time * 4 + mob.bob) * 0.08);
    ctx.beginPath(); ctx.ellipse(x, groundY - height * 0.5, height * 0.42, height * 0.56, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7fc4ff55'; ctx.fill();
    ctx.strokeStyle = '#bfe4ff'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  if (mob.stun > 0 && !mob.dead) {
    ctx.globalAlpha = opacity;
    ctx.font = '900 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const a = state.time * 6 + i * (Math.PI * 2 / 3);
      const sx = x + Math.cos(a) * 22;
      const sy = groundY - height - 4 + Math.sin(a) * 6;
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeText('★', sx, sy);
      ctx.fillStyle = '#ffe066'; ctx.fillText('★', sx, sy);
    }
  }
  ctx.restore();
}

function drawCatapult(x, baseY) {
  const recoil = state.catapultCooldown > catapultInterval(state.catapultLevel) - 0.35;
  const loaded = state.catapultCooldown < 0.6;
  ctx.save();
  ctx.translate(x, baseY);
  // Frame and wheels.
  ctx.beginPath(); ctx.roundRect(-34, -22, 68, 12, 4); fillInk('#a8693a');
  for (const wx of [-22, 22]) {
    ctx.beginPath(); ctx.arc(wx, -8, 10, 0, Math.PI * 2); fillInk('#7b4a2b');
    ctx.beginPath(); ctx.arc(wx, -8, 3, 0, Math.PI * 2); fillInk('#d9b07a', 1.5);
  }
  ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(4, -58); ctx.lineTo(14, -22); ctx.closePath(); fillInk('#b77a43');
  // Throwing arm: upright right after a shot, pulled back while reloading.
  const angle = recoil ? -0.25 : loaded ? -1.25 : -1.25 + (1 - state.catapultCooldown / catapultInterval(state.catapultLevel)) * 0.2;
  ctx.save();
  ctx.translate(4, -50);
  ctx.rotate(angle);
  ctx.beginPath(); ctx.roundRect(-4, -58, 8, 66, 3); fillInk('#c58a4f', 2.5);
  ctx.beginPath(); ctx.arc(0, -60, 9, 0, Math.PI); fillInk('#7b4a2b', 2.5);
  if (!recoil) { ctx.beginPath(); ctx.arc(0, -64, 7, 0, Math.PI * 2); fillInk('#9a9488', 2.5); }
  ctx.restore();
  ctx.restore();
}

function drawRocksAndShots(height) {
  const ground = height * 0.82;
  for (const rock of state.rocks) {
    const p = Math.min(1, rock.t / rock.dur);
    const ty = ground + 18 + rock.laneY - 30;
    const x = rock.sx + (rock.tx - rock.sx) * p;
    const y = rock.sy + (ty - rock.sy) * p - Math.sin(p * Math.PI) * 150;
    ctx.save(); ctx.translate(x, y); ctx.rotate(state.time * 8);
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, 0.3, 0, Math.PI * 2); fillInk('#9a9488', 2.5);
    ctx.fillStyle = '#c4beb0'; ctx.beginPath(); ctx.ellipse(-3, -3, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const puff of state.dust) {
    const p = puff.t / 0.6;
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - p);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(puff.x + Math.cos(a) * (14 + p * 46), ground + 18 + puff.laneY - 14 + Math.sin(a) * (6 + p * 14) - p * 10, 9 + p * 10, 0, Math.PI * 2);
      ctx.fillStyle = '#e8dcc0'; ctx.fill();
    }
    ctx.restore();
  }
  for (const shot of state.enemyShots) {
    const p = Math.min(1, shot.t / shot.dur);
    const sy = ground + 18 + shot.laneY - 64;
    const tx = 1170 * 0.52 - 10;
    const ty = ground - 80;
    const x = shot.sx + (tx - shot.sx) * p;
    const y = sy + (ty - sy) * p - Math.sin(p * Math.PI) * 40;
    const dy = (ty - sy) - Math.cos(p * Math.PI) * Math.PI * 40;
    drawArrowShape(x, y, Math.atan2(dy, tx - shot.sx), 20);
  }
}

function drawActBanner(width) {
  const notice = state.notice;
  if (!notice) return;
  const elapsed = NOTICE_TIME - notice.t;
  const pop = Math.min(1, easeOutBack(Math.min(1, elapsed / 0.45)));
  const slot = bannerSlot(width);
  ctx.save();
  ctx.globalAlpha = Math.min(1, notice.t / 0.4);
  ctx.translate(slot.x, slot.y);
  ctx.scale(pop, pop);
  // The backing hugs the text: widest line + padding.
  ctx.font = '700 18px system-ui, sans-serif';
  const titleWidth = ctx.measureText(notice.title).width;
  ctx.font = '500 11px system-ui, sans-serif';
  const subWidth = ctx.measureText(notice.subtitle).width;
  const w = Math.max(titleWidth, subWidth) + 40;
  roundedRect(-w / 2, -32, w, 64, HUD_R, BANNER_SURFACE);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 9px system-ui, sans-serif'; ctx.fillStyle = HUD_MUTED;
  ctx.fillText(notice.kicker, 0, -17);
  ctx.font = '700 18px system-ui, sans-serif'; ctx.fillStyle = HUD_ACCENT;
  ctx.fillText(notice.title, 0, 1);
  ctx.font = '500 11px system-ui, sans-serif'; ctx.fillStyle = HUD_TEXT;
  ctx.fillText(notice.subtitle, 0, 18);
  ctx.restore();
}

// One banner position for every message: under the roster with the HUD margin,
// centred in the area the upgrades panel leaves free.
const BANNER_SURFACE = 'rgba(22, 28, 24, 0.92)';
function activeBoss() {
  return state.phase === 'wave' ? state.mobs.find((mob) => !mob.dead && mob.countsForWave && enemyTypes[mob.type]?.isBoss) : null;
}

// Big boss health bar right under the roster.
function drawBossBar(width) {
  const boss = activeBoss();
  if (!boss) return;
  const w = 380;
  const x = width / 2 - w / 2;
  const y = HUD_M + HUD_T + 10;
  ctx.save();
  roundedRect(x, y, w, 20, 10, HUD_SURFACE);
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  if (ratio > 0) roundedRect(x + 3, y + 3, Math.max(14, (w - 6) * ratio), 14, 7, '#d24a32');
  ctx.fillStyle = HUD_TEXT; ctx.font = '700 10px system-ui, sans-serif'; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText((wavePreviewNames[boss.type] || 'Boss').toUpperCase(), x + 12, y + 10.5);
  ctx.textAlign = 'right'; ctx.fillText(`${formatNumber(Math.ceil(boss.hp))} / ${formatNumber(boss.maxHp)}`, x + w - 12, y + 10.5);
  ctx.restore();
}

// 1234 → 1.2K, 3 400 000 → 3.4M (idle-style big numbers).
function formatNumber(value) {
  const n = Math.floor(value);
  if (Math.abs(n) < 10000) return String(n);
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let v = n; let i = -1;
  while (Math.abs(v) >= 1000 && i < units.length - 1) { v /= 1000; i += 1; }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)}${units[i]}`;
}

function bannerSlot(width) {
  const panelLeft = width - HUD_M * 1.6 - width * 0.34;
  const centre = typeof hud !== 'undefined' && hud.open ? panelLeft / 2 : width / 2;
  return { x: centre, y: HUD_M + HUD_T + HUD_M + 32 + (activeBoss() ? 26 : 0) };
}

function drawForegroundFoliage(width, height) {
  drawCartoonTree(-18, height + 4, 0.72, 'pine', 0.4, 1);
  drawCartoonTree(width + 10, height + 4, 0.66, 'cypress', 2.5, 1);
}

function drawShadow(x, y, width, opacity = 0.18) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.24);
  const gradient = ctx.createRadialGradient(0, 0, 3, 0, 0, width / 2);
  gradient.addColorStop(0, `rgba(38, 36, 32, ${opacity})`);
  gradient.addColorStop(0.58, `rgba(38, 36, 32, ${opacity * 0.52})`);
  gradient.addColorStop(1, 'rgba(38, 36, 32, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.arc(0, 0, width / 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSprite(sprite, x, groundY, height, flip = false, bob = 0, opacity = 1, shadowScale = 0.72, shadowOpacity = 0.18) {
  const width = height * sprite.width / sprite.height;
  drawShadow(x, groundY + 2, width * shadowScale, shadowOpacity);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, groundY + bob);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sprite, -width / 2, -height, width, height);
  ctx.restore();
}

function drawStructure(sprite, x, groundY, height) {
  const width = height * sprite.width / sprite.height;
  drawShadow(x, groundY + 3, width * 0.82, 0.16);
  ctx.save();
  ctx.filter = 'contrast(0.9) brightness(1.02)';
  ctx.drawImage(sprite, x - width / 2, groundY - height, width, height);
  ctx.restore();
}

function drawGuardHealthBar(x, y) {
  const width = 104;
  const height = 14;
  const ratio = Math.max(0, state.guardHp / state.maxGuardHp);
  const healing = state.regenFlash > 0;
  ctx.save();
  roundedRect(x - width / 2, y, width, height, height / 2, HUD_SURFACE);
  if (ratio > 0) {
    const fill = Math.max(height - 4, (width - 4) * ratio);
    roundedRect(x - width / 2 + 2, y + 2, fill, height - 4, (height - 4) / 2, healing ? '#5cc47c' : ratio < LOW_HP ? '#e0573f' : '#d8845a');
  }
  ctx.fillStyle = HUD_TEXT;
  ctx.font = '700 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil(state.guardHp)} / ${state.maxGuardHp}`, x, y + height / 2 + 0.5);
  ctx.restore();
}

// Cut-out head, no frame; placeholder enemies reuse a base head with a tint.
function drawEnemyHead(type, x, y, size) {
  const look = enemyLooks[type] || {};
  const image = portraits[type] || portraits[look.sprite] || portraits.orc;
  if (!image) return;
  ctx.save();
  const filter = portraits[type] ? null : (look.filter || portraitTints[type] || null);
  if (filter) ctx.filter = filter;
  ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

// World units matching the HUD's cqh sizes (the world is 540 high).
const HUD_M = 540 * 0.04;     // edge margin
const HUD_T = 540 * 0.125;    // tile size
const HUD_R = 540 * 0.028;    // corner radius

function rosterFreeSpan(width) {
  const fallback = { left: 200, right: width - 260 };
  const card = canvas.parentElement;
  const left = ui['hud-sound'];
  const right = ui.coins && ui.coins.closest ? ui.coins.closest('.resources') : null;
  if (!card || !left || !right || typeof card.getBoundingClientRect !== 'function') return fallback;
  const c = card.getBoundingClientRect();
  if (!c.width) return fallback;
  const scale = width / c.width;
  return {
    left: (left.getBoundingClientRect().right - c.left) * scale + HUD_M,
    right: (right.getBoundingClientRect().left - c.left) * scale - HUD_M
  };
}

function drawWaveRoster(width) {
  if (!portraits.orc) return;
  // During a wave show what is attacking; between waves show what comes next.
  const shownWave = state.phase === 'victory' && !(state.townLevel < requiredTown(state.wave + 1)) ? state.wave + 1 : state.wave;
  const plan = state.phase === 'wave' && state.wavePlan.length ? state.wavePlan : buildWavePlan(shownWave);
  const counts = plan.reduce((result, type) => {
    result[type] = (result[type] || 0) + 1;
    return result;
  }, {});
  const entries = Object.entries(counts);
  const many = entries.length > 3;
  const pad = 14;
  const head = many ? 34 : 40;
  const countWidth = many ? 20 : 24;
  const gap = many ? 8 : 12;
  const labelWidth = 40;
  const panelWidth = pad + labelWidth + entries.length * (head + 4 + countWidth) + (entries.length - 1) * gap + pad;
  // Centre on screen, but stay inside the gap between the top-left tiles and the resources.
  const free = rosterFreeSpan(width);
  const x = Math.max(free.left, Math.min(free.right - panelWidth, width / 2 - panelWidth / 2));
  const y = HUD_M;
  const mid = y + HUD_T / 2;
  ctx.save();
  roundedRect(x, y, panelWidth, HUD_T, HUD_R, HUD_SURFACE);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = HUD_MUTED;
  ctx.font = '600 9px system-ui, sans-serif';
  ctx.fillText('WAVE', x + pad, mid - 10);
  ctx.fillStyle = HUD_TEXT;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(String(shownWave), x + pad, mid + 8);
  let itemX = x + pad + labelWidth;
  for (const [type, count] of entries) {
    drawEnemyHead(type, itemX + head / 2, mid, head);
    ctx.fillStyle = enemyTypes[type]?.isBoss ? HUD_ACCENT : HUD_TEXT;
    ctx.textAlign = 'left';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText(`×${count}`, itemX + head + 4, mid - (traitsOf(type).length ? 6 : 0));
    // Traits as small glyphs next to the count.
    ctx.font = '700 9px system-ui, sans-serif';
    traitsOf(type).forEach((trait, i) => {
      ctx.fillStyle = traitInfo[trait].color;
      ctx.fillText(traitInfo[trait].glyph, itemX + head + 4 + i * 11, mid + 9);
    });
    itemX += head + 4 + countWidth + gap;
  }
  ctx.restore();
}

function drawFloaters(height) {
  const ground = height * 0.82;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const floater of state.floaters) {
    const progress = 1 - floater.life / floater.duration;
    const eased = 1 - Math.pow(1 - progress, 3);
    const y = ground - (floater.kind === 'food' ? 145 : floater.kind === 'hurt' ? 174 : 128) - eased * 56;
    const sway = Math.sin(progress * Math.PI * 2) * 3;
    const alpha = Math.min(1, floater.life * 2.6);
    const pop = 0.82 + Math.sin(Math.min(1, progress * 2) * Math.PI / 2) * 0.22;
    if (floater.kind === 'heal') {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#a2ffb2';
      ctx.shadowColor = '#278d50';
      ctx.shadowBlur = 8;
      ctx.font = '800 24px system-ui, sans-serif';
      ctx.fillText('+', floater.x + sway, ground - 40 - (floater.offsetY || 0) - progress * 115);
      ctx.restore();
      continue;
    }
    const resourceIcon = floater.kind === 'food' ? resourceIcons.food : floater.kind === 'reward' ? resourceIcons.gold : null;
    const label = floater.kind === 'gear' ? `⚒ ${floater.amount}` : floater.kind === 'bash' ? `BASH −${floater.amount}` : floater.kind === 'hold' ? 'HOLD · −70% DMG' : floater.kind === 'bless' ? `+${floater.amount} ♥` : floater.kind === 'stolen' ? `−${floater.amount} STOLEN` : floater.kind === 'volley' ? `VOLLEY −${floater.amount}` : floater.kind === 'food' ? `+${floater.amount}` : floater.kind === 'hurt' ? `−${floater.amount}  ♥` : floater.kind === 'spikes' ? `−${floater.amount}  ⋀` : floater.kind === 'arrow' ? `−${floater.amount}  ➶` : floater.kind === 'reward' ? `VICTORY  +${floater.amount}` : `+${floater.amount}  ☠`;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(floater.x + sway, y);
    ctx.scale(pop, pop);
    ctx.font = '700 17px system-ui, sans-serif';
    const iconSize = resourceIcon ? 18 : 0;
    const iconGap = resourceIcon ? 4 : 0;
    const textWidth = ctx.measureText(label).width;
    const contentWidth = textWidth + iconSize + iconGap;
    const bubble = floater.kind === 'food' ? '#fff5cbea' : floater.kind === 'hurt' ? '#7d2929ed' : '#402e27e6';
    roundedRect(-contentWidth / 2 - 10, -14, contentWidth + 20, 28, 14, bubble);
    ctx.fillStyle = floater.kind === 'food' ? '#8b6929' : floater.kind === 'hurt' ? '#ffe2d8' : '#fff1df';
    ctx.fillText(label, resourceIcon ? -(iconSize + iconGap) / 2 : 0, 0);
    if (resourceIcon) ctx.drawImage(resourceIcon, contentWidth / 2 - iconSize, -iconSize / 2, iconSize, iconSize);
    ctx.restore();
  }
  ctx.restore();
}

function drawScene(width, height) {
  drawBackground(width, height);
  drawForegroundFoliage(width, height);
  if (!sprites.guard || !sprites.orc || !sprites.orcDual || !sprites.orcShield || !sprites.orcRed || !sprites.boss || !sprites.farmer || !structures.guardTower) return;
  const towerBuilt = state.archerUnlocked;
  const ground = height * 0.82;
  // The tower stands right behind the legionary so the village gets the right third of the screen.
  const towerX = width * 0.6;
  const towerHeight = Math.min(300, height * 0.64);
  drawVillageBack(width, ground);
  if (towerBuilt) {
    const pop = state.towerFx > 0 ? Math.max(0.01, easeOutBack(1 - state.towerFx / TOWER_POP)) : 1;
    ctx.save();
    ctx.translate(towerX, ground + 8);
    ctx.scale(pop, pop);
    ctx.translate(-towerX, -(ground + 8));
    drawStructure(structures.guardTower, towerX, ground + 8, towerHeight);
    ctx.restore();
  }
  drawVillageFront(width, ground);
  drawVillageFields(width, ground);
  drawVillageVillagers(width, ground);
  const farmerDirection = Math.cos(state.time * 0.65) < 0;
  // The farmer works among the field beds on the village side, away from the line.
  const farmerX = width * 0.855 + Math.sin(state.time * 0.65) * Math.min(25, width * 0.02);
  const farmerBob = Math.abs(Math.sin(state.time * 2.6)) * -2;
  drawSprite(sprites.farmer, farmerX, ground - 8, Math.min(134, height * 0.27), farmerDirection, farmerBob);

  if (state.spikesLevel > 0 && sprites.spikes) {
    const spikesHeight = Math.min(105 + (state.spikesLevel - 1) * 5, 125);
    drawSprite(sprites.spikes, width * 0.435, ground - 16, spikesHeight, false, 0, 1, 0.84, 0.14);
  }

  drawLurkingHorde(width, height);
  const mobsByDepth = [...state.mobs].sort((a, b) => (a.laneY ?? 0) - (b.laneY ?? 0));
  for (const mob of mobsByDepth) {
    const bob = Math.abs(Math.sin(state.time * 7 + mob.bob)) * -4;
    const mobGround = ground + 18 + (mob.laneY ?? 0);
    const attackProgress = mob.attackMotion > 0 ? 1 - mob.attackMotion / 0.32 : 0;
    const attackShiftX = mob.attackMotion > 0 ? Math.sin(attackProgress * Math.PI) * 14 : 0;
    const drawX = mob.x + attackShiftX;
    const opacity = mob.hit > 0 ? Math.max(0, mob.hit / 0.18) : 1;
    const typeStats = enemyTypes[mob.type] || enemyTypes.orc;
    // Class controls silhouette size: dual-wielders are 10% below the
    // standard orc, while the boss is 20% above it.
    const classHeight = typeStats.height;
    const mobHeight = Math.min(classHeight, height * (classHeight / 510));

    const shadowScale = Math.max(0.42, Math.min(0.58, 0.42 + (mobHeight - 112) / 480));
    drawEnemy(mob, drawX, mobGround, mobHeight, bob, opacity, shadowScale);
    if (!mob.dead) {
      const barWidth = Math.round(Math.max(48, Math.min(72, 48 + (mobHeight - 112) * 0.31)));
      roundedRect(drawX - barWidth / 2, mobGround - mobHeight - 18, barWidth, 6, 3, '#443d36aa');
      roundedRect(drawX - barWidth / 2, mobGround - mobHeight - 18, barWidth * Math.max(0, mob.hp) / mob.maxHp, 6, 3, typeStats.bar);
      if (mob.barrier > 0) roundedRect(drawX - barWidth / 2, mobGround - mobHeight - 25, barWidth * Math.min(1, mob.barrier / mob.maxHp), 4, 2, '#7fc4ff');
      ctx.strokeStyle = '#2c241f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(drawX - barWidth / 2, mobGround - mobHeight - 18, barWidth, 6, 3);
      ctx.stroke();
    }
  }

  const attackProgress = state.attackTimer > 0 ? Math.sin((1 - state.attackTimer / 0.28) * Math.PI) : 0;
  const guardX = width * 0.52 - attackProgress * 15;
  drawFrontHero(width, height, guardX, ground);
  drawGuardHealthBar(width * 0.52, ground + 10);

  if (towerBuilt && state.towerFx <= 0) drawTowerDefenders(width, height);
  drawSupportHero(width, height);
  drawArrows(height);
  drawVolley(width, height);
  drawRocksAndShots(height);

  if (state.hitFlash > 0) {
    ctx.save();
    ctx.strokeStyle = '#fff3bd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guardX - 50, ground - 105); ctx.lineTo(guardX - 88, ground - 54);
    ctx.moveTo(guardX - 38, ground - 97); ctx.lineTo(guardX - 78, ground - 44);
    ctx.stroke();
    ctx.restore();
  }
  drawDangerOverlay(width, height);
  drawWaveRoster(width);
  drawBossBar(width);
  drawFloaters(height);
  drawActBanner(width);
}

let spellBarKey = '';
function syncSpellBar() {
  const bar = ui['spell-bar'];
  const ids = activeHeroes().filter((id) => heroDefs[id].spell);
  const key = ids.join(',');
  if (key !== spellBarKey) {
    spellBarKey = key;
    const keys = { front: '1', tower: '2', support: '3' };
    bar.innerHTML = ids.map((id) => {
      const spell = heroDefs[id].spell;
      return `<button class="tile tile-label spell" data-hero="${id}" title="${keys[heroDefs[id].role]} · ${heroDefs[id].name}: ${spell.name} — ${spell.hint}"><span>${spell.icon}</span><small>${spell.short}</small><i class="cd"></i></button>`;
    }).join('') + (ids.length ? '<button class="tile tile-label spell-auto" data-auto="1" title="Heroes cast spells by themselves"><span>⟳</span><small>Auto</small></button>' : '');
  }
  if (typeof bar.querySelectorAll !== 'function') return;
  for (const button of bar.querySelectorAll('.spell')) {
    const id = button.dataset.hero;
    const blocked = spellBlocked(id);
    const cd = state.heroes[id].cd;
    const overlay = button.querySelector('.cd');
    overlay.style.display = cd > 0 ? '' : 'none';
    overlay.style.height = `${cd / heroDefs[id].spell.cooldown * 100}%`;
    overlay.textContent = '';
    button.querySelector('small').textContent = cd > 0 ? `${Math.ceil(cd)}s` : heroDefs[id].spell.short;
    button.disabled = Boolean(blocked);
    button.classList.toggle('ready', !blocked);
    button.classList.toggle('rested', state.heroes[id].rested);
    button.classList.toggle('tired', state.heroes[id].fatigue >= 2);
  }
  const auto = bar.querySelector('.spell-auto');
  if (auto) auto.classList.toggle('active', state.autoSpells);
}

let lineupKey = '';
function syncLineup() {
  const parts = slotDefs.map((slot) => {
    if (!slotUnlocked(slot.role)) return { slot, locked: true };
    const id = slotHero(slot.role);
    return { slot, id, options: heroesForRole(slot.role), condition: id ? heroCondition(id) : null };
  });
  const bench = Object.keys(heroDefs).filter((id) => state.heroes[id].unlocked && !activeHeroes().includes(id) && !heroDefs[id].machine);
  const key = JSON.stringify([parts.map((p) => [p.id, p.locked, p.options, p.condition]), bench, state.phase === 'wave',
    bench.map((id) => state.heroes[id].rested)]);
  if (key === lineupKey) return;
  lineupKey = key;
  const unlockText = { tower: 'unlocks at Town II', support: 'unlocks at Town III' };
  const inWave = state.phase === 'wave';
  ui.lineup.innerHTML = ui['hud-lineup'].innerHTML = parts.map((p) => {
    if (p.locked) return `<button class="row" disabled><span><b>${p.slot.name}</b><small>${unlockText[p.slot.role]}</small></span><em>Locked</em></button>`;
    const def = heroDefs[p.id];
    const swap = p.options.length > 1 && !inWave;
    const spell = def.spell ? `${def.spell.name} — ${def.spell.hint}` : 'no spell · never tires';
    return `<button class="row" data-role="${p.slot.role}" ${swap ? '' : 'disabled'} title="${swap ? 'Tap to swap in another hero' : ''}"><span><b>${p.slot.name} · ${def.name}${swap ? ' ⇄' : ''}</b><small>${spell}</small></span><em class="${p.condition.tone}">${p.condition.label}</em></button>`;
  }).join('') + `<p class="row-note">${bench.length ? `Resting: ${bench.map((id) => `${heroDefs[id].name}${state.heroes[id].rested ? ' (rested)' : ''}`).join(', ')}` : 'No reserve heroes yet — rotation opens once a slot has a substitute.'}</p>`;
}

// ---------------------------------------------------------------------------
// In-phone HUD. It mirrors the debug panel: every action calls the same handler,
// so the rules live in one place.
// ---------------------------------------------------------------------------
const hud = { open: false, tab: 'upgrades' };
const hudUpgrades = [
  { kind: 'town', icon: '⌂', name: 'Town', level: 'town-level', cost: 'town-cost', button: 'town-upgrade' },
  { kind: 'guard', icon: '⚔', name: 'Frontline', level: 'guard-level', cost: 'guard-cost', button: 'guard-upgrade' },
  { kind: 'spikes', icon: '⋀', name: 'Spikes', level: 'spikes-level', cost: 'spikes-cost', button: 'spikes-upgrade' },
  { kind: 'archer', icon: '➶', name: 'Archer', level: 'archer-level', cost: 'archer-cost', button: 'archer-upgrade', show: () => state.archerUnlocked },
  { kind: 'catapult', icon: '☄', name: 'Catapult', level: 'catapult-level', cost: 'catapult-cost', button: 'catapult-upgrade', show: () => state.catapultUnlocked },
  { kind: 'farm', icon: '✶', name: 'Farm', level: 'farm-level', cost: 'farm-cost', button: 'farm-upgrade' }
];
let hudUpgradesKey = '';

function setHudOpen(open) {
  hud.open = open && state.phase !== 'wave';
}

// ---------------------------------------------------------------------------
// First-minute hints: one at a time, each shown until the player does the thing.
// ---------------------------------------------------------------------------
const hints = [
  { id: 'call', target: 'hud-wave', text: 'Tap to call the first wave',
    show: () => state.phase === 'preparation' && state.wavesCleared === 0 && state.wave === 1 },
  { id: 'bash', target: 'spell-bar', text: 'Orc in reach — tap Bash to stun it',
    show: () => state.phase === 'wave' && state.frontHero === 'legionary' && !spellBlocked('legionary') },
  { id: 'upgrade', target: 'hud-upgrade', text: 'Spend food: upgrade your Frontline',
    show: () => state.phase !== 'wave' && state.wavesCleared >= 1 && !ui['guard-upgrade'].disabled && !hud.open },
  { id: 'defeat', target: 'hud-upgrade', text: 'Lost? Upgrade, then retry the wave',
    show: () => state.phase === 'defeat' && !hud.open },
  { id: 'boss', target: 'hud-wave', text: 'Boss next! Reach the recommended level first',
    show: () => state.phase === 'victory' && isBossWave(state.wave + 1) && !hud.open },
  { id: 'heroes', target: 'hud-upgrade', text: 'New hero! Swap heroes in Upgrades → Heroes',
    show: () => state.heroes.hoplite.unlocked && state.phase !== 'wave' && !hud.open }
];

function markHint(id) {
  if (!state.hintsSeen.includes(id)) state.hintsSeen.push(id);
}

function currentHint() {
  if (ui.away && ui.away.hidden === false) return null;
  return hints.find((hint) => !state.hintsSeen.includes(hint.id) && hint.show()) || null;
}

function syncHint() {
  const hint = currentHint();
  const el = ui.hint;
  el.hidden = !hint;
  if (!hint) return;
  if (el.dataset) el.dataset.id = hint.id;
  if (el.textContent !== hint.text) el.textContent = hint.text;
  const card = canvas.parentElement;
  let target = ui[hint.target];
  if (hint.target === 'spell-bar' && target && target.querySelector) target = target.querySelector('.spell') || target;
  if (!card || !target || typeof target.getBoundingClientRect !== 'function') return;
  const c = card.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const half = (el.offsetWidth || 240) / 2 + 12; // keep the bubble inside the screen
  const x = Math.min(c.width - half, Math.max(half, t.left - c.left + t.width / 2));
  el.style.left = `${x}px`;
  el.style.bottom = `${c.bottom - t.top + 12}px`;
  el.style.setProperty('--arrow', `${t.left - c.left + t.width / 2 - x}px`);
}

let gearKey = '';
function syncGear() {
  const key = JSON.stringify([systemUnlocked('armory'), state.gear, state.phase === 'wave']);
  if (key === gearKey) return;
  gearKey = key;
  if (!systemUnlocked('armory')) { ui['hud-gear'].innerHTML = ''; return; }
  const inWave = state.phase === 'wave';
  const rows = state.gear.slice().sort((a, b) => b.rarity - a.rarity || a.slot.localeCompare(b.slot)).map((item) => {
    const slot = GEAR_SLOTS[item.slot];
    const sign = item.slot === 'weapon' ? '+' : '−';
    const owner = item.owner ? heroDefs[item.owner].name : 'in storage';
    return `<button class="row" data-gear="${item.id}" ${inWave ? 'disabled' : ''} title="Tap to give it to the next hero"><i>${slot.icon}</i><span><b>${gearName(item)}</b><small>${RARITY[item.rarity]} · ${sign}${Math.round(slot.values[item.rarity] * 100)}% ${slot.label}</small></span><em class="${item.owner ? 'good' : ''}">${owner}</em></button>`;
  }).join('');
  ui['hud-gear'].innerHTML = `<p class="row-note"><b>Armory</b> · tap an item to pass it to the next hero</p>${rows || '<p class="row-note">No gear yet — bosses drop it, elites sometimes.</p>'}`;
}

function syncHud() {
  const inWave = state.phase === 'wave';
  if (inWave) hud.open = false;
  const card = canvas.parentElement;
  if (card && card.classList) card.classList.toggle('panel-open', hud.open);
  ui['hud-panel'].hidden = !hud.open;
  ui['hud-upgrades'].hidden = hud.tab !== 'upgrades';
  ui['hud-heroes'].hidden = hud.tab !== 'heroes';
  ui['hud-tab-upgrades'].classList.toggle('active', hud.tab === 'upgrades');
  ui['hud-tab-heroes'].classList.toggle('active', hud.tab === 'heroes');

  // Corner button: upgrades between waves, a lock during combat, a cross when open.
  const affordable = hudUpgrades.filter((row) => (!row.show || row.show()) && !ui[row.button].disabled).length
    + SYSTEMS.filter((sys) => canUnlockSystem(sys.id)).length;
  ui['hud-upgrade'].classList.toggle('active', hud.open);
  ui['hud-upgrade'].disabled = inWave;
  const upgradeHtml = inWave ? '<span>🔒</span><small>In battle</small>'
    : `<span>⬆</span><small>Upgrades</small>${affordable ? `<i class="badge">${affordable}</i>` : ''}`;
  if (hud.upgradeHtml !== upgradeHtml) {
    hud.upgradeHtml = upgradeHtml;
    ui['hud-upgrade'].innerHTML = upgradeHtml;
  }

  // Upgrade rows: rebuilt only when their text or state changes.
  const rows = hudUpgrades.filter((row) => !row.show || row.show()).map((row) => ({
    ...row, levelText: ui[row.level].textContent, costText: ui[row.cost].textContent, disabled: Boolean(ui[row.button].disabled)
  }));
  // Systems bought with an eagle appear once their boss has been beaten.
  for (const sys of SYSTEMS) {
    if (systemUnlocked(sys.id) || state.wavesCleared < sys.wave) continue;
    rows.unshift({ kind: `sys-${sys.id}`, icon: sys.icon, name: `${sys.soon ? '' : 'Unlock '}${sys.name}`, system: sys.id,
      levelText: sys.soon ? 'soon' : '1 🦅', costText: sys.soon ? `${sys.text} · coming soon, keep your eagle` : sys.text, disabled: !canUnlockSystem(sys.id) });
  }
  const key = JSON.stringify(rows.map((row) => [row.kind, row.levelText, row.costText, row.disabled]));
  if (key !== hudUpgradesKey) {
    hudUpgradesKey = key;
    ui['hud-upgrades'].innerHTML = rows.map((row) => `<button class="row" ${row.system ? `data-system="${row.system}"` : `data-upgrade="${row.button}"`} ${row.disabled ? 'disabled' : ''}><i>${row.icon}</i><span><b>${row.name}</b><small>${row.costText}</small></span><em>${row.levelText}</em></button>`).join('');
  }

  // Wave button: short labels for the phone.
  const needsTown = state.phase === 'victory' && state.townLevel < requiredTown(state.wave + 1);
  const left = state.waveTotal - state.defeated;
  ui['hud-wave'].disabled = inWave;
  const nextWave = state.phase === 'victory' ? state.wave + 1 : state.phase === 'complete' ? FINAL_WAVE : state.wave;
  const boss = isBossWave(nextWave);
  const title = inWave ? `⚔ ${left} left`
    : needsTown ? '⌂ Upgrade town'
    : state.phase === 'defeat' ? `↻ Retry wave ${state.wave}`
    : `${state.phase === 'complete' ? '↻' : boss ? '☠' : '⚑'} ${boss ? 'Boss · wave' : 'Wave'} ${nextWave}`;
  const rec = recommendedLevel(nextWave);
  const sub = inWave || needsTown ? '' : `<small class="${state.guardLevel >= rec ? 'ok' : 'low'}">Frontline lv ${rec} ${state.guardLevel >= rec ? '✓' : 'recommended'}</small>`;
  const waveHtml = `<span>${title}</span>${sub}`;
  if (hud.waveHtml !== waveHtml) { hud.waveHtml = waveHtml; ui['hud-wave'].innerHTML = waveHtml; }
  ui['hud-wave'].classList.toggle('boss', boss && !inWave);
  ui['hud-wave'].classList.toggle('ready', !inWave && !needsTown && !hud.open);
  ui['hud-speed'].textContent = `${state.speed}×`;
  ui['hud-pause'].textContent = state.running ? 'Ⅱ' : '▶';
  ui['hud-sound'].textContent = sound.enabled ? '🔊' : '🔈';
  syncGear();
  syncHint();
}

function syncUi() {
  ui.food.textContent = formatNumber(state.food);
  ui.coins.textContent = formatNumber(state.coins);
  ui.trophies.textContent = state.trophies;
  ui.eagles.textContent = state.eagles;
  ui['trophy-pill'].hidden = state.trophies === 0 && state.townLevel < 2;
  ui['eagle-pill'].hidden = state.eagles === 0 && state.systems.length === 0;
  ui.wave.textContent = state.wave;
  ui.kills.textContent = state.kills;
  ui['mob-count'].textContent = state.phase === 'wave' ? state.waveTotal - state.defeated : 0;
  ui['guard-health-value'].textContent = `${Math.ceil(state.guardHp)}/${state.maxGuardHp}`;
  ui['guard-health-bar'].style.width = `${state.guardHp / state.maxGuardHp * 100}%`;
  ui['guard-health-bar'].classList.toggle('regenerating', state.regenFlash > 0);
  ui['guard-status'].textContent = state.guardHp <= 0 ? `${frontName().toUpperCase()} FELL` : state.regenFlash > 0 ? 'RECOVERING' : state.attackTimer > 0 ? 'ATTACKING' : 'READY';
  const labels = { preparation: 'PREPARING', wave: state.running ? 'WAVE IN PROGRESS' : 'PAUSED', victory: 'VICTORY', defeat: `${frontName().toUpperCase()} FELL`, complete: 'FRONTIER HELD' };
  const patrolActive = state.phase !== 'wave' && state.mobs.some((mob) => !mob.dead);
  ui['state-label'].textContent = patrolActive ? 'PATROL SKIRMISH' : labels[state.phase];
  ui['live-dot'].style.background = (state.phase === 'wave' || patrolActive) && state.running ? '#b65a3c' : '#748c58';
  ui['farm-status'].textContent = `+${state.farmLevel} / 3s`;
  ui['guard-level'].textContent = `lv ${state.guardLevel}`;
  ui['spikes-level'].textContent = state.spikesLevel ? `lv ${state.spikesLevel}` : 'not built';
  ui['farm-level'].textContent = `lv ${state.farmLevel}`;
  const guardPrice = guardUpgradePrice();
  const spikesCost = spikesPrice();
  const farmCost = farmPrice();
  ui['guard-cost'].textContent = `${guardPrice} food · +1 damage, +20 max HP`;
  ui['spikes-cost'].textContent = state.spikesLevel === 0
    ? `${spikesCost} gold · build, 1 passive damage`
    : `${spikesCost} gold · +1 passive damage`;
  ui['farm-cost'].textContent = `${farmCost} gold · more food`;
  const inBattle = state.phase === 'wave';
  ui['guard-upgrade'].disabled = !canUpgrade('guard') || state.food < guardPrice;
  ui['spikes-upgrade'].disabled = !canUpgrade('spikes') || state.coins < spikesCost;
  ui['farm-upgrade'].disabled = !canUpgrade('farm') || state.coins < farmCost;
  ui['village-stage'].textContent = `🏡 Village: ${state.villageStage}/3 · ${villageStages[state.villageStage]}${state.stageOverride ? ' (debug)' : ''}`;
  ui['archer-row'].classList.toggle('locked', !state.archerUnlocked);
  ui['archer-status'].textContent = !state.archerUnlocked ? 'LOCKED' : state.towerSlot === 'archer' ? `LV ${state.archerLevel}` : 'BENCHED';
  ui['archer-note'].textContent = state.archerUnlocked ? 'shoots from the tower' : 'unlocks at Town II';
  syncSpellBar();
  syncLineup();
  ui['auto-spells'].textContent = `✦ Auto spells: ${state.autoSpells ? 'on' : 'off'}`;
  ui['tower-slot'].style.display = state.catapultUnlocked ? '' : 'none'; // only useful once there is a second option
  const slotNames = { archer: 'Archer', catapult: 'Catapult' };
  ui['tower-slot'].textContent = state.towerSlot ? `🗼 Tower slot: ${slotNames[state.towerSlot]}${state.catapultUnlocked ? ' ⇄' : ''}` : '🗼 Tower slot: empty';
  ui['tower-slot'].disabled = state.phase === 'wave' || !state.catapultUnlocked;
  ui['tower-slot'].title = state.catapultUnlocked ? 'Swap the tower defender (between waves, free)' : `Second option unlocks after wave ${CATAPULT_UNLOCK_WAVE}`;
  ui['catapult-level'].textContent = state.catapultUnlocked ? `lv ${state.catapultLevel}` : 'locked';
  ui['catapult-cost'].textContent = state.catapultUnlocked ? `${catapultPrice()} gold · +2 area damage, faster` : 'unlocks at Town II';
  ui['catapult-upgrade'].disabled = !canUpgrade('catapult') || !state.catapultUnlocked || state.coins < catapultPrice();
  ui['archer-level'].textContent = state.archerUnlocked ? `lv ${state.archerLevel}` : 'locked';
  ui['archer-cost'].textContent = state.archerUnlocked ? `${archerPrice()} gold · +0.75 damage, faster` : 'unlocks at Town II';
  ui['archer-upgrade'].disabled = !canUpgrade('archer') || !state.archerUnlocked || state.coins < archerPrice();
  for (const kind of ['guard', 'spikes', 'farm', 'archer', 'catapult']) {
    if (state[`${kind}Level`] >= upgradeLimit(kind)) {
      ui[`${kind}-cost`].textContent = kind === 'spikes' && state.wavesCleared < 3
        ? 'Unlocks after wave 3' : state.townLevel >= MAX_TOWN ? 'Max level'
        : `Needs village ${state.townLevel + 1}`;
    }
  }
  ui['town-level'].textContent = `lv ${state.townLevel}`;
  ui['town-upgrade'].disabled = !canUpgradeTown();
  const nextTownWave = townWaveRequirement(state.townLevel + 1);
  ui['town-cost'].textContent = state.townLevel >= MAX_TOWN ? 'Village fully developed for now'
    : canUpgradeTown() ? `1 trophy · village ${state.townLevel + 1}: higher caps, new buildings`
    : state.wavesCleared < nextTownWave ? `Defeat the wave ${nextTownWave} boss for a trophy`
    : 'Needs 1 trophy';
  const needsTown = state.phase === 'victory' && state.townLevel < requiredTown(state.wave + 1);
  ui['wave-button'].disabled = state.phase === 'wave' || needsTown;
  ui['wave-button'].textContent = state.phase === 'defeat' ? '↻ Retry wave' : state.phase === 'victory' ? `⚑ Call wave ${state.wave + 1}` : state.phase === 'complete' ? `↻ Replay wave ${FINAL_WAVE} (no reward)` : `⚑ Call wave ${state.wave}`;
  if (needsTown) ui['wave-button'].textContent = '⌂ Upgrade the town first';
  const previewWave = state.phase === 'victory' ? state.wave + 1 : state.wave;
  const difficulty = getWaveDifficulty(previewWave);
  const locked = Boolean(state.waveDifficulties[previewWave]);
  ui['wave-difficulty'].textContent = `Wave ${previewWave} · HP ×${difficulty.hp.toFixed(1)} · attack ×${difficulty.damage.toFixed(1)}. ${locked ? 'Orc strength is locked, retries included.' : 'Orc strength locks when the wave starts.'}`;
  ui['wave-preview'].textContent = `Roster: ${wavePreviewText(previewWave)}`;
  const nextBoss = state.wavesCleared < 5 ? 5 : state.wavesCleared < 10 ? 10 : null;
  ui['boss-progress'].textContent = nextBoss ? `Boss progress: ${Math.min(state.wavesCleared, nextBoss - 1)} / ${nextBoss - 1} waves` : 'Campaign complete · all bosses defeated';
  ui['specialization-note'].hidden = state.townLevel < 2;
  if (state.townLevel >= 2) ui['specialization-note'].textContent = state.towerSlot === 'catapult'
    ? 'Tower: Catapult — area damage · tap the slot to pick the Archer'
    : 'Tower: Archer — single-target damage · tap the slot to pick the Catapult';
  syncHud();
}

function frame(now) {
  const delta = state.last ? Math.min((now - state.last) / 1000, 0.05) : 0;
  state.last = now;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  const worldWidth = 1170;
  const worldHeight = 540;
  update(delta, worldWidth);
  ctx.setTransform(canvas.width / worldWidth, 0, 0, canvas.height / worldHeight, 0, 0);
  ctx.clearRect(0, 0, worldWidth, worldHeight);
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * state.shake / 0.28, (Math.random() - 0.5) * 6 * state.shake / 0.28);
  drawScene(worldWidth, worldHeight);
  syncUi();
  requestAnimationFrame(frame);
}

ui.pause.onclick = () => {
  if (state.phase === 'defeat') return;
  state.running = !state.running;
  ui.pause.textContent = state.running ? 'Ⅱ Pause' : '▶ Resume';
};
ui.speed.onclick = () => {
  state.speed = ({ 1: 2, 2: 100, 100: 1 })[state.speed] || 1;
  ui.speed.textContent = `⏩ ${state.speed}×`;
};
ui['town-upgrade'].onclick = upgradeTown;
ui['wave-button'].onclick = () => {
  if (state.phase === 'victory' && state.townLevel < requiredTown(state.wave + 1)) return;
  if (state.phase === 'victory') state.wave += 1;
  // After the campaign the last wave stays replayable to try out the full lineup.
  if (state.phase === 'complete') state.phase = 'preparation';
  if (state.phase !== 'wave') startWave();
};
ui['guard-upgrade'].onclick = () => {
  if (!canUpgrade('guard')) return;
  const price = guardUpgradePrice();
  if (state.phase !== 'wave' && state.food >= price) {
    state.food -= price; state.guardLevel += 1; state.maxGuardHp += 20;
    markHint('upgrade');
  }
};
ui['spikes-upgrade'].onclick = () => {
  if (!canUpgrade('spikes')) return;
  const price = spikesPrice();
  if (state.phase !== 'wave' && state.coins >= price) {
    state.coins -= price;
    state.spikesLevel += 1;
  }
};
ui['farm-upgrade'].onclick = () => {
  if (!canUpgrade('farm')) return;
  const price = farmPrice();
  if (state.coins >= price) { state.coins -= price; state.farmLevel += 1; }
};
ui.reset.onclick = () => { resetGame(); clearSave(); };
ui['archer-upgrade'].onclick = () => {
  if (!canUpgrade('archer')) return;
  const price = archerPrice();
  if (state.archerUnlocked && state.phase !== 'wave' && state.coins >= price) {
    state.coins -= price;
    state.archerLevel += 1;
  }
};
ui['spell-bar'].onclick = (event) => {
  const target = event.target.closest && event.target.closest('button');
  if (!target) return;
  if (target.dataset.auto) state.autoSpells = !state.autoSpells;
  else castSpell(target.dataset.hero);
};
ui.lineup.onclick = (event) => {
  const target = event.target.closest && event.target.closest('[data-role]');
  if (target) cycleSlot(target.dataset.role);
};
ui['auto-lineup'].onclick = () => autoLineup();
ui['auto-spells'].onclick = () => { state.autoSpells = !state.autoSpells; };
ui['tower-slot'].onclick = () => cycleSlot('tower');
ui['catapult-upgrade'].onclick = () => {
  if (!canUpgrade('catapult')) return;
  const price = catapultPrice();
  if (state.catapultUnlocked && state.phase !== 'wave' && state.coins >= price) {
    state.coins -= price;
    state.catapultLevel += 1;
  }
};

// Debug: cycle village stages 1 → 2 → 3 → 1 without playing the waves.
ui['village-stage'].onclick = () => {
  state.stageOverride = state.villageStage % 3 + 1;
};

// ---------------------------------------------------------------------------
// Save / load and offline (AFK) income.
// Only progress is saved; a wave in progress is restored as its preparation.
// ---------------------------------------------------------------------------
const SAVE_KEY = 'afkRomeSave.v1';
const SAVE_VERSION = 1;
const OFFLINE_CAP_SECONDS = 8 * 3600;
const OFFLINE_MIN_SECONDS = 60;
const OFFLINE_GOLD_EVERY = 10;   // patrols pay about 1 gold per 10 s while you play
const SAVED_FIELDS = [
  'townLevel', 'wave', 'phase', 'food', 'coins', 'kills', 'patrolKills',
  'guardLevel', 'maxGuardHp', 'spikesLevel', 'farmLevel',
  'archerUnlocked', 'archerLevel', 'catapultUnlocked', 'catapultLevel', 'towerSlot',
  'wavesCleared', 'waveDifficulties', 'frontHero', 'supportHero', 'autoSpells', 'hintsSeen', 'trophies', 'eagles', 'systems', 'gear', 'gearDrops', 'eliteKills'
];

function serializeSave(now = Date.now()) {
  const data = { version: SAVE_VERSION, savedAt: now };
  for (const key of SAVED_FIELDS) data[key] = state[key];
  data.heroes = Object.fromEntries(Object.entries(state.heroes).map(([id, hero]) => [id,
    { unlocked: hero.unlocked, fatigue: hero.fatigue, rested: hero.rested }]));
  // A fight cannot be resumed: come back to the same wave, ready to start it.
  if (data.phase === 'wave') data.phase = state.wave > state.wavesCleared ? 'preparation' : 'victory';
  return data;
}

function applySave(data) {
  if (!data || data.version !== SAVE_VERSION) return false;
  resetGame();
  for (const key of SAVED_FIELDS) if (key in data) state[key] = data[key];
  for (const [id, hero] of Object.entries(data.heroes || {})) {
    if (state.heroes[id]) Object.assign(state.heroes[id], hero, { cd: 0 });
  }
  if (!['preparation', 'victory', 'defeat', 'complete'].includes(state.phase)) state.phase = 'preparation';
  if (state.phase === 'defeat') state.phase = 'preparation';
  state.guardHp = state.maxGuardHp;
  state.villageStage = state.townLevel;
  state.notice = null;
  return true;
}

// Offline income mirrors what the village earns while you watch: the farm's food
// and the patrol gold. It never buys upgrades or unlocks anything.
function offlineIncome(seconds, farmLevel) {
  const capped = Math.max(0, Math.min(seconds, OFFLINE_CAP_SECONDS));
  if (capped < OFFLINE_MIN_SECONDS) return { seconds: capped, food: 0, gold: 0 };
  return { seconds: capped, food: Math.floor(capped / 3) * farmLevel, gold: Math.floor(capped / OFFLINE_GOLD_EVERY) };
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${Math.max(1, m)}m`;
}

function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeSave())); } catch (error) { /* storage is optional */ }
}

function readSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (error) { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (error) { /* optional */ }
}

const away = { pending: null };
function showAway(income) {
  away.pending = income;
  ui['away-time'].textContent = formatDuration(income.seconds);
  ui['away-food'].textContent = `+${income.food}`;
  ui['away-gold'].textContent = `+${income.gold}`;
  ui['away-cap'].hidden = income.seconds < OFFLINE_CAP_SECONDS;
  ui.away.hidden = false;
  state.running = false;
}

function collectAway() {
  if (!away.pending) return;
  state.food += away.pending.food;
  state.coins += away.pending.gold;
  away.pending = null;
  ui.away.hidden = true;
  state.running = true;
  sfx('coin');
  writeSave();
}


Promise.all([
  ...Object.entries(sources).map(async ([name, config]) => {
    sprites[name] = await loadSprite(config);
  }),
  ...Object.entries(skySources).map(async ([name, src]) => {
    skyLayers[name] = await loadImage(src);
  }),
  ...Object.entries(landscapeSources).map(async ([name, src]) => {
    const image = await loadImage(src);
    if (name === 'grass') {
      landscapeLayers[name] = image;
      return;
    }
    const atmosphere = {
      // Like the reference: nearby foliage stays green, distance loses contrast and shifts blue.
      mountains: ['#619bc5', 0.70, 0.30],
      hills: ['#6699b1', 0.48, 0.16],
      treeline: ['#688f9b', 0.28, 0.06]
    }[name];
    landscapeLayers[name] = tintLandscapeLayer(image, atmosphere[0], atmosphere[1], atmosphere[2]);
  }),
  ...Object.entries(structureSources).map(async ([name, src]) => {
    structures[name] = await loadImage(src);
  }),
  ...Object.entries(resourceSources).map(async ([name, src]) => { resourceIcons[name] = await loadImage(src); }),
  ...Object.entries(portraitSources).map(async ([name, src]) => { portraits[name] = await loadImage(src); })
]).then(() => {
  ui.loading.classList.add('done');
}).catch(() => {
  ui.loading.textContent = 'Could not load game assets';
});

// Sound controls, button clicks and the audio unlock gesture.
function syncSoundUi() {
  ui['sound-toggle'].textContent = sound.enabled ? '🔊 Sound: on' : '🔈 Sound: off';
  ui['sound-volume'].value = Math.round(sound.volume * 100);
}
ui['sound-toggle'].onclick = () => {
  sound.enabled = !sound.enabled;
  saveSound();
  syncSoundUi();
};
ui['sound-volume'].oninput = (event) => {
  setVolume(Number(event.target.value) / 100);
  sfx('coin');
};
syncSoundUi();
document.addEventListener('pointerdown', unlockAudio, true);
// On phones the first tap also asks for real full screen and landscape lock
// (Android Chrome; iOS ignores it — use "Add to Home Screen" there).
document.addEventListener('pointerdown', () => {
  const phone = matchMedia('(pointer: coarse) and (max-height: 600px)').matches && !document.documentElement.classList.contains('debug');
  if (!phone || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
    .catch(() => {});
}, { once: true });
document.addEventListener('keydown', unlockAudio, true);
document.addEventListener('click', (event) => {
  const button = event.target.closest && event.target.closest('button');
  if (button && !button.disabled) sfx('click');
}, true);

ui['hud-pause'].onclick = () => ui.pause.onclick();
ui['hud-sound'].onclick = () => ui['sound-toggle'].onclick();
ui['hud-speed'].onclick = () => ui.speed.onclick();
ui['hud-wave'].onclick = () => {
  if (state.phase === 'victory' && state.townLevel < requiredTown(state.wave + 1)) {
    hud.tab = 'upgrades';
    setHudOpen(true);
    return;
  }
  hud.open = false;
  ui['wave-button'].onclick();
};
ui['hud-upgrade'].onclick = () => setHudOpen(!hud.open);
ui['hud-close'].onclick = () => setHudOpen(false);
ui['hud-tab-upgrades'].onclick = () => { hud.tab = 'upgrades'; };
ui['hud-tab-heroes'].onclick = () => { hud.tab = 'heroes'; markHint('heroes'); };
ui['hud-upgrades'].onclick = (event) => {
  const row = event.target.closest && event.target.closest('[data-upgrade], [data-system]');
  if (row && row.dataset.system) unlockSystem(row.dataset.system);
  else if (row) ui[row.dataset.upgrade].onclick();
};
ui['hud-lineup'].onclick = (event) => ui.lineup.onclick(event);
ui['hud-auto-lineup'].onclick = () => { autoLineup(); autoEquip(); };
ui['hud-gear'].onclick = (event) => {
  const row = event.target.closest && event.target.closest('[data-gear]');
  if (row) cycleGearOwner(Number(row.dataset.gear));
};

// Tap a hero to cast their spell; keys 1/2/3 cast the slot spells.
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width * 1170;
  const y = (event.clientY - rect.top) / rect.height * 540;
  const ground = 540 * 0.82;
  const archer = heroPosition(1170, 540);
  const support = supportPosition(1170, 540);
  if (state.towerSlot === 'archer' && Math.abs(x - archer.x) < 60 && y > archer.y - 170 && y < archer.y + 10) castSpell('archer');
  else if (state.supportHero && Math.abs(x - support.x) < 45 && y > support.y - 150 && y < support.y + 10) castSpell(state.supportHero);
  else if (Math.abs(x - 1170 * 0.52) < 60 && y > ground - 175 && y < ground + 15) castSpell(state.frontHero);
});
document.addEventListener('keydown', (event) => {
  if (event.repeat || event.target.closest('button, input, textarea, select, [contenteditable]')) return;
  if (event.key === 'u' || event.key === 'U') setHudOpen(!hud.open);
  if (event.key === 'Escape') hud.open = false;
  const slot = slotDefs.find((item) => item.key === event.key);
  if (slot) {
    const id = slotHero(slot.role);
    if (id && heroDefs[id].spell) castSpell(id);
  }
});

// Boot: restore progress, pay offline income, then autosave regularly and on exit.
{
  const saved = readSave();
  if (saved && applySave(saved)) {
    const income = offlineIncome((Date.now() - (saved.savedAt || Date.now())) / 1000, state.farmLevel);
    if (income.food || income.gold) showAway(income);
  }
  ui['away-collect'].onclick = collectAway;
  setInterval(writeSave, 5000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') writeSave(); });
  window.addEventListener('pagehide', writeSave);
}

requestAnimationFrame(frame);
