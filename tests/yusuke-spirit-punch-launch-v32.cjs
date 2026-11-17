"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const config=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const attack=config.combat.attacks.spiritPunch;
assert.equal(attack.cost,24,"R2+Square still costs 24 Spirit");
assert.equal(attack.forceKnockback,true);
assert.equal(attack.knockbackAnimation,"knockback");
assert.ok(attack.knockback>=1100 && attack.knockbackDrag<=1.8);
assert.ok(attack.launchVelocity<=-450 && attack.hitstun>=.75);
assert.equal(attack.projectile,undefined,"Spirit Punch must remain a melee hit");
assert.equal(config.combat.attacks.heavy.damage,28,"Current Triangle damage must stay unchanged");

const html=fs.readFileSync("game-build-0009.html","utf8");
const element=()=>({classList:{add(){},remove(){},toggle(){}},style:{},
  parentElement:{},addEventListener(){},focus(){},textContent:""});
const nodes=new Map(),node=id=>{
  if(!nodes.has(id))nodes.set(id,element());
  return nodes.get(id);
};
const scope=vm.createContext({
  console,config,assert,
  requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  performance:{now:()=>0},document:{querySelector:node,addEventListener(){}},
  window:{addEventListener(){}},touchButtons:[],
  fightCanvas:{width:1280,height:720},activeScreen:"fight",arcadeGame:null,
  roundBanner:element(),roundBannerText:element(),battleResult:element(),
  battleResultKicker:element(),battleResultTitle:element(),
  battleResultMessage:element(),rematchButton:element(),
  playerHealth:element(),cpuHealth:element(),playerEnergy:element(),
  cpuEnergy:element(),roundTimer:element(),playTone(){}
});
const start=html.indexOf("      const arena =");
const end=html.indexOf("      function beginFight()",start);
assert.ok(start>=0&&end>start,"Need real engine under test, not a mock");
vm.runInContext(
  "const yusukeCombat=config.combat; const activeCharacterDefinition=config;"+
  " const yusukeAnimations=config.spriteSheet.animations;\n"+
  html.slice(start,end)+"\nattackData=config.combat.attacks;",scope
);
const game=vm.runInContext("new ArcadeFight(null)",scope);
const neutral={left:false,right:false,block:false};
const reset=(ax,dx,facing)=>{
  game.reset();game.state="play";
  game.player.x=ax;game.cpu.x=dx;
  game.player.facing=facing;game.cpu.facing=-facing;
  game.player.y=game.cpu.y=vm.runInContext("arena.floor",scope);
  game.player.vx=game.cpu.vx=game.player.vy=game.cpu.vy=0;
  game.cpu.invulnerability=0;
  game.player.energy=100;
};
function landPunch(){
  assert.equal(game.player.beginAttack("spiritPunch"),true);
  assert.equal(game.player.energy,76);
  game.player.stateTime=attack.activeStart+.02;
  const hit=game.prepareMelee(game.player,game.cpu);
  assert.equal(typeof hit,"function","Spirit Punch should require a real contact hitbox");
  hit();
  assert.equal(game.player.attackConnected,true);
  assert.equal(game.cpu.state,"hit");
  assert.equal(game.cpu.hitReaction,"stagger","Current chained-heavy jabs cause stagger, unlike Spirit Punch");
  assert.equal(game.cpu._spiritPunchLaunch,true);
  assert.equal(game.cpu.stateTime,0,"New hit must restart the knockback animation");
}
reset(400,500,1);
landPunch();
assert.ok(game.cpu.vx>=1100,"Strong forward launch expected");
assert.ok(game.cpu.vy<-450,"Victim must leave ground");
assert.ok(game.cpu.hitstun>=.75,"Knockback should play for flight duration");
const startingX=game.cpu.x;
let maxTravel=0,airTicks=0,flightAnimationChecked=false,landingChecked=false;
const artSource=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const artwork={};
vm.runInNewContext(artSource,{window:artwork,Math});
const sourceImage={naturalWidth:1536,naturalHeight:1024};
const atlas=artwork.MugenExactYusuke.build(sourceImage);
assert.ok(atlas);
for(let i=0;i<112;i++){
  game.cpu.update(1/60,neutral,game.player,game);
  maxTravel=Math.max(maxTravel,game.cpu.x-startingX);
  if(!game.cpu.grounded)airTicks++;
  const pose=artwork.MugenExactYusuke.pose(game.cpu,atlas,.82);
  if(game.cpu._spiritPunchLaunch && game.cpu.stateTime>.12 && !game.cpu.grounded){
    assert.equal(pose.clip,"knockback");
    assert.equal(pose.index,12,"Airborne stage holds authored knockback pose");
    flightAnimationChecked=true;
  }
  if(game.cpu._spiritPunchLaunch && game.cpu.grounded && game.cpu.stateTime>.1){
    assert.equal(pose.clip,"knockdown",
      "V37 replaces the legacy grounded knockback with authored get-up");
    assert.equal(pose.index,12,"Legacy no-assets fallback remains safe");
    landingChecked=true;
  }
}
assert.ok(maxTravel>320,"Opponent should fly visibly backward rather than stop on contact");
assert.ok(airTicks>=20,"Spirit Punch should keep opponent visibly airborne");
assert.ok(flightAnimationChecked,"Knockback flight animation must be reachable");
assert.ok(landingChecked,"Landing must enter the new knockdown/get-up timeline");
assert.equal(game.cpu._spiritPunchLaunch,false,"Flight flag must clear after hitstun");
assert.equal(game.cpu.state,"idle","Victim should regain control after hitstun");

reset(820,720,-1);
landPunch();
assert.ok(game.cpu.vx<=-1100,"Facing left must launch the defender to screen left");
const leftX=game.cpu.x;
for(let i=0;i<38;i++)game.cpu.update(1/60,neutral,game.player,game);
assert.ok(game.cpu.x<leftX-280,"Left-facing Spirit Punch must travel backward");

reset(400,500,1);
game.cpu.setState("block");game.cpu.facing=-1;
const guardHealth=game.cpu.health;
game.damageFighter(game.player,game.cpu,attack,game.cpu.x,game.cpu.y-105);
assert.equal(game.cpu.state,"block","Blocking prevents the launch state");
assert.equal(game.cpu.hitstun,.12,"Normal block stun remains");
assert.equal(game.cpu._spiritPunchLaunch,false);
assert.equal(game.cpu.vy,0,"Blocking must not pop the defender into air");
assert.ok(game.cpu.health<guardHealth,"Guard still takes existing chip damage");
assert.equal(game.cpu.health,guardHealth-attack.damage*.25);

reset(400,900,1);
game.player.beginAttack("spiritPunch");
game.player.stateTime=attack.activeStart+.02;
assert.equal(game.prepareMelee(game.player,game.cpu),undefined);
assert.equal(game.cpu.health,game.cpu.maxHealth,"A whiff cannot launch a target");

reset(400,500,1);
game.damageFighter(game.player,game.cpu,config.combat.attacks.heavy,game.cpu.x,game.cpu.y-105);
assert.equal(game.cpu._spiritPunchLaunch,false,"Normal Triangle must not inherit special flight");
assert.equal(game.cpu.hitReaction,"knockback");
assert.equal(game.cpu.knockbackDrag,5.2);

console.log("PASS: R2+Square launches on actual contact in both directions, with guarded recovery and separate normal-heavy stagger.");
