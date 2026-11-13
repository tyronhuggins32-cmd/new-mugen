// Run under the existing Chromium smoke workflow with the local web server.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const html=fs.readFileSync(path.join(__dirname,'../game-build-0009.html'),'utf8');
  const exposed=html.replace('      function beginFight() {',
   `      window.thorfinnSmoke = {get game(){return arcadeGame;},
      get selection(){return selectedFighterDefinition;},
      get atlas(){return thorfinnSpriteSheet;},
      pressFightControl,releaseFightControl};
      function beginFight() {`);
  assert.notEqual(exposed,html,'test seam must be injected before battle starts');
  await page.route('**/game-build-0009.html*',route=>route.fulfill({
   contentType:'text/html',body:exposed
  }));
  await page.goto('http://127.0.0.1:8000/');
  await page.locator('button.menu-item[data-mode="arcade"]').click();
  await page.locator('.roster-card[data-character="thorfinn_karlsefni"]:not([disabled])')
   .waitFor({timeout:15000});
  await page.locator('.roster-card[data-character="thorfinn_karlsefni"]').click();
  assert.equal((await page.locator('#selected-character-name').textContent()).trim(),'Thorfinn');
  assert.match(await page.locator('#character-archetype').textContent(),/Blades/);
  const data=await page.evaluate(()=>({
   id:window.thorfinnSmoke?.selection?.id,
   width:window.thorfinnSmoke?.atlas?.naturalWidth,
   height:window.thorfinnSmoke?.atlas?.naturalHeight
  }));
  assert.equal(data.id,'thorfinn_karlsefni');
  assert.equal(data.width,2048);
  assert.equal(data.height,1960);
  await page.locator('#choose-character').click();
  await page.waitForFunction(()=>window.thorfinnSmoke.game?.state==='play',{timeout:10000});
  const result=await page.evaluate(()=>{
   const game=window.thorfinnSmoke.game;
   game.stop();
   if(game.player.name!=='Thorfinn') throw Error('Wrong fighter spawned');
   if(game.player.maxHealth!==5000) throw Error('Wrong health');
   if(!game.player.beginAttack('gun')) throw Error('Dagger Lunge did not begin');
   if(game.player.currentAttack()!=='gun'||!game.player.activeHitbox() && game.player.stateTime>.3)
     throw Error('Dagger Lunge unavailable');
   game.player.stateTime=.24;
   if(!game.player.activeHitbox()) throw Error('Dagger Lunge missing melee hitbox');
   game.player.energy=75;
   if(!game.player.beginAttack('heavy',75)||game.player.currentAttack()!=='shotgun')
     throw Error('Whirlwind Blades mapping missing');
   game.player.stateTime=.26;
   if(!game.player.activeHitbox()) throw Error('Whirlwind Blades missing melee hitbox');
   // The two newly uploaded sprite families are functional game states.
   game.player.y=600;
   game.player.vy=0;
   game.player.setState('idle');
   const crouchX=game.player.x;
   game.player.update(1/60,{left:false,right:true,block:true},game.cpu,game);
   if(game.player.state!=='crouchWalk' || game.player.x<=crouchX)
     throw Error('Down+right did not crouch-walk with the new sprites');
   game.player.draw(game.context,performance.now());
   game.player.update(1/60,{left:false,right:false,block:false},game.cpu,game);
   if(game.player.state==='crouchWalk')
     throw Error('Crouch-walk state lingered after releasing Down');
   const c=document.createElement('canvas');c.width=c.height=1;
   const ctx=c.getContext('2d');
   ctx.drawImage(window.thorfinnSmoke.atlas,0,0,1,1,0,0,1,1);
   if(ctx.getImageData(0,0,1,1).data[3]!==0)
     throw Error('Atlas corner is opaque; transparency regression');
   game.render(performance.now());
   return {health:game.player.health,energy:game.player.energy,fighter:game.player.name};
  });
  assert.equal(result.fighter,'Thorfinn');
  assert.deepEqual(errors,[],'Thorfinn generated no browser exceptions');
  await page.locator('#battle-back').click();
  await page.locator('.roster-card[data-character="yusuke_urameshi"]').click();
  assert.equal((await page.locator('#selected-character-name').textContent()).trim(),'Yusuke');
  console.log('PASS: Thorfinn loads as a unique second fighter, draws, fights with dagger hitboxes, and returns to Yusuke');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
