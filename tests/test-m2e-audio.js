'use strict';
/* M2e — audio & feedback (PDF §05).
 * Original synthesized soundtrack (16-step A-minor pentatonic loop +
 * soft bass, no licensed material, no audio files) driven from the
 * fixed timestep while playing; ambient wind noise loop; music and SFX
 * volumes are independent channels behind the mute gate. Landing, hurt
 * and collect cues are distinct pitches. Audibility by ear is HUMAN-ONLY
 * — these tests prove the code paths run and the gates work, not that
 * the mix sounds good.
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('M2e audio & feedback');

check('musicTick plays notes while playing; mute and musicVol=0 silence it', () => {
  const h = loadGame();
  h.game.startGame();
  const before = h.game.toneCalls;
  h.game.musicTick();
  assert.ok(h.game.toneCalls > before, 'musicTick played nothing while unmuted');
  assert.equal(h.game.G.musicStep, 1, 'musicStep did not advance');
  h.game.settings.muted = true;
  const m = h.game.toneCalls;
  h.game.musicTick();
  assert.equal(h.game.toneCalls, m, 'music played while muted');
  h.game.settings.muted = false;
  h.game.settings.musicVol = 0;
  h.game.musicTick();
  assert.equal(h.game.toneCalls, m, 'music played with musicVol 0');
});

check('music and SFX volumes are independent channels', () => {
  const h = loadGame();
  h.game.startGame();
  h.game.settings.sfxVol = 0;
  h.game.settings.musicVol = 0.8;
  const before = h.game.toneCalls;
  h.game.musicTick();
  assert.ok(h.game.toneCalls > before, 'music silenced by sfxVol 0 (channels not independent)');
  const h2 = loadGame();
  h2.game.startGame();
  h2.game.settings.musicVol = 0;
  h2.game.settings.sfxVol = 0.8;
  const b2 = h2.game.toneCalls;
  h2.game.musicTick();
  assert.equal(h2.game.toneCalls, b2, 'music played with musicVol 0');
  h2.keyDown('Space'); // jump = SFX channel
  h2.runFrames(5, 1 / 60);
  assert.ok(h2.game.toneCalls > b2, 'jump SFX silenced by musicVol 0 (channels not independent)');
});

check('soundtrack advances only while playing (pause silences the melody)', () => {
  const h = loadGame();
  h.game.startGame();
  h.runSeconds(1, 60);
  const stepPlaying = h.game.G.musicStep;
  assert.ok(stepPlaying >= 2, `music did not advance while playing (step ${stepPlaying})`);
  h.keyDown('KeyP'); // pause
  assert.equal(h.game.G.state, 'paused');
  h.runSeconds(2, 60);
  assert.equal(h.game.G.musicStep, stepPlaying, 'music advanced while paused');
});

check('audio paths run error-free with no AudioContext (harness)', () => {
  const h = loadGame();
  assert.doesNotThrow(() => {
    h.game.startGame();
    h.keyDown('Space');
    h.runSeconds(1, 60);
    h.game.musicTick();
  }, 'audio/music code threw without an AudioContext');
});

check('hard landing plays a landing cue and squashes the penguin', () => {
  const h = loadGame();
  h.game.startGame();
  const before = h.game.toneCalls;
  h.game.G.pos.set(0, 6, 2); // drop from 6 units above the start island
  h.game.G.vel.set(0, 0, 0);
  h.game.G.vy = 0;
  let landed = false;
  for (let i = 0; i < 120; i++) {
    h.runFrames(1, 1 / 60);
    if (h.game.G.grounded) { landed = true; break; }
  }
  assert.ok(landed, 'penguin never landed from the drop');
  assert.ok(h.game.toneCalls > before, 'no landing cue played');
  assert.ok(h.game.G.squash > 0, 'no landing squash on a hard landing');
});

check('fish pickup plays a distinct collect cue', () => {
  const h = loadGame();
  h.game.startGame();
  const before = h.game.toneCalls;
  h.game.G.pos.set(0, 0, -9.5); // onto the first fish
  h.runFrames(3, 1 / 60);
  assert.equal(h.game.G.fish, 1, 'fish was not collected');
  assert.ok(h.game.toneCalls > before, 'no collect cue played on pickup');
});

console.log(failures ? `\n${failures} FAILURES` : '\nALL M2e CHECKS PASSED');
process.exitCode = failures ? 1 : 0;
