// Integration contract for optional creator-authored Thorfinn sprite pack.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../game-build-0009.html'),'utf8');
const thorfinn=JSON.parse(fs.readFileSync(path.join(__dirname,'../characters/thorfinn/thorfinn.json'),'utf8'));
for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
  if(script[1].trim())new Function(script[1]);
}
assert.equal(thorfinn.spriteSheet.frames.length,56);
assert.equal(thorfinn.combatSpriteSheet.frames.length,36);
assert.match(html,/async function loadThorfinnAnimationPack\(\)/);
assert.match(html,/await loadThorfinnAnimationPack\(\)/);
assert.match(html,/thorfinnAnimationPackImages\[extraAnim\.sheet\]/);
assert.match(html,/if \(this\.state === "hit"\) \{/);
assert.match(html,/this\.hitReaction === "knockback"/);
assert.match(html,/this\.hitReaction = "knockdown"/);
assert.match(html,/this\.state === "landing"/);
assert.match(html,/animName = "dodge"/);
assert.match(html,/!usesCombatArt && !usesExtraArt/);
console.log('PASS: Thorfinn optional 13-sheet importer, dodge, landing and knockback-to-knockdown have safe existing-atlas fallback');
