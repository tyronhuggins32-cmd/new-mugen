import { animationFrame, worldBoxes, clamp } from './engine.js';
import { FIGHTERS } from './fighters.js';
const W=1280,H=720,GROUND=570;
function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function polygon(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function limb(c,a,b,width,color){const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,ox=-dy/n*width/2,oy=dx/n*width/2;polygon(c,[[a[0]+ox,a[1]+oy],[b[0]+ox,b[1]+oy],[b[0]-ox,b[1]-oy],[a[0]-ox,a[1]-oy]],'#111b29');polygon(c,[[a[0]+ox*.7,a[1]+oy*.7],[b[0]+ox*.7,b[1]+oy*.7],[b[0]-ox*.7,b[1]-oy*.7],[a[0]-ox*.7,a[1]-oy*.7]],color);}
export function sprite(profile,pose){
  const canvas=surface(96,86),c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  let lean=0,cy=0,arms=[[[-9,-39],[-15,-29],[-4,-28]],[[8,-40],[17,-34],[22,-42]]],legs=[[[-7,-23],[-12,-12],[-17,0]],[[7,-23],[13,-12],[18,0]]];
  if(pose===1)cy=-1;if(pose===2)cy=-2;
  if(pose===3){cy=15;legs=[[[-7,-23],[-17,-11],[-21,-15]],[[7,-23],[17,-9],[20,-15]]];}
  if(pose>=4&&pose<=6){const f=pose-5;legs=[[[-7,-23],[-9+f*10,-12],[-10+f*17,0]],[[7,-23],[9-f*10,-12],[10-f*17,0]]];lean=2;}
  if(pose===7){legs=[[[-7,-23],[-18,-19],[-17,-7]],[[7,-23],[14,-15],[22,-19]]];arms=[[[-9,-39],[-20,-39],[-14,-52]],[[8,-40],[22,-41],[27,-52]]];}
  if(pose===8){lean=-3;arms=[[[-9,-39],[-21,-34],[-14,-45]],[[8,-40],[21,-33],[12,-47]]];}
  if(pose===9){lean=6;arms=[[[-9,-39],[9,-44],[32,-44]],[[8,-40],[14,-29],[4,-32]]];}
  if(pose===10){lean=8;arms=[[[-9,-39],[-16,-28],[-1,-29]],[[8,-40],[26,-45],[39,-45]]];}
  if(pose===11){lean=3;arms=[[[-9,-39],[-18,-33],[-7,-30]],[[8,-40],[18,-50],[21,-66]]];}
  if(pose===12){cy=8;legs=[[[-7,-23],[-15,-11],[-21,-8]],[[7,-23],[26,-12],[45,-10]]];}
  if(pose===13){lean=-5;legs=[[[-7,-23],[-6,-12],[-9,0]],[[7,-23],[27,-34],[49,-35]]];}
  if(pose===14){lean=-10;arms=[[[-9,-39],[-22,-45],[-28,-36]],[[8,-40],[17,-43],[18,-31]]];}
  if(pose===15){cy=40;lean=-14;legs=[[[-7,-23],[-22,-25],[-38,-29]],[[7,-23],[18,-30],[31,-26]]];}
  if(pose===16){lean=10;arms=[[[-9,-39],[13,-37],[43,-39]],[[8,-40],[29,-45],[46,-44]]];}
  c.translate(35,78);c.translate(lean,cy);
  const skin=profile.id==='rook'?'#cf9677':'#b58e84',light=profile.id==='rook'?'#edb693':'#dbb5a6',cloth=profile.id==='rook'?'#343a4b':'#303b50';
  for(const leg of legs){limb(c,leg[0],leg[1],11,cloth);limb(c,leg[1],leg[2],9,profile.dark);c.fillStyle='#111924';c.fillRect(leg[2][0]-5,leg[2][1]-5,14,6);c.fillStyle=profile.color;c.fillRect(leg[2][0]-4,leg[2][1]-3,12,2);}
  const rear=arms[0];limb(c,rear[0],rear[1],9,skin);limb(c,rear[1],rear[2],8,skin);
  polygon(c,[[-11,-43],[9,-43],[13,-25],[6,-20],[-9,-22],[-14,-32]],'#101927');
  polygon(c,[[-10,-42],[8,-42],[11,-27],[5,-23],[-8,-24],[-12,-32]],profile.color);
  polygon(c,[[-9,-41],[-4,-42],[1,-29],[-6,-26],[-10,-31]],profile.dark);
  polygon(c,[[1,-42],[8,-41],[10,-28],[5,-27]],light);
  c.fillStyle='#121c29';c.fillRect(-12,-26,24,5);c.fillStyle=profile.id==='rook'?'#ce4e46':'#e8e3b4';c.fillRect(-12,-25,24,3);
  polygon(c,[[4,-23],[10,-24],[16,-15],[11,-11]],profile.id==='rook'?'#ce4e46':'#e8e3b4');
  c.fillStyle='#182231';c.fillRect(-7,-58,19,17);c.fillStyle=skin;c.fillRect(-5,-56,15,13);c.fillRect(8,-52,5,5);c.fillStyle=light;c.fillRect(0,-54,9,7);
  polygon(c,[[-8,-52],[-10,-61],[-3,-59],[-1,-64],[4,-61],[9,-62],[13,-56],[7,-55],[3,-57],[-2,-52]],profile.id==='rook'?'#272b34':'#e8ddd1');
  c.fillStyle='#101a27';c.fillRect(7,-51,3,2);c.fillRect(5,-44,5,1);
  if(profile.id==='vale'){c.fillStyle=profile.color;c.fillRect(-7,-55,18,2);polygon(c,[[-7,-54],[-24,-58],[-16,-51]],profile.color);}
  const arm=arms[1];limb(c,arm[0],arm[1],11,skin);limb(c,arm[1],arm[2],9,light);
  for(const hand of [rear[2],arm[2]]){c.fillStyle='#17202d';c.fillRect(hand[0]-5,hand[1]-5,10,10);c.fillStyle=profile.dark;c.fillRect(hand[0]-4,hand[1]-4,8,8);c.fillStyle=profile.color;c.fillRect(hand[0]-4,hand[1]-4,8,3);}
  return canvas;
}
function stage(){
  const canvas=surface(W,H),c=canvas.getContext('2d');let seed=42;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const gradient=c.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#101c36');gradient.addColorStop(.6,'#52616e');gradient.addColorStop(1,'#1b2636');c.fillStyle=gradient;c.fillRect(0,0,W,H);
  for(let i=0;i<100;i++){c.fillStyle=`rgba(232,232,203,${random()*.6})`;c.fillRect(random()*W,random()*260,2,2);}
  c.fillStyle='#d4d7c7';c.beginPath();c.arc(915,146,59,0,Math.PI*2);c.fill();c.fillStyle='#c2c9c1';c.beginPath();c.arc(927,134,40,0,Math.PI*2);c.fill();
  polygon(c,[[0,365],[144,230],[226,305],[365,180],[488,310],[590,231],[767,373],[935,253],[1118,346],[1280,233],[1280,500],[0,500]],'#28394b');
  polygon(c,[[0,404],[166,334],[265,375],[387,285],[515,397],[670,306],[785,378],[921,331],[1080,399],[1229,313],[1280,345],[1280,510],[0,510]],'#334a57');
  for(let i=0;i<55;i++){const x=i*26,y=365+random()*65,h=65+random()*50;c.fillStyle=i%2?'#24394a':'#293d50';c.fillRect(x,y,22,h);for(let j=0;j<4;j++)if(random()>.3){c.fillStyle='#b79e6a';c.fillRect(x+5,y+8+j*12,3,3);}}
  c.fillStyle='#1a2d3b';c.fillRect(0,461,W,111);
  for(let x=0;x<W;x+=64){c.fillStyle='#45606a';c.fillRect(x,470,8,75);c.fillRect(x,467,12,5);c.fillStyle='#233746';c.fillRect(x+8,482,56,3);c.fillRect(x+8,514,56,3);}
  // Architectural stage silhouettes: torii, tiled roof, lanterns, temple flags.
  for(const x of [100,1145]){c.fillStyle='#25262c';c.fillRect(x-24,249,16,321);c.fillRect(x+52,249,16,321);c.fillStyle='#914a47';c.fillRect(x-21,261,9,305);c.fillRect(x+55,261,9,305);c.fillStyle='#242c37';c.fillRect(x-63,234,179,13);polygon(c,[[x-72,219],[x-51,233],[x+101,233],[x+127,218],[x+110,243],[x-54,243]],'#1b2734');c.fillStyle='#a24f46';c.fillRect(x-44,248,142,12);c.fillRect(x-28,280,110,9);}
  for(const x of [290,1005]){c.fillStyle='#23313c';c.fillRect(x,347,4,211);c.fillRect(x-18,345,38,4);c.fillStyle='#bd6651';c.fillRect(x-14,361,31,39);c.fillStyle='#e5ad70';c.fillRect(x-10,365,23,30);c.fillStyle='#775044';for(let y=367;y<397;y+=7)c.fillRect(x-14,y,31,2);c.fillRect(x-7,400,17,4);}
  c.fillStyle='#687074';c.fillRect(0,554,W,17);c.fillStyle='#89908b';c.fillRect(0,554,W,3);c.fillStyle='#323b47';c.fillRect(0,571,W,149);
  for(let y=573,row=0;y<H;y+=29,row++){for(let x=-100;x<W;x+=114){const xx=x+(row%2?57:0);c.fillStyle=row%2?'#424a52':'#3d4750';c.fillRect(xx+1,y+1,111,26);c.fillStyle='#525b62';c.fillRect(xx+2,y+1,109,2);c.fillStyle='#2a3542';c.fillRect(xx+2,y+24,109,2);}}
  for(let i=0;i<75;i++){const x=random()*W,y=580+random()*135;c.fillStyle='#73776e';c.fillRect(x,y,2+random()*5,1);}
  c.fillStyle='#927e5a';c.fillRect(0,569,W,2);
  return canvas;
}
export class Renderer {
  constructor(canvas){
    this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false});if(!this.gl)throw new Error('WebGL 2 is unavailable. Enable hardware graphics or use a supported browser.');
    const gl=this.gl;
    const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    this.program=gl.createProgram();gl.attachShader(this.program,shader(gl.VERTEX_SHADER,`#version 300 es\nin vec2 position;in vec2 uv;out vec2 vUV;void main(){gl_Position=vec4(position,0,1);vUV=uv;}`));gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,`#version 300 es\nprecision mediump float;uniform sampler2D tex;uniform vec4 tint;in vec2 vUV;out vec4 color;void main(){color=texture(tex,vUV)*tint;}`));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('WebGL shader link failed');gl.useProgram(this.program);
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    for(const [name,size,offset]of[['position',2,0],['uv',2,8]]){const loc=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,16,offset);}
    this.tint=gl.getUniformLocation(this.program,'tint');gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    this.background=this.texture(stage());const white=surface(1,1);const wc=white.getContext('2d');wc.fillStyle='#ffffff';wc.fillRect(0,0,1,1);this.white=this.texture(white);
    this.sprites=FIGHTERS.map(p=>Array.from({length:17},(_,i)=>this.texture(sprite(p,i))));this.camera=640;this.zoom=1;this.boxes=false;
  }
  texture(image){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  quad(texture,x,y,w,h,color=[1,1,1,1],flip=false){const gl=this.gl;const x1=x/W*2-1,x2=(x+w)/W*2-1,y1=1-y/H*2,y2=1-(y+h)/H*2,u=flip?1:0,v=flip?0:1;gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform4fv(this.tint,color);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([x1,y1,u,0,x2,y1,v,0,x1,y2,u,1,x1,y2,u,1,x2,y1,v,0,x2,y2,v,1]),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,6);}
  rect(x,y,w,h,c){this.quad(this.white,x,y,w,h,c);}
  render(match,time=0,menu=false){
    const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(.04,.06,.1,1);gl.clear(gl.COLOR_BUFFER_BIT);
    const [a,b]=match.fighters;const targetZoom=menu?1:clamp(1050/(Math.abs(a.x-b.x)+360),1,1.45);this.zoom+=(targetZoom-this.zoom)*.06;
    const target=menu?640:clamp((a.x+b.x)/2,640/this.zoom,1280-640/this.zoom);this.camera+=(target-this.camera)*.08;
    const shake=match.pause>0?Math.sin(time*.2)*Math.min(6,match.pause):0;
    const sx=x=>(x-this.camera)*this.zoom+640+shake,sy=y=>(y-GROUND)*this.zoom+GROUND;
    this.quad(this.background,sx(0),sy(0),W*this.zoom,H*this.zoom);
    if(menu){this.rect(0,0,W,H,[.03,.05,.1,.50]);this.drawFighter({...a,x:925,y:0,anim:0,animTime:Math.floor(time/16),facing:-1},x=>x,y=>y,4.2,time);return;}
    for(const f of match.fighters){this.rect(sx(f.x-28),sy(GROUND-3),56*this.zoom,7*this.zoom,[0,0,0,.32]);this.drawFighter(f,sx,sy,this.zoom,time);}
    for(const e of match.events){const age=match.tick-e.tick;if(age<0||age>20||!['hit','guard'].includes(e.type))continue;
      const x=sx(e.x),y=sy(GROUND+e.y),color=e.type==='guard'?[.45,.85,1,1-age/22]:[1,.75,.32,1-age/22];
      for(let i=0;i<8;i++){const angle=i*Math.PI/4,r=age*3;this.rect(x+Math.cos(angle)*r-3,y+Math.sin(angle)*r-3,6+age*.1,6+age*.1,color);}
      if(e.heavy&&age<4)this.rect(0,0,W,H,[1,.8,.5,.1]);
    }
    if(this.boxes)for(const f of match.fighters)for(const kind of [2,1])for(const box of worldBoxes(f,kind))this.rect(sx(box[0]),sy(GROUND+box[1]),(box[2]-box[0])*this.zoom,(box[3]-box[1])*this.zoom,kind===1?[1,.2,.2,.35]:[.2,.6,1,.25]);
  }
  drawFighter(f,sx,sy,zoom,time){const frame=animationFrame(f.profile.actions.get(f.anim),f.animTime);const scale=1.5*zoom,w=96*scale,h=86*scale;const x=sx(f.x),y=sy(GROUND+f.y);const origin=f.facing===1?35:61;
    const flash=f.stun>0&&Math.floor(time/45)%2===0;this.quad(this.sprites[f.index===undefined?0:FIGHTERS.findIndex(p=>p.id===f.profile.id)][Math.min(16,frame.image)],x-origin*scale,y-78*scale,w,h,flash?[1,.75,.75,1]:[1,1,1,1],f.facing===-1);
    if(f.state===250){const a=clamp(1-Math.abs(f.stateTime-22)/24,0,1);this.rect(x+(f.facing>0?30:-130)*zoom,y-100*zoom,100*zoom,7*zoom,f.profile.id==='rook'?[1,.68,.25,a]:[.4,1,.95,a]);}
  }
}
