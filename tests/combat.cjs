// Run with an available Playwright install and a server on localhost:8000.
const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
 const page = await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const source=fs.readFileSync(require('node:path').join(__dirname,'../game-build-0009.html'),'utf8');
 // Expose lexical engine state only in the test response, never in the shipped game.
 await page.route('**/game-build-0009.html',r=>r.fulfill({contentType:'text/html',body:source.replace('      function beginFight() {','      window.testEngine = { get game() { return arcadeGame; }, Fighter, pressFightControl, releaseFightControl, humanInput, clearFightInput, arena };\n      function beginFight() {')}));
 await page.goto('http://127.0.0.1:8000/');
 await page.locator('button.menu-item[data-mode="arcade"]').click();
 await page.locator('#choose-character').click();
 
 await page.waitForFunction(()=>window.testEngine.game.state==='play');
 const checks=await page.evaluate(()=>{
  const {game:g,arena,pressFightControl,releaseFightControl,humanInput,clearFightInput}=testEngine;
  g.stop();
  const ok=(v,msg)=>{if(!v)throw Error(msg)};
  const neutral={left:false,right:false,block:false};
  g.player.x=400;g.cpu.x=900;
  g.player.update(1/60,{...neutral,left:true},g.cpu,g);
  ok(g.player.facing===1 && g.player.vx<0,'retreat facing');
  pressFightControl('left','KeyA');pressFightControl('left','ArrowLeft');releaseFightControl('left','KeyA');
  ok(humanInput().left,'aliased inputs');clearFightInput();
  g.player.x=arena.left;g.cpu.x=arena.left+10;g.separateFighters();
  ok(g.cpu.x-g.player.x >= (g.player.width+g.cpu.width)/2,'corner collision');
  g.player.x=500;g.cpu.x=510;g.player.y=arena.floor-240;g.separateFighters();
  ok(g.player.x===500 && g.cpu.x===510,'jump-over collision');
  g.reset();g.state='play';g.cpu.health=0;g.finishRound();
  ok(g.roundWins[0]===1 && g.state==='ending','first KO');
  g.update(2);ok(g.state==='intro' && g.roundNumber===2 && g.roundWins[0]===1,'next round');
  g.state='play';g.cpu.health=0;g.finishRound();g.update(2);
  ok(g.state==='finished' && g.roundWins[0]===2,'match result');
  g.reset();ok(g.roundNumber===1 && g.roundWins.every(x=>x===0),'rematch reset');
  g.state='play';g.timer=0;g.finishRound();g.update(2);
  ok(g.roundNumber===2 && g.roundWins.every(x=>x===0),'draw replay');
  g.reset();g.player.setState('block');g.player.facing=1;
  g.damageFighter(g.cpu,g.player,{damage:10,facing:1,hitstun:.2,knockback:10},0,0);
  ok(g.player.health===990,'rear guard bypass');
  g.reset();g.player.setState('block');g.player.facing=1;
  g.damageFighter(g.cpu,g.player,{damage:10,facing:-1,hitstun:.2,knockback:10},0,0);
  ok(g.player.health===997.5,'front guard');
  // Triangle switches on the strict spirit meter threshold.
  g.reset();g.state='play';g.player.energy=50;
  ok(g.player.beginAttack('heavy') && g.player.currentAttack()==='powerKick',
    'Triangle at 50% activates knockback Power Kick');
  g.reset();g.state='play';g.player.energy=51;
  ok(g.player.beginAttack('heavy') && g.player.currentAttack()==='shotgun',
    'Triangle above 50% activates Spirit Shotgun');
  g.reset();g.state='play';g.player.beginAttack('light');g.updateHud(true);
  ok(document.querySelector('.combo-panel').hidden,'combo meter is hidden before three Square taps');
  g.player.beginAttack('light');g.player.beginAttack('light');g.updateHud(true);
  ok(!document.querySelector('.combo-panel').hidden,'combo meter appears after third Square');
  // Browser-accurate overlap protection, punch magnetism and gun impact.
  g.reset();g.state='play';g.player.x=550;g.cpu.x=568;g.separateFighters();
  ok(Math.abs(g.cpu.x-g.player.x)>=142-0.01,'readable close-fighter spacing');
  g.reset();g.state='play';g.player.x=400;g.cpu.x=585;
  g.player.facing=1;g.player.setState('attack-light');
  g.player.stateTime=.08;
  const contact=g.prepareMelee(g.player,g.cpu);
  ok(typeof contact==='function' && g.player.x>400,'jab snaps into its active hit range');
  contact();ok(g.cpu.health<1000,'assisted jab registers actual damage');

  g.reset();g.state='play';g.player.x=350;g.cpu.x=740;
  g.player.facing=1;g.player.energy=100;
  g.spawnProjectile(g.player,'spiritGun');
  ok(g.projectiles.length===1,'gun spawns exactly one shot');
  g.updateProjectiles(.3); // Bullet crosses the entire hurtbox in one large step.
  ok(g.projectiles.length===0,'swept Spirit Gun stops on the defender');
  ok(g.cpu.health===922,'Spirit Gun lands its configured 78 base damage');
  ok(g.hitStop>=.1 && g.shake>=15,'gun impact drives cinematic hit-stop and shake');
  ok(window.MugenSpiritGun?.stats(g).shotsHit===1,'new Spirit Gun effect triggers on contact');

  g.reset();g.state='play';g.player.x=350;g.cpu.x=740;
  g.cpu.invulnerability=1;
  g.spawnProjectile(g.player,'spiritGun');
  g.updateProjectiles(.3);
  ok(g.projectiles.length===0 && g.cpu.health===1000,
    'gun stops even on an invulnerable target without damaging it');
  g.reset();g.state='play';g.start();
  return 22;
 });
 await page.keyboard.press('p');
 const pausedTime=await page.evaluate(()=>testEngine.game.timer);
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>testEngine.game.timer),pausedTime);
 await page.keyboard.press('p');
 await page.keyboard.down('l');await page.keyboard.up('l');
 await page.waitForTimeout(400);
 assert.ok(await page.evaluate(()=>testEngine.game.player.energy<70));
 await page.screenshot({path:'/tmp/mugen-fight.png'});
 await page.locator('#battle-back').click();
 await page.locator('#choose-character').click();
 await page.waitForFunction(()=>testEngine.game.state==='play');
 assert.equal(errors.length,0,errors.join('\n'));
 await page.setViewportSize({width:390,height:844});
 await page.locator('#pause-fight').click();
 assert.equal(await page.evaluate(()=>testEngine.game.paused),true);
 await page.screenshot({path:'/tmp/mugen-mobile.png'});
 console.log(`${checks} engine checks plus loading, pause, projectile, re-entry and mobile pause passed. Browser errors: ${errors.length}`);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
