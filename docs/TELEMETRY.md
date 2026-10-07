# Telemetry schema (playtest stats)

> Формат статистики плейтестов. Одинаковый для браузера и будущей Unreal-версии, чтобы
> результаты можно было сравнивать напрямую.

The prototype records events locally (`localStorage` key `afkRomeStats.v1`, max 3000 events)
and exports them with **Export JSON** (debug panel). Implementation: `recordStat()` in
`prototype/src/sim/save.js`.

## Export file

```json
{
  "exportedAt": "2026-10-07T18:00:00.000Z",
  "summary": { "...": "statsSummary()" },
  "offline": { "efficiency": 0.5, "capOverride": null, "minSeconds": 60, "goldEvery": 10 },
  "progress": { "version": 2, "...": "the current save (serializeSave)" },
  "events": [ { "type": "wave", "at": 312, "wave": 4, "town": 1, "result": "victory", "...": "..." } ]
}
```

## Common fields (every event)

| field | meaning |
|---|---|
| `type` | event type (below) |
| `at` | play time in seconds when it happened (counts only while the game runs) |
| `wave` | current wave number |
| `town` | village level |

## Event types

| type | extra fields | when |
|---|---|---|
| `session` | `device { ua, screen, touch }` | game opened |
| `wave` | `result` (`victory` / `defeat`), `first` (first clear), `seconds` (fight length), `hp` (% left), `guard` (frontline level) | a wave ends |
| `buy` | `item` (`frontline`, `farm`, `spikes`, `archer`, `catapult`, `village`, `train-<hero>`, `offer-<god>`, `system-<id>`), `level`, `cost` | any purchase |
| `away` | `seconds`, `food`, `gold`, `simulated` | Welcome back collected (simulated = debug) |
| `reset` | — | Reset prototype |
| `fresh-start` | `oldVersion` | an old save version was discarded |
| `cheat` | `action`, `to` | debug cheats (jump, resources) |
| `error` | `message`, `source` | uncaught error or rejected promise |

## Summary (`statsSummary()`)

`playMinutes`, `wavesFought`, `wins`, `defeats`, `defeatsByWave`, `avgFightSeconds`,
`bossClearMinutes` (first clear of every 5th wave), `purchases`, `afkReturns`, `afkHours`,
`afkFood`, `afkGold`, `errors`.

## Reading a playtest

- Pacing reference (human-like bot): first 10 waves ≈ 23 min with 4–6 defeats (waves 4, 5, 9, 10).
- `wave` events with `result: defeat` show where players get stuck; `seconds` shows dull fights.
- `away` events show how long people stay away and whether offline income is too generous.
- Any `error` event is a bug report — `source` has file:line and a short stack.
