"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const file="characters/yusuke/yusuke_dash_v24_18frames.png";
const image=fs.readFileSync(file);
assert.equal(image.subarray(0,8).toString("hex"),"89504e470d0a1a0a","PNG header");
assert.equal(image.readUInt32BE(16),1774,"six columns of original art");
assert.equal(image.readUInt32BE(20),887,"three animation rows");
assert.equal(image[25],6,"RGBA with alpha, not a black matte");
assert.ok(image.length>600000,"full-resolution source artwork");

const code=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const requests=[];
class FakeImage {
  set src(path) {
    this._src=path;requests.push(path);
    this.naturalWidth=/dash_v24_18frames/.test(path)?1774:1536;
    this.naturalHeight=/dash_v24_18frames/.test(path)?887:
      /-v16[.]png|walk_forward_v2[12]_24frames/.test(path)?1024:512;
    this.onload?.();
  }
  get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(code,{window:root,Math});
const exact=root.MugenExactYusuke;
const base={naturalWidth:1536,naturalHeight:1024};
const atlas=exact.build(base);
assert.ok(atlas);
const f={state:"dash",stateTime:0,grounded:true,vx:700,facing:1,
  x:320,y:600,vy:0,dashTimer:.30,dashDuration:.30,dashElapsed:0,
  turnTimer:0,hitstun:0,currentAttack(){return null;}};
const frameSet=new Set();
for(let i=0;i<18;i++){
  f.dashElapsed=Math.min(.30,(i+1)/60);
  f.dashTimer=Math.max(0,.30-f.dashElapsed);
  f.stateTime=f.dashElapsed;
  const s=exact.pose(f,atlas,.2);
  assert.equal(s.source,"movement-v24","use the newly uploaded dash texture");
  assert.equal(s.frameCount,18);
  assert.equal(s.index,i,"one distinct frame per 60Hz gameplay tick");
  assert.equal(s.image._src,file);
  assert.ok(s.frame.x>=0 && s.frame.y>=0);
  assert.ok(s.frame.x+s.frame.w<=1774);
  assert.ok(s.frame.y+s.frame.h<=887);
  assert.ok(s.frame.w>=295 && s.frame.h>=295);
  assert.ok(s.scale>.70 && s.scale<.90,"keep character scale consistent");
  frameSet.add(s.index);
}
assert.equal(frameSet.size,18,"every authored frame is reachable");
assert.ok(requests.includes(file),"loader requests V24 asset");

const ctx={
  imageSmoothingEnabled:true,
  save(){},restore(){},translate(){},scale(){},rotate(){},
  drawImage(...args){this.calls.push(args);},
  calls:[]
};
f.dashElapsed=.15;f.dashTimer=.15;
assert.equal(exact.draw(f,ctx,100,.9,atlas),true);
assert.equal(ctx.calls.length,1,"never layer overlapping fighter silhouettes");
assert.equal(ctx.imageSmoothingEnabled,false,"preserve crisp pixel-art edges");

f.state="run";f.vx=470;f.dashTimer=0;f.stateTime=.1;
const run=exact.pose(f,atlas,.2);
assert.equal(run.clip,"sprint");
assert.equal(run.source,"movement-v17","L3 run retains independent animation");
f.state="walk";f.vx=160;f.stateTime=.1;f.walkCycleDistance=45;
const walk=exact.pose(f,atlas,.2);
assert.equal(walk.source,"movement-v22","forward walk retains its atlas");

class MissingDash extends FakeImage{
  set src(path){
    this._src=path;
    this.naturalWidth=1536;
    this.naturalHeight=/-v16[.]png/.test(path)?1024:
       /walk_forward_v2[12]_24frames/.test(path)?1024:512;
    this.onload?.();
  }
  get src(){return this._src;}
}
const missing={Image:MissingDash};
vm.runInNewContext(code,{window:missing,Math});
const legacy=missing.MugenExactYusuke;
const original=legacy.build(base);
f.state="dash";f.vx=700;f.dashTimer=.1;f.dashDuration=.30;f.dashElapsed=.1;
assert.equal(legacy.pose(f,original,.2).source,"movement-v17",
  "old six-pose dash remains a safe fallback if new texture is invalid");

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/dash18=24/,"browser cache key must load the new renderer");
assert.match(html,/dashDuration = this.dashDirection === this.facing \? \.30 : \.26/);
assert.match(html,/dashCurve = \.76 \+ \.44 \* Math\.sin/,
  "forward dash speed must ramp up and brake instead of remaining constant");
console.log("PASS: 18 genuine dash poses, 60Hz frame access, correct source crops, no sprite overlays, separate L3 run, fallback and easing.");
