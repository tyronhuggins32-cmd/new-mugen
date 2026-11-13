/* Cinematic finisher for Gumball: Reality Break. */
(function(root){
 "use strict";
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function begin(game){
   const f=game?.player;
   if(!f||f.cpu||game.state!=="play"||game.paused||game.superSequence||f.energy<100||!f.grounded||f.hitstun>0||f.currentAttack())return false;
   f.energy=0;f.vx=0;f.vy=0;f.setState("attack-realityBreak");
   game.superSequence={kind:"gumball-reality-break",t:0,strikes:0,connected:false};
   game.hitStop=Math.max(game.hitStop,.055);game.shake=16;
   game.addSpiritBurst(f.x,f.y-140,"#72ddff",f.facing,1.6,"impact");
   return true;
 }
 function update(game,dt){
   const scene=game.superSequence;if(!scene||scene.kind!=="gumball-reality-break")return;
   scene.t+=dt;
   const hero=game.player,enemy=game.cpu;
   // 5-beat cinematic. Every strike has a real guard check and damage reaction.
   const beats=[1.12,1.38,1.66,1.94,2.22];
   while(scene.strikes<beats.length&&scene.t>=beats[scene.strikes]){
     const beat=scene.strikes++;
     const dx=enemy.x-hero.x,range=360+beat*18;
     const blocked=enemy.state==="block"&&enemy.facing===-hero.facing&&Math.abs(dx)<range;
     if(Math.abs(dx)<range){
       const amount=blocked?34:82+beat*9;
       enemy.health=Math.max(0,enemy.health-amount);
       enemy.hitstun=blocked?.15:.55;
       enemy.setState(blocked?"block":"hit");
       enemy.vx=hero.facing*(blocked?180:760+beat*48);
       if(!blocked)enemy.vy=-210-beat*22;
       game.addImpact(enemy.x,enemy.y-112,blocked?"#eaffff":"#77e5ff",38);
       game.addSpiritBurst(enemy.x,enemy.y-118,"#77e5ff",hero.facing,1.4,"impact");
       game.hitStop=.065;game.shake=18;
     }
     hero.setState("attack-realityBreak");
   }
   if(scene.t>=2.85){
     game.superSequence=null;
     hero.setState("idle");
     hero.invulnerability=.18;
     game.shake=Math.max(game.shake,9);
   }
 }
 function render(game,ctx,time){
   const s=game.superSequence;if(!s||s.kind!=="gumball-reality-break")return;
   const p=clamp(s.t/2.85,0,1),x=game.player.x;
   ctx.save();ctx.globalCompositeOperation="lighter";
   ctx.fillStyle="rgba(5,10,28,"+(.1+.22*Math.sin(p*Math.PI))+")";ctx.fillRect(0,0,arena.width,arena.height);
   const radius=70+Math.sin(p*Math.PI)*280;
   const g=ctx.createRadialGradient(x,arena.floor-145,8,x,arena.floor-145,radius);
   g.addColorStop(0,"rgba(255,255,255,.52)");g.addColorStop(.25,"rgba(78,199,255,.35)");g.addColorStop(1,"rgba(54,115,255,0)");
   ctx.fillStyle=g;ctx.fillRect(x-radius,arena.floor-145-radius,radius*2,radius*2);
   ctx.strokeStyle="#9cecff";ctx.lineWidth=3;ctx.shadowColor="#60d9ff";ctx.shadowBlur=22;
   for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(x,arena.floor-145,100+i*25+Math.sin(time*.012+i)*12,22+i*8,p*3+i*.5,0,Math.PI*2);ctx.stroke();}
   ctx.restore();
   ctx.save();ctx.globalAlpha=clamp(1-Math.abs(s.t-1.05)*2.8)*.9;ctx.fillStyle="#fff";ctx.font="900 42px system-ui";ctx.textAlign="center";ctx.fillText("REALITY BREAK",arena.width/2,120);ctx.restore();
 }
 root.GumballUltimate=Object.freeze({begin,update,render});
})(typeof window==="undefined"?globalThis:window);
