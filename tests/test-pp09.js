'use strict';
/* PP-09 P1 — web / desktop divergence.
 * Root index.html lacks persistent collection, double jump, dash and the
 * start-card fix present in app/index.html. Repair: one canonical game
 * source (app/index.html) and a deterministic copy/build pipeline
 * (scripts/sync-web-demo.js) so the two files stay byte-identical, plus a
 * parity check both files must pass.
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('PP-09 web / desktop divergence');

const repo = path.join(__dirname, '..');
const appHtml = fs.readFileSync(path.join(repo, 'app', 'index.html'), 'utf8');
const webHtml = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');

check('deterministic sync pipeline exists (scripts/sync-web-demo.js)', () => {
  assert.ok(fs.existsSync(path.join(repo, 'scripts', 'sync-web-demo.js')),
    'scripts/sync-web-demo.js missing');
});
check('sync pipeline is deterministic (run twice, same hash)', () => {
  execFileSync('node', [path.join(repo, 'scripts', 'sync-web-demo.js')], { stdio: 'pipe' });
  const h1 = hash(fs.readFileSync(path.join(repo, 'index.html'), 'utf8'));
  execFileSync('node', [path.join(repo, 'scripts', 'sync-web-demo.js')], { stdio: 'pipe' });
  const h2 = hash(fs.readFileSync(path.join(repo, 'index.html'), 'utf8'));
  assert.equal(h1, h2, 'sync output is not deterministic');
});
check('root index.html is byte-identical to canonical app/index.html', () => {
  assert.equal(hash(webHtml), hash(appHtml),
    'web demo diverges from desktop source (sha256 differs)');
});
for (const feat of ['hasDoubleJump', 'dashQueued', 'penguinPeaksSaveV1', 'max-height:88vh', 'ACH_SPEEDY']) {
  check(`web demo contains feature marker: ${feat}`, () => {
    assert.ok(webHtml.indexOf(feat) >= 0, 'root index.html lacks ' + feat);
  });
}
check('web demo runs the same core route features live (double jump + dash)', () => {
  const h = loadGame({ file: 'index.html' });
  h.game.startGame();
  h.game.G.hasDoubleJump = true;
  h.keyDown('Space');
  h.runFrames(20, 1 / 60);
  h.keyUp('Space');
  const vyBefore = h.game.G.vy;
  h.keyDown('Space');
  h.runFrames(1, 1 / 60);
  assert.ok(h.game.G.vy > vyBefore + 3, 'double jump did not fire in the web demo');
  h.game.G.hasDash = true;
  h.keyDown('ShiftLeft');
  h.runFrames(1, 1 / 60);
  assert.ok(h.game.G.dashT > 0, 'dash did not fire in the web demo');
  assert.equal(h.game.fishes.length, 24, 'web demo fish count is not 24');
  assert.equal(h.game.platforms.length, 18, 'web demo platform count is not 18');
});

if (failures) { console.log(`PP-09: ${failures} FAILURE(S) — defect reproduced on baseline`); process.exitCode = 1; }
else console.log('PP-09: ALL PASS');
