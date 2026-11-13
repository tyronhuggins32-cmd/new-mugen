/* New Mugen: Spirit Shotgun anime-reference VFX v4.
 * One short fist-formed energy flash explodes into a dense blue-white fan.
 * Seven gameplay pellets keep the existing single-volley damage rule;
 * visual energy fragments below NEVER participate in collision or damage.
 */
(function (root) {
  "use strict";
  const TAU = Math.PI * 2;
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const easeOut = x => 1 - (1 - clamp(x)) ** 3;
  const cache = new WeakMap();
  const DEFAULT = Object.freeze({
    visualPellets: 36, visualSpread: .61, flashDuration: .23,
    fanDuration: .68, impactPellets: 30, impactDuration: .48
  });

  function state(game) {
    let s = cache.get(game);
    if (!s) {
      s = { fans: [], impacts: [], fired: 0, impactsCreated: 0 };
      cache.set(game, s);
    }
    return s;
  }

  function reset(game) { cache.delete(game); }

  function makeFragments(count, spread, speed = 950) {
    const result = [];
    for (let i = 0; i < count; i++) {
      // Low-discrepancy deterministic fragments. Avoid noisy randomized
      // bursts or camera-dependent flicker on every render.
      const t = (i + .5) / count;
      const wobble = .12 * Math.sin(i * 18.99);
      const angle = (2 * t - 1) * spread + wobble;
      const velocity = speed * (.72 + .46 * ((i * 11 % 17) / 17));
      result.push({
        angle, velocity, delay: .012 * (i % 5),
        width: 1.7 + (i % 4) * .65,
        radius: 2.4 + i % 3,
        length: 12 + (i % 7) * 6
      });
    }
    return result;
  }

  function onFire(game, owner, x, y, facing, options = {}) {
    if (!game || !owner) return null;
    const config = { ...DEFAULT, ...options };
    const s = state(game);
    const fan = {
      x, y, facing: facing < 0 ? -1 : 1,
      cpu: Boolean(owner.cpu), age: 0,
      duration: config.fanDuration, flashDuration: config.flashDuration,
      fragments: makeFragments(Math.min(60,Math.max(12,Math.round(config.visualPellets))),
        config.visualSpread)
    };
    s.fans.push(fan);
    if (s.fans.length > 3) s.fans.shift();
    s.fired++;
    return fan;
  }

  function onImpact(game, x, y, cpu = false, options = {}) {
    if (!game) return;
    const config = { ...DEFAULT, ...options };
    const s = state(game);
    const count = clamp(Math.round(config.impactPellets), 10, 50);
    s.impacts.push({
      x, y, cpu: Boolean(cpu), age: 0, duration: config.impactDuration,
      fragments: makeFragments(count, Math.PI, 175)
    });
    if (s.impacts.length > 7) s.impacts.splice(0, s.impacts.length - 7);
    s.impactsCreated++;
  }

  function tick(game, dt) {
    if (!game || game.paused) return;
    const s = state(game);
    const seconds = clamp(Number(dt) || 0, 0, .08);
    for (const fan of s.fans) fan.age += seconds;
    for (const impact of s.impacts) impact.age += seconds;
    s.fans = s.fans.filter(f => f.age < f.duration);
    s.impacts = s.impacts.filter(i => i.age < i.duration);
  }

  function coreFlash(ctx, x, y, intensity, scale, cpu = false) {
    const a = clamp(intensity);
    if (a <= 0) return;
    const color = cpu ? "255,70,122" : "64,211,255";
    const size = 56 * scale;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grad = ctx.createRadialGradient(x,y,0,x,y,size);
    grad.addColorStop(0,"rgba(255,255,255,"+(.92*a)+")");
    grad.addColorStop(.14,"rgba(225,252,255,"+(.85*a)+")");
    grad.addColorStop(.39,"rgba("+color+","+(a*.54)+")");
    grad.addColorStop(1,"rgba("+color+",0)");
    ctx.fillStyle=grad;
    ctx.fillRect(x-size,y-size,size*2,size*2);
    ctx.translate(x,y);
    for(let j=0;j<10;j++){
      const theta=(j/10)*TAU;
      const extent=(25+24*(j%3))*scale*a;
      ctx.strokeStyle=j%3===0?"rgba(255,255,255,"+a+")":
        "rgba("+color+","+(a*.8)+")";
      ctx.lineWidth=j%3===0?3.2:1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(theta)*size*.10,Math.sin(theta)*size*.10);
      ctx.lineTo(Math.cos(theta)*extent,Math.sin(theta)*extent);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWindup(game,ctx,time,config={}) {
    if (!game) return;
    const charge = config.chargeDuration || .24;
    for (const fighter of [game.player,game.cpu]) {
      if (!fighter || fighter.currentAttack?.() !== "shotgun") continue;
      const t = clamp(fighter.stateTime / charge);
      if (t >= 1) continue;
      const dir = fighter.facing || 1;
      const x = fighter.x + dir * (68 + 11*t);
      const y = fighter.y - 132;
      const glow = .15 + .75 * t * t;
      coreFlash(ctx,x,y,glow,.42+.4*t,Boolean(fighter.cpu));
      ctx.save();
      ctx.globalCompositeOperation="lighter";
      ctx.strokeStyle = fighter.cpu ? "#ff89a9" : "#a4f9ff";
      ctx.globalAlpha = .26 + .56*t;
      for(let i=0;i<6;i++){
        const angle=(i/6)*TAU+time*.003;
        const distance=56-(38*t)+i%3*8;
        ctx.lineWidth=1.3;
        ctx.beginPath();
        ctx.moveTo(x+Math.cos(angle)*distance,y+Math.sin(angle)*distance);
        ctx.lineTo(x+Math.cos(angle)*(distance*.55),y+Math.sin(angle)*(distance*.55));
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawFan(game,ctx,time) {
    const s=state(game);
    for(const fan of s.fans){
      const t=clamp(fan.age/fan.duration);
      const blue=fan.cpu ? "#ff688a" : "#49cfff";
      const bright=fan.cpu ? "#ffe1ef" : "#f4ffff";
      ctx.save();
      ctx.translate(fan.x,fan.y);
      ctx.scale(fan.facing,1);
      ctx.globalCompositeOperation="lighter";
      if(fan.age < fan.flashDuration){
        const intensity=1-fan.age/fan.flashDuration;
        const length=44+260*easeOut(fan.age/fan.flashDuration);
        const spread=30+100*easeOut(fan.age/fan.flashDuration);
        ctx.globalAlpha=.46*intensity;
        const cone=ctx.createLinearGradient(0,0,length,0);
        cone.addColorStop(0,bright);
        cone.addColorStop(.24,blue);
        cone.addColorStop(1,"rgba(34,167,244,0)");
        ctx.fillStyle=cone;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(length,spread);
        ctx.quadraticCurveTo(length*.85,0,length,-spread);
        ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;
      }
      const count=fan.fragments.length;
      // A dense expanding pattern of luminous fragments, like the fan of
      // blue shots in the user's 29-second scene. It is purely cosmetic.
      for(let i=0;i<count;i++){
        const p=fan.fragments[i];
        const age=fan.age-p.delay;
        if(age<=0)continue;
        const f=clamp(age/fan.duration);
        const fade=clamp((1-f)*1.4);
        if(fade<=0)continue;
        const dx=p.velocity*age*Math.cos(p.angle);
        const dy=p.velocity*age*Math.sin(p.angle);
        ctx.save();
        ctx.translate(dx,dy);
        ctx.rotate(p.angle);
        ctx.globalAlpha=fade*.85;
        ctx.fillStyle=i%5===0?bright:blue;
        ctx.beginPath();
        ctx.ellipse(0,0,p.length*.7,p.width,0,0,TAU);
        ctx.fill();
        ctx.globalAlpha=fade*.35;
        ctx.strokeStyle=bright;
        ctx.lineWidth=p.width*.8;
        ctx.beginPath();ctx.moveTo(-p.length,0);
        ctx.lineTo(-p.length-p.velocity*.055,0);ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      if(fan.age<fan.flashDuration){
        const power=1-fan.age/fan.flashDuration;
        coreFlash(ctx,fan.x,fan.y,power,1.2+1.3*easeOut(fan.age/fan.flashDuration),fan.cpu);
      }
    }
  }

  function drawImpacts(game,ctx,time) {
    const s=state(game);
    for(const impact of s.impacts) {
      const t=clamp(impact.age/impact.duration);
      const fade=(1-t)**1.5;
      ctx.save();
      ctx.globalCompositeOperation="lighter";
      ctx.globalAlpha=fade*.80;
      ctx.strokeStyle=impact.cpu?"#ff7195":"#8cefff";
      ctx.lineWidth=3*(1-t)+.8;
      ctx.beginPath();
      ctx.ellipse(impact.x,impact.y,12+76*t,20+106*t,0,0,TAU);
      ctx.stroke();
      // The anime shows many small, separated impact holes instead of
      // a single orb. Use ring-distributed marks that expire quickly.
      for(let i=0;i<impact.fragments.length;i++) {
        const p=impact.fragments[i];
        const a=i/impact.fragments.length*TAU+Math.sin(i*12.15)*.20;
        const radius=28+88*t+(i%5)*8;
        const x=impact.x+Math.cos(a)*radius;
        const y=impact.y+Math.sin(a)*radius*.86;
        ctx.globalAlpha=fade*(i%4===0?.88:.52);
        ctx.fillStyle=i%4===0?"#f5ffff":impact.cpu?"#fd748e":"#54dafa";
        ctx.beginPath();
        ctx.arc(x,y,(2+i%3)*(1.3-t*.4),0,TAU);
        ctx.fill();
        if(i%6===0){
          ctx.strokeStyle=impact.cpu?"#ffb9cd":"#aafaff";
          ctx.lineWidth=1.6;
          ctx.beginPath();
          ctx.moveTo(x-11,y);ctx.lineTo(x+11,y);
          ctx.moveTo(x,y-11);ctx.lineTo(x,y+11);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  // Separate the shot's visible style from Spirit Gun: tiny luminous shotgun
  // pellets with short tails, surrounded by a much larger cosmetic spray.
  function drawPellet(ctx,projectile,x,y,time) {
    const radius=projectile.radius||8;
    const dir=Math.atan2(projectile.vy||0,projectile.vx||1);
    ctx.save();
    ctx.translate(x,y);ctx.rotate(dir);
    ctx.globalCompositeOperation="lighter";
    ctx.fillStyle=projectile.owner?.cpu?"#ff749e":"#5be6ff";
    ctx.globalAlpha=.72;
    ctx.beginPath();ctx.ellipse(-11,0,24,radius*.53,0,0,TAU);ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle="#f2ffff";
    ctx.beginPath();ctx.ellipse(0,0,radius*1.16,radius*.57,0,0,TAU);ctx.fill();
    ctx.restore();
  }

  root.MugenShotgun=Object.freeze({
    reset,onFire,onImpact,tick,drawWindup,drawFan,drawImpacts,drawPellet,
    // This is gameplay-safe introspection for tests and debug dashboards.
    stats(game){
      const s=state(game);
      return {activeFans:s.fans.length,activeImpacts:s.impacts.length,
        fired:s.fired,impactsCreated:s.impactsCreated,
        visualFragments:s.fans.reduce((n,f)=>n+f.fragments.length,0)};
    }
  });
})(typeof window==="undefined"?globalThis:window);
