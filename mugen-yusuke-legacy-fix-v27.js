/* Yusuke V27: normalize the old 16-pose green-pants/white-shoe fallback.
 * All newer navy-pants atlases are left byte-for-byte untouched.
 * Cached once per source image, preserving alpha and pixel-art edges.
 */
(function(root){
  "use strict";
  const cache=new WeakMap();
  const clamp=(n,a=0,b=255)=>Math.max(a,Math.min(b,Math.round(n)));
  function recolor(data,width,height){
    let pants=0,shoes=0;
    // The original reference is a 4x4 grid of 384x256 sprites.
    // Color classification is restricted to the LOWER HALF of each cel,
    // protecting teal hair, green wristbands, yellow shirt and skin.
    for(let y=0;y<height;y++){
      const localY=y%256;
      if(localY<120)continue;
      for(let x=0;x<width;x++){
        const i=(y*width+x)*4;
        if(data[i+3]<45)continue;
        const r=data[i],g=data[i+1],b=data[i+2];
        // Original trousers are green. Blue/navy pixels and the yellow
        // shirt cannot enter this branch. Keep source shadow intensity.
        if(localY<247 && g>22 && g>r*1.12 && g>b*.92 &&
           r<145 && g<200 && (g-r>7 || g-b>7)){
          data[i]=clamp(g*.29+5);
          data[i+1]=clamp(g*.43+10);
          data[i+2]=clamp(g*.86+21);
          pants++;
        }else if(localY>=214 && localY<=255 &&
          r>148 && g>148 && b>148 &&
          Math.max(r,g,b)-Math.min(r,g,b)<27){
          // The old reference has bright white footwear; all new movement
          // and attack sheets have dark shoes. Only recolor neutral whites
          // on the foot line, never white eyes or upper-body highlights.
          const shade=(r+g+b)/3;
          data[i]=clamp(shade*.16);
          data[i+1]=clamp(shade*.17);
          data[i+2]=clamp(shade*.25);
          shoes++;
        }
      }
    }
    return {pants,shoes};
  }
  function prepare(image){
    if(!image)return image;
    if(cache.has(image))return cache.get(image);
    const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
    if(w!==1536 || h!==1024 || !root.document?.createElement)return image;
    try{
      const canvas=root.document.createElement("canvas");
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext("2d",{alpha:true,willReadFrequently:true});
      if(!ctx?.getImageData||!ctx?.putImageData)return image;
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(image,0,0);
      const pixels=ctx.getImageData(0,0,w,h);
      recolor(pixels.data,w,h);
      ctx.putImageData(pixels,0,0);
      cache.set(image,canvas);
      return canvas;
    }catch(_){
      // Canvas readback can be unavailable in hardened browsers.
      // Original sprites remain playable instead of disappearing.
      cache.set(image,image);
      return image;
    }
  }
  root.MugenLegacyYusukeV27=Object.freeze({recolor,prepare});
})(typeof window==="undefined"?globalThis:window);
