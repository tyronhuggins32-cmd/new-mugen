"use strict";
// Dependency-free validation for Yusuke's added combat-art pipeline.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const vm = require("node:vm");

const config = JSON.parse(fs.readFileSync("characters/yusuke/yusuke.json", "utf8"));
const sheet = config.combatSpriteSheet;
assert.ok(sheet, "combat sprite sheet must be registered");
assert.equal(sheet.frames.length, 12);
assert.equal(sheet.width, 1536);
assert.equal(sheet.height, 768);
assert.equal(sheet.scale, config.spriteSheet.scale, "the base and expansion must render at the same scale");
assert.equal(sheet.consistency?.poseScale, 0.72, "all expansion cels must use one source scale");
assert.equal(config.effectSheets.spiritGun.fighterScale, config.spriteSheet.scale,
  "special firing poses must match the base fighter size");

const bytes = fs.readFileSync(sheet.src);
assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
assert.equal(bytes.readUInt32BE(16), sheet.width);
assert.equal(bytes.readUInt32BE(20), sheet.height);
assert.equal(bytes[25], 6, "expanded atlas must have a true RGBA transparent background");
assert.equal(
  crypto.createHash("sha256").update(bytes).digest("hex"),
  "1748a8c40dbee274d0b8971233f89bbeecfcae4609702de7fb03bcedd6de1c91",
  "sprite PNG must match the verified generated atlas"
);

for (const [i, f] of sheet.frames.entries()) {
  for (const key of ["x", "y", "w", "h", "ax"]) {
    assert.ok(Number.isFinite(f[key]), `frame ${i} has valid ${key}`);
  }
  assert.ok(f.x >= 0 && f.y >= 0 && f.w > 0 && f.h > 0, `frame ${i} sizes`);
  assert.ok(f.x + f.w <= sheet.width && f.y + f.h <= sheet.height, `frame ${i} bounds`);
}
const standingFrames = [0, 1, 8, 9, 11].map(i => sheet.frames[i].h);
assert.ok(Math.max(...standingFrames) / Math.min(...standingFrames) < 1.12,
  "upright poses must not visibly grow or shrink from one animation to another");
for (const [name, anim] of Object.entries(sheet.animations)) {
  const ids = anim.frames || anim.keyframes?.map(k => k.frame) || [];
  assert.ok(ids.length, `animation ${name} must use frames`);
  assert.ok(ids.every(n => Number.isInteger(n) && n >= 0 && n < sheet.frames.length), `animation ${name} must reference valid sprites`);
}

const html = fs.readFileSync("game-build-0009.html", "utf8");
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1])
  .find(js => js.includes("function selectYusukeCombatPose"));
assert.ok(script, "fighting game must wire combat expansion renderer");
new vm.Script(script, { filename: "game-build-0009-inline.js" });
assert.match(script, /loadSpriteAsset\(yusukeCombatSheet,/);
assert.match(script, /combatPose\?\.frame/);
assert.match(script, /combatAtlasReady = false/);
assert.match(script, /\? yusukeSpiritGunSheet : combatPose \? yusukeCombatSheet/,
  "gun and shotgun must render from the original color/scale matched spirit-gun sheet");
assert.doesNotMatch(script, /loadSpriteAsset\(yusukeSpecialSheet/,
  "do not load the inconsistent retired Spirit Gun artwork");
console.log("Yusuke sprites: atlas PNG, all 12 frames, animation references, and game script verified.");
