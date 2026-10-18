import { Match, FixedClock } from './engine.js';
import { Renderer, sprite } from './render.js';
import { FIGHTERS } from './fighters.js';
import { inspectPackage } from './formats.js';
const $=id=>document.getElementById(id), show=(id,on=true)=>$(id).classList.toggle('hidden',!on);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults={difficulty:2,timer:99,volume:35,scanlines:true,dummy:'stand'};
let settings={...defaults};try{settings={...defaults,...JSON.parse(localStorage.getItem('mugen.settings')||'{}')};}catch{}
let renderer, match=new Match(), screen='home', paused=false, mode='arcade', choices=[0,1],debug=false, resultShown=false,stageNumber=1,survivalLife=1000, last=0,fps=60;
const sources=new Map();let audio;
function toast(text){$('toast').textContent=text;show('toast');clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>show('toast',false),3500);}
function saveSettings(){try{localStorage.setItem('mugen.settings',JSON.stringify(settings));}catch{toast('Settings could not be saved in this browser.');}document.querySelector('.scanlines').style.display=settings.scanlines?'':'none';}
function unlockAudio(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch{}}
function sound(type){if(!audio||!settings.volume)return;const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;osc.type=type==='hit'?'sawtooth':'sine';osc.frequency.setValueAtTime(type==='hit'?150:type==='guard'?500:700,now);osc.frequency.exponentialRampToValueAtTime(40,now+.09);gain.gain.setValueAtTime(settings.volume/100*.10,now);gain.gain.exponentialRampToValueAtTime(.001,now+.14);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(now+.15);}
let lastEvent=0;
function setScreen(next){screen=next;show('main-menu',next==='home');show('selection',next==='select');show('hud',next==='fight');show('game-tools',next==='fight');show('pause-screen',false);show('announcement',false);show('combo1',false);show('combo2',false);sources.clear();paused=false;}
function home(){setScreen('home');match=new Match();match.fighters[0].profile=FIGHTERS[0];choices=[0,1];renderer.boxes=false;}
function select(nextMode){mode=nextMode;stageNumber=1;survivalLife=1000;setScreen('select');$('select-mode').textContent=({arcade:'ARCADE · THREE-MATCH TEST LADDER',versus:'VERSUS · LOCAL PLAYER VS PLAYER',training:'TRAINING · FREE PRACTICE',survival:'SURVIVAL · KEEP YOUR REMAINING LIFE',watch:'WATCH · CPU VS CPU'})[mode];renderSelect();}
function renderSelect(){
  $('fighter-select').innerHTML=choices.map((selected,side)=>`<div class="side-select"><label>${side===0?(mode==='watch'?'CPU 1':'PLAYER 1'):(mode==='versus'?'PLAYER 2':mode==='training'?'DUMMY':'CPU OPPONENT')}</label><div class="fighter-options">${FIGHTERS.map((p,i)=>`<button class="fighter-card ${selected===i?'selected':''}" data-side="${side}" data-fighter="${i}" aria-pressed="${selected===i}" aria-label="Select ${p.name} for side ${side+1}"><img src="${sprite(p,0).toDataURL()}" alt=""><strong>${p.name}</strong></button>`).join('')}</div></div>`).join('');
  $('fighter-select').querySelectorAll('button').forEach(b=>b.onclick=()=>{choices[+b.dataset.side]=+b.dataset.fighter;renderSelect();});
}
function start(continuing=false){
  setScreen('fight');resultShown=false;lastEvent=0;paused=false;
  match=new Match({p1:choices[0],p2:choices[1],mode,timer:+settings.timer,difficulty:+settings.difficulty,dummy:settings.dummy,seed:12345+stageNumber});
  if(mode==='survival'&&continuing)match.fighters[0].life=survivalLife;
  $('mode-label').textContent=mode.toUpperCase();$('record-label').textContent=mode==='arcade'?`MATCH ${stageNumber} / 3`:mode==='survival'?`STREAK ${stageNumber-1}`:'';
  $('p2-label').textContent=mode==='versus'?'PLAYER 2':mode==='training'?'DUMMY':'CPU';
  if(mode==='watch')$('hud').querySelector('.p1 small').textContent='CPU 1';else $('hud').querySelector('.p1 small').textContent='PLAYER 1';
  for(const f of match.fighters)$(f.index?'name2':'name1').textContent=f.profile.name;
  unlockAudio();clock.reset();
}
function pauseGame(){if(screen!=='fight'||match.phase==='matchover')return;paused=!paused;sources.clear();for(const f of match.fighters)f.buffer.clear();show('pause-screen',paused);$('pause-title').innerHTML='PAUSED<span>.</span>';$('pause-kicker').textContent='TAKE A BREATHER';$('result-text').textContent='';show('resume');show('next-opponent',false);show('frame-step');show('training-options',mode==='training');$('dummy').value=settings.dummy;clock.reset();}
function finish(){
  if(resultShown)return;resultShown=true;paused=true;sources.clear();show('pause-screen');show('resume',false);show('frame-step',false);show('training-options',false);
  const winner=match.winner;const victory=winner===0;
  $('pause-kicker').textContent='MATCH COMPLETE';$('pause-title').innerHTML=winner===null?'DRAW<span>.</span>':`${match.fighters[winner].profile.name} WINS<span>.</span>`;
  const canContinue=(mode==='arcade'&&victory&&stageNumber<3)||(mode==='survival'&&victory);
  show('next-opponent',canContinue);
  $('result-text').textContent=mode==='arcade'&&victory&&stageNumber===3?'Ladder cleared. Three matches, two original test fighters.':mode==='survival'?`Survival streak: ${stageNumber-(victory?0:1)}. ${victory?'Win to carry remaining life into the next fight.':'Your run ends here.'}`:`${match.fighters[0].wins} — ${match.fighters[1].wins} · best of three rounds`;
}
function keyInput(){
  const inputs=[{},{}];for(const [key,value] of sources){if(key.startsWith('p2:'))inputs[1][value]=true;else inputs[0][value]=true;}
  const pads=navigator.getGamepads?.()||[];let side=0;
  for(const pad of pads){if(!pad||side>1)continue;const i=inputs[side++],pressed=n=>pad.buttons[n]?.pressed;
    i.left||=pad.axes[0]<-.25||pressed(14);i.right||=pad.axes[0]>.25||pressed(15);i.up||=pad.axes[1]<-.45||pressed(12);i.down||=pad.axes[1]>.45||pressed(13);
    for(const [button,name]of[[2,'x'],[3,'y'],[5,'z'],[0,'a'],[1,'b'],[7,'c']])i[name]||=pressed(button);
  }
  return inputs;
}
const clock=new FixedClock(()=>{if(screen==='fight'&&!paused){match.step(keyInput());for(const e of match.events)if(e.tick>lastEvent&&['hit','guard','fight','ko'].includes(e.type))sound(e.type);lastEvent=match.tick;if(match.phase==='matchover'&&match.phaseTime>=75)finish();}});
function hud(){
  for(const f of match.fighters){const n=f.index+1;$('life'+n).style.width=f.life/10+'%';$('power'+n).style.width=f.power/30+'%';$('wins'+n).innerHTML=[0,1].map(i=>`<i class="${f.wins>i?'won':''}"></i>`).join('');const c=$('combo'+n);show('combo'+n,f.combo>=2&&f.comboAge>0);if(f.combo>=2)c.innerHTML=`${f.combo} <small>HITS · ${f.comboDamage} DAMAGE</small>`;}
  $('timer').textContent=mode==='training'?'∞':Math.ceil(match.remaining/60).toString().padStart(2,'0');$('round-label').textContent='ROUND '+match.round;
  let text='';
  if(match.phase==='intro')text=match.phaseTime<55?`ROUND ${match.round}`:'FIGHT';
  if(match.phase==='roundover'||match.phase==='matchover')text=match.remaining===0?'TIME OVER':match.winner===null?'DOUBLE KO':'K.O.';
  show('announcement',!!text&&!paused);if(text)$('announcement').textContent=text;
  if(debug){$('debug-data').textContent=`TICK ${match.tick} | COMBAT ${match.combatTicks} | FPS ${Math.round(fps)} | ${match.phase.toUpperCase()} | HITPAUSE ${match.pause}\n`+match.fighters.map(f=>`P${f.index+1} ${f.profile.name} | STATE ${f.state} (${f.stateTime}) | ANIM ${f.anim}:${f.animTime} | CTRL ${+f.ctrl}\n  POS ${f.x.toFixed(2)}, ${f.y.toFixed(2)} | VEL ${f.vx.toFixed(2)}, ${f.vy.toFixed(2)} | LIFE ${f.life} | POWER ${f.power}\n  INPUT ${f.buffer.history.slice(-4).map(h=>h.pressed.join('+')).filter(Boolean).join(' → ')||'—'} | HITDEF ${f.hitdef?JSON.stringify(f.hitdef):'none'}`).join('\n');}
}
function animate(time){const dt=last?Math.min((time-last)/1000,.25):0;last=time;fps=dt>0?fps*.95+(1/dt)*.05:fps;
  try{clock.advance(dt);renderer.render(match,time,screen!=='fight');if(screen==='fight')hud();}catch(error){show('fatal');$('fatal-message').textContent=error.message;console.error(error);return;}
  requestAnimationFrame(animate);
}
function dialog(label,html){$('modal-label').textContent=label;$('modal-body').innerHTML=html;$('modal').showModal();sources.clear();if(screen==='fight'&&!paused)pauseGame();}
function options(){dialog('SYSTEM / OPTIONS',`<h2>MAKE IT YOURS<span>.</span></h2><label>CPU difficulty<select id="setting-difficulty"><option value="1">Easy</option><option value="2">Normal</option><option value="3">Hard</option></select></label><label>Round timer<select id="setting-timer"><option value="60">60 seconds</option><option value="99">99 seconds</option><option value="180">180 seconds</option></select></label><label>Sound volume<input id="setting-volume" type="range" min="0" max="100" step="5" aria-label="Sound volume"></label><label>CRT scanlines<input id="setting-scanlines" type="checkbox"></label><p>Difficulty and timer apply to the next match. Audio uses original synthesized interface and impact sounds.</p><button id="restore" class="secondary">RESTORE DEFAULTS</button>`);
  for(const key of ['difficulty','timer','volume','scanlines']){const el=$('setting-'+key);if(key==='scanlines')el.checked=settings[key];else el.value=settings[key];el.oninput=()=>{settings[key]=key==='scanlines'?el.checked:+el.value;saveSettings();};}
  $('restore').onclick=()=>{settings={...defaults};saveSettings();$('modal').close();options();};
}
function help(){dialog('SYSTEM / CONTROLS',`<h2>KNOW YOUR BUTTONS<span>.</span></h2><table class="controls-table"><thead><tr><th>Action</th><th>Player 1</th><th>Player 2</th></tr></thead><tbody><tr><td>Move / jump / crouch</td><td>W A S D</td><td>Arrow keys</td></tr><tr><td>Light / medium / heavy</td><td>J K L</td><td>1 2 3</td></tr><tr><td>Low / kick / super</td><td>U I O</td><td>4 5 6</td></tr><tr><td>Guard</td><td colspan="2">Hold away from your opponent</td></tr><tr><td>Low guard</td><td colspan="2">Hold down + away</td></tr><tr><td>Pause / hitboxes</td><td colspan="2">P or Escape / F2</td></tr><tr><td>Advance while paused</td><td colspan="2">N</td></tr><tr><td>Fullscreen</td><td colspan="2">F</td></tr></tbody></table><p class="note">Super costs 1,000 power (one-third of the meter). Build power by landing attacks or taking hits. Training provides full power. Each fighter has different speed, damage, reach and timing.</p><h3>CONFIRMED COMBOS</h3><p>After a light punch connects, press medium, then heavy: X → Y → Z (J → K → L). Low kick can cancel into side kick: A → B (U → I). A connected normal can cancel into C super with enough power. Missed attacks cannot use these cancels.</p><h3>GAMEPAD & TOUCH</h3><p>Standard gamepad: D-pad / left stick to move. X / Y / RB are punches. A / B / RT are kicks and super. First connected pad controls P1, second controls P2 in Versus. On touchscreens, use the arcade controls below the arena; multiple buttons can be held together.</p><h3>THIS BUILD</h3><p>Arcade is a three-match test ladder. Survival carries the winner’s remaining life into the next match. Training supports a standing, guarding or crouching dummy. Watch runs live CPU combat. Team modes and external character execution are still pending.</p>`);}
async function database(){return new Promise((resolve,reject)=>{const req=indexedDB.open('mugen-reborn',1);req.onupgradeneeded=()=>req.result.createObjectStore('reports',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function storedReports(){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('reports'),req=tx.objectStore('reports').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();});}
async function persistReport(report){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('reports','readwrite');tx.objectStore('reports').put(report);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
async function content(){dialog('ENGINE / CONTENT LAB',`<h2>COMPATIBILITY LAB<span>.</span></h2><p>Inspect a M.U.G.E.N character folder for text-format errors and missing files. This milestone does not execute external characters or decode SFF / SND archives. Reports are saved on this device; selected character assets are not installed.</p><div class="compat-grid"><span>DEF / CNS / CMD / AIR text</span><span>PARTIAL</span><span>SFF / SND / fonts</span><span>PENDING</span><span>External character gameplay</span><span>PENDING</span><span>Original test fighters</span><span>PLAYABLE</span></div><input id="folder-input" type="file" webkitdirectory multiple hidden><button id="inspect-folder" class="primary">INSPECT CHARACTER FOLDER ↗</button><div id="reports" role="status">Loading saved reports…</div>`);
  try{const reports=await storedReports();$('reports').textContent=reports.length?reports.slice(-4).map(r=>`${r.name} · ${r.files} files · ${r.diagnostics.length} findings\n${r.status}`).join('\n\n'):'No saved inspection reports.';}catch{$('reports').textContent='Report storage is unavailable in this browser.';}
  $('inspect-folder').onclick=()=>$('folder-input').click();
  $('folder-input').onchange=async e=>{
    const list=[...e.target.files];if(!list.length)return;$('reports').textContent='Inspecting files…';
    try{
      if(list.length>2500||list.reduce((n,f)=>n+f.size,0)>128*1024*1024)throw new Error('Folder limit: 2,500 files and 128 MB.');
      const files=[];
      for(const f of list){if(/\.(def|cns|st|cmd|air)$/i.test(f.name)&&f.size>4*1024*1024)throw new Error('Text file exceeds 4 MB: '+f.name);files.push({path:f.webkitRelativePath||f.name,size:f.size,text:/\.(def|cns|st|cmd|air)$/i.test(f.name)?await f.text():''});}
      const report=inspectPackage(files);report.id=Date.now();report.name=list[0].webkitRelativePath.split('/')[0]||list[0].name;
      let saved=true;try{await persistReport(report);}catch{saved=false;}
      $('reports').textContent=`${report.name} · ${report.files} files\n${report.status}\n${saved?'Report saved on this device.':'Report could not be saved.'}\n\n`+(report.diagnostics.map(d=>`${d.file}${d.line?':'+d.line:''}\n  ${d.message}`).join('\n')||'No errors found within the supported text subset. Binary and runtime compatibility remain unverified.');
    }catch(error){$('reports').textContent=error.message;}
  };
}
const keys={KeyW:'up',KeyA:'left',KeyS:'down',KeyD:'right',KeyJ:'x',KeyK:'y',KeyL:'z',KeyU:'a',KeyI:'b',KeyO:'c'};
const keys2={ArrowUp:'up',ArrowLeft:'left',ArrowDown:'down',ArrowRight:'right',Digit1:'x',Digit2:'y',Digit3:'z',Digit4:'a',Digit5:'b',Digit6:'c',Numpad1:'x',Numpad2:'y',Numpad3:'z',Numpad4:'a',Numpad5:'b',Numpad6:'c'};
window.addEventListener('keydown',e=>{
  if($('modal').open)return;
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(screen==='fight'){
    if(keys[e.code]||keys2[e.code]){e.preventDefault();sources.set((keys2[e.code]?'p2:':'p1:')+e.code,keys[e.code]||keys2[e.code]);unlockAudio();}
    if(e.repeat)return;
    if(['KeyP','Escape'].includes(e.code)){e.preventDefault();pauseGame();}
    if(e.code==='F2'){e.preventDefault();toggleBoxes();}
    if(e.code==='KeyN'&&paused&&match.phase!=='matchover'){match.step([{},{}]);hud();}
  }else if(screen==='home'&&['ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();const buttons=[...document.querySelectorAll('.mode')],idx=buttons.indexOf(document.activeElement);buttons[(idx+(e.code==='ArrowDown'?1:buttons.length-1)+buttons.length)%buttons.length].focus();}
  if(e.code==='KeyF'&&!e.repeat)fullscreen();
});
window.addEventListener('keyup',e=>{sources.delete('p1:'+e.code);sources.delete('p2:'+e.code);});
function focusLost(){sources.clear();for(const f of match.fighters)f.buffer.clear();if(screen==='fight'&&!paused)pauseGame();document.querySelectorAll('.pressed').forEach(e=>e.classList.remove('pressed'));}
window.addEventListener('blur',focusLost);document.addEventListener('visibilitychange',()=>{if(document.hidden)focusLost();});
window.addEventListener('gamepadconnected',e=>toast('Controller connected: '+e.gamepad.id));window.addEventListener('gamepaddisconnected',focusLost);
document.querySelectorAll('[data-input]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);sources.set('touch:'+e.pointerId,button.dataset.input);button.classList.add('pressed');unlockAudio();});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,e=>{sources.delete('touch:'+e.pointerId);button.classList.remove('pressed');});
});
function toggleBoxes(){renderer.boxes=!renderer.boxes;$('hitboxes').classList.toggle('on',renderer.boxes);}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Fullscreen is unavailable here. Rotate your phone for a wider arena.');}catch{toast('Fullscreen is unavailable in this browser window.');}}
$('home').onclick=e=>{e.preventDefault();home();};document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>select(button.dataset.mode));
$('start').onclick=()=>start();$('selection-back').onclick=home;$('return-menu').onclick=home;$('options').onclick=options;$('help').onclick=help;$('content').onclick=content;
$('pause').onclick=pauseGame;$('touch-pause').onclick=pauseGame;$('resume').onclick=pauseGame;$('hitboxes').onclick=toggleBoxes;$('fullscreen').onclick=fullscreen;
$('rematch').onclick=()=>{stageNumber=1;survivalLife=1000;start();};$('next-opponent').onclick=()=>{survivalLife=match.fighters[0].life;stageNumber++;choices[1]=1-choices[1];start(true);};
$('frame-step').onclick=()=>{if(paused&&match.phase!=='matchover'){match.step([{},{}]);hud();}};
$('dummy').onchange=e=>{settings.dummy=e.target.value;match.dummy=settings.dummy;saveSettings();};
$('close-modal').onclick=()=>$('modal').close();$('modal').addEventListener('click',e=>{if(e.target===$('modal')){$('modal').close();}});
$('debug-toggle').onclick=()=>{debug=!debug;show('inspector',debug);if(debug)$('inspector').scrollIntoView({behavior:'smooth',block:'nearest'});};
try{renderer=new Renderer($('game'));document.querySelector('.scanlines').style.display=settings.scanlines?'':'none';requestAnimationFrame(animate);}catch(error){show('fatal');$('fatal-message').textContent=error.message;$('engine-status').textContent='GRAPHICS ERROR';}
