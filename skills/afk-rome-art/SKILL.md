---
name: afk-rome-art
description: Create or revise character, enemy, boss, portrait, and UI art for AFK Rome Village while preserving the project's established hand-painted 2D sprite style. Use before every image-generation or image-editing task for this project.
---

# AFK Rome art direction

Use the project's finished PNGs as the rendering-style source of truth. Nikita's 3D warrior
models define character design, costume, equipment, and silhouette; they do not replace the
game's established 2D rendering language.

## Mandatory references

Inspect the relevant files with `view_image` before writing a generation prompt.

- Primary style anchors: `art/characters/roman-archer.png`,
  `art/characters/orc-raider.png`, `art/characters/orc-dual-swords.png`,
  `art/characters/orc-shield-guard.png`, and `art/characters/orc-red-elite.png`.
- Existing-character identity anchors: the matching PNG in `art/characters/`. Preserve the
  established face, costume, palette, equipment, and role unless Nikita requests a redesign.
- Nikita's 3D design references: `art/references/ancient-warrior-girls-front.png`,
  `art/references/ancient-warrior-girls-formation.png`, and
  `art/references/ancient-warrior-girls-rear.png`. For the Greek hoplite helmet, also inspect
  `art/references/ancient-warrior-girls-hoplite-helmet.png`: it fixes the Corinthian nose guard,
  cheek plates, and the transverse red-and-black crest orientation.
- `art/characters/roman-legionary.png` is a valid design reference, but its small resolution and
  edge fringe are defects to fix, not qualities to imitate.

## Visual language

- Polished hand-painted **2D mobile-game sprite**, never a glossy 3D render and never a new anime
  style.
- Thick, clean dark-brown contour lines; warm soft cel shading; subtly faceted painterly
  highlights; crisp readable shapes.
- Compact, slightly chibi heroic proportions with an expressive face and oversized but coherent
  equipment. Keep detail rich but uncluttered at gameplay scale.
- Saturated but controlled palette. Warm daylight, strong material separation, and a clear
  silhouette take priority over realism.
- Match the line weight, face treatment, shading density, and edge finish of the primary style
  anchors. Do not introduce ornamental motifs that are absent from the character brief or design
  reference.

## Character sprite contract

- Exactly one full-body subject on genuine transparent RGBA.
- Face right in side view with a slight three-quarter turn; the renderer flips the sprite when
  needed.
- Centre the figure, keep every weapon and body part inside the canvas, leave transparent margin,
  and place the feet at the bottom of the figure.
- No ground, grass, pedestal, scenery, baked shadow patch, UI, text, logo, or watermark.
- Make the face, torso, hands, feet, and role-defining equipment readable. Avoid shields or props
  hiding the entire body.
- Source characters should be roughly 1024–1300 px tall. Preserve alpha when resizing.

## Prompt rule

Name every input's role. Existing PNGs are the **rendering-style and identity references**. The 3D
screenshots are **design-only references**. Include this explicit lock in character prompts:

> Precisely match the supplied AFK Rome Village production PNGs: hand-painted 2D game art with
> dark-brown outlines, warm soft cel shading, painterly highlights, compact chibi proportions, and
> crisp transparent edges. Do not render glossy 3D art or drift into a different anime style.

Generate one distinct asset per call. Inspect every output at full resolution. Reject and retry if
the style drifts, alpha is fake, anatomy/equipment is broken, or the silhouette is unreadable.

## Project integration

1. Save the selected full-resolution source under `art/<category>/` using the filename from
   `ASSET_REQUESTS.md`.
2. Add or confirm its entry in `prototype/tools/build_assets.py`, then run that builder.
3. Load the generated copy from `prototype/assets/`; never hand-edit generated runtime copies.
4. Replace the matching placeholder tint, prop, or code-drawn substitute.
5. Visually check the character in the running game and run the repository's required tests.
