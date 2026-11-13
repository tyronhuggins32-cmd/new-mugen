/* Mugen Cinematic FX V6: anime impact language with bounded lifetime.
 * High-detail 16-frame sprites remain completely unobscured.
 * All components are authored as lightweight canvas vectors and strips.
 */
(function(root) {
 "use strict";
 const TAU=Math.PI*2;
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const smooth=t=>{const x=clamp(t);return x*x*(3-2*x);};
 const states=new WeakMap();
 function get(game){
   let s=states.get(game);
   if(!s){s={hits:[],flashes:[],next:0};states.set(game,s);}
   return s;
 }
 function reset(game){states.delete(game);}
 function onHit(game,attacker,defender,attack,blocked,x,y){
   if(!game || !attacker || !defender)return;
   const s=get(game),heavy=!!attack?.heavyImpact;
   const fire=attack?.projectile==="spiritGun";
   const direction=attacker.facing || 1;
   const id=s.next++;
   s.hits.push({
     x,y,dir:direction,cpu:!!attacker.cpu,blocked:!!blocked,
     heavy,spirit:fire,age:0,duration:blocked?.20:heavy?.38:.29,seed:id
   });
   if(s.hits.length>9)s.hits.shift();
 }
 function tick(game,dt){
   if(!game || game.paused)return;
   const s=get(game),d=clamp(dt,0,.06);
   for(const hit of s.hits)hit.age+=d;
   s.hits=s.hits.filter(h=>h.age<h.duration);
 }
 function drawBehind(game,ctx,time){
   const s=get(game);if(!s.hits.length)return;
   ctx.save();
   ctx.globalCompositeOperation="lighter";
   for(const hit of s.hits) {
     const t=clamp(hit.age/hit.duration),f=(1-t)*(1-t);
     const x=hit.x,y=hit.y;
     const color=hit.cpu?"#ff678a":"#52dfff";
     // Exaggerated anime speed streaks build depth behind the contact.
     ctx.strokeStyle=color;
     ctx.lineCap="round";
     for(let i=0;i<9;i++){
       const angle=(i-4)*.20+.06*Math.sin(hit.seed+i*14.4);
       const length=(32+i%4*11)*(hit.heavy?2:1.35)*(1-smooth(t));
       const offset=10+i%3*17;
       ctx.globalAlpha=.19*f;
       ctx.lineWidth=1+i%3;
       ctx.beginPath();
       ctx.moveTo(x-hit.dir*(offset+length),y+Math.sin(angle)*offset*2);
       ctx.lineTo(x-hit.dir*offset,y+Math.sin(angle)*(offset+length)*1.9);
       ctx.stroke();
     }
   }
   ctx.restore();
 }
 function drawFront(game,ctx,time){
   const s=get(game);if(!s.hits.length)return;
   ctx.save();ctx.globalCompositeOperation="lighter";
   for(const hit of s.hits){
     const t=clamp(hit.age/hit.duration),fade=(1-t)**1.8;
     const size=(hit.heavy?86:56)*(.44+.86*smooth(t));
     const cyan=hit.cpu?"#ff7c9d":"#47d9ff";
     const white="#f4ffff";
     ctx.save();ctx.translate(hit.x,hit.y);ctx.scale(hit.dir,1);
     // White hot 1-3 frame spearhead and crisp cyan cutting arc.
     ctx.globalAlpha=Math.min(1,fade*1.3);
     ctx.fillStyle=white;
     ctx.beginPath();
     ctx.moveTo(size*.76,0);
     ctx.lineTo(-size*.35,-size*.19);
     ctx.lineTo(-size*.18,0);
     ctx.lineTo(-size*.35,size*.19);
     ctx.closePath();ctx.fill();
     ctx.strokeStyle=cyan;ctx.lineWidth=hit.heavy?5.2:3;
     ctx.beginPath();
     ctx.arc(-size*.08,0,size*.55,-1.06,1.06);
     ctx.stroke();
     ctx.strokeStyle=white;ctx.lineWidth=1.5;
     ctx.beginPath();ctx.arc(-size*.08,0,size*.7,-.65,.65);ctx.stroke();
     for(let i=0;i<(hit.heavy?14:10);i++){
       const theta=(i/(hit.heavy?14:10))*TAU+hit.seed*.21;
       const radius=(size*.36)*(1+t);
       const sparkLength=(16+i%5*11)*(1-t);
       const xx=Math.cos(theta)*radius, yy=Math.sin(theta)*radius*.78;
       ctx.globalAlpha=fade*(i%3===0?1:.58);
       ctx.strokeStyle=i%4===0?white:cyan;
       ctx.lineWidth=i%4===0?3:1.2;
       ctx.beginPath();
       ctx.moveTo(xx,yy);
       ctx.lineTo(xx+Math.cos(theta)*sparkLength,yy+Math.sin(theta)*sparkLength);
       ctx.stroke();
     }
     if(hit.heavy && t<.64){
       ctx.globalAlpha=fade*.72;
       ctx.strokeStyle=cyan;ctx.lineWidth=(3+2*(1-t));
       ctx.beginPath();
       ctx.ellipse(0,0,size*(.92+t*.44),size*(.37+t*.22),-.14,0,TAU);
       ctx.stroke();
     }
     ctx.restore();
   }
   ctx.restore();
 }
 root.MugenCinematicFX=Object.freeze({
   reset,onHit,tick,drawBehind,drawFront,
   stats(game){return {activeHits:get(game).hits.length};}
 });
})(typeof window==="undefined"?globalThis:window);
