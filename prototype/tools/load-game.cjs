'use strict';

// Loads the game into a Node `vm` sandbox for tests, bots and golden scenarios.
//
//   const { run } = loadGame();             // simulation + presentation with a stub DOM
//   const { run } = loadGame({ simOnly: true }); // ONLY data + src/sim — no DOM at all
//
// `simOnly` proves the rules never touch the browser: that is the part the Unreal
// port re-implements (see docs/UNREAL_PORT.md). Randomness is pinned to 0.5.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
// Same order as the <script> tags in prototype/index.html.
const DATA = ['data/game-data.js'];
const SIM = ['events', 'constants', 'waves', 'world', 'heroes', 'combat', 'progression', 'actions', 'save']
  .map((name) => `src/sim/${name}.js`);
const PRESENTATION = [
  'src/audio/sound.js',
  'src/render/assets.js', 'src/render/background.js', 'src/render/village.js',
  'src/render/actors.js', 'src/render/overlay.js', 'src/render/scene.js',
  'src/ui/hud.js', 'src/ui/panel.js', 'src/ui/platform.js', 'src/ui/input.js'
];
// src/main.js (asset loading, frame loop, autosave) only runs in a real browser.

function stubDom() {
  const elements = new Map();
  const element = () => ({ style: {}, classList: { toggle() {}, add() {}, contains() { return false; } }, dataset: {}, addEventListener() {} });
  const canvas = { ...element(), getContext: () => ({}), getBoundingClientRect: () => ({ left: 0, top: 0, width: 1170, height: 540 }) };
  const document = {
    querySelector: () => canvas,
    querySelectorAll: () => [],
    getElementById: (id) => {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    addEventListener() {},
    createElement: () => canvas,
    documentElement: { classList: { contains: () => false } }
  };
  return { document, elements };
}

function loadGame({ simOnly = false } = {}) {
  const files = simOnly ? [...DATA, ...SIM] : [...DATA, ...SIM, ...PRESENTATION];
  const base = { Math: Object.assign(Object.create(Math), { random: () => 0.5 }), console };
  let elements = new Map();
  if (!simOnly) {
    const dom = stubDom();
    elements = dom.elements;
    Object.assign(base, { document: dom.document });
  }
  const sandbox = vm.createContext(base);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  }
  const run = (code) => vm.runInContext(code, sandbox);
  return { run, elements, files };
}

module.exports = { loadGame, SIM, PRESENTATION, DATA };
