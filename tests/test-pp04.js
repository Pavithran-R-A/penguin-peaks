'use strict';
/* PP-04 P1 — action auto-repeat.
 * Holding an action key (OS key repeat) must fire exactly one action:
 * repeated P must not toggle pause back, repeated Space must not fire the
 * second (double) jump. A deliberate release + re-press must still work.
 * Baseline: handlers ignore e.repeat, so repeat P resumes and repeat Space
 * double-jumps (vy 2.70 -> 9.44 in the audit).
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('PP-04 action auto-repeat');

check('holding P for 2 s pauses exactly once (repeat P does not resume)', () => {
  const h = loadGame();
  h.game.startGame();
  assert.equal(h.game.G.state, 'playing');
  h.keyDown('KeyP');
  assert.equal(h.game.G.state, 'paused', 'first P did not pause');
  // Simulate ~2 s of OS auto-repeat: a repeat keydown every ~30 ms.
  // NOTE: checked after EVERY single repeat — an even number of toggles
  // would silently land back on 'paused' and hide the defect.
  for (let i = 0; i < 60; i++) {
    h.keyDown('KeyP', { repeat: true });
    assert.equal(h.game.G.state, 'paused', `repeat P #${i + 1} toggled pause back to ` + h.game.G.state);
    h.runFrames(2, 1 / 60);
  }
  h.keyUp('KeyP');
  // A deliberate fresh press still resumes.
  h.keyDown('KeyP');
  assert.equal(h.game.G.state, 'playing', 'fresh P after release did not resume');
});
check('holding Escape for 2 s pauses exactly once', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('Escape');
  assert.equal(h.game.G.state, 'paused');
  for (let i = 0; i < 30; i++) {
    h.keyDown('Escape', { repeat: true });
    assert.equal(h.game.G.state, 'paused', `repeat Escape #${i + 1} toggled pause`);
  }
});
check('holding Space mid-air does not fire the double jump', () => {
  const h = loadGame();
  h.game.startGame();
  h.game.G.hasDoubleJump = true; // World 2 move, as if checkpoint 1 was reached
  h.keyDown('Space');
  h.runFrames(20, 1 / 60); // airborne, rising/falling with vy ~1.8
  h.keyUp('Space');
  assert.equal(h.game.G.grounded, false, 'penguin should be airborne here');
  const vyBefore = h.game.G.vy;
  const airBefore = h.game.G.airJumps;
  assert.ok(vyBefore < 5, 'setup: vy should be small before repeat, got ' + vyBefore);
  h.keyDown('Space', { repeat: true });
  h.runFrames(1, 1 / 60);
  assert.ok(h.game.G.vy < 5, `repeat Space fired the double jump (vy ${vyBefore} -> ${h.game.G.vy})`);
  assert.equal(h.game.G.airJumps, airBefore, 'repeat Space consumed the air jump');
  h.keyUp('Space');
});
check('release + re-press Space mid-air still double-jumps (intentional)', () => {
  const h = loadGame();
  h.game.startGame();
  h.game.G.hasDoubleJump = true;
  h.keyDown('Space');
  h.runFrames(20, 1 / 60);
  h.keyUp('Space');
  const vyBefore = h.game.G.vy;
  h.keyDown('Space'); // fresh press, not a repeat
  h.runFrames(1, 1 / 60);
  assert.ok(h.game.G.vy > vyBefore + 3, `fresh Space re-press did not double-jump (vy ${vyBefore} -> ${h.game.G.vy})`);
  assert.equal(h.game.G.airJumps, 0, 'air jump was not consumed by the fresh press');
});
check('holding R for 2 s does not restart repeatedly (single reset)', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('KeyW'); h.runSeconds(0.5, 60); h.keyUp('KeyW');
  const zBefore = h.game.G.pos.z;
  assert.ok(zBefore < 0, 'setup: penguin should have moved north');
  h.keyDown('KeyR');
  assert.ok(Math.abs(h.game.G.pos.z - 2) < 0.01, 'first R did not reset to spawn');
  for (let i = 0; i < 30; i++) h.keyDown('KeyR', { repeat: true });
  assert.equal(h.game.G.state, 'playing', 'repeat R changed state to ' + h.game.G.state);
  assert.ok(Math.abs(h.game.G.pos.z - 2) < 0.01, 'repeat R moved the penguin from spawn');
});

if (failures) { console.log(`PP-04: ${failures} FAILURE(S) — defect reproduced on baseline`); process.exitCode = 1; }
else console.log('PP-04: ALL PASS');
