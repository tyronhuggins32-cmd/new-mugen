# Test report — 2026-10-18

Executed `npm test`: **50 passed, 0 failed** (Node built-in test runner). Executed `npm run check`: syntax validation passed for app, engine, formats and renderer modules.

Coverage includes fixed-step timing at 30/60/120Hz, catchup limit, intros, movement, jump/landing, pushboxes and boundaries, facing, golden first-active-tick damage, range misses, held-button edge behavior, standing/low guard, meter costs/chip, hitpause, hitstun, simultaneous trades, mirrored collisions, confirmed/cancel-disabled chains, training reset/meter, time-over, draw, best-of-three scoring, Survival single-round behavior, round reset, deterministic live CPU completion, input buffer clearing, animation holds/loops, box edges, parser comments/source lines, authentic AIR colon syntax, unsupported-controller reports, expression grammar/short-circuit/security budgets, package path/count/size safety and missing dependency diagnostics.

The initial walk-distance test used exact decimal equality and failed on IEEE floating-point accumulation (266.9999999999999 versus 267); it now uses a 1e-9 tolerance. Other tests passed before the final run.

Behavior corrections during development: preserved the jump animation on takeoff; collected both hits before applying common hit states for unbiased trades; validated confirmed chains; counted combos only while the target was already stunned; made Survival single-round to preserve carryover life; corrected zero-count AIR overrides; set the renderer's solid texture to white before tinting.

## Verification limits

No browser QA was performed. This managed environment does not expose the required control-browser capability, so the Sites workflow requires skipping preview/browser automation. No preview server or substitute browser was started. WebGL shader compilation/rendering, visual layout, live touch/gamepad input, audio autoplay handling, IndexedDB restore, fullscreen and cross-browser behavior remain unverified on real devices. Logic tests are not a substitute for those checks.

No unmodified third-party M.U.G.E.N character has run. No golden comparisons against the proprietary Elecbyte executable have been executed. These tests verify the original fixture behavior, not 1:1 engine compatibility.
