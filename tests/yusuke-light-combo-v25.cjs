"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const vm=require("node:vm");
const srcFile="characters/yusuke/yusuke_light_combo_18frames.png";
const bytes=fs.readFileSync(srcFile);
assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(bytes.readUInt32BE(16),1536);
assert.equal(bytes.readUInt32BE(20),768);
assert.equal(bytes[25],6,"Attack atlas must have true RGBA transparency");
assert.ok(bytes.length>500000,"Never replace full-resolution art with a thumbnail");
assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),
  "556efcfbf4e51e367f3f5cf338a8dd6f406377c1178c3c359ec62e329edd184e");
const frames=JSON.parse(fs.readFileSync("characters/yusuke/light-combo-v25.json","utf8"));
assert.equal(frames.atlas.frameCount,18);
assert.deepEqual(frames.clips.light.frames,[0,1,2,3,4,5]);
assert.deepEqual(frames.clips.cross.frames,[6,7,8,9,10,11]);
assert.deepEqual(frames.clips.body.frames,[12,13,14,15,16,17]);

const source=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const requests=[];
class FakeImage {
  set src(path){
    this._src=path;
    this.naturalWidth=path.includes("crouch")?1280:path.includes("dodge")?1024:1536;
    this.naturalHeight=path===srcFile?768:path.includes("-v16.png")?1024:
      path.includes("jump_landing")?1024:512;
    requests.push(path);
    if(this.onload)this.onload();
  }
  get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(source,{window:root,Math});
const sprite=root.MugenExactYusuke;
const legacy={naturalWidth:1536,naturalHeight:1024};
const atlas=sprite.build(legacy);
assert.ok(atlas);
const actor={x:300,y:600,facing:1,state:"idle",stateTime:0,
  grounded:true,vx:0,vy:0,hitstun:0,dashTimer:0,
  currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}};
const pose=(attack,index,grounded=true)=>{
  actor.state="attack-"+attack;
  actor.stateTime=(index+.15)/6*.36;
  actor.grounded=grounded;
  return sprite.pose(actor,atlas,.36);
};
const cases=[["light",0],["cross",6],["body",12]];
for(const [attack,offset] of cases){
  for(let k=0;k<6;k++){
    const p=pose(attack,k);
    assert.equal(p.source,"light-combo-v25",attack+" missing new sprite image");
    assert.equal(p.clip,attack);
    assert.equal(p.index,offset+k,"wrong cel for "+attack+" index "+k);
    assert.equal(p.image._src,srcFile);
    assert.equal(p.frame.x,k*256);
    assert.equal(p.frame.y,offset/6*256);
    assert.equal(p.frame.w,256);
    assert.equal(p.frame.h,240);
    assert.ok(p.frame.h*p.scale<=sprite.maximumHeight+.01);
  }
}
assert.equal(requests.filter(x=>x===srcFile).length,1,"Load attack PNG only once");
assert.equal(pose("light",2,false).image,legacy,"Air attacks must retain existing art");
assert.equal(pose("upper",2,true).image,legacy,"Uppercut must retain existing art");
assert.equal(pose("gun",2,true).image,legacy,"Spirit Gun must retain its own poses");
const calls=[],ctx={save(){},restore(){},translate(){},scale(){},rotate(){},
 drawImage(...args){calls.push(args)},imageSmoothingEnabled:false};
pose("cross",3);
assert.equal(sprite.draw(actor,ctx,0,1,atlas,.36),true);
assert.equal(calls.length,1,"Only one fighter body may render");
assert.equal(calls[0][0]._src,srcFile);
const noImage={};
vm.runInNewContext(source,{window:noImage,Math});
const fallback=noImage.MugenExactYusuke.build(legacy);
assert.equal(noImage.MugenExactYusuke.pose(actor,fallback,.36).image,legacy,
  "Image failures must retain the old combat reference");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-exact-reference-v15[.]js[^"]*lightCombo=25/);
assert.match(html,/squarePressesRequired/);
assert.match(html,/type = \["light", "cross", "body", "upper"\]/);
console.log("PASS: 18 real RGBA light combo poses, 3 hits, 6 cels each, fallback and existing combo contract.");
