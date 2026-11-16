"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const path=require("node:path");

const directory="characters/yusuke";
const packs=[
  {file:"yusuke_square_3hit_v32.png",size:[1536,768]},
  {file:"yusuke_square_upper_v32.png",size:[1280,768]}
];
for(const {file,size} of packs){
 const p=path.join(directory,file),data=fs.readFileSync(p);
 assert.equal(data.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 assert.deepEqual([data.readUInt32BE(16),data.readUInt32BE(20)],size,
  file+" atlas dimensions must match engine frame cropping");
 assert.equal(data[25],6,"RGBA PNG with real alpha required");
 assert.ok(data.length>180000,"actual high-resolution art, not a placeholder");
}
const code=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const loads=[];
class FakeImage{
 set src(src){
   this._src=src;loads.push(src);
   // Verify backward compatibility when V34 is absent or fails to decode.
   if(src.includes("square_master_v34")||src.includes("square_master_v35")||src.includes("square_master_v36")){this.onerror?.();return;}
   try{
     const data=fs.readFileSync(src);
     this.naturalWidth=data.readUInt32BE(16);
     this.naturalHeight=data.readUInt32BE(20);
     this.onload?.();
   }catch(e){this.onerror?.();}
 }
 get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(code,{window:root,Math});
const sprite=root.MugenExactYusuke;
const atlas=sprite.build({naturalWidth:1536,naturalHeight:1024});
assert.ok(atlas);
const fighter={
 x:400,y:600,prevX:400,prevY:600,vx:0,vy:0,facing:1,
 grounded:true,dashTimer:0,hitstun:0,stateTime:0,
 state:"attack-light",currentAttack(){
   return this.state.startsWith("attack-")?this.state.slice(7):null;
 }};
const groups={light:[6,0],cross:[6,6],body:[6,12],upper:[12,0]};
const output=[];
for(const [attack,[count,start]] of Object.entries(groups)){
 for(let i=0;i<count;i++){
   fighter.state="attack-"+attack;
   fighter.stateTime=(i+.15)/count*.33;
   const pose=sprite.pose(fighter,atlas,.33);
   assert.equal(pose.source,"square-combo-v32",
      attack+" must use the newly uploaded V32 art, not old V25/V28");
   assert.equal(pose.clip,attack);
   assert.equal(pose.index,start+i,attack+" frame "+i);
   assert.equal(pose.frame.w,attack==="upper"?320:256);
   assert.equal(pose.frame.h,256);
   assert.equal(pose.frame.ax,attack==="upper"?160:128);
   assert.equal(pose.scale,.96);
   output.push(pose);
 }
}
assert.equal(output.length,30);
assert.equal(output.at(-1).index,11);
assert.equal(output.at(-1).image.naturalWidth,1280);
assert.equal(output[0].image.naturalWidth,1536);
assert.ok(loads.some(x=>x.endsWith("yusuke_square_3hit_v32.png")));
assert.ok(loads.some(x=>x.endsWith("yusuke_square_upper_v32.png")));

const ctx={
 imageSmoothingEnabled:true,drawCalls:[],
 save(){},restore(){},translate(){},scale(){},rotate(){},
 drawImage(...args){this.drawCalls.push(args);}
};
fighter.state="attack-upper";fighter.stateTime=.32;
assert.equal(sprite.draw(fighter,ctx,0,1,atlas,.33),true);
assert.equal(ctx.drawCalls.length,1,
 "exactly one fighter; never layer distorted ghost bodies or crossfade two sprites");
assert.equal(ctx.imageSmoothingEnabled,false,"preserve crisp pixel art");

fighter.grounded=false;
fighter.state="attack-upper";
assert.notEqual(sprite.pose(fighter,atlas,.33).source,"square-combo-v32",
 "airborne action keeps its independent animation");
fighter.grounded=true;fighter.state="attack-heavy";
assert.notEqual(sprite.pose(fighter,atlas,.33).source,"square-combo-v32",
 "Triangle must keep its independently authored action");

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/squareCombo=36/,"browser cache must refresh replacement textures");
assert.match(html,/type = \["light", "cross", "body", "upper"\]/,
 "Square combo input order remains unchanged");
console.log("PASS: Yusuke V32 Square combo 18+12 authored RGBA frames, full-size 320px uppercut frames, single-body render and unchanged inputs.");
