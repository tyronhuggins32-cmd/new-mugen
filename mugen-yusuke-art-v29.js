/* Yusuke Art V29: correct actual RGBA source artwork, not fighter physics.
 * Source images remain unchanged in Git; processed atlases are cached once.
 * This removes AI-generated white/red fringe pixels at silhouette edges
 * and brings navy/yellow shading into a more consistent display palette.
 */
(function(root){
  "use strict";
  const cache=new WeakMap();
  const reports=new WeakMap();
  const targets=new Set([
    "light-combo-v25","heavy-triangle-v26","movement-v24",
    "movement-v17","launcher-v28","dodge-v24","guard-v23",
    "spirit-punch-v30"
  ]);
  const clamp=x=>Math.max(0,Math.min(255,Math.round(x)));
  function normalize(data,w,h){
    const original=new Uint8ClampedArray(data);
    let removedPale=0,removedRed=0,navyAdjusted=0,yellowAdjusted=0;
    const pale=(r,g,b)=>r>=179&&g>=179&&b>=179&&
      Math.max(r,g,b)-Math.min(r,g,b)<49;
    const red=(r,g,b)=>r>=155&&r>g*1.74&&r>b*1.74&&
      g<128&&b<138;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const k=(y*w+x)*4;
        const alpha=original[k+3];
        if(alpha<30)continue;
        const r=original[k],g=original[k+1],b=original[k+2];
        const whiteRim=pale(r,g,b);
        const redRim=red(r,g,b);
        if(whiteRim||redRim){
          // Require transparent environment near the candidate pixel.
          // Interior white eyes, glove highlights and Spirit Gun flashes
          // are not discarded merely for being light-colored.
          let gaps=0;
          for(const [dx,dy] of [[-2,0],[2,0],[0,-2],[0,2],
            [-1,-1],[-1,1],[1,-1],[1,1]]){
            const xx=x+dx,yy=y+dy;
            if(xx<0||xx>=w||yy<0||yy>=h ||
               original[(yy*w+xx)*4+3]<24)gaps++;
          }
          if(gaps>=2){
            data[k+3]=0;
            data[k]=data[k+1]=data[k+2]=0;
            if(whiteRim)removedPale++;
            else removedRed++;
            continue;
          }
        }
        // Keep the source's per-pixel shading, only temper the strongest
        // off-model pants and shirt tints. Never change skin or green cuffs.
        const navy=b>r*1.37&&b>g*1.17&&b>45&&b<201&&
          r<125&&g<140;
        if(navy){
          data[k]=clamp(r*.95+2);
          data[k+1]=clamp(g*.98+1);
          data[k+2]=clamp(b*.99);
          navyAdjusted++;
        }else if(r>135&&g>93&&b<135&&r>g*1.06&&
                 g>b*1.51 && r/g<1.85){
          data[k]=clamp(r*.985+2);
          data[k+1]=clamp(g*1.012);
          data[k+2]=clamp(b*.96);
          yellowAdjusted++;
        }
      }
    }
    return {removedPale,removedRed,navyAdjusted,yellowAdjusted};
  }
  function prepare(img,source){
    if(!img||!targets.has(source)||!root.document?.createElement)return img;
    if(cache.has(img))return cache.get(img);
    const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
    if(!w||!h||w>4096||h>4096)return img;
    try{
      const canvas=root.document.createElement("canvas");
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext("2d",{willReadFrequently:true,alpha:true});
      if(!ctx?.getImageData||!ctx?.putImageData)return img;
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(img,0,0);
      const pixels=ctx.getImageData(0,0,w,h);
      const stats=normalize(pixels.data,w,h);
      ctx.putImageData(pixels,0,0);
      cache.set(img,canvas);cache.set(canvas,canvas);
      reports.set(img,stats);reports.set(canvas,stats);
      return canvas;
    }catch(_){
      // Browsers without readable canvas must still render the fighter.
      cache.set(img,img);
      return img;
    }
  }
  root.MugenYusukeArtV29=Object.freeze({
    prepare,normalize,stats:img=>reports.get(img)||null
  });
})(typeof window==="undefined"?globalThis:window);
