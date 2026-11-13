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
      get combatAtlas(){return thorfinnCombatSpriteSheet;},
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
   height:window.thorfinnSmoke?.atlas?.naturalHeight,
   combatWidth:window.thorfinnSmoke?.combatAtlas?.naturalWidth,
   combatHeight:window.thorfinnSmoke?.combatAtlas?.naturalHeight
  }));
  assert.equal(data.id,'thorfinn_karlsefni');
  assert.equal(data.width,2048);
  assert.equal(data.height,1960);
  assert.equal(data.combatWidth,3072);
  assert.equal(data.combatHeight,1600);
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
   // A renderAlpha of 0 is a 60Hz interpolation fraction, NOT an opacity.
   // Previously it multiplied Canvas globalAlpha and erased Thorfinn on
   // some frames. Test actual displayed alpha, not just PNG corner pixels.
   game.player.setState('idle');
   game.player.grounded=true;
   game.player.x=400;
   game.player.y=600;
   game.player.stateTime=.1;
   const scratch=document.createElement('canvas');
   scratch.width=800;
   scratch.height=700;
   const spriteCtx=scratch.getContext('2d',{willReadFrequently:true});
   const visibleCounts=[];
   for(const interpolation of [0,.02,.25,.5,1]) {
     spriteCtx.clearRect(0,0,800,700);
     game.player.drawThorfinnSprite(spriteCtx,performance.now(),interpolation);
     const pixels=spriteCtx.getImageData(0,0,800,700).data;
     let fullyOpaque=0;
     for(let p=3;p<pixels.length;p+=4) if(pixels[p]>=245) fullyOpaque++;
     visibleCounts.push(fullyOpaque);
     if(fullyOpaque<1000) throw Error(
       'Thorfinn faded in battle at renderAlpha '+interpolation+
       ': only '+fullyOpaque+' opaque pixels');
     if(spriteCtx.getImageData(0,0,1,1).data[3]!==0)
       throw Error('Transparent atlas background became opaque');
   }
   if(Math.max(...visibleCounts)-Math.min(...visibleCounts)>250)
     throw Error('Thorfinn visibility varies with simulation interpolation');

   // Every attack and recoil must select the ORIGINAL new combat-sheet
   // texture, not the old idle/movement stand-in. These are real canvas
   // draw calls, tested with the same renderer used in a live fight.
   const originalDrawImage=spriteCtx.drawImage.bind(spriteCtx);
   const captured=[];
   spriteCtx.drawImage=(...args)=>{
     captured.push(args);
     return originalDrawImage(...args);
   };
   const checkPose=(state,seconds,y,first,last)=>{
     game.player.setState(state);
     game.player.stateTime=seconds;
     game.player.y=y;
     game.player.vy=0;
     captured.length=0;
     spriteCtx.clearRect(0,0,scratch.width,scratch.height);
     game.player.drawThorfinnSprite(spriteCtx,performance.now(),0);
     const hit=captured.find(args=>args[0]===window.thorfinnSmoke.combatAtlas);
     if(!hit)throw Error('Missing combat sheet draw for '+state+' at y='+y);
     const index=Math.round(hit[1]/384)+Math.round(hit[2]/320)*8;
     if(index<first||index>last)
       throw Error(state+' selected wrong combat frame '+index+
         ' instead of authored '+first+'..'+last);
     const pixels=spriteCtx.getImageData(0,0,800,700).data;
     let body=0;
     for(let i=3;i<pixels.length;i+=4)if(pixels[i]>=245)body++;
     if(body<1000)throw Error('New authored sprite has transparent body: '+state);
     if(spriteCtx.getImageData(0,0,1,1).data[3]!==0)
       throw Error('White source JPEG background visible in '+state);
     return index;
   };
   const examined=[
     checkPose('attack-light',.09,600,14,25),
     checkPose('attack-cross',.09,600,14,25),
     checkPose('attack-gun',.23,600,26,35),
     checkPose('attack-shotgun',.28,600,26,35),
     checkPose('hit',.17,600,4,7),
     checkPose('attack-light',.09,480,0,3),
     checkPose('attack-cross',.11,480,8,13)
   ];
   if(new Set(examined).size<5)throw Error('Too few distinct fighting poses');

   return {health:game.player.health,energy:game.player.energy,fighter:game.player.name,
      poses:examined};
  });
  assert.equal(result.fighter,'Thorfinn');
  assert.deepEqual(errors,[],'Thorfinn generated no browser exceptions');
  await page.locator('#battle-back').click();
  await page.locator('.roster-card[data-character="yusuke_urameshi"]').click();
  assert.equal((await page.locator('#selected-character-name').textContent()).trim(),'Yusuke');
  console.log('PASS: Thorfinn loads 56 movement and 36 creator-authored combat sprites, selects real light, cross, lunge, whirlwind, air combo and hit cels, renders opaque bodies over transparent backgrounds and returns to Yusuke');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
