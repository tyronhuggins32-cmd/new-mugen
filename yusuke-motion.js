/* Yusuke motion v5: 40 FPS animation clips, source-accurate reaction cels.
 * Twenty-eight supplemental transparent cels (16 existing idle/run plus
 * 12 stagger/knockback/recovery) are drawn using only canonical source pixels.
 * No new palette, no rescaled anatomy, and no 60Hz combat/physics changes.
 * Render-time deformation remains independent from the animation sampling.
 */
(function (root) {
  "use strict";

  const FPS = 40;
  const CELL = 256;
  // 8 idle + 8 run + 4 stagger + 4 knockback + 4 recovery.
  // This preserves the existing sixteen cels at the same indices (24..39).
  const SOURCES = Object.freeze([
    0,1,2,3,2,1,0,1, 6,7,8,9,6,7,8,9,
    21,10,17,12, 21,16,14,15, 5,4,13,0
  ]);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const specs = Object.freeze({
    idle:      Object.freeze({ keys: [24,25,26,27,28,29,30,31,30,29,27,25], count: 48, loop: true }),
    idleFocus: Object.freeze({ keys: [25,26,27,28,29,30,29,27], count: 40, loop: true }),
    run:       Object.freeze({ keys: [32,33,34,35,36,37,38,39], count: 24, loop: true }),
    walkStart: Object.freeze({ keys: [0,24,6,32,33], count: 8, loop: false }),
    walkStop:  Object.freeze({ keys: [36,39,8,6,24,0], count: 8, loop: false }),
    jumpRise:  Object.freeze({ keys: [0,18,19], count: 10, loop: false }),
    jumpFall:  Object.freeze({ keys: [19,18], count: 10, loop: false }),
    landing:   Object.freeze({ keys: [18,4,24,0], count: 8, loop: false }),
    stagger:   Object.freeze({ keys: [40,41,42,43,41,40], count: 9, loop: false }),
    knockback: Object.freeze({ keys: [44,45,46,47,47], count: 14, loop: false }),
    recovery:  Object.freeze({ keys: [48,49,50,51,24,0], count: 9, loop: false })
  });

  function sampleKeys(spec, index) {
    const pos = spec.loop
      ? index / spec.count * spec.keys.length
      : index / Math.max(1, spec.count - 1) * (spec.keys.length - 1);
    const from = Math.floor(pos);
    const to = spec.loop ? (from + 1) % spec.keys.length : Math.min(spec.keys.length - 1, from + 1);
    return { from: spec.keys[from], to: spec.keys[to], mix: clamp(pos - from) };
  }

  // Composite a compact 4x7 RGBA atlas using source image pixels, preserving
  // the original costume, face, alpha, pivot and 1:1 drawing scale. The extra
  // twelve cels add distinct recoil silhouettes, not duplicate transparent
  // ghosts. The final strip (feet) is always planted on the same baseline.
  function createSupplement(image, sourceFrames) {
    if (typeof document === "undefined" || !document.createElement) return null;
    try {
      const sheet = document.createElement("canvas");
      sheet.width = CELL * 4;
      sheet.height = CELL * 7;
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
        const reaction = i >= 16 && i < 24;
        const recovery = i >= 24;
        const stride = reaction ? 0 : i >= 8 && !recovery ? 1.5 : .8;
        const breathing = i >= 8 && i < 16 ? (i % 2 ? -2 : 2) : (i % 3 - 1);
        const shoulder = i >= 8 && i < 16 ? (i % 4 < 2 ? 2 : -2) : (i % 2 ? 1 : -1);
        // Recoil silhouette leans away from the opponent, with feet fixed.
        // Amount is varied by hit phase; recovery gradually unwinds.
        const recoil = i < 16 ? 0 : reaction ? -4 - ((i - 16) % 4) * (i >= 20 ? 4 : 2)
          : 5 - (i - 24) * 2;
        const strips = 8;
        for (let part = 0; part < strips; part++) {
          const y0 = Math.floor(base.h * part / strips);
          const y1 = part === strips - 1 ? base.h : Math.floor(base.h * (part + 1) / strips);
          const normalized = (part + .5) / strips;
          const head = Math.pow(1 - normalized, 1.8);
          const torso = Math.sin(Math.PI * normalized);
          const offset = Math.round(breathing * head * stride + shoulder * torso +
            recoil * (head * .8 + torso * .5));
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
    if (!(image?.naturalWidth || image?.width) || !Array.isArray(sourceFrames) || sourceFrames.length < 24) {
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
    // A hit reaction takes priority over aerial poses. Strong hits cause
    // visible backward recoil even when they launch Yusuke into the air.
    if (state === "hit") {
      name = fighter.hitReaction === "knockback" ? "knockback" : "stagger";
    } else if (!fighter.grounded || state === "jump") {
      name = fighter.vy < 0 ? "jumpRise" : "jumpFall";
    } else if (state === "walk") {
      name = elapsed < .2 ? "walkStart" : "run";
      if (name === "run") clipTime = elapsed - .2;
    } else if (state === "idle") {
      if (elapsed < .2 && memory.previousState === "hit") name = "recovery";
      else if (elapsed < .2 && memory.previousState === "walk") name = "walkStop";
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
