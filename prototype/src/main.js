'use strict';
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

// Boot: restore progress, pay offline income, then autosave regularly and on exit.
{
  loadStats();
  loadDebugSettings();
  recordStat('session', { device: deviceInfo() });
  // Any crash on a tester's device lands in the stats file (Export JSON).
  let errorCount = 0;
  const logError = (message, source) => {
    if (errorCount++ > 50) return;
    recordStat('error', { message: String(message).slice(0, 300), source: String(source || '').slice(0, 300) });
    saveStats();
  };
  window.addEventListener('error', (event) => logError(event.message, `${event.filename}:${event.lineno}:${event.colno} ${event.error && event.error.stack ? event.error.stack.split('\n').slice(0, 3).join(' | ') : ''}`));
  window.addEventListener('unhandledrejection', (event) => logError(event.reason && event.reason.message ? event.reason.message : event.reason, 'promise'));
  const saved = readSave();
  if (saved && saved.version !== SAVE_VERSION) {
    clearSave();
    recordStat('fresh-start', { oldVersion: saved.version });
    showNotice('NEW VERSION', 'FRESH START', 'The game changed a lot — your old save was reset');
  }
  if (saved && applySave(saved)) {
    const income = offlineIncome((Date.now() - (saved.savedAt || Date.now())) / 1000, offlineFarmRate());
    if (income.food || income.gold) showAway(income);
  }
  ui['away-collect'].onclick = collectAway;
  document.querySelectorAll('[data-away]').forEach((button) => { button.onclick = () => simulateAway(Number(button.dataset.away)); });
  ui['afk-custom-go'].onclick = () => simulateAway(Number(ui['afk-custom'].value) * 3600);
  ui['afk-efficiency'].onchange = () => { OFFLINE.efficiency = Math.max(0, Number(ui['afk-efficiency'].value) / 100); saveDebugSettings(); };
  ui['afk-cap'].onchange = () => { OFFLINE.capOverride = Number(ui['afk-cap'].value) > 0 ? Number(ui['afk-cap'].value) : null; saveDebugSettings(); };
  ui['stats-export'].onclick = exportStats;
  ui['cheat-jump'].onclick = () => jumpToWave(Number(ui['cheat-wave'].value));
  document.querySelectorAll('[data-cheat]').forEach((button) => { button.onclick = () => cheat(button.dataset.cheat); });
  ui['stats-clear'].onclick = clearStats;
  setInterval(writeSave, 5000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') writeSave(); });
  window.addEventListener('pagehide', writeSave);
}

requestAnimationFrame(frame);
