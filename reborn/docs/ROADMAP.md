# Remaining implementation plan

Target: independent, browser-native M.U.G.E.N 1.1 Beta 1 behavior. The delivered foundation is phase 1 with early text parsing; phases below remain implementation work.

1. **Playable binary fixture:** implement SFF version detection, v1 PCX/indexed palettes and v2 sprite/palette linking and encodings, with resource caps; SND WAV groups and palette ACT. Pin legally distributable fixture assets. Acceptance: fixture sprite/axis/palette/audio tests and rendered review.
2. **First unmodified character:** resolve DEF dependencies, common states and CMD loading; full required expression grammar including comma/redirection semantics, variables, trigger calls and bottom values. Implement only testable real semantics, then grow the documented controller/trigger matrix. Acceptance: a legally obtained unmodified external character plays from its own scripts, with reference tick traces.
3. **Combat fidelity:** attributes, HitDef parameter semantics, guards, hitpause per entity, juggle/fall/recovery, throws/custom states, projectile/helper entities, pauses and superpause, target/binding controls. Acceptance: independent golden scenarios and regressions per feature.
4. **Stages and camera:** authentic DEF backgrounds, SFF layers, parallax, background controllers, boundaries/music and 1.1 camera parameters; acceptance against stage-specific expected transforms.
5. **Motifs and game modes:** select.def, system/fight resources, fonts, lifebars, storyboards; authentic Arcade/continue/Survival rules and Single/Turns/Simul/Co-op. Menu entries become available only when their loops work.
6. **Content and delivery:** bounded ZIP installation, IndexedDB assets/manifests, package removal/export/restore, key/controller remapping, hardware and mobile QA, shader/context-loss tests, performance profiling for thousands of sprites, multi-browser regression.

Maintain source/file/line errors and explicit unsupported status throughout. No imported portrait counts as gameplay compatibility. Do not claim exhaustive parity without a reference execution corpus covering documented semantics and edge cases.
