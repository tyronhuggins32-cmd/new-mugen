/* New Mugen Visual Pipeline 2
 * Canvas-only artwork and effects, with cached static stage geometry.
 * The game remains deterministic at 60 Hz; rendering may run at any refresh rate.
 */
(function(global) {
  "use strict";
  const TAU = Math.PI * 2;
  const lerp = (a,b,t) => a + (b-a)*t;
  const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
  const smooth = x => { const t=clamp(x); return t*t*(3-2*t); };
  const glimmer = (i,k) => ((Math.sin(i*91.231+k*37.719)*43758.5453)%1+1)%1;
  let stageCache = null;
  let cachedWidth=0, cachedHeight=0;
  const heroBlue="#60dbff", enemyRed="#ff426d";

  function building(ctx,x,y,w,h,layer,index) {
    const left=x,top=y-h;
    ctx.fillStyle = layer===0 ? "#163449" : layer===1 ? "#112b3e" : "#101e2e";
    ctx.fillRect(left,top,w,h);
    ctx.fillStyle = layer===0 ? "#1a4557" : "#1c3b4c";
    ctx.fillRect(left+3,top+6,w-7,4);
    ctx.fillStyle="rgba(115,188,203,.13)";
    ctx.fillRect(left+1,top,2,h);
    if (glimmer(index,11)>.70) {
      ctx.strokeStyle=layer===0 ? "#225772" : "#2b3e50";
      ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(left+w*.5,top);ctx.lineTo(left+w*.5,top-26-30*glimmer(index,5));ctx.stroke();
    }
    const step = layer===0 ? 17 : 21;
    for(let yy=top+18;yy<y-15;yy+=step){
      for(let xx=left+9;xx<left+w-8;xx+=16){
        const rnd=glimmer(index*13+xx*.017,yy*.11);
        const lit=rnd>.78;
        ctx.fillStyle=lit ? (layer===0 ? "rgba(105,222,244,.35)" : "rgba(118,210,240,.47)") : "rgba(3,16,28,.72)";
        ctx.fillRect(xx, yy, 7, 8);
      }
    }
  }

  function staticStage(w,h,floor) {
    const canvas = document.createElement("canvas");
    canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext("2d");
    let sky=ctx.createLinearGradient(0,0,0,floor);
    sky.addColorStop(0,"#071827");
    sky.addColorStop(.47,"#133c55");
    sky.addColorStop(1,"#184d61");
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    const atmosphere=ctx.createRadialGradient(w*.7,200,20,w*.7,240,480);
    atmosphere.addColorStop(0,"rgba(72,176,217,.21)");
    atmosphere.addColorStop(1,"rgba(72,176,217,0)");
    ctx.fillStyle=atmosphere;ctx.fillRect(0,0,w,floor);

    // Architectural silhouette layers use fixed seeds and are cached once.
    for(let layer=0;layer<3;layer++) {
      const baseY=floor-80+layer*29;
      const step=layer===0?84:layer===1?107:131;
      for(let x=-step,i=0;x<w+step;x+=step,i++){
        const height=110+glimmer(i,layer+5)*(layer===0?156:layer===1?221:286);
        const width=step*(.80+glimmer(i,layer+24)*.18);
        building(ctx,x,baseY,width,height,layer,i+layer*67);
      }
    }
    const wash=ctx.createLinearGradient(0,230,0,floor);
    wash.addColorStop(0,"rgba(27,112,145,0)");
    wash.addColorStop(.8,"rgba(27,112,145,.08)");
    wash.addColorStop(1,"rgba(18,73,91,.46)");
    ctx.fillStyle=wash;ctx.fillRect(0,225,w,floor-225);

    // Rooftop ledge with tiled perspective and reflective wet seams.
    ctx.fillStyle="#142e3d";ctx.fillRect(0,floor-28,w,31);
    ctx.fillStyle="#224f61";ctx.fillRect(0,floor-24,w,7);
    ctx.fillStyle="#0e1a28";ctx.fillRect(0,floor,w,h-floor);
    let ground=ctx.createLinearGradient(0,floor,0,h);
    ground.addColorStop(0,"rgba(32,79,94,.57)");
    ground.addColorStop(1,"rgba(2,11,22,.68)");
    ctx.fillStyle=ground;ctx.fillRect(0,floor,w,h-floor);
    ctx.strokeStyle="rgba(91,164,182,.31)";
    ctx.lineWidth=2;
    for(let i=-350;i<w+350;i+=164){
      ctx.beginPath();ctx.moveTo(i,floor);ctx.lineTo(i-160,h);ctx.stroke();
    }
    for(let i=1;i<=5;i++){
      let y=floor+(i*i)*4.35;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
    }
    ctx.strokeStyle="#6cc8d4";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,floor-.5);ctx.lineTo(w,floor-.5);ctx.stroke();

    for(let i=0;i<3;i++){
      const x=170+i*465;
      ctx.fillStyle="#121d2b";ctx.fillRect(x-4,floor-119,8,93);
      ctx.shadowColor="#ff455e";ctx.shadowBlur=27;
      ctx.fillStyle="#ff5269";ctx.fillRect(x-15,floor-132,30,32);
      ctx.shadowBlur=0;
      ctx.fillStyle="#fff0df";ctx.fillRect(x-6,floor-124,12,8);
      ctx.fillStyle="rgba(255,64,87,.13)";
      ctx.beginPath();ctx.ellipse(x,floor+43,53,10,0,0,TAU);ctx.fill();
    }
    ctx.fillStyle="rgba(198,226,238,.45)";
    ctx.font="800 13px system-ui, sans-serif";
    ctx.fillText("SPIRIT SKYLINE  /  NIGHT DISTRICT",27,h-26);
    return canvas;
  }

  function drawArena(ctx,time,arena) {
    const w=arena.width,h=arena.height;
    if(!stageCache||cachedWidth!==w||cachedHeight!==h){
      stageCache=staticStage(w,h,arena.floor);
      cachedWidth=w;cachedHeight=h;
    }
    ctx.drawImage(stageCache,0,0);
    // Scrolling fog and a few far atmospheric lights make the static city breathe.
    const t=time*.001;
    ctx.save();
    const fog=ctx.createLinearGradient(0,arena.floor-195,0,arena.floor+27);
    fog.addColorStop(0,"rgba(57,199,230,0)");
    fog.addColorStop(.7,"rgba(57,199,230,.065)");
    fog.addColorStop(1,"rgba(57,199,230,0)");
    ctx.fillStyle=fog;ctx.fillRect(0,arena.floor-190,w,215);
    ctx.globalCompositeOperation="lighter";
    for(let i=0;i<3;i++){
      const x=(w*(i*.48+.07)+Math.sin(t*.17+i*1.9)*57);
      const y=arena.floor-115-i*80;
      const glow=ctx.createRadialGradient(x,y,1,x,y,210);
      const opacity=.045+.022*Math.sin(t*1.3+i);
      glow.addColorStop(0,"rgba(101,225,255,"+opacity+")");
      glow.addColorStop(1,"rgba(20,133,184,0)");
      ctx.fillStyle=glow;ctx.fillRect(x-220,y-220,440,440);
    }
    const reflected=ctx.createLinearGradient(0,arena.floor,0,h);
    reflected.addColorStop(0,"rgba(82,205,232,.08)");
    reflected.addColorStop(1,"rgba(82,205,232,0)");
    ctx.fillStyle=reflected;
    ctx.fillRect(0,arena.floor,w,h-arena.floor);
    ctx.restore();
  }

  function animBlend(animation, elapsed, progress) {
    if(!animation)return null;
    const frames=animation.frames;
    if(Array.isArray(frames)&&frames.length>1) {
      const cursor=Math.max(0,elapsed)*Math.max(1,animation.fps||12);
      const i=Math.floor(cursor),phase=cursor-i;
      const at=animation.loop? i%frames.length:Math.min(i,frames.length-1);
      const next=animation.loop?(at+1)%frames.length:Math.min(at+1,frames.length-1);
      const mix=smooth((phase-.56)/.44);
      return {from:frames[at],to:frames[next],mix:at===next?0:mix};
    }
    const keys=animation.keyframes;
    if(Array.isArray(keys)&&keys.length>1){
      const p=clamp(progress);
      let i=0;
      for(let n=1;n<keys.length;n++){if(keys[n].at<=p)i=n;else break;}
      const next=keys[i+1];
      if(!next)return {from:keys[i].frame,to:keys[i].frame,mix:0};
      const lastAt=keys[i].at;
      const fraction=(p-lastAt)/Math.max(.001,next.at-lastAt);
      return {from:keys[i].frame,to:next.frame,mix:smooth((fraction-.63)/.37)};
    }
    return null;
  }

  function poseTransform(fighter,time) {
    const type=fighter.currentAttack?.();
    const t=fighter.stateTime;
    const ground=fighter.grounded;
    const move=Math.min(1,Math.abs(fighter.vx)/400);
    let tilt=0, bob=0, stretchX=1, stretchY=1;
    if(fighter.state==="idle" || fighter.state==="charge" || fighter.state==="super"){
      const breath=Math.sin(time*.006+ (fighter.cpu?1.7:0));
      stretchY=1+breath*.014;
      stretchX=1-breath*.009;
      bob=breath*1.5;
    }else if(fighter.state==="walk" && ground){
      const walk=t*21;
      bob=Math.abs(Math.sin(walk))*(-3.5*move);
      tilt=move*.042*Math.sign(fighter.vx*fighter.facing);
      stretchY=1+move*.027;
    }else if(!ground && !type){
      tilt=clamp(fighter.vx/600,-1,1)*.055*fighter.facing;
      stretchY=1.035;
    }else if(fighter.state==="hit"){
      tilt=-Math.sin(Math.min(.34,t)*8)*.13;
      stretchX=1+.035*Math.exp(-t*8);
    }
    if(type && type!=="gun" && type!=="shotgun"){
      const anim=Math.min(1,t/.36);
      const impulse=Math.sin(anim*Math.PI);
      tilt+=impulse*(type==="heavy"?.06:.035);
      stretchX+=impulse*.035;
      stretchY-=impulse*.017;
    }
    return {tilt,bob,stretchX,stretchY};
  }

  function drawCpuAccent(ctx, fighter, time) {
    if(!fighter.cpu)return;
    ctx.save();
    ctx.strokeStyle="#ff4b82";ctx.shadowColor="#ff3158";ctx.shadowBlur=12;
    ctx.globalAlpha=.85+.12*Math.sin(time*.011);
    ctx.lineWidth=3;
    // Subtle spectral eyes and horn silhouettes turn the recolored pose into a scout.
    ctx.beginPath();
    ctx.moveTo(-18,-187);ctx.lineTo(-26,-204);ctx.lineTo(-6,-187);
    ctx.moveTo(18,-187);ctx.lineTo(26,-204);ctx.lineTo(6,-187);
    ctx.stroke();
    ctx.fillStyle="#ff5d85";
    ctx.fillRect(1,-154,8,2);
    ctx.restore();
  }

  function onHit(game,attacker,defender,damage,blocked,heavy,impactX,impactY) {
    if(!game.visualHits)game.visualHits=[];
    game.visualHits.push({
      x:Number.isFinite(impactX)?impactX:defender.x,
      y:Number.isFinite(impactY)?impactY:defender.y-115,
      life:blocked?.20:heavy?.43:.31,
      maxLife:blocked?.20:heavy?.43:.31,
      scale:blocked?.54:heavy?1.55:1,
      color:blocked?"#effbff":attacker.cpu?enemyRed:heroBlue,
      direction:attacker.facing,
      seed:game.visualHits.length*1.732 + attacker.comboHits*2.71
    });
    if(game.visualHits.length>15)game.visualHits.splice(0,game.visualHits.length-15);
  }

  function tick(game,dt) {
    if(game.visualHits) {
      for(const hit of game.visualHits)hit.life-=dt;
      game.visualHits=game.visualHits.filter(hit=>hit.life>0);
    }
    if(!game.visualEchoes)game.visualEchoes=[];
    for(const echo of game.visualEchoes)echo.life-=dt;
    game.visualEchoes=game.visualEchoes.filter(echo=>echo.life>0);
    if(game.state!=="play")return;
    for(const fighter of [game.player,game.cpu]){
      if(!fighter)return;
      if(Math.abs(fighter.vx)<285 && fighter.dashTimer<=0)continue;
      const interval=fighter.dashTimer>0?.028:.055;
      fighter.echoClock=(fighter.echoClock||0)+dt;
      if(fighter.echoClock>=interval){
        fighter.echoClock=0;
        game.visualEchoes.push({
          fighter,x:fighter.x,y:fighter.y,life:.18,maxLife:.18,
          facing:fighter.facing
        });
        if(game.visualEchoes.length>10)game.visualEchoes.shift();
      }
    }
  }

  function drawEchoes(game,ctx,time) {
    if(!game.visualEchoes)return;
    ctx.save();
    for(const echo of game.visualEchoes){
      const fighter=echo.fighter;
      if(!fighter?.drawYusukeSprite)continue;
      const dx=echo.x-fighter.x,dy=echo.y-fighter.y;
      ctx.save();
      ctx.translate(dx,dy);
      ctx.globalAlpha=clamp(echo.life/echo.maxLife)*.23;
      fighter.drawYusukeSprite(ctx,time,1,true);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawHits(game,ctx,time) {
    if(!game.visualHits)return;
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    for(const hit of game.visualHits) {
      const progress=clamp(1-hit.life/hit.maxLife);
      const p=1-smooth(progress);
      const r=(18+98*progress)*hit.scale;
      ctx.save();
      ctx.translate(hit.x,hit.y);
      ctx.scale(hit.direction,1);
      ctx.shadowColor=hit.color;ctx.shadowBlur=20*p;
      ctx.strokeStyle=hit.color;
      ctx.lineWidth=(4+7*(1-progress))*hit.scale;
      ctx.globalAlpha=p*.82;
      ctx.beginPath();ctx.ellipse(0,0,r*1.15,r*.73,-.24,0,TAU);ctx.stroke();
      ctx.shadowBlur=0;
      ctx.strokeStyle="#e8faff";ctx.lineWidth=2;
      for(let i=0;i<15;i++){
        const theta=i*TAU/15+hit.seed;
        const inner=(12+progress*40)*hit.scale;
        const outer=inner+(65+45*glimmer(i,hit.seed))*hit.scale*p;
        ctx.beginPath();
        ctx.moveTo(Math.cos(theta)*inner,Math.sin(theta)*inner);
        ctx.lineTo(Math.cos(theta)*outer*1.25,Math.sin(theta)*outer*.82);
        ctx.stroke();
      }
      ctx.fillStyle="#ffffff";
      const core=11*(1-progress)*hit.scale;
      ctx.globalAlpha=p;
      ctx.beginPath();ctx.ellipse(0,0,Math.max(0,core*1.6),Math.max(0,core),-.23,0,TAU);ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawCharge(fighter,ctx,time) {
    if(!fighter || (fighter.state!=="charge"&&fighter.energy<99.7))return;
    const charging=fighter.state==="charge";
    const wave=time*.001;
    const c=fighter.cpu?enemyRed:heroBlue;
    const x=fighter.x, y=fighter.y-103;
    const intensity=charging?1:.35;
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    const rad=charging?105:72;
    const light=ctx.createRadialGradient(x,y,10,x,y,rad);
    light.addColorStop(0,"rgba(206,249,255,"+(.19*intensity)+")");
    light.addColorStop(.5,"rgba(79,210,255,"+(.13*intensity)+")");
    light.addColorStop(1,"rgba(54,175,255,0)");
    ctx.fillStyle=light;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);
    ctx.lineWidth=charging?3:1.5;ctx.strokeStyle=c;
    ctx.globalAlpha=.5*intensity;
    ctx.beginPath();
    ctx.ellipse(x,y,50+8*Math.sin(wave*9),108+8*Math.sin(wave*7),0,0,TAU);
    ctx.stroke();
    if(charging){
      for(let i=0;i<12;i++){
        const phase=(i/12)*TAU+wave*2.8;
        const cy=y+Math.sin(phase)*99;
        const cx=x+Math.cos(phase)*48;
        ctx.strokeStyle=i%3===0?"#f2fdff":c;
        ctx.lineWidth=i%3===0?2.5:1.5;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.sin(phase)*12,cy-23);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawProjectileFX(ctx, projectile, x, y, time) {
    const cyan=projectile.owner?.cpu?enemyRed:heroBlue;
    const radius=projectile.radius||12;
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    ctx.translate(x,y);
    ctx.rotate(Math.atan2(projectile.vy||0,projectile.vx));
    const age=projectile.age||0;
    const tail=Math.min(projectile.kind==="spiritShotgun"?95:215,age*(Math.abs(projectile.vx)||850));
    const glow=ctx.createLinearGradient(-tail,0,radius,0);
    glow.addColorStop(0,"rgba(15,139,229,0)");
    glow.addColorStop(.45,projectile.owner?.cpu?"rgba(255,64,104,.33)":"rgba(40,196,255,.33)");
    glow.addColorStop(1,"#f7ffff");
    ctx.fillStyle=glow;
    ctx.beginPath();ctx.moveTo(-tail,0);
    ctx.quadraticCurveTo(-tail*.35,-radius*.95,radius,-radius*.72);
    ctx.lineTo(radius*1.6,0);
    ctx.lineTo(radius,radius*.72);
    ctx.quadraticCurveTo(-tail*.35,radius*.95,-tail,0);ctx.fill();
    ctx.fillStyle="#fff";ctx.shadowColor=cyan;ctx.shadowBlur=21;
    ctx.beginPath();ctx.ellipse(0,0,radius*1.3,radius*.55,0,0,TAU);ctx.fill();
    ctx.shadowBlur=0;
    ctx.globalAlpha=.65;
    for(let i=0;i<3;i++){
      const a=time*.01+i*TAU/3;
      const yy=Math.sin(a)*radius*1.4;
      ctx.strokeStyle=cyan;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-tail*.67,yy*.6);ctx.lineTo(radius*.1,yy);ctx.stroke();
    }
    ctx.restore();
  }

  return {drawArena,animBlend,poseTransform,drawCpuAccent,onHit,tick,drawEchoes,drawHits,drawCharge,drawProjectileFX,clamp,lerp};
})(window);
