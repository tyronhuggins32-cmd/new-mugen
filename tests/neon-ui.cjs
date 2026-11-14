/* Street-menu frontend regression: structural, control, asset, and responsive checks. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname,"..");
const html = fs.readFileSync(path.join(root,"game-build-0009.html"),"utf8");
const css = fs.readFileSync(path.join(root,"mugen-rebirth-ui.css"),"utf8");
const menuCss = fs.readFileSync(path.join(root,"mugen-street-menu.css"),"utf8");
const index = html.indexOf('<main class="screen sf4-menu"');
const selectIndex = html.indexOf('<main class="arcade-screen neon-select rebirth-select"');
const fightIndex = html.indexOf('<main class="fight-screen"');
assert.ok(index>0&&selectIndex>index&&fightIndex>selectIndex,"both redesigned screens precede fight");
const home = html.slice(index,selectIndex);
const select = html.slice(selectIndex,fightIndex);
for(const [,script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  if(script.trim())new Function(script);
}
function count(source,pat){return (source.match(pat)||[]).length;}
assert.equal(count(home,/class="menu-item(?: active)?"/g),10,"ten compact modes match the reference density");
assert.equal(count(select,/class="roster-card(?: selected| locked)?"/g),8,"one active + seven reserved roster cells");
assert.ok(home.includes('>MAIN MENU</h1>'),"large white title at top right");
assert.ok(home.includes('class="sf4-paint"')&&home.includes('class="menu sf4-choices"'),"full-bleed painting and left-hand mode list");
assert.ok(home.includes('NEW MUGEN RISING'),"original branding");
assert.ok(home.includes('class="sf4-description"')&&home.includes('class="rb-briefing-badge"'),"dynamic mode description preserved");
assert.ok(home.includes('id="menu-music-activation"'),"autoplay fallback is reachable");
assert.ok(!home.includes('class="sf4-fighter"'),"main menu shows scenery instead of fighter portrait");
assert.ok(home.includes('data-mode="arcade"')&&home.includes('data-mode="options"'));
assert.ok(home.includes('data-mode="multiplayer"')&&home.includes('data-mode="manual"')&&home.includes('data-mode="quit"'),"reference-density game mode labels");
assert.ok(html.includes('quit: {title:"Quit Game"'),"new modes have descriptions");
assert.ok(select.includes('class="select-layout rb-select-layout"'),"poster, data, roster rebuilt as one grid");
assert.ok(select.includes('character-stage rb-poster')&&select.includes('character-details rb-fighter-card'));
assert.ok(select.includes('roster-panel rb-roster'),"wide roster strip");
assert.ok(select.includes('characters/yusuke/select-portrait-tournament.webp'),"existing fighter artwork");
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
assert.ok(menuCss.includes('#main-menu-screen.sf4-menu')&&menuCss.includes('prefers-reduced-motion:reduce'),"menu responsive/motion rules present");
assert.ok(menuCss.includes('assets/menu/lava-eruption.webp'),"new lava eruption background linked");
assert.ok(fs.existsSync(path.join(root,"assets/menu/lava-eruption.webp")),"lava asset bundled with game");
assert.ok(fs.existsSync(path.join(root,"characters/yusuke/portrait.webp")),"new Yusuke portrait bundled with game");
assert.ok(menuCss.includes('.frame > .topbar')&&menuCss.includes('.frame > .footer'),"old app chrome removed only on menu");
assert.ok(menuCss.includes('.sf4-choices .menu-item::before'),"extended brushstroke selection bar present");
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
console.log("PASS: reference-composed main menu, looping music, 10 modes, fighter selection, 8 slots, responsive styling, fight DOM and DualSense flow.");
