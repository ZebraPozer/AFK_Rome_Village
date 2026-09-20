'use strict';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const ui = Object.fromEntries([
  'food','coins','wave','kills','mob-count','gate-value','gate-bar','pause','speed',
  'reset','wave-button','state-label','live-dot','guard-status','farm-status','loading',
  'guard-upgrade','gate-upgrade','farm-upgrade','heal-guard','guard-level','gate-level','farm-level',
  'guard-cost','gate-cost','farm-cost','heal-cost','guard-health-value','guard-health-bar','archer-row','archer-status'
].map((id) => [id, document.getElementById(id)]));

const sources = {
  guard: { src: 'assets/roman-parts-source.png', crop: [10, 188, 335, 575], background: 'sage' },
  orc: { src: 'assets/concepts/orc-raider-clean-01.png', crop: [0, 0, 1536, 1024], background: 'cream' },
  orcDual: { src: 'assets/concepts/orc-dual-swords-01.png', crop: [0, 0, 1254, 1254], background: 'cream' },
  orcShield: { src: 'assets/concepts/orc-shield-guard-01.png', crop: [0, 0, 1254, 1254], background: 'cream' },
  orcRed: { src: 'assets/concepts/orc-red-elite-01.png', crop: [0, 0, 1254, 1254], background: 'cream' },
  boss: { src: 'assets/concepts/orc-brute-boss-01.png', crop: [0, 0, 1254, 1254] },
  farmer: { src: 'assets/concepts/roman-farmer-villager-01.png', crop: [165, 55, 770, 930], background: 'cream' }
};

const enemyTypes = {
  orc:       { hp: 4,  damage: 3,  attackRate: 1.2,  speed: 1,    reward: 2, gateDamage: 12, height: 126, bar: '#8ba45e' },
  orcDual:   { hp: 3,  damage: 5,  attackRate: 0.9,  speed: 1.15, reward: 3, gateDamage: 10, height: 124, bar: '#d28b45' },
  orcShield: { hp: 8,  damage: 2,  attackRate: 1.4,  speed: 0.8,  reward: 3, gateDamage: 16, height: 132, bar: '#6f8ea2' },
  orcRed:    { hp: 16, damage: 6,  attackRate: 1.8,  speed: 0.6,  reward: 6, gateDamage: 25, height: 148, bar: '#c6533f' },
  boss:      { hp: 22, damage: 14, attackRate: 1.45, speed: 0.52, reward: 8, gateDamage: 35, height: 190, bar: '#a93336' }
};

function buildWavePlan(wave) {
  const plans = {
    1: ['orc', 'orc', 'orc', 'orc', 'orc', 'orc', 'orc'],
    2: ['orc', 'orcDual', 'orc', 'orcDual', 'orc', 'orc', 'orcDual', 'orc', 'orc'],
    3: ['orc', 'orcDual', 'orcShield', 'orc', 'orcDual', 'orcShield', 'orc', 'orc', 'orcDual', 'orc', 'orc'],
    4: ['orc', 'orcDual', 'orcShield', 'orc', 'orcDual', 'orcShield', 'orcRed', 'orc', 'orcDual', 'orcShield', 'orc', 'orc', 'orc'],
    5: ['orc', 'orcDual', 'orcShield', 'orc', 'orcDual', 'orcShield', 'orcRed', 'orc', 'orcDual', 'orcShield', 'orcRed', 'orc', 'orcDual', 'orc', 'orc', 'boss']
  };
  return [...(plans[wave] || plans[5])];
}

const sprites = {};
const skyLayers = {};
const skySources = {
  bank: 'assets/sky/pieces/cloud-bank-far.png',
  cumulus: 'assets/sky/pieces/cloud-cumulus.png',
  wisp: 'assets/sky/pieces/cloud-wisp.png',
  sunlit: 'assets/sky/pieces/cloud-sunlit.png'
};
const landscapeLayers = {};
const landscapeSources = {
  mountains: 'assets/landscape/mountains-cartoon-v2.png',
  hills: 'assets/landscape/hills-cartoon-v2.png',
  treeline: 'assets/landscape/treeline-cartoon-v2.png'
};
const state = {
  running: true,
  speed: 1,
  wave: 1,
  phase: 'preparation',
  gate: 100,
  maxGate: 100,
  guardHp: 100,
  maxGuardHp: 100,
  food: 0,
  coins: 0,
  kills: 0,
  guardLevel: 1,
  gateLevel: 1,
  farmLevel: 1,
  waveTotal: 0,
  spawned: 0,
  defeated: 0,
  archerUnlocked: false,
  wavePlan: [],
  mobs: [],
  spawnTimer: 0.6,
  foodTimer: 3,
  attackCooldown: 0,
  attackTimer: 0,
  hitFlash: 0,
  floaters: [],
  time: 0,
  last: 0
};

function removeConnectedBackground(image, type) {
  const { width, height, data } = image;
  const corners = [0, width - 1, (height - 1) * width, width * height - 1];
  const samples = corners.map((index) => {
    const p = index * 4;
    return [data[p], data[p + 1], data[p + 2]];
  });
  const threshold = type === 'sage' ? 58 : 43;
  const thresholdSquared = threshold * threshold;
  const isBackground = (index) => {
    const p = index * 4;
    for (const sample of samples) {
      const dr = data[p] - sample[0];
      const dg = data[p + 1] - sample[1];
      const db = data[p + 2] - sample[2];
      if (dr * dr + dg * dg + db * db < thresholdSquared) return true;
    }
    return false;
  };
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const add = (index) => {
    if (seen[index]) return;
    if (!isBackground(index)) return;
    seen[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index / width) | 0;
    if (x > 0) add(index - 1);
    if (x + 1 < width) add(index + 1);
    if (y > 0) add(index - width);
    if (y + 1 < height) add(index + width);
  }
  for (let i = 0; i < seen.length; i++) {
    if (seen[i]) data[i * 4 + 3] = 0;
  }
}

function keepLargestShape(image) {
  const { width, height, data } = image;
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let largest = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] < 40) continue;
    let head = 0;
    let tail = 0;
    const component = [];
    queue[tail++] = start;
    seen[start] = 1;
    while (head < tail) {
      const index = queue[head++];
      component.push(index);
      const x = index % width;
      const y = (index / width) | 0;
      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (let n = 0; n < 4; n++) {
        const next = neighbors[n];
        if (next < 0 || next >= seen.length || seen[next] || data[next * 4 + 3] < 40) continue;
        if ((n === 0 && x === 0) || (n === 1 && x === width - 1) || (n === 2 && y === 0) || (n === 3 && y === height - 1)) continue;
        seen[next] = 1;
        queue[tail++] = next;
      }
    }
    if (component.length > largest.length) largest = component;
  }
  const keep = new Uint8Array(width * height);
  for (const index of largest) keep[index] = 1;
  for (let i = 0; i < keep.length; i++) if (!keep[i]) data[i * 4 + 3] = 0;
}

function trimCanvas(sourceCanvas) {
  const sourceCtx = sourceCanvas.getContext('2d');
  const image = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  let minX = image.width;
  let minY = image.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] < 20) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  const width = Math.max(1, maxX - minX + 1);
  const height = Math.max(1, maxY - minY + 1);
  const trimmed = document.createElement('canvas');
  trimmed.width = width;
  trimmed.height = height;
  trimmed.getContext('2d').drawImage(sourceCanvas, minX, minY, width, height, 0, 0, width, height);
  return trimmed;
}

function loadSprite(config) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const [x, y, width, height] = config.crop;
      const work = document.createElement('canvas');
      work.width = width;
      work.height = height;
      const workCtx = work.getContext('2d', { willReadFrequently: true });
      workCtx.drawImage(image, x, y, width, height, 0, 0, width, height);
      const pixels = workCtx.getImageData(0, 0, width, height);
      if (config.background) removeConnectedBackground(pixels, config.background);
      keepLargestShape(pixels);
      workCtx.putImageData(pixels, 0, 0);
      resolve(trimCanvas(work));
    };
    image.onerror = reject;
    image.src = config.src;
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function spawnMob(type = 'orc') {
  const stats = enemyTypes[type] || enemyTypes.orc;
  state.mobs.push({
    x: -70, bob: Math.random() * Math.PI * 2, hit: 0, dead: false, type,
    hp: stats.hp,
    maxHp: stats.hp,
    damage: stats.damage,
    attackRate: stats.attackRate,
    speed: stats.speed,
    reward: stats.reward,
    gateDamage: stats.gateDamage,
    attackCooldown: Math.random() * 0.35
  });
}

function startWave() {
  state.phase = 'wave';
  state.running = true;
  state.gate = state.maxGate;
  state.mobs = [];
  state.wavePlan = buildWavePlan(state.wave);
  state.waveTotal = state.wavePlan.length;
  state.spawned = 0;
  state.defeated = 0;
  state.spawnTimer = 0.2;
  ui.pause.textContent = 'Ⅱ Пауза';
}

function finishWave() {
  state.phase = state.wave === 5 ? 'complete' : 'victory';
  state.running = true;
  const reward = 6 + state.wave * 3;
  state.coins += reward;
  state.floaters.push({ kind: 'reward', amount: reward, x: 585, life: 1.8, duration: 1.8 });
  if (state.wave === 5) state.archerUnlocked = true;
}

function failWave() {
  state.phase = 'defeat';
  state.running = true;
  state.mobs = [];
  state.guardHp = Math.ceil(state.maxGuardHp * 0.3);
}

function resetGame() {
  Object.assign(state, {
    running: true, speed: 1, wave: 1, phase: 'preparation', gate: 100, maxGate: 100,
    guardHp: 100, maxGuardHp: 100,
    food: 0, coins: 0, kills: 0, guardLevel: 1, gateLevel: 1, farmLevel: 1,
    waveTotal: 0, spawned: 0, defeated: 0, archerUnlocked: false, wavePlan: [],
    mobs: [], spawnTimer: 0.6, foodTimer: 3, attackCooldown: 0, attackTimer: 0,
    hitFlash: 0, floaters: [], time: 0, last: 0
  });
  ui.speed.textContent = '⏩ 1×';
  ui.pause.textContent = 'Ⅱ Пауза';
}

function update(delta, width) {
  if (!state.running) return;
  const dt = delta * state.speed;
  state.time += dt;
  if (state.phase === 'wave') state.spawnTimer -= dt;
  state.foodTimer -= dt;
  state.attackCooldown = Math.max(0, state.attackCooldown - dt);
  state.attackTimer = Math.max(0, state.attackTimer - dt);
  state.hitFlash = Math.max(0, state.hitFlash - dt);
  for (const floater of state.floaters) floater.life -= dt;
  state.floaters = state.floaters.filter((floater) => floater.life > 0);

  if (state.phase === 'wave' && state.spawned < state.waveTotal && state.spawnTimer <= 0) {
    const nextType = state.wavePlan[state.spawned] || 'orc';
    spawnMob(nextType);
    state.spawned += 1;
    state.spawnTimer = nextType === 'boss' || nextType === 'orcRed' ? 1.8 : Math.max(0.75, 1.65 - state.wave * 0.1);
  }
  if (state.foodTimer <= 0) {
    state.food += state.farmLevel;
    state.floaters.push({ kind: 'food', amount: state.farmLevel, x: width * 0.84, life: 1.45, duration: 1.45 });
    state.foodTimer = 3;
  }

  const guardX = width * 0.56;
  const mobSpeed = 28 + state.wave * 2.5;
  const frontline = state.mobs.reduce((lead, mob) => !mob.dead && (!lead || mob.x > lead.x) ? mob : lead, null);
  for (const mob of state.mobs) {
    mob.hit = Math.max(0, mob.hit - dt);
    mob.attackCooldown = Math.max(0, mob.attackCooldown - dt);
    const atGuard = state.guardHp > 0 && mob.x >= guardX - 72;
    if (atGuard) {
      mob.x = Math.min(mob.x, guardX - 72);
      if (mob === frontline && mob.attackCooldown <= 0) {
        const damage = mob.damage;
        state.guardHp = Math.max(0, state.guardHp - damage);
        state.floaters.push({ kind: 'hurt', amount: damage, x: guardX, life: 1.05, duration: 1.05 });
        mob.attackCooldown = mob.attackRate;
      }
    } else {
      mob.x += mobSpeed * mob.speed * dt;
    }
  }

  const target = state.mobs.find((mob) => !mob.dead && mob.x > guardX - 80 && mob.x < guardX - 10);
  if (state.guardHp > 0 && target && state.attackCooldown <= 0) {
    target.hp -= state.guardLevel;
    target.hit = 0.18;
    state.attackTimer = 0.28;
    state.hitFlash = 0.14;
    state.attackCooldown = Math.max(0.4, 0.72 - (state.guardLevel - 1) * 0.06);
    if (target.hp <= 0) {
      target.dead = true;
      state.kills += 1;
      state.defeated += 1;
      state.coins += target.reward;
      state.floaters.push({ kind: 'kill', amount: target.reward, x: target.x, life: 1.35, duration: 1.35 });
    }
  }

  state.mobs = state.mobs.filter((mob) => {
    if (mob.dead) return mob.hit > 0;
    if (mob.x > guardX + 8) {
      state.gate = Math.max(0, state.gate - mob.gateDamage);
      state.defeated += 1;
      return false;
    }
    return mob.x < width + 120;
  });
  if (state.gate <= 0) failWave();
  else if (state.phase === 'wave' && state.spawned === state.waveTotal && state.defeated === state.waveTotal && state.mobs.length === 0) finishWave();
}

function roundedRect(x, y, width, height, radius, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

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
  // A restrained sunlight bloom keeps the center readable and warms the village side.
  const glow = ctx.createRadialGradient(width * 0.76, height * 0.10, 0, width * 0.76, height * 0.10, width * 0.42);
  glow.addColorStop(0, '#fff0bd5c');
  glow.addColorStop(0.42, '#fff4ce24');
  glow.addColorStop(1, '#fff4ce00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height * 0.72);

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

function drawBackground(width, height) {
  const ground = height * 0.82;
  const sky = ctx.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, '#b9ddec');
  sky.addColorStop(0.58, '#d9e8d5');
  sky.addColorStop(1, '#eef0c9');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  drawSkyLayers(width, height);
  drawLandscapeLayers(width, height, ground);

  // Layered meadow silhouettes replace the old flat green slab.
  ctx.fillStyle = '#8eaa70';
  ctx.beginPath();
  ctx.moveTo(0, ground * 0.74);
  ctx.bezierCurveTo(width * 0.18, ground * 0.68, width * 0.28, ground * 0.80, width * 0.46, ground * 0.73);
  ctx.bezierCurveTo(width * 0.64, ground * 0.66, width * 0.82, ground * 0.78, width, ground * 0.70);
  ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();

  const meadow = ctx.createLinearGradient(0, ground * 0.72, 0, height);
  meadow.addColorStop(0, '#8eab6d');
  meadow.addColorStop(0.48, '#9dbb73');
  meadow.addColorStop(1, '#76935c');
  ctx.fillStyle = meadow;
  ctx.beginPath();
  ctx.moveTo(0, ground * 0.82);
  ctx.bezierCurveTo(width * 0.22, ground * 0.75, width * 0.37, ground * 0.88, width * 0.55, ground * 0.79);
  ctx.bezierCurveTo(width * 0.73, ground * 0.71, width * 0.87, ground * 0.84, width, ground * 0.77);
  ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();

  // A soft road widens toward the viewer and keeps the combat route readable.
  const road = ctx.createLinearGradient(0, ground - 12, 0, height);
  road.addColorStop(0, '#d8c184');
  road.addColorStop(1, '#bca16a');
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(0, ground + 24);
  ctx.bezierCurveTo(width * 0.20, ground + 18, width * 0.42, ground + 2, width * 0.61, ground - 13);
  ctx.bezierCurveTo(width * 0.67, ground - 8, width * 0.71, ground + 10, width * 0.76, ground + 28);
  ctx.lineTo(width * 0.31, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();

  // Deterministic grass tufts add texture without flicker or visual noise.
  ctx.strokeStyle = '#566f4a88';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 14; i++) {
    const x = (i * 97 + 31) % width;
    const y = ground * 0.78 + ((i * 43) % Math.max(1, height - ground * 0.78));
    const blade = 4 + (i % 4);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 2, y - blade * 0.65, x - 4, y - blade);
    ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1, y - blade * 0.8, x + 3, y - blade * 1.2);
    ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y - blade * 0.5, x + 6, y - blade * 0.75);
    ctx.stroke();
  }

  // Farm plot and crops.
  roundedRect(width * 0.70, ground - 10, width * 0.29, height - ground + 35, 8, '#846543');
  ctx.strokeStyle = '#c89b49';
  ctx.lineWidth = 4;
  for (let row = 0; row < 5; row++) {
    const y = ground + 2 + row * 14;
    ctx.beginPath(); ctx.moveTo(width * 0.71, y); ctx.lineTo(width * 0.98, y - 8); ctx.stroke();
  }

  // Farmhouse.
  roundedRect(width * 0.83, ground * 0.47, width * 0.13, ground * 0.36, 3, '#e6d5af');
  ctx.fillStyle = '#b86542';
  ctx.beginPath();
  ctx.moveTo(width * 0.81, ground * 0.49); ctx.lineTo(width * 0.895, ground * 0.33);
  ctx.lineTo(width * 0.98, ground * 0.49); ctx.closePath(); ctx.fill();
  roundedRect(width * 0.87, ground * 0.63, width * 0.045, ground * 0.20, 2, '#74513d');

  // Wooden defensive wall.
  const wallX = width * 0.62;
  ctx.fillStyle = '#7b5238';
  for (let i = -2; i < 4; i++) {
    const x = wallX + i * 14;
    ctx.fillRect(x, ground - 120, 11, 125);
    ctx.beginPath(); ctx.moveTo(x, ground - 120); ctx.lineTo(x + 5.5, ground - 136); ctx.lineTo(x + 11, ground - 120); ctx.fill();
  }
  ctx.fillRect(wallX - 34, ground - 88, 80, 10);
  ctx.fillRect(wallX - 34, ground - 38, 80, 10);

  ctx.strokeStyle = '#6d8c5930';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 45) {
    ctx.beginPath(); ctx.moveTo(width * 0.5 + (x - width * 0.5) * 0.2, ground - 5); ctx.lineTo(x, height); ctx.stroke();
  }
}

function drawForegroundFoliage(width, height) {
  drawCartoonTree(-18, height + 4, 0.72, 'pine', 0.4, 1);
  drawCartoonTree(width + 10, height + 4, 0.66, 'cypress', 2.5, 1);
}

function drawShadow(x, y, width, opacity = 0.18) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.24);
  const gradient = ctx.createRadialGradient(0, 0, 3, 0, 0, width / 2);
  gradient.addColorStop(0, `rgba(38, 36, 32, ${opacity})`);
  gradient.addColorStop(0.58, `rgba(38, 36, 32, ${opacity * 0.52})`);
  gradient.addColorStop(1, 'rgba(38, 36, 32, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.arc(0, 0, width / 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSprite(sprite, x, groundY, height, flip = false, bob = 0, opacity = 1, shadowScale = 0.72, shadowOpacity = 0.18) {
  const width = height * sprite.width / sprite.height;
  drawShadow(x, groundY + 2, width * shadowScale, shadowOpacity);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, groundY + bob);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sprite, -width / 2, -height, width, height);
  ctx.restore();
}

function drawGuardHealthBar(x, y) {
  const width = 104;
  const height = 15;
  const ratio = Math.max(0, state.guardHp / state.maxGuardHp);
  ctx.save();
  ctx.shadowColor = '#2d211b55';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 2;
  roundedRect(x - width / 2, y, width, height, height / 2, '#392c28e8');
  ctx.shadowColor = 'transparent';
  roundedRect(x - width / 2 + 2, y + 2, width - 4, height - 4, (height - 4) / 2, '#6d5148');
  if (ratio > 0) {
    const fillWidth = (width - 4) * ratio;
    const gradient = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);
    gradient.addColorStop(0, '#8f322f');
    gradient.addColorStop(0.7, '#b64c3d');
    gradient.addColorStop(1, '#d08a48');
    roundedRect(x - width / 2 + 2, y + 2, fillWidth, height - 4, Math.min((height - 4) / 2, fillWidth / 2), gradient);
  }
  ctx.strokeStyle = '#d7aa58';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - width / 2, y, width, height, height / 2); ctx.stroke();
  ctx.fillStyle = '#fff4da';
  ctx.font = '700 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${state.guardHp} / ${state.maxGuardHp}`, x, y + height / 2 + 0.5);
  ctx.restore();
}

function drawEnemyHead(sprite, x, y, size, type = 'orc') {
  const elite = type === 'boss' || type === 'orcRed';
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = elite ? '#6e3c35' : type === 'orcShield' ? '#657b82' : type === 'orcDual' ? '#887a49' : '#8ea170';
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  const sourceX = sprite.width * 0.18;
  const sourceY = sprite.height * 0.01;
  const sourceWidth = sprite.width * 0.64;
  const sourceHeight = sprite.height * 0.38;
  ctx.drawImage(sprite, sourceX, sourceY, sourceWidth, sourceHeight, x - size / 2, y - size / 2, size, size);
  ctx.restore();
  ctx.strokeStyle = elite ? '#d08a48' : type === 'orcShield' ? '#a9c6cf' : '#d4b765';
  ctx.lineWidth = elite ? 3 : 2;
  ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.stroke();
}

function drawWaveRoster(width) {
  if (!sprites.orc) return;
  const plan = state.wavePlan.length ? state.wavePlan : buildWavePlan(state.wave);
  const counts = plan.reduce((result, type) => {
    result[type] = (result[type] || 0) + 1;
    return result;
  }, {});
  const entries = Object.entries(counts);
  const panelWidth = 66 + entries.length * 62;
  const x = width / 2 - panelWidth / 2;
  const y = 16;
  ctx.save();
  ctx.shadowColor = '#26302735';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  roundedRect(x, y, panelWidth, 54, 27, '#29352eea');
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#d4b76588';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x + 1, y + 1, panelWidth - 2, 52, 26); ctx.stroke();
  entries.forEach(([type, count], index) => {
    const itemX = x + 28 + index * 62;
    drawEnemyHead(sprites[type] || sprites.orc, itemX, y + 27, type === 'boss' ? 40 : 36, type);
    ctx.fillStyle = type === 'boss' || type === 'orcRed' ? '#ffd79a' : '#fff3d2';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText(`×${count}`, itemX + 21, y + 27);
  });
  ctx.fillStyle = '#92a087';
  ctx.font = '700 8px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`ВОЛНА ${state.wave}`, x + panelWidth - 14, y + 27);
  ctx.restore();
}

function drawFloaters(height) {
  const ground = height * 0.82;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const floater of state.floaters) {
    const progress = 1 - floater.life / floater.duration;
    const eased = 1 - Math.pow(1 - progress, 3);
    const y = ground - (floater.kind === 'food' ? 145 : floater.kind === 'hurt' ? 174 : 128) - eased * 56;
    const sway = Math.sin(progress * Math.PI * 2) * 3;
    const alpha = Math.min(1, floater.life * 2.6);
    const pop = 0.82 + Math.sin(Math.min(1, progress * 2) * Math.PI / 2) * 0.22;
    const label = floater.kind === 'food' ? `+${floater.amount}  🌾` : floater.kind === 'hurt' ? `−${floater.amount}  ♥` : floater.kind === 'reward' ? `ПОБЕДА  +${floater.amount}  🪙` : `+${floater.amount}  ☠`;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(floater.x + sway, y);
    ctx.scale(pop, pop);
    ctx.font = '700 17px system-ui, sans-serif';
    const textWidth = ctx.measureText(label).width;
    const bubble = floater.kind === 'food' ? '#fff5cbea' : floater.kind === 'hurt' ? '#7d2929ed' : '#402e27e6';
    roundedRect(-textWidth / 2 - 10, -14, textWidth + 20, 28, 14, bubble);
    ctx.fillStyle = floater.kind === 'food' ? '#8b6929' : floater.kind === 'hurt' ? '#ffe2d8' : '#fff1df';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawScene(width, height) {
  drawBackground(width, height);
  drawForegroundFoliage(width, height);
  if (!sprites.guard || !sprites.orc || !sprites.orcDual || !sprites.orcShield || !sprites.orcRed || !sprites.boss || !sprites.farmer) return;
  const ground = height * 0.82;
  const farmerDirection = Math.cos(state.time * 0.65) < 0;
  const farmerX = width * 0.84 + Math.sin(state.time * 0.65) * Math.min(36, width * 0.045);
  const farmerBob = Math.abs(Math.sin(state.time * 2.6)) * -2;
  drawSprite(sprites.farmer, farmerX, ground - 8, Math.min(134, height * 0.27), farmerDirection, farmerBob);

  for (const mob of state.mobs) {
    const bob = Math.abs(Math.sin(state.time * 7 + mob.bob)) * -4;
    const opacity = mob.hit > 0 ? Math.max(0, mob.hit / 0.18) : 1;
    const typeStats = enemyTypes[mob.type] || enemyTypes.orc;
    const mobHeight = Math.min(typeStats.height, height * (typeStats.height / 510));
    const mobSprite = sprites[mob.type] || sprites.orc;
    const shadowScale = mob.type === 'boss' ? 0.56 : mob.type === 'orcRed' ? 0.52 : 0.46;
    drawSprite(mobSprite, mob.x, ground, mobHeight, false, bob, opacity, shadowScale, 0.11);
    if (!mob.dead) {
      const barWidth = mob.type === 'boss' || mob.type === 'orcRed' ? 68 : mob.type === 'orcShield' ? 58 : 48;
      roundedRect(mob.x - barWidth / 2, ground - mobHeight - 18, barWidth, 6, 3, '#443d36aa');
      roundedRect(mob.x - barWidth / 2, ground - mobHeight - 18, barWidth * mob.hp / mob.maxHp, 6, 3, typeStats.bar);
    }
  }

  const attackProgress = state.attackTimer > 0 ? Math.sin((1 - state.attackTimer / 0.28) * Math.PI) : 0;
  const guardX = width * 0.56 - attackProgress * 15;
  drawSprite(sprites.guard, guardX, ground, Math.min(160, height * 0.32), true, Math.sin(state.time * 2.4) * -1.2);
  drawGuardHealthBar(width * 0.56, ground + 10);

  if (state.archerUnlocked) {
    drawSprite(sprites.guard, width * 0.64, ground - 112, Math.min(118, height * 0.23), true, Math.sin(state.time * 2) * -1);
    ctx.strokeStyle = '#775033'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(width * 0.64 - 30, ground - 175, 20, -1.2, 1.2); ctx.stroke();
  }

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
  drawWaveRoster(width);
  drawFloaters(height);
}

function syncUi() {
  ui.food.textContent = state.food;
  ui.coins.textContent = state.coins;
  ui.wave.textContent = state.wave;
  ui.kills.textContent = state.kills;
  ui['mob-count'].textContent = state.phase === 'wave' ? state.waveTotal - state.defeated : 0;
  ui['gate-value'].textContent = `${state.gate}/${state.maxGate}`;
  ui['gate-bar'].style.width = `${state.gate / state.maxGate * 100}%`;
  ui['guard-health-value'].textContent = `${state.guardHp}/${state.maxGuardHp}`;
  ui['guard-health-bar'].style.width = `${state.guardHp / state.maxGuardHp * 100}%`;
  ui['guard-status'].textContent = state.guardHp <= 0 ? 'ПАЛ' : state.attackTimer > 0 ? 'АТАКА' : 'ГОТОВ';
  const labels = { preparation: 'ПОДГОТОВКА', wave: state.running ? 'ВОЛНА ИДЁТ' : 'ПАУЗА', victory: 'ПОБЕДА', defeat: 'ВОРОТА ПАЛИ', complete: 'РУБЕЖ ЗАЩИЩЁН' };
  ui['state-label'].textContent = labels[state.phase];
  ui['live-dot'].style.background = state.phase === 'wave' && state.running ? '#b65a3c' : '#748c58';
  ui['farm-status'].textContent = `+ ${state.farmLevel} / 3с`;
  ui['guard-level'].textContent = `ур. ${state.guardLevel}`;
  ui['gate-level'].textContent = `ур. ${state.gateLevel}`;
  ui['farm-level'].textContent = `ур. ${state.farmLevel}`;
  const guardPrice = 5 + (state.guardLevel - 1) * 4;
  const gatePrice = 8 + (state.gateLevel - 1) * 6;
  const farmPrice = 6 + (state.farmLevel - 1) * 5;
  const healPrice = Math.ceil((state.maxGuardHp - state.guardHp) / 10);
  ui['guard-cost'].textContent = `${guardPrice} еды · +1 урон, +20 макс. HP`;
  ui['heal-cost'].textContent = healPrice ? `${healPrice} еды · восстановить полностью` : 'здоровье полное';
  ui['gate-cost'].textContent = `${gatePrice} монет · +25 прочности`;
  ui['farm-cost'].textContent = `${farmPrice} монет · больше еды`;
  const inBattle = state.phase === 'wave';
  ui['guard-upgrade'].disabled = inBattle || state.food < guardPrice;
  ui['heal-guard'].disabled = inBattle || healPrice === 0 || state.food < healPrice;
  ui['gate-upgrade'].disabled = inBattle || state.coins < gatePrice;
  ui['farm-upgrade'].disabled = inBattle || state.coins < farmPrice;
  ui['archer-row'].classList.toggle('locked', !state.archerUnlocked);
  ui['archer-status'].textContent = state.archerUnlocked ? 'ОТКРЫТ' : 'ЗАКРЫТ';
  ui['wave-button'].disabled = state.phase === 'wave' || state.phase === 'complete';
  ui['wave-button'].textContent = state.phase === 'defeat' ? '↻ Восстановить и повторить' : state.phase === 'victory' ? `⚑ Вызвать волну ${state.wave + 1}` : state.phase === 'complete' ? '✓ Пять волн пройдено' : `⚑ Вызвать волну ${state.wave}`;
}

function frame(now) {
  const delta = state.last ? Math.min((now - state.last) / 1000, 0.05) : 0;
  state.last = now;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  const worldWidth = 1170;
  const worldHeight = 540;
  update(delta, worldWidth);
  ctx.setTransform(canvas.width / worldWidth, 0, 0, canvas.height / worldHeight, 0, 0);
  ctx.clearRect(0, 0, worldWidth, worldHeight);
  drawScene(worldWidth, worldHeight);
  syncUi();
  requestAnimationFrame(frame);
}

ui.pause.onclick = () => {
  if (state.phase === 'defeat') return;
  state.running = !state.running;
  ui.pause.textContent = state.running ? 'Ⅱ Пауза' : '▶ Продолжить';
};
ui.speed.onclick = () => {
  state.speed = state.speed === 1 ? 2 : 1;
  ui.speed.textContent = `⏩ ${state.speed}×`;
};
ui['wave-button'].onclick = () => {
  if (state.phase === 'victory') state.wave += 1;
  if (state.phase === 'defeat') state.gate = state.maxGate;
  if (state.phase !== 'complete' && state.phase !== 'wave') startWave();
};
ui['guard-upgrade'].onclick = () => {
  const price = 5 + (state.guardLevel - 1) * 4;
  if (state.food >= price) {
    state.food -= price; state.guardLevel += 1; state.maxGuardHp += 20;
  }
};
ui['heal-guard'].onclick = () => {
  const price = Math.ceil((state.maxGuardHp - state.guardHp) / 10);
  if (price > 0 && state.food >= price) { state.food -= price; state.guardHp = state.maxGuardHp; }
};
ui['gate-upgrade'].onclick = () => {
  const price = 8 + (state.gateLevel - 1) * 6;
  if (state.coins >= price) {
    state.coins -= price; state.gateLevel += 1; state.maxGate += 25; state.gate = state.maxGate;
  }
};
ui['farm-upgrade'].onclick = () => {
  const price = 6 + (state.farmLevel - 1) * 5;
  if (state.coins >= price) { state.coins -= price; state.farmLevel += 1; }
};
ui.reset.onclick = resetGame;

Promise.all([
  ...Object.entries(sources).map(async ([name, config]) => {
    sprites[name] = await loadSprite(config);
  }),
  ...Object.entries(skySources).map(async ([name, src]) => {
    skyLayers[name] = await loadImage(src);
  }),
  ...Object.entries(landscapeSources).map(async ([name, src]) => {
    const image = await loadImage(src);
    const atmosphere = {
      // Like the reference: nearby foliage stays green, distance loses contrast and shifts blue.
      mountains: ['#619bc5', 0.70, 0.30],
      hills: ['#6699b1', 0.48, 0.16],
      treeline: ['#688f9b', 0.28, 0.06]
    }[name];
    landscapeLayers[name] = tintLandscapeLayer(image, atmosphere[0], atmosphere[1], atmosphere[2]);
  })
]).then(() => {
  ui.loading.classList.add('done');
}).catch(() => {
  ui.loading.textContent = 'Не удалось загрузить игровые ассеты';
});

requestAnimationFrame(frame);
