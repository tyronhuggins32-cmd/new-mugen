"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("mugen-fluid-v3.js", "utf8");
new vm.Script(source, {filename:"mugen-fluid-v3.js"});
const calls = [];
const gradient = () => ({addColorStop(){}});
const ctx = () => new Proxy({
  canvas:{width:1280,height:720},
  drawImage(...args){ calls.push(args); },
  createRadialGradient:gradient, createLinearGradient:gradient
},{
  get(object,key){ return key in object ? object[key] : () => {}; },
  set(object,key,value){ object[key] = value; return true; }
});
let canvasAllocations=0;
const window={};
const document={createElement(tag){
  assert.equal(tag,"canvas");canvasAllocations++;
  return {width:0,height:0,getContext(){return ctx();}};
}};
vm.runInNewContext(source,{window,document,Math},{filename:"mugen-fluid-v3.js"});
const fluid=window.MugenFluid;
assert.equal(typeof fluid.beginFrame,"function");
assert.equal(typeof fluid.drawCel,"function");
assert.equal(typeof fluid.onHit,"function");
const sprite={width:1536,height:1024,naturalWidth:1536};
const tinted=fluid.tintForCpu(sprite,true);
assert.notEqual(tinted,sprite,"enemy tint must be cached to a new surface");
assert.equal(fluid.tintForCpu(sprite,true),tinted);
assert.equal(canvasAllocations,1,"recolor texture is created only once");
assert.equal(fluid.tintForCpu(sprite,false),sprite);
calls.length=0; // Exclude the one-time CPU atlas prepaint from sprite draw measurements.

const neutral={state:"idle",vx:0,vy:0,facing:1,grounded:true,stateTime:.3,
  currentAttack:()=>null};
const frame={x:120,y:40,w:130,h:190,ax:65};
const canvas=ctx();
assert.equal(fluid.drawCel(canvas,sprite,frame,-71,-209,143,209,neutral,1000),true);
assert.equal(calls.length,8,"one sprite is bent using only eight light canvas strips");
for(const args of calls) {
  assert.equal(args.length,9);
  assert.ok(args[2]>=frame.y && args[2]+args[4]<=frame.y+frame.h);
  assert.ok(Number.isFinite(args[6]) && Number.isFinite(args[7]));
}
calls.length=0;
fluid.drawCel(canvas,sprite,frame,-71,-209,143,209,neutral,1000,true);
assert.equal(calls.length,1,"ghost echoes must use one cheap draw call");
const breathingA=fluid.bend(neutral,1000),breathingB=fluid.bend(neutral,1200);
assert.notEqual(breathingA.sway,breathingB.sway,"idle animates continuously");
const sprint={...neutral,state:"walk",stateTime:.2,vx:470};
assert.ok(Math.abs(fluid.bend(sprint,1000).lean)>0,"running has continuous lean");

const hero={...neutral,x:320,y:600,prevX:300,prevY:600,dashTimer:0,cpu:false};
const cpu={...neutral,x:930,y:600,prevX:930,prevY:600,facing:-1,cpu:true};
const game={state:"play",player:hero,cpu,paused:false,shake:0};
const arena={width:1280,height:720,floor:600};
fluid.beginFrame(game,canvas,1000,arena);
fluid.beginFrame(game,canvas,1016,arena);
const original=fluid.getStats(game);
assert.ok(original.zoom>=1 && original.zoom<1.10,"camera zoom stays safe");
assert.ok(original.cameraX>=0&&original.cameraX<=1280,"camera clamped to fighting stage");
hero.x=650;cpu.x=750;
for(let i=2;i<20;i++)fluid.beginFrame(game,canvas,1000+i*16,arena);
assert.ok(fluid.getStats(game).zoom>original.zoom,"camera smoothly zooms in as fighters close");
hero.grounded=false;hero.state="jump";fluid.tick(game,1/60);
hero.y=600;hero.grounded=true;hero.state="idle";fluid.tick(game,1/60);
assert.ok(fluid.getStats(game).dust>=1,"landing triggers dust");
fluid.onHit(game,hero,cpu,false,true,700,430);
assert.equal(fluid.getStats(game).rings,1);
assert.equal(fluid.getStats(game).slashes,12,"heavy blows create directional streaks");
assert.equal(fluid.getStats(game).flashes,1,"contact flashes render with shockwaves");
hero.state="hit";hero.hitReaction="knockback";hero.vx=650;
for(let i=0;i<3;i++)fluid.tick(game,1/60);
assert.ok(fluid.getStats(game).trails>=1,"knockback emits short-lived ground streaks");
hero.state="idle";hero.vx=0;
fluid.drawBehind(game,canvas,1400);
fluid.drawFront(game,canvas,1400);
for(let i=0;i<32;i++)fluid.tick(game,1/60);
assert.equal(fluid.getStats(game).rings,0,"impact shockwaves expire");
assert.equal(fluid.getStats(game).slashes,0,"impact streaks must expire");
assert.equal(fluid.getStats(game).flashes,0,"contact flashes must expire");
assert.equal(fluid.getStats(game).trails,0,"skid traces must expire");
fluid.onHit(game,hero,cpu,true,false,650,410);
assert.equal(fluid.getStats(game).slashes,3,"blocking produces a smaller visible spark");
assert.ok(fluid.getStats(game).slashes<=88,"impact streaks are bounded");

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/MugenFluid\.beginFrame\(this, context, time, arena\)/);
assert.match(html,/MugenFluid\?\.tick\(this, dt\)/);
assert.match(html,/MugenFluid\?\.onHit\(this,/);
assert.match(html,/<script src="mugen-fluid-v3\.js\?v=2"><\/script>/);
assert.match(html,/if \(activeScreen === "fight"\)/);
assert.match(html,/substeps < 5/);
assert.match(html,/updateHud\(force = false\)/);
assert.doesNotMatch(html,/loadSpriteAsset\(yusukeSpecialSheet/);
console.log("PASS: dynamic deformation, tinted fighter caching, bounded camera, dust, shockwaves, optimized fight loop.");
