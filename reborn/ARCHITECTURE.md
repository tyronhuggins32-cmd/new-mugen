# Architecture

`dist/src/engine.js` has no DOM, graphics, audio or storage dependencies. `Match.step(inputs)` advances one game tick. `FixedClock` accumulates render deltas and calls it at 60Hz, capping a stalled render callback's catchup to 15 ticks to avoid a spiral. Long suspended time is intentionally discarded; simulation itself is not run at a reduced rate. `snapshot()` supports reproducible comparisons.

`formats.js` parses ordered text sections, AIR action elements and collision data, CMD command declarations and a small CNS controller subset. Expression ASTs are interpreted without JavaScript evaluation. Limits bound nesting and token counts. Unknown syntax/controllers raise errors. A limited trigger context is evaluated by the engine. This is an initial interpreter, not full CNS compatibility.

`fighters.js` is original fixture content: two profiles generate CNS/CMD/AIR source. States/attacks/confirmed cancel rules come from parsed text. Movement, damage handling, jump gravity, common hit states, guard logic and bounds are implemented in the core with fixture profile parameters; they are not yet M.U.G.E.N common-state execution. Fonts, HUD and roster configuration are browser UI, not imported motifs.

Update order: input snapshots and command buffers; global hitpause gate; special state pass -3/-2/-1; current state controllers with bounded same-tick transitions; fixture movement/common behavior; animation advancement; pushbox separation; collect both fighters' collisions; resolve all collected hits; apply deferred hit-state changes; timer and round result. Collect-before-resolve permits trades. This order is covered by fixture tests but has not been validated against the Elecbyte executable.

`render.js` builds original low-resolution sprites and stage textures with canvas, then renders textured quads using WebGL 2. Graphics follow engine state but do not drive it. Camera/zoom smoothing is visual only. Sprite textures are cached for the renderer lifetime. Draw-call batching and context restoration are future work. No image-generation or external character assets are bundled.

`app.js` owns lifecycle, keyboard/touch source ownership, gamepad snapshots, mode progression, dialogs, training settings, audio and persistence. Multiple touch pointers are tracked by ID; focus loss clears input and pauses play. Settings use localStorage; Content Lab reports use IndexedDB. Assets are not persisted or installed. All content is local; there is no multiplayer/server state.

Presentation is `index.html` plus responsive `style.css`. Rendering requires WebGL 2. Web font loading is optional; system font fallbacks are included.
