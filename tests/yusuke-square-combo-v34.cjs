"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const file="characters/yusuke/yusuke_square_master_v34_30frames.png";
const png=fs.readFileSync(file);
const meta=JSON.parse(fs.readFileSync("characters/yusuke/square-combo-v34.json","utf8"));
assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a","PNG signature");
assert.equal(png.readUInt32BE(16),1920,"six 320px columns");
assert.equal(png.readUInt32BE(20),1280,"five 256px rows");
assert.equal(png[25],6,"true RGBA, no opaque matte");
assert.ok(png.length>280000,"full-resolution authored pixels");
assert.equal(meta.frames,30);
assert.equal(meta.framesDetail.length,30);
assert.equal(meta.footPivotY,244);
for(const [i,f] of meta.framesDetail.entries()){
 assert.equal(f.index,i);
 assert.equal(f.visibleBottom,244,"every foot uses the same baseline: "+i);
 assert.ok(f.scale>=.78 && f.scale<=1.27,
  "no disproportionate, nonuniform extreme scaling");
}
const final=meta.framesDetail.slice(26);
assert.ok(final.every(x=>x.visibleHeight>=198 && x.visibleHeight<=214),
 "recovery cannot shrink at the end of Square");
const code=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const loaded=[];
class Image {
 set src(s){
  this._src=s;loaded.push(s);
  try{
   const bytes=fs.readFileSync(s);
   this.naturalWidth=bytes.readUInt32BE(16);
   this.naturalHeight=bytes.readUInt32BE(20);
   this.onload?.();
  }catch(_){this.onerror?.();}
 }
 get src(){return this._src;}
}
const window={Image};
vm.runInNewContext(code,{window,Math});
const sprite=window.MugenExactYusuke;
const atlas=sprite.build({naturalWidth:1536,naturalHeight:1024});
const fighter={
 x:400,y:600,prevX:400,prevY:600,
 vx:0,vy:0,facing:1,grounded:true,dashTimer:0,hitstun:0,
 state:"attack-light",stateTime:0,
 currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}
};
const cuts=[["light",0,6],["cross",6,6],["body",12,6],["upper",18,12]];
const frames=[];
for(const [clip,base,count] of cuts){
 for(let i=0;i<count;i++){
  fighter.state="attack-"+clip;
  fighter.stateTime=(i+.125)/count*.36;
  const pose=sprite.pose(fighter,atlas,.36);
  assert.equal(pose.source,"square-combo-v34",clip+" uses the same master");
  assert.equal(pose.frameCount,30);
  assert.equal(pose.index,base+i);
  assert.equal(pose.frame.x,((base+i)%6)*320);
  assert.equal(pose.frame.y,Math.floor((base+i)/6)*256);
  assert.equal(pose.frame.w,320);
  assert.equal(pose.frame.h,256);
  assert.equal(pose.frame.ax,160);
  assert.equal(pose.scale,.96);
  assert.equal(pose.image.naturalWidth,1920);
  assert.equal(pose.image.naturalHeight,1280);
  frames.push(pose);
 }
}
assert.equal(frames.length,30);
assert.equal(new Set(frames.map(x=>x.index)).size,30,"all 30 authored poses reachable");
assert.ok(frames.every(x=>x.image===frames[0].image),
 "no source-image swapping at any attack or uppercut transition");
assert.ok(loaded.some(s=>s.endsWith("yusuke_square_master_v34_30frames.png")));
fighter.state="attack-upper";fighter.stateTime=.35;
const ctx={
 imageSmoothingEnabled:true,calls:[],
 save(){},restore(){},translate(){},scale(){},rotate(){},
 drawImage(...a){this.calls.push(a);}
};
assert.equal(sprite.draw(fighter,ctx,0,1,atlas,.36),true);
assert.equal(ctx.calls.length,1,"no double or ghost body");
assert.equal(ctx.imageSmoothingEnabled,false,"nearest-neighbor rendering");
fighter.grounded=false;
assert.notEqual(sprite.pose(fighter,atlas,.36).source,"square-combo-v34",
 "airborne attacks stay independent");
fighter.grounded=true;fighter.state="attack-heavy";
assert.notEqual(sprite.pose(fighter,atlas,.36).source,"square-combo-v34",
 "Triangle heavy independent of Square");
fighter.state="dash";fighter.dashTimer=.2;fighter.vx=780;
assert.notEqual(sprite.pose(fighter,atlas,.36).source,"square-combo-v34",
 "R1 dash remains independent");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/squareCombo=34&upperRecovery=32&masterAtlas=34/);
assert.match(html,/type = \["light", "cross", "body", "upper"\]/);
console.log("PASS: one real 30-frame transparent Square master, identical pivots, full-size recovery, no distortion or texture swaps, controls intact.");
