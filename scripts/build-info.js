'use strict';
/**
 * M2 — build info: reproducible package identity.
 *
 * Writes build-info.json at the repo root with the package version,
 * the exact git commit + branch, and the build timestamp, so any
 * packaged build can be traced back to its source:
 *
 *   node scripts/build-info.js   (or: npm run build:info)
 *
 * The file is regenerated on every run; it is NOT hand-edited.
 * The Windows .exe version metadata itself is stamped by
 * electron-packager's --version-string flags (see package.json
 * pack:win32); stamping the exe on Linux needs Wine, which is a
 * documented open item — the flags are set, the stamp is unverified
 * until a Windows (or Wine) packaging run.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repo = path.resolve(__dirname, '..');
function git(cmd) {
  try { return execSync('git ' + cmd, { cwd: repo, encoding: 'utf8' }).trim(); }
  catch (e) { return 'unknown'; }
}

const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
const info = {
  name: pkg.name,
  version: pkg.version,
  gitSha: git('rev-parse HEAD'),
  gitBranch: git('rev-parse --abbrev-ref HEAD'),
  gitClean: git('status --porcelain') === '',
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(repo, 'build-info.json'), JSON.stringify(info, null, 2) + '\n');
console.log('build-info.json: ' + info.name + ' v' + info.version + ' @ ' +
  info.gitSha.slice(0, 12) + ' (' + info.gitBranch + ', clean=' + info.gitClean + ')');
