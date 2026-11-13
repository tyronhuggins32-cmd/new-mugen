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
- Keyboard aliases and DualSense inputs are tracked independently.
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
| Spirit Dash | E (or Dash touch button) |
| Charge spirit energy | Hold I (or + touch button) |
| MAX Spirit Gun | U at 100 energy (or glowing MAX touch button) |
| Pause / resume | P or Pause button |
| Character select | Esc or B |

No on-screen touch controls are shown; controller and keyboard controls leave the arena clear.

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


## Cinematic combat pass (November 2026)

The original Yusuke fighter is still the first selectable character, with the Demon Scout as a CPU sparring opponent. The new mugen-cinematics.js layer adds a hand-rendered nighttime rooftop stage, energy-charge aura, fast forward dash, and a MAX Spirit Gun finisher inspired by the presentation style of the user-provided MUGEN reference clip, not a copied animation. MAX Spirit Gun costs all 100 spirit energy, briefly locks both combatants in a cinematic, and delivers up to eight mechanically counted hits if the opponent is in front and in range. Blocking still reduces damage; missing the attack wastes the meter. No external artwork or assets are required for these effects.

DualSense support removes the touch-action overlay. Normal Spirit Gun and the punch-to-Shotgun combo still work. Keyboard directions, blocking, pausing, and existing round rules remain unchanged.

This pass does not yet include literal MUGEN character imports, transformation sprites, character-versus-character roster selection, destructible environments, or a 100-hit cinematic. Those are further development areas, not implemented features. PS5/gamepad mappings are also not added in this pass.

## PS5 DualSense controller (touch-free gameplay)

The browser build uses the standard Web Gamepad API. Pair your controller to the device via Bluetooth or USB and press a controller button after loading the page. On an iPhone, use Settings > Bluetooth and hold Create + PS until the controller lights flash; select DualSense Wireless Controller. Open the game in a browser that supports the Gamepad API, ideally a secure HTTPS page. The header changes to DUALSENSE CONNECTED when the controller is detected.

| DualSense input | In battle |
|---|---|
| Left stick / D-pad left & right | Move |
| X (Cross), D-pad up, stick up | Jump |
| L1, D-pad down, stick down | Guard |
| Square | Light punch combo |
| Triangle | Heavy spirit attack |
| Circle | Spirit Gun; after three punches, Spirit Shotgun |
| R1 | Quick forward dash |
| Hold L2 | Charge spirit meter |
| R2 | MAX Spirit Gun (requires 100 meter) |
| Options | Pause/resume |

In menus: D-pad/left stick up/down navigates; X confirms; Circle goes back. While a fight is paused, Circle returns to character select; while active, Circle fires Spirit Gun. After a match, X can select rematch and Circle returns to character select. The Options pause behavior releases held attack inputs to avoid accidental attacks upon resuming. Disconnecting the active gamepad pauses the game. Keyboard input remains a fallback if the controller is unavailable; touch input is no longer necessary.

This mapping is designed for DualSense's standard browser layout. It is covered by synthetic input regression tests (`node tests/gamepad.cjs`). Real Bluetooth pairing and button mapping must still be verified on a physical PS5 controller and target browser.
