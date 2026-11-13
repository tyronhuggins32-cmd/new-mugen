# New Mugen — Browser Fighter

## Thorfinn fighter foundation (November 2026)

The second roster fighter, **Thorfinn**, now uses the creator's uploaded sprite sheets: an alpha-clean 56-frame WebP atlas with idle, walk, sprint, crouch-walk, guard, 8-frame jumping and landing poses. He keeps his playable melee move set, full 5,000 HP, and keyboard/DualSense switching. Dedicated drawn dagger-attack poses were not included in the uploaded sheets, so those actions temporarily use available poses and engine strike arcs.

**Art status:** The uploaded source art is committed as `characters/thorfinn/user-sprites.webp`, `source-jump-8frames.png`, `source-crouch-walk-8frames.png` and `user-portrait.webp`. The runtime now loads `thorfinn-atlas-v3.webp` with 56 transparent cels, mapped in `thorfinn.json`. The synthetic SVG placeholder is no longer used. See `characters/thorfinn/README.md` for frame assignments and remaining combat-art limitations.


## Rebirth 0011: full arcade front-end rebuild (November 2026)

The menu system has been **structurally rebuilt**, not just recolored. The previous UI stylesheet is no longer loaded. The live presentation now uses `mugen-rebirth-ui.css`, and both screen layouts were replaced in `game-build-0009.html`.

- **Attract screen / main menu:** a broad cinematic hero with the NEW MUGEN RISING wordmark, layered vector-lit arena horizon, animated rings, an oversized Yusuke portrait and system broadcast header. Beneath it sits a distinct dark command deck with five chunky, controller-focusable arcade options, a gold selected state and a live mission briefing.
- **Character select:** a completely different layout built around a large Yusuke fighting poster, a detailed combat database on the right and a **horizontal eight-slot character strip** beneath. The select screen has a prominent launch bar and remains controller-first.
- **Real availability:** Arcade and Options are the live entries; Versus, Training and Spectator display SOON. Mission briefing is contextual and only Arcade shows the actual Demon Scout matchup.
- **Presentation:** original original background geometry and CSS effects, stronger high-contrast lime, teal, navy and gold style, fighter entrance animations, focus feedback, new status bars, modal styling and a responsive portrait / landscape layout.
- **Preserved mechanics:** all existing game screen IDs and character data hooks, the PS5 DualSense D-pad/stick, Cross/confirm and Circle/back behavior, fighting controls and combat engine.
- **Regression:** `node tests/neon-ui.cjs` now tests the new Rebirth screen structures and input hooks. GitHub Actions runs it alongside the gamepad, sprite, fighter engine and VFX suites. These automated checks do not replace physical iPhone/DualSense visual QA.

The fighter roster now includes **two selectable characters: Yusuke and Thorfinn**, with six slots remaining. Thorfinn's motion sprites now come from the player's five uploaded sheets; specialized dagger attack and super animations remain future work.

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
| Spirit Dash | E on keyboard / R1 on DualSense |
| Charge spirit energy | Hold I on keyboard / L2 on DualSense |
| MAX Spirit Gun | U on keyboard / R2 on DualSense (100 energy) |
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


## Yusuke sprite expansion: twelve additional poses (November 2026)

The playable Yusuke now loads `characters/yusuke/yusuke-combat-expansion.png` as an *additional*, separate 1536 × 768 transparent art atlas. The original 24-frame sheet and existing eight-frame Spirit Gun/Shotgun sheet are still present and serve as fallbacks. `characters/yusuke/yusuke.json` contains exact frame bounds and twelve animation definitions.

- **New sprite art:** ready step, straight cross, crouch brace, rising uppercut, spirit dash, low slide, rising knee, jumping side kick, high guard, stagger back, low recovery, and Spirit Gun charge.
- **Live presentation:** cross and body attacks, uppercuts, heavy strikes, aerial attacks, guard, hit reactions, spirit charging and forward dash use new art when available. Original special-projectile firing frames remain in use.
- **Unchanged mechanics:** attack hitboxes, damage, cooldowns, PS5/DualSense mapping, and enemy AI are not modified by this art pass.
- **Fail-safe loading:** if the extra image cannot load or its dimensions mismatch, the original sprites still render.
- **Tests:** `node tests/engine.cjs` and `node tests/yusuke-sprites.cjs` run in the new GitHub Actions regression workflow.

This game remains a custom browser fighter, not native MUGEN. To use individual PNGs in an actual MUGEN SFF, they must be imported as separately indexed frames.


## Visual overhaul v2 (November 2026)

The original reference video targets detailed 2D anime fighting with full-size characters and strong impact feedback. This pass works on the existing character artwork rather than adding fake smoothness through speed alone.

- **Fixed-step/render separation:** gameplay physics still runs at 60 Hz, but fighters and Spirit Gun projectiles now interpolate their positions when rendered at 90/120/144 Hz. This reduces high-refresh micro-stutter.
- **Animation transitions:** sprite frames are blended briefly near a frame boundary instead of snapping abruptly. Idle breathing, weight shifts, running lean, aerial tilt, and attack squash/stretch are visual-only and do not change hurtboxes.
- **Sprite-based opponent:** the CPU opponent now uses the sprite animation pipeline with a dark demonic palette treatment, replacing the old stick-like geometric fallback. It shares Yusuke pose art for now and is not a new independent character sheet.
- **Visual effects:** sprint/dash afterimages, layered radial hit sparks and shockwaves, smoother projectile streaks, charging wisps and a smoother decaying camera impulse.
- **Stage:** the Spirit Skyline rooftop has cached multi-depth city silhouettes, atmospheric lighting, perspective-tiled flooring and animated light/fog. Static geometry is drawn once per size to avoid repeatedly constructing all windows during every combat frame.
- **iPhone framing:** controller-driven fights rotate into a landscape-style arena on portrait iPhones instead of shrinking the entire 16:9 game to a tiny horizontal strip. The actual touch interface stays removed. Landscape devices use the largest available aspect-correct arena.

Run `node tests/visuals.cjs` for canvas-stub regression checks and `node tests/engine.cjs`, `node tests/yusuke-sprites.cjs` and `node tests/gamepad.cjs` for gameplay/art/controller checks. GitHub Actions runs all four automatically. These tests validate code behavior; screenshot comparisons and physical iPhone/PS5 controller performance still require browser/device QA.

The limited number of actual drawings in the sprite atlases remains the largest animation-quality ceiling. This work creates smoother in-betweens and transitions but does not claim to add hundreds of hand-drawn character frames or recreate the reference video frame-for-frame.

## Yusuke: expanded 30 FPS movement animation

Yusuke now builds **120 cached movement cels** at character load from the original 24-pose PNG atlas, tripling the previous generated movement-cel count. The temporary transparent canvas atlas is 2400 × 2880 with 240 × 240 tiles. It includes 30 idle, 30 running, 12 start, 12 stop, 12 jump-rise, 12 jump-fall, and 12 landing frames. These are **synthesized in-between sprites** using existing art (cross-dissolves, subtle foot-anchored lean and bounce), not 120 new hand-drawn poses.

Movement animation samples at **30 FPS (one cel per 33⅓ ms)** while keeping the 60 Hz fixed-step combat and physics simulation. The game renders position interpolation on each available display refresh. State changes still blend over 160 ms; existing attacks, Spirit Gun art, VFX, and DualSense inputs remain unchanged. The original sprite sheet is used when temporary canvas atlas generation fails.

Run `node tests/yusuke-motion.cjs` to check 30 FPS timing, 120 generated frame references, clip boundaries, transitions, and renderer wiring. GitHub Actions runs the test on push and pull requests. Pixel-level visuals and real-world frame-rate performance still require browser/device QA.

## NEW MUGEN RISING: neon arcade menus (November 2026)

Both the **main menu** and **character selection** have been rebuilt around an original lime-green, aqua-blue and orange arcade cabinet presentation inspired by classic 2D MUGEN-style menus.

- **Main menu:** giant NEW MUGEN RISING logo, rotating sci-fi rings, animated perspective grid, speed lines, Yusuke showcase, outlined blue welcome panel, oversized highlighted gold mode bars, and a live selected-mode description.
- **Accurate availability:** Arcade and Options are active. Versus, Training, and Spectator are visibly labeled **SOON**, not represented as playable modes.
- **Character select:** an entirely redesigned green/blue selection screen with a prominent Yusuke portrait, luminous fighter grid, eight slots (one playable and seven locked placeholders), extended fighter stats, technique controls, next-opponent banner and a gold action button.
- **Responsive presentation:** distinct desktop, phone portrait, and compact landscape layouts. No touch controls were added to fights; the DualSense menu navigation and all existing game DOM IDs remain.
- **Configuration:** the new styling lives in `neon-arcade-ui.css`. Main-menu and fighter-select markup resides in `game-build-0009.html` so the existing engine and controller scripts keep using the same IDs.
- **Checks:** `node tests/neon-ui.cjs` validates the menu screens, roster, labels, preserved controls and responsive styles. The GitHub Actions workflow also runs all existing combat, sprite, VFX, and PS5 control tests.

This is an original presentation, not a rip of the source game's logo or background artwork. It uses the existing Yusuke portrait from the repository. Locked roster cells are not newly playable fighters. Visual consistency and usability on a physical phone/controller still benefit from device QA.


## Yusuke appearance consistency update (13 November 2026)

The playable character now uses **one consistent design language across its sprite families**:

- The original 24-frame `sprites.png` is the base reference for proportions and palette; `yusuke-motion.js` derives its in-between movement cels from this same art.
- The 12 combat cels in `yusuke-combat-expansion.png` were rebuilt from one coherent source at a uniform source scale (0.72) and are drawn using the same game scale (1.1) as the base sprite sheet. Every pose has a crop and ground-anchored pivot in `yusuke.json`.
- The playable Spirit Gun and Spirit Shotgun now use the original, visually matching **17-frame** `spirit-gun-sprites.png` sequence. The older eight-pose `spirit-specials-v2.png` is retained as a legacy art reference but is no longer loaded or rendered.
- Shirt, skin, trousers, and wristband colors are checked against the 24-frame reference by `tests/yusuke-palette.cjs`; height, atlas dimensions, alpha type and frame bounds are checked by `tests/yusuke-sprites.cjs`.
- Animations may intentionally be shorter for crouching and taller with a raised arm or jumping. No attack changes Yusuke's character scale as an unintended effect. PS5 controller mappings, collisions, timing, HP, and combat balance are unchanged.

For verification run `node tests/engine.cjs`, `node tests/yusuke-sprites.cjs`, and `node tests/yusuke-palette.cjs` or view the GitHub Actions regression workflow.

## Fluid combat renderer v3 (November 2026)

The fighting experience has been reworked to address slideshow-like motion and mobile GPU stalls. This pass replaces the heavy 30-FPS ghost-frame generation pipeline with a lighter, render-time system while retaining all pre-existing 24 base, 12 combat, and 17 Spirit Gun poses.

### Runtime changes

- **60 Hz virtual animation sampling and per-render motion:** yusuke-motion.js selects the original hand-drawn key sprites on a 60 Hz timeline. mugen-fluid-v3.js procedurally shifts eight image bands around a stable foot pivot between source poses. This adds continuous body lean, breathing, running sway, recoil and attacks without re-rendering full ghost characters.
- **Performance:** no 2400×2880 cached alpha-blended animation atlas, no permanent GPU-hungry menu particle rendering behind fights, and no per-frame CPU hue-rotation filter. Enemy palette textures are generated once during character load. HUD text updates are capped near 15 Hz while health/energy bars remain visually smooth.
- **Fight camera:** smoothly eases between fighters, subtly zooms as they close distance, clamps to the stage boundaries, and integrates bounded hit shake.
- **Action feedback:** landing/acceleration dust, impact shockwaves, additional burst feedback and maintained projectile trails. Screen effects are bounded to avoid unlimited particle growth.
- **Fixed 60 Hz combat engine:** five-step per-frame catch-up limit avoids a simulation death spiral after Safari backgrounding. Inputs, hitboxes, PS5/DualSense mapping, blocking, combos and damage rules remain the same.
- **Tests:** run \`node tests/engine.cjs\`, \`node tests/yusuke-motion.cjs\` and \`node tests/fluid-v3.cjs\`. The GitHub Actions browser smoke suite uses Playwright to enter Arcade, fight, pause, shoot, restart, then check actual changing canvas pixels and camera easing.

**Art limitation:** The 60 Hz animation timeline is *not* 60 unique hand-drawn frames per second. These still use the original sprite poses with procedural in-between deformation. Fully new anatomy-correct frame-by-frame motions would require additional art authored pose-by-pose.

## Yusuke movement and idle cels: source-matched motion upgrade (13 November 2026)

The v4 motion layer adds **16 compact transparent sprite cels**, eight for idle/breathing and eight for walking/running. All pixels are taken from the canonical `characters/yusuke/sprites.png` sheet at **1:1 source resolution**, using subtle upper-body, shoulder and hair shifts while preserving the feet baseline, horizontal pivot, yellow-shirt/navy-trouser palette and the existing 1.1 in-game character scale. There are no alternate character drawings to drift in face, color or height.

The game generates these once into **one optional 1024 × 1024 RGBA atlas** (roughly 4 MiB of uncompressed pixels), instead of the retired 2400 × 2880 ghost atlas. Movement uses **228 samples on a 60 Hz timeline**: 72 idle, 60 focused-idle, 32 running, 12 acceleration, 12 braking, 14 jump-rise, 14 fall and 12 landing samples. These are timeline cels, not 228 individually hand-illustrated frames. Existing render-time body deformation fills gaps at the display refresh rate while 60 Hz combat simulation, hitboxes and PS5 controls stay untouched.

Idle now occasionally shifts into an attentive focus stance, running includes a compact acceleration and braking sequence, and jumping flows back into a planted landing. Sprite transitions remember both the previous frame **and its source texture**, including transitions back from attacks, so combat and movement art cannot accidentally blend against the wrong atlas. The canonical 24-frame sheet remains the fallback when a browser cannot allocate the supplementary canvas. The CPU's darker palette is cached once for the derived atlas as well.

To verify: `node tests/yusuke-motion.cjs` checks the derived frame count, 1024² budget, source-image pixel provenance, 256px pivots, 60 Hz timing, idle/running usage, cross-sheet transitions and low-memory fallback. Follow with the other GitHub Actions regression tests. Screenshot review and real PS5/iPhone performance still require device QA.

## Spirit Shotgun anime-reference VFX (November 2026)

The Spirit Shotgun now follows the user-supplied ~29-second anime clip as a **visual direction reference**. It does not embed video frames or third-party audio. The effect runs in the original 60 Hz canvas renderer through `mugen-shotgun-v4.js`:

- Yusuke braces, charges a blue-white Spirit Energy flash around his **clenched fist**, then releases an expanding cone of light.
- **40 cosmetic energy fragments** radiate in a broad fan, visually distinct from the narrow Spirit Gun beam.
- **7 collision pellets** remain the real hitboxes, with one registered hit per volley. The extra visual fragments never modify hit detection, energy, or damage.
- Confirmed hits generate **34 clustered, short-lived impact marks**, an expanding ring, and a blue energy burst inspired by the clip's peppered target-area effect.
- The color palette and existing sprite proportions remain consistent across Yusuke's charge and combat poses. Effects expire automatically after a fraction of a second to limit GPU/CPU work.
- **Controls stay intact:** Triangle uses Spirit Shotgun only when Spirit Energy is strictly above 50%, with the existing 30-energy cost. At 50% or lower, Triangle is the knockback Power Kick. The combo damage meter still activates only after three Square presses.

Checks: `node tests/shotgun-v4.cjs` covers windup, fan shape, visual-only pellet count, clustered impacts and cleanup; `node tests/browser-fluid.cjs` tests the render path and one-volley damage in Chromium. The extra effects do not create additional damaging hitboxes.

## Cinematic combat and Spirit Gun V5 (13 November 2026)

The fifth combat pass fixes three gameplay-readability problems: fighters merged into one silhouette, punches whiffed inside visually reachable range, and Spirit Gun occasionally crossed a target between physics updates without hitting.

- **Stage spacing:** grounded fighters maintain **142 px of horizontal center spacing**. Separation respects stage borders and lets airborne fighters pass over one another; this prevents unreadable stacked silhouettes.
- **Punch registration:** Square's jab, cross, body punch and uppercut use more forgiving *active frames* and range tuning, plus at most **25 px of active-frame contact assistance**. Assistance never teleports across the opponent or violates minimum spacing. The combo meter still unlocks only on the third Square press.
- **Camera:** at close range, framing returns to full stage width instead of cropping tighter. Confirmed heavy hits and Spirit Gun impacts get a brief, restrained focus. Camera shake remains bounded.
- **Spirit Gun:** Circle launches a single **non-piercing** blue-white shot. The beam now uses continuous **swept circle collision** against the target's hurtbox, resolves the first contact point, explodes and despawns on hit, and bursts at the arena walls. Even invulnerable targets stop the shot without taking damage.
- **New visual pass:** the existing 17 canonical Spirit Gun fighter poses are kept for color consistency. `mugen-spiritgun-v5.js` adds a fingertip orb and converging electric filaments during charge, a tapered cyan projectile with white core, a blue-white impact explosion, brief hit-stop, knockback and an unobtrusive screen tint. This is procedural VFX, not a new hand-drawn sprite atlas.
- **Balance:** Spirit Gun deals **78 base damage** (formerly 51), stronger knockback and a **0.46-second** hit stun. Shotgun's 50% Spirit rule, the Power Kick, and PS5/DualSense controls remain unchanged.
- **Source files:** `mugen-combat-v5.js` owns spacing, contact assistance and swept collision. `mugen-fluid-v3.js` owns camera behavior. `mugen-spiritgun-v5.js` owns energy VFX and short cinematic impact states.
- **Verification:** `node tests/cinematic-v5.cjs` covers contact geometry, borders, camera, swept collision, the on-hit blast and its lifecycle. Chromium browser tests verify a shot crossing a full hurtbox in one simulation step still hits, stops, explodes and deals damage once.

The original anime still image and video supplied by the user were **visual references** for Spirit Gun, not assets embedded in the game.

## Yusuke 40 FPS sprite reactions and impact VFX (13 November 2026)

The v5 motion layer adds **twelve supplemental transparent sprite cels** to the sixteen previously generated idle/run cels. The new set is divided into four light-hit **stagger** poses, four heavy **knockback/recoil** poses, and four **recovery** poses. They are synthesized from matching pixels in the original 24-frame Yusuke sheet with slight torso/head displacement and stable foot anchoring, not independently redrawn character anatomy. These poses use the same original colors, face, costume, pivots, and render scale as all other Yusuke animation families.

The game builds **28 derived cels** in a single optional **1024 × 1792 RGBA atlas** (about 7 MiB uncompressed). Animation sampling is now **40 frames per second** (25 ms per timeline sample), with **188 timeline samples** across idle, focus, run, accelerating, braking, jump-rise/fall, landing, stagger, knockback, and recovery. These samples do not represent 188 individually painted images. The combat engine remains on a fixed **60 Hz physics** step, and the canvas continues to render as often as the browser/display permits.

Unblocked light punches now select the stagger cel sequence. Heavy hits, powerful knockback and projectile hits choose the backward recoil sequence; landing or regaining control flows into recovery. This is visual selection layered on top of existing knockback velocity, launch physics, damage, hitstun and blocking rules. If the supplemental canvas fails to allocate, the renderer falls back to the original art.

The fluid VFX renderer also adds hit-direction **spark slashes**, compact **contact flashes**, a secondary ripple, airborne **recoil streaks**, and **floor skid marks** for fast knockback. Effects are cosmetic and expire in fractions of a second. Bounded arrays (88 slashes, 48 trails, 5 flashes) and the existing adaptive quality gate prevent unlimited particle accumulation. Spirit Shotgun's seven collision pellets and cosmetic fan remain mechanically unchanged. DualSense controls remain unchanged.

Run `node tests/yusuke-motion.cjs`, `node tests/fluid-v3.cjs` and `node tests/engine.cjs` to check frame counts/40 FPS timing, atlas limits, animation reaction assignment, impact effects, and physical stagger/launch. Automated checks cannot confirm subjective animation quality or actual PS5/iPhone frame rates; visual/device QA remains useful.


## High-detail Yusuke and wider rooftop V6 (13 November 2026)

The playable fighter now has two new **2048 × 1024 transparent pixel-art atlases** with 16 additional high-detail poses: eight movement/landing poses and eight punch/uppercut/Spirit Gun/kick poses. Both use the **same 0.5 in-game scale**, anchored foot pivots, dark navy pants, yellow sleeveless shirt, green wristbands and consistent hair/skin shading. The paired atlas metadata is in `characters/yusuke/premium-atlas.json`; the optional selector is `yusuke-premium-v6.js`.

A failed or partial atlas download falls back **as a pair** to the original graphics. This prevents a premium idle pose switching back to an unrelated hand-drawn attack style. All original art is preserved for rollback.

The fighting stage is now a scrollable **2,600 × 720 world**, compared with the previous 1,280-pixel width. The camera shows a 1,280-pixel viewport, follows the combatants, and clamps to world edges. `mugen-rooftop-v6.js` renders a layered moonlit skyline, dense building windows, rooftop beacons, tile reflections and a detailed metal floor from a single cached world image. Its viewport cropping reduces per-frame drawing work.

`mugen-cinematic-fx-v6.js` adds crisp, short-lived impact crescents, white-hot punch sparks and blue directional streaks without altering hitboxes. Spirit Gun and Shotgun continue using their separate nonpiercing collision and energy-VFX systems. The existing three-Square combo, Triangle Spirit Shotgun threshold, Power Kick, PS5 controller mappings and combat damage rules are retained.

Run `node tests/premium-v6.cjs`, `node tests/cinematic-fx-v6.cjs`, plus the normal engine and browser smoke tests to verify frame bounds, transparent PNG hashes, uniform sprite scale, stage caching, motion and impact effect lifetimes. Visual improvements are sourced from newly authored 2D artwork; this is **not** a claim that every action has 60 newly hand-drawn frames.

## Yusuke high-detail V7 sprite polish (November 2026)

The playable Yusuke now loads the paired color-matched sprites
`characters/yusuke/yusuke-premium-combat-v7.png` and
`characters/yusuke/yusuke-premium-movement-v7.png` (16 transparent,
2048×1024 atlas cels in total).

- **Consistent appearance:** yellow vest, skin, green cuffs, navy pants and dark outlines have a shared target palette. Stray red/magenta fringe pixels have been corrected without shrinking the transparent silhouettes.
- **Matching anatomy:** all 16 frames use the same draw scale (0.5) and foot-relative pivots. The two families load atomically: if either fails, the original Yusuke set remains the fallback.
- **No coordinate crossover:** the premium renderer never interpolates old sprite-frame coordinates on the high-detail images, preventing strange body-part flashes during attacks.
- **No segmented limbs:** authored premium poses render as a single full-body cel with restrained, pivot-based idle and running motion. The legacy low-res renderer retains its other deformation behavior.
- **Wider stage and camera:** the 2600-pixel-wide rooftop arena and responsive tracking camera remain available; combat spacing and hit-stop remain unchanged.
- **QA:** `node tests/premium-v6.cjs` validates the artwork and source selection; `node tests/fluid-v3.cjs` verifies that premium artwork is drawn without eight-strip slicing; Playwright's `tests/browser-fluid.cjs` checks that all key punch, kick and Spirit moves use the correct V7 PNGs during real browser gameplay.
- **Reproducibility:** `tools/polish-yusuke-v7.py` rebuilds the V7 PNGs from the original two art sheets without resizing their silhouette bounds.

These are **16 hand-authored pose sprites**, not 16 full independent animation sequences. Smoother high-frame-rate combat still benefits from adding genuine in-between drawings for every attack.

## Yusuke directional combat and aerial sprites (reference-video pass, 13 November 2026)

The reference is a vertical Jump Force MUGEN combat recording. Its useful animation cues are **retreat versus advance**, rush-in acceleration, airborne directional movement, fast punch chains, heavy knockback and visible follow-through. The update recreates the *combat language*, not the characters, flame artwork, timing of the original footage or audio.

The game loads the existing polished, matched **V7 premium 2D PNGs** first. `yusuke-directional-v8.js` then derives **24 additional transparent sprite cels** from those exact pixels at native pixel resolution, without introducing a second costume design or changing Yusuke's 0.5 premium rendering scale:

- **12 directional cels:** three advance, three retreat, two rush, forward/backward aerial direction, low guard and pivot recovery.
- **12 combat cels:** jab windup/contact, cross windup/contact, body strike, uppercut windup/release, air strike/kick, dash finisher, finishing impact and stagger.
- Horizontal facing continues to mirror correctly for both left- and right-facing characters. Forward/backward animation uses the sign of velocity relative to facing, rather than reusing the forward run art while retreating.
- **40 FPS** sprite-step sampling stays separate from the fixed **60 Hz** physics/collision engine. Animation clips have short state handoffs with texture-aware blending; changes do not reset the punch chain, damage or Spirit Energy rules.
- **Cosmetic** directional speed ribbons, quick chase streaks, and attack anticipation arcs support the kinetic feel without adding damaging hitboxes. They are computed at render time and create no accumulating particle pools.
- Each supplementary canvas is a **2048 × 1536 transparent atlas with twelve 512-pixel cells**. Both are generated once on character load and have a safe fallback to the original V7 premium art if the extra canvases are unavailable. Generated frames are *pixel-preserving derivatives*, not 24 independent hand-drawn anatomy passes.

**Get the usable sprite PNGs:** Open `yusuke-sprite-studio.html` from the same web server as the game. Preview each atlas, export the two transparent PNGs and export the JSON frame bounds/pivots. The fighter's original 16 premium cels and 28 legacy fallback cels are preserved. Native MUGEN SFF authoring still requires importing the PNGs as frames; this game remains its own browser engine.

**Verification:** `node tests/yusuke-directional-v8.cjs` checks atlas dimensions, 24 source-pixel cels, sprite pivots, forward/back direction, aerial and combo selections, and fallback. `node tests/browser-fluid.cjs` checks the generated sprites in real Chromium. Actual controller/phone performance and subjective art quality still benefit from real device review.


## Yusuke V8.1 reference-video follow-through: backdash, 32 cels and combat audio

This extension corrects the two input bugs that made backward movement look broken. Holding away from the opponent now **backwalks regardless of an approaching punch or projectile**; guarding is performed only by **L1 / down**, rather than silently auto-blocking a retreat. Hold away + **R1** to **backdash**; R1 with no direction dashes forward. The backdash commits to the input direction for its entire 0.17-second burst (815 world units per second), while the original forward burst remains 0.145 seconds at 1030 units per second. The 0.48-second dash cooldown, left/right facing, PS5 mapping, Square combo, and Triangle Spirit threshold remain intact. The keyboard equivalents are A/D + E.

The optional high-resolution Yusuke atlas has now expanded from 12+12 to **16 directional movement cels and 16 combat cels**, built from the matched **2048px V7 premium source drawings**. New action silhouettes cover fast backsteps, pivoting and landing, heavy windup/contact, defensive guard and recovery, in addition to forward/backward walking, directional aerial movement and jab/cross/uppercut/finisher sequences. Both optional supplemental atlases are **2048 × 2048 transparent RGBA**, rendered at the original 0.5 fighter scale, with fixed foot pivots and a clean fallback to the paired canonical V7 sheets if allocation fails. This produces additional edited/posed cels from existing art, **not 32 individually hand-illustrated character drawings**. Animation sample rate remains **40 FPS**; collision/physics runs at **60 Hz**.

New combat geometry helpers match the standing/crouched anatomy and punch heights more closely, while airborne characters use their actual world-height coordinates so a clean jump-over does not catch an invisible grounded wall. Confirmed blows keep the existing impact visuals, camera focus and hitstop. The directional visual layer adds timed strike arcs and rush ribbons; the integrated **original synthesized Web Audio cues** add small swing, heavy-hit, guard, dash, jump, landing, Spirit Gun, Spirit Shotgun and charge accents. They obey the existing Sound option and have cooldowns; no third-party audio files or looping music are used.

The sprite studio (yusuke-sprite-studio.html) exports the 16-frame movement PNG, 16-frame combat PNG and current frame-bound JSON for manual MUGEN sprite import. Run the engine, Triangle combo, directional animation, combat sound, cinematic and browser-fluid regression tests (the browser test requires Playwright and a local web server). Real PS5/phone performance and subjective sprite-art comparisons still need hands-on inspection.


## Sprite alpha, aerial crossing and authored VFX V8 (November 13, 2026)

This maintenance pass fixes bugs demonstrated in the screen recording rather than changing the character model or PS5 controller mappings:

- **White gaps/edges:** `tools/repair_yusuke_alpha_v8.py` removes near-white edge contamination, repairs larger interior white patches without destroying small eye glints, suppresses magenta fringe and clears nearly transparent noise. Both production PNGs are rebuilt as `yusuke-premium-combat-v8.png` and `yusuke-premium-movement-v8.png`, with hashes locked in `premium-atlas.json`. Original V7 files remain as rollback references.
- **Seam-free directional sprites:** `yusuke-directional-v8.js` no longer draws each pose as ten independent horizontal strips, which caused detached body parts and bright seams. The derived 32 movement/combat poses now preserve an intact original figure with a tiny whole-body shear around the same foot pivot.
- **Jump through and over opponents:** jump taps get a 160 ms buffer and take priority over auto-guard while retreating. Airborne pushboxes narrow during takeoff, preserve horizontal momentum and allow crossing once the feet clear the rival's shoulders. A crossover remains valid until the fighter lands, so the character is not snapped backwards while descending.
- **Attack boxes:** standing jab/cross, low body punch, uppercut and Power Kick use individual strike rectangles based on their actual sprite silhouettes. In particular, the uppercut reaches airborne targets and high jabs do not hit crouched opponents when the artwork misses.
- **VFX tied to real contact:** `mugen-vfx-v8.js` displays eight authored cyan-blue transparent texture effects for a fingertip charge, Spirit Gun shot, concentrated impact blast, Shotgun fan, punch spark, power slash, landing dust and energy ring. Effects are drawn at actual hit/projectile/landing coordinates and expire quickly. Older procedural bursts serve as fallbacks only if the asset cannot be loaded.
- **Performance & tests:** the 2,600-pixel stage, 60 Hz simulation and PS5 controller remain unchanged. The new effects texture is 1,536×1,024 PNG; the browser only paints active cels. `node tests/air-and-vfx-v8.cjs` verifies crossover geometry, high/low strike overlap and texture cropping; the Chromium play-through checks an actual directional jump over a stationary opponent, back-jump while threatened, high/low punch contact and live VFX loading.

**Visual fidelity:** this is a meaningful in-game VFX and sprite cleanup, but it does not turn the whole game into the static high-detail concept rendering, which would require additional hand-authored action frames and stage art.

## V9: turn-to-walk movement, clean Square combos and 5,000 HP

Yusuke now **turns to face the D-pad/stick direction while walking**, even if the opponent is behind him. Holding left while the opponent stands to his right turns him left and plays the normal left-facing locomotion, rather than endlessly backpedaling. Holding right reverses him symmetrically. R1 still performs a direction-latched dash without forcing a turn mid-burst, and the CPU continues tracking its opponent. Jump, dodge, guard and the existing DualSense layout remain unchanged.

Square punches remain fully damaging but are **visually clean at combo counts 1–4**. The combo HUD and damage multiplier still activate on the **third Square press**; the visual upgrade is distinct and unlocks at **displayed COMBO 5**. Until then, punch VFX producers are suppressed, including impact particles, screen shake, camera hit-focus, pose stroke arcs, cinematic crescents and the authored PNG strike effects. At COMBO 5 those visual feedback layers activate normally; specials, blocking reactions from other moves and the opponent's effects remain available. Shared policy: `mugen-combo-fx-v9.js`.

**Both fighters have 5,000 starting and maximum HP.** The HUD reports current/maximum HP and bars remain proportional. Yusuke's low-health Fighting Instinct passive activates at **1,500 HP** (the same 30% threshold as before). Existing base attack damage, energy costs, Spirit Shotgun threshold, Power Kick and combo scaling are preserved.

Regression coverage: `tests/triangle-combo.cjs` validates visually clean early Square hits and COMBO 5 activation. `tests/combat.cjs` exercises full five-hit VFX gating, reverse turning and 5,000 HP in Chromium, and `tests/engine.cjs` checks movement, dash and HP in fixed-step gameplay. The browser smoke suite matches the cache-busted game URL used by `index.html`.

## Yusuke V10: six-stage Square punch animation

The four Square-chain moves (jab, cross, body punch, uppercut) now each use **six
source-matched cels** instead of one or two holds. The 24 supplementary action
frames are a new optional **2048 x 3072 transparent Square atlas**, built at
character load from the cleaned premium Yusuke combat PNG. Combined with the
16 movement and 16 base combat variants, the runtime now supports **56 pose
cels**. These are distinct transformations of the existing premium drawings,
not independently hand-illustrated frames or new assets copied from a video.

Each move progresses through restrained anticipation, acceleration, active
contact and planted-foot recoil keyed to its actual attack duration (jab
0.19 s, cross 0.25 s, body 0.29 s, uppercut 0.39 s). Rendering samples at
40 FPS, with a small continuous momentum transformation between the staged
frames. Square lunges are reduced to a few pixels so the body does not slide
across the stage as if on skates; foot pivots, scale and existing hitboxes stay
unchanged. Guard, stagger, air attacks, Spirit Gun and Shotgun retain their
current mappings. COMBO 5 still gates normal punch VFX.

The `yusuke-sprite-studio.html` exports the added Square PNG as
`yusuke-directional-square-v10.png` alongside updated JSON frame metadata
(`yusuke-directional-v10-frames.json`). On a device that cannot allocate
the third texture, the game falls back to the existing 32-cel movement/combat
atlases rather than blocking the match.

Validation: `node tests/yusuke-square-v10.cjs`, `node
tests/yusuke-directional-v8.cjs`, and the Chromium browser smoke test.


## Yusuke V12: double the Square combat cels and smooth punch-to-punch transitions

**Jab, cross, body shot and uppercut now each have twelve source-derived keyed
poses instead of six** (48 Square cels versus 24 previously). Together with
16 movement and 16 other combat poses, the runtime can use 80 source-derived
cels. The Square sheet is an optional 4096 × 3072 transparent texture arranged
as 8 columns × 6 rows, using the same premium, alpha-cleaned palette and
single-piece sprite drawing as other Yusuke poses.

To make buffered Square presses transition naturally, every attack starts and
ends on the identical authentic movement-neutral source pose. Between those
endpoints, graded full-body windup, extension, recoil and reset shapes are
keyed by the real animation progress. Lightweight easing supplies continuous
single-body rotation, stretch and foot-anchor adjustment between keys, without
cross-fading two whole bodies or reintroducing white seam/outline artifacts.
The display-render interpolation fraction lets the short jab visit twelve
pose indices at a nominal 60 Hz, while regular movement sampling stays
**40 FPS** and simulation/hit detection remains at **60 Hz**. Low-refresh
displays may skip some short-lived images; the in-between deformation remains
continuous between render updates.

The visual system does not change combo damage, active attack windows, hitstop,
Square input buffering, directional movement, Spirit Gun/Shotgun, 5000 HP or
COMBO-5 effect gating. If a low-memory browser cannot allocate the optional
Square sheet, the 16 movement plus 16 combat fallback still runs.

The sprite studio exports `yusuke-directional-square-v12.png` plus
`yusuke-directional-v12-frames.json`, describing each of the twelve keys.
These are transformed existing high-detail source paintings, not 48
independently redrawn anime action frames. A further manually illustrated
in-between pass would be needed to match the reference video's full animation
quality.

Tests: `node tests/yusuke-square-v12.cjs`, the existing Square and directional
regression tests, and Chromium's `tests/browser-fluid.cjs` combat renderer.


## V13 combat revamp: uploaded 71-second MUGEN reference

After examining the uploaded side-view tournament clip, Yusuke now has an
**unbound six-move combat library** centered on the reference's key pacing:
close-range fire/energy exchanges (~5–15s), a dark-screen cinematic sequence
(~20–27s), rapid dash launches and aerial pursuits (~30–48s), and the closing
multi-hit barrage and K.O. (~52–65s). We use Yusuke's blue spirit-energy
language instead of copying the reference fighter's fire or character artwork.

Each move uses **eight new derived, complete premium-source cels**, totaling
48 optional cels (3072 × 4096 atlas) in addition to Yusuke's existing
movement, Square and combat poses. These are **one-piece transformed source
sprites, not 48 individually hand-painted illustrations**. The atlas is
alpha-cleaned, carries original pixel palette, and falls back to normal
Yusuke sprites on low-memory GPUs.

New Yusuke-specific moves (none bound to controls yet):

- `flashRush`: five rapid contact-checked dash strikes, with clear chase
  distance and directional speed trails
- `risingBreaker`: one heavy rising launcher, opening an air juggle
- `skyPursuit`: four aerial follow-up contacts, airborne only
- `spiritCyclone`: four close-range rotating spirit-assisted strikes
- `spiritVoid`: 65-energy cinematic that darkens the arena, builds blue
  energy and confirms **15 individual strikes** followed by a large finisher
- `meteorFinish`: a descending heavy strike with huge controlled knockback

The game resolves attack damage at authored fixed-step times and checks
direction, range and altitude on every contact. Rush movement stops before
overlapping the defender. The V8 authored sprite VFX handle contacts; no
random damage-generating particles are introduced. The 15-hit counter
reflects registered hits, not cosmetic effects. The new sequences do not
override Square combos, COMBO 5 restrictions, Triangle energy gating,
Spirit Gun, DualSense controls, Thorfinn, 5000 HP, or menu music.

**Move previews / controls pending:** open
`yusuke-attack-lab-v13.html` to see every animation and description.
During a running Yusuke fight, developers can preview a registered move
without binding any button using
`window.YusukeAttackLab.play("flashRush")`.
`window.YusukeAttackLab.moves()` lists available names.
Only the game's current buttons remain assigned until the creator decides
which controls each move should use. This is a reference-inspired cinematic
choreography pass, not a claim of frame-perfect reproduction of the
uploaded video.

Verification: `node tests/yusuke-reference-v13.cjs` and
`node tests/browser-reference-v13.cjs`, alongside existing Chromium and
combat regression workflows.
