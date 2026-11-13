"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs");
const code=fs.readFileSync("yusuke-alpha-cleanup-v9.js","utf8");
const w=8,h=8,sample=new Uint8ClampedArray(w*h*4);
const put=(x,y,c)=>sample.set(c,(y*w+x)*4);
const read=(data,x,y)=>Array.from(data.slice((y*w+x)*4,(y*w+x)*4+4));
for(let y=2;y<=5;y++)for(let x=2;x<=5;x++)put(x,y,[31,46,88,255]);
// Thick dyed torso with two original bright white artifacts:
put(2,2,[252,252,252,255]); // opaque white at outline
put(5,3,[249,249,247,125]); // semi-transparent white matte at outline
put(3,4,[254,254,254,255]); // single fully enclosed pure-white pinhole
put(4,4,[246,246,246,255]); // intentional highlight with fewer than 7 dark neighbors
const image={naturalWidth:w,naturalHeight:h,width:w,height:h};
let created=0,putCount=0;
const doc={createElement(tag){
 assert.equal(tag,"canvas");created++;
 const ctx={imageSmoothingEnabled:true,drawImage(){},getImageData(){
  return {data:new Uint8ClampedArray(sample)};
 },putImageData(data){this.result=new Uint8ClampedArray(data.data);putCount++;}};
 const canvas={width:0,height:0,getContext(){return ctx;},_ctx:ctx};
 return canvas;
}};
const scope={window:{},document:doc,Uint8ClampedArray,Math};
vm.runInNewContext(code,scope);
const cleanup=scope.window.MugenArtCleanup;
assert.ok(cleanup?.prepare);
const frame={frames:[{x:0,y:0,w:8,h:8,ax:4}]};
const cleaned=cleanup.prepare(image,frame);
assert.equal(created,1);
assert.equal(putCount,1);
const result=cleaned._ctx.result;
assert.equal(read(result,2,2)[3],0,"opaque white edge must disappear");
assert.equal(read(result,5,3)[0],31,"semi-transparent white fringe borrows solid sprite color");
assert.ok(read(result,5,3)[3]<125,"fringe alpha is diminished");
assert.equal(read(result,3,4)[0],31,"fully surrounded white pinhole is replaced");
assert.equal(read(result,4,4)[0],246,"intentional white facial highlight survives");
assert.deepEqual(read(result,4,3),[31,46,88,255],"body pixels keep their original palette");
assert.equal(cleanup.prepare(image,frame),cleaned,"decoded texture repair is cached");
assert.equal(created,1,"never allocate new repair textures per frame");
assert.ok(cleaned._mugenAlphaRepair.fringe>=2);
assert.ok(cleaned._mugenAlphaRepair.pinholes>=1);
assert.equal(cleanup.prepare(image,{frames:[{x:4,y:4,w:30,h:30}]}),cleaned,
 "cached repaired source cannot be incorrectly remade");
const missing={naturalWidth:0,width:0};
assert.equal(cleanup.prepare(missing,frame),missing,"broken sprite image safely falls back");
const w2={};
vm.runInNewContext(code,{window:w2,document:undefined,Uint8ClampedArray,Math});
assert.equal(w2.MugenArtCleanup.prepare(image,frame),image,"older browsers keep source PNG");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-alpha-cleanup-v9\.js\?v=1/);
assert.match(html,/MugenArtCleanup\?\.prepare\(/);
assert.match(html,/cleanedPremiumCombat \|\| premiumCombatSheet/);
assert.match(html,/cleanedPremiumMovement \|\| premiumMotionSheet/);
assert.match(html,/const handoff = premiumPose \? null : motionPose/);
const studio=fs.readFileSync("yusuke-sprite-studio.html","utf8");
assert.match(studio,/MugenArtCleanup\?\.prepare\(movement,meta\.movement\)/);
assert.match(studio,/MugenArtCleanup\?\.prepare\(combat,meta\.combat\)/);
console.log("PASS: white halo removal, transparent fringe decontamination, pinhole filling, preserved highlights, cached textures and fallback.");
