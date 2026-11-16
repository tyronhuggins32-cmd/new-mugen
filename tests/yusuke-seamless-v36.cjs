"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

// Two individually authored atlases with DIFFERENT pixel-space character
// heights must still draw at the same 194px world-space standing height.
let reads=0;
const canvas={width:256,height:256,subject:null};
const ctx={
  clearRect(){},drawImage(image){canvas.subject=image;},
  getImageData(){
    reads++;
    const d=new Uint8ClampedArray(canvas.width*canvas.height*4);
    const kind=canvas.subject.kind;
    const top=kind==="compact"?60:18;
    const bottom=kind==="compact"?215:230;
    for(let y=top;y<=bottom;y++)for(let x=90;x<=164;x++){
      const k=(y*canvas.width+x)*4;
      d.set([52,62,107,255],k);
    }
    // Fully opaque cyan energy bar outside anatomy must NOT increase height.
    for(let y=0;y<=14;y++)for(let x=50;x<=90;x++){
      const k=(y*canvas.width+x)*4;
      d.set([5,201,250,255],k);
    }
    return {data:d};
  }
};
canvas.getContext=()=>ctx;
const root={document:{createElement(type){
  assert.equal(type,"canvas");return canvas;
}}};
vm.runInNewContext(fs.readFileSync("mugen-yusuke-animation-v28.js","utf8"),
 {window:root,Math,WeakMap,Map,Uint8ClampedArray});
const director=root.MugenYusukeAnimationV28;
const mk=(kind,source,clip,scale)=>({
  image:{kind},frame:{x:0,y:0,w:256,h:256,ax:128,key:0},
  source,clip,scale,progress:.5
});
const tall=mk("tall","movement-v33","forward",.95);
const compact=mk("compact","triangle-launcher-v31","guard",.90);
const a=director.resolve(tall),b=director.resolve(compact);
assert.ok(a.measured&&b.measured);
assert.ok(Math.abs(a.opaqueHeight-b.opaqueHeight)<=3,
  "Different source pixels must resolve to the same 194px body family");
assert.ok(a.opaqueHeight>=190&&a.opaqueHeight<=197);
assert.ok(b.opaqueHeight>=190&&b.opaqueHeight<=197);
assert.ok(director.getMetrics(tall.image,tall.frame).top>=16,
  "Bright Spirit Gun effects must not expand the body silhouette");
assert.equal(director.resolve(tall).scale,a.scale);
const readsAfter=reads;
for(let i=0;i<10;i++)director.resolve(tall);
assert.equal(reads,readsAfter,"Geometry sampling must be cached");

const fighter={};
director.stabilize(fighter,tall,a,1000);
const first=director.stabilize(fighter,compact,b,1016);
assert.ok(Math.abs(first.opaqueHeight-a.opaqueHeight)<=1.5,
  "Switching source pixel density must not flash smaller first-frame body");
const mid=director.stabilize(fighter,compact,b,1056);
const end=director.stabilize(fighter,compact,b,1120);
assert.ok(Math.abs(end.opaqueHeight-b.opaqueHeight)<.01);
assert.ok(mid.scale>0&&first.scale>0);

// Intentional crouching remains compressed instead of giant-sized.
const low={...compact,clip:"crouch"};
const lowLayout=director.resolve(low);
const lowStable=director.stabilize(fighter,low,lowLayout,1136);
assert.equal(lowStable.opaqueHeight,lowLayout.opaqueHeight);

const paletteCode=fs.readFileSync("mugen-yusuke-palette-v30.js","utf8");
class RefCanvas{
  constructor(){this.width=0;this.height=0;this.img=null;}
  getContext(){const cv=this;return {
    drawImage(i){cv.img=i;},
    getImageData(){return {data:new Uint8ClampedArray(cv.img.pixels)};},
    putImageData(){}
  };}
}
const paletteRoot={document:{createElement(){return new RefCanvas();}}};
vm.runInNewContext(paletteCode,
 {window:paletteRoot,Math,Map,WeakMap,Set,Uint8ClampedArray});
const pal=paletteRoot.MugenYusukePaletteV30;
const reference=new Uint8ClampedArray(30*5*4);
const shades=[
 [[20,35,88],[27,43,105],[34,57,122]],
 [[25,90,55],[36,115,65],[48,140,78]],
 [[191,150,63],[210,168,72],[224,184,93]],
 [[200,120,83],[225,150,96],[180,106,72]],
 [[13,52,55],[22,76,81],[27,98,103]]
];
shades.forEach((family,row)=>family.forEach((rgb,shade)=>{
  for(let x=shade*10;x<(shade+1)*10;x++)
    reference.set([...rgb,255],(row*30+x)*4);
}));
const firstReference={width:30,height:5,pixels:reference};
assert.equal(pal.setReference(firstReference),true);
const snapshot=JSON.stringify(pal.getPalette());
const altered=new Uint8ClampedArray(reference);
for(let i=0;i<altered.length;i+=4)altered[i]=Math.max(0,altered[i]-40);
assert.equal(pal.setReference({width:30,height:5,pixels:altered}),true);
assert.equal(JSON.stringify(pal.getPalette()),snapshot,
  "Async duplicate idle-image load must not recolor cached sprite sheets");

const renderer=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
assert.match(renderer,/const canonical=root\.MugenYusukePaletteV30\?\.prepare\(art\)\|\|art;/);
assert.match(renderer,/resolve\(canonical===image\?selected:/,
  "Measure the same alpha mask actually rendered on screen");
assert.match(renderer,/stabilize\?\.\(fighter,selected,measured,time\)/,
  "Smooth the actual sprite geometry without fading two images");
assert.match(renderer,/for\(const \[img,source\] of images\)/,
  "Pre-process image palettes before gameplay begins");
console.log("PASS: V36 canonical colors, density-normalized cross-atlas body height, one-body handoffs, visual FX excluded and cached measurements");
