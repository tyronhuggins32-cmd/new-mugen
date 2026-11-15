"use strict";
/* Regressions for the 2026-11-14 screen recording:
 * green/navy costume flashes, oversized hit frames and overlapping bodies.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const w=1536,h=1024,pixels=new Uint8ClampedArray(w*h*4);
function mark(x,y,rgba){
  pixels.set(rgba,(y*w+x)*4);
}
function sample(x,y){return Array.from(pixels.slice((y*w+x)*4,(y*w+x)*4+4));}
mark(160,174,[25,95,45,255]); // original green trouser
mark(160,70,[20,100,48,255]); // wristband above waist
mark(150,233,[240,239,235,255]); // white shoe
mark(20,30,[255,255,255,255]); // white eye
mark(250,174,[31,45,88,255]); // already navy
mark(165,175,[25,95,45,35]); // antialiased near-transparent pixel
const before={
  wrist:sample(160,70),eye:sample(20,30),
  navy:sample(250,174),edge:sample(165,175)
};
let reads=0,writes=0,draws=0;
const canvas={width:w,height:h,getContext(){
  return {imageSmoothingEnabled:true,drawImage(){draws++;},
    getImageData(){reads++;return {data:pixels};},
    putImageData(){writes++;}};
}};
const root={document:{createElement(type){
  assert.equal(type,"canvas");return canvas;
}}};
vm.runInNewContext(fs.readFileSync("mugen-yusuke-legacy-fix-v27.js","utf8"),
  {window:root,Math,WeakMap,Uint8ClampedArray});
const fixer=root.MugenLegacyYusukeV27;
const source={naturalWidth:w,naturalHeight:h};
const corrected=fixer.prepare(source);
assert.equal(corrected,canvas,"16-frame fallback must use normalized texture");
assert.equal(fixer.prepare(source),canvas,"same source must reuse cached correction");
assert.equal(reads,1,"palette conversion runs once, never each animation frame");
assert.equal(writes,1);
assert.equal(draws,1);
const pants=sample(160,174);
assert.ok(pants[2]>pants[1] && pants[1]>pants[0],
  "green trousers must become navy with blue as the dominant channel");
assert.ok(pants[2]>75 && pants[2]<150,"preserve shaded navy detail");
const shoes=sample(150,233);
assert.ok(shoes[0]<60 && shoes[1]<60 && shoes[2]<80,
  "white footwear must match the newer dark shoes");
assert.deepEqual(sample(160,70),before.wrist,"green wristbands stay green");
assert.deepEqual(sample(20,30),before.eye,"white eye glints remain white");
assert.deepEqual(sample(250,174),before.navy,"already navy pixels are unchanged");
assert.deepEqual(sample(165,175),before.edge,"transparent edge colors and alpha are preserved");
const fallback={};vm.runInNewContext(
  fs.readFileSync("mugen-yusuke-legacy-fix-v27.js","utf8"),
  {window:fallback,Math,WeakMap,Uint8ClampedArray});
assert.equal(fallback.MugenLegacyYusukeV27.prepare(source),source,
  "missing canvas cannot make Yusuke invisible");

vm.runInNewContext(fs.readFileSync("yusuke-exact-reference-v15.js","utf8"),
  {window:root,Math});
const renderer=root.MugenExactYusuke;
const atlas=renderer.build(source);
assert.equal(atlas.image,canvas,"all old hit and special poses use normalized colors");
const fighter={x:500,y:600,facing:1,vx:0,vy:0,grounded:true,
  dashTimer:0,hitstun:0,hitReaction:"stagger",state:"hit",stateTime:.06,
  currentAttack(){return this.state.startsWith("attack-")?this.state.slice(7):null;}};
for(const state of ["hit","attack-upper","attack-gun","charge"]){
  fighter.state=state;
  const pose=renderer.pose(fighter,atlas,.34);
  assert.equal(pose.image,canvas,state+" must use the normalized fallback");
  assert.ok(pose.frame.h*pose.scale<=190.01,
    state+" must not grow larger than the movement sprite");
}
const calls=[],ctx={imageSmoothingEnabled:true,save(){},restore(){},
  translate(){},scale(){},rotate(){},drawImage(...args){calls.push(args);}};
assert.equal(renderer.draw(fighter,ctx,0,1,atlas,.34),true);
assert.equal(calls.length,1,"one body, no double-render ghosts");
assert.equal(ctx.imageSmoothingEnabled,false,"pixel art must stay crisp");

const geometryRoot={};
vm.runInNewContext(fs.readFileSync("mugen-combat-v5.js","utf8"),
  {window:geometryRoot,Math,Set});
const geo=geometryRoot.MugenCombatV5;
const config=JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json","utf8"));
assert.equal(geo.MIN_SPACING,168);
assert.equal(config.combat.spacing,168);
const arena={left:68,right:1212,floor:600};
function actor(x,width=84){
  return {x,y:600,width,height:194,vx:0,facing:1,state:"idle",
    grounded:true,get hurtbox(){return geo.hurtbox(this);}};
}
let a=actor(500),b=actor(520,76);
assert.equal(geo.separate(a,b,arena),true);
assert.ok(b.x-a.x>=168-1e-6,"standing sprites cannot clip together");
a=actor(68);b=actor(80,76);
geo.separate(a,b,arena);
assert.equal(a.x,68,"corner remains solid");
assert.ok(b.x-a.x>=168-1e-6,"no corner body overlap");
const attacker=actor(500),defender=actor(668,76);
for(const type of ["light","body","upper"]){
  const hitbox=geo.attackHitbox(attacker,config.combat.attacks[type],type);
  const hurt=defender.hurtbox;
  assert.ok(hitbox.x<hurt.x+hurt.width && hitbox.x+hitbox.width>hurt.x &&
    hitbox.y<hurt.y+hurt.height && hitbox.y+hitbox.height>hurt.y,
    type+" must still connect at the new neutral spacing");
}
const jumper=actor(500);jumper.y=290;jumper.grounded=false;
assert.equal(geo.separate(jumper,defender,arena),false,
  "air crossovers still work");
const html=fs.readFileSync("game-build-0009.html","utf8");
const first=html.indexOf('src="mugen-yusuke-legacy-fix-v27.js?v=27"');
const second=html.indexOf('src="yusuke-exact-reference-v15.js');
assert.ok(first>0 && second>first,
  "normalizer must load before exact reference renderer");
assert.match(html,/legacyFix=27/,"renderer must be cache-busted for mobile");
console.log("PASS: video V27 fixes for navy costume, shoe colors, body scale, clean alpha, pushbox, punches and air crossovers");
