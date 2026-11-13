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
assert.equal(Object.keys(c.attacks).length,13);
for(const [name,attack] of Object.entries(c.attacks)){
  assert.ok(attack.duration>attack.activeEnd,name+" has recovery");
  assert.ok(attack.activeEnd>attack.activeStart,name+" has active frames");
  assert.ok(attack.activeStart>=0,name+" has startup");
  assert.ok(attack.damage>0&&attack.range>0&&attack.height>0,name+" has a collision box");
}
for(const [name,clip] of Object.entries(c.animations)){
  assert.ok(clip.frames.length>0&&clip.fps>0,name+" animation clip");
  assert.ok(clip.frames.every(n=>Number.isInteger(n)&&n>=0&&n<96),name+" frame bounds");
}
const combat=fs.readFileSync("characters/gumball/gumball-combat.js","utf8");
assert.match(combat,/gumball-sprites\.png/);
assert.match(combat,/drawMoveVfx/);
assert.match(combat,/hitStopHeavy/);
const ultimate=fs.readFileSync("characters/gumball/gumball-ultimate.js","utf8");
assert.match(ultimate,/reality-break/);
assert.match(ultimate,/strikes/);
const game=fs.readFileSync("game-build-0009.html","utf8");
assert.match(game,/data-character="gumball_watterson"/);
assert.match(game,/GumballUltimate/);
assert.match(game,/GumballCombat/);
const fighter=game.slice(game.indexOf("class Fighter"),game.indexOf("class CPUController"));
assert.equal((fighter.match(/beginAttack\(type\) \{/g)||[]).length,1,"single fighter attack dispatcher");
console.log("PASS: Gumball profile, five specials, 13 phased hitboxes, animation clips, combat adapter and ultimate wiring.");
