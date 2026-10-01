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
| Spirit Shotgun | J, J, J, then L |
| Pause / resume | P or Pause button |
| Character select | Esc or B |

On-screen buttons support touch play.

## Verification

Run `node tests/engine.cjs` for dependency-free logic regression checks. These check timing at 30/60/120/144 Hz, input ownership, collisions, guarding, melee trades, projectile release, round progression, pause, rematches, and animation-loop lifecycle. These tests use DOM stubs and do not verify rendering.

For browser checks, install Playwright and its Chromium browser, start the server above, and run `node tests/combat.cjs`. Browser verification for this change was blocked by failed Chromium downloads; the script is supplied but is not claimed as passing.

## Current limits

Only Arcade is playable. Versus, Training, and Watch remain menu placeholders. This is a custom JavaScript fighter, not the MUGEN engine: it does not import MUGEN DEF/CNS/CMD/SFF character packs. Native character compatibility and a full roster require further engine work. This update does not claim all bugs are eliminated.

This is a fan-made prototype. Yu Yu Hakusho and Yusuke Urameshi belong to their respective rights holders.

## Longer fights and punch variety

Both fighters now have 1,000 HP. Selection ratings use a 1,000-point scale; spirit energy remains a separate 100-point resource. Rounds last up to 180 seconds. Damage rises only about threefold, giving roughly three times the previous durability.

Repeated J taps (or the touch Brawl button) chain a 20-damage jab, 26-damage cross, 30-damage body blow, and 42-damage uppercut. They have distinct startup, recovery, reach, recoil, motion trails, and existing-frame animation sequences. A gap of 0.85 seconds between attack starts, taking a hit, or using another attack resets the chain. These reuse the existing sprite artwork; they are not new hand-drawn sprite sheets.

## Spirit specials and combo meter

The dedicated transparent `characters/yusuke/spirit-specials-v2.png` atlas contains four Spirit Gun and four fist-shotgun poses, loaded and rendered during combat. Three punches then Spirit Gun triggers Shotgun; the old block-plus-gun shortcut is removed. Buffered Spirit inputs can queue during the third punch.

Each unblocked landed hit adds one to the combo and contributes that count as flat bonus damage to that hit: hit 10 adds 10 damage. The meter fills visually at ten hits; the number and bonus continue increasing beyond ten. A two-second gap without a landed hit, taking damage, or a new round resets the combo. Blocked hits do not increase or refresh it. Shotgun pellets count as one volley hit.

Artwork was created with the built-in image generator using the original fighter sheet as reference: eight right-facing full-body poses, yellow shirt/navy pants, four finger-gun phases and four fist-shotgun phases, transparent 4-by-2 atlas.
