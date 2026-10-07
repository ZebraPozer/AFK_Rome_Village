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
run('failWave(); startWave()');
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
for (const [wave, level, spikes] of [[1,1,0],[2,2,0],[3,1,0],[3,3,1],[4,4,1],[5,5,2],[5,1,0]]) {
  run(`resetGame(); Object.assign(state, {wave:${wave}, guardLevel:${level}, spikesLevel:${spikes}, maxGuardHp:${80+20*level}, guardHp:${80+20*level}}); startWave();`);
  let ticks = 0;
  while (run('state.phase') === 'wave' && ticks++ < 36000) run('update(1/60, 1170)');
  assert.ok(ticks < 36000, 'Wave must terminate');
  console.log(run('JSON.stringify({wave:state.wave, level:state.guardLevel, spikes:state.spikesLevel, result:state.phase, hp:state.guardHp, gate:state.gate, difficulty:state.waveDifficulties[state.wave]})'));
  if (wave === 1) {
    assert.equal(run('state.phase'), 'victory');
    assert.ok(ticks / 60 < 25, 'The first fight is short');
    assert.ok(run('state.guardHp / state.maxGuardHp') < 0.5, 'Even the first orc is felt');
  }
  if (wave === 3 && level === 1) assert.equal(run('state.phase'), 'defeat', 'Skipping upgrades loses wave 3');
  if (wave === 4) {
    assert.equal(run('state.phase'), 'victory');
    assert.ok(run('state.guardHp / state.maxGuardHp') < 0.4, 'Later waves should pressure an upgraded guard');
  }
  if (wave === 5 && level === 5) assert.equal(run('state.phase'), 'victory');
  if (wave === 5 && level === 1) assert.equal(run('state.phase'), 'defeat');
}
console.log('Wave scaling, retries, patrols, reset, preview and combat checks passed.');

const botReport = require('../tools/balance-bot.cjs').play();
assert.equal(botReport.length, 5, 'Balance bot must finish all five waves');
for (const result of botReport) {
  assert.ok(result.peakEnemies <= 2, `Wave ${result.wave} must not crowd the battlefield`);
  assert.equal(result.bossSharedField, false, 'Boss must enter alone');
  assert.notEqual(result.phase, 'defeat', `Balance bot lost wave ${result.wave}`);
  assert.ok(result.hpRatio >= 0.2 && result.hpRatio <= 0.5,
    `Wave ${result.wave} with spells should end at 20–50% HP, got ${Math.round(result.hpRatio * 100)}%`);
}
const noSpellReport = require('../tools/balance-bot.cjs').play({ spells: false });
assert.equal(noSpellReport.length, 5);
for (const result of noSpellReport) {
  assert.notEqual(result.phase, 'defeat', `Opening wave ${result.wave} must stay beatable without spells`);
  assert.ok(result.hpRatio >= 0.05 && result.hpRatio <= 0.35,
    `Wave ${result.wave} without spells should end at 5–35% HP, got ${Math.round(result.hpRatio * 100)}%`);
  assert.ok(result.hpRatio < botReport[result.wave - 1].hpRatio, 'Spells give a real advantage');
}
console.log('Balance bot: waves 1–5 end at 20–50% HP with spells and 5–35% without.');

for (const seconds of [120, 600]) {
  const idle = require('../tools/balance-bot.cjs').idle(seconds);
  assert.equal(idle.clearedWave, 0);
  assert.ok(idle.guard <= 5 && idle.farm <= 5 && idle.spikes === 0,
    'AFK purchases cannot unlock tiers beyond the current progression');
  assert.ok(idle.patrolKills > 0, 'AFK scenario must actually defeat patrols');
}
run('resetGame(); state.food = 100000; state.coins = 100000');
for (let attempt = 0; attempt < 20; attempt++) run("ui['guard-upgrade'].onclick(); ui['farm-upgrade'].onclick(); ui['spikes-upgrade'].onclick()");
assert.equal(run('state.guardLevel'), 5);
assert.equal(run('state.farmLevel'), 5);
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
  run(`resetGame(); state.phase = '${phase}'; state.guardHp = 20; state.patrolTimer = 100; state.foodTimer = 1000; for (let i = 0; i < 300; i++) update(1/60, 1170)`);
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
run('state.wavesCleared = 3');
assert.equal(run('canUpgrade("spikes")'), true);
console.log('Boss-gated town, archer unlock, onboarding and reset passed.');

// Heroes: one spell each, slots open with the town, rotation needs a substitute.
run('resetGame(); syncUi()');
assert.equal(run('activeHeroes().join()'), 'legionary', 'Start: one hero on the field');
assert.match(elements.get('spell-bar').innerHTML, /Удар щитом/);
assert.doesNotMatch(elements.get('spell-bar').innerHTML, /Залп/);
assert.equal(run('castSpell("legionary")'), false, 'Shield bash needs an enemy in reach');
run('spawnMob("orc"); state.mobs[0].x = 1170 * 0.52 - 72; state.mobs[0].hp = state.mobs[0].maxHp = 50;');
run('state.running = false');
assert.equal(run('castSpell("legionary")'), false, 'Pause also pauses spells');
run('state.running = true');
assert.equal(run('castSpell("legionary")'), true);
assert.ok(run('state.mobs[0].stun') > 0 && run('state.mobs[0].hp') < 50, 'Bash damages and stuns');
assert.equal(run('castSpell("legionary")'), false, 'Cooldown blocks a second bash');
run('state.mobs[0].attackCooldown = 0; state.guardHp = 100; for (let i = 0; i < 60; i++) update(1/60, 1170)');
assert.equal(run('state.guardHp'), 100, 'A stunned orc does not hit back');
assert.ok(run('state.mobs[0].x') < 1170 * 0.52 - 150, 'Bash knocks the orc back');
run('resetGame(); state.heroes.legionary.cd = 0; state.phase = "victory"; startWave()');
assert.equal(run('state.heroes.legionary.cd'), 6, 'Without rest the spell needs half a cooldown at wave start');
run('resetGame(); for (const w of [1,2,3]) { state.wave = w; startWave(); finishWave(); }');
assert.equal(run('state.heroes.legionary.fatigue'), 0, 'No fatigue without a substitute');
assert.equal(run('heroPowerMult("legionary")'), 1);

// Town II: the tower slot holds the archer hero with «Залп» or the catapult machine.
run('resetGame(); state.wave = 5; finishWave(); upgradeTown(); syncUi()');
assert.equal(run('activeHeroes().join()'), 'legionary,archer');
assert.match(elements.get('spell-bar').innerHTML, /Залп/);
run('spawnMob("orcRed"); spawnMob("orcRed"); state.mobs.forEach(m => { m.x = 400; m.hp = m.maxHp = 500; });');
assert.equal(run('castVolley()'), true);
assert.equal(run('castSpell("archer")'), false, 'Cooldown blocks a second volley');
run('updateDefenders(0.8, 1170)');
assert.ok(run('state.mobs.every(m => m.hp < m.maxHp)'), 'Volley hits the whole group');
run("ui['tower-slot'].onclick()");
assert.equal(run('state.towerSlot'), 'catapult');
assert.equal(run('activeHeroes().includes("archer")'), false, 'Catapult replaces the archer');
run('state.mobs = []; state.phase = "victory"; startWave(); finishWave()');
assert.equal(run('state.heroes.archer.rested'), true, 'Benched archer rests');
assert.equal(run('state.heroes.catapult.fatigue'), 0, 'Machines never tire');
run("ui['tower-slot'].onclick(); state.phase = 'victory'; startWave()");
assert.equal(run('state.heroes.archer.cd'), 0, 'Rested hero walks in with the spell ready');
assert.equal(run('heroPowerMult("archer")'), run('1 + RESTED_BONUS'));
run("ui['tower-slot'].onclick()");
assert.equal(run('state.towerSlot'), 'archer', 'No swapping mid-wave');

// Wave 7 brings the hoplite: the first real rotation choice on the frontline.
run('resetGame(); state.wave = 5; finishWave(); upgradeTown(); state.wave = 6; finishWave();');
assert.equal(run('state.heroes.hoplite.unlocked'), false);
run('state.wave = 7; finishWave();');
assert.equal(run('state.heroes.hoplite.unlocked'), true);
for (let i = 0; i < 3; i++) run('state.wave = 8; state.phase = "victory"; startWave(); finishWave();');
assert.equal(run('state.heroes.legionary.fatigue'), 3);
assert.ok(Math.abs(run('heroPowerMult("legionary")') - run('1 - 2 * FATIGUE_PENALTY')) < 1e-9, 'Three waves in a row: −30%');
assert.equal(run('state.heroes.hoplite.rested'), true);
run("ui['auto-lineup'].onclick()");
assert.equal(run('state.frontHero'), 'hoplite', 'Auto lineup sends the freshest hero');
assert.equal(run('cycleSlot("front")'), true);
assert.equal(run('state.frontHero'), 'legionary');
run('cycleSlot("front"); state.phase = "victory"; startWave(); finishWave();');
assert.equal(run('state.heroes.legionary.fatigue'), 0, 'A wave on the bench removes fatigue');
assert.equal(run('state.heroes.legionary.rested'), true);
run('state.holdLine = 0');
assert.equal(run('hurtGuard(10, 600)'), 9, 'Hoplite armour: −15%');
run('state.guardHp = 100; state.phase = "wave"; spawnMob("orc"); state.heroes.hoplite.cd = 0; castSpell("hoplite")');
assert.equal(run('hurtGuard(10, 600)'), 3, '«Удержать строй» cuts damage by 70%');
run('state.mobs = []; failWave()');
assert.equal(run('state.holdLine'), 0);

// Town III adds the wall slot with the priestess.
run('resetGame(); state.wave = 5; finishWave(); upgradeTown(); state.wave = 10; finishWave(); upgradeTown(); syncUi()');
assert.equal(run('activeHeroes().join()'), 'legionary,archer,priestess');
assert.match(elements.get('lineup').innerHTML, /Жрица/);
run('state.guardHp = 50; state.maxGuardHp = 200; state.heroes.priestess.cd = 0;');
assert.equal(run('castSpell("priestess")'), true);
assert.equal(run('state.guardHp'), 130, '«Благословение» heals 40% of max HP');
assert.equal(run('state.phase'), 'complete');
run("ui['wave-button'].onclick()");
assert.equal(run('state.phase'), 'wave', 'Wave 10 stays replayable after the campaign');
assert.equal(run('state.wave'), 10);

// Enemy traits and the two defender roles use different damage rules.
run('resetGame(); spawnMob("orcShield"); spawnMob("boar");');
assert.equal(run('effectiveDamage(state.mobs[0], 4, "pierce")'), 2);
assert.equal(run('effectiveDamage(state.mobs[0], 4, "melee")'), 4);
assert.equal(run('effectiveDamage(state.mobs[1], 4, "melee")'), 3);
assert.equal(run('effectiveDamage(state.mobs[1], 4, "area")'), 4);
run('resetGame(); state.coins = 1; state.food = 5; spawnMob("goblin"); spawnMob("goblin"); state.mobs.forEach(m => { m.x = 700; }); update(1/60, 1170);');
assert.equal(run('state.coins'), 0);
assert.equal(run('state.food'), 4, 'Goblins steal coins first, then food');
run('resetGame(); state.archerUnlocked = true; state.archerLevel = 1; state.towerSlot = "archer"; spawnMob("orcRed"); spawnMob("orcArcher"); state.mobs[0].x = 500; state.mobs[1].x = 300; updateDefenders(0.01, 1170);');
assert.equal(run('state.arrows[0].mob.type'), 'orcArcher', 'Archer prioritizes ranged enemies');
run('resetGame(); state.catapultUnlocked = true; state.catapultLevel = 1; state.towerSlot = "catapult"; spawnMob("orcRed"); spawnMob("orcRed"); state.mobs.forEach(m => { m.x = 200; m.hp = m.maxHp = 100; }); updateDefenders(1, 1170);');
assert.equal(run('state.mobs.every(m => m.hp < m.maxHp)'), true, 'Catapult damages both nearby enemies');
run('state.enemyShots = [{t:0,dur:1,damage:999}]; state.phase = "victory"; startWave();');
assert.equal(run('state.enemyShots.length'), 0, 'Projectiles never leak into a new wave');

const fullCampaign = require('../tools/balance-bot.cjs').play({ waves: 10 });
assert.equal(fullCampaign.length, 10);
assert.equal(fullCampaign.at(-1).phase, 'complete', 'All ten waves are beatable with spells and rotation');
for (const result of fullCampaign) {
  assert.ok(result.enemies <= 5 && result.peakEnemies <= 2);
  assert.equal(result.bossSharedField, false);
}
assert.ok(fullCampaign.some((result) => result.lineup.includes('hoplite')), 'Bot actually rotates in the hoplite');
const noRotation = require('../tools/balance-bot.cjs').play({ waves: 10, rotate: false });
assert.equal(noRotation.at(-1).phase, 'complete', 'Rotation is an advantage, not a requirement');
assert.ok(fullCampaign.at(-1).hpRatio > noRotation.at(-1).hpRatio, 'Rotation creates a real advantage');
run('resetGame(); state.wavesCleared = 10; state.townLevel = 2; upgradeTown(); update(0.01, 1170);');
assert.equal(run('state.townLevel'), 3);
assert.equal(run('state.villageStage'), 3);
run('upgradeTown()');
assert.equal(run('state.townLevel'), 3, 'Final town upgrade is idempotent');
console.log('Hero spells, slots, rotation, damage roles, full campaign, town growth and projectile isolation passed.');
