"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const manifest=fs.readFileSync("characters/gumball/gumball.js","utf8");
const scope={window:{},Image:function(){},arena:{floor:600,left:68,right:1212,width:1280,height:720}};
vm.runInNewContext(manifest,scope);
const c=scope.window.GumballCharacter;
assert.equal(c.profile.name,"Gumball Watterson");
assert.equal(c.profile.specialMoves.length,5);
assert.equal(c.sprite.frameCount,96);
assert.deepEqual(Array.from(c.attacks.jab?Object.keys(c.attacks):[]).length,13);
for(const [name,a] of Object.entries(c.attacks)){
  assert.ok(a.duration>a.activeEnd && a.activeEnd>a.activeStart && a.activeStart>=0,name+" startup/active/recovery");
  assert.ok(a.damage>0&&a.range>0&&a.height>0,name+" hitbox/damage");
}
for(const [name,clip] of Object.entries(c.animations)){
  assert.ok(clip.frames.length>0&&clip.fps>0,name+" animation clip");
  assert.ok(clip.frames.every(n=>Number.isInteger(n)&&n>=0&&n<96),name+" frame bounds");
}
const source=fs.readFileSync("game-build-0009.html","utf8");
assert.match(source,/GumballCombat/);
assert.match(source,/GumballUltimate/);
assert.match(source,/gumball-sprites\.png/);
console.log("PASS: Gumball package profile, 5 specials, sprite clips, attack phases, collision dimensions and game adapter wiring.");
