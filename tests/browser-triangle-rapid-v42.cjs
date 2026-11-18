"use strict";
const {chromium}=require("playwright");
const fs=require("node:fs"),assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",err=>errors.push(err.message));
  const html=fs.readFileSync("game-build-0009.html","utf8");
  const injected=html.replace("      function beginFight() {",
    "      window.fastTriangleProbe={get game(){return arcadeGame;},"+
    "get atlas(){return exactYusukeAtlas;},get attacks(){return attackData;},arena};"+
    "function beginFight() {");
  assert.notEqual(injected,html,"Inject live game probe");
  await page.route("**/game-build-0009.html*",route=>route.fulfill({
   contentType:"text/html",body:injected
  }));
  await page.goto("http://127.0.0.1:8000/");
  await page.locator('button.menu-item[data-mode="arcade"]').click();
  await page.locator("#choose-character").click();
  await page.waitForFunction(()=>window.fastTriangleProbe?.game?.state==="play" &&
   window.MugenExactYusuke && window.MugenYusukeReactionV37?.ready("upward"),
   null,{timeout:45000});
  const result=await page.evaluate(()=>{
   const {game,atlas,attacks,arena}=window.fastTriangleProbe;
   const artist=window.MugenExactYusuke;
   const reactions=window.MugenYusukeReactionV37;
   game.stop();game.reset();game.state="play";
   const p=game.player,o=game.cpu;
   p.x=450;p.y=arena.floor;p.facing=1;
   o.x=650;o.y=arena.floor;o.facing=-1;
   const neutral={left:false,right:false,block:false};
   const taps=new Set([0,5,11,17]);
   const states=[],images=[];
   let before="",largestFrameMs=0;
   for(let frame=0;frame<150;frame++){
    p.update(1/60,{...neutral,heavyPressed:taps.has(frame)},o,game);
    if(!Number.isFinite(p.stateTime)||!Number.isFinite(p.x))
      throw Error("Gameplay simulation froze or became non-finite");
    const attack=p.currentAttack();
    const state=attack?attack+":"+p.heavyChainStage:"";
    if(state && state!==before)states.push(state);
    before=state;
    if(attack==="heavy"||attack==="heavyLauncher"){
      const type=attacks[attack];
      const pose=artist.pose(p,atlas,type.duration);
      if(pose.source!==(attack==="heavy"?
       "triangle-heavy-v39":"triangle-launcher-v39"))
       throw Error("Incorrect combat artwork for "+state+": "+pose.source);
      images.push(pose.index);
    }
    if(frame%3===0){
      const start=performance.now();
      game.render(2000+frame*1000/60);
      largestFrameMs=Math.max(largestFrameMs,performance.now()-start);
    }
   }
   const expected=["heavy:0","heavy:1","heavy:2","heavyLauncher:3"];
   if(JSON.stringify(states)!==JSON.stringify(expected))
    throw Error("Real renderer skipped heavy stages: "+JSON.stringify(states));
   if(images.length<55)throw Error("Did not render full heavy combo");
   if(largestFrameMs>1600)
    throw Error("Renderer blocked for "+Math.round(largestFrameMs)+"ms");
   game.reset();game.state="play";
   const beforeY=game.cpu.y;
   game.cpu.invulnerability=0;game.cpu.setState("idle");
   game.player.facing=1;game.cpu.facing=-1;
   game.damageFighter(game.player,game.cpu,attacks.heavyLauncher,
     game.cpu.x,game.cpu.y-110);
   if(game.cpu.hitReaction!=="upward"||game.cpu.vy>=-500)
    throw Error("Uppercut failed to launch the opponent");
   const up=reactions.pose(game.cpu,"upward");
   if(!up||up.source!=="reaction-v37"||up.frame.w!==256)
    throw Error("Upward knockback texture not rendered");
   game.cpu.update(1/60,neutral,game.player,game);
   if(game.cpu.y>=beforeY)throw Error("Victim did not move into the air");
   return {states,frames:images.length,upwardSource:up.source,
      peakFrameMs:Math.round(largestFrameMs)};
  });
  assert.deepEqual(result.states,["heavy:0","heavy:1","heavy:2","heavyLauncher:3"]);
  assert.deepEqual(errors,[],"No browser JavaScript exceptions");
  console.log("PASS: real Chromium fast Triangle combo, correct PNG sprites, upward knockback and fluid frame updates "+JSON.stringify(result));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
