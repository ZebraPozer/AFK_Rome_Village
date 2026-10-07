'use strict';
function drawActBanner(width) {
  const notice = state.notice;
  if (!notice) return;
  const elapsed = NOTICE_TIME - notice.t;
  const pop = Math.min(1, easeOutBack(Math.min(1, elapsed / 0.45)));
  const slot = bannerSlot(width);
  ctx.save();
  ctx.globalAlpha = Math.min(1, notice.t / 0.4);
  ctx.translate(slot.x, slot.y);
  ctx.scale(pop, pop);
  // The backing hugs the text: widest line + padding.
  ctx.font = '700 18px system-ui, sans-serif';
  const titleWidth = ctx.measureText(notice.title).width;
  ctx.font = '500 11px system-ui, sans-serif';
  const subWidth = ctx.measureText(notice.subtitle).width;
  const w = Math.max(titleWidth, subWidth) + 40;
  roundedRect(-w / 2, -32, w, 64, HUD_R, BANNER_SURFACE);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 9px system-ui, sans-serif'; ctx.fillStyle = HUD_MUTED;
  ctx.fillText(notice.kicker, 0, -17);
  ctx.font = '700 18px system-ui, sans-serif'; ctx.fillStyle = HUD_ACCENT;
  ctx.fillText(notice.title, 0, 1);
  ctx.font = '500 11px system-ui, sans-serif'; ctx.fillStyle = HUD_TEXT;
  ctx.fillText(notice.subtitle, 0, 18);
  ctx.restore();
}

// One banner position for every message: under the roster with the HUD margin,
// centred in the area the upgrades panel leaves free.
const BANNER_SURFACE = 'rgba(22, 28, 24, 0.92)';
function activeBoss() {
  return state.phase === 'wave' ? state.mobs.find((mob) => !mob.dead && mob.countsForWave && enemyTypes[mob.type]?.isBoss) : null;
}

// Big boss health bar right under the roster.
function drawBossBar(width) {
  const boss = activeBoss();
  if (!boss) return;
  const w = 380;
  const x = width / 2 - w / 2;
  const y = HUD_M + HUD_T + 10;
  ctx.save();
  roundedRect(x, y, w, 20, 10, HUD_SURFACE);
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  if (ratio > 0) roundedRect(x + 3, y + 3, Math.max(14, (w - 6) * ratio), 14, 7, '#d24a32');
  ctx.fillStyle = HUD_TEXT; ctx.font = '700 10px system-ui, sans-serif'; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText((wavePreviewNames[boss.type] || 'Boss').toUpperCase(), x + 12, y + 10.5);
  ctx.textAlign = 'right'; ctx.fillText(`${formatNumber(Math.ceil(boss.hp))} / ${formatNumber(boss.maxHp)}`, x + w - 12, y + 10.5);
  ctx.restore();
}

function bannerSlot(width) {
  const panelLeft = width - HUD_M * 1.6 - width * 0.34;
  const centre = typeof hud !== 'undefined' && hud.open ? panelLeft / 2 : width / 2;
  return { x: centre, y: HUD_M + HUD_T + HUD_M + 32 + (activeBoss() ? 26 : 0) };
}

function drawForegroundFoliage(width, height) {
  drawCartoonTree(-18, height + 4, 0.72, 'pine', 0.4, 1);
  drawCartoonTree(width + 10, height + 4, 0.66, 'cypress', 2.5, 1);
}

function drawGuardHealthBar(x, y) {
  const width = 104;
  const height = 14;
  const ratio = Math.max(0, state.guardHp / state.maxGuardHp);
  const healing = state.regenFlash > 0;
  ctx.save();
  roundedRect(x - width / 2, y, width, height, height / 2, HUD_SURFACE);
  if (ratio > 0) {
    const fill = Math.max(height - 4, (width - 4) * ratio);
    roundedRect(x - width / 2 + 2, y + 2, fill, height - 4, (height - 4) / 2, healing ? '#5cc47c' : ratio < LOW_HP ? '#e0573f' : '#d8845a');
  }
  ctx.fillStyle = HUD_TEXT;
  ctx.font = '700 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil(state.guardHp)} / ${state.maxGuardHp}`, x, y + height / 2 + 0.5);
  ctx.restore();
}

// Cut-out head, no frame; placeholder enemies reuse a base head with a tint.
function drawEnemyHead(type, x, y, size) {
  const look = enemyLooks[type] || {};
  const image = portraits[type] || portraits[look.sprite] || portraits.orc;
  if (!image) return;
  const filter = portraits[type] ? null : (look.filter || portraitTints[type] || null);
  ctx.drawImage(tinted(image, filter), x - size / 2, y - size / 2, size, size);
}

// World units matching the HUD's cqh sizes (the world is 540 high).
const HUD_M = 540 * 0.04;     // edge margin
const HUD_T = 540 * 0.125;    // tile size
const HUD_R = 540 * 0.028;    // corner radius

function rosterFreeSpan(width) {
  const fallback = { left: 200, right: width - 260 };
  const card = canvas.parentElement;
  const left = ui['hud-sound'];
  const right = ui.coins && ui.coins.closest ? ui.coins.closest('.resources') : null;
  if (!card || !left || !right || typeof card.getBoundingClientRect !== 'function') return fallback;
  const c = card.getBoundingClientRect();
  if (!c.width) return fallback;
  const scale = width / c.width;
  return {
    left: (left.getBoundingClientRect().right - c.left) * scale + HUD_M,
    right: (right.getBoundingClientRect().left - c.left) * scale - HUD_M
  };
}

function drawWaveRoster(width) {
  if (!portraits.orc) return;
  // During a wave show what is attacking; between waves show what comes next.
  const shownWave = state.phase === 'victory' && !(state.townLevel < requiredTown(state.wave + 1)) ? state.wave + 1 : state.wave;
  const plan = state.phase === 'wave' && state.wavePlan.length ? state.wavePlan : buildWavePlan(shownWave);
  const counts = plan.reduce((result, type) => {
    result[type] = (result[type] || 0) + 1;
    return result;
  }, {});
  const entries = Object.entries(counts);
  const many = entries.length > 3;
  const pad = 14;
  const head = many ? 34 : 40;
  const countWidth = many ? 20 : 24;
  const gap = many ? 8 : 12;
  const labelWidth = 40;
  const panelWidth = pad + labelWidth + entries.length * (head + 4 + countWidth) + (entries.length - 1) * gap + pad;
  // Centre on screen, but stay inside the gap between the top-left tiles and the resources.
  const free = rosterFreeSpan(width);
  const x = Math.max(free.left, Math.min(free.right - panelWidth, width / 2 - panelWidth / 2));
  const y = HUD_M;
  const mid = y + HUD_T / 2;
  ctx.save();
  roundedRect(x, y, panelWidth, HUD_T, HUD_R, HUD_SURFACE);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = HUD_MUTED;
  ctx.font = '600 9px system-ui, sans-serif';
  ctx.fillText('WAVE', x + pad, mid - 10);
  ctx.fillStyle = HUD_TEXT;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(String(shownWave), x + pad, mid + 8);
  let itemX = x + pad + labelWidth;
  for (const [type, count] of entries) {
    drawEnemyHead(type, itemX + head / 2, mid, head);
    ctx.fillStyle = enemyTypes[type]?.isBoss ? HUD_ACCENT : HUD_TEXT;
    ctx.textAlign = 'left';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText(`×${count}`, itemX + head + 4, mid - (traitsOf(type).length ? 6 : 0));
    // Traits as small glyphs next to the count.
    ctx.font = '700 9px system-ui, sans-serif';
    traitsOf(type).forEach((trait, i) => {
      ctx.fillStyle = traitInfo[trait].color;
      ctx.fillText(traitInfo[trait].glyph, itemX + head + 4 + i * 11, mid + 9);
    });
    itemX += head + 4 + countWidth + gap;
  }
  ctx.restore();
}

function drawFloaters(height) {
  const ground = height * GROUND_RATIO;
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
    if (floater.kind === 'heal') {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#a2ffb2';
      ctx.shadowColor = '#278d50';
      ctx.shadowBlur = 8;
      ctx.font = '800 24px system-ui, sans-serif';
      ctx.fillText('+', floater.x + sway, ground - 40 - (floater.offsetY || 0) - progress * 115);
      ctx.restore();
      continue;
    }
    const resourceIcon = floater.kind === 'food' ? resourceIcons.food : floater.kind === 'reward' ? resourceIcons.gold : null;
    const label = floater.kind === 'gear' ? `⚒ ${floater.amount}` : floater.kind === 'bash' ? `BASH −${floater.amount}` : floater.kind === 'hold' ? 'HOLD · −70% DMG' : floater.kind === 'bless' ? `+${floater.amount} ♥` : floater.kind === 'stolen' ? `−${floater.amount} STOLEN` : floater.kind === 'volley' ? `VOLLEY −${floater.amount}` : floater.kind === 'food' ? `+${floater.amount}` : floater.kind === 'hurt' ? `−${floater.amount}  ♥` : floater.kind === 'spikes' ? `−${floater.amount}  ⋀` : floater.kind === 'arrow' ? `−${floater.amount}  ➶` : floater.kind === 'reward' ? `VICTORY  +${floater.amount}` : `+${floater.amount}  ☠`;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(floater.x + sway, y);
    ctx.scale(pop, pop);
    ctx.font = '700 17px system-ui, sans-serif';
    const iconSize = resourceIcon ? 18 : 0;
    const iconGap = resourceIcon ? 4 : 0;
    const textWidth = ctx.measureText(label).width;
    const contentWidth = textWidth + iconSize + iconGap;
    const bubble = floater.kind === 'food' ? '#fff5cbea' : floater.kind === 'hurt' ? '#7d2929ed' : '#402e27e6';
    roundedRect(-contentWidth / 2 - 10, -14, contentWidth + 20, 28, 14, bubble);
    ctx.fillStyle = floater.kind === 'food' ? '#8b6929' : floater.kind === 'hurt' ? '#ffe2d8' : '#fff1df';
    ctx.fillText(label, resourceIcon ? -(iconSize + iconGap) / 2 : 0, 0);
    if (resourceIcon) ctx.drawImage(resourceIcon, contentWidth / 2 - iconSize, -iconSize / 2, iconSize, iconSize);
    ctx.restore();
  }
  ctx.restore();
}
