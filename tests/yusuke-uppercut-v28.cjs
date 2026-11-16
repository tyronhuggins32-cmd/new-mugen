"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const vm=require("node:vm");
const path="characters/yusuke/yusuke_launcher_uppercut_12frames.png";
const png=fs.readFileSync(path);
assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(png.readUInt32BE(16),1024,"4 columns of 256px");
assert.equal(png.readUInt32BE(20),768,"3 rows of 256px");
assert.equal(png[25],6,"Requires RGBA alpha, not flattened checkerboard");
assert.equal(crypto.createHash("sha256").update(png).digest("hex"),
  "97dfe746e8d9aff15e02724ec59a2af19dd61cd2baff939b0560ac4ff7974387");
const manifest=JSON.parse(fs.readFileSync("characters/yusuke/launcher-uppercut-v28.json","utf8"));
assert.equal(manifest.atlas.frameCount,12);
assert.equal(manifest.clips.upper.duration,.39);
const source=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const loaded=[];
class FakeImage{
  set src(v){
    this._src=v;
    this.naturalWidth=v===path||v.includes("heavy_combo")||v.includes("dodge")||v.includes("jump_landing")?1024:v.includes("crouch")?1280:1536;
    this.naturalHeight=v===path||v.includes("light_combo")?768:v.includes("-v16.png")||v.includes("jump_landing")||v.includes("heavy_combo")?1024:512;
    loaded.push(v);
    this.onload?.();
  }
  get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(source,{window:root,Math});
const sprite=root.MugenExactYusuke,legacy={naturalWidth:1536,naturalHeight:1024};
const atlas=sprite.build(legacy);
assert.ok(atlas);
const fighter={state:"attack-upper",stateTime:0,grounded:true,
 x:250,y:650,vx:0,vy:0,facing:1,dashTimer:0,hitstun:0,
 currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}};
const pose=(name,n,grounded=true)=>{
  Object.assign(fighter,{state:"attack-"+name,stateTime:(n+.18)*.39/12,grounded});
  return sprite.pose(fighter,atlas,.39);
};
for(let i=0;i<12;i++){
 const p=pose("upper",i);
 assert.equal(p.source,"launcher-v28","Must use authored uppercut");
 assert.equal(p.clip,"upper");
 assert.equal(p.index,i,"All 12 frames must be reachable in sequence");
 assert.equal(p.image._src,path);
 assert.equal(p.frame.x,(i%4)*256);
 assert.equal(p.frame.y,Math.floor(i/4)*256);
 assert.equal(p.frame.w,256);
 assert.equal(p.frame.h,248);
 assert.ok(p.frame.h*p.scale<=sprite.maximumHeight+.1);
}
assert.equal(loaded.filter(x=>x===path).length,1,"PNG should be loaded once and cached");
assert.equal(pose("heavy",5).source,"heavy-triangle-v26","Triangle unchanged");
assert.equal(pose("light",5).source,"light-combo-v25","First Square unchanged");
assert.equal(pose("gun",5).image,legacy,"Spirit Gun unchanged");
assert.equal(pose("upper",5,false).image,legacy,"Aerial attacks preserve previous sprite");
const noImage={};
vm.runInNewContext(source,{window:noImage,Math});
const old=noImage.MugenExactYusuke.build(legacy);
assert.equal(noImage.MugenExactYusuke.pose(fighter,old,.39).image,legacy,
 "Image-unavailable fallback preserves original uppercut artwork");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-exact-reference-v15[.]js[^"]*uppercut=28/);
assert.ok(html.includes('type = ["light", "cross", "body", "upper"]'));
assert.ok(html.includes('this.beginAttack("heavy", energyAtInput)'));
const combat=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8")).combat;
assert.equal(combat.attacks.upper.duration,.51);
assert.equal(combat.attacks.upper.damage,42);
assert.equal(combat.attacks.upper.activeStart,.146);
assert.equal(combat.attacks.upper.activeEnd,.322);
assert.equal(combat.attacks.heavy.damage,45);
console.log("PASS: 12 transparent uppercut cels, fourth-Square control, hit timings, Triangle and fallback");
