'use strict';
/* PP-03 P1 — duplicate movement alias.
 * Press W, press ArrowUp, release W: forward must stay true while ArrowUp is
 * still held. Same for every alias pair, and for mixed keyboard/touch input.
 * Baseline: keyup sets keys[map]=false unconditionally, killing the action
 * even though the other physical key is still down.
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('PP-03 duplicate movement alias');

const PAIRS = [
  ['forward', 'KeyW', 'ArrowUp'],
  ['back', 'KeyS', 'ArrowDown'],
  ['left', 'KeyA', 'ArrowLeft'],
  ['right', 'KeyD', 'ArrowRight'],
];
for (const [dir, a, b] of PAIRS) {
  check(`${dir}: release ${a} while ${b} held keeps moving`, () => {
    const h = loadGame();
    h.game.startGame();
    h.keyDown(a); h.keyDown(b); h.keyUp(a);
    assert.equal(h.game.keys[dir], true, `${dir} became false after releasing ${a} while ${b} held`);
    h.keyUp(b);
    assert.equal(h.game.keys[dir], false, `${dir} stayed true after releasing both keys`);
  });
  check(`${dir}: release ${b} while ${a} held keeps moving (reverse order)`, () => {
    const h = loadGame();
    h.game.startGame();
    h.keyDown(b); h.keyDown(a); h.keyUp(b);
    assert.equal(h.game.keys[dir], true, `${dir} became false after releasing ${b} while ${a} held`);
    h.keyUp(a);
    assert.equal(h.game.keys[dir], false, `${dir} stayed true after releasing both keys`);
  });
}
check('forward: keyboard W survives touch-forward release (mixed devices)', () => {
  const h = loadGame();
  h.game.startGame();
  const fwdBtn = h.touchBtns[0]; // data-k=forward
  h.keyDown('KeyW');
  fwdBtn.dispatch('pointerdown', { preventDefault() {} });
  fwdBtn.dispatch('pointerup', { preventDefault() {} });
  assert.equal(h.game.keys.forward, true, 'forward became false after touch release while W held');
  h.keyUp('KeyW');
  assert.equal(h.game.keys.forward, false, 'forward stayed true after releasing W');
});
check('forward: touch survives W release (mixed devices, reverse)', () => {
  const h = loadGame();
  h.game.startGame();
  const fwdBtn = h.touchBtns[0];
  fwdBtn.dispatch('pointerdown', { preventDefault() {} });
  h.keyDown('KeyW');
  h.keyUp('KeyW');
  assert.equal(h.game.keys.forward, true, 'forward became false after W release while touch held');
  fwdBtn.dispatch('pointerup', { preventDefault() {} });
  assert.equal(h.game.keys.forward, false, 'forward stayed true after touch release');
});
check('forward actually moves the penguin while the second alias is held', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('KeyW'); h.keyDown('ArrowUp'); h.keyUp('KeyW');
  const z0 = h.game.G.pos.z;
  h.runSeconds(0.5, 60);
  assert.ok(h.game.G.pos.z < z0 - 1, `penguin did not move forward (z ${z0} -> ${h.game.G.pos.z})`);
});

if (failures) { console.log(`PP-03: ${failures} FAILURE(S) — defect reproduced on baseline`); process.exitCode = 1; }
else console.log('PP-03: ALL PASS');
