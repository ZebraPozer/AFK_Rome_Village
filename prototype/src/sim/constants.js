'use strict';
// World geometry (1170 × 540 world units). The ground line sits above the bottom HUD row,
// and actors are drawn at ACTOR_SCALE. Positions of towers and projectiles derive from it.
const WORLD = { width: 1170, height: 540 };
const GROUND_RATIO = 0.7;
const ACTOR_SCALE = 0.8;
// ---------------------------------------------------------------------------
// Archer, hero volley, catapult and unlocks.
// ---------------------------------------------------------------------------
const ARCHER_UNLOCK_WAVE = 5;
// Economy: idle-style exponential prices, so resources (not caps) set the pace.
// Tuned with the human-like session bot (tools/balance-bot.cjs → session()).
const ECONOMY = GAME_DATA.economy.prices; // see data/economy.json
// Steep growth for the first 10 levels (fast early pacing), gentle after that so the
// long game stays reachable with AFK income.
const LATE_GROWTH = GAME_DATA.economy.lateGrowth;
const priceAt = (base, growth, level) => Math.round(base * Math.pow(growth, Math.min(9, Math.max(0, level - 1)))
  * Math.pow(LATE_GROWTH, Math.max(0, level - 10)));
function farmPrice() { return priceAt(ECONOMY.farmBase, ECONOMY.farmGrowth, state.farmLevel); }
function spikesPrice() { return priceAt(ECONOMY.spikesBase, ECONOMY.spikesGrowth, state.spikesLevel); }
const TOWER_POP = 0.9;
const NOTICE_TIME = 3.6;
const CATAPULT_UNLOCK_WAVE = 5;
const FINAL_WAVE = GAME_DATA.waves.finalWave;
const CATAPULT_RANGE = GAME_DATA.economy.catapult.range;
const CATAPULT_MIN_RANGE = GAME_DATA.economy.catapult.minRange; // reaches enemy archers, not enemies under the wall // cannot lob at enemies right under the wall, but reaches enemy archers
const CATAPULT_SPLASH = GAME_DATA.economy.catapult.splash;
const RANGED_PATIENCE = GAME_DATA.waves.rangedPatienceSeconds; // then enemy archers charge // seconds before enemy archers stop kiting and charge
const ARCHER_RANGE = GAME_DATA.economy.archer.range;
const VOLLEY_COOLDOWN = GAME_DATA.heroes.heroes.archer.spell.cooldown;
const VOLLEY_FALL = GAME_DATA.heroes.spells.volley.fallSeconds;
const VOLLEY_ZONE = GAME_DATA.heroes.spells.volley.zone; // relative to the frontline hero
