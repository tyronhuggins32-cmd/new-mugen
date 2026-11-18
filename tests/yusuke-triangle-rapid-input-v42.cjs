"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("game-build-0009.html","utf8");
const config=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const elements=new Map(),callbacks=new Map();
const element=()=>({hidden:false,classList:{add(){},remove(){},toggle(){}},
 style:{},dataset:{},parentElement:{},addEventListener(){},focus(){},textContent:""});
const node=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
let next=0;
const scope=vm.createContext({console,config,assert,performance:{now:()=>100},
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
vm.runInContext("const yusukeCombat=config.combat;const activeCharacterDefinition=config;"+
 "const yusukeAnimations=config.spriteSheet.animations;\n"+
 html.slice(start,end)+"\nattackData=config.combat.attacks;",scope);
vm.runInContext("\nconst game=new ArcadeFight(null);\nconst neutral={left:false,right:false,block:false};\nconst observed=[];\ngame.reset();game.state=\"play\";game.player.energy=60;\n// Real player taps can be substantially faster than the 0.43-second swing.\n// 4 separate 60Hz button pulses in 0.3 seconds must not be swallowed.\nconst pressFrames=new Set([0,5,11,17]);\nlet previous=\"\";\nfor(let frame=0;frame<150;frame++){\n  const input={...neutral,heavyPressed:pressFrames.has(frame)};\n  const before=game.player.state;\n  game.player.update(1/60,input,game.cpu,game);\n  assert.ok(Number.isFinite(game.player.stateTime));\n  assert.ok(game.player.stateTime<5,\"No unbounded frozen attack state\");\n  const current=game.player.currentAttack();\n  const label=current?current+\":\"+game.player.heavyChainStage:\"\";\n  if(label&&label!==previous)observed.push(label);\n  previous=label;\n}\nassert.deepEqual(observed.slice(0,4),[\"heavy:0\",\"heavy:1\",\"heavy:2\",\"heavyLauncher:3\"],\n \"Rapid four Triangle button taps must produce exactly three heavies and rising uppercut\");\nassert.equal(observed.length,4,\"Only four attacks must play for four taps\");\nassert.equal(game.player.heavyQueuedInputs,0,\"Consumed taps must not leave a phantom fifth attack\");\nassert.equal(game.player.heavyStep,0,\"Launcher finisher must clear combo count\");\nassert.ok(Math.abs(game.player.energy - Math.min(100,60+config.combat.energyRegen*(150/60)))<.001, \"Triangle permits normal Spirit regeneration but must never consume it\");\n\n// A held Triangle counts as one press, not an automatic repeated chain.\ngame.reset();game.state=\"play\";\nconst held=[];\nlet last=\"\";\nfor(let frame=0;frame<150;frame++){\n  game.player.update(1/60,{...neutral,heavyPressed:frame===0},game.cpu,game);\n  const key=game.player.currentAttack()?\n    game.player.currentAttack()+\":\"+game.player.heavyChainStage:\"\";\n  if(key&&key!==last)held.push(key);\n  last=key;\n}\nassert.deepEqual(held,[\"heavy:0\"],\"One Triangle press must not auto-combo\");\nassert.equal(game.player.heavyQueuedInputs,0);\n\n// A slow legitimate fourth-hit chain remains supported.\ngame.reset();game.state=\"play\";\nfor(let stage=0;stage<4;stage++){\n  game.player.update(1/60,{...neutral,heavyPressed:true},game.cpu,game);\n  assert.equal(game.player.currentAttack(),stage<3?\"heavy\":\"heavyLauncher\");\n  assert.equal(game.player.heavyChainStage,stage);\n  if(stage<3)for(let frame=0;frame<29;frame++)\n    game.player.update(1/60,neutral,game.cpu,game);\n}\nassert.equal(game.player.heavyQueuedInputs,0);\nconsole.log(\"PASS: rapid real 4-press Triangle combo, no false hold auto-chain, normal rhythm, and no frozen attack state\");\n",scope);
