"use strict";
// White-outline, enclosed-gap and authored-VFX consistency regression.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const root={};
const matteCode=fs.readFileSync("yusuke-alpha-v9.js","utf8");
vm.runInNewContext(matteCode,{window:root,Uint8ClampedArray,Uint8Array,Int32Array});
const matte=root.MugenAlphaMatte;
assert.ok(matte?.cleanPixels && matte?.prepare);
const W=90,H=90,rgba=new Uint8ClampedArray(W*H*4);
const put=(x,y,r,g,b,a=255)=>{const p=(y*W+x)*4;rgba.set([r,g,b,a],p);};
const read=(x,y)=>Array.from(rgba.slice((y*W+x)*4,(y*W+x)*4+4));
for(let y=20;y<=70;y++)for(let x=20;x<=70;x++)put(x,y,31,46,88);
// A two-pixel fully opaque white outline against transparent background.
for(let y=30;y<=60;y++)for(let x=20;x<=21;x++)put(x,y,249,249,247);
// Neutral enclosed white patch in a dark uniform, large enough to be a gap.
for(let y=35;y<=43;y++)for(let x=37;x<=45;x++)put(x,y,249,249,247);
// A small white eye reflection should remain.
for(let y=26;y<=28;y++)for(let x=30;x<=32;x++)put(x,y,248,248,248);
for(let y=38;y<=47;y++)for(let x=69;x<=70;x++)put(x,y,219,46,157);
put(19,19,255,255,255,11);
const stats=matte.cleanPixels(rgba,W,H);
assert.ok(stats.whiteEdge>0 && stats.whiteGaps>=81 && stats.magentaEdge>0);
assert.ok(stats.cutoff>0);
assert.deepEqual(read(20,48).slice(0,3),[31,46,88],
  "white silhouette outline must take nearby original outfit color");
assert.deepEqual(read(40,39).slice(0,3),[31,46,88],
  "white uniform gap must be filled with enclosed source palette");
assert.deepEqual(read(31,27).slice(0,3),[248,248,248],
  "eye glints and legitimate tiny highlights must survive");
assert.deepEqual(read(70,42).slice(0,3),[31,46,88],
  "magenta and white pixel fringes are both removed");
assert.equal(read(19,19)[3],0,"nearly transparent white noise becomes alpha zero");
const before=rgba.slice();
const rerun=matte.cleanPixels(rgba,W,H);
assert.deepEqual(rgba,before,"cleaned pixels must remain stable on repeated processing");
assert.equal(rerun.whiteEdge,0,"no second-pass white edge removal");

// Build a real canvas-shaped mock to verify one-time source preparation,
// correct original frame rects and lack of repeated allocations.
const scope={};let alloc=0,edited=0;
const document={createElement(tag){
 assert.equal(tag,"canvas");alloc++;
 const canvas={width:0,height:0,getContext(type){
  assert.equal(type,"2d");
  return {imageSmoothingEnabled:true,drawImage(){},
    getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)};},
    putImageData(){edited++}};
 }};
 return canvas;
}};
vm.runInNewContext(matteCode,{window:scope,document,Uint8ClampedArray,Uint8Array,Int32Array});
const image={naturalWidth:2048,naturalHeight:1024,width:2048,height:1024};
const frames=[{x:90,y:90,w:332,h:406},{x:627,y:82,w:282,h:414}];
const prepared=scope.MugenAlphaMatte.prepare(image,frames);
assert.ok(prepared!==image && prepared.width===2048 && prepared.height===1024);
assert.equal(edited,frames.length);
assert.equal(scope.MugenAlphaMatte.prepare(image,frames),prepared,
  "once-cleaned artwork is reused across animations and CPU tint");
assert.equal(alloc,1,"one cleaned source texture, not one canvas per frame");
assert.equal(matte.prepare(null,frames),null);

const fxScope={window:{},Image:class MockImage{
 constructor(){this.naturalWidth=1536;this.naturalHeight=1024;}
 set src(_value){this.onload?.();}
}};
vm.runInNewContext(fs.readFileSync("mugen-vfx-v8.js","utf8"),fxScope);
const fx=fxScope.window.MugenVfxV8;
assert.equal(fx.ready(),true);
const events=[];
const ctx=new Proxy({save(){},restore(){},scale(){},translate(){},
 drawImage(_img,sx,sy,sw,sh){events.push([sx,sy,sw,sh]);}
},{get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){o[k]=v;return true}});
const fighter={facing:1,cpu:false,x:430,y:600,grounded:true};
const target={facing:-1,cpu:true,x:540,y:600,grounded:true};
const game={paused:false,player:fighter,cpu:target};
const getDrawn=()=>{events.length=0;fx.drawFront(game,ctx);return events.map(e=>e[0]+":"+e[1]);};
fx.onHit(game,fighter,target,{heavyImpact:true},true,500,435);
assert.equal(fx.stats(game).active,1,
 "blocking a heavy hit must create one guard effect, not a giant explosion");
assert.deepEqual(getDrawn(),["1152:512"],"guard image comes from the same exact VFX cel");
fx.reset(game);
fx.onHit(game,fighter,target,{heavyImpact:false},false,500,435);
assert.equal(fx.stats(game).active,1);
assert.deepEqual(getDrawn(),["0:512"],"light hit uses one consistent punch cel");
fx.reset(game);
fx.onHit(game,fighter,target,{heavyImpact:true},false,500,435);
assert.equal(fx.stats(game).active,2,
 "heavy contact uses one impact cel and one small directional slash");
assert.deepEqual(getDrawn(),["768:0","384:512"]);
for(let i=0;i<36;i++)fx.tick(game,1/60);
assert.equal(fx.stats(game).active,0);

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/yusuke-alpha-v9\.js\?v=1/);
assert.match(html,/MugenAlphaMatte\?\.prepare/);
assert.match(html,/mugen-vfx-v8\.js\?v=2/);
assert.match(html,/mugen-fluid-v3\.js\?v=3/);
assert.match(html,/const authoredImpact = Boolean\(window\.MugenVfxV8\?\.ready\(\)\)/);
assert.match(html,/!this\._usingPremiumCel/);
const fluid=fs.readFileSync("mugen-fluid-v3.js","utf8");
assert.doesNotMatch(fluid,/const strips = 8;/);
assert.match(fluid,/single transformed source rect/);
assert.doesNotMatch(html,/const angle = Math\.random\(\) \* Math\.PI \* 2;/);
new vm.Script([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(x=>x[1]).find(x=>x.includes("function selectYusukeCombatPose")));
console.log("PASS: clean alpha edges/gaps, preserve eye highlights, deterministic authored contacts and seamless cels.");
