/* New Mugen Spirit Gun V5.
 * A concentrated fingertip sphere, piercing-looking (non-piercing) ray,
 * stop-on-contact burst and short, readable cinematic reaction.
 * Rendered on the combat canvas at display refresh; no extra image textures.
 */
(function(root) {
  "use strict";
  const TAU=Math.PI*2;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=t=>{const x=clamp(t);return x*x*(3-2*x);};
  const stateMap=new WeakMap();
  function state(game) {
    let s=stateMap.get(game);
    if(!s){s={flashes:[],impacts:[],shotsFired:0,shotsHit:0};stateMap.set(game,s);}
    return s;
  }
  function reset(game){stateMap.delete(game);}
  function onFire(game,owner,x,y) {
    if(!game)return;
    const s=state(game);
    s.flashes.push({x,y,cpu:!!owner?.cpu,age:0,duration:.22,strength:1});
    if(s.flashes.length>5)s.flashes.shift();
    s.shotsFired++;
  }
  function onImpact(game,owner,x,y,blocked=false,wall=false) {
    if(!game)return;
    const s=state(game);
    const event={x,y,cpu:!!owner?.cpu,age:0,duration:wall?.30:.44,
      size:wall?.64:blocked?.78:1.25,blocked,wall};
    s.impacts.push(event);
    if(s.impacts.length>8)s.impacts.shift();
    if(!wall)s.shotsHit++;
    if(!wall){
      game.cinematicImpact={x,y,life:.19,maxLife:.19};
      game.shake=Math.max(game.shake||0,blocked?9:15);
      game.hitStop=Math.max(game.hitStop||0,blocked?.065:.10);
    }
  }
  function tick(game,dt) {
    if(!game || game.paused) return;
    const s=state(game);const seconds=clamp(dt||0,0,.06);
    for(const effect of s.flashes)effect.age+=seconds;
    for(const impact of s.impacts)impact.age+=seconds;
    s.flashes=s.flashes.filter(f=>f.age<f.duration);
    s.impacts=s.impacts.filter(i=>i.age<i.duration);
    if(game.cinematicImpact) {
      game.cinematicImpact.life-=seconds;
      if(game.cinematicImpact.life<=0)game.cinematicImpact=null;
    }
  }
  function orb(ctx,x,y,radius,power,cpu,time) {
    if(power<=0)return;
    const c=cpu?"255,88,125":"45,200,255";
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    const glow=ctx.createRadialGradient(x,y,0,x,y,radius*2.6);
    glow.addColorStop(0,"rgba(255,255,255,"+clamp(power)+")");
    glow.addColorStop(.16,"rgba(222,250,255,"+(.88*power)+")");
    glow.addColorStop(.46,"rgba("+c+","+(power*.52)+")");
    glow.addColorStop(1,"rgba("+c+",0)");
    ctx.fillStyle=glow;ctx.fillRect(x-radius*2.6,y-radius*2.6,radius*5.2,radius*5.2);
    ctx.globalAlpha=clamp(power);
    ctx.fillStyle="#f5ffff";ctx.beginPath();
    ctx.arc(x,y,Math.max(2,radius*.38),0,TAU);ctx.fill();
    ctx.strokeStyle=cpu?"#ffceda":"#d4faff";
    for(let i=0;i<6;i++){
      const theta=i*TAU/6+time*.005;
      const start=radius*.66,end=radius*(1.55+.25*Math.sin(time*.014+i));
      ctx.globalAlpha=.45+.3*Math.sin(i+time*.008)**2;
      ctx.lineWidth=i%2===0?2:1.3;
      ctx.beginPath();
      ctx.moveTo(x+Math.cos(theta)*start,y+Math.sin(theta)*start);
      ctx.lineTo(x+Math.cos(theta)*end,y+Math.sin(theta)*end);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawWindup(game,ctx,time,options={}) {
    const duration=options.chargeDuration||.30;
    for(const f of [game?.player,game?.cpu]){
      if(!f || f.currentAttack?.()!=="gun")continue;
      const age=f.stateTime;
      if(age<0 || age>duration+.11)continue;
      const progress=clamp(age/duration);
      const x=f.x+(f.facing||1)*(options.muzzleOffsetX??84);
      const y=f.y+(options.muzzleOffsetY??-158);
      const power=age<duration ? .13+.86*smooth(progress)
        : (1-clamp((age-duration)/.11))*.7;
      const radius=8+26*smooth(progress);
      orb(ctx,x,y,radius,power,Boolean(f.cpu),time);
      if(age>=duration)continue;
      ctx.save();ctx.globalCompositeOperation="lighter";
      const color=f.cpu?"#ff819b":"#83e8ff";
      ctx.strokeStyle=color;ctx.lineWidth=1.5;
      ctx.globalAlpha=.18+.42*progress;
      // Inward spiraling strands converge on the index finger.
      for(let i=0;i<8;i++){
        const angle=i*TAU/8+time*.0024;
        const distance=46-27*smooth(progress)+i%3*5;
        ctx.beginPath();
        ctx.moveTo(x+Math.cos(angle)*distance,y+Math.sin(angle)*distance);
        ctx.quadraticCurveTo(x+Math.cos(angle+.6)*distance*.55,
          y+Math.sin(angle+.6)*distance*.55,x,y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawShot(ctx,p,x,y,time){
    const cpu=!!p.owner?.cpu;
    const direction=Math.atan2(p.vy||0,p.vx||1);
    const length=Math.min(175,29+Math.max(0,p.age||0)*2000);
    const radius=p.radius||16;
    const color=cpu?"#ff537f":"#4cd6ff";
    ctx.save();
    ctx.translate(x,y);ctx.rotate(direction);
    ctx.globalCompositeOperation="lighter";
    const trail=ctx.createLinearGradient(-length,0,18,0);
    trail.addColorStop(0,"rgba(20,135,235,0)");
    trail.addColorStop(.54,cpu?"rgba(255,45,106,.28)":"rgba(33,172,245,.32)");
    trail.addColorStop(.94,color);trail.addColorStop(1,"#ffffff");
    ctx.fillStyle=trail;
    ctx.beginPath();
    ctx.moveTo(-length,0);
    ctx.quadraticCurveTo(-length*.40,-radius*.6,0,-radius*.72);
    ctx.quadraticCurveTo(radius*1.5,0,0,radius*.72);
    ctx.quadraticCurveTo(-length*.40,radius*.6,-length,0);
    ctx.fill();
    ctx.fillStyle="#ffffff";ctx.shadowColor=color;ctx.shadowBlur=17;
    ctx.beginPath();ctx.ellipse(0,0,radius*.96,radius*.52,0,0,TAU);ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle=cpu?"#ffc7d7":"#dcffff";
    for(let i=0;i<5;i++){
      const phase=time*.009+i*TAU/5;
      const yy=Math.sin(phase)*(radius+2);
      ctx.globalAlpha=.45+.28*Math.sin(phase)**2;
      ctx.lineWidth=1.6;
      ctx.beginPath();
      ctx.moveTo(-length*.8,yy*.35);
      ctx.quadraticCurveTo(-length*.35,yy*1.35,8,yy);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawImpact(game,ctx,time) {
    const s=state(game);
    for(const hit of s.impacts) {
      const t=clamp(hit.age/hit.duration), fade=(1-t)**1.7;
      const radius=(21+125*smooth(t))*hit.size;
      ctx.save();
      ctx.globalCompositeOperation="lighter";
      orb(ctx,hit.x,hit.y,(35+65*t)*hit.size,fade*.92,hit.cpu,time);
      ctx.globalAlpha=fade;
      ctx.strokeStyle=hit.cpu?"#ff79a8":"#83efff";
      ctx.lineWidth=(7*(1-t)+1.5)*hit.size;
      ctx.beginPath();ctx.ellipse(hit.x,hit.y,radius,radius*.76,0,0,TAU);ctx.stroke();
      const shards=hit.wall?10:18;
      for(let i=0;i<shards;i++){
        const theta=i*TAU/shards+Math.sin(i*17.3)*.16;
        const inner=radius*.49;
        const outer=radius*(.94+.28*(i%4)/4);
        ctx.strokeStyle=i%4===0?"#ffffff":hit.cpu?"#ff8da9":"#5fd6ff";
        ctx.lineWidth=(i%3===0?3.2:1.5)*fade;
        ctx.beginPath();
        ctx.moveTo(hit.x+Math.cos(theta)*inner,hit.y+Math.sin(theta)*inner);
        ctx.lineTo(hit.x+Math.cos(theta)*outer,hit.y+Math.sin(theta)*outer);
        ctx.stroke();
      }
      ctx.restore();
    }
    for(const flash of s.flashes){
      const progress=flash.age/flash.duration;
      orb(ctx,flash.x,flash.y,22+64*smooth(progress),
        .95*(1-progress),flash.cpu,time);
    }
  }
  function drawOverlay(game,ctx,arena) {
    const s=state(game);
    const newest=[...s.impacts].reverse().find(i=>!i.wall && i.age<.10);
    if(!newest || !arena)return;
    // Very brief low-opacity frame tint; avoid an inaccessible full white flash.
    const alpha=.115*(1-newest.age/.10);
    ctx.save();ctx.fillStyle=newest.cpu?
      "rgba(255,80,110,"+alpha+")":"rgba(130,231,255,"+alpha+")";
    ctx.fillRect(0,0,arena.width,arena.height);
    ctx.restore();
  }
  root.MugenSpiritGun=Object.freeze({
    reset,onFire,onImpact,tick,drawWindup,drawShot,drawImpact,drawOverlay,
    stats(game) {
      const s=state(game);
      return {shotsFired:s.shotsFired,shotsHit:s.shotsHit,
        impacts:s.impacts.length,flashes:s.flashes.length};
    }
  });
})(typeof window==="undefined"?globalThis:window);
