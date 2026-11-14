"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const filename="characters/yusuke/yusuke-reference-exact-v15.png";
const png=fs.readFileSync(filename);
assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a",
  "user-supplied reference must be stored as a real transparent PNG");
assert.equal(png.readUInt32BE(16),1536);
assert.equal(png.readUInt32BE(20),1024);
assert.equal(png[25],6,"exact reference source must be RGBA, never JPEG-white");
assert.ok(png.length>350000,"must not ship low-quality thumbnails or empty placeholder art");
const original=fs.readFileSync("characters/yusuke/yusuke-reference-source-v15.jpg");
assert.equal(original.subarray(0,2).toString("hex"),"ffd8",
  "retain supplied reference as source evidence");

const src=fs.readFileSync("yusuke-exact-reference-v15.js","utf8");
const root={};vm.runInNewContext(src,{window:root,Math});
const sprite=root.MugenExactYusuke;
assert.ok(sprite);
assert.equal(sprite.frames.length,16);
assert.equal(sprite.maximumHeight,208);
const tex={naturalWidth:1536,naturalHeight:1024};
const atlas=sprite.build(tex);
assert.ok(atlas && atlas.image===tex && atlas.frameCount===16);
assert.equal(sprite.build({naturalWidth:512,naturalHeight:512}),null);
for(const [i,f] of sprite.frames.entries()){
 const x=Math.floor(i%4)*384,y=Math.floor(i/4)*256;
 assert.ok(f.x>=x && f.x+f.w<=x+384,
   "source crop "+i+" must remain in the correct image column");
 assert.ok(f.y>=y && f.y+f.h<=y+256,
   "source crop "+i+" must remain in its image row");
 assert.ok(f.ax>=0 && f.ax<=f.w,"foot pivot must stay inside image");
 assert.ok(f.h>210&&f.h<=256);
}
const actor={x:500,y:600,facing:1,grounded:true,vx:0,vy:0,stateTime:0,
 state:"idle",hitstun:0,hitReaction:"stagger",
 currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}};
const choose=(state,progress=0,duration=.4)=>{
 actor.state=state;actor.stateTime=duration*progress;
 return sprite.pose(actor,atlas,duration);
};
const stateMap={
 idle:"idle",walk:"forward",block:"guard",crouch:"crouch",
 charge:"charge",hit:"stagger",jump:"jumpRise",
 knockdown:"knockdown"
};
for(const [state,expected] of Object.entries(stateMap)){
 actor.grounded=state!=="jump";
 if(state==="jump")actor.vy=-210;
 actor.vx=state==="walk"?170:0;
 const chosen=choose(state,.45);
 assert.equal(chosen.clip,expected,state+" must use uploaded reference art");
 assert.equal(chosen.image,tex);
 assert.ok(chosen.frame.h*chosen.scale<=208.01,
  "giant Yusuke must not appear on "+state);
}
actor.grounded=true;actor.vy=0;actor.vx=0;
for(const [attack,seq] of Object.entries(sprite.attackClips)){
 const positions=Array.from(seq);
 assert.ok(positions.length>=4,"each Yusuke attack must use matching reference cels");
 for(const i of positions)assert.ok(i>=0&&i<16);
 for(const p of [.08,.27,.51,.88]){
  const selected=choose("attack-"+attack,p,1);
  assert.equal(selected.image,tex,attack+" still draws the exact character");
  assert.equal(selected.clip,attack);
  assert.ok(selected.frame.h*selected.scale<=208.01,
   attack+" should not grow larger during combos");
 }
}
for(const [name,expected] of [
 ["light",[0,1,2,3]],["cross",[4,5,6,7]],
 ["body",[8,9,10,11]],["upper",[12,13,14,15]]
]){
 assert.deepEqual(Array.from(sprite.attackClips[name]),expected,
   name+" follows the exact four-row user reference poses");
}
const calls=[];
const ctx={
 save(){calls.push(["save"])},restore(){calls.push(["restore"])},
 translate(x,y){calls.push(["translate",x,y])},
 scale(x,y){calls.push(["scale",x,y])},rotate(a){calls.push(["rotate",a])},
 drawImage(...args){calls.push(["drawImage",...args])},
 imageSmoothingEnabled:false,imageSmoothingQuality:"low"
};
actor.state="hit";actor.stateTime=.05;actor.hitReaction="knockback";
assert.equal(sprite.draw(actor,ctx,120,.4,atlas),true);
assert.equal(calls.filter(c=>c[0]==="drawImage").length,1,
  "damage must draw exactly ONE fighter, never giant duplicates or ghosts");
assert.equal(calls.find(c=>c[0]==="drawImage")[1],tex);
assert.ok(calls.find(c=>c[0]==="drawImage")[9]<=208,
 "draw call height is bounded even for knockback");
actor.state="attack-rapidBarrage";actor.stateTime=.6;
calls.length=0;sprite.draw(actor,ctx,200,.8,atlas,1);
assert.equal(calls.filter(c=>c[0]==="drawImage").length,1,
 "combos must not overlay another Yusuke sprite");
assert.equal(calls[0][0],"save");
assert.equal(calls[calls.length-1][0],"restore");
const html=fs.readFileSync("game-build-0009.html","utf8");
const render=html.indexOf("drawYusukeSprite(context, time, alpha = 1");
const exact=html.indexOf("MugenExactYusuke?.draw",render);
const legacy=html.indexOf("const premiumPose =",render);
assert.ok(render>0 && exact>render && exact<legacy,
  "reference rendering must be ahead of ALL legacy animation paths");
assert.match(html,/yusuke-exact-reference-v15\.js\?v=21/);
assert.match(html,/characters\/yusuke\/yusuke-reference-exact-v15\.png/);
assert.match(html,/exactYusukeAtlas = window\.MugenExactYusuke\?\.build/);
const studio=fs.readFileSync("yusuke-sprite-studio.html","utf8");
assert.match(studio,/yusuke-exact-sprite-studio-v15\.html/);
const exactStudio=fs.readFileSync("yusuke-exact-sprite-studio-v15.html","utf8");
assert.match(exactStudio,/Download all 16 transparent poses/);
assert.match(exactStudio,/yusuke-exact-reference-v15-frames\.json/);
console.log("PASS: 16 actual uploaded user-reference cels across ALL Yusuke move, hurt and special states; bounded full-body render, no old sprites.");
