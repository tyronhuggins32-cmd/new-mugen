const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"game-build-0009.html"),"utf8");
const visualCode=fs.readFileSync(path.join(root,"mugen-visuals-v2.js"),"utf8");
new vm.Script(visualCode);
for(const [,script] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))
  if(script.trim()) new vm.Script(script);

const stats={stageCreates:0,drawImages:0};
const gradient=()=>({addColorStop(){}});
const context=()=>new Proxy({
  canvas:{width:1280,height:720},
  createLinearGradient:gradient, createRadialGradient:gradient,
  drawImage(){stats.drawImages++}
},{
  get(obj,key){return key in obj?obj[key]:()=>{};},
  set(obj,key,val){obj[key]=val;return true;}
});
const fakeCanvas=()=>({width:0,height:0,getContext:()=>context()});
const sandbox={
  window:{},document:{createElement(tag){if(tag==="canvas"){stats.stageCreates++;return fakeCanvas()}throw Error("Unexpected element "+tag)}}
};
vm.runInNewContext(visualCode,sandbox);
const visual=sandbox.window.MugenVisuals;
assert.ok(visual?.drawArena,"visual module must export drawing functions");
assert.ok(visual?.drawProjectileFX,"smooth projectile renderer must exist");
const canvas=context();
const arena={width:1280,height:720,floor:600};
visual.drawArena(canvas,1000,arena);
visual.drawArena(canvas,1016,arena);
assert.equal(stats.stageCreates,1,"stage should be cached across frames");

const tween=visual.animBlend({fps:12,frames:[0,1,2,3],loop:true},.075,0);
assert.ok(tween.mix>0 && tween.mix<1 && tween.to===1,"sprite frames must cross-fade");
assert.equal(visual.animBlend({frames:[0,1],fps:12,loop:false},.5,0).mix,0);
const at=visual.poseTransform({
  cpu:false,state:"walk",stateTime:.14,grounded:true,vx:430,
  facing:1,currentAttack:()=>null
},1000);
assert.ok(at.stretchY>1 && at.tilt>0,"running pose must have interpolated lean");

const player={cpu:false,x:250,y:600,energy:100,comboHits:3,prevX:230,prevY:600,
  vx:510,dashTimer:.2,facing:1,state:"walk",stateTime:.2,grounded:true,
  currentAttack:()=>null};
const cpu={cpu:true,x:700,y:600,energy:50,comboHits:0,prevX:700,prevY:600,
  vx:0,dashTimer:0,facing:-1,state:"idle",stateTime:.3,grounded:true,
  currentAttack:()=>null};
const game={state:"play",player,cpu,visualHits:[],visualEchoes:[]};
visual.onHit(game,player,cpu,45,false,true,620,440);
assert.equal(game.visualHits.length,1);
visual.tick(game,.055);
assert.ok(game.visualEchoes.some(e=>e.fighter===player),"fast movements create afterimages");
assert.ok(game.visualHits[0].life<game.visualHits[0].maxLife);
visual.drawHits(game,canvas,1100);
visual.drawCharge({...player,state:"charge"},canvas,1200);
visual.drawProjectileFX(canvas,{owner:player,kind:"spiritGun",radius:16,age:.2,vx:920,vy:0},400,300,1234);
assert.ok(stats.drawImages>=2,"cached stage must be drawn every frame");

assert.ok(html.includes("this.renderAlpha = this.paused ? 1"),"render interpolation must be used");
assert.ok(html.includes("this.cpu.draw(context, time, this.renderAlpha"),"CPU must use interpolated sprites");
assert.ok(html.includes("window.MugenVisuals.drawProjectileFX"),"engine should route projectiles to v2");
assert.ok(html.includes("mugen-visuals-v2.js?v=2"),"visual pipeline must load before main engine");
const css=fs.readFileSync(path.join(root,"arcade-layout.css"),"utf8");
assert.ok(css.includes("transform: rotate(90deg)"),"portrait fighter should rotate rather than shrink");
assert.ok(css.includes(".touch-controls { display: none !important; }"),"fight screen should have no touch buttons");
console.log("PASS: v2 sprite interpolation, CPU rendering hookup, cached skyline, motion echo, hit FX, projectile FX and portrait layout.");
