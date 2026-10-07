'use strict';
const canvas = document.querySelector('#game');
let ctx = canvas.getContext('2d');

// Runtime sprites are pre-cut, web-sized copies built from art/ by tools/build_assets.py.
const sources = {
  guard: { src: 'assets/characters/roman-legionary.png' },
  orc: { src: 'assets/characters/orc-raider.png' },
  orcDual: { src: 'assets/characters/orc-dual-swords.png' },
  orcShield: { src: 'assets/characters/orc-shield-guard.png' },
  orcRed: { src: 'assets/characters/orc-red-elite.png' },
  boss: { src: 'assets/characters/orc-brute-boss.png' },
  farmer: { src: 'assets/characters/roman-farmer.png' },
  farmerWoman: { src: 'assets/characters/roman-farmer-woman.png' },
  villageGirl: { src: 'assets/characters/roman-village-girl.png', background: 'checker' },
  villageBoy: { src: 'assets/characters/roman-village-boy.png' },
  archer: { src: 'assets/characters/roman-archer.png' },
  hoplite: { src: 'assets/characters/greek-hoplite.png' },
  priestess: { src: 'assets/characters/roman-priestess.png' },
  spikes: { src: 'assets/obstacles/palisade.png' }
};

// Trait glyphs shown on the wave roster and what they mean (see GAME_DESIGN 13.2).
const traitInfo = {
  shield: { glyph: '◐', color: '#a9c6cf', name: GAME_DATA.enemies.traits.shield.description },
  armor:  { glyph: '▣', color: '#c9c3b5', name: GAME_DATA.enemies.traits.armor.description },
  swarm:  { glyph: '✦', color: '#e6e36a', name: GAME_DATA.enemies.traits.swarm.description },
  ranged: { glyph: '➶', color: '#c7a6f0', name: GAME_DATA.enemies.traits.ranged.description },
  charge: { glyph: '»', color: '#f0a160', name: GAME_DATA.enemies.traits.charge.description },
  aura:   { glyph: '✚', color: '#9fd0ff', name: GAME_DATA.enemies.traits.aura.description },
  enrage: { glyph: '♨', color: '#ff7a59', name: GAME_DATA.enemies.traits.enrage.description }
};

// Placeholder art for act II: tinted orc sprites plus drawn props.
const enemyLooks = {
  goblin:    { sprite: 'orc', filter: 'hue-rotate(38deg) saturate(1.3) brightness(1.1)' },
  orcArcher: { sprite: 'orcDual', filter: 'hue-rotate(-55deg) saturate(0.85)', prop: 'bow' },
  boar:      { sprite: 'orc', prop: 'boar' },
  shaman:    { sprite: 'orcRed', filter: 'hue-rotate(245deg) saturate(1.15)', prop: 'staff' },
  troll:      { sprite: 'orcShield', filter: 'hue-rotate(70deg) saturate(0.6) brightness(0.85)' },
  wolfRider:  { sprite: 'orc', prop: 'boar', filter: 'saturate(0.35) brightness(0.95)' },
  berserker:  { sprite: 'orcDual', filter: 'hue-rotate(-30deg) saturate(1.6) contrast(1.1)' },
  goblinKing: { sprite: 'orc', filter: 'hue-rotate(38deg) saturate(1.5) brightness(1.15)' },
  warlord:    { sprite: 'orcRed', filter: 'brightness(0.75) saturate(1.3)' },
  ogreChief:  { sprite: 'boss', filter: 'hue-rotate(25deg) saturate(1.2)' },
  cyclops:    { sprite: 'boss', filter: 'hue-rotate(190deg) saturate(0.8)' }
};

function enemySprite(type) {
  const look = enemyLooks[type];
  return sprites[(look && look.sprite) || type] || sprites.orc;
}

const sprites = {};
const skyLayers = {};
const skySources = {
  bank: 'assets/sky/cloud-bank-far.png',
  cumulus: 'assets/sky/cloud-cumulus.png',
  wisp: 'assets/sky/cloud-wisp.png',
  sunlit: 'assets/sky/cloud-sunlit.png'
};
const landscapeLayers = {};
const landscapeSources = {
  mountains: 'assets/landscape/mountains.png',
  hills: 'assets/landscape/hills.png',
  treeline: 'assets/landscape/treeline.png',
  grass: 'assets/landscape/grass-tile.jpg'
};
const structureSources = {
  guardTower: 'assets/buildings/wooden-guard-tower.png'
};
const structures = {};
const resourceSources = { food: 'assets/icons/food.png', gold: 'assets/icons/gold.png' };
const resourceIcons = {};
const spellIconSources = {
  shieldBash: 'assets/ui/spell-shield-bash.png',
  holdLine: 'assets/ui/spell-hold-the-line.png',
  volley: 'assets/ui/spell-volley.png',
  blessing: 'assets/ui/spell-blessing.png'
};
const spellIcons = {};
// Cut-out head icons for the wave roster. Only the raider and the boss have
// real heads so far; other enemies reuse the raider head with a tint until
// their own heads are rendered (see ASSET_REQUESTS.md).
const portraitSources = {
  orc: 'assets/icons/orc-raider-head.png',
  boss: 'assets/icons/orc-brute-boss-head.png'
};
const portraitTints = {
  orcRed: 'hue-rotate(-75deg) saturate(1.4)',
  orcShield: 'saturate(0.55) brightness(0.9)',
  orcDual: 'hue-rotate(-20deg)'
};
const portraits = {};

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

  if (type === 'checker') {
    // Generated checkerboards can leave enclosed gray cells and decorative dark
    // marks between the timbers. Keep saturated wood/rope/metal plus a narrow
    // outline around it, and clear neutral pixels everywhere else.
    let foreground = new Uint8Array(width * height);
    for (let i = 0; i < foreground.length; i++) {
      const p = i * 4;
      if (data[p + 3] < 20) continue;
      const max = Math.max(data[p], data[p + 1], data[p + 2]);
      const min = Math.min(data[p], data[p + 1], data[p + 2]);
      if (max - min > 22) foreground[i] = 1;
    }
    for (let pass = 0; pass < 4; pass++) {
      const expanded = foreground.slice();
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = y * width + x;
          if (foreground[index]) continue;
          if (foreground[index - 1] || foreground[index + 1] || foreground[index - width] || foreground[index + width]) {
            expanded[index] = 1;
          }
        }
      }
      foreground = expanded;
    }
    for (let i = 0; i < foreground.length; i++) {
      if (!foreground[i]) data[i * 4 + 3] = 0;
    }
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
      // Runtime sprites are pre-cut by tools/build_assets.py: use them as they are.
      // (No pixel reads, so the game also runs from a double-clicked file:// page.)
      if (!config.crop && !config.background) { resolve(image); return; }
      const [x, y, width, height] = config.crop || [0, 0, image.naturalWidth, image.naturalHeight];
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

function roundedRect(x, y, width, height, radius, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Village growth — hyper-casual style matched to the character sheets:
// chunky rounded shapes, thick dark-brown outline, flat fills with one
// light and one shade tone, warm saturated palette.
// ---------------------------------------------------------------------------
const INK = '#3a2516';

function strokeInk(width = 3) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.stroke();
}

function fillInk(fill, width = 3) {
  ctx.fillStyle = fill;
  ctx.fill();
  strokeInk(width);
}

function easeOutBack(t) {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
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

// Canvas filters are very slow when applied every frame, so each tinted variant of a
// sprite is rendered once into its own canvas and reused.
const tintCache = new Map();
function tinted(image, filter) {
  if (!filter || !image || typeof document === 'undefined') return image;
  let byFilter = tintCache.get(image);
  if (!byFilter) { byFilter = new Map(); tintCache.set(image, byFilter); }
  let canvasCopy = byFilter.get(filter);
  if (!canvasCopy) {
    canvasCopy = document.createElement('canvas');
    canvasCopy.width = image.width; canvasCopy.height = image.height;
    const g = canvasCopy.getContext('2d');
    g.filter = filter;
    g.drawImage(image, 0, 0);
    byFilter.set(filter, canvasCopy);
  }
  return canvasCopy;
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

function drawStructure(sprite, x, groundY, height) {
  const width = height * sprite.width / sprite.height;
  drawShadow(x, groundY + 3, width * 0.82, 0.16);
  ctx.drawImage(tinted(sprite, 'contrast(0.9) brightness(1.02)'), x - width / 2, groundY - height, width, height);
}
