'use strict';
/**
 * M2 live visual check — the REAL Electron app (not the logic harness).
 *
 * Launches the repo's own Electron build under Xvfb, one viewport per
 * launch (640x400 / 1280x720 / 1920x1080), drives it over CDP with real
 * mouse clicks and real key events, and records screenshots + DOM
 * measurements + console errors + an FPS sample.
 *
 * Usage: node tests/live-electron-check.cjs
 * Output: tests/evidence/m2-*.png + tests/evidence/m2-live-electron.json
 *
 * NOTE: this VM has no GPU, so the app runs with PP_SOFTWARE_RENDERING=1
 * (the documented opt-in compat mode). Frame rates here are a VM floor,
 * not a claim about real hardware — the fixed-timestep logic tests
 * (PP-02) are what prove frame-rate independence; this check proves the
 * game renders and plays live in its real shell.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ELECTRON = path.join(REPO, 'node_modules', '.bin', 'electron');
const PORT = 9224;
const EVIDENCE = path.join(__dirname, 'evidence');
fs.mkdirSync(EVIDENCE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      } else if (msg.method) this.events.push(msg);
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) {
      throw new Error('page eval threw: ' +
        (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    }
    return r.result.value;
  }
  async shot(name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    const p = path.join(EVIDENCE, name);
    fs.writeFileSync(p, Buffer.from(r.data, 'base64'));
    return p;
  }
  async keyDown(code, key, vk) {
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode: vk });
  }
  async keyUp(code, key, vk) {
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: vk });
  }
}

async function launchElectron(w, h) {
  const profile = `/tmp/pp-electron-profile-m2-${w}x${h}`;
  fs.rmSync(profile, { recursive: true, force: true });
  const child = spawn('xvfb-run', ['-a', ELECTRON, '.', `--remote-debugging-port=${PORT}`, '--no-sandbox'], {
    cwd: REPO, detached: true, stdio: 'ignore',
    env: {
      ...process.env,
      PP_WIDTH: String(w), PP_HEIGHT: String(h),
      PP_SOFTWARE_RENDERING: '1',
      PP_TEST_USER_DATA: profile,
      ELECTRON_DISABLE_SANDBOX: '1',
    },
  });
  // Wait for the DevTools endpoint, then for the game page target.
  let page = null;
  for (let i = 0; i < 60; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      page = targets.find((t) => t.type === 'page' && t.url.includes('index.html'));
      if (page) break;
    } catch (e) { /* not up yet */ }
    await sleep(500);
  }
  if (!page) throw new Error(`Electron page target never appeared (${w}x${h})`);
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await sleep(2000); // first frames + game init
  return { child, cdp };
}

function stopElectron(child) {
  try { process.kill(-child.pid, 'SIGKILL'); } catch (e) { try { child.kill('SIGKILL'); } catch (e2) {} }
}

function pageErrors(cdp) {
  return cdp.events.filter((e) =>
    (e.method === 'Runtime.exceptionThrown') ||
    (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') ||
    (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'));
}

(async () => {
  const report = { errors: [], checks: {} };

  /* ---------- 640x400 ---------- */
  {
    const { child, cdp } = await launchElectron(640, 400);
    try {
      report.checks.start640 = await cdp.eval(`(() => {
        const c = document.querySelector('#startScreen .card');
        const r = c.getBoundingClientRect();
        const b = document.getElementById('startBtn').getBoundingClientRect();
        return { cardTop: Math.round(r.top), cardBottom: Math.round(r.bottom),
          scrollH: c.scrollHeight, clientH: c.clientHeight,
          startBtn: { top: Math.round(b.top), bottom: Math.round(b.bottom),
            visible: b.bottom <= innerHeight && b.top >= 0 },
          canvas: !!document.querySelector('#game canvas'), game: !!window.__game };
      })()`);
      await cdp.shot('m2-start-640x400.png');
      await cdp.eval(`(() => { const c = document.querySelector('#startScreen .card'); c.scrollTop = c.scrollHeight; return c.scrollTop; })()`);
      await sleep(300);
      report.checks.start640AfterScroll = await cdp.eval(`(() => {
        const b = document.getElementById('startBtn').getBoundingClientRect();
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), visible: b.bottom <= innerHeight && b.top >= 0 };
      })()`);
      await cdp.eval(`document.getElementById('startBtn').click()`);
      await sleep(400);
      await cdp.keyDown('KeyW', 'w', 87);
      await sleep(2000);
      report.checks.gameplay640 = await cdp.eval(`(() => { const G = window.__game.G;
        return { state: G.state, pos: { x: +G.pos.x.toFixed(2), y: +G.pos.y.toFixed(2), z: +G.pos.z.toFixed(2) },
          fish: G.fish, hearts: G.hearts, time: +G.time.toFixed(1) }; })()`);
      await cdp.shot('m2-gameplay-640x400.png');
      await cdp.keyDown('KeyX', 'x', 88);
      await sleep(800);
      report.checks.slide640 = await cdp.eval(`(() => { const G = window.__game.G;
        return { sliding: G.sliding, speed: +Math.hypot(G.vel.x, G.vel.z).toFixed(2) }; })()`);
      await cdp.shot('m2-slide-640x400.png');
      await cdp.keyUp('KeyX', 'x', 88);
      await cdp.keyUp('KeyW', 'w', 87);
      report.checks.fps640 = await cdp.eval(`new Promise(res => {
        let n = 0; const t0 = performance.now();
        (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f);
          else res({ frames: n, fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1) }); })();
      })`, true);
      report.errors.push(...pageErrors(cdp).map((e) => '640x400: ' + JSON.stringify(e.params).slice(0, 400)));
    } finally { stopElectron(child); await sleep(1000); }
  }

  /* ---------- 1280x720 ---------- */
  {
    const { child, cdp } = await launchElectron(1280, 720);
    try {
      await cdp.eval(`document.getElementById('startBtn').click()`);
      await sleep(300);
      await cdp.keyDown('KeyW', 'w', 87);
      await sleep(1500);
      await cdp.keyUp('KeyW', 'w', 87);
      await cdp.shot('m2-gameplay-720p.png');
      await cdp.eval(`document.getElementById('settingsBtn').click()`);
      await sleep(400);
      report.checks.settings720 = await cdp.eval(`(() => {
        const s = document.getElementById('settingsScreen');
        const r = s.querySelector('.card').getBoundingClientRect();
        return { visible: !s.classList.contains('hidden'), state: window.__game.G.state,
          cardH: Math.round(r.height),
          hasQuality: document.getElementById('settingsBody').innerHTML.includes('Quality'),
          hasRebind: document.getElementById('settingsBody').innerHTML.includes('rebind-jump') };
      })()`);
      await cdp.shot('m2-settings-720p.png');
      await cdp.eval(`document.getElementById('settingsClose').click()`);
      await sleep(300);
      report.checks.fps720 = await cdp.eval(`new Promise(res => {
        let n = 0; const t0 = performance.now();
        (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f);
          else res({ frames: n, fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1) }); })();
      })`, true);
      report.errors.push(...pageErrors(cdp).map((e) => '720p: ' + JSON.stringify(e.params).slice(0, 400)));
    } finally { stopElectron(child); await sleep(1000); }
  }

  /* ---------- 1920x1080 ---------- */
  {
    const { child, cdp } = await launchElectron(1920, 1080);
    try {
      report.checks.start1080 = await cdp.eval(`(() => {
        const c = document.querySelector('#startScreen .card');
        const r = c.getBoundingClientRect();
        const b = document.getElementById('startBtn').getBoundingClientRect();
        return { cardFits: r.bottom <= innerHeight, startVisible: b.bottom <= innerHeight && b.top >= 0 };
      })()`);
      await cdp.shot('m2-start-1080p.png');
      report.errors.push(...pageErrors(cdp).map((e) => '1080p: ' + JSON.stringify(e.params).slice(0, 400)));
    } finally { stopElectron(child); await sleep(1000); }
  }

  report.checks.errorCount = report.errors.length;
  fs.writeFileSync(path.join(EVIDENCE, 'm2-live-electron.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.errors.length ? 1 : 0;
})().catch((e) => { console.error('LIVE CHECK FAILED:', e); process.exit(1); });
