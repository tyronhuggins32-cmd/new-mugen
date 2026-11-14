"use strict";
const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");

// Synthetic canvas verifies real source sprite geometry is used: the halfway
// poses warp one silhouette and do not composite two transparent fighters.
const created=[];
class Canvas {
  constructor(){this.width=0;this.height=0;this.calls=[];}
  getContext(){
    if(this.context)return this.context;
    const c=this;
    this.context={
      canvas:c,imageSmoothingEnabled:true,
      clearRect(){},
      drawImage(...args){c.calls.push(args);},
      getImageData(_x,_y,w,h){
        const d=new Uint8ClampedArray(w*h*4);
        if(w===256&&h===256){
          for(let y=16;y<245;y++){
            for(let x=88;x<188;x++)d[(y*256+x)*4+3]=255;
          }
        }
        return {data:d};
      },
      putImageData(){}
    };
    return this.context;
  }
}
const doc={createElement(name){
  assert.equal(name,"canvas");
  const c=new Canvas();created.push(c);return c;
}};
const root={document:doc};
vm.runInNewContext(fs.readFileSync("yusuke-walk-polish-v22.js","utf8"),
  {window:root,Math});
const synth=root.MugenWalkPolishV22;
assert.equal(synth.frameCount,24);
const source={naturalWidth:1536,naturalHeight:512};
const output=synth.generate(source);
assert.ok(output);
assert.equal(output.width,1536);
assert.equal(output.height,1024);
assert.equal(created.length,2);
assert.equal(created[0].calls.length,12,"read all twelve original frames");
assert.equal(output.calls.length,12+12*16,
  "draw 12 original poses plus 12 single-silhouette band-morphed inbetweens");
assert.equal(synth.generate({width:900,height:512}),null,
  "reject unsupported source geometry");
assert.equal(synth.generate({width:1536,height:512})?.width,1536);

const code=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const files=[];
class FakeImage{
  set src(name){
    this._src=name;files.push(name);
    this.naturalWidth=1536;
    this.naturalHeight=/-v16[.]png$/.test(name)?1024:512;
    if(/v21_24frames|v22_24frames/.test(name))this.onerror?.();
    else this.onload?.();
  }
  get src(){return this._src;}
}
root.Image=FakeImage;
vm.runInNewContext(code,{window:root,Math});
const sprite=root.MugenExactYusuke;
const oldArt={naturalWidth:1536,naturalHeight:1024};
const atlas=sprite.build(oldArt);
assert.ok(atlas);
const fighter={
  x:300,y:600,facing:1,grounded:true,vx:180,vy:0,
  dashTimer:0,dashElapsed:0,dashDuration:0,turnTimer:0,
  hitstun:0,state:"walk",stateTime:0,walkCycleDistance:0,
  currentAttack(){return null;}
};
function pose(){return sprite.pose(fighter,atlas,.3);}
const before=pose();
assert.equal(before.source,"movement-v22-generated",
  "24-step walk must work even when newer authored PNGs are not deployed");
assert.equal(before.frameCount,24);
assert.equal(before.index,0);
const indexes=[];
for(let i=0;i<24;i++){
  fighter.walkCycleDistance=i*10;
  indexes.push(pose().index);
}
assert.deepEqual(indexes,Array.from({length:24},(_,i)=>i),
  "24 frame indexes progress with world travel, not idle animation time");
fighter.walkCycleDistance=240;
assert.equal(pose().index,0,"walk loops at full stride length");
fighter.walkCycleDistance=37;
const hold=pose().index;
fighter.stateTime+=9;
assert.equal(pose().index,hold,"no treadmill while standing still");
fighter.state="run";fighter.vx=470;
assert.equal(pose().clip,"sprint","L3 running uses separate sheet");
fighter.state="dash";fighter.vx=850;fighter.dashTimer=.18;
assert.equal(pose().clip,"rush","R1 dash uses separate sheet");
assert.ok(files.some(x=>x.includes("yusuke_walk_forward_v22_24frames.png")),
  "attempt to load the new authored alpha atlas");

class ImageV22 extends FakeImage {
  set src(name){
    this._src=name;this.naturalWidth=1536;
    this.naturalHeight=/-v16[.]png$|v22_24frames/.test(name)?1024:512;
    if(/v21_24frames/.test(name))this.onerror?.();
    else this.onload?.();
  }
  get src(){return this._src;}
}
const root22={Image:ImageV22};
vm.runInNewContext(code,{window:root22,Math});
const exact22=root22.MugenExactYusuke;
const atlas22=exact22.build(oldArt);
const actor22={...fighter,state:"walk",vx:180,dashTimer:0,
  walkCycleDistance:120};
const authored=exact22.pose(actor22,atlas22,.3);
assert.equal(authored.source,"movement-v22",
  "actual authored 24-pose artwork must override the generated fallback");
assert.equal(authored.frameCount,24);
assert.equal(authored.index,12);
console.log("PASS: 24-pose walk fallback, distance-synced feet, no ghost overlays, V22 art priority, independent run/dash.");
