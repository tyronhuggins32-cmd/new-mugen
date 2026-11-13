/* Street-menu frontend regression: structural, control, asset, and responsive checks. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname,"..");
const html = fs.readFileSync(path.join(root,"game-build-0009.html"),"utf8");
const css = fs.readFileSync(path.join(root,"mugen-rebirth-ui.css"),"utf8");
const menuCss = fs.readFileSync(path.join(root,"mugen-street-menu.css"),"utf8");
const index = html.indexOf('<main class="screen neon-home rebirth-home sf-menu"');
const selectIndex = html.indexOf('<main class="arcade-screen neon-select rebirth-select"');
const fightIndex = html.indexOf('<main class="fight-screen"');
assert.ok(index>0&&selectIndex>index&&fightIndex>selectIndex,"both redesigned screens precede fight");
const home = html.slice(index,selectIndex);
const select = html.slice(selectIndex,fightIndex);
for(const [,script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  if(script.trim())new Function(script);
}
function count(source,pat){return (source.match(pat)||[]).length;}
assert.equal(count(home,/class="menu-item(?: active)?"/g),5,"five modes still listed");
assert.equal(count(select,/class="roster-card(?: selected| locked)?"/g),8,"one active + seven reserved roster cells");
assert.ok(home.includes('MAIN <span>MENU</span>'),"large hand-painted menu masthead");
assert.ok(home.includes('class="sf-paint"')&&home.includes('class="menu neon-mode-list rb-choices sf-nav"'),"painted fighting-game menu and navigation");
assert.ok(home.includes('NEW MUGEN <span>RISING</span>'),"original branding");
assert.ok(home.includes('class="sf-description"')&&home.includes('class="rb-briefing-badge"'),"dynamic mode briefing preserved");
assert.ok(home.includes('id="menu-music-activation"'),"autoplay fallback is reachable");
assert.ok(home.includes('characters/yusuke/portrait.webp'),"current Yusuke portrait reused");
assert.ok(home.includes('data-mode="arcade"')&&home.includes('data-mode="options"'));
assert.equal(count(home,/class="sf-status">SOON/g),3,"unavailable modes labeled SOON");
assert.ok(select.includes('class="select-layout rb-select-layout"'),"poster, data, roster rebuilt as one grid");
assert.ok(select.includes('character-stage rb-poster')&&select.includes('character-details rb-fighter-card'));
assert.ok(select.includes('roster-panel rb-roster'),"wide roster strip");
assert.ok(select.includes('characters/yusuke/portrait.webp'),"existing fighter artwork");
assert.ok(select.includes("DEMON SCOUT"),"opponent preview");
assert.ok(select.includes('id="character-moves"')&&select.includes('id="character-stats"'));
assert.ok(select.includes('id="choose-character"'),"play button maintained");
const requiredIds=["main-menu-screen","arcade-screen","fight-screen","game-canvas",
 "mode-title","mode-code","mode-description","choose-character","arcade-back",
 "character-art","character-moves","character-stats","selected-character-name",
 "selected-character-title","character-series","character-full-name","character-archetype",
 "character-description"];
for(const id of requiredIds) {
 assert.equal(count(html,new RegExp('id="'+id+'"',"g")),1,"required id "+id+" must be unique");
}
assert.match(html,/href="mugen-rebirth-ui\.css\?v=\d+"/,"character selection CSS preserved");
assert.match(html,/href="mugen-street-menu\.css\?v=\d+"/,"new menu CSS linked");
assert.ok(menuCss.includes('#main-menu-screen.sf-menu')&&menuCss.includes('prefers-reduced-motion:reduce'),"menu responsive/motion rules present");
assert.ok(menuCss.includes('body:not([data-screen="fight"])'),"menu styling excluded from gameplay");
assert.ok(html.includes('src="mugen-menu-music.js?v=5"'),"existing menu music controller untouched");
assert.ok(!html.includes('href="neon-arcade-ui.css?v=1"'),"previous skin not stacked");
assert.ok(css.includes(".screen.neon-home.rebirth-home")&&css.includes(".arcade-screen.neon-select.rebirth-select"));
assert.ok(css.includes("@media(max-width:760px)")&&css.includes("@media(max-height:560px)"));
assert.ok(css.includes("prefers-reduced-motion:reduce"));
assert.ok(css.includes('body:not([data-screen="fight"])'),"CSS scoped away from fights");
assert.ok(html.includes('mainMenuScreen.dataset.mode = selected.dataset.mode'),"controller selection updates briefing");
assert.ok(html.includes('gamepadControls?.update(time);'),"PS5 polling untouched");
assert.ok(html.includes('rosterChoice.addEventListener("click"'),"fighter handler untouched");
assert.ok(html.includes('chooseCharacter.addEventListener("click", beginFight)'),"fight flow untouched");
assert.ok(html.includes('fighterConfirmModal.classList.add("open")'),"confirmation flow retained");
assert.ok(!select.includes('data-control="light"'),"no touchscreen controls reintroduced");
console.log("PASS: painted main menu, looping music integration, 5 modes, original fighter selection, 8 slots, responsive CSS, fight DOM and DualSense flow.");
