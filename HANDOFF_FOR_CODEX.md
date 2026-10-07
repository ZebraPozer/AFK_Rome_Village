# Handoff: Claude → Codex · 7 Oct 2026

Hi Codex. Nikita and I (Claude) spent a long session on the prototype. Everything below is
committed on `main` in this folder. Your jobs: integrate it into the GitHub repo
(`ZebraPozer/AFK_Rome_Village`), turn on GitHub Pages, support the playtest, and keep the
prototype **port-ready for Unreal**. Read `AGENTS.md` first — it has the structure, the checks
and the architecture rules.

## How this package was made

Nikita zipped the whole `Test1` folder **including the hidden `.git`** (full history). Work from
that repository; the working tree is clean at the last commit (`git log -1`).

## 0. Quick start (in order)

1. Read `AGENTS.md`, then this file, then skim `docs/UNREAL_PORT.md`.
2. `git status` must be clean. If `art/_archive/` shows as deleted, see §1.
3. Run the checks — everything must pass:
   ```sh
   node prototype/tests/wave-balance.cjs
   node prototype/tools/balance-bot.cjs
   ```
4. Integrate and push (§1), enable GitHub Pages (§1), tell Nikita the URL.
5. Then pick up §5.

## 1. Integrate

- All my work sits on top of `534d276` (that was `origin/main` when I started). See it with
  `git log --oneline 534d276..main`.
- If `origin/main` is still `534d276`: `git push origin main`.
- If someone pushed since: `git fetch && git rebase origin/main`, run the checks. The game moved
  from one `prototype/app.js` into `prototype/src/**` + `prototype/data/*.json`, and most files
  were renamed (art into `art/`, docs into `docs/`). Re-apply remote changes on top of the new
  layout: rules into `src/sim`, numbers into `data/*.json`, art into `art/` + `build_assets.py`.
  Do not resurrect `prototype/app.js`, the root `assets/` or `prototype/assets/concepts/`.
- **If files show as deleted** (`art/_archive/...`): Nikita may have left the 80 MB `art/` folder
  out of the zip. Do **not** commit those deletions — `git restore art/` or ask for the folder.
- Keep LF line endings.
- Branch `backup/local-before-sync-2026-10-07` is stale pre-session work. **Do not push or merge it.**
- GitHub Pages: Settings → Pages → *Deploy from a branch* → `main`, folder `/ (root)`. The root
  `index.html` redirects to `prototype/`; `.nojekyll` is present.
  URL: https://zebrapozer.github.io/AFK_Rome_Village/

## 2. Architecture (new — read before editing)

```
prototype/data/*.json     every number (enemies, waves, balance, economy, combat, heroes,
                          progression, systems, offline) — Unreal imports these
prototype/data/game-data.js  generated bundle (node prototype/tools/build-data.cjs)
prototype/src/sim/        rules only, no DOM; events.js, constants.js, waves.js, world.js,
                          heroes.js, combat.js, progression.js, actions.js (commands), save.js
prototype/src/audio|render|ui/  presentation (throwaway in the port)
prototype/src/main.js     boot
prototype/golden/         parity scenarios for the Unreal port (generated)
docs/GAME_RULES.md        formulas (port spec); docs/GAME_DATA_TABLES.md generated tables
docs/UNREAL_PORT.md       mapping to Unreal, port milestones, parity tests, JS→C++ gotchas
docs/TELEMETRY.md         playtest event schema
```

Rules of thumb: numbers only in JSON · `src/sim` never touches the browser (a test enforces it)
· input only through commands (`callWave`, `buy`, `upgradeTown`, `castSpell`, …) · randomness only
through `simRandom()` · after a data/rule change regenerate the bundle, tables and (if intended)
golden files — the tests tell you when they are stale.

## 3. What the game is now (short)

- **Heroes & slots**: Front (Legionary *Shield Bash*, Hoplite *Hold the Line* after wave 7), Tower
  (Archer *Volley* or Catapult machine, village 2), Wall (Priestess *Blessing*, village 4).
  Upgrades belong to the slot. Soft rotation: fatigue −10 %/wave in a row (with a substitute),
  rested +25 % and spell ready.
- **Waves 1–30**: mini-boss every 5 (1 trophy), mega-boss every 10 (2 trophies + 1 eagle).
  Village 1–7 for trophies; systems for eagles: Armory (gear, wave 10), Barracks (hero training,
  wave 20), Temple (Mars/Ceres/Minerva, wave 30). Up to 3 enemies at once from wave 21.
- **Balance**: idle-style exponential prices; fixed per-wave difficulty against the expected
  build; human-like bot: first 10 waves ≈ 23 min with ~5 defeats; balanced bot reaches wave 30
  after ~7.7 h of AFK. Offline income = 50 % of live play, cap 2/4/8 h by village.
- **First session**: wave/boss notices, boss HP bar, recommended level on the wave button,
  first-minute hints, war horn, the next wave waiting in fog at the left edge.
- **HUD** in-phone, one flat style; phone play mode full-screen landscape; save + Welcome back.
- **Debug panel**: AFK simulator + forecast, offline knobs, playtest stats (Export JSON, error
  catcher), cheats (jump to wave N with the expected build).
- **Sound**: synthesized; Nikita found sword/shield/arrow sounds too synthetic but kept them for now.

## 4. Known issues / open decisions

- **2D or 3D in Unreal?** Recommended (not yet confirmed by Nikita): 2D characters (Spine-ready),
  3D modular scene with a fixed side camera and toon shading; first prove it with a small style slice.
  Details: `docs/UNREAL_PORT.md` §7. Until confirmed, don't order 2D building art.
- Spell/UI icons are font glyphs/emoji; some render as empty boxes on some systems.
- Safari/iOS likely ignores canvas filters → tinted placeholder enemies look like plain orcs there.
- Right after the wave 5 boss, 1–2 h offline lifts the frontline to the act II cap (5→10) —
  acceptable for now; options: 1 h cap at village 2, or pricier frontline levels 6–10.
- Act II effectively requires spells; the Temple opens at the very end of the campaign (wave 30).
- Placeholders: Hoplite, Priestess, all act II/III enemies and bosses (`ASSET_REQUESTS.md`).

## 5. Suggested next tasks

1. Push + Pages; Nikita playtests on phones with `PLAYTEST.md`; collect the stats JSON files.
2. Real-device check (iPhone Safari + Android Chrome); fix whatever the error log shows.
3. Wire in assets from `ASSET_REQUESTS.md` as they arrive and delete the placeholders.
4. After the playtest: balance from the stats, then the next design step in `docs/META_LOOP.md`
   (endless waves after 30, more village levels, modular village art).
5. When Unreal starts: follow `docs/UNREAL_PORT.md` §3 (data import → formulas → sim core with
   golden parity → progression → presentation → telemetry).

## 6. Working with Nikita

- He writes in Russian (often voice-dictated, expect typos); answer in Russian; game and UI stay English.
- He is the game designer: propose, explain trade-offs briefly, then build; show screenshots.
- Taste: gradual unlocks (Cookie Clicker / AFK Arena / Fallout Shelter — no resets), danger felt
  from wave 1 but not punishing, bosses as the real challenge; UI flat and simple — **no frames
  inside frames, no circles, rounded squares, one style**, nothing overlaps; subtle effects
  (he rejected a busy particle/fire pass).
- Decided: 3 heroes on the field, 5–6 in the collection; soft rotation; offline 50 %;
  synthesized sounds for now; only the two clean orc head icons until new heads are rendered.

## 7. Balance tuning tips

- `tools/balance-bot.cjs` → `play()` (balanced player), `session()` (human-like), `idle()`.
- When measuring a fight, check the phase **every frame** — checking in 60-frame batches lets
  post-wave regeneration leak into the result.
- Bosses are sensitive; nudge one wave at a time and re-run the full 30-wave check.
