"use strict";
const {chromium}=require("playwright");
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const html=fs.readFileSync(path.resolve(__dirname,"../game-build-0009.html"),"utf8");
  await page.route("**/game-build-0009.html*",route=>route.fulfill({
   contentType:"text/html",body:html.replace("      function beginFight() {",
    '      window.testReference = { get game() { return arcadeGame; }, get atlas(){ return referenceAttackAtlas; }, get exactAtlas(){ return exactYusukeAtlas; }, arena };\n      function beginFight() {')
  }));
  await page.goto("http://127.0.0.1:8000/");
  await page.locator('button.menu-item[data-mode="arcade"]').click();
  await page.locator("#choose-character").click();
  await page.waitForFunction(()=>window.testReference?.game?.state==="play" && window.MugenReferenceV13,
   null,{timeout:30000});
  const result=await page.evaluate(()=>{
   const game=window.testReference.game,mod=window.MugenReferenceV13,
     original=game.damageFighter;
   game.stop();
   game.controller.update=()=>({left:false,right:false,block:false});
   const moves=window.YusukeAttackLab.moves();
   const atlas=window.testReference.atlas, exact=window.testReference.exactAtlas;
   let exactDrawCount=0,hitCount=0,heavyHits=0;
   const canvas=document.querySelector("#game-canvas"),ctx=canvas.getContext("2d"),
    originalDraw=ctx.drawImage.bind(ctx);
   ctx.drawImage=function(...args){
     if(exact && args[0]===exact.image)exactDrawCount++;
     return originalDraw(...args);
   };
   game.damageFighter=function(a,d,h,x,y){
     if(h.referenceHit){hitCount++;if(h.heavyImpact)heavyHits++;}
     return original.call(game,a,d,h,x,y);
   };
   function setUp(x=480,enemyX=730){
     game.reset();game.state="play";game.hitStop=0;
     game.player.x=x;game.cpu.x=enemyX;
     game.player.energy=100;game.cpu.health=5000;
     game.player.state="idle";game.cpu.state="idle";
     game.player.facing=1;game.cpu.facing=-1;
     game.player.vx=0;game.cpu.vx=0;
     game.player.invulnerability=0;game.cpu.invulnerability=0;
     game.player.y=window.testReference.arena.floor;
     game.cpu.y=window.testReference.arena.floor;
   }
   setUp();
   const flashed=window.YusukeAttackLab.play("flashRush");
   const immediate=window.YusukeAttackLab.status()?.move;
   game.render(3000);
   const drew=exactDrawCount;
   let peakRushX=game.player.x;
   for(let i=0;i<150;i++){
    game.update(1/60);
    peakRushX=Math.max(peakRushX,game.player.x);
   }
   // Verify the actual attack burst rather than the final position after
   // two more seconds of enemy pushbox and round physics.
   const flash={hits:hitCount,remaining:game.cpu.health,
    advanced:peakRushX>480+20,peakRushX};
   setUp();hitCount=0;
   const groundAirDenied=!window.YusukeAttackLab.play("skyPursuit");
   game.player.y-=170;game.player.state="jump";
   const airAllowed=window.YusukeAttackLab.play("skyPursuit");
   for(let i=0;i<145;i++)game.update(1/60);
   const airHits=hitCount;
   setUp(480,780);hitCount=0;
   game.player.energy=50;
   const deniedVoid=!window.YusukeAttackLab.play("spiritVoid");
   game.player.energy=100;
   const startedVoid=window.YusukeAttackLab.play("spiritVoid");
   let cinematicSeen=false;
   for(let i=0;i<240;i++){
    game.update(1/60);
    if(window.YusukeAttackLab.status()?.move==="spiritVoid")
     cinematicSeen=true;
    if(i===90)game.render(4000);
   }
   const voidHits=hitCount,finalHealth=game.cpu.health;
   setUp(480,685);hitCount=0;
   const startedBarrage=window.YusukeAttackLab.play("rapidBarrage");
   for(let i=0;i<180;i++)game.update(1/60);
   const barrageHits=hitCount;
   setUp(480,1160);hitCount=0;
   const startedWave=window.YusukeAttackLab.play("spiritWave");
   for(let i=0;i<195;i++)game.update(1/60);
   const waveHits=hitCount;
   const energyAfterWave=game.player.energy;
   ctx.drawImage=originalDraw;game.damageFighter=original;
   return {moves,exactFrames:exact?.frameCount,atlasSize:[atlas?.image.width,atlas?.image.height],
     atlasFrames:atlas?.frameCount,drew,flashed,flash,immediate,groundAirDenied,
     airAllowed,airHits,deniedVoid,startedVoid,cinematicSeen,voidHits,
     finalHealth,heavyHits,startedBarrage,barrageHits,startedWave,waveHits,energyAfterWave};
  });
  assert.deepEqual(result.moves,[
   "flashRush","risingBreaker","skyPursuit","spiritCyclone","spiritVoid","meteorFinish","rapidBarrage","spiritWave"]);
  assert.equal(result.atlasFrames,64,"all 64 new cel poses built in real Chromium");
  assert.deepEqual(result.atlasSize,[4096,4096]);
  assert.equal(result.exactFrames,16,"Yusuke uses the 16-pose user image for ALL move visuals");
  assert.ok(result.drew>=1,"game draws the submitted exact Yusuke sprite sheet during flash rush");
  assert.equal(result.flashed,true);
  assert.equal(result.immediate,"flashRush");
  assert.equal(result.flash.hits,5,"all five flash-step damage beats must connect");
  assert.ok(result.flash.remaining<5000,
   "flashstep must connect multiple real damage calls against CPU");
  assert.ok(result.flash.advanced,"flashstep advances toward target");
  assert.equal(result.groundAirDenied,true);
  assert.equal(result.airAllowed,true);
  assert.equal(result.airHits,4,"the aerial pursuit needs four real hits");
  assert.equal(result.deniedVoid,true,"cinematic energy cost is enforced");
  assert.equal(result.startedVoid,true);
  assert.equal(result.cinematicSeen,true);
  assert.equal(result.voidHits,15,"cinematic must resolve exactly fifteen timed contacts");
  assert.ok(result.finalHealth<5000,
   "cinematic must deal a sequenced set of real hits and finish");
  assert.ok(result.heavyHits>=1);
  assert.equal(result.startedBarrage,true,"barrage is callable without remapping Square");
  assert.equal(result.barrageHits,11,"eleven real rapid punch contacts in live battle");
  assert.equal(result.startedWave,true,"wave is callable without remapping Triangle");
  assert.equal(result.waveHits,3,"three wave contacts in live browser fight");
  assert.ok(result.energyAfterWave<100,"wave costs Spirit Energy");
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("PASS: eight unbound Yusuke moves with original game physics now render the uploaded exact 16-pose character while their collision timing remains intact.");
  console.log(result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
