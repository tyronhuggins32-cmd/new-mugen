# Thorfinn (New MUGEN)

Thorfinn is the second playable character. His visual library is **built directly from the three Thorfinn sheets uploaded by the player in this project on November 13, 2026**.

## User-created artwork

- `user-sprites.webp`: a single transparent **2048×1400, 40-frame atlas**, 8 columns and 5 rows, with 256×280 tiles.
- `user-portrait.webp`: a transparent character select portrait cropped from the user's idle sheet.
- Source groups: frames 0–7 jumping, landing, guarding; 8–15 sprinting; 16–23 crouching; 24–31 idling; 32–39 walking.
- Both assets were rematted from the supplied JPEGs and sized to consistent on-stage proportions. The original character design, outfit, face, and coloring were retained.
- The old `sprites.svg` and `portrait.svg` are superseded and are not loaded at runtime.

## Combat controls

Square: melee chain. Triangle: launching strike at or below 50 focus or close-range Whirlwind Blades above 50. Circle: Dagger Lunge. R1 + direction: dash/backdash. L2: focus charge. Existing jump and guard inputs work.

**Limit:** The three uploaded sheets depict idle, movement, jumping, guard and crouch poses. They do not contain distinct dagger attack cels. For now, the existing melee engine drives the attacks with selected user-provided movement and guard poses and subtle canvas strike arcs. Do not describe those as hand-drawn dagger attack frames. Dedicated blade attack art, directional turn frames, and more hit reactions can be added without changing the atlas plumbing.

## Verification

`node tests/thorfinn.cjs` checks every frame rectangle, animation references, required attacks, and the binary asset signatures. The Chromium job (`tests/thorfinn-browser.cjs`) verifies the atlas loads at 2048×1400, the fighter can be selected and attacked, and Yusuke can still be reselected.

Browser sprites are rendered with nearest-neighbor sampling in the fighter renderer and an explicit frame anchor so the feet remain aligned during idle/walk/sprint transitions.
