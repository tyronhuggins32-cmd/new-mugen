/* Mugen V28: one-body sprite continuity across Yusuke's mixed atlases.
 * Measures actual opaque silhouettes instead of using each atlas' padding.
 * No redraw, no crossfade/double bodies, no per-frame image allocations.
 */
(function(root){
  "use strict";
  const BUDGET_HEIGHT=208, STAND_HEIGHT=194;
  const bound=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const measured=new WeakMap();
  const scales=new WeakMap();
  // Visual transform only; no changes to the physics or hitboxes.
  const handoffs=new WeakMap();
  let scratch=null,reader=null;
  function bodyPixel(data,k){
    if(data[k+3]<145)return false;
    const r=data[k],g=data[k+1],b=data[k+2];
    // Colored Spirit effects, neon green auras and bright speed trails are
    // not part of the fighter silhouette when measuring body proportions.
    if((b>145&&g>108&&b>r*1.50&&g>r*1.36)||
       (g>176&&g>r*1.9&&g>b*1.40)||
       (r>187&&r>g*2.20&&r>b*2.0)||
       (r>225&&g>220&&b>210))return false;
    return true;
  }
  function getMetrics(image,frame){
    if(!image||!frame||!root.document?.createElement)return null;
    if(!Number.isFinite(frame.x)||!Number.isFinite(frame.y)||
       !Number.isInteger(frame.w)||!Number.isInteger(frame.h)||
       frame.w<=0||frame.h<=0)return null;
    let map=measured.get(image);
    if(!map){map=new Map();measured.set(image,map);}
    const key=[frame.x,frame.y,frame.w,frame.h].join(":");
    if(map.has(key))return map.get(key);
    try{
      if(!scratch){
        scratch=root.document.createElement("canvas");
        reader=scratch?.getContext?.("2d",{willReadFrequently:true});
      }
      if(!reader?.getImageData)return null;
      if(scratch.width!==frame.w)scratch.width=frame.w;
      if(scratch.height!==frame.h)scratch.height=frame.h;
      reader.imageSmoothingEnabled=false;
      reader.clearRect(0,0,frame.w,frame.h);
      reader.drawImage(image,frame.x,frame.y,frame.w,frame.h,
        0,0,frame.w,frame.h);
      const rgba=reader.getImageData(0,0,frame.w,frame.h).data;
      let top=frame.h,bottom=-1,left=frame.w,right=-1;
      const w=frame.w,h=frame.h;
      for(let y=0;y<h;y+=2){
        let hits=0,rowLeft=w,rowRight=-1;
        for(let x=0;x<w;x+=2){
          if(!bodyPixel(rgba,(y*w+x)*4))continue;
          hits++;rowLeft=Math.min(rowLeft,x);rowRight=Math.max(rowRight,x);
        }
        // Ignore lone sparkle pixels, speed streaks and antialias dust.
        if(hits>=4){
          top=Math.min(top,y);bottom=Math.max(bottom,y+1);
          left=Math.min(left,rowLeft);right=Math.max(right,rowRight);
        }
      }
      if(bottom<top){map.set(key,null);return null;}
      // Anchor on the torso, NOT a far-reaching punching fist or slash VFX.
      const midY0=top+Math.round((bottom-top)*.28);
      const midY1=top+Math.round((bottom-top)*.65);
      const anchor=Number.isFinite(frame.ax)?frame.ax:w/2;
      const torsoLo=bound(Math.floor(anchor-w*.27),0,w-1);
      const torsoHi=bound(Math.ceil(anchor+w*.27),1,w);
      let weight=0,totalX=0;
      for(let y=midY0;y<=midY1;y+=3){
        for(let x=torsoLo;x<torsoHi;x+=3){
          if(!bodyPixel(rgba,(y*w+x)*4))continue;
          weight++;totalX+=x;
        }
      }
      const metric=Object.freeze({
        top,bottom,left,right,
        height:bottom-top+1,
        bottomGap:Math.max(0,h-1-bottom),
        centerX:weight?totalX/weight:anchor
      });
      map.set(key,metric);
      return metric;
    }catch(_){
      // Tainted canvas / readback restrictions: safely preserve old art.
      map.set(key,null);
      return null;
    }
  }
  function family(clip){
    if(["crouch","crouchWalk","knockdown"].includes(clip))return "low";
    if(["jumpRise","jumpFall","landing"].includes(clip))return "air";
    if(["rush","backdash"].includes(clip))return "dash";
    return "ground";
  }
  function resolve(pose){
    const orig=Number(pose?.scale)||1;
    const fallback={scale:orig,footOffset:0,horizontalOffset:0,
      opaqueHeight:0,measured:false};
    if(!pose?.image||!pose.frame)return fallback;
    const m=getMetrics(pose.image,pose.frame);
    if(!m)return fallback;
    const kind=family(pose.clip),target=kind==="low"?170:
      kind==="dash"?190:kind==="air"?194:STAND_HEIGHT;
    let imageScales=scales.get(pose.image);
    if(!imageScales){imageScales=new Map();scales.set(pose.image,imageScales);}
    const key=String(pose.source||"unknown")+":"+kind;
    let base=imageScales.get(key);
    if(base===undefined){
      // A consistent size for the *whole sequence*, not a different scale
      // for every keyframe. Crouches intentionally stay shorter.
      // V35 Square art is authored on one consistent 320x256 cel grid.
      // Maintain one constant .96 body scale across *all* 30 punch poses.
      // Earlier per-family reduction from the opening jab made the final
      // guard frame 187px, recreating the exact shrink reported in the video.
      base=pose.source==="square-combo-v35"?orig:
        kind==="low"||kind==="dash"?orig:
        // Preserve crouch/dash compression while matching ALL standing
        // sources to ~194px even when original atlas art is smaller.
        bound(target/m.height,orig*.68,orig*1.55);
      imageScales.set(key,base);
    }
    // Unusually tall action smears may hit a safety cap, but never upscale
    // small compressed anticipation frames into bobbing giant sprites.
    let scale=Math.min(base,BUDGET_HEIGHT/m.height);
    // Verified regression: Square's fourth (uppercut) attack ended at
    // 174/181px before switching back to 196px idle. The last four authored
    // uppercut poses are a return-to-guard, not a crouch or wind-up. Normalize
    // ONLY those finishing cels to the canonical standing height. Preserve
    // the intentionally compressed anticipation and airborne impact poses.
    // Cached attackRecover reuses the same source cel and therefore inherits
    // the corrected size instead of flashing a smaller fighter.
    const isUpperRecovery=pose.source==="launcher-v28" &&
      Number.isFinite(pose.index) && pose.index>=8;
    if(isUpperRecovery){
      const recoveryHeight=194;
      const restore=recoveryHeight/m.height;
      scale=Math.min(BUDGET_HEIGHT/m.height,
        Math.max(scale,Math.min(orig*1.20,restore)));
    }
    // Finish all other authored ground attacks at the canonical standing
    // size. Fade the correction into the final quarter of the attack so a
    // smaller anticipation pose is not blown up into a giant sprite.
    const finishClip=["light","cross","body","upper","heavy","spiritPunch"]
      .includes(pose.clip) && pose.source!=="square-combo-v35";
    const finish=Number(pose.progress);
    if(finishClip && Number.isFinite(finish) && finish>.72){
      const weight=bound((finish-.72)/.24,0,1);
      const finalScale=bound(STAND_HEIGHT/m.height,
        orig*.7,Math.min(orig*1.26,BUDGET_HEIGHT/m.height));
      scale=Math.min(BUDGET_HEIGHT/m.height,
        scale+(finalScale-scale)*weight);
    }
    const offset=bound(m.bottomGap*scale,0,36);
    const stable=["idle","forward","retreat","sprint","guard",
      "guardRecover","turn","recovery","charge"].includes(pose.clip);
    const horizontalOffset=stable?
      bound((pose.frame.ax-m.centerX)*scale*.55,-8,8):0;
    return {scale,footOffset:offset,horizontalOffset,
      opaqueHeight:m.height*scale,measured:true};
  }
  // During grounded atlas handoffs, ease the body transform, not the art:
  // one sharp frame is painted at all times, never blended with another.
  function stabilize(fighter,pose,layout,clockMs){
    if(!fighter||!layout?.measured||!Number.isFinite(clockMs))return layout;
    const group=family(pose?.clip);
    let s=handoffs.get(fighter);
    if(!s){
      s={clip:pose.clip,source:pose.source,group,lastTime:clockMs,
        scale:layout.scale,x:layout.horizontalOffset,
        fromScale:layout.scale,fromX:layout.horizontalOffset,elapsed:1};
      handoffs.set(fighter,s);
      return layout;
    }
    const dt=bound((clockMs-s.lastTime)/1000,0,.05);
    if(s.clip!==pose.clip||s.source!==pose.source){
      s.fromScale=s.scale;s.fromX=s.x;
      s.elapsed=(s.group==="ground"&&group==="ground")?0:1;
      s.clip=pose.clip;s.source=pose.source;s.group=group;
    }else if(s.elapsed<1){
      s.elapsed=Math.min(1,s.elapsed+dt/.08);
    }
    const t=s.elapsed,weight=t*t*(3-2*t);
    s.scale=s.fromScale+(layout.scale-s.fromScale)*weight;
    s.x=s.fromX+(layout.horizontalOffset-s.fromX)*weight;
    s.lastTime=clockMs;
    const ratio=layout.scale>0?s.scale/layout.scale:1;
    return {...layout,scale:s.scale,footOffset:layout.footOffset*ratio,
      horizontalOffset:s.x};
  }
  root.MugenYusukeAnimationV28=Object.freeze({getMetrics,resolve,stabilize});
})(typeof window==="undefined"?globalThis:window);
