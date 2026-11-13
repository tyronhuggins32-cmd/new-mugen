# Gumball Watterson fighter expansion

The Gumball package is kept separate from Yusuke's JSON, artwork and combat definitions.

## Sprite atlas contract

Place the Gumball sprite atlas at `characters/gumball/gumball-sprites.png`:
- Transparent PNG, 2048 × 3072 pixels.
- 8 columns × 12 rows, 256 × 256 per cell.
- Frames 0–95 are mapped in `gumball.js` to idle variations, four-way movement clips, jumps, 9 basic/aerial attacks, defense, hit reactions, recovery, 4 special attacks and the cinematic.
- Keep the original Gumball design, blue fur, pink cap, beige trousers and cartoon proportions. The fighter renderer does not recolor or replace the atlas.

The image supplied with the request is an art-direction/profile reference, not a sprite atlas; the engine therefore fails safely to its existing placeholder art until the correctly packed sprite sheet is supplied.

## Combo / combat

- Light chain: jab → cross → body blow → uppercut. The third consecutive Square tap reveals the combo meter.
- Uppercut launches; air attacks extend; Air Dash follows the opponent; Heavy Slam ends the string with ground-bounce impact.
- Heavy finishers, command moves and specials each have startup, active and recovery windows plus explicit box dimensions.
- Special cancels are accepted through the shared short input buffer during cancellable active/recovery states.
- Scaling begins at 1.12× after the third Square, adds 0.13 per hit and caps at 2.25×; chain expires after .92 seconds and has a 12-hit route cap.
- Guard, dodge and counter behavior are independent. A correctly timed dodge gives a short punish window.
- Fixed-step physics applies hit-stop, directional knockback, hit stun, block stun, wall bounce, juggle launch and ground bounce.

## Special moves

- Elmore Rush: forward burst with cyan speed streaks.
- Cartoon Spin: multi-hit circular hitbox and expanding blue ring.
- Stretch Slam: long-range stretch strike, then heavy downward impact.
- Wattersom Chaos: multi-directional blue-energy rotation.
- Super – Reality Break: full-meter cinematic with screen distortion, blue charge and five guarded impact beats.

## Controls

PS5 DualSense: Square light; Triangle heavy; Circle special; X jump; L1 guard; R1 dash/dodge; R2 ultimate. Keyboard: J light; K heavy; L special; W jump; Shift block; E dash/dodge; U ultimate. Browser pointer/mobile buttons use the same shared control adapter if enabled.

Run `node tests/gumball.cjs` for package/animation/attack-phase contract checks. Physical controller verification and browser visual QA still need to be performed on device.
