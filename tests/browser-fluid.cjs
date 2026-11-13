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
  await page.route("**/game-build-0009.html",route=>route.fulfill({
    contentType:"text/html",
    body:html.replace("      function beginFight() {",
      "      window.testEngine = { get game() { return arcadeGame; }, get kickReady() { return kickAtlasReady; }, arena }; \n      function beginFight() {")
  }));
  await page.goto("http://127.0.0.1:8000/");
  await page.locator('button.menu-item[data-mode="arcade"]').click();
  await page.locator("#choose-character").click();
  await page.waitForFunction(()=>window.testEngine?.game?.state==="play" && window.MugenFluid && window.MugenMotion,
    {timeout:20000});
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
    const before=window.MugenFluid.getStats(g).zoom;
    g.player.x=605;g.cpu.x=705;
    for(let i=0;i<25;i++)g.render(1058+i*16);
    const after=window.MugenFluid.getStats(g).zoom;
    g.reset();g.state="play";g.player.energy=50;
    g.player.beginAttack("heavy");
    const lowAction=g.player.currentAttack();
    g.player.stateTime=.22;
    g.render(1720); // Load and paint the kick atlas in the real canvas context.
    g.reset();g.state="play";g.player.energy=51;g.player.beginAttack("heavy");
    const highAction=g.player.currentAttack();
    // Simulate actual shot release and hit in Chromium, not just metadata.
    const neutral={left:false,right:false,block:false};
    g.cpu.x=g.player.x+240;
    for(let i=0;i<20;i++)g.player.update(1/60,neutral,g.cpu,g);
    const shotgunProjectileCount=g.projectiles.filter(p=>p.kind==="spiritShotgun").length;
    const shotgunVisualFragments=window.MugenShotgun?.stats(g).visualFragments;
    g.render(1950); // Render fist charge, actual pellets and decorative fan together.
    for(let i=0;i<24;i++)g.updateProjectiles(1/60);
    const shotgunImpacts=window.MugenShotgun?.stats(g).impactsCreated;
    const shotgunDamage=1000-g.cpu.health;
    g.render(1990); // The collision splash must render without browser errors.
    const state={first,second,before,after,shotgunProjectileCount,shotgunVisualFragments,
      shotgunImpacts,shotgunDamage,atlasFrameCount:window.MugenMotion.clips.run.count,
      motionFPS:window.MugenMotion.fps,derivedSpriteCount:window.MugenMotion.sources.length,
      kickReady:window.testEngine.kickReady,lowAction,highAction,
      playerHealth:g.player.health,gamepadConnected:!!window.MugenGamepad};
    return state;
  });
  assert.notEqual(result.first,result.second,"movement should modify actual rendered pixels continuously");
  assert.ok(result.after<result.before,"fight camera should ease out to show point-blank combat");
  assert.equal(result.atlasFrameCount,24,"running uses 24 samples on a 40 FPS animation timeline");
  assert.equal(result.motionFPS,40,"Yusuke's movement animation runs at 40 FPS");
  assert.equal(result.derivedSpriteCount,28,"twelve new stagger/recoil/recovery sprites join the original 16");
  assert.equal(result.playerHealth,1000);
  assert.equal(result.kickReady,true,"the eight-frame kick PNG must load into the browser");
  assert.equal(result.lowAction,"powerKick","at 50 Spirit Triangle becomes Power Kick");
  assert.equal(result.highAction,"shotgun","at 51 Spirit Triangle becomes Spirit Shotgun");
  assert.equal(result.shotgunProjectileCount,7,"Spirit Shotgun keeps seven damaging collision pellets");
  assert.equal(result.shotgunVisualFragments,40,"anime reference emits forty visual-only energy shots");
  assert.equal(result.shotgunImpacts,1,"one clustered impact effect after a confirmed hit");
  assert.ok(result.shotgunDamage>=39 && result.shotgunDamage<80,
    "cosmetic energy shots never multiply gameplay damage");
  assert.ok(result.gamepadConnected,"DualSense input module should remain loaded");
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("PASS: real kick atlas rendered, strict energy-gated Triangle, fluid sprite motion, camera, controller.");
  console.log(result);
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
