"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const crypto=require("node:crypto");
const srcFile="characters/yusuke/yusuke_heavy_combo_triangle_16frames.png";
const bytes=fs.readFileSync(srcFile);
assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(bytes.readUInt32BE(16),1024);
assert.equal(bytes.readUInt32BE(20),1024);
assert.equal(bytes[25],6,"RGBA alpha required");
assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),
 "ca2593d71aba240b6f62d8e04d1bf0cbb70d79042525b2ce29147623e9684ba9");

const asset=JSON.parse(fs.readFileSync("characters/yusuke/heavy-combo-v26.json","utf8"));
assert.equal(asset.action,"Triangle");
assert.equal(asset.atlas.frames,16);
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-exact-reference-v15[.]js[^"]*heavyCombo=26/);
assert.ok(!html.includes('type = energyAtPress > 50 ? "shotgun" : "powerKick"'),
 "Triangle must not activate the obsolete energy-based special");
assert.ok(html.includes('input.heavyPressed') && html.includes('beginAttack("heavy"'),
 "PS5 heavyPressed should still route into the Triangle heavy input");
const source=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const calls=[];
class FakeImage {
 set src(value) {
  this._src=value;
  this.naturalWidth=value===srcFile?1024:value.includes("crouch")?1280:
    value.includes("dodge")?1024:1536;
  this.naturalHeight=value===srcFile?1024:value.includes("jump_landing")?1024:
    value.includes("-v16.png")?1024:value.includes("dash_v24")?768:512;
  calls.push(value);
  if(this.onload)this.onload();
 }
 get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(source,{window:root,Math});
const exact=root.MugenExactYusuke;
const legacy={naturalWidth:1536,naturalHeight:1024};
const atlas=exact.build(legacy);
assert.ok(atlas);
const fighter={x:300,y:620,facing:1,vx:0,vy:0,hitstun:0,dashTimer:0,
  state:"attack-heavy",stateTime:0,grounded:true,
  currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}};
for(let i=0;i<16;i++){
 fighter.stateTime=(i+.15)/16*.325;
 const p=exact.pose(fighter,atlas,.325);
 assert.equal(p.source,"heavy-triangle-v26","all sixteen cels must be active");
 assert.equal(p.image._src,srcFile);
 assert.equal(p.index,i);
 assert.equal(p.frame.x,(i%4)*256);
 assert.equal(p.frame.y,Math.floor(i/4)*256);
 assert.equal(p.frame.w,256);
 assert.equal(p.frame.h,245);
 assert.ok(p.frame.h*p.scale<=exact.maximumHeight);
}
assert.equal(calls.filter(x=>x===srcFile).length,1,"new heavy texture must load once");
fighter.grounded=false;
assert.equal(exact.pose(fighter,atlas,.325).image,legacy,
  "Aerial attacks must preserve original art");
fighter.grounded=true;
fighter.state="attack-shotgun";
assert.equal(exact.pose(fighter,atlas,.325).image,legacy,
  "Shotgun special still has separate visuals");
fighter.state="attack-powerKick";
assert.equal(exact.pose(fighter,atlas,.325).image,legacy,
  "Power Kick remains a separate optional move");
fighter.state="attack-heavy";fighter.stateTime=.16;
const draws=[],ctx={save(){},restore(){},translate(){},scale(){},rotate(){},
 drawImage(...args){draws.push(args)},imageSmoothingEnabled:false};
assert.equal(exact.draw(fighter,ctx,0,1,atlas,.325),true);
assert.equal(draws.length,1,"No duplicate overlapping fighter image");
assert.equal(draws[0][0]._src,srcFile);
const oldRoot={};vm.runInNewContext(source,{window:oldRoot,Math});
const old=oldRoot.MugenExactYusuke.build(legacy);
assert.equal(oldRoot.MugenExactYusuke.pose(fighter,old,.325).image,legacy,
 "If PNG fails to load, game must retain old attack art");
console.log("PASS: all 16 RGBA Triangle heavy cels, no shotgun override, single-render fallback");
