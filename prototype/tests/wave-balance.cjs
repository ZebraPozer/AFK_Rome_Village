const assert = require('node:assert/strict');
// Full game (simulation + presentation) with a stub DOM; see tools/load-game.cjs.
const { loadGame } = require('../tools/load-game.cjs');
const { run, elements } = loadGame();
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
assert.match(elements.get('wave-difficulty').textContent, /locked/);
run('resetGame()');
assert.equal(run('Object.keys(state.waveDifficulties).length'), 0);
run('state.phase = "victory"; syncUi()');
assert.match(elements.get('wave-difficulty').textContent, /Wave 2/);
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
assert.match(elements.get('guard-cost').textContent, /village/);
run('state.food = 0; state.coins = 0; finishWave()');
assert.equal(run('state.food'), 0, 'Victory does not replace farm production');
assert.equal(run('state.coins'), 9);
run('finishWave()');
assert.equal(run('state.coins'), 9, 'Victory reward is paid only once');
run("state.food = 100; ui['guard-upgrade'].onclick()");
assert.equal(run('state.guardLevel'), 5, 'Ordinary victories do not unlock a new town tier');
run('resetGame(); spawnMob("orc", false); collectKillReward(state.mobs[0]); collectKillReward(state.mobs[0])');
assert.equal(run('state.coins'), 2, 'Each patrol kill pays one coin');
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
assert.match(elements.get('spell-bar').innerHTML, /Shield Bash/);
assert.doesNotMatch(elements.get('spell-bar').innerHTML, /Volley/);
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
assert.match(elements.get('spell-bar').innerHTML, /Volley/);
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

// Village 4 adds the wall slot with the priestess.
run('resetGame(); state.wavesCleared = 15; state.trophies = 3; upgradeTown(); upgradeTown(); syncUi()');
assert.equal(run('state.townLevel'), 3);
assert.equal(run('activeHeroes().join()'), 'legionary,archer', 'No wall slot before village 4');
run('upgradeTown(); syncUi()');
assert.equal(run('state.townLevel'), 4);
assert.equal(run('activeHeroes().join()'), 'legionary,archer,priestess');
assert.match(elements.get('lineup').innerHTML, /Priestess/);
run('state.guardHp = 50; state.maxGuardHp = 200; state.heroes.priestess.cd = 0;');
assert.equal(run('castSpell("priestess")'), true);
assert.equal(run('state.guardHp'), 130, 'Blessing heals 40% of max HP');

// Boss rewards: trophies raise the village, eagles open systems.
run('resetGame(); state.wave = 4; finishWave();');
assert.equal(run('state.trophies'), 0, 'Ordinary waves give no trophy');
run('state.wave = 5; finishWave();');
assert.equal(run('state.trophies + "/" + state.eagles'), '1/0', 'Mini-boss: 1 trophy');
run('finishWave();');
assert.equal(run('state.trophies'), 1, 'A boss pays its trophy only once');
run('state.wave = 10; state.wavesCleared = 9; finishWave();');
assert.equal(run('state.trophies + "/" + state.eagles'), '3/1', 'Mega-boss: 2 trophies + 1 eagle');
run('upgradeTown(); upgradeTown(); upgradeTown();');
assert.equal(run('state.townLevel'), 3, 'Village 4 also needs the wave 15 boss');
assert.equal(run('state.trophies'), 1, 'Each village level costs one trophy');
assert.equal(run('requiredTown(11)'), 3, 'Wave 11 needs village 3');
assert.equal(run('unlockSystem("barracks")'), false, 'Barracks needs the wave 20 boss');
assert.equal(run('unlockSystem("armory")'), true);
assert.equal(run('state.eagles'), 0);
assert.equal(run('unlockSystem("armory")'), false, 'A system unlocks once');

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
assert.equal(fullCampaign.at(-1).phase, 'victory', 'All ten opening waves are beatable with spells and rotation');
for (const result of fullCampaign) {
  assert.ok(result.enemies <= 5 && result.peakEnemies <= 2);
  assert.equal(result.bossSharedField, false);
}
assert.ok(fullCampaign.some((result) => result.lineup.includes('hoplite')), 'Bot actually rotates in the hoplite');
const noRotation = require('../tools/balance-bot.cjs').play({ waves: 10, rotate: false });
assert.equal(noRotation.at(-1).phase, 'victory', 'Rotation is an advantage, not a requirement');
assert.ok(fullCampaign.at(-1).hpRatio > noRotation.at(-1).hpRatio, 'Rotation creates a real advantage');
run('resetGame(); state.wavesCleared = 10; state.townLevel = 2; state.trophies = 2; upgradeTown(); update(0.01, 1170);');
assert.equal(run('state.townLevel'), 3);
assert.equal(run('state.villageStage'), 3);
run('upgradeTown()');
assert.equal(run('state.townLevel'), 3, 'Village 4 waits for the wave 15 boss');
console.log('Hero spells, slots, rotation, damage roles, full campaign, town growth and projectile isolation passed.');

// Save / load and offline income.
run('resetGame(); state.wave = 5; finishWave(); upgradeTown(); state.wave = 7; finishWave(); state.wave = 8; state.food = 42; state.coins = 17; state.guardLevel = 6; state.maxGuardHp = 200; state.frontHero = "hoplite"; startWave();');
const saved = JSON.parse(run('JSON.stringify(serializeSave(1000))'));
assert.equal(saved.phase, 'preparation', 'A wave in progress is saved as its preparation');
assert.equal(saved.wave, 8);
run(`resetGame(); applySave(${JSON.stringify(saved)})`);
assert.equal(run('state.phase'), 'preparation');
assert.equal(run('state.townLevel'), 2);
assert.equal(run('state.food'), 42);
assert.equal(run('state.guardHp'), 200, 'Loaded hero starts at full HP');
assert.equal(run('state.frontHero'), 'hoplite');
assert.equal(run('state.heroes.hoplite.unlocked && state.heroes.archer.unlocked'), true);
assert.equal(run('activeHeroes().join()'), 'hoplite,archer');
assert.equal(run('applySave({ version: 999 })'), false, 'Unknown save versions are ignored');
assert.equal(run('offlineIncome(30, 3).food'), 0, 'Short absences pay nothing');
assert.deepEqual(JSON.parse(run('JSON.stringify(offlineIncome(600, 3))')), { seconds: 600, food: 300, gold: 30 }, 'Offline pays half of live play');
run('state.townLevel = 1');
assert.equal(run('offlineIncome(48 * 3600, 1).seconds'), 2 * 3600, 'Village 1–2: offline capped at 2 h');
run('state.townLevel = 3');
assert.equal(run('offlineIncome(48 * 3600, 1).seconds'), 4 * 3600, 'Village 3–4: 4 h');
run('state.townLevel = 5');
assert.equal(run('offlineIncome(48 * 3600, 1).seconds'), 8 * 3600, 'Village 5+: 8 h');
assert.equal(run('formatDuration(3 * 3600 + 25 * 60)'), '3h 25m');
console.log('Save, load and offline income passed.');

// Pacing: a human-like player clears the first 10 waves in one session (≈15–35 min),
// feels danger (at least one defeat, e.g. on a boss) but is not stonewalled.
const firstSession = require('../tools/balance-bot.cjs').session();
const sessionMinutes = firstSession.at(-1).clock;
const defeats = firstSession.filter((r) => r.phase === 'defeat');
assert.equal(firstSession.at(-1).wave, 10);
assert.notEqual(firstSession.at(-1).phase, 'defeat', 'The first session reaches the end of wave 10');
assert.ok(sessionMinutes >= 15 && sessionMinutes <= 35, `First session should take 15–35 min, got ${sessionMinutes.toFixed(1)}`);
assert.ok(defeats.length >= 1 && defeats.length <= 8, `1–8 defeats expected in the first session, got ${defeats.length}`);
console.log(`Pacing passed: first 10 waves in ${sessionMinutes.toFixed(1)} min with ${defeats.length} defeats (${defeats.map((r) => r.wave).join(', ')}).`);

// Act III: the balanced player reaches wave 30 with spells, rotation and gear.
const longRun = require('../tools/balance-bot.cjs').play({ waves: 30, maxPrepHours: 48 });
assert.equal(longRun.length, 30);
assert.equal(longRun.at(-1).phase, 'complete', 'All 30 waves are beatable');
for (const result of longRun) {
  assert.ok(result.peakEnemies <= (result.wave > 20 ? 3 : 2), `Wave ${result.wave} crowds the field`);
  assert.equal(result.bossSharedField, false, `Boss of wave ${result.wave} must enter alone`);
  if (result.wave > 10) assert.ok(result.hpRatio >= 0.15 && result.hpRatio <= 0.6, `Wave ${result.wave} should end at 15–60% HP, got ${Math.round(result.hpRatio * 100)}%`);
}
const prepHours = longRun.reduce((sum, r) => sum + r.preparationSeconds, 0) / 3600;
assert.ok(prepHours > 3 && prepHours < 24, `Waves 1–30 should need hours of AFK, not minutes or days (got ${prepHours.toFixed(1)} h)`);
run('state.townLevel');

// Armory: boss drops after the eagle, items pass between heroes, gear changes combat.
run('resetGame(); state.wave = 10; state.wavesCleared = 9; finishWave(); unlockSystem("armory"); state.wave = 15; state.wavesCleared = 14; finishWave();');
assert.equal(run('state.gear.length'), 1, 'Mini-boss drops one item once the Armory is open');
assert.equal(run('state.gear[0].slot'), 'weapon');
run('state.wave = 20; state.wavesCleared = 19; finishWave();');
assert.equal(run('state.gear.length'), 3, 'Mega-boss drops two items');
assert.equal(run('state.gear[1].rarity'), 1, 'Mega-boss items are rare');
run('autoEquip()');
assert.equal(run('state.gear.filter(i => i.owner === "legionary").length'), 3, 'Auto-equip dresses the frontline first');
assert.ok(Math.abs(run('gearBonus("legionary", "weapon")') - 0.1) < 1e-9);
run('state.holdLine = 0; state.frontHero = "legionary"');
assert.equal(run('hurtGuard(100, 600)'), 85, 'Rare armour: −15% damage taken');
run('cycleGearOwner(1)');
assert.notEqual(run('state.gear[0].owner'), 'legionary', 'Tapping an item passes it on');
run('state.heroes.legionary.cd = 0; spawnMob("orc"); state.mobs[0].x = 1170 * 0.52 - 72; state.gear.forEach(i => { i.owner = i.slot === "charm" ? "legionary" : i.owner; }); castSpell("legionary")');
assert.ok(run('state.heroes.legionary.cd') < 12, 'A charm shortens the cooldown');
assert.equal(run('requiredTown(21)'), 5);
console.log(`Act III passed: 30 waves complete after ${prepHours.toFixed(1)} h of AFK; Armory drops, equips and boosts.`);

// Barracks: hero levels for food. Temple: offerings to Mars, Ceres, Minerva.
run('resetGame(); state.food = 1e6; state.coins = 1e6;');
assert.equal(run('trainHero("legionary")'), false, 'No training before the Barracks');
run('state.eagles = 2; state.wavesCleared = 30; unlockSystem("barracks");');
const trainCost = run('trainPrice("legionary")');
assert.equal(run('trainHero("legionary")'), true);
assert.equal(run('heroLevel("legionary")'), 2);
assert.equal(run('1e6 - state.food'), trainCost, 'Training costs food');
assert.ok(run('trainPrice("legionary")') > trainCost, 'Each level costs more');
assert.ok(Math.abs(run('heroDamageMult("legionary")') - 1.06) < 1e-9, 'A level adds 6% damage');
run('state.holdLine = 0; state.frontHero = "legionary";');
assert.equal(run('hurtGuard(105, 600)'), 100, 'A level makes the hero 5% tougher');
assert.equal(run('trainHero("catapult")'), false, 'Machines do not train');
assert.equal(run('makeOffering("mars")'), false, 'No offerings before the Temple');
run('unlockSystem("temple"); makeOffering("mars"); makeOffering("ceres"); makeOffering("minerva");');
assert.equal(run('state.temple.mars + state.temple.ceres + state.temple.minerva'), 3);
assert.ok(Math.abs(run('heroDamageMult("legionary")') - 1.06 * 1.04) < 1e-9, 'Mars adds damage to every hero');
run('state.farmLevel = 10');
assert.equal(run('foodPerTick()'), 11, 'Ceres +8% food: 10 → 11 per tick (rounded)');
run('state.heroes.legionary.cd = 0; spawnMob("orc"); state.mobs[0].x = 1170 * 0.52 - 72; castSpell("legionary")');
assert.ok(Math.abs(run('state.heroes.legionary.cd') - 12 * 0.97) < 1e-9, 'Minerva shortens cooldowns');
const saved2 = JSON.parse(run('JSON.stringify(serializeSave(5))'));
run(`resetGame(); applySave(${JSON.stringify(saved2)})`);
assert.equal(run('heroLevel("legionary") + "/" + state.temple.mars'), '2/1', 'Training and offerings are saved');
console.log('Barracks and Temple passed: training, offerings, bonuses and saving.');

// Debug tools: AFK forecast never changes the game; offline efficiency; stats log.
run('resetGame(); state.wave = 5; finishWave(); upgradeTown(); state.food = 10; state.coins = 5; state.farmLevel = 3;');
const before = run('JSON.stringify([state.food, state.coins, state.guardLevel, state.farmLevel, state.spikesLevel])');
const f1h = JSON.parse(run('JSON.stringify(forecastAway(3600))'));
assert.equal(run('JSON.stringify([state.food, state.coins, state.guardLevel, state.farmLevel, state.spikesLevel])'), before, 'Forecast restores the state');
assert.equal(f1h.income.food, 1800, '1 h with a level-3 farm = 1800 food offline (50%)');
assert.ok(f1h.after.guard > f1h.before.guard, 'The forecast shows what the food would buy');
run('OFFLINE.efficiency = 0.5');
assert.equal(run('offlineIncome(3600, 3).food'), 1800, 'Offline efficiency scales income');
run('OFFLINE.efficiency = 0.5; OFFLINE.capOverride = 3; state.townLevel = 1');
assert.equal(run('offlineIncome(5 * 3600, 3).seconds'), 3 * 3600, 'Offline cap can be overridden');
run('OFFLINE.capOverride = null');
run('resetGame(); clearStats(); state.wave = 1; startWave(); state.time += 12; finishWave();');
assert.equal(run('stats.events.filter(e => e.type === "wave").length'), 1, 'Wave results are logged');
assert.equal(run('stats.events.at(-1).seconds'), 12);
run('state.food = 1000; ui["guard-upgrade"].onclick()');
assert.equal(run('stats.events.at(-1).item'), 'frontline', 'Purchases are logged');
assert.equal(run('statsSummary().wins'), 1);
console.log('Debug tools passed: AFK forecast, offline settings and stats log.');

// Cheats: jumping to a wave reproduces the build the game expects there.
for (const w of [6, 15, 21, 30]) {
  run(`jumpToWave(${w})`);
  const s = JSON.parse(run('JSON.stringify({ wave: state.wave, phase: state.phase, town: state.townLevel, guard: state.guardLevel, cleared: state.wavesCleared, systems: state.systems, gear: state.gear.length })'));
  assert.equal(s.cleared, w - 1, `Jump ${w}: previous waves cleared`);
  assert.equal(run('state.phase === "victory" ? state.wave + 1 : state.wave'), w, `Jump ${w}: next wave is ${w}`);
  assert.ok(run(`state.townLevel >= requiredTown(${w})`), `Jump ${w}: village allows the wave`);
}
run('jumpToWave(30)');
assert.equal(run('state.systems.join()'), 'armory,barracks', 'Temple waits for the wave 30 boss');
assert.ok(run('heroLevel("legionary")') > 1, 'Heroes are trained after the jump');
run("ui['wave-button'].onclick()");
assert.equal(run('state.phase + state.wave'), 'wave30', 'After the jump the wave can be called');
console.log('Cheats passed: jump to waves 6, 15, 21 and 30.');

// Regression: a catapult in the tower must still finish waves with enemy archers.
for (const w of [7, 18, 24]) {
  run(`jumpToWave(${w}); state.autoSpells = false; state.towerSlot = 'catapult';`);
  run("ui['wave-button'].onclick()");
  let ticks = 0;
  while (run('state.phase') === 'wave' && ticks++ < 60 * 300) run('update(1/60, 1170)');
  assert.notEqual(run('state.phase'), 'wave', `Wave ${w} with a catapult must end (no stalemate with enemy archers)`);
}
console.log('No stalemates: catapult waves with enemy archers end.');

// Architecture: the simulation runs with no DOM at all, never references browser,
// rendering or UI globals, and the data bundle matches data/*.json.
{
  const { loadGame, SIM } = require('../tools/load-game.cjs');
  const sim = loadGame({ simOnly: true });
  sim.run('jumpToWave(12); state.autoSpells = true; callWave(); for (let i = 0; i < 60 * 300 && state.phase === "wave"; i++) update(1/60, 1170);');
  assert.notEqual(sim.run('state.phase'), 'wave', 'A wave runs to the end with the simulation alone');
  const forbidden = /\b(document|window|localStorage|navigator|canvas|ctx|ui|hud|sprites|requestAnimationFrame|performance)\b(?!\w*:)/;
  for (const file of SIM) {
    const code = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', file), 'utf8')
      .split('\n').filter((line) => !line.trim().startsWith('//')).join('\n')
      .replace(/'[^'\n]*'|`[^`]*`|"[^"\n]*"/g, "''");
    const hit = code.match(forbidden);
    assert.equal(hit, null, `${file} must not use ${hit && hit[0]} (simulation stays engine-agnostic)`);
  }
  require('node:child_process').execFileSync(process.execPath, [require('node:path').join(__dirname, '../tools/build-data.cjs'), '--check'], { stdio: 'pipe' });
  console.log('Architecture passed: sim runs without DOM, no browser globals in src/sim, data bundle up to date.');
}
