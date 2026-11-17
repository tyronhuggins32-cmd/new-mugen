"use strict";
// V39 supersedes the original V31 single Triangle launcher: three chained
// grounded Triangle attacks now precede the fourth-hit rising launcher.
// This verifies the actual current artwork and gameplay instead of an obsolete
// 45-damage, first-hit launch contract.
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const cfg=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const v39={
  heavy:["characters/yusuke/yusuke_triangle_heavy_chain_v39_12frames.png",1280,768],
  launcher:["characters/yusuke/yusuke_triangle_uppercut_v39_12frames.png",1920,512]
};
for(const [kind,[path,w,h]] of Object.entries(v39)){
  const b=fs.readFileSync(path);
  assert.equal(b.subarray(0,8).toString("hex"),"89504e470d0a1a0a",kind+" PNG");
  assert.equal(b.readUInt32BE(16),w);
  assert.equal(b.readUInt32BE(20),h);
  assert.equal(b[25],6,"transparent RGBA character art");
  assert.ok(b.length>350000,"full-resolution authored source");
}
assert.equal(cfg.combat.attacks.heavy.damage,28);
assert.equal(cfg.combat.attacks.heavy.launchVelocity,0,"first three hits do not launch");
assert.equal(cfg.combat.attacks.heavyLauncher.launchVelocity,-730,
  "fourth Triangle must launch upward");
assert.equal(cfg.combat.attacks.heavyLauncher.forceKnockback,true);
assert.equal(cfg.combat.attacks.spiritPunch.cost,24,"R2+Square remains independent");

const js=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
class Img {
 set src(src){
  this._src=src;
  if(src===v39.heavy[0]){this.naturalWidth=1280;this.naturalHeight=768;}
  else if(src===v39.launcher[0]){this.naturalWidth=1920;this.naturalHeight=512;}
  else {this.naturalWidth=1536;this.naturalHeight=512;}
  this.onload?.();
 }
 get src(){return this._src;}
}
const root={Image:Img};vm.runInNewContext(js,{window:root,Math});
const painter=root.MugenExactYusuke,legacy={naturalWidth:1536,naturalHeight:1024};
const atlas=painter.build(legacy);
const fighter={state:"attack-heavy",stateTime:0,grounded:true,heavyChainStage:0,
 facing:1,x:500,y:600,vx:0,vy:0,dashTimer:0,turnTimer:0,hitstun:0,
 currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}};
for(let stage=0;stage<3;stage++){
 fighter.heavyChainStage=stage;
 for(let i=0;i<4;i++){
  fighter.state="attack-heavy";fighter.stateTime=(i+.1)/4*.43;
  const p=painter.pose(fighter,atlas,.43);
  assert.equal(p.source,"triangle-heavy-v39");
  assert.equal(p.index,stage*4+i);
  assert.equal(p.frame.w,320);assert.equal(p.frame.h,256);
  assert.equal(p.image._src,v39.heavy[0]);
 }
}
for(let i=0;i<12;i++){
 fighter.state="attack-heavyLauncher";fighter.stateTime=(i+.1)/12*.58;
 const p=painter.pose(fighter,atlas,.58);
 assert.equal(p.source,"triangle-launcher-v39");
 assert.equal(p.index,i);
 assert.equal(p.frame.x,(i%6)*320);
 assert.equal(p.frame.y,Math.floor(i/6)*256);
 assert.equal(p.image._src,v39.launcher[0]);
}
fighter.state="attack-spiritPunch";fighter.stateTime=.3;
assert.notEqual(painter.pose(fighter,atlas,.58).source,"triangle-launcher-v39",
 "R2+Square uses its own attack family");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/type = "heavyLauncher"/,
 "fourth Triangle must select the actual launcher");
assert.match(html,/this.beginAttack\("heavy", energyAtInput\)/);
assert.match(html,/this.beginAttack\("spiritPunch", energyAtInput\)/);
console.log("PASS: current V39 three-stage 12-frame Triangle chain, 12-frame fourth-hit launcher, preserved R2+Square and gameplay config.");
