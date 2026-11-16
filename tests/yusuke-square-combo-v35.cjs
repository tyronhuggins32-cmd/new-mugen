"use strict";
const fs=require("node:fs"),zlib=require("node:zlib"),vm=require("node:vm");
const assert=require("node:assert/strict");
const filepath="characters/yusuke/yusuke_square_master_v35_30frames.png";
const data=fs.readFileSync(filepath);
assert.equal(data.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.equal(data.readUInt32BE(16),1920);
assert.equal(data.readUInt32BE(20),1280);
assert.equal(data[24],8,"channel depth");
assert.equal(data[25],6,"true RGBA, no opaque background");
assert.ok(data.length>600000,"real detailed PNG artwork");

// Decode RGBA via built-in zlib to validate exact 30 silhouette sizes/feet.
const idats=[];let pos=8;
while(pos+12<data.length){
 const size=data.readUInt32BE(pos),type=data.toString("ascii",pos+4,pos+8);
 if(type==="IDAT")idats.push(data.subarray(pos+8,pos+8+size));
 pos+=size+12;if(type==="IEND")break;
}
const inflated=zlib.inflateSync(Buffer.concat(idats));
const width=1920,height=1280,bpp=4,stride=width*bpp;
const minX=Array(30).fill(9999),maxX=Array(30).fill(-1),
 minY=Array(30).fill(9999),maxY=Array(30).fill(-1);
let prev=Buffer.alloc(stride);
for(let y=0;y<height;y++){
 const scan=y*(stride+1),filter=inflated[scan],
 row=Buffer.from(inflated.subarray(scan+1,scan+1+stride));
 for(let i=0;i<stride;i++){
  const a=i>=bpp?row[i-bpp]:0,b=prev[i],c=i>=bpp?prev[i-bpp]:0;
  let predictor=0;
  if(filter===1)predictor=a;
  else if(filter===2)predictor=b;
  else if(filter===3)predictor=Math.floor((a+b)/2);
  else if(filter===4){
   const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
   predictor=da<=db&&da<=dc?a:db<=dc?b:c;
  }else if(filter!==0)throw Error("Unknown PNG filter "+filter);
  row[i]=(row[i]+predictor)&255;
 }
 const gridRow=Math.floor(y/256),localY=y%256;
 for(let x=0;x<width;x++){
  if(row[x*bpp+3]<145)continue;
  const gridCol=Math.floor(x/320),id=gridRow*6+gridCol;
  minX[id]=Math.min(minX[id],x%320);maxX[id]=Math.max(maxX[id],x%320);
  minY[id]=Math.min(minY[id],localY);maxY[id]=Math.max(maxY[id],localY);
 }
 prev=row;
}
for(let i=0;i<30;i++){
 const h=maxY[i]-minY[i]+1;
 assert.ok(maxX[i]>minX[i],"frame "+i+" has no character");
 assert.ok(h>=165&&h<=221,"frame "+i+" distorted silhouette h="+h);
 assert.ok(maxY[i]>=242&&maxY[i]<=250,"frame "+i+" foot baseline="+maxY[i]);
}
for(let i=26;i<30;i++){
 const h=maxY[i]-minY[i]+1;
 assert.ok(h>=200&&h<=207,"Square end frame "+i+" shrinks, height="+h);
}
assert.ok(new Set(maxY.slice(0,18)).size<=3,"jabs/cross/body use planted foot line");

const code=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
class FakeImage{
 set src(src){
  this._src=src;
  if(src.includes("square_master_v36")){this.onerror?.();return;}
  try{const b=fs.readFileSync(src);
    this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);
    this.onload?.();
  }catch(_){this.onerror?.();}
 }
 get src(){return this._src;}
}
const root={Image:FakeImage};
vm.runInNewContext(code,{window:root,Math});
const renderer=root.MugenExactYusuke;
const atlas=renderer.build({naturalWidth:1536,naturalHeight:1024});
const fighter={x:500,y:600,prevX:500,prevY:600,vx:0,vy:0,facing:1,
 grounded:true,dashTimer:0,hitstun:0,state:"attack-light",stateTime:0,
 currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}};
let all=[],reference=null;
for(const [clip,offset,frames] of [["light",0,6],["cross",6,6],["body",12,6],["upper",18,12]]){
 for(let i=0;i<frames;i++){
  fighter.state="attack-"+clip;
  fighter.stateTime=(i+.13)/frames*.36;
  const pose=renderer.pose(fighter,atlas,.36);
  assert.equal(pose.source,"square-combo-v35",clip+" must use V35 master");
  assert.equal(pose.index,offset+i);
  assert.equal(pose.frame.x,((offset+i)%6)*320);
  assert.equal(pose.frame.y,Math.floor((offset+i)/6)*256);
  assert.equal(pose.frame.w,320);assert.equal(pose.frame.h,256);
  assert.equal(pose.frame.ax,160);
  assert.equal(pose.scale,.96,"no per-pose body rescale");
  reference ||= pose.image;
  assert.equal(pose.image,reference,"no mid-combo texture swap");
  all.push(pose.index);
 }
}
assert.equal(new Set(all).size,30);
const ctx={imageSmoothingEnabled:true,draws:0,
 save(){},restore(){},translate(){},scale(){},rotate(){},
 drawImage(){this.draws++}};
fighter.state="attack-upper";fighter.stateTime=.35;
assert.equal(renderer.draw(fighter,ctx,0,1,atlas,.36),true);
assert.equal(ctx.draws,1,"exactly one fighter per drawn frame");
fighter.state="attack-heavy";
assert.notEqual(renderer.pose(fighter,atlas,.36).source,"square-combo-v35");
fighter.state="run";fighter.vx=450;
assert.notEqual(renderer.pose(fighter,atlas,.36).source,"square-combo-v35");
fighter.state="dash";fighter.dashTimer=.15;fighter.vx=750;
assert.notEqual(renderer.pose(fighter,atlas,.36).source,"square-combo-v35");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/squareCombo=36&upperRecovery=36&masterAtlas=36/);
const continuity=fs.readFileSync("mugen-yusuke-animation-v28.js","utf8");
assert.match(continuity,/square-combo-v35","square-combo-v36/);
console.log("PASS V35: 30 distinct Square frames, full-size ending, alpha, foot pivots, no distortion or sprite swapping, controls preserved.");
