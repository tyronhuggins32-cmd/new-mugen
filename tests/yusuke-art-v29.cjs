"use strict";
const assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs");
const code=fs.readFileSync("mugen-yusuke-art-v29.js","utf8");
const w=16,h=16,rgba=new Uint8ClampedArray(w*h*4);
const set=(x,y,r,g,b,a=255)=>rgba.set([r,g,b,a],(y*w+x)*4);
const get=(x,y)=>Array.from(rgba.slice((y*w+x)*4,(y*w+x)*4+4));
// Ten-by-ten silhouette with opaque, warm-colored interior.
for(let y=2;y<=12;y++)for(let x=2;x<=12;x++)
  set(x,y,134,102,70);
set(2,8,239,237,235); // pale WHITE fringe along outer contour
set(12,8,240,48,25);  // RED outline artifact along outer contour
set(8,8,241,243,246); // interior WHITE eye stays intact
set(8,10,42,53,103); // navy pants shade
set(8,5,212,165,70); // yellow shirt shade
set(10,3,34,108,62); // green wristband must stay green
const before={
  whiteInterior:get(8,8),cuff:get(10,3),navy:get(8,10),
  shirt:get(8,5)
};
const original=new Uint8ClampedArray(rgba);
const root={};
vm.runInNewContext(code,{window:root,Math,WeakMap,Set,Uint8ClampedArray});
const clean=root.MugenYusukeArtV29;
const stats=clean.normalize(rgba,w,h);
assert.ok(stats.removedPale>=1,"outside pale halo must be removed");
assert.ok(stats.removedRed>=1,"outside red sprite artifact must be removed");
assert.equal(get(2,8)[3],0);
assert.equal(get(12,8)[3],0);
assert.deepEqual(get(8,8),before.whiteInterior,
  "white eye inside the character must be preserved");
assert.deepEqual(get(10,3),before.cuff,
  "green wristband must retain the original palette");
assert.equal(get(8,10)[3],255,"navy pants keep exact original opacity");
assert.ok(get(8,10)[2]<=before.navy[2],"navy remains subdued");
assert.equal(get(8,5)[3],255,"yellow shirt keeps exact original opacity");

let draws=0,reads=0,writes=0;
const canvas={width:0,height:0};
const ctx={
 drawImage(){draws++;},imageSmoothingEnabled:true,
 getImageData(){reads++;return {data:new Uint8ClampedArray(original)};},
 putImageData(){writes++;}
};
canvas.getContext=()=>ctx;
const browser={document:{createElement(name){
 assert.equal(name,"canvas");return canvas;
}}};
vm.runInNewContext(code,{window:browser,Math,WeakMap,Set,Uint8ClampedArray});
const manager=browser.MugenYusukeArtV29;
const image={naturalWidth:w,naturalHeight:h};
const final=manager.prepare(image,"heavy-triangle-v26");
assert.equal(final,canvas);
assert.equal(manager.prepare(image,"heavy-triangle-v26"),canvas,
 "image correction must not be re-run every rendering tick");
assert.equal(draws,1);
assert.equal(reads,1);
assert.equal(writes,1);
assert.ok(manager.stats(image).removedPale>0);
assert.equal(manager.prepare({width:w,height:h},"user-reference").width,w,
 "legacy artist reference must not get recolored again");
const noCanvas={};vm.runInNewContext(code,{window:noCanvas,Math,WeakMap,Set,Uint8ClampedArray});
assert.equal(noCanvas.MugenYusukeArtV29.prepare(image,"heavy-triangle-v26"),image,
 "privacy/unsupported canvas must preserve the original sprite");
const renderer=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
assert.match(renderer,/MugenYusukeArtV29\?\.prepare\(image,selected\.source\)/);
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-yusuke-art-v29\.js\?v=29/);
assert.match(html,/artClean=29/);
console.log("PASS: actual source RGBA art halo cleanup, preserved skin/eye/cuffs/alpha, once-only caching and renderer hook");
