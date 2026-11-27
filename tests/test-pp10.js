'use strict';
/* PP-10 P2 — medal display disagrees with threshold.
 * At 120.4 s medalLines() says "finished 2:00" but "1 seconds short of
 * 2:00": best time is rounded, display is floored. Repair: store precise
 * elapsed time and display consistent precision (tenths), so the shown
 * finish time and the shortfall always agree.
 * Acceptance: 119.9, 120.0, 120.1, 179.9, 180.0, 180.1 s; save and medal UI agree.
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('PP-10 medal display vs threshold');

function linesAt(t, fish) {
  const h = loadGame();
  h.game.G.time = t;
  h.game.G.fish = fish === undefined ? 24 : fish;
  return h.game.medalLines().join(' | ');
}

check('119.9 s earns Gold time and shows 1:59.9', () => {
  const s = linesAt(119.9);
  assert.ok(/Gold time/.test(s) && /1:59\.9/.test(s), 'got: ' + s);
  assert.ok(!/short/.test(s), 'gold line must not mention a shortfall: ' + s);
});
check('120.0 s earns Gold time and shows 2:00.0', () => {
  const s = linesAt(120.0);
  assert.ok(/🥇 Gold time/.test(s) && /2:00\.0/.test(s), 'got: ' + s);
});
check('120.1 s is NOT gold: shows 2:00.1 finished and 0.1 seconds short', () => {
  const s = linesAt(120.1);
  assert.ok(!/🥇 Gold time/.test(s), '120.1 s wrongly awarded gold time: ' + s);
  assert.ok(/2:00\.1/.test(s), 'finished time not shown with tenths: ' + s);
  assert.ok(/0\.1 second/.test(s), 'shortfall not shown as 0.1 seconds: ' + s);
});
check('120.4 s (audit case): shows 2:00.4 and 0.4 seconds short, never "finished 2:00"', () => {
  const s = linesAt(120.4);
  assert.ok(/2:00\.4/.test(s), 'got: ' + s);
  assert.ok(/0\.4 second/.test(s), 'got: ' + s);
  assert.ok(!/finished 2:00[^.]/.test(s) && !/finished in 2:00[^.]/.test(s),
    'still claims a 2:00 finish: ' + s);
});
check('179.9 s: short of gold by 59.9 s, shown with tenths', () => {
  const s = linesAt(179.9);
  assert.ok(/2:59\.9/.test(s), 'got: ' + s);
  assert.ok(/59\.9 second/.test(s), 'got: ' + s);
});
check('180.0 s earns Silver time (3:00.0) with no shortfall', () => {
  const s = linesAt(180.0);
  assert.ok(/Silver time: 3:00/.test(s), 'got: ' + s);
  assert.ok(/3:00\.0/.test(s), 'got: ' + s);
});
check('180.1 s is past silver: shows 3:00.1 and 0.1 seconds short of 3:00', () => {
  const s = linesAt(180.1);
  assert.ok(/3:00\.1/.test(s), 'got: ' + s);
  assert.ok(/0\.1 second/.test(s), 'got: ' + s);
  assert.ok(!/finished 3:00[^.]/.test(s), 'still claims a 3:00 finish: ' + s);
});
check('best time is stored precisely, not rounded (win at 50.4 s)', () => {
  const h = loadGame();
  h.game.startGame();
  h.game.G.time = 50.4;
  h.game.G.fish = 20;
  h.game.winGame();
  assert.equal(h.game.save.bestTime, 50.4, 'bestTime stored as ' + h.game.save.bestTime);
});
check('save and medal UI agree: collection panel shows the precise best time', () => {
  const h = loadGame();
  h.game.startGame();
  h.game.G.time = 50.4;
  h.game.G.fish = 20;
  h.game.winGame();
  h.game.openPanel('collectionScreen');
  const body = h.document.getElementById('collBody').innerHTML;
  assert.ok(/0:50\.4/.test(body), 'collection panel shows ' + JSON.stringify(body));
});

if (failures) { console.log(`PP-10: ${failures} FAILURE(S) — defect reproduced on baseline`); process.exitCode = 1; }
else console.log('PP-10: ALL PASS');
