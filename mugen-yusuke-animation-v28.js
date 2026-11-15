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
  let scratch=null,reader=null;
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
          if(rgba[(y*w+x)*4+3]<145)continue;
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
          if(rgba[(y*w+x)*4+3]<145)continue;
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
      base=kind==="low"?orig:
        bound(Math.min(orig,target/m.height),orig*.72,orig);
      imageScales.set(key,base);
    }
    // Unusually tall action smears may hit a safety cap, but never upscale
    // small compressed anticipation frames into bobbing giant sprites.
    const scale=Math.min(base,BUDGET_HEIGHT/m.height);
    const offset=bound(m.bottomGap*scale,0,36);
    const stable=["idle","forward","retreat","sprint","guard",
      "guardRecover","turn","recovery","charge"].includes(pose.clip);
    const horizontalOffset=stable?
      bound((pose.frame.ax-m.centerX)*scale*.55,-8,8):0;
    return {scale,footOffset:offset,horizontalOffset,
      opaqueHeight:m.height*scale,measured:true};
  }
  root.MugenYusukeAnimationV28=Object.freeze({getMetrics,resolve});
})(typeof window==="undefined"?globalThis:window);
