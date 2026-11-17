"use strict";
const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const html=fs.readFileSync("game-build-0009.html","utf8");
const config=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const elements=new Map();
const element=()=>({hidden:false,classList:{add(){},remove(){},toggle(){}},
 style:{},dataset:{},parentElement:{},addEventListener(){},focus(){},textContent:""});
const node=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
const callbacks=new Map();let next=0;
const scope=vm.createContext({
 console,config,assert,performance:{now:()=>100},
 requestAnimationFrame:fn=>{callbacks.set(++next,fn);return next;},
 cancelAnimationFrame:id=>callbacks.delete(id),
 document:{querySelector:node,addEventListener(){}},
 window:{addEventListener(){}},touchButtons:[],
 fightCanvas:{width:1280,height:720},activeScreen:"fight",arcadeGame:null,
 roundBanner:element(),roundBannerText:element(),battleResult:element(),
 battleResultKicker:element(),battleResultTitle:element(),battleResultMessage:element(),
 rematchButton:element(),playerHealth:element(),cpuHealth:element(),
 playerEnergy:element(),cpuEnergy:element(),roundTimer:element(),
 playTone(){},playCombatSfx(){return true;}
});
vm.runInContext(fs.readFileSync("mugen-combo-fx-v9.js","utf8"),scope);
const start=html.indexOf("      const arena =");
const end=html.indexOf("      function beginFight()",start);
assert.ok(start>0&&end>start);
vm.runInContext(
 "const yusukeCombat=config.combat;const activeCharacterDefinition=config;"+
 "const yusukeAnimations=config.spriteSheet.animations;\n"+
 html.slice(start,end)+"\nattackData=config.combat.attacks;",scope
);
vm.runInContext("\nconst game=new ArcadeFight(null);\nconst quiet={left:false,right:false,block:false};\ngame.reset();game.state=\"play\";\ngame.player.energy=50;\nfor(let stage=0;stage<4;stage++){\n  game.player.update(1/60,{...quiet,heavyPressed:true},game.cpu,game);\n  assert.equal(game.player.currentAttack(),stage===3?\"heavyLauncher\":\"heavy\",\n    \"Triangle \"+(stage+1)+\" wrong attack state\");\n  assert.equal(game.player.heavyChainStage,stage,\n    \"Triangle \"+(stage+1)+\" lost chain count\");\n  assert.ok(game.player.energy>=50,\"Triangle must be Spirit-free\");\n  if(stage<3){\n    for(let frame=0;frame<29;frame++)\n      game.player.update(1/60,quiet,game.cpu,game);\n    assert.equal(game.player.currentAttack(),null,\n      \"Heavy hit \"+(stage+1)+\" must finish before next press\");\n    assert.ok(game.player.heavyWindow>0,\n      \"Grounded recovery must not reset combo window\");\n  }\n}\nassert.equal(game.player.heavyStep,0,\"Fourth Triangle resets chain\");\nassert.equal(game.player.heavyWindow,0,\"Fourth Triangle consumes window\");\nconst launcher=config.combat.attacks.heavyLauncher;\nassert.equal(launcher.upwardLaunch,true);\nassert.ok(launcher.launchVelocity<=-600);\ngame.cpu.invulnerability=0;\ngame.cpu.setState(\"idle\");\ngame.cpu.facing=-1;game.player.facing=1;\nconst beforeY=game.cpu.y;\ngame.damageFighter(game.player,game.cpu,launcher,game.cpu.x,game.cpu.y-110);\nassert.equal(game.cpu.hitReaction,\"upward\",\n  \"Fourth hit must select upward knockback artwork\");\nassert.equal(game.cpu._upwardLaunch,true);\nassert.equal(game.cpu._pendingKnockdown,true);\nassert.equal(game.cpu.vy,launcher.launchVelocity);\nassert.equal(game.cpu.state,\"hit\");\ngame.cpu.update(1/60,quiet,game.player,game);\nassert.ok(game.cpu.y<beforeY,\"Opponent must physically rise after hit\");\nassert.ok(game.cpu.hitstun>0,\"Opponent remains airborne/stunned\");\n\ngame.reset();game.state=\"play\";\ngame.player.facing=1;game.cpu.facing=-1;\ngame.cpu.setState(\"block\");\ngame.cpu.invulnerability=0;\ngame.damageFighter(game.player,game.cpu,launcher,game.cpu.x,game.cpu.y-110);\nassert.notEqual(game.cpu.hitReaction,\"upward\",\n  \"A successful guard must not launch\");\nassert.equal(game.cpu._pendingKnockdown,false);\nassert.equal(game.cpu._upwardLaunch,false);\n\ngame.reset();game.state=\"play\";\ngame.player.update(1/60,{...quiet,heavyPressed:true},game.cpu,game);\nassert.equal(game.player.heavyChainStage,0);\nfor(let frame=0;frame<95;frame++)\n  game.player.update(1/60,quiet,game.cpu,game);\ngame.player.update(1/60,{...quiet,heavyPressed:true},game.cpu,game);\nassert.equal(game.player.heavyChainStage,0,\n  \"Waiting too long must reset Triangle combo\");\n\ngame.reset();game.state=\"play\";game.player.energy=50;\ngame.player.update(1/60,{...quiet,spiritPunchPressed:true},game.cpu,game);\nassert.equal(game.player.currentAttack(),\"spiritPunch\",\n  \"R2+Square must stay independent\");\nassert.ok(game.player.energy<50,\"Spirit Punch must still cost meter\");\nconsole.log(\"PASS: 4 Triangle button presses, 4th-hit launch, guard safety, combo timeout, R2+Square\");\n",scope);
assert.match(html,/HEAVY COMBO.*4TH HIT UPPERCUT/);
