"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("mugen-yusuke-reference-v13.js","utf8");
const meta=JSON.parse(fs.readFileSync("characters/yusuke/premium-atlas.json","utf8"));
const draws=[],canvases=[];
const document={createElement(tag){
 assert.equal(tag,"canvas");
 const canvas={width:0,height:0,getContext(){
  return {imageSmoothingEnabled:false,save(){},restore(){},translate(){},
   transform(){},drawImage(...args){draws.push(args);}};
 }};
 canvases.push(canvas);return canvas;
}};
const window={};
vm.runInNewContext(source,{window,document,Math});
const combat=window.MugenReferenceV13;
assert.ok(combat,"cinematic reference move library must load");
const ids=["flashRush","risingBreaker","skyPursuit","spiritCyclone","spiritVoid","meteorFinish","rapidBarrage","spiritWave"];
assert.deepEqual(Object.keys(combat.moves),ids);
for(const id of ids){
 const move=combat.moves[id];
 assert.equal(move.cels.length,8,id+" needs eight complete keyed animation frames");
 assert.ok(move.duration>=.45 && move.duration<=2.2);
 assert.ok(Array.isArray(move.hits)&&move.hits.length>=1);
 assert.equal(move.bound,false,id+" must remain unassigned to controls");
 assert.ok(move.hits.every((hit,i)=>hit.at>0&&hit.at<move.duration &&
  (i===0||hit.at>move.hits[i-1].at)),id+" hit frames must be timed and ordered");
}
assert.ok(combat.moves.risingBreaker.hits[0].launchVelocity<0);
assert.ok(combat.moves.skyPursuit.airOnly);
assert.ok(combat.moves.meteorFinish.airOnly,"Meteor Finish is an aerial descent");
assert.ok(combat.moves.spiritVoid.cinematic);
assert.equal(combat.moves.spiritVoid.hits.length,15,
 "reference-video finish needs fifteen separate confirmed damage beats");
const src={combat:{width:2048,naturalWidth:2048},movement:{width:2048,naturalWidth:2048}};
const atlas=combat.build(meta,src);
assert.equal(atlas.frames.length,64);
assert.deepEqual([atlas.image.width,atlas.image.height],[4096,4096]);
assert.equal(canvases.length,1);
assert.equal(draws.length,64);
assert.ok(draws.every(x=>x.length===9&&(x[0]===src.combat||x[0]===src.movement)),
 "single-piece original sprites, no strip slicing or white gaps");
const fighter={state:"attack-flashRush",grounded:true,facing:1,x:480,y:540,vx:0,vy:0,
 stateTime:.1,energy:100,beginAttack(name){this.state="attack-"+name;this.stateTime=0;return true;},
 currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}};
const foe={x:710,y:540,grounded:true,health:5000,width:84,height:194,invulnerability:0,
 state:"idle"};
const hits=[],game={state:"play",paused:false,player:fighter,cpu:foe,arena:{left:0,right:2600},
 damageFighter(a,d,hit,x,y){hits.push({a,d,hit,x,y});d.health-=hit.damage;}};
for(const id of ids){
 fighter.state="attack-"+id;fighter.stateTime=0;fighter.grounded=!combat.moves[id].airOnly;
 for(let i=0;i<=8;i++){
  const pose=combat.choosePose(fighter,id,atlas,i/8);
  assert.ok(pose?.frame && pose?.image===atlas.image);
  assert.equal(pose.part,"reference");
  assert.equal(pose.transitionFrame,null,"no two complete sprites blended");
  assert.ok(pose.index>=ids.indexOf(id)*8 && pose.index<ids.indexOf(id)*8+8);
  assert.ok(pose.motion&&Number.isFinite(pose.motion.tilt));
 }
}
combat.reset(game);
fighter.state="idle";fighter.grounded=true;
assert.equal(combat.trigger(game,"skyPursuit"),false,"air-only move requires a jump");
assert.equal(combat.trigger(game,"bad move"),false);
assert.equal(combat.trigger(game,"flashRush"),true);
assert.equal(fighter.state,"attack-flashRush");
for(let i=0;i<80;i++){
 fighter.stateTime=i/60;
 combat.tick(game,1/60);
}
assert.equal(hits.length,combat.moves.flashRush.hits.length,
 "each flash rush hit lands once at its authored timing");
assert.ok(hits.every(x=>x.hit.damage>0&&x.hit.damage<=50));
assert.ok(fighter.x<foe.x-140,"rush never overlaps the opponent");
assert.equal(combat.stats(game).active,false,"finished sequences expire");
combat.reset(game);hits.length=0;
fighter.state="attack-risingBreaker";fighter.stateTime=0;fighter.x=480;
fighter.grounded=true;fighter.vy=0;foe.x=650;
for(let i=0;i<35;i++){fighter.stateTime=i/60;combat.tick(game,1/60);}
assert.ok(fighter.vy<=-750 && fighter.y<540,
 "confirmed rising launcher must put Yusuke in the air for later Sky Pursuit");
combat.reset(game);hits.length=0;
fighter.state="attack-flashRush";fighter.stateTime=0;fighter.x=480;
foe.x=2200;
for(let i=0;i<80;i++){fighter.stateTime=i/60;combat.tick(game,1/60);}
assert.equal(hits.length,0,"no teleported damage across the arena");
combat.reset(game);hits.length=0;fighter.x=850;foe.x=710;
for(let i=0;i<80;i++){fighter.stateTime=i/60;combat.tick(game,1/60);}
assert.equal(hits.length,0,"no attack can strike behind Yusuke");
combat.reset(game);fighter.state="idle";
assert.equal(combat.trigger(game,"spiritVoid"),true,"cinematic is callable, not bound");
assert.equal(combat.stats(game).move,"spiritVoid");
combat.reset(game);
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-yusuke-reference-v13\.js\?v=2/);
assert.match(html,/MugenReferenceV13\?\.tick\(this,dt\)/);
assert.match(html,/MugenReferenceV13\?\.choosePose/);
assert.match(html,/YusukeAttackLab/);
assert.doesNotMatch(html,/Key[A-Z]:\s*"flashRush"/);
const gallery=fs.readFileSync("yusuke-attack-lab-v13.html","utf8");
for(const id of ids)assert.match(gallery,new RegExp(id));
console.log("PASS: eight unbound source-derived reference moves, 64 complete cels, scheduled hits, rush spacing, airborne restrictions and cinematic staging.");
