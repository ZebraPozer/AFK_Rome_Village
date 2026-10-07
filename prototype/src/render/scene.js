'use strict';
function drawScene(width, height) {
  drawBackground(width, height);
  drawForegroundFoliage(width, height);
  if (!sprites.guard || !sprites.orc || !sprites.orcDual || !sprites.orcShield || !sprites.orcRed || !sprites.boss || !sprites.farmer || !structures.guardTower) return;
  const towerBuilt = state.archerUnlocked;
  const ground = height * GROUND_RATIO;
  // The tower stands right behind the legionary so the village gets the right third of the screen.
  const towerX = width * 0.6;
  const towerHeight = Math.min(300, height * 0.64) * ACTOR_SCALE;
  const village = (draw) => {
    ctx.save();
    ctx.translate(width * 0.98, ground); ctx.scale(ACTOR_SCALE, ACTOR_SCALE); ctx.translate(-width * 0.98, -ground);
    draw();
    ctx.restore();
  };
  village(() => drawVillageBack(width, ground));
  if (towerBuilt) {
    const pop = state.towerFx > 0 ? Math.max(0.01, easeOutBack(1 - state.towerFx / TOWER_POP)) : 1;
    ctx.save();
    ctx.translate(towerX, ground + 8);
    ctx.scale(pop, pop);
    ctx.translate(-towerX, -(ground + 8));
    drawStructure(structures.guardTower, towerX, ground + 8, towerHeight);
    ctx.restore();
  }
  village(() => { drawVillageFront(width, ground); drawVillageFields(width, ground); drawVillageVillagers(width, ground); });
  const farmerDirection = Math.cos(state.time * 0.65) < 0;
  // The farmer works among the field beds on the village side, away from the line.
  const farmerX = width * 0.855 + Math.sin(state.time * 0.65) * Math.min(25, width * 0.02);
  const farmerBob = Math.abs(Math.sin(state.time * 2.6)) * -2;
  village(() => drawSprite(sprites.farmer, farmerX, ground - 8, Math.min(134, height * 0.27), farmerDirection, farmerBob));

  if (state.spikesLevel > 0 && sprites.spikes) {
    const spikesHeight = Math.min(105 + (state.spikesLevel - 1) * 5, 125) * ACTOR_SCALE;
    drawSprite(sprites.spikes, width * 0.435, ground - 16, spikesHeight, false, 0, 1, 0.84, 0.14);
  }

  drawLurkingHorde(width, height);
  const mobsByDepth = [...state.mobs].sort((a, b) => (a.laneY ?? 0) - (b.laneY ?? 0));
  for (const mob of mobsByDepth) {
    const bob = Math.abs(Math.sin(state.time * 7 + mob.bob)) * -4;
    const mobGround = ground + 18 + (mob.laneY ?? 0);
    const attackProgress = mob.attackMotion > 0 ? 1 - mob.attackMotion / 0.32 : 0;
    const attackShiftX = mob.attackMotion > 0 ? Math.sin(attackProgress * Math.PI) * 14 : 0;
    const drawX = mob.x + attackShiftX;
    const opacity = mob.hit > 0 ? Math.max(0, mob.hit / 0.18) : 1;
    const typeStats = enemyTypes[mob.type] || enemyTypes.orc;
    // Class controls silhouette size: dual-wielders are 10% below the
    // standard orc, while the boss is 20% above it.
    const classHeight = typeStats.height;
    const mobHeight = Math.min(classHeight, height * (classHeight / 510)) * ACTOR_SCALE;

    const shadowScale = Math.max(0.42, Math.min(0.58, 0.42 + (mobHeight - 112) / 480));
    drawEnemy(mob, drawX, mobGround, mobHeight, bob, opacity, shadowScale);
    if (!mob.dead) {
      const barWidth = Math.round(Math.max(48, Math.min(72, 48 + (mobHeight - 112) * 0.31)));
      roundedRect(drawX - barWidth / 2, mobGround - mobHeight - 18, barWidth, 6, 3, '#443d36aa');
      roundedRect(drawX - barWidth / 2, mobGround - mobHeight - 18, barWidth * Math.max(0, mob.hp) / mob.maxHp, 6, 3, typeStats.bar);
      if (mob.barrier > 0) roundedRect(drawX - barWidth / 2, mobGround - mobHeight - 25, barWidth * Math.min(1, mob.barrier / mob.maxHp), 4, 2, '#7fc4ff');
      ctx.strokeStyle = '#2c241f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(drawX - barWidth / 2, mobGround - mobHeight - 18, barWidth, 6, 3);
      ctx.stroke();
    }
  }

  const attackProgress = state.attackTimer > 0 ? Math.sin((1 - state.attackTimer / 0.28) * Math.PI) : 0;
  const guardX = width * 0.52 - attackProgress * 15;
  drawFrontHero(width, height, guardX, ground);
  drawGuardHealthBar(width * 0.52, ground + 10);

  if (towerBuilt && state.towerFx <= 0) drawTowerDefenders(width, height);
  drawSupportHero(width, height);
  drawArrows(height);
  drawVolley(width, height);
  drawRocksAndShots(height);

  if (state.hitFlash > 0) {
    ctx.save();
    ctx.strokeStyle = '#fff3bd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guardX - 50, ground - 105); ctx.lineTo(guardX - 88, ground - 54);
    ctx.moveTo(guardX - 38, ground - 97); ctx.lineTo(guardX - 78, ground - 44);
    ctx.stroke();
    ctx.restore();
  }
  drawDangerOverlay(width, height);
  drawWaveRoster(width);
  drawBossBar(width);
  drawFloaters(height);
  drawActBanner(width);
}
