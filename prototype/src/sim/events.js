'use strict';
// ---------------------------------------------------------------------------
// Simulation events and randomness. The simulation never talks to the screen,
// audio or browser: it emits events, and presentation layers subscribe.
// Unreal: a multicast delegate on the game subsystem.
// ---------------------------------------------------------------------------
const simListeners = [];

function onSimEvent(listener) {
  simListeners.push(listener);
}

// emit('sfx', { name, option }) — the only event type so far.
function emit(type, payload = {}) {
  for (const listener of simListeners) listener(type, payload);
}

// All gameplay randomness goes through simRandom(). Tests, bots and golden scenarios
// pin it to a constant (0.5) so a run is fully reproducible — also in the Unreal port.
let simRandom = () => Math.random();
function setSimRandom(fn) {
  simRandom = fn;
}
