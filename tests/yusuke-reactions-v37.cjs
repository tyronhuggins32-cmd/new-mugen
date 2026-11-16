"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const assets={
 stagger:["characters/yusuke/yusuke_hurt_stagger_v37_8frames.png",1774,887,8],
 knockback:["characters/yusuke/yusuke_knockback_v37_8frames_raw.png",1774,887,8],
 knockdown:["characters/yusuke/yusuke_knockdown_v37_10frames.png",1983,793,10]
};
for(const [kind,[path,w,h]] of Object.entries(assets)){
 const buffer=fs.readFileSync(path);
 assert.equal(buffer.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 assert.equal(buffer.readUInt32BE(16),w,kind+" width");
 assert.equal(buffer.readUInt32BE(20),h,kind+" height");
 assert.equal(buffer[25],6,kind+" true RGBA");
 assert.ok(buffer.length>300000,kind+" has real authored pixels");
}
let readbacks=0,repaint=0;
let cleaned=null;
const canvas={
 width:0,height:0,getContext(){
  const cv=this;
  return {imageSmoothingEnabled:true,drawImage(){},
    getImageData(){
      readbacks++;
      const w=cv.width,h=cv.height;
      const pixels=new Uint8ClampedArray(w*h*4);
      // Mimic the knockback source's opaque near-white background and
      // a dark, fully opaque fighter in the middle of the canvas.
      for(let i=0;i<w*h;i++){
        const o=i*4;
        pixels[o]=239;pixels[o+1]=240;pixels[o+2]=239;pixels[o+3]=232;
      }
      for(let y=140;y<300;y++)for(let x=120;x<300;x++){
        const o=(y*w+x)*4;
        pixels[o]=26;pixels[o+1]=49;pixels[o+2]=91;pixels[o+3]=255;
      }
      return {data:pixels};
    },
    putImageData(pixels){repaint++;cleaned=pixels.data;}
  };
 }
};
class Img{
 set src(url){
  this._src=url;
  if(url.includes("knockback_v37")){this.naturalWidth=1774;this.naturalHeight=887;}
  else if(url.includes("knockdown_v37")){this.naturalWidth=1983;this.naturalHeight=793;}
  else if(url.includes("hurt_stagger_v37")){this.naturalWidth=1774;this.naturalHeight=887;}
  else {this.naturalWidth=1536;this.naturalHeight=512;}
  this.onload?.();
 }
 get src(){return this._src;}
}
const root={Image:Img,document:{createElement(){
 return canvas;
}}};
vm.runInNewContext(fs.readFileSync("mugen-yusuke-reactions-v37.js","utf8"),
 {window:root,Promise,Map,Uint8Array,Int32Array,Math});
(async()=>{
 const plugin=root.MugenYusukeReactionV37;
 assert.ok(plugin);
 assert.equal(await plugin.preload(),true,"all 3 reaction atlases ready");
 for(const [kind,[,w,h,count]] of Object.entries(assets)){
  assert.equal(plugin.ready(kind),true,kind+" ready");
  assert.equal(plugin.frameCount(kind),count);
 }
 assert.equal(readbacks,1,"opaque knockback background cleaned exactly once");
 assert.equal(repaint,1);
 const idx=(y,x)=>(y*1774+x)*4+3;
 assert.equal(cleaned[idx(0,0)],0,"background border must be transparent");
 assert.equal(cleaned[idx(220,220)],255,"fighter body stays solid");
 let primed=0;
 root.MugenYusukePaletteV30={prepare(image){primed++;return image;}};
 plugin.primePalette();
 assert.equal(primed,3,"match each reaction family to the idle palette");
 const fighter={state:"hit",stateTime:0,hitstun:.48,hitReaction:"stagger",
  _reactionDuration:.48,facing:1};
 for(const kind of ["stagger","knockback","knockdown"]){
  const count=assets[kind][3];
  fighter.hitReaction=kind;
  fighter._reactionDuration=.48;
  const visited=new Set();
  for(let i=0;i<count;i++){
   fighter.stateTime=(i+.2)*.48/count;
   const pose=plugin.pose(fighter,kind);
   assert.equal(pose.source,"reaction-v37");
   assert.equal(pose.index,i);
   assert.equal(pose.frameCount,count);
   const w=kind==="knockdown"?1983:1774,h=kind==="knockdown"?793:887;
   assert.ok(pose.frame.x>=0&&pose.frame.x+pose.frame.w<=w);
   assert.ok(pose.frame.y>=0&&pose.frame.y+pose.frame.h<=h);
   assert.ok(pose.scale>=.44&&pose.scale<=.55);
   visited.add(i);
  }
  assert.equal(visited.size,count,kind+" every frame reachable");
 }
 fighter.hitReaction="knockdown";
 assert.equal(plugin.pose(fighter,"recovery").index,9,
  "get-up returns to final frame of the new knockdown sheet");
 fighter.hitReaction="stagger";
 assert.equal(plugin.pose(fighter,"recovery").index,7);
 assert.equal(plugin.pose(fighter,"guard"),null);
 const renderer=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
 assert.match(renderer,/MugenYusukeReactionV37\?\.pose\(fighter,clip\)/);
 const html=fs.readFileSync("game-build-0009.html","utf8");
 assert.match(html,/mugen-yusuke-reactions-v37\.js\?v=37/);
 assert.match(html,/hitReactions=37/);
 const cfg=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
 for(const [name,min] of [["light",.28],["cross",.33],["body",.36],
   ["upper",.51],["heavy",.46]]){
  const a=cfg.combat.attacks[name];
  assert.equal(a.duration,min,"retimed "+name);
  assert.ok(a.activeStart>0&&a.activeStart<a.activeEnd&&a.activeEnd<a.duration);
 }
 assert.ok(cfg.combat.effects.hitStop.heavy>=.09);
 console.log("PASS: 26 authored hit/flight/knockdown poses; true knockback alpha; full sprite grid; preloaded palettes; slower combat.");
})().catch(e=>{console.error(e);process.exitCode=1;});
