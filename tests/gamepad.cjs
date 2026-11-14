const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

// Gamepad API tests use synthetic inputs; physical DualSense testing still requires a browser.
const scope = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "..", "dualsense-controller.js"), "utf8"),
  scope
);
const pressedButton = () => ({ pressed: false, value: 0 });
const pad = {
  index: 0, id: "DualSense Wireless Controller", connected: true,
  axes: [0, 0], buttons: Array.from({ length: 16 }, pressedButton)
};
let screen = "menu";
let paused = false;
let runToggles = 0;
const events = [];
const controls = new Set();
const input = scope.window.MugenGamepad.create({
  getGamepads: () => [pad],
  screen: () => screen,
  isPaused: () => paused,
  isResultOpen: () => false,
  press: name => { controls.add(name); events.push("press:" + name); },
  release: name => { controls.delete(name); events.push("release:" + name); },
  navigate: dir => events.push("nav:" + dir),
  confirm: () => events.push("confirm"),
  back: () => events.push("back"),
  pause: () => { paused = !paused; events.push("pause:" + paused); },
  toggleRun: () => {runToggles++;events.push("L3 run toggle");},
  onConnection: active => events.push("connection:" + active),
  onDisconnect: () => events.push("disconnect")
});
const button = (n, on) => {
  pad.buttons[n].pressed = on;
  pad.buttons[n].value = Number(on);
};

input.update(0);
assert.equal(input.connected, true);
button(13, true);
input.update(20);
input.update(70);
assert.equal(events.filter(x => x === "nav:1").length, 1);
input.update(390);
assert.equal(events.filter(x => x === "nav:1").length, 2);
button(13, false);
button(0, true);
input.update(410);
input.update(420);
assert.equal(events.filter(x => x === "confirm").length, 1);

button(0, false);
input.update(425);
screen = "fight";
// L3 must be an edge-triggered toggle, not one toggle per animation frame.
button(10,true);
input.update(426);
input.update(427);
assert.equal(runToggles,1);
button(10,false);input.update(428);
button(10,true);input.update(429);
assert.equal(runToggles,2);
button(10,false);input.update(430);
pad.axes[0] = -.9;
button(2, true); // Square
button(6, true); // L2
input.update(440);
assert.ok(controls.has("left") && controls.has("light") && controls.has("charge"));
button(2, false);
button(6, false);
pad.axes[0] = 0;
button(9, true); // Options
input.update(460);
assert.equal(paused, true);
assert.equal(controls.size, 0);

button(9, false);
input.update(480);
button(9, true);
input.update(500);
assert.equal(paused, false);
button(9, false);
input.update(520);

button(7, true); // R2
button(5, true); // R1
button(1, true); // Circle
button(3, true); // Triangle
button(4, true); // L1
input.update(540);
for (const action of ["ultimate", "dash", "gun", "heavy", "block"])
  assert.ok(controls.has(action), action + " should be active");

pad.connected = false;
input.update(560);
assert.equal(input.connected, false);
assert.equal(controls.size, 0);
assert.ok(events.includes("disconnect"));

console.log("PASS: DualSense L3 edge-triggered run toggle, R1 dash, stick/D-pad, X confirm, menu repeat, attacks, pause/resume and disconnect cleanup.");
