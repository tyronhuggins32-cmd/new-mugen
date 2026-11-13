/* Yusuke kinetic animation v3.
 * The old system created 120 ghost-composited frames on a 2400x2880 canvas.
 * This system samples original, color-consistent art on a 60 Hz timeline.
 * Real in-between motion comes from MugenFluid's per-render deformation,
 * not semi-transparent duplicates or enormous prerendered atlases.
 */
(function (root) {
  "use strict";

  const FPS = 60;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const specs = Object.freeze({
    idle:      Object.freeze({ keys: [0,1,2,3,2,1], count: 54, loop: true }),
    run:       Object.freeze({ keys: [6,7,8,9], count: 28, loop: true }),
    walkStart: Object.freeze({ keys: [0,6,7], count: 8, loop: false }),
    walkStop:  Object.freeze({ keys: [8,6,0], count: 9, loop: false }),
    jumpRise:  Object.freeze({ keys: [0,18,19], count: 12, loop: false }),
    jumpFall:  Object.freeze({ keys: [19,18], count: 12, loop: false }),
    landing:   Object.freeze({ keys: [18,4,0], count: 10, loop: false })
  });

  function sampleKeys(spec, index) {
    const pos = spec.loop
      ? index / spec.count * spec.keys.length
      : index / Math.max(1, spec.count - 1) * (spec.keys.length - 1);
    const from = Math.floor(pos);
    const to = spec.loop ? (from + 1) % spec.keys.length : Math.min(spec.keys.length - 1, from + 1);
    const mix = clamp(pos - from);
    return { from: spec.keys[from], to: spec.keys[to], mix };
  }

  function createAtlas(image, sourceFrames, scale = 1.1) {
    if (!image?.naturalWidth || !Array.isArray(sourceFrames) || sourceFrames.length < 24) {
      throw new Error("Yusuke motion requires the original 24-frame character sheet.");
    }
    let count = 0;
    const animations = Object.create(null);
    for (const [name, spec] of Object.entries(specs)) {
      const frames = [];
      for (let index = 0; index < spec.count; index++) {
        const keys = sampleKeys(spec, index);
        const selected = keys.mix < .5 ? keys.from : keys.to;
        if (!sourceFrames[selected]) throw new Error("Yusuke pose not found: " + name);
        frames.push(selected);
      }
      animations[name] = { frames, fps: FPS, loop: spec.loop };
      count += spec.count;
    }
    return { image, frames: sourceFrames, animations, fps: FPS, count, scale,
      // No offscreen atlas allocations and no alpha-overlaid false inbetweens.
      generated: false, textureCount: 1 };
  }

  function frameAt(clip, seconds) {
    if (!clip?.frames?.length) return -1;
    const step = Math.max(0, Math.floor(Math.max(0, seconds) * FPS + .000001));
    return clip.frames[clip.loop ? step % clip.frames.length : Math.min(step, clip.frames.length - 1)];
  }

  function selectPose(fighter, atlas, eligible = true) {
    if (!fighter || !atlas) return null;
    const state = fighter.state;
    const memory = fighter._yusukeMotion || (fighter._yusukeMotion = {
      lastState: state, previousState: null, lastFrame: null, lastImage: null
    });
    if (state !== memory.lastState) {
      memory.transitionFrom = memory.lastFrame;
      memory.previousState = memory.lastState;
      memory.lastState = state;
    }
    if (!eligible) return null;

    const elapsed = Math.max(0, fighter.stateTime || 0);
    let name, clipTime = elapsed;
    if (!fighter.grounded || state === "jump") {
      name = fighter.vy < 0 ? "jumpRise" : "jumpFall";
    } else if (state === "walk") {
      name = elapsed < .133 ? "walkStart" : "run";
      if (name === "run") clipTime = elapsed - .133;
    } else if (state === "idle") {
      if (elapsed < .15 && memory.previousState === "walk") name = "walkStop";
      else if (elapsed < .166 && memory.previousState === "jump") name = "landing";
      else name = "idle";
    } else {
      return null;
    }
    const animation = atlas.animations[name];
    const index = frameAt(animation, clipTime);
    const frame = atlas.frames[index];
    const transitioning = elapsed < .067 && memory.transitionFrom
      && ["idle","walk","jump"].includes(memory.previousState);
    if (frame) memory.lastFrame = frame;
    return frame ? { frame, frames: atlas.frames, animation, image: atlas.image,
      index, clip: name, scale: atlas.scale,
      transitionFrame: transitioning ? memory.transitionFrom : null,
      transitionMix: transitioning ? elapsed / .067 : 1 } : null;
  }

  root.MugenMotion = Object.freeze({
    fps: FPS, clips: specs, sampleKeys, frameAt, createAtlas, selectPose
  });
})(typeof window === "undefined" ? globalThis : window);
