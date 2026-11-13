/* Yusuke V9 alpha-edge repair.
 * Fix imported white-matte halos and 1px contour pinholes conservatively,
 * without erasing eyes, shirt highlights, or intentional opaque white art.
 * Work only inside metadata-defined sprite rectangles; transparent canvas
 * is never globally recolored and repair runs once per source texture.
 */
(function(root){
 "use strict";
 const prepared=new WeakMap();
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function usable(image){return image && (image.naturalWidth||image.width)>0 && (image.naturalHeight||image.height)>0;}
 function prepare(image,metadata){
  if(!usable(image)||!metadata?.frames?.length||typeof document==="undefined")return image;
  if(prepared.has(image))return prepared.get(image);
  try{
   const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
   const canvas=document.createElement("canvas");
   canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext("2d",{alpha:true,willReadFrequently:true});
   if(!ctx)return image;
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(image,0,0);
   const bitmap=ctx.getImageData(0,0,width,height),src=bitmap.data;
   // Read from a separate snapshot so an adjusted pixel cannot cascade
   // into adjacent details. Only pixels with an unmistakable white matte
   // signature AND a nearby transparent silhouette boundary are candidates.
   const original=new Uint8ClampedArray(src),within=(x,y,f)=>
     x>=f.x&&x<f.x+f.w&&y>=f.y&&y<f.y+f.h;
   let fringe=0,pinholes=0;
   for(const f of metadata.frames){
    if(![f.x,f.y,f.w,f.h].every(Number.isInteger)||f.w<=0||f.h<=0||
      f.x<0||f.y<0||f.x+f.w>width||f.y+f.h>height)continue;
    for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++){
     const i=(y*width+x)*4,alpha=original[i+3];
     if(alpha===0)continue;
     const r=original[i],g=original[i+1],b=original[i+2];
     const pale=Math.min(r,g,b)>=205 && Math.max(r,g,b)-Math.min(r,g,b)<37;
     if(!pale)continue;
     let transparent=0,colored=0,cR=0,cG=0,cB=0;
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;
      const nx=x+dx,ny=y+dy;
      if(!within(nx,ny,f))continue;
      const n=(ny*width+nx)*4;
      if(original[n+3]<60)transparent++;
      else if(original[n+3]>=210 && (Math.min(original[n],original[n+1],original[n+2])<175)){
       colored++;cR+=original[n];cG+=original[n+1];cB+=original[n+2];
      }
     }
     // Opaque stray white fringe at the actual outline. Leave opaque bright
     // pixels inside the silhouette untouched so eyes and accents survive.
     if(alpha>=235 && r>=239&&g>=239&&b>=239&&transparent>=2){
      src[i]=0;src[i+1]=0;src[i+2]=0;src[i+3]=0;
      fringe++;
     }else if(alpha<235 && transparent>0 && colored>=1){
      // Edge contamination at fractional transparency. Back-fill RGB from
      // actual opaque neighboring sprite pixels to avoid white interpolation.
      src[i]=Math.round(cR/colored);
      src[i+1]=Math.round(cG/colored);
      src[i+2]=Math.round(cB/colored);
      src[i+3]=alpha<80?0:Math.round(alpha*.72);
      fringe++;
     }else if(alpha>=235 && r>=247&&g>=247&&b>=247 &&
       transparent===0 && colored>=7){
      // A one-pixel fully enclosed white pinhole (not larger white artwork).
      src[i]=Math.round(cR/colored);src[i+1]=Math.round(cG/colored);
      src[i+2]=Math.round(cB/colored);pinholes++;
     }
    }
   }
   if(fringe||pinholes)ctx.putImageData(bitmap,0,0);
   canvas._mugenAlphaRepair={fringe,pinholes};
   prepared.set(image,canvas);
   return canvas;
  }catch(_){return image;} // old canvas, tainted PNG, or memory pressure
 }
 root.MugenArtCleanup=Object.freeze({prepare});
})(typeof window==="undefined"?globalThis:window);
