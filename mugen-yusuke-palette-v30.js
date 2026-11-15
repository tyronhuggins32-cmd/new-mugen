/* V30: a single canonical color library learned from Yusuke's authored idle PNG.
 * Core material pixels in every atlas use color values drawn from THAT source,
 * not a different hand-tuned filter for each combat sheet.
 *
 * Skin, shirt yellow, wristband green, pants navy, and teal hair have separate
 * palettes. No global tint, no alpha edits, no crossfades, no VFX recoloring.
 * Calibrate once after preload, then cache each normalized sheet.
 */
(function(root){
  "use strict";
  const kinds=["navy","green","yellow","skin","teal"];
  const palettes=new Map(),normalized=new WeakMap(),reports=new WeakMap();
  const shadeCache=new Map(); // Identical input shades share one nearest-palette lookup.
  let reference=null;
  function category(r,g,b){
    // Order matters: classify the clothing blues before dark hair highlights.
    if(b>46 && b<224 && r<137 && g<153 &&
       b>r*1.40 && b>g*1.14 && g>r*.65)return "navy";
    if(g>37 && g<180 && r<126 && b<145 &&
       g>r*1.27 && g>b*1.12)return "green";
    if(r>142 && g>96 && b<158 && r>g*1.045 &&
       r<g*1.48 && g>b*1.42)return "yellow";
    if(r>98 && g>45 && b<177 && r>g*1.19 &&
       g>b*1.12 && r<254)return "skin";
    if(r<102 && g>32 && g<157 && b>32 && b<175 &&
       g>r*1.18 && b>r*1.35 && b>=g*.62)return "teal";
    return null;
  }
  function luminance(r,g,b){return r*.2126+g*.7152+b*.0722;}
  function fromReference(img){
    if(!root.document?.createElement)return false;
    const w=img?.naturalWidth||img?.width,h=img?.naturalHeight||img?.height;
    if(!w||!h)return false;
    try{
      const cv=root.document.createElement("canvas");
      cv.width=w;cv.height=h;
      const ctx=cv.getContext("2d",{willReadFrequently:true});
      if(!ctx?.getImageData)return false;
      ctx.drawImage(img,0,0);
      const d=ctx.getImageData(0,0,w,h).data;
      const groups=new Map(kinds.map(k=>[k,new Map()]));
      for(let i=0;i<d.length;i+=4){
        if(d[i+3]<225)continue;
        const r=d[i],g=d[i+1],b=d[i+2];
        const k=category(r,g,b);if(!k)continue;
        const quant=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
        const hist=groups.get(k);
        const hit=hist.get(quant);
        if(hit){hit.count++;hit.r+=r;hit.g+=g;hit.b+=b;}
        else hist.set(quant,{count:1,r,g,b});
      }
      const built=new Map();
      for(const [name,hist] of groups){
        const entries=[...hist.values()].filter(v=>v.count>=3)
          .map(v=>({
            r:Math.round(v.r/v.count),g:Math.round(v.g/v.count),
            b:Math.round(v.b/v.count),count:v.count
          })).sort((a,b)=>b.count-a.count);
        // Popular samples preserve the original palette's main shades.
        // Brightness extrema preserve deeper outlines and warm highlights.
        const frequent=entries.slice(0,18);
        const byLum=entries.slice().sort((a,b)=>
          luminance(a.r,a.g,a.b)-luminance(b.r,b.g,b.b));
        for(const idx of [0,Math.floor(byLum.length*.18),
          Math.floor(byLum.length*.82),byLum.length-1]){
          const entry=byLum[idx];
          if(entry&&!frequent.includes(entry))frequent.push(entry);
        }
        if(frequent.length<3)return false;
        built.set(name,frequent.map(v=>Object.freeze([v.r,v.g,v.b])));
      }
      palettes.clear();shadeCache.clear();
      for(const [k,v] of built)palettes.set(k,Object.freeze(v));
      reference=img;
      return true;
    }catch(_){return false;}
  }
  function prepare(image){
    if(!image||!reference||!root.document?.createElement)return image;
    if(normalized.has(image))return normalized.get(image);
    const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
    if(!w||!h||w>4096||h>4096)return image;
    try{
      const cv=root.document.createElement("canvas");
      cv.width=w;cv.height=h;
      const ctx=cv.getContext("2d",{willReadFrequently:true});
      if(!ctx?.getImageData||!ctx?.putImageData)return image;
      ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0);
      const pixels=ctx.getImageData(0,0,w,h),d=pixels.data;
      const counts=Object.fromEntries(kinds.map(k=>[k,0]));
      let changed=0;
      for(let i=0;i<d.length;i+=4){
        if(d[i+3]<24)continue;
        const r=d[i],g=d[i+1],b=d[i+2],type=category(r,g,b);
        if(!type)continue;
        const palette=palettes.get(type);
        if(!palette?.length)continue;
        const shade=(r<<16)|(g<<8)|b;
        let best=shadeCache.get(shade);
        if(!best){
          let distance=Infinity;
          for(const rgb of palette){
            const dr=r-rgb[0],dg=g-rgb[1],db=b-rgb[2];
            const score=dr*dr*.9+dg*dg*1.25+db*db*.85;
            if(score<distance){distance=score;best=rgb;}
          }
          if(best)shadeCache.set(shade,best);
        }
        if(!best)continue;
        counts[type]++;
        if(r!==best[0]||g!==best[1]||b!==best[2]){
          d[i]=best[0];d[i+1]=best[1];d[i+2]=best[2];changed++;
        }
      }
      ctx.putImageData(pixels,0,0);
      const info=Object.freeze({changed,counts,referenceColors:
        Object.fromEntries([...palettes].map(([k,v])=>[k,v.length]))});
      normalized.set(image,cv);normalized.set(cv,cv);
      reports.set(image,info);reports.set(cv,info);
      return cv;
    }catch(_){
      normalized.set(image,image);
      return image;
    }
  }
  function resetReference(image){return fromReference(image);}
  root.MugenYusukePaletteV30=Object.freeze({
    setReference:resetReference,prepare,
    isReady:()=>!!reference,
    getPalette:()=>Object.fromEntries([...palettes].map(([k,v])=>[k,v.map(c=>c.slice())])),
    getReport:image=>reports.get(image)||null,
    category
  });
})(typeof window==="undefined"?globalThis:window);
