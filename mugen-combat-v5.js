/* New Mugen Combat V5: readable spacing, precise punch contact,
   and swept projectile collision. Dependency-free, testable geometry. */
(function (root) {
  "use strict";

  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  // Match the new 190-208px full-body sprite silhouettes at neutral range.
  const MIN_SPACING = 168;
  const CONTACT_ASSIST = 32;
  const PUNCHES = new Set(["light", "cross", "body", "upper", "heavy",
    "triangle", "spiritPunch", "powerKick"]);
  // Body hurtboxes follow the actual stance. Pushbox rules below are
  // deliberately separate: an airborne fighter must be able to cross over
  // an opponent's head without disappearing into their body.
  function hurtbox(f) {
    const air = !f.grounded;
    const low = !air && (f.state === "crouch" || f.state === "crouchWalk");
    const recoil = !air && f.state === "hit";
    const width = (f.width || 84) * (air ? .77 : low ? .88 : .91);
    const height = (f.height || 194) * (air ? .72 : low ? .57 : recoil ? .82 : .95);
    return { x: f.x - width/2, y: f.y - height, width, height };
  }

  // Move-specific boxes based on the visible arm/foot extent of the
  // 0.5-scale V7 Yusuke cels, not generic full-body rectangles.
  // High punches deliberately pass over crouching opponents.
  const HITBOXES = Object.freeze({
    light:     {forward:48, reach:94, above:175, height:52},
    cross:     {forward:43, reach:102, above:174, height:64},
    body:      {forward:40, reach:99, above:129, height:79},
    upper:     {forward:25, reach:110, above:224, height:172},
    heavy:     {forward:35, reach:110, above:192, height:125},
    powerKick: {forward:46, reach:107, above:155, height:92},
    // Authored V39 Triangle launcher and R2+Square Spirit Punch also need
    // precise limb boxes and short-range contact assistance.
    triangle:  {forward:28, reach:124, above:215, height:161},
    spiritPunch:{forward:35, reach:118, above:180, height:115}
  });
  function attackHitbox(f, attack, type) {
    if (!f || !attack || attack.projectile) return null;
    const preset = HITBOXES[type];
    if (!preset) return null;
    const dir = f.facing < 0 ? -1 : 1;
    const air = !f.grounded;
    const forward = preset.forward + (air ? 10 : 0);
    // Match the authored strike's configured reach, instead of using only
    // the older shorter boxes. Limit the extension so punches cannot
    // connect across empty stage space.
    const authoredReach = Number.isFinite(attack.range) ? attack.range : preset.reach;
    const reach = Math.max(preset.reach, Math.min(preset.reach + 22, authoredReach)) *
      (air ? .86 : 1);
    const above = air ? Math.min(126,preset.above) : preset.above;
    const height = air ? Math.min(83,preset.height) : preset.height;
    return {x:dir>0?f.x+forward:f.x-forward-reach,
      y:f.y-above, width:reach, height};
  }

  // Contact feedback belongs on the intersection of the striking limb's
  // active box and the opponent's visible hurtbox, not a fixed Y offset.
  // Only return a point for a real overlap. The engine still decides damage.
  function meleeImpact(hitbox, hurtbox, facing=1) {
    if(!hitbox||!hurtbox)return null;
    const left=Math.max(hitbox.x,hurtbox.x);
    const right=Math.min(hitbox.x+hitbox.width,hurtbox.x+hurtbox.width);
    const top=Math.max(hitbox.y,hurtbox.y);
    const bottom=Math.min(hitbox.y+hitbox.height,hurtbox.y+hurtbox.height);
    if(right<=left||bottom<=top)return null;
    const x=facing<0?right-(right-left)*.35:left+(right-left)*.35;
    return {x,y:(top+bottom)*.5};
  }

  function airCrossOver(a,b) {
    // Airborne combatants may cross. Mark the crossover as soon as the
    // jumper clears the grounded fighter's shoulders, then preserve that
    // permission until landing; otherwise landing frames snap the fighter
    // back across the opponent and produce the reported invisible wall.
    if (!a.grounded && !b.grounded) return true;
    if (a.grounded === b.grounded) return false;
    const jumping = a.grounded ? b : a;
    const grounded = a.grounded ? a : b;
    if (jumping._crossOverActive) return true;
    const shoulderLine = grounded.hurtbox.y + 102;
    if (jumping.y <= shoulderLine) {
      jumping._crossOverActive = true;
      return true;
    }
    return false;
  }

  // Body boxes define height overlap. Stage spacing remains readable even
  // when characters are not yet physically overlapping one another.
  function separate(a, b, arena, distance = MIN_SPACING) {
    if (!a || !b || !arena) return false;
    if (airCrossOver(a,b)) return false;
    const abox = a.hurtbox, bbox = b.hurtbox;
    if (!abox || !bbox ||
        abox.y + abox.height <= bbox.y || bbox.y + bbox.height <= abox.y) return false;
    const airborne = !a.grounded || !b.grounded;
    // Grounded combat needs room. An early jumping silhouette only needs
    // a slim pushbox before the crossover lock opens, not a 142px wall.
    const spacing = airborne
      ? Math.max(52, (a.width + b.width) * .46)
      : Math.max(distance, (a.width + b.width) / 2);
    const left = a.x <= b.x ? a : b;
    const right = left === a ? b : a;
    const deficit = spacing - (right.x - left.x);
    if (deficit <= 0) return false;

    const leftRoom = Math.max(0, left.x - arena.left);
    const rightRoom = Math.max(0, arena.right - right.x);
    let leftMove = Math.min(leftRoom, deficit / 2);
    let rightMove = Math.min(rightRoom, deficit - leftMove);
    const rest = deficit - leftMove - rightMove;
    if (rest > 0) {
      const additionalLeft = Math.min(leftRoom - leftMove, rest);
      leftMove += additionalLeft;
      rightMove += Math.min(rightRoom - rightMove, rest - additionalLeft);
    }
    left.x -= leftMove;
    right.x += rightMove;
    // Only grounded bodies halt one another. Airborne horizontal momentum
    // must survive separation so a jump can actually clear the rival.
    if (!airborne) {
      if (left.vx > 0) left.vx = 0;
      if (right.vx < 0) right.vx = 0;
    }
    return true;
  }

  // Tiny active-frame magnetism makes jabs land at convincing reach rather
  // than missing by one pixel. It never teleports past a target, never bypasses
  // the 168px body-spacing rule, and never assists attacks behind the fighter.
  function assistPunch(attacker, defender, attack, arena, opts = {}) {
    if (!attacker || !defender || !attack || !arena) return false;
    const kind = attacker.currentAttack?.();
    if (!PUNCHES.has(kind) || attack.projectile || !attacker.grounded ||
        !defender.grounded || (attacker.attackConnected ?? false)) return false;
    const direction = attacker.facing < 0 ? -1 : 1;
    const signedDistance = (defender.x - attacker.x) * direction;
    const minSpacing = opts.minSpacing || MIN_SPACING;
    const maxAssist = opts.maxAssist || CONTACT_ASSIST;
    const box = attackHitbox(attacker,attack,kind);
    const tip = box ? (direction>0?box.x+box.width:box.x)
                    : attacker.x + direction*(18 + attack.range);
    // Use the actual measured hurtbox, not an approximation of the full
    // fighter width. The old estimate could leave a ~2px visible jab gap.
    const contactHalfWidth = (defender.hurtbox?.width ?? defender.width) / 2;
    const reach = (tip-attacker.x)*direction + contactHalfWidth;
    if (signedDistance < minSpacing || signedDistance > reach + maxAssist ||
        signedDistance <= reach) return false;
    const desired = Math.max(minSpacing, reach - 1);
    const move = Math.min(maxAssist, signedDistance - desired,
      direction > 0 ? arena.right - attacker.x : attacker.x - arena.left);
    if (move <= 0) return false;
    attacker.x += direction * move;
    return true;
  }

  // Ray-vs-expanded-AABB gives the first collision point on the projectile
  // path, including a shot that crossed the entire defender within one frame.
  // This prevents fast Spirit Gun shots from tunneling through the target.
  function sweepCircle(fromX, fromY, toX, toY, radius, target) {
    if (![fromX, fromY, toX, toY, radius].every(Number.isFinite) || !target) return null;
    const left = target.x - radius, right = target.x + target.width + radius;
    const top = target.y - radius, bottom = target.y + target.height + radius;
    const dx = toX - fromX, dy = toY - fromY;
    let near = 0, far = 1;
    for (const [origin,delta,lo,hi] of [[fromX,dx,left,right],[fromY,dy,top,bottom]]) {
      if (Math.abs(delta) < 1e-9) {
        if (origin < lo || origin > hi) return null;
        continue;
      }
      let enter = (lo - origin) / delta;
      let leave = (hi - origin) / delta;
      if (enter > leave) [enter,leave] = [leave,enter];
      near = Math.max(near,enter);
      far = Math.min(far,leave);
      if (near > far) return null;
    }
    if (near < 0 || near > 1) return null;
    return {x:fromX+dx*near, y:fromY+dy*near, t:near};
  }

  function cameraZoom(distance, emphasis = 0) {
    // The old camera zoomed IN when fighters collided, obscuring close
    // punches and hurt sprites. Keep the full bodies readable at contact,
    // with only a small zoom at distance and on a confirmed special impact.
    // This intentionally matches the fluid camera's ease-OUT behavior.
    const far=clamp((distance-180)/800);
    return 1.005 + .065*far + .012*clamp(emphasis);
  }

  root.MugenCombatV5 = Object.freeze({
    MIN_SPACING, CONTACT_ASSIST, hurtbox, attackHitbox, meleeImpact,
    airCrossOver, separate, assistPunch, sweepCircle, cameraZoom
  });
})(typeof window === "undefined" ? globalThis : window);
