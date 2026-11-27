'use strict';
/* M2b — belly-slide prototype (PDF §05).
 * Hold X while grounded and moving: the penguin drops onto its belly,
 * accelerates toward 11 u/s (faster than the 7.2 run), steers slowly
 * toward the input direction, brakes hard on reverse input, and exits
 * on release, on jump (with a hop boost), or when speed falls away.
 * Verdict rule: keep only if these controllability checks pass.
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('M2b belly-slide prototype');

function runUpNorth(h, seconds) {
  h.game.startGame();
  h.keyDown('KeyW');
  h.runSeconds(seconds || 1, 60);
}
/* Slide tests run SOUTH on the big start island (z 2 -> 9, clamped) so the
   penguin cannot outrun the course mid-test: at slide speed it crosses
   the small northern islands and their gaps in under a second. */
function runUpSouth(h, seconds) {
  h.game.startGame();
  h.keyDown('KeyS');
  h.runSeconds(seconds || 1, 60);
}

check('slide engages while moving and accelerates past run speed', () => {
  const h = loadGame();
  runUpSouth(h, 1);
  const runSpeed = Math.hypot(h.game.G.vel.x, h.game.G.vel.z);
  assert.ok(runSpeed > 6.5, `did not reach run speed first (${runSpeed})`);
  h.keyDown('KeyX');
  h.runSeconds(0.3, 60);
  assert.ok(h.game.G.sliding, 'slide did not engage while moving with X held');
  h.runSeconds(1, 60);
  const slideSpeed = Math.hypot(h.game.G.vel.x, h.game.G.vel.z);
  assert.ok(slideSpeed > 9, `slide did not build momentum (speed ${slideSpeed})`);
  assert.ok(h.game.G.sliding, 'slide ended on its own while X held and moving');
});

check('steering: holding right while sliding south turns the slide east', () => {
  const h = loadGame();
  runUpSouth(h, 1);
  h.keyDown('KeyX');
  h.runSeconds(0.3, 60);
  assert.ok(h.game.G.sliding, 'slide did not engage');
  h.keyDown('KeyD');
  h.runSeconds(1, 60);
  assert.ok(h.game.G.slideDirX > 0.3,
    `slide did not steer east (slideDirX ${h.game.G.slideDirX})`);
  assert.ok(h.game.G.sliding, 'slide ended while steering');
});

check('braking: holding back against the slide stops it', () => {
  const h = loadGame();
  runUpNorth(h, 1);
  h.keyDown('KeyX');
  h.runSeconds(0.5, 60);
  assert.ok(h.game.G.sliding, 'slide did not engage');
  assert.ok(Math.hypot(h.game.G.vel.x, h.game.G.vel.z) > 8, 'slide never got fast');
  h.keyDown('KeyS'); // push back against the northward slide
  h.runSeconds(1.5, 60);
  assert.ok(!h.game.G.sliding, 'slide did not end under braking');
  assert.ok(Math.hypot(h.game.G.vel.x, h.game.G.vel.z) < 4,
    `braking did not shed speed (${Math.hypot(h.game.G.vel.x, h.game.G.vel.z)})`);
});

check('jump exits the slide and keeps forward momentum', () => {
  const h = loadGame();
  runUpNorth(h, 1);
  h.keyDown('KeyX');
  h.runSeconds(0.5, 60);
  assert.ok(h.game.G.sliding, 'slide did not engage');
  const vzBefore = h.game.G.vel.z;
  h.keyDown('Space');
  h.runFrames(3, 1 / 60);
  assert.ok(!h.game.G.sliding, 'slide did not end on jump');
  assert.ok(h.game.G.vy > 5, `jump out of slide did not launch (vy ${h.game.G.vy})`);
  assert.ok(h.game.G.vel.z < vzBefore, 'hop boost did not add forward speed');
});

check('slide cannot start in the air or from a standstill', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('Space');
  h.runFrames(5, 1 / 60);
  assert.ok(!h.game.G.grounded, 'penguin never left the ground');
  h.keyDown('KeyX');
  h.runFrames(10, 1 / 60);
  assert.ok(!h.game.G.sliding, 'slide started mid-air');
  const h2 = loadGame();
  h2.game.startGame();
  h2.keyDown('KeyX');
  h2.runSeconds(0.5, 60);
  assert.ok(!h2.game.G.sliding, 'slide started from a standstill');
});

check('releasing X ends the slide; normal movement recovers after', () => {
  const h = loadGame();
  runUpSouth(h, 1);
  h.keyDown('KeyX');
  h.runSeconds(0.5, 60);
  assert.ok(h.game.G.sliding, 'slide did not engage');
  h.keyUp('KeyX');
  h.runFrames(5, 1 / 60);
  assert.ok(!h.game.G.sliding, 'slide did not end on X release');
  h.runSeconds(0.5, 60);
  const speed = Math.hypot(h.game.G.vel.x, h.game.G.vel.z);
  assert.ok(speed > 5 && speed < 8.5, `normal movement did not recover (speed ${speed})`);
});

check('slide state is cleared by restart', () => {
  const h = loadGame();
  runUpSouth(h, 1);
  h.keyDown('KeyX');
  h.runSeconds(0.5, 60);
  assert.ok(h.game.G.sliding, 'slide did not engage');
  h.game.resetGame(true);
  assert.ok(!h.game.G.sliding, 'slide survived a restart');
  assert.ok(Math.abs(h.game.G.pos.z - 2) < 0.01, 'respawn position wrong after slide restart');
});

console.log(failures ? `\n${failures} FAILURES` : '\nALL M2b CHECKS PASSED');
process.exitCode = failures ? 1 : 0;
