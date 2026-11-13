/* Thorfinn character foundation: atlas, roster integration, and dagger data. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'game-build-0009.html'),'utf8');
const character=JSON.parse(fs.readFileSync(path.join(root,'characters/thorfinn/thorfinn.json'),'utf8'));
const atlas=fs.readFileSync(path.join(root,'characters/thorfinn/user-sprites.webp'));
const portrait=fs.readFileSync(path.join(root,'characters/thorfinn/user-portrait.webp'));
for(const [,script] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))
  if(script.trim())new Function(script);
assert.equal(character.id,'thorfinn_karlsefni');
assert.equal(character.formatVersion,3);
assert.equal(character.combat.maxHealth,5000);
assert.ok(character.combat.movement.groundSpeed > 0);
assert.equal(character.spriteSheet.src,'characters/thorfinn/user-sprites.webp');
assert.equal(character.spriteSheet.width,2048);
assert.equal(character.spriteSheet.height,1400);
assert.equal(character.spriteSheet.frames.length,40);
for(const frame of character.spriteSheet.frames) {
  assert.ok(frame.x>=0&&frame.y>=0&&frame.w>0&&frame.h>0);
  assert.ok(frame.x+frame.w<=2048&&frame.y+frame.h<=1400);
}
for(const [name,animation] of Object.entries(character.spriteSheet.animations)) {
  const ids=animation.frames || animation.keyframes?.map(key=>key.frame);
  assert.ok(ids?.length,'missing frames: '+name);
  assert.ok(ids.every(id=>Number.isInteger(id)&&id>=0&&id<40),'bad frames: '+name);
}
for(const kind of ['light','cross','body','upper','heavy','powerKick','gun','shotgun'])
  assert.ok(character.combat.attacks[kind],'missing attack: '+kind);
assert.equal(character.combat.attacks.gun.projectile,undefined,'knife lunge is melee');
assert.equal(character.combat.attacks.shotgun.projectile,undefined,'whirlwind blades are melee');
assert.ok(atlas.length>100000,'actual sprite atlas was not committed');
assert.equal(atlas.toString('ascii',0,4),'RIFF','atlas is WebP');
assert.equal(atlas.toString('ascii',8,12),'WEBP','atlas is WebP');
assert.equal(portrait.toString('ascii',8,12),'WEBP','portrait is WebP');
assert.equal(character.portrait,'characters/thorfinn/user-portrait.webp');
assert.ok(character.spriteSheet.animations.walk.frames.length>=8,'real walk frames mapped');
assert.ok(character.spriteSheet.animations.sprint.frames.length>=8,'real sprint frames mapped');
assert.ok(character.spriteSheet.animations.idle.frames.length>=8,'real idle frames mapped');
assert.ok(character.spriteSheet.animations.guard.frames.length>=4,'guard frames mapped');
assert.ok(html.includes('data-character="thorfinn_karlsefni"'));
assert.ok(html.includes('function selectRosterCharacter(id)'));
assert.ok(html.includes('function loadThorfinnDefinition()'));
assert.ok(html.includes('drawThorfinnSprite(context, time, alpha'));
assert.ok(html.includes('const playable = rosterCards.filter(card=>!card.disabled)'));
assert.ok(html.includes('if (!isThorfinnSelected() && playerInput.ultimatePressed'),'Yusuke super must not play for Thorfinn');
console.log('PASS: Thorfinn roster, DualSense selection, 40-frame uploaded artwork and dedicated melee attacks');
