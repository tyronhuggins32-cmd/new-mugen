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
 await page.route('**/game-build-0009.html*',r=>r.fulfill({contentType:'text/html',body:source.replace('      function beginFight() {','      window.testEngine = { get game() { return arcadeGame; }, get exactAtlas() { return exactYusukeAtlas; }, get rawExact() { return exactYusukeSpriteSheet; }, get attacks() { return attackData; }, Fighter, pressFightControl, releaseFightControl, humanInput, clearFightInput, arena };\n      function beginFight() {')}));
 await page.goto('http://127.0.0.1:8000/');
 await page.locator('button.menu-item[data-mode="arcade"]').click();
 await page.locator('#choose-character').click();
 
 await page.waitForFunction(()=>window.testEngine.game.state==='play');
 // Real browser regression against the actual uploaded legacy reference:
 // the green trousers must be corrected before an uppercut or hit is drawn.
 const paletteCheck=await page.evaluate(()=>{
   const source=window.testEngine.rawExact;
   const normalized=window.testEngine.exactAtlas?.image;
   if(!source?.naturalWidth || !(normalized instanceof HTMLCanvasElement))
     throw Error('Yusuke fallback atlas was not normalized in the browser');
   const w=source.naturalWidth,h=source.naturalHeight;
   const raw=document.createElement('canvas');raw.width=w;raw.height=h;
   raw.getContext('2d').drawImage(source,0,0);
   const before=raw.getContext('2d').getImageData(0,0,w,h).data;
   const after=normalized.getContext('2d').getImageData(0,0,w,h).data;
   let green=0,stillGreen=0,alphaErrors=0;
   for(let y=0;y<h;y+=4){
     if(y%256<145 || y%256>=247)continue;
     for(let x=0;x<w;x+=4){
       const i=(y*w+x)*4,r=before[i],g=before[i+1],b=before[i+2];
       if(before[i+3]!==after[i+3])alphaErrors++;
       if(before[i+3]>=45 && g>22 && g>r*1.12 && g>b*.92 &&
          r<145 && g<200 && (g-r>7 || g-b>7)){
         green++;
         if(after[i+2]<=after[i+1])stillGreen++;
       }
     }
   }
   if(green<100)throw Error('Missing original green trouser pixels in test source');
   if(stillGreen!==0)throw Error('Green trouser pixels survived legacy palette correction');
   if(alphaErrors)throw Error('Sprite transparency changed during palette correction');
   return green;
 });
 assert.ok(paletteCheck>100,'real uploaded green sprite pixels corrected to navy');
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
  // Triangle is now a dedicated authored heavy combo regardless of Spirit
  // meter. The old energy-dependent Shotgun/Power Kick switch was removed.
  g.reset();g.state='play';g.player.energy=50;
  ok(g.player.beginAttack('heavy') && g.player.currentAttack()==='heavy',
    'Triangle at 50% activates the heavy combo');
  g.reset();g.state='play';g.player.energy=51;
  ok(g.player.beginAttack('heavy') && g.player.currentAttack()==='heavy',
    'Triangle above 50% still activates the heavy combo');
  g.reset();g.state='play';g.player.beginAttack('light');g.updateHud(true);
  ok(document.querySelector('.combo-panel').hidden,'combo meter is hidden before three Square taps');
  g.player.beginAttack('light');g.player.beginAttack('light');g.updateHud(true);
  ok(!document.querySelector('.combo-panel').hidden,'combo meter appears after third Square');
  // Test the real VFX layer, not just the combo-policy helper. Damage and hit
  // reactions work from Square 1; all special punch art stays off through 4.
  g.reset();g.state='play';g.player.x=530;g.cpu.x=700;
  ok(g.player.maxHealth===5000 && g.cpu.maxHealth===5000,'both fighters have 5000 HP');
  for(let press=1;press<=5;press++){
    ok(g.player.beginAttack('light'),'Square chain remains available');
    const type=g.player.currentAttack();
    g.cpu.invulnerability=0;
    g.damageFighter(g.player,g.cpu,g.config?.attacks?.[type] ||
      ({light:{damage:20,knockback:110,hitstun:.17},
        cross:{damage:26,knockback:140,hitstun:.23},
        body:{damage:30,knockback:100,hitstun:.23},
        upper:{damage:42,knockback:410,hitstun:.36}})[type],
      g.cpu.x,g.cpu.y-105);
    const fx=window.MugenVfxV8?.stats(g);
    if(press<5){
      ok(g.impacts.length===0 && (fx?.active||0)===0,
        'Square ' + press + ' must be visually clean before COMBO 5');
    }else{
      const painted=window.MugenVfxV8?.ready();
      ok((painted ? g.impacts.length===0 : g.impacts.length>0) && fx?.active>0,
        'COMBO 5 must unlock one authored punch effect without duplicate square sparks');
    }
    g.updateHud(true);
    if(press===5)ok(document.querySelector('#combo-label').textContent.includes('COMBO 5'),
      'combo counter and VFX unlock agree');
  }
  // Human movement uses the selected direction even when away from rival.
  g.reset();g.state='play';g.player.x=900;g.cpu.x=700;g.player.facing=-1;
  const xBeforeRight=g.player.x;
  g.player.update(1/60,{...neutral,right:true},g.cpu,g);
  ok(g.player.facing===1 && g.player.state==='walk' && g.player.x>xBeforeRight,
    'rightward turn-and-walk works when facing opponent to the left');
  // Browser-accurate overlap protection, punch magnetism and gun impact.
  g.reset();g.state='play';g.player.x=550;g.cpu.x=568;g.separateFighters();
  ok(Math.abs(g.cpu.x-g.player.x)>=142-0.01,'readable close-fighter spacing');
  g.reset();g.state='play';g.player.x=400;g.cpu.x=625;
  g.player.facing=1;g.player.setState('attack-light');
  g.player.stateTime=.08;
  const contact=g.prepareMelee(g.player,g.cpu);
  ok(typeof contact==='function' && g.player.x>400,
    'jab closes a near-range gap and registers an actual body intersection');
  contact();ok(g.cpu.health<g.cpu.maxHealth,'assisted jab registers actual damage');
  // Test input-to-impact, not manual HP reduction. Neutral stick punches
  // should face a nearby enemy on either side, and distant swings must whiff.
  g.reset();g.state='play';g.player.x=450;g.cpu.x=660;
  g.player.facing=-1;
  g.player.update(1/60,{...neutral,lightPressed:true},g.cpu,g);
  ok(g.player.facing===1,'Square faces a nearby opponent when stick is neutral');
  g.player.stateTime=testEngine.attacks.light.activeStart+.015;
  const rightContact=g.prepareMelee(g.player,g.cpu);
  ok(typeof rightContact==='function','right-facing neutral Square connects');
  rightContact();
  ok(g.cpu.health<g.cpu.maxHealth,'right-facing hit applies real HP damage');
  g.reset();g.state='play';g.player.x=710;g.cpu.x=495;
  g.player.facing=1;
  g.player.update(1/60,{...neutral,lightPressed:true},g.cpu,g);
  ok(g.player.facing===-1,'Square turns toward opponent on the left');
  g.player.stateTime=testEngine.attacks.light.activeStart+.015;
  const leftContact=g.prepareMelee(g.player,g.cpu);
  ok(typeof leftContact==='function','left-facing Square connects');
  leftContact();
  ok(g.cpu.health<g.cpu.maxHealth,'left-facing hit applies real HP damage');
  g.reset();g.state='play';g.player.x=400;g.cpu.x=780;
  g.player.facing=1;g.player.setState('attack-light');
  g.player.stateTime=testEngine.attacks.light.activeStart+.015;
  ok(!g.prepareMelee(g.player,g.cpu),'out-of-range Square cannot damage at distance');
  ok(g.cpu.health===g.cpu.maxHealth,'whiff cannot reduce enemy health');
  g.reset();g.state='play';g.player.x=500;g.cpu.x=668;
  g.player.facing=1;g.cpu.setState('crouch');
  g.player.setState('attack-light');
  g.player.stateTime=testEngine.attacks.light.activeStart+.015;
  ok(!g.prepareMelee(g.player,g.cpu),'high jab misses a genuinely crouching fighter');
  g.player.setState('attack-body');g.player.stateTime=testEngine.attacks.body.activeStart+.015;
  ok(typeof g.prepareMelee(g.player,g.cpu)==='function',
    'body blow contacts the crouching hurtbox');

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
