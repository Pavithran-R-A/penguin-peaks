'use strict';
/* M2d — controller support (PDF §05).
 * Gamepad API: left stick (dead zone 0.25) + D-pad drive movement,
 * A = jump / confirm (edge-triggered), X = dash (edge), Y = belly slide
 * (held), Start = pause/resume, B = close panel. Prompts switch to
 * gamepad wording while a pad is connected; disconnect clears input
 * and auto-pauses (PP-07). A physical controller is still human-only.
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('M2d controller support');

function makePad() {
  return {
    connected: true, id: 'Test Pad',
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
  };
}
function press(pad, i) { pad.buttons[i].pressed = true; }
function release(pad, i) { pad.buttons[i].pressed = false; }

check('left stick right moves the penguin east; dead zone ignores a 0.1 deflection', () => {
  const h = loadGame();
  const pad = makePad();
  h.setGamepad(pad);
  h.game.startGame();
  pad.axes[0] = 0.1; // inside the 0.25 dead zone
  h.runSeconds(0.5, 60);
  assert.ok(Math.abs(h.game.G.pos.x) < 0.01, `dead zone leaked movement (x ${h.game.G.pos.x})`);
  pad.axes[0] = 0.6;
  h.runSeconds(0.5, 60);
  assert.ok(h.game.G.pos.x > 1, `left stick did not move the penguin east (x ${h.game.G.pos.x})`);
});

check('left stick up and D-pad up both move the penguin north', () => {
  const h = loadGame();
  const pad = makePad();
  h.setGamepad(pad);
  h.game.startGame();
  pad.axes[1] = -1;
  h.runSeconds(0.5, 60);
  assert.ok(h.game.G.pos.z < 0.5, `left stick up did not move north (z ${h.game.G.pos.z})`);
  const h2 = loadGame();
  const pad2 = makePad();
  h2.setGamepad(pad2);
  h2.game.startGame();
  press(pad2, 12); // D-pad up
  h2.runSeconds(0.5, 60);
  assert.ok(h2.game.G.pos.z < 0.5, `D-pad up did not move north (z ${h2.game.G.pos.z})`);
});

check('A jumps exactly once while held (edge-triggered), and again on re-press', () => {
  const h = loadGame();
  const pad = makePad();
  h.setGamepad(pad);
  h.game.startGame();
  press(pad, 0);
  h.runFrames(5, 1 / 60);
  assert.ok(h.game.G.vy > 5, `A did not jump (vy ${h.game.G.vy})`);
  h.runSeconds(2, 60); // land and wait, A still held
  assert.ok(h.game.G.grounded, 'penguin never landed');
  assert.ok(Math.abs(h.game.G.pos.y) < 0.01, `held A re-jumped after landing (y ${h.game.G.pos.y})`);
  release(pad, 0);
  h.runFrames(5, 1 / 60);
  press(pad, 0);
  h.runFrames(5, 1 / 60);
  assert.ok(h.game.G.vy > 5, 'fresh A press after release did not jump');
});

check('X dashes (after unlock) and Start pauses and resumes', () => {
  const h = loadGame();
  const pad = makePad();
  h.setGamepad(pad);
  h.game.startGame();
  h.game.G.hasDash = true; // test setup: dash already taught
  press(pad, 2);
  h.runFrames(3, 1 / 60);
  assert.ok(h.game.G.dashT > 0, 'X did not start a dash');
  release(pad, 2);
  h.runFrames(30, 1 / 60);
  press(pad, 9); // Start
  h.runFrames(3, 1 / 60);
  assert.equal(h.game.G.state, 'paused', 'Start did not pause');
  release(pad, 9);
  h.runFrames(3, 1 / 60);
  press(pad, 9);
  h.runFrames(3, 1 / 60);
  assert.equal(h.game.G.state, 'playing', 'Start did not resume');
});

check('Y (held) belly-slides; prompts switch to gamepad wording', () => {
  const h = loadGame();
  const pad = makePad();
  h.setGamepad(pad);
  h.game.startGame();
  pad.axes[1] = 1; // run south on the big start island
  h.runSeconds(1, 60);
  press(pad, 3); // Y
  h.runSeconds(0.5, 60);
  assert.ok(h.game.G.sliding, 'held Y did not start a belly slide');
  assert.ok(h.game.gamepadActive, 'gamepadActive not set while a pad is connected');
  const help = h.elsById.controlsHelp.innerHTML;
  assert.ok(help.indexOf('Gamepad') >= 0, 'controls help did not switch to gamepad prompts');
});

check('disconnect clears gamepad input and auto-pauses (PP-07 preserved)', () => {
  const h = loadGame();
  const pad = makePad();
  h.setGamepad(pad);
  h.game.startGame();
  pad.axes[1] = -1;
  h.runSeconds(0.5, 60);
  const zBefore = h.game.G.pos.z;
  h.setGamepad(null);
  h.dispatchWindow('gamepaddisconnected', {});
  assert.equal(h.game.keys.forward, false, 'gamepad forward stayed held after disconnect');
  assert.equal(h.game.G.state, 'paused', 'game did not auto-pause on disconnect');
  h.runSeconds(1, 60);
  assert.ok(Math.abs(h.game.G.pos.z - zBefore) < 1e-9, 'penguin kept moving after disconnect');
  assert.equal(h.game.gamepadActive, false, 'gamepadActive stayed true after disconnect');
});

check('A confirms on the start screen; B closes an open panel', () => {
  const h = loadGame();
  const pad = makePad();
  h.setGamepad(pad);
  assert.equal(h.game.G.state, 'start');
  press(pad, 0);
  h.runFrames(3, 1 / 60);
  assert.equal(h.game.G.state, 'playing', 'A did not start the game from the start screen');
  release(pad, 0);
  h.runFrames(3, 1 / 60);
  h.keyDown('KeyC'); // open the collection panel by keyboard
  assert.ok(!h.elsById.collectionScreen.classList.contains('hidden'), 'collection panel did not open');
  press(pad, 1); // B
  h.runFrames(3, 1 / 60);
  assert.ok(h.elsById.collectionScreen.classList.contains('hidden'), 'B did not close the panel');
});

console.log(failures ? `\n${failures} FAILURES` : '\nALL M2d CHECKS PASSED');
process.exitCode = failures ? 1 : 0;
