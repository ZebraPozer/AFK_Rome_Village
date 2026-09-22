const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const elements = new Map();
const document = {
  querySelector: () => ({ getContext: () => ({}) }),
  getElementById: (id) => {
    if (!elements.has(id)) elements.set(id, { style: {}, classList: { toggle() {} } });
    return elements.get(id);
  }
};
const sandbox = vm.createContext({ document, Math: Object.assign(Object.create(Math), { random: () => 0.5 }) });
vm.runInContext(source.slice(0, source.lastIndexOf('\nPromise.all([')), sandbox);
const run = (code) => vm.runInContext(code, sandbox);
assert.equal(run('calculateWaveDifficulty(1, {guardLevel: 20, spikesLevel: 10, maxGuardHp: 480}).hp'), run('calculateWaveDifficulty(1, state).hp'));
for (let wave = 1; wave <= 10; wave += 1) {
  assert.ok(run(`buildWavePlan(${wave}).length`) <= (wave <= 4 ? 3 : 5), 'Early waves must remain small');
}
assert.equal(run('buildWavePlan(5).length'), 4);
assert.equal(run('buildWavePlan(5).at(-1)'), 'boss');
const base = run('calculateWaveDifficulty(2, state).hp');
assert.ok(run('calculateWaveDifficulty(3, state).hp') > base);
assert.ok(run('calculateWaveDifficulty(2, {...state, guardLevel: 3, spikesLevel: 1}).hp') > base);
assert.equal(run('calculateWaveDifficulty(2, {...state, farmLevel: 100, gateLevel: 100, food: 10000, guardHp: 1}).hp'), base);
run('state.wave = 2; startWave(); spawnMob();');
const lockedHp = run('state.mobs[0].maxHp');
run('failWave(); state.guardLevel = 10; state.maxGuardHp = 280; state.spikesLevel = 4; startWave(); spawnMob();');
assert.equal(run('state.mobs[0].maxHp'), lockedHp);
run('startWave()');
let retryTicks = 0;
while (run('state.phase') === 'wave' && retryTicks++ < 36000) run('update(1/60, 1170)');
assert.equal(run('state.phase'), 'victory', 'Upgrades must help overcome a locked retry');
run('spawnMob("orc", false)');
assert.equal(run('state.mobs.at(-1).maxHp'), 4);
run('startWave(); syncUi()');
assert.match(elements.get('wave-difficulty').textContent, /закреплена/);
run('resetGame()');
assert.equal(run('Object.keys(state.waveDifficulties).length'), 0);
run('state.phase = "victory"; syncUi()');
assert.match(elements.get('wave-difficulty').textContent, /Волна 2/);
run('resetGame(); state.speed = 100; startWave(); for (let i = 0; i < 3000 && state.phase === "wave"; i++) update(1/6000, 1170)');
assert.notEqual(run('state.phase'), 'wave', '100x speed should resolve the wave without bypassing combat');
assert.ok(run('state.guardHp') < run('state.maxGuardHp'), '100x speed must still simulate incoming damage');
// Run the actual combat loop at a fixed timestep: no renderer or asset loading.
for (const [wave, level, spikes] of [[1,1,0],[2,2,0],[3,3,1],[4,4,1],[5,5,2],[5,1,0]]) {
  run(`resetGame(); Object.assign(state, {wave:${wave}, guardLevel:${level}, spikesLevel:${spikes}, maxGuardHp:${80+20*level}, guardHp:${80+20*level}}); startWave();`);
  let ticks = 0;
  while (run('state.phase') === 'wave' && ticks++ < 36000) run('update(1/60, 1170)');
  assert.ok(ticks < 36000, 'Wave must terminate');
  console.log(run('JSON.stringify({wave:state.wave, level:state.guardLevel, spikes:state.spikesLevel, result:state.phase, hp:state.guardHp, gate:state.gate, difficulty:state.waveDifficulties[state.wave]})'));
  if (wave === 1) assert.equal(run('state.phase'), 'victory');
  if (wave === 4) {
    assert.equal(run('state.phase'), 'victory');
    assert.ok(run('state.guardHp / state.maxGuardHp') < 0.4, 'Later waves should pressure an upgraded guard');
  }
  if (wave === 5 && level === 5) assert.equal(run('state.phase'), 'complete');
  if (wave === 5 && level === 1) assert.equal(run('state.phase'), 'defeat');
}
console.log('Wave scaling, retries, patrols, reset, preview and combat checks passed.');

const botReport = require('../tools/balance-bot.cjs').play();
assert.equal(botReport.length, 5, 'Balance bot must finish all five waves');
for (const result of botReport) {
  assert.ok(result.peakEnemies <= 2, `Wave ${result.wave} must not crowd the battlefield`);
  assert.equal(result.bossSharedField, false, 'Boss must enter alone');
  assert.notEqual(result.phase, 'defeat', `Balance bot lost wave ${result.wave}`);
  assert.ok(result.hpRatio >= 0.1 && result.hpRatio <= 0.4,
    `Wave ${result.wave} should end in the 10–40% tension band, got ${Math.round(result.hpRatio * 100)}%`);
  assert.equal(result.gate, result.maxGate, `Guard should survive wave ${result.wave} before the gate is hit`);
}
console.log('Buy-all balance bot kept guard HP inside the 10–40% tension band.');

for (const seconds of [120, 600]) {
  const idle = require('../tools/balance-bot.cjs').idle(seconds);
  assert.equal(idle.clearedWave, 0);
  assert.ok(idle.guard <= 5 && idle.farm <= 5 && idle.gate === 1 && idle.spikes === 0,
    'AFK purchases cannot unlock tiers beyond the current progression');
  assert.ok(idle.patrolKills > 0, 'AFK scenario must actually defeat patrols');
}
run('resetGame(); state.food = 100000; state.coins = 100000');
for (let attempt = 0; attempt < 20; attempt++) run("ui['guard-upgrade'].onclick(); ui['farm-upgrade'].onclick(); ui['spikes-upgrade'].onclick()");
assert.equal(run('state.guardLevel'), 5);
assert.equal(run('state.farmLevel'), 5);
assert.equal(run('state.gateLevel'), 1);
assert.equal(run('canUpgrade("gate")'), false);
assert.equal(run('state.spikesLevel'), 0);
run('syncUi()');
assert.match(elements.get('guard-cost').textContent, /поселение/);
run('state.food = 0; state.coins = 0; finishWave()');
assert.equal(run('state.food'), 0, 'Victory does not replace farm production');
assert.equal(run('state.coins'), 9);
run('finishWave()');
assert.equal(run('state.coins'), 9, 'Victory reward is paid only once');
run("state.food = 100; ui['guard-upgrade'].onclick()");
assert.equal(run('state.guardLevel'), 5, 'Ordinary victories do not unlock a new town tier');
run('resetGame(); spawnMob("orc", false); collectKillReward(state.mobs[0]); collectKillReward(state.mobs[0])');
assert.equal(run('state.coins'), 0);
run('collectKillReward(state.mobs[0])');
assert.equal(run('state.coins'), 1, 'Three patrol kills pay one coin');
console.log('AFK income, progression caps and first-clear rewards passed.');

for (const phase of ['preparation', 'victory', 'defeat']) {
  run(`resetGame(); state.phase = '${phase}'; state.guardHp = 1; state.maxGuardHp = 140; state.food = 7; state.coins = 3; startWave()`);
  assert.equal(run('state.guardHp'), 140, 'Every wave and retry starts at full HP');
  assert.equal(run('state.food'), 7, 'Recovery must not cost food');
  assert.equal(run('state.coins'), 3, 'Recovery must not cost coins');
}
run('resetGame(); spawnMob("orc", false); state.mobs[0].x = 1170 * 0.52 - 72; state.mobs[0].attackCooldown = 0; update(1/60, 1170)');
assert.equal(run('state.guardHp'), 97, 'Patrol attacks must visibly damage the guard');
assert.equal(run('state.floaters.some(floater => floater.kind === "hurt")'), true);
run('state.mobs = []; for (let i = 0; i < 36; i++) update(1/60, 1170)');
assert.equal(run('state.guardHp'), 100);
assert.equal(run('state.floaters.some(floater => floater.kind === "heal")'), true);
for (const phase of ['victory', 'defeat', 'complete', 'preparation']) {
  run(`resetGame(); state.phase = '${phase}'; state.guardHp = 20; state.patrolTimer = 100; for (let i = 0; i < 150; i++) update(1/60, 1170)`);
  assert.equal(run('state.guardHp'), 100);
  assert.equal(run('state.food'), 0, 'Recovery is free');
}
run('resetGame(); startWave(); state.guardHp = 20; update(1/60, 1170)');
assert.equal(run('state.guardHp'), 20, 'No regeneration during waves');
assert.equal(run('state.regenFlash'), 0);
console.log('Free recovery, regeneration VFX and ambient damage checks passed.');

run('resetGame(); state.guardHp = 50; state.patrolTimer = 100; spawnMob("orc", false); for (let i = 0; i < 120; i++) update(1/60, 1170)');
assert.equal(run('state.guardHp'), 50, 'No healing while a patrol is approaching, even without recent damage');
assert.equal(run('state.floaters.some(floater => floater.kind === "heal")'), false);
run('state.mobs[0].dead = true; state.mobs[0].hit = 0; for (let i = 0; i < 30; i++) update(1/60, 1170)');
assert.ok(run('state.guardHp') > 50, 'Recovery begins after the last enemy dies');
run('state.patrolTimer = 0; state.regenDelay = 0; state.guardHp = 60; update(1/60, 1170)');
assert.equal(run('state.guardHp'), 60, 'A newly spawned patrol prevents same-frame healing');
assert.equal(run('state.regenFlash'), 0);
assert.equal(run('state.floaters.some(floater => floater.kind === "heal")'), false);

run('resetGame(); state.food = 1e9; state.coins = 1e9');
run("ui['town-upgrade'].onclick()");
assert.equal(run('state.townLevel'), 1, 'AFK wealth cannot bypass the boss');
assert.equal(run('state.archerUnlocked'), false);
run('state.wave = 4; finishWave()');
run("ui['town-upgrade'].onclick()");
assert.equal(run('state.townLevel'), 1, 'An ordinary victory cannot upgrade the town');
run('state.wave = 5; failWave()');
assert.equal(run('canUpgradeTown()'), false, 'Losing to the boss grants no unlock');
run('finishWave()');
assert.equal(run('canUpgradeTown()'), true);
run("state.food = 0; state.coins = 0; ui['town-upgrade'].onclick()");
assert.equal(run('state.townLevel'), 2);
assert.equal(run('state.archerUnlocked'), true);
assert.equal(run('upgradeLimit("guard")'), 10);
run("ui['town-upgrade'].onclick(); finishWave(); ui['town-upgrade'].onclick()");
assert.equal(run('state.townLevel'), 2, 'The same boss cannot grant another town level');
run('resetGame()');
assert.equal(run('state.townLevel'), 1);
assert.equal(run('state.archerUnlocked'), false);
assert.equal(run('buildWavePlan(1).join(",")'), 'orc');
assert.equal(run('buildWavePlan(2).join(",")'), 'orc,orc');
assert.ok(run('buildWavePlan(3).includes("orcDual")'));
assert.equal(run('canUpgrade("spikes")'), false);
run('state.clearedWave = 3');
assert.equal(run('canUpgrade("spikes")'), true);
console.log('Boss-gated town, archer unlock, onboarding and reset passed.');
