"use strict";
const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const asset="characters/yusuke/yusuke_spirit_punch_16frames.png";
const bytes=fs.readFileSync(asset);
assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(bytes.readUInt32BE(16),1024);
assert.equal(bytes.readUInt32BE(20),1024);
assert.equal(bytes[25],6,"The new sprite atlas must use true RGBA transparency");
assert.ok(bytes.length>800000,"Do not substitute a thumbnail");
assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),
  "0cee1ed6617b1d5b0053e9b52f8cf1db5638a9a23d0a1a923ca72857dd517777");
const manifest=JSON.parse(fs.readFileSync("characters/yusuke/spirit-punch-v30.json","utf8"));
assert.equal(manifest.atlas.frameCount,16);
assert.deepEqual(manifest.clips.spiritStrike,[8,9,10,11]);
const cfg=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
assert.equal(cfg.combat.attacks.spiritPunch.cost,24);
assert.equal(cfg.combat.attacks.spiritPunch.projectile,undefined,"Spirit Punch must be close-range melee");
assert.ok(cfg.combat.attacks.spiritPunch.activeStart>0);
assert.equal(cfg.combat.attacks.heavy.damage,45,"Triangle's old combat damage must not change");

const renderer=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const requests=[];
class FakeImage{
  set src(path){
    this._src=path;requests.push(path);
    this.naturalWidth=path.includes("crouch")?1280:path.includes("walk-polish")?1536:1536;
    this.naturalHeight=path.includes("-v16.png")?1024:512;
    if(path===asset){this.naturalWidth=1024;this.naturalHeight=1024;}
    if(path.includes("jump_landing")){this.naturalWidth=1024;this.naturalHeight=1024;}
    if(path.includes("heavy_combo")){this.naturalWidth=1024;this.naturalHeight=1024;}
    this.onload?.();
  }
  get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(renderer,{window:root,Math});
const painter=root.MugenExactYusuke;
const oldArt={naturalWidth:1536,naturalHeight:1024};
const atlas=painter.build(oldArt);
assert.ok(atlas);
const fighter={state:"attack-spiritPunch",stateTime:0,grounded:true,
  facing:1,vx:0,vy:0,dashTimer:0,turnTimer:0,hitstun:0,
  currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}};
const sample=(name,time,duration=.58)=>{
  fighter.state="attack-"+name;fighter.stateTime=time;
  return painter.pose(fighter,atlas,duration);
};
const pose0=sample("spiritPunch",0);
assert.equal(pose0.source,"spirit-punch-v30");
assert.equal(pose0.index,0);
assert.equal(pose0.image._src,asset);
assert.equal(pose0.frame.w,256);
const poses=new Set();
for(let i=0;i<16;i++){
  const p=sample("spiritPunch",(.58*(i+.05)/16));
  assert.equal(p.source,"spirit-punch-v30");
  assert.equal(p.index,i);
  assert.equal(p.frame.y,Math.floor(i/4)*256);
  assert.equal(p.frame.x,(i%4)*256);
  assert.ok(p.frame.h>=240&&p.frame.h<=250);
  assert.ok(p.frame.h*p.scale<=painter.maximumHeight+.01);
  poses.add(p.index);
}
assert.equal(poses.size,16,"Every authored cel should appear");
const triangle=sample("heavy",.13,.325);
assert.equal(triangle.source,"spirit-punch-v30","Triangle heavy uses new evolved art");
assert.ok(triangle.index>=8&&triangle.index<=11,
 "Original heavy contact window must land on energy-charged punch impact");
assert.equal(sample("heavy",0,.325).index,0);
assert.ok(sample("heavy",.31,.325).index>=14);
assert.equal(requests.filter(x=>x===asset).length,1,"Single cached texture");
assert.equal(sample("upper",.12,.39).image,oldArt,"Fourth Square uppercut retains its atlas or fallback");
assert.equal(sample("gun",.08,.60).image,oldArt,"Spirit Gun must not become Spirit Punch");
fighter.grounded=false;
assert.equal(sample("spiritPunch",.12).image,oldArt,"No unrelated airborne Spirit Punch art");
fighter.grounded=true;
const calls=[];
const ctx={save(){},restore(){},translate(){},scale(){},rotate(){},imageSmoothingEnabled:false,
  drawImage(...a){calls.push(a);}};
sample("spiritPunch",.3);
assert.equal(painter.draw(fighter,ctx,500,1,atlas,.58),true);
assert.equal(calls.length,1,"Only one body is ever drawn per combat frame");
assert.equal(calls[0][0]._src,asset);
const older={};vm.runInNewContext(renderer,{window:older,Math});
const oldAtlas=older.MugenExactYusuke.build(oldArt);
assert.equal(older.MugenExactYusuke.pose(fighter,oldAtlas,.58).image,oldArt,
 "Missing Image support preserves old reference attack");

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-exact-reference-v15[.]js[^"]*spiritPunch=30/);
assert.ok(html.includes('this.beginAttack("spiritPunch", energyAtInput)'));
assert.ok(html.includes("const queuedAttack = input.spiritPunchPressed"));
assert.ok(html.includes('input.heavyPressed && this.beginAttack("heavy"'));

const start=html.indexOf("      const controlSources = new Map();");
const finish=html.indexOf('      window.addEventListener("keydown"',start);
assert.ok(start>0 && finish>start);
const harnessScope={touchButtons:[]};
vm.runInNewContext(html.slice(start,finish)+
  "\nglobalThis.spiritHarness={pressFightControl,releaseFightControl,clearFightInput,humanInput};",
  harnessScope);
const h=harnessScope.spiritHarness;
h.pressFightControl("ultimate","dualsense"); // Press R2 first.
let i=h.humanInput();
assert.equal(i.ultimatePressed,false,"R2 must not fire MAX Spirit Gun before the chord");
h.pressFightControl("light","dualsense"); // Press Square after R2.
i=h.humanInput();
assert.equal(i.spiritPunchPressed,true);
assert.equal(i.lightPressed,false,"Chord must not also throw a normal Square");
assert.equal(i.ultimatePressed,false);
h.releaseFightControl("light","dualsense");
h.humanInput();
h.releaseFightControl("ultimate","dualsense");
assert.equal(h.humanInput().ultimatePressed,false,
 "Releasing R2 after Spirit Punch must not trigger the super");
h.pressFightControl("light","dualsense"); // Normal Square preserved.
i=h.humanInput();
assert.equal(i.lightPressed,true);
assert.equal(i.spiritPunchPressed,false);
h.pressFightControl("ultimate","dualsense"); // Square held first.
i=h.humanInput();
assert.equal(i.spiritPunchPressed,true);
h.releaseFightControl("light","dualsense");
h.releaseFightControl("ultimate","dualsense");
assert.equal(h.humanInput().ultimatePressed,false);
h.pressFightControl("ultimate","dualsense");
assert.equal(h.humanInput().ultimatePressed,false);
h.releaseFightControl("ultimate","dualsense");
assert.equal(h.humanInput().ultimatePressed,true,
 "Standalone R2 still triggers MAX Spirit Gun on release");
assert.equal(h.humanInput().ultimatePressed,false,"R2 must not repeat");
h.pressFightControl("ultimate","dualsense");
h.humanInput();h.clearFightInput();
assert.equal(h.humanInput().ultimatePressed,false,"Blur or pause clears pending super");
console.log("PASS: Spirit Punch 16 real RGBA frames; evolved Triangle; R2+Square both orders; no accidental MAX Spirit Gun; original uppercut/Spirit Gun preserved.");
