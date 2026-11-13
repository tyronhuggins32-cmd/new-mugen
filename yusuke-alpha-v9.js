/* Yusuke alpha matte v9: repair transparent edge contamination once at load.
 * No filters on fighter draw calls, no palette recoloring, no CSS outline.
 * Restrict analysis to the 8 authored source cels on each premium sheet.
 * Preserve white eye glints and shirt highlights away from silhouette edges.
 */
(function(root){
  "use strict";
  const cache=new WeakMap();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function nearWhite(data,offset){
    const r=data[offset],g=data[offset+1],b=data[offset+2];
    return data[offset+3]>18 && r>220 && g>220 && b>220 &&
      Math.max(r,g,b)-Math.min(r,g,b)<34;
  }
  function nearMagenta(data,offset){
    const r=data[offset],g=data[offset+1],b=data[offset+2];
    return data[offset+3]>20 && r>150 && r>g*1.62 && b>g*1.35;
  }
  // Operates on a tight RGBA cel; no neighboring sprite can bleed into it.
  function cleanPixels(pixels,width,height){
    if(!pixels || !pixels.length || width<3 || height<3)return {
      whiteEdge:0,whiteGaps:0,magentaEdge:0,cutoff:0
    };
    const source=new Uint8ClampedArray(pixels);
    const stats={whiteEdge:0,whiteGaps:0,magentaEdge:0,cutoff:0};
    const get=(x,y)=>(y*width+x)*4;
    // First: matte edge contamination within two pixels of actual alpha zero.
    // A white pixel deeper inside the figure, such as an eye glint, is untouched.
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const p=get(x,y),a=source[p+3];
      if(a===0){pixels[p]=pixels[p+1]=pixels[p+2]=0;continue;}
      if(a<24){
        pixels[p]=pixels[p+1]=pixels[p+2]=pixels[p+3]=0;
        stats.cutoff++;continue;
      }
      const white=nearWhite(source,p),magenta=nearMagenta(source,p);
      if(!white && !magenta)continue;
      let border=false,best=-1,bestDist=999;
      for(let yy=Math.max(0,y-3);yy<=Math.min(height-1,y+3);yy++)
      for(let xx=Math.max(0,x-3);xx<=Math.min(width-1,x+3);xx++){
        const dist=Math.abs(xx-x)+Math.abs(yy-y);
        if(dist>4)continue;
        const q=get(xx,yy),qa=source[q+3];
        if(qa<24 && dist<=3)border=true;
        // Borrow a nearby *authentic non-white* silhouette color. This fixes
        // a baked white rim without punching holes in the shoulder/forearm.
        if(qa>170 && !nearWhite(source,q) && !nearMagenta(source,q) &&
          dist<bestDist && dist>0){best=q;bestDist=dist;}
      }
      if(!border)continue;
      if(best>=0){
        pixels[p]=source[best];pixels[p+1]=source[best+1];pixels[p+2]=source[best+2];
        pixels[p+3]=clamp(a,0,235);
      }else{
        pixels[p]=pixels[p+1]=pixels[p+2]=pixels[p+3]=0;
      }
      if(white)stats.whiteEdge++;else stats.magentaEdge++;
    }

    // Second: white islands completely enclosed by opaque, consistently
    // colored clothing. Large white generator gaps are filled from the
    // enclosing fabric; small bright details (eyes, teeth, buttons) survive.
    const seen=new Uint8Array(width*height);
    const queue=new Int32Array(width*height);
    const directions=[[0,-1],[0,1],[-1,0],[1,0]];
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const start=y*width+x,point=start*4;
      if(seen[start] || !nearWhite(source,point) || source[point+3]<180)continue;
      let count=0,head=0,touchesEdge=false;
      const neighbors=[];
      queue[count++]=start;seen[start]=1;
      while(head<count && count<=3000){
        const cell=queue[head++],cx=cell%width,cy=Math.floor(cell/width);
        if(cx<3 || cy<3 || cx>=width-3 || cy>=height-3)touchesEdge=true;
        for(const [dx,dy] of directions){
          const nx=cx+dx,ny=cy+dy;
          if(nx<0||ny<0||nx>=width||ny>=height){touchesEdge=true;continue;}
          const n=ny*width+nx,np=n*4;
          if(nearWhite(source,np) && source[np+3]>=180){
            if(!seen[n]){seen[n]=1;queue[count++]=n;}
          }else if(source[np+3]>=235 && !nearMagenta(source,np)){
            neighbors.push(np);
          }else if(source[np+3]<50)touchesEdge=true;
        }
      }
      // The palette of the entire edge should agree. Do not flatten hair
      // reflections or white eye details across multiple anatomical colors.
      if(count<18||count>3000||touchesEdge||neighbors.length<12)continue;
      let rr=0,gg=0,bb=0;
      for(const np of neighbors){rr+=source[np];gg+=source[np+1];bb+=source[np+2];}
      rr=Math.round(rr/neighbors.length);
      gg=Math.round(gg/neighbors.length);
      bb=Math.round(bb/neighbors.length);
      let variance=0;
      for(const np of neighbors){
        variance+=Math.abs(source[np]-rr)+Math.abs(source[np+1]-gg)+Math.abs(source[np+2]-bb);
      }
      if(variance/neighbors.length>95)continue;
      for(let i=0;i<count;i++){
        const p=queue[i]*4;
        pixels[p]=rr;pixels[p+1]=gg;pixels[p+2]=bb;
        pixels[p+3]=255;
      }
      stats.whiteGaps+=count;
    }
    return stats;
  }
  function prepare(image,frames){
    if(!image?.naturalWidth || !image?.naturalHeight || !frames?.length ||
      typeof document==="undefined" || !document.createElement)return image;
    if(cache.has(image))return cache.get(image);
    try{
      const canvas=document.createElement("canvas");
      canvas.width=image.naturalWidth;
      canvas.height=image.naturalHeight;
      const ctx=canvas.getContext("2d",{alpha:true,willReadFrequently:true});
      if(!ctx || !ctx.getImageData || !ctx.putImageData)return image;
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(image,0,0);
      let edges=0,gaps=0;
      for(const f of frames){
        if(f.x<0||f.y<0||f.x+f.w>canvas.width||f.y+f.h>canvas.height)continue;
        const cel=ctx.getImageData(f.x,f.y,f.w,f.h);
        const stats=cleanPixels(cel.data,f.w,f.h);
        edges+=stats.whiteEdge+stats.magentaEdge;
        gaps+=stats.whiteGaps;
        ctx.putImageData(cel,f.x,f.y);
      }
      cache.set(image,canvas);
      return canvas;
    }catch(_){
      // Canvas security or memory restrictions should never block combat.
      cache.set(image,image);return image;
    }
  }
  root.MugenAlphaMatte=Object.freeze({cleanPixels,prepare});
})(typeof window==="undefined"?globalThis:window);
