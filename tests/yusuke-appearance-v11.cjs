"use strict";
// Yusuke V11 palette and giant-pose regression (run with node).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const api={};
vm.runInNewContext(fs.readFileSync("mugen-yusuke-palette-v11.js","utf8"),
 {window:api,Uint8Array,Uint8ClampedArray,Uint32Array,WeakMap,Map,Math});
const art=api.MugenYusukePalette;
assert.ok(art?.master && art?.recolor && art?.prepare && art?.fitScale);
const W=80,H=112;
function specimen(variant){
 const arr=new Uint8ClampedArray(W*H*4);
 const paint=(x0,y0,x1,y1,h,s,v)=>{
  const rgb=art.rgb(h,s,v);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const o=(y*W+x)*4;arr.set([...rgb,255],o);
  }
 };
 const t=variant?1:0;
 paint(8,3,55,30,.60+t*.10,.35,.23+t*.07); // dark ink hair
 paint(8,37,57,66,.12+t*.075,.52,.52+t*.2); // uniform jacket
 paint(8,68,57,102,.58+t*.16,.62,.32+t*.10); // trousers
 paint(60,16,77,34,.05+t*.02,.53,.74); // face and neck
 paint(62,43,76,56,.40+t*.11,.62,.48); // wrist accent
 arr.set([255,255,255,255],(16*W+24)*4); // eye highlight
 return arr;
}
function sample(arr,x,y){
 const o=(y*W+x)*4;return Array.from(arr.slice(o,o+4));
}
function hueDistance(a,b){
 const d=Math.abs(a-b);return Math.min(d,1-d);
}
const first=specimen(0),second=specimen(1);
const preserved=[first.slice(),second.slice()];
const counts=[art.recolor(first,W,H),art.recolor(second,W,H)];
for(const k of ["hair","shirt","pants","skin","wrist"]){
 assert.ok(counts.every(c=>c[k]>0),"missing classified "+k+" in normalized sprite sample");
}
for(const [material,x,y] of [
 ["hair",25,12],["shirt",26,52],["pants",26,82],
 ["skin",67,23],["wrist",67,48]
]){
 const h1=art.hsv(...sample(first,x,y).slice(0,3)).h;
 const h2=art.hsv(...sample(second,x,y).slice(0,3)).h;
 assert.ok(hueDistance(h1,art.master[material].h)<.014,
  material+" reference hue must survive hair/outfit normalization");
 assert.ok(hueDistance(h1,h2)<.01,
  material+" hue must remain the same when Yusuke changes animation source");
}
assert.deepEqual(sample(first,24,16),[255,255,255,255],
 "white eye glints must not be repainted as hair or uniform");
assert.deepEqual(sample(second,24,16),[255,255,255,255],
 "all eye highlights survive across palette variants");
for(const [after,before] of [[first,preserved[0]],[second,preserved[1]]]){
 for(let i=3;i<after.length;i+=4)assert.equal(after[i],before[i],
  "color correction cannot change transparent edges or alpha");
}
const source={width:2048,height:1024,naturalWidth:2048,naturalHeight:1024};
const legacyFrame={x:10,y:10,w:300,h:365,ax:150};
const reduced=art.fitScale(source,legacyFrame,1.1,220);
assert.ok(reduced>0 && reduced<=1.1 && reduced*legacyFrame.h<=220.01,
 "old hit/stagger sprite must never appear larger than 220 world pixels");
const cleanFrame={x:10,y:10,w:350,h:420,ax:175};
assert.equal(art.fitScale(source,cleanFrame,.5,220),.5,
 "existing high-resolution figure should retain its canonical scale");

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-yusuke-palette-v11\.js\?v=1/,
 "browser must load color lock before its sprite atlases");
assert.match(html,/MugenYusukePalette\?\.prepare/,
 "all primary and fallback PNGs must receive the shared palette");
assert.match(html,/MugenYusukePalette\?\.fitScale/,
 "giant size must be bounded inside the actual fighter renderer");
assert.match(html,/handoff\?\.transitionImage === rawSheet/,
 "do not crossfade unrelated oversized legacy sprite sheets");
const studio=fs.readFileSync("yusuke-sprite-studio.html","utf8");
assert.match(studio,/MugenYusukePalette\?\.prepare/,
 "export all 56 PNG cels in the unified hair and outfit palette");
const fluid=fs.readFileSync("mugen-fluid-v3.js","utf8");
assert.doesNotMatch(fluid,/hue-rotate\(/,
 "the CPU must not secretly change hair/outfit colors");
const cinematics=fs.readFileSync("mugen-cinematics.js","utf8");
assert.doesNotMatch(cinematics,/drawImage\([^\n]*portrait/,
 "cinematic damage and combo effects cannot overlay a giant fighter portrait");
console.log("PASS: Yusuke V11 shared hair, jacket, skin, trouser and wrist colors; safe sprite size and no portrait ghost.");
