"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path="characters/yusuke/yusuke-walk-idle-v16.png";
const png=fs.readFileSync(path);
assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(png.readUInt32BE(16),1536);
assert.equal(png.readUInt32BE(20),1024);
assert.equal(png[25],6,"movement art must have real alpha");
assert.ok(png.length>500000,"do not use a low-resolution placeholder");
const src=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const calls=[];
class FakeImage{
 constructor(){this.naturalWidth=1536;this.naturalHeight=1024;}
 set src(value){this._src=value;calls.push(value);this.onload();}
 get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(src,{window:root,Math});
const exact=root.MugenExactYusuke;
const oldSheet={naturalWidth:1536,naturalHeight:1024,id:"attacks"};
const atlas=exact.build(oldSheet);
assert.ok(atlas);
assert.equal(calls.length,1);
assert.equal(calls[0],path);
assert.equal(exact.walkIdleStatus(),"ready");
assert.equal(exact.walkIdleFrames.length,16);
for(const [i,f] of exact.walkIdleFrames.entries()){
 const col=i%4,row=Math.floor(i/4);
 assert.ok(f.x>=col*384&&f.x+f.w<=(col+1)*384);
 assert.ok(f.y>=row*256&&f.y+f.h<=(row+1)*256);
 assert.ok(f.ax>0&&f.ax<f.w);
 assert.ok(f.h>200&&f.h<=256);
}
const actor={x:300,y:600,state:"idle",stateTime:0,grounded:true,
 vx:0,vy:0,facing:1,hitstun:0,hitReaction:"stagger",
 currentAttack(){return this.state==="attack"? "light":null;}};
function get(state,time,vx=0){
 actor.state=state;actor.stateTime=time;actor.vx=vx;
 return exact.pose(actor,atlas,.19);
}
const idleFrames=new Set(Array.from({length:14},(_,i)=>get("idle",(i+.01)/12).index));
assert.equal(idleFrames.size,8,"idle uses all eight actual illustrated breathing cels");
const walkingFrames=new Set(Array.from({length:8},(_,i)=>get("walk",(i+.01)/13,160).index));
assert.equal(walkingFrames.size,8,"walk uses all eight actual illustrated footstep cels");
assert.equal(get("walk",.2,-160).clip,"retreat");
assert.equal(get("walk",.2,-160).source,"walk-idle-v16");
assert.equal(get("idle",1).source,"walk-idle-v16");
for(const state of ["attack","hit","block","jump"]){
 actor.grounded=state!=="jump";
 const pose=get(state,.1);
 assert.equal(pose.image,oldSheet,"existing combat/air art must remain unchanged: "+state);
}
actor.grounded=true;
const drawCalls=[],ctx={save(){},restore(){},translate(){},scale(){},
 drawImage(...a){drawCalls.push(a)},imageSmoothingEnabled:false};
actor.state="idle";actor.stateTime=.4;
assert.equal(exact.draw(actor,ctx,500,1,atlas),true);
assert.equal(drawCalls.length,1,"one full-body Yusuke, no double exposure");
assert.equal(drawCalls[0][0]._src,path);
const fallback={};vm.runInNewContext(src,{window:fallback,Math});
const old=fallback.MugenExactYusuke.build(oldSheet);
assert.equal(fallback.MugenExactYusuke.pose(actor,old,.19).image,oldSheet,
 "older browsers without Image must retain the existing sprites");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.ok(html.includes('yusuke-exact-reference-v15.js?v=21&walkIdle=16'));
console.log("PASS: new 8+8 transparent Yusuke idle/walk cels selected at runtime; 1 fighter per frame; combat intact");
