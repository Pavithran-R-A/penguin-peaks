'use strict';
/* PP-01 P0 — forced software rendering.
 * main.js must NOT unconditionally force the SwiftShader CPU backend.
 * Production default: hardware GL. A software/compatibility mode is allowed
 * only behind an explicit opt-in (env var), and GPU diagnostics must be logged.
 * Security posture (contextIsolation, sandbox, nodeIntegration=false) must stay.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const mainJs = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}
const assert = require('node:assert/strict');

console.log('PP-01 forced software rendering (main.js static checks)');

check('main.js parses (node --check)', () => {
  execFileSync('node', ['--check', path.join(__dirname, '..', 'main.js')], { stdio: 'pipe' });
});

// Find unconditional (non-env-gated) forced software switches.
function unconditionalSwitches(src) {
  const lines = src.split('\n');
  const bad = [];
  lines.forEach((ln, i) => {
    if (/appendSwitch\(['"]use-gl['"]/.test(ln) || /appendSwitch\(['"]use-angle['"]/.test(ln) ||
        /appendSwitch\(['"]enable-unsafe-swiftshader['"]/.test(ln)) {
      // Allowed only if the surrounding code gates on an env opt-in
      // (the PP_* env read, or the SOFTWARE_RENDERING flag derived from it).
      const ctx = lines.slice(Math.max(0, i - 10), i + 1).join('\n');
      if (!/PP_(SOFTWARE_RENDERING|COMPAT_MODE|FORCE_SOFTWARE)|SOFTWARE_RENDERING/.test(ctx)) bad.push((i + 1) + ': ' + ln.trim());
    }
  });
  return bad;
}
check('no unconditional forced software-rendering switches', () => {
  const bad = unconditionalSwitches(mainJs);
  assert.deepEqual(bad, [], 'unconditional switches present: ' + bad.join(' | '));
});
check('software/compat mode exists only as explicit opt-in (env-gated)', () => {
  assert.ok(/PP_(SOFTWARE_RENDERING|COMPAT_MODE|FORCE_SOFTWARE)/.test(mainJs),
    'no env-gated compatibility-mode opt-in found');
});
check('GPU/backend diagnostics are logged (getGPUInfo or getGPUFeatureStatus)', () => {
  assert.ok(/getGPUInfo|getGPUFeatureStatus/.test(mainJs), 'no GPU diagnostics call in main.js');
});
check('security posture kept: contextIsolation, sandbox, nodeIntegration=false', () => {
  assert.ok(/contextIsolation:\s*true/.test(mainJs), 'contextIsolation:true missing');
  assert.ok(/sandbox:\s*true/.test(mainJs), 'sandbox:true missing');
  assert.ok(/nodeIntegration:\s*false/.test(mainJs), 'nodeIntegration:false missing');
});

if (failures) { console.log(`PP-01: ${failures} FAILURE(S) — defect reproduced on baseline`); process.exitCode = 1; }
else console.log('PP-01: ALL PASS');
