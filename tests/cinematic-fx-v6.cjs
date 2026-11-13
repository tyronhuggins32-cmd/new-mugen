"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const moduleText=fs.readFileSync("mugen-cinematic-fx-v6.js","utf8");
new vm.Script(moduleText,{filename:"mugen-cinematic-fx-v6.js"});
const env={window:{}};
vm.runInNewContext(moduleText,env);
const fx=env.window.MugenCinematicFX;
assert.ok(fx && fx.onHit && fx.drawBehind && fx.drawFront && fx.reset);
const actions={arc:0,ellipse:0,fill:0,stroke:0};
const ctx=new Proxy({
 save(){},restore(){},beginPath(){},closePath(){},
 translate(){},scale(){},moveTo(){},lineTo(){},
 arc(){actions.arc++;},ellipse(){actions.ellipse++;},
 fill(){actions.fill++;},stroke(){actions.stroke++;}
},{get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){o[k]=v;return true;}});
const game={paused:false};
const striker={cpu:false,facing:1},target={cpu:true};
fx.onHit(game,striker,target,{damage:20,heavyImpact:false},false,520,380);
assert.equal(fx.stats(game).activeHits,1);
fx.drawBehind(game,ctx,1000);
fx.drawFront(game,ctx,1000);
assert.ok(actions.stroke>=20 && actions.fill>=1,"normal hit draws impact arcs and speed streaks");
fx.onHit(game,striker,target,{damage:43,heavyImpact:true},false,620,300);
assert.equal(fx.stats(game).activeHits,2);
fx.drawFront(game,ctx,1050);
assert.ok(actions.ellipse>0,"heavy attack draws elliptical kinetic shockwave");
for(let i=0;i<26;i++)fx.tick(game,1/60);
assert.equal(fx.stats(game).activeHits,0,"effects expire and never accumulate indefinitely");
fx.onHit(game,striker,target,{damage:42,heavyImpact:true},true,500,300);
fx.reset(game);
assert.equal(fx.stats(game).activeHits,0,"round reset clears stale sparks");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-cinematic-fx-v6\.js\?v=1/);
assert.match(html,/MugenCinematicFX\?\.onHit\(this, attacker, defender, attack, blocked/);
assert.match(html,/MugenCinematicFX\?\.drawBehind\(this, context, time\)/);
assert.match(html,/MugenCinematicFX\?\.drawFront\(this, context, time\)/);
assert.match(html,/MugenCinematicFX\?\.tick\(this, dt\)/);
console.log("PASS: high-impact anime VFX on contact, bounded particle lifetime, clear reset.");
