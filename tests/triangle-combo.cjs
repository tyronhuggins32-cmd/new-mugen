"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("game-build-0009.html","utf8");
const config=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const elements=new Map();
const element=()=>({hidden:false,classList:{add(){},remove(){},toggle(){}},style:{},
  dataset:{},parentElement:{},addEventListener(){},focus(){},textContent:""});
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
 playerEnergy:element(),cpuEnergy:element(),roundTimer:element(),playTone(){},playCombatSfx(){return true;}
});
vm.runInContext(fs.readFileSync("mugen-combo-fx-v9.js","utf8"),scope);
const start=html.indexOf("      const arena =");
const end=html.indexOf("      function beginFight()",start);
assert.ok(start>0&&end>start);
vm.runInContext(
 "const yusukeCombat=config.combat;const activeCharacterDefinition=config;const yusukeAnimations=config.spriteSheet.animations;\n"+
 html.slice(start,end)+"\nattackData=config.combat.attacks;",scope
);

vm.runInContext("\nconst g=new ArcadeFight(null),neutral={left:false,right:false,block:false};\nassert.equal(g.player.energy,64);\ng.state=\"play\";\nfor(const energy of [0,50,50.001,100]){\n  g.reset();g.state=\"play\";g.player.energy=energy;\n  assert.equal(g.player.beginAttack(\"heavy\"),true,\"Triangle always starts the new heavy attack\");\n  assert.equal(g.player.currentAttack(),\"heavy\",\"Triangle uses authored heavy combo regardless of Spirit\");\n  assert.equal(g.player.energy,energy,\"Heavy combo has no Spirit cost\");\n}\ng.reset();g.state=\"play\";g.player.energy=100;\nassert.equal(g.player.beginAttack(\"shotgun\"),true,\"Shotgun still exists as a separate special\");\nfor(let i=0;i<36;i++)g.player.update(1/60,neutral,g.cpu,g);\nassert.equal(g.projectiles.length,7,\"Explicit Shotgun still fires seven pellets\");\ng.reset();g.state=\"play\";\ng.player.beginAttack(\"light\");\nassert.equal(g.player.currentAttack(),\"light\");\nassert.equal(g.player.squarePresses,1);\nassert.equal(g.player.comboActive,false);\ng.updateHud(true);\nassert.equal(document.querySelector(\".combo-panel\").hidden,true,\"meter hidden before third press\");\ng.damageFighter(g.player,g.cpu,config.combat.attacks.light,0,0);\nassert.equal(g.cpu.health,4980,\"first punch deals normal damage\");\nassert.equal(g.player.comboHits,0);\nassert.equal(g.impacts.length,0,\"Square 1 is visually clean\");\ng.cpu.invulnerability=0;\ng.player.beginAttack(\"light\");\nassert.equal(g.player.currentAttack(),\"cross\");\nassert.equal(g.player.squarePresses,2);\nassert.equal(g.player.comboActive,false);\ng.updateHud(true);\nassert.equal(document.querySelector(\".combo-panel\").hidden,true);\ng.damageFighter(g.player,g.cpu,config.combat.attacks.cross,0,0);\nassert.equal(g.cpu.health,4954,\"second punch deals normal damage\");\ng.cpu.invulnerability=0;\ng.player.beginAttack(\"light\");\nassert.equal(g.player.currentAttack(),\"body\");\nassert.equal(g.player.squarePresses,3);\nassert.equal(g.player.comboActive,true);\ng.updateHud(true);\nassert.equal(document.querySelector(\".combo-panel\").hidden,false,\"meter appears after third Square\");\ng.damageFighter(g.player,g.cpu,config.combat.attacks.body,0,0);\nassert.equal(g.player.comboHits,1);\nassert.equal(window.MugenComboFX.meter(g.player),3);\nassert.equal(g.impacts.length,0,\"COMBO 3 is visually clean\");\nassert.equal(g.player.comboMultiplier,1.2);\nassert.ok(Math.abs(g.cpu.health-4918)<.001,\"third punch 30 x1.2\");\ng.cpu.invulnerability=0;\ng.player.beginAttack(\"light\");\nassert.equal(g.player.currentAttack(),\"upper\");\ng.damageFighter(g.player,g.cpu,config.combat.attacks.upper,0,0);\nassert.equal(g.player.comboMultiplier,1.4);\nassert.ok(Math.abs(g.cpu.health-(4918-42*1.4))<.001,\"fourth punch x1.4\");\nassert.ok(g.player.comboBonusDamage>0);\nassert.equal(window.MugenComboFX.meter(g.player),4);\nassert.equal(g.impacts.length,0,\"COMBO 4 remains visually clean\");\ng.cpu.invulnerability=0;\ng.player.beginAttack(\"light\");\ng.damageFighter(g.player,g.cpu,config.combat.attacks.light,0,0);\nassert.equal(window.MugenComboFX.meter(g.player),5);\nassert.equal(g.player.comboMultiplier,1.6);\nassert.ok(g.impacts.length>0,\"visual hit sparks unlock exactly at COMBO 5\");\ng.updateHud(true);\nassert.ok(document.querySelector(\"#combo-label\").textContent.includes(\"COMBO 5\"));\ng.player.update(3,neutral,g.cpu,g);\nassert.equal(g.player.comboActive,false,\"combo times out\");\ng.updateHud(true);\nassert.equal(document.querySelector(\".combo-panel\").hidden,true);\ng.reset();g.state=\"play\";g.player.energy=50;\ng.player.beginAttack(\"heavy\");\nassert.equal(g.player.currentAttack(),\"heavy\");\nassert.equal(config.combat.attacks.heavy.damage,45,\"Triangle retains the existing heavy attack damage\");\nconst startX=g.cpu.x;\ng.damageFighter(g.player,g.cpu,config.combat.attacks.heavy,g.cpu.x,g.cpu.y-100);\nassert.equal(g.cpu.health,4955,\"Heavy hit applies original single-contact damage\");\nassert.equal(g.cpu.vx,485,\"Heavy combo uses original heavy knockback\");\nassert.equal(g.cpu.hitstun,.34);\nconsole.log(\"PASS: 3-Square combo, delayed multiplier, and energy-independent Triangle heavy combo.\");\n",scope);

vm.runInContext("\nfor(const energy of [0,50,50.01,100]){\n g.reset();g.state=\"play\";g.player.energy=energy;\n g.player.update(1/60,{...neutral,heavyPressed:true},g.cpu,g);\n assert.equal(g.player.currentAttack(),\"heavy\",\"Actual Triangle input must always launch heavy\");\n}\n",scope);
