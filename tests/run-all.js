'use strict';
/* Run every PP-0x regression test as its own process and summarise.
 * Usage: node tests/run-all.js [pp01 pp02 ...]   (default: all)
 * Exit code 0 only when every selected test passes.
 * A combined log is written to tests/logs/run-all-<timestamp>.log
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ALL = ['pp01', 'pp02', 'pp03', 'pp04', 'pp05', 'pp06', 'pp07', 'pp08', 'pp09', 'pp10',
  'm2a', 'm2b', 'm2c', 'm2d', 'm2e', 'm2f', 'm2g'];
/* M2 test files have descriptive suffixes (test-m2a-movement.js, ...). */
const FILES = {
  m2a: 'test-m2a-movement.js', m2b: 'test-m2b-slide.js', m2c: 'test-m2c-settings.js',
  m2d: 'test-m2d-gamepad.js', m2e: 'test-m2e-audio.js', m2f: 'test-m2f-ui.js',
  m2g: 'test-m2g-save.js',
};
const selected = process.argv.slice(2).map((s) => s.toLowerCase()).filter(Boolean);
const tests = selected.length ? selected : ALL;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = path.join(__dirname, 'logs', `run-all-${stamp}.log`);
let log = '';
let failed = [];

for (const t of tests) {
  const file = path.join(__dirname, FILES[t] || `test-${t}.js`);
  log += `\n===== ${t} (${file}) =====\n`;
  console.log(`\n===== ${t} =====`);
  try {
    const out = execFileSync('node', [file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    log += out;
    process.stdout.write(out);
  } catch (e) {
    failed.push(t);
    const out = (e.stdout || '') + (e.stderr || '');
    log += out;
    process.stdout.write(out);
  }
}
const summary = `\n===== SUMMARY =====\n${tests.length - failed.length}/${tests.length} test files passed` +
  (failed.length ? `\nFAILED: ${failed.join(', ')}` : '\nALL GREEN') + '\n';
log += summary;
console.log(summary);
fs.writeFileSync(logPath, log);
console.log('Combined log: ' + logPath);
process.exitCode = failed.length ? 1 : 0;
