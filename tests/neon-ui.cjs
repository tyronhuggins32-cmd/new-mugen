const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"game-build-0009.html"),"utf8");
const css=fs.readFileSync(path.join(root,"neon-arcade-ui.css"),"utf8");
const compiled=html.match(/<script>([\s\S]*?)<\/script>/g)||[];
for(const block of compiled)new Function(block.replace(/^<script>|<\/script>$/g,""));

const between=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b));
const home=between('<main class="screen neon-home"','<main class="arcade-screen neon-select"');
const select=between('<main class="arcade-screen neon-select"','<main class="fight-screen"');
assert.ok(home.length>2200&&select.length>3500);
assert.ok(html.includes('href="neon-arcade-ui.css?v=1"'));
assert.ok(css.includes(".screen.neon-home")&&css.includes(".arcade-screen.neon-select"));
assert.ok(css.includes("max-width:760px")&&css.includes("max-height:540px"));
assert.ok(css.includes("prefers-reduced-motion:reduce"));

const count=(src,pattern)=>(src.match(pattern)||[]).length;
assert.equal(count(home,/class="menu-item(?: active)?"/g),5,"five original game modes remain");
assert.equal(count(select,/class="roster-card(?: selected| locked)?"/g),8,"eight selectable/future fighter slots");
assert.ok(home.includes('data-mode="arcade"'));
assert.ok(home.includes('data-mode="options"'));
assert.ok(home.includes('MODE SELECTION')&&home.includes('RISING'));
assert.ok(home.includes('class="mode-availability">SOON'),"unfinished modes must be labeled");
assert.ok(select.includes('id="choose-character"'));
assert.ok(select.includes('id="character-art"'));
assert.ok(select.includes('id="character-moves"'));
assert.ok(select.includes('id="character-stats"'));
assert.ok(select.includes('id="selected-character-name"'));
assert.ok(select.includes('id="arcade-back"'));
assert.ok(select.includes('characters/yusuke/portrait.webp'));
assert.ok(select.includes('DEMON SCOUT'));

for(const id of ["mode-title","mode-code","mode-description","choose-character","arcade-back",
  "main-menu-screen","arcade-screen","character-art","character-moves","character-stats",
  "selected-character-name","character-series","character-full-name","character-archetype",
  "character-description","roster-grid","fight-screen","game-canvas"]){
 if(id==="roster-grid"){assert.ok(select.includes('class="roster-grid"'));continue}
 assert.equal(count(html,new RegExp('id="'+id+'"','g')),1,"unique required ID: "+id);
}
assert.ok(html.includes('mainMenuScreen.dataset.mode = selected.dataset.mode'));
assert.ok(html.includes('gamepadControls?.update(time);'),"PS5 controller polling preserved");
assert.ok(html.includes('rosterChoice.addEventListener("click"'),"roster selection handler preserved");
assert.ok(html.includes('chooseCharacter.addEventListener("click"'),"fight button handler preserved");
assert.ok(html.includes('fighterConfirmModal.classList.add("open")'),"controller fight confirm preserved");
assert.ok(!select.includes('data-control="light"'),"no touch fighting controls reintroduced");
assert.ok(css.includes('.neon-select .character-stage')&&css.includes('.neon-select .roster-grid'));
console.log("PASS: neon home, mode bars, fighter select, 8 roster slots, responsive CSS, PS5 navigation and critical game DOM IDs.");
