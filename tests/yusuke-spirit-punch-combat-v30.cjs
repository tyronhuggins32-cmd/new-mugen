"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("game-build-0009.html","utf8");
const config=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const elements=new Map();
const make=()=>({hidden:false,classList:{add(){},remove(){},toggle(){}},style:{},dataset:{},parentElement:{},addEventListener(){},focus(){},textContent:""});
const node=k=>{if(!elements.has(k))elements.set(k,make());return elements.get(k)};
const s=vm.createContext({console,config,assert,performance:{now:()=>100},
 requestAnimationFrame(){return 1;},cancelAnimationFrame(){},
 document:{querySelector:node,addEventListener(){}},window:{addEventListener(){}},
 touchButtons:[],fightCanvas:{width:1280,height:720},activeScreen:"fight",arcadeGame:null,
 roundBanner:make(),roundBannerText:make(),battleResult:make(),
 battleResultKicker:make(),battleResultTitle:make(),battleResultMessage:make(),
 rematchButton:make(),playerHealth:make(),cpuHealth:make(),
 playerEnergy:make(),cpuEnergy:make(),roundTimer:make(),playTone(){}});
vm.runInContext(fs.readFileSync("mugen-combo-fx-v9.js","utf8"),s);
const start=html.indexOf("      const arena ="),end=html.indexOf("      function beginFight()",start);
assert.ok(start>0&&end>start);
vm.runInContext("const yusukeCombat=config.combat;const activeCharacterDefinition=config;const yusukeAnimations=config.spriteSheet.animations;\n"+
 html.slice(start,end)+"\nattackData=config.combat.attacks;",s);
vm.runInContext([
 "const g=new ArcadeFight(null),neutral={left:false,right:false,block:false};",
 "g.reset();g.state='play';g.player.energy=60;",
 "g.player.update(1/60,{...neutral,spiritPunchPressed:true},g.cpu,g);",
 "assert.equal(g.player.currentAttack(),'spiritPunch');",
 "assert.ok(g.player.energy>36 && g.player.energy<36.3,'Spirit cost is 24 after one 60Hz regen tick');",
 "g.player.stateTime=.32;",
 "assert.ok(g.player.activeHitbox());",
 "assert.equal(g.player.activeHitbox().width,146);",
 "g.damageFighter(g.player,g.cpu,config.combat.attacks.spiritPunch,g.cpu.x,g.cpu.y-100);",
 "assert.equal(g.cpu.health,4924);assert.equal(g.cpu.vx,1220);",
 "assert.equal(g.cpu.hitstun,.82);assert.equal(g.cpu.vy,-560);",
 "assert.equal(g.cpu.hitReaction,'knockback');assert.equal(g.cpu._spiritPunchLaunch,true);",
 "assert.equal(g.projectiles.length,0);",
 "g.reset();g.state='play';g.player.energy=23;",
 "assert.equal(g.player.beginAttack('spiritPunch'),false);",
 "g.reset();g.state='play';g.player.energy=0;",
 "g.player.update(1/60,{...neutral,heavyPressed:true},g.cpu,g);",
 "assert.equal(g.player.currentAttack(),'heavy');assert.ok(g.player.energy>=0&&g.player.energy<.3,'Triangle retains zero attack cost after 60Hz regen');",
 "g.reset();g.state='play';g.player.energy=100;",
 "g.player.beginAttack('light');",
 "g.player.update(1/60,{...neutral,spiritPunchPressed:true},g.cpu,g);",
 "assert.equal(g.player.actionBuffer,'spiritPunch');",
 "g.player.stateTime=config.combat.attacks.light.duration+.005;",
 "g.player.update(1/60,neutral,g.cpu,g);",
 "assert.equal(g.player.currentAttack(),'spiritPunch');",
 "assert.equal(g.player.energy,76);",
 "console.log('PASS: Spirit Punch damage, meter, knockback, no projectile, buffer and Triangle combat');"
].join("\n"),s);
