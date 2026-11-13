/* New Mugen V8 effect art. The visuals are actual transparent PNG sprite
 * textures, not approximated rings, gradients or fake particles. Game hitboxes
 * and damage stay entirely in ArcadeFight.
 */
(function(root){
  "use strict";
  const CELL_W=384, CELL_H=512, COLS=4;
  const TYPES=Object.freeze({
    charge:0,shot:1,blast:2,shotgun:3,punch:4,slash:5,dust:6,ring:7
  });
  const FX_TIME=Object.freeze({
    punch:.16,heavy:.25,blast:.24,shotgun:.26,charge:.20,
    slash:.18,ring:.18,dust:.26
  });
  const instances=new WeakMap();
  const image=(typeof Image==="function"?new Image():null);
  let ready=false;
  if(image){
    image.decoding="async";
    image.onload=()=>{ready=image.naturalWidth===1536&&image.naturalHeight===1024;};
    image.onerror=()=>{ready=false;};
    image.src="characters/yusuke/yusuke-spirit-vfx-v8.png";
  }
  function holder(game){
    let s=instances.get(game);
    if(!s){s={fx:[],ground:new WeakMap(),shots:0};instances.set(game,s);}
    return s;
  }
  function reset(game){instances.delete(game);}
  function append(game,kind,x,y,opts={}){
    if(!game||!TYPES.hasOwnProperty(kind))return;
    const s=holder(game),length=FX_TIME[kind]||.27;
    s.fx.push({kind,x,y,direction:opts.direction||1,cpu:!!opts.cpu,
      age:0,length,scale:opts.scale||1});
    if(s.fx.length>16)s.fx.splice(0,s.fx.length-16);
  }
  function onHit(game,attacker,defender,attack,blocked,x,y){
    if(!game||!attacker)return;
    // Existing Square strikes still wait for COMBO 5. Unbound reference
    // specials have authored impact VFX immediately when explicitly invoked.
    if(!attack?.referenceHit && root.MugenComboFX &&
      !root.MugenComboFX.allows(attacker))return;
    const heavy=!!attack?.heavyImpact && !blocked;
    // Three readable categories, centered at the collision coordinate.
    // Guard overrides attack strength; one primary effect per connected hit.
    const kind=blocked?"ring":heavy?"blast":"punch";
    append(game,kind,x,y,{
      direction:attacker.facing,cpu:attacker.cpu,
      scale:blocked?.72:heavy?1.06:.84
    });
    // A restrained one-time directional accent for heavy contact only.
    if(heavy)append(game,"slash",x-(attacker.facing||1)*9,y+2,{
      direction:attacker.facing,cpu:attacker.cpu,scale:.64
    });
  }
  function onShot(game,owner,x,y,shotgun=false){
    append(game,shotgun?"shotgun":"charge",x,y,
      {direction:owner?.facing,cpu:owner?.cpu,scale:shotgun?1:1.1});
    holder(game).shots++;
  }
  function onImpact(game,owner,x,y,blocked=false){
    append(game,blocked?"ring":"blast",x,y,
      {direction:owner?.facing,cpu:owner?.cpu,scale:blocked?.7:1.06});
  }
  function tick(game,dt){
    if(!game||game.paused)return;
    const s=holder(game),delta=Math.max(0,Math.min(.075,Number(dt)||0));
    for(const item of s.fx)item.age+=delta;
    s.fx=s.fx.filter(e=>e.age<e.length);
    for(const fighter of [game.player,game.cpu]){
      if(!fighter)continue;
      const prior=s.ground.get(fighter);
      if(prior===false && fighter.grounded){
        append(game,"dust",fighter.x,fighter.y+2,{
          direction:fighter.facing,cpu:fighter.cpu,scale:.78
        });
      }
      s.ground.set(fighter,!!fighter.grounded);
    }
  }
  function paint(ctx,idx,x,y,direction,w,h,opacity=1){
    if(!ready||!ctx||!image||opacity<=0)return false;
    const c=idx%4,r=Math.floor(idx/4);
    ctx.save();
    ctx.globalAlpha=Math.max(0,Math.min(1,opacity));
    // Effects are drawn with source-over to preserve their authored color.
    // Existing glow layers in PNG provide brightness without global bloom.
    ctx.translate(x,y);
    if(direction<0)ctx.scale(-1,1);
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";
    ctx.drawImage(image,c*CELL_W,r*CELL_H,CELL_W,CELL_H,
      -w/2,-h/2,w,h);
    ctx.restore();
    return true;
  }
  function drawLayer(game,ctx,foreground=true){
    if(!ready||!game)return;
    for(const e of holder(game).fx){
      const isDust=e.kind==="dust";
      if(foreground===isDust)continue;
      const t=Math.min(1,e.age/e.length);
      let w,h;
      switch(e.kind){
        case "shotgun":w=270;h=165;break;
        case "charge":w=105;h=110;break;
        case "slash":w=170;h=200;break;
        case "punch":w=130;h=140;break;
        case "blast":w=215;h=205;break;
        case "ring":w=190;h=180;break;
        default:w=150;h=100;break;
      }
      const growth=1+(e.kind==="blast"?.19:.1)*t;
      const fade=(1-t)**(isDust?1.9:1.55);
      const y=e.y+(isDust?5:0);
      paint(ctx,TYPES[e.kind],e.x,y,e.direction,
        w*e.scale*growth,h*e.scale*growth,fade);
    }
  }
  function drawBehind(game,ctx){drawLayer(game,ctx,false);}
  function drawFront(game,ctx){drawLayer(game,ctx,true);}
  function drawProjectile(ctx,projectile,x,y){
    if(!ready||projectile.kind!=="spiritGun")return false;
    const direction=projectile.vx<0?-1:1;
    return paint(ctx,TYPES.shot,x,y,direction,115,74,.96);
  }
  function drawWindup(game,ctx){
    if(!ready)return;
    for(const fighter of [game?.player,game?.cpu]){
      if(!fighter)continue;
      const attack=fighter.currentAttack?.();
      if(attack!=="gun"&&attack!=="shotgun")continue;
      const age=fighter.stateTime||0;
      const duration=attack==="shotgun"?.26:.30;
      if(age<0||age>=duration)continue;
      const t=age/duration,dir=fighter.facing||1;
      paint(ctx,0,fighter.x+dir*(attack==="gun"?84:68),
        fighter.y-(attack==="gun"?158:132),dir,
        45+78*t,55+84*t,Math.min(.91,.18+.7*t));
    }
  }
  root.MugenVfxV8=Object.freeze({
    ready:()=>ready,reset,onHit,onShot,onImpact,tick,
    drawBehind,drawFront,drawWindup,drawProjectile,
    stats(game){const s=holder(game);return {active:s.fx.length,shots:s.shots,loaded:ready};}
  });
})(typeof window==="undefined"?globalThis:window);
