'use strict';
// Legionary upgrades get steeper so food alone cannot outpace the waves.
function guardUpgradePrice() {
  return priceAt(ECONOMY.guardBase, ECONOMY.guardGrowth, state.guardLevel);
}

// Enemy walking speed (world units per second) before the per-type multiplier.
function walkSpeed(wave) {
  const w = GAME_DATA.waves.walkSpeed;
  return w.base + wave * w.perWave;
}

function archerInterval(level) {
  const i = GAME_DATA.economy.archer.interval;
  return Math.max(i.min, i.base + (level - 1) * i.perLevel);
}

function archerPrice() {
  return priceAt(ECONOMY.archerBase, ECONOMY.archerGrowth, state.archerLevel);
}

// Shared tower geometry for update() and drawScene() (world is 1170×540).
function towerGeometry(width, height = 540) {
  const ground = height * GROUND_RATIO;
  const towerX = width * 0.6;
  const towerHeight = Math.min(300, height * 0.64) * ACTOR_SCALE;
  const platformY = ground - towerHeight * 0.72;
  return { ground, towerX, towerHeight, platformY };
}

function catapultInterval(level) {
  const i = GAME_DATA.economy.catapult.interval;
  return Math.max(i.min, i.base + (level - 1) * i.perLevel);
}

// Fixed upgrade damage keeps small enemy groups relevant at higher difficulties.
function catapultDamage(level) {
  const d = GAME_DATA.economy.catapult.damage;
  return d.base + d.perLevel * (level - 1);
}

// Faster single-target fire complements the catapult's slower area attacks.
function archerDamage(level) {
  return GAME_DATA.economy.archer.damagePerLevel * level;
}

function catapultPrice() {
  return priceAt(ECONOMY.catapultBase, ECONOMY.catapultGrowth, state.catapultLevel);
}

// Damage types: melee (legionary), pierce (archer), area (volley, catapult), contact (spikes).
function effectiveDamage(mob, raw, type) {
  const stats = enemyTypes[mob.type] || {};
  let damage = raw;
  const rules = GAME_DATA.enemies.damageRules;
  if (type === 'pierce' && traitsOf(mob.type).includes('shield')) damage *= rules.shieldPierceFactor;
  if (stats.armor && type !== 'area') damage = Math.max(raw * rules.armorFloor, damage - stats.armor);
  return damage;
}

function damageMob(mob, raw, type = 'melee') {
  if (mob.dead) return 0;
  let damage = effectiveDamage(mob, raw, type);
  if (mob.barrier > 0) {
    const absorbed = Math.min(mob.barrier, damage);
    mob.barrier -= absorbed;
    damage -= absorbed;
  }
  mob.hp -= damage;
  mob.hit = 0.18;
  if (mob.hp <= 1e-6) {
    mob.dead = true;
    state.kills += 1;
    if (mob.countsForWave) state.defeated += 1;
    collectKillReward(mob);
  }
  return damage;
}

// An enemy that slips past the legionary runs into the village and steals coins (then food).
function stealLoot(mob, width) {
  let left = mob.loot || 1;
  const fromCoins = Math.min(state.coins, left);
  state.coins -= fromCoins;
  left -= fromCoins;
  const fromFood = Math.min(state.food, left);
  state.food -= fromFood;
  const stolen = fromCoins + fromFood;
  if (stolen > 0) state.floaters.push({ kind: 'stolen', amount: stolen, x: width * 0.84, life: 1.6, duration: 1.6 });
}

function aliveMobs() {
  return state.mobs.filter((mob) => !mob.dead);
}

// The volley now belongs to the archer hero on the tower.
function castVolley() {
  return castSpell('archer');
}

function updateDefenders(dt, width) {
  const guardX = width * COMBAT.frontlineX;
  const { towerX, platformY } = towerGeometry(width);
  state.archerCooldown = Math.max(0, state.archerCooldown - dt);
  const onField = activeHeroes();
  for (const [id, hero] of Object.entries(state.heroes)) {
    const before = hero.cd;
    hero.cd = Math.max(0, hero.cd - dt);
    if (before > 0 && hero.cd === 0 && onField.includes(id)) emit('sfx', { name: 'ready' });
  }
  state.holdLine = Math.max(0, state.holdLine - dt);
  state.bashFx = Math.max(0, state.bashFx - dt);
  state.blessFx = Math.max(0, state.blessFx - dt);
  state.shake = Math.max(0, state.shake - dt);

  // Archer: fires at the foremost enemy in range, damage lands when the arrow arrives.
  if (state.archerUnlocked && state.towerSlot === 'archer' && state.archerCooldown <= 0) {
    // Priority: enemy archers first (only our archer outranges them), then the foremost enemy.
    const inRange = aliveMobs().filter((mob) => mob.x > guardX - ARCHER_RANGE && mob.x < guardX + COMBAT.slipPastAt);
    const ranged = inRange.filter((mob) => traitsOf(mob.type).includes('ranged'));
    const pool = ranged.length ? ranged : inRange;
    const target = pool.reduce((lead, mob) => (!lead || mob.x > lead.x ? mob : lead), null);
    if (target) {
      state.arrows.push({ sx: towerX - 30, sy: platformY - 62, mob: target, t: 0, dur: COMBAT.projectiles.arrowFlight, damage: archerDamage(state.archerLevel) * heroDamageMult('archer') });
      state.archerCooldown = archerInterval(state.archerLevel);
      emit('sfx', { name: 'arrow' });
    }
  }
  for (const arrow of state.arrows) {
    arrow.t += dt;
    if (arrow.t >= arrow.dur) damageMob(arrow.mob, arrow.damage, 'pierce');
  }
  state.arrows = state.arrows.filter((arrow) => arrow.t < arrow.dur && !arrow.mob.dead);

  // Catapult: lobs a rock at the densest group, splash damage ignores armor.
  state.catapultCooldown = Math.max(0, state.catapultCooldown - dt);
  if (state.catapultUnlocked && state.towerSlot === 'catapult' && state.catapultCooldown <= 0) {
    const inRange = aliveMobs().filter((mob) => mob.x > guardX - CATAPULT_RANGE && mob.x < guardX - CATAPULT_MIN_RANGE);
    let best = null;
    let bestScore = -1;
    for (const mob of inRange) {
      const score = inRange.filter((other) => Math.abs(other.x - mob.x) <= CATAPULT_SPLASH).length + mob.x / 10000;
      if (score > bestScore) { best = mob; bestScore = score; }
    }
    if (best) {
      const flight = COMBAT.projectiles.rockFlight;
      const blocked = best.x >= guardX - COMBAT.melee.standOff - (best.formationX ?? 0) - 1;
      const lead = blocked ? 0 : walkSpeed(state.wave) * best.speed * flight * 0.8;
      state.rocks.push({ sx: towerX - 34, sy: platformY - 40, tx: Math.min(best.x + lead, guardX - CATAPULT_MIN_RANGE + 40), laneY: best.laneY ?? 0, t: 0, dur: flight, damage: catapultDamage(state.catapultLevel) });
      state.catapultCooldown = catapultInterval(state.catapultLevel);
    }
  }
  for (const rock of state.rocks) {
    rock.t += dt;
    if (rock.t >= rock.dur && !rock.done) {
      rock.done = true;
      for (const mob of aliveMobs()) if (Math.abs(mob.x - rock.tx) <= CATAPULT_SPLASH) damageMob(mob, rock.damage, 'area');
      state.dust.push({ x: rock.tx, laneY: rock.laneY, t: 0 });
      state.shake = Math.max(state.shake, 0.12);
    }
  }
  state.rocks = state.rocks.filter((rock) => !rock.done);
  for (const puff of state.dust) puff.t += dt;
  state.dust = state.dust.filter((puff) => puff.t < 0.6);

  // Enemy arrows from orc archers hit the legionary on arrival.
  for (const shot of state.enemyShots) {
    shot.t += dt;
    if (shot.t >= shot.dur && !shot.done) {
      shot.done = true;
      if (state.guardHp > 0) hurtGuard(shot.damage, guardX);
    }
  }
  state.enemyShots = state.enemyShots.filter((shot) => !shot.done);

  // Hero volley: arrows rain on the zone in front of the legionary, then hit everything there.
  if (state.volleyFx > 0) {
    state.volleyFx = Math.max(0, state.volleyFx - dt);
    if (state.volleyFx === 0) {
      const [from, to] = VOLLEY_ZONE;
      for (const mob of aliveMobs()) {
        if (mob.x >= guardX + from && mob.x <= guardX + to) damageMob(mob, state.volleyDamage, 'area');
      }
      state.floaters.push({ kind: 'volley', amount: state.volleyDamage, x: guardX + (from + to) / 2, life: 1.4, duration: 1.4 });
      state.shake = 0.28;
    }
  }

}

function resetGame() {
  Object.assign(state, {
    townLevel: 1, patrolKills: 0, regenDelay: 0, regenFlash: 0, regenParticleTimer: 0,
    running: true, speed: 1, wave: 1, phase: 'preparation',
    guardHp: 100, maxGuardHp: 100,
    food: 0, coins: 0, kills: 0, guardLevel: 1, spikesLevel: 0, farmLevel: 1,
    waveTotal: 0, spawned: 0, defeated: 0, archerUnlocked: false, wavePlan: [], waveDifficulties: {},
    archerLevel: 0, archerCooldown: 0, arrows: [], volleyFx: 0, volleyDamage: 0, shake: 0,
    towerSlot: null, catapultUnlocked: false, catapultLevel: 0, catapultCooldown: 0, rocks: [], enemyShots: [], dust: [], notice: null, towerFx: 0,
    heroes: freshHeroes(), frontHero: 'legionary', supportHero: null, autoSpells: false, holdLine: 0, bashFx: 0, blessFx: 0, hornFx: 0, hintsSeen: [], trophies: 0, eagles: 0, systems: [], gear: [], gearDrops: 0, eliteKills: 0, temple: { mars: 0, ceres: 0, minerva: 0 },
    mobs: [], spawnTimer: 0.6, patrolTimer: 4, patrolSpawned: 0, foodTimer: 3, attackCooldown: 0, attackTimer: 0,
    hitFlash: 0, floaters: [], time: 0, last: 0,
    wavesCleared: 0, villageStage: 1, stageOverride: null, growthFx: 0, growthBanner: 0
  });
}

function upgradeLimit(kind) {
  if (kind === 'spikes') return state.wavesCleared < 3 ? 0 : state.townLevel * 2;
  if (kind === 'archer' || kind === 'catapult') return state.townLevel < 2 ? 0 : (state.townLevel - 1) * 5;
  return state.townLevel * 5;
}


function canUpgrade(kind) {
  if (!['guard', 'spikes', 'farm', 'archer', 'catapult'].includes(kind)) return false;
  return state.phase !== 'wave' && state[`${kind}Level`] < upgradeLimit(kind);
}


function collectKillReward(mob) {
  let reward = mob.reward;
  if (mob.countsForWave && systemUnlocked('armory') && (mob.type === 'troll' || mob.type === 'orcRed')) {
    state.eliteKills += 1;
    if (state.eliteKills % ELITE_DROP_EVERY === 0) {
      const item = dropGear(state.wave, false);
      state.floaters.push({ kind: 'gear', amount: gearName(item), x: mob.x, life: 1.8, duration: 1.8 });
    }
  }
  if (!mob.countsForWave) {
    state.patrolKills += 1;
    reward = GAME_DATA.waves.patrols.goldPerKill; // patrols are the steady gold drip between waves
  }
  state.coins += reward;
  if (reward > 0) {
    state.floaters.push({ kind: 'kill', amount: reward, x: mob.x, life: 1.35, duration: 1.35 });
    emit('sfx', { name: 'coin' });
  }
}

// Presentation timers run on real time, so banners stay readable at 2× and 100×.
function tickPresentation(delta) {
  state.growthFx = Math.max(0, state.growthFx - delta);
  state.growthBanner = Math.max(0, state.growthBanner - delta);
  if (state.notice) {
    state.notice.t -= delta;
    if (state.notice.t <= 0) state.notice = state.notice.next || null;
  }
  state.towerFx = Math.max(0, state.towerFx - delta);
  state.hornFx = Math.max(0, state.hornFx - delta);
  if (state.running) stats.playSeconds += delta;
}

function update(delta, width, simulationStep = false) {
  if (!state.running) return;
  if (!simulationStep) tickPresentation(delta);
  if (!simulationStep && state.speed > 1) {
    let remaining = delta * state.speed;
    while (remaining > 1e-9 && state.running) {
      const step = Math.min(remaining, COMBAT.simulation.fixedStep);
      update(step, width, true);
      remaining -= step;
    }
    return;
  }
  const dt = delta;
  state.time += dt;
  if (state.phase === 'wave') state.spawnTimer -= dt;
  const betweenWaves = state.phase !== 'wave';
  if (betweenWaves) state.patrolTimer -= dt;
  state.foodTimer -= dt;
  state.attackCooldown = Math.max(0, state.attackCooldown - dt);
  state.attackTimer = Math.max(0, state.attackTimer - dt);
  state.hitFlash = Math.max(0, state.hitFlash - dt);

  if (state.autoSpells && state.running) autoCastSpells(width);
  const nextStage = computeVillageStage();
  if (nextStage !== state.villageStage) {
    if (nextStage > state.villageStage) {
      state.growthFx = GROWTH_POP;
      showNotice('VILLAGE', 'YOUR VILLAGE GREW!', `Stage ${nextStage}: ${villageStages[nextStage]}`);
    }
    state.villageStage = nextStage;
  }
  for (const floater of state.floaters) floater.life -= dt;
  state.floaters = state.floaters.filter((floater) => floater.life > 0);

  const boost = GAME_DATA.waves.walkSpeed.openingBoost;
  const opening = state.wave <= boost.upToWave;
  const activeWaveMobs = state.mobs.filter(mob => mob.countsForWave && !mob.dead).length;
  const nextIsBoss = Boolean(enemyTypes[state.wavePlan[state.spawned]]?.isBoss);
  if (state.phase === 'wave' && state.spawned < state.waveTotal && state.spawnTimer <= 0
      && activeWaveMobs < (nextIsBoss ? 1 : maxConcurrent(state.wave))) {
    const nextType = state.wavePlan[state.spawned] || 'orc';
    spawnMob(nextType);
    if (enemyTypes[nextType]?.isBoss && state.notice?.kicker !== 'BOSS') {
      showNotice('BOSS', `${(wavePreviewNames[nextType] || 'Boss').toUpperCase()} APPEARS`, 'Hold the line and use your spells!');
      state.shake = Math.max(state.shake, 0.4);
      emit('sfx', { name: 'horn' });
    }
    state.spawned += 1;
    state.spawnTimer = GAME_DATA.waves.spawnIntervalSeconds;
  }
  const activePatrols = state.mobs.filter((mob) => !mob.countsForWave && !mob.dead).length;
  if (betweenWaves && state.patrolTimer <= 0 && activePatrols < 2) {
    const patrolType = state.wave >= 3 && state.patrolSpawned % 4 === 3 ? 'orcDual' : 'orc';
    spawnMob(patrolType, false);
    state.patrolSpawned += 1;
    state.patrolTimer = 8 + simRandom() * 4;
  }
  state.regenDelay = Math.max(0, state.regenDelay - dt);
  state.regenFlash = Math.max(0, state.regenFlash - dt);
  state.regenParticleTimer = Math.max(0, state.regenParticleTimer - dt);
  // Check after spawning: even an approaching patrol interrupts recovery.
  const combatActive = state.phase === 'wave' || state.mobs.some((mob) => !mob.dead);
  if (combatActive) {
    state.regenDelay = 0.35;
    state.regenFlash = 0;
    state.regenParticleTimer = 0;
    state.floaters = state.floaters.filter((floater) => floater.kind !== 'heal');
  } else if (state.regenDelay === 0 && state.guardHp < state.maxGuardHp) {
    // Recover only after the entire skirmish ends, in about two seconds.
    // Recovery is deliberately calm and readable: a full heal takes about four seconds.
    state.guardHp = Math.min(state.maxGuardHp, state.guardHp + state.maxGuardHp * GAME_DATA.economy.recovery.hpPerSecondShare * dt);
    state.regenFlash = 0.45;
    if (state.regenParticleTimer === 0) {
      for (const offset of [-32, 0, 32]) {
        state.floaters.push({ kind: 'heal', x: width * 0.52 + offset,
          offsetY: offset === 0 ? 18 : 0, life: 1.35, duration: 1.35 });
      }
      state.regenParticleTimer = 0.55;
    }
  }
  if (state.foodTimer <= 0) {
    const harvest = foodPerTick();
    state.food += harvest;
    state.floaters.push({ kind: 'food', amount: harvest, x: width * 0.84, life: 1.45, duration: 1.45 });
    state.foodTimer = GAME_DATA.economy.farm.tickSeconds;
  }

  const guardX = width * COMBAT.frontlineX;
  const mobSpeed = walkSpeed(state.wave);
  // Only blockers (not swarm, not ranged while the legionary stands) fight the legionary in melee.
  const charging = state.phase === 'wave' && state.time - stats.waveStartedAt > RANGED_PATIENCE;
  const blocks = (mob) => !traitsOf(mob.type).includes('swarm') && !(traitsOf(mob.type).includes('ranged') && state.guardHp > 0 && !charging);
  const frontline = state.mobs.reduce((lead, mob) => !mob.dead && blocks(mob) && (!lead || mob.x > lead.x) ? mob : lead, null);
  for (const mob of state.mobs) {
    mob.hit = Math.max(0, mob.hit - dt);
    mob.attackMotion = Math.max(0, (mob.attackMotion ?? 0) - dt);
    mob.attackCooldown = Math.max(0, mob.attackCooldown - dt);
    if (mob.dead) continue;
    // «Удар щитом»: a short shove back, then the enemy stands dazed.
    if (mob.knock > 0) {
      const shove = Math.min(mob.knock, 650 * dt);
      mob.x -= shove;
      mob.knock -= shove;
    }
    if (mob.stun > 0) {
      mob.stun = Math.max(0, mob.stun - dt);
      continue;
    }
    const traits = traitsOf(mob.type);
    if (traits.includes('aura') && !mob.dead) {
      mob.auraTimer -= dt;
      mob.auraFx = Math.max(0, mob.auraFx - dt);
      if (mob.auraTimer <= 0) {
        const amount = Math.ceil(COMBAT.aura.barrierPerWaveHp * (mob.countsForWave ? getWaveDifficulty(state.wave).hp : 1));
        for (const ally of state.mobs) {
          if (ally !== mob && !ally.dead && Math.abs(ally.x - mob.x) <= COMBAT.aura.radius) ally.barrier = Math.max(ally.barrier || 0, amount);
        }
        mob.auraTimer = COMBAT.aura.everySeconds;
        mob.auraFx = 0.7;
      }
    }
    // Safety net: after 90 s of a wave, archers give up their spot and charge (no endless waves).
    const archersCharge = state.phase === 'wave' && state.time - stats.waveStartedAt > RANGED_PATIENCE;
    const rangedNow = !mob.dead && traits.includes('ranged') && state.guardHp > 0 && !archersCharge;
    const holdX = guardX - ((enemyTypes[mob.type] || {}).range || 0) - (mob.formationX ?? 0);
    const attackX = guardX - COMBAT.melee.standOff - (mob.formationX ?? 0);
    const atGuard = blocks(mob) && state.guardHp > 0 && mob.x >= attackX;
    if (rangedNow && mob.x >= holdX) {
      mob.x = Math.min(mob.x, holdX);
      if (mob.attackCooldown <= 0) {
        state.enemyShots.push({ sx: mob.x + 18, laneY: mob.laneY ?? 0, t: 0, dur: COMBAT.projectiles.enemyArrowFlight, damage: mob.damage });
        emit('sfx', { name: 'arrow', option: true });
        mob.attackMotion = 0.32;
        mob.attackCooldown = mob.attackRate;
      }
    } else if (atGuard) {
      mob.x = Math.min(mob.x, attackX);
      if (mob === frontline && mob.attackCooldown <= 0) {
        const charge = traits.includes('charge') && !mob.charged;
        mob.charged = true;
        const enraged = traits.includes('enrage') && mob.hp < mob.maxHp * COMBAT.enrage.belowHpShare;
        hurtGuard((charge ? mob.damage * COMBAT.charge.firstHitMultiplier : mob.damage) * (enraged ? COMBAT.enrage.multiplier : 1), guardX);
        mob.attackMotion = 0.32;
        mob.attackCooldown = mob.attackRate;
      }
    } else {
      mob.x += mobSpeed * mob.speed * (opening ? boost.factor : 1) * dt;
    }

    if (state.spikesLevel > 0 && !mob.dead && mob.x >= guardX - COMBAT.spikes.zone[0] && mob.x <= guardX - COMBAT.spikes.zone[1]) {
      mob.spikesCooldown = Math.max(0, (mob.spikesCooldown ?? 0) - dt);
      if (mob.spikesCooldown <= 0) {
        mob.spikesCooldown = 0.75;
        const dealt = damageMob(mob, state.spikesLevel, 'contact');
        state.floaters.push({ kind: 'spikes', amount: Math.round(dealt * 10) / 10, x: mob.x, life: 0.9, duration: 0.9 });
      }
    }
  }

  const target = state.mobs.reduce((lead, mob) => (
    !mob.dead && mob.x > guardX - COMBAT.melee.reachFar && mob.x < guardX - COMBAT.melee.reachNear && (!lead || mob.x > lead.x) ? mob : lead
  ), null);
  if (state.guardHp > 0 && target && state.attackCooldown <= 0) {
    damageMob(target, state.guardLevel * heroDefs[state.frontHero].damageMult * heroDamageMult(state.frontHero), 'melee');
    emit('sfx', { name: 'sword' });
    state.attackTimer = 0.28;
    state.hitFlash = 0.14;
    state.attackCooldown = guardAttackInterval(state.guardLevel);
  }

  updateDefenders(dt, width);

  state.mobs = state.mobs.filter((mob) => {
    if (mob.dead) return mob.hit > 0;
    if (mob.x > guardX + COMBAT.slipPastAt) {
      // Mark it gone so arrows or rocks already in flight cannot count it twice.
      mob.dead = true;
      mob.hit = 0;
      if (mob.countsForWave) state.defeated += 1;
      stealLoot(mob, width);
      return false;
    }
    return mob.x < width + 120;
  });
  if (state.phase === 'wave' && state.guardHp <= 0) failWave();
  else if (state.phase === 'wave' && state.spawned === state.waveTotal && state.defeated === state.waveTotal && state.mobs.length === 0) finishWave();
}
