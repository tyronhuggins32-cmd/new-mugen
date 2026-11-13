"use strict";
// Regression gate for low-allocation 60 Hz virtual motion and player transitions.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("yusuke-motion.js", "utf8");
const config = JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json", "utf8"));
const window = {};
// The motion layer must not allocate any offscreen raster atlas.
const document = { createElement() { throw new Error("Motion samples must not allocate a canvas"); } };
vm.runInNewContext(source, { window, document }, { filename: "yusuke-motion.js" });
const motion = window.MugenMotion;
assert.equal(motion.fps, 60);
const sourceImage = { naturalWidth: 1536, naturalHeight: 1024, width:1536, height:1024 };
const atlas = motion.createAtlas(sourceImage, config.spriteSheet.frames, config.spriteSheet.scale);
assert.equal(atlas.image, sourceImage, "original artwork must be reused instead of re-rendered");
assert.equal(atlas.frames.length, 24);
assert.equal(atlas.fps, 60);
assert.equal(atlas.count, 133);
assert.equal(atlas.count, config.movementSprites.timelineFrames);
assert.equal(atlas.textureCount, 1);
assert.equal(config.movementSprites.additionalTexturePixels, 0);

for (const [name, count] of Object.entries(config.movementSprites.animations)) {
  const animation = atlas.animations[name];
  assert.ok(animation, name + " animation must exist");
  assert.equal(animation.fps, 60);
  assert.equal(animation.frames.length, count);
  for (const index of animation.frames) {
    assert.ok(Number.isInteger(index) && index >= 0 && index < 24, "only existing sprite frames");
  }
}
const run = atlas.animations.run;
assert.equal(motion.frameAt(run, 0), run.frames[0]);
assert.equal(motion.frameAt(run, 1 / 60), run.frames[1]);
assert.equal(motion.frameAt(run, 2 / 60), run.frames[2]);
assert.equal(motion.frameAt(run, 28 / 60), run.frames[0], "virtual run must loop");
assert.notEqual(run.frames[0], run.frames[14], "run must show distinct keyed poses");
assert.throws(() => motion.createAtlas(null, []), /original 24-frame/);

const fighter = { state:"idle",stateTime:0,grounded:true,vy:0,facing:1,vx:0 };
assert.equal(motion.selectPose(fighter,atlas).clip,"idle");
fighter.state="walk"; fighter.stateTime=.03;
const accelerating=motion.selectPose(fighter,atlas);
assert.equal(accelerating.clip,"walkStart");
assert.ok(accelerating.transitionFrame && accelerating.transitionMix>0);
fighter.stateTime=.19;
assert.equal(motion.selectPose(fighter,atlas).clip,"run");
fighter.state="idle";fighter.stateTime=.04;
const braking=motion.selectPose(fighter,atlas);
assert.equal(braking.clip,"walkStop");
assert.ok(braking.transitionFrame && braking.transitionMix<1);
fighter.state="jump";fighter.grounded=false;fighter.vy=-300;fighter.stateTime=0;
assert.equal(motion.selectPose(fighter,atlas).clip,"jumpRise");
fighter.vy=300;
assert.equal(motion.selectPose(fighter,atlas).clip,"jumpFall");
fighter.grounded=true;fighter.state="idle";fighter.stateTime=.05;
assert.equal(motion.selectPose(fighter,atlas).clip,"landing");
fighter.state="attack-light";
assert.equal(motion.selectPose(fighter,atlas,false),null,"combat moves retain combat art");

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html, /<script src="yusuke-motion\.js\?v=3"><\/script>/);
assert.match(html, /<script src="mugen-fluid-v3\.js\?v=1"><\/script>/);
assert.match(html, /MugenMotion\?\.createAtlas/);
assert.match(html, /MugenMotion\?\.selectPose/);
assert.match(html, /window.MugenFluid\?\.drawCel/);
assert.match(html, /motionPose\.transitionMix/);
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1]).find(s=>s.includes("function selectYusukeCombatPose"));
assert.ok(inline);
new vm.Script(inline,{filename:"game-build-0009-inline.js"});
console.log("PASS: 133 virtual 60 Hz motion samples, no extra raster textures, responsive state transitions.");
