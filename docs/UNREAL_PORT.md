# Porting AFK Rome Village to Unreal Engine

> План переноса браузерного прототипа в Unreal. Технический документ — на английском.
> Коротко: браузер — лаборатория. Переносим **правила, данные, проверки и статистику**;
> отрисовку, интерфейс и звук в Unreal делаем заново.

## 1. Principle

The JavaScript code is **not** ported line by line. What carries over:

| Asset | Where it lives in the prototype | Role in the port |
|---|---|---|
| Rules | `prototype/src/sim/*.js` (no DOM, deterministic) | Reference implementation to re-implement in C++ |
| Numbers | `prototype/data/*.json` | Imported as-is into Data Tables / Data Assets — one source of truth |
| Formulas | `docs/GAME_RULES.md` (+ generated `docs/GAME_DATA_TABLES.md`) | Port specification |
| Parity checks | `prototype/golden/scenarios.json`, `formulas.json` | Automation tests the port must pass |
| Telemetry | `docs/TELEMETRY.md` | Same event schema, so playtests compare 1:1 |
| Art | `art/` (full-res sources) | Reused only if the port stays 2D — see §7 |

Presentation (`src/render`, `src/ui`, `src/audio`) is throwaway: it exists to make the
prototype playable.

## 2. Architecture mapping

| Prototype | Unreal (suggested) |
|---|---|
| `GAME_DATA` (data/*.json) | `UDataTable` per list (enemies, waves, prices, heroes, gods…) + `UPrimaryDataAsset` for singletons (balance, combat, offline). Import via an editor Python script that reads the JSON (keep the JSON in the repo as the source). |
| `state` (sim/world.js) | `FAfkGameState` USTRUCT (plain data, `double` for every number that is fractional in JS), owned by the subsystem |
| sim functions | `UAfkSimSubsystem : UGameInstanceSubsystem` (C++). Split like the JS files: Waves, Combat, Heroes, Progression, Economy, Offline |
| `update(dt)` fixed step | Accumulator ticking at **exactly 1/60 s** (`FTSTicker` or the subsystem's Tick); speed × N = N × steps per frame |
| `emit('sfx', …)` (sim/events.js) | `DECLARE_DYNAMIC_MULTICAST_DELEGATE` (`OnSimEvent`), presentation binds to it |
| `simRandom()` | `FRandomStream` owned by the subsystem; **test mode returns 0.5** (needed for golden parity) |
| Player commands (sim/actions.js, §10 of GAME_RULES) | `UFUNCTION(BlueprintCallable)` on the subsystem; UMG widgets only call these |
| `serializeSave` / `applySave` | `UAfkSaveGame : USaveGame` with the same fields and `SaveVersion` |
| offline income | `FDateTime::UtcNow()` on save/load, same formula |
| stats (`recordStat`) | Analytics provider or a local JSON log with the same schema (TELEMETRY.md) |
| canvas render | 2D: Paper2D/flipbooks or UMG; 3D: actors + Niagara. Not specified here |
| HUD / debug panel | UMG (CommonUI for mobile); debug panel → cheat manager + ImGui/dev menu |
| synthesized audio | MetaSounds / recorded SFX |

## 3. Port order (milestones)

1. **Data import**: JSON → Data Tables / Assets, round-trip test (values read back equal the JSON).
2. **Formula layer** (no time, no entities): prices, difficulty, expected progress, offline income,
   effective damage → must match `golden/formulas.json` exactly.
3. **Simulation core**: state, wave flow, enemies, frontline combat, tower, spikes, spells, fatigue,
   rewards → must match `golden/scenarios.json` (all fights, tick-exact).
4. **Progression**: village, trophies/eagles, systems, Armory, Barracks, Temple, save/load, offline.
5. **Presentation**: scene, HUD, audio, hints, banners — free to improve.
6. **Telemetry** with the TELEMETRY.md schema, then playtests on device.

Do not start 5 before 3 passes: once visuals exist, parity bugs are much harder to see.

## 4. Parity tests (golden scenarios)

`prototype/golden/scenarios.json` — each scenario:

- `save`: a save in the prototype's own format (`version`, `SAVED_FIELDS`, `heroes`) — load it with the
  port's save loader;
- `settings.autoSpells`: AUTO casting on/off (the AUTO policy is `autoCastSpells` in sim/heroes.js —
  port it too, it is part of the rules);
- `commands`: list of `{ atTick, command }` (currently `callWave` at tick 0);
- `runUntil: 'waveEnds'`, `maxTicks`;
- `expect`: `phase`, `ticks`, `guardHp` (rounded to 0.001), `kills`, `defeated`, `coins`, `food`,
  `wavesCleared`, `trophies`, `eagles`, `gear`.

Run with random = 0.5 and fixed step 1/60. Write a UE Automation Spec (`IMPLEMENT_SIMPLE_AUTOMATION_TEST`
or a Spec) that loads each scenario, runs it headless and compares every `expect` field.

`prototype/golden/formulas.json` — prices for levels 1–30, per-wave difficulty and recommendation,
offline income for several villages / durations / farms, effective damage cases.

When balance changes **intentionally** in the prototype: `node prototype/tools/export-golden.cjs`,
commit the new golden files, then update the port until it matches again.

## 5. JavaScript details that matter for exact parity

- Use **double** for HP, damage, timers and multipliers (JS numbers are 64-bit floats).
- `Math.round` rounds .5 up (toward +∞); all rounded values here are positive, so
  `FMath::FloorToDouble(x + 0.5)` matches. `Math.floor` / `Math.ceil` map directly.
- Iteration order: JS objects keep insertion order — enemy types, heroes and gods iterate in JSON
  order. Use ordered arrays (or sort by the JSON order) in C++.
- `x ?? y` / `||` defaults appear in a few formulas (`GAME_RULES.md` names them); keep the same fallbacks.
- The wave difficulty is computed once at the first attempt and **locked** for retries.
- Spawn order, "foremost enemy" (max x) and "first match" choices are deterministic — keep them.
- Timers decrement before checks in `update`; follow the order of `update()` in sim/combat.js step by step.

## 6. What not to port

The debug panel, cheats UI, tint cache, canvas background baking, phone frame, `?debug` flag,
`build_assets.py`, synthesized sounds. Keep the *ideas* (AFK forecast, jump to wave, stats export)
as dev tools in Unreal.

## 7. Open decision: 2D or 3D

The first design doc describes a 2.5D diorama with cut-away buildings (Fallout Shelter style).
If the Unreal version is 3D, today's 2D sprites in `ASSET_REQUESTS.md` are prototype placeholders
only and should not get more investment. Decide before ordering final art.
