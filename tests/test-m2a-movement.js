'use strict';
/* M2a — movement & camera tuning (PDF §05).
 * - Coyote time / jump buffer lengthened 0.13 -> 0.16 s, air control 10 -> 14.
 * - Variable jump height: releasing Space early cuts a rising jump short.
 * - Landing shadow projected onto the island below; objective chevron
 *   above the next checkpoint / flag.
 * - Camera look-ahead in the direction of travel; camera never clips
 *   into an island top (occlusion clamp).
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('M2a movement & camera tuning');

check('tuning constants: coyote 0.16, jump buffer 0.16, air accel 14', () => {
  const h = loadGame();
  assert.equal(h.game.COYOTE_TIME, 0.16);
  assert.equal(h.game.JUMP_BUFFER, 0.16);
  assert.equal(h.game.AIR_ACCEL, 14);
});

function jumpPeak(h, releaseEarly) {
  h.game.startGame();
  h.keyDown('Space');
  h.runFrames(3, 1 / 60);
  if (releaseEarly) h.keyUp('Space');
  let peak = 0;
  for (let i = 0; i < 60; i++) { h.runFrames(1, 1 / 60); peak = Math.max(peak, h.game.G.pos.y); }
  return peak;
}
check('variable jump height: early Space release cuts the jump short', () => {
  const full = jumpPeak(loadGame(), false);
  const cut = jumpPeak(loadGame(), true);
  assert.ok(full > 1.6, `full jump too low (peak ${full})`);
  assert.ok(cut < full - 0.3, `early release did not cut the jump (full ${full}, cut ${cut})`);
});

check('air control: 0.2 s of holding left mid-air reaches near-full speed', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('Space');
  h.runFrames(2, 1 / 60);
  assert.ok(!h.game.G.grounded, 'penguin never left the ground');
  h.keyDown('KeyA');
  h.runFrames(12, 1 / 60);
  assert.ok(h.game.G.vel.x < -6.6, `air control too weak (vel.x ${h.game.G.vel.x})`);
});

check('landing shadow: sits on the island top under the penguin, shrinks with height', () => {
  const h = loadGame();
  h.game.startGame();
  h.runFrames(10, 1 / 60);
  const sh = h.game.landingShadow;
  assert.ok(sh.visible, 'landing shadow not visible on the ground');
  assert.ok(Math.abs(sh.position.y - 0.03) < 0.01, `shadow not on platform top (y ${sh.position.y})`);
  assert.ok(Math.abs(sh.position.x - h.game.G.pos.x) < 0.01, 'shadow does not track penguin x');
  const groundScale = sh.scale.x;
  h.keyDown('Space');
  h.runFrames(20, 1 / 60); // near the top of the jump
  assert.ok(h.game.G.pos.y > 1.2, 'penguin did not get airborne');
  assert.ok(Math.abs(sh.position.y - 0.03) < 0.01, 'shadow left the platform top mid-jump');
  assert.ok(sh.scale.x < groundScale, `shadow did not shrink with height (${groundScale} -> ${sh.scale.x})`);
  assert.ok(sh.material.opacity < 0.34, 'shadow did not fade with height');
});

check('objective marker: above checkpoint 1, then moves to checkpoint 2', () => {
  const h = loadGame();
  h.game.startGame();
  h.runFrames(5, 1 / 60);
  const m = h.game.objectiveMarker;
  assert.ok(m.visible, 'objective marker not visible while playing');
  assert.ok(Math.abs(m.position.z - (-29)) < 1, `marker not above checkpoint 1 (z ${m.position.z})`);
  h.game.G.pos.set(0, 1.2, -31); /* inside checkpoint 1's trigger (its pos is (0,1.2,-32)) */
  h.game.G.vel.set(0, 0, 0);
  h.runFrames(5, 1 / 60);
  assert.ok(h.game.checkpoints[0].active, 'checkpoint 1 did not activate');
  assert.ok(Math.abs(m.position.z - (-72)) < 1, `marker did not move to checkpoint 2 (z ${m.position.z})`);
});

check('camera look-ahead: running north pulls the camera forward', () => {
  const h = loadGame();
  h.game.startGame();
  h.runFrames(30, 1 / 60);
  const restGap = h.game.camera.position.z - h.game.G.pos.z;
  h.keyDown('KeyW');
  h.runSeconds(1.5, 60);
  const runGap = h.game.camera.position.z - h.game.G.pos.z;
  assert.ok(runGap < restGap - 0.8,
    `camera did not look ahead while running (gap ${restGap} -> ${runGap})`);
});

check('camera occlusion: camera never sinks into an island top', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('KeyW');
  for (let i = 0; i < 16; i++) {
    h.runSeconds(0.25, 60);
    const cam = h.game.camera.position;
    const plat = h.game.platformAt(cam.x, cam.z, cam.y);
    if (plat) {
      assert.ok(cam.y >= plat.top + 0.9 - 0.05,
        `camera clipped into island top ${plat.top} (cam y ${cam.y}) at z ${cam.z}`);
    }
    assert.ok(cam.y >= -6, `camera sank below the sea (y ${cam.y})`);
  }
});

console.log(failures ? `\n${failures} FAILURES` : '\nALL M2a CHECKS PASSED');
process.exitCode = failures ? 1 : 0;
