/* Yusuke Premium V6: consistent 16-pose, high-resolution fighting art.
 * Two optional source atlases with shared .5 draw scale, locked foot pivots.
 * Fallback art remains intact if either download fails.
 */
(function(root) {
  "use strict";
  function validate(data) {
    if (!data || ![2,3].includes(data.version)) throw Error("Premium sprite metadata version unsupported");
    for (const part of ["combat","movement"]) {
      const sh=data[part];
      if (!sh || sh.width!==2048 || sh.height!==1024 || sh.scale!==.5 ||
          !Array.isArray(sh.frames) || sh.frames.length!==8) {
        throw Error("Premium "+part+" atlas must have eight 2048x1024 pixel art cels");
      }
      sh.frames.forEach((f,i)=>{
        if (![f.x,f.y,f.w,f.h,f.ax].every(Number.isInteger) || f.w<=0 || f.h<=0
            || f.x<0 || f.y<0 || f.ax<0 || f.ax>f.w
            || f.x+f.w>sh.width || f.y+f.h>sh.height) {
          throw Error("Premium "+part+" frame "+i+" is outside its atlas");
        }
      });
    }
    return data;
  }

  function choosePose(fighter, attackType, meta, images, progress=0) {
    if (!fighter || !meta || !images?.combat?.naturalWidth
        || !images?.movement?.naturalWidth) return null;
    let kind="movement", id=0;
    const time=Math.max(0, fighter.stateTime || 0);
    const grounded=fighter.grounded;
    const p=Math.max(0,Math.min(1,progress));
    if (attackType) {
      kind="combat";
      switch(attackType) {
        case "light": id=p<.18?0:p<.77?1:5;break;
        case "cross": id=p<.16?0:p<.79?2:5;break;
        case "body": id=p<.13?0:p<.8?3:5;break;
        case "upper": id=p<.18?3:p<.8?4:5;break;
        case "heavy": id=p<.55?4:5;break;
        case "powerKick": id=p<.2?0:p<.84?7:5;break;
        case "gun": id=p<.16?0:p<.88?6:5;break;
        case "shotgun": id=p<.22?0:p<.82?2:5;break;
        default: id=1;break;
      }
    } else if (fighter.state === "hit") {
      kind="combat";id=5;
    } else if (fighter.state === "block") {
      kind="combat";id=0;
    } else if (fighter.state === "charge") {
      kind="combat";id=6;
    } else if (!grounded || fighter.state === "jump") {
      id=fighter.vy<0?5:6;
    } else if (fighter.state === "walk" || (fighter.dashTimer||0)>0) {
      const rapid=(fighter.dashTimer||0)>0 || Math.abs(fighter.vx||0)>390;
      const cycle=rapid ? [3,4] : [1,2];
      id=cycle[Math.floor(time*(rapid?13:9))%cycle.length];
    } else if (fighter.state === "crouch") {
      id=7;
    } else {
      id=time<.12 && fighter._yusukeMotion?.previousState==="walk" ? 7 : 0;
    }
    const sheet=meta[kind], frame=sheet?.frames?.[id];
    const image=images[kind];
    return frame ? {frame,image,scale:sheet.scale,source:"premium",part:kind,index:id} : null;
  }

  root.MugenPremium=Object.freeze({validate,choosePose});
})(typeof window==="undefined"?globalThis:window);
