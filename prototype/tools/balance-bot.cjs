#!/usr/bin/env node
'use strict';

// Headless playthrough that uses the real combat and shop handlers from app.js.
// The bot invests in the farm and waits for food to upgrade before each wave.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const elements = new Map();
const document = {
  querySelector: () => ({ getContext: () => ({}) }),
  getElementById: (id) => {
    if (!elements.has(id)) elements.set(id, { style: {}, classList: { toggle() {} } });
    return elements.get(id);
  }
};
const sandbox = vm.createContext({
  document,
  Math: Object.assign(Object.create(Math), { random: () => 0.5 })
});
vm.runInContext(source.slice(0, source.lastIndexOf('\nPromise.all([')), sandbox);
const run = (code) => vm.runInContext(code, sandbox);
const parseTrials = (value) => value ? value.split(',').map(Number) : [];
const hpTrials = parseTrials(process.env.BALANCE_HP);
const attackTrials = parseTrials(process.env.BALANCE_ATK);

function shop(targetLevel = Infinity) {
  // Prioritize production, then buy defenses and the target guard level.
  for (let round = 0; round < 100; round += 1) {
    if (run('state.townLevel') >= 2) run("ui['archer-upgrade'].onclick(); ui['catapult-upgrade'].onclick()");
    const before = run('JSON.stringify([state.food,state.coins,state.guardLevel,state.spikesLevel,state.farmLevel,state.guardHp])');
    run("ui['farm-upgrade'].onclick(); ui['spikes-upgrade'].onclick();");
    if (run('state.guardLevel') < targetLevel) run("ui['guard-upgrade'].onclick()");
    const after = run('JSON.stringify([state.food,state.coins,state.guardLevel,state.spikesLevel,state.farmLevel,state.guardHp])');
    if (before === after) break;
  }
}

function play({ waves = 5, buyVolley = false } = {}) {
  run('resetGame()');
  const report = [];
  for (let wave = 1; wave <= waves; wave += 1) {
    if (wave === 6) run("ui['town-upgrade'].onclick()");
    if (buyVolley && wave === 4) {
      run("for (let i = 0; i < 36000 && state.coins < VOLLEY_PRICE; i++) update(1/60, 1170)");
      run("ui['volley-buy'].onclick()");
    }
    let preparationTicks = 0;
    shop(wave);
    while (run(`state.guardLevel < ${wave}`) && preparationTicks++ < 18000) {
      run('if (state.heroUnlocked && aliveMobs().some(m => m.x > 1170 * .52 - 400 && m.x < 1170 * .52 - 20)) castVolley(); update(1/60, 1170)');
      shop(wave);
    }
    if (preparationTicks >= 18000) throw new Error(`Preparation for wave ${wave} exceeded five minutes`);
    run("ui['wave-button'].onclick()");
    if (Number.isFinite(hpTrials[wave - 1])) run(`state.waveDifficulties[state.wave].hp *= ${hpTrials[wave - 1]}`);
    if (Number.isFinite(attackTrials[wave - 1])) run(`state.waveDifficulties[state.wave].damage *= ${attackTrials[wave - 1]}`);
    const start = JSON.parse(run('JSON.stringify({hp:state.guardHp,maxHp:state.maxGuardHp,guard:state.guardLevel,spikes:state.spikesLevel,farm:state.farmLevel,archer:state.archerLevel,catapult:state.catapultLevel,hasVolley:state.heroUnlocked,difficulty:state.waveDifficulties[state.wave]})'));
    let ticks = 0;
    let peakEnemies = 0;
    let bossSharedField = false;
    while (run('state.phase') === 'wave' && ticks++ < 36000) {
      run('if (state.heroUnlocked && aliveMobs().some(m => m.x > 1170 * .52 - 400 && m.x < 1170 * .52 - 20)) castVolley(); update(1/60, 1170)');
      const active = run('state.mobs.filter(mob => !mob.dead).length');
      peakEnemies = Math.max(peakEnemies, active);
      if (active > 1 && run('state.mobs.some(mob => !mob.dead && enemyTypes[mob.type].isBoss)')) bossSharedField = true;
    }
    if (ticks >= 36000) throw new Error(`Wave ${wave} did not terminate`);
    const end = JSON.parse(run('JSON.stringify({phase:state.phase,hp:state.guardHp,maxHp:state.maxGuardHp,food:state.food,coins:state.coins})'));
    report.push({ wave, ...start, ...end, hpRatio: end.hp / end.maxHp,
      enemies: run('state.waveTotal'), peakEnemies, bossSharedField, preparationSeconds: preparationTicks / 60 });
    if (end.phase === 'defeat') break;
  }
  return report;
}

function idle(seconds) {
  run('resetGame()');
  run(`for (let tick = 0; tick < ${Math.round(seconds * 60)}; tick++) {
    update(1/60, 1170);
    if (tick % 60 === 0) {
      ui['farm-upgrade'].onclick();
      ui['guard-upgrade'].onclick(); ui['spikes-upgrade'].onclick();
    }
  }`);
  return JSON.parse(run('JSON.stringify({clearedWave:state.wavesCleared,guard:state.guardLevel,spikes:state.spikesLevel,farm:state.farmLevel,patrolKills:state.patrolKills,coins:state.coins,food:state.food})'));
}

if (require.main === module) {
  const report = play({ waves: 10 });
  console.log('wave | prep seconds | enemies / peak | guard/spikes/farm/archer/catapult | enemy HP/ATK | result | guard HP');
  for (const row of report) {
    console.log([
      String(row.wave).padStart(4),
      row.preparationSeconds.toFixed(1).padStart(12),
      `${row.enemies} / ${row.peakEnemies}`.padStart(14),
      `${row.guard}/${row.spikes}/${row.farm}/${row.archer}/${row.catapult}`.padStart(31),
      `${row.difficulty.hp.toFixed(2)}/${row.difficulty.damage.toFixed(2)}`.padStart(12),
      row.phase.padStart(8),
      `${row.hp}/${row.maxHp} (${Math.round(row.hpRatio * 100)}%)`.padStart(18)
    ].join(' | '));
  }
  console.log('Optional volley:', JSON.stringify(play({ waves: 10, buyVolley: true }).map(r => ({ wave: r.wave, phase: r.phase, hpRatio: r.hpRatio }))));
  for (const seconds of [120, 600]) console.log(`AFK ${seconds}s: ${JSON.stringify(idle(seconds))}`);
}

module.exports = { play, idle };
