/* Yusuke exact user-reference sprite renderer v15.
 * All visible poses are cut from the user's supplied 1536x1024 four-by-four
 * character artwork, including its authentic teal bangs, yellow sleeveless
 * shirt, green trousers and white shoes. No AI redraw or palette shifts.
 * The alpha-cleaned PNG was produced once from that image, so runtime does
 * not expose JPEG-white backdrops or allocate a new texture each frame.
 *
 * There are sixteen unique illustrated images in the source. The engine
 * reuses them for movement, air, hit, Square and specials: no fake claim of
 * having sixteen independent jump/knockdown drawings.
 */
(function(root){
  "use strict";
  const WIDTH=1536, HEIGHT=1024, CW=384, CH=256, ANCHOR_X=174;
  const MAX_RENDER_HEIGHT=208;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  // 16 exact crops, each local to its 384x256 grid tile. The local source
  // data, including the blue strike accents, is retained unpainted.
  const BOUNDS=Object.freeze([
    [72,0,283,251],[61,12,281,251],[60,12,335,251],[60,11,290,251],
    [59,10,287,251],[56,8,357,251],[60,8,295,251],[60,15,318,251],
    [59,5,314,251],[58,11,342,251],[50,12,327,251],[55,12,365,251],
    [41,12,301,253],[51,12,343,255],[27,16,372,253],[64,4,305,253]
  ]);
  const FRAMES=Object.freeze(BOUNDS.map((b,i)=>Object.freeze({
    x:(i%4)*CW+b[0],y:Math.floor(i/4)*CH+b[1],
    w:b[2]-b[0],h:b[3]-b[1],ax:ANCHOR_X-b[0],key:i
  })));

  // V16: dedicated eight-cel breathing idle and eight-cel walking atlas.
  // The attack sheet remains the sole source of attack, guard, hurt and special poses.
  // Optional V17 authored motion atlases. Preserve the v16 walk/idle and
  // legacy source sprites as a fallback if artwork hasn't been deployed yet.
  const V17_BACK_TURN_SRC = "characters/yusuke/yusuke_walk_backward_turn_12frames.png";
  const V17_RUN_DASH_SRC = "characters/yusuke/yusuke_run_dash_12frames.png";
  const V17_IDLE_SRC = "characters/yusuke/yusuke_idle_12frames.png";
  const V17_WALK_SRC = "characters/yusuke/yusuke_walk_forward_12frames.png";
  let backTurnV17=null, runDashV17=null, idleV17=null, walkV17=null, v17Requested=false;
  function loadV17Movement(){
    if(v17Requested || typeof root.Image !== "function")return;
    v17Requested=true;
    function load(src,set){
      const image=new root.Image();
      image.decoding="async";
      image.onload=()=>{if((image.naturalWidth||image.width)===1536 &&
        (image.naturalHeight||image.height)===512)set(image);};
      image.onerror=()=>{}; // Missing optional art must not break existing movement.
      image.src=src;
    }
    load(V17_BACK_TURN_SRC,image=>{backTurnV17=image;});
    load(V17_RUN_DASH_SRC,image=>{runDashV17=image;});
    load(V17_IDLE_SRC,image=>{idleV17=image;});
    load(V17_WALK_SRC,image=>{walkV17=image;});
  }
  function v17Pose(clip,relative,t){
    let image,number=0,rate=12,loop=true,count=6;
    if(clip==="idle"){
      image=idleV17;count=12;
    }else if(clip==="forward"){
      image=walkV17;rate=13;count=12;
    }else if(clip==="retreat" || clip==="backdash"){
      image=backTurnV17;rate=clip==="backdash"?20:12;
    }else if(clip==="turn"){
      image=backTurnV17;rate=10;number=6;loop=false;
    }else if(clip==="rush"){
      image=runDashV17;rate=20;number=6;loop=false;
    }else if(clip==="sprint"){
      image=runDashV17;rate=16;
    }
    if(!image)return null;
    const step=Math.floor(Math.max(0,t)*rate);
    const index=number+(loop?step%count:Math.min(count-1,step));
    const frame={x:(index%6)*256,y:Math.floor(index/6)*256,
      w:256,h:256,ax:128,key:index};
    // Keep the illustrated body approximately the same height through walking,
    // sprinting and dashing. Previous .94 scaling made the run disproportionately small.
    const scale=Math.min(1.16,MAX_RENDER_HEIGHT/(clip==="sprint"||clip==="rush"?200:205));
    return {image,frame,index,clip,scale,
      part:"movement-v17",source:"movement-v17",progress:0,frameCount:12};
  }
  const WALK_IDLE_SRC = "characters/yusuke/yusuke-walk-idle-v16.png";
  const WALK_IDLE_BOUNDS = Object.freeze([[128,14,262,247],[128,8,262,247],[128,6,262,247],[128,1,265,247],[128,6,265,246],[129,12,263,246],[129,15,262,246],[129,17,262,246],[113,20,255,247],[126,19,255,242],[118,19,273,240],[101,23,264,240],[140,25,256,246],[137,21,257,243],[112,21,279,243],[122,23,257,246]]);
  const WALK_IDLE_FRAMES = Object.freeze(WALK_IDLE_BOUNDS.map((b,i)=>Object.freeze({
    x:(i%4)*CW+b[0],y:Math.floor(i/4)*CH+b[1],
    w:b[2]-b[0],h:b[3]-b[1],ax:192-b[0],key:i
  })));
  const IDLE_CYCLE = Object.freeze([0,1,2,3,4,5,6,7,6,5,4,3,2,1]);
  const WALK_CYCLE = Object.freeze([8,9,10,11,12,13,14,15]);
  const BACKWALK_CYCLE = Object.freeze([15,14,13,12,11,10,9,8]);
  let walkIdleImage = null;
  let walkIdleStatus = "unrequested";
  function loadWalkIdle(){
    if(walkIdleStatus !== "unrequested" || typeof root.Image !== "function") return;
    walkIdleStatus = "loading";
    const image = new root.Image();
    image.decoding = "async";
    image.onload = function(){
      if((image.naturalWidth||image.width) === WIDTH &&
         (image.naturalHeight||image.height) === HEIGHT){
        walkIdleImage = image;
        walkIdleStatus = "ready";
      }else{
        walkIdleStatus = "failed";
        root.console?.warn?.("Yusuke walk/idle atlas has incorrect dimensions; retaining original artwork");
      }
    };
    image.onerror = function(){
      walkIdleStatus = "failed";
      root.console?.warn?.("Yusuke walk/idle atlas could not load; retaining original artwork");
    };
    image.src = WALK_IDLE_SRC;
  }
  const attackClips=Object.freeze({
    light:Object.freeze([0,1,2,3]),
    cross:Object.freeze([4,5,6,7]),
    body:Object.freeze([8,9,10,11]),
    upper:Object.freeze([12,13,14,15]),
    heavy:Object.freeze([1,7,12,14,15]),
    powerKick:Object.freeze([4,7,12,14,15]),
    gun:Object.freeze([0,9,11,15]),
    shotgun:Object.freeze([0,10,13,15]),
    flashRush:Object.freeze([1,2,5,9,11,14,15]),
    risingBreaker:Object.freeze([1,8,12,14,15]),
    skyPursuit:Object.freeze([8,9,11,13,14,15]),
    spiritCyclone:Object.freeze([7,12,13,14,15]),
    spiritVoid:Object.freeze([8,9,10,13,14,15]),
    meteorFinish:Object.freeze([12,13,14,15]),
    rapidBarrage:Object.freeze([1,2,5,9,10,11,13,14,15]),
    spiritWave:Object.freeze([0,9,11,14,15])
  });
  const movementClips=Object.freeze({
    idle:Object.freeze([0,15]),
    forward:Object.freeze([0,1,4,6]),
    retreat:Object.freeze([6,4,1,0]),
    rush:Object.freeze([1,4,13]),
    backdash:Object.freeze([6,4,0]),
    jumpRise:Object.freeze([8,12]),
    jumpFall:Object.freeze([12,8]),
    crouch:Object.freeze([4]),
    guard:Object.freeze([0,3]),
    stagger:Object.freeze([8,15]),
    knockback:Object.freeze([8,12]),
    knockdown:Object.freeze([12]),
    charge:Object.freeze([8,9]),
    recovery:Object.freeze([15,0])
  });
  function build(image){
    if(!image || (image.naturalWidth||image.width)!==WIDTH ||
      (image.naturalHeight||image.height)!==HEIGHT)return null;
    loadWalkIdle();
    // V17 is requested lazily on first rendered pose to preserve V16 boot behavior.
    return Object.freeze({image,frames:FRAMES,scale:1,source:"user-reference",
      frameCount:16,width:WIDTH,height:HEIGHT,maximumHeight:MAX_RENDER_HEIGHT});
  }
  function frameAt(seq,p){
    return seq[Math.min(seq.length-1,Math.floor(clamp(p)*seq.length))];
  }
  function pose(fighter,atlas,attackDuration){
    if(!fighter||!atlas?.image)return null;
    const attack=fighter.currentAttack?.()||null;
    const t=Math.max(0,Number(fighter.stateTime)||0);
    const state=String(fighter.state||"idle");
    const face=fighter.facing<0?-1:1;
    const relative=(Number(fighter.vx)||0)*face;
    const inAir=!fighter.grounded || state==="jump";
    let clip="idle",index=0,progress=0;
    if(attack){
      clip=attack;
      const seq=attackClips[attack]||attackClips.light;
      // Use the existing attack timing and hitbox windows; only poses change.
      const duration=Math.max(.07,Number(attackDuration)||
        Number(fighter.attackDuration)||Number(fighter._attackDuration)||0.33);
      const p=clamp(t/duration);
      progress=p;
      index=frameAt(seq,p);
    }else if(state==="hit" || (fighter.hitstun||0)>0){
      clip=fighter.hitReaction==="knockback"?"knockback":"stagger";
      const seq=movementClips[clip];
      progress=(t*12)%1;index=seq[Math.floor(t*12)%seq.length];
    }else if(state==="knockdown" || state==="down"){
      clip="knockdown";index=12;
    }else if(state==="charge"){
      clip="charge";index=t>.25?9:8;
    }else if(state==="block"){
      clip="guard";index=movementClips.guard[Math.floor(t*5)%2];
    }else if(state==="crouch" || state==="crouchWalk"){
      clip="crouch";index=4;
    }else if(inAir){
      clip=Number(fighter.vy)<0?"jumpRise":"jumpFall";
      index=movementClips[clip][Math.floor(t*10)%2];
    }else if((fighter.dashTimer||0)>0 || Math.abs(relative)>690){
      clip=relative<0?"backdash":"rush";
      const seq=movementClips[clip];
      index=seq[Math.floor(t*15)%seq.length];
    }else if((state==="walk" || state==="run") && Math.abs(relative)>18){
      clip=relative<0?"retreat":state==="run"?"sprint":"forward";
      const seq=movementClips[clip];
      index=seq[Math.floor(t*11)%seq.length];
    }else if((fighter.turnTimer||0)>0 && Math.abs(relative)<18){
      clip="turn";index=0;
    }else if(state==="idle"&&t<.13 &&
      (fighter._exactPreviousClip==="knockback"||fighter._exactPreviousClip==="stagger")){
      clip="recovery";index=15;
    }else{
      clip="idle";index=0;
    }
    fighter._exactPreviousClip=clip;
    // Never overlay a second fighter. Select ONE texture for this frame only.
    loadV17Movement();
    const expanded=v17Pose(clip,relative,t);
    if(expanded)return expanded;
    if(walkIdleImage && (clip==="idle" || clip==="forward" || clip==="retreat")){
      const seq=clip==="idle"?IDLE_CYCLE:clip==="retreat"?BACKWALK_CYCLE:WALK_CYCLE;
      const rate=clip==="idle"?12:13;
      const movementIndex=seq[Math.floor(t*rate)%seq.length];
      const frame=WALK_IDLE_FRAMES[movementIndex];
      const scale=Math.min(.88,MAX_RENDER_HEIGHT/frame.h);
      return {image:walkIdleImage,frame,index:movementIndex,clip,scale,
        part:"walk-idle",source:"walk-idle-v16",progress:0,frameCount:16};
    }
    const frame=atlas.frames[index];
    const scale=Math.min(.88,MAX_RENDER_HEIGHT/frame.h);
    return {image:atlas.image,frame,index,clip,scale,part:"exact",source:"user-reference",
      progress,frameCount:atlas.frameCount};
  }
  function draw(fighter,ctx,time,_alpha,atlas,attackDuration){
    const selected=pose(fighter,atlas,attackDuration);
    if(!selected||!ctx?.drawImage)return false;
    const {image,frame,scale,clip,progress}=selected;
    const face=fighter.facing<0?-1:1;
    const t=Math.max(0,Number(fighter.stateTime)||0);
    const fwd=(Number(fighter.vx)||0)*face;
    const idle=(clip==="idle");
    // Tiny single-body pivots are applied continuously with the render tick.
    // Do NOT crossfade two full sprites; that makes giant overlapping ghosts.
    const lunge=attackClips[clip]?
      Math.sin(Math.PI*progress)*Math.min(6,Math.max(0,20*progress)):0;
    const bob=idle?Math.sin((time||0)*.005)*.7:clip==="forward"||clip==="retreat"?
      Math.sin(t*15)*1.15:0;
    const tilt=clip==="knockback" ? -.09 :
      clip==="stagger" ? -.04 :
      clip==="rush" ? .028 : clip==="backdash" ? -.035:0;
    const dx=(Number(fighter.x)||0)+face*lunge;
    // Every V17 cel has a 12px transparent gutter below its foot pivot.
    // Offset once at draw time rather than shifting world physics / hitboxes.
    const dy=(Number(fighter.y)||0)+bob+
      (selected.source==="movement-v17"?12*scale:0);
    ctx.save();
    ctx.translate(dx,dy);
    ctx.scale(face,1);
    if(tilt)ctx.rotate(tilt);
    ctx.imageSmoothingEnabled=selected.source!=="movement-v17";
    if("imageSmoothingQuality" in ctx && ctx.imageSmoothingEnabled)ctx.imageSmoothingQuality="high";
    // This is the ONLY full-body Yusuke draw for each game frame.
    ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,
      -frame.ax*scale,-frame.h*scale,frame.w*scale,frame.h*scale);
    ctx.restore();
    return true;
  }
  root.MugenExactYusuke=Object.freeze({
    build,pose,draw,frames:FRAMES,walkIdleFrames:WALK_IDLE_FRAMES,
    walkIdleSource:WALK_IDLE_SRC,walkIdleStatus:()=>walkIdleStatus,
    attackClips,movementClips,
    sourceSize:Object.freeze([WIDTH,HEIGHT]),maximumHeight:MAX_RENDER_HEIGHT
  });
})(typeof window==="undefined"?globalThis:window);
