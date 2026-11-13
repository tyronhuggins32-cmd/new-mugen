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
  ok(g.player.facing===-1 && g.player.vx<0,'left input turns Yusuke left and walks');
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
  ok(g.player.health===4990,'rear guard bypass');
  g.reset();g.player.setState('block');g.player.facing=1;
  g.damageFighter(g.cpu,g.player,{damage:10,facing:-1,hitstun:.2,knockback:10},0,0);
  ok(g.player.health===4997.5,'front guard');
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
  contact();ok(g.cpu.health<g.cpu.maxHealth,'assisted jab registers actual damage');

  g.reset();g.state='play';g.player.x=350;g.cpu.x=740;
  g.player.facing=1;g.player.energy=100;
  g.spawnProjectile(g.player,'spiritGun');
  ok(g.projectiles.length===1,'gun spawns exactly one shot');
  g.updateProjectiles(.3); // Bullet crosses the entire hurtbox in one large step.
  ok(g.projectiles.length===0,'swept Spirit Gun stops on the defender');
  ok(g.cpu.health===4922,'Spirit Gun lands its configured 78 base damage');
  ok(g.hitStop>=.1 && g.shake>=15,'gun impact drives cinematic hit-stop and shake');
  ok(window.MugenSpiritGun?.stats(g).shotsHit===1,'new Spirit Gun effect triggers on contact');

  g.reset();g.state='play';g.player.x=350;g.cpu.x=740;
  g.cpu.invulnerability=1;
  g.spawnProjectile(g.player,'spiritGun');
  g.updateProjectiles(.3);
  ok(g.projectiles.length===0 && g.cpu.health===5000,
    'gun stops even on an invulnerable target without damaging it');
  // Reproduce the user's cross-up issue with 60 real fixed physics steps.
  // This is not a synthetic teleport; horizontal input and gravity must carry
  // Yusuke completely over the standing opponent and onto the opposite side.
  g.reset();g.state='play';g.player.x=500;g.cpu.x=670;
  g.player.facing=1;g.cpu.facing=-1;
  const jumpInput=(direction,pressed)=>({
    left:direction<0,right:direction>0,jumpPressed:pressed,
    block:false,lightPressed:false,heavyPressed:false,gunPressed:false,
    dashPressed:false,charge:false,ultimatePressed:false
  });
  g.player.update(1/60,jumpInput(1,true),g.cpu,g);
  ok(g.player.vy<0 && !g.player.grounded,'jump begins despite nearby opponent');
  let openedAirCross=false;
  for(let i=0;i<65;i++){
    g.player.update(1/60,jumpInput(1,false),g.cpu,g);
    g.separateFighters();
    if(g.player._crossOverActive)openedAirCross=true;
  }
  ok(openedAirCross,'jumper passes shoulder height without an invisible collision wall');
  ok(g.player.x>g.cpu.x+142,'Yusuke can land on far side of opponent');
  ok(g.player.grounded,'fighter finishes jump on stage floor');

  g.reset();g.state='play';g.player.x=900;g.cpu.x=1050;
  g.cpu.setState('attack-light');g.player.facing=1;
  g.player.update(1/60,jumpInput(-1,true),g.cpu,g);
  ok(g.player.vy<0 && g.player.vx<0,
    'retreating jump wins priority over automatic back-blocking');

  g.reset();g.state='play';g.player.x=555;g.cpu.x=686;
  g.player.facing=1;g.cpu.state='crouch';
  g.player.setState('attack-light');g.player.stateTime=.08;
  ok(!g.prepareMelee(g.player,g.cpu),'high jab must miss crouched hurtbox');
  g.player.setState('attack-body');g.player.stateTime=.13;
  ok(typeof g.prepareMelee(g.player,g.cpu)==='function',
    'low body punch overlaps crouched opponent');

  ok(window.MugenVfxV8?.ready(),
    'new transparent Spirit Gun and punch hit effects must load in the playable fight');
  g.reset();g.state='play';g.start();
  return 28;
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
