# AFK Rome Village — game rules (port specification)

> Спецификация правил для переноса в Unreal. Технический документ — на английском, для инженеров.
> Все числа живут в `prototype/data/*.json`; сводные таблицы, посчитанные через симуляцию, —
> в [`GAME_DATA_TABLES.md`](GAME_DATA_TABLES.md). Здесь — формулы и порядок вычислений.

This document describes **what the simulation computes**, in the order it computes it. The
reference implementation is `prototype/src/sim/*.js`; every constant below names the JSON
field it comes from (`file.path`). If this document and the code disagree, the code plus the
golden scenarios (`prototype/golden/`) win — and this document must be fixed.

## 1. World, time and randomness

- World is **1170 × 540** units, x grows to the right. Enemies spawn at `combat.spawn.startX` (−70)
  and walk right. The frontline hero stands at `frontX = combat.frontlineX × 1170` (≈ 608).
  Tower and wall positions derive from `GROUND_RATIO` / `ACTOR_SCALE` (sim/constants.js).
- **Fixed step.** The simulation advances in steps of `combat.simulation.fixedStep` (1/60 s).
  At speed > 1 one frame runs several steps; a frame never advances more than
  `maxFrameDelta × speed`. Presentation timers (banners) use real time.
- **Randomness.** Every gameplay random number comes from `simRandom()` (sim/events.js). Tests,
  bots and golden scenarios pin it to **0.5**. The Unreal port must expose the same switch so
  golden scenarios reproduce exactly. Random uses: initial enemy attack delay
  (`simRandom() × 0.35` s), patrol interval (`8 + simRandom() × 4` s), visual bob phase.

## 2. Wave flow

1. **Call wave** (`callWave`): from `victory` it advances to the next wave; it refuses when the
   village is below `requiredTown(w) = min(maxVillage, 1 + ⌊(w − 1) / 5⌋)`.
2. **Start** (`startWave`): the hero heals to full HP, projectiles clear, the wave's difficulty is
   computed **once and locked** for all retries (`state.waveDifficulties[w]`).
3. **Spawning**: the roster `waves.plans[w]` spawns in order, first after
   `waves.firstSpawnDelaySeconds`, then every `waves.spawnIntervalSeconds`, but only while fewer
   than `maxConcurrent(w)` wave enemies are alive (2, or 3 from wave 21). A boss waits until the
   field is empty and enters alone.
4. **Enemy stats**: `hp = round(base.hp × difficulty.hp)`, `damage = round(base.damage × difficulty.damage)`.
5. **Walking**: `speed = (walkSpeed.base + walkSpeed.perWave × w) × type.speed`, ×
   `openingBoost.factor` for waves ≤ `openingBoost.upToWave`.
6. **Victory** when everything spawned and every enemy is dead or slipped past. **Defeat** when
   the frontline hero reaches 0 HP: HP is set to `combat.defeat.hpShareAfter` of max, progress stays.
7. **First clear** pays `firstClearGold.base + firstClearGold.perWave × w` gold, once per wave.

## 3. Difficulty

Each wave is tuned for the **expected build** at that wave (`expectedProgress(w)`), never the live
build — under-levelled players lose, over-levelled players win easily.

- Waves 1–10 use `balance.expectedProgress.table`; beyond: frontline `10 + round((w−10) × guardPerWave)`,
  spikes `2 + ⌊(w−10) / spikesEvery⌋`, tower `5 + round((w−10) × towerPerWave)`, hero level
  `1 + (w − heroLevelFromWave)` after `heroLevelFromWave`. Expected max HP = `80 + 20 × frontline`.
- `step = w − 1` for waves 1–5; `step = (w − 6) + act2StepOffset` from wave 6.
- `dpsRatio = frontline × dpsReference / attackInterval(frontline)`.
- `offense = 1 + offenseDps × (√dpsRatio − 1) + offenseSpikes × spikes^spikesExponent
  (+ offenseTower × towerLevel from wave 6)`.
- `HP× = (1 + hpLinear × step + hpQuadratic × step²) × offense × tuning.hp[w]`.
- `damage× = (1 + damagePerStep × step) × (expectedMaxHp / hpReference)^hpExponent × tuning.damage[w]`.
- From wave 11, both are further multiplied by expected training:
  `HP× ×= 1 + barracks.damage × (heroLevel − 1)`, `damage× ×= 1 + barracks.toughness × (heroLevel − 1)`.
- Wave 1 is special: `HP× = opening.hp[0]`, `damage× = opening.damage[0]`.
- `tuning` = `balance.opening` (1–5), `balance.act2` (6–10), `balance.act3` (11–30).

The UI shows `recommendedLevel(w) = expectedProgress(w).frontline`.

## 4. Combat (per step)

**Frontline hero.** Hits the foremost enemy with x in `(frontX − melee.reachFar, frontX − melee.reachNear)`
every `attackInterval(level) = max(min, base + perLevel × (level − 1))` seconds
(`economy.frontline.attackInterval`). Damage = `level × hero.damageMult × heroDamageMult(hero)`, type *melee*.

**Blocking.** Blocking enemies stop at `frontX − melee.standOff − formationX` and only the
foremost one attacks. *swarm* enemies never block (they run past). *ranged* enemies stop at
`frontX − range − formationX` and shoot (flight `projectiles.enemyArrowFlight`); after
`waves.rangedPatienceSeconds` of a wave they stop kiting and charge into melee.

**Damage to enemies** (`effectiveDamage`): *pierce* vs *shield* trait × `shieldPierceFactor`;
*armor* subtracts `type.armor` from every non-*area* hit, never below `armorFloor × raw`; a
*barrier* (shaman aura) absorbs damage first.

**Damage to the hero** (`hurtGuard`, every source): `raw × hero.guardTaken × (1 − min(0.6, armor gear))
÷ (1 + barracks.toughness × (heroLevel − 1))`, × `holdLine.damageTaken` while *Hold the Line* is
active, then rounded, minimum 1. *charge*: the first hit × `charge.firstHitMultiplier`.
*enrage*: × `enrage.multiplier` while HP < `enrage.belowHpShare`.

**Tower.** Archer: every `archer.interval(level)` s shoots the foremost enemy in range
(`frontX − archer.range … frontX + slipPastAt`), enemy archers first; damage
`archer.damagePerLevel × level × heroDamageMult(archer)`, *pierce*, lands after `arrowFlight`.
Catapult: every `catapult.interval(level)` s lobs at the densest group with x in
`(frontX − catapult.range, frontX − catapult.minRange)`, lands after `rockFlight`, hits everything
within `catapult.splash`, damage `catapult.damage.base + perLevel × (level − 1)`, *area*.

**Spikes**: enemies with x in `[frontX − spikes.zone[0], frontX − spikes.zone[1]]` take
`spikesLevel` *contact* damage every `spikes.tickSeconds`.

**Shaman aura**: every `aura.everySeconds` gives allies within `aura.radius` a barrier of
`ceil(aura.barrierPerWaveHp × HP×)`.

**Slipping past**: an enemy beyond `frontX + slipPastAt` leaves the field and steals `type.loot`
(gold first, then food). It counts as defeated for the wave.

**Kills** pay `type.reward` gold (wave enemies); patrol kills pay `waves.patrols.goldPerKill`.

**Recovery**: outside fights (no living enemy) after `recovery.delaySeconds`, the hero regains
`recovery.hpPerSecondShare × maxHp` per second. Every wave starts at full HP.

**Patrols** (between waves): every `8 + simRandom() × 4` s, at most `patrols.maxAlive` alive;
plain orcs (HP/damage ×1), twin blades every 4th from wave 3.

## 5. Heroes, spells, rotation

- Slots: front (always), tower (village `slotUnlockVillage.tower`), wall (village `slotUnlockVillage.support`).
  Upgrades belong to the slot; swapping heroes is free and only allowed between waves.
- `heroDamageMult(id) = power(id) × (1 + weapon gear) × (1 + barracks.damage × (level − 1)) × (1 + Mars)`.
- `power(id)`: rested → `1 + restedBonus`; otherwise `1 − penaltyPerWave × max(0, fatigue − 1)`.
- After every wave (won or lost): heroes on the field get `fatigue + 1` (max `fatigue.max`)
  **only if their slot has a substitute**, and lose *rested*; benched heroes reset fatigue and
  become *rested*.
- Wave start: rested heroes start with the spell ready; others with
  `max(cooldown left, waveStartCooldownShare × cooldown)`.
- Spell cooldown after a cast: `cooldown × (1 − min(0.5, charm)) × (1 − Minerva)`.
- **Shield Bash**: foremost enemy within `shieldBash.reach`; damage `damagePerFrontlineLevel × frontline × mult`
  (*melee*); stun `stun` s and knockback `knockback` (bosses `bossStun` / `bossKnockback`).
- **Hold the Line**: `holdLine.seconds` of `holdLine.damageTaken` incoming damage.
- **Volley**: after `volley.fallSeconds`, every enemy with x in `frontX + volley.zone` takes
  `ceil(damagePerWaveHp × HP× × mult)` *area* damage.
- **Blessing**: heals `healShare × maxHp × mult`.
- **AUTO** casts with the same policy as the balance bot (`autoCastSpells`).

## 6. Economy

- `price(level) = round(base × growth^min(9, level − 1) × lateGrowth^max(0, level − 10))`
  (`economy.prices`, `economy.lateGrowth`). Frontline in food, everything else in gold.
- Frontline upgrade: `+damagePerLevel` damage, `+hpPerLevel` max HP.
- Caps per village V: frontline & farm `5·V`, spikes `2·V` (only after wave `spikes.unlockAfterWave`),
  archer & catapult `5·(V − 1)`.
- Farm: every `farm.tickSeconds` adds `round(farmLevel × (1 + Ceres))` food.

## 7. Progression

- Bosses: every `miniEvery` waves a mini-boss (trophies), every `megaEvery` a mega-boss
  (trophies + eagle). Paid on first clear only.
- Village level L (max `village.max`) costs `costTrophies` trophy and needs the boss of wave
  `5 × (L − 1)` beaten.
- Systems (`progression.systems`) cost 1 eagle each after their wave: Armory, Barracks, Temple.
- **Armory**: bosses drop gear (mini `miniBossItems`, mega `megaBossItems`); every
  `eliteDropEvery`-th kill of `eliteTypes` drops one. Slots cycle weapon → armor → charm.
  Rarity: wave ≥ 30 → mega epic / else rare; wave ≥ 20 → mega rare, mini rare from 25; earlier →
  mega rare, mini common. One item per slot per hero.
- **Barracks**: training costs `base × growth^(level − 1)` food.
- **Temple**: offering to god g costs `base × growth^level` of its resource; bonus `per × level` (Minerva capped).

## 8. Offline income

`seconds' = min(seconds, capHours(village) × 3600)`; nothing below `offline.minSeconds`.
`food = ⌊⌊seconds' / 3⌋ × farmLevel × (1 + Ceres) × efficiency⌋`, `gold = ⌊seconds' / goldEvery × efficiency⌋`.
The player sees it in the *Welcome back* window and collects it; it never buys anything.

## 9. Save

Saved fields: `SAVED_FIELDS` in sim/save.js plus per-hero `{unlocked, fatigue, rested, level}`.
`SAVE_VERSION` mismatch → fresh start. A save taken mid-wave restores the wave's preparation.

## 10. Player commands (the only way input changes the game)

`callWave`, `buy(kind)` (frontline, farm, spikes, archer, catapult), `upgradeTown`,
`unlockSystem(id)`, `trainHero(id)`, `makeOffering(god)`, `castSpell(heroId)`,
`cycleSlot(role)`, `autoLineup`, `autoEquip`, `cycleGearOwner(itemId)`, `togglePause`,
`cycleSpeed`, `collectAway` (UI) — see sim/actions.js and the functions they call.
