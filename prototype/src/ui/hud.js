'use strict';
 // reassigned briefly while baking cached layers
const ui = Object.fromEntries([
  'food','coins','wave','kills','mob-count','pause','speed',
  'reset','wave-button','wave-difficulty','wave-preview','boss-progress','specialization-note','state-label','live-dot','guard-status','farm-status','loading',
  'guard-upgrade','spikes-upgrade','farm-upgrade','guard-level','spikes-level','farm-level',
  'guard-cost','spikes-cost','farm-cost','guard-health-value','guard-health-bar','archer-row','archer-status','archer-note',
  'spell-bar','lineup','auto-lineup','auto-spells',
  'archer-upgrade','archer-level','archer-cost',
  'catapult-upgrade','catapult-level','catapult-cost','tower-slot',
  'village-stage','town-upgrade','town-level','town-cost','sound-toggle','sound-volume',
  'hud-pause','hud-sound','hud-wave','hud-speed','hud-upgrade','hud-panel',
  'hud-tab-upgrades','hud-tab-heroes','hud-close','hud-training','hud-gear',
  'away','away-time','away-food','away-gold','away-cap','away-collect','hint',
  'trophies','eagles','trophy-pill','eagle-pill',
  'afk-custom','afk-custom-go','afk-efficiency','afk-cap','afk-forecast','stats-summary','stats-export','stats-clear',
  'cheat-wave','cheat-jump','hud-upgrades','hud-heroes','hud-lineup','hud-auto-lineup'
].map((id) => [id, document.getElementById(id)]));

let spellBarKey = '';
function syncSpellBar() {
  const bar = ui['spell-bar'];
  const ids = activeHeroes().filter((id) => heroDefs[id].spell);
  const key = ids.join(',');
  if (key !== spellBarKey) {
    spellBarKey = key;
    const keys = { front: '1', tower: '2', support: '3' };
    bar.innerHTML = ids.map((id) => {
      const spell = heroDefs[id].spell;
      const icon = spellIconSources[spell.id];
      return `<button class="tile tile-label spell" data-hero="${id}" title="${keys[heroDefs[id].role]} · ${heroDefs[id].name}: ${spell.name} — ${spell.hint}"><img src="${icon}" alt=""><small>${spell.short}</small><i class="cd"></i></button>`;
    }).join('') + (ids.length ? '<button class="tile tile-label spell-auto" data-auto="1" title="Heroes cast spells by themselves"><span>⟳</span><small>Auto</small></button>' : '');
  }
  if (typeof bar.querySelectorAll !== 'function') return;
  for (const button of bar.querySelectorAll('.spell')) {
    const id = button.dataset.hero;
    const blocked = spellBlocked(id);
    const cd = state.heroes[id].cd;
    const overlay = button.querySelector('.cd');
    overlay.style.display = cd > 0 ? '' : 'none';
    overlay.style.height = `${cd / heroDefs[id].spell.cooldown * 100}%`;
    overlay.textContent = '';
    button.querySelector('small').textContent = cd > 0 ? `${Math.ceil(cd)}s` : heroDefs[id].spell.short;
    button.disabled = Boolean(blocked);
    button.classList.toggle('ready', !blocked);
    button.classList.toggle('rested', state.heroes[id].rested);
    button.classList.toggle('tired', state.heroes[id].fatigue >= 2);
  }
  const auto = bar.querySelector('.spell-auto');
  if (auto) auto.classList.toggle('active', state.autoSpells);
}

let lineupKey = '';
function syncLineup() {
  const parts = slotDefs.map((slot) => {
    if (!slotUnlocked(slot.role)) return { slot, locked: true };
    const id = slotHero(slot.role);
    return { slot, id, options: heroesForRole(slot.role), condition: id ? heroCondition(id) : null };
  });
  const bench = Object.keys(heroDefs).filter((id) => state.heroes[id].unlocked && !activeHeroes().includes(id) && !heroDefs[id].machine);
  const key = JSON.stringify([parts.map((p) => [p.id, p.locked, p.options, p.condition]), bench, state.phase === 'wave',
    bench.map((id) => state.heroes[id].rested)]);
  if (key === lineupKey) return;
  lineupKey = key;
  const unlockText = { tower: 'unlocks at Town II', support: 'unlocks at Town III' };
  const inWave = state.phase === 'wave';
  ui.lineup.innerHTML = ui['hud-lineup'].innerHTML = parts.map((p) => {
    if (p.locked) return `<button class="row" disabled><span><b>${p.slot.name}</b><small>${unlockText[p.slot.role]}</small></span><em>Locked</em></button>`;
    const def = heroDefs[p.id];
    const swap = p.options.length > 1 && !inWave;
    const spell = def.spell ? `${def.spell.name} — ${def.spell.hint}` : 'no spell · never tires';
    return `<button class="row" data-role="${p.slot.role}" ${swap ? '' : 'disabled'} title="${swap ? 'Tap to swap in another hero' : ''}"><span><b>${p.slot.name} · ${def.name}${swap ? ' ⇄' : ''}</b><small>${spell}</small></span><em class="${p.condition.tone}">${p.condition.label}</em></button>`;
  }).join('') + `<p class="row-note">${bench.length ? `Resting: ${bench.map((id) => `${heroDefs[id].name}${state.heroes[id].rested ? ' (rested)' : ''}`).join(', ')}` : 'No reserve heroes yet — rotation opens once a slot has a substitute.'}</p>`;
}

// ---------------------------------------------------------------------------
// In-phone HUD. It mirrors the debug panel: every action calls the same handler,
// so the rules live in one place.
// ---------------------------------------------------------------------------
const hud = { open: false, tab: 'upgrades' };
const hudUpgrades = [
  { kind: 'town', icon: '⌂', name: 'Town', level: 'town-level', cost: 'town-cost', button: 'town-upgrade' },
  { kind: 'guard', icon: '⚔', name: 'Frontline', level: 'guard-level', cost: 'guard-cost', button: 'guard-upgrade' },
  { kind: 'spikes', icon: '⋀', name: 'Spikes', level: 'spikes-level', cost: 'spikes-cost', button: 'spikes-upgrade' },
  { kind: 'archer', icon: '➶', name: 'Archer', level: 'archer-level', cost: 'archer-cost', button: 'archer-upgrade', show: () => state.archerUnlocked },
  { kind: 'catapult', icon: '☄', name: 'Catapult', level: 'catapult-level', cost: 'catapult-cost', button: 'catapult-upgrade', show: () => state.catapultUnlocked },
  { kind: 'farm', icon: '✶', name: 'Farm', level: 'farm-level', cost: 'farm-cost', button: 'farm-upgrade' }
];
let hudUpgradesKey = '';
let hudTrainingKey = '';

function setHudOpen(open) {
  hud.open = open && state.phase !== 'wave';
}

// ---------------------------------------------------------------------------
// First-minute hints: one at a time, each shown until the player does the thing.
// ---------------------------------------------------------------------------
const hints = [
  { id: 'call', target: 'hud-wave', text: 'Tap to call the first wave',
    show: () => state.phase === 'preparation' && state.wavesCleared === 0 && state.wave === 1 },
  { id: 'bash', target: 'spell-bar', text: 'Orc in reach — tap Bash to stun it',
    show: () => state.phase === 'wave' && state.frontHero === 'legionary' && !spellBlocked('legionary') },
  { id: 'upgrade', target: 'hud-upgrade', text: 'Spend food: upgrade your Frontline',
    show: () => state.phase !== 'wave' && state.wavesCleared >= 1 && !ui['guard-upgrade'].disabled && !hud.open },
  { id: 'defeat', target: 'hud-upgrade', text: 'Lost? Upgrade, then retry the wave',
    show: () => state.phase === 'defeat' && !hud.open },
  { id: 'boss', target: 'hud-wave', text: 'Boss next! Reach the recommended level first',
    show: () => state.phase === 'victory' && isBossWave(state.wave + 1) && !hud.open },
  { id: 'heroes', target: 'hud-upgrade', text: 'New hero! Swap heroes in Upgrades → Heroes',
    show: () => state.heroes.hoplite.unlocked && state.phase !== 'wave' && !hud.open }
];

function currentHint() {
  if (ui.away && ui.away.hidden === false) return null;
  return hints.find((hint) => !state.hintsSeen.includes(hint.id) && hint.show()) || null;
}

function syncHint() {
  const hint = currentHint();
  const el = ui.hint;
  el.hidden = !hint;
  if (!hint) return;
  if (el.dataset) el.dataset.id = hint.id;
  if (el.textContent !== hint.text) el.textContent = hint.text;
  const card = canvas.parentElement;
  let target = ui[hint.target];
  if (hint.target === 'spell-bar' && target && target.querySelector) target = target.querySelector('.spell') || target;
  if (!card || !target || typeof target.getBoundingClientRect !== 'function') return;
  const c = card.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const half = (el.offsetWidth || 240) / 2 + 12; // keep the bubble inside the screen
  const x = Math.min(c.width - half, Math.max(half, t.left - c.left + t.width / 2));
  el.style.left = `${x}px`;
  el.style.bottom = `${c.bottom - t.top + 12}px`;
  el.style.setProperty('--arrow', `${t.left - c.left + t.width / 2 - x}px`);
}

let gearKey = '';
function syncGear() {
  const key = JSON.stringify([systemUnlocked('armory'), state.gear, state.phase === 'wave']);
  if (key === gearKey) return;
  gearKey = key;
  if (!systemUnlocked('armory')) { ui['hud-gear'].innerHTML = ''; return; }
  const inWave = state.phase === 'wave';
  const rows = state.gear.slice().sort((a, b) => b.rarity - a.rarity || a.slot.localeCompare(b.slot)).map((item) => {
    const slot = GEAR_SLOTS[item.slot];
    const sign = item.slot === 'weapon' ? '+' : '−';
    const owner = item.owner ? heroDefs[item.owner].name : 'in storage';
    return `<button class="row" data-gear="${item.id}" ${inWave ? 'disabled' : ''} title="Tap to give it to the next hero"><i>${slot.icon}</i><span><b>${gearName(item)}</b><small>${RARITY[item.rarity]} · ${sign}${Math.round(slot.values[item.rarity] * 100)}% ${slot.label}</small></span><em class="${item.owner ? 'good' : ''}">${owner}</em></button>`;
  }).join('');
  ui['hud-gear'].innerHTML = `<p class="row-note"><b>Armory</b> · tap an item to pass it to the next hero</p>${rows || '<p class="row-note">No gear yet — bosses drop it, elites sometimes.</p>'}`;
}

function syncHud() {
  const inWave = state.phase === 'wave';
  if (inWave) hud.open = false;
  const card = canvas.parentElement;
  if (card && card.classList) card.classList.toggle('panel-open', hud.open);
  ui['hud-panel'].hidden = !hud.open;
  ui['hud-upgrades'].hidden = hud.tab !== 'upgrades';
  ui['hud-heroes'].hidden = hud.tab !== 'heroes';
  ui['hud-tab-upgrades'].classList.toggle('active', hud.tab === 'upgrades');
  ui['hud-tab-heroes'].classList.toggle('active', hud.tab === 'heroes');

  // Corner button: upgrades between waves, a lock during combat, a cross when open.
  const villageAffordable = hudUpgrades.filter((row) => (!row.show || row.show()) && !ui[row.button].disabled).length
    + SYSTEMS.filter((sys) => canUnlockSystem(sys.id)).length
    + Object.keys(GODS).filter((god) => canOffer(god)).length;
  const heroAffordable = Object.keys(heroDefs).filter((id) => canTrain(id)).length;
  const affordable = villageAffordable + heroAffordable;
  hud.villageAffordable = villageAffordable;
  hud.heroAffordable = heroAffordable;
  const tabCount = (count) => count ? ` <span class="tab-count">${count}</span>` : '';
  ui['hud-tab-upgrades'].innerHTML = `Village${tabCount(villageAffordable)}`;
  ui['hud-tab-heroes'].innerHTML = `Heroes${tabCount(heroAffordable)}`;
  ui['hud-upgrade'].classList.toggle('active', hud.open);
  ui['hud-upgrade'].disabled = inWave;
  const upgradeHtml = inWave ? '<span>🔒</span><small>In battle</small>'
    : `<span>⬆</span><small>${affordable ? `${affordable} ready` : 'Upgrades'}</small>`;
  if (hud.upgradeHtml !== upgradeHtml) {
    hud.upgradeHtml = upgradeHtml;
    ui['hud-upgrade'].innerHTML = upgradeHtml;
  }

  // Village and system rows: rebuilt only when their text or state changes.
  const rows = hudUpgrades.filter((row) => !row.show || row.show()).map((row) => ({
    ...row, levelText: ui[row.level].textContent, costText: ui[row.cost].textContent, disabled: Boolean(ui[row.button].disabled)
  }));
  // Temple offerings remain with the settlement upgrades.
  if (systemUnlocked('temple')) {
    for (const [god, def] of Object.entries(GODS)) {
      const sign = god === 'minerva' ? '−' : '+';
      rows.push({ kind: `god-${god}`, icon: def.icon, name: `Offer to ${def.name}`, offer: god,
        levelText: `${sign}${Math.round(godBonus(god) * 100)}%`,
        costText: `${formatNumber(offeringPrice(god))} ${def.resource === 'coins' ? 'gold' : 'food'} · ${sign}${Math.round(def.per * 100)}% ${def.text}`,
        disabled: !canOffer(god) });
    }
  }
  // Systems bought with an eagle appear once their boss has been beaten.
  for (const sys of SYSTEMS) {
    if (systemUnlocked(sys.id) || state.wavesCleared < sys.wave) continue;
    rows.unshift({ kind: `sys-${sys.id}`, icon: sys.icon, name: `${sys.soon ? '' : 'Unlock '}${sys.name}`, system: sys.id,
      levelText: sys.soon ? 'soon' : '1 🦅', costText: sys.soon ? `${sys.text} · coming soon, keep your eagle` : sys.text, disabled: !canUnlockSystem(sys.id) });
  }
  const key = JSON.stringify(rows.map((row) => [row.kind, row.levelText, row.costText, row.disabled]));
  if (key !== hudUpgradesKey) {
    hudUpgradesKey = key;
    const attr = (row) => row.system ? `data-system="${row.system}"` : row.train ? `data-train="${row.train}"` : row.offer ? `data-offer="${row.offer}"` : `data-upgrade="${row.button}"`;
    ui['hud-upgrades'].innerHTML = rows.map((row) => `<button class="row" ${attr(row)} ${row.disabled ? 'disabled' : ''}><i>${row.icon}</i><span><b>${row.name}</b><small>${row.costText}</small></span><em>${row.levelText}</em></button>`).join('');
  }

  // Barracks training belongs with the heroes, not in the village upgrade list.
  // Show both levels so the result of the tap is explicit.
  const training = systemUnlocked('barracks') ? Object.keys(heroDefs)
    .filter((id) => state.heroes[id].unlocked && !heroDefs[id].machine)
    .map((id) => ({
      id,
      name: heroDefs[id].name,
      current: heroLevel(id),
      price: trainPrice(id),
      disabled: !canTrain(id)
    })) : [];
  const trainingKey = JSON.stringify(training);
  if (trainingKey !== hudTrainingKey) {
    hudTrainingKey = trainingKey;
    ui['hud-training'].innerHTML = training.length ? `
      <p class="list-heading">Hero training</p>
      <p class="row-note">Permanent levels for each hero · swapping heroes is still free.</p>
      ${training.map((hero) => `<div class="row training-row">
        <i>⚑</i><span><b>${hero.name}</b><small>${formatNumber(hero.price)} food · +${Math.round(BARRACKS.damage * 100)}% damage · +${Math.round(BARRACKS.toughness * 100)}% toughness</small></span>
        <div class="training-action"><em class="level-up">Lv ${hero.current} → ${hero.current + 1}</em><button data-train="${hero.id}" ${hero.disabled ? 'disabled' : ''}>Upgrade</button></div>
      </div>`).join('')}` : '';
  }

  // Wave button: short labels for the phone.
  const needsTown = state.phase === 'victory' && state.townLevel < requiredTown(state.wave + 1);
  const left = state.waveTotal - state.defeated;
  ui['hud-wave'].disabled = inWave;
  const nextWave = state.phase === 'victory' ? state.wave + 1 : state.phase === 'complete' ? FINAL_WAVE : state.wave;
  const boss = isBossWave(nextWave);
  const title = inWave ? `⚔ ${left} left`
    : needsTown ? '⌂ Upgrade town'
    : state.phase === 'defeat' ? `↻ Retry wave ${state.wave}`
    : `${state.phase === 'complete' ? '↻' : boss ? '☠' : '⚑'} ${boss ? 'Boss · wave' : 'Wave'} ${nextWave}`;
  const rec = recommendedLevel(nextWave);
  const sub = inWave || needsTown ? '' : `<small class="${state.guardLevel >= rec ? 'ok' : 'low'}">Frontline lv ${rec} ${state.guardLevel >= rec ? '✓' : 'recommended'}</small>`;
  const waveHtml = `<span>${title}</span>${sub}`;
  if (hud.waveHtml !== waveHtml) { hud.waveHtml = waveHtml; ui['hud-wave'].innerHTML = waveHtml; }
  ui['hud-wave'].classList.toggle('boss', boss && !inWave);
  ui['hud-wave'].classList.toggle('ready', !inWave && !needsTown && !hud.open);
  ui['hud-speed'].textContent = `${state.speed}×`;
  ui['hud-pause'].textContent = state.running ? 'Ⅱ' : '▶';
  ui['hud-sound'].textContent = sound.enabled ? '🔊' : '🔈';
  syncGear();
  syncHint();
}
