"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const vm=require("node:vm");
const pngPath="characters/yusuke/yusuke_triangle_launcher_12frames.png";
const buf=fs.readFileSync(pngPath);
assert.equal(buf.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(buf.readUInt32BE(16),1024);
assert.equal(buf.readUInt32BE(20),768);
assert.equal(buf[25],6,"Transparent RGBA required");
assert.equal(crypto.createHash("sha256").update(buf).digest("hex"),
 "fc9d254538c3981313767a691287423867f12de5a2878a600deca21dd8cc4c1d");
const cfg=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const manifest=JSON.parse(fs.readFileSync("characters/yusuke/triangle-launcher-v31.json","utf8"));
assert.equal(cfg.combat.attacks.heavy.damage,28,"Current Triangle chain damage retained");
assert.equal(cfg.combat.attacks.heavy.launchVelocity,-440);
assert.equal(cfg.combat.attacks.heavy.cost,undefined,"Triangle remains Spirit-free");
assert.equal(cfg.combat.attacks.spiritPunch.cost,24);
assert.equal(manifest.atlas.count,12);
assert.equal(manifest.input,"Triangle");
assert.equal(cfg.moves.find(x=>x.id==="heavy_triangle_v26").name,
  "Rising Launcher Uppercut (12 Frames)");

const source=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const loads=[];
class FakeImage {
 set src(path){
  this._src=path;loads.push(path);
  this.naturalWidth=path===pngPath||path.includes("spirit_punch")||
    path.includes("heavy_combo")||path.includes("launcher_uppercut")?1024:
    path.includes("crouch")?1280:1536;
  this.naturalHeight=path===pngPath||path.includes("launcher_uppercut")?768:
    path.includes("spirit_punch")||path.includes("heavy_combo")||path.includes("jump_landing")||path.includes("-v16.png")?1024:512;
  this.onload?.();
 }
 get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(source,{window:root,Math});
const exact=root.MugenExactYusuke;
const legacy={naturalWidth:1536,naturalHeight:1024};
const atlas=exact.build(legacy);
assert.ok(atlas);
const fighter={x:230,y:540,facing:1,vx:0,vy:0,grounded:true,
  hitstun:0,dashTimer:0,state:"attack-heavy",stateTime:0,
  currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}};
function pose(clip,p,duration=.325,grounded=true){
  fighter.state="attack-"+clip;fighter.stateTime=p*duration;
  fighter.grounded=grounded;return exact.pose(fighter,atlas,duration);
}
const sampleProgress=[];
for(let i=0;i<12;i++){
 let p=i<5?(i+.2)/5*.24:i<9?.24+(i-5+.2)/4*.37:.61+(i-9+.2)/3*.39;
 sampleProgress.push(p);
 const f=pose("heavy",p);
 assert.equal(f.source,"triangle-launcher-v31","Triangle must choose new sprite");
 assert.equal(f.image._src,pngPath);
 assert.equal(f.clip,"heavy");
 assert.equal(f.index,i,"All 12 uppercut poses must be reachable");
 assert.equal(f.frame.x,(i%4)*256);
 assert.equal(f.frame.y,Math.floor(i/4)*256);
 assert.equal(f.frame.w,256);
 assert.equal(f.frame.h,248);
 assert.ok(f.frame.h*f.scale<=exact.maximumHeight+.01,"No giant sprite");
}
assert.equal(new Set(sampleProgress).size,12);
assert.equal(loads.filter(p=>p===pngPath).length,1,"Load new art once");
assert.equal(pose("spiritPunch",.5,.58).source,"spirit-punch-v30",
  "R2 + Square must retain the 16-frame Spirit Punch");
assert.equal(pose("upper",.5,.39).source,"launcher-v28",
  "Fourth Square combo uppercut retains its own art");
assert.notEqual(pose("heavy",.2,.325,false).source,"triangle-launcher-v31",
  "Air Triangle retains the old air-attack art");

const drawCalls=[],ctx={save(){},restore(){},translate(){},scale(){},rotate(){},
  drawImage(...args){drawCalls.push(args)},imageSmoothingEnabled:false};
pose("heavy",.5);
assert.equal(exact.draw(fighter,ctx,0,1,atlas,.325),true);
assert.equal(drawCalls.length,1,"Only one fighter body drawn");
assert.equal(drawCalls[0][0]._src,pngPath);

const noImage={};
vm.runInNewContext(source,{window:noImage,Math});
const oldAtlas=noImage.MugenExactYusuke.build(legacy);
assert.equal(noImage.MugenExactYusuke.pose(fighter,oldAtlas,.325).image,legacy,
 "Missing art falls back without breaking gameplay");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-exact-reference-v15[.]js[^"]*triangleLauncher=31/);
assert.match(html,/input[.]heavyPressed && this[.]beginAttack\("heavy", energyAtInput\)/);
assert.match(html,/this[.]beginAttack\("spiritPunch", energyAtInput\)/);

const elements=new Map();
const element=()=>({hidden:false,classList:{add(){},remove(){},toggle(){}},
 style:{},dataset:{},parentElement:{},addEventListener(){},focus(){},textContent:""});
const node=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
const callbacks=new Map();let raf=0;
const context=vm.createContext({console,config:cfg,assert,performance:{now:()=>100},
 requestAnimationFrame:fn=>{callbacks.set(++raf,fn);return raf;},
 cancelAnimationFrame:id=>callbacks.delete(id),
 document:{querySelector:node,addEventListener(){}},
 window:{addEventListener(){}},touchButtons:[],
 fightCanvas:{width:1280,height:720},activeScreen:"fight",arcadeGame:null,
 roundBanner:element(),roundBannerText:element(),battleResult:element(),
 battleResultKicker:element(),battleResultTitle:element(),battleResultMessage:element(),
 rematchButton:element(),playerHealth:element(),cpuHealth:element(),
 playerEnergy:element(),cpuEnergy:element(),roundTimer:element(),
 playTone(){},playCombatSfx(){return true;}});
vm.runInContext(fs.readFileSync("mugen-combo-fx-v9.js","utf8"),context);
const start=html.indexOf("      const arena ="),end=html.indexOf("      function beginFight()",start);
assert.ok(start>0 && end>start);
vm.runInContext("const yusukeCombat=config.combat;const activeCharacterDefinition=config;const yusukeAnimations=config.spriteSheet.animations;\n"+html.slice(start,end)+"\nattackData=config.combat.attacks;",context);
vm.runInContext('const g=new ArcadeFight(null),neutral={left:false,right:false,block:false};g.state="play";g.player.energy=50;g.player.update(1/60,{...neutral,heavyPressed:true},g.cpu,g);assert.equal(g.player.currentAttack(),"heavy","Triangle launches uppercut");assert.ok(g.player.energy>=50,"Triangle costs no Spirit");g.cpu.invulnerability=0;g.damageFighter(g.player,g.cpu,config.combat.attacks.heavy,0,0);assert.equal(g.cpu.vy,-440,"Uppercut should launch opponent upward");assert.equal(g.cpu.health,4955,"Keep original 45 base damage");g.reset();g.state="play";g.player.energy=50;g.player.update(1/60,{...neutral,spiritPunchPressed:true},g.cpu,g);assert.equal(g.player.currentAttack(),"spiritPunch","R2+Square remains distinct");assert.ok(g.player.energy<27,"Spirit Punch still spends 24 meter");',context);
console.log("PASS: Triangle launcher 12 RGBA poses, grounded input and air launch, Spirit Punch and fourth Square preserved");
