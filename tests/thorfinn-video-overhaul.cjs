// Regression for the problems visible in the 2026-11-14 Thorfinn recording.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','game-build-0009.html'),'utf8');
for (const [,script] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))
  if(script.trim())new Function(script);
const disconnect=html.slice(html.indexOf('onDisconnect: () => {'),
  html.indexOf('navigate: direction => {',html.indexOf('onDisconnect: () => {')));
assert.match(disconnect,/Controller signal lost/);
assert.doesNotMatch(disconnect,/setPaused\(/,'Bluetooth poll loss must not freeze play');
assert.match(html,/WHIRLWIND BLADES ·/);
assert.match(html,/LAUNCHING SLASH ·/);
assert.match(html,/SPIRIT SHOTGUN ·/,'Yusuke must retain original UI');
assert.match(html,/usesExtraArt \? \.79 : usesCombatArt \? \.87 : 1/);
assert.match(html,/animName === "dodge" \? "sprint"/);
assert.match(html,/BLADE COMBO/);
console.log('PASS: Thorfinn no longer pauses on controller poll loss; HUD, fallback and sprite scaling are character-specific.');
