# Yusuke: authored movement atlases (V17)

Four separate **RGBA 1536×512** sprite atlases are committed under `characters/yusuke/`.
Each atlas contains **12 full-body 256×256 cels** laid out in six columns and two rows, for 48 movement frames total. All cels were checked for transparency and SHA256 integrity at import.

| Source | Frame range | Game use | Playback |
| --- | --- | --- | --- |
| `yusuke_idle_12frames.png` | 0–11 | Breathing idle | 12 FPS loop |
| `yusuke_walk_forward_12frames.png` | 0–11 | Forward walk | 13 FPS loop |
| `yusuke_walk_backward_turn_12frames.png` | 0–5 | Guarded retreat | 12 FPS loop |
| `yusuke_walk_backward_turn_12frames.png` | 6–11 | Facing turn | 10 FPS one shot |
| `yusuke_run_dash_12frames.png` | 0–5 | Faster forward run | 16 FPS loop, forward speed >300 |
| `yusuke_run_dash_12frames.png` | 6–11 | Burst dash | 20 FPS one shot |
| `yusuke_walk_backward_turn_12frames.png` | 0–5 | Backdash | 20 FPS |

## Integration

`yusuke-exact-reference-v15.js` loads these textures asynchronously on first rendered pose and selects the appropriate illustration for each grounded movement state. It preserves the old V16 movement atlas as a fallback if a new texture is unavailable, and keeps the original attack, guard, hit, jumping and special-art paths unmodified. Frame sampling is render-only; hitboxes, controller mapping, and 60-Hz combat physics remain unchanged.

`game-build-0009.html` bumps the render-script URL query with `movement=17` to refresh browser caches.

Run `node tests/yusuke-movement-v17.cjs` to verify PNG RGBA dimensions, clip routing, all 12 idle/forward frames, backwards/turn and running/dash selection and legacy fallback. `node tests/yusuke-walk-idle-v16.cjs` verifies the previous art is still available if V17 art fails.

Browser and controller visual QA is still advised for frame-to-frame transition smoothness, quick turns, and dash control. No combat sprites were replaced by this movement update.
