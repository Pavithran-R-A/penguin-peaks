'use strict';
// Penguin Peaks — Electron main process (Windows desktop / Steam target).
// Loads the bundled game (app/index.html + app/assets/three.min.js, local only,
// no network, no CDN) in a single window. No devtools, no external menu.

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Software WebGL fallback so the game renders on machines without a GPU
// (and on CI / VMs). On real Windows hardware with a GPU, Electron will
// prefer hardware GL; these switches only matter when that is unavailable.
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
app.commandLine.appendSwitch('use-gl', 'angle');
app.commandLine.appendSwitch('use-angle', 'swiftshader');

let mainWindow = null;

function createWindow() {
  // Window size overridable via env for testing (defaults to 1280x720).
  const width = parseInt(process.env.PP_WIDTH || '1280', 10);
  const height = parseInt(process.env.PP_HEIGHT || '720', 10);

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Quit on every platform when the game window closes (incl. Windows).
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
