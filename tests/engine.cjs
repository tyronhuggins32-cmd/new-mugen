const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'game-build-0009.html'),'utf8');
for(const [,script] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script);
const config=JSON.parse(fs.readFileSync(path.join(root,'characters/yusuke/yusuke.json')));
const element=()=>({classList:{add(){},remove(){},toggle(){}},style:{},parentElement:{},addEventListener(){},focus(){},textContent:''});
const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
const callbacks=new Map();let nextId=0;
const context=vm.createContext({console,config,assert,performance:{now:()=>0},
 requestAnimationFrame:fn=>{callbacks.set(++nextId,fn);return nextId},cancelAnimationFrame:id=>callbacks.delete(id),
 document:{querySelector:node,addEventListener(){}},window:{addEventListener(){}},touchButtons:[],
 fightCanvas:{width:1280,height:720},activeScreen:'fight',arcadeGame:null,
 roundBanner:element(),roundBannerText:element(),battleResult:element(),battleResultKicker:element(),battleResultTitle:element(),battleResultMessage:element(),rematchButton:element(),playerHealth:element(),cpuHealth:element(),playerEnergy:element(),cpuEnergy:element(),roundTimer:element(),playTone(){},pending:()=>callbacks.size});
const engine=html.slice(html.indexOf('      const arena ='),html.indexOf('      function beginFight()'));
vm.runInContext(`const yusukeCombat=config.combat; const activeCharacterDefinition=config; const yusukeAnimations=config.spriteSheet.animations;\n${engine}\nattackData=config.combat.attacks;`,context);
vm.runInContext(`
 const g=new ArcadeFight(null); const neutral={left:false,right:false,block:false};
 g.player.x=400;g.cpu.x=900;g.player.update(1/60,{...neutral,left:true},g.cpu,g);
 assert.equal(g.player.facing,1);assert.ok(g.player.vx<0);
 pressFightControl('left','KeyA');pressFightControl('left','ArrowLeft');releaseFightControl('left','KeyA');assert.ok(humanInput().left);clearFightInput();
 g.player.x=arena.left;g.cpu.x=arena.left+10;g.separateFighters();assert.ok(g.cpu.x-g.player.x >= (g.player.width+g.cpu.width)/2);
 g.player.x=500;g.cpu.x=510;g.player.y=arena.floor-240;g.separateFighters();assert.equal(g.player.x,500);assert.equal(g.cpu.x,510);
 g.reset();g.state='play';g.cpu.health=0;g.finishRound();assert.equal(g.roundWins[0],1);g.update(2);assert.equal(g.roundNumber,2);assert.equal(g.state,'intro');
 g.state='play';g.cpu.health=0;g.finishRound();g.update(2);assert.equal(g.state,'finished');assert.equal(g.roundWins[0],2);
 g.reset();assert.equal(g.roundNumber,1);assert.ok(g.roundWins.every(x=>x===0));
 g.state='play';g.timer=0;g.finishRound();g.update(2);assert.equal(g.roundNumber,2);assert.ok(g.roundWins.every(x=>x===0));
 g.reset();g.player.setState('block');g.player.facing=1;g.damageFighter(g.cpu,g.player,{damage:10,facing:1,hitstun:.2,knockback:10},0,0);assert.equal(g.player.health,989);
 g.reset();g.player.setState('block');g.player.facing=1;g.damageFighter(g.cpu,g.player,{damage:10,facing:-1,hitstun:.2,knockback:10},0,0);assert.equal(g.player.health,997.5);
 g.reset();g.state='play';g.player.beginAttack('gun');for(let i=0;i<30;i++)g.player.update(1/60,neutral,g.cpu,g);assert.equal(g.projectiles.length,1);
 g.reset();g.player.x=500;g.cpu.x=580;g.player.beginAttack('light');g.cpu.beginAttack('light');g.player.stateTime=g.cpu.stateTime=config.combat.attacks.light.activeStart;const contacts=[g.prepareMelee(g.player,g.cpu),g.prepareMelee(g.cpu,g.player)];assert.ok(contacts.every(Boolean));contacts.forEach(hit=>hit());assert.ok(g.player.health<1000 && g.cpu.health<1000);
 g.start();assert.equal(pending(),1);g.start();assert.equal(pending(),1);g.stop();assert.equal(pending(),0);g.start();assert.equal(pending(),1);
 g.render=()=>{};g.setPaused(true);const time=g.timer;g.loop(100);assert.equal(g.timer,time);g.stop();
 // Simulate render cadences without scheduling; each must advance one second of gameplay.
 for(const hz of [30,60,120,144]){g.reset();g.state='play';g.controller.update=()=>neutral;g.running=true;g.lastFrame=0;for(let i=1;i<=hz;i++)g.loop(i*1000/hz);assert.ok(Math.abs(g.timer-179)<.018,'fixed tick at '+hz);g.stop();}
 g.reset();const sequence=[];for(let i=0;i<4;i++){g.player.beginAttack('light');sequence.push(g.player.currentAttack());}assert.equal(sequence.join(','),'light,cross,body,upper');g.player.punchWindow=0;g.player.beginAttack('light');assert.equal(g.player.currentAttack(),'light');assert.equal(g.player.maxHealth,1000);assert.equal(g.cpu.maxHealth,1000);
 g.reset();for(let i=0;i<3;i++)g.player.beginAttack('light');g.player.beginAttack('gun');assert.equal(g.player.currentAttack(),'shotgun');assert.equal(g.player.punchStep,0);
 g.reset();g.player.beginAttack('gun');assert.equal(g.player.currentAttack(),'gun');
 g.reset();for(let i=0;i<10;i++)g.damageFighter(g.player,g.cpu,{damage:10,hitstun:.1,knockback:0},0,0);assert.equal(g.player.comboHits,10);assert.equal(g.cpu.health,845);
 g.player.update(2.1,neutral,g.cpu,g);assert.equal(g.player.comboHits,0);
 g.reset();g.cpu.setState('block');g.cpu.facing=-1;g.damageFighter(g.player,g.cpu,{damage:10,hitstun:.1,knockback:0},0,0);assert.equal(g.player.comboHits,0);assert.equal(g.cpu.health,997.5);
 g.reset();g.damageFighter(g.player,g.cpu,{damage:10,hitstun:.1,knockback:0},0,0);g.damageFighter(g.cpu,g.player,{damage:10,hitstun:.1,knockback:0},0,0);assert.equal(g.player.comboHits,0);
 g.reset();for(let n=0;n<3;n++){g.player.beginAttack('light');for(let t=0;t<25;t++)g.player.update(1/60,neutral,g.cpu,g);}g.player.beginAttack('gun');assert.equal(g.player.currentAttack(),'shotgun');for(let t=0;t<20;t++)g.player.update(1/60,neutral,g.cpu,g);assert.equal(g.projectiles.length,5);assert.ok(g.projectiles.every(p=>p.kind==='spiritShotgun'));
 console.log('PASS: syntax, retreat facing, input aliases, corner separation, jump-over, first-to-two, rematch, draw, directional guard, projectile, RAF lifecycle, pause, and 30/60/120/144 Hz timing.');
`,context);
