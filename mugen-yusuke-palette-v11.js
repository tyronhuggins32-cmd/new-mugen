/* Yusuke V11: shared costume/hair palette and bounded sprite dimensions.
 * Applies once per source sheet BEFORE building directional/Square cels.
 * Retains pixel shading, alpha, eye highlights, clothing seams and pivots.
 * No repainting, white halos or expensive per-frame tint/shader.
 */
(function(root) {
  "use strict";
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const master=Object.freeze({
    // Main roster art palette: ink-dark navy hair, gold-green shirt,
    // warm skin, blue trousers and muted cyan wrist detail.
    hair:Object.freeze({h:.638,s:.28,v:.21}),
    shirt:Object.freeze({h:30/255,s:172/255,v:246/255}),
    skin:Object.freeze({h:20/255,s:151/255,v:215/255}),
    pants:Object.freeze({h:157/255,s:160/255,v:87/255}),
    wrist:Object.freeze({h:135/255,s:121/255,v:72/255})
  });
  const prepared=new WeakMap(),boundsCache=new WeakMap();
  function hsv(r,g,b){
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    let h=0;
    if(delta>0){
      if(max===r)h=(((g-b)/delta)%6)/6;
      else if(max===g)h=((b-r)/delta+2)/6;
      else h=((r-g)/delta+4)/6;
    }
    if(h<0)h++;
    return {h,s:max===0?0:delta/max,v:max};
  }
  function rgb(h,s,v){
    h=((h%1)+1)%1;s=clamp(s);v=clamp(v);
    const chroma=v*s,where=h*6;
    const x=chroma*(1-Math.abs(where%2-1)),m=v-chroma;
    const colors=where<1?[chroma,x,0]:where<2?[x,chroma,0]
      :where<3?[0,chroma,x]:where<4?[0,x,chroma]
      :where<5?[x,0,chroma]:[chroma,0,x];
    return colors.map(c=>Math.round(clamp(c+m)*255));
  }
  // Geometry prevents yellow skin/eyes from being mapped onto shirt fabric.
  function material(r,g,b,relativeY){
    const col=hsv(r,g,b);
    if(relativeY<.39 && col.v>=.055 && col.v<.48 &&
      (col.s<.57 || col.h>.48 && col.h<.80))return "hair";
    if(relativeY>.33 && relativeY<.90 && col.h>.092 && col.h<.215 &&
      col.s>.22 && col.v>.22)return "shirt";
    if(col.h>.021 && col.h<=.092 && col.s>.20 && col.v>.24)return "skin";
    if(relativeY>.37 && col.h>.52 && col.h<.80 &&
      col.s>.16 && col.v>.08)return "pants";
    if(relativeY>.27 && col.h>.30 && col.h<.56 &&
      col.s>.20 && col.v>.09)return "wrist";
    return null;
  }
  function recolor(data,w,h){
    const counts={hair:0,shirt:0,skin:0,pants:0,wrist:0};
    const median={};
    const bins={};
    for(const k of Object.keys(counts))bins[k]={s:new Uint32Array(64),v:new Uint32Array(64)};
    // Estimate each cel's exposure separately; shadows/texture stay intact.
    for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){
      const off=(y*w+x)*4;
      if(data[off+3]<160)continue;
      const k=material(data[off],data[off+1],data[off+2],y/h);
      if(!k)continue;
      const p=hsv(data[off],data[off+1],data[off+2]);
      bins[k].s[Math.min(63,Math.floor(p.s*63))]++;
      bins[k].v[Math.min(63,Math.floor(p.v*63))]++;
      counts[k]++;
    }
    function midpoint(hist,count){
      if(!count)return .5;
      let n=0;
      for(let i=0;i<64;i++){n+=hist[i];if(n>=count/2)return (i+.5)/64;}
      return .5;
    }
    for(const k of Object.keys(counts)){
      median[k]={
        s:midpoint(bins[k].s,counts[k]),
        v:midpoint(bins[k].v,counts[k])
      };
    }
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const off=(y*w+x)*4,alpha=data[off+3];
      if(alpha<64)continue;
      const k=material(data[off],data[off+1],data[off+2],y/h);
      if(!k)continue;
      const base=master[k],source=hsv(data[off],data[off+1],data[off+2]);
      // Small per-cel neutralization only. Never bleach a painted shadow.
      const exposure=k==="hair"?1:clamp(base.v/Math.max(.13,median[k].v),.88,1.13);
      const saturation=k==="hair" ? base.s :
        clamp(source.s*clamp(base.s/Math.max(.08,median[k].s),.80,1.15));
      const v=clamp(source.v*exposure,0,1);
      const [r,g,b]=rgb(base.h,saturation,v);
      data[off]=r;data[off+1]=g;data[off+2]=b;
      // Crucial: leave alpha unchanged, including transparent antialiasing.
    }
    return counts;
  }
  function valid(image){return image &&
    (image.naturalWidth||image.width)>0&&(image.naturalHeight||image.height)>0;}
  function makeCanvas(image){
    if(typeof document==="undefined"||!document.createElement||!valid(image))return null;
    const canvas=document.createElement("canvas");
    canvas.width=image.naturalWidth||image.width;
    canvas.height=image.naturalHeight||image.height;
    const ctx=canvas.getContext("2d",{alpha:true,willReadFrequently:true});
    if(!ctx?.getImageData||!ctx?.putImageData)return null;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,0,0);
    return {canvas,ctx};
  }
  function prepare(image,frames){
    if(!valid(image)||!Array.isArray(frames)||!frames.length)return image;
    if(prepared.has(image))return prepared.get(image);
    try{
      const result=makeCanvas(image);
      if(!result)return image;
      const {canvas,ctx}=result;
      for(const frame of frames){
        const {x,y,w,h}=frame;
        if(!Number.isInteger(x)||!Number.isInteger(y)||
          !Number.isInteger(w)||!Number.isInteger(h)||w<=0||h<=0||
          x<0||y<0||x+w>canvas.width||y+h>canvas.height)continue;
        const cel=ctx.getImageData(x,y,w,h);
        recolor(cel.data,w,h);
        ctx.putImageData(cel,x,y);
      }
      prepared.set(image,canvas);
      return canvas;
    }catch(_){prepared.set(image,image);return image;}
  }
  // Check the opaque height once per source frame. Metadata cels often have
  // 30-100px of transparent padding. Their *visible* silhouette is what matters.
  function visibleHeight(image,frame){
    if(!valid(image)||!frame||typeof document==="undefined")return frame?.h||0;
    let seen=boundsCache.get(image);
    if(!seen){seen=new Map();boundsCache.set(image,seen);}
    const key=[frame.x,frame.y,frame.w,frame.h].join(":");
    if(seen.has(key))return seen.get(key);
    let height=frame.h;
    try{
      const result=makeCanvas(image);
      const ctx=result?.ctx;
      if(ctx){
        const src=ctx.getImageData(frame.x,frame.y,frame.w,frame.h).data;
        let top=frame.h,bottom=-1;
        // Sparse scan is sufficient for body size without measuring one-pixel
        // motion trails. Require at least three opaque pixels per scan row.
        for(let y=0;y<frame.h;y+=2){
          let found=0;
          for(let x=1;x<frame.w;x+=3){
            if(src[(y*frame.w+x)*4+3]>115 && ++found>=3)break;
          }
          if(found>=3){top=Math.min(top,y);bottom=Math.max(bottom,y);}
        }
        if(bottom>=top)height=bottom-top+2;
      }
    }catch(_){/* Image remains playable without canvas readback. */}
    seen.set(key,height);
    return height;
  }
  function fitScale(image,frame,requested,maxVisible=220){
    if(!frame||!Number.isFinite(requested)||requested<=0)return requested;
    const visible=visibleHeight(image,frame);
    if(!visible)return requested;
    // Premium source frames are ~200px high at .5 render scale.
    // An old hit/combo fallback cannot suddenly become a 300px giant.
    return Math.min(requested,maxVisible/visible);
  }
  root.MugenYusukePalette=Object.freeze({
    master,hsv,rgb,material,recolor,prepare,visibleHeight,fitScale
  });
})(typeof window==="undefined"?globalThis:window);
