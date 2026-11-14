/* Yusuke walk polish V22.
 * Non-destructive 24-frame fallback from the EXISTING shipped 12-pose art.
 * The separately authored 24-pose V22 PNG takes priority when deployed.
 * This fallback is generated once on texture load, not each render frame.
 */
(function(root){
  "use strict";
  const CELL=256, SOURCE_FRAMES=12, BANDS=16;
  const bounds=(n,a,b)=>Math.max(a,Math.min(b,n));
  function generate(source){
    const width=source?.naturalWidth||source?.width;
    const height=source?.naturalHeight||source?.height;
    if(width!==1536 || height!==512 || !root.document?.createElement)return null;
    try {
      const scratch=root.document.createElement("canvas");
      scratch.width=CELL;scratch.height=CELL;
      const read=scratch.getContext("2d",{willReadFrequently:true});
      const atlas=root.document.createElement("canvas");
      atlas.width=1536;atlas.height=1024;
      const output=atlas.getContext("2d",{willReadFrequently:true});
      if(!read||!output)return null;
      read.imageSmoothingEnabled=false;
      output.imageSmoothingEnabled=false;
      const centers=[];
      for(let i=0;i<SOURCE_FRAMES;i++){
        read.clearRect(0,0,CELL,CELL);
        read.drawImage(source,(i%6)*CELL,Math.floor(i/6)*CELL,CELL,CELL,
          0,0,CELL,CELL);
        const pixels=read.getImageData(0,0,CELL,CELL).data;
        const rowCenters=[];
        for(let band=0;band<BANDS;band++){
          let sum=0,weight=0;
          const y0=band*16;
          for(let y=y0;y<y0+16;y++){
            for(let x=0;x<CELL;x++){
              const opacity=pixels[(y*CELL+x)*4+3];
              if(opacity>90){sum+=x*opacity;weight+=opacity;}
            }
          }
          rowCenters.push(weight?sum/weight:128);
        }
        centers.push(rowCenters);
      }
      for(let index=0;index<SOURCE_FRAMES*2;index++){
        const from=Math.floor(index/2);
        const to=(from+1)%SOURCE_FRAMES;
        const sourceX=(from%6)*CELL, sourceY=Math.floor(from/6)*CELL;
        const destX=(index%6)*CELL,destY=Math.floor(index/6)*CELL;
        if(index%2===0){
          output.drawImage(source,sourceX,sourceY,CELL,CELL,
            destX,destY,CELL,CELL);
          continue;
        }
        // Single-silhouette row warping toward the next pose, not translucent
        // overlapping fighters. All pixels retain the authored costume palette.
        for(let band=0;band<BANDS;band++){
          const y=band*16;
          const direction=centers[to][band]-centers[from][band];
          const tinySway=y<186?Math.round(Math.sin((from+.5)*Math.PI/6)):0;
          const shift=bounds(Math.round(direction*.5)+tinySway,-6,6);
          output.drawImage(source,sourceX,sourceY+y,CELL,16,
            destX+shift,destY+y,CELL,16);
        }
      }
      // Sparse neutral-white matte cleanup; preserve colored clothing and skin.
      const rgba=output.getImageData(0,0,atlas.width,atlas.height);
      const d=rgba.data;
      for(let p=0;p<d.length;p+=4){
        if(d[p]>218 && d[p+1]>218 && d[p+2]>218 &&
           Math.max(d[p],d[p+1],d[p+2])-Math.min(d[p],d[p+1],d[p+2])<23){
          d[p+3]=0;
        }
      }
      output.putImageData(rgba,0,0);
      return atlas;
    }catch(_){
      // No 2D canvas or readback (e.g. privacy restrictions): keep the 12-frame
      // texture, never block input or create an invisible character.
      return null;
    }
  }
  root.MugenWalkPolishV22=Object.freeze({generate,frameCount:24,
    cellSize:CELL,sourceFrames:SOURCE_FRAMES});
})(typeof window==="undefined"?globalThis:window);
