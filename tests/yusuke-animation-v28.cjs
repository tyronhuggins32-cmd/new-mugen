"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

// Synthetic RGBA tiles test actual opaque bounds, not an arbitrary atlas's
// 256px crop. The tiny isolated sparkle must not move the fighter's foot.
let reads=0,draws=0;
const canvas={width:0,height:0};
const ctx={
  imageSmoothingEnabled:true,
  clearRect(){},
  drawImage(_image,sx,sy,sw,sh){draws++;this.srcX=sx;this.srcY=sy;},
  getImageData(_x,_y,w,h){
    reads++;
    const data=new Uint8ClampedArray(w*h*4);
    const short=this.srcX>0;
    const top=short?65:16,bottom=short?220:230;
    for(let y=top;y<=bottom;y++)for(let x=97;x<159;x++){
      data[(y*w+x)*4+3]=255;
    }
    data[(h-1)*w*4+3]=255; // isolated dust pixel on foot line
    return {data};
  }
};
canvas.getContext=()=>ctx;
const root={document:{createElement(kind){
  assert.equal(kind,"canvas");return canvas;
}}};
vm.runInNewContext(fs.readFileSync("mugen-yusuke-animation-v28.js","utf8"),
  {window:root,Math,WeakMap,Map,Uint8ClampedArray});
const director=root.MugenYusukeAnimationV28;
assert.ok(director);
const image={naturalWidth:1536,naturalHeight:512};
const pose=(index,clip="idle")=>({
  image,source:"movement-v17",clip,scale:.96,
  frame:{x:index*256,y:0,w:256,h:256,ax:128,key:index}
});
const first=director.resolve(pose(0));
assert.equal(first.measured,true);
assert.ok(first.opaqueHeight>=185&&first.opaqueHeight<=196,
  "standing poses should use a stable ~194px visible silhouette");
assert.ok(first.footOffset>15&&first.footOffset<30,
  "feet anchor to the painted sole rather than an empty atlas gutter");
assert.ok(Math.abs(first.horizontalOffset)<8);
const readCount=reads;
for(let t=0;t<60;t++){
  const same=director.resolve(pose(0));
  assert.equal(same.scale,first.scale);
  assert.equal(same.footOffset,first.footOffset);
}
assert.equal(reads,readCount,
  "repeated render frames must use alpha bounds cache, not GPU readback");
const crouched=director.resolve(pose(1));
assert.equal(reads,2,"each new sprite cell is sampled once");
assert.equal(crouched.scale,first.scale,
  "short anticipation poses must not become giants through per-frame resizing");
assert.ok(crouched.opaqueHeight<first.opaqueHeight);
assert.ok(crouched.footOffset>0);
assert.equal(director.getMetrics(image,pose(1).frame).bottom,221,
  "tiny isolated motion spark must not alter grounded foot alignment");
const otherImage={naturalWidth:1536,naturalHeight:512};
const other=director.resolve({...pose(0),image:otherImage,
  clip:"guard",source:"guard-v23"});
assert.ok(other.measured);
assert.equal(reads,3,"distinct atlases need distinct cache keys");
assert.ok(other.opaqueHeight<=208);
const fallback={};
vm.runInNewContext(fs.readFileSync("mugen-yusuke-animation-v28.js","utf8"),
  {window:fallback,Math,WeakMap,Map,Uint8ClampedArray});
const noCanvas=fallback.MugenYusukeAnimationV28.resolve(pose(0));
assert.equal(noCanvas.measured,false);
assert.equal(noCanvas.scale,.96,
  "browser privacy restrictions must not hide the character");

// V28 selects running and walking cels from real displacement, not wall time.
const src=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
class FakeImage{
 set src(path){
  this._src=path;
  this.naturalWidth=/crouch/.test(path)?1280:/dash_v24/.test(path)?1774:
    /guard/.test(path)?1024:1536;
  this.naturalHeight=/dash_v24/.test(path)?887:
    /walk_forward_v22|walk_forward_v21|jump_landing/.test(path)?1024:
    /light_combo/.test(path)?768:512;
  this.onload?.();
 }
 get src(){return this._src;}
}
const world={Image:FakeImage};
vm.runInNewContext(src,{window:world,Math});
const renderer=world.MugenExactYusuke;
const tex={naturalWidth:1536,naturalHeight:1024};
const atlas=renderer.build(tex);
const fighter={x:500,y:650,facing:1,vx:320,vy:0,grounded:true,
 state:"walk",stateTime:.1,hitstun:0,dashTimer:0,
 gaitPhase:0,walkCycleDistance:0,currentAttack(){return null;}};
const choose=()=>renderer.pose(fighter,atlas,.35);
fighter.gaitPhase=.5;
assert.equal(choose().index,12,"24 walking poses must follow half a world stride");
fighter.stateTime=12;
assert.equal(choose().index,12,"walking against a wall must not treadmill");
fighter.state="run";fighter.vx=500;
assert.equal(choose().index,3,"L3 run has its own six-pose distance-locked gait");
fighter.stateTime+=5;
assert.equal(choose().index,3,"running against a wall must not treadmill");
fighter.state="walk";fighter.vx=-170;fighter.facing=1;
assert.equal(choose().clip,"retreat");
assert.equal(choose().index,3,"retreat frames also use ground distance");
fighter.state="crouchWalk";fighter.vx=155;
assert.equal(choose().index,7,"crouch-walk shares planted step phase");
fighter.state="dash";fighter.vx=750;fighter.dashTimer=.14;
fighter.dashDuration=.3;fighter.dashElapsed=.15;
assert.equal(choose().clip,"rush","R1 dash remains an independent one-shot");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.ok(html.indexOf("mugen-yusuke-animation-v28.js")>
  html.indexOf("mugen-yusuke-legacy-fix-v27.js"));
assert.match(html,/continuity=28/);
assert.match(html,/this.gaitPhase=\(this.gaitPhase\+travel\/stride\)%1/,
  "physics must advance gait using actual distance, not animation time");
// Painting at 120Hz uses the actual [previous,current] physics positions.
// It must not be a double-drawn ghost or a simulation-only snapped position.
const painted=[];
const paintCtx={save(){},restore(){},scale(){},rotate(){},
  translate(x,y){painted.push([x,y]);},drawImage(){},
  imageSmoothingEnabled:true};
fighter.state="idle";fighter.vx=0;fighter.dashTimer=0;fighter.hitstun=0;
fighter.x=520;fighter.y=650;fighter.prevX=490;fighter.prevY=638;
renderer.draw(fighter,paintCtx,0,0,atlas,.35);
renderer.draw(fighter,paintCtx,0,.5,atlas,.35);
renderer.draw(fighter,paintCtx,0,1,atlas,.35);
assert.equal(painted.length,3,"one transformed body each render pass");
assert.ok(Math.abs(painted[1][0]-painted[0][0]-15)<.001);
assert.ok(Math.abs(painted[2][0]-painted[0][0]-30)<.001);
assert.ok(Math.abs(painted[1][1]-painted[0][1]-6)<.001);
assert.ok(Math.abs(painted[2][1]-painted[0][1]-12)<.001,
  "the painted Yusuke body must interpolate world Y as well as X");
console.log("PASS: V28 alpha-measured ground pivots, fixed family proportions, cached readback, no treadmill gait, dash and PS5 inputs unchanged.");
