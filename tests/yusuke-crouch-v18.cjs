"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const file="characters/yusuke/yusuke_crouch_crouchwalk_10frames.png";
const bytes=fs.readFileSync(file);
assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(bytes.readUInt32BE(16),1280);
assert.equal(bytes.readUInt32BE(20),512);
assert.equal(bytes[25],6,"10-frame sheet needs true PNG alpha");
assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),
  "8bef4cccc0dc3c0115002d4f62aea646e2270614dfa2ac6651d19f87911329ec");

const vm=require("node:vm");
const source=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const calls=[];
class FakeImage {
  set src(path) {
    this._src=path;calls.push(path);
    this.naturalWidth=path===file?1280:1536;
    this.naturalHeight=path.endsWith("-v16.png")?1024:512;
    this.onload();
  }
  get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(source,{window:root,Math});
const exact=root.MugenExactYusuke;
const fallbackArt={naturalWidth:1536,naturalHeight:1024};
const atlas=exact.build(fallbackArt);
assert.ok(atlas);
const f={x:350,y:620,facing:1,vx:0,vy:0,state:"idle",stateTime:0,
  grounded:true,dashTimer:0,hitstun:0,_crouchVisual:false,
  currentAttack(){return this.state==="attack"?"light":null;}};
const choose=(state,t,vx=0,lowGuard=false)=>{
  Object.assign(f,{state,stateTime:t,vx,_crouchVisual:lowGuard,grounded:true,dashTimer:0});
  return exact.pose(f,atlas,.2);
};
const low=choose("block",.31,0,true);
assert.equal(low.clip,"crouch");
assert.equal(low.source,"movement-v18");
assert.equal(low.image._src,file);
assert.equal(low.frame.h,244,"bottom-aligned pivot crops empty rows");
assert.ok(low.frame.h*low.scale<=208.01);
const down=new Set(Array.from({length:5},(_,i)=>choose("block",i/12,0,true).index));
assert.equal(down.size,5,"all 5 crouch frames are selected");
const walk=new Set(Array.from({length:5},(_,i)=>choose("crouchWalk",i/12,155).index));
assert.equal(walk.size,5,"all 5 crouch-walk frames are selected");
for(const frame of walk)assert.ok(frame>=5&&frame<10);
assert.equal(choose("block",.15,0,false).clip,"guard");
assert.equal(choose("block",.15,0,false).image,fallbackArt,"regular block fallback stays intact");
assert.equal(choose("attack",.15).image,fallbackArt,"attacks must retain source art");
assert.equal(choose("hit",.15).image,fallbackArt,"recoil must retain source art");
assert.equal(choose("jump",.15,100).image,fallbackArt,"air must retain source art");
const oldRoot={};vm.runInNewContext(source,{window:oldRoot,Math});
const oldAtlas=oldRoot.MugenExactYusuke.build(fallbackArt);
assert.equal(oldRoot.MugenExactYusuke.pose(f,oldAtlas,.2).image,fallbackArt,
  "no Image support should fall back safely");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.ok(html.includes('this.setState("crouchWalk")'));
assert.ok(html.includes("this._crouchVisual = !this.cpu && !isThorfinnSelected() && Boolean(input.crouch);"));
console.log("PASS: 10 RGBA crouch/crouch-walk frames, low-walk state and legacy guard/attack fallbacks.");
