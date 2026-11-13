"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("yusuke-directional-v8.js","utf8");
const metadata = JSON.parse(fs.readFileSync("characters/yusuke/premium-atlas.json","utf8"));
const draws=[],surfaces=[];
const images={
  combat:{naturalWidth:2048,width:2048},
  movement:{naturalWidth:2048,width:2048}
};
const document={
  createElement(tag){
    assert.equal(tag,"canvas");
    const canvas={width:0,height:0,getContext(){
      return {imageSmoothingEnabled:false,save(){},restore(){},translate(){},
        transform(){},drawImage(...args){draws.push(args);}};
    }};
    surfaces.push(canvas);return canvas;
  }
};
const window={};
vm.runInNewContext(source,{window,document,Math});
const motion=window.MugenDirectional;
const atlas=motion.build(metadata,images);
assert.ok(atlas);
assert.equal(motion.fps,40,"movement keeps its established 40 FPS sampling");
assert.equal(motion.squareFPS,60,"short Square attacks should use the 60 Hz visual timeline");
assert.equal(motion.layouts.square.length,48,"12 cels per four Square moves");
assert.equal(atlas.frameCount,80,"16 directional + 16 combat + 48 Square cels");
assert.equal(atlas.square?.frames.length,48);
assert.deepEqual([atlas.square.image.width,atlas.square.image.height],[4096,3072],
  "48 complete 512px cels fit in an 8-by-6 transparent atlas");
assert.equal(surfaces.length,3,"textures prebuilt only once");
assert.equal(draws.length,80,"every derived cel uses one uncut canonical source image");
assert.ok(draws.every(args=>args.length===9));
assert.ok(draws.every(args=>args[0]===images.movement || args[0]===images.combat),
  "all sprites preserve the existing cleaned premium art");
const durations={light:.19,cross:.25,body:.29,upper:.39};
const attacks=Object.keys(durations);
const baselineHealth=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8")).combat.maxHealth;
assert.equal(baselineHealth,5000,"this is a visual change; 5000HP gameplay remains untouched");
const fighter={state:"attack-light",facing:1,grounded:true,vx:0,vy:0,stateTime:0,
  dashTimer:0,currentAttack(){return null;}};
let previous=null;
for(let move=0;move<attacks.length;move++){
  const attack=attacks[move];
  const offset=move*12;
  assert.equal(motion.layouts.square[offset].part,"movement",
    attack+" starts on the same clean neutral stance");
  assert.equal(motion.layouts.square[offset+11].part,"movement",
    attack+" recovers to the same clean neutral stance");
  assert.equal(motion.layouts.square[offset].src,0);
  assert.equal(motion.layouts.square[offset+11].src,0);
  // The end of one punch and first pose of the next are identical, so a
  // buffered Square does not snap to a different silhouette on contact.
  assert.deepEqual(JSON.parse(JSON.stringify(motion.layouts.square[offset])),
    JSON.parse(JSON.stringify(motion.layouts.square[offset+11])),
    attack+" must leave the feet and guard where the next punch begins");
  if(previous)assert.deepEqual(
    JSON.parse(JSON.stringify(previous)),
    JSON.parse(JSON.stringify(motion.layouts.square[offset])),
    "Square attacks share a neutral chain-boundary silhouette");
  previous=motion.layouts.square[offset+11];
  fighter.state="attack-"+attack;fighter._directionalSprite=null;
  const observed=new Set(),sequence=[];
  const duration=durations[attack];
  // What the real 60Hz fight renderer can show without changing hit timing.
  for(let i=0;i<=Math.ceil(duration*60);i++){
    const p=Math.min(1,(i/60)/duration);
    fighter.stateTime=i/60;
    const pose=motion.choosePose(fighter,attack,atlas,p);
    assert.equal(pose?.part,"square");
    assert.equal(pose?.image,atlas.square.image);
    assert.ok(pose?.index>=offset&&pose.index<offset+12);
    assert.equal(pose?.transitionFrame,null,
      "never onion-skin whole bodies between full-resolution punch poses");
    assert.ok(pose?.motion && Number.isFinite(pose.motion.tilt));
    assert.ok(Math.abs(pose.motion.tilt)<.07,"subframe rotation should be subtle");
    assert.ok(Math.abs(pose.motion.lift)<10,"subframe body movement stays planted");
    assert.ok(pose.motion.stretchX>.94 && pose.motion.stretchX<1.07);
    observed.add(pose.index);sequence.push(pose.index);
  }
  assert.equal(observed.size,12,
    attack+" needs all twelve stages reachable during the existing attack at 60Hz");
  assert.ok(sequence.every((n,i)=>i===0||n>=sequence[i-1]),
    "animation frames must advance in order, never rewind or flicker");
}
fighter.state="walk";fighter.vx=440;fighter.stateTime=.01;
const walking=motion.choosePose(fighter,null,atlas);
assert.equal(walking?.part,"movement");
assert.equal(walking?.transitionFrame,null,
  "walking after Square never draws a translucent duplicate fighter");
fighter.grounded=false;fighter.state="attack-light";
assert.equal(motion.choosePose(fighter,"light",atlas,.5)?.clip,"airStrike",
  "directional aerial attacks keep their existing moves");
assert.equal(motion.choosePose(fighter,"gun",atlas,.5),null,
  "Spirit Gun is unaffected");
const noSquare={movement:atlas.movement,combat:atlas.combat};
fighter.grounded=true;
assert.equal(motion.choosePose(fighter,"cross",noSquare,.5)?.part,"combat",
  "missing optional 48-cel sheet falls back to existing combat art");
// Third canvas failed to allocate: the game should keep directional moves.
let allocated=0;
const memoryDocument={createElement(){
  allocated++;
  return {width:0,height:0,getContext(){
    if(allocated===3)throw Error("canvas memory limit");
    return {save(){},restore(){},translate(){},transform(){},drawImage(){}};
  }};
}};
const w2={};
vm.runInNewContext(source,{window:w2,document:memoryDocument,Math});
const fallback=w2.MugenDirectional.build(metadata,images);
assert.ok(fallback?.movement && fallback?.combat);
assert.equal(fallback.square,null,"allocation failure keeps existing 32-cel fighter");
assert.equal(fallback.frameCount,32);
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-directional-v8\.js\?v=5/);
assert.match(html,/const renderAttackProgress =/);
assert.match(html,/premiumPose\?\.motion/);
const studio=fs.readFileSync("yusuke-sprite-studio.html","utf8");
assert.match(studio,/Square attacks \(48 cels\)/);
assert.match(studio,/squareColumns:8/);
assert.match(studio,/yusuke-directional-v12-frames.json/);
console.log("PASS: 48 source-aligned Square cels, all 12 poses sampled at 60Hz, seamless neutral chains and no ghost overlays.");
