#!/usr/bin/env node
'use strict';

// Golden scenarios: reproducible reference results of the JS simulation that the
// Unreal port must match (docs/UNREAL_PORT.md → "Parity tests").
//
// A scenario = a save (same format as the game's own save, version SAVE_VERSION)
//            + settings (auto spells) + commands + the expected outcome.
// Randomness is pinned to 0.5 and the simulation steps at a fixed 1/60 s.
//
//   node prototype/tools/export-golden.cjs          # rewrite prototype/golden/*.json
//   node prototype/tools/export-golden.cjs --check  # fail if the JS sim no longer matches (tests)

const fs = require('node:fs');
const path = require('node:path');
const { loadGame } = require('./load-game.cjs');

const DIR = path.join(__dirname, '..', 'golden');
const STEP = 1 / 60;
const MAX_TICKS = 60 * 600;
const round = (value) => Math.round(value * 1000) / 1000;

function fightScenario(wave, autoSpells) {
  const { run } = loadGame({ simOnly: true });
  run(`jumpToWave(${wave}); stats.muted = true;`);
  const save = JSON.parse(run('JSON.stringify(serializeSave(0))'));
  // Replay from the save exactly like the port would.
  run(`applySave(${JSON.stringify(save)}); state.autoSpells = ${autoSpells};`);
  run('callWave();');
  let ticks = 0;
  while (run("state.phase === 'wave'") && ticks < MAX_TICKS) { run(`update(${STEP}, WORLD.width)`); ticks += 1; }
  const expect = JSON.parse(run(`JSON.stringify({ phase: state.phase, wave: state.wave, guardHp: state.guardHp, maxGuardHp: state.maxGuardHp,
    kills: state.kills, defeated: state.defeated, coins: state.coins, food: state.food, wavesCleared: state.wavesCleared,
    trophies: state.trophies, eagles: state.eagles, gear: state.gear.length })`));
  expect.guardHp = round(expect.guardHp);
  expect.ticks = ticks;
  return {
    id: `fight-wave-${wave}${autoSpells ? '-auto' : ''}`,
    description: `Wave ${wave} with the expected build${autoSpells ? ', spells on AUTO' : ', no spells'}.`,
    save, settings: { autoSpells }, commands: [{ atTick: 0, command: 'callWave' }], runUntil: 'waveEnds', maxTicks: MAX_TICKS, expect
  };
}

function formulaCases() {
  const { run } = loadGame({ simOnly: true });
  const prices = {};
  for (const kind of ['guard', 'farm', 'spikes', 'archer', 'catapult']) {
    prices[kind] = Array.from({ length: 30 }, (_, i) => run(`priceAt(ECONOMY.${kind}Base, ECONOMY.${kind}Growth, ${i + 1})`));
  }
  const difficulty = Array.from({ length: 30 }, (_, i) => {
    const d = JSON.parse(run(`JSON.stringify(calculateWaveDifficulty(${i + 1}, expectedProgress(${i + 1})))`));
    return { wave: i + 1, hp: round(d.hp), damage: round(d.damage), recommended: run(`recommendedLevel(${i + 1})`) };
  });
  const offline = [];
  for (const village of [1, 3, 5]) {
    run(`state.townLevel = ${village}`);
    for (const seconds of [30, 600, 3600, 7200, 28800, 86400]) {
      for (const farm of [1, 5]) offline.push({ village, seconds, farmLevel: farm, ...JSON.parse(run(`JSON.stringify(offlineIncome(${seconds}, ${farm}))`)) });
    }
  }
  const damage = [];
  for (const [type, raw, kind] of [['orcShield', 4, 'pierce'], ['orcShield', 4, 'melee'], ['boar', 4, 'melee'], ['boar', 4, 'area'], ['troll', 1, 'melee'], ['troll', 10, 'pierce']]) {
    run(`state.mobs = []; spawnMob('${type}');`);
    damage.push({ type, raw, kind, result: round(run(`effectiveDamage(state.mobs[0], ${raw}, '${kind}')`)) });
  }
  return { prices, difficulty, offline, effectiveDamage: damage };
}

function build() {
  const scenarios = [];
  for (const wave of [1, 2, 3, 5, 7, 10, 15, 20, 25, 30]) {
    scenarios.push(fightScenario(wave, true));
    if (wave <= 5) scenarios.push(fightScenario(wave, false));
  }
  const header = { generatedBy: 'prototype/tools/export-golden.cjs', randomConstant: 0.5, fixedStep: STEP, world: { width: 1170, height: 540 } };
  return {
    'scenarios.json': JSON.stringify({ ...header, scenarios }, null, 2) + '\n',
    'formulas.json': JSON.stringify({ ...header, ...formulaCases() }, null, 2) + '\n'
  };
}

const files = build();
if (process.argv.includes('--check')) {
  for (const [name, text] of Object.entries(files)) {
    const current = fs.existsSync(path.join(DIR, name)) ? fs.readFileSync(path.join(DIR, name), 'utf8') : '';
    if (current !== text) { console.error(`golden/${name} no longer matches the simulation — if the change is intended, run: node prototype/tools/export-golden.cjs`); process.exit(1); }
  }
  console.log('Golden scenarios match the simulation.');
} else {
  fs.mkdirSync(DIR, { recursive: true });
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(DIR, name), text);
  console.log(`Wrote golden/${Object.keys(files).join(', golden/')}`);
}
