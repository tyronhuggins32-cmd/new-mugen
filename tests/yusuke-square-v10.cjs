"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("yusuke-directional-v8.js","utf8");
const meta=JSON.parse(fs.readFileSync("characters/yusuke/premium-atlas.json","utf8"));
const images={movement:{naturalWidth:2048,width:2048},
  combat:{naturalWidth:2048,width:2048}};
const allocations=[],draws=[];
const document={createElement(tag){
  assert.equal(tag,"canvas");
  const surface={width:0,height:0,getContext(type){
    assert.equal(type,"2d");
    return {save(){},restore(){},translate(){},transform(){},
      drawImage(...args){draws.push(args);}};
  }};
  allocations.push(surface);return surface;
}};
const window={};
vm.runInNewContext(source,{window,document,Math});
const motion=window.MugenDirectional;
const atlas=motion.build(meta,images);
assert.ok(atlas,"premium atlas should initialize");
assert.equal(atlas.frameCount,48,"16 movement + 16 combat + 16 new Square cels");
assert.equal(atlas.square?.frames.length,16,"Square attacks get 16 additional cels");
assert.equal(atlas.square?.image.width,2048);
assert.equal(atlas.square?.image.height,2048);
assert.equal(allocations.length,3,"all three atlases are prebuilt and cached");
assert.equal(draws.length,48,"each cel is composed from one intact canonical sprite");
assert.ok(draws.every(call=>call.length===9),
  "never slice a figure into detached horizontal strips");
assert.ok(draws.every(call=>call[0]===images.combat || call[0]===images.movement),
  "new Square frames keep the exact premium source palette and alpha");
const fighter={state:"attack-light",grounded:true,facing:1,vx:0,vy:0,
 stateTime:0,dashTimer:0,currentAttack(){return null;}};
const durations={light:.19,cross:.25,body:.29,upper:.39};
for(const [attack,duration] of Object.entries(durations)){
  fighter.state="attack-"+attack;
  fighter._directionalSprite=null;
  const observed=new Set();
  const timeline=[];
  for(let i=0;i<=Math.ceil(duration*40);i++){
    const progress=Math.min(1,i/(duration*40));
    fighter.stateTime=i/40;
    const pose=motion.choosePose(fighter,attack,atlas,progress);
    assert.equal(pose?.clip,attack==="light"?"jab":attack);
    assert.equal(pose?.part,"square");
    assert.equal(pose?.image,atlas.square.image);
    assert.equal(pose?.scale,.5);
    assert.ok(pose.index>=0&&pose.index<16);
    assert.ok(pose.frame?.w>0&&pose.frame.ax>0);
    observed.add(pose.index);timeline.push(pose.index);
  }
  assert.ok(observed.size>=5,
    attack+" needs at least five different source-matched key poses at real 40 FPS, not two held stills");
  assert.ok(timeline[0]!==timeline[Math.floor(timeline.length/2)] &&
    timeline.at(-1)!==timeline[Math.floor(timeline.length/2)],
    attack+" should contain distinct wind-up, contact and return silhouettes");
}
fighter.grounded=false;fighter.state="attack-upper";
assert.equal(motion.choosePose(fighter,"upper",atlas,.5)?.clip,"airStrike",
  "air attacks keep existing direction-sensitive animation");
fighter.grounded=true;fighter.state="attack-gun";
assert.equal(motion.choosePose(fighter,"gun",atlas,.5),null,
  "Spirit Gun keeps its existing premium special sequence");
assert.equal(motion.choosePose(fighter,"light",{movement:atlas.movement,combat:atlas.combat},.5)?.part,"combat",
  "missing optional Square sheet must keep legacy moves playable");
const studio=fs.readFileSync("yusuke-sprite-studio.html","utf8");
assert.match(studio,/square-download/,"player can export a transparent Square combo sheet");
assert.match(studio,/square:\{width:atlas\.square\.image\.width/,"sprite JSON includes Square crop coordinates");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-directional-v8\.js\?v=3/,"new sprite code invalidates old cached atlas");
assert.match(html,/MugenDirectional\?\.choosePose/,"game selects the new Square cels");
console.log("PASS: Square light/cross/body/upper each gain 5+ distinct 40 FPS poses with premium alpha and fallback.");
