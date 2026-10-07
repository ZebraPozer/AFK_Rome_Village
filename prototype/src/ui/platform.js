'use strict';
function deviceInfo() {
  if (typeof navigator === 'undefined') return {};
  return { ua: navigator.userAgent, screen: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}@${devicePixelRatio || 1}` : '',
    touch: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches };
}

function saveStats() {
  try { localStorage.setItem(STATS_KEY, JSON.stringify({ created: stats.created, playSeconds: stats.playSeconds, events: stats.events })); } catch (error) { /* optional */ }
}

function loadStats() {
  try {
    const data = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
    if (data) Object.assign(stats, { created: data.created || Date.now(), playSeconds: data.playSeconds || 0, events: data.events || [] });
  } catch (error) { /* optional */ }
}

function clearStats() {
  Object.assign(stats, { created: Date.now(), playSeconds: 0, events: [] });
  saveStats();
}

function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeSave())); } catch (error) { /* storage is optional */ }
  saveStats();
}

function readSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (error) { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (error) { /* optional */ }
}
