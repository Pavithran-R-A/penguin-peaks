'use strict';
/* PP-07 P1 — focus loss / input recovery.
 * Baseline has no blur or visibilitychange handler: hold W/Space, Alt+Tab,
 * release, return — the key stays stuck and the game keeps running.
 * Repair: clear keyboard, touch and gamepad action states on blur,
 * visibility loss and disconnect; auto-pause and require deliberate resume.
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('PP-07 focus loss / input recovery');

check('window blur handler exists', () => {
  const h = loadGame();
  assert.ok(h.winListenerCount('blur') >= 1, 'no window blur handler registered');
});
check('document visibilitychange handler exists', () => {
  const h = loadGame();
  assert.ok(h.docListenerCount('visibilitychange') >= 1, 'no visibilitychange handler registered');
});
check('gamepad disconnect handler exists', () => {
  const h = loadGame();
  assert.ok(h.winListenerCount('gamepaddisconnected') >= 1, 'no gamepaddisconnected handler registered');
});
check('blur while holding W: input cleared, game auto-pauses, no movement after', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('KeyW');
  h.runSeconds(0.5, 60);
  const zBeforeBlur = h.game.G.pos.z;
  h.dispatchWindow('blur', {});
  assert.equal(h.game.keys.forward, false, 'forward stayed held after blur');
  assert.equal(h.game.G.state, 'paused', 'game did not auto-pause on blur (state=' + h.game.G.state + ')');
  // The user releases W while the window is unfocused (no keyup reaches us).
  h.runSeconds(2, 60);
  assert.ok(Math.abs(h.game.G.pos.z - zBeforeBlur) < 1e-9,
    `penguin kept moving after blur (z ${zBeforeBlur} -> ${h.game.G.pos.z})`);
  // A fresh deliberate input after resume works again.
  h.keyDown('KeyP'); // resume from the pause screen
  assert.equal(h.game.G.state, 'playing', 'deliberate resume (P) did not work after blur-pause');
  h.keyDown('KeyW');
  h.runSeconds(0.5, 60);
  assert.ok(h.game.G.pos.z < zBeforeBlur - 1, 'fresh W after resume did not move the penguin');
});
check('visibility hidden while holding Space: queued jump cleared, game pauses', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('Space'); // queue a jump
  h.document.hidden = true;
  h.dispatchDocument('visibilitychange', {});
  assert.equal(h.game.G.state, 'paused', 'game did not auto-pause on visibility loss');
  h.runFrames(5, 1 / 60);
  assert.ok(Math.abs(h.game.G.vy) < 0.5, `queued jump fired after visibility loss (vy=${h.game.G.vy})`);
  assert.ok(Math.abs(h.game.G.pos.y - 0) < 0.01, 'penguin left the ground after visibility loss');
  h.document.hidden = false;
  h.dispatchDocument('visibilitychange', {});
  assert.equal(h.game.G.state, 'paused', 'game resumed by itself on visibility return (must need deliberate resume)');
});
check('gamepad disconnect clears input state', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('KeyW');
  h.dispatchWindow('gamepaddisconnected', { gamepad: { index: 0 } });
  assert.equal(h.game.keys.forward, false, 'forward stayed held after gamepad disconnect');
});

if (failures) { console.log(`PP-07: ${failures} FAILURE(S) — defect reproduced on baseline`); process.exitCode = 1; }
else console.log('PP-07: ALL PASS');
