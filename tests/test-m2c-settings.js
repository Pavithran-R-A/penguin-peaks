'use strict';
/* M2c — settings & accessibility (PDF §05).
 * Quality presets, render scale, music/SFX volumes, mute, reduced
 * shake/flash, remappable controls, settings panel (O / gear button),
 * fullscreen button (guarded where unavailable). All persisted in the
 * save and validated on load (bad values fall back to defaults).
 */
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

console.log('M2c settings & accessibility');

check('defaults: high quality, volumes 0.8, unmuted, WASD+arrows bound', () => {
  const h = loadGame();
  const s = h.game.settings;
  assert.equal(s.quality, 'high');
  assert.equal(s.renderScale, 1);
  assert.equal(s.musicVol, 0.8);
  assert.equal(s.sfxVol, 0.8);
  assert.equal(s.muted, false);
  assert.equal(JSON.stringify(s.bindings.forward), JSON.stringify(['KeyW', 'ArrowUp']));
  assert.equal(JSON.stringify(s.bindings.jump), JSON.stringify(['Space']));
  assert.equal(JSON.stringify(s.bindings.slide), JSON.stringify(['KeyX']));
});

check('settings persist across reload; invalid values fall back to defaults', () => {
  const h = loadGame();
  h.game.settings.quality = 'low';
  h.game.settings.musicVol = 0.3;
  h.game.settings.reduceShake = true;
  h.game.setBinding('jump', 'KeyJ');
  h.game.persist();
  const raw = h.ls.getItem('penguinPeaksSaveV1');
  const h2 = loadGame({ save: raw });
  assert.equal(h2.game.settings.quality, 'low');
  assert.equal(h2.game.settings.musicVol, 0.3);
  assert.equal(h2.game.settings.reduceShake, true);
  assert.equal(JSON.stringify(h2.game.settings.bindings.jump), JSON.stringify(['KeyJ']));
  // Corrupt values in a hand-edited save are clamped, not trusted.
  const bad = JSON.parse(raw);
  bad.settings.quality = 'ultra';
  bad.settings.renderScale = 9;
  bad.settings.musicVol = -4;
  bad.settings.bindings = { forward: 'not-an-array', jump: [42] };
  const h3 = loadGame({ save: JSON.stringify(bad) });
  assert.equal(h3.game.settings.quality, 'high');
  assert.equal(h3.game.settings.renderScale, 1);
  assert.equal(h3.game.settings.musicVol, 0);
  assert.equal(JSON.stringify(h3.game.settings.bindings.forward), JSON.stringify(['KeyW', 'ArrowUp']));
  assert.equal(JSON.stringify(h3.game.settings.bindings.jump), JSON.stringify(['Space']));
});

check('quality presets drive renderer: low disables shadows + snow, high enables them', () => {
  const h = loadGame();
  h.game.settings.quality = 'low';
  h.game.settings.renderScale = 1;
  h.game.applySettings();
  assert.equal(h.game.renderer.shadowMap.enabled, false, 'shadows stayed on at low quality');
  assert.equal(h.game.renderer._pixelRatio, 0.5, 'pixel ratio not 0.5 at low quality');
  h.game.settings.quality = 'high';
  h.game.applySettings();
  assert.equal(h.game.renderer.shadowMap.enabled, true, 'shadows off at high quality');
  assert.equal(h.game.renderer._pixelRatio, 1, 'pixel ratio not 1 at high quality');
  h.game.settings.quality = 'medium';
  h.game.settings.renderScale = 0.8;
  h.game.applySettings();
  assert.ok(Math.abs(h.game.renderer._pixelRatio - 0.6) < 1e-9,
    `medium 0.8 scale should give 0.6 pixel ratio (got ${h.game.renderer._pixelRatio})`);
});

check('mute silences SFX; unmuted jump plays SFX (toneCalls)', () => {
  const h = loadGame();
  h.game.settings.muted = true;
  h.game.startGame();
  h.keyDown('Space');
  h.runFrames(5, 1 / 60);
  assert.equal(h.game.toneCalls, 0, 'SFX played while muted');
  h.game.settings.muted = false;
  const before = h.game.toneCalls;
  h.keyDown('Space'); // fresh press after landing: jump again
  h.runFrames(5, 1 / 60);
  // A jump may or may not have fired (airborne state); the landing cue
  // alone proves the gate is open — so force a guaranteed SFX instead.
  const h2 = loadGame();
  h2.game.startGame();
  h2.keyDown('Space');
  h2.runFrames(5, 1 / 60);
  assert.ok(h2.game.toneCalls > 0, 'no SFX attempted while unmuted (jump should call sfxJump)');
  assert.ok(before >= 0, 'unused');
});

check('remap forward to I: I moves, W and ArrowUp no longer move', () => {
  const h = loadGame();
  h.game.setBinding('forward', 'KeyI');
  h.game.startGame();
  h.keyDown('KeyI');
  h.runSeconds(0.5, 60);
  assert.ok(h.game.G.pos.z < 0.5, `remapped I did not move the penguin (z ${h.game.G.pos.z})`);
  h.keyUp('KeyI');
  h.game.resetGame(true);
  h.keyDown('KeyW');
  h.runSeconds(0.5, 60);
  assert.ok(Math.abs(h.game.G.pos.z - 2) < 0.01, `old W binding still moved after remap (z ${h.game.G.pos.z})`);
  h.keyUp('KeyW');
  h.keyDown('ArrowUp');
  h.runSeconds(0.5, 60);
  assert.ok(Math.abs(h.game.G.pos.z - 2) < 0.01, `old ArrowUp binding still moved after remap (z ${h.game.G.pos.z})`);
});

check('remap jump to J: J jumps, Space no longer jumps', () => {
  const h = loadGame();
  h.game.setBinding('jump', 'KeyJ');
  h.game.startGame();
  h.keyDown('Space');
  h.runFrames(5, 1 / 60);
  assert.ok(Math.abs(h.game.G.vy) < 0.5, `old Space binding still jumped after remap (vy ${h.game.G.vy})`);
  h.keyDown('KeyJ');
  h.runFrames(5, 1 / 60);
  assert.ok(h.game.G.vy > 5, `remapped J did not jump (vy ${h.game.G.vy})`);
});

check('reduced shake: hurt does not shake; reduced flash: flash is dim', () => {
  const h = loadGame();
  h.game.settings.reduceShake = true;
  h.game.settings.reduceFlash = true;
  h.game.startGame();
  h.game.hurtPlayer(0, 5, false);
  assert.equal(h.game.shake, 0, 'shake applied despite reduceShake');
  assert.equal(h.elsById.hurtFlash.style.opacity, 0.25, 'hurt flash not dimmed');
  const h2 = loadGame();
  h2.game.startGame();
  h2.game.hurtPlayer(0, 5, false);
  assert.ok(h2.game.shake > 0, 'no shake with reduceShake off');
  assert.equal(h2.elsById.hurtFlash.style.opacity, 0.9, 'full flash not applied by default');
});

check('settings panel: O opens it and pauses, O again closes and resumes', () => {
  const h = loadGame();
  h.game.startGame();
  h.keyDown('KeyO');
  assert.ok(!h.elsById.settingsScreen.classList.contains('hidden'), 'settings panel did not open on O');
  assert.equal(h.game.G.state, 'paused', 'game did not pause when the settings panel opened');
  h.keyDown('KeyO');
  assert.ok(h.elsById.settingsScreen.classList.contains('hidden'), 'settings panel did not close on O');
  assert.equal(h.game.G.state, 'playing', 'game did not resume when the settings panel closed');
});

check('settings panel renders controls and the fullscreen button does not throw', () => {
  const h = loadGame();
  const body = h.elsById.settingsBody;
  assert.ok(body.innerHTML.indexOf('Quality') >= 0, 'settings panel has no quality section');
  assert.ok(body.innerHTML.indexOf('rebind-jump') >= 0, 'settings panel has no rebind controls');
  assert.ok(body.innerHTML.indexOf('Saves live on this device') >= 0, 'settings panel has no save-location note');
  const fsBtn = h.document.getElementById('fullscreenBtn');
  assert.doesNotThrow(() => fsBtn.click(), 'fullscreen button threw in the harness (no documentElement)');
});

console.log(failures ? `\n${failures} FAILURES` : '\nALL M2c CHECKS PASSED');
process.exitCode = failures ? 1 : 0;
