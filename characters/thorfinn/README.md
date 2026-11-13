# Thorfinn fighter integration (first playable pass)

The new second roster fighter is **Thorfinn** (Vinland Saga). Open Arcade, then select Thorfinn using the mouse, keyboard left/right, or DualSense directional navigation, and confirm with Cross. Square chains dual-dagger attacks, Triangle performs a launching slash when focus is 50 or lower or Whirlwind Blades above 50, and Circle performs a close-range Dagger Lunge. R1 dash, L2 focus charge, guard, jump, and damage reactions use the existing battle engine.

## Artwork status

This commit includes a **temporary, original 24-cell SVG atlas** (960 × 960 with a 6 × 4 grid of 160 × 240 cells), drawn for testing the animation wiring. It is *not* the previously referenced high-resolution user sprite. That source file is not in the repository yet. The temporary SVG is not intended as final art.

To replace it, add the approved sprite sheet in this folder and update `spriteSheet.src`, `spriteSheet.width`, `spriteSheet.height`, `spriteSheet.frames` and `spriteSheet.animations` in `thorfinn.json`. Each frame uses `{x,y,w,h,ax}` with `ax` as the horizontal foot-alignment anchor. Keep frame rectangles inside the atlas. `spriteSheet.scale` controls rendered world size. The loader validates that dimensions and frame bounds match the image exactly, and disables the fighter if the art fails to load.

`portrait.svg` is likewise provisional and can be replaced by an approved portrait. Thorfinn currently reuses the generic fighter physics, hitstop and combo rules. He does **not** fire Yusuke's energy projectiles or use Yusuke's R2 super; Thorfinn-specific cinematic supers, fully authored VFX, and a finalized combat atlas remain future work. Yusuke remains available as the first roster fighter.

Run `node tests/thorfinn.cjs` for the metadata / integration checks. That test is not a replacement for controller and rendering checks in a real browser.
