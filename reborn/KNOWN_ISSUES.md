# Known issues and limits

- Full M.U.G.E.N compatibility is not present; see the matrix before importing content.
- External character folder inspection is diagnostic only. ZIP import, SFF/SND decoding, dependency installation, texture palettes and executable imported characters remain pending.
- Both test fighters have six moves, including one meter super. No projectiles, helpers, throws, hit overrides, juggle system or custom opponent states yet.
- Common physics and hit behavior are fixture rules. Air attacks, knockdown/recovery and guard handling do not reproduce all original semantics.
- The default roster, menu/HUD, stage and movement profiles are currently source-defined. Screenpacks, select.def, fight.def, configurable camera and custom stages are not loaded.
- Arcade repeats a two-fighter roster over three matches. Storyboards, endings and original continue rules are pending. Team modes are not available.
- Gamepad buttons are mapped to standard hardware layouts; remapping and arcade-stick validation are pending. Touch currently controls P1. Mobile folder picking and fullscreen depend on browser capabilities.
- Settings and reports persist locally, not across devices. Browser storage eviction can remove them. Installed content persistence is pending because installation is pending.
- WebGL context-loss restoration, batching, large-asset stress profiling and browser/device QA remain pending. No claim that all browsers have been verified.
