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
assert.equal(run('calculateWaveDifficulty(1, {guardLevel: 20, spikesLevel: 10, maxGuardHp: 480}).hp'), 1);
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
    assert.ok(run('state.guardHp') < 40, 'Later waves should pressure an upgraded guard');
  }
  if (wave === 5 && level === 5) assert.equal(run('state.phase'), 'complete');
  if (wave === 5 && level === 1) assert.equal(run('state.phase'), 'defeat');
}
console.log('Wave scaling, retries, patrols, reset, preview and combat checks passed.');
