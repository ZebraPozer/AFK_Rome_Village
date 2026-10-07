'use strict';
function syncUi() {
  ui.pause.textContent = state.running ? 'Ⅱ Pause' : '▶ Resume';
  ui.speed.textContent = `⏩ ${state.speed}×`;
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
  syncDevTools();
}

// Debug: pretend the player was away — goes through the real Welcome back flow.
function simulateAway(seconds) {
  writeSave();
  const income = offlineIncome(seconds, offlineFarmRate());
  if (!income.food && !income.gold) return null;
  showAway({ ...income, simulated: true });
  return income;
}

const DEBUG_KEY = 'afkRomeDebug.v2';
function loadDebugSettings() {
  try {
    const data = JSON.parse(localStorage.getItem(DEBUG_KEY) || 'null');
    if (data) Object.assign(OFFLINE, { capOverride: Number(data.capOverride) || null, efficiency: Number.isFinite(data.efficiency) ? data.efficiency : 0.5 });
  } catch (error) { /* optional */ }
  ui['afk-efficiency'].value = Math.round(OFFLINE.efficiency * 100);
  ui['afk-cap'].value = OFFLINE.capOverride || '';
}

function saveDebugSettings() {
  try { localStorage.setItem(DEBUG_KEY, JSON.stringify({ capOverride: OFFLINE.capOverride, efficiency: OFFLINE.efficiency })); } catch (error) { /* optional */ }
}

const forecastRows = [['10 min', 600], ['1 h', 3600], ['5 h', 18000], ['8 h', 28800], ['24 h', 86400]];
let devKey = '';
// Refreshed from syncUi (cheap: only rebuilds when something relevant changed).
let devNextAt = 0;
function syncDevTools() {
  // At most once per second of real time, and the forecast pauses during fights.
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  if (now && now < devNextAt) return;
  devNextAt = now + 1000;
  if (state.phase === 'wave' && devKey) return;
  const key = JSON.stringify([state.food, state.coins, state.guardLevel, state.farmLevel, state.spikesLevel, state.townLevel, state.wave, state.phase,
    state.archerLevel, state.catapultLevel, state.towerSlot, OFFLINE, offlineCapHours(), stats.events.length, Math.floor(stats.playSeconds / 10)]);
  if (key === devKey) return;
  devKey = key;
  ui['afk-forecast'].innerHTML = forecastRows.map(([label, seconds]) => {
    const f = forecastAway(seconds);
    const parts = [];
    if (f.after.guard > f.before.guard) parts.push(`frontline ${f.before.guard}→${f.after.guard}`);
    if (f.after.farm > f.before.farm) parts.push(`farm ${f.before.farm}→${f.after.farm}`);
    if (f.after.spikes > f.before.spikes) parts.push(`spikes ${f.before.spikes}→${f.after.spikes}`);
    if (f.after.tower > f.before.tower) parts.push(`${state.towerSlot} ${f.before.tower}→${f.after.tower}`);
    const buys = parts.length ? parts.join(', ') : 'nothing';
    const capNote = f.capped ? ' <span class="low">(frontline capped — beat the boss)</span>' : '';
    const ok = f.after.guard >= f.rec;
    return `<tr><td>${label}${seconds > offlineCapHours() * 3600 ? ` (cap ${offlineCapHours()} h)` : ''}</td><td>+${formatNumber(f.income.food)}</td><td>+${formatNumber(f.income.gold)}</td><td>${buys}${capNote}</td><td class="${ok ? 'ok' : 'low'}">wave ${f.nextWave}: lv ${f.after.guard}/${f.rec}</td></tr>`;
  }).join('');
  const sum = statsSummary();
  const defeatsByWave = Object.entries(sum.defeatsByWave).map(([w, n]) => `${w}×${n}`).join(', ') || '—';
  const bosses = Object.entries(sum.bossClearMinutes).map(([w, m]) => `w${w} at ${m} min`).join(', ') || '—';
  ui['stats-summary'].innerHTML = [
    ['Play time', `${sum.playMinutes} min`], ['Waves fought', `${sum.wavesFought} (${sum.wins} won)`],
    ['Defeats', `${sum.defeats} · ${defeatsByWave}`], ['Avg fight', `${sum.avgFightSeconds} s`],
    ['Bosses cleared', bosses], ['Purchases', sum.purchases],
    ['AFK returns', `${sum.afkReturns} · ${sum.afkHours} h`], ['AFK income', `${formatNumber(sum.afkFood)} food · ${formatNumber(sum.afkGold)} gold`],
    ['Errors', sum.errors ? `<span class="low">${sum.errors}</span>` : '0']
  ].map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('');
}

function exportStats() {
  const payload = { exportedAt: new Date().toISOString(), summary: statsSummary(), offline: { ...OFFLINE },
    progress: serializeSave(), events: stats.events };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  link.href = URL.createObjectURL(blob);
  link.download = `afk-rome-stats-${stamp}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

const away = { pending: null };
function showAway(income) {
  away.pending = income;
  ui['away-time'].textContent = formatDuration(income.seconds);
  ui['away-food'].textContent = `+${income.food}`;
  ui['away-gold'].textContent = `+${income.gold}`;
  ui['away-cap'].hidden = income.seconds < offlineCapHours() * 3600;
  ui['away-cap'].textContent = `Storage is full after ${offlineCapHours()} h — it grows with your village.`;
  ui.away.hidden = false;
  state.running = false;
}

function collectAway() {
  if (!away.pending) return;
  state.food += away.pending.food;
  state.coins += away.pending.gold;
  recordStat('away', { seconds: Math.round(away.pending.seconds), food: away.pending.food, gold: away.pending.gold, simulated: Boolean(away.pending.simulated) });
  away.pending = null;
  ui.away.hidden = true;
  state.running = true;
  sfx('coin');
  writeSave();
}

// Sound controls, button clicks and the audio unlock gesture.
function syncSoundUi() {
  ui['sound-toggle'].textContent = sound.enabled ? '🔊 Sound: on' : '🔈 Sound: off';
  ui['sound-volume'].value = Math.round(sound.volume * 100);
}
