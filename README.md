# New Mugen — Browser Fighter

A browser fighting-game prototype featuring Yusuke versus the CPU Demon Scout. Run `python3 -m http.server 8000` in this folder, then visit http://localhost:8000. `index.html` opens the game build.

## Combat update

- Fixed 60 Hz simulation independent of display refresh rate.
- First-to-two rounds, visible score, draw replays, and complete match rematches.
- Opponent-facing backward movement and automatic guard while retreating into a threat.
- Directional blocking: attacks from behind bypass guard.
- Jump-over cross-ups, body-sized collision, and corner separation.
- Simultaneous melee strikes can trade rather than always favoring player one.
- Pause/resume button and P shortcut; losing focus pauses the match.
- Keyboard aliases and touch inputs are tracked independently.
- Stopping a fight cancels its animation callback before re-entry.
- The external character JSON now contains the current format-3 definition, including actual sprite and effect paths, instead of silently falling back to embedded data.

## Controls

| Action | Input |
|---|---|
| Move | A/D or Left/Right |
| Jump | W or Up |
| Guard | S, Down, Shift, or hold away from an incoming threat |
| Light / heavy | J / K |
| Spirit Gun | L |
| Spirit Shotgun | S + L |
| Pause / resume | P or Pause button |
| Character select | Esc or B |

On-screen buttons support touch play.

## Verification

Run `node tests/engine.cjs` for dependency-free logic regression checks. These check timing at 30/60/120/144 Hz, input ownership, collisions, guarding, melee trades, projectile release, round progression, pause, rematches, and animation-loop lifecycle. These tests use DOM stubs and do not verify rendering.

For browser checks, install Playwright and its Chromium browser, start the server above, and run `node tests/combat.cjs`. Browser verification for this change was blocked by failed Chromium downloads; the script is supplied but is not claimed as passing.

## Current limits

Only Arcade is playable. Versus, Training, and Watch remain menu placeholders. This is a custom JavaScript fighter, not the MUGEN engine: it does not import MUGEN DEF/CNS/CMD/SFF character packs. Native character compatibility and a full roster require further engine work. This update does not claim all bugs are eliminated.

This is a fan-made prototype. Yu Yu Hakusho and Yusuke Urameshi belong to their respective rights holders.
