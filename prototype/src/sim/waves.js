'use strict';
// Enemy types from data/enemies.json (view.* flattened for the renderer).
const enemyTypes = Object.fromEntries(Object.entries(GAME_DATA.enemies.types)
  .map(([id, type]) => [id, { ...type, height: type.view.height, bar: type.view.barColor }]));

function traitsOf(type) {
  return (enemyTypes[type] && enemyTypes[type].traits) || [];
}

function buildWavePlan(wave) {
  const plans = GAME_DATA.waves.plans;
  return [...(plans[wave] || plans[FINAL_WAVE])];
}

const wavePreviewNames = Object.fromEntries(Object.entries(GAME_DATA.enemies.types).map(([id, type]) => [id, type.name]));

// From wave 21 three wave enemies may fight at once (bosses still enter alone).
// How many wave enemies may fight at once (bosses still enter alone).
function maxConcurrent(wave) {
  return GAME_DATA.waves.maxConcurrent.filter((rule) => wave >= rule.fromWave).at(-1).max;
}

function wavePreviewText(wave) {
  const plan = buildWavePlan(wave);
  const counts = new Map();
  for (const type of plan) counts.set(type, (counts.get(type) || 0) + 1);
  return [...counts].map(([type, count]) => `${count}× ${wavePreviewNames[type] || type}`).join(' · ');
}

function guardAttackInterval(level) {
  const i = GAME_DATA.economy.frontline.attackInterval;
  return Math.max(i.min, i.base + (level - 1) * i.perLevel);
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
const OPENING_HP_TUNING = GAME_DATA.balance.opening.hp;
const OPENING_DAMAGE_TUNING = GAME_DATA.balance.opening.damage;
// Act II assumes the player uses hero spells and rotation (balance bot «Авто»).
const ACT2_HP_TUNING = GAME_DATA.balance.act2.hp;
const ACT2_DAMAGE_TUNING = GAME_DATA.balance.act2.damage;
// Act III (waves 11–30), tuned with the balance bot (spells, rotation and gear).
const ACT3_HP_TUNING = GAME_DATA.balance.act3.hp;
const ACT3_DAMAGE_TUNING = GAME_DATA.balance.act3.damage;

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
  // Expected hero training scales enemies the same way it scales heroes.
  const trained = Math.max(0, (progress.heroLevel || 1) - 1);
  const tuneHp = (wave <= 10 ? ACT2_HP_TUNING[wave - 6] : (ACT3_HP_TUNING[wave - 11] ?? 1)) * (1 + BARRACKS.damage * trained);
  const tuneDamage = (wave <= 10 ? ACT2_DAMAGE_TUNING[wave - 6] : (ACT3_DAMAGE_TUNING[wave - 11] ?? 1)) * (1 + BARRACKS.toughness * trained);
  return {
    hp: (1 + 0.3 * step + 0.06 * step * step) * offense * tuneHp,
    damage: (1 + 0.12 * step) * Math.pow(progress.maxGuardHp / 100, 0.25) * tuneDamage
  };
}

// Each wave is tuned for the player the game EXPECTS at that wave (idle-genre rule):
// under-levelled players lose and must grow, over-levelled players win easily.
// Values match the balance bot's build at each wave.
const EXPECTED_PROGRESS = [null, ...GAME_DATA.balance.expectedProgress.table];
function expectedProgress(wave) {
  const known = EXPECTED_PROGRESS[wave];
  // Beyond the table the expected build grows slower than the wave number.
  const rule = GAME_DATA.balance.expectedProgress.late;
  const late = Math.max(0, wave - 10);
  const base = known || { guardLevel: 10 + Math.round(late * rule.guardPerWave), spikesLevel: 2 + Math.floor(late / rule.spikesEvery),
    archerLevel: 5 + Math.round(late * rule.towerPerWave), catapultLevel: 5 + Math.round(late * rule.towerPerWave) };
  // After the Barracks heroes are expected to train about one level per wave.
  const heroLevel = wave > rule.heroLevelFromWave ? 1 + (wave - rule.heroLevelFromWave) : 1;
  return { archerLevel: 0, catapultLevel: 0, heroLevel, ...base, maxGuardHp: GAME_DATA.economy.frontline.baseHp - GAME_DATA.economy.frontline.hpPerLevel + GAME_DATA.economy.frontline.hpPerLevel * base.guardLevel };
}

// Frontline level the wave was tuned for — shown to the player as a recommendation.
function recommendedLevel(wave) {
  return expectedProgress(wave).guardLevel;
}

// Is the current build at least what this wave was tuned for?
function meetsExpected(wave) {
  const t = expectedProgress(wave);
  const trainedEnough = !systemUnlocked('barracks') || activeHeroes().every((id) => heroDefs[id].machine || heroLevel(id) >= t.heroLevel);
  return trainedEnough && state.guardLevel >= t.guardLevel && state.spikesLevel >= t.spikesLevel
    && (state.townLevel < 2 || Math.max(state.archerLevel, state.catapultLevel) >= t.archerLevel);
}

function getWaveDifficulty(wave) {
  return state.waveDifficulties[wave] || calculateWaveDifficulty(wave, expectedProgress(wave));
}
