'use strict';
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

// The simulation emits 'sfx' events; audio is just a listener.
onSimEvent((type, payload) => { if (type === 'sfx') sfx(payload.name, payload.option); });
