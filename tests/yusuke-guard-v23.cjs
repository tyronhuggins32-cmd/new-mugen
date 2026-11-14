"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const vm=require("node:vm");
const srcFile="characters/yusuke/yusuke_guard_hold_hit_8frames.png";
const png=fs.readFileSync(srcFile);
assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(png.readUInt32BE(16),1024);
assert.equal(png.readUInt32BE(20),512);
assert.equal(png[25],6,"defensive sprite art must contain RGBA alpha");
assert.ok(png.length>250000,"full-resolution guard art expected");
assert.equal(crypto.createHash("sha256").update(png).digest("hex"),
  "a91b1cae6709e05dd867fd1d489a5be956192ac7660e5ef49fb360955de51360");

const source=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const requests=[];
class FakeImage {
  set src(value) {
    this._src=value;
    this.naturalWidth=value===srcFile ? 1024 : value.includes("crouch") ? 1280 : 1536;
    this.naturalHeight=value.includes("-v16.png") ? 1024 :
      value.includes("jump_landing") ? 1024 : 512;
    requests.push(value);
    this.onload?.();
  }
  get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(source,{window:root,Math});
const exact=root.MugenExactYusuke, oldImage={naturalWidth:1536,naturalHeight:1024};
const atlas=exact.build(oldImage);
assert.ok(atlas);
const fighter={x:250,y:600,state:"block",stateTime:0,grounded:true,
  facing:1,vx:0,vy:0,dashTimer:0,turnTimer:0,hitstun:0,
  _crouchVisual:false,_guardImpactTimer:0,_guardImpactHeavy:false,
  currentAttack(){return this.state==="attack"?"light":null;}};
const select=(state,t,extra={})=>{
  Object.assign(fighter,{state,stateTime:t,_crouchVisual:false,
    _guardImpactTimer:0,_guardImpactHeavy:false,grounded:true},extra);
  return exact.pose(fighter,atlas,.3);
};
const first=select("block",0);
assert.equal(first.source,"guard-v23");
assert.equal(first.image._src,srcFile);
assert.equal(first.index,0);
assert.equal(first.frame.h,244,"aligned feet should not hover");
assert.equal(first.frame.h*first.scale<240,true);
assert.equal(select("block",.1).index,1);
assert.ok([2,3].includes(select("block",.3).index));
assert.equal(select("block",.5,{_guardImpactTimer:.12}).index,4,
  "blocked light attack should play light recoil cel");
assert.equal(select("block",.5,{_guardImpactTimer:.14,_guardImpactHeavy:true}).index,5,
  "blocked heavy attack should play heavy recoil cel");
assert.equal(requests.filter(x=>x===srcFile).length,1,"guard texture cached");
const recovery1=select("idle",.03);
assert.equal(recovery1.clip,"guardRecover");
assert.equal(recovery1.index,6);
const recovery2=select("idle",.12);
assert.equal(recovery2.clip,"guardRecover");
assert.equal(recovery2.index,7);
assert.equal(select("idle",.19).clip,"idle","guard recovery must end");
const low=select("block",.18,{_crouchVisual:true});
assert.equal(low.clip,"crouch","D-pad down is still low guard");
assert.notEqual(low.source,"guard-v23");
const hit=select("hit",.12);
assert.equal(hit.image,oldImage,"normal hit stays on existing reference sheet");
const attack=select("attack",.12);
assert.equal(attack.image,oldImage,"guard art cannot overwrite attacks");
const draws=[],ctx={save(){},restore(){},translate(){},scale(){},rotate(){},
 drawImage(...a){draws.push(a)},imageSmoothingEnabled:false};
select("block",.2);
assert.equal(exact.draw(fighter,ctx,0,1,atlas),true);
assert.equal(draws.length,1,"only one Yusuke body should be drawn");
assert.equal(draws[0][0]._src,srcFile);
const oldRoot={};
vm.runInNewContext(source,{window:oldRoot,Math});
const old=oldRoot.MugenExactYusuke.build(oldImage);
assert.equal(oldRoot.MugenExactYusuke.pose(fighter,old,.3).image,oldImage,
 "older browser without image loading should keep previous guard art");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-exact-reference-v15[.]js[^"]*guard=23/);
assert.match(html,/defender[.]_guardImpactTimer = [.]18/);
assert.match(html,/defender[.]_guardImpactHeavy = Boolean\(attack[.]heavyImpact\)/);
assert.match(html,/this[.]_guardImpactTimer = Math[.]max\(0/);
assert.match(html,/block: heldControls[.]has\("block"\)/);
console.log("PASS: eight guard/hold/hit poses, impact-only recoil, alpha, one-body rendering, and fallback");
