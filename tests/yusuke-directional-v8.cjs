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
assert.equal(director.layouts.movement.length,12);
assert.equal(director.layouts.combat.length,12);
const meta=JSON.parse(fs.readFileSync("characters/yusuke/premium-atlas.json","utf8"));
const draws=[],allocated=[];
const document={createElement(tag){
 assert.equal(tag,"canvas");
 const canvas={width:0,height:0,getContext(type){
  assert.equal(type,"2d");
  return {imageSmoothingEnabled:true,drawImage(...args){draws.push(args);}};
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
 assert.equal(sheet.image.height,1536);
 assert.equal(sheet.frames.length,12);
 assert.equal(sheet.scale,.5);
 for(const f of sheet.frames){
  assert.ok(f.x>=0&&f.y>=0&&f.w>0&&f.h>0&&f.x+f.w<=2048&&f.y+f.h<=1536);
  assert.ok(f.ax>=0&&f.ax<=f.w);
 }
}
assert.equal(draws.length,24*10,"each derived cel uses original source pixel strips");
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
fighter.state="attack-powerKick";
pose=choose("powerKick",.7);assert.equal(pose.clip,"finisher");
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
assert.match(studio,/yusuke-directional-movement-v8\\.png/);
assert.match(studio,/yusuke-directional-combat-v8\\.png/);
assert.match(studio,/yusuke-directional-v8-frames\\.json/);

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-directional-v8\.js\?v=1/);
assert.match(html,/MugenDirectional\?\.build/);
assert.match(html,/MugenDirectional\?\.choosePose/);
assert.match(html,/premiumPose\.frames \|\| premiumArt/);
new vm.Script([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(x=>x[1]).find(x=>x.includes("function selectYusukeCombatPose")));
console.log("PASS: 24 consistent directional/combat-derived frames, 40 FPS clips and browser fallback.");
