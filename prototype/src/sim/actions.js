'use strict';
// ---------------------------------------------------------------------------
// Player commands. Every button, key and bot goes through these functions, so
// the rules live in one place. Unreal: UFUNCTION(BlueprintCallable) on the
// game subsystem; the UMG widgets only call them.
// ---------------------------------------------------------------------------
const PURCHASES = {
  frontline: { resource: 'food', price: () => guardUpgradePrice(), cap: 'guard',
    apply: () => { state.guardLevel += 1; state.maxGuardHp += GAME_DATA.economy.frontline.hpPerLevel; markHint('upgrade'); }, level: () => state.guardLevel },
  spikes: { resource: 'coins', price: () => spikesPrice(), cap: 'spikes', apply: () => { state.spikesLevel += 1; }, level: () => state.spikesLevel },
  farm: { resource: 'coins', price: () => farmPrice(), cap: 'farm', anyPhase: true, apply: () => { state.farmLevel += 1; }, level: () => state.farmLevel },
  archer: { resource: 'coins', price: () => archerPrice(), cap: 'archer', requires: () => state.archerUnlocked, apply: () => { state.archerLevel += 1; }, level: () => state.archerLevel },
  catapult: { resource: 'coins', price: () => catapultPrice(), cap: 'catapult', requires: () => state.catapultUnlocked, apply: () => { state.catapultLevel += 1; }, level: () => state.catapultLevel }
};

function canBuy(kind) {
  const p = PURCHASES[kind];
  if (!p || !canUpgrade(p.cap)) return false;
  if (p.requires && !p.requires()) return false;
  if (!p.anyPhase && state.phase === 'wave') return false;
  return state[p.resource] >= p.price();
}

// Returns true when something was bought.
function buy(kind) {
  if (!canBuy(kind)) return false;
  const p = PURCHASES[kind];
  const price = p.price();
  state[p.resource] -= price;
  p.apply();
  recordStat('buy', { item: kind, level: p.level(), cost: price });
  return true;
}

// Call the next wave (or retry / replay). Ignored while a wave is running.
function callWave() {
  if (state.phase === 'victory' && state.townLevel < requiredTown(state.wave + 1)) return false;
  if (state.phase === 'victory') state.wave += 1;
  // After the campaign the last wave stays replayable to try out the full lineup.
  if (state.phase === 'complete') state.phase = 'preparation';
  if (state.phase === 'wave') return false;
  startWave();
  return state.phase === 'wave';
}

function togglePause() {
  if (state.phase === 'defeat') return;
  state.running = !state.running;
}

function cycleSpeed() {
  state.speed = ({ 1: 2, 2: 100, 100: 1 })[state.speed] || 1;
}
