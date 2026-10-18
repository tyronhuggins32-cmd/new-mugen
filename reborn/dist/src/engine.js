import { evaluate } from './formats.js';
import { FIGHTERS } from './fighters.js';
export const TICK_RATE = 60;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export class FixedClock {
  constructor(step) { this.step = step; this.accumulator = 0; }
  advance(seconds) { this.accumulator += Math.min(seconds, .25); let steps = 0; while (this.accumulator + 1e-9 >= 1 / 60) { this.step(); this.accumulator -= 1 / 60; steps++; } return steps; }
  reset() { this.accumulator = 0; }
}
export class InputBuffer {
  constructor() { this.previous = new Set(); this.history = []; this.commands = new Map(); }
  update(input, tick, definitions) {
    const current = new Set(Object.entries(input).filter(([,v]) => v).map(([k]) => k));
    const pressed = [...current].filter(k => !this.previous.has(k));
    this.history.push({ tick, held: [...current], pressed }); if (this.history.length > 120) this.history.shift();
    for (const d of definitions) {
      // Initial subset: single buttons, simultaneous buttons, and held buttons.
      if (d.sequence.length !== 1) continue;
      const tokens = d.sequence[0].split('+');
      const matched = tokens.every(t=> current.has(t.replace(/^\//,''))) && tokens.some(t=>t.startsWith('/') || pressed.includes(t));
      if (matched) this.commands.set(d.name, tick + d.buffer - 1);
    }
    this.previous = current;
  }
  active(name, tick) { return (this.commands.get(name) ?? -1) >= tick; }
  consume() { this.commands.clear(); }
  clear() { this.previous.clear(); this.commands.clear(); this.history = []; }
}
export function animationFrame(action, tick) {
  let cursor = 0;
  for (let i = 0; i < action.frames.length; i++) {
    const frame = action.frames[i]; if (frame.duration === -1 || tick < cursor + frame.duration) return { ...frame, element: i + 1, ended: false };
    cursor += frame.duration;
  }
  const tail = action.frames.slice(action.loop), duration = tail.reduce((n, f)=>n + Math.max(0,f.duration),0);
  let local = duration ? (tick - cursor) % duration : 0;
  for (let i = action.loop; i < action.frames.length; i++) { const f = action.frames[i]; if (f.duration === -1 || local < f.duration) return {...f, element:i+1,ended:true}; local -= f.duration; }
  return {...action.frames.at(-1), element:action.frames.length, ended:true};
}
function fighter(profile, index) {
  return { profile, index, x: index ? 820 : 460, y: 0, vx:0, vy:0, facing:index ? -1:1, state:0, stateTime:0, anim:0, animTime:0, ctrl:true, life:1000,power:0,wins:0,stun:0,hitpause:0,hitdef:null,hitTargets:new Set(),input:{}, buffer:new InputBuffer(), movehit:0, combo:0,comboDamage:0, comboAge:0,guard:false,crouch:false,controllerCounts:new Map() };
}
function enter(f, id, ctrl) {
  const s = f.profile.states.get(id); if (!s) throw new Error(`Missing StateDef ${id}`);
  f.state = id; f.stateTime = 0; f.anim = +(s.values.anim ?? 0); f.animTime = 0;
  f.ctrl = ctrl ?? !!+(s.values.ctrl ?? 0); f.hitdef = null; f.hitTargets.clear(); f.movehit = 0; f.controllerCounts.clear();
  if (s.values.poweradd) f.power = clamp(f.power + +s.values.poweradd, 0, 3000);
  if (s.values.velset) { const v = s.values.velset.split(',').map(Number); f.vx = v[0]; f.vy = v[1] || 0; }
  return true;
}
export function worldBoxes(f, kind) {
  const frame = animationFrame(f.profile.actions.get(f.anim), f.animTime);
  return frame[kind === 1 ? 'boxes1' : 'boxes2'].map(([x1,y1,x2,y2]) => {
    const a = f.x + (x1 + frame.x)*f.facing, b = f.x + (x2 + frame.x)*f.facing;
    return [Math.min(a,b), f.y+y1+frame.y, Math.max(a,b),f.y+y2+frame.y];
  });
}
export const overlaps = (a,b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
export class Match {
  constructor({p1=0,p2=1,mode='arcade',seed=12345,timer=99,difficulty=2,dummy='stand'}={}) {
    this.fighters = [fighter(FIGHTERS[p1],0),fighter(FIGHTERS[p2],1)]; this.mode=mode;this.rng=seed>>>0;this.limit=timer*60;this.remaining=this.limit;this.difficulty=difficulty;this.dummy=dummy;
    this.tick=0;this.combatTicks=0;this.phase='intro';this.phaseTime=0;this.round=1;this.events=[];this.pause=0;this.winner=null;this.streak=0;
  }
  random() { this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296; }
  emit(type,data={}) { this.events.push({type,tick:this.tick,...data}); if(this.events.length>100)this.events.shift(); }
  ai(f, other) {
    if(this.mode==='training') return this.dummy==='guard' ? {[other.x>f.x?'left':'right']:true} : this.dummy==='crouch' ? {down:true} : {};
    const d=Math.abs(f.x-other.x), forward=other.x>f.x?'right':'left', back=other.x>f.x?'left':'right', input={};
    if(d>74) input[forward]=true;
    else if(other.state>=200 && other.state<300 && this.random()<.18*this.difficulty) input[back]=true;
    else if(this.tick % Math.max(8,24-this.difficulty*4)===0) { const keys=f.power>=1000?['x','y','a','b','z','c']:['x','x','a','y','b']; input[keys[Math.floor(this.random()*keys.length)]]=true; }
    if(d>180 && this.random()<.002*this.difficulty)input.up=true;
    return input;
  }
  context(f, command='') {
    const action=f.profile.actions.get(f.anim), frame=animationFrame(action,f.animTime);
    return {time:f.stateTime,animtime:frame.ended?0:-1,ctrl:+f.ctrl,life:f.life,power:f.power,stateno:f.state,movehit:f.movehit,command,statetype:f.y<0?'A':f.crouch?'C':'S',gametime:this.combatTicks,animelem:frame.element};
  }
  controllers(f,id) {
    const state=f.profile.states.get(id); if(!state)return false;
    for(let i=0;i<state.controllers.length;i++) {
      const c=state.controllers[i], v=c.values, key=`${id}:${i}`;
      let context=this.context(f);
      // Command comparisons preserve each command's own name and buffering.
      const test=ast=> {
        if(ast.op==='=' && ast.left?.variable==='command' && 'literal' in ast.right) return f.buffer.active(ast.right.literal,this.tick);
        if(ast.op==='&&')return test(ast.left)&&test(ast.right);
        if(ast.op==='||')return test(ast.left)||test(ast.right);
        return !!evaluate(ast,context);
      };
      if(!c.all.every(test)||![...c.groups.values()].some(g=>g.every(test)))continue;
      const persistent=+(v.persistent??1), count=f.controllerCounts.get(key)||0;
      f.controllerCounts.set(key,count+1); if(persistent===0&&count>0 || persistent>1&&count%persistent!==0)continue;
      switch(c.type) {
        case 'changestate': f.buffer.consume(); return enter(f,+v.value, v.ctrl===undefined?undefined:!!+v.ctrl);
        case 'ctrlset':f.ctrl=!!+v.value;break;
        case 'velset':if(v.x!==undefined)f.vx=+v.x;if(v.y!==undefined)f.vy=+v.y;break;
        case 'veladd':f.vx+=+(v.x||0);f.vy+=+(v.y||0);break;
        case 'posadd':f.x+=+(v.x||0)*f.facing;f.y+=+(v.y||0);break;
        case 'poweradd':f.power=clamp(f.power + +v.value,0,3000);break;
        case 'lifeadd':f.life=clamp(f.life + +v.value,0,1000);break;
        case 'changeanim':f.anim=+v.value;f.animTime=0;break;
        case 'hitdef':f.hitdef={damage:+v.damage.split(',')[0],chip:+(v.damage.split(',')[1]||0),pause:+v.pausetime.split(',')[0],stun:+v['ground.hittime'],knock:+v['ground.velocity'].split(',')[0],low:v.guardflag==='L'};break;
      }
    }
    return false;
  }
  updateFighter(f,other) {
    f.guard=false;f.crouch=!!f.input.down;
    if(f.stun>0) {
      f.stun--;f.x+=f.vx;f.vx*=.82;
      if(!f.stun&&f.life>0)enter(f,0,true);
    } else if(f.life>0) {
      if(f.ctrl)f.facing=other.x>=f.x?1:-1;
      for(const id of [-3,-2,-1])this.controllers(f,id);
      let changed=true,iterations=0;
      while(changed&&iterations++<32)changed=this.controllers(f,f.state);
      if(iterations>=32)throw new Error('State transition budget exceeded');
      if(f.ctrl) {
        const horizontal=(f.input.right?1:0)-(f.input.left?1:0);
        f.guard=horizontal===-f.facing;
        if(f.input.up&&f.y===0){f.vy=f.profile.jump;enter(f,40,true);this.emit('jump',{index:f.index});}
        if(f.y===0&&f.vy>=0) {const desired=f.crouch?10:horizontal?20:0;if(f.state!==desired)enter(f,desired,true);}
        f.vx=f.crouch?0:horizontal*f.profile.speed;f.x+=f.vx;
      } else f.vx=0;
    }
    if(f.y<0||f.vy<0) {f.y+=f.vy;f.vy+=.48;if(f.y>=0){f.y=0;f.vy=0;if(f.ctrl)enter(f,0,true);this.emit('land',{index:f.index});}}
    f.x=clamp(f.x,48,1232);f.stateTime++;f.animTime++;
    if(f.comboAge>0)f.comboAge--;else {f.combo=0;f.comboDamage=0;}
  }
  collectHits() {
    const hits=[];
    for(const attacker of this.fighters) {
      const target=this.fighters[1-attacker.index];
      if(!attacker.hitdef||attacker.hitTargets.has(target.index)||!target.life)continue;
      if(worldBoxes(attacker,1).some(a=>worldBoxes(target,2).some(b=>overlaps(a,b))))hits.push({attacker,target,def:{...attacker.hitdef}});
    }
    return hits;
  }
  resolve({attacker:a,target:t,def:d}) {
    a.hitTargets.add(t.index);
    const blocked=t.guard&&t.ctrl&&(!d.low||t.crouch);
    const damage=blocked?d.chip:d.damage;
    t.life=Math.max(0,t.life-damage);t.power=clamp(t.power+Math.floor(d.damage*.65),0,3000);a.power=clamp(a.power+(blocked?30:80),0,3000);
    const wasStunned=t.stun>0;
    t.stun=blocked?Math.max(6,Math.floor(d.stun*.6)):d.stun;t.vx=a.facing*d.knock*(blocked?.45:1);
    // Delay the visual common-state transition until all simultaneous hits resolve.
    t.pendingHit=t.life>0?5000:5150;
    if(!blocked){a.movehit=1;a.combo=wasStunned&&a.comboAge>0?a.combo+1:1;a.comboDamage=(a.combo===1?0:a.comboDamage)+damage;a.comboAge=d.stun+40;}
    this.pause=Math.max(this.pause,d.pause);this.emit(blocked?'guard':'hit',{x:(a.x+t.x)/2,y:t.y-65,damage,index:a.index,heavy:d.damage>=90,ko:t.life===0});
  }
  resetRound() {
    for(const f of this.fighters){const {wins,power,profile,index}=f;Object.assign(f,fighter(profile,index),{wins,power});}
    this.remaining=this.limit;this.phase='intro';this.phaseTime=0;this.pause=0;this.round++;this.emit('round');
  }
  step(inputs=[{},{}]) {
    this.tick++;this.phaseTime++;
    if(this.phase==='matchover')return;
    if(this.phase==='roundover'){if(this.phaseTime>=180)this.resetRound();return;}
    if(this.phase==='intro'){if(this.phaseTime>=100){this.phase='fight';this.phaseTime=0;this.emit('fight');}return;}
    const [a,b]=this.fighters;
    for(const f of this.fighters){f.input=(this.mode==='watch'||f.index===1&&this.mode!=='versus')?this.ai(f,this.fighters[1-f.index]):inputs[f.index]||{};f.buffer.update(f.input,this.tick,f.profile.commands);}
    if(this.pause>0){this.pause--;return;}
    this.combatTicks++;
    for(const f of this.fighters)this.updateFighter(f,this.fighters[1-f.index]);
    // Symmetrical pushboxes independent from sprite extents.
    if(Math.abs(a.y-b.y)<75){const delta=b.x-a.x,overlap=38-Math.abs(delta);if(overlap>0){const direction=delta<0?-1:1;a.x=clamp(a.x-overlap/2*direction,48,1232);b.x=clamp(b.x+overlap/2*direction,48,1232);}}
    const hits=this.collectHits();for(const h of hits)this.resolve(h);
    for(const f of this.fighters)if(f.pendingHit!==undefined){enter(f,f.pendingHit,false);delete f.pendingHit;}
    if(this.mode!=='training')this.remaining=Math.max(0,this.remaining-1);
    if(this.mode==='training') {
      for(const f of this.fighters){f.power=3000;if(!f.life){f.life=1000;f.stun=0;enter(f,0,true);}}
    } else if(!a.life||!b.life||!this.remaining) {
      this.winner=a.life===b.life?null:a.life>b.life?0:1;
      if(this.winner!==null)this.fighters[this.winner].wins++;
      this.phase=this.fighters.some(f=>f.wins>=(this.mode==='survival'?1:2))?'matchover':'roundover';this.phaseTime=0;this.emit('ko',{winner:this.winner});
    }
  }
  snapshot() {return {tick:this.tick,remaining:this.remaining,phase:this.phase,rng:this.rng,fighters:this.fighters.map(f=>({x:f.x,y:f.y,state:f.state,time:f.stateTime,life:f.life,power:f.power,wins:f.wins}))};}
}
