#!/usr/bin/env node
'use strict';

// Headless playthrough that uses the real combat and shop handlers from app.js.
// The bot invests in the farm and waits for food to upgrade before each wave.
// With spells on it plays like an attentive player («Авто» cast policy) and
// rotates heroes before every wave (freshest hero per slot).
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

// The balanced player buys up to the build the game expects at this wave
// (EXPECTED_PROGRESS in app.js) and invests everything else in the farm.
function shop(wave) {
  const target = run(`JSON.stringify(expectedProgress(${wave}))`);
  const t = JSON.parse(target);
  for (let round = 0; round < 100; round += 1) {
    const before = run('JSON.stringify([state.food,state.coins,state.guardLevel,state.spikesLevel,state.farmLevel,state.archerLevel,state.catapultLevel])');
    if (run('state.townLevel') >= 2) {
      // Only the defender standing in the tower slot is levelled.
      if (run(`state[state.towerSlot + 'Level'] < ${t.archerLevel}`)) run("ui[state.towerSlot + '-upgrade'].onclick()");
    }
    if (run(`state.spikesLevel < ${t.spikesLevel}`)) run("ui['spikes-upgrade'].onclick()");
    // After the Barracks: train every hero on the field up to the expected level.
    run(`for (const id of activeHeroes()) if (!heroDefs[id].machine && heroLevel(id) < ${t.heroLevel}) trainHero(id)`);
    if (run(`state.guardLevel < ${t.guardLevel}`)) run("ui['guard-upgrade'].onclick()");
    if (!run('meetsExpected(' + wave + ')')) run("ui['farm-upgrade'].onclick()");
    const after = run('JSON.stringify([state.food,state.coins,state.guardLevel,state.spikesLevel,state.farmLevel,state.archerLevel,state.catapultLevel])');
    if (before === after) break;
  }
}

function play({ waves = 5, spells = true, rotate = true, maxPrepHours = 12 } = {}) {
  run('resetGame()');
  run(`state.autoSpells = ${spells}`);
  const report = [];
  for (let wave = 1; wave <= waves; wave += 1) {
    run("ui['town-upgrade'].onclick(); for (const sys of SYSTEMS) unlockSystem(sys.id);");
    if (rotate) run("autoLineup()");
    let preparationTicks = 0;
    shop(wave);
    // Waiting is fast-forwarded with the same rates as offline income (farm food,
    // patrol gold), 30 s at a time, so hours of AFK do not need a frame-by-frame sim.
    while (!run(`meetsExpected(${wave})`) && preparationTicks < 60 * 3600 * maxPrepHours) {
      run('state.food += 10 * state.farmLevel; state.coins += 3;');
      preparationTicks += 60 * 30;
      shop(wave);
    }
    if (preparationTicks >= 60 * 3600 * maxPrepHours) throw new Error(`Preparation for wave ${wave} exceeded ${maxPrepHours} h`);
    run('autoEquip()');
    run("ui['wave-button'].onclick()");
    if (Number.isFinite(hpTrials[wave - 1])) run(`state.waveDifficulties[state.wave].hp *= ${hpTrials[wave - 1]}`);
    if (Number.isFinite(attackTrials[wave - 1])) run(`state.waveDifficulties[state.wave].damage *= ${attackTrials[wave - 1]}`);
    const start = JSON.parse(run('JSON.stringify({hp:state.guardHp,maxHp:state.maxGuardHp,guard:state.guardLevel,spikes:state.spikesLevel,farm:state.farmLevel,archer:state.archerLevel,catapult:state.catapultLevel,lineup:activeHeroes(),power:activeHeroes().map(heroPowerMult),difficulty:state.waveDifficulties[state.wave]})'));
    let ticks = 0;
    let peakEnemies = 0;
    let bossSharedField = false;
    while (run('state.phase') === 'wave' && ticks++ < 36000) {
      run('update(1/60, 1170)');
      const active = run('state.mobs.filter(mob => !mob.dead).length');
      peakEnemies = Math.max(peakEnemies, active);
      if (active > 1 && run('state.mobs.some(mob => !mob.dead && enemyTypes[mob.type].isBoss)')) bossSharedField = true;
    }
    if (ticks >= 36000) throw new Error(`Wave ${wave} did not terminate`);
    const end = JSON.parse(run('JSON.stringify({phase:state.phase,hp:state.guardHp,maxHp:state.maxGuardHp,food:state.food,coins:state.coins})'));
    report.push({ wave, ...start, ...end, hpRatio: end.hp / end.maxHp,
      enemies: run('state.waveTotal'), peakEnemies, bossSharedField, preparationSeconds: preparationTicks / 60, seconds: ticks / 60 });
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
  console.log('wave | prep seconds | enemies / peak | guard/spikes/farm/archer/catapult | enemy HP/ATK | result | guard HP | fight s | lineup');
  for (const row of report) {
    console.log([
      String(row.wave).padStart(4),
      row.preparationSeconds.toFixed(1).padStart(12),
      `${row.enemies} / ${row.peakEnemies}`.padStart(14),
      `${row.guard}/${row.spikes}/${row.farm}/${row.archer}/${row.catapult}`.padStart(31),
      `${row.difficulty.hp.toFixed(2)}/${row.difficulty.damage.toFixed(2)}`.padStart(12),
      row.phase.padStart(8),
      `${row.hp}/${row.maxHp} (${Math.round(row.hpRatio * 100)}%)`.padStart(18),
      row.seconds.toFixed(0).padStart(7),
      row.lineup.map((id, i) => `${id}×${row.power[i].toFixed(2)}`).join(' ')
    ].join(' | '));
  }
  console.log('No spells:', JSON.stringify(play({ waves: 10, spells: false }).map(r => ({ wave: r.wave, phase: r.phase, hp: Math.round(r.hpRatio * 100) }))));
  console.log('No rotation:', JSON.stringify(play({ waves: 10, rotate: false }).map(r => ({ wave: r.wave, phase: r.phase, hp: Math.round(r.hpRatio * 100) }))));
  for (const seconds of [120, 600]) console.log(`AFK ${seconds}s: ${JSON.stringify(idle(seconds))}`);
  const human = session();
  console.log('\nHuman-like first session (buys what it can, waits ≤30 s, ≤60 s before bosses, up to 90 s for the recommended level, upgrades once after a defeat):');
  console.log('wave | result  | prep s | fight s | HP left | frontline | total min');
  for (const r of human) console.log(`${String(r.wave).padStart(4)} | ${r.phase.padEnd(7)} | ${String(r.prep).padStart(6)} | ${r.fight.toFixed(0).padStart(7)} | ${String(r.hp).padStart(6)}% | ${String(r.guard).padStart(9)} | ${r.clock.toFixed(1).padStart(9)}`);
}

// Human-like session: buys whatever it can, then calls the wave once waiting for the next
// frontline upgrade would take longer than its patience. More patient before bosses and
// after a defeat. Measures how long the first session really takes.
function session({ waves = 10, patience = 30, bossPatience = 60, recommendWait = 90, maxMinutes = 120 } = {}) {
  run('resetGame(); state.autoSpells = true');
  const report = [];
  let clock = 0;
  const tick = (n) => { run(`for (let i = 0; i < ${n}; i++) update(1/60, 1170)`); clock += n / 60; };
  const buyAll = () => {
    for (let round = 0; round < 50; round++) {
      const before = run('state.food + state.coins * 1000 + state.townLevel');
      run("ui['town-upgrade'].onclick(); for (const sys of SYSTEMS) unlockSystem(sys.id); ui['guard-upgrade'].onclick(); ui['farm-upgrade'].onclick(); ui['spikes-upgrade'].onclick(); if (state.townLevel >= 2) { ui['archer-upgrade'].onclick(); ui['catapult-upgrade'].onclick(); } ui['auto-lineup'].onclick();");
      if (run('state.food + state.coins * 1000 + state.townLevel') === before) break;
    }
  };
  // Seconds until the next frontline upgrade is affordable (Infinity if capped).
  const waitForGuard = () => run(`(() => { if (!canUpgrade('guard')) return Infinity; const need = guardUpgradePrice() - state.food; return need <= 0 ? 0 : need / (state.farmLevel / 3); })()`);
  for (let wave = 1; wave <= waves && clock < maxMinutes * 60; ) {
    const isBoss = run(`buildWavePlan(${wave}).some(t => enemyTypes[t].isBoss)`);
    let prep = 0;
    const lastFailed = report.length && report.at(-1).wave === wave;
    const limit = isBoss ? bossPatience : patience;
    buyAll();
    // After a defeat a real player upgrades at least once before retrying (up to 3 min).
    const levelAtDefeat = run('state.guardLevel');
    while (lastFailed && run('state.guardLevel') === levelAtDefeat && run("canUpgrade('guard')") && prep < 180) { tick(60); prep += 1; buyAll(); }
    while (waitForGuard() > 0 && waitForGuard() <= limit && prep < 600) { tick(60); prep += 1; buyAll(); }
    // The HUD shows a recommended frontline level: wait for it if it is reachable soon.
    const recommended = run(`recommendedLevel(${wave})`);
    while (run('state.guardLevel') < recommended && waitForGuard() <= recommendWait && prep < 600) { tick(60); prep += 1; buyAll(); }
    run("ui['wave-button'].onclick()");
    let fight = 0;
    while (run('state.phase') === 'wave' && fight < 600 * 60) { tick(1); fight += 1; }
    const phase = run('state.phase');
    report.push({ wave, phase, prep, fight: fight / 60, hp: Math.round(run('state.guardHp / state.maxGuardHp') * 100), guard: run('state.guardLevel'), clock: clock / 60 });
    if (phase !== 'defeat') wave += 1;
  }
  return report;
}

module.exports = { play, idle, run, session, shop };
