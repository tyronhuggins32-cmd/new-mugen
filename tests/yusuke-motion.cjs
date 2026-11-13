"use strict";
// Source-fidelity, atlas-budget, timing, fallback and texture-safe transition tests.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("yusuke-motion.js", "utf8");
const config = JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json", "utf8"));
const image = { naturalWidth:1536, naturalHeight:1024, width:1536, height:1024 };
const drawings = [];
let madeCanvases = 0;
const document = {
  createElement(tag) {
    assert.equal(tag,"canvas");
    madeCanvases++;
    return { width:0, height:0, getContext(mode, options) {
      assert.equal(mode,"2d");
      assert.equal(options.alpha,true);
      return { imageSmoothingEnabled:true, drawImage(...args) { drawings.push(args); } };
    } };
  }
};
function install(doc) {
  const window = {};
  vm.runInNewContext(source,{window,document:doc},{filename:"yusuke-motion.js"});
  return window.MugenMotion;
}
const motion = install(document);
assert.equal(motion.fps,40);
const atlas = motion.createAtlas(image,config.spriteSheet.frames,config.spriteSheet.scale);
assert.equal(atlas.image,image);
assert.equal(atlas.generated,true);
assert.equal(madeCanvases,1,"only one small sprite texture is allocated");
assert.equal(atlas.derivedImage.width,1024);
assert.equal(atlas.derivedImage.height,1792);
assert.equal(atlas.textureCount,2);
assert.equal(atlas.derivedFrameCount,28);
assert.equal(atlas.derivedFrameCount-config.movementSprites.existingGeneratedFrames,12);
assert.equal(atlas.frames.length,52);
assert.equal(atlas.sourceCount,24);
assert.equal(atlas.count,188);
assert.equal(atlas.count,config.movementSprites.timelineFrames);
assert.equal(atlas.derivedFrameCount,config.movementSprites.generatedFrames);
assert.equal(atlas.derivedImage.width*atlas.derivedImage.height,config.movementSprites.maxAdditionalTexturePixels);
assert.equal(config.movementSprites.consistency.renderScale,config.spriteSheet.scale);
assert.equal(config.movementSprites.consistency.recoloring,false);
assert.equal(drawings.length,28*8,"each generated sprite uses eight source-pixel strips");
assert.ok(drawings.every(args=>args[0]===image),"all derived pixels must be sampled from Yusuke's original sheet");
for (const args of drawings) {
  assert.equal(args.length,9);
  assert.ok(args[3]>0&&args[4]>0);
  assert.ok(args[5]>=0&&args[5]+args[7]<=1025);
  assert.ok(args[6]>=0&&args[6]+args[8]<=1793);
}
for(const [i,pose] of atlas.frames.slice(24).entries()) {
  assert.equal(pose.x,(i%4)*256);
  assert.equal(pose.y,Math.floor(i/4)*256);
  assert.equal(pose.w,256);
  assert.equal(pose.h,256);
  assert.equal(pose.ax,128,"fixed center pivot");
  assert.ok(pose.x+pose.w<=1024&&pose.y+pose.h<=1792);
}
for(const [name,count] of Object.entries(config.movementSprites.animations)) {
  const animation=atlas.animations[name];
  assert.ok(animation,name+" clip exists");
  assert.equal(animation.fps,40);
  assert.equal(animation.frames.length,count);
  assert.ok(animation.frames.every(n=>Number.isInteger(n)&&n>=0&&n<52));
}
assert.ok(atlas.animations.idle.frames.some(n=>n>=24&&n<32),"idle must use new actual sprite cels");
assert.ok(atlas.animations.run.frames.some(n=>n>=32&&n<40),"run must use new actual sprite cels");
const run=atlas.animations.run;
assert.equal(motion.frameAt(run,0),run.frames[0]);
assert.equal(motion.frameAt(run,1/40),run.frames[1]);
assert.equal(motion.frameAt(run,24/40),run.frames[0]);
assert.notEqual(run.frames[0],run.frames[14]);
assert.throws(()=>motion.createAtlas(null,[]),/original 24-frame/);

const fighter={state:"idle",stateTime:0,grounded:true,vy:0,facing:1,vx:0};
const start=motion.selectPose(fighter,atlas);
assert.equal(start.clip,"idle");
assert.equal(start.image,atlas.derivedImage);
fighter.state="walk";fighter.stateTime=.03;
const accelerating=motion.selectPose(fighter,atlas);
assert.equal(accelerating.clip,"walkStart");
assert.ok(accelerating.transitionFrame&&accelerating.transitionImage===atlas.derivedImage);
fighter.stateTime=.25;
assert.equal(motion.selectPose(fighter,atlas).clip,"run");
fighter.state="idle";fighter.stateTime=.04;
const braking=motion.selectPose(fighter,atlas);
assert.equal(braking.clip,"walkStop");
assert.ok(braking.transitionFrame&&braking.transitionMix<1);
fighter.stateTime=2.6;
assert.equal(motion.selectPose(fighter,atlas).clip,"idleFocus");
fighter.state="jump";fighter.grounded=false;fighter.vy=-300;fighter.stateTime=0;
assert.equal(motion.selectPose(fighter,atlas).clip,"jumpRise");
fighter.vy=300;
assert.equal(motion.selectPose(fighter,atlas).clip,"jumpFall");
fighter.grounded=true;fighter.state="idle";fighter.stateTime=.05;
assert.equal(motion.selectPose(fighter,atlas).clip,"landing");

// Twelve added reaction cels must be distinct, with the same source-image
// pixel provenance, planted foot pivot and grouped animation clips.
assert.equal(motion.sources.length,28);
assert.equal(config.movementSprites.newGeneratedFrames,12);
assert.ok(config.movementSprites.reactionFrames.stagger.every(n=>n>=40&&n<44));
assert.ok(config.movementSprites.reactionFrames.knockback.every(n=>n>=44&&n<48));
assert.ok(config.movementSprites.reactionFrames.recovery.every(n=>n>=48&&n<52));
fighter.state="hit";fighter.hitReaction="stagger";fighter.stateTime=.075;
let reaction=motion.selectPose(fighter,atlas);
assert.equal(reaction.clip,"stagger");
assert.ok(reaction.index>=40&&reaction.index<44);
assert.equal(reaction.image,atlas.derivedImage);
fighter.hitReaction="knockback";fighter.stateTime=.125;
reaction=motion.selectPose(fighter,atlas);
assert.equal(reaction.clip,"knockback");
assert.ok(reaction.index>=44&&reaction.index<48);
fighter.state="idle";fighter.grounded=true;fighter.stateTime=.04;
reaction=motion.selectPose(fighter,atlas);
assert.equal(reaction.clip,"recovery");
assert.ok(reaction.index>=48&&reaction.index<52);
assert.ok(reaction.transitionFrame&&reaction.transitionImage===atlas.derivedImage);

// Returning from attacks must carry both the prior sprite AND its source image.
fighter.state="attack-light";fighter.stateTime=.15;
assert.equal(motion.selectPose(fighter,atlas,false),null);
const attackImage={name:"canonical-combat-sheet"},attackFrame={x:10,y:10,w:130,h:197,ax:65};
motion.rememberPose(fighter,attackFrame,attackImage);
fighter.state="idle";fighter.stateTime=.035;
const recovering=motion.selectPose(fighter,atlas);
assert.equal(recovering.transitionFrame,attackFrame);
assert.equal(recovering.transitionImage,attackImage);
assert.ok(recovering.transitionMix>0&&recovering.transitionMix<1);

// Simulate an older browser or memory pressure: original cels still work.
const fallback=install({createElement(){throw new Error("canvas unsupported");}});
const original=fallback.createAtlas(image,config.spriteSheet.frames,config.spriteSheet.scale);
assert.equal(original.generated,false);
assert.equal(original.textureCount,1);
assert.equal(original.derivedFrameCount,0);
assert.equal(original.frames.length,24);
assert.equal(original.count,188);
for(const clip of Object.values(original.animations)) {
  assert.ok(clip.frames.every(n=>n>=0&&n<24));
}
const basic={state:"idle",stateTime:0,grounded:true,vy:0};
assert.equal(fallback.selectPose(basic,original).image,image);

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/<script src="yusuke-motion\.js\?v=5"><\/script>/);
assert.match(html,/MugenMotion\?\.createAtlas/);
assert.match(html,/MugenMotion\?\.selectPose/);
assert.match(html,/MugenMotion\?\.rememberPose/);
assert.match(html,/handoff\.transitionImage/);
assert.match(html,/const handoff = premiumPose\?\.part === "square" \? null/);
assert.match(html,/: premiumPose\?\.transitionFrame \? premiumPose/);
assert.match(html,/: premiumPose \? null : motionPose/);

assert.match(html,/previousSheet/);
assert.match(html,/window\.MugenFluid\?\.drawCel/);
assert.match(html,/defender\.hitReaction = !blocked/);
assert.match(html,/this\.state === "hit" && yusukeMotionAtlas\?\.generated/);
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1]).find(s=>s.includes("function selectYusukeCombatPose"));
assert.ok(inline);
new vm.Script(inline,{filename:"game-build-0009-inline.js"});
console.log("PASS: 28 derived Yusuke cels including 12 reaction sprites, 40 FPS clips, cross-sheet transitions and fallback.");
