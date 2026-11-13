/* New Mugen Fluid Motion v3.2.
 * 60Hz physics and continuous render-time pose deformation, plus new
 * directional sparks, flash cores, recoil streaks and grounded skid trails.
 * Effects are pooled/bounded and respect the existing adaptive quality gate.
 */
(function (root) {
  "use strict";

  const TAU = Math.PI * 2;
  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
  const tintCache = new WeakMap();
  const trackers = new WeakMap();
  let nextId = 0;

  function tintForCpu(image, cpu) {
    if (!cpu || !image || !image.width || typeof document === "undefined") return image;
    if (tintCache.has(image)) return tintCache.get(image);
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return image;
    context.imageSmoothingEnabled = false;
    context.filter = "hue-rotate(190deg) saturate(1.6) brightness(.72) contrast(1.1)";
    context.drawImage(image, 0, 0);
    context.filter = "none";
    tintCache.set(image, canvas);
    return canvas;
  }

  function bend(fighter, time) {
    const state = fighter.state || "idle";
    const speed = clamp(Math.abs(fighter.vx || 0) / 520);
    const t = Number(fighter.stateTime) || 0;
    const dir = Math.sign((fighter.vx || 0) * (fighter.facing || 1)) || 1;
    const attack = fighter.currentAttack?.();
    const attackDuration = attack === "gun" || attack === "shotgun" ? .58 : attack === "heavy" ? .33 : .25;
    const progress = clamp(t / attackDuration);
    let lean = 0, sway = 0, recoil = 0, rise = 0;

    if (state === "walk") {
      // Animate hips and upper torso between hand-drawn key poses; planted shoes stay still.
      const phase = t * (13 + speed * 5);
      sway = Math.sin(phase) * (3.0 + 3.2 * speed);
      lean = speed * 5.5 * dir;
      rise = Math.abs(Math.sin(phase)) * 1.9;
    } else if (state === "idle" || state === "charge") {
      sway = Math.sin(time * .003 + (fighter.cpu ? 1.7 : 0)) * 1.7;
      rise = Math.sin(time * .004) * 1.1;
    } else if (state === "jump" || !fighter.grounded) {
      lean = clamp((fighter.vx || 0) / 670, -1, 1) * 4;
      sway = Math.sin(t * 10) * 1.3;
    } else if (state === "hit") {
      const violent = fighter.hitReaction === "knockback";
      recoil = -Math.exp(-t * (violent ? 4.5 : 7)) * (violent ? 15 : 8);
      sway = violent ? Math.sin(t * 21) * 3.3 : Math.sin(t * 16) * 1.5;
      rise = Math.sin(t * 16) * (violent ? 2.4 : 1.5);
    }
    if (attack) {
      const impulse = Math.sin(progress * Math.PI);
      lean += impulse * (attack === "heavy" || attack === "upper" ? 9 : 5);
      recoil += attack === "gun" || attack === "shotgun" ? -Math.sin(progress * Math.PI) * 3 : 0;
    }
    return { lean, sway, recoil, rise };
  }

  // Artwork remains anchored to its original foot pivot and preserves pixel colors.
  // Source slice rows deform the existing pose instead of changing the character's size.
  function drawCel(ctx, image, frame, dx, dy, dw, dh, fighter, time, ghost = false) {
    if (!image || !frame || !fighter || frame.w <= 0 || frame.h <= 0) return false;
    if (ghost || Math.abs(dw) < 20 || Math.abs(dh) < 20) {
      ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, dx, dy, dw, dh);
      return true;
    }
    const pose = bend(fighter, time);
    // By slicing equally in source space, seams remain pixel-aligned; the feet
    // (bottom slice) never inherit head recoil or torso sway.
    const strips = 8;
    for (let i = 0; i < strips; i++) {
      const y0 = Math.floor(frame.h * i / strips);
      const y1 = i === strips - 1 ? frame.h : Math.floor(frame.h * (i + 1) / strips);
      const t = (i + .5) / strips;
      const flex = Math.sin(Math.PI * (1 - t) * .87);
      const upper = Math.pow(1 - t, 1.9);
      const shift = pose.lean * flex + pose.sway * upper + pose.recoil * (1 - t);
      const lift = pose.rise * upper;
      const y = dy + (y0 / frame.h) * dh - lift;
      const h = (y1 - y0) / frame.h * dh + .4;
      ctx.drawImage(image, frame.x, frame.y + y0, frame.w, y1 - y0,
        dx + shift, y, dw, h);
    }
    return true;
  }

  function getTracker(game) {
    let data = trackers.get(game);
    if (!data) {
      data = { camera: { x: 640, y: 360, zoom: 1, last: 0 },
        dust: [], rings: [], slashes: [], flashes: [], trails: [],
        tick: 0, slowFrames: 0, quality: 1 };
      trackers.set(game, data);
    }
    return data;
  }

  function reset(game) {
    trackers.delete(game);
  }

  // Screen-space camera follows the action smoothly, never revealing outside the stage.
  function beginFrame(game, ctx, time, arena) {
    if (!game?.player || !game?.cpu || !arena) return;
    const t = getTracker(game);
    const c = t.camera;
    const dt = c.last ? clamp((time - c.last) / 1000, 0, .06) : 1 / 60;
    c.last = time;
    const midpoint = ((game.player.prevX ?? game.player.x) + game.player.x +
      (game.cpu.prevX ?? game.cpu.x) + game.cpu.x) * .25;
    const distance = Math.abs(game.player.x - game.cpu.x);
    const desiredZoom = 1 + .095 * (1 - clamp((distance - 140) / 650));
    const rate = 1 - Math.exp(-dt * 5.4);
    c.zoom = lerp(c.zoom, desiredZoom, rate);
    const halfWidth = arena.width / (2 * c.zoom);
    const targetX = clamp(midpoint, halfWidth, arena.width - halfWidth);
    c.x = lerp(c.x || targetX, targetX, rate);
    const jitter = Math.min(10, game.shake || 0);
    const shiftX = Math.sin(time * .077) * jitter * .37;
    const shiftY = Math.cos(time * .095) * jitter * .25;
    ctx.translate(arena.width / 2 + shiftX, arena.height / 2 + shiftY);
    ctx.scale(c.zoom, c.zoom);
    ctx.translate(-c.x, -arena.height / 2);
    // Adaptive expensive effects, based on a smoothed frame-budget counter.
    t.slowFrames = dt > .034 ? Math.min(40, t.slowFrames + 2) : Math.max(0, t.slowFrames - 1);
    t.quality = t.slowFrames > 24 ? .45 : 1;
  }

  function dust(game, x, y, direction, amount = 3, tint = "188,219,225") {
    const t = getTracker(game);
    for (let i = 0; i < amount; i++) {
      const variation = (i * 17 + nextId++ * 7) % 19 - 9;
      t.dust.push({
        x: x + variation * 1.4, y: y - i % 3, vx: -direction * (27 + i * 19),
        vy: -24 - (i % 4) * 19, life: .22 + i * .025,
        maxLife: .22 + i * .025, radius: 2 + i % 3, tint
      });
    }
    if (t.dust.length > 70) t.dust.splice(0, t.dust.length - 70);
  }

  function onHit(game, attacker, defender, blocked, heavy, x, y) {
    if (!game) return;
    const t = getTracker(game);
    const power = blocked ? .6 : heavy ? 1.4 : 1;
    const px = Number.isFinite(x) ? x : defender?.x || 0;
    const py = Number.isFinite(y) ? y : (defender?.y || 0) - 120;
    const direction = Math.sign(attacker?.facing || 1);
    const red = Boolean(attacker?.cpu);
    t.rings.push({ x:px, y:py, time:0, life:.28 * power,
      maxLife:.28 * power, power, blocked, red });
    if (t.rings.length > 12) t.rings.shift();
    t.flashes.push({ x:px, y:py, life:blocked ? .11 : .17,
      maxLife:blocked ? .11 : .17, power, blocked, red });
    if (t.flashes.length > 5) t.flashes.splice(0,t.flashes.length-5);

    // Angular spark blades travel in the direction of impact, not a
    // symmetrical spray that hides the defender. No additional hitboxes.
    const count = blocked ? 3 : heavy ? 12 : 7;
    for(let i=0;i<count;i++) {
      const phase = (i + .45) * TAU / count;
      const angle = Math.sin(phase) * (heavy ? .9 : 1.05);
      const speed = (heavy ? 220 : 155) + (i % 4) * 46;
      const life = .13 + (i % 4) * .045;
      t.slashes.push({ x:px, y:py, vx:Math.cos(angle)*direction*speed,
        vy:Math.sin(angle)*speed*.8, life, maxLife:life,
        angle, length:blocked ? 15 : heavy ? 38 : 25,
        width:heavy ? 4 : 2.5, blocked, red });
    }
    if (t.slashes.length > 88) t.slashes.splice(0,t.slashes.length-88);
    if (!blocked && defender) dust(game, defender.x, defender.y, direction, heavy ? 9 : 4);
  }

  function tick(game, dt) {
    if (!game || game.state !== "play" || game.paused) return;
    const t = getTracker(game);
    for (const particle of t.dust) {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt;
      particle.vy += 280 * dt; particle.life -= dt;
    }
    t.dust = t.dust.filter(p => p.life > 0);
    for (const ring of t.rings) { ring.time += dt; ring.life -= dt; }
    t.rings = t.rings.filter(r => r.life > 0);
    for (const f of t.flashes) f.life -= dt;
    t.flashes = t.flashes.filter(f => f.life > 0);
    for (const slash of t.slashes) {
      slash.x += slash.vx * dt;
      slash.y += slash.vy * dt;
      slash.vx *= Math.max(0, 1 - dt * 5);
      slash.vy += 150 * dt;
      slash.life -= dt;
    }
    t.slashes = t.slashes.filter(s => s.life > 0);
    for (const trail of t.trails) trail.life -= dt;
    t.trails = t.trails.filter(p => p.life > 0);
    for (const f of [game.player, game.cpu]) {
      if (!f) continue;
      const memo = f._fluidState || (f._fluidState = {
        grounded: f.grounded, state: f.state, x: f.x, timer: 0, hitTrailTime: 0
      });
      memo.timer += dt;
      memo.hitTrailTime = (memo.hitTrailTime || 0) + dt;
      const landed = f.grounded && !memo.grounded;
      const dashed = f.dashTimer > 0 && memo.state !== "walk";
      if (landed) dust(game, f.x, f.y, f.facing, 10);
      if (dashed) dust(game, f.x, f.y, f.facing, 8);
      if (f.grounded && f.state === "walk" && Math.abs(f.vx) > 170 && memo.timer >= .095) {
        dust(game, f.x - f.facing * 20, f.y, f.facing, 2);
        memo.timer = 0;
      }
      // A knockback fighter leaves speed streaks in air and a friction
      // scrape on the floor. Throttle creation to avoid particle spam.
      if (f.state === "hit" && Math.abs(f.vx) > 160 && memo.hitTrailTime >= .045) {
        const direction = Math.sign(f.vx);
        const grounded = f.grounded;
        t.trails.push({ x:f.x - direction * 24,
          y:f.y - (grounded ? 7 : 95), direction,
          length:clamp(Math.abs(f.vx) * .13, 25, 100),
          grounded, red:Boolean(f.cpu), life:.23, maxLife:.23 });
        if (t.trails.length > 48) t.trails.splice(0,t.trails.length-48);
        if (grounded) dust(game,f.x-direction*24,f.y,direction,3,
          f.cpu ? "216,128,144" : "172,211,239");
        memo.hitTrailTime = 0;
      }
      memo.state = f.state; memo.grounded = f.grounded; memo.x = f.x;
    }
  }

  function drawBehind(game, ctx, time) {
    const t = getTracker(game);
    ctx.save();
    for (const p of t.dust) {
      const alpha = clamp(p.life / p.maxLife);
      ctx.fillStyle = "rgba(" + p.tint + "," + (alpha * .38) + ")";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.radius * (1 + (1 - alpha) * 1.6),
        p.radius * (.5 + 1 - alpha), 0, 0, TAU);
      ctx.fill();
    }
    for (const p of t.trails) {
      const alpha = clamp(p.life / p.maxLife);
      ctx.globalAlpha = alpha * (p.grounded ? .47 : .7);
      ctx.strokeStyle = p.red ? "#ff8eae" : "#a0efff";
      ctx.lineWidth = p.grounded ? 4 : 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x-p.direction*p.length,p.y+(p.grounded ? -2 : 7));
      ctx.stroke();
      if (p.grounded) {
        ctx.strokeStyle = "#e5fbff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y-4);
        ctx.lineTo(p.x-p.direction*p.length*.6, p.y-7);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawFront(game, ctx, time) {
    const t = getTracker(game);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const flash of t.flashes) {
      const alpha = clamp(flash.life / flash.maxLife);
      const radius = (8 + flash.power * 39) * (1.25 - alpha * .25);
      // Brief centered starburst: brightest at contact, not a full-screen flash.
      const halo = ctx.createRadialGradient(flash.x,flash.y,2,flash.x,flash.y,radius);
      halo.addColorStop(0,flash.blocked ? "rgba(255,255,255,.85)" : "rgba(245,255,255,.94)");
      halo.addColorStop(.28, flash.red ? "rgba(255,91,142,.6)" : "rgba(98,224,255,.64)");
      halo.addColorStop(1,"rgba(0,0,0,0)");
      ctx.globalAlpha = alpha * alpha * .75 * t.quality;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(flash.x,flash.y,radius,0,TAU);
      ctx.fill();
    }
    for (const slash of t.slashes) {
      const alpha = clamp(slash.life / slash.maxLife);
      ctx.globalAlpha = alpha * .95;
      ctx.strokeStyle = slash.blocked ? "#efffff" : slash.red ? "#ff7ca9" : "#79ecff";
      ctx.lineWidth = slash.width * alpha;
      ctx.beginPath();
      ctx.moveTo(slash.x,slash.y);
      const dx = Math.sign(slash.vx) * slash.length;
      const dy = Math.sin(slash.angle) * slash.length * .8;
      ctx.lineTo(slash.x+dx,slash.y+dy);
      ctx.stroke();
      if (t.quality > .5 && !slash.blocked) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = Math.max(1,slash.width*.25*alpha);
        ctx.beginPath();
        ctx.moveTo(slash.x+dx*.18,slash.y+dy*.18);
        ctx.lineTo(slash.x+dx*.72,slash.y+dy*.72);
        ctx.stroke();
      }
    }
    for (const ring of t.rings) {
      const progress = clamp(ring.time / ring.maxLife);
      const alpha = 1 - ease(progress);
      const radius = (16 + 82 * progress) * ring.power;
      ctx.globalAlpha = alpha * .8;
      ctx.strokeStyle = ring.blocked ? "#dffaff" : ring.red ? "#ff5e84" : "#7beaff";
      ctx.lineWidth = 2 + 5 * (1 - progress);
      ctx.beginPath();
      ctx.ellipse(ring.x, ring.y, radius * 1.16, radius * .62, -.1, 0, TAU);
      ctx.stroke();
      if (t.quality > .5 && !ring.blocked) {
        // A second compressed ripple catches the knockback direction.
        ctx.globalAlpha = alpha * .38;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(ring.x,ring.y,radius*1.35,radius*.32,.17,0,TAU);
        ctx.stroke();
      }
      for (let i = 0; i < (t.quality > .5 ? 6 : 3); i++) {
        const angle = i * TAU / 6 + ring.time * 3;
        ctx.beginPath();
        ctx.moveTo(ring.x + Math.cos(angle) * radius, ring.y + Math.sin(angle) * radius * .6);
        ctx.lineTo(ring.x + Math.cos(angle) * (radius + 31 * alpha),
          ring.y + Math.sin(angle) * (radius + 31 * alpha) * .6);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  root.MugenFluid = Object.freeze({
    drawCel, tintForCpu, beginFrame, tick, onHit, drawBehind, drawFront, reset,
    bend, getStats(game) {
      const t = getTracker(game);
      return { dust:t.dust.length, rings:t.rings.length, slashes:t.slashes.length,
        flashes:t.flashes.length, trails:t.trails.length,
        cameraX:t.camera.x, zoom:t.camera.zoom, quality:t.quality };
    }
  });
})(typeof window === "undefined" ? globalThis : window);
