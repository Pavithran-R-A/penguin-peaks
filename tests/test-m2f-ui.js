'use strict';
/* M2f — progression & UI (PDF §05).
 * Achievement toasts queue instead of overwriting each other; level
 * select (worlds unlock by reaching checkpoints, persisted); the
 * objective line names the current world, next goal and fish count;
 * compact card CSS for short viewports (640x400). Layout pixels are
 * verified live in headless Chrome (see AUDIT_M2.md), not here.
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');
const fs = require('fs');
const path = require('path');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('M2f progression & UI');

check('achievement toasts queue: three rapid unlocks show in order, none lost', () => {
  const h = loadGame();
  h.game.unlockAch('ACH_FIRST_CATCH');
  assert.equal(h.game.achShowing, true, 'first toast did not show');
  assert.equal(h.elsById.achToast.textContent.indexOf('First Catch') >= 0, true, 'first toast has the wrong achievement');
  h.game.unlockAch('ACH_FISH_50');
  h.game.unlockAch('ACH_DOUBLE_JUMP');
  assert.equal(h.game.achQueueLen, 2, `queued toasts lost (queue ${h.game.achQueueLen}, expected 2)`);
  assert.ok(h.elsById.achToast.textContent.indexOf('First Catch') >= 0,
    'second unlock overwrote the showing toast');
});

check('checkpoint 1 unlocks World 2 in the save; it persists across reload', () => {
  const h = loadGame();
  assert.equal(h.game.save.unlockedWorld, 1, 'fresh save should start at World 1');
  h.game.startGame();
  h.game.G.pos.set(0, 1.2, -31);
  h.runFrames(5, 1 / 60);
  assert.ok(h.game.checkpoints[0].active, 'checkpoint 1 did not activate');
  assert.equal(h.game.save.unlockedWorld, 2, 'World 2 was not unlocked by checkpoint 1');
  const h2 = loadGame({ save: h.ls.getItem('penguinPeaksSaveV1') });
  assert.equal(h2.game.save.unlockedWorld, 2, 'unlockedWorld did not persist');
  const sel = h2.elsById.levelSelect.innerHTML;
  assert.ok(sel.indexOf('lvlBtn2') >= 0, 'level select has no World 2 button');
  assert.ok(sel.indexOf('lvlBtn3') >= 0, 'level select has no World 3 button');
  assert.ok(sel.indexOf('🔒 World 3') >= 0, 'locked World 3 is not shown locked');
});

check('level select: World 2 starts at checkpoint 1 with double jump; World 3 with dash', () => {
  const h = loadGame();
  h.game.save.unlockedWorld = 3;
  h.game.persist();
  h.game.startGameAtWorld(2);
  assert.equal(h.game.G.state, 'playing', 'World 2 select did not start the game');
  assert.equal(h.game.G.level, 2, 'level is not 2 after World 2 select');
  assert.ok(h.game.G.hasDoubleJump, 'double jump not taught on World 2 start');
  assert.ok(Math.abs(h.game.G.pos.z - (-32)) < 0.01, `World 2 spawn wrong (z ${h.game.G.pos.z})`);
  const h2 = loadGame();
  h2.game.save.unlockedWorld = 3;
  h2.game.startGameAtWorld(3);
  assert.equal(h2.game.G.level, 3, 'level is not 3 after World 3 select');
  assert.ok(h2.game.G.hasDash, 'dash not taught on World 3 start');
  assert.ok(Math.abs(h2.game.G.pos.z - (-75)) < 0.01, `World 3 spawn wrong (z ${h2.game.G.pos.z})`);
  const h3 = loadGame();
  h3.game.startGameAtWorld(2);
  assert.equal(h3.game.G.state, 'start', 'locked World 2 started the game on a fresh save');
});

check('objective line names the world, next goal and fish count', () => {
  const h = loadGame();
  h.game.startGame();
  h.runFrames(3, 1 / 60);
  const obj = h.elsById.objective.textContent;
  assert.ok(obj.indexOf('World 1') >= 0, `objective lacks the world (got "${obj}")`);
  assert.ok(obj.indexOf('Checkpoint 1') >= 0, `objective lacks the next goal (got "${obj}")`);
  assert.ok(obj.indexOf('0/20') >= 0, `objective lacks the fish count (got "${obj}")`);
});

check('compact small-viewport CSS is present in the game source', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.html'), 'utf8');
  assert.ok(src.indexOf('@media (max-height:520px)') >= 0, 'no short-viewport media query');
  assert.ok(src.indexOf('@media (max-width:640px)') >= 0, 'no narrow-viewport objective rule');
});

console.log(failures ? `\n${failures} FAILURES` : '\nALL M2f CHECKS PASSED');
process.exitCode = failures ? 1 : 0;
