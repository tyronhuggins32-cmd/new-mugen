/* Yusuke Directional V8.1: 32 supplementary, 1:1-source pixel-anime cels.
 * Reference goals: backward footwork, forward rush, aerial direction changes,
 * individual punch windup/contact/recovery and readable aerial strikes.
 * These are ORIGINAL-source-derived cels, not copied video images or thirty-two
 * independent hand drawings. The two static 8-frame premium PNGs stay primary.
 */
(function(root){
 "use strict";
 const FPS=40,CELL=512,COLS=4,ROWS=4;
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 // movement atlas: 3 advance, 3 retreat, 2 rush, 2 directional air, 2 low/reset,
 // plus 2 fast backsteps, 1 pivot and 1 planted landing pose.
 const movement=Object.freeze([
  {src:1,lean:7,twist:3,lift:1},{src:2,lean:13,twist:5,lift:-2},
  {src:1,lean:4,twist:-2,lift:0},{src:2,lean:-12,twist:-4,lift:0},
  {src:1,lean:-17,twist:3,lift:-1},{src:2,lean:-8,twist:-2,lift:1},
  {src:3,lean:18,twist:7,lift:0},{src:4,lean:24,twist:9,lift:-3},
  {src:5,lean:12,twist:5,lift:-5},{src:6,lean:-13,twist:-3,lift:-2},
  {src:7,lean:-7,twist:3,lift:1},{src:0,lean:-10,twist:-5,lift:0},
  {src:2,lean:-23,twist:-10,lift:-3},{src:1,lean:-17,twist:-8,lift:-1},
  {src:0,lean:-13,twist:7,lift:0},{src:7,lean:-5,twist:-3,lift:3}
 ]);
 // combat atlas: jab/cross/body/uppercut, air follow-up, recoil/recovery,
 // plus 2 heavy-charge/contact poses, 1 defensive parry and 1 follow-through.
 const combat=Object.freeze([
  {src:0,lean:-12,twist:-7,lift:0},{src:1,lean:19,twist:9,lift:-1},
  {src:2,lean:-8,twist:-6,lift:0},{src:2,lean:25,twist:11,lift:-1},
  {src:3,lean:14,twist:8,lift:3},{src:4,lean:-9,twist:11,lift:4},
  {src:4,lean:18,twist:-10,lift:-8},{src:7,lean:10,twist:5,lift:-6},
  {src:7,lean:23,twist:10,lift:-9},{src:4,lean:20,twist:8,lift:0},
  {src:7,lean:25,twist:-8,lift:-10},{src:5,lean:-15,twist:-9,lift:2},
  {src:0,lean:-20,twist:-11,lift:0},{src:4,lean:27,twist:13,lift:-2},
  {src:0,lean:-8,twist:-6,lift:0},{src:5,lean:-5,twist:-4,lift:2}
 ]);
 const layouts=Object.freeze({movement,combat});
 function compose(part,image,meta) {
  if(!image || !image.naturalWidth || !meta?.frames?.length ||
    !meta.frames.every(f=>f.w>0&&f.h>0&&f.w<=470&&f.h<=458))return null;
  const source=layouts[part];
  const canvas=document.createElement("canvas");
  canvas.width=CELL*COLS;canvas.height=CELL*ROWS;
  const ctx=canvas.getContext("2d",{alpha:true});
  if(!ctx)return null;
  ctx.imageSmoothingEnabled=false;
  const frames=[];
  for(let i=0;i<source.length;i++){
   const spec=source[i],base=meta.frames[spec.src];
   if(!base || base.w>470 || base.h>458) return null;
   const x=(i%COLS)*CELL,y=Math.floor(i/COLS)*CELL;
   const origin=Math.floor((CELL-base.w)/2);
   const fy=y+CELL-base.h;
   // Composite each source sprite ONCE, without chopping limbs into
   // ten offset strips. Those slice boundaries created white seams,
   // detached wrists and visibly changing silhouettes during attacks.
   // A very small shear around the original foot pivot preserves all source
   // pixels and keeps animation variants seamless at 40 sample FPS.
   const shear=-(spec.lean+spec.twist*.45)/base.h;
   const rise=Math.min(0,spec.lift);
   ctx.save();
   ctx.translate(x+origin+base.ax,y+CELL);
   ctx.transform(1,0,shear,1,0,0);
   ctx.drawImage(image,base.x,base.y,base.w,base.h,
     -base.ax,-base.h+rise,base.w,base.h);
   ctx.restore();
   frames.push({x,y:y+32,w:CELL,h:CELL-32,ax:origin+base.ax});
  }
  return {image:canvas,frames,scale:meta.scale,part};
 }
 function build(meta,images){
  if(typeof document==="undefined" || !document.createElement ||
    !images?.movement?.naturalWidth || !images?.combat?.naturalWidth ||
    meta?.movement?.scale!==.5 || meta?.combat?.scale!==.5)return null;
  try{
   const moved=compose("movement",images.movement,meta.movement);
   const striking=compose("combat",images.combat,meta.combat);
   return moved&&striking?{movement:moved,combat:striking,frameCount:32,fps:FPS}:null;
  }catch(e){return null;}
 }
 const frameAt=(keys,time,rate=FPS)=>keys[Math.floor(Math.max(0,time)*rate)%keys.length];
 const phase=(p,wind,release,k0,k1)=>p<wind?k0:p<release?k1:15;
 function choosePose(fighter,attack,atlas,progress=0) {
  if(!fighter || !atlas?.movement?.image || !atlas?.combat?.image)return null;
  const grounded=Boolean(fighter.grounded);
  const t=Math.max(0,fighter.stateTime||0);
  const relative=(fighter.vx||0)*(fighter.facing||1);
  const p=clamp(progress);
  let part="movement",clip,index;
  if(attack){
   part="combat";
   if(!grounded && ["light","cross","body","upper","heavy","powerKick"].includes(attack)){
    clip="airStrike";index=phase(p,.19,.83,7,8);
   }else{
    switch(attack){
     case "light":clip="jab";index=phase(p,.2,.83,0,1);break;
     case "cross":clip="cross";index=phase(p,.19,.84,2,3);break;
     case "body":clip="body";index=phase(p,.16,.82,4,4);break;
     case "upper":clip="upper";index=phase(p,.18,.83,5,6);break;
     case "heavy":clip="heavy";index=phase(p,.2,.84,12,13);break;
     case "powerKick":clip="finisher";index=phase(p,.2,.85,9,10);break;
     // Spirit Gun, fist-fired Shotgun and their canonical VFX stay untouched.
     default:return null;
    }
   }
  }else if(fighter.state==="hit"){
   clip=fighter.hitReaction==="knockback"?"knockback":"stagger";
   part="combat";index=fighter.hitReaction==="knockback"?15:11;
  }else if(fighter.state==="block"){
   clip="guard";part="combat";index=14;
  }else if(fighter.state==="crouch"){
   clip="lowGuard";index=frameAt([10,11],t,9);
  }else if(!grounded || fighter.state==="jump"){
   if(Math.abs(relative)<45)return null; // use the premium vertical jump
   clip=relative>0?"aerialForward":"aerialBack";
   index=relative>0?8:9;
  }else if((fighter.dashTimer||0)>0 && fighter.state==="walk"){
   clip=relative>=0?"rush":"backdash";
   index=frameAt(relative>=0?[6,7,7,6]:[12,13,13,12],t,20);
  }else if(fighter.state==="walk" && Math.abs(relative)>35){
   clip=relative>0?"advance":"retreat";
   index=frameAt(relative>0?[0,1,2,1]:[3,4,5,4],t,12);
  }else if(fighter.state==="walk" && (fighter.turnTimer||0)>0){
   clip="pivot";index=14;
  }else if(fighter.state==="idle" && t<.18 &&
    /^aerial/.test(fighter._directionalSprite?.clip||"")){
   clip="landing";index=15;
  }else{return null;}
  const atlasSheet=atlas[part],frame=atlasSheet.frames[index];
  if(!frame)return null;
  const memo=fighter._directionalSprite || (fighter._directionalSprite={
   clip:null,frame:null,image:null,started:0,from:null,fromImage:null
  });
  if(memo.clip!==clip){
   memo.from=memo.frame;memo.fromImage=memo.image;
   memo.clip=clip;memo.started=t;
  }
  const mix=clamp((t-memo.started)/.075);
  const previous=mix<.95 ? memo.from : null;
  const previousImage=previous?memo.fromImage:null;
  memo.frame=frame;memo.image=atlasSheet.image;
  return {frame,image:atlasSheet.image,scale:atlasSheet.scale,source:"directional",
   part,index,clip,frames:atlasSheet.frames,
   transitionFrame:previous,transitionImage:previousImage,transitionMix:mix};
 }
 // Lightweight world-space speed streaks and wind-up accents influenced by
 // the reference video's rapid aerial rushes and combo pacing. No collision,
 // projectile or energy changes; all effects are stateless and bounded.
 function drawBehind(game,ctx,time){
  if(!game?.player || !game?.cpu)return;
  const q=root.MugenFluid?.getStats?.(game)?.quality??1;
  ctx.save();
  for(const f of [game.player,game.cpu]){
   const speed=Math.abs(f.vx||0);
   const active=(f.dashTimer||0)>0 || (f.state==="walk"&&speed>310) ||
     (!f.grounded && speed>210);
   if(!active)continue;
   const dir=Math.sign(f.vx||f.facing||1);
   const color=f.cpu?"#ff759d":"#8dfaff";
   const length=clamp(speed*.13,40,130);
   const count=q<.6?2:5;
   ctx.strokeStyle=color;ctx.lineCap="round";
   for(let i=0;i<count;i++){
    const row=i*24+(Math.sin(time*.016+i)*7);
    ctx.globalAlpha=.29*(1-i/count);
    ctx.lineWidth=1+i%2;
    const x=f.x-dir*(36+i*7);
    const y=f.y-36-row;
    ctx.beginPath();
    ctx.moveTo(x,y);ctx.lineTo(x-dir*length*(1-i*.1),y+(i%2?4:-4));
    ctx.stroke();
   }
  }
  ctx.restore();
 }
 function drawFront(game,ctx,time){
  if(!game?.player || !game?.cpu)return;
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(const f of [game.player,game.cpu]){
   const attack=f.currentAttack?.();
   if(!["light","cross","body","upper","powerKick"].includes(attack))continue;
   const duration=attack==="light"?.19:attack==="cross"?.25:attack==="body"?.29:attack==="upper"?.39:.47;
   const p=clamp((f.stateTime||0)/duration);
   if(p<.16||p>.87)continue;
   const force=Math.sin((p-.16)/.71*Math.PI);
   if(force<=0)continue;
   ctx.save();
   ctx.translate(f.x,f.y);
   ctx.scale(f.facing||1,1);
   ctx.globalAlpha=force*.38;
   ctx.strokeStyle=f.cpu?"#ff9abc":"#affbff";
   ctx.lineWidth=attack==="upper"||attack==="powerKick"?5:3;
   ctx.lineCap="round";
   const upper=attack==="upper", low=attack==="body";
   const centerY=upper?-155:low?-77:-128;
   const range=attack==="powerKick"?158:attack==="cross"?136:118;
   ctx.beginPath();
   if(upper){
    ctx.moveTo(24,-96);ctx.quadraticCurveTo(101,-136,90,-224);
   }else{
    ctx.moveTo(20,centerY+16);
    ctx.quadraticCurveTo(range*.61,centerY-27,range,centerY-5);
   }
   ctx.stroke();
   if(attack==="powerKick"||upper){
    ctx.globalAlpha=force*.18;
    ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(48,-130,77,-1.1,.62);ctx.stroke();
   }
   ctx.restore();
  }
  ctx.restore();
 }
 root.MugenDirectional=Object.freeze({fps:FPS,layouts,build,choosePose,drawBehind,drawFront});
})(typeof window==="undefined"?globalThis:window);
