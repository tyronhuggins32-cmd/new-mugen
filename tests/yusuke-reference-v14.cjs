"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("mugen-yusuke-reference-v13.js","utf8");
const meta=JSON.parse(fs.readFileSync("characters/yusuke/premium-atlas.json","utf8"));
const ctx={save(){},restore(){},translate(){},transform(){},drawImage(...a){calls.push(a);}};
const calls=[],canvases=[];
const document={createElement(name){
 assert.equal(name,"canvas");
 const can={width:0,height:0,getContext(){return ctx;}};
 canvases.push(can);return can;
}};
const root={};vm.runInNewContext(source,{window:root,document,Math});
const attacks=root.MugenReferenceV13;
const expected=["flashRush","risingBreaker","skyPursuit","spiritCyclone",
 "spiritVoid","meteorFinish","rapidBarrage","spiritWave"];
assert.deepEqual(Object.keys(attacks.moves),expected,
 "two extra unbound moves: high-speed punch barrage and long-range wave");
for(const id of expected){
 const m=attacks.moves[id];
 assert.equal(m.bound,false,id+" must have NO key or gamepad binding");
 assert.equal(m.cels.length,8,id+" has 8 aligned source-matched sprites");
 assert.ok(m.hits.every((h,i)=>h.at>0&&h.at<m.duration&&
  (i===0||h.at>m.hits[i-1].at)));
}
assert.ok(attacks.moves.rapidBarrage.hits.length>=10,
 "barrage must register at least 10 authored punch hits, not just VFX");
assert.ok(attacks.moves.spiritWave.hits.length>=2,
 "charged wave has multiple confirmed energy contacts");
assert.ok(attacks.moves.spiritWave.cost>0,"ranged wave should spend Spirit");
const extension=attacks.extendAttacks({light:{damage:20}});
assert.ok(extension.rapidBarrage && extension.spiritWave);
assert.equal(extension.light.damage,20,
 "new moves never replace the existing Square attack kit");
const sources={combat:{width:2048,naturalWidth:2048},movement:{width:2048,naturalWidth:2048}};
const atlas=attacks.build(meta,sources);
assert.ok(atlas);
assert.equal(atlas.frameCount,64,"8 moves times 8 distinct cels");
assert.deepEqual([atlas.image.width,atlas.image.height],[4096,4096]);
assert.equal(calls.length,64,"no runtime texture allocation while animating");
assert.ok(calls.every(x=>x.length===9 && 
 (x[0]===sources.combat||x[0]===sources.movement)),"sprites use cleaned original art");
const player={x:480,y:540,health:5000,energy:100,grounded:true,
 facing:1,state:"idle",stateTime:0,hitstun:0,vx:0,vy:0,
 currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;},
 beginAttack(id){this.state="attack-"+id;this.stateTime=0;return true;}};
const enemy={x:675,y:540,health:5000,grounded:true,state:"idle"};
const hitLog=[];
const game={state:"play",paused:false,player,cpu:enemy,arena:{left:0,right:2600},
 damageFighter(_a,def,h,x,y){hitLog.push({...h,x,y});def.health-=h.damage;}};
function simulate(id,x,y){
 attacks.reset(game);hitLog.length=0;
 player.state="attack-"+id;player.stateTime=0;player.x=480;
 player.y=540;player.grounded=true;player.facing=1;
 enemy.x=x;enemy.y=y;enemy.health=5000;
 const move=attacks.moves[id];
 for(let i=0;i<=Math.ceil(move.duration*60)+2;i++){
  player.stateTime=i/60;
  attacks.tick(game,1/60);
 }
 return hitLog.length;
}
assert.equal(simulate("rapidBarrage",665,540),
 attacks.moves.rapidBarrage.hits.length,
 "each barrage punch must be a real timed hit with its own damage call");
assert.ok(hitLog.at(-1).heavyImpact,"the final barrage punch has a decisive impact");
assert.equal(simulate("rapidBarrage",2100,540),0,
 "barrage cannot damage distant characters");
assert.equal(simulate("spiritWave",1240,540),
 attacks.moves.spiritWave.hits.length,
 "wave has actual forward reach, unlike a close melee attack");
assert.equal(simulate("spiritWave",1680,540),0,
 "wave cannot hit a target outside its maximum range");
assert.equal(simulate("spiritWave",1240,400),0,
 "a ground-height beam must not hit a fighter 140px above the ground-level beam");
attacks.reset(game);player.state="idle";player.grounded=true;
player.energy=attacks.moves.spiritWave.cost-1;
assert.equal(attacks.trigger(game,"spiritWave"),false,"energy gate");
player.energy=100;
assert.equal(attacks.trigger(game,"spiritWave"),true,"manual engine trigger works");
assert.equal(attacks.stats(game).mapped,0,"no controls assigned");
for(const id of expected){
 const pose=attacks.choosePose(player,id,atlas,.56);
 assert.ok(pose?.frame&&pose.transitionFrame===null);
 assert.ok(pose.index>=expected.indexOf(id)*8 &&
  pose.index<expected.indexOf(id)*8+8);
}
const html=fs.readFileSync("yusuke-attack-lab-v13.html","utf8");
assert.match(html,/data-move="rapidBarrage"/);
assert.match(html,/data-move="spiritWave"/);
assert.match(html,/64 new source-derived combat cels/);
assert.ok(fs.readFileSync("game-build-0009.html","utf8")
 .includes("mugen-yusuke-reference-v13.js?v=2"),"game loads expanded move library");
console.log("PASS: 8 unbound Yusuke attacks, 64 source-derived cels, real 10+ hit barrage, ranged wave, no phantom damage.");
