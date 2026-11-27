'use strict';
/* M2g — save & packaging (PDF §05).
 * Versioned save schema (v2): a v1 save (no schemaVersion / settings /
 * unlockedWorld) migrates by keeping its progress and taking defaults
 * for the new fields. Build identity: build-info.json (version + git
 * SHA + branch + timestamp) and exe version-string metadata in the
 * pack script. Save location is explicit (localStorage key in the
 * browser; Electron userData folder on desktop, logged at startup).
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('M2g save & packaging');

check('v1 save migrates: progress kept, new fields defaulted, schema becomes 2', () => {
  const v1 = JSON.stringify({
    bestZone: [8, 6, 0], lifetimeFish: 42, wins: 1, bestTime: 50.5,
    ach: { ACH_FIRST_CATCH: true },
  });
  const h = loadGame({ save: v1 });
  assert.deepEqual(JSON.parse(JSON.stringify(h.game.save.bestZone)), [8, 6, 0]);
  assert.equal(h.game.save.lifetimeFish, 42);
  assert.equal(h.game.save.wins, 1);
  assert.equal(h.game.save.bestTime, 50.5);
  assert.equal(h.game.save.ach.ACH_FIRST_CATCH, true);
  assert.equal(h.game.save.schemaVersion, 2, 'migrated save is not schema v2');
  assert.equal(h.game.settings.quality, 'high', 'settings did not default on a v1 save');
  assert.equal(h.game.save.unlockedWorld, 1, 'unlockedWorld did not default on a v1 save');
  h.game.persist();
  const written = JSON.parse(h.ls.getItem('penguinPeaksSaveV1'));
  assert.equal(written.schemaVersion, 2, 'persisted save is not stamped v2');
  assert.equal(written.bestZone[0], 8, 'migration lost progress on persist');
});

check('malformed schemaVersion does not break load', () => {
  const bad = JSON.stringify({ bestZone: [3, 0, 0], schemaVersion: 'banana', settings: 'nope' });
  const h = loadGame({ save: bad });
  assert.equal(h.game.save.bestZone[0], 3, 'progress lost on malformed schemaVersion');
  assert.equal(h.game.save.schemaVersion, 2, 'schema did not normalize to 2');
  assert.equal(h.game.settings.quality, 'high', 'settings did not default on malformed save');
});

check('build-info.json matches package version and current git HEAD', () => {
  const repo = path.join(__dirname, '..');
  execSync('node scripts/build-info.js', { cwd: repo, encoding: 'utf8' });
  const info = JSON.parse(fs.readFileSync(path.join(repo, 'build-info.json'), 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
  const head = execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  assert.equal(info.version, pkg.version, 'build-info version != package.json version');
  assert.equal(info.gitSha, head, 'build-info SHA != current HEAD');
  assert.ok(info.builtAt, 'build-info has no timestamp');
});

check('package.json: v1.1.0 with exe version-string metadata in pack:win32', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.equal(pkg.version, '1.1.0', 'package version is not 1.1.0');
  assert.ok(pkg.scripts['pack:win32'].indexOf('--version-string.ProductName') >= 0,
    'pack script has no ProductName version string');
  assert.ok(pkg.scripts['pack:win32'].indexOf('LegalCopyright') >= 0,
    'pack script has no LegalCopyright version string');
  assert.ok(pkg.scripts['build:info'], 'no build:info script');
});

check('main.js: single-instance lock kept (PP-08) and save location logged', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  assert.ok(main.indexOf('requestSingleInstanceLock') >= 0, 'single-instance lock missing from main.js');
  assert.ok(main.indexOf("app.getPath('userData')") >= 0, 'save location not logged in main.js');
});

check('third-party notices exist and name the bundled Three.js', () => {
  const notices = fs.readFileSync(path.join(__dirname, '..', 'THIRD_PARTY_NOTICES.md'), 'utf8');
  assert.ok(notices.indexOf('Three.js') >= 0, 'notices do not name Three.js');
  assert.ok(notices.indexOf('MIT') >= 0, 'notices do not record the MIT license');
  assert.ok(notices.indexOf('original') >= 0, 'notices do not state the rest is original');
});

console.log(failures ? `\n${failures} FAILURES` : '\nALL M2g CHECKS PASSED');
process.exitCode = failures ? 1 : 0;
