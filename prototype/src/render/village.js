'use strict';
// Elements introduced by the current stage pop in with a bounce.
function growthScale(introducedAt) {
  if (introducedAt !== state.villageStage || state.growthFx <= 0) return 1;
  return Math.max(0.01, easeOutBack(1 - state.growthFx / GROWTH_POP));
}

function placed(x, baseY, scale, introducedAt, draw) {
  const pop = growthScale(introducedAt);
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale * pop, scale * (pop < 1 ? Math.min(1.12, pop * 1.06) : 1));
  draw();
  ctx.restore();
}

function drawWarmWindow(x, y, w, h) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, [w / 2, w / 2, 3, 3]);
  fillInk('#ffd56e', 2.5);
  ctx.fillStyle = '#ffeeb0';
  ctx.beginPath(); ctx.roundRect(x + 3, y + 4, w * 0.35, h * 0.45, 3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + 2); ctx.lineTo(x + w / 2, y + h); strokeInk(2);
}

function drawTileRoof(halfBottom, halfTop, height, color, shade, light) {
  ctx.beginPath();
  ctx.moveTo(-halfBottom, 0);
  ctx.lineTo(-halfTop, -height);
  ctx.quadraticCurveTo(0, -height - 8, halfTop, -height);
  ctx.lineTo(halfBottom, 0);
  ctx.quadraticCurveTo(0, 6, -halfBottom, 0);
  fillInk(color);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = shade;
  ctx.lineWidth = 2.5;
  for (let row = 1; row < 4; row++) {
    const y = -height * row / 4;
    ctx.beginPath();
    for (let x = -halfBottom; x < halfBottom; x += 14) {
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 7, y + 6, x + 14, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = light;
  ctx.fillRect(-halfBottom, -height - 10, halfBottom * 2, 9);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-halfBottom, 0);
  ctx.lineTo(-halfTop, -height);
  ctx.quadraticCurveTo(0, -height - 8, halfTop, -height);
  ctx.lineTo(halfBottom, 0);
  ctx.quadraticCurveTo(0, 6, -halfBottom, 0);
  strokeInk(3);
}

function drawSmoke(x, y) {
  for (let i = 0; i < 3; i++) {
    const phase = (state.time * 0.45 + i / 3) % 1;
    ctx.globalAlpha = 0.65 * (1 - phase);
    ctx.fillStyle = '#f6f1e6';
    ctx.beginPath();
    ctx.arc(x + Math.sin(phase * 5 + i) * 5, y - phase * 46, 5 + phase * 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Stage 1 — plank hut on a stone footing with a layered thatch roof.
function drawHut() {
  // Woodpile leaning on the right wall.
  for (const [lx, ly] of [[48, -7], [61, -7], [74, -7], [54.5, -18], [67.5, -18], [61, -29]]) {
    ctx.beginPath(); ctx.arc(lx, ly, 5.5, 0, Math.PI * 2); fillInk('#e3b77a', 2);
    ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2); ctx.strokeStyle = '#b07a43'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  // Plank walls.
  ctx.beginPath(); ctx.roundRect(-50, -66, 100, 58, 5); fillInk('#cf8f4e');
  ctx.save();
  ctx.beginPath(); ctx.roundRect(-50, -66, 100, 58, 5); ctx.clip();
  ctx.fillStyle = '#b07038'; ctx.fillRect(28, -66, 22, 58);
  ctx.strokeStyle = '#a2652f'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const py of [-52, -38, -24]) { ctx.moveTo(-50, py); ctx.lineTo(50, py); }
  ctx.stroke();
  ctx.fillStyle = '#e2a865';
  ctx.fillRect(-48, -64, 76, 4);
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(-50, -66, 100, 58, 5); strokeInk(3);
  // Corner posts.
  for (const px of [-50, 46]) { ctx.beginPath(); ctx.roundRect(px - 2, -68, 8, 62, 3); fillInk('#8c552c', 2.5); }
  // Stone footing.
  ctx.beginPath(); ctx.roundRect(-56, -12, 112, 14, 6); fillInk('#b9ad97');
  ctx.fillStyle = '#d6ccb6';
  for (const sx of [-44, -18, 10, 36]) { ctx.beginPath(); ctx.ellipse(sx, -7, 9, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#8f846f'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const sx of [-31, -4, 23]) { ctx.moveTo(sx, -11); ctx.lineTo(sx, 1); }
  ctx.stroke();
  // Door with frame, planks and a step.
  ctx.beginPath(); ctx.roundRect(-17, -50, 34, 40, [17, 17, 0, 0]); fillInk('#8c552c', 2.5);
  ctx.beginPath(); ctx.roundRect(-13, -46, 26, 36, [13, 13, 0, 0]); fillInk('#6e3f22', 2);
  ctx.strokeStyle = '#5a321a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-4, -44); ctx.lineTo(-4, -10); ctx.moveTo(5, -44); ctx.lineTo(5, -10); ctx.stroke();
  ctx.beginPath(); ctx.arc(8, -26, 2, 0, Math.PI * 2); ctx.fillStyle = '#f0c35a'; ctx.fill();
  ctx.beginPath(); ctx.roundRect(-20, -4, 40, 6, 3); fillInk('#a79a82', 2);
  // Window with shutters.
  ctx.beginPath(); ctx.roundRect(-46, -56, 7, 22, 2); fillInk('#5f8a3e', 2);
  ctx.beginPath(); ctx.roundRect(-23, -56, 7, 22, 2); fillInk('#5f8a3e', 2);
  drawWarmWindow(-39, -56, 16, 22);
  // Layered thatch: back mass, scalloped fringe, highlight strands.
  ctx.beginPath();
  ctx.moveTo(-70, -56);
  ctx.quadraticCurveTo(-38, -112, 0, -124);
  ctx.quadraticCurveTo(38, -112, 70, -56);
  ctx.quadraticCurveTo(0, -66, -70, -56);
  fillInk('#e2ad48');
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#c99436';
  ctx.beginPath(); ctx.moveTo(20, -120); ctx.quadraticCurveTo(48, -100, 72, -56); ctx.lineTo(30, -60); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#b5832e'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const t of [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]) { ctx.moveTo(t * 34, -114 + Math.abs(t) * 34); ctx.lineTo(t * 76, -60); }
  ctx.stroke();
  ctx.strokeStyle = '#f7d77f'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const t of [-0.62, -0.37, -0.12]) { ctx.moveTo(t * 30, -108 + Math.abs(t) * 30); ctx.lineTo(t * 54, -82); }
  ctx.stroke();
  ctx.restore();
  // Scalloped eave fringe.
  ctx.beginPath();
  ctx.moveTo(-72, -58);
  for (let x = -72; x < 72; x += 12) ctx.quadraticCurveTo(x + 6, -46, x + 12, -58 + (x > -10 && x < 10 ? 0 : 0));
  ctx.quadraticCurveTo(0, -68, -72, -58);
  fillInk('#d49b3c', 2.5);
  // Ridge binding.
  ctx.beginPath(); ctx.ellipse(0, -122, 12, 5, 0, 0, Math.PI * 2); fillInk('#b5832e', 2.5);
  ctx.fillStyle = '#fbe6a4';
  ctx.beginPath(); ctx.ellipse(-22, -98, 13, 4.5, -0.55, 0, Math.PI * 2); ctx.fill();
  drawSmoke(26, -128);
}

// Stage 2 — plastered farmhouse with timber frame and tile roof.
function drawHouse() {
  ctx.beginPath(); ctx.roundRect(-58, -78, 116, 78, 5); fillInk('#f3e0b8');
  ctx.fillStyle = '#dcc196'; ctx.fillRect(34, -75, 21, 72);
  ctx.strokeStyle = '#7b4a2b'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-56, -40); ctx.lineTo(56, -40);
  ctx.moveTo(-30, -76); ctx.lineTo(-30, -2);
  ctx.moveTo(30, -76); ctx.lineTo(30, -2);
  ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-58, -78, 116, 78, 5); strokeInk(3);
  ctx.beginPath(); ctx.roundRect(-14, -38, 28, 38, [14, 14, 0, 0]); fillInk('#7a4425');
  drawWarmWindow(-50, -70, 16, 22);
  drawWarmWindow(36, -70, 16, 22);
  drawWarmWindow(-8, -72, 16, 22);
  // Chimney sits behind the roof line.
  ctx.beginPath(); ctx.roundRect(28, -130, 16, 34, 3); fillInk('#a59584');
  drawSmoke(36, -136);
  ctx.save(); ctx.translate(0, -74); drawTileRoof(72, 46, 46, '#d35a34', '#a8402a', '#ee7b47'); ctx.restore();
  // Flower box.
  ctx.beginPath(); ctx.roundRect(-54, -48, 24, 7, 3); fillInk('#8a5430', 2);
  for (const [fx, c] of [[-50, '#e2574c'], [-43, '#ffd56e'], [-36, '#e2574c']]) {
    ctx.beginPath(); ctx.arc(fx, -51, 3, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
  }
}

// Stage 3 — two-storey Roman villa with columns and banner.
function drawVilla() {
  ctx.beginPath(); ctx.roundRect(-80, -128, 160, 128, 6); fillInk('#f7ead0');
  ctx.fillStyle = '#e2cfa8'; ctx.fillRect(52, -125, 25, 122);
  ctx.beginPath(); ctx.roundRect(-80, -128, 160, 128, 6); strokeInk(3);
  // Floor ledge.
  ctx.beginPath(); ctx.roundRect(-86, -68, 172, 12, 4); fillInk('#c9b28a');
  // Ground floor colonnade.
  for (const cx of [-58, -22, 22, 58]) {
    ctx.beginPath(); ctx.roundRect(cx - 7, -56, 14, 56, 3); fillInk('#ffffff', 2.5);
    ctx.beginPath(); ctx.roundRect(cx - 10, -60, 20, 6, 2); fillInk('#e9dcc2', 2);
  }
  ctx.beginPath(); ctx.roundRect(-12, -46, 24, 46, [12, 12, 0, 0]); fillInk('#7a4425');
  // Upper windows.
  for (const wx of [-62, -28, 6, 40]) drawWarmWindow(wx, -112, 18, 26);
  ctx.beginPath(); ctx.roundRect(-36, -152, 14, 28, 3); fillInk('#a59584');
  drawSmoke(-29, -156);
  ctx.save(); ctx.translate(0, -124); drawTileRoof(96, 64, 44, '#d35a34', '#a8402a', '#ee7b47'); ctx.restore();
  // Pediment emblem.
  ctx.beginPath(); ctx.arc(0, -146, 9, 0, Math.PI * 2); fillInk('#f0c35a', 2.5);
  // Hanging banner.
  const sway = Math.sin(state.time * 1.6) * 2;
  ctx.beginPath();
  ctx.moveTo(66, -122); ctx.lineTo(88, -122); ctx.lineTo(88 + sway, -70); ctx.lineTo(77 + sway, -78); ctx.lineTo(66 + sway, -70);
  ctx.closePath(); fillInk('#c23b32', 2.5);
  ctx.beginPath(); ctx.arc(77 + sway * 0.5, -102, 6, 0, Math.PI * 2); fillInk('#f0c35a', 2);
}

function drawWindmill() {
  ctx.beginPath();
  ctx.moveTo(-26, 0); ctx.lineTo(-15, -118); ctx.lineTo(15, -118); ctx.lineTo(26, 0);
  ctx.quadraticCurveTo(0, 5, -26, 0);
  fillInk('#ece0c6');
  ctx.fillStyle = '#d6c6a3';
  ctx.beginPath(); ctx.moveTo(10, -116); ctx.lineTo(23, -3); ctx.lineTo(13, -2); ctx.lineTo(4, -116); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-8, -30, 16, 30, [8, 8, 0, 0]); fillInk('#7a4425', 2.5);
  drawWarmWindow(-6, -78, 12, 15);
  ctx.beginPath(); ctx.moveTo(-22, -114); ctx.quadraticCurveTo(0, -150, 22, -114); ctx.closePath(); fillInk('#d35a34');
  // Rotating sails.
  ctx.save();
  ctx.translate(0, -122);
  ctx.rotate(state.time * 0.9);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -72); strokeInk(4);
    ctx.beginPath(); ctx.roundRect(2, -72, 18, 56, 3); fillInk('#fbf3df', 2.5);
    ctx.strokeStyle = '#c9b28a'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let y = -62; y < -18; y += 11) { ctx.moveTo(4, y); ctx.lineTo(18, y); }
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, -122, 6, 0, Math.PI * 2); fillInk('#7b4a2b', 2.5);
}

function drawHaystack() {
  ctx.beginPath();
  ctx.moveTo(-30, 0); ctx.quadraticCurveTo(-32, -40, 0, -46); ctx.quadraticCurveTo(32, -40, 30, 0);
  ctx.quadraticCurveTo(0, 5, -30, 0);
  fillInk('#efc04f');
  ctx.strokeStyle = '#c4912f'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, -30); ctx.lineTo(-10, -14); ctx.moveTo(4, -38); ctx.lineTo(8, -20); ctx.moveTo(18, -24); ctx.lineTo(22, -8);
  ctx.stroke();
  ctx.fillStyle = '#fbe08c';
  ctx.beginPath(); ctx.ellipse(-8, -34, 9, 4, -0.4, 0, Math.PI * 2); ctx.fill();
}

function drawCow(phase = 0) {
  const chew = Math.sin(state.time * 3 + phase) * 1.2;
  for (const lx of [-16, -6, 10, 18]) { ctx.beginPath(); ctx.roundRect(lx - 3, -14, 6, 14, 2); fillInk('#fbf7ef', 2.5); }
  ctx.beginPath(); ctx.ellipse(0, -24, 26, 15, 0, 0, Math.PI * 2); fillInk('#fbf7ef');
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, -24, 26, 15, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(6, -30, 9, 6, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-12, -18, 6, 5, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(25, -28); ctx.quadraticCurveTo(34, -22 + chew, 31, -12); strokeInk(2.5);
  // Head faces the village (left side of the cow).
  ctx.save(); ctx.translate(-26, -30 + chew * 0.4);
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2); fillInk('#fbf7ef');
  ctx.beginPath(); ctx.ellipse(-4, 5, 8, 5, 0, 0, Math.PI * 2); fillInk('#f2a7a0', 2);
  ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(-7, -15); ctx.moveTo(5, -9); ctx.lineTo(8, -15); strokeInk(2.5);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-2, -2, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFence(x1, x2, y) {
  ctx.beginPath();
  ctx.roundRect(x1, y - 22, x2 - x1, 5, 2);
  ctx.roundRect(x1, y - 12, x2 - x1, 5, 2);
  fillInk('#c58a4f', 2);
  for (let x = x1 + 4; x <= x2 - 4; x += 28) {
    ctx.beginPath(); ctx.roundRect(x - 3.5, y - 30, 7, 30, [3.5, 3.5, 1, 1]); fillInk('#b57843', 2.5);
  }
}

// One tilled bed. `crop` picks what grows on it.
function drawField(x, y, w, h, crop, introducedAt) {
  drawShadow(x, y + h / 2 + 2, w * 1.05, 0.14);
  placed(x, y, 1, introducedAt, () => {
    // Soil body with a sunlit top lip and darker front face.
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); fillInk('#8f5d36');
    ctx.save();
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); ctx.clip();
    ctx.fillStyle = '#a8703f'; ctx.fillRect(-w / 2, -h / 2, w, 5);
    ctx.fillStyle = '#74462a'; ctx.fillRect(-w / 2, h / 2 - 6, w, 6);
    const rows = 2;
    for (let r = 0; r < rows; r++) {
      const fy = -h / 2 + (r + 1) * h / (rows + 1);
      ctx.strokeStyle = '#6b4024'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 8, fy + 1); ctx.lineTo(w / 2 - 8, fy + 1); ctx.stroke();
      ctx.strokeStyle = '#b07a48'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 8, fy + 4); ctx.lineTo(w / 2 - 8, fy + 4); ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); strokeInk(3);
    // Little corner pegs with a string line.
    for (const px of [-w / 2 + 3, w / 2 - 3]) {
      ctx.beginPath(); ctx.roundRect(px - 2.5, -h / 2 - 12, 5, 16, 2); fillInk('#c58a4f', 2);
    }

    // Crops along both furrows; back row first so the front one overlaps it.
    for (let r = 0; r < 2; r++) {
      const by = -h / 2 + (r + 1) * h / 3 + 1;
      const step = crop === 'wheat' ? 10 : crop === 'carrot' ? 15 : 19;
      for (let tx = -w / 2 + 12 + (r ? step / 2 : 0); tx < w / 2 - 8; tx += step) {
        const sway = Math.sin(state.time * 1.8 + tx * 0.2 + r) * 1.6;
        if (crop === 'wheat') {
          ctx.beginPath(); ctx.moveTo(tx, by); ctx.quadraticCurveTo(tx + sway * 0.4, by - 10, tx + sway, by - 18); strokeInk(1.6);
          ctx.beginPath(); ctx.moveTo(tx, by - 6); ctx.lineTo(tx - 4, by - 11); ctx.strokeStyle = '#7a9a3a'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(tx + sway, by - 22, 3.6, 7, sway * 0.08, 0, Math.PI * 2);
          fillInk(r ? '#f6cf55' : '#e9b740', 1.6);
          ctx.strokeStyle = '#c4912f'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(tx + sway - 2, by - 22); ctx.lineTo(tx + sway + 2, by - 24); ctx.moveTo(tx + sway - 2, by - 18); ctx.lineTo(tx + sway + 2, by - 20); ctx.stroke();
        } else if (crop === 'cabbage') {
          ctx.beginPath(); ctx.ellipse(tx, by - 6, 8.5, 7, 0, 0, Math.PI * 2); fillInk('#6fa84a', 2);
          ctx.beginPath(); ctx.ellipse(tx, by - 7, 5, 4.5, 0, 0, Math.PI * 2); fillInk('#a8d877', 1.5);
          ctx.beginPath(); ctx.moveTo(tx - 7, by - 4); ctx.quadraticCurveTo(tx - 12, by - 12, tx - 4, by - 13); strokeInk(1.5);
          ctx.fillStyle = '#d6f0a8'; ctx.beginPath(); ctx.ellipse(tx - 2, by - 9, 2, 1.2, -0.4, 0, Math.PI * 2); ctx.fill();
        } else if (crop === 'carrot') {
          ctx.beginPath(); ctx.moveTo(tx - 4.5, by - 3); ctx.quadraticCurveTo(tx, by - 7, tx + 4.5, by - 3); ctx.lineTo(tx, by + 4); ctx.closePath(); fillInk('#ef8a32', 1.5);
          for (const a of [-0.5, 0, 0.5]) {
            ctx.beginPath(); ctx.moveTo(tx, by - 2);
            ctx.quadraticCurveTo(tx + a * 6 + sway * 0.3, by - 9, tx + a * 9 + sway, by - 15);
            ctx.strokeStyle = '#4f8a32'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke();
            ctx.strokeStyle = '#7fbf4c'; ctx.lineWidth = 1.2; ctx.stroke();
          }
        } else {
          // Pumpkins with a curly vine.
          ctx.beginPath(); ctx.moveTo(tx - 12, by - 2); ctx.quadraticCurveTo(tx - 6, by - 10, tx, by - 4); ctx.strokeStyle = '#4f8a32'; ctx.lineWidth = 2; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(tx, by - 6, 8, 6.5, 0, 0, Math.PI * 2); fillInk('#ee9a3a', 2);
          ctx.strokeStyle = '#c96f22'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.ellipse(tx, by - 6, 3.5, 6, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.roundRect(tx - 1.5, by - 15, 3, 5, 1); fillInk('#6b8a32', 1.4);
          ctx.fillStyle = '#ffc77a'; ctx.beginPath(); ctx.ellipse(tx - 3, by - 9, 2.4, 1.4, -0.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  });
}

function drawVillager(x, groundY, height, range, speed, phase) {
  if (!sprites.farmer) return;
  const t = state.time * speed + phase;
  const vx = x + Math.sin(t) * range;
  const facingLeft = Math.cos(t) < 0;
  const bob = Math.abs(Math.sin(state.time * 5.2 + phase)) * -2;
  drawSprite(sprites.farmer, vx, groundY, height, facingLeft, bob, 1, 0.6, 0.14);
}

// Background row: windmill and a distant house appear at stage 3.
function drawVillageBack(width, ground) {
  const stage = state.villageStage;
  if (stage >= 3) {
    placed(1140, ground - 50, 0.95, 3, drawWindmill);
    placed(872, ground - 64, 0.7, 3, drawHouse);
  }
}

// Main row: the home grows hut → farmhouse → villa; extras join per stage.
function drawVillageFront(width, ground) {
  const stage = state.villageStage;
  const homeX = 1010;
  // The opening is an open field. The first house appears with settlement II.
  if (stage >= 2) {
    drawShadow(homeX, ground - 4, stage >= 3 ? 260 : 230, 0.2);
    if (stage === 2) placed(homeX, ground - 6, 1.6, 2, drawHouse);
    if (stage >= 3) placed(homeX - 10, ground - 6, 1.35, 3, drawVilla);
  }
  if (stage >= 2) {
    drawFence(845, 1165, ground + 6);
    placed(870, ground + 4, 1.1, 2, drawHaystack);
    placed(1132, ground + 10, 1.1, 2, () => drawCow(0));
  }
  if (stage >= 3) placed(952, ground + 12, 0.95, 3, () => drawCow(1.7));
}

// Crop beds grow with the farm level (1 → 4 beds in a 2×2 plot), independent of stage.
const fieldBeds = [
  // Two compact rows right under the ground line, so the beds stay above the HUD.
  { dx: -76, dy: 22, crop: 'wheat' },
  { dx: 76, dy: 22, crop: 'cabbage' },
  { dx: -76, dy: 46, crop: 'carrot' },
  { dx: 76, dy: 46, crop: 'pumpkin' }
];
function drawVillageFields(width, ground) {
  const patches = Math.min(fieldBeds.length, state.farmLevel);
  for (let i = 0; i < patches; i++) {
    const bed = fieldBeds[i];
    drawField(1000 + bed.dx, ground + bed.dy, 140, 20, bed.crop, null);
  }
}

function drawVillageVillagers(width, ground) {
  if (state.villageStage >= 2) drawVillager(1000, ground + 20, 90, 60, 0.45, 1.3);
  if (state.villageStage >= 3) drawVillager(1085, ground + 24, 84, 32, 0.7, 4.1);
}
