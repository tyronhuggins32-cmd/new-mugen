"use strict";
// New Mugen premium art + wide-rooftop regression checks.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const vm=require("node:vm");

const data=JSON.parse(fs.readFileSync("characters/yusuke/premium-atlas.json","utf8"));
const fakeWindow={};
vm.runInNewContext(fs.readFileSync("yusuke-premium-v6.js","utf8"),{window:fakeWindow});
const premium=fakeWindow.MugenPremium;
premium.validate(data);
assert.equal(data.combat.scale,data.movement.scale);
assert.equal(data.combat.scale,.5);
for(const [name,expectedHash] of [
  ["combat","a361f1196c3827ff2ba81271df67d454e58bdfa1990e57829d8230b6728475bd"],
  ["movement","912feb7bcf7af6908ea0d61e5b617e9b18e0485492dc983fc0775f0ade15da93"]
]){
 const sheet=data[name];
 const buffer=fs.readFileSync(sheet.src);
 assert.equal(crypto.createHash("sha256").update(buffer).digest("hex"),expectedHash);
 assert.equal(buffer.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 assert.equal(buffer.readUInt32BE(16),2048);
 assert.equal(buffer.readUInt32BE(20),1024);
 assert.equal(buffer[25],6,"premium art must support transparency");
 assert.equal(sheet.frames.length,8);
 for(const [i,f] of sheet.frames.entries()) {
   assert.ok(f.x>=0&&f.y>=0&&f.w>0&&f.h>0);
   assert.ok(f.x+f.w<=sheet.width&&f.y+f.h<=sheet.height);
   assert.ok(f.ax>=0&&f.ax<=f.w);
   assert.ok(f.h*.5>145&&f.h*.5<230,
     "sprite "+name+":"+i+" must remain on one plausible visual scale");
 }
}
const images={combat:{naturalWidth:2048},movement:{naturalWidth:2048}};
const fighter={state:"idle",grounded:true,vy:0,vx:0,stateTime:0,dashTimer:0};
function check(state,attack,part,index,p=.5) {
  fighter.state=state;
  const result=premium.choosePose(fighter,attack,data,images,p);
  assert.equal(result.part,part);
  assert.equal(result.index,index);
  assert.equal(result.scale,.5);
}
check("idle",null,"movement",0);
check("attack-light","light","combat",1);
check("attack-cross","cross","combat",2);
check("attack-body","body","combat",3);
check("attack-upper","upper","combat",4);
check("attack-gun","gun","combat",6);
check("attack-shotgun","shotgun","combat",2);
check("attack-powerKick","powerKick","combat",7);
check("hit",null,"combat",5);
fighter.state="walk";fighter.stateTime=.2;
assert.equal(premium.choosePose(fighter,null,data,images).part,"movement");
fighter.state="jump";fighter.grounded=false;fighter.vy=-300;
assert.equal(premium.choosePose(fighter,null,data,images).index,5);
fighter.vy=300;
assert.equal(premium.choosePose(fighter,null,data,images).index,6);
assert.equal(premium.choosePose(fighter,"gun",data,{combat:null,movement:null}),null,
  "failed atlas load must retain old animation fallback");

let created=0,draws=0,renderedWidths=[];
const gradient={addColorStop(){}};
function ctx() {
 const inner={
   canvas:{width:1280,height:720},save(){},restore(){},
   beginPath(){},fill(){},stroke(){},moveTo(){},lineTo(){},arc(){},
   fillRect(){},clearRect(){},createLinearGradient(){return gradient;},
   createRadialGradient(){return gradient;},
   drawImage(...args){draws++;renderedWidths.push(args[3]);}
 };
 return new Proxy(inner,{
   get(obj,key){return key in obj?obj[key]:()=>{};},
   set(obj,key,value){obj[key]=value;return true;}
 });
}
const doc={createElement(tag){
 assert.equal(tag,"canvas");created++;
 const c=ctx();return {width:0,height:0,getContext(){return c;}};
}};
const root={MugenFluid:{getStats(){return {cameraX:1300};}}};
const stageScope={window:root,document:doc,Math};
vm.runInNewContext(fs.readFileSync("mugen-rooftop-v6.js","utf8"),stageScope);
const rooftop=root.MugenRooftop;
const stage={width:2600,height:720,viewportWidth:1280,floor:600,left:68,right:2532};
assert.equal(rooftop.render(ctx(),1500,stage,{canvas:{width:1280}}),true);
assert.equal(rooftop.render(ctx(),1520,stage,{canvas:{width:1280}}),true);
assert.equal(created,1,"building/city texture is cached, not repainted each frame");
assert.equal(draws,2,"roof stage renders once per game frame");
assert.ok(renderedWidths.every(w=>w<=1520),"only visible camera segment is blitted");

const html=fs.readFileSync("game-build-0009.html","utf8");
assert.match(html,/mugen-rooftop-v6\.js\?v=1/);
assert.match(html,/yusuke-premium-v6\.js\?v=1/);
assert.match(html,/width: 2600/);
assert.match(html,/premiumArt = metadata/);
assert.match(html,/premiumReady = true/);
assert.match(html,/MugenPremium\?\.choosePose\(/);
assert.match(html,/MugenRooftop\.render\(context, time, arena, this\)/);
assert.match(html,/x: arena\.width \/ 2 - 300/);
assert.match(html,/x: arena\.width \/ 2 \+ 300/);
const fluid=fs.readFileSync("mugen-fluid-v3.js","utf8");
assert.match(fluid,/arena\.viewportWidth \|\| arena\.width/);
assert.match(fluid,/firstFrame \? targetX/);

console.log("PASS: 16 high-detail art cels, equal render scale, transparent PNGs, action mappings and 2600px cached stage.");
