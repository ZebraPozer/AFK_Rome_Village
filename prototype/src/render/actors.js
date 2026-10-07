'use strict';
// Hero (gold-crested centurion) and archer on the tower platform.
const LOW_HP = 0.35;

// Canvas panels share the HUD look: one translucent surface, no outlines.
const HUD_SURFACE = 'rgba(22, 28, 24, 0.72)';
const HUD_TEXT = '#f4eedb';
const HUD_MUTED = '#b8b39f';
const HUD_ACCENT = '#e8bf55';

function heroPosition(width, height) {
  const { towerX, platformY } = towerGeometry(width, height);
  return { x: towerX - 24, y: platformY };
}

function drawBow(x, y, drawn) {
  ctx.beginPath(); ctx.arc(x, y, 20, -1.25, 1.25); strokeInk(4.5);
  ctx.beginPath(); ctx.arc(x, y, 20, -1.25, 1.25); ctx.strokeStyle = '#a8693a'; ctx.lineWidth = 2.5; ctx.stroke();
  const pull = drawn ? 9 : 0;
  ctx.beginPath();
  ctx.moveTo(x + 20 * Math.cos(-1.25), y + 20 * Math.sin(-1.25));
  ctx.lineTo(x + 6 - pull, y);
  ctx.lineTo(x + 20 * Math.cos(1.25), y + 20 * Math.sin(1.25));
  ctx.strokeStyle = '#f3ead2'; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawTowerDefenders(width, height) {
  const { towerX, platformY } = towerGeometry(width, height);
  const size = Math.min(104, height * 0.21) * ACTOR_SCALE;
  if (state.towerSlot === 'catapult') drawCatapult(towerX - 30, platformY);
  if (state.towerSlot === 'archer') {
    const archerX = towerX - 24;
    const drawn = state.archerCooldown > archerInterval(state.archerLevel) - 0.18;
    const recoil = drawn ? 3 : 0;
    drawSprite(sprites.archer, archerX + recoil, platformY, size * 1.18, false, Math.sin(state.time * 2) * -1);
  }
}

// Cooldown ring above a hero; pulses when the spell is ready to use.
function drawSpellBadge(id, bx, by) {
  const spell = heroDefs[id].spell;
  if (!spell) return;
  const cd = state.heroes[id].cd;
  const ready = cd <= 0;
  const usable = !spellBlocked(id);
  const pulse = usable ? 1 + Math.sin(state.time * 6) * 0.08 : 1;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(pulse, pulse);
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); fillInk(ready ? '#ffcf4a' : '#5b4a3c', 3);
  if (!ready) {
    const progress = 1 - cd / spell.cooldown;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 14, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2); ctx.closePath();
    ctx.fillStyle = '#c9a34488'; ctx.fill();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = ready ? '900 16px system-ui, sans-serif' : '800 12px system-ui, sans-serif';
  ctx.fillStyle = ready ? '#5a321a' : '#fff3d2';
  ctx.fillText(ready ? spell.icon : Math.ceil(cd), 0, 1);
  ctx.restore();
  if (usable && state.phase === 'wave') {
    ctx.save();
    ctx.font = '900 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
    const label = spell.name.toUpperCase() + '!';
    ctx.strokeText(label, bx, by - 26); ctx.fillStyle = '#ffcf4a'; ctx.fillText(label, bx, by - 26);
    ctx.restore();
  }
}

function supportPosition(width, height) {
  const { towerX, ground } = towerGeometry(width, height);
  return { x: towerX + 58, y: ground + 4 };
}

function drawSupportHero(width, height) {
  if (state.supportHero !== 'priestess') return;
  const pos = supportPosition(width, height);
  const size = Math.min(118, height * 0.23) * ACTOR_SCALE;
  drawSprite(tinted(sprites.archer, 'hue-rotate(190deg) saturate(0.7) brightness(1.15)'), pos.x, pos.y, size, true, Math.sin(state.time * 1.8) * -1.2);
  // Halo marks her as a healer until she gets her own sprite.
  ctx.save();
  ctx.globalAlpha = 0.75 + Math.sin(state.time * 3) * 0.15;
  ctx.beginPath(); ctx.ellipse(pos.x, pos.y - size - 4, 15, 5, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}

function drawFrontHero(width, height, guardX, ground) {
  const size = Math.min(160, height * 0.32) * ACTOR_SCALE;
  const low = state.phase === 'wave' && state.guardHp > 0 && state.guardHp / state.maxGuardHp < LOW_HP;
  const base = state.frontHero === 'hoplite' ? tinted(sprites.guard, 'sepia(0.55) saturate(1.5) hue-rotate(-12deg)') : sprites.guard;
  const tremble = low ? Math.sin(state.time * 38) * 1.6 : 0;
  const bob = Math.sin(state.time * 2.4) * -1.2;
  drawSprite(base, guardX + tremble, ground, size, true, bob);
  // Low HP: a pulsing red copy on top (cheap, no per-frame filter).
  if (low) drawSprite(tinted(base, 'sepia(1) saturate(6) hue-rotate(-50deg) brightness(0.9)'), guardX + tremble, ground, size, true, bob, 0.25 + 0.3 * Math.abs(Math.sin(state.time * 7)), 0, 0);
  if (state.frontHero === 'hoplite') {
    // Tall crest so the hoplite reads differently from the legionary.
    ctx.save();
    ctx.beginPath(); ctx.ellipse(guardX + tremble + 4, ground - size * 0.98, 22, 9, -0.2, Math.PI, 0);
    fillInk('#c0392b', 2.5);
    ctx.restore();
  }
  if (state.holdLine > 0) {
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(state.time * 10);
    ctx.beginPath(); ctx.ellipse(guardX, ground - size * 0.5, size * 0.42, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd34d33'; ctx.fill();
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  }
  if (state.blessFx > 0) {
    ctx.save();
    ctx.globalAlpha = state.blessFx / 0.8;
    const beam = ctx.createLinearGradient(0, 0, 0, ground);
    beam.addColorStop(0, '#fff6c800'); beam.addColorStop(1, '#b8ffb0aa');
    ctx.fillStyle = beam;
    ctx.fillRect(guardX - 46, 0, 92, ground);
    ctx.restore();
  }
  if (state.bashFx > 0) {
    const p = 1 - state.bashFx / 0.4;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.beginPath(); ctx.arc(guardX - 50, ground - 60, 20 + p * 70, Math.PI * 0.6, Math.PI * 1.4);
    ctx.strokeStyle = '#fff3bd'; ctx.lineWidth = 7 * (1 - p) + 2; ctx.stroke();
    ctx.restore();
  }
}

// Between waves the next attackers wait at the forest edge: the threat is always in view.
function drawLurkingHorde(width, height) {
  if (state.phase === 'wave' || state.phase === 'complete') return;
  if (state.phase === 'victory' && state.townLevel < requiredTown(state.wave + 1)) return;
  const nextWave = state.phase === 'victory' ? state.wave + 1 : state.wave;
  const plan = buildWavePlan(nextWave);
  const ground = height * GROUND_RATIO;
  // The next wave waits at the very edge of the screen, half hidden in drifting fog.
  // Real colours (no black silhouettes) so it reads as "orcs waiting", not a bug.
  plan.forEach((type, i) => {
    const stats = enemyTypes[type] || enemyTypes.orc;
    const look = enemyLooks[type] || {};
    const x = 8 + i * 20 + (stats.isBoss ? 26 : 0);
    const y = ground + 4 - (i % 2) * 9;
    const h = Math.min(stats.height, height * (stats.height / 510)) * 0.8 * ACTOR_SCALE;
    const sway = Math.sin(state.time * 1.4 + i * 1.3) * 3;
    drawSprite(tinted(enemySprite(type), `${look.filter || ''} saturate(0.75) brightness(0.92)`.trim()), x + sway, y, h, false, 0, 0.9, 0, 0);
  });
  drawEdgeFog(height, ground);
}

// Soft fog banks over the left edge; puffs drift and breathe slowly.
function drawEdgeFog(height, ground) {
  ctx.save();
  // Elliptical fog bank: fades out in every direction, no hard edges.
  ctx.save();
  ctx.translate(0, ground - 60);
  ctx.scale(1.35, 1);
  const wall = ctx.createRadialGradient(0, 0, 0, 0, 0, 175);
  wall.addColorStop(0, 'rgba(236, 240, 232, 0.6)');
  wall.addColorStop(0.5, 'rgba(236, 240, 232, 0.3)');
  wall.addColorStop(1, 'rgba(236, 240, 232, 0)');
  ctx.fillStyle = wall;
  ctx.beginPath(); ctx.arc(0, 0, 175, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  for (let i = 0; i < 9; i++) {
    const t = state.time * (0.12 + (i % 3) * 0.04) + i * 1.7;
    const px = 20 + (i * 37) % 170 + Math.sin(t) * 18;
    const py = ground - 20 - (i * 29) % 150 + Math.cos(t * 0.8) * 6;
    const r = 46 + (i % 4) * 14 + Math.sin(t * 1.3) * 5;
    const puff = ctx.createRadialGradient(px, py, 0, px, py, r);
    const a = 0.32 - (px / 230) * 0.18;
    puff.addColorStop(0, `rgba(245, 247, 242, ${a})`);
    puff.addColorStop(1, 'rgba(245, 247, 242, 0)');
    ctx.fillStyle = puff;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Red edges and a heartbeat pulse when the frontline hero is about to fall.
function drawDangerOverlay(width, height) {
  const ratio = state.guardHp / state.maxGuardHp;
  let strength = 0;
  if (state.phase === 'wave' && state.guardHp > 0 && ratio < LOW_HP) {
    const beat = Math.pow(Math.max(0, Math.sin(state.time * 5.2)), 6);
    strength = 0.22 + (1 - ratio / LOW_HP) * 0.4 + beat * 0.25;
  }
  if (state.hornFx > 0) strength = Math.max(strength, (state.hornFx / HORN_TIME) * 0.35);
  if (strength <= 0.01) return;
  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.25, width / 2, height / 2, width * 0.58);
  vignette.addColorStop(0, '#b0181800');
  vignette.addColorStop(1, `rgba(150, 18, 18, ${Math.min(0.75, strength)})`);
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  if (state.hornFx > 0) {
    const p = 1 - state.hornFx / HORN_TIME;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - p) * 2);
    ctx.font = '700 20px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const text = `WAVE ${state.wave} · ORCS INCOMING`;
    const slot = bannerSlot(width);
    const ty = slot.y - p * 8;
    const w = ctx.measureText(text).width + 40;
    roundedRect(slot.x - w / 2, ty - 22, w, 44, HUD_R, BANNER_SURFACE);
    ctx.fillStyle = HUD_ACCENT; ctx.fillText(text, slot.x, ty + 1);
    ctx.restore();
  }
}

function drawArrowShape(x, y, angle, length = 24) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(-length / 2, 0); ctx.lineTo(length / 2, 0); strokeInk(3.5);
  ctx.beginPath(); ctx.moveTo(-length / 2, 0); ctx.lineTo(length / 2, 0); ctx.strokeStyle = '#c58a4f'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(length / 2 + 6, 0); ctx.lineTo(length / 2 - 2, -4); ctx.lineTo(length / 2 - 2, 4); ctx.closePath();
  fillInk('#d9d4c7', 1.5);
  ctx.beginPath(); ctx.moveTo(-length / 2, 0); ctx.lineTo(-length / 2 - 5, -4); ctx.lineTo(-length / 2 + 3, 0); ctx.lineTo(-length / 2 - 5, 4); ctx.closePath();
  fillInk('#e2574c', 1.2);
  ctx.restore();
}

function arrowTarget(mob, height) {
  return { x: mob.x, y: height * GROUND_RATIO + 18 + (mob.laneY ?? 0) - 62 * ACTOR_SCALE };
}

function drawArrows(height) {
  for (const arrow of state.arrows) {
    const p = Math.min(1, arrow.t / arrow.dur);
    const target = arrowTarget(arrow.mob, height);
    const arc = 70;
    const x = arrow.sx + (target.x - arrow.sx) * p;
    const y = arrow.sy + (target.y - arrow.sy) * p - Math.sin(p * Math.PI) * arc;
    const dx = target.x - arrow.sx;
    const dy = target.y - arrow.sy - Math.cos(p * Math.PI) * Math.PI * arc;
    drawArrowShape(x, y, Math.atan2(dy, dx));
  }
}

function drawVolley(width, height) {
  if (state.volleyFx <= 0) return;
  const guardX = width * 0.52;
  const [from, to] = VOLLEY_ZONE;
  const elapsed = VOLLEY_FALL - state.volleyFx;
  const groundY = height * GROUND_RATIO + 20;
  // Danger zone marker on the road.
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.15 * Math.sin(elapsed * 30);
  ctx.beginPath(); ctx.ellipse(guardX + (from + to) / 2, groundY + 6, (to - from) / 2, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffcf4a'; ctx.fill();
  ctx.restore();
  for (let i = 0; i < 26; i++) {
    const delay = (i % 7) * 0.035;
    const p = Math.max(0, Math.min(1, (elapsed - delay) / (VOLLEY_FALL - 0.26)));
    if (p <= 0) continue;
    const x = guardX + from + ((i * 53) % (to - from)) + (1 - p) * 60;
    const endY = groundY - 10 + (i % 4) * 10;
    const y = -30 - (i % 5) * 26 + (endY + 30 + (i % 5) * 26) * p;
    drawArrowShape(x, y, Math.PI * 0.5 + 0.35, 26);
  }
}

function drawBoar(x, groundY, scale, phase) {
  const trot = Math.sin(state.time * 14 + phase) * 3;
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(scale, scale);
  for (const [lx, off] of [[-22, 0], [-10, Math.PI], [12, Math.PI], [24, 0]]) {
    ctx.beginPath(); ctx.roundRect(lx - 4, -18 + Math.sin(state.time * 14 + phase + off) * 2, 8, 18, 3); fillInk('#5e3b25', 2.5);
  }
  ctx.beginPath(); ctx.ellipse(0, -30 + trot * 0.3, 38, 20, 0, 0, Math.PI * 2); fillInk('#8a5a3a');
  ctx.fillStyle = '#6e4529';
  ctx.beginPath(); ctx.moveTo(-26, -46); ctx.lineTo(-14, -54); ctx.lineTo(-2, -48); ctx.lineTo(10, -55); ctx.lineTo(20, -47); ctx.lineTo(26, -40); ctx.lineTo(-30, -38); ctx.fill();
  // Head faces right (towards the village).
  ctx.save(); ctx.translate(38, -30 + trot * 0.3);
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 13, 0.2, 0, Math.PI * 2); fillInk('#8a5a3a');
  ctx.beginPath(); ctx.ellipse(13, 4, 7, 6, 0, 0, Math.PI * 2); fillInk('#c98f76', 2);
  ctx.beginPath(); ctx.moveTo(8, 8); ctx.quadraticCurveTo(16, 2, 14, -8); strokeInk(4);
  ctx.beginPath(); ctx.moveTo(8, 8); ctx.quadraticCurveTo(16, 2, 14, -8); ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(2, -4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-4, -20); ctx.lineTo(0, -10); fillInk('#6e4529', 2);
  ctx.restore();
  ctx.restore();
}

function drawEnemy(mob, x, groundY, height, bob, opacity, shadowScale) {
  const look = enemyLooks[mob.type] || {};
  const sprite = enemySprite(mob.type);
  if (look.prop === 'boar') {
    drawShadow(x, groundY + 2, 96, 0.14);
    ctx.save(); ctx.globalAlpha = opacity;
    drawBoar(x, groundY + bob * 0.5, 1, mob.bob);
    ctx.restore();
    // Rider sits on the boar's back.
    drawSprite(tinted(sprite, look.filter), x - 4, groundY - 36 + bob, height * 0.78, false, 0, opacity, 0, 0);
  } else {
    drawSprite(tinted(sprite, look.filter), x, groundY, height, false, bob, opacity, shadowScale, 0.11);
  }
  ctx.save();
  ctx.globalAlpha = opacity;
  if (look.prop === 'bow') {
    const drawn = mob.attackMotion > 0;
    drawBow(x + 26, groundY - height * 0.52 + bob, drawn);
  }
  if (look.prop === 'staff') {
    const sx = x + 34;
    const sy = groundY + bob;
    ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 6, sy - height * 0.95); strokeInk(5);
    ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 6, sy - height * 0.95); ctx.strokeStyle = '#8c552c'; ctx.lineWidth = 3; ctx.stroke();
    const glow = 0.6 + Math.sin(state.time * 5) * 0.2 + mob.auraFx;
    ctx.save(); ctx.shadowColor = '#7fc4ff'; ctx.shadowBlur = 14 * glow;
    ctx.beginPath(); ctx.arc(sx + 6, sy - height * 0.95 - 8, 9, 0, Math.PI * 2); fillInk('#9fd0ff', 2.5);
    ctx.restore();
  }
  // Shaman pulse and barrier bubbles.
  if (mob.auraFx > 0) {
    const p = 1 - mob.auraFx / 0.7;
    ctx.globalAlpha = opacity * (1 - p) * 0.7;
    ctx.beginPath(); ctx.ellipse(x, groundY - height * 0.5, 40 + p * 200, 20 + p * 60, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#9fd0ff'; ctx.lineWidth = 4; ctx.stroke();
  }
  if (mob.barrier > 0 && !mob.dead) {
    ctx.globalAlpha = opacity * (0.35 + Math.sin(state.time * 4 + mob.bob) * 0.08);
    ctx.beginPath(); ctx.ellipse(x, groundY - height * 0.5, height * 0.42, height * 0.56, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7fc4ff55'; ctx.fill();
    ctx.strokeStyle = '#bfe4ff'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  if (mob.stun > 0 && !mob.dead) {
    ctx.globalAlpha = opacity;
    ctx.font = '900 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const a = state.time * 6 + i * (Math.PI * 2 / 3);
      const sx = x + Math.cos(a) * 22;
      const sy = groundY - height - 4 + Math.sin(a) * 6;
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeText('★', sx, sy);
      ctx.fillStyle = '#ffe066'; ctx.fillText('★', sx, sy);
    }
  }
  ctx.restore();
}

function drawCatapult(x, baseY) {
  const recoil = state.catapultCooldown > catapultInterval(state.catapultLevel) - 0.35;
  const loaded = state.catapultCooldown < 0.6;
  ctx.save();
  ctx.translate(x, baseY);
  // Frame and wheels.
  ctx.beginPath(); ctx.roundRect(-34, -22, 68, 12, 4); fillInk('#a8693a');
  for (const wx of [-22, 22]) {
    ctx.beginPath(); ctx.arc(wx, -8, 10, 0, Math.PI * 2); fillInk('#7b4a2b');
    ctx.beginPath(); ctx.arc(wx, -8, 3, 0, Math.PI * 2); fillInk('#d9b07a', 1.5);
  }
  ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(4, -58); ctx.lineTo(14, -22); ctx.closePath(); fillInk('#b77a43');
  // Throwing arm: upright right after a shot, pulled back while reloading.
  const angle = recoil ? -0.25 : loaded ? -1.25 : -1.25 + (1 - state.catapultCooldown / catapultInterval(state.catapultLevel)) * 0.2;
  ctx.save();
  ctx.translate(4, -50);
  ctx.rotate(angle);
  ctx.beginPath(); ctx.roundRect(-4, -58, 8, 66, 3); fillInk('#c58a4f', 2.5);
  ctx.beginPath(); ctx.arc(0, -60, 9, 0, Math.PI); fillInk('#7b4a2b', 2.5);
  if (!recoil) { ctx.beginPath(); ctx.arc(0, -64, 7, 0, Math.PI * 2); fillInk('#9a9488', 2.5); }
  ctx.restore();
  ctx.restore();
}

function drawRocksAndShots(height) {
  const ground = height * GROUND_RATIO;
  for (const rock of state.rocks) {
    const p = Math.min(1, rock.t / rock.dur);
    const ty = ground + 18 + rock.laneY - 30;
    const x = rock.sx + (rock.tx - rock.sx) * p;
    const y = rock.sy + (ty - rock.sy) * p - Math.sin(p * Math.PI) * 150;
    ctx.save(); ctx.translate(x, y); ctx.rotate(state.time * 8);
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, 0.3, 0, Math.PI * 2); fillInk('#9a9488', 2.5);
    ctx.fillStyle = '#c4beb0'; ctx.beginPath(); ctx.ellipse(-3, -3, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const puff of state.dust) {
    const p = puff.t / 0.6;
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - p);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(puff.x + Math.cos(a) * (14 + p * 46), ground + 18 + puff.laneY - 14 + Math.sin(a) * (6 + p * 14) - p * 10, 9 + p * 10, 0, Math.PI * 2);
      ctx.fillStyle = '#e8dcc0'; ctx.fill();
    }
    ctx.restore();
  }
  for (const shot of state.enemyShots) {
    const p = Math.min(1, shot.t / shot.dur);
    const sy = ground + 18 + shot.laneY - 64;
    const tx = 1170 * 0.52 - 10;
    const ty = ground - 80;
    const x = shot.sx + (tx - shot.sx) * p;
    const y = sy + (ty - sy) * p - Math.sin(p * Math.PI) * 40;
    const dy = (ty - sy) - Math.cos(p * Math.PI) * Math.PI * 40;
    drawArrowShape(x, y, Math.atan2(dy, tx - shot.sx), 20);
  }
}
