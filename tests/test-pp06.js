'use strict';
/* PP-06 P1 — pause advances hazards.
 * Two paused simulated seconds moved a platform ~2.4 units and a crab
 * ~3.4 units in the audit, while G.time did not advance: platforms use
 * performance.now() and enemies advance in the ambient (un-gated) section
 * of step(), so they keep moving while paused.
 * Acceptance: pause on a moving platform, wait 10 s, resume with unchanged
 * gameplay phase, attachment and position. Same for enemies and all modals.
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('PP-06 pause advances hazards');

function snapshot(h) {
  return {
    platX: h.game.platforms[6].x, // moving platform, World 2
    platX2: h.game.platforms[11].x, // moving platform, World 3
    enemyX: h.game.enemies[0].mesh.position.x,
    enemyZ: h.game.enemies[1].mesh.position.z,
    time: h.game.G.time,
    px: h.game.G.pos.x, py: h.game.G.pos.y, pz: h.game.G.pos.z,
  };
}
function assertFrozen(a, b, what) {
  assert.ok(Math.abs(a.platX - b.platX) < 1e-9, `${what}: moving platform 1 moved ${a.platX} -> ${b.platX}`);
  assert.ok(Math.abs(a.platX2 - b.platX2) < 1e-9, `${what}: moving platform 2 moved ${a.platX2} -> ${b.platX2}`);
  assert.ok(Math.abs(a.enemyX - b.enemyX) < 1e-9, `${what}: crab 1 moved ${a.enemyX} -> ${b.enemyX}`);
  assert.ok(Math.abs(a.enemyZ - b.enemyZ) < 1e-9, `${what}: crab 2 moved ${a.enemyZ} -> ${b.enemyZ}`);
  assert.equal(a.time, b.time, `${what}: game timer advanced while paused (${a.time} -> ${b.time})`);
  assert.ok(Math.abs(a.px - b.px) < 1e-9 && Math.abs(a.py - b.py) < 1e-9 && Math.abs(a.pz - b.pz) < 1e-9,
    `${what}: player moved while paused`);
}

check('P-pause: 10 s paused leaves platforms, crabs, timer and player frozen', () => {
  const h = loadGame();
  h.game.startGame();
  h.runSeconds(1, 60); // settle + let hazards move
  h.keyDown('KeyP');
  assert.equal(h.game.G.state, 'paused');
  const before = snapshot(h);
  h.runSeconds(10, 60); // 10 paused seconds, wall clock advances 10 s
  const after = snapshot(h);
  assertFrozen(before, after, 'P-pause');
});
check('Esc-pause: 2 s paused leaves hazards frozen', () => {
  const h = loadGame();
  h.game.startGame();
  h.runSeconds(1, 60);
  h.keyDown('Escape');
  assert.equal(h.game.G.state, 'paused');
  const before = snapshot(h);
  h.runSeconds(2, 60);
  assertFrozen(before, snapshot(h), 'Esc-pause');
});
check('collection panel (blocking modal): hazards frozen while open', () => {
  const h = loadGame();
  h.game.startGame();
  h.runSeconds(1, 60);
  h.keyDown('KeyC'); // opens collection panel, pauses the game
  assert.equal(h.game.G.state, 'paused');
  const before = snapshot(h);
  h.runSeconds(2, 60);
  assertFrozen(before, snapshot(h), 'collection panel');
});
check('pause while standing ON a moving platform: attachment + position survive', () => {
  const h = loadGame();
  h.game.startGame();
  // Place the penguin on the moving World 2 platform and let it ground.
  const plat = h.game.platforms[6];
  h.game.G.pos.set(plat.x, plat.top, plat.z);
  h.runFrames(10, 1 / 60);
  assert.equal(h.game.G.grounded, true, 'penguin did not ground on the moving platform');
  assert.equal(h.game.G.groundPlat, plat, 'penguin is not attached to the moving platform');
  const px = h.game.G.pos.x, py = h.game.G.pos.y, pz = h.game.G.pos.z;
  h.keyDown('KeyP');
  assert.equal(h.game.G.state, 'paused');
  h.runSeconds(5, 60);
  assert.ok(Math.abs(h.game.G.pos.x - px) < 1e-9 && Math.abs(h.game.G.pos.y - py) < 1e-9 &&
    Math.abs(h.game.G.pos.z - pz) < 1e-9, 'penguin moved while paused on the platform');
  assert.equal(h.game.G.groundPlat, plat, 'platform attachment was lost across the pause');
  const rideOffset = h.game.G.pos.x - plat.x; // penguin stands off-centre; the offset must be preserved
  h.keyDown('KeyP'); // resume
  assert.equal(h.game.G.state, 'playing');
  h.runSeconds(1, 60); // platform carries the penguin again
  assert.equal(h.game.G.groundPlat, plat, 'penguin is no longer attached after resume');
  assert.ok(Math.abs((h.game.G.pos.x - plat.x) - rideOffset) < 0.1,
    `penguin was not carried with the platform after resume (offset ${rideOffset} -> ${h.game.G.pos.x - plat.x})`);
});
check('resume after a long pause continues from the frozen phase (no jump)', () => {
  const h = loadGame();
  h.game.startGame();
  h.runSeconds(1, 60);
  h.keyDown('KeyP');
  const before = snapshot(h);
  h.runSeconds(5, 60);
  h.keyDown('KeyP'); // resume
  assert.equal(h.game.G.state, 'playing');
  const atResume = snapshot(h);
  assertFrozen(before, atResume, 'pause/resume');
  h.runSeconds(1, 60); // one more playing second: hazards move again
  const after = snapshot(h);
  assert.ok(Math.abs(after.platX - before.platX) > 0.01, 'hazards did not resume moving after unpause');
  assert.ok(Math.abs(after.time - before.time - 1) < 0.05, 'timer did not resume after unpause');
});

if (failures) { console.log(`PP-06: ${failures} FAILURE(S) — defect reproduced on baseline`); process.exitCode = 1; }
else console.log('PP-06: ALL PASS');
