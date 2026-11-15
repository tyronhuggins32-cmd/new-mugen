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
  // V24: 18 hand-authored dash poses, independent from the L3 run cycle.
  // Grid is 6 × 3 on the original 1774 × 887 transparent source.
  const V24_DASH_SRC = "characters/yusuke/yusuke_dash_v24_18frames.png";
  let dashV24=null,dashV24Status="unrequested";
  function loadV24Dash(){
    if(dashV24Status!=="unrequested" || typeof root.Image!=="function")return;
    dashV24Status="loading";
    const picture=new root.Image();
    picture.decoding="async";
    picture.onload=()=>{
      if((picture.naturalWidth||picture.width)===1774 &&
         (picture.naturalHeight||picture.height)===887){
        dashV24=root.MugenYusukeArtV29?.prepare(picture,"movement-v24")||picture;
        dashV24Status="ready";
      }else dashV24Status="invalid";
    };
    picture.onerror=()=>{dashV24Status="missing";};
    picture.src=V24_DASH_SRC;
  }
  const V17_IDLE_SRC = "characters/yusuke/yusuke_idle_12frames.png";
  const V17_WALK_SRC = "characters/yusuke/yusuke_walk_forward_12frames.png";
  // V21: extended 24-frame authored forward walk (6×4, 256px cells).
  // It overrides only the forward walk. Idle, run, backwalk and dash are preserved.
  const V21_WALK_SRC = "characters/yusuke/yusuke_walk_forward_v21_24frames.png";
  const V22_WALK_SRC = "characters/yusuke/yusuke_walk_forward_v22_24frames.png";
  let walkV22=null,walkV22Status="unrequested";
  let walkSynthesizedV22=null;
  function maybeSynthesizeWalkFallback(){
    // V22's real 24 unique PNG frames make synthetic halfway-poses redundant.
    // Avoid a large Canvas allocation on the first gameplay frame unless
    // that art failed to load and we actually need the offline fallback.
    if(!walkSynthesizedV22 && walkV17 && !walkV22 &&
      ["missing","invalid"].includes(walkV22Status)){
      walkSynthesizedV22=root.MugenWalkPolishV22?.generate(walkV17)||null;
    }
  }
  function loadV22Walk(){
    if(walkV22Status!=="unrequested"||typeof root.Image!=="function")return;
    walkV22Status="loading";
    const image=new root.Image();
    image.decoding="async";
    image.onload=()=>{
      if((image.naturalWidth||image.width)===1536 &&
         (image.naturalHeight||image.height)===1024){
        walkV22=image;walkV22Status="ready";
      }else{
        walkV22Status="invalid";maybeSynthesizeWalkFallback();
      }
    };
    image.onerror=()=>{
      walkV22Status="missing";maybeSynthesizeWalkFallback();
    };
    image.src=V22_WALK_SRC;
  }
  let walkV21=null,walkV21Status="unrequested";
  function loadV21Walk(){
    if(walkV21Status!=="unrequested" || typeof root.Image!=="function")return;
    walkV21Status="loading";
    const image=new root.Image();
    image.decoding="async";
    image.onload=()=>{
      if((image.naturalWidth||image.width)===1536 &&
         (image.naturalHeight||image.height)===1024){
        walkV21=image;walkV21Status="ready";
      }else walkV21Status="invalid";
    };
    image.onerror=()=>{walkV21Status="missing";};
    image.src=V21_WALK_SRC;
  }
  let backTurnV17=null, runDashV17=null, idleV17=null, walkV17=null, v17Requested=false;
  let runOnlyV20=null, dashOnlyV20=null;
  // Split the already-deployed combined texture into two cached render targets:
  // RUN loops row 0; DASH plays row 1 exactly once. Never mix their frames.
  function splitRunDashV20(atlas) {
    if(!root.document?.createElement)return;
    try {
      const surfaces=[];
      for(let row=0;row<2;row++){
        const canvas=root.document.createElement("canvas");
        canvas.width=1536;canvas.height=256;
        const context=canvas.getContext("2d",{willReadFrequently:true});
        if(!context)return;
        context.imageSmoothingEnabled=false;
        context.drawImage(atlas,0,row*256,1536,256,0,0,1536,256);
        const pixels=context.getImageData(0,0,1536,256);
        const data=pixels.data;
        // Remove desaturated white checkerboard/halo pixels from cel edges.
        for(let p=0;p<data.length;p+=4){
          const r=data[p],g=data[p+1],b=data[p+2];
          if(r>185 && g>185 && b>185 &&
             Math.max(r,g,b)-Math.min(r,g,b)<24)data[p+3]=0;
        }
        context.putImageData(pixels,0,0);
        surfaces.push(canvas);
      }
      runOnlyV20=root.MugenYusukeArtV29?.prepare(surfaces[0],"movement-v17")||surfaces[0];
      dashOnlyV20=root.MugenYusukeArtV29?.prepare(surfaces[1],"movement-v17")||surfaces[1];
    }catch(_){/* Keep the already-deployed combined atlas as fallback. */}
  }
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
    load(V17_RUN_DASH_SRC,image=>{runDashV17=image;splitRunDashV20(image);});
    load(V17_IDLE_SRC,image=>{idleV17=image;});
    load(V17_WALK_SRC,image=>{
      walkV17=image;
      maybeSynthesizeWalkFallback();
    });
  }
  function v17Pose(clip,relative,t,fighter){
    let image,number=0,rate=12,loop=true,count=6;
    if(clip==="idle"){
      image=idleV17;count=12;
    }else if(clip==="forward"){
      // Authoritative new art > prior V21 art > cached 24-step motion
      // synthesis from the shipped 12-frame atlas > unmodified 12-frame.
      image=walkV22||walkV21||walkSynthesizedV22||walkV17;
      const extended=image!==walkV17;
      rate=extended?24:13;
      count=extended?24:12;
    }else if(clip==="retreat" || clip==="backdash"){
      image=backTurnV17;rate=clip==="backdash"?20:12;
    }else if(clip==="turn"){
      image=backTurnV17;rate=10;number=6;loop=false;
    }else if(clip==="rush"){
      image=dashV24||dashOnlyV20||runDashV17;
      rate=dashV24?60:24;
      number=dashV24?0:(dashOnlyV20?0:6);
      count=dashV24?18:6;
      loop=false;
    }else if(clip==="sprint"){
      image=runOnlyV20||runDashV17;rate=12;loop=true;
    }
    if(!image)return null;
    const dashProgress=clip==="rush" && (fighter?.dashDuration||0)>0
      ? Math.max(0,Math.min(1,(fighter.dashElapsed||0)/fighter.dashDuration))
      : null;
    // Ground locomotion tracks real displacement, so it pauses against a
    // wall and stays phase-coherent across walk, retreat and L3 running.
    const stridePhase=["forward","retreat","sprint"].includes(clip) &&
      Number.isFinite(fighter?.gaitPhase)
      ? Math.floor(((fighter.gaitPhase%1)+1)%1*count) : null;
    const distancePhase=clip==="forward" &&
      Number.isFinite(fighter?.walkCycleDistance)
      ? Math.floor(((Math.max(0,fighter.walkCycleDistance)%240)/240)*count)
      : null;
    const step=dashProgress!==null
      // Render exactly one original pose per fixed 60Hz tick on the
      // 0.30-second R1 burst. The epsilon keeps the first pose visible.
      ? Math.min(count-1,Math.floor(Math.max(0,dashProgress-0.000001)*count))
      : stridePhase!==null?stridePhase:
        distancePhase!==null?distancePhase:Math.floor(Math.max(0,t)*rate);
    const index=number+(loop?step%count:Math.min(count-1,step));
    const dashOriginal=image===dashV24;
    const col=index%6,row=Math.floor(index/6);
    const x0=dashOriginal?Math.round(col*1774/6):col*256;
    const x1=dashOriginal?Math.round((col+1)*1774/6):x0+256;
    const y0=dashOriginal?Math.round(row*887/3):row*256;
    const y1=dashOriginal?Math.round((row+1)*887/3):y0+256;
    const frame={x:x0,y:y0,w:x1-x0,h:y1-y0,ax:(x1-x0)/2,key:index};
    // Keep the illustrated body approximately the same height through walking,
    // sprinting and dashing. Previous .94 scaling made the run disproportionately small.
    const scale=dashOriginal?.815:Math.min(.96,MAX_RENDER_HEIGHT/220);
    const source=dashOriginal?"movement-v24":image===walkV22?"movement-v22":
      image===walkV21?"movement-v21":
      image===walkSynthesizedV22?"movement-v22-generated":"movement-v17";
    return {image,frame,index,clip,scale,
      part:source,source,progress:0,frameCount:count};
  }
  // V18 crouch artwork uses a 5x2 texture so it cannot share V17's 6-column crops.
  const V18_CROUCH_SRC = "characters/yusuke/yusuke_crouch_crouchwalk_10frames.png";
  let crouchImageV18=null, crouchRequestedV18=false;
  function loadV18Crouch(){
    if(crouchRequestedV18 || typeof root.Image!=="function")return;
    crouchRequestedV18=true;
    const image=new root.Image();
    image.decoding="async";
    image.onload=()=>{if((image.naturalWidth||image.width)===1280 &&
       (image.naturalHeight||image.height)===512)crouchImageV18=image;};
    image.onerror=()=>{}; // Never replace legacy art with a broken texture.
    image.src=V18_CROUCH_SRC;
  }
  function v18CrouchPose(clip,t,fighter){
    if(!crouchImageV18 || (clip!=="crouch" && clip!=="crouchWalk"))return null;
    const index=clip==="crouch" ? Math.min(4,Math.floor(Math.max(0,t)*12))
      : 5+(Number.isFinite(fighter?.gaitPhase)
        ? Math.min(4,Math.floor(((fighter.gaitPhase%1)+1)%1*5))
        : Math.floor(Math.max(0,t)*12)%5);
    // The authored feet are at local y=244, so crop the empty final 12 pixels.
    const frame={x:(index%5)*256,y:Math.floor(index/5)*256,
      w:256,h:244,ax:128,key:index};
    return {image:crouchImageV18,frame,index,clip,
      scale:Math.min(.85,MAX_RENDER_HEIGHT/frame.h),
      part:"movement-v18",source:"movement-v18",progress:0,frameCount:10};
  }
  // V19: true-alpha 14-pose jump atlas. Crops are measured from the
  // 256x256 normalized frame cels; the game physics owns world Y motion.
  const V19_JUMP_SRC="characters/yusuke/yusuke_jump_landing_14frames.png";
  const V19_JUMP_BOUNDS=Object.freeze([
    [62,42,195,242],[75,85,181,242],[71,62,185,242],[66,37,190,242],
    [70,50,187,242],[80,74,177,242],[78,92,177,242],[60,61,197,242],
    [70,50,187,242],[70,42,187,242],[64,50,191,242],[74,76,183,242],
    [70,99,186,242],[58,43,197,242]
  ]);
  let jumpV19=null, jumpRequestedV19=false;
  function loadV19Jump(){
    if(jumpRequestedV19 || typeof root.Image!=="function")return;
    jumpRequestedV19=true;
    const image=new root.Image();image.decoding="async";
    image.onload=()=>{if((image.naturalWidth||image.width)===1024 &&
      (image.naturalHeight||image.height)===1024) jumpV19=image;};
    image.onerror=()=>{}; // Missing optional artwork keeps the legacy jump.
    image.src=V19_JUMP_SRC;
  }
  function v19JumpPose(clip,t,vy){
    if(!jumpV19 || !["jumpRise","jumpFall","landing"].includes(clip))return null;
    let index=0;
    if(clip==="landing") index=t<.085?12:13;
    else if(clip==="jumpRise"){
      if(t<.13) index=Math.min(3,Math.floor(t*31));
      else if(vy > -170) index=8;
      else index=Math.min(7,4+Math.floor((t-.13)*13));
    }else{
      index=8+Math.min(3,Math.floor(clamp(Math.max(0,vy)/1120)*4));
    }
    const b=V19_JUMP_BOUNDS[index],cx=(index%4)*256,cy=Math.floor(index/4)*256;
    const frame={x:cx+b[0],y:cy+b[1],w:b[2]-b[0],h:b[3]-b[1],ax:128-b[0],key:index};
    return {image:jumpV19,frame,index,clip,scale:1,
      part:"jump-landing-v19",source:"jump-landing-v19",progress:0,frameCount:14};
  }
  // V23: full-body high guard, actual guard impacts, and planted recovery.
  // 4 columns x 2 rows, RGBA, 256px cells. Does not affect combat collision.
  const V23_GUARD_SRC="characters/yusuke/yusuke_guard_hold_hit_8frames.png";
  let guardV23=null,guardRequestedV23=false;
  function loadV23Guard(){
    if(guardRequestedV23 || typeof root.Image!=="function")return;
    guardRequestedV23=true;
    const image=new root.Image();image.decoding="async";
    image.onload=()=>{if((image.naturalWidth||image.width)===1024 &&
      (image.naturalHeight||image.height)===512)
         guardV23=root.MugenYusukeArtV29?.prepare(image,"guard-v23")||image;};
    image.onerror=()=>{}; // Retain the reference sheet if this atlas is unavailable.
    image.src=V23_GUARD_SRC;
  }
  function v23GuardPose(clip,t,fighter){
    if(!guardV23 || (clip!=="guard" && clip!=="guardRecover"))return null;
    let index=0;
    if(clip==="guardRecover"){
      index=t<.085?6:7;
    }else if((fighter?._guardImpactTimer||0)>0){
      index=fighter?._guardImpactHeavy?5:4;
    }else if(t<.075){
      index=0;
    }else if(t<.155){
      index=1;
    }else{
      index=Math.floor(t*8)%2?2:3;
    }
    // Crop through foot line 244, leaving a 2px floor gap, not 12px hover.
    const frame={x:(index%4)*256,y:Math.floor(index/4)*256,
      w:256,h:244,ax:128,key:index};
    return {image:guardV23,frame,index,clip,scale:.96,
      part:"guard-v23",source:"guard-v23",progress:0,frameCount:8};
  }
  // V24: Backward R1 quick-step uses its own eight real alpha cels.
  // This is visual-only. Existing dash vector, cooldown, damage and i-frames
  // remain authoritative; forward dash and L3 sprint are left untouched.
  const V24_DODGE_SRC="characters/yusuke/yusuke_dodge_quickstep_8frames.png";
  let dodgeV24=null,dodgeRequestedV24=false;
  function loadV24Dodge(){
    if(dodgeRequestedV24 || typeof root.Image!=="function")return;
    dodgeRequestedV24=true;
    const image=new root.Image(); image.decoding="async";
    image.onload=()=>{
      if((image.naturalWidth||image.width)===1024 &&
         (image.naturalHeight||image.height)===512)dodgeV24=image;
    };
    image.onerror=()=>{}; // Safe fallback to the V17 backdash poses.
    image.src=V24_DODGE_SRC;
  }
  function v24DodgePose(clip,fighter){
    if(!dodgeV24 || clip!=="backdash" || !fighter)return null;
    if(!(fighter.dashDuration>0 && fighter.dashDirection!==fighter.facing))return null;
    // Use latched dash progress, not wall-clock time, so all eight cels
    // finish in sync with the real backward R1 movement.
    const p=Math.min(.9999,Math.max(0,
      (Number(fighter.dashElapsed)||0)/Math.max(.08,Number(fighter.dashDuration)||.26)));
    const index=Math.min(7,Math.floor(p*8));
    // Shared crop preserves pose-to-pose proportions and the foot anchor.
    const frame={x:(index%4)*256+24,y:Math.floor(index/4)*256+28,
      w:192,h:217,ax:104,key:index};
    return {image:dodgeV24,frame,index,clip,scale:Math.min(.95,MAX_RENDER_HEIGHT/217),
      part:"dodge-v24",source:"dodge-v24",progress:p,frameCount:8};
  }
  // V25: three authored six-frame punch animations, reserved for grounded
  // Square light / cross / body. Existing hitboxes, cancel timing, and VFX
  // thresholds are intentionally unchanged.
  const V25_LIGHT_COMBO_SRC="characters/yusuke/yusuke_light_combo_18frames.png";
  const V25_ATTACK_ROWS=Object.freeze({light:0,cross:1,body:2});
  let lightComboV25=null,lightComboRequestedV25=false;
  function loadV25LightCombo(){
    if(lightComboRequestedV25 || typeof root.Image!=="function")return;
    lightComboRequestedV25=true;
    const image=new root.Image();
    image.decoding="async";
    image.onload=()=>{
      if((image.naturalWidth||image.width)===1536 &&
         (image.naturalHeight||image.height)===768)
         lightComboV25=root.MugenYusukeArtV29?.prepare(image,"light-combo-v25")||image;
    };
    image.onerror=()=>{}; // Missing optional art falls back to prior attack sprites.
    image.src=V25_LIGHT_COMBO_SRC;
  }
  function v25LightComboPose(clip,progress,fighter){
    if(!lightComboV25 || !fighter?.grounded ||
       !Object.prototype.hasOwnProperty.call(V25_ATTACK_ROWS,clip))return null;
    const local=Math.min(5,Math.floor(clamp(progress)*6));
    const index=V25_ATTACK_ROWS[clip]*6+local;
    const frame={x:(index%6)*256,y:Math.floor(index/6)*256,
      w:256,h:240,ax:128,key:index};
    return {image:lightComboV25,frame,index,clip,
      scale:Math.min(.9,MAX_RENDER_HEIGHT/240),
      part:"light-combo-v25",source:"light-combo-v25",
      progress,frameCount:18};
  }
  // V26: dedicated 16-cel Triangle heavy animation.
  const V26_HEAVY_SRC="characters/yusuke/yusuke_heavy_combo_triangle_16frames.png";
  let heavyV26=null,heavyRequestedV26=false;
  function loadV26Heavy(){
    if(heavyRequestedV26 || typeof root.Image!=="function")return;
    heavyRequestedV26=true;
    const image=new root.Image();image.decoding="async";
    image.onload=()=>{
      if((image.naturalWidth||image.width)===1024 &&
        (image.naturalHeight||image.height)===1024)
         heavyV26=root.MugenYusukeArtV29?.prepare(image,"heavy-triangle-v26")||image;
    };
    image.onerror=()=>{}; // Preserve legacy heavy pose on upload failure.
    image.src=V26_HEAVY_SRC;
  }
  function v26HeavyPose(clip,progress,fighter){
    if(clip!=="heavy" || !heavyV26 || !fighter?.grounded)return null;
    const index=Math.min(15,Math.floor(clamp(progress)*16));
    const frame={x:(index%4)*256,y:Math.floor(index/4)*256,
      w:256,h:245,ax:128,key:index};
    return {image:heavyV26,frame,index,clip,
      scale:Math.min(.91,MAX_RENDER_HEIGHT/245),
      part:"heavy-triangle-v26",source:"heavy-triangle-v26",
      progress,frameCount:16};
  }
  // V28: 12-frame Launcher / Uppercut. Only the fourth Square attack
  // changes its visible pose; hit timing, physics and Triangle remain intact.
  const V28_UPPERCUT_SRC="characters/yusuke/yusuke_launcher_uppercut_12frames.png";
  let launcherV28=null,launcherRequestedV28=false;
  function loadV28Uppercut(){
    if(launcherRequestedV28 || typeof root.Image!=="function")return;
    launcherRequestedV28=true;
    const image=new root.Image();image.decoding="async";
    image.onload=()=>{
      if((image.naturalWidth||image.width)===1024 &&
         (image.naturalHeight||image.height)===768)
         launcherV28=root.MugenYusukeArtV29?.prepare(image,"launcher-v28")||image;
    };
    image.onerror=()=>{}; // Missing art must retain the original uppercut.
    image.src=V28_UPPERCUT_SRC;
  }
  function v28UppercutPose(clip,progress,fighter){
    if(clip!=="upper" || !launcherV28 || !fighter?.grounded)return null;
    const index=Math.min(11,Math.floor(clamp(progress)*12));
    const frame={x:(index%4)*256,y:Math.floor(index/4)*256,
      w:256,h:248,ax:128,key:index};
    return {image:launcherV28,frame,index,clip,scale:Math.min(.91,MAX_RENDER_HEIGHT/248),
      part:"launcher-v28",source:"launcher-v28",progress,frameCount:12};
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
    // Match the navy-pants walking and punch atlases without editing the
    // user's original 16-pose PNG. The recolored canvas is cached once.
    const normalized=root.MugenLegacyYusukeV27?.prepare(image)||image;
    return Object.freeze({image:normalized,frames:FRAMES,scale:1,source:"user-reference",
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
      clip=fighter._crouchVisual?"crouch":"guard";
      index=clip==="guard"?movementClips.guard[Math.floor(t*5)%2]:4;
    }else if(state==="crouch" || state==="crouchWalk"){
      clip=state;index=4;
    }else if(inAir){
      clip=Number(fighter.vy)<0?"jumpRise":"jumpFall";
      index=movementClips[clip][Math.floor(t*10)%2];
    }else if((fighter.dashTimer||0)>0 || state==="dash"){
      clip=relative<0?"backdash":"rush";
      const seq=movementClips[clip];
      index=seq[Math.floor(t*15)%seq.length];
    }else if((state==="walk" || state==="run") && Math.abs(relative)>18){
      clip=relative<0?"retreat":state==="run"?"sprint":"forward";
      // The high-speed sprint clip is selected from V17 art, not legacy keys.
      const seq=movementClips[clip]||movementClips.forward;
      index=seq[Math.floor(t*11)%seq.length];
    }else if((fighter.turnTimer||0)>0 && Math.abs(relative)<18){
      clip="turn";index=0;
    }else if(state==="idle"&&t<.17 &&
      ["jumpRise","jumpFall","landing"].includes(fighter._exactPreviousClip)){
      // State changes from jump to idle on ground contact. Show impact/recovery
      // without touching movement timing, controller input, or collision physics.
      clip="landing";index=0;
    }else if(state==="idle"&&t<.17 &&
      ["guard","guardRecover"].includes(fighter._exactPreviousClip)){
      clip="guardRecover";index=0;
    }else if(state==="idle"&&t<.13 &&
      (fighter._exactPreviousClip==="knockback"||fighter._exactPreviousClip==="stagger")){
      clip="recovery";index=15;
    }else{
      clip="idle";index=0;
    }
    const priorClip=fighter._exactPreviousClip;
    const previousAttack=["light","cross","body","upper","heavy"].includes(priorClip)
      ||priorClip==="attackRecover";
    // The authored attack sheets end in guarded stances. Keep the final
    // sprite for a few simulation ticks before returning to idle; otherwise
    // the outfit/limbs snap to an unrelated atlas in a single frame.
    if(!attack && state==="idle" && t<.075 && previousAttack &&
       fighter._exactLastAttackPose){
      fighter._exactPreviousClip="attackRecover";
      return {...fighter._exactLastAttackPose,clip:"attackRecover"};
    }
    fighter._exactPreviousClip=clip;
    // Never overlay a second fighter. Select ONE texture for this frame only.
    loadV17Movement();
    if(clip==="rush")loadV24Dash();
    if(clip==="forward"){loadV21Walk();loadV22Walk();}
    if(clip==="crouch" || clip==="crouchWalk")loadV18Crouch();
    if(clip==="jumpRise" || clip==="jumpFall" || clip==="landing")loadV19Jump();
    if(clip==="guard" || clip==="guardRecover")loadV23Guard();
    if(clip==="backdash" && (fighter?.dashDuration||0)>0)loadV24Dodge();
    if(fighter.grounded && Object.prototype.hasOwnProperty.call(V25_ATTACK_ROWS,clip))
      loadV25LightCombo();
    if(clip==="heavy" && fighter.grounded)loadV26Heavy();
    if(clip==="upper" && fighter.grounded)loadV28Uppercut();
    const expanded=v28UppercutPose(clip,progress,fighter)||
      v26HeavyPose(clip,progress,fighter)||
      v25LightComboPose(clip,progress,fighter)||
      v24DodgePose(clip,fighter)||
      v23GuardPose(clip,t,fighter)||
      v19JumpPose(clip,t,Number(fighter.vy)||0)||
      v18CrouchPose(clip,t,fighter)||v17Pose(clip,relative,t,fighter);
    if(expanded){
      if(attack)fighter._exactLastAttackPose=expanded;
      return expanded;
    }
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
    // The old fallback's character fills more of each crop than the new
    // navy sheets. Keep its visible body near 190px, not 208px, so hit
    // reactions and specials do not suddenly make Yusuke a giant.
    const scale=Math.min(.88,190/frame.h);
    return {image:atlas.image,frame,index,clip,scale,part:"exact",source:"user-reference",
      progress,frameCount:atlas.frameCount};
  }
  function draw(fighter,ctx,time,alpha,atlas,attackDuration){
    const selected=pose(fighter,atlas,attackDuration);
    if(!selected||!ctx?.drawImage)return false;
    const {image,frame,scale,clip,progress}=selected;
    // Measured once per actual RGBA cel. Locks family proportions, aligns
    // painted feet, and prevents different atlas gutters from lifting Yusuke.
    const continuity=root.MugenYusukeAnimationV28?.resolve(selected);
    const renderScale=continuity?.measured?continuity.scale:scale;
    const face=fighter.facing<0?-1:1;
    const t=Math.max(0,Number(fighter.stateTime)||0);
    const fwd=(Number(fighter.vx)||0)*face;
    const idle=(clip==="idle");
    // Tiny single-body pivots are applied continuously with the render tick.
    // Do NOT crossfade two full sprites; that makes giant overlapping ghosts.
    const lunge=attackClips[clip]?
      Math.sin(Math.PI*progress)*Math.min(6,Math.max(0,20*progress)):0;
    // V21 cels already contain the head/hip rise of a planted heel-toe gait.
    // Do not add a second synthetic bob that makes the feet skate.
    const bob=["movement-v21","movement-v22","movement-v22-generated"].includes(selected.source)?0:idle?
      Math.sin((time||0)*.005)*.7:clip==="forward"||clip==="retreat"?
      Math.sin(t*15)*1.15:0;
    const tilt=clip==="knockback" ? -.09 :
      clip==="stagger" ? -.04 :
      clip==="rush" && selected.source!=="movement-v24" ? .028 :
      clip==="backdash" ? -.035:0;
    // The fixed 60Hz simulation stores prevX/prevY each update, while the
    // canvas may paint between ticks. Interpolating the *one* sprite here
    // stops 120Hz displays showing doubled/stuttering movement positions.
    // Damage, physics, collision and R1 travel are never interpolated.
    const blend=Number.isFinite(alpha)?clamp(alpha,0,1):1;
    const worldX=Number(fighter.x)||0,worldY=Number(fighter.y)||0;
    const beforeX=Number.isFinite(fighter.prevX)?fighter.prevX:worldX;
    const beforeY=Number.isFinite(fighter.prevY)?fighter.prevY:worldY;
    const dx=beforeX+(worldX-beforeX)*blend+face*lunge+
      face*(continuity?.horizontalOffset||0);
    // Every V17 cel has a 12px transparent gutter below its foot pivot.
    // Offset once at draw time rather than shifting world physics / hitboxes.
    const legacyOffset=selected.source==="movement-v17"?12*scale:
      ["movement-v21","movement-v22","movement-v22-generated"].includes(selected.source)?8*scale:0;
    const dy=beforeY+(worldY-beforeY)*blend+bob+
      (continuity?.measured?continuity.footOffset:legacyOffset);
    ctx.save();
    ctx.translate(dx,dy);
    ctx.scale(face,1);
    if(tilt)ctx.rotate(tilt);
    // Every atlas is pixel art. Smooth scaling blurred the legacy fallback
    // precisely when transitioning into a newer crisp punch cel.
    ctx.imageSmoothingEnabled=false;
    if("imageSmoothingQuality" in ctx && ctx.imageSmoothingEnabled)ctx.imageSmoothingQuality="high";
    // This is the ONLY full-body Yusuke draw for each game frame.
    // V29 edits the actual attack/dash atlas pixels once, not the physics
    // sprite position or the hitbox. No extra composited ghost body.
    const art=root.MugenYusukeArtV29?.prepare(image,selected.source)||image;
    ctx.drawImage(art,frame.x,frame.y,frame.w,frame.h,
      -frame.ax*renderScale,-frame.h*renderScale,
      frame.w*renderScale,frame.h*renderScale);
    ctx.restore();
    return true;
  }
  function preloadForMatch(){
    if(typeof root.Image!=="function")return Promise.resolve([]);
    // Request the real authored assets *before* any button can start combat.
    // Previously the first Square/Triangle/R1 tap could begin with fallback
    // art and then morph into a newly loaded sheet in the SAME move.
    loadV17Movement();
    loadV22Walk();
    loadV24Dash();
    loadV25LightCombo();
    loadV26Heavy();
    loadV28Uppercut();
    loadV18Crouch();
    loadV19Jump();
    loadV23Guard();
    const essential=[
      V17_IDLE_SRC,V17_RUN_DASH_SRC,V22_WALK_SRC,V24_DASH_SRC,
      V25_LIGHT_COMBO_SRC,V26_HEAVY_SRC,V28_UPPERCUT_SRC
    ];
    return Promise.all(essential.map(src=>new Promise(resolve=>{
      const image=new root.Image();
      let finished=false;
      const finish=ok=>{
        if(finished)return;
        finished=true;
        if(timeout)root.clearTimeout(timeout);
        resolve({src,ok});
      };
      const timeout=typeof root.setTimeout==="function"?
        root.setTimeout(()=>finish(false),4500):null;
      image.onload=()=>finish(true);
      image.onerror=()=>finish(false);
      image.src=src;
    })));
  }
  root.MugenExactYusuke=Object.freeze({
    build,pose,draw,frames:FRAMES,walkIdleFrames:WALK_IDLE_FRAMES,
    walkIdleSource:WALK_IDLE_SRC,walkIdleStatus:()=>walkIdleStatus,
    attackClips,movementClips,preloadForMatch,
    sourceSize:Object.freeze([WIDTH,HEIGHT]),maximumHeight:MAX_RENDER_HEIGHT
  });
})(typeof window==="undefined"?globalThis:window);
