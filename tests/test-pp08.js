'use strict';
/* PP-08 P1 — concurrent instances and saves.
 * (a) main.js must take the Electron single-instance lock and focus the
 *     primary window when a second instance launches (STATUS.md: a second
 *     instance saw an empty profile).
 * (b) Saves must be validated and migrated on load (out-of-range / wrong-type
 *     fields clamped or ignored, never trusted blindly) and a write failure
 *     must be visible instead of silently swallowed.
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('PP-08 concurrent instances and saves');

// Values coming out of the vm sandbox are cross-realm: assert.deepEqual
// (strict) rejects them on prototype grounds even when the data matches.
// Compare through a JSON round-trip instead.
const plain = (v) => JSON.parse(JSON.stringify(v));

const mainJs = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
check('main.js takes the single-instance lock', () => {
  assert.ok(/requestSingleInstanceLock\s*\(\)/.test(mainJs), 'app.requestSingleInstanceLock() missing');
});
check('second instance focuses the primary window instead of opening a new one', () => {
  assert.ok(/second-instance/.test(mainJs), 'no second-instance handler in main.js');
  assert.ok(/focus\(\)/.test(mainJs), 'second-instance handler does not focus the primary window');
});
check('test-only isolated userData path exists (no production profile sharing in tests)', () => {
  assert.ok(/PP_TEST_USER_DATA|userData/.test(mainJs), 'no isolated userData support for tests');
});

check('malformed save JSON loads defaults without throwing', () => {
  const h = loadGame({ save: '{this is not json' });
  assert.deepEqual(plain(h.game.save.bestZone), [0, 0, 0]);
  assert.equal(h.game.save.lifetimeFish, 0);
});
check('out-of-range / wrong-type save fields are validated and clamped', () => {
  const raw = JSON.stringify({ bestZone: [99, -5, 3], lifetimeFish: -3, wins: 2, bestTime: '50', ach: {} });
  const h = loadGame({ save: raw });
  assert.deepEqual(plain(h.game.save.bestZone), [8, 0, 3], 'bestZone not clamped: ' + JSON.stringify(h.game.save.bestZone));
  assert.equal(h.game.save.lifetimeFish, 0, 'negative lifetimeFish kept: ' + h.game.save.lifetimeFish);
  assert.equal(h.game.save.wins, 2, 'valid wins field was dropped');
  assert.equal(h.game.save.bestTime, 0, 'string bestTime was trusted: ' + h.game.save.bestTime);
  assert.equal(h.game.totalBest(), 11, 'totalBest should be 8+0+3=11, got ' + h.game.totalBest());
});
check('valid existing progress is preserved across a reload', () => {
  const raw = JSON.stringify({ bestZone: [8, 6, 6], lifetimeFish: 22, wins: 1, bestTime: 50.4, ach: { ACH_FIRST_CATCH: true } });
  const h = loadGame({ save: raw });
  assert.deepEqual(plain(h.game.save.bestZone), [8, 6, 6]);
  assert.equal(h.game.save.lifetimeFish, 22);
  assert.equal(h.game.save.wins, 1);
  assert.equal(h.game.save.bestTime, 50.4, 'precise bestTime was not preserved: ' + h.game.save.bestTime);
  assert.equal(h.game.totalBest(), 20);
});
check('a storage write failure is visible, not silently swallowed', () => {
  const h = loadGame({ failWrites: true });
  h.game.persist();
  const errBox = h.errBox();
  const visible = (errBox && errBox.style && errBox.style.display === 'block') || h.game.G.saveError;
  assert.ok(visible, 'persist() failed silently: no visible error and no saveError flag');
});

if (failures) { console.log(`PP-08: ${failures} FAILURE(S) — defect reproduced on baseline`); process.exitCode = 1; }
else console.log('PP-08: ALL PASS');
