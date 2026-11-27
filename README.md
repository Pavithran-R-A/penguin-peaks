# Penguin Peaks

An original 3D platformer starring Pebbles the penguin. Run, jump, and collect fish across floating ice platforms to reach the flag.

## Play (web demo)

Open `index.html` in a desktop browser (or serve the folder with any static server). No build step and no network needed — Three.js is bundled locally in `assets/three.min.js`.

- Move: WASD / arrow keys (or the on-screen D-pad on touch)
- Jump: Space
- Goal: collect 20 fish and reach the flag. Watch out for spikes and gaps — you have 3 hearts.

## Windows desktop build (Steam target)

The same game as a standalone Windows desktop app (Electron 45.5.0), built for Steam. The Windows source lives in this repo:

- `main.js` — Electron main process (1280×720 window, no menu/devtools, SwiftShader fallback, clean quit)
- `app/index.html` + `app/assets/three.min.js` — the game (Three.js bundled locally, no network, no CDN)
- `package.json` / `package-lock.json` — Electron 45.5.0 + electron-packager 17.1.2

Run it:

```sh
npm install
npm start
```

Package the Windows `.exe`:

```sh
npm run pack:win32
```

Output: `dist/PenguinPeaks-win32-x64/PenguinPeaks.exe`.

### What's built in (money-making playbook)

- Persistent collection tracker: "Collection X/24 · %" in HUD, end screens, and a Collection panel with per-world bars (8 fish/world), lifetime fish, wins, best time
- 10-trophy Achievements wall with unlock toasts and Steam-style IDs (in-game + local save only, no Steamworks claimed)
- Sawtooth moves: Double Jump taught in World 2, Dash (Shift/K) taught in World 3 — one new move per world, one bonus fish relocated to each new route (total stays 24)
- Near-miss end screens naming the exact distance to the next medal (win and game-over screens)
- No streak/daily-login system — the retention spine is mastery + collection, not daily logins

Verification: `STATUS.md` and `VERIFICATION.md`. Final live pass (Electron, headless): full Level 1 route won, 20/20 fish, 2/3 hearts, 0:50 at the flag. Zero console errors, zero external network requests. Beak alignment (penguin runs forwards): east 0.984, north 0.986.

**Note:** the built `dist/` folder (372 MB of Electron binaries, including `PenguinPeaks.exe`) is NOT in this repo — GitHub can't host binaries that large here. The full Windows package including the `.exe` is backed up on pCloud. `dist/` rebuilds from this source with `npm run pack:win32` plus the Electron win32 runtime.

## Credits

Original game built as the example for a PromptBase 3D platformer listing. Pebbles, the levels, and the code are original.
