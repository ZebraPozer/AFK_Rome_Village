# Asset requests — AFK Rome Village

> **Art direction for the Unreal version (recommended, pending confirmation — `docs/UNREAL_PORT.md` §7):**
> characters stay **2D** (best as Spine-ready parts: head, torso, arms, weapon, shield on separate
> layers), the scene becomes **3D modular**. So: characters, enemies, bosses, icons — go ahead;
> **2D buildings / village art (Priority 4) — on hold** until the Unreal style slice is approved.

Hey Codex 👋 — this is the list of art we need rendered (or re-rendered) for the prototype.
Everything in the game currently works with placeholders, so nothing here is blocking.

**Where to put files:** paths below like `assets/characters/x.png` mean the **source** goes to
`art/characters/x.png` (full resolution). Then add it to `prototype/tools/build_assets.py`
and run it — the game loads the web-sized copy from `prototype/assets/`.

## Style and technical rules (apply to everything)

- **Style:** match the existing cartoon sprites — `assets/characters/orc-raider.png`,
  `assets/characters/roman-farmer.png`, `assets/icons/orc-raider-head.png`. Thick dark outline,
  soft cel shading, slightly chibi proportions, warm daylight.
- **Background:** real alpha transparency (RGBA PNG). No checkerboard, no flat colour behind
  the character — the game currently has to chroma-key some files at runtime.
- **One subject per file**, centred, nothing cropped, a few pixels of empty margin.
- **Characters** face **right** (they are flipped in code when needed), side view with a
  slight 3/4 turn, feet on the bottom edge of the figure.
- **Head icons:** head only, cut at the neck, no shoulders or armour plates. Same framing as
  `assets/icons/orc-raider-head.png` and `assets/icons/orc-brute-boss-head.png`
  (these two are the reference — they look right).
- **Sizes:** characters ~1024–1300 px tall; head icons 1254×1254; UI icons 512×512.
  The game downsizes everything.
- File names: lowercase-kebab-case, exactly as listed below.

## Priority 1 — heroes and UI

| # | File | What | Placeholder now |
|---|---|---|---|
| 1 | `assets/characters/roman-legionary.png` | Legionary, the starting frontline hero: scutum shield + gladius, red crested helmet. Same look as now, but at full resolution. | Small (324×538) cut-out from an old parts sheet, fringe around the edges |
| 2 | `assets/characters/roman-archer.png` | Archer hero on the tower, drawing a bow. Same look as now. | Cut out of a checkerboard image — edges are rough |
| 3 | `assets/characters/greek-hoplite.png` | Hoplite, second frontline hero: round bronze shield (aspis), spear, bronze helmet with a tall red crest. Heavier and calmer than the legionary. | Legionary sprite tinted bronze + a crest drawn in code |
| 4 | `assets/characters/roman-priestess.png` | Priestess, support hero on the wall: white/gold robes, laurel wreath, staff or incense bowl, soft golden glow. | Archer sprite tinted blue + a halo drawn in code |
| 5 | `assets/ui/spell-shield-bash.png` | Spell icon: shield slam / impact. | Font glyph ⛨ |
| 6 | `assets/ui/spell-hold-the-line.png` | Spell icon: locked shields / shield wall. | Font glyph ▥ |
| 7 | `assets/ui/spell-volley.png` | Spell icon: rain of arrows. | Font glyph ➶ |
| 8 | `assets/ui/spell-blessing.png` | Spell icon: healing light / laurel. | Font glyph ✚ |
| 9 | `assets/ui/icon-auto.png`, `icon-upgrades.png`, `icon-pause.png`, `icon-play.png`, `icon-sound-on.png`, `icon-sound-off.png`, `icon-lock.png`, `icon-wave.png` (war banner/flag) | Flat UI icons, single light colour (#f4eedb) on transparent, simple silhouettes, readable at 24 px. | Font glyphs and emoji (some show as empty squares on some systems) |

## Priority 2 — enemy head icons for the wave roster

Same framing as the two reference heads. Each one must match its field sprite.

| # | File | Matches sprite | Placeholder now |
|---|---|---|---|
| 10 | `assets/icons/orc-dual-swords-head.png` | `characters/orc-dual-swords.png` (red mohawk, war paint) | Raider head, slight tint |
| 11 | `assets/icons/orc-shield-guard-head.png` | `characters/orc-shield-guard.png` (iron helmet) | Raider head, desaturated |
| 12 | `assets/icons/orc-red-elite-head.png` | `characters/orc-red-elite.png` (red skin, black hair) | Raider head, hue-shifted |
| 13 | `assets/icons/goblin-head.png` | new goblin sprite (#16) | Raider head, tinted yellow-green |
| 14 | `assets/icons/orc-archer-head.png` | new orc archer sprite (#17) | Raider head, tinted purple |
| 15 | `assets/icons/orc-shaman-head.png` | new shaman sprite (#19) | Raider head, tinted violet |

Hero heads for the Heroes tab: `assets/icons/hoplite-head.png`, `archer-head.png`,
`priestess-head.png` (same framing as `legionary-head.png`).

## Priority 3 — act II enemies (waves 6–10)

These are drawn today as tinted orc sprites with props drawn in code.

| # | File | What |
|---|---|---|
| 16 | `assets/characters/goblin.png` | Small, fast, sneaky goblin with a sack — it runs past the legionary and steals gold. Noticeably smaller than an orc. |
| 17 | `assets/characters/orc-archer.png` | Orc with a short bow, light armour, keeps its distance. |
| 18 | `assets/characters/orc-boar-rider.png` | Orc riding a war boar (one sprite, rider + boar), charging pose. |
| 19 | `assets/characters/orc-shaman.png` | Boss of wave 10: tall shaman with a glowing blue staff, bone/feather headdress, purple tones. Should read as a boss (big silhouette). |
| 20 | `assets/characters/orc-brute-boss.png` | Boss of wave 5 as a proper field sprite (today it is a cut-out of the concept art `art/concepts/orc-brute-boss-01.png`). |

## Priority 3b — act III enemies and bosses (waves 11–30)

Placeholders today: tinted copies of existing orc sprites.

| File (source in `art/characters/`) | What |
|---|---|
| `troll.png` | Big armoured troll, slow, heavy club. Bigger than an elite orc. |
| `wolf-rider.png` | Orc riding a grey wolf, fast, charging. |
| `orc-berserker.png` | Shirtless orc with two axes, war paint, angry — he enrages at half HP. |
| `goblin-king.png` | Boss (wave 15): fat goblin with a crown on a small throne/shield, cocky. |
| `orc-warlord.png` | Boss (wave 20): huge orc in black iron armour with a banner. |
| `ogre-chief.png` | Boss (wave 25): ogre with a tree-trunk club, skull belt. |
| `cyclops.png` | Boss (wave 30): one-eyed giant with a stone shield. The biggest silhouette so far. |

Head icons for all of the above, same framing as `orc-raider-head.png`.

## Priority 3c — loot and boss rewards (UI icons, 256×256)

`assets/ui/trophy.png` (boss trophy), `assets/ui/eagle.png` (Roman legion eagle, Aquila),
`assets/ui/gear-weapon.png`, `gear-armor.png`, `gear-charm.png`, each in 3 rarities
(`-common`, `-rare`, `-epic`: iron / silver / gold-glowing).

## Priority 4 — buildings and defences (nice to have)

| # | File | What | Now |
|---|---|---|---|
| 21 | `assets/buildings/catapult.png` | Wooden Roman catapult (onager) that sits on the tower platform. | Drawn in code |
| 22 | `assets/buildings/stone-guard-tower.png` | Stone version of the tower for later town tiers, same footprint as `wooden-guard-tower-room.png`. | — |
| 23 | `assets/buildings/village-hut.png`, `village-house.png`, `village-villa.png`, `windmill.png` | Village buildings for town stages I–III, side view, matching the cartoon style. | Drawn in code |

## Reused for now (no action needed yet)

- Enemy heads #10–15 reuse `orc-raider-head.png` with colour tints.
- Hoplite and priestess reuse the legionary/archer sprites with tints.
- Act II enemies reuse orc sprites with tints and code-drawn props (bow, boar, staff).
- Sounds are synthesized in code; recorded SFX may come later (not part of this list).

When something is delivered, tell Claude which files changed — it will wire them in and
remove the matching placeholder code.
