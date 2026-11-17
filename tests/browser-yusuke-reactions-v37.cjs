"use strict";
const fs=require("node:fs");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const html=fs.readFileSync("game-build-0009.html","utf8");
  const patched=html.replace("      function beginFight() {",
    `      window.reactionProbe={get game(){return arcadeGame;},
       get atlas(){return exactYusukeAtlas;},get attacks(){return attackData;},
       arena};function beginFight() {`);
  assert.notEqual(patched,html,"game browser probe injected");
  await page.route("**/game-build-0009.html*",route=>route.fulfill({
   contentType:"text/html",body:patched
  }));
  await page.goto("http://127.0.0.1:8000/");
  await page.locator('button.menu-item[data-mode="arcade"]').click();
  await page.locator("#choose-character").click();
  await page.waitForFunction(()=>window.reactionProbe?.game?.state==="play" &&
    window.MugenYusukeReactionV37?.ready("knockdown"),null,{timeout:45000});
  const report=await page.evaluate(()=>{
   const {game,atlas,attacks,arena}=window.reactionProbe;
   game.stop();const reactions=window.MugenYusukeReactionV37;
   const painter=window.MugenExactYusuke;
   const kinds={stagger:8,knockback:8,knockdown:10};
   const result=[];
   for(const [kind,count] of Object.entries(kinds)){
    if(!reactions.ready(kind))throw Error("Missing "+kind+" art");
    const actor=game.player;
    actor.hitReaction=kind;actor.state="hit";actor.hitstun=.50;
    actor._reactionDuration=.50;actor.vx=0;actor.vy=0;
    for(let i=0;i<count;i++){
     actor.stateTime=(i+.2)*.5/count;
     const pose=painter.pose(actor,atlas,.50);
     if(pose.source!=="reaction-v37"||pose.index!==i)
       throw Error("Old sprite or wrong frame "+JSON.stringify({kind,i,pose}));
     const canvas=document.createElement("canvas");
     canvas.width=1280;canvas.height=720;
     const ctx=canvas.getContext("2d");
     const original=ctx.drawImage.bind(ctx);let draws=0,used=null;
     ctx.drawImage=(...args)=>{draws++;used=args[0];return original(...args);};
     if(!painter.draw(actor,ctx,i*100,1,atlas,.50)||draws!==1)
       throw Error("One full-body fighter required, got "+draws+" "+kind);
     if(!used)throw Error("Missing drawn texture "+kind);
     result.push({kind,index:i,width:pose.frame.w,height:pose.frame.h});
    }
   }
   const back=reactions.pose(game.player,"knockback").image;
   if(!(back instanceof HTMLImageElement||back instanceof HTMLCanvasElement))
    throw Error("Uploaded V37 knockback art is not a renderable texture");
   // Knockback is now a genuinely transparent committed PNG. Do not
   // reprocess 1.6 million pixels in the browser on the first damage frame.
   const testCanvas=document.createElement("canvas");
   const w=back.naturalWidth||back.width,h=back.naturalHeight||back.height;
   testCanvas.width=w;testCanvas.height=h;
   const ctx=testCanvas.getContext("2d",{willReadFrequently:true});
   ctx.drawImage(back,0,0);
   const alpha=(x,y)=>ctx.getImageData(x,y,1,1).data[3];
   if(alpha(0,0)!==0||alpha(w-1,h-1)!==0)
    throw Error("White box still present around knockback sprite");
   let opaque=0,transparent=0;
   for(let y=5;y<h;y+=17)for(let x=5;x<w;x+=17){
     const a=alpha(x,y);
     if(a>170)opaque++;else if(a<40)transparent++;
   }
   if(transparent<opaque)
    throw Error("Knockback backdrop cleanup left most background opaque");
   game.reset();game.state="play";game.player.x=420;game.cpu.x=640;
   game.cpu.facing=-1;game.player.facing=1;
   game.damageFighter(game.player,game.cpu,attacks.heavyLauncher,game.cpu.x,game.cpu.y-108);
   if(game.cpu.hitReaction!=="knockback"||!game.cpu._pendingKnockdown)
    throw Error("Fourth Triangle launcher failed to start knockback");
   let groundedGetup=false;
   const neutral={left:false,right:false,block:false};
   for(let i=0;i<115;i++){
     game.cpu.update(1/60,neutral,game.player,game);
     if(game.cpu.hitReaction==="knockdown"&&game.cpu.state==="hit"){
       groundedGetup=true;
       const pose=painter.pose(game.cpu,atlas,.58);
       if(pose.source!=="reaction-v37")
         throw Error("Old sprite returned during grounded knockdown");
     }
   }
   if(!groundedGetup)throw Error("Airborne heavy knockback never reaches get-up");
   if(game.cpu.state==="hit")
     throw Error("Get-up reaction traps fighter in hitstun");
   game.reset();game.state="play";game.cpu.setState("block");
   game.cpu.facing=-1;game.player.facing=1;
   game.damageFighter(game.player,game.cpu,attacks.heavyLauncher,game.cpu.x,game.cpu.y-105);
   if(game.cpu.hitReaction==="knockback"||game.cpu._pendingKnockdown)
     throw Error("Successful guard incorrectly launches fighter");
   return {frameCount:result.length,transparent,opaque,groundedGetup,
     first:result[0],last:result[result.length-1]};
  });
  assert.equal(report.frameCount,26);
  assert.deepEqual(errors,[],"no runtime JS errors while rendering reactions");
  console.log("PASS: real Chromium V37 26 reaction frames, transparent knockback, both hit/KO states, landing/get-up and normal guarding "+JSON.stringify(report));
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
