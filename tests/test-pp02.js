'use strict';
/* PP-02 P0 — frame-rate-dependent time and movement.
 * Acceptance (audit): at 60/30/20/10/6 FPS with deterministic input and fixed
 * seeds, the active timer must be within 1% of the 60 s reference and
 * positions / hazard phases must agree within tolerance. No tunnelling, no
 * free speedrun advantage.
 *
 * Baseline behaviour: loop() does step(min(getDelta(), 0.05)), so at 10 FPS
 * only 30 simulated seconds pass per 60 real seconds.
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('PP-02 frame-rate-dependent time (standing-still timer + scripted wiggle)');

function standingRun(fps) {
  const h = loadGame();
  h.game.startGame();
  h.runSeconds(60, fps); // no input: penguin stands on the spawn platform
  return {
    time: h.game.G.time,
    x: h.game.G.pos.x, y: h.game.G.pos.y, z: h.game.G.pos.z,
    platX: h.game.platforms[6].x, // moving platform (World 2)
    enemyX: h.game.enemies[0].mesh.position.x,
    state: h.game.G.state,
  };
}

const results = {};
for (const fps of [60, 30, 20, 10, 6]) results[fps] = standingRun(fps);

for (const fps of [60, 30, 20, 10, 6]) {
  check(`active timer within 1% of 60 s at ${fps} FPS (got ${results[fps].time.toFixed(2)} s)`, () => {
    assert.ok(Math.abs(results[fps].time - 60) <= 0.6,
      `G.time=${results[fps].time} at ${fps} FPS, expected 60 ± 0.6`);
  });
}
check('player position agrees across frame rates (standing still)', () => {
  for (const fps of [30, 20, 10, 6]) {
    assert.ok(Math.abs(results[fps].x - results[60].x) < 0.01, `x diverges at ${fps} FPS`);
    assert.ok(Math.abs(results[fps].z - results[60].z) < 0.01, `z diverges at ${fps} FPS`);
    assert.ok(Math.abs(results[fps].y - results[60].y) < 0.01, `y diverges at ${fps} FPS`);
  }
});
check('moving-platform phase agrees across frame rates', () => {
  for (const fps of [30, 20, 10, 6]) {
    assert.ok(Math.abs(results[fps].platX - results[60].platX) < 0.05,
      `platform x ${results[fps].platX} vs 60 FPS ${results[60].platX} at ${fps} FPS`);
  }
});
check('enemy phase agrees across frame rates', () => {
  for (const fps of [30, 20, 10, 6]) {
    assert.ok(Math.abs(results[fps].enemyX - results[60].enemyX) < 0.05,
      `enemy x ${results[fps].enemyX} vs 60 FPS ${results[60].enemyX} at ${fps} FPS`);
  }
});

// Scripted wiggle on the big spawn platform: D 0.5 s, A 0.5 s, W 0.5 s,
// S 0.5 s, then jump and 1 s airborne. Same real-time input at every FPS.
function wiggle(fps) {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('KeyD'); h.runSeconds(0.5, fps); h.keyUp('KeyD');
  h.keyDown('KeyA'); h.runSeconds(0.5, fps); h.keyUp('KeyA');
  h.keyDown('KeyW'); h.runSeconds(0.5, fps); h.keyUp('KeyW');
  h.keyDown('KeyS'); h.runSeconds(0.5, fps); h.keyUp('KeyS');
  h.keyDown('Space'); h.runSeconds(1.0, fps); h.keyUp('Space');
  return { time: h.game.G.time, x: h.game.G.pos.x, y: h.game.G.pos.y, z: h.game.G.pos.z };
}
const w60 = wiggle(60);
for (const fps of [30, 20, 10, 6]) {
  const w = wiggle(fps);
  check(`scripted wiggle: timer + position agree at ${fps} FPS vs 60 FPS`, () => {
    assert.ok(Math.abs(w.time - w60.time) <= 0.05, `time ${w.time} vs ${w60.time}`);
    assert.ok(Math.abs(w.x - w60.x) < 0.5, `x ${w.x} vs ${w60.x}`);
    assert.ok(Math.abs(w.z - w60.z) < 0.5, `z ${w.z} vs ${w60.z}`);
    assert.ok(Math.abs(w.y - w60.y) < 0.5, `y ${w.y} vs ${w60.y}`);
  });
}
check('no tunnelling: jump at 6 FPS still lands back on the platform', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('Space'); h.runSeconds(2, 6); h.keyUp('Space');
  assert.equal(h.game.G.grounded, true, 'penguin never re-grounded after a 6 FPS jump');
  assert.ok(Math.abs(h.game.G.pos.y - 0) < 0.01, 'y=' + h.game.G.pos.y + ' after landing');
});

if (failures) { console.log(`PP-02: ${failures} FAILURE(S) — defect reproduced on baseline`); process.exitCode = 1; }
else console.log('PP-02: ALL PASS');
