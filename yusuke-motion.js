/* New Mugen: cached 10 FPS Yusuke movement sprite expansion.
 * Uses the original transparent artwork to synthesize extra, foot-aligned
 * in-between cels once at load time. Game physics remains at 60 Hz.
 */
(function (root) {
  "use strict";

  const FPS = 10;
  const CELL = 240;
  const COLUMNS = 10;
  const SPECS = Object.freeze({
    idle:      { keys: [0, 1, 2, 3, 2, 1], count: 10, loop: true },
    run:       { keys: [6, 7, 8, 9],       count: 10, loop: true },
    walkStart: { keys: [0, 0, 6],          count: 4, loop: false },
    walkStop:  { keys: [6, 6, 0],          count: 4, loop: false },
    jumpRise:  { keys: [0, 18, 19],        count: 4, loop: false },
    jumpFall:  { keys: [19, 18],           count: 4, loop: false },
    landing:   { keys: [18, 0, 1],         count: 4, loop: false }
  });

  function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(hi, value));
  }

  function sampleKeys(spec, index) {
    const progress = spec.loop
      ? index / spec.count * spec.keys.length
      : index / Math.max(1, spec.count - 1) * (spec.keys.length - 1);
    const a = Math.floor(progress);
    const b = spec.loop ? (a + 1) % spec.keys.length : Math.min(a + 1, spec.keys.length - 1);
    const fraction = clamp(progress - a, 0, 1);
    const eased = fraction * fraction * (3 - 2 * fraction);
    return { from: spec.keys[a], to: spec.keys[b], mix: eased };
  }

  function createAtlas(image, sourceFrames, scale = 1.1) {
    if (!image || !image.naturalWidth || !Array.isArray(sourceFrames) || sourceFrames.length < 24) {
      throw new Error("Yusuke movement expansion requires the loaded 24-pose base sheet.");
    }
    const count = Object.values(SPECS).reduce((sum, spec) => sum + spec.count, 0);
    const canvas = document.createElement("canvas");
    canvas.width = COLUMNS * CELL;
    canvas.height = Math.ceil(count / COLUMNS) * CELL;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2D sprite atlas context unavailable.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const atlasFrames = [];
    const animations = Object.create(null);
    let cursor = 0;
    for (const [name, spec] of Object.entries(SPECS)) {
      const clipFrames = [];
      for (let i = 0; i < spec.count; i += 1) {
        const column = cursor % COLUMNS;
        const row = Math.floor(cursor / COLUMNS);
        const tileX = column * CELL;
        const tileY = row * CELL;
        const key = sampleKeys(spec, i);
        const frameA = sourceFrames[key.from];
        const frameB = sourceFrames[key.to];
        if (!frameA || !frameB) throw new Error("Missing source pose for " + name);
        const localPhase = i / Math.max(1, spec.count);
        const bob = name === "run" ? -2 * Math.abs(Math.sin(localPhase * Math.PI * 4))
                  : name === "idle" ? -1.2 * Math.sin(localPhase * Math.PI * 2) : 0;
        const lean = name === "run" ? Math.sin(localPhase * Math.PI * 4) * 0.018 : 0;

        ctx.save();
        ctx.beginPath();
        ctx.rect(tileX, tileY, CELL, CELL);
        ctx.clip();
        ctx.translate(tileX + CELL / 2, tileY + CELL + bob);
        // Pivot at the planted foot instead of scaling around the center.
        ctx.transform(1, 0, lean, 1, 0, 0);
        function stamp(frame, opacity) {
          ctx.globalAlpha = opacity;
          ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h,
            -frame.ax, -frame.h, frame.w, frame.h);
        }
        stamp(frameA, 1 - key.mix);
        if (key.mix > 0.0001 && frameB !== frameA) stamp(frameB, key.mix);
        ctx.restore();
        const atlasIndex = atlasFrames.length;
        atlasFrames.push({ x: tileX, y: tileY, w: CELL, h: CELL, ax: CELL / 2 });
        clipFrames.push(atlasIndex);
        cursor += 1;
      }
      animations[name] = { frames: clipFrames, fps: FPS, loop: spec.loop };
    }
    return { image: canvas, frames: atlasFrames, animations, scale, fps: FPS, count };
  }

  function frameAt(clip, seconds) {
    if (!clip || !clip.frames.length) return -1;
    const step = Math.max(0, Math.floor(Math.max(0, seconds) * FPS + 0.000001));
    return clip.frames[clip.loop ? step % clip.frames.length : Math.min(step, clip.frames.length - 1)];
  }

  // Called on every render so attacks and hitstun cannot leave stale walk state.
  function selectPose(fighter, atlas, eligible = true) {
    if (!atlas || !fighter) return null;
    const state = fighter.state;
    const memory = fighter._yusukeMotion || (fighter._yusukeMotion = {
      lastState: state, previousState: null
    });
    if (state !== memory.lastState) {
      memory.transitionFrom = memory.lastFrame || null;
      memory.previousState = memory.lastState;
      memory.lastState = state;
    }
    if (!eligible) return null;

    const elapsed = Math.max(0, fighter.stateTime || 0);
    let name, clipTime = elapsed;
    if (!fighter.grounded || state === "jump") {
      name = fighter.vy < 0 ? "jumpRise" : "jumpFall";
    } else if (state === "walk") {
      // First 0.4 seconds are dedicated acceleration cels.
      name = elapsed < 0.4 ? "walkStart" : "run";
      if (name === "run") clipTime = elapsed - 0.4;
    } else if (state === "idle") {
      if (elapsed < 0.4 && memory.previousState === "walk") {
        name = "walkStop";
      } else if (elapsed < 0.4 && memory.previousState === "jump") {
        name = "landing";
      } else {
        name = "idle";
      }
    } else {
      return null;
    }
    const animation = atlas.animations[name];
    const index = frameAt(animation, clipTime);
    const frame = atlas.frames[index];
    const transitionFrame = ["idle", "walk", "jump"].includes(memory.previousState)
      && elapsed < 0.16 ? memory.transitionFrom : null;
    const transitionMix = Math.min(1, elapsed / 0.16);
    if (frame) memory.lastFrame = frame;
    return frame ? { frame, frames: atlas.frames, animation, scale: atlas.scale,
      image: atlas.image, generated: true, clip: name, index,
      transitionFrame, transitionMix } : null;
  }

  root.MugenMotion = Object.freeze({ fps: FPS, clips: SPECS, sampleKeys, frameAt, createAtlas, selectPose });
})(typeof window === "undefined" ? globalThis : window);
