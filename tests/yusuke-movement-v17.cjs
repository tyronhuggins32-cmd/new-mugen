"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const folder = "characters/yusuke/";
const names = [
  "yusuke_idle_12frames.png",
  "yusuke_walk_forward_12frames.png",
  "yusuke_walk_backward_turn_12frames.png",
  "yusuke_run_dash_12frames.png"
];
for (const name of names) {
  const bytes = fs.readFileSync(folder + name);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", name);
  assert.equal(bytes.readUInt32BE(16), 1536, name);
  assert.equal(bytes.readUInt32BE(20), 512, name);
  assert.equal(bytes[25], 6, "RGBA expected: " + name);
  assert.ok(bytes.length > 300000, "Full-resolution atlas expected: " + name);
}

const code = fs.readFileSync("yusuke-exact-reference-v15.js", "utf8");
const requests = [];
class FakeImage {
  set src(value) {
    this._src = value;
    this.naturalWidth = 1536;
    this.naturalHeight = /-v16[.]png$/.test(value) ? 1024 : 512;
    requests.push(value);
    this.onload();
  }
  get src() {return this._src;}
}
const root = {Image: FakeImage};
vm.runInNewContext(code, {window: root, Math});
const exact = root.MugenExactYusuke;
const oldArt = {naturalWidth: 1536, naturalHeight: 1024};
const atlas = exact.build(oldArt);
assert.ok(atlas);
assert.equal(requests.length, 1, "V16 loads at build; new assets load lazily");
const fighter = {
  x: 300, y: 650, grounded: true, facing: 1,
  state: "idle", stateTime: 0, vx: 0, vy: 0, hitstun: 0, dashTimer: 0,
  currentAttack() {return this.state === "attack" ? "light" : null;}
};
const pose = (state, time, vx = 0, other = {}) => {
  Object.assign(fighter, {state, stateTime: time, vx, dashTimer: 0, turnTimer: 0, grounded: true}, other);
  return exact.pose(fighter, atlas, .2);
};
const idle = pose("idle", .1);
assert.equal(idle.source, "movement-v17");
assert.equal(idle.image._src, folder + names[0]);
assert.equal(requests.length, 5, "All four atlases requested once");
const walked = pose("walk", .15, 160);
assert.equal(walked.image._src, folder + names[1]);
const backwards = pose("walk", .18, -160);
assert.equal(backwards.image._src, folder + names[2]);
assert.ok(backwards.index >= 0 && backwards.index < 6);
const turned = pose("walk", .29, 0, {turnTimer: .15});
assert.equal(turned.image._src, folder + names[2]);
assert.ok(turned.index >= 6 && turned.index < 12);
const fastWalk = pose("walk", .2, 470);
assert.equal(fastWalk.image._src, folder + names[1], "Moving quickly is not enough: L3 must enable run");
const running = pose("run", .2, 470);
assert.equal(running.image._src, folder + names[3]);
assert.ok(running.index < 6);
assert.ok(running.scale >= .94, "The running art should not shrink compared with the prior .94 atlas scale");
// A sustained run stays on its own six-cel loop, while dash covers six
// different cels in one burst even when the world runs at 60 FPS.
assert.ok(running.scale<=1.0 && running.scale>=.94,
  "Running and walking should keep comparable full-body scale");
assert.match(code,/splitRunDashV20\(image\)/,
  "The live combined texture must split into distinct RUN and DASH surfaces");
const dashIndices = [0,.05,.1,.15,.2,.249].map(elapsed =>
  pose("dash", elapsed, 860, {
    dashTimer: .25 - elapsed, dashDuration: .25, dashElapsed: elapsed
  }).index);
assert.equal(new Set(dashIndices).size,6,
  "Full R1 burst should play all six distinct dash poses");
assert.equal(dashIndices[0],6);
assert.equal(dashIndices[5],11);
const dashed = pose("walk", .2, 1030, {dashTimer:.08});
assert.equal(dashed.image._src, folder + names[3]);
assert.ok(dashed.index >= 6);
assert.equal(pose("attack", .12).image, oldArt, "Combat source must not change");
assert.equal(pose("hit", .12).image, oldArt, "Hit reactions must not change");
const idleFrames = new Set(Array.from({length:12}, (_,i) => pose("idle",i/12).index));
const walkFrames = new Set(Array.from({length:12}, (_,i) => pose("walk",i/13,160).index));
assert.equal(idleFrames.size,12, "All 12 idle frames must be reachable");
assert.equal(walkFrames.size,12, "All 12 walk frames must be reachable");
// The 24-frame V21 forward walk is optional. If present at 1536×1024,
// all 24 distinct cells must play smoothly while run/dash remain independent.
class FakeImageV21 {
  set src(value) {
    this._src=value;this.naturalWidth=1536;
    this.naturalHeight=/(-v16|v21_24frames)[.]png$/.test(value)?1024:512;
    this.onload();
  }
  get src(){return this._src;}
}
const root21={Image:FakeImageV21};
vm.runInNewContext(code,{window:root21,Math});
const exact21=root21.MugenExactYusuke, atlas21=exact21.build(oldArt);
const f21={...fighter,state:"walk",stateTime:0,vx:160,dashTimer:0,
  turnTimer:0,hitstun:0,grounded:true};
const frames21=Array.from({length:24},(_,i)=>{
  f21.stateTime=i/24;
  return exact21.pose(f21,atlas21,.2);
});
assert.equal(frames21[0].source,"movement-v21",
  "Use the longer forward-walk atlas when it exists");
assert.equal(frames21[0].frameCount,24);
assert.equal(frames21[0].image._src,
  folder+"yusuke_walk_forward_v21_24frames.png");
assert.equal(new Set(frames21.map(x=>x.index)).size,24,
  "Every frame of 24-cell authored animation must be addressable");
assert.equal(frames21[23].frame.y,768,"The fourth atlas row must be read");
f21.stateTime=1;
assert.equal(exact21.pose(f21,atlas21,.2).index,0,
  "Final walk pose must loop to frame zero");
f21.state="run";f21.vx=460;
assert.equal(exact21.pose(f21,atlas21,.2).source,"movement-v17",
  "L3 run must still use independent runner sheet");
const noImage={};vm.runInNewContext(code,{window:noImage,Math});
const old = noImage.MugenExactYusuke.build(oldArt);
assert.equal(noImage.MugenExactYusuke.pose(fighter,old,.2).image,oldArt,
  "Retain source-art fallback if Image loading unsupported");
console.log("PASS: V17 movement: four true-alpha 12-frame atlases, correct states and fallbacks");
