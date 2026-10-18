# M.U.G.E.N Reborn — foundation 0.1.0

Browser-native fighting engine restart targeting eventual M.U.G.E.N 1.1 Beta 1 compatibility. **This milestone is an original two-fighter implementation with a limited scripting subset; it is not a complete M.U.G.E.N recreation.**

## Play

Hosted build: https://mugen-reborn-tyron.tyronhuggins32.chatgpt.site

Choose Arcade, Versus, Training, Survival or Watch, choose fighters, then Enter the Arena. Touch controls appear on touch devices. Rotate a phone for the landscape layout.

For local development, serve `dist/` with any static HTTP server. ES modules do not run by opening index.html with a file URL. No npm dependencies or compilation are required. WebGL 2 is required.

| Action | P1 | P2 |
| --- | --- | --- |
| Move / jump / crouch | WASD | Arrow keys |
| Light / medium / heavy | J / K / L | 1 / 2 / 3 |
| Low / side kick / super | U / I / O | 4 / 5 / 6 |
| Guard | Hold away | Hold away |
| Low guard | Down + away | Down + away |
| Pause | P or Escape | Same |
| Frame step while paused | N | Same |
| Collision boxes | F2 | Same |
| Fullscreen | F | Same |

Super costs 1,000 power out of 3,000. On confirmed hits, X→Y→Z and A→B are cancellable; connected normals can cancel into C with meter. These are test-fighter rules, not universal imported-character behavior.

Gamepad: standard D-pad / stick; X/Y/RB punches, A/B/RT low, kick, super. The first two connected controllers map to P1/P2. Hardware behavior still needs real-device verification.

## Current implementation

- Fixed 60Hz simulation with independent rendering, deterministic seeded CPU, simultaneous collision collection, directional guard, hitpause, hitstun, meter and rounds.
- Original Rook and Vale test fighters with distinct move timings, damage and movement, driven by generated CNS/CMD/AIR text parsed through the format modules.
- Native WebGL 2 sprite rendering, nearest-neighbor filtering, original programmatic pixel sprites, Moonlit Dojo stage, tracking camera and separation-based zoom.
- Local Versus; three-match Arcade ladder with two fighters; single-round Survival with life carryover; infinite Training with dummy behavior; live CPU Watch.
- Keyboard/touch/gamepad paths, pause on focus loss, full-screen request, settings in localStorage, inspector and hitbox overlay.
- Content Lab folder inspection, source diagnostics, missing dependencies, finite package and expression budgets. Reports persist in IndexedDB. Character assets are not installed.

## Verify

Node 22+:

```sh
npm test
npm run check
```

50 logic/parser checks passed at delivery. Browser rendering, mobile touch, hardware controllers, audio, IndexedDB and fullscreen have not been exercised in a real browser in this environment. See TEST_REPORT.md.

## Continue the compatibility work

Read MUGEN_COMPATIBILITY.md, SUPPORTED_FORMATS.md, ARCHITECTURE.md and docs/ROADMAP.md. First priority: a versioned SFF decoder and deterministic imported-character fixture, then the expression/command/common-state semantics required by that fixture. External characters cannot currently be played. Helpers, projectiles, throws, screenpacks, storyboards and team rules remain pending.

References: [Elecbyte CNS](https://elecbyte.com/mugendocs-11b1/cns.html), [AIR](https://elecbyte.com/mugendocs-11b1/air.html), [Ikemen GO](https://github.com/ikemen-engine/Ikemen-GO). No Elecbyte executable or Ikemen source is bundled. This project is independent and is not endorsed by Elecbyte.
