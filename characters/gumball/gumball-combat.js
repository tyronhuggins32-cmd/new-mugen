/* Gumball combat adapter. Uses the shared game Fighter and ArcadeFight contracts,
 * separate from Yusuke's JSON, sprite sheets, special moves, and profile. */
(function(root){
  "use strict";
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const clips=root.GumballCharacter.animations;
  const profile=root.GumballCharacter.profile;
  let atlas=null;
  function load(){
    if(atlas) return Promise.resolve(atlas);
    return new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>{
        if(image.naturalWidth!==2048 || image.naturalHeight!==3072){
          reject(new Error("Gumball sprite atlas must be 2048x3072 (8x12 cells)."));return;
        }
        atlas={image,frame:(index)=>({x:(index%8)*256,y:Math.floor(index/8)*256,w:256,h:256,ax:128})};
        resolve(atlas);
      };
      image.onerror=()=>reject(new Error("Gumball sprite atlas failed to load."));
      image.src=root.GumballCharacter.sprite.src;
    });
  }
  function animationFor(fighter){
    const attack=fighter.currentAttack();
    if(attack) return root.GumballCharacter.attacks[attack]?.animation || "jab";
    if(fighter.state==="hit") return fighter.hitstun>.28?"hitHeavy":"hitLight";
    if(fighter.state==="block") return "block";
    if(fighter.state==="dodge") return "dodge";
    if(!fighter.grounded) return fighter.vy < -90?"jumpRise":fighter.vy>110?"jumpFall":"jumpApex";
    if(fighter.state==="walk") return Math.abs(fighter.vx)>270
      ? (fighter.vx*fighter.facing>=0?"runForward":"runBack")
      : (fighter.vx*fighter.facing>=0?"walkForward":"walkBack");
    return "idle";
  }
  function frameAt(name,seconds){
    const clip=clips[name]||clips.idle;
    const step=Math.max(0,Math.floor(Math.max(0,seconds)*clip.fps));
    const index=clip.loop?step%clip.frames.length:Math.min(step,clip.frames.length-1);
    return clip.frames[index];
  }
  function draw(fighter,ctx,time,alpha=1){
    if(!atlas?.image?.complete)return false;
    const name=animationFor(fighter), clip=clips[name]||clips.idle;
    const frame=atlas.frame(frameAt(name,fighter.stateTime));
    const p=clamp(fighter.stateTime/(root.GumballCharacter.attacks[fighter.currentAttack()]?.duration||.5),0,1);
    const anticipation=Math.sin(Math.PI*p);
    const shake=fighter.state==="hit"?Math.sin(time*.08)*Math.min(7,fighter.hitstun*15):0;
    const x=(fighter.prevX??fighter.x)+(fighter.x-(fighter.prevX??fighter.x))*alpha;
    const y=(fighter.prevY??fighter.y)+(fighter.y-(fighter.prevY??fighter.y))*alpha;
    const mirror=fighter.facing;
    const scale=root.GumballCharacter.sprite.scale;
    ctx.save();
    ctx.globalAlpha=.3;ctx.fillStyle="#000";ctx.beginPath();
    ctx.ellipse(x,arena.floor+8,52*Math.max(.55,1-(arena.floor-y)/700),12,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x+shake+mirror*anticipation*14,y);
    ctx.scale(mirror*scale,scale);
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";
    if(fighter.state==="hit" && fighter.hitstun>.14) ctx.rotate(-.055*mirror);
    ctx.drawImage(atlas.image,frame.x,frame.y,frame.w,frame.h,-128,-256,256,256);
    if(fighter.state==="block"){
      ctx.strokeStyle="rgba(100,218,255,.9)";ctx.lineWidth=5;ctx.shadowColor="#6bdcff";ctx.shadowBlur=18;
      ctx.beginPath();ctx.arc(12,-124,78,-1.2,1.2);ctx.stroke();ctx.shadowBlur=0;
    }
    if(fighter.currentAttack() && fighter.currentAttack().includes("Rush")){
      ctx.strokeStyle="rgba(106,225,255,.7)";ctx.lineWidth=12;ctx.shadowColor="#52d4ff";ctx.shadowBlur=24;
      ctx.beginPath();ctx.moveTo(-28,-104);ctx.quadraticCurveTo(40,-165,130,-108);ctx.stroke();
    }
    ctx.restore();
    return true;
  }
  function onHit(game,attacker,defender,attack,blocked,impactX,impactY){
    if(!game||!attacker||!defender)return;
    const heavy=Boolean(attack.heavyImpact);
    if(!blocked){
      const dx=Math.sign(defender.x-attacker.x)||attacker.facing;
      defender.vx=dx*attack.knockback;
      defender.hitstun=attack.hitstun;
      defender.setState("hit");
      if(attack.launchVelocity) defender.vy=attack.launchVelocity;
      if(defender.x<=arena.left+2 || defender.x>=arena.right-2){
        defender.vx=-dx*Math.abs(defender.vx)*root.GumballCharacter.reactions.wallBounce;
        game.shake=Math.max(game.shake,heavy?16:8);
      }
      if(defender.y<arena.floor-2 && heavy) defender.vy=root.GumballCharacter.reactions.groundBounce;
    }else{
      defender.hitstun=root.GumballCharacter.reactions.blockStun;
      defender.vx=attacker.facing*attack.knockback*.2;
      defender.setState("block");
    }
    game.hitStop=Math.max(game.hitStop,heavy?root.GumballCharacter.reactions.hitStopHeavy:root.GumballCharacter.reactions.hitStopLight);
    game.shake=Math.max(game.shake,heavy?14:5);
    game.addImpact(impactX,impactY,blocked?"#e9fbff":"#64d9ff",heavy?28:16);
    game.addSpiritBurst(impactX,impactY,blocked?"#e9fbff":"#64d9ff",attacker.facing,heavy?1.25:.8,"impact");
  }
  function drawMoveVfx(fighter,ctx,time){
    const type=fighter.currentAttack();
    if(!type || !["elmoreRush","cartoonSpin","stretchSlam","wattersomChaos"].includes(type))return;
    const p=clamp(fighter.stateTime/(root.GumballCharacter.attacks[type].duration||1));
    ctx.save();ctx.globalCompositeOperation="lighter";
    const color="#69dfff";
    const x=fighter.x+fighter.facing*65,y=fighter.y-125;
    ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=20;ctx.lineWidth=7*(1-p*.5);
    if(type==="cartoonSpin"||type==="wattersomChaos"){
      ctx.beginPath();ctx.ellipse(x,y,40+110*p,22+45*p,p*5,0,Math.PI*2);ctx.stroke();
      for(let n=0;n<5;n++){const ang=time*.01+n*Math.PI*2/5;ctx.beginPath();ctx.arc(x+Math.cos(ang)*(48+65*p),y+Math.sin(ang)*(26+35*p),5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
    }else{
      ctx.beginPath();ctx.moveTo(x-20,y+25);ctx.quadraticCurveTo(x+fighter.facing*(70+100*p),y-45,x+fighter.facing*(160+30*p),y+20);ctx.stroke();
    }
    ctx.restore();
  }
  root.GumballCombat=Object.freeze({load,draw,drawMoveVfx,animationFor,frameAt,onHit});
})(typeof window==="undefined"?globalThis:window);
