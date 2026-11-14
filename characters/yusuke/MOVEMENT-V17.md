# Yusuke movement expansion V17

This update supports **two separate RGBA sprite atlases**, with 12 individual 256×256 cels per atlas in a 6-column × 2-row layout. All frames use the same bottom-center foot pivot (128,244), navy pants, yellow top, green wristbands, black-and-teal hair, and pixel-art rendering.

## Assets to upload

The generated binary PNGs are distributed in the accompanying ZIP (outside GitHub). Upload the **actual PNG files** to exactly these paths:

- `characters/yusuke/yusuke_walk_backward_turn_12frames.png`
- `characters/yusuke/yusuke_run_dash_12frames.png`

Both images must be 1536×512 and **RGBA with real transparency**. Do not upload the checkerboard JPG preview as a sprite texture.

## Runtime animation mapping

- Backward walk: atlas 1, frames 0–5, 12 FPS, loop.
- Turn: atlas 1, frames 6–11, 10 FPS, one-shot on `fighter.turnTimer`.
- Run: atlas 2, frames 0–5, 16 FPS, loop when forward velocity exceeds 300.
- Dash/rush: atlas 2, frames 6–11, 20 FPS, one-shot.
- Backdash: reuse backward-walk row at 20 FPS (preserves guard stance).
- Existing V16 forward walk and idle remain untouched; attacks, hit reactions, specials, hitboxes, 60-Hz physics, and DualSense controls remain unchanged.

`yusuke-exact-reference-v15.js` requests the above images when Yusuke's reference renderer is initialized. On missing/unloadable files, it safely falls back to the previous movement artwork. This commit installs **the renderer hooks only**, not the binary textures; assets must be uploaded to the two paths above to activate them. Run existing game tests after uploading and verify backward walk, quick turn, run, dash, walk-to-idle, and controller transitions in a browser.
