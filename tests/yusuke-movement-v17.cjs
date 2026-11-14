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
const running = pose("walk", .2, 470);
assert.equal(running.image._src, folder + names[3]);
assert.ok(running.index < 6);
const dashed = pose("walk", .2, 1030, {dashTimer:.08});
assert.equal(dashed.image._src, folder + names[3]);
assert.ok(dashed.index >= 6);
assert.equal(pose("attack", .12).image, oldArt, "Combat source must not change");
assert.equal(pose("hit", .12).image, oldArt, "Hit reactions must not change");
const idleFrames = new Set(Array.from({length:12}, (_,i) => pose("idle",i/12).index));
const walkFrames = new Set(Array.from({length:12}, (_,i) => pose("walk",i/13,160).index));
assert.equal(idleFrames.size,12, "All 12 idle frames must be reachable");
assert.equal(walkFrames.size,12, "All 12 walk frames must be reachable");
const noImage={};vm.runInNewContext(code,{window:noImage,Math});
const old = noImage.MugenExactYusuke.build(oldArt);
assert.equal(noImage.MugenExactYusuke.pose(fighter,old,.2).image,oldArt,
  "Retain source-art fallback if Image loading unsupported");
console.log("PASS: V17 movement: four true-alpha 12-frame atlases, correct states and fallbacks");
