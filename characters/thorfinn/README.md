# Thorfinn sprite library (New MUGEN)

Thorfinn is the second playable fighter. The game now loads **92 creator-authored poses** from separate movement and combat atlases. No new character drawings were synthesized: all artwork comes from this project's uploaded sheets.

## Original 56-frame movement atlas

`thorfinn-atlas-v3.webp` is the 2048×1960 WebP movement atlas (8 columns × 7 rows, 256×280 tiles). It preserves the original 40 idle/walk/run/guard/jump/crouch frames and 16 subsequently uploaded jumping and crouch-walking frames. These source assets are kept in the folder.

Movement frame families: 0–7 early jump/guard; 8–15 sprint; 16–23 original crouch; 24–31 idle; 32–39 walking; 40–47 new jumping; 48–55 crouch walking.

## New 36-frame combat atlas

`thorfinn-combat-v4.webp` is the **3072×1600 transparent WebP combat atlas** (8 columns × 5 rows, 384×320 tile). The five original JPEG sheets are also committed so the assets can be regenerated using `tools/pack-thorfinn-combat-v4.py`.

| Combat atlas frames | Uploaded source sheet | Game use |
| --- | --- | --- |
| 0–3 | `source-air-attack.jpg` | Airborne dagger strikes |
| 4–7 | `source-hurt.jpg` | Damage, hit stagger and knockback animation |
| 8–13 | `source-air-combo.jpg` | Extended aerial combos |
| 14–25 | `source-ground-combo.jpg` | Square combo, cross/body, uppercut, heavy blade slash |
| 26–35 | `source-blade-barrage.jpg` | Circle Dagger Lunge and Triangle Whirlwind Blades |

Each original sheet is split using its exact row/column grid. The packer replaces JPEG white backgrounds with transparent RGBA, removes detached compression specks, and repairs translucent edges without deleting pale blade slash trails. Combat poses use fixed per-sheet scaling and bottom alignment to avoid character size changes during attacks.

## Runtime behavior

The game loads both atlases for Thorfinn. Idle, walking, sprinting, jumping, landing, crouching and guarding use the movement atlas. Active attacks and hurt states use the combat atlas. Authored blade trails replace the old generic circular effect on those attacks. **Render interpolation is not used as opacity**, preserving the earlier fix where the player could disappear in battle.

- Square: melee chain with the original blade slash sequence
- Triangle with low spirit/focus: launching attack, with high energy: Whirlwind Blades
- Circle: Dagger Lunge
- Jump + melee: dedicated airborne blade attacks; later attacks use aerial combo poses
- Down + Left/Right: crouch-walk with the correct low hurtbox; Down alone guards
- R1 + direction: dash/backdash; L2: charge

The character keeps the engine's existing combat timings, collision and 5000 HP. The opposing CPU remains unaffected, as do all Yusuke sprites and audio.

## Verification

`node tests/thorfinn.cjs` checks all 36 new source mappings and preserves the 56 movement frames. `node tests/thorfinn-browser.cjs` verifies the actual rendering engine loads both textures, selects every distinct pose family and draws opaque fighters with transparent backgrounds during gameplay.
