/* Yusuke V37 authored damage reactions. 8 stagger, 8 flight, 10 knockdown
 * frames. A single full-body texture is drawn per frame. Uses the same
 * transparent/colored idle reference as the attack and movement atlases.
 */
(function(root){
 "use strict";
 const definitions=Object.freeze({
   stagger:{src:"characters/yusuke/yusuke_hurt_stagger_v37_8frames.png",
     width:1774,height:887,cols:4,rows:2,frames:8,scale:.45},
   knockback:{src:"characters/yusuke/yusuke_knockback_v37_8frames_raw.png",
     width:1774,height:887,cols:4,rows:2,frames:8,scale:.45,cleanWhite:true},
   knockdown:{src:"characters/yusuke/yusuke_knockdown_v37_10frames.png",
     width:1983,height:793,cols:5,rows:2,frames:10,scale:.53}
 });
 const images=new Map();
 const promises=new Map();
 const statuses=new Map();
 function isBackground(data,i){
   const r=data[i],g=data[i+1],b=data[i+2];
   return r>=172 && g>=172 && b>=172 &&
     Math.max(r,g,b)-Math.min(r,g,b)<43;
 }
 function removeBackground(image,w,h){
   if(!root.document?.createElement)return null;
   try{
     const canvas=root.document.createElement("canvas");
     canvas.width=w;canvas.height=h;
     const ctx=canvas.getContext("2d",{willReadFrequently:true,alpha:true});
     if(!ctx?.getImageData||!ctx?.putImageData)return null;
     ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0);
     const pixels=ctx.getImageData(0,0,w,h),data=pixels.data,n=w*h;
     const flagged=new Uint8Array(n),queue=new Int32Array(n);
     let front=0,back=0;
     const visit=index=>{
       if(flagged[index])return;
       const offset=index*4;
       if(!isBackground(data,offset))return;
       flagged[index]=1;queue[back++]=index;
     };
     for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}
     for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
     while(front<back){
       const at=queue[front++],x=at%w;
       if(x>0)visit(at-1);
       if(x<w-1)visit(at+1);
       if(at>=w)visit(at-w);
       if(at<n-w)visit(at+w);
     }
     if(back<n*.08)return null; // don't destroy real artwork by mistake
     for(let i=0;i<n;i++)if(flagged[i]){
       const o=i*4;
       data[o]=data[o+1]=data[o+2]=data[o+3]=0;
     }
     // Fade the immediately adjacent bright anti-aliased edge so the white
     // backdrop cannot appear as a visible 1px rectangle around the figure.
     for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
       const i=y*w+x;
       if(flagged[i])continue;
       const o=i*4;
       const touches=flagged[i-1]||flagged[i+1]||
         flagged[i-w]||flagged[i+w];
       if(touches && isBackground(data,o))data[o+3]=Math.min(data[o+3],24);
     }
     ctx.putImageData(pixels,0,0);
     return canvas;
   }catch(_){return null;}
 }
 function load(kind){
   if(promises.has(kind))return promises.get(kind);
   const cfg=definitions[kind];
   if(!cfg)return Promise.resolve(false);
   if(typeof root.Image!=="function")return Promise.resolve(false);
   statuses.set(kind,"loading");
   const promise=new Promise(resolve=>{
     const img=new root.Image();img.decoding="async";
     img.onload=()=>{
       const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
       if(w!==cfg.width||h!==cfg.height){
         statuses.set(kind,"invalid");resolve(false);return;
       }
       const cleaned=cfg.cleanWhite?removeBackground(img,w,h):img;
       // A raw opaque white atlas is NOT a usable gameplay fallback.
       if(cfg.cleanWhite && !cleaned){
         statuses.set(kind,"background-cleanup-failed");resolve(false);return;
       }
       images.set(kind,cleaned);
       statuses.set(kind,"ready");resolve(true);
     };
     img.onerror=()=>{statuses.set(kind,"missing");resolve(false);};
     img.src=cfg.src;
   });
   promises.set(kind,promise);
   return promise;
 }
 async function preload(){
   const results=await Promise.all(Object.keys(definitions).map(k=>load(k)));
   return results.every(Boolean);
 }
 function primePalette(){
   const palette=root.MugenYusukePaletteV30;
   for(const [kind,img] of images){
     const converted=palette?.prepare(img)||img;
     images.set(kind,converted);
   }
 }
 function pose(fighter,clip){
   const phase=clip==="recovery"?"stagger":clip;
   const kind=definitions[phase]?phase:null;
   if(!kind)return null;
   const img=images.get(kind);
   if(!img)return null;
   const cfg=definitions[kind];
   const duration=Math.max(.12,Number(fighter._reactionDuration)||
     (kind==="knockdown"?.56:kind==="knockback"?.48:.32));
   const t=clip==="recovery"?1:
     Math.max(0,Number(fighter.stateTime)||0)/duration;
   let index=Math.min(cfg.frames-1,Math.floor(Math.min(1,t)*cfg.frames));
   if(clip==="recovery")index=cfg.frames-1;
   const c=index%cfg.cols,r=Math.floor(index/cfg.cols);
   const x=Math.round(c*cfg.width/cfg.cols);
   const nextX=Math.round((c+1)*cfg.width/cfg.cols);
   const y=Math.round(r*cfg.height/cfg.rows);
   const nextY=Math.round((r+1)*cfg.height/cfg.rows);
   const frame={x,y,w:nextX-x,h:nextY-y,ax:(nextX-x)/2,key:index};
   return {image:img,frame,index,clip,scale:cfg.scale,part:"reaction-v37",
     source:"reaction-v37",frameCount:cfg.frames,progress:Math.min(1,t)};
 }
 root.MugenYusukeReactionV37=Object.freeze({
   pose,preload,primePalette,ready:kind=>statuses.get(kind)==="ready",
   status:kind=>statuses.get(kind)||"unrequested",
   frameCount:kind=>definitions[kind]?.frames||0,
   sources:Object.freeze(Object.fromEntries(Object.entries(definitions).map(
     ([k,d])=>[k,d.src])))
 });
})(typeof window==="undefined"?globalThis:window);
