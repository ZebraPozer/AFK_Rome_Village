'use strict';
function drawCloud(image, width, height, options) {
  if (!image) return;
  const spriteWidth = width * options.width;
  const spriteHeight = spriteWidth * image.height / image.width;
  const travel = width + spriteWidth * 1.5;
  const start = options.x * width + spriteWidth * 0.25;
  const x = ((start + state.time * options.speed + spriteWidth * 0.75) % travel) - spriteWidth * 0.75;
  const bob = Math.sin(state.time * options.bobSpeed + options.phase) * options.bob;
  const pulse = 1 + Math.sin(state.time * options.pulseSpeed + options.phase) * options.pulse;
  ctx.save();
  ctx.globalAlpha = options.opacity * pulse;
  ctx.translate(x + spriteWidth / 2, options.y * height + bob + spriteHeight / 2);
  if (options.flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
  ctx.restore();
}

function drawSkyLayers(width, height) {
  // The sunlight bloom is baked with the sky gradient (drawSkyGradient); only clouds move.

  drawCloud(skyLayers.wisp, width, height, {
    x: 0.03, y: 0.03, width: 0.24, opacity: 0.30, speed: 2.2, phase: 0.6,
    bob: 2, bobSpeed: 0.18, pulse: 0.025, pulseSpeed: 0.22
  });
  drawCloud(skyLayers.bank, width, height, {
    x: 0.20, y: 0.13, width: 0.34, opacity: 0.24, speed: 1.1, phase: 1.7,
    bob: 1.5, bobSpeed: 0.12, pulse: 0.02, pulseSpeed: 0.17
  });
  drawCloud(skyLayers.cumulus, width, height, {
    x: 0.52, y: 0.035, width: 0.22, opacity: 0.43, speed: 1.7, phase: 2.8,
    bob: 3, bobSpeed: 0.20, pulse: 0.035, pulseSpeed: 0.26, flip: true
  });
  drawCloud(skyLayers.wisp, width, height, {
    x: 0.76, y: 0.20, width: 0.17, opacity: 0.25, speed: 2.6, phase: 4.1,
    bob: 2.5, bobSpeed: 0.24, pulse: 0.03, pulseSpeed: 0.24, flip: true
  });
  drawCloud(skyLayers.sunlit, width, height, {
    x: 0.88, y: -0.015, width: 0.16, opacity: 0.23, speed: 1.35, phase: 5.3,
    bob: 2, bobSpeed: 0.15, pulse: 0.08, pulseSpeed: 0.34
  });
  drawCloud(skyLayers.cumulus, width, height, {
    x: -0.12, y: 0.23, width: 0.13, opacity: 0.27, speed: 1.9, phase: 3.4,
    bob: 2, bobSpeed: 0.21, pulse: 0.025, pulseSpeed: 0.20
  });
}

function drawLandscapeImage(image, width, bottom, scale, opacity, drift = 0, heightScale = 1) {
  if (!image) return;
  const drawWidth = width * scale;
  const drawHeight = drawWidth * image.height / image.width * heightScale;
  const x = (width - drawWidth) / 2 + Math.sin(state.time * 0.035) * drift;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, x, bottom - drawHeight, drawWidth, drawHeight);
  ctx.restore();
}

function drawLandscapeTileStrip(image, width, bottom, tileScale, drift = 0) {
  if (!image) return;
  const tileWidth = width * tileScale;
  const tileHeight = tileWidth * image.height / image.width;
  const shift = Math.sin(state.time * 0.03) * drift;
  const firstX = -tileWidth + shift;
  const tileCount = Math.ceil((width - firstX) / tileWidth) + 1;

  ctx.save();
  for (let index = 0; index < tileCount; index++) {
    const x = firstX + index * tileWidth;
    ctx.drawImage(image, x, bottom - tileHeight, tileWidth, tileHeight);
  }
  ctx.restore();
}

function tintLandscapeLayer(image, color, amount, haze = 0) {
  const tinted = document.createElement('canvas');
  tinted.width = image.width;
  tinted.height = image.height;
  const tintedCtx = tinted.getContext('2d');
  tintedCtx.drawImage(image, 0, 0);
  tintedCtx.globalCompositeOperation = 'source-atop';
  tintedCtx.globalAlpha = amount;
  tintedCtx.fillStyle = color;
  tintedCtx.fillRect(0, 0, tinted.width, tinted.height);
  if (haze > 0) {
    tintedCtx.globalCompositeOperation = 'source-atop';
    tintedCtx.globalAlpha = haze;
    tintedCtx.fillStyle = '#c9e5ed';
    tintedCtx.fillRect(0, 0, tinted.width, tinted.height);
  }
  tintedCtx.globalAlpha = 1;
  tintedCtx.globalCompositeOperation = 'source-over';
  return tinted;
}

function drawCartoonTree(x, baseY, scale, type = 'olive', phase = 0, opacity = 1) {
  const sway = Math.sin(state.time * 0.52 + phase) * 0.009;
  const outline = '#33452f';
  const dark = '#3f6139';
  const mid = '#668b48';
  const light = '#9fba58';
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, baseY);
  ctx.rotate(sway);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (type === 'cypress') {
    ctx.strokeStyle = '#58402d';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath(); ctx.moveTo(0, 2 * scale); ctx.lineTo(0, -43 * scale); ctx.stroke();
    ctx.fillStyle = dark;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(0, -92 * scale);
    ctx.bezierCurveTo(17 * scale, -70 * scale, 13 * scale, -28 * scale, 0, -12 * scale);
    ctx.bezierCurveTo(-13 * scale, -28 * scale, -17 * scale, -70 * scale, 0, -92 * scale);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.ellipse(-3 * scale, -57 * scale, 5 * scale, 23 * scale, 0.08, 0, Math.PI * 2); ctx.fill();
  } else {
    const trunkHeight = type === 'pine' ? 52 : 42;
    ctx.strokeStyle = '#513827';
    ctx.lineWidth = 8 * scale;
    ctx.beginPath(); ctx.moveTo(0, 3 * scale); ctx.lineTo(-1 * scale, -trunkHeight * scale); ctx.stroke();
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(-2 * scale, -32 * scale); ctx.lineTo(-18 * scale, -49 * scale);
    ctx.moveTo(0, -35 * scale); ctx.lineTo(18 * scale, -52 * scale);
    ctx.stroke();

    const blobs = type === 'pine'
      ? [[-22,-57,27,17], [5,-64,33,20], [30,-56,25,16], [-1,-76,25,16]]
      : [[-23,-48,22,19], [2,-57,28,22], [27,-47,22,18], [-4,-39,27,18]];
    for (const [bx, by, rx, ry] of blobs) {
      ctx.fillStyle = dark; ctx.strokeStyle = outline; ctx.lineWidth = 2.2 * scale;
      ctx.beginPath(); ctx.ellipse(bx * scale, by * scale, rx * scale, ry * scale, -0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.ellipse(-8 * scale, -60 * scale, 27 * scale, 14 * scale, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.ellipse(-15 * scale, -67 * scale, 13 * scale, 6 * scale, -0.18, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawLandscapeLayers(width, height, ground) {
  // Only the remote mountains are gently compressed. Tree strips keep their native aspect ratio.
  drawLandscapeImage(landscapeLayers.mountains, width, ground * 0.78, 1.02, 1, 2, 0.76);
  drawLandscapeTileStrip(landscapeLayers.hills, width, ground * 0.82, 0.52, 2.5);
  drawLandscapeTileStrip(landscapeLayers.treeline, width, ground * 0.84, 0.38, 3.5);
}

// ---------------------------------------------------------------------------
// Ground layer: meadow + dirt road. Everything here is static, so it is
// painted once into an offscreen canvas and reused every frame.
// ---------------------------------------------------------------------------
let groundCache = null;
let groundCacheKey = '';

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRoadGeometry(width, ground) {
  const top = ground - 44;
  const bottom = ground + 74;
  const end = width * 0.64; // ends at the tower so the village side stays grass
  // Soft, organic edges: two slow waves plus a small irregular wobble.
  const topEdge = x => top + Math.sin(x * 0.021 + 0.7) * 3.2 + Math.sin(x * 0.067) * 1.4 + Math.sin(x * 0.19 + 2) * 0.6;
  const bottomEdge = x => bottom + Math.sin(x * 0.017 + 2.1) * 3.6 + Math.sin(x * 0.059 + 1) * 1.6 + Math.sin(x * 0.23) * 0.7;
  return { top, bottom, end, topEdge, bottomEdge };
}

function traceRoadShape(g, road, inset = 0) {
  g.beginPath();
  g.moveTo(-4, road.topEdge(0) + inset);
  for (let x = 0; x <= road.end; x += 6) g.lineTo(x, road.topEdge(x) + inset);
  // Rounded tail that tucks under the farm plot.
  g.quadraticCurveTo(road.end + 26, (road.top + road.bottom) / 2, road.end, road.bottomEdge(road.end) - inset);
  for (let x = Math.floor(road.end / 6) * 6; x >= 0; x -= 6) g.lineTo(x, road.bottomEdge(x) - inset);
  g.lineTo(-4, road.bottomEdge(0) - inset);
  g.closePath();
}

function drawGrassClump(g, x, y, size, rng, palette) {
  const blades = 3 + Math.floor(rng() * 3);
  const lean = (rng() - 0.5) * 0.6;
  g.lineJoin = 'round';
  for (let b = 0; b < blades; b++) {
    const t = blades === 1 ? 0 : b / (blades - 1) - 0.5;
    const h = size * (0.65 + rng() * 0.55) * (1 - Math.abs(t) * 0.45);
    const baseX = x + t * size * 0.55;
    const tipX = baseX + (t * 0.9 + lean) * size * 0.75;
    const tipY = y - h;
    const w = size * 0.13;
    g.beginPath();
    g.moveTo(baseX - w, y);
    g.quadraticCurveTo(baseX - w * 0.4 + (tipX - baseX) * 0.25, y - h * 0.55, tipX, tipY);
    g.quadraticCurveTo(baseX + w * 0.6 + (tipX - baseX) * 0.35, y - h * 0.5, baseX + w, y);
    g.closePath();
    g.fillStyle = b % 2 ? palette.mid : palette.dark;
    g.fill();
    g.strokeStyle = palette.outline;
    g.lineWidth = Math.max(0.8, size * 0.06);
    g.stroke();
  }
  // A single highlight blade keeps the clump readable against the meadow.
  g.beginPath();
  g.moveTo(x - size * 0.05, y - 0.5);
  g.quadraticCurveTo(x + lean * size * 0.3, y - size * 0.5, x + lean * size * 0.6 + size * 0.06, y - size * 0.85);
  g.strokeStyle = palette.light;
  g.lineWidth = Math.max(0.8, size * 0.07);
  g.stroke();
}

function paintGroundLayer(g, width, height, ground) {
  const rng = makeRng(1337);
  const road = getRoadGeometry(width, ground);
  const meadowTop = x => ground * 0.79 + Math.sin(x * 0.006 + 1.2) * 4 + Math.sin(x * 0.017) * 2;

  // 1. Far meadow ridge that tucks the treeline in.
  // Its top sits just above the base of the tree strip so no sky gap shows through.
  const farTop = x => ground * 0.732 + Math.sin(x * 0.009 + 0.4) * 2.5 + Math.sin(x * 0.031) * 1.2;
  const farMeadow = g.createLinearGradient(0, ground * 0.72, 0, ground * 0.8);
  farMeadow.addColorStop(0, '#6f9446');
  farMeadow.addColorStop(0.25, '#7ea452');
  farMeadow.addColorStop(1, '#88af5a');
  g.fillStyle = farMeadow;
  g.beginPath();
  g.moveTo(0, farTop(0));
  for (let x = 0; x <= width; x += 10) g.lineTo(x, farTop(x));
  g.lineTo(width, height); g.lineTo(0, height); g.closePath();
  g.fill();
  if (landscapeLayers.grass) {
    const farPattern = g.createPattern(landscapeLayers.grass, 'repeat');
    if (farPattern) {
      farPattern.setTransform(new DOMMatrix().scale(0.12, 0.08));
      g.save();
      g.clip();
      g.globalCompositeOperation = 'soft-light';
      g.globalAlpha = 0.6;
      g.fillStyle = farPattern;
      g.fillRect(0, ground * 0.7, width, ground * 0.12);
      g.restore();
    }
  }
  // Small bushes hide the seam between the tree strip and the meadow.
  for (let x = -6; x < width + 6; x += 9 + rng() * 14) {
    const y = farTop(x) + 1;
    const r = 3 + rng() * 4;
    g.fillStyle = rng() > 0.5 ? '#5f8a3e' : '#6c9645';
    g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0, Math.PI, 0); g.fill();
  }

  // 2. Main meadow with a gentle wavy horizon instead of a ruler-straight edge.
  const meadow = g.createLinearGradient(0, ground * 0.77, 0, height);
  meadow.addColorStop(0, '#96bd5e');
  meadow.addColorStop(0.35, '#8db657');
  meadow.addColorStop(0.75, '#7ca64b');
  meadow.addColorStop(1, '#68903f');
  g.fillStyle = meadow;
  g.beginPath();
  g.moveTo(0, meadowTop(0));
  for (let x = 0; x <= width; x += 10) g.lineTo(x, meadowTop(x));
  g.lineTo(width, height); g.lineTo(0, height); g.closePath();
  g.fill();
  g.save();
  g.clip();

  // Painted grass texture, blended so it adds detail but keeps the cartoon palette.
  if (landscapeLayers.grass) {
    const pattern = g.createPattern(landscapeLayers.grass, 'repeat');
    if (pattern) {
      pattern.setTransform(new DOMMatrix().translate(0, ground * 0.79).scale(0.2));
      g.globalCompositeOperation = 'soft-light';
      g.globalAlpha = 0.85;
      g.fillStyle = pattern;
      g.fillRect(0, ground * 0.7, width, height);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
  }

  // Sunlit patches and soft cloud shadows break up the flat green.
  for (let i = 0; i < 9; i++) {
    const x = rng() * width;
    const y = ground * 0.82 + rng() * (height - ground * 0.82);
    const rx = 60 + rng() * 110;
    const sunny = i % 3 !== 0;
    const patch = g.createRadialGradient(x, y, 0, x, y, rx);
    patch.addColorStop(0, sunny ? 'rgba(214, 236, 140, 0.22)' : 'rgba(54, 92, 40, 0.16)');
    patch.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = patch;
    g.save();
    g.translate(x, y); g.scale(1, 0.28); g.translate(-x, -y);
    g.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    g.restore();
  }

  // Soft shading right under the horizon so the meadow reads as a separate plane.
  const horizonShade = g.createLinearGradient(0, ground * 0.78, 0, ground * 0.86);
  horizonShade.addColorStop(0, 'rgba(60, 96, 44, 0.28)');
  horizonShade.addColorStop(1, 'rgba(60, 96, 44, 0)');
  g.fillStyle = horizonShade;
  g.fillRect(0, ground * 0.77, width, ground * 0.1);
  g.restore();

  // Rim light along the meadow horizon.
  g.beginPath();
  g.moveTo(0, meadowTop(0));
  for (let x = 0; x <= width; x += 10) g.lineTo(x, meadowTop(x));
  g.strokeStyle = 'rgba(196, 224, 140, 0.45)';
  g.lineWidth = 1.5;
  g.stroke();

  // 3. Dirt road.
  g.save();
  traceRoadShape(g, road);
  // Contact shadow so the road sits slightly lower than the grass.
  g.shadowColor = 'rgba(52, 64, 30, 0.35)';
  g.shadowBlur = 6;
  g.shadowOffsetY = -2;
  const dirt = g.createLinearGradient(0, road.top, 0, road.bottom);
  dirt.addColorStop(0, '#c9a467');
  dirt.addColorStop(0.18, '#ddbf84');
  dirt.addColorStop(0.55, '#e6cc93');
  dirt.addColorStop(0.85, '#d9b97c');
  dirt.addColorStop(1, '#c39e63');
  g.fillStyle = dirt;
  g.fill();
  g.shadowColor = 'transparent';
  g.clip();

  // Inner edge darkening, like packed dirt meeting the turf.
  g.strokeStyle = 'rgba(140, 104, 58, 0.45)';
  g.lineWidth = 7;
  traceRoadShape(g, road);
  g.stroke();

  // Large mottled dirt patches.
  for (let i = 0; i < road.end / 28; i++) {
    const x = rng() * road.end;
    const y = road.top + 8 + rng() * (road.bottom - road.top - 16);
    const rx = 14 + rng() * 34;
    const light = rng() > 0.45;
    g.fillStyle = light ? 'rgba(246, 226, 172, 0.28)' : 'rgba(176, 136, 82, 0.10)';
    g.beginPath(); g.ellipse(x, y, rx, rx * (0.22 + rng() * 0.12), (rng() - 0.5) * 0.2, 0, Math.PI * 2); g.fill();
  }

  // Two worn cart ruts running toward the gate.
  for (const [k, phase] of [[0.36, 0.4], [0.7, 2.2]]) {
    const ry = x => road.top + (road.bottom - road.top) * k + Math.sin(x * 0.013 + phase) * 2.2;
    // A horizontal gradient fades the rut in and out so it reads as wear, not a stripe.
    const fade = (r, gC, bC, maxA) => {
      const grad = g.createLinearGradient(0, 0, road.end, 0);
      for (let i = 0; i <= 10; i++) grad.addColorStop(i / 10, `rgba(${r}, ${gC}, ${bC}, ${(maxA * (0.25 + rng() * 0.75)).toFixed(3)})`);
      return grad;
    };
    const rutPath = dy => {
      g.beginPath();
      for (let x = 0; x <= road.end; x += 6) x === 0 ? g.moveTo(x, ry(x) + dy) : g.lineTo(x, ry(x) + dy);
    };
    rutPath(0); g.strokeStyle = fade(150, 110, 60, 0.22); g.lineWidth = 8; g.stroke();
    rutPath(-0.5); g.strokeStyle = fade(140, 100, 54, 0.18); g.lineWidth = 3; g.stroke();
    rutPath(4.5); g.strokeStyle = fade(252, 238, 196, 0.5); g.lineWidth = 1.4; g.stroke();
  }

  // Fine grit.
  for (let i = 0; i < road.end / 3; i++) {
    const x = rng() * road.end;
    const y = road.top + 4 + rng() * (road.bottom - road.top - 8);
    g.fillStyle = rng() > 0.5 ? 'rgba(150, 112, 64, 0.35)' : 'rgba(255, 244, 210, 0.5)';
    g.fillRect(x, y, 1 + rng() * 1.4, 1);
  }

  // Cartoon pebbles with outline, highlight and a tiny shadow.
  for (let i = 0; i < road.end / 22; i++) {
    const x = rng() * road.end;
    const nearEdge = rng() < 0.55;
    const y = nearEdge
      ? (rng() < 0.5 ? road.topEdge(x) + 6 + rng() * 8 : road.bottomEdge(x) - 6 - rng() * 8)
      : road.top + 14 + rng() * (road.bottom - road.top - 28);
    const r = 1.6 + rng() * (nearEdge ? 3.2 : 2);
    g.fillStyle = 'rgba(110, 82, 46, 0.35)';
    g.beginPath(); g.ellipse(x + 1, y + r * 0.55, r * 1.25, r * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = ['#b7ab8c', '#c9bb98', '#a59a7e', '#d3c5a1'][i % 4];
    g.strokeStyle = '#7d6a4c';
    g.lineWidth = 0.9;
    g.beginPath(); g.ellipse(x, y, r * 1.2, r * 0.8, (rng() - 0.5) * 0.6, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255, 250, 230, 0.75)';
    g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.3, r * 0.45, r * 0.22, -0.3, 0, Math.PI * 2); g.fill();
  }
  g.restore();

  // 4. Grass spilling over both road edges hides the hard border.
  const edgePalette = { dark: '#5f8a3c', mid: '#76a347', light: '#b5d77a', outline: '#3f6029' };
  const edgeFringe = (edge, offset, minSize, spread) => {
    for (let x = -4; x < road.end - 4; ) {
      // Occasional bare gaps and bigger clumps keep the fringe from looking like a fence.
      if (rng() < 0.12) { x += 14 + rng() * 26; continue; }
      const big = rng() < 0.18;
      const size = minSize + rng() * spread + (big ? spread : 0);
      drawGrassClump(g, x, edge(x) + offset + rng() * 3, size, rng, edgePalette);
      x += (big ? 10 : 5) + rng() * 10;
    }
  };
  edgeFringe(road.topEdge, 3, 4, 5);
  edgeFringe(road.bottomEdge, 6, 7, 7);

  // 5. Meadow tufts and a few tiny flowers, larger toward the viewer.
  const fieldTop = ground * 0.8;
  const onRoad = (x, y) => x < road.end + 30 && y > road.topEdge(x) - 4 && y < road.bottomEdge(x) + 14;
  const tuftPalette = { dark: '#5d873a', mid: '#6f9c43', light: '#a9cf6e', outline: '#44652c' };
  for (let i = 0; i < 70; i++) {
    const x = rng() * width;
    const y = fieldTop + Math.pow(rng(), 0.8) * (height - fieldTop);
    if (onRoad(x, y)) continue;
    const depth = (y - fieldTop) / (height - fieldTop);
    drawGrassClump(g, x, y, 4 + depth * 11 + rng() * 3, rng, tuftPalette);
  }
  const flowerColors = ['#fff6dc', '#f7d65a', '#f2a7b5'];
  for (let i = 0; i < 26; i++) {
    const x = rng() * width;
    const y = fieldTop + 6 + rng() * (height - fieldTop - 6);
    if (onRoad(x, y)) continue;
    const r = 1.2 + (y - fieldTop) / (height - fieldTop) * 1.6;
    g.fillStyle = '#4f7432';
    g.fillRect(x - 0.4, y, 0.8, r * 2.4);
    g.fillStyle = flowerColors[i % flowerColors.length];
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d99a2b';
    g.beginPath(); g.arc(x, y, r * 0.38, 0, Math.PI * 2); g.fill();
  }
}

function drawGroundLayer(width, height, ground) {
  const key = `${canvas.width}x${canvas.height}:${landscapeLayers.grass ? 1 : 0}`;
  if (!groundCache || groundCacheKey !== key) {
    groundCache = groundCache || document.createElement('canvas');
    groundCache.width = canvas.width;
    groundCache.height = canvas.height;
    const g = groundCache.getContext('2d');
    g.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    g.clearRect(0, 0, width, height);
    paintGroundLayer(g, width, height, ground);
    groundCacheKey = key;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(groundCache, 0, 0);
  ctx.restore();
}

// The sky gradient and the landscape (mountains, hills, trees, ground) never change,
// so they are baked once per canvas size; only the clouds are drawn every frame.
const bgCache = { key: '', sky: null, land: null };

function bakeLayer(width, height, draw) {
  const layer = document.createElement('canvas');
  layer.width = canvas.width;
  layer.height = canvas.height;
  const g = layer.getContext('2d');
  g.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  const screen = ctx;
  ctx = g;
  try { draw(); } finally { ctx = screen; }
  return layer;
}

function drawSkyGradient(width, height, ground) {
  const sky = ctx.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, '#b9ddec');
  sky.addColorStop(0.58, '#d9e8d5');
  sky.addColorStop(1, '#eef0c9');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * 0.76, height * 0.10, 0, width * 0.76, height * 0.10, width * 0.42);
  glow.addColorStop(0, '#fff0bd5c');
  glow.addColorStop(0.42, '#fff4ce24');
  glow.addColorStop(1, '#fff4ce00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height * 0.72);
}

function drawBackground(width, height) {
  const ground = height * GROUND_RATIO;
  const ready = landscapeLayers.mountains && landscapeLayers.hills && landscapeLayers.treeline && landscapeLayers.grass;
  const key = `${canvas.width}x${canvas.height}:${ready ? 1 : 0}`;
  if (bgCache.key !== key) {
    bgCache.key = key;
    bgCache.sky = bakeLayer(width, height, () => drawSkyGradient(width, height, ground));
    bgCache.land = bakeLayer(width, height, () => { drawLandscapeLayers(width, height, ground); drawGroundLayer(width, height, ground); });
  }
  ctx.drawImage(bgCache.sky, 0, 0, width, height);
  drawSkyLayers(width, height);
  ctx.drawImage(bgCache.land, 0, 0, width, height);

  // The farm and buildings are drawn by drawVillage*() so they can grow by stage.
}
