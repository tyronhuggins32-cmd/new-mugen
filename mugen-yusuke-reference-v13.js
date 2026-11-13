/* Yusuke Reference Combat V13
 * Six ORIGINAL Yusuke attacks choreographed from the uploaded MUGEN fight's
 * rhythmic rushes, launchers, aerial chases and dark-screen finisher.
 * No keyboard/gamepad bindings. The creator assigns those separately.
 * Uses intact alpha-cleaned premium source paintings, 8 poses per attack.
 * All hit timing is fixed-step; visual trails do not cause damage.
 */
(function(root){
 "use strict";
 const CELL=512,COLUMNS=6,ROWS=8;
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const K=(part,src,lean=0,twist=0,lift=0,sx=1,sy=1)=>
   Object.freeze({part,src,lean,twist,lift,sx,sy});
 const M="movement",C="combat";
 const H=(at,damage,range,knockback=105,hitstun=.19,heavy=false,launchVelocity=null)=>
   Object.freeze({at,damage,range,knockback,hitstun,heavy,launchVelocity});
 const moves=Object.freeze({
  flashRush:Object.freeze({
   title:"Spirit Flash Rush",description:"Five close strikes with blue flashsteps.",
   duration:.74,cost:0,airOnly:false,cinematic:false,rush:1060,bound:false,
   hits:Object.freeze([H(.17,18,210),H(.265,18,210),H(.36,21,215),H(.455,22,220),H(.57,34,230,285,.31,true)]),
   cels:Object.freeze([K(M,0),K(M,3,18,7,-1),K(M,4,25,9,-3),K(C,0,-10,-6),
    K(C,1,18,8,-2),K(C,2,24,9,-2),K(C,5,-8,-3),K(M,0)])
  }),
  risingBreaker:Object.freeze({
   title:"Rising Breaker",description:"A heavy rising uppercut that launches the target for pursuit.",
   duration:.68,cost:0,airOnly:false,cinematic:false,rush:260,bound:false,
   hits:Object.freeze([H(.33,65,194,160,.52,true,-675)]),
   cels:Object.freeze([K(M,0),K(C,3,-20,-10,0,.97,.95),K(C,3,-11,-5),
    K(C,4,9,6,-4),K(C,4,23,12,-12,1.035,1.02),
    K(C,7,16,9,-9),K(C,5,-9,-4),K(M,0)])
  }),
  skyPursuit:Object.freeze({
   title:"Sky Pursuit",description:"Four airborne attacks that follow an opponent upward.",
   duration:.88,cost:0,airOnly:true,cinematic:false,rush:690,bound:false,
   hits:Object.freeze([H(.20,24,208,80,.22),H(.34,26,210,60,.24),
    H(.48,28,220,80,.25),H(.66,47,230,360,.39,true,125)]),
   cels:Object.freeze([K(M,5),K(M,6,14,7,-6),K(C,7,19,10,-7),
    K(C,7,-10,-7,-5),K(C,4,21,12,-8),K(C,7,23,10,-10),
    K(C,5,-11,-5,-3),K(M,6,-4,-3)])
  }),
  spiritCyclone:Object.freeze({
   title:"Spirit Cyclone",description:"Four rotating strikes inside a tightly controlled spirit arc.",
   duration:.86,cost:15,airOnly:false,cinematic:false,rush:520,bound:false,
   hits:Object.freeze([H(.22,25,195),H(.35,25,205),H(.49,26,205),
    H(.64,47,230,420,.36,true,-275)]),
   cels:Object.freeze([K(M,0),K(C,2,-18,-9),K(C,7,18,8,-3),
    K(C,4,25,12,-4),K(C,7,-20,-11,-3),K(C,2,-6,-3),
    K(C,5,17,8),K(M,0)])
  }),
  spiritVoid:Object.freeze({
   title:"Spirit Void",description:"A darkened cinematic charge into a controlled fifteen-hit spirit barrage.",
   duration:2.16,cost:65,airOnly:false,cinematic:true,rush:80,bound:false,
   // Fourteen rapid energy contacts followed by one decisive impact. Every
   // count is an actual damage call, not simulated spark/particle contacts.
   hits:Object.freeze([
    ...Array.from({length:14},(_,i)=>H(1.055+i*.057,18,910,0,.28)),
    H(1.92,72,910,710,.54,true,-320)
   ]),
   cels:Object.freeze([K(M,0),K(C,6,-13,-6),K(C,6,-22,-12,-2),
    K(C,6,-7,-3,-4),K(C,7,12,6,-5),K(C,7,22,10,-7),
    K(C,7,18,8,-7),K(M,0)])
  }),
  meteorFinish:Object.freeze({
   title:"Meteor Finish",description:"A descending strike with ground impact and wide knockback.",
   duration:.76,cost:0,airOnly:false,cinematic:false,rush:560,bound:false,
   hits:Object.freeze([H(.42,76,222,890,.53,true,185)]),
   cels:Object.freeze([K(M,0),K(C,4,-17,-8),K(C,7,-15,-7,-8),
    K(C,7,9,6,-13),K(C,7,25,11,-8),K(C,4,19,7),
    K(C,5,-10,-5),K(M,0)])
  })
 });
 const ids=Object.keys(moves);
 const states=new WeakMap();
 const state=game=>{
   let s=states.get(game);
   if(!s){s={fighters:new WeakMap(),active:[],events:[]};states.set(game,s);}
   return s;
 };
 function reset(game){if(game)states.delete(game);}
 function isMove(name){return typeof name==="string"&&Object.prototype.hasOwnProperty.call(moves,name);}
 function extendAttacks(original){
  const extra={};
  for(const [id,move] of Object.entries(moves)){
   const legacy=id==="risingBreaker"?"upper":"light";
   extra[id]=Object.freeze({
    duration:move.duration,activeStart:0,activeEnd:0,
    damage:0,range:move.hits.at(-1).range,height:180,
    knockback:0,hitstun:0,energyGain:0,cost:move.cost,
    animation:legacy,airAnimation:"airKick",
    referenceAttack:true
   });
  }
  return Object.freeze({...original,...extra});
 }
 function build(meta,images){
  if(typeof document==="undefined"||!document.createElement||
   !images?.movement||!images?.combat||meta?.combat?.scale!==.5 ||
   meta?.movement?.scale!==.5)return null;
  try{
   const canvas=document.createElement("canvas");
   canvas.width=CELL*COLUMNS;canvas.height=CELL*ROWS;
   const ctx=canvas.getContext("2d",{alpha:true});
   if(!ctx)return null;
   ctx.imageSmoothingEnabled=false;
   const frames=[];
   for(const [moveId,move] of Object.entries(moves)){
    for(const cel of move.cels){
     const part=meta[cel.part],source=images[cel.part];
     const frame=part?.frames?.[cel.src];
     if(!frame || !source || frame.w>CELL-38 || frame.h>CELL-38)return null;
     const i=frames.length,x=(i%COLUMNS)*CELL,y=Math.floor(i/COLUMNS)*CELL;
     const origin=Math.floor((CELL-frame.w)/2);
     const shear=-(cel.lean+cel.twist*.45)/frame.h;
     ctx.save();ctx.translate(x+origin+frame.ax,y+CELL);
     ctx.transform(cel.sx,0,shear,cel.sy,0,0);
     ctx.drawImage(source,frame.x,frame.y,frame.w,frame.h,
      -frame.ax,-frame.h+Math.min(0,cel.lift),frame.w,frame.h);
     ctx.restore();
     frames.push(Object.freeze({x,y:y+32,w:CELL,h:CELL-32,ax:origin+frame.ax,
       move:moveId,source:cel.part}));
    }
   }
   return Object.freeze({image:canvas,frames,scale:.5,columns:COLUMNS,
    frameCount:frames.length});
  }catch(_){return null;}
 }
 function choosePose(fighter,id,atlas,progress=0){
  if(!isMove(id)||!fighter||!atlas?.image||!atlas.frames)return null;
  const p=clamp(progress),offset=ids.indexOf(id)*8,
    i=Math.min(7,Math.floor(p*8)),index=offset+i,
    cel=moves[id].cels[i],next=moves[id].cels[Math.min(7,i+1)],
    raw=clamp(p*8-i),ease=raw*raw*(3-2*raw);
  const frame=atlas.frames[index];
  if(!frame)return null;
  return {frame,image:atlas.image,scale:atlas.scale,part:"reference",
   index,clip:id,frames:atlas.frames,transitionFrame:null,motion:{
    tilt:clamp((next.lean-cel.lean)*ease/550,-.05,.05),
    stretchX:1+(next.sx-cel.sx)*ease,
    stretchY:1+(next.sy-cel.sy)*ease,
    lift:(next.lift-cel.lift)*ease
   }};
 }
 function trigger(game,name,fighter){
  const move=moves[name],actor=fighter||game?.player;
  if(!move||!game||game.state!=="play"||game.paused||!actor||
    actor.currentAttack?.()||actor.state==="hit"||actor.hitstun>0||
    actor.energy<move.cost||(move.airOnly&&actor.grounded))return false;
  const ok=actor.beginAttack?.(name,actor.energy);
  if(!ok)return false;
  // Expose the selected preview immediately; fixed-step tick owns all
  // timed damage events and can still reset this on the next frame.
  const s=state(game),target=actor===game.player?game.cpu:game.player;
  s.active=[{actor,target,id:name,move,progress:0}];
  return true;
 }
 function withinReach(actor,target,hit){
  if(!actor||!target||target.health<=0)return false;
  const dir=actor.facing<0?-1:1;
  const forward=(target.x-actor.x)*dir;
  const vertical=Math.abs((target.y||0)-(actor.y||0));
  return forward>=22&&forward<=hit.range&&vertical<=255;
 }
 function drive(actor,target,move,dt,arena){
  if(!move.rush||!actor||!target)return;
  const dir=actor.facing<0?-1:1,
    gap=(target.x-actor.x)*dir,
    room=gap-156;
  if(room<=0)return;
  const maxStep=clamp(dt,0,.06)*move.rush,
    step=Math.min(room,maxStep);
  const left=arena?.left??0,right=arena?.right??2600;
  actor.x=clamp(actor.x+dir*step,left,right);
 }
 function tick(game,dt){
  if(!game||game.paused||game.state!=="play")return;
  const s=state(game);
  s.active.length=0;
  for(const actor of [game.player,game.cpu]){
   if(!actor)continue;
   const id=actor.currentAttack?.();
   const move=moves[id];
   if(!move)continue;
   if(actor.stateTime>=move.duration)continue;
   const target=actor===game.player?game.cpu:game.player;
   let memo=s.fighters.get(actor);
   if(!memo||memo.name!==id||actor.stateTime<memo.previous-.01){
    memo={name:id,index:0,previous:0,created:0,connected:0};
    s.fighters.set(actor,memo);
   }
   if(move.rush&&!move.cinematic)
    drive(actor,target,move,dt,game.arena);
   memo.previous=actor.stateTime;
   s.active.push({actor,target,id,move,progress:clamp(actor.stateTime/move.duration),count:memo.connected});
   while(memo.index<move.hits.length && actor.stateTime>=move.hits[memo.index].at){
    const hit=move.hits[memo.index++];
    if(!withinReach(actor,target,hit))continue;
    const face=actor.facing<0?-1:1;
    const impactX=target.x-face*30,impactY=target.y-118;
    const attack={
      facing:face,damage:hit.damage,knockback:hit.knockback,
      knockbackDrag:move.cinematic?1.3:2.2,
      hitstun:hit.hitstun,heavyImpact:hit.heavy,
      launchVelocity:hit.launchVelocity??undefined,energyGain:0,
      referenceHit:true
    };
    game.damageFighter?.(actor,target,attack,impactX,impactY);
    memo.connected++;
    s.active[s.active.length-1].count=memo.connected;
    s.events.push({name:id,x:impactX,y:impactY,age:0,
      life:hit.heavy?.26:.14,dir:face,heavy:hit.heavy});
    if(s.events.length>20)s.events.splice(0,s.events.length-20);
   }
  }
  for(const e of s.events)e.age+=Math.max(0,Math.min(.065,dt||0));
  s.events=s.events.filter(e=>e.age<e.life);
 }
 function drawBehind(game,ctx,time){
  if(!ctx||!game)return;
  const s=state(game);
  if(!s.active.length)return;
  ctx.save();
  for(const v of s.active){
   const {actor,move,id,progress:p}=v,dir=actor.facing||1;
   if(move.cinematic){
    // Darken the arena rather than drawing a giant replacement Yusuke.
    const w=game.arena?.width||2600,h=game.arena?.height||760;
    ctx.fillStyle="rgba(2,7,29,"+(.20+.36*Math.sin(Math.PI*p)).toFixed(3)+")";
    ctx.fillRect(0,0,w,h);
   }
   if(id==="flashRush"||id==="skyPursuit"||id==="spiritCyclone"){
    const n=id==="flashRush"?6:4;
    ctx.lineCap="round";
    for(let i=0;i<n;i++){
     const offset=17+i*14,span=48+i*15;
     ctx.globalAlpha=(1-p)*(.20-i*.022)+.04;
     ctx.strokeStyle=actor.cpu?"#ff849e":"#64dcff";
     ctx.lineWidth=1+i%2;
     const xx=actor.x-dir*offset,yy=actor.y-66-i*23;
     ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx-dir*span,yy-5+(i%2)*9);ctx.stroke();
    }
   }
  }
  ctx.restore();
 }
 function drawFront(game,ctx,time){
  if(!ctx||!game)return;
  const s=state(game);
  if(!s.active.length&&!s.events.length)return;
  ctx.save();
  for(const v of s.active){
   if(v.id!=="spiritVoid")continue;
   const {actor,target,progress:p}=v,dir=actor.facing||1;
   const originX=actor.x+dir*72,originY=actor.y-145;
   if(p<.49){
    const charge=clamp(p/.49),radius=18+75*charge;
    ctx.globalAlpha=.2+.5*charge;
    ctx.strokeStyle="#93edff";ctx.lineWidth=2+4*charge;
    ctx.beginPath();ctx.arc(originX,originY,radius,0,Math.PI*2);ctx.stroke();
   }else{
    const beamLength=Math.max(0,Math.min(790,Math.abs(target.x-originX)));
    const fade=Math.min(1,(p-.49)*18)*Math.min(1,(1-p)*15);
    const beam=ctx.createLinearGradient(originX,originY-32,originX,originY+32);
    beam.addColorStop(0,"rgba(23,143,255,0)");
    beam.addColorStop(.35,"rgba(58,210,255,.65)");
    beam.addColorStop(.5,"rgba(236,255,255,.95)");
    beam.addColorStop(.65,"rgba(58,210,255,.65)");
    beam.addColorStop(1,"rgba(23,143,255,0)");
    ctx.globalAlpha=.88*fade;ctx.fillStyle=beam;
    ctx.fillRect(dir>0?originX:originX-beamLength,originY-36,beamLength,72);
   }
   if(v.count>0){
    // A reference-style hit counter tied to real registered contacts.
    // The original Square COMBO 5 gate and meter are not modified.
    ctx.globalAlpha=.98;
    ctx.font="italic 900 27px Impact, sans-serif";
    ctx.fillStyle="#fff2bf";
    ctx.fillText(v.count+" HITS",actor.x-dir*122,actor.y-235);
   }
  }
  ctx.restore();
 }
 function stats(game){
  const s=state(game);return {active:s.active.length>0,
   move:s.active[0]?.id||null,events:s.events.length,available:ids.slice(),mapped:0};
 }
 root.MugenReferenceV13=Object.freeze({
  moves,isMove,extendAttacks,build,choosePose,trigger,tick,reset,
  drawBehind,drawFront,stats
 });
})(typeof window==="undefined"?globalThis:window);
