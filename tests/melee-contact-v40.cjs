"use strict";
// Regression for actual melee connection and removal of circular fighter FX.
const fs=require("node:fs"),vm=require("node:vm");
const assert=require("node:assert/strict");
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync("mugen-combat-v5.js","utf8"),sandbox);
const geo=sandbox.window.MugenCombatV5;
const config=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const arena={left:68,right:1212,width:1280,floor:600};
function fighter(x,facing=1,state="idle"){
  return {x,y:600,facing,grounded:true,width:84,height:194,state,vx:0,
    attackConnected:false,
    get hurtbox(){return geo.hurtbox(this);},
    currentAttack(){return this.attackName;}};
}
function overlaps(a,b){return a.x<b.x+b.width && a.x+a.width>b.x &&
  a.y<b.y+b.height && a.y+a.height>b.y;}
for(const [type,gap] of [["light",230],["cross",228],["body",225],
  ["upper",227],["heavy",227],["heavyLauncher",230],["spiritPunch",230]]){
  const attack=config.combat.attacks[type];
  for(const direction of [1,-1]){
    const a=fighter(600,direction);
    a.attackName=type;
    const b=fighter(a.x+gap*direction,-direction);
    assert.equal(geo.assistPunch(a,b,attack,arena),true,
      type+" must close a small actual limb-to-body gap in either direction");
    assert.ok(Math.abs(b.x-a.x)>=geo.MIN_SPACING,
      type+" may not merge body pushboxes");
    const hitbox=geo.attackHitbox(a,attack,type);
    assert.ok(overlaps(hitbox,b.hurtbox),
      type+" must overlap the real defender hurtbox after contact assist");
    const p=geo.meleeImpact(hitbox,b.hurtbox,direction);
    assert.ok(p && p.x>=b.hurtbox.x && p.x<=b.hurtbox.x+b.hurtbox.width &&
      p.y>=hitbox.y && p.y<=hitbox.y+hitbox.height,
      type+" impact art must originate at the real collision");
  }
}
const jab=config.combat.attacks.light;
let a=fighter(500,1),b=fighter(815,-1);
a.attackName="light";
assert.equal(geo.assistPunch(a,b,jab,arena),false,
  "distant attack must whiff instead of magnetizing across the arena");
assert.equal(geo.meleeImpact(geo.attackHitbox(a,jab,"light"),b.hurtbox,1),null,
  "whiff must not spawn a fake impact");
b.x=340;assert.equal(geo.assistPunch(a,b,jab,arena),false,
  "a defender behind the player's fist cannot be hit");
a=fighter(500,1);a.attackName="light";b=fighter(668,-1,"crouch");
assert.equal(geo.meleeImpact(geo.attackHitbox(a,jab,"light"),b.hurtbox,1),null,
  "high jab cannot strike a crouched target");
assert.ok(geo.meleeImpact(geo.attackHitbox(a,config.combat.attacks.body,"body"),
  b.hurtbox,1),"body punch correctly hits a crouching opponent");
a.grounded=false;b.state="idle";
assert.equal(geo.assistPunch(a,b,jab,arena),false,
  "air attacks must never receive grounded contact magnetism");
assert.equal(geo.attackHitbox(a,config.combat.attacks.gun,"gun"),null,
  "projectiles never gain a ghost melee hitbox");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-combat-v5\.js\?v=3/);
assert.match(html,/mugen-visuals-v2\.js\?v=3/);
assert.match(html,/MugenCombatV5\?\.meleeImpact/);
assert.ok(!html.includes("context.arc(8, -82, 65")&&
  !html.includes("context.arc(14, -94, 70"),
  "the translucent guard arcs must be absent");
console.log("PASS: 7 melee actions × both directions, actual damage contact geometry, body pushboxes, crouches, whiffs and no bubble effects.");
