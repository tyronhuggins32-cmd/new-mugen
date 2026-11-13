"use strict";
// Regression and real-pose coverage for source-matched high-resolution direction/combat cels.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const script=fs.readFileSync("yusuke-directional-v8.js","utf8");
const root={};vm.runInNewContext(script,{window:root,document:undefined,Math});
const director=root.MugenDirectional;
assert.ok(director,"directional atlas module should load");
assert.equal(director.fps,40);
assert.equal(director.layouts.movement.length,16);
assert.equal(director.layouts.combat.length,32);
assert.ok(director.squareFrame && director.square);
const meta=JSON.parse(fs.readFileSync("characters/yusuke/premium-atlas.json","utf8"));
const draws=[],allocated=[];
const document={createElement(tag){
 assert.equal(tag,"canvas");
 const canvas={width:0,height:0,getContext(type){
  assert.equal(type,"2d");
  return {imageSmoothingEnabled:true,save(){},restore(){},
    translate(){},transform(){},drawImage(...args){draws.push(args);}};
 }};
 allocated.push(canvas);return canvas;
}};
const w={};
vm.runInNewContext(script,{window:w,document,Math});
const images={movement:{naturalWidth:2048,width:2048},combat:{naturalWidth:2048,width:2048}};
const atlas=w.MugenDirectional.build(meta,images);
assert.ok(atlas);
assert.equal(allocated.length,2,"movement and combat textures built once");
for(const part of ["movement","combat"]){
 const sheet=atlas[part];
 assert.equal(sheet.image.width,2048);
 assert.equal(sheet.image.height,part==="combat"?4096:2048);
 assert.equal(sheet.frames.length,part==="combat"?32:16);
 assert.equal(sheet.scale,.5);
 for(const f of sheet.frames){
  assert.ok(f.x>=0&&f.y>=0&&f.w>0&&f.h>0&&
    f.x+f.w<=2048&&f.y+f.h<=(part==="combat"?4096:2048));
  assert.ok(f.ax>=0&&f.ax<=f.w);
 }
}
assert.equal(draws.length,48,"all 48 movement/combat cels preserve the whole premium fighter silhouette");
assert.ok(draws.every(args=>args.length===9),
  "no partial sprite-strip cropping is allowed: it creates white seams");
assert.ok(draws.every(args=>images.movement===args[0]||images.combat===args[0]));
const fighter={facing:1,state:"walk",grounded:true,vx:275,vy:0,stateTime:.13,dashTimer:0,currentAttack(){return null;}};
const choose=(type,p=.5)=>director.choosePose(fighter,type,atlas,p);
let pose=choose(null);
assert.equal(pose.part,"movement");assert.equal(pose.clip,"advance");
assert.ok(pose.index>=0&&pose.index<3);
fighter.vx=-170;fighter.stateTime=.23;
pose=choose(null);
assert.equal(pose.clip,"retreat");assert.ok(pose.index>=3&&pose.index<6);
fighter.facing=-1;fighter.vx=180;fighter.stateTime=.31;
pose=choose(null);
assert.equal(pose.clip,"retreat","left-facing backpedal uses mirrored retreat art");
fighter.facing=1;
fighter.dashTimer=.1;fighter.vx=990;fighter.stateTime=.02;
pose=choose(null);assert.equal(pose.clip,"rush");
fighter.vx=-815;fighter.stateTime=.06;
pose=choose(null);assert.equal(pose.clip,"backdash");
assert.ok(pose.index===12 || pose.index===13,"backdash selects its own poses");
fighter.facing=-1;fighter.vx=815;fighter.stateTime=.08;
pose=choose(null);assert.equal(pose.clip,"backdash","backdash mirrors for left-facing Yusuke");
fighter.facing=1;
fighter.dashTimer=0;fighter.grounded=false;fighter.state="jump";fighter.vx=280;fighter.vy=-140;
pose=choose(null);assert.equal(pose.clip,"aerialForward");
fighter.vx=-240;fighter.vy=185;
pose=choose(null);assert.equal(pose.clip,"aerialBack");
fighter.state="attack-light";fighter.stateTime=.16;
pose=choose("light",.55);assert.equal(pose.part,"combat");assert.equal(pose.clip,"airStrike");
fighter.grounded=true;fighter.state="attack-cross";fighter.stateTime=.05;
pose=choose("cross",.45);assert.equal(pose.clip,"cross");
fighter.state="attack-upper";
pose=choose("upper",.58);assert.equal(pose.clip,"upper");
// Confirm every Square action now plays FOUR different full-body cels,
 // not the one-to-two-key slideshow that used to skip entire phases.
for(const [attack,start] of [["light",16],["cross",20],["body",24],["upper",28]]){
 const observed=[.04,.22,.45,.86].map(p=>{
   fighter.grounded=true;fighter.state="attack-"+attack;fighter.stateTime=p*.29;
   const selected=choose(attack,p);
   assert.equal(selected.part,"combat");
   assert.equal(selected.image,atlas.combat.image);
   assert.equal(selected.transitionFrame,null,"Square attacks must never ghost two full-body images");
   assert.ok(Number.isFinite(selected.motion.forward));
   return selected.index;
 });
 assert.deepEqual(observed,[start,start+1,start+2,start+3],
   attack+" must show its own anticipation, acceleration, contact and recovery");
 assert.ok(Math.abs(director.squareFrame(attack,0).motion.forward)<.001);
 assert.ok(Math.abs(director.squareFrame(attack,1).motion.forward)<.001,
   "attack carry starts and ends at planted stance, preventing combo body snapping");
 assert.ok(director.layouts.combat[start].src===0 && director.layouts.combat[start+3].src===0,
   "adjacent combo attacks must share the same source silhouette at the handoff");
}
fighter.state="attack-heavy";
pose=choose("heavy",.52);assert.equal(pose.clip,"heavy");
assert.equal(pose.index,13,"heavy strike has a dedicated contact pose");
fighter.state="attack-powerKick";
pose=choose("powerKick",.7);assert.equal(pose.clip,"finisher");
fighter.state="block";fighter.stateTime=.08;
pose=choose(null);assert.equal(pose.clip,"guard");
assert.equal(pose.part,"combat");assert.equal(pose.index,14);
fighter.state="hit";fighter.hitReaction="knockback";
pose=choose(null);assert.equal(pose.clip,"knockback");
fighter.state="idle";fighter.stateTime=.4;
assert.equal(choose(null),null,"idle keeps authentic premium idle art");
fighter.state="attack-gun";
assert.equal(choose("gun"),null,"Spirit Gun retains its canonical special poses");
assert.equal(director.choosePose(fighter,"cross",null,.4),null,"no derived atlas keeps canonical combat fallback");
assert.ok(pose.image);
const failed=director.build(meta,{movement:images.movement,combat:null});
assert.equal(failed,null,"missing source art must not break the game");
// Impact anticipation and speed streaks are visible, finite and non-mutating.
let streaks=0;
const ctx=new Proxy({save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){streaks++;},
 translate(){},scale(){},quadraticCurveTo(){},arc(){}},{
 get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true}
});
const runner={state:"walk",grounded:true,x:280,y:600,vx:700,facing:1,dashTimer:.06,
 stateTime:.12,currentAttack(){return "cross"}};
const opponent={state:"idle",grounded:true,x:900,y:600,vx:0,facing:-1,
 currentAttack(){return null}};
director.drawBehind({player:runner,cpu:opponent},ctx,1200);
director.drawFront({player:runner,cpu:opponent},ctx,1200);
assert.ok(streaks>=6,"rush and cross release have bounded visible speed arcs");
assert.equal(allocated.length,2,"rendering never allocates new textures");
const studio=fs.readFileSync("yusuke-sprite-studio.html","utf8");
assert.ok(studio.includes('"yusuke-directional-"+part+"-v8.png"'),
 "studio exports each transparent sheet with a stable file name");
assert.ok(studio.includes("columns:4,rows:{movement:4,combat:8}"),
  "sprite studio must export 4x4 movement and 4x8 combat atlas geometry");
assert.ok(studio.includes("squareUpper:[28,29,30,31]"),
  "all four uppercut phases must be exported for MUGEN import");
assert.ok(studio.includes("yusuke-directional-v8-frames.json"),
 "studio exports frame crop metadata for external import");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-directional-v8\.js\?v=3/);
assert.match(html,/MugenDirectional\?\.build/);
assert.match(html,/MugenDirectional\?\.choosePose/);
assert.match(html,/premiumPose\.frames \|\| premiumArt/);
new vm.Script([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(x=>x[1]).find(x=>x.includes("function selectYusukeCombatPose")));
console.log("PASS: 48 source-matched cels, 4 Square phases per punch, seam-free handoffs, backdash, 40FPS and fallback.");
