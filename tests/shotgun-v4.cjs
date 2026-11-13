"use strict";
// Anime-reference Spirit Shotgun regression: VFX and gameplay damage stay separate.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const moduleText=fs.readFileSync("mugen-shotgun-v4.js","utf8");
new vm.Script(moduleText,{filename:"mugen-shotgun-v4.js"});
const scope={window:{}};
vm.runInNewContext(moduleText,scope);
const v=scope.window.MugenShotgun;
assert.ok(v?.onFire && v?.onImpact && v?.drawFan && v?.drawWindup && v?.drawPellet);
const config=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const fx=config.combat.projectileVfx.shotgun;
const attacks=config.combat.attacks;
assert.equal(config.combat.projectile.shotgun.pellets,7,"seven gameplay hitboxes, not forty");
assert.equal(fx.visualPellets,40,"reference fan needs forty visual fragments");
assert.equal(fx.visualOnly,true,"extra effects cannot deal damage");
assert.equal(attacks.shotgun.spawnTime,fx.chargeDuration,"charge flash aligns with shot release");
assert.equal(config.combat.attacks.shotgun.projectile,"spiritShotgun");
assert.equal(config.combat.attacks.shotgun.cost,30);
assert.equal(config.combat.combo.squarePressesRequired,3);
assert.equal(config.powerKickSpriteSheet.frames.length,8);

const calls={ellipse:0,fill:0,arc:0,stroke:0,radial:0,linear:0};
const gradient={addColorStop(){}};
const ctx=new Proxy({
  save(){},restore(){},translate(){},rotate(){},scale(){},
  beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},
  createRadialGradient(){calls.radial++;return gradient;},
  createLinearGradient(){calls.linear++;return gradient;},
  ellipse(){calls.ellipse++;},arc(){calls.arc++;},
  fill(){calls.fill++;},stroke(){calls.stroke++;},fillRect(){}
},{
  get(obj,key){return key in obj?obj[key]:()=>{};},
  set(obj,key,value){obj[key]=value;return true;}
});
const player={cpu:false,x:300,y:600,facing:1,stateTime:.14,currentAttack:()=>"shotgun"};
const cpu={cpu:true,x:800,y:600,facing:-1,stateTime:0,currentAttack:()=>null};
const game={player,cpu,state:"play",paused:false};
v.drawWindup(game,ctx,1500,fx);
assert.ok(calls.radial>0 && calls.stroke>0,"charge flare before release");
const fan=v.onFire(game,player,385,468,1,fx);
assert.equal(fan.fragments.length,40);
assert.equal(v.stats(game).fired,1);
assert.equal(v.stats(game).visualFragments,40);
v.tick(game,.10);
v.drawFan(game,ctx,1600);
assert.ok(calls.ellipse>=40,"fan draws many distinct small shots");
assert.ok(calls.linear>0,"opening fan has visible cone bloom");
v.drawPellet(ctx,{radius:8,owner:player,vx:900,vy:50},560,470,1600);
assert.ok(calls.ellipse>=42,"physical collision pellet still has own small shot appearance");

v.onImpact(game,625,450,false,fx);
assert.equal(v.stats(game).activeImpacts,1);
v.drawImpacts(game,ctx,1700);
assert.ok(calls.arc>=34,"impact produces many distinct small light marks");
for(let i=0;i<55;i++)v.tick(game,1/60);
assert.equal(v.stats(game).activeFans,0,"fan effects expire and do not accumulate");
assert.equal(v.stats(game).activeImpacts,0,"impact effects expire and do not accumulate");
v.reset(game);
assert.equal(v.stats(game).fired,0,"round reset removes prior visual state");

// Source-level checks complement the actual browser play-through.
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-shotgun-v4\.js\?v=1/);
assert.match(html,/MugenShotgun\?\.onFire\(this, owner/);
assert.match(html,/MugenShotgun\?\.onImpact\(this, projectile\.x/);
assert.match(html,/MugenShotgun\?\.drawFan\(this, context, time\)/);
assert.match(html,/MugenShotgun\?\.drawImpacts\(this, context, time\)/);
assert.match(html,/MugenShotgun\.drawPellet\(context, projectile, x, y, time\)/);
assert.match(html,/choose\("shotgunFist"\)/);
console.log("PASS: reference Shotgun 40-shot fan, timed fist charge, clusters, seven hitboxes, cleanup.");
