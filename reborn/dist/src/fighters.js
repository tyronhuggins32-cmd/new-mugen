import { parseAIR, parseCNS, parseCMD } from './formats.js';

function source(profile) {
  const a = profile.attacks;
  let cns = `[Data]\nlife = 1000\n[Velocity]\nwalk.fwd = ${profile.speed}\njump.neu = 0,-11\n[Movement]\nyaccel = .48\n`;
  for (const [id, type, anim, ctrl] of [[0,'S',0,1],[10,'C',10,1],[20,'S',20,1],[40,'A',40,1],[5000,'S',5000,0],[5150,'L',5150,0]]) cns += `\n[Statedef ${id}]\ntype = ${type}\nmovetype = I\nphysics = ${type}\nanim = ${anim}\nctrl = ${ctrl}\n`;
  cns += '\n[Statedef -1]\n';
  for (const attack of [...a].reverse()) {
    const cancel = attack.id===210?' || (stateno = 200 && movehit && time >= 8)':attack.id===220?' || (stateno = 210 && movehit && time >= 12)':attack.id===240?' || (stateno = 230 && movehit && time >= 9)':attack.id===250?' || (stateno >= 200 && stateno < 250 && movehit && time >= 10)':'';
    cns += `\n[State -1, ${attack.name}]\ntype = ChangeState\ntriggerall = ctrl${cancel}\ntriggerall = power >= ${attack.cost || 0}\ntrigger1 = command = "${attack.command}"\nvalue = ${attack.id}\n`;
  }
  let air = '';
  const hurt = 'Clsn2Default: 1\nClsn2[0] = -18,-94,18,0\n';
  for (const [id, frames] of [[0,[[0,12],[1,12],[2,12],[1,12]]],[10,[[3,-1]]],[20,[[4,6],[5,6],[6,6],[5,6]]],[40,[[7,-1]]],[5000,[[14,-1]]],[5150,[[15,-1]]]]) {
    air += `[Begin Action ${id}]\n${id===10?hurt.replace('-94','-64'):hurt}${frames.map(([pose,time])=>`0,${pose},0,0,${time}`).join('\n')}\n`;
  }
  for (const attack of a) {
    cns += `\n[Statedef ${attack.id}]\ntype = S\nmovetype = A\nphysics = S\nanim = ${attack.id}\nctrl = 0\n`;
    if (attack.cost) cns += `poweradd = -${attack.cost}\n`;
    cns += `\n[State ${attack.id}, impact]\ntype = HitDef\ntrigger1 = time = 0\nattr = S, NA\ndamage = ${attack.damage},${attack.chip || 0}\npausetime = ${attack.pause},${attack.pause}\nground.hittime = ${attack.stun}\nground.velocity = ${attack.knock},0\nguardflag = ${attack.low ? 'L' : 'MA'}\n`;
    cns += `\n[State ${attack.id}, end]\ntype = ChangeState\ntrigger1 = animtime = 0\nvalue = 0\nctrl = 1\n`;
    const hitbox = `${attack.start},${attack.low ? -35 : -86},${attack.range},${attack.low ? -8 : -44}`;
    air += `[Begin Action ${attack.id}]\n${hurt}0,${attack.windPose || 8},0,0,${attack.startup}\nClsn1: 1\nClsn1[0] = ${hitbox}\n0,${attack.pose},0,0,${attack.active}\n0,${attack.windPose || 8},0,0,${attack.recovery}\n`;
  }
  const cmd = a.map(m=>`[Command]\nname = "${m.command}"\ncommand = ${m.command}\ntime = 1\nbuffer.time = 4`).join('\n');
  return { cns, air, cmd };
}
const profiles = [
  { id: 'rook', name: 'ROOK', subtitle: 'IRON DISCIPLINE', color: '#f3b354', dark: '#94572e', speed: 3.3, jump: -10.5, width: 19,
    attacks: [
      {id:200,name:'Straight',command:'x',damage:42,start:18,range:72,startup:5,active:3,recovery:12,stun:17,pause:5,knock:4,pose:9},
      {id:210,name:'Cross',command:'y',damage:73,start:18,range:85,startup:9,active:4,recovery:18,stun:24,pause:7,knock:7,pose:10},
      {id:220,name:'Rising hammer',command:'z',damage:112,start:10,range:78,startup:14,active:6,recovery:25,stun:30,pause:10,knock:12,pose:11},
      {id:230,name:'Low kick',command:'a',damage:48,start:18,range:86,startup:7,active:4,recovery:15,stun:20,pause:5,knock:5,pose:12,low:true},
      {id:240,name:'Side kick',command:'b',damage:82,start:20,range:110,startup:12,active:5,recovery:22,stun:27,pause:8,knock:10,pose:13},
      {id:250,name:'Iron breaker',command:'c',damage:195,chip:18,start:10,range:145,startup:18,active:8,recovery:34,stun:39,pause:13,knock:22,pose:16,cost:1000},
    ] },
  { id: 'vale', name: 'VALE', subtitle: 'FLOWING EDGE', color: '#65d9d4', dark: '#286473', speed: 4.25, jump: -11.8, width: 17,
    attacks: [
      {id:200,name:'Palm',command:'x',damage:33,start:18,range:68,startup:4,active:3,recovery:9,stun:15,pause:4,knock:3,pose:9},
      {id:210,name:'Back fist',command:'y',damage:61,start:18,range:83,startup:7,active:4,recovery:15,stun:21,pause:6,knock:6,pose:10},
      {id:220,name:'Crescent',command:'z',damage:94,start:14,range:105,startup:11,active:5,recovery:21,stun:27,pause:8,knock:10,pose:11},
      {id:230,name:'Sweep',command:'a',damage:41,start:18,range:94,startup:6,active:4,recovery:12,stun:18,pause:5,knock:4,pose:12,low:true},
      {id:240,name:'Heel strike',command:'b',damage:74,start:20,range:119,startup:10,active:5,recovery:19,stun:24,pause:7,knock:9,pose:13},
      {id:250,name:'Tidal rupture',command:'c',damage:172,chip:16,start:10,range:158,startup:14,active:7,recovery:29,stun:35,pause:11,knock:20,pose:16,cost:1000},
    ] },
];
export const FIGHTERS = profiles.map(p => { const files = source(p); return { ...p, files, states: parseCNS(files.cns, `${p.id}.cns`).states, actions: parseAIR(files.air, `${p.id}.air`), commands: parseCMD(files.cmd, `${p.id}.cmd`) }; });
