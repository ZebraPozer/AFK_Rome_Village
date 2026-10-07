# AGENTS.md — rules for any coding agent working on AFK Rome Village

Read this first. Latest handoff: `HANDOFF_FOR_CODEX.md`. Art to render: `ASSET_REQUESTS.md`.
Before generating or editing any game image, **must read and follow**
`skills/afk-rome-art/SKILL.md`; it defines the canonical PNG references, prompt lock, and asset
integration workflow.
The prototype is a **lab for a future Unreal game**: read `docs/UNREAL_PORT.md` before changing
architecture.

## Project

Browser prototype of an idle / AFK village-defence game (Roman legion vs orcs, enemies come
from the left, village on the right). Plain HTML + Canvas 2D + vanilla JS classic scripts,
no dependencies, runs from a double-clicked `prototype/index.html`.

```
index.html                         redirect to prototype/ (GitHub Pages entry)
docs/GAME_DESIGN.md                design doc (Russian); latest decisions at the END
docs/META_LOOP.md                  long-term progression design (Russian)
docs/GAME_RULES.md                 formulas — the port specification (English)
docs/GAME_DATA_TABLES.md           GENERATED tables (tools/gen-rules.cjs)
docs/UNREAL_PORT.md                how the prototype maps to Unreal, parity tests, port order
docs/TELEMETRY.md                  playtest event schema
art/                               full-resolution SOURCE art (+ art/_archive: unused)
prototype/index.html               phone frame + HUD markup + debug panel; script load order
prototype/style.css                all styles (HUD design tokens at the top)
prototype/data/*.json              EVERY game number (single source of truth, Unreal imports these)
prototype/data/game-data.js        GENERATED bundle of the JSON (tools/build-data.cjs)
prototype/src/sim/                 RULES ONLY — no DOM, no canvas, no audio, no storage
  events.js                          event bus (emit/onSimEvent) + simRandom (pinned in tests)
  constants.js waves.js world.js heroes.js combat.js progression.js
  actions.js                         player commands: callWave, buy, togglePause, cycleSpeed
  save.js                            save format, offline income, stats log, cheats
prototype/src/audio/               synthesized SFX, listens to sim events
prototype/src/render/              canvas drawing (assets, background, village, actors, overlay, scene)
prototype/src/ui/                  HUD, debug panel, input, browser storage (platform.js)
prototype/src/main.js              boot: asset loading, frame loop, load save, autosave, error catcher
prototype/assets/                  GENERATED web-sized copies of art/ (tools/build_assets.py)
prototype/golden/                  GENERATED parity scenarios for the Unreal port (tools/export-golden.cjs)
prototype/tests/wave-balance.cjs   headless tests
prototype/tools/                   load-game.cjs (vm loader), balance-bot.cjs, build-data.cjs,
                                   gen-rules.cjs, export-golden.cjs, build_assets.py
```

Run locally: double-click `prototype/index.html`, or
`python3 -m http.server 4173 --directory prototype` → http://127.0.0.1:4173

## Must-pass checks before every commit

```sh
node prototype/tests/wave-balance.cjs     # must print every "... passed." line
node prototype/tools/balance-bot.cjs      # read the tables; keep the bands below
```

The tests also fail if a generated file is stale. After changing data or rules:

```sh
node prototype/tools/build-data.cjs       # data/*.json → data/game-data.js
node prototype/tools/gen-rules.cjs        # → docs/GAME_DATA_TABLES.md
node prototype/tools/export-golden.cjs    # → prototype/golden/*.json (ONLY if the change is intended)
```

Balance bands enforced by the tests:
- Waves 1–5, bot with spells (AUTO) and rotation: end at **20–50 % HP**; without spells: win at **5–35 %**.
- Wave 1 lasts < 25 s; wave 3 is **lost** with no upgrades.
- Human-like session: first 10 waves in **15–35 min** with **1–8 defeats**.
- Waves 11–30 (balanced bot): end at **15–60 % HP**; all 30 waves complete.
- At most 2 wave enemies on the field (3 from wave 21); bosses enter alone; no endless waves.

## Architecture rules (keep the port easy)

- **Numbers go in `prototype/data/*.json`**, never as literals in `src/sim`. Add a `_doc` string
  for new fields. Rebuild the bundle.
- **`src/sim` never touches the browser** (document, window, canvas, ctx, ui, localStorage,
  navigator, performance, audio). It talks out only through `emit()` events and state.
  The architecture test enforces this and runs a wave with the simulation alone.
- **Input goes through commands** (`sim/actions.js` and the functions it lists in
  `docs/GAME_RULES.md` §10). Buttons, keys, bots and golden scenarios all call the same functions.
- **Randomness only via `simRandom()`**. Tests/bots/golden pin it to 0.5.
- **Determinism**: fixed 1/60 s steps; core logic must not read wall-clock time (offline income
  takes `seconds` as a parameter).
- **Load order** is shared global scope: the `<script>` list in `index.html` and the arrays in
  `tools/load-game.cjs` must stay identical.
- Update `docs/GAME_RULES.md` when a formula changes; regenerate tables and golden files.
- Presentation is throwaway (it will be rebuilt in Unreal): keep it simple, don't over-invest.

## Conventions

- **Language:** everything the player sees is **English**. Design docs and READMEs are
  **Russian** (Nikita speaks Russian); technical port docs (GAME_RULES, UNREAL_PORT, TELEMETRY) are English.
- **One HUD style:** one translucent dark surface (`--surface`), rounded-square tiles of one size
  (`--t`), one margin (`--m`), one radius (`--r`), one accent (`--accent`). No frames inside frames,
  no circles. Canvas panels reuse `HUD_M`, `HUD_T`, `HUD_R`, `HUD_SURFACE`.
- **Performance:** never use `ctx.filter` per frame — go through `tinted()`; static layers are
  baked (`bgCache`).
- **Assets:** source art in `art/<category>/`, then `python3 prototype/tools/build_assets.py`;
  runtime sprites are pre-cut; paths are case-sensitive on GitHub Pages; real alpha only.
  Placeholders are listed in `ASSET_REQUESTS.md`. The mandatory art direction and reference set is
  `skills/afk-rome-art/SKILL.md`.
- **Saves:** bump `SAVE_VERSION` (sim/save.js) whenever economy or progression changes.
- Commit messages: conventional style (`feat:`, `fix:`, `refactor:`, `docs:`, `balance:`, `perf:`).
