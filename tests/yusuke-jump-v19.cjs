"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const vm=require("node:vm");
const srcFile="characters/yusuke/yusuke_jump_landing_14frames.png";
const png=fs.readFileSync(srcFile);
assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(png.readUInt32BE(16),1024);
assert.equal(png.readUInt32BE(20),1024);
assert.equal(png[25],6,"must contain real RGBA alpha");
assert.ok(png.length>350000,"not an empty placeholder");
assert.equal(crypto.createHash("sha256").update(png).digest("hex"),
  "c71e0a66cb8bca7434fa9482bf33371d281bf1004f148b727bb8cc4aac6c8842");

const source=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const requests=[];
class FakeImage{
  set src(value){
    this._src=value;
    this.naturalWidth=value===srcFile?1024:1536;
    this.naturalHeight=/-v16[.]png$/.test(value)?1024:value===srcFile?1024:512;
    requests.push(value);
    this.onload();
  }
  get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(source,{window:root,Math});
const sprite=root.MugenExactYusuke;
const oldArt={naturalWidth:1536,naturalHeight:1024};
const atlas=sprite.build(oldArt);
assert.ok(atlas);
assert.equal(requests.length,1,"normal boot only loads original V16 art");

const f={x:500,y:510,facing:1,vx:0,vy:-1120,state:"jump",stateTime:0,
  grounded:false,hitstun:0,dashTimer:0,_crouchVisual:false,
  currentAttack(){return this.state==="attack"?"light":null;}};
function check(state,t,vy,grounded=false){
  Object.assign(f,{state,stateTime:t,vy,grounded});
  return sprite.pose(f,atlas,.3);
}
const samples=[
  ["jump",0,-1120,0],["jump",.035,-1035,1],["jump",.070,-950,2],["jump",.100,-870,3],
  ["jump",.130,-790,4],["jump",.220,-600,5],["jump",.290,-430,6],["jump",.370,-250,7],
  ["jump",.430,-110,8],["jump",.610,310,9],["jump",.760,650,10],["jump",.920,1040,11]
];
for(const [state,t,vy,index] of samples){
  const p=check(state,t,vy);
  assert.equal(p.source,"jump-landing-v19", "new authored image should play in air");
  assert.equal(p.index,index,"jump phase mismatch at time "+t);
  assert.equal(p.image._src,srcFile);
  assert.ok(p.frame.h>90 && p.frame.h<=208);
  assert.equal(p.frame.h*p.scale,p.frame.h,"no distortions or enlarged full-body sprites");
  assert.ok(p.frame.x>=0 && p.frame.y>=0 &&
    p.frame.x+p.frame.w<=1024 && p.frame.y+p.frame.h<=1024);
  assert.ok(p.frame.ax>0 && p.frame.ax<p.frame.w);
}
assert.equal(requests.filter(q=>q===srcFile).length,1,"single cached jump texture");
const first=check("idle",0,0,true);
assert.equal(first.clip,"landing");
assert.equal(first.index,12);
const second=check("idle",.10,0,true);
assert.equal(second.clip,"landing");
assert.equal(second.index,13);
const neutral=check("idle",.25,0,true);
assert.equal(neutral.clip,"idle","landing must return to previous idle art");
const attack=check("attack",.09,-1000,false);
assert.equal(attack.image,oldArt,"air attacks remain on the existing combat atlas");
const knocked=check("hit",.09,-90,false);
assert.equal(knocked.image,oldArt,"air knockback reaction must remain intact");
const calls=[];
const ctx={save(){},restore(){},translate(){},scale(){},rotate(){},
  drawImage(...a){calls.push(a);},imageSmoothingEnabled:false};
check("jump",.22,-600);
assert.equal(sprite.draw(f,ctx,300,1,atlas),true);
assert.equal(calls.length,1,"render one sprite, never duplicate ghost images");
assert.equal(calls[0][0]._src,srcFile);
const old={};vm.runInNewContext(source,{window:old,Math});
const oldAtlas=old.MugenExactYusuke.build(oldArt);
assert.equal(old.MugenExactYusuke.pose(f,oldAtlas,.3).image,oldArt,
  "fallback to the original reference on browsers without Image");

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-exact-reference-v15[.]js[^"]*jump=19/);
console.log("PASS: fourteen distinct RGBA takeoff, air, fall, landing poses and safe combat/fallback.");
