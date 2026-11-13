"use strict";
// Validate generated movement cels, 30 FPS sampling, and player transitions.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const js = fs.readFileSync("yusuke-motion.js", "utf8");
const config = JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json", "utf8"));
const calls = [];
const context = {
  save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
  translate() {}, transform() {}, drawImage(...args) { calls.push(args); }
};
const window = {};
const document = { createElement(tag) {
  assert.equal(tag, "canvas");
  return { width: 0, height: 0, getContext(kind) {
    assert.equal(kind, "2d");
    return context;
  } };
} };
vm.runInNewContext(js, { window, document }, { filename: "yusuke-motion.js" });
const Motion = window.MugenMotion;
assert.equal(Motion.fps, 30);
const atlas = Motion.createAtlas({ naturalWidth: 1536, naturalHeight: 1024 },
  config.spriteSheet.frames, config.spriteSheet.scale);
assert.equal(atlas.count, 120);
assert.equal(atlas.fps, 30);
assert.equal(atlas.image.width, 2400);
assert.equal(atlas.image.height, 2880);
assert.equal(atlas.frames.length, 120);
assert.ok(calls.length > atlas.frames.length, "intermediate cels combine original frames");
for (const [name, count] of Object.entries(config.movementSprites.animations)) {
  const animation = atlas.animations[name];
  assert.ok(animation, name + " must be generated");
  assert.equal(animation.fps, 30);
  assert.equal(animation.frames.length, count);
  assert.equal(new Set(animation.frames).size, count);
  for (const index of animation.frames) {
    const frame = atlas.frames[index];
    assert.ok(frame.x >= 0 && frame.y >= 0);
    assert.ok(frame.x + frame.w <= atlas.image.width);
    assert.ok(frame.y + frame.h <= atlas.image.height);
  }
}
const run = atlas.animations.run;
assert.equal(Motion.frameAt(run, 0), run.frames[0]);
assert.equal(Motion.frameAt(run, 0.032), run.frames[0]);
assert.equal(Motion.frameAt(run, 1 / 30), run.frames[1]);
assert.equal(Motion.frameAt(run, 0.067), run.frames[2]);
assert.equal(Motion.frameAt(run, 0.1), run.frames[3]);
assert.equal(Motion.frameAt(run, 0.999), run.frames[29]);
assert.equal(Motion.frameAt(run, 1), run.frames[0], "walk loop must wrap");
assert.equal(config.movementSprites.generatedFrames, atlas.count);

const fighter = { state: "idle", stateTime: 0, grounded: true, vy: 0 };
assert.equal(Motion.selectPose(fighter, atlas).clip, "idle");
fighter.state = "walk"; fighter.stateTime = 0.1;
const accelerating = Motion.selectPose(fighter, atlas);
assert.equal(accelerating.clip, "walkStart");
assert.ok(accelerating.transitionFrame && accelerating.transitionMix > 0);
fighter.stateTime = 0.4;
assert.equal(Motion.selectPose(fighter, atlas).clip, "run");
fighter.state = "idle"; fighter.stateTime = 0.1;
const braking = Motion.selectPose(fighter, atlas);
assert.equal(braking.clip, "walkStop");
assert.ok(braking.transitionFrame && braking.transitionMix > 0);
fighter.state = "jump"; fighter.grounded = false; fighter.vy = -300; fighter.stateTime = 0;
assert.equal(Motion.selectPose(fighter, atlas).clip, "jumpRise");
fighter.vy = 200;
assert.equal(Motion.selectPose(fighter, atlas).clip, "jumpFall");
fighter.grounded = true; fighter.state = "idle"; fighter.stateTime = 0.1;
assert.equal(Motion.selectPose(fighter, atlas).clip, "landing");
fighter.state = "attack-light";
assert.equal(Motion.selectPose(fighter, atlas, false), null, "attacks retain their art");

const html = fs.readFileSync("game-build-0009.html", "utf8");
assert.match(html, /<script src="yusuke-motion\.js\?v=2"><\/script>/);
assert.match(html, /MugenMotion\?\.createAtlas/);
assert.match(html, /MugenMotion\?\.selectPose/);
assert.match(html, /motionPose\.transitionMix/);
assert.match(html, /const tween = motionPose \? null/);
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).find(s => s.includes("function selectYusukeCombatPose"));
assert.ok(inline);
new vm.Script(inline, { filename: "game-build-0009-inline.js" });
console.log("Yusuke motion: 120 cached cels, exact 30 FPS, transitions, and renderer verified.");
