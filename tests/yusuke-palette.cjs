"use strict";
// Numeric art-direction gate: prevent sprite packs with differently colored
// skin, shirt, trousers or wristbands from entering the playable roster.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const zlib = require("node:zlib");
const path = require("node:path");

function pixels(filename) {
  const png = fs.readFileSync(filename);
  assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  let cursor=8, width=0, height=0, depth=0, type=0;
  const blocks=[];
  while (cursor+12<=png.length) {
    const len=png.readUInt32BE(cursor), tag=png.toString("ascii",cursor+4,cursor+8);
    if(tag==="IHDR") {
      width=png.readUInt32BE(cursor+8);height=png.readUInt32BE(cursor+12);
      depth=png[cursor+16];type=png[cursor+17];
    }
    if(tag==="IDAT")blocks.push(png.subarray(cursor+8,cursor+8+len));
    cursor+=len+12;
    if(tag==="IEND")break;
  }
  assert.equal(depth,8,"sprite sheets must use 8-bit channels");
  const bpp=type===6?4:type===2?3:0;
  assert.ok(bpp,"sprite sheets must use RGB or RGBA PNG");
  const inflated=zlib.inflateSync(Buffer.concat(blocks));
  const stride=width*bpp, out=Buffer.alloc(stride*height);
  let i=0, prior=Buffer.alloc(stride);
  for(let y=0;y<height;y++) {
    const filter=inflated[i++], row=Buffer.alloc(stride);
    for(let x=0;x<stride;x++) {
      const raw=inflated[i++], left=x>=bpp?row[x-bpp]:0;
      const up=prior[x], corner=x>=bpp?prior[x-bpp]:0;
      let predictor=0;
      if(filter===1)predictor=left;
      else if(filter===2)predictor=up;
      else if(filter===3)predictor=Math.floor((left+up)/2);
      else if(filter===4) {
        const p=left+up-corner;
        const da=Math.abs(p-left),db=Math.abs(p-up),dc=Math.abs(p-corner);
        predictor=da<=db&&da<=dc?left:db<=dc?up:corner;
      } else assert.equal(filter,0,"unknown PNG scanline filter");
      row[x]=(raw+predictor)&255;
    }
    row.copy(out,y*stride);prior=row;
  }
  return {pixels:out,bpp};
}
function med(hist,count) {
  let sum=0;
  for(let i=0;i<256;i++) {sum+=hist[i];if(sum>count/2)return i;}
  return 255;
}
function palette(filename) {
  const {pixels:buf,bpp}=pixels(filename);
  const hist={};
  for(const n of ["shirt","skin","pants","wrist"]) {
    hist[n]={n:0,h:new Uint32Array(256),s:new Uint32Array(256),v:new Uint32Array(256)};
  }
  for(let i=0;i<buf.length;i+=bpp*3) {
    if(bpp===4&&buf[i+3]<128)continue;
    const r=buf[i]/255,g=buf[i+1]/255,b=buf[i+2]/255;
    const hi=Math.max(r,g,b),lo=Math.min(r,g,b),diff=hi-lo;
    const sat=hi===0?0:diff/hi;
    let h=0;
    if(diff>0) {
      if(hi===r)h=(((g-b)/diff)%6)/6;
      else if(hi===g)h=((b-r)/diff+2)/6;
      else h=((r-g)/diff+4)/6;
    }
    if(h<0)h++;
    let material=null;
    if(h>.065&&h<.19&&sat>.25&&hi>.27)material="shirt";
    if(h>.022&&h<.091&&sat>.2&&hi>.30)material="skin";
    if(h>.52&&h<.79&&sat>.17&&hi>.08)material="pants";
    if(h>.29&&h<.59&&sat>.2&&hi>.09)material="wrist";
    if(!material)continue;
    const st=hist[material];
    st.n++;st.h[Math.round(h*255)]++;st.s[Math.round(sat*255)]++;st.v[Math.round(hi*255)]++;
  }
  const stats={};
  for(const [k,h] of Object.entries(hist)) {
    assert.ok(h.n>100,`No usable ${k} pixels in ${filename}`);
    stats[k]=[med(h.h,h.n),med(h.s,h.n),med(h.v,h.n)];
  }
  return stats;
}

const config=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
const master=palette(config.spriteSheet.src);
const gun=palette(config.effectSheets.spiritGun.src);
const combat=palette(config.combatSpriteSheet.src);
const threshold={shirt:[12,36,36],skin:[12,36,36],pants:[15,32,36],wrist:[24,38,38]};
for(const [material,limit] of Object.entries(threshold)) {
  for(const [name,observed] of [["Spirit Gun",gun],["combat",combat]]) {
    for(let c=0;c<3;c++){
      const delta=Math.abs(master[material][c]-observed[material][c]);
      assert.ok(delta<=limit[c],
        `${name} ${material} palette channel ${c} drifted ${delta} units from master`);
    }
  }
}
console.log("All Yusuke sprite sheets share compatible body/clothing palettes.");
console.log(JSON.stringify({master,gun,combat}));
