"use strict";
// Real Chromium smoke test for the v3 canvas render path.
// It measures an actual pixel difference during movement, not just file names.
const {chromium} = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
  const page = await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.stack || error.message));
  const html=fs.readFileSync(path.resolve(__dirname,"../game-build-0009.html"),"utf8");
  await page.route("**/game-build-0009.html*",route=>route.fulfill({
    contentType:"text/html",
    body:html.replace("      function beginFight() {",
      "      window.testEngine = { get game() { return arcadeGame; }, get kickReady() { return kickAtlasReady; }, get premiumReady() { return premiumReady; }, get directionalAtlas() { return directionalAtlas; }, get premiumWidths() { return [premiumCombatSheet.naturalWidth, premiumMotionSheet.naturalWidth]; }, get premiumArt() { return premiumArt; }, get premiumImages() { return {combat:premiumCombatSheet,movement:premiumMotionSheet}; }, get cleanedPremium() { return {combat:cleanPremiumCombatSheet,movement:cleanPremiumMotionSheet}; }, arena }; \n      function beginFight() {")
  }));
  await page.goto("http://127.0.0.1:8000/");
  await page.locator('button.menu-item[data-mode="arcade"]').click();
  await page.locator("#choose-character").click();
  await page.waitForFunction(()=>window.testEngine?.game?.state==="play" && window.MugenFluid && window.MugenMotion,
    null,{timeout:30000});
  const result=await page.evaluate(async ()=>{
    const g=window.testEngine.game;
    g.stop();
    g.state="play";
    g.player.state="walk";g.player.stateTime=.25;g.player.vx=450;
    g.cpu.state="idle";g.cpu.vx=0;
    g.player.x=340;g.cpu.x=940;
    const canvas=document.querySelector("#game-canvas");
    const sample=()=>{
      const pixel=canvas.getContext("2d").getImageData(260,340,220,260).data;
      let hash=0;
      for(let i=0;i<pixel.length;i+=20)hash=(Math.imul(hash,31)+pixel[i])>>>0;
      return hash;
    };
    g.render(1000);
    const first=sample();
    g.render(1042);
    const second=sample();
    const extra=window.testEngine.directionalAtlas;
    const fake=(vx,state="walk",grounded=true,attack=null)=>{
      const sample={state,grounded,vx,vy:-180,facing:1,stateTime:.18,dashTimer:0};
      return window.MugenDirectional?.choosePose(sample,attack,extra,.5);
    };
    const forwardClip=fake(360)?.clip,backwardClip=fake(-220)?.clip;
    const airClip=fake(260,"jump",false)?.clip;
    const crossClip=fake(0,"attack-cross",true,"cross")?.clip;
    const atlasCounts=extra?[extra.movement.frames.length,extra.combat.frames.length]:[];
    const squareCount=extra?.square?.frames.length||0;
    const squareTextureHeight=extra?.square?.image.height||0;
    const chainActor={state:"attack-light",grounded:true,vx:0,vy:0,
      facing:1,stateTime:.01,dashTimer:0};
    const cleanChain=[];
    for(const move of ["light","cross","body","upper"]){
      chainActor.state="attack-"+move;chainActor.stateTime=.01;
      cleanChain.push(window.MugenDirectional?.choosePose(chainActor,move,extra,.03));
    }
    chainActor.state="walk";chainActor.vx=480;chainActor.stateTime=.02;
    cleanChain.push(window.MugenDirectional?.choosePose(chainActor,null,extra));
    const squareGhostFree=cleanChain.every(pose=>pose && !pose.transitionFrame);
    const cleanIdle=window.MugenPremium?.choosePose(
      {state:"idle",grounded:true,stateTime:.25,vy:0,vx:0},
      null,window.testEngine.premiumArt,window.testEngine.cleanedPremium);
    const cleanGun=window.MugenPremium?.choosePose(
      {state:"attack-gun",grounded:true,stateTime:.1,vy:0,vx:0},
      "gun",window.testEngine.premiumArt,window.testEngine.cleanedPremium);
    const specialFallbackClean=Boolean(
      cleanIdle?.image===window.testEngine.cleanedPremium.movement &&
      cleanGun?.image===window.testEngine.cleanedPremium.combat
    );
    // Real 60Hz Square render sampling should visit all twelve poses, rather than
    // holding two stills through the active damage window.
    const squareSequences=Object.entries({light:.19,cross:.25,body:.29,upper:.39})
      .map(([attack,duration])=>{
        const actor={state:"attack-"+attack,grounded:true,vx:0,vy:0,facing:1,
          stateTime:0,dashTimer:0};
        const keys=new Set();
        for(let i=0;i<=Math.ceil(duration*60);i++){
          actor.stateTime=i/60;
          const pose=window.MugenDirectional?.choosePose(actor,attack,extra,
            Math.min(1,i/(duration*60)));
          if(pose?.part==="square")keys.add(pose.index);
        }
        return {attack,count:keys.size};
      });
    const before=window.MugenFluid.getStats(g).zoom;
    g.player.x=605;g.cpu.x=705;
    for(let i=0;i<25;i++)g.render(1058+i*16);
    const after=window.MugenFluid.getStats(g).zoom;
    // Exercise real fighter input in Chromium, not just motion clip metadata.
    const neutral={left:false,right:false,block:false};
    g.reset();g.state="play";g.player.x=520;g.cpu.x=695;
    g.cpu.beginAttack("light");
    const beforeRetreat=g.player.x;
    g.player.update(1/60,{...neutral,left:true},g.cpu,g);
    const retreatMoved=g.player.x<beforeRetreat && g.player.state==="walk" &&
      g.player.facing===-1 && g.player.vx<0;
    g.reset();g.state="play";g.player.x=550;g.cpu.x=800;
    const beforeBackdash=g.player.x;
    g.player.update(1/60,{...neutral,left:true,dashPressed:true},g.cpu,g);
    const backdashMoved=g.player.x<beforeBackdash-7 && g.player.dashDirection===-1;
    g.reset();g.state="play";g.player.x=900;g.cpu.x=700;g.player.facing=-1;
    const beforeMirror=g.player.x;
    g.player.update(1/60,{...neutral,right:true,dashPressed:true},g.cpu,g);
    const backdashMirrored=g.player.x>beforeMirror+7 && g.player.dashDirection===1;
    g.reset();g.state="play";g.player.energy=50;
    g.player.beginAttack("heavy");
    const lowAction=g.player.currentAttack();
    g.player.stateTime=.22;
    g.render(1720); // Load and paint the kick atlas in the real canvas context.
    g.reset();g.state="play";g.player.energy=51;g.player.beginAttack("heavy");
    const highAction=g.player.currentAttack();
    // Simulate actual shot release and hit in Chromium, not just metadata.
    g.cpu.x=g.player.x+240;
    for(let i=0;i<20;i++)g.player.update(1/60,neutral,g.cpu,g);
    const shotgunProjectileCount=g.projectiles.filter(p=>p.kind==="spiritShotgun").length;
    const shotgunVisualFragments=window.MugenShotgun?.stats(g).visualFragments;
    g.render(1950); // Render fist charge, actual pellets and decorative fan together.
    for(let i=0;i<24;i++)g.updateProjectiles(1/60);
    const shotgunImpacts=window.MugenShotgun?.stats(g).impactsCreated;
    const shotgunDamage=g.cpu.maxHealth-g.cpu.health;
    g.render(1990); // The collision splash must render without browser errors.
    const premiumMeta=window.testEngine.premiumArt;
    const premiumSources=[premiumMeta?.combat?.src,premiumMeta?.movement?.src];
    const cleanedSources=window.testEngine.cleanedPremium;
    const matteActive=Boolean(window.MugenAlphaMatte?.prepare);
    const cleanedCanvas=Boolean(cleanedSources.combat?.getContext &&
      cleanedSources.movement?.getContext);
    const cleanedWidths=[cleanedSources.combat?.width,cleanedSources.movement?.width];

    // Inspect the actual Canvas2D sprites as the game draws idle, stagger,
    // knockback and every six-stage Square action. A fallback image at the
    // wrong scale must not replace the 200px premium fighter with a giant.
    g.reset();g.state="play";
    const screen=canvas.getContext("2d");
    const originalDraw=screen.drawImage.bind(screen);
    let captured=[];
    screen.drawImage=function(...args){
      if(args.length===9){
        const image=args[0],width=image?.naturalWidth||image?.width;
        if(width===2048||width===1536){
          const [sx,sy,sw,sh]=args.slice(1,5);
          const [dw,dh]=args.slice(7,9);
          if(sw>0&&sh>0&&Number.isFinite(dh)){
            const actual=window.MugenYusukePalette?.visibleHeight(image,
              {x:sx,y:sy,w:sw,h:sh}) || sh;
            captured.push({height:Math.abs(actual*dh/sh),countHeight:Math.abs(dh)});
          }
        }
      }
      return originalDraw(...args);
    };
    const characterSizes={};
    for(const [state,elapsed,reaction] of [
      ["idle",.3,null],["hit",.03,"stagger"],
      ["hit",.07,"knockback"],["attack-light",.1,null],
      ["attack-cross",.12,null],["attack-body",.16,null],
      ["attack-upper",.19,null],["attack-gun",.14,null],
      ["attack-shotgun",.16,null]
    ]){
      g.player.state=state;g.player.stateTime=elapsed;
      g.player.hitReaction=reaction||"stagger";
      g.player.y=window.testEngine.arena.floor;
      g.player.vx=0;g.player.facing=1;
      captured=[];
      g.player.drawYusukeSprite(screen,2300+elapsed*1000,1);
      characterSizes[state+(reaction?"-"+reaction:"")]={
        count:captured.length,
        maxHeight:Math.max(0,...captured.map(item=>item.height))
      };
    }
    screen.drawImage=originalDraw;
    const names=["light","cross","body","upper","gun","shotgun","powerKick"];
    const premiumAttackPoses=names.map(type=>{
      const pose=window.MugenPremium?.choosePose(g.player,type,premiumMeta,
        window.testEngine.premiumImages,.5);
      return pose && pose.part==="combat" && pose.frame?.w>0;
    });
    const state={first,second,before,after,forwardClip,backwardClip,airClip,crossClip,atlasCounts,squareCount,squareTextureHeight,squareSequences,squareGhostFree,characterSizes,
      specialFallbackClean,premiumSources,premiumAttackPoses,shotgunProjectileCount,shotgunVisualFragments,
      shotgunImpacts,shotgunDamage,retreatMoved,backdashMoved,backdashMirrored,atlasFrameCount:window.MugenMotion.clips.run.count,
      motionFPS:window.MugenMotion.fps,derivedSpriteCount:window.MugenMotion.sources.length,
      kickReady:window.testEngine.kickReady,
      premiumReady:window.testEngine.premiumReady,
      matteActive,cleanedCanvas,cleanedWidths,
      premiumWidths:window.testEngine.premiumWidths,
      arenaWidth:window.testEngine.arena.width,lowAction,highAction,
      playerHealth:g.player.health,gamepadConnected:!!window.MugenGamepad};
    return state;
  });
  assert.notEqual(result.first,result.second,"movement should modify actual rendered pixels continuously");
  assert.deepEqual(result.atlasCounts,[16,16],"existing premium sheets remain aligned");
  assert.equal(result.squareCount,48,"Square kit builds 48 cels (twelve per attack)");
  const idleHeight=result.characterSizes.idle?.maxHeight;
  assert.ok(idleHeight>=155&&idleHeight<=235,
    "real alpha-cleaned idle figure must stay within normal fighter proportions");
  for(const [pose,measure] of Object.entries(result.characterSizes)){
    assert.ok(measure.count===1,
      pose+" draws a single fighter sprite, never a duplicate giant silhouette");
    assert.ok(measure.maxHeight>100&&measure.maxHeight<idleHeight*1.24+12,
      pose+" stays within the same visible on-screen size as idle Yusuke");
  }
  assert.equal(result.squareTextureHeight,3072,"Square PNG texture has six rows");
  assert.equal(result.squareGhostFree,true,
    "each Square attack and its walk exit must show one complete sprite without double outlines");
  assert.equal(result.specialFallbackClean,true,
    "idle and gun poses must keep original high-resolution alpha-cleaned artwork");
  assert.deepEqual(result.squareSequences.map(s=>s.count),[12,12,12,12],
    "all four punches must display twelve poses on the 60Hz visual timeline");
  assert.equal(result.forwardClip,"advance","forward directional artwork is active in Chromium");
  assert.equal(result.backwardClip,"retreat","backward footwork has distinct art");
  assert.equal(result.retreatMoved,true,"real left input must backwalk even near enemy attacks");
  assert.equal(result.backdashMoved,true,"R1 + left must perform a backward dash");
  assert.equal(result.backdashMirrored,true,"R1 + right must backdash when Yusuke faces left");
  assert.equal(result.airClip,"aerialForward","diagonal air direction art is active");
  assert.equal(result.crossClip,"cross","cross uses new combo transition cels");
  assert.ok(result.after<result.before,"fight camera should ease out to show point-blank combat");
  assert.equal(result.atlasFrameCount,24,"running uses 24 samples on a 40 FPS animation timeline");
  assert.equal(result.motionFPS,40,"Yusuke's movement animation runs at 40 FPS");
  assert.equal(result.derivedSpriteCount,28,"twelve new stagger/recoil/recovery sprites join the original 16");
  assert.equal(result.playerHealth,5000);
  assert.equal(result.kickReady,true,"the eight-frame kick PNG must load into the browser");
  assert.equal(result.premiumReady,true,"both high-detail Yusuke sprite families must load");
  assert.equal(result.matteActive,true,"white-fringe cleanup must load before fighter initialization");
  assert.equal(result.cleanedCanvas,true,"premium cels must use one-time cleaned alpha canvases");
  assert.deepEqual(result.cleanedWidths,[2048,2048],
    "both cleaned textures retain original pixel size and frame alignment");
  assert.ok(result.premiumSources.every(path=>path?.endsWith("-v8.png")),
    "live fighter must load sanitized V8 sprites without white matte gaps");
  assert.ok(result.premiumAttackPoses.every(Boolean),
    "every punch, kick, Spirit Gun, and Shotgun must use correct premium atlas frames");

  assert.equal(result.premiumWidths[0],2048,"combat pose sprites must load at high resolution");
  assert.equal(result.premiumWidths[1],2048,"movement pose sprites must load at high resolution");
  assert.equal(result.arenaWidth,2600,"rooftop stage world must be larger than the viewport");
  assert.equal(result.lowAction,"powerKick","at 50 Spirit Triangle becomes Power Kick");
  assert.equal(result.highAction,"shotgun","at 51 Spirit Triangle becomes Spirit Shotgun");
  assert.equal(result.shotgunProjectileCount,7,"Spirit Shotgun keeps seven damaging collision pellets");
  assert.equal(result.shotgunVisualFragments,40,"anime reference emits forty visual-only energy shots");
  assert.equal(result.shotgunImpacts,1,"one clustered impact effect after a confirmed hit");
  assert.ok(result.shotgunDamage>=39 && result.shotgunDamage<80,
    "cosmetic energy shots never multiply gameplay damage");
  assert.ok(result.gamepadConnected,"DualSense input module should remain loaded");
  assert.ok(result.premiumReady && !!result.atlasCounts.length,"premium V7 art stays active");
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("PASS: real kick atlas rendered, strict energy-gated Triangle, fluid sprite motion, camera, controller.");
  console.log(result);
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
