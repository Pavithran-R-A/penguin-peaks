'use strict';
// Penguin Peaks — Electron main process (Windows desktop / Steam target).
// Loads the bundled game (app/index.html + app/assets/three.min.js, local only,
// no network, no CDN) in a single window. No devtools, no external menu.
//
// PP-01: the production default uses hardware GL. The previous build forced
// the SwiftShader CPU backend unconditionally (use-gl=angle +
// use-angle=swiftshader); that is now opt-in only, for test/compatibility
// runs where no usable GPU exists:
//   PP_SOFTWARE_RENDERING=1  (or PP_COMPAT_MODE=1)
// GPU/backend diagnostics are logged at startup via app.getGPUInfo().

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Explicit test/compatibility mode only — never the production default.
const SOFTWARE_RENDERING = process.env.PP_SOFTWARE_RENDERING === '1' ||
  process.env.PP_COMPAT_MODE === '1';
if (SOFTWARE_RENDERING) {
  // Software WebGL fallback for machines without a GPU (and CI / VMs).
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
  app.commandLine.appendSwitch('use-gl', 'angle');
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
}

// PP-08: single-instance lock. A second launch used to open a second
// window sharing one profile directory, and the second instance saw an
// empty save (STATUS.md). Now the second instance just focuses the
// primary window instead of opening a new one.
if (process.env.PP_TEST_USER_DATA) {
  // Test-only isolated profile directory (never the production default).
  app.setPath('userData', process.env.PP_TEST_USER_DATA);
}
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;

function logGpuDiagnostics() {
  if (typeof app.getGPUInfo !== 'function') {
    console.log('[Penguin Peaks] GPU diagnostics unavailable (no app.getGPUInfo)');
    return;
  }
  app.getGPUInfo('complete').then((info) => {
    const aux = (info && info.auxAttributes) || {};
    const status = typeof app.getGPUFeatureStatus === 'function' ? app.getGPUFeatureStatus() : {};
    console.log('[Penguin Peaks] GPU diagnostics: softwareRendering=' + SOFTWARE_RENDERING +
      ' glVersion=' + (aux.glVersion || 'unknown') +
      ' glRenderer=' + (aux.glRenderer || 'unknown') +
      ' webgl=' + (status.webgl || 'unknown') +
      ' webgl2=' + (status.webgl2 || 'unknown'));
  }).catch((err) => {
    console.log('[Penguin Peaks] GPU diagnostics failed: ' + (err && err.message));
  });
}

function createWindow() {
  // Window size overridable via env for testing (defaults to 1280x720).
  const width = parseInt(process.env.PP_WIDTH || '1280', 10);
  const height = parseInt(process.env.PP_HEIGHT || '720', 10);
  // M2: explicit local save location, logged at startup so a player or
  // tester can find (or back up) the profile. The game itself shows the
  // same location in its Settings panel.
  console.log('[Penguin Peaks] save location (userData): ' + app.getPath('userData'));

  mainWindow = new BrowserWindow({
    width,
    height,
    title: 'Penguin Peaks',
    backgroundColor: '#2e1a52',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: false
    }
  });

  // No application menu at all — this is a game, not a document editor.
  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => { logGpuDiagnostics(); createWindow(); });

app.on('window-all-closed', () => {
  // Quit on every platform when the game window closes (incl. Windows).
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
