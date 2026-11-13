"use strict";
/* Gameplay-meaningful tests for airborne crossing, pose-accurate hitboxes,
   and visible sprites rather than fake procedural impact blobs. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const scope={window:{}};
vm.runInNewContext(fs.readFileSync("mugen-combat-v5.js","utf8"),scope);
const physics=scope.window.MugenCombatV5;
const arena={left:68,right:2532,width:2600,height:720,floor:600};
function fighter(x,y=600,grounded=y===600){
 const f={x,y,width:84,height:194,vx:400,facing:1,grounded,
  state:grounded?"idle":"jump",attackConnected:false,
  currentAttack(){return this.attack||"light";}};
 Object.defineProperty(f,"hurtbox",{get(){return physics.hurtbox(f)}});
 return f;
}
const ground=fighter(690);
const air=fighter(635,600,false);
air.y=550;
assert.ok(physics.separate(air,ground,arena),"low jumping feet still collide with pushbox");
assert.ok(air.vx>0,"horizontal jumping velocity must not stop on collision");
air.x=ground.x-74;air.y=480;
const prev=air.x;
assert.equal(physics.separate(air,ground,arena),false,"crossing opens once the feet pass the shoulder line");
assert.equal(air.x,prev);
assert.ok(air._crossOverActive,"crossing permission lasts through the jump");
air.y=560;air.x=ground.x+31;
assert.equal(physics.separate(air,ground,arena),false,"landing descent must not snap back");
air.grounded=true;
air._crossOverActive=false;
assert.equal(physics.separate(air,ground,arena),true,"grounded fighters return to normal spacing");
assert.ok(Math.abs(ground.x-air.x)>=142,"grounded fighters cannot merge");

const croucher=fighter(700);croucher.state="crouch";
const standing=fighter(560);
const hit={range:116,activeStart:.03,activeEnd:.13};
function intersects(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
const jab=physics.attackHitbox(standing,hit,"light");
const body=physics.attackHitbox(standing,hit,"body");
assert.ok(!intersects(jab,croucher.hurtbox),"standing high jab must go above a proper crouch");
assert.ok(intersects(body,croucher.hurtbox),"low body punch must strike crouch");
assert.ok(physics.attackHitbox(standing,hit,"upper").height>
  physics.attackHitbox(standing,hit,"light").height,"uppercut must reach a raised target");

const splashScope={window:{},Image:class MockImage{
 constructor(){this.naturalWidth=1536;this.naturalHeight=1024;}
 set src(v){this.srcValue=v;this.onload?.();}
}};
vm.runInNewContext(fs.readFileSync("mugen-vfx-v8.js","utf8"),splashScope);
const gfx=splashScope.window.MugenVfxV8;
assert.equal(gfx.ready(),true);
let drawCalls=0,wrongSourceRects=0;
const ctx=new Proxy({
 drawImage(_img,sx,sy,sw,sh,dx,dy,dw,dh){
  drawCalls++;
  if(sx%384!==0||sy%512!==0||sw!==384||sh!==512||dw<=0||dh<=0)wrongSourceRects++;
 },
 save(){},restore(){},translate(){},scale(){}
},{get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){o[k]=v;return true;}});
const game={paused:false,player:ground,cpu:croucher};
gfx.onHit(game,standing,croucher,{heavyImpact:false},false,670,440);
gfx.onImpact(game,standing,660,445,false);
gfx.onShot(game,standing,622,427,true);
gfx.drawFront(game,ctx);
assert.ok(drawCalls>=3,"real impact, energy burst and shotgun texture cels are drawn");
assert.equal(wrongSourceRects,0,"effect atlas is cropped correctly");
assert.equal(gfx.drawProjectile(ctx,{kind:"spiritGun",vx:900},540,430),true);
assert.ok(drawCalls>=4,"Spirit Gun projectile uses authored PNG artwork");
for(let i=0;i<44;i++)gfx.tick(game,1/60);
assert.equal(gfx.stats(game).active,0,"effects expire and cannot overdraw gameplay indefinitely");
gfx.reset(game);
assert.equal(gfx.stats(game).shots,0);

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-vfx-v8\.js\?v=1/);
assert.match(html,/MugenVfxV8\?\.onHit/);
assert.match(html,/MugenVfxV8\?\.onShot/);
assert.match(html,/MugenVfxV8\?\.drawFront/);
assert.match(html,/this\.jumpBuffer = \.16/);
assert.match(html,/this\._crossOverActive = false/);
console.log("PASS: air cross-over momentum, low/high punches, atlas VFX rendering and limited effects.");
