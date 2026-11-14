"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const vm=require("node:vm");
const srcFile="characters/yusuke/yusuke_dodge_quickstep_8frames.png";
const buf=fs.readFileSync(srcFile);
assert.equal(buf.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(buf.readUInt32BE(16),1024);
assert.equal(buf.readUInt32BE(20),512);
assert.equal(buf[25],6,"dodge art needs a real alpha channel");
assert.ok(buf.length>280000);
assert.equal(crypto.createHash("sha256").update(buf).digest("hex"),
  "2944c7ddd12de5bf9f9f835d1c20f62d6100b5dc71fc0b3a6f8d543fc428edc6");

const source=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const requests=[];
class FakeImage{
  set src(path){
    this._src=path;
    this.naturalWidth=path===srcFile||path.includes("guard")||path.includes("jump")?1024
      :path.includes("crouch")?1280:1536;
    this.naturalHeight=path.includes("-v16.png")||path.includes("jump")?1024:512;
    requests.push(path);
    this.onload?.();
  }
  get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(source,{window:root,Math});
const exact=root.MugenExactYusuke;
const oldImage={naturalWidth:1536,naturalHeight:1024};
const atlas=exact.build(oldImage);
assert.ok(atlas);
const f={
  x:340,y:640,state:"dash",stateTime:0,grounded:true,
  facing:1,vx:-730,vy:0,dashTimer:.26,dashDuration:.26,dashElapsed:0,
  dashDirection:-1,turnTimer:0,hitstun:0,
  _crouchVisual:false,currentAttack(){return this.state==="attack"?"light":null;}
};
function select(state,extra={}){
  Object.assign(f,{
    state,stateTime:0,grounded:true,facing:1,vx:-730,vy:0,
    dashTimer:.26,dashDuration:.26,dashElapsed:0,dashDirection:-1,turnTimer:0
  },extra);
  return exact.pose(f,atlas,.2);
}
const indices=new Set();
for(let i=0;i<8;i++){
  const p=select("dash",{dashElapsed:.26*(i+.2)/8,dashTimer:.26*(1-(i+.2)/8),stateTime:.26*(i+.2)/8});
  assert.equal(p.source,"dodge-v24");
  assert.equal(p.clip,"backdash");
  assert.equal(p.image._src,srcFile);
  assert.equal(p.index,i,"one-shot frame "+i+" must be reachable");
  assert.equal(p.frame.h,217);
  assert.ok(p.frame.h*p.scale<=208.01);
  assert.ok(p.frame.x>=0 && p.frame.y>=0 &&
    p.frame.x+p.frame.w<=1024 && p.frame.y+p.frame.h<=512);
  indices.add(p.index);
}
assert.equal(indices.size,8);
assert.equal(requests.filter(path=>path===srcFile).length,1,
  "dodge sheet should load only once");
const forward=select("dash",{vx:860,dashDirection:1,dashTimer:.19,dashElapsed:.07});
assert.equal(forward.clip,"rush","forward R1 dash clip unchanged");
assert.notEqual(forward.source,"dodge-v24","forward R1 dash must retain its authored sprite");
const retreat=select("walk",{vx:-175,dashTimer:0,dashDuration:0,dashDirection:-1});
assert.equal(retreat.clip,"retreat");
assert.notEqual(retreat.source,"dodge-v24","walking backwards is not a quick-step");
assert.equal(select("attack",{dashTimer:0}).image,oldImage,"combat art untouched");
assert.equal(select("hit",{dashTimer:0}).image,oldImage,"hit reactions untouched");
const drawCalls=[];
const ctx={save(){},restore(){},translate(){},scale(){},rotate(){},
 drawImage(...a){drawCalls.push(a)},imageSmoothingEnabled:false};
select("dash",{dashElapsed:.10,dashTimer:.16});
assert.equal(exact.draw(f,ctx,0,1,atlas),true);
assert.equal(drawCalls.length,1,"no double sprite overlays");
assert.equal(drawCalls[0][0]._src,srcFile);
const legacyRoot={};
vm.runInNewContext(source,{window:legacyRoot,Math});
const legacyAtlas=legacyRoot.MugenExactYusuke.build(oldImage);
select("dash",{dashElapsed:.11,dashTimer:.15});
assert.equal(legacyRoot.MugenExactYusuke.pose(f,legacyAtlas,.2).image,oldImage,
  "without image loading legacy backdash must be usable");

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-exact-reference-v15[.]js[^"]*dodge=24/);
assert.match(html,/this[.]dashDirection !== this[.]facing/);
assert.match(html,/this[.]dashElapsed = Math[.]min\(this[.]dashDuration/);
console.log("PASS: eight RGBA dodge cels, progress-based backward R1 backstep, forward R1 preservation, combat fallback");
