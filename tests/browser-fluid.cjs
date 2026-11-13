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
      "      window.testEngine = { get game() { return arcadeGame; }, arena }; \n      function beginFight() {")
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
    const state={first,second,before,after,atlasFrameCount:window.MugenMotion.clips.run.count,
      playerHealth:g.player.health,gamepadConnected:!!window.MugenGamepad};
    return state;
  });
  assert.notEqual(result.first,result.second,"movement should modify actual rendered pixels continuously");
  assert.ok(result.after>result.before,"fight camera should follow and zoom closer");
  assert.equal(result.atlasFrameCount,28,"run uses virtual 60 Hz time samples");
  assert.equal(result.playerHealth,1000);
  assert.ok(result.gamepadConnected,"DualSense input module should remain loaded");
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("PASS: browser rendered changing sprite pixels, dynamic camera, controller and no page exceptions");
  console.log(result);
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
