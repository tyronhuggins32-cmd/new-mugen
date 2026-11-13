/* New Mugen: Yusuke's cinematic combat layer. All timings are in fixed-step game seconds. */
window.MugenCinematics = (() => {
  "use strict";
  const CYAN = "#75ecff";
  const WHITE = "#f1fcff";

  function drawArena(ctx, time, arena) {
    const w = arena.width, h = arena.height, floor = arena.floor;
    const sky = ctx.createLinearGradient(0, 0, 0, floor);
    sky.addColorStop(0, "#071526");
    sky.addColorStop(.56, "#12415b");
    sky.addColorStop(1, "#122b40");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const horizon = ctx.createLinearGradient(0, 270, 0, floor);
    horizon.addColorStop(0, "rgba(23,122,168,0)");
    horizon.addColorStop(1, "rgba(49,145,174,.30)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 200, w, 410);
    for (let depth = 0; depth < 2; depth++) {
      const far = depth === 0;
      const step = far ? 57 : 78;
      for (let i = -1; i < Math.ceil(w / step) + 1; i++) {
        const seed = ((i * 83 + depth * 131) % 127 + 127) % 127;
        const bh = (far ? 125 : 172) + seed * (far ? 1.05 : 1.65);
        const x = i * step + (far ? -12 : 15), y = floor - bh - (far ? 58 : 30);
        ctx.fillStyle = far ? "#132e42" : "#0d1c2c";
        ctx.fillRect(x, y, step - 9, bh + 80);
        ctx.fillStyle = far ? "#174258" : "#173349";
        ctx.fillRect(x + 3, y + 6, step - 17, 4);
        for (let row = 0; row < Math.floor((bh - 18) / 19); row++) {
          for (let col = 0; col < (far ? 3 : 4); col++) {
            const lit = ((row * 11 + col * 7 + i * 17 + depth * 3) % 9 + 9) % 9;
            ctx.fillStyle = lit < 2 ? (far ? "rgba(101,218,243,.32)" : "rgba(80,191,239,.55)") : "#152b3b";
            ctx.fillRect(x + 7 + col * (far ? 14 : 16), y + 17 + row * 19, far ? 6 : 8, 7);
          }
        }
      }
    }
    const red = ctx.createRadialGradient(w * .80, floor - 215, 9, w * .80, floor - 215, 260);
    red.addColorStop(0, "rgba(255,70,92,.40)");
    red.addColorStop(1, "rgba(255,70,92,0)");
    ctx.fillStyle = red; ctx.fillRect(0, 0, w, floor);
    ctx.fillStyle = "#112638"; ctx.fillRect(0, floor - 23, w, 24);
    ctx.fillStyle = "#203e4e"; ctx.fillRect(0, floor - 12, w, 7);
    ctx.fillStyle = "#151e2b"; ctx.fillRect(0, floor, w, h - floor);
    ctx.strokeStyle = "rgba(116,182,198,.24)"; ctx.lineWidth = 2;
    for (let x = -180; x < w + 180; x += 156) {
      ctx.beginPath(); ctx.moveTo(x, floor); ctx.lineTo(x - 130, h); ctx.stroke();
    }
    for (let j = 0; j < 5; j++) {
      const y = floor + 8 + j * j * 8;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const x = 190 + i * 465;
      const halo = ctx.createRadialGradient(x, floor - 95, 3, x, floor - 95, 120);
      halo.addColorStop(0, "rgba(255,64,80,.28)");
      halo.addColorStop(1, "rgba(255,64,80,0)");
      ctx.fillStyle = halo; ctx.fillRect(x - 130, floor - 235, 260, 260);
      ctx.fillStyle = "#202937"; ctx.fillRect(x - 3, floor - 112, 6, 100);
      ctx.fillStyle = "#ff5463"; ctx.shadowColor = "#ff3b57"; ctx.shadowBlur = 19;
      ctx.beginPath(); ctx.roundRect(x - 12, floor - 126, 24, 27, 6); ctx.fill(); ctx.shadowBlur = 0;
    }
    const shimmer = .08 + .045 * Math.sin(time * .002);
    ctx.fillStyle = "rgba(76,213,255," + shimmer + ")";
    ctx.fillRect(0, floor - 2, w, 3);
    ctx.fillStyle = "rgba(197,229,241,.55)";
    ctx.font = "800 13px system-ui, sans-serif";
    ctx.fillText("SPIRIT SKYLINE // ROUND 01", 26, h - 23);
  }

  function begin(game) {
    if (game.state !== "play" || game.paused || game.superSequence) return false;
    const hero = game.player;
    if (!hero.grounded || hero.hitstun > 0 || hero.currentAttack() || hero.energy < 100) return false;
    hero.energy = 0;
    hero.vx = 0;
    hero.vy = 0;
    hero.setState("super");
    hero.invulnerability = 2.3;
    game.superSequence = { t: 0, strikes: 0, connected: false };
    game.shake = 15;
    game.addSpiritBurst(hero.x + hero.facing * 65, hero.y - 140, CYAN, hero.facing, 1.5, "impact");
    return true;
  }

  function update(game, dt) {
    const scene = game.superSequence;
    if (!scene) return;
    scene.t += dt;
    const hero = game.player, enemy = game.cpu;
    // Each impact is a real combat hit: blocking mitigates it, combos and HP update normally.
    while (scene.strikes < 8 && scene.t >= .86 + scene.strikes * .115) {
      const direction = (enemy.x - hero.x) * hero.facing;
      const inBeam = direction > 12 && direction < 1100 && Math.abs(enemy.y - (hero.y - 15)) < 265;
      if (inBeam && enemy.health > 0) {
        const last = scene.strikes === 7;
        game.damageFighter(hero, enemy, {
          damage: last ? 62 : 39,
          facing: hero.facing,
          hitstun: .24,
          knockback: last ? 490 : 30,
          heavyImpact: last,
          energyGain: 0
        }, enemy.x, enemy.y - 115);
        scene.connected = true;
        game.shake = last ? 20 : 8;
      }
      scene.strikes++;
    }
    if (scene.t >= 2.35) {
      hero.invulnerability = 0;
      hero.setState("idle");
      game.superSequence = null;
      if (game.player.health <= 0 || game.cpu.health <= 0) game.finishRound();
    }
  }

  function aura(game, ctx, time) {
    const p = game.player;
    if (p.state !== "charge" && p.energy < 99.9) return;
    const a = p.state === "charge" ? .55 : .17;
    const wave = Math.sin(time * .018) * 7;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(p.x, p.y - 90, 18, p.x, p.y - 90, 95 + wave);
    glow.addColorStop(0, "rgba(198,255,255," + a + ")");
    glow.addColorStop(.4, "rgba(68,217,255," + (a * .55) + ")");
    glow.addColorStop(1, "rgba(68,217,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - 120, p.y - 220, 240, 250);
    ctx.strokeStyle = CYAN;
    ctx.globalAlpha = a;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 93, 48 + wave, 112 + wave, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function render(game, ctx, time) {
    const scene = game.superSequence;
    if (!scene) return;
    const t = scene.t, w = ctx.canvas.width, h = ctx.canvas.height;
    const hero = game.player, cy = hero.y - 137;
    ctx.save();
    const intro = t < .77;
    const alpha = t < .18 ? .65 : intro ? .42 : .18;
    ctx.fillStyle = "rgba(0,8,23," + alpha + ")";
    ctx.fillRect(0, 0, w, h);
    if (intro) {
      const radius = 65 + 185 * (t / .77);
      const energy = ctx.createRadialGradient(hero.x, cy, 9, hero.x, cy, radius);
      energy.addColorStop(0, "rgba(255,255,255,.88)");
      energy.addColorStop(.27, "rgba(113,235,255,.54)");
      energy.addColorStop(1, "rgba(0,145,255,0)");
      ctx.fillStyle = energy;
      ctx.beginPath(); ctx.arc(hero.x, cy, radius, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 28; i++) {
        const a = i * Math.PI * 2 / 28 + t * .7;
        const x = hero.x + Math.cos(a) * (radius + 80), y = cy + Math.sin(a) * (radius + 65);
        ctx.strokeStyle = i % 2 ? "rgba(107,231,255,.5)" : "rgba(241,252,255,.7)";
        ctx.lineWidth = i % 3 ? 2 : 4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hero.x + Math.cos(a) * radius * .54, cy + Math.sin(a) * radius * .54); ctx.stroke();
      }
      const portrait = document.querySelector("#character-art");
      if (portrait && portrait.complete && portrait.naturalWidth > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(.53, t * 1.6);
        ctx.drawImage(portrait, Math.max(0, w - 560), 95, 500, 525); ctx.restore();
      }
    } else {
      const blastTime = t - .77;
      const out = hero.facing > 0 ? w + 140 : -140;
      const startX = hero.x + hero.facing * 70;
      const tailX = startX - hero.facing * 38;
      const power = Math.min(1, blastTime * 11) * Math.min(1, (2.35 - t) * 4);
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "#49d9ff"; ctx.shadowBlur = 38;
      const beam = ctx.createLinearGradient(0, cy - 140, 0, cy + 140);
      beam.addColorStop(0, "rgba(20,188,255,0)");
      beam.addColorStop(.28, "rgba(40,203,255," + (.65 * power) + ")");
      beam.addColorStop(.44, "rgba(246,255,255," + power + ")");
      beam.addColorStop(.56, "rgba(246,255,255," + power + ")");
      beam.addColorStop(.72, "rgba(40,203,255," + (.65 * power) + ")");
      beam.addColorStop(1, "rgba(20,188,255,0)");
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(tailX, cy - 18);
      ctx.lineTo(out, cy - 106 * power);
      ctx.lineTo(out, cy + 106 * power);
      ctx.lineTo(tailX, cy + 18);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      const impactX = Math.max(90, Math.min(w - 90, game.cpu.x));
      const pulse = 45 + Math.sin(t * 55) * 21;
      const burst = ctx.createRadialGradient(impactX, cy, 5, impactX, cy, 175 + pulse);
      burst.addColorStop(0, "rgba(255,255,255," + power + ")");
      burst.addColorStop(.26, "rgba(98,221,255," + (.75 * power) + ")");
      burst.addColorStop(1, "rgba(16,125,255,0)");
      ctx.fillStyle = burst;
      ctx.beginPath(); ctx.arc(impactX, cy, 175 + pulse, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 15; i++) {
        const phase = i * 2.39996 + t * .4;
        const sx = impactX + Math.cos(phase) * (70 + blastTime * 135);
        const sy = cy + Math.sin(phase) * (70 + blastTime * 105);
        ctx.strokeStyle = i % 2 ? "#d5ffff" : "#65baff";
        ctx.globalAlpha = (.4 + .55 * power);
        ctx.lineWidth = i % 3 ? 2 : 4;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(phase) * 65, sy + Math.sin(phase) * 65); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = .14 * (Math.sin(t * 69) * .5 + .5) * power;
      ctx.fillStyle = WHITE; ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = "#2ee5ff"; ctx.shadowBlur = 14;
    ctx.fillStyle = "#e5fcff"; ctx.font = "italic 900 70px Impact, sans-serif";
    ctx.fillText("SPIRIT GUN", 45, 116);
    ctx.shadowBlur = 0;
    ctx.fillStyle = CYAN; ctx.font = "900 20px system-ui, sans-serif";
    ctx.fillText("YUSUKE URAMESHI  //  MAXIMUM OUTPUT", 50, 146);
    ctx.restore();
  }

  return { drawArena, begin, update, aura, render };
})();
