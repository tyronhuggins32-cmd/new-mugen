/* Mugen Combat SFX v8: quiet original Web Audio fight cues.
 * No third-party clips, downloads, music, or speech. Unlocks on user input.
 * One short filtered noise gesture + low oscillator on confirmed actions.
 */
(function(root){
 "use strict";
 const profiles=Object.freeze({
  swing:{f:235,to:104,dur:.095,power:.17,noise:.5,filter:850},
  dash:{f:190,to:68,dur:.17,power:.21,noise:.85,filter:1300},
  hit:{f:137,to:63,dur:.125,power:.45,noise:.58,filter:660},
  heavy:{f:100,to:44,dur:.19,power:.64,noise:.75,filter:490},
  block:{f:360,to:170,dur:.08,power:.29,noise:.31,filter:1800},
  land:{f:95,to:57,dur:.10,power:.21,noise:.6,filter:360}
 });
 const cached=new WeakMap(),last=new WeakMap();
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 function noiseBuffer(context){
  let buffer=cached.get(context);
  if(buffer)return buffer;
  const rate=context.sampleRate||44100;
  buffer=context.createBuffer(1,Math.ceil(rate*.24),rate);
  const data=buffer.getChannelData(0);
  // Deterministic but non-periodic filtered broadband material.
  let seed=9173;
  for(let i=0;i<data.length;i++){
   seed=(Math.imul(seed,1664525)+1013904223)|0;
   data[i]=((seed>>>0)/2147483648-1)*.85;
  }
  cached.set(context,buffer);
  return buffer;
 }
 function play(context,name,intensity=1){
  const preset=profiles[name];
  if(!preset || !context || typeof context.createGain!=="function" ||
     typeof context.createOscillator!=="function")return false;
  try{
   if(context.state==="suspended")context.resume?.().catch?.(()=>{});
   const now=context.currentTime;
   const previous=last.get(context);
   if(previous?.name===name && now-previous.at < .04)return false;
   last.set(context,{name,at:now});
   const force=clamp(intensity,0,.9),gain=Math.min(.037,.026*preset.power*(.5+force));
   const end=now+preset.dur;
   const carrier=context.createOscillator(),body=context.createGain();
   carrier.type=name==="block"?"sine":"triangle";
   carrier.frequency.setValueAtTime(preset.f,now);
   carrier.frequency.exponentialRampToValueAtTime(preset.to,end);
   body.gain.setValueAtTime(gain,now);
   body.gain.exponentialRampToValueAtTime(.0001,end);
   carrier.connect(body);body.connect(context.destination);
   carrier.start(now);carrier.stop(end);
   if(preset.noise && context.createBufferSource && context.createBiquadFilter && context.createBuffer){
    const source=context.createBufferSource(),eq=context.createBiquadFilter(),env=context.createGain();
    source.buffer=noiseBuffer(context);
    eq.type=name==="dash"||name==="swing"?"highpass":"lowpass";
    eq.frequency.setValueAtTime(preset.filter,now);
    const peak=Math.min(.029,gain*preset.noise*1.8);
    env.gain.setValueAtTime(Math.max(.0001,peak),now);
    env.gain.exponentialRampToValueAtTime(.0001,end);
    source.connect(eq);eq.connect(env);env.connect(context.destination);
    source.start(now);source.stop(end);
   }
   return true;
  }catch(_){return false;}
 }
 root.MugenCombatSFX=Object.freeze({profiles,play});
})(typeof window==="undefined"?globalThis:window);
