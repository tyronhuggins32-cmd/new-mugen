/* Mugen Combat Sound V8. Small original, synthesized hit/footwork cues.
 * No external audio files, copyrighted samples or background playback.
 * Audio starts only after a user interaction unlocks the game AudioContext.
 * All voices auto-stop; cooldowns avoid loud overlapping pellet impacts.
 */
(function(root) {
 "use strict";
 const voices=Object.freeze({
  swing:         {wave:"triangle",from:460,to:135,life:.085,gain:.018,noise:.014,filter:1600,cooldown:.048},
  "swing-heavy": {wave:"sawtooth",from:225,to:72,life:.135,gain:.026,noise:.025,filter:900,cooldown:.11},
  "impact-light":{wave:"triangle",from:185,to:54,life:.105,gain:.032,noise:.036,filter:1250,cooldown:.06},
  "impact-heavy":{wave:"sine",from:108,to:38,life:.195,gain:.056,noise:.049,filter:560,cooldown:.085},
  block:         {wave:"triangle",from:920,to:230,life:.085,gain:.024,noise:.018,filter:2000,cooldown:.08},
  jump:          {wave:"sine",from:195,to:330,life:.095,gain:.014,noise:.006,filter:1750,cooldown:.14},
  land:          {wave:"triangle",from:115,to:48,life:.12,gain:.023,noise:.019,filter:450,cooldown:.12},
  dash:          {wave:"triangle",from:310,to:120,life:.15,gain:.014,noise:.03,filter:1450,cooldown:.14},
  "spirit-charge":{wave:"sine",from:405,to:880,life:.19,gain:.022,noise:.012,filter:2450,cooldown:.12},
  shotgun:       {wave:"sawtooth",from:290,to:58,life:.24,gain:.049,noise:.046,filter:1900,cooldown:.2},
  "spirit-shot":  {wave:"sine",from:620,to:160,life:.25,gain:.036,noise:.028,filter:2500,cooldown:.16}
 });
 const contextState=new WeakMap();
 const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
 function stateFor(ctx) {
   let s=contextState.get(ctx);
   if(!s){s={last:Object.create(null),noise:null,plays:0};contextState.set(ctx,s);}
   return s;
 }
 function noiseBuffer(ctx,s) {
   if(s.noise) return s.noise;
   if(typeof ctx.createBuffer!=="function")return null;
   const rate=ctx.sampleRate||44100,buffer=ctx.createBuffer(1,Math.ceil(rate*.27),rate);
   const data=buffer.getChannelData(0);
   let seed=9133;
   for(let i=0;i<data.length;i++){
     seed=(Math.imul(seed,1664525)+1013904223)>>>0;
     data[i]=((seed>>>8)/16777216*2-1)*(1-i/data.length*.42);
   }
   s.noise=buffer;return buffer;
 }
 function output(ctx,pan) {
   const main=ctx.createGain();
   if(ctx.createStereoPanner && Number.isFinite(pan)){
     const stereo=ctx.createStereoPanner();
     stereo.pan.value=limit(pan,-.65,.65);
     main.connect(stereo);stereo.connect(ctx.destination);
   }else main.connect(ctx.destination);
   return main;
 }
 function envelope(gain,start,length,level) {
   gain.setValueAtTime(.0001,start);
   gain.linearRampToValueAtTime(level,start+.007);
   gain.exponentialRampToValueAtTime(.0001,start+length);
 }
 function play(ctx,name,options={}) {
   const cue=voices[name];
   if(!cue || !ctx || ctx.state!=="running")return false;
   const s=stateFor(ctx),start=ctx.currentTime;
   if(s.last[name]!==undefined && start-s.last[name]<cue.cooldown)return false;
   const strength=limit(Number(options.strength) || 1,.2,1);
   s.last[name]=start;
   try {
     const bus=output(ctx,options.pan);
     const osc=ctx.createOscillator(),gain=ctx.createGain();
     osc.type=cue.wave;
     osc.frequency.setValueAtTime(cue.from,start);
     osc.frequency.exponentialRampToValueAtTime(cue.to,start+cue.life*.87);
     envelope(gain.gain,start,cue.life,cue.gain*strength);
     osc.connect(gain);gain.connect(bus);
     osc.start(start);osc.stop(start+cue.life+.015);
     osc.onended=()=>{try{osc.disconnect();gain.disconnect();bus.disconnect();}catch(_){}};
     if(cue.noise && ctx.createBufferSource && ctx.createBiquadFilter){
       const buffer=noiseBuffer(ctx,s);
       if(buffer){
         const n=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),ng=ctx.createGain();
         n.buffer=buffer;filter.type="bandpass";filter.frequency.value=cue.filter;
         filter.Q.value=.8;
         envelope(ng.gain,start,Math.min(cue.life,.20),cue.noise*strength);
         n.connect(filter);filter.connect(ng);ng.connect(bus);
         n.start(start);n.stop(start+Math.min(cue.life,.20)+.01);
         n.onended=()=>{try{n.disconnect();filter.disconnect();ng.disconnect();}catch(_){}};
       }
     }
     s.plays++;
     return true;
   }catch(_){return false;}
 }
 root.MugenSFX=Object.freeze({play,voices,stats(ctx){return {plays:ctx?stateFor(ctx).plays:0,types:Object.keys(voices).length}}});
})(typeof window==="undefined"?globalThis:window);
