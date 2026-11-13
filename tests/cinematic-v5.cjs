"use strict";
// Cinematic combat V5: physical hit tests, readable spacing and Spirit Gun art.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const setup={window:{}};
for(const name of ["mugen-combat-v5.js","mugen-spiritgun-v5.js"]) {
  const source=fs.readFileSync(name,"utf8");
  new vm.Script(source,{filename:name});
  vm.runInNewContext(source,setup,{filename:name});
}
const g=setup.window.MugenCombatV5;
const v=setup.window.MugenSpiritGun;
const cfg=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const arena={left:68,right:1212,width:1280,height:720,floor:600};
const fighter=(x,y=600,width=84,height=194)=>({
  x,y,width,height,vx:0,facing:1,grounded:y===600,attackConnected:false,
  currentAttack(){return this.attackType;},
  get hurtbox(){return {x:this.x-this.width/2,y:this.y-this.height,
    width:this.width,height:this.height};}
});
assert.equal(g.MIN_SPACING,cfg.combat.spacing);
// Precision geometry must exist and match the high-detail sprite silhouette.
const standing=g.hurtbox({x:500,y:600,width:84,height:194,state:"idle",grounded:true});
const crouching=g.hurtbox({x:500,y:600,width:84,height:194,state:"crouch",grounded:true});
const flying=g.hurtbox({x:500,y:350,width:84,height:194,state:"jump",grounded:false});
assert.ok(standing.width<84 && standing.height<194,"hurtbox hugs the sprite");
assert.ok(crouching.height<standing.height && crouching.width<standing.width,
  "a guarded crouch presents a smaller physical silhouette");
assert.ok(flying.y+flying.height < standing.y,
  "a high jump clears the grounded opponent instead of catching an invisible wall");
const jab=g.attackHitbox({x:500,y:600,facing:1},cfg.combat.attacks.light,"light");
const body=g.attackHitbox({x:500,y:600,facing:1},cfg.combat.attacks.body,"body");
const upper=g.attackHitbox({x:500,y:600,facing:-1},cfg.combat.attacks.upper,"upper");
assert.ok(jab.x>500 && jab.width>80,"jab extends from the attacking hand");
assert.ok(body.y>jab.y,"body blow targets lower than a face jab");
assert.ok(upper.x<500 && upper.x+upper.width<500,"left-facing hitbox tracks mirrored arm");
assert.equal(g.attackHitbox({x:500,y:600},cfg.combat.attacks.gun,"gun"),null,
  "projectile moves never gain additional phantom melee hitboxes");

assert.equal(g.CONTACT_ASSIST,cfg.combat.punchAssist);
let a=fighter(500),b=fighter(510,600,76,178);
assert.equal(g.separate(a,b,arena),true);
assert.ok(b.x-a.x>=142-1e-6,"fighters must not hide inside one another");
a=fighter(68);b=fighter(92,600,76,178);
g.separate(a,b,arena);
assert.equal(a.x,68,"stage left boundary remains solid");
assert.ok(b.x-a.x>=142-1e-6,"spacing still holds at the stage edge");
a=fighter(480,230);b=fighter(490,600);
assert.equal(g.separate(a,b,arena),false,"jump-over crossups are not obstructed");
assert.equal(a.x,480);assert.equal(b.x,490);
a=fighter(500);b=fighter(685,600,76,178);
a.attackType="light";
const before=b.x-a.x;
assert.equal(g.assistPunch(a,b,cfg.combat.attacks.light,arena),true);
assert.ok(b.x-a.x<before,"punching closes a small whiff gap");
assert.ok(b.x-a.x>=142,"punch assistance cannot merge fighter bodies");
const after=a.x;
b.x=200;
assert.equal(g.assistPunch(a,b,cfg.combat.attacks.light,arena),false,
  "back-facing attacks never magnetize onto a target");
assert.equal(a.x,after);
a.grounded=false;b.x=685;
assert.equal(g.assistPunch(a,b,cfg.combat.attacks.light,arena),false,
  "no floor snap during air combos");

let hit=g.sweepCircle(100,460,360,460,16,{x:205,y:406,width:76,height:178});
assert.ok(hit && Math.abs(hit.x-189)<1e-6,"fast bullet stops at leading expanded hurtbox");
assert.ok(hit.t>0 && hit.t<1,"point of first contact falls inside physics tick");
assert.equal(g.sweepCircle(100,250,360,250,16,
  {x:205,y:406,width:76,height:178}),null,"shots miss when above the target");
assert.ok(g.sweepCircle(230,460,450,460,16,
  {x:205,y:406,width:76,height:178}).t===0,"starting inside hurtbox registers immediate contact");
assert.equal(g.sweepCircle(100,460,160,460,16,
  {x:205,y:406,width:76,height:178}),null,"no phantom hit when shot falls short");
assert.ok(g.cameraZoom(142)<g.cameraZoom(620),
  "close combat must zoom OUT rather than hide contact");
assert.ok(g.cameraZoom(142,1)<1.04 && g.cameraZoom(1000,1)<1.08,
  "cinematic focus must not crop fighter silhouettes");

// Execute the procedural VFX with a fake canvas, tracking real draw calls.
const counts={ellipses:0,arcs:0,strokes:0,rects:0};
const gradient={addColorStop(){}};
const ctx=new Proxy({
 save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
 quadraticCurveTo(){},closePath(){},translate(){},rotate(){},scale(){},
 createRadialGradient(){return gradient;},
 createLinearGradient(){return gradient;},
 fill(){},stroke(){counts.strokes++;},arc(){counts.arcs++;},
 ellipse(){counts.ellipses++;},fillRect(){counts.rects++;}
},{get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){o[k]=v;return true;}});
const gunner=fighter(350),victim=fighter(600);
gunner.energy=70;gunner.attackType="gun";gunner.stateTime=.22;
const game={player:gunner,cpu:victim,paused:false,hitStop:0,shake:0};
v.drawWindup(game,ctx,1000,cfg.combat.projectileVfx);
assert.ok(counts.rects>=1 && counts.arcs>=1 && counts.strokes>=6,
  "the fingertip charge must emit an orb, aura and energy filaments");
v.onFire(game,gunner,434,442);
assert.equal(v.stats(game).shotsFired,1);
v.drawShot(ctx,{owner:gunner,vx:1120,vy:0,radius:16,age:.11},500,442,1000);
assert.ok(counts.ellipses>0,"projectile has concentrated visible white core");
v.onImpact(game,gunner,580,450,false,false);
assert.equal(v.stats(game).shotsHit,1);
assert.ok(game.hitStop>=.10 && game.shake>=15 && game.cinematicImpact,
  "a landed Spirit Gun creates hit-stop, shake and short camera focus");
v.drawImpact(game,ctx,1016);v.drawOverlay(game,ctx,arena);
assert.ok(counts.strokes>15 && counts.rects>1,"impact has luminous explosion and screen accent");
for(let i=0;i<33;i++)v.tick(game,1/60);
assert.equal(v.stats(game).impacts,0,"impact art expires promptly");
assert.equal(game.cinematicImpact,null,"cinematic camera returns to normal");
v.reset(game);assert.equal(v.stats(game).shotsFired,0);

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-combat-v5\.js\?v=1/);
assert.match(html,/mugen-spiritgun-v5\.js\?v=1/);
assert.match(html,/MugenCombatV5\.separate\(this\.player, this\.cpu, arena\)/);
assert.match(html,/MugenCombatV5\?\.assistPunch\(attacker, defender, attack, arena\)/);
assert.match(html,/MugenCombatV5\?\.sweepCircle\(/);
assert.match(html,/window\.MugenSpiritGun\.drawShot\(/);
assert.match(html,/window\.MugenSpiritGun\?\.onImpact\(this,/);
assert.match(html,/window\.MugenSpiritGun\?\.drawWindup\(this,/);
assert.match(html,/window\.MugenSpiritGun\?\.drawOverlay\(this,/);
assert.equal(cfg.combat.projectile.player.damage,78,"Spirit Gun becomes rewarding");
assert.equal(cfg.combat.attacks.shotgun.cost,30,"Shotgun still requires Spirit");
assert.equal(cfg.combat.combo.squarePressesRequired,3,"Square combo gate unchanged");
console.log("PASS: stage-safe 142px spacing, reliable punch assist, bullet sweep, Spirit Gun charge, single impact and cinematic cleanup.");
