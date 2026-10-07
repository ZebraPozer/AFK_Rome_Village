'use strict';
// Ids of the first-minute hints (texts live in ui/hud.js). Kept here so the
// simulation can mark them without knowing about the UI.
const HINT_IDS = ['call', 'bash', 'upgrade', 'defeat', 'boss', 'heroes'];
// 1234 → 1.2K, 3 400 000 → 3.4M (idle-style big numbers).
function formatNumber(value) {
  const n = Math.floor(value);
  if (Math.abs(n) < 10000) return String(n);
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let v = n; let i = -1;
  while (Math.abs(v) >= 1000 && i < units.length - 1) { v /= 1000; i += 1; }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)}${units[i]}`;
}

function markHint(id) {
  if (!state.hintsSeen.includes(id)) state.hintsSeen.push(id);
}

// ---------------------------------------------------------------------------
// Save / load and offline (AFK) income.
// Only progress is saved; a wave in progress is restored as its preparation.
// ---------------------------------------------------------------------------
const SAVE_KEY = 'afkRomeSave.v1';
// Bump when the economy or progression changes so old saves start fresh.
const SAVE_VERSION = 2;
// Offline income: half of what live play earns, capped by the village level
// (2 h at village 1–2, 4 h at 3–4, 8 h from 5). Both can be overridden in the debug panel.
const OFFLINE = { ...GAME_DATA.offline, capOverride: null }; // efficiency & cap can be overridden in the debug panel

function offlineCapHours() {
  if (OFFLINE.capOverride) return OFFLINE.capOverride;
  return OFFLINE.capHoursByVillage.find((rule) => state.townLevel <= rule.upTo).hours;
}
const SAVED_FIELDS = [
  'townLevel', 'wave', 'phase', 'food', 'coins', 'kills', 'patrolKills',
  'guardLevel', 'maxGuardHp', 'spikesLevel', 'farmLevel',
  'archerUnlocked', 'archerLevel', 'catapultUnlocked', 'catapultLevel', 'towerSlot',
  'wavesCleared', 'waveDifficulties', 'frontHero', 'supportHero', 'autoSpells', 'hintsSeen', 'trophies', 'eagles', 'systems', 'gear', 'gearDrops', 'eliteKills', 'temple'
];

function serializeSave(now = Date.now()) {
  const data = { version: SAVE_VERSION, savedAt: now };
  for (const key of SAVED_FIELDS) data[key] = state[key];
  data.heroes = Object.fromEntries(Object.entries(state.heroes).map(([id, hero]) => [id,
    { unlocked: hero.unlocked, fatigue: hero.fatigue, rested: hero.rested, level: hero.level || 1 }]));
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
  const capped = Math.max(0, Math.min(seconds, offlineCapHours() * 3600));
  if (capped < OFFLINE.minSeconds) return { seconds: capped, food: 0, gold: 0 };
  const k = OFFLINE.efficiency;
  return { seconds: capped, food: Math.floor(Math.floor(capped / 3) * farmLevel * k), gold: Math.floor(capped / OFFLINE.goldEvery * k) };
}

// Effective farm rate used for offline income (Ceres included).
function offlineFarmRate() {
  return state.farmLevel * (1 + godBonus('ceres'));
}

// ---------------------------------------------------------------------------
// Debug: AFK forecast — what an absence pays and what it buys right now.
// Runs the real purchase handlers on the live state, then restores it.
// ---------------------------------------------------------------------------
const FORECAST_FIELDS = ['food', 'coins', 'guardLevel', 'maxGuardHp', 'farmLevel', 'spikesLevel', 'archerLevel', 'catapultLevel', 'hintsSeen'];

function forecastAway(seconds) {
  const income = offlineIncome(seconds, offlineFarmRate());
  const backup = JSON.stringify(FORECAST_FIELDS.map((key) => state[key]));
  const before = { guard: state.guardLevel, farm: state.farmLevel, spikes: state.spikesLevel, tower: state.towerSlot ? state[`${state.towerSlot}Level`] : 0 };
  const phase = state.phase;
  if (phase === 'wave') state.phase = 'preparation';
  stats.muted = true;
  state.food += income.food;
  state.coins += income.gold;
  for (let round = 0; round < 500; round += 1) {
    const mark = state.food + state.coins;
    buy('frontline'); buy('farm'); buy('spikes');
    if (state.towerSlot) buy(state.towerSlot);
    if (state.food + state.coins === mark) break;
  }
  const after = { guard: state.guardLevel, farm: state.farmLevel, spikes: state.spikesLevel, tower: state.towerSlot ? state[`${state.towerSlot}Level`] : 0 };
  const left = { food: state.food, gold: state.coins };
  JSON.parse(backup).forEach((value, i) => { state[FORECAST_FIELDS[i]] = value; });
  state.phase = phase;
  stats.muted = false;
  const nextWave = state.phase === 'victory' ? state.wave + 1 : state.wave;
  const rec = recommendedLevel(nextWave);
  return { income, before, after, left, nextWave, rec, capped: after.guard >= upgradeLimit('guard') };
}

// ---------------------------------------------------------------------------
// Playtest statistics: a small local event log, exportable as JSON.
// ---------------------------------------------------------------------------
const STATS_KEY = 'afkRomeStats.v1';
const STATS_MAX_EVENTS = 3000;
const stats = { created: Date.now(), playSeconds: 0, events: [], muted: false, waveStartedAt: 0 };

function recordStat(type, data = {}) {
  if (stats.muted) return;
  stats.events.push({ type, at: Math.round(stats.playSeconds), wave: state.wave, town: state.townLevel, ...data });
  if (stats.events.length > STATS_MAX_EVENTS) stats.events.splice(0, stats.events.length - STATS_MAX_EVENTS);
}

function statsSummary() {
  const waves = stats.events.filter((e) => e.type === 'wave');
  const wins = waves.filter((e) => e.result !== 'defeat');
  const defeats = waves.filter((e) => e.result === 'defeat');
  const byWave = {};
  for (const e of defeats) byWave[e.wave] = (byWave[e.wave] || 0) + 1;
  const firstClear = {};
  for (const e of wins) if (!(e.wave in firstClear)) firstClear[e.wave] = e.at;
  const aways = stats.events.filter((e) => e.type === 'away');
  return {
    playMinutes: Math.round(stats.playSeconds / 6) / 10,
    wavesFought: waves.length, wins: wins.length, defeats: defeats.length, defeatsByWave: byWave,
    avgFightSeconds: waves.length ? Math.round(waves.reduce((sum, e) => sum + e.seconds, 0) / waves.length) : 0,
    bossClearMinutes: Object.fromEntries(Object.entries(firstClear).filter(([w]) => w % 5 === 0).map(([w, at]) => [w, Math.round(at / 6) / 10])),
    purchases: stats.events.filter((e) => e.type === 'buy').length,
    afkReturns: aways.length,
    afkHours: Math.round(aways.reduce((sum, e) => sum + e.seconds, 0) / 360) / 10,
    afkFood: aways.reduce((sum, e) => sum + e.food, 0),
    afkGold: aways.reduce((sum, e) => sum + e.gold, 0),
    errors: stats.events.filter((e) => e.type === 'error').length
  };
}

// ---------------------------------------------------------------------------
// Debug cheats: jump straight to any wave with the build the game expects there.
// ---------------------------------------------------------------------------
function jumpToWave(target) {
  const wave = Math.max(1, Math.min(FINAL_WAVE, Math.round(target)));
  stats.muted = true;
  resetGame();
  // Replay the first clears so rewards, trophies, eagles, gear and unlocks match a real run.
  for (let w = 1; w < wave; w += 1) {
    state.wave = w;
    state.wavesCleared = w - 1;
    state.phase = 'victory';
    finishWave();
    while (canUpgradeTown()) upgradeTown();
    for (const sys of SYSTEMS) unlockSystem(sys.id);
  }
  const t = expectedProgress(wave);
  Object.assign(state, {
    wave, phase: wave === 1 ? 'preparation' : 'victory', guardLevel: t.guardLevel, maxGuardHp: t.maxGuardHp,
    spikesLevel: Math.min(t.spikesLevel, upgradeLimit('spikes')),
    farmLevel: Math.min(upgradeLimit('farm'), 1 + Math.ceil(wave * 0.5)), food: 0, coins: 0, notice: null
  });
  if (state.phase === 'victory') state.wave = wave - 1; // the wave button then calls `wave`
  if (state.archerUnlocked) { state.archerLevel = Math.min(t.archerLevel, upgradeLimit('archer')); state.catapultLevel = Math.max(1, Math.min(t.catapultLevel, upgradeLimit('catapult'))); }
  if (systemUnlocked('barracks')) for (const id of Object.keys(state.heroes)) if (state.heroes[id].unlocked) state.heroes[id].level = t.heroLevel;
  autoLineup(); autoEquip();
  state.hintsSeen = [...HINT_IDS];
  state.guardHp = state.maxGuardHp;
  state.notice = null;
  stats.muted = false;
  recordStat('cheat', { action: 'jump', to: wave });
}

function cheat(action) {
  if (action === 'food') state.food += 1000;
  if (action === 'gold') state.coins += 1000;
  if (action === 'trophy') state.trophies += 1;
  if (action === 'eagle') state.eagles += 1;
  if (action === 'heal') state.guardHp = state.maxGuardHp;
  recordStat('cheat', { action });
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${Math.max(1, m)}m`;
}
