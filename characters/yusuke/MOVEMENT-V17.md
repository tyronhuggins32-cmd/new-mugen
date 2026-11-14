# Yusuke movement: V20 L3 Run + R1 Dash

Gameplay is implemented in `game-build-0009.html` and sprite selection in `yusuke-exact-reference-v15.js`.

## Controls
- Left stick / D-pad: ordinary ground walk and airborne movement.
- **L3 click:** toggle sustained running ON/OFF, with persistent HUD indicator. The second click returns to walking.
- **R1:** independent short **dash**, even when L3 running is on. R1 + away gives a backdash. Run mode remains set afterward.
- Keyboard equivalents: **R** toggles running; **E** dashes.

## Gameplay animation split
- Walking remains its own loop, selected when running is off.
- Running is a six-pose looping cycle: 12 animation FPS, player uses fast ground velocity.
- Dash is an independent one-shot fighter state that covers **all six poses** across its approximately 0.25-second physics burst (24 animation FPS, independent from the 60Hz simulation).
- Backdash remains an opponent-facing guarded retreat pose.
- Hit reactions, specials, attacks and collision data were not replaced.

## Art
The pre-existing canonical uploaded RGBA file `characters/yusuke/yusuke_run_dash_12frames.png` has 6 RUN cells in row 0 and 6 DASH cells in row 1 (1536×512, 256×256 per cel). The renderer loads it and splits it *at runtime into two separate cached sprite surfaces*, using a conservative bright-neutral alpha-fringe cleanup. This works without manually uploading any replacement PNG to the repository. The optional asset package from the source screenshot contains separate run and dash PNG sheets for future art refinement; they are not needed for V20 playback.

L3 and R1 have independent animation and movement rules. Control mapping: `dualsense-controller.js` maps standard Gamepad API button 10 (L3) as an edge-triggered toggle, and button 5 (R1) as dash. The run HUD label is reset at match start. Cache key for main sprite renderer is now V20.

## QA
- `tests/gamepad.cjs`: L3 rising-edge toggles once per click without auto-repeat, alongside R1 and other DualSense mappings.
- `tests/yusuke-movement-v17.cjs`: 6-frame dash timeline, separated run/dash atlas surfaces, correct sprite scale and source integrity.
- `tests/engine.cjs`: run is faster than walk, dash overrides run, run mode persists after dash, running disables correctly.
- Full regression workflow: `Mugen regression checks` under GitHub Actions.
- Browser smoke workflow depends on Playwright Chromium installation, which can fail independently of the movement code. Physical DualSense QA is still required.
