'use strict';
/* PP-05 P1 — unwanted jump on restart.
 * Queue Space, call resetGame(true), step once: baseline vy becomes 10.07
 * because resetGame omits jumpQueued and other transient fields (grounded /
 * coyote / jumpBuffer survive the reset, so the stale queued jump fires).
 * After a restart from any state the spawn must be stable with no movement
 * until a fresh action.
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('PP-05 unwanted jump on restart');

check('queued Space before restart does not jump after reset (audit case)', () => {
  const h = loadGame();
  h.game.startGame();
  h.runFrames(5, 1 / 60); // settle on the ground (grounded=true)
  assert.equal(h.game.G.grounded, true, 'setup: penguin should be grounded');
  h.keyDown('Space'); // queues the jump; no step yet
  h.keyUp('Space');
  h.game.resetGame(true);
  h.runFrames(1, 1 / 60);
  assert.ok(Math.abs(h.game.G.vy) < 0.5, `stale queued jump fired after restart (vy=${h.game.G.vy})`);
  assert.ok(Math.abs(h.game.G.pos.y - 0) < 0.01, `penguin left the ground after restart (y=${h.game.G.pos.y})`);
});
check('spawn is stable for 1 s after restart with no fresh input', () => {
  const h = loadGame();
  h.game.startGame();
  h.runFrames(5, 1 / 60);
  h.keyDown('Space');
  h.game.resetGame(true);
  h.runSeconds(1, 60);
  assert.ok(Math.abs(h.game.G.pos.x - 0) < 0.01, 'x moved: ' + h.game.G.pos.x);
  assert.ok(Math.abs(h.game.G.pos.z - 2) < 0.01, 'z moved: ' + h.game.G.pos.z);
  assert.ok(Math.abs(h.game.G.pos.y - 0) < 0.01, 'y moved: ' + h.game.G.pos.y);
  assert.equal(h.game.G.vy, 0, 'vy=' + h.game.G.vy);
});
check('transient physics/input fields are cleared by reset', () => {
  const h = loadGame();
  h.game.startGame();
  h.game.G.jumpBuffer = 0.13;
  h.game.G.coyote = 0.13;
  h.game.G.grounded = true;
  h.game.G.airJumps = 1;
  h.game.G.dashT = 0.1;
  h.game.G.dashCd = 0.5;
  h.game.G.invuln = 1.0;
  h.game.G.facing = 2.5;
  h.game.G.vel.x = 5; h.game.G.vel.z = -5;
  h.game.resetGame(true);
  assert.equal(h.game.G.jumpBuffer, 0, 'jumpBuffer survived reset');
  assert.equal(h.game.G.coyote, 0, 'coyote survived reset');
  assert.equal(h.game.G.grounded, false, 'grounded survived reset');
  assert.equal(h.game.G.airJumps, 0, 'airJumps survived reset');
  assert.equal(h.game.G.dashT, 0, 'dashT survived reset');
  assert.equal(h.game.G.dashCd, 0, 'dashCd survived reset');
  assert.equal(h.game.G.invuln, 0, 'invuln survived reset');
  assert.equal(h.game.G.facing, 0, 'facing survived reset');
  assert.equal(h.game.G.vel.x, 0, 'vel.x survived reset');
  assert.equal(h.game.G.vel.z, 0, 'vel.z survived reset');
});
check('restart mid-dash leaves no dash running', () => {
  const h = loadGame();
  h.game.startGame();
  h.game.G.hasDash = true;
  h.keyDown('ShiftLeft');
  h.runFrames(1, 1 / 60);
  h.keyUp('ShiftLeft');
  assert.ok(h.game.G.dashT > 0, 'setup: dash should be active');
  h.game.resetGame(true);
  h.runFrames(5, 1 / 60);
  assert.equal(h.game.G.dashT, 0, 'dashT survived restart');
  assert.ok(Math.abs(h.game.G.vel.x) < 0.5 && Math.abs(h.game.G.vel.z) < 0.5,
    `dash velocity survived restart (vx=${h.game.G.vel.x}, vz=${h.game.G.vel.z})`);
});
check('restart from a modal (collection panel open) clears queued input', () => {
  const h = loadGame();
  h.game.startGame();
  h.runFrames(5, 1 / 60); // settle on the ground first (grounded=true)
  h.keyDown('KeyC'); // opens collection panel (pauses)
  assert.equal(h.game.G.state, 'paused', 'panel did not pause the game');
  h.keyDown('Space'); // stale queue while panel is open
  h.keyUp('Space');
  h.game.resetGame(true);
  h.runFrames(1, 1 / 60);
  assert.ok(Math.abs(h.game.G.vy) < 0.5, `stale jump fired after modal restart (vy=${h.game.G.vy})`);
});

if (failures) { console.log(`PP-05: ${failures} FAILURE(S) — defect reproduced on baseline`); process.exitCode = 1; }
else console.log('PP-05: ALL PASS');
