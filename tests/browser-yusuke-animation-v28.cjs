"use strict";
// Chromium-only visual regression: inspect the REAL shipped PNG pixels and
// draw one sprite per state through the same renderer used during fights.
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  const html=fs.readFileSync("game-build-0009.html","utf8");
  const injected=html.replace("      function beginFight() {",
    `      window.v28Probe={get game(){return arcadeGame;},
        get atlas(){return exactYusukeAtlas;},arena};
      function beginFight() {`);
  assert.notEqual(html,injected);
  await page.route("**/game-build-0009.html*",r=>r.fulfill({
    contentType:"text/html",body:injected
  }));
  await page.goto("http://127.0.0.1:8000/");
  await page.locator('button.menu-item[data-mode="arcade"]').click();
  await page.locator("#choose-character").click();
  await page.waitForFunction(()=>window.v28Probe?.game?.state==="play"&&
    window.MugenYusukeAnimationV28&&window.MugenExactYusuke);
  await page.evaluate(()=>{
    const p=window.v28Probe.game.player,world=window.v28Probe.arena;
    window.v28Probe.game.stop();
    const states=["idle","walk","run","dash","block",
      "attack-light","attack-cross","attack-body","attack-heavy",
      "hit","jump","crouchWalk"];
    for(const state of states){
      p.state=state;p.stateTime=.08;p.y=state==="jump"?world.floor-100:world.floor;
      p.vx=state==="run"?500:state==="dash"?750:state==="walk"?320:0;
      p.dashTimer=state==="dash"?.2:0;p.dashDuration=.3;p.dashElapsed=.1;
      p.gaitPhase=.2;p.hitstun=state==="hit"?.1:0;
      window.MugenExactYusuke.pose(p,window.v28Probe.atlas,.32);
    }
  });
  // The match loader now prewarms the actual artist-authored sheets.
  // A cached request must resolve immediately and every critical PNG exist.
  const warm=await page.evaluate(()=>window.MugenExactYusuke.preloadForMatch());
  assert.equal(warm.length,17);
  assert.ok(warm.every(a=>a.ok), "Critical authored sprite sheet failed to preload");
  const reference=await page.evaluate(()=>({
    ready:window.MugenYusukePaletteV30?.isReady(),
    sizes:Object.fromEntries(Object.entries(
      window.MugenYusukePaletteV30?.getPalette()||{}).map(([k,p])=>[k,p.length]))
  }));
  assert.equal(reference.ready,true,"Idle reference master palette is required");
  for(const material of ["navy","green","yellow","skin","teal"])
    assert.ok(reference.sizes[material]>=3,
      "Missing canonical "+material+" reference shades");
  await page.waitForTimeout(100);
  const report=await page.evaluate(()=>{
    const {game,atlas,arena}=window.v28Probe;
    const painter=window.MugenExactYusuke;
    const director=window.MugenYusukeAnimationV28;
    const p=game.player;
    if(!atlas?.image)throw Error("Yusuke exact base texture not loaded");
    const states=[
      ["idle",0,.15],["walk",320,.17],["run",500,.17],
      ["dash",750,.15],["block",0,.2],
      ["attack-light",0,.06],["attack-cross",0,.08],
      ["attack-body",0,.09],["attack-heavy",0,.15],
      ["hit",0,.1],["jump",200,.1],["crouchWalk",155,.16]
    ];
    const samples=[];
    for(const [state,vx,seconds] of states){
      p.state=state;p.stateTime=seconds;p.x=420;
      p.y=state==="jump"?arena.floor-110:arena.floor;
      p.vx=vx;p.vy=state==="jump"?-260:0;
      p.gaitPhase=.25;p.hitstun=state==="hit"?.12:0;
      p.dashTimer=state==="dash"?.14:0;
      p.dashDuration=.3;p.dashElapsed=.15;
      const pose=painter.pose(p,atlas,.325);
      if(!pose)throw Error("No pose for "+state);
      const layout=director.resolve(pose);
      if(!layout.measured||layout.opaqueHeight<55)
        throw Error("Actual PNG had no usable silhouette in "+state);
      if(layout.opaqueHeight>208.2)
        throw Error("Sprite suddenly grows beyond 208px in "+state);
      const ctx=document.createElement("canvas").getContext("2d");
      ctx.canvas.width=1300;ctx.canvas.height=800;
      const original=ctx.drawImage.bind(ctx);
      let count=0,smoothAtDraw=null,drawnTexture=null;
      ctx.drawImage=(...args)=>{
        count++;smoothAtDraw=ctx.imageSmoothingEnabled;
        drawnTexture=args[0];
        return original(...args);
      };
      if(!painter.draw(p,ctx,seconds*1000,1,atlas,.325)||count!==1)
        throw Error("Multiple Yusuke bodies or missing body in "+state);
      // Canvas restore() correctly restores smoothing after rendering; the
      // renderer must disable it at drawImage time, not permanently.
      if(smoothAtDraw)
        throw Error("Pixel art blurred in "+state);
      const art=window.MugenYusukeArtV29?.stats(pose.image)||null;
      const unified=window.MugenYusukePaletteV30.getReport(drawnTexture);
      if(!unified||!unified.referenceColors?.navy)
        throw Error("Missing canonical palette on "+state);
      // Triangle may use the separately authored Spirit Punch sheet.
      // Only demand the V26 white-fringe count when that source is selected.
      if(state==="attack-heavy" && pose.source==="heavy-triangle-v26" &&
         (!art||art.removedPale<8))
        throw Error("Heavy combo still has pale outlines: "+JSON.stringify({
          art,source:pose.source,clip:pose.clip,index:pose.index,
          imgWidth:pose.image?.naturalWidth||pose.image?.width,
          imgHeight:pose.image?.naturalHeight||pose.image?.height,
          converted:!!unified,masterReady:window.MugenYusukePaletteV30.isReady()
        }));
      samples.push({state,source:pose.source,
        frame:pose.index,visibleHeight:Math.round(layout.opaqueHeight),
        footGap:Math.round(layout.footOffset),bodyOffset:Math.round(layout.horizontalOffset),
        removedWhiteRim:art?.removedPale||0,removedRedRim:art?.removedRed||0,
        canonicalRecolored:unified.changed});
    }
    // Entire Square chain must be measured, not a single pose at .15s.
    // The previous browser gate never observed the final uppercut/return to
    // idle; that gap let a visibly small final sprite ship for months.
    const square=[];
    for(const [move,frames] of [["light",6],["cross",6],["body",6],["upper",12]]){
      for(let i=0;i<frames;i++){
        p.state="attack-"+move;p.grounded=true;p.hitstun=0;
        p.stateTime=(i+.25)/frames*.33;
        const cel=painter.pose(p,atlas,.33);
        const visible=director.resolve(cel);
        square.push({move,i,source:cel.source,
          px:Math.round(visible.opaqueHeight),scale:+visible.scale.toFixed(3)});
      }
    }
    // Return to idle with the actual final Square pose cached in the renderer.
    p.state="idle";p.stateTime=.035;
    const recover=painter.pose(p,atlas,.33);
    const recoveryHeight=Math.round(director.resolve(recover).opaqueHeight);
    p.stateTime=.10;
    const rest=painter.pose(p,atlas,.33);
    const idleHeight=Math.round(director.resolve(rest).opaqueHeight);
    if(recoveryHeight<190 || Math.abs(recoveryHeight-idleHeight)>6)
      throw Error("Square finisher recovery shrinks vs idle: "+
        JSON.stringify({recoveryHeight,idleHeight}));
    if(square.some(s=>s.source!=="square-combo-v34"))
      throw Error("Square must use all 30 NEW sprite frames, not old V25/V28: "+
        JSON.stringify(square.filter(s=>s.source!=="square-combo-v34")));
    const upperEnd=square.filter(s=>s.move==="upper").slice(-2);
    if(upperEnd.some(s=>s.px<190))
      throw Error("Square uppercut end still shrinks: "+JSON.stringify(upperEnd));
    const bodyEnd=square.filter(s=>s.move==="body").slice(-2);
    console.log("SQUARE-END-BASELINE",JSON.stringify({
      upperEnd,bodyEnd,recoveryHeight,idleHeight
    }));
    const standing=samples.filter(s=>
      ["idle","walk","run","block","attack-light","attack-cross",
       "attack-body","attack-heavy","hit"].includes(s.state));
    const lo=Math.min(...standing.map(s=>s.visibleHeight));
    const hi=Math.max(...standing.map(s=>s.visibleHeight));
    if(hi-lo>67)throw Error("Visually inconsistent body heights: "+JSON.stringify(standing));
    // Hold the last artwork frame briefly at the attack/idle boundary.
    // It must not flash to an unrelated legacy sprite on the first tick.
    p.state="attack-heavy";p.stateTime=.31;p.hitstun=0;
    p.grounded=true;p.dashTimer=0;
    const lastHeavy=painter.pose(p,atlas,.325);
    p.state="idle";p.stateTime=.02;
    const held=painter.pose(p,atlas,.325);
    if(held.clip!=="attackRecover" || held.image!==lastHeavy.image ||
       held.frame.key!==lastHeavy.frame.key)
      throw Error("Heavy attack snaps to a different atlas before recovery");
    p.stateTime=.10;
    const resting=painter.pose(p,atlas,.325);
    if(resting.clip==="attackRecover")
      throw Error("Attack recovery locks character in attack pose");
    // Draw positions are separate from gameplay hitboxes: all samples use
    // the same world-root and consistent source-relative alpha foot alignment.
    return {heightRange:[lo,hi],samples,square,upperEnd,bodyEnd,recoveryHeight,idleHeight,
      recovery:{heldSource:held.source,lastSource:lastHeavy.source,rest:resting.source}};
  });
  assert.deepEqual(errors,[],"browser drawing must not throw");
  assert.ok(report.samples.length>=12);
  console.log("PASS: live Yusuke PNG silhouettes: "+JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
