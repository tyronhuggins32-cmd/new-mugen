/* New Mugen Combat V5: readable spacing, precise punch contact,
   and swept projectile collision. Dependency-free, testable geometry. */
(function (root) {
  "use strict";

  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const MIN_SPACING = 142;
  const CONTACT_ASSIST = 25;
  const PUNCHES = new Set(["light", "cross", "body", "upper", "heavy"]);

  // Body boxes define height overlap. Stage spacing remains readable even
  // when characters are not yet physically overlapping one another.
  function separate(a, b, arena, distance = MIN_SPACING) {
    if (!a || !b || !arena) return false;
    const abox = a.hurtbox, bbox = b.hurtbox;
    if (!abox || !bbox ||
        abox.y + abox.height <= bbox.y || bbox.y + bbox.height <= abox.y) return false;
    const spacing = Math.max(distance, (a.width + b.width) / 2);
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
    // The players cannot push past one another just by holding forwards.
    if (left.vx > 0) left.vx = 0;
    if (right.vx < 0) right.vx = 0;
    return true;
  }

  // Tiny active-frame magnetism makes jabs land at convincing reach rather
  // than missing by one pixel. It never teleports past a target, never bypasses
  // the 142px body-spacing rule, and never assists attacks behind the fighter.
  function assistPunch(attacker, defender, attack, arena, opts = {}) {
    if (!attacker || !defender || !attack || !arena) return false;
    const kind = attacker.currentAttack?.();
    if (!PUNCHES.has(kind) || attack.projectile || !attacker.grounded ||
        !defender.grounded || (attacker.attackConnected ?? false)) return false;
    const direction = attacker.facing < 0 ? -1 : 1;
    const signedDistance = (defender.x - attacker.x) * direction;
    const minSpacing = opts.minSpacing || MIN_SPACING;
    const maxAssist = opts.maxAssist || CONTACT_ASSIST;
    const reach = 18 + attack.range + defender.width / 2 - 6;
    if (signedDistance < minSpacing || signedDistance > reach + maxAssist ||
        signedDistance <= reach) return false;
    const desired = Math.max(minSpacing, reach - 1);
    const move = Math.min(maxAssist, signedDistance - desired,
      direction > 0 ? arena.right - attacker.x : attacker.x - arena.left);
    if (move <= 0) return false;
    attacker.x += direction * move;
    return true;
  }

  // Hit geometry follows the actual ~200px premium fighter silhouette:
  // narrow shoulders, crouched guard, and an airborne body at real world Y.
  // This avoids invisible full-width boxes and permits proper jump-over.
  function hurtbox(fighter) {
    if (!fighter || !Number.isFinite(fighter.x) || !Number.isFinite(fighter.y)) return null;
    const guarded = fighter.state === "block" || fighter.state === "crouch";
    const bodyWidth = Number(fighter.width) || 84;
    const bodyHeight = Number(fighter.height) || 194;
    const width = bodyWidth * (guarded ? .72 : .85);
    const height = bodyHeight * (guarded ? .73 : .94);
    return { x:fighter.x-width/2, y:fighter.y-height, width, height };
  }

  // For each punch, place the active area at the hand/leg strike altitude,
  // not a giant rectangular column from the fighter's feet to their head.
  // Attack data still controls reach, frame windows, damage and stun.
  const strikeOffsets=Object.freeze({
    light:{from:143,lead:23}, cross:{from:151,lead:24},
    body:{from:110,lead:23}, upper:{from:190,lead:24},
    heavy:{from:182,lead:24}, powerKick:{from:154,lead:29}
  });
  function attackHitbox(fighter,attack,type) {
    if (!fighter || !attack || attack.projectile || !Number.isFinite(attack.range) ||
        !Number.isFinite(fighter.x) || !Number.isFinite(fighter.y)) return null;
    const reach=Math.max(20,Math.min(200,attack.range));
    const h=Math.max(30,Math.min(155,Number(attack.height)||92));
    const offset=strikeOffsets[type] || {from:h+24,lead:18};
    const facing=fighter.facing<0?-1:1;
    const lead=offset.lead;
    return {
      x:facing>0?fighter.x+lead:fighter.x-lead-reach,
      y:fighter.y-offset.from,
      width:reach,height:h
    };
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
    // Close combat stays fully framed. A subtle emphasis on specials does
    // not recreate the old extreme close-up at point-blank range.
    return 1 + .055 * clamp((distance - 160) / 550) + .012 * clamp(emphasis);
  }

  root.MugenCombatV5 = Object.freeze({
    MIN_SPACING, CONTACT_ASSIST, separate, assistPunch, hurtbox, attackHitbox, sweepCircle, cameraZoom
  });
})(typeof window === "undefined" ? globalThis : window);
