'use strict';
/**
 * Penguin Peaks audit harness.
 *
 * Executes the REAL inline game JavaScript from app/index.html (or
 * index.html) inside a Node `vm` sandbox with mocked WebGL/DOM/audio/
 * storage and frame callbacks — the same method the independent audit used.
 * No real rendering happens; game logic runs under controlled inputs with a
 * seeded RNG and a controllable fake clock (performance.now).
 *
 * Usage:
 *   const { loadGame } = require('./harness');
 *   const h = loadGame();            // fresh game, default seed
 *   h.game.startGame();
 *   h.keyDown('KeyW');
 *   h.runSeconds(1, 60);             // 60 frames at 60 FPS
 *   console.log(h.game.G.time);
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- minimal THREE r186 stub: only what the game touches ---------- */
function makeThree(frameDtRef) {
  class Vector3 {
    constructor(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this; }
  }
  class BufferAttribute {
    constructor(array, itemSize) {
      this.array = array; this.itemSize = itemSize;
      this.count = Math.floor(array.length / itemSize); this.needsUpdate = false;
    }
    getX(i) { return this.array[i * this.itemSize]; }
    getY(i) { return this.array[i * this.itemSize + 1]; }
    getZ(i) { return this.array[i * this.itemSize + 2]; }
    setX(i, v) { this.array[i * this.itemSize] = v; }
    setY(i, v) { this.array[i * this.itemSize + 1] = v; }
    setZ(i, v) { this.array[i * this.itemSize + 2] = v; }
  }
  class BufferGeometry {
    constructor() {
      this.attributes = { position: new BufferAttribute(new Float32Array(24), 3) };
    }
    setAttribute(name, attr) { this.attributes[name] = attr; }
  }
  class Geometry extends BufferGeometry {}
  class Color {
    constructor(hex) { this.r = 1; this.g = 1; this.b = 1; this.hex = hex; }
    set(hex) { this.hex = hex; return this; }
  }
  function makeMaterial(params) {
    const m = Object.assign({ needsUpdate: false }, params || {});
    m.color = new Color(params && params.color !== undefined ? params.color : 0xffffff);
    return m;
  }
  class Object3D {
    constructor() {
      this.position = new Vector3();
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.visible = true; this.castShadow = false; this.receiveShadow = false;
      this.userData = {}; this.children = []; this.material = null; this.geometry = null;
    }
    add(c) { this.children.push(c); return this; }
    clone() {
      const c = new Mesh(this.geometry, this.material);
      c.position.copy(this.position);
      c.scale.set(this.scale.x, this.scale.y, this.scale.z);
      return c;
    }
  }
  class Mesh extends Object3D {
    constructor(geo, mat) { super(); this.geometry = geo || null; this.material = mat || null; }
  }
  class Group extends Object3D {}
  class Sprite extends Object3D { constructor(mat) { super(); this.material = mat || null; } }
  class Points extends Object3D { constructor(geo, mat) { super(); this.geometry = geo; this.material = mat; this.frustumCulled = true; } }
  class Scene extends Object3D { constructor() { super(); this.background = null; this.fog = null; } }
  class PerspectiveCamera extends Object3D {
    constructor(fov, aspect, near, far) { super(); this.aspect = aspect; }
    updateProjectionMatrix() {}
    lookAt() {}
  }
  class Light extends Object3D {
    constructor() {
      super();
      this.target = { position: new Vector3() };
      this.shadow = { mapSize: { set() {} }, camera: {} };
    }
  }
  return {
    Vector3, BufferAttribute, BufferGeometry,
    BoxGeometry: Geometry, SphereGeometry: Geometry, PlaneGeometry: Geometry,
    ConeGeometry: Geometry, CylinderGeometry: Geometry, TorusGeometry: Geometry,
    Color, CanvasTexture: function () { return { wrapS: 0, wrapT: 0, repeat: { set() {} } }; },
    Mesh, Group, Sprite, Points, Scene, PerspectiveCamera,
    HemisphereLight: Light, DirectionalLight: Light,
    MeshStandardMaterial: makeMaterial, MeshBasicMaterial: makeMaterial,
    PointsMaterial: makeMaterial, SpriteMaterial: makeMaterial,
    Fog: function () {},
    WebGLRenderer: function () {
      this.domElement = null; // replaced by harness element below
      this.shadowMap = {};
      this._pixelRatio = 1;
      this.setClearColor = function () {};
      this.setPixelRatio = function (v) { this._pixelRatio = v; };
      this.setSize = function () {};
      this.render = function () {};
    },
    Timer: function () {
      this.update = function () {};
      this.getDelta = function () { return frameDtRef.value; };
    },
    PCFShadowMap: 1, SRGBColorSpace: 2, ACESFilmicToneMapping: 3,
    DoubleSide: 4, RepeatWrapping: 5, AdditiveBlending: 6,
  };
}

/* ---------- minimal DOM stub ---------- */
function makeClassList() {
  const s = new Set();
  return {
    add(...c) { c.forEach((x) => s.add(x)); },
    remove(...c) { c.forEach((x) => s.delete(x)); },
    contains(c) { return s.has(c); },
    toggle(c, force) {
      const want = force !== undefined ? !!force : !s.has(c);
      if (want) s.add(c); else s.delete(c);
      return want;
    },
    _set: s,
  };
}
function ctx2dStub() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'canvas') return {};
      return function () { return { addColorStop() {} }; };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    children: [],
    style: {},
    _listeners: {},
    textContent: '',
    innerHTML: '',
    value: '',
    width: 0,
    height: 0,
    classList: makeClassList(),
    addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); },
    removeEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this['attr:' + k] = v; },
    getAttribute(k) { return this['attr:' + k]; },
    dispatch(t, ev) { (this._listeners[t] || []).forEach((fn) => fn(ev || {})); },
    focus() {},
    click() { this.dispatch('click', {}); },
    getContext() { return ctx2dStub(); },
  };
  return el;
}

/* ---------- storage stub ---------- */
function makeStorage(seed, failWrites) {
  const store = {};
  if (seed) for (const k of Object.keys(seed)) store[k] = seed[k];
  return {
    _store: store,
    _failWrites: !!failWrites,
    getItem(k) { return k in store ? store[k] : null; },
    setItem(k, v) {
      if (this._failWrites) throw new Error('Simulated storage write failure (quota/read-only)');
      store[k] = String(v);
    },
    removeItem(k) { delete store[k]; },
  };
}

function extractInlineScript(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const start = src.lastIndexOf('<script>');
  if (start < 0) throw new Error('no inline <script> in ' + filePath);
  const end = src.indexOf('</script>', start);
  return src.slice(start + '<script>'.length, end);
}

/**
 * Load a fresh game instance.
 * opts: { file='app/index.html', save=null|{key:rawString}|rawString,
 *         failWrites=false, seed=12345, width=1280, height=720 }
 * save: pre-seed localStorage 'penguinPeaksSaveV1' with the given raw string.
 */
function loadGame(opts = {}) {
  const file = opts.file || 'app/index.html';
  const filePath = path.join(REPO, file);
  const script = extractInlineScript(filePath);
  const frameDtRef = { value: 1 / 60 };
  let fakeNow = 0;
  const rafQueue = [];

  // Seed each stub element's initial classes from the real markup, so
  // class-based state (e.g. panels starting with class "hidden") behaves
  // exactly like the browser. Without this, anyPanelOpen() is wrongly true
  // at load and P/C keys misbehave.
  const classMap = {};
  {
    const html = fs.readFileSync(filePath, 'utf8');
    const re = /<[^>]*\bid="([^"]+)"[^>]*>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const cm = m[0].match(/class="([^"]*)"/);
      if (cm) classMap[m[1]] = cm[1].split(/\s+/).filter(Boolean);
    }
  }
  const elsById = {};
  const touchBtns = ['forward', 'left', 'back', 'right'].map((k) => {
    const b = makeEl('button');
    b.setAttribute('data-k', k);
    return b;
  });
  const documentStub = {
    _listeners: {},
    hidden: false,
    getElementById(id) {
      if (!elsById[id]) {
        elsById[id] = makeEl('div');
        (classMap[id] || []).forEach((c) => elsById[id].classList.add(c));
      }
      return elsById[id];
    },
    createElement(tag) { return makeEl(tag); },
    querySelectorAll(sel) {
      if (sel.indexOf('[data-k]') >= 0) return touchBtns;
      return [];
    },
    addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); },
    removeEventListener() {},
    dispatch(t, ev) { (this._listeners[t] || []).forEach((fn) => fn(ev || {})); },
    body: makeEl('body'),
  };

  let seed = null;
  if (typeof opts.save === 'string') seed = { penguinPeaksSaveV1: opts.save };
  else if (opts.save && typeof opts.save === 'object') seed = opts.save;
  const ls = makeStorage(seed, !!opts.failWrites);

  // M2: injectable gamepads for controller tests — tests/setGamepad()
  // replaces the pad list the game sees via navigator.getGamepads().
  let pads = [];
  if (opts.gamepad) pads = [opts.gamepad];

  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.document = documentStub;
  sandbox.localStorage = ls;
  sandbox.navigator = { getGamepads: () => pads.slice(), userAgent: 'node-harness' };
  sandbox.innerWidth = opts.width || 1280;
  sandbox.innerHeight = opts.height || 720;
  sandbox.devicePixelRatio = 1;
  sandbox.console = console;
  sandbox.setTimeout = setTimeout;
  sandbox.clearTimeout = clearTimeout;
  sandbox.setInterval = setInterval;
  sandbox.clearInterval = clearInterval;
  sandbox.performance = { now: () => fakeNow };
  sandbox.THREE = makeThree(frameDtRef);
  // The renderer stub needs a real stub element as domElement.
  const rendererDom = makeEl('canvas');
  const OrigRenderer = sandbox.THREE.WebGLRenderer;
  sandbox.THREE.WebGLRenderer = function () {
    OrigRenderer.call(this);
    this.domElement = rendererDom;
  };
  sandbox._winListeners = {};
  sandbox.addEventListener = function (t, fn) {
    (sandbox._winListeners[t] = sandbox._winListeners[t] || []).push(fn);
  };
  sandbox.removeEventListener = function () {};
  sandbox.requestAnimationFrame = function (cb) { rafQueue.push(cb); return rafQueue.length; };

  vm.createContext(sandbox);
  // Seed Math.random inside the context (context intrinsics are not
  // reachable as host-side properties of the sandbox object).
  sandbox.__seedRandom = mulberry32(opts.seed !== undefined ? opts.seed : 12345);
  vm.runInContext('Math.random = __seedRandom;', sandbox);
  vm.runInContext(script, sandbox, { filename: file });
  const game = sandbox.__game;
  if (!game || !game.G) throw new Error('game did not expose window.__game in ' + file);

  function frame(realDtSec) {
    frameDtRef.value = realDtSec;
    fakeNow += realDtSec * 1000;
    const cbs = rafQueue.splice(0, rafQueue.length);
    for (const cb of cbs) cb(fakeNow);
  }
  function runFrames(n, dtSec) { for (let i = 0; i < n; i++) frame(dtSec); }
  function runSeconds(seconds, fps) {
    const dt = 1 / fps;
    const n = Math.round(seconds * fps);
    runFrames(n, dt);
    return n;
  }
  function keyEvent(code, type, repeat) {
    const ev = { code, repeat: !!repeat, type, preventDefault() {}, stopPropagation() {} };
    documentStub.dispatch(type, ev);
    return ev;
  }
  function keyDown(code, o) { return keyEvent(code, 'keydown', o && o.repeat); }
  function keyUp(code) { return keyEvent(code, 'keyup', false); }
  function pressKey(code, framesAfter) {
    keyDown(code);
    if (framesAfter) runFrames(framesAfter, 1 / 60);
    keyUp(code);
  }
  function dispatchWindow(type, ev) {
    (sandbox._winListeners[type] || []).forEach((fn) => fn(ev || {}));
  }
  function dispatchDocument(type, ev) { documentStub.dispatch(type, ev); }

  return {
    game, sandbox, document: documentStub, elsById, ls, touchBtns,
    rendererDom,
    setGamepad: (gp) => { pads = gp ? [gp] : []; },
    frame, runFrames, runSeconds,
    keyDown, keyUp, pressKey, keyEvent,
    dispatchWindow, dispatchDocument,
    getFakeNow: () => fakeNow,
    setFakeNow: (ms) => { fakeNow = ms; },
    advanceMs: (ms) => { fakeNow += ms; },
    winListenerCount: (t) => (sandbox._winListeners[t] || []).length,
    docListenerCount: (t) => (documentStub._listeners[t] || []).length,
    errBox: () => elsById.errBox,
    sourceFile: file,
  };
}

module.exports = { loadGame, REPO, extractInlineScript };
