"use strict";
// Regression for small, muted-by-setting original combat cues.
// Uses a synthetic AudioContext, never starts hardware sound in CI.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const code=fs.readFileSync("mugen-sfx-v8.js","utf8");
const root={};
vm.runInNewContext(code,{window:root});
const sfx=root.MugenSFX;
assert.ok(sfx && sfx.play);
for(const key of ["swing","swing-heavy","impact-light","impact-heavy",
 "block","jump","land","dash","spirit-charge","shotgun","spirit-shot"]){
 assert.ok(sfx.voices[key],"missing cue "+key);
}
const events=[],param=()=>({
 value:0,
 setValueAtTime(v,t){events.push(["set",v,t]);},
 linearRampToValueAtTime(v,t){events.push(["linear",v,t]);},
 exponentialRampToValueAtTime(v,t){events.push(["exp",v,t]);}
});
function node(extra={}){
 return Object.assign({connect(){return this;},disconnect(){},start(t){events.push(["start",t]);},
  stop(t){events.push(["stop",t]);},frequency:param(),gain:param()},extra);
}
const ctx={
 currentTime:1,state:"running",sampleRate:44100,destination:node(),
 createGain(){return node();},
 createOscillator(){return node();},
 createBiquadFilter(){return node({Q:{value:0}});},
 createStereoPanner(){return node({pan:{value:0}});},
 createBuffer(channels,length,rate){
  assert.equal(channels,1);assert.ok(length<14000);
  return {getChannelData(){return new Float32Array(length)}};
 },
 createBufferSource(){return node();}
};
assert.equal(sfx.play(ctx,"dash",{strength:.35,pan:-.3}),true);
assert.ok(events.some(e=>e[0]==="start"));
assert.ok(events.some(e=>e[0]==="stop"));
assert.equal(sfx.stats(ctx).plays,1);
assert.equal(sfx.play(ctx,"dash",{strength:.35}),false,"cooldown prevents a wall of dash audio");
ctx.currentTime+=.16;
assert.equal(sfx.play(ctx,"dash",{strength:.35}),true);
assert.equal(sfx.play(ctx,"not-a-cue"),false);
ctx.state="suspended";
assert.equal(sfx.play(ctx,"impact-heavy"),false,"restricted browser remains silent");
ctx.state="running";ctx.currentTime+=.5;
assert.equal(sfx.play(ctx,"impact-heavy",{strength:.7}),true);
assert.ok(sfx.stats(ctx).plays>=3);
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-sfx-v8\.js\?v=1/);
assert.match(html,/function playCombatSfx\(/);
assert.match(html,/window\.MugenPlayCombatSfx = playCombatSfx/);
assert.match(html,/!soundOn \|\| !window\.MugenSFX\?\.play/);
assert.match(html,/window\.MugenPlayCombatSfx\?\.\("dash"/);
assert.match(html,/window\.MugenPlayCombatSfx\?\.\("jump"/);
assert.match(html,/window\.MugenPlayCombatSfx\?\.\("spirit-shot"/);
assert.match(html,/window\.MugenPlayCombatSfx\?\.\("shotgun"/);
assert.match(html,/const impactSound = blocked/);
assert.doesNotMatch(html,/mugen-combat-sfx-v8\.js/,"only one sound library should be loaded");
console.log("PASS: quiet original fight cues, block/hit/shotgun/dash timing, sound toggle and graceful audio restrictions.");
