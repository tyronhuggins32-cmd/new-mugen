"use strict";
const fs=require("node:fs"),vm=require("node:vm");
const assert=require("node:assert/strict");
const materials={
  navy:[[20,35,88],[27,43,105],[34,57,122]],
  green:[[25,90,55],[36,115,65],[48,140,78]],
  yellow:[[191,150,63],[210,168,72],[224,184,93]],
  skin:[[200,120,83],[225,150,96],[180,106,72]],
  teal:[[13,52,55],[22,76,81],[27,98,103]]
};
class Canvas {
  constructor(){this.width=0;this.height=0;this.source=null;this.pixels=null;}
  getContext(){
    const canvas=this;
    return {
      imageSmoothingEnabled:true,
      drawImage(img){canvas.source=img;},
      getImageData(){
        return {data:new Uint8ClampedArray(canvas.pixels||
          canvas.source?.pixels||new Uint8ClampedArray(canvas.width*canvas.height*4))};
      },
      putImageData(result){canvas.pixels=new Uint8ClampedArray(result.data);}
    };
  }
}
let canvasCount=0;
const root={document:{createElement(type){
 assert.equal(type,"canvas");canvasCount++;return new Canvas();
}}};
vm.runInNewContext(fs.readFileSync("mugen-yusuke-palette-v30.js","utf8"),
 {window:root,Math,Map,WeakMap,Set,Uint8ClampedArray});
const palette=root.MugenYusukePaletteV30;
assert.equal(palette.isReady(),false);
function asset(width,height,pixels){
 return {width,height,pixels};
}
const reference=new Uint8ClampedArray(30*5*4);
for(const [row,values] of Object.values(materials).entries()){
  for(let x=0;x<30;x++){
    const rgba=values[Math.floor(x/10)];
    reference.set([...rgba,255],(row*30+x)*4);
  }
}
assert.equal(palette.setReference(asset(30,5,reference)),true);
assert.equal(palette.isReady(),true);
for(const key of Object.keys(materials)){
 assert.ok(palette.getPalette()[key].length>=3,
  key+" must have at least 3 real reference shades");
}
const pixels=new Uint8ClampedArray(12*5*4);
const variants=[
  [35,49,106], [40,123,73], [215,168,82], [213,134,82], [18,72,78]
];
for(let row=0;row<5;row++)for(let x=0;x<12;x++)
 pixels.set([...variants[row],255],(row*12+x)*4);
pixels.set([252,250,247,255],(0*12+0)*4); // eye/VFX neutral white
pixels.set([8,195,244,250],(3*12+0)*4); // Spirit Gun cyan stays cyan
pixels.set([0,0,0,0],(4*12+1)*4); // alpha remains unchanged
const raw=asset(12,5,pixels);
const before=new Uint8ClampedArray(pixels);
const colored=palette.prepare(raw);
assert.ok(colored instanceof Canvas);
assert.equal(palette.prepare(raw),colored,"converted texture is cached");
assert.equal(palette.prepare(colored),colored,"avoid recursive recoloring");
assert.ok(palette.getReport(colored)?.changed>0);
let checked=0;
for(let y=0;y<5;y++)for(let x=0;x<12;x++){
 const i=(y*12+x)*4;
 const original=[...before.slice(i,i+4)];
 const after=[...colored.pixels.slice(i,i+4)];
 assert.equal(after[3],original[3],"all alpha bytes must remain unchanged");
 const type=palette.category(original[0],original[1],original[2]);
 if(type && original[3]>=24){
  const values=palette.getPalette()[type];
  assert.ok(values.some(rgb=>rgb.every((v,k)=>v===after[k])),
    "material must use only exact canonical idle PNG RGB values: "+type);
  checked++;
 }else assert.deepEqual(after,original,"VFX/transparent pixels remain untouched");
}
assert.ok(checked>40,"test covers every costume color family");
assert.deepEqual([...colored.pixels.slice(0,4)],[252,250,247,255]);
assert.deepEqual([...colored.pixels.slice((3*12)*4,(3*12)*4+4)],
 [8,195,244,250]);
assert.equal(palette.isReady(),true);
const fallback={};vm.runInNewContext(
 fs.readFileSync("mugen-yusuke-palette-v30.js","utf8"),
 {window:fallback,Math,Map,WeakMap,Set,Uint8ClampedArray});
assert.equal(fallback.MugenYusukePaletteV30.prepare(raw),raw,
 "missing Canvas API must keep Yusuke visible");
const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-yusuke-palette-v30\.js\?v=30/);
assert.match(html,/unifiedPalette=30/);
console.log("PASS: V30 single canonical 5-material palette, exact color membership, alpha preserved, cached artwork and untouched Spirit effects");
