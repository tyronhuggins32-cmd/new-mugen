# Thorfinn sprite library and combat integration

Thorfinn is the second playable New MUGEN fighter. His **56-frame game atlas is derived exclusively from the player's supplied sprite sheets**, not substituted or redrawn artwork.

## Atlas v3

| Asset | Description |
| --- | --- |
| `user-sprites.webp` | Original 40-frame transparent atlas from the first three creator uploads |
| `source-jump-8frames.png` | Latest user-supplied jumping and airborne motion, full-resolution 2048×448 |
| `source-crouch-walk-8frames.png` | Latest user-supplied crouch-walk motion, full-resolution 2048×448 |
| `thorfinn-atlas-v3.webp` | Runtime atlas, 2048×1960 (8 columns × 7 rows, each 256×280), **56 frames** |
| `user-portrait.webp` | Portrait made from the creator's own idle artwork |

Atlas indices: **0–39** original motion/guard/idle/attack stand-ins; **40–47** eight updated jump frames; **48–55** eight new crouch-walk frames.

`tools/pack-thorfinn-v3.py` regenerates the runtime atlas from the three source files. It crops by transparency, normalizes near-opaque alpha, discards nearly invisible matte remnants, downscales without changing the costume or proportions, centers each source cel horizontally, and aligns the feet vertically. The engine's jump physics determines the character's air position, preventing the source images from accidentally adding a second jump arc. Keep the individual source sprites committed in the repository for future refinements.

## Playable controls

- **Down + Left/Right:** Thorfinn moves slowly while crouched, with the crouch hurtbox.
- **Down alone / Guard:** regular block.
- **Jump:** all eight newly uploaded airborne frames, split into ascent and descent.
- **Square:** existing melee chain.
- **Triangle:** launching strike at or below 50 focus / close-range Whirlwind Blades above 50.
- **Circle:** Dagger Lunge.
- **R1 + direction:** dash/backdash; **L2:** focus charge.

**Known limitations:** The latest user images do not contain individually drawn dagger impact or slash poses. Existing attack behavior uses appropriate source poses and simple on-canvas arcs while a future dedicated combat sheet is developed. Crouch-walking is not invulnerable and does not automatically block. Thorfinn's motion remains based on the provided art, while Yusuke's assets and moves are unchanged.

## Verification

`node tests/thorfinn.cjs` checks frame layout, required files, 56 indices and combo data. `node tests/thorfinn-browser.cjs` loads the actual game in Chromium and checks sprite dimensions, transparency, crouch movement and melee combat. CI runs both.
