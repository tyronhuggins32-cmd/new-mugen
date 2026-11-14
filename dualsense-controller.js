/* DualSense / standard Gamepad API input for New Mugen.
 * PS5 layout (standard mapping):
 * Left stick / D-pad = move; X / up = jump; L1 / down = block;
 * Square = light; Triangle = heavy; Circle = Spirit Gun;
 * R1 = dash; L3 (left-stick click) = toggle sustained run;
 * L2 = charge; R2 = MAX Spirit Gun; Options = pause.
 * Menu: D-pad / left stick vertical = select, X = confirm, O = back.
 * Gamepads only become available to Safari/Chromium after a physical button press.
 */
(function(global) {
  "use strict";
  const BUTTON = Object.freeze({
    cross: 0, circle: 1, square: 2, triangle: 3,
    l1: 4, r1: 5, l2: 6, r2: 7, share: 8, options: 9,
    l3: 10, r3: 11,
    up: 12, down: 13, left: 14, right: 15
  });
  const DEADZONE = .30;
  const HOLD_REPEAT_MS = 215;

  function create(callbacks) {
    const old = new Set();
    const activeControls = new Set();
    let previousPad = null;
    let previousPadId = null;
    let lastMenuDirection = 0;
    let nextMenuMove = 0;
    let connected = false;
    const source = "dualsense";

    const buttonDown = (pad, number) => {
      const button = pad.buttons && pad.buttons[number];
      return Boolean(button && (button.pressed || button.value >= .55));
    };

    function updateStatus(value, pad) {
      if (connected === value) return;
      connected = value;
      if (callbacks.onConnection) callbacks.onConnection(connected, pad);
    }

    function releaseAll() {
      for (const control of activeControls) callbacks.release(control, source);
      activeControls.clear();
    }

    function releaseAndForget() {
      releaseAll();
      old.clear();
      previousPad = null;
      previousPadId = null;
      lastMenuDirection = 0;
      nextMenuMove = 0;
    }

    function update(now = 0) {
      let gamepads = [];
      try { gamepads = callbacks.getGamepads?.() || []; } catch (_) { /* no API */ }
      const pads = Array.from(gamepads).filter(p => p && p.connected !== false);
      // Keep the same controller when other Bluetooth gamepads wake up.
      const pad = pads.find(p => p.index === previousPad && p.id === previousPadId) || pads[0] || null;
      if (!pad) {
        if (connected) {
          releaseAndForget();
          updateStatus(false, null);
          callbacks.onDisconnect?.();
        }
        return;
      }
      if (previousPad !== pad.index || previousPadId !== pad.id) {
        releaseAndForget();
        previousPad = pad.index;
        previousPadId = pad.id;
      }
      updateStatus(true, pad);
      const down = key => buttonDown(pad, BUTTON[key]);
      const justPressed = key => down(key) && !old.has(key);
      const axisX = Number(pad.axes?.[0] || 0);
      const axisY = Number(pad.axes?.[1] || 0);
      const screen = callbacks.screen();
      const paused = Boolean(callbacks.isPaused?.());
      const acceptingFightInput = screen === "fight" && !paused && !callbacks.isResultOpen?.();

      // Edges are sampled before the new button state replaces the previous one.
      if (justPressed("options") && screen === "fight" && !callbacks.isResultOpen?.()) {
        callbacks.pause?.();
      }
      // L3 is an edge-triggered toggle, never an auto-repeat or held action.
      // Ignore it while paused or in menus, and re-arm only after release.
      if (justPressed("l3") && acceptingFightInput) callbacks.toggleRun?.();

      const mapping = acceptingFightInput && !callbacks.isPaused?.() ? {
        left: down("left") || axisX < -DEADZONE,
        right: down("right") || axisX > DEADZONE,
        jump: down("up") || axisY < -.72 || down("cross"),
        block: down("down") || axisY > .72 || down("l1"),
        // Retain ordinary blocking while distinguishing the low D-pad input.
        crouch: down("down") || axisY > .72,
        light: down("square"),
        heavy: down("triangle"),
        gun: down("circle"),
        dash: down("r1"),
        charge: down("l2"),
        ultimate: down("r2")
      } : {};

      for (const control of [...activeControls]) {
        if (!mapping[control]) {
          callbacks.release(control, source);
          activeControls.delete(control);
        }
      }
      for (const [control, isDown] of Object.entries(mapping)) {
        if (isDown && !activeControls.has(control)) {
          callbacks.press(control, source);
          activeControls.add(control);
        }
      }

      if (!acceptingFightInput || callbacks.isPaused?.()) {
        const direction = down("up") || axisY < -.56 ? -1 : down("down") || axisY > .56 ? 1 : 0;
        if (direction) {
          if (lastMenuDirection !== direction || now >= nextMenuMove) {
            callbacks.navigate?.(direction);
            nextMenuMove = now + (lastMenuDirection !== direction ? 330 : HOLD_REPEAT_MS);
          }
        }
        lastMenuDirection = direction;
        if (justPressed("cross")) callbacks.confirm?.();
        else if (justPressed("circle")) callbacks.back?.();
      } else {
        lastMenuDirection = 0;
        nextMenuMove = 0;
      }

      old.clear();
      for (const key of Object.keys(BUTTON)) if (down(key)) old.add(key);
    }

    return { update, releaseAll, get connected() { return connected; } };
  }

  global.MugenGamepad = { create, BUTTON };
})(window);
