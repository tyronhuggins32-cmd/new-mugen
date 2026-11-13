/* Yusuke motion v4: compact, source-derived animation cels.
 * Build sixteen genuinely distinct, foot-aligned raster poses from the
 * canonical 24-frame sheet, not a second differently colored drawing.
 * All derived pixels come from sprites.png; there is no recoloring or scaling.
 * One 1024x1024 optional atlas replaces the old huge ghost-frame cache.
 * A 60 Hz animation timeline and fluid rendering remain independent of physics.
 */
(function (root) {
  "use strict";

  const FPS = 60;
  const CELL = 256;
  const SOURCES = Object.freeze([0,1,2,3,2,1,0,1, 6,7,8,9,6,7,8,9]);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const specs = Object.freeze({
    idle:      Object.freeze({ keys: [24,25,26,27,28,29,30,31,30,29,27,25], count: 72, loop: true }),
    idleFocus: Object.freeze({ keys: [25,26,27,28,29,30,29,27], count: 60, loop: true }),
    run:       Object.freeze({ keys: [32,33,34,35,36,37,38,39], count: 32, loop: true }),
    walkStart: Object.freeze({ keys: [0,24,6,32,33], count: 12, loop: false }),
    walkStop:  Object.freeze({ keys: [36,39,8,6,24,0], count: 12, loop: false }),
    jumpRise:  Object.freeze({ keys: [0,18,19], count: 14, loop: false }),
    jumpFall:  Object.freeze({ keys: [19,18], count: 14, loop: false }),
    landing:   Object.freeze({ keys: [18,4,24,0], count: 12, loop: false })
  });

  function sampleKeys(spec, index) {
    const pos = spec.loop
      ? index / spec.count * spec.keys.length
      : index / Math.max(1, spec.count - 1) * (spec.keys.length - 1);
    const from = Math.floor(pos);
    const to = spec.loop ? (from + 1) % spec.keys.length : Math.min(spec.keys.length - 1, from + 1);
    return { from: spec.keys[from], to: spec.keys[to], mix: clamp(pos - from) };
  }

  // Make an actual compact transparent sprite atlas, keeping the original
  // artwork's 1:1 pixel size, costume colors, ankle baseline and center pivot.
  // Only upper-body strips move by one or two source pixels to create breaths,
  // shoulder settles, wind-up and recoil in between original hand-drawn poses.
  // Feet remain anchored, avoiding the 'growing/shrinking Yusuke' artifact.
  function createSupplement(image, sourceFrames) {
    if (typeof document === "undefined" || !document.createElement) return null;
    try {
      const sheet = document.createElement("canvas");
      sheet.width = CELL * 4;
      sheet.height = CELL * 4;
      const ctx = sheet.getContext("2d", { alpha: true });
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      const frames = [];
      for (let i = 0; i < SOURCES.length; i++) {
        const base = sourceFrames[SOURCES[i]];
        if (!base || base.h > CELL || base.ax > CELL / 2 ||
            base.w - base.ax > CELL / 2) return null;
        const left = (i % 4) * CELL, top = Math.floor(i / 4) * CELL;
        const x = left + CELL / 2 - base.ax, y = top + CELL - base.h;
        const stride = i >= 8 ? 1.5 : .8;
        const breathing = i >= 8 ? (i % 2 ? -2 : 2) : (i % 3 - 1);
        const shoulder = i >= 8 ? (i % 4 < 2 ? 2 : -2) : (i % 2 ? 1 : -1);
        const strips = 8;
        for (let part = 0; part < strips; part++) {
          const y0 = Math.floor(base.h * part / strips);
          const y1 = part === strips - 1 ? base.h : Math.floor(base.h * (part + 1) / strips);
          const normalized = (part + .5) / strips;
          const head = Math.pow(1 - normalized, 1.8);
          const torso = Math.sin(Math.PI * normalized);
          const offset = Math.round(breathing * head * stride + shoulder * torso);
          const lift = part < 4 && i < 8 && i % 2 ? 1 : 0;
          // One source-pixel overlap masks seams without averaging the palette.
          ctx.drawImage(image, base.x, base.y + y0, base.w, y1 - y0,
            x + offset, y + y0 - lift, base.w, y1 - y0 + (part === strips - 1 ? 0 : 1));
        }
        frames.push({ x: left, y: top, w: CELL, h: CELL, ax: CELL / 2 });
      }
      return { image: sheet, frames };
    } catch (_) {
      // Older browsers and low-memory devices keep the source sheet and timeline.
      return null;
    }
  }

  function createAtlas(image, sourceFrames, scale = 1.1) {
    if (!image?.naturalWidth || !Array.isArray(sourceFrames) || sourceFrames.length < 24) {
      throw new Error("Yusuke motion requires the original 24-frame character sheet.");
    }
    const derived = createSupplement(image, sourceFrames);
    const frames = derived ? sourceFrames.concat(derived.frames) : sourceFrames;
    const animations = Object.create(null);
    let count = 0;
    for (const [name, spec] of Object.entries(specs)) {
      const clipFrames = [];
      for (let index = 0; index < spec.count; index++) {
        const keys = sampleKeys(spec, index);
        const selected = keys.mix < .5 ? keys.from : keys.to;
        const mapped = !derived && selected >= 24 ? SOURCES[selected - 24] : selected;
        if (!frames[mapped]) throw new Error("Yusuke pose not found: " + name);
        clipFrames.push(mapped);
      }
      animations[name] = { frames: clipFrames, fps: FPS, loop: spec.loop };
      count += spec.count;
    }
    return { image, derivedImage: derived?.image || null, frames, sourceCount: sourceFrames.length,
      animations, fps: FPS, count, scale, generated: Boolean(derived),
      textureCount: derived ? 2 : 1, derivedFrameCount: derived ? SOURCES.length : 0 };
  }

  function frameAt(clip, seconds) {
    if (!clip?.frames?.length) return -1;
    const step = Math.max(0, Math.floor(Math.max(0, seconds) * (clip.fps || FPS) + .000001));
    return clip.frames[clip.loop ? step % clip.frames.length : Math.min(step, clip.frames.length - 1)];
  }

  function memoryFor(fighter) {
    return fighter._yusukeMotion || (fighter._yusukeMotion = {
      lastState: fighter.state, previousState: null, lastFrame: null,
      lastImage: null, transitionFrom: null, transitionImage: null
    });
  }

  // Store the actual drawn pose (including attacks) so attack/idle and
  // stop/idle handoffs use the previous image's correct palette and crop.
  function rememberPose(fighter, frame, image) {
    if (!fighter || !frame || !image) return;
    const memory = memoryFor(fighter);
    memory.lastFrame = frame;
    memory.lastImage = image;
  }

  function selectPose(fighter, atlas, eligible = true) {
    if (!fighter || !atlas) return null;
    const state = fighter.state;
    const memory = memoryFor(fighter);
    if (state !== memory.lastState) {
      memory.transitionFrom = memory.lastFrame;
      memory.transitionImage = memory.lastImage;
      memory.previousState = memory.lastState;
      memory.lastState = state;
    }
    if (!eligible) return null;

    const elapsed = Math.max(0, fighter.stateTime || 0);
    let name, clipTime = elapsed;
    if (!fighter.grounded || state === "jump") {
      name = fighter.vy < 0 ? "jumpRise" : "jumpFall";
    } else if (state === "walk") {
      name = elapsed < .2 ? "walkStart" : "run";
      if (name === "run") clipTime = elapsed - .2;
    } else if (state === "idle") {
      if (elapsed < .2 && memory.previousState === "walk") name = "walkStop";
      else if (elapsed < .2 && memory.previousState === "jump") name = "landing";
      else if (elapsed > 2.4 && (elapsed - 2.4) % 5 < 1) {
        name = "idleFocus";
        clipTime = (elapsed - 2.4) % 5;
      } else name = "idle";
    } else {
      return null;
    }
    const animation = atlas.animations[name];
    const index = frameAt(animation, clipTime);
    const frame = atlas.frames[index];
    const image = index >= atlas.sourceCount && atlas.derivedImage ? atlas.derivedImage : atlas.image;
    const transitioning = elapsed < .08 && memory.transitionFrom && memory.previousState !== state;
    if (frame) rememberPose(fighter, frame, image);
    return frame ? { frame, frames: atlas.frames, animation, image, index,
      clip: name, scale: atlas.scale,
      transitionFrame: transitioning ? memory.transitionFrom : null,
      transitionImage: transitioning ? memory.transitionImage : null,
      transitionMix: transitioning ? clamp(elapsed / .08) : 1 } : null;
  }

  root.MugenMotion = Object.freeze({
    fps: FPS, clips: specs, sources: SOURCES,
    sampleKeys, frameAt, createAtlas, selectPose, rememberPose
  });
})(typeof window === "undefined" ? globalThis : window);
