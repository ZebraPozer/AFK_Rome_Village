'use strict';
// Buttons only call simulation commands (sim/actions.js); no rules live here.
ui.pause.onclick = () => togglePause();
ui.speed.onclick = () => cycleSpeed();
ui['town-upgrade'].onclick = () => upgradeTown();
ui['wave-button'].onclick = () => callWave();
ui['guard-upgrade'].onclick = () => buy('frontline');
ui['spikes-upgrade'].onclick = () => buy('spikes');
ui['farm-upgrade'].onclick = () => buy('farm');
ui.reset.onclick = () => { resetGame(); clearSave(); recordStat('reset'); };
ui['archer-upgrade'].onclick = () => buy('archer');
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
ui['catapult-upgrade'].onclick = () => buy('catapult');

// Debug: cycle village stages 1 → 2 → 3 → 1 without playing the waves.
ui['village-stage'].onclick = () => {
  state.stageOverride = state.villageStage % 3 + 1;
};
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
ui['hud-upgrade'].onclick = () => {
  if (!hud.open) {
    if (hud.tab === 'upgrades' && !hud.villageAffordable && hud.heroAffordable) hud.tab = 'heroes';
    if (hud.tab === 'heroes' && !hud.heroAffordable && hud.villageAffordable) hud.tab = 'upgrades';
  }
  setHudOpen(!hud.open);
};
ui['hud-close'].onclick = () => setHudOpen(false);
ui['hud-tab-upgrades'].onclick = () => { hud.tab = 'upgrades'; };
ui['hud-tab-heroes'].onclick = () => { hud.tab = 'heroes'; markHint('heroes'); };
ui['hud-upgrades'].onclick = (event) => {
  const row = event.target.closest && event.target.closest('[data-upgrade], [data-system], [data-train], [data-offer]');
  if (row && row.dataset.system) unlockSystem(row.dataset.system);
  else if (row && row.dataset.train) trainHero(row.dataset.train);
  else if (row && row.dataset.offer) makeOffering(row.dataset.offer);
  else if (row) ui[row.dataset.upgrade].onclick();
};
ui['hud-lineup'].onclick = (event) => ui.lineup.onclick(event);
ui['hud-auto-lineup'].onclick = () => { autoLineup(); autoEquip(); };
ui['hud-training'].onclick = (event) => {
  const row = event.target.closest && event.target.closest('[data-train]');
  if (row) trainHero(row.dataset.train);
};
ui['hud-gear'].onclick = (event) => {
  const row = event.target.closest && event.target.closest('[data-gear]');
  if (row) cycleGearOwner(Number(row.dataset.gear));
};

// Tap a hero to cast their spell; keys 1/2/3 cast the slot spells.
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width * 1170;
  const y = (event.clientY - rect.top) / rect.height * 540;
  const ground = 540 * GROUND_RATIO;
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
