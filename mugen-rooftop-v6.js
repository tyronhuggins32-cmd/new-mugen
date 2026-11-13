/* Mugen Rooftop V6: 2.0x wider scrollable stage, cached pixel-art city.
 * Pre-renders the layered background once rather than rebuilding 1000s of
 * windows, roof lines and reflections every 60Hz canvas frame.
 */
(function(root){
  "use strict";
  const cache=new Map();
  const TAU=Math.PI*2;
  function hash(n){const x=Math.sin(n*127.1+14.7)*43758.5453;return x-Math.floor(x);}
  function rect(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function drawStatic(scene,stage){
    const w=stage.width,h=stage.height,ctx=scene.getContext("2d",{alpha:false});
    ctx.imageSmoothingEnabled=false;
    const sky=ctx.createLinearGradient(0,0,0,460);
    sky.addColorStop(0,"#040c23");sky.addColorStop(.35,"#0e2b52");
    sky.addColorStop(.68,"#12506e");sky.addColorStop(1,"#28465f");
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    // Subtle high-altitude clouds with cool edge glow.
    for(let layer=0;layer<3;layer++){
      for(let i=0;i<40;i++){
        const x=(i*187+layer*59)%w,y=40+layer*76+(hash(i+layer*33)-.5)*65;
        const radius=65+hash(i*17+layer)*115;
        const glow=ctx.createRadialGradient(x,y,0,x,y,radius);
        glow.addColorStop(0,layer===2?"rgba(64,117,173,.22)":"rgba(28,61,107,.16)");
        glow.addColorStop(1,"rgba(7,18,46,0)");
        ctx.fillStyle=glow;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
      }
    }
    // Bluish moon and soft atmosphere over the distant skyline.
    const moonX=w*.72,moonY=112,moonR=54;
    const moon=ctx.createRadialGradient(moonX,moonY,12,moonX,moonY,125);
    moon.addColorStop(0,"rgba(214,245,255,.34)");
    moon.addColorStop(.42,"rgba(105,182,237,.19)");
    moon.addColorStop(1,"rgba(105,182,237,0)");
    ctx.fillStyle=moon;ctx.fillRect(moonX-135,moonY-135,270,270);
    ctx.fillStyle="#a9d2ef";ctx.beginPath();ctx.arc(moonX,moonY,moonR,0,TAU);ctx.fill();
    ctx.fillStyle="#6eafdf";
    for(let i=0;i<19;i++){
      const a=i*1.75,r=(i*17%37),x=moonX+Math.cos(a)*r,y=moonY+Math.sin(a)*r;
      ctx.globalAlpha=.14+(i%3)*.05;ctx.beginPath();ctx.arc(x,y,3+i%5,0,TAU);ctx.fill();
    }ctx.globalAlpha=1;
    // Three distinct parallax-like skyline depths with dense, deterministic windows.
    const layers=[
      {base:382,spread:96,step:45,color:"#12334b",lit:"#205472",alpha:.37},
      {base:412,spread:130,step:70,color:"#0d2c42",lit:"#3b8bb2",alpha:.54},
      {base:451,spread:153,step:101,color:"#0b2238",lit:"#53b9da",alpha:.82}
    ];
    for(let l=0;l<layers.length;l++){
      const t=layers[l];ctx.globalAlpha=t.alpha;
      for(let x=-40,i=0;x<w+150;x+=t.step,i++){
        const bw=t.step*(.72+hash(i*13+l)*.34);
        const bh=52+hash(i*9+17*l)*t.spread;
        const top=t.base-bh;
        rect(ctx,x,top,bw,bh+120,t.color);
        rect(ctx,x+4,top+3,bw-8,3,"#225777");
        // Rooftop antennas and parallax spires.
        if(i%6===0){
          rect(ctx,x+bw*.56,top-25,2,25,"#377b9a");
          rect(ctx,x+bw*.56-4,top-26,10,2,"#e55c69");
        }
        for(let wy=top+14;wy<t.base-5;wy+=15)for(let wx=x+7;wx<x+bw-5;wx+=12){
          const r=hash(wx*1.3+wy*.7+l*331);
          if(r>.31)rect(ctx,wx,wy,4,5,r>.88?"#b6efff":t.lit);
        }
      }
    }
    ctx.globalAlpha=1;
    // Distant rooftop parapet, bevel, and edge lights.
    rect(ctx,0,411,w,13,"#20384c");
    rect(ctx,0,419,w,5,"#3c7992");
    rect(ctx,0,424,w,36,"#0d2638");
    rect(ctx,0,452,w,7,"#4a869a");
    for(let x=0;x<w;x+=165){
      rect(ctx,x+15,433,5,20,"#295267");
      rect(ctx,x+17,437,1,7,"#89bbd1");
      rect(ctx,x+84,419,2,34,"#1f526b");
    }
    // Metallic rooftop surface and long-perspective tile grid.
    const floor=ctx.createLinearGradient(0,456,0,h);
    floor.addColorStop(0,"#233e52");
    floor.addColorStop(.41,"#152d45");
    floor.addColorStop(1,"#0b1e32");
    ctx.fillStyle=floor;ctx.fillRect(0,458,w,h-458);
    ctx.lineWidth=2;ctx.strokeStyle="rgba(126,183,209,.16)";
    for(let y=486,n=0;y<h+100;y+=(14+n*4),n++){
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
    }
    for(let x=-w;x<w*2;x+=138){
      ctx.beginPath();ctx.moveTo(w/2+(x-w/2)*.33,457);ctx.lineTo(x,h);ctx.stroke();
    }
    // Painted rooftop lanes, vents, drainage plates, and rim lighting.
    for(let x=95;x<w;x+=410){
      rect(ctx,x,514,150,2,"rgba(126,221,241,.16)");
      rect(ctx,x+24,562,88,1,"rgba(94,186,226,.25)");
      rect(ctx,x+70,584,35,4,"#182e44");
      rect(ctx,x+72,583,31,1,"#51748c");
    }
    // Decorative safety beacons and runway lights.
    for(let x=180;x<w;x+=630){
      rect(ctx,x-10,398,22,55,"#142b3d");rect(ctx,x-17,393,34,12,"#16283d");
      rect(ctx,x-8,390,18,9,"#cf3548");rect(ctx,x-5,393,12,4,"#ff8d95");
      const g=ctx.createRadialGradient(x,392,0,x,392,95);
      g.addColorStop(0,"rgba(255,55,93,.48)");
      g.addColorStop(1,"rgba(255,55,93,0)");
      ctx.fillStyle=g;ctx.fillRect(x-95,297,190,190);
      const rg=ctx.createRadialGradient(x,517,0,x,517,85);
      rg.addColorStop(0,"rgba(228,65,109,.13)");rg.addColorStop(1,"rgba(228,65,109,0)");
      ctx.fillStyle=rg;ctx.fillRect(x-85,482,170,115);
    }
    // Fine surface specular lines read as wet pixel-art metal without losing silhouettes.
    for(let i=0;i<1000;i++){
      const x=Math.floor(hash(i*17+3)*w),y=470+Math.floor(hash(i*11+9)*245);
      if(i%5===0)rect(ctx,x,y,12,1,"rgba(133,201,227,.12)");
      else if(i%3===0)rect(ctx,x,y,4,1,"rgba(56,124,160,.12)");
    }
    rect(ctx,0,593,w,2,"rgba(99,165,202,.09)");
  }
  function render(ctx,time,stage,game){
    if(!stage || typeof document==="undefined")return false;
    const key=stage.width+"x"+stage.height;
    let image=cache.get(key);
    if(!image){
      image=document.createElement("canvas");
      image.width=stage.width;image.height=stage.height;
      drawStatic(image,stage);cache.set(key,image);
    }
    ctx.save();ctx.imageSmoothingEnabled=false;
    const camX=root.MugenFluid?.getStats?.(game)?.cameraX ?? stage.width*.5;
    const view=game?.canvas?.width||1280;
    const cropStart=Math.max(0,Math.min(stage.width-view-240,camX-view/2-120));
    const cropWidth=Math.min(stage.width-cropStart,view+240);
    ctx.drawImage(image,cropStart,0,cropWidth,stage.height,
      cropStart,0,cropWidth,stage.height);
    // Slow atmospheric pulses live above the cached skyline, not the character.
    const pulse=.45+.55*Math.sin(time*.0015);
    ctx.globalAlpha=.08*pulse;
    ctx.fillStyle="#49bddb";
    for(let i=0;i<12;i++){
      const x=((i*263+90)%stage.width),y=370+((i*19)%35);
      ctx.fillRect(x,y,3,1);
    }
    ctx.restore();
    return true;
  }
  root.MugenRooftop=Object.freeze({render,clearCache:()=>cache.clear()});
})(typeof window==="undefined"?globalThis:window);
