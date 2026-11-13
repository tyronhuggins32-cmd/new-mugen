/* Thorfinn character foundation: atlas, roster integration, and dagger data. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'game-build-0009.html'),'utf8');
const character=JSON.parse(fs.readFileSync(path.join(root,'characters/thorfinn/thorfinn.json'),'utf8'));
const atlas=fs.readFileSync(path.join(root,'characters/thorfinn/thorfinn-atlas-v3.webp'));
const portrait=fs.readFileSync(path.join(root,'characters/thorfinn/user-portrait.webp'));
for(const [,script] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))
  if(script.trim())new Function(script);
assert.equal(character.id,'thorfinn_karlsefni');
assert.equal(character.formatVersion,3);
assert.equal(character.combat.maxHealth,5000);
assert.ok(character.combat.movement.groundSpeed > 0);
assert.equal(character.spriteSheet.src,'characters/thorfinn/thorfinn-atlas-v3.webp');
assert.equal(character.spriteSheet.width,2048);
assert.equal(character.spriteSheet.height,1960);
assert.equal(character.spriteSheet.frames.length,56);
for(const frame of character.spriteSheet.frames) {
  assert.ok(frame.x>=0&&frame.y>=0&&frame.w>0&&frame.h>0);
  assert.ok(frame.x+frame.w<=2048&&frame.y+frame.h<=1960);
}
for(const [name,animation] of Object.entries(character.spriteSheet.animations)) {
  const ids=animation.frames || animation.keyframes?.map(key=>key.frame);
  assert.ok(ids?.length,'missing frames: '+name);
  assert.ok(ids.every(id=>Number.isInteger(id)&&id>=0&&id<56),'bad frames: '+name);
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

const combat=character.combatSpriteSheet;
assert.equal(combat.src,'characters/thorfinn/thorfinn-combat-v4.webp');
assert.equal(combat.width,3072);
assert.equal(combat.height,1600);
assert.equal(combat.frames.length,36);
for(const frame of combat.frames) {
  assert.ok([frame.x,frame.y,frame.w,frame.h,frame.ax].every(Number.isFinite));
  assert.ok(frame.x>=0&&frame.y>=0&&frame.w===384&&frame.h===320);
  assert.ok(frame.x+frame.w<=3072&&frame.y+frame.h<=1600);
}
const mapped=new Set();
for(const [name,animation] of Object.entries(combat.animations)){
  const ids=animation.frames||animation.keyframes?.map(x=>x.frame);
  assert.ok(ids?.length,'Missing combat timeline: '+name);
  for(const id of ids) {
    assert.ok(Number.isInteger(id)&&id>=0&&id<36, 'Invalid combat pose '+name+': '+id);
    mapped.add(id);
  }
}
assert.equal(mapped.size,36,'Every uploaded combat pose must be referenced');
for(const [name,start,end] of [
 ['airAttack',0,3],['hit',4,7],['airCombo',8,13],['groundCombo',14,25],['rapidBlades',26,35]
]){
  const seq=combat.animations[name];
  const ids=seq.frames||seq.keyframes.map(x=>x.frame);
  for(const id of ids)assert.ok(id>=start&&id<=end,'Wrong pose family for '+name);
}
for(const name of ['source-air-attack.jpg','source-hurt.jpg','source-air-combo.jpg',
                   'source-ground-combo.jpg','source-blade-barrage.jpg']){
  const bytes=fs.readFileSync(path.join(root,'characters/thorfinn',name));
  assert.ok(bytes.length>200000,'Original uploaded sheet missing: '+name);
  assert.equal(bytes.toString('hex',0,2),'ffd8','Uploaded original must be JPEG: '+name);
}
const combatBytes=fs.readFileSync(path.join(root,combat.src));
assert.ok(combatBytes.length>500000,'Combat atlas missing');
assert.equal(combatBytes.toString('ascii',0,4),'RIFF');
assert.equal(combatBytes.toString('ascii',8,12),'WEBP');
for(const name of ['airAttack','airCombo','hit','light','cross','body',
                   'upper','heavyUppercut','heavyKick','daggerLunge','whirlwind']){
  assert.ok(combat.animations[name],'Missing playable authored pose '+name);
}
assert.equal(character.combat.attacks.gun.animation,'daggerLunge');
assert.equal(character.combat.attacks.shotgun.animation,'whirlwind');
assert.equal(character.combat.attacks.light.airAnimation,'airAttack');
assert.equal(character.combat.attacks.cross.airAnimation,'airCombo');
assert.match(html,/const thorfinnCombatSpriteSheet = new Image\(\)/);
assert.ok(html.includes('context.drawImage(poseImage,frame.x'),'Renderer uses dedicated art source');
assert.ok(html.includes('!usesCombatArt'),'Duplicate painted sword arcs disabled');

const jump=fs.readFileSync(path.join(root,'characters/thorfinn/source-jump-8frames.png'));
const crouch=fs.readFileSync(path.join(root,'characters/thorfinn/source-crouch-walk-8frames.png'));
assert.equal(jump.toString('hex',0,8),'89504e470d0a1a0a','original jump sheet is PNG');
assert.equal(crouch.toString('hex',0,8),'89504e470d0a1a0a','original crouch sheet is PNG');
assert.deepEqual([...character.spriteSheet.animations.jumpRise.frames],[40,41,42,43]);
assert.deepEqual([...character.spriteSheet.animations.jumpFall.frames],[44,45,46,47]);
assert.deepEqual([...character.spriteSheet.animations.crouchWalk.frames],[48,49,50,51,52,53,54,55]);
assert.ok(html.includes('this.setState("crouchWalk")'),'crouch-walk is playable, not decorative');
assert.ok(html.includes('this.state === "crouchWalk"'),'crouch-walk cels appear during gameplay');
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
console.log('PASS: Thorfinn 56 movement + 36 authored combat cels, 5 original combat sheets, real dagger/air/hurt timelines and game integration');
