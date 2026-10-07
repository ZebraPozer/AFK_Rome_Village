# Handoff: Claude → Codex · 7 Oct 2026

Hi Codex. Nikita and I (Claude) spent a session on the prototype. Everything below is
already committed on `main` in this folder. Your job: integrate it into the GitHub repo
(`ZebraPozer/AFK_Rome_Village`), turn on GitHub Pages, and pick up the next tasks.
Project rules live in `AGENTS.md` — please read it first.

## 0. Quick start (do this in order)

1. Read `AGENTS.md` (rules + checks), then this file.
2. `git status` must be clean and `git log --oneline -1` should show the last commit of the
   list in §1 (or a later docs commit). If `art/_archive/` is missing from the archive you got,
   that is expected — see §1 "If files show as deleted".
3. Run the checks: `node prototype/tests/wave-balance.cjs` and
   `node prototype/tools/balance-bot.cjs`. Everything must pass before you push.
4. Integrate and push (§1), enable GitHub Pages (§1), tell Nikita the URL.
5. Then continue with §4.

## 1. Integrate

- My work is **8 commits on top of `534d276`** (that was `origin/main` when I started),
  plus this docs update:

  ```
  65c152a feat: hero spells, hero slots 1/2/3, rotation with fatigue; scarier opening waves
  7fb42dc feat: synthesized sound effects, mute and volume
  6aac033 feat: in-phone HUD
  4acc2b4 refactor: flat single-style HUD; all game/UI text in English
  21bef00 fix: clean orc head icons in roster, compact banners; ASSET_REQUESTS.md
  e875046 feat: save/load with offline AFK income; phone play mode and GitHub Pages entry
  7d6eb30 docs: AGENTS.md project rules and HANDOFF_FOR_CODEX.md
  007e6e0 chore: organize project — art/, docs/, generated prototype/assets (26 MB → 7.6 MB)
  ```
- If `origin/main` is still `534d276`: just `git push origin main`.
- If someone pushed since: `git fetch && git rebase origin/main`, then run the checks from
  `AGENTS.md`. Conflicts will most likely be in `prototype/app.js`, `prototype/index.html`,
  `prototype/style.css` — `index.html` and `style.css` were rewritten from scratch, so prefer
  my version of those two and re-apply their changes on top.
- **The last commit moves almost every file** (see "Folder cleanup" below). If the remote
  changed assets meanwhile: put their new source art into `art/<category>/`, add it to
  `prototype/tools/build_assets.py`, run the script, and point `app.js` at
  `prototype/assets/...`. Do not resurrect the old root `assets/` or `prototype/assets/concepts/`.
- **If files show as deleted** (`git status` lists `art/_archive/...` as deleted): Nikita may
  have left the 80 MB `art/` folder (or just `art/_archive/`) out of the zip to keep it small.
  Do **not** commit those deletions. Run `git restore art/` if the objects are in `.git`;
  otherwise ask Nikita for the folder. The game itself only needs `prototype/`.
- Files are committed with LF line endings; keep them that way.
- Branch `backup/local-before-sync-2026-10-07` is a safety copy of old, stale local work from
  before the session (it was superseded by `534d276`). **Do not push or merge it.**
- After pushing, enable Pages: Settings → Pages → Source: *Deploy from a branch* → `main`,
  folder `/ (root)`. The root `index.html` redirects to `prototype/`; `.nojekyll` is present.
  Expected URL: https://zebrapozer.github.io/AFK_Rome_Village/

## 2. What changed (short)

**Heroes, slots, rotation** (`app.js` section "Heroes, slots and rotation")
- A hero = a unit with one spell. Slots: Front (always), Tower (Town II), Wall (Town III).
- Legionary — *Shield Bash* (stun 2.5 s + knockback, CD 12). Hoplite (after wave 7) —
  *Hold the Line* (−70 % damage taken for 5 s, CD 16; takes −15 %, deals −15 %).
  Archer — *Volley* (CD 18; no longer a 20-gold purchase). Catapult = tower machine, no spell,
  never tires. Priestess (Town III) — *Blessing* (+40 % HP to the frontline, CD 20).
- Upgrades belong to the **slot**, so swapping heroes is free.
- Fatigue only when a substitute exists: −15 % damage per consecutive wave after the first
  (max −30 %). A hero who sat out a wave is **rested**: +25 % damage and spell ready at wave
  start (others start with half a cooldown).
- Keys 1/2/3 cast slot spells, tap the hero, or AUTO. `autoLineup()` fields the freshest heroes.

**Early game feel**
- War horn + "WAVE N · ORCS INCOMING" banner, next wave waits as dark silhouettes at the
  forest edge, red vignette + trembling hero under 35 % HP.
- Opening waves retuned (`OPENING_HP_TUNING` / `OPENING_DAMAGE_TUNING`): shorter, harder
  hits; wave 3 is lost without upgrades. Act II tuned for spells + rotation (`ACT2_*`).
- After the campaign, wave 10 is replayable (no reward) to try the full 3-hero lineup.

**HUD** (in-phone, `index.html` + `style.css`)
- Top: pause / sound — wave roster — resources. Bottom-left: wave button + speed.
  Bottom-right: spell tiles, Auto, Upgrades (badge = affordable upgrades, lock during waves).
- Upgrades | Heroes panel opens above the bottom-right row (never covers spells). U / Esc.
- All banners share one slot under the roster, sized to their text, centred in free space.

**Sound** — synthesized SFX (sword, shield hit, bash, arrows, volley, coins, fanfare,
clicks, spell ready, horn), mute + volume saved in `localStorage` (`afkRomeSound`).
Nikita found sword/shield/arrow sounds too synthetic ("like a drum"); he chose to keep them
for now. Recorded CC0 samples (e.g. Kenney "Impact Sounds" / "RPG Audio") are the planned fix.

**Save + offline income** — `localStorage` key `afkRomeSave.v1`, autosave every 5 s and on
page hide. A wave in progress is restored as its preparation. Offline: farm food + patrol gold
(1 per 30 s), from 1 minute up to 8 hours, shown in a "Welcome back" window (game paused
until Collect). Offline income never buys or unlocks anything.

**Phone** — touch device + short landscape screen → game only, full screen, letterboxed to
19.5:9, safe-area padding; portrait → "Rotate your phone". Android: first tap requests
fullscreen + landscape lock. iOS: manifest + icon for Add to Home Screen. `?debug` shows the
desktop page.

**Folder cleanup** (last commit) — source art moved to `art/` by category, unused files to
`art/_archive/`, docs to `docs/`. `prototype/assets/` is now generated by
`prototype/tools/build_assets.py` (7.6 MB instead of 26 MB loaded). Sprites are pre-cut, so the
runtime chroma-keying for the legionary/archer is gone. Root `assets/` and
`transparent-stickers/` no longer exist (moved into `art/_archive/`).

**Steps after the first handoff** (commits `92e5d57` … latest):
- Balance: idle-style exponential economy (`ECONOMY`), fixed per-wave difficulty against
  `expectedProgress(wave)`, human-like `session()` bot; first 10 waves ≈ 23 min (tested).
- First session: wave/boss notices, boss HP bar, recommended level on the wave button,
  first-minute hints (`hints`, `state.hintsSeen`), banners on real time.
- Trophies & eagles (`bossReward`, `canUpgradeTown`, `requiredTown`, `SYSTEMS`), village 1–7.
- Waves 11–30 with placeholder enemies and 4 bosses, up to 3 enemies from wave 21,
  Armory gear (`GEAR_SLOTS`, `dropGear`, `autoEquip`, `cycleGearOwner`), tuning `ACT3_*`.
- Barracks (hero levels for food, `trainHero`) and Temple (Mars / Ceres / Minerva offerings,
  `makeOffering`) are implemented; `heroDamageMult()` combines fatigue, gear, training and Mars.
  Waves 21–30 were retuned for trained heroes (`expectedProgress().heroLevel`).
- Balance tuning tip: when measuring a fight, check the phase **every frame** — checking in
  60-frame batches lets post-wave regeneration leak into the result (this bit us once).

## 3. Known issues / open decisions
- Spell/UI icons are font glyphs/emoji; some render as empty boxes on some systems.
  Real icons are requested in `ASSET_REQUESTS.md` (`assets/ui/…`).
- Act II effectively requires spells. **Open question for Nikita:** should spells be optional?
- The Wall slot (Priestess) only opens after wave 10 → needs an act III or endless mode.
- Hoplite / Priestess / act II enemies are tinted placeholders (see `ASSET_REQUESTS.md`).
- Hero collection / gacha: not decided; for now heroes unlock from waves and bosses.

## 4. Suggested next tasks (Nikita agreed with this direction)

> **Meta loop (decided):** `docs/META_LOOP.md` (Russian). **No resets.** ~200 waves of growth.
> Mini-boss every 5 waves, mega-boss every 10. Only bosses drop special resources:
> **trophies** (raise the village level, which caps building levels at `level × 5`) and
> **Aquila eagles** (unlock a new system: wave 10 Armory = hero gear, 20 Barracks = hero levels
> for food, 30 Temple = offerings to Mars/Ceres/Minerva). Waves 1–30 are a single guided path,
> the table is in the doc. Keep a settlement's data in its own object (several villages later).
> The doc's "first step" is the next big feature; open questions for Nikita are at its end.

1. Push + enable Pages, then Nikita playtests on a phone.
2. First-minute hints (tap Bash when an orc is close, upgrade the frontline with food, …).
3. A proper defeat screen that points at the upgrade that would help.
4. Act III (waves 11–15) or an endless mode so the third slot is playable.
5. Split `app.js` into modules (combat, heroes, hud, render, sound, save) — keep the test
   harness working (it evaluates the script in a `vm`; a simple concatenation step or ES
   modules + a small loader in the tests both work).
6. Light playtest telemetry (wave durations, defeats, purchases) in `localStorage`, exportable.
7. Wire in assets from `ASSET_REQUESTS.md` as they arrive and delete the placeholders.

## 5. Working with Nikita

- He writes in Russian (often voice-dictated, so expect typos); answer in Russian, keep the
  game and UI in English.
- He is the game designer: propose, explain trade-offs briefly, then build. He likes seeing
  the result (screenshots) more than long explanations.
- Taste so far: gradual unlocks (Cookie Clicker / AFK Arena pacing), danger should be felt
  from wave 1 but not punishing; UI simple and flat — **no frames inside frames, no circles,
  rounded squares, one style**; things must never overlap.
- Decisions he already made: 3 heroes on the field, 5–6 in the collection; soft rotation
  (bonus for resting, no forced bench); keep synthesized sounds for now; only the two clean
  orc head icons are used until new heads are rendered.

## 6. Where things are in `app.js`

Search for these section banners / names:
`buildWavePlan`, `OPENING_HP_TUNING`, `ACT2_HP_TUNING` (waves and balance) ·
`Sound:` / `sfxLib` · `startWave` / `finishWave` / `failWave` · `Heroes, slots and rotation`
(`heroDefs`, `castSpell`, `applyWaveFatigue`, `autoLineup`, `autoCastSpells`) ·
`update(` (simulation loop) · `drawScene` (rendering) · `In-phone HUD` (`syncHud`) ·
`Save / load and offline` (`serializeSave`, `applySave`, `offlineIncome`) · the boot block at
the very end (load save, autosave, listeners).

Thanks — and run the two checks from `AGENTS.md` before every push.
