# AGENTS.md — rules for any coding agent working on AFK Rome Village

Read this first. For the latest handoff (what changed and what to do next) see
`HANDOFF_FOR_CODEX.md`. For art that still needs rendering see `ASSET_REQUESTS.md`.

## Project

Browser prototype of an idle / AFK village-defence game (Roman legion vs orcs, enemies
come from the left, village on the right). Plain HTML + Canvas 2D + vanilla JS, no build
step, no dependencies.

```
index.html                     redirect to prototype/ (GitHub Pages entry)
prototype/index.html           phone frame + HUD markup + debug panel
prototype/style.css            all styles (HUD design tokens at the top)
prototype/app.js               the whole game (single file, sections marked with // ---- banners)
prototype/tests/wave-balance.cjs   headless tests (node, no deps)
prototype/tools/balance-bot.cjs    headless balance bot that plays with the real handlers
GAME_DESIGN.md                 design doc (Russian); latest decisions are at the END
ASSET_REQUESTS.md              art to render, with paths and specs
```

Run locally: `python3 -m http.server 4173 --directory prototype` → http://127.0.0.1:4173

## Must-pass checks before every commit

```sh
node prototype/tests/wave-balance.cjs     # must print every "... passed." line
node prototype/tools/balance-bot.cjs      # read the table; keep the bands below
```

Balance bands enforced by the tests:
- Waves 1–5, bot with spells (AUTO) and rotation: end at **20–50 % HP**.
- Waves 1–5, bot without spells: still win, end at **5–35 % HP**.
- Wave 1 lasts < 25 s; wave 3 is **lost** with no upgrades (first "lose → upgrade → win" lesson).
- At most 2 wave enemies on the field; bosses enter alone.
- Act II (6–10) is balanced assuming spells + rotation; without rotation it must still be beatable.

If you add a purchase, spell or hero, teach the bot to use it (`tools/balance-bot.cjs`,
`autoCastSpells`, `autoLineup`) and re-tune via the `OPENING_*` / `ACT2_*` arrays in `app.js`.

## Conventions

- **Language:** everything the player sees (game, HUD, debug panel) is **English**.
  Docs (`GAME_DESIGN.md`, READMEs) are **Russian** — the owner (Nikita) speaks Russian.
- **One HUD style:** one translucent dark surface (`--surface`), rounded-square tiles of one
  size (`--t`), one margin (`--m`), one radius (`--r`), one accent (`--accent`, gold).
  No borders, no panels inside panels, no circles. Canvas panels reuse the same values
  (`HUD_M`, `HUD_T`, `HUD_R`, `HUD_SURFACE` in `app.js`). Keep new UI in this system.
- **HUD mirrors the debug panel:** HUD buttons call the debug panel's handlers
  (`ui['wave-button'].onclick()`, `ui['guard-upgrade'].onclick()` …). Put game rules in
  those handlers / core functions, never only in HUD code.
- **Tests run app.js in a Node `vm`** with a stub DOM, sliced before `\nPromise.all([`.
  Code above that line must not touch real DOM APIs without guards
  (`typeof window`, `try/catch` around `localStorage`, `querySelectorAll` existence).
  Boot-only code (load save, timers, listeners that need a real page) goes **after** it.
- **Determinism:** tests stub `Math.random` to 0.5. Do not depend on wall-clock time in
  core logic (offline income takes `seconds` as a parameter).
- **Assets:** paths are case-sensitive on GitHub Pages. New art must have real alpha.
  Placeholders (tinted sprites, code-drawn props) are listed in `ASSET_REQUESTS.md` —
  when a real asset lands, remove the matching placeholder code.
- **Sound** is synthesized (`sfxLib` in `app.js`); no audio files yet.
- Commit messages: conventional style (`feat:`, `fix:`, `refactor:`, `docs:`).
