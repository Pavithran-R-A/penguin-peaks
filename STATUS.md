# Penguin Peaks — Windows Desktop Build: Status

**Updated:** 2026-11-27 ~17:36 IST (after the re-verification run — start-card fix confirmed live)

## Current state

- **Electron shell:** built and verified (Electron 45.5.0, `main.js` unchanged since the v1 shell check).
- **Game build in `app/`:** start-card-fix build — `index.html` **66,050 bytes, md5 `7b27918daec1f62b334632dba589d118`**; `three.min.js` 865,452 bytes, md5 `64991b18d67d8173ca63b69723a61016` (unchanged). Byte-identical to `~/workspace/ts-spaces/3d-platformer-demo/`. Diff vs the previous build is exactly one line: `.card` gained `max-height:88vh;overflow-y:auto` (line 40).
- **Win32 package:** `dist/PenguinPeaks-win32-x64/` (372 MB), `PenguinPeaks.exe` 250,417,152 bytes (byte-identical to the previous package's exe), re-packaged the manual way from `electron-v45.5.0-win32-x64.zip`. `resources/app/app/index.html` md5 `7b27918d…` (new), `three.min.js` md5 `64991b18…` (unchanged). The only other file that differs from the old package is `resources/app/package.json` — now the raw project file (author `Pavithran-R-A`, version `1.0.0`) instead of the packager-normalized copy (author `""`, no version). Benign, arguably an improvement. The previous package is kept aside as `dist/PenguinPeaks-win32-x64.old-20261127/` (372 MB, safe to delete). **Not executed** (needs a real Windows machine).
- **Route verification: WON.** Attempt 1, 2026-11-27 ~17:00–17:05 IST: **20/20 fish, 2/3 hearts, 0:50**, win screen seen, 0 console entries, 2 `file://` requests (both 200), 0 exceptions. Beak alignment east 0.984 (n=83), north 0.986 (n=45). Spike at (1.2,−24) clear (min distance 2.20). One heart lost at the CP1 crab crossing this run (crossing-timing variance at slow game rates; game behaved correctly, run still won — previous run crossed with 3 hearts intact).
- **Start-card fix CONFIRMED LIVE at 640×400:** card top 24 / bottom 376 / height 352 (= 88vh), `max-height:352px`, `overflow-y:auto`, scrollHeight 468 > clientHeight 348, scrolls (scrollTop 0→120). Title "🐧 Penguin Peaks" fully visible (top 48–83). Collection + Achievements buttons fully within the card view after scrolling, and both opened their panels via REAL mouse clicks. At 1280×720 the card is unchanged (top 124, bottom 596, height 472, fits=true — identical numbers to the previous run).
- **Mechanics verified live (this run):** collection 20/24 · 83% (HUD, win screen, pause screen, Collection panel with per-world bars 8/8, 6/8, 6/8); 10-achievement wall, **6 unlocked** this run (First Catch, Peak Conqueror, Full Belly, Speedy Penguin, Double Trouble, Dash of Speed) — Healthy Heart + Flawless Feathers correctly LOCKED after the one crab hit, Every Last Fish + Fishmonger correctly locked (Fishmonger progress "20/50 fish"); Double Jump + Dash taught (banners visible, opacity 1) and used (ledge y=5.4, dash spur); near-miss medal lines on win ("2 fish short!") and game-over ("18 fish short!", "World 1 of 3 — World 2 was next.").
- **Lifetime counter:** +1 per pickup, no double-counting (cleared save → 20 pickups → `lifetimeFish:20`; +2 more in the game-over test → 22). Persists across reload AND across a fresh solo relaunch (verified in a fresh 720p instance: `lifetimeFish:22`, `bestZone:[8,6,6]`, `wins:1`, `bestTime:50`).
- **Controls:** WASD + Space + Shift (dash) exercised by the route; ArrowUp/ArrowLeft verified live (dz −3.96 north, dx −2.52 west); Esc pauses/resumes; P pauses/resumes; R restarts (pos back to spawn, fish 0, hearts 3); C/T open Collection/Achievements; pauseBtn/resumeBtn mouse clicks work. No streak/daily-login system (DOM text scan empty).
- **720p pass:** title/gameplay/pause clean, 0 console/exceptions. NOTE: a second Electron instance launched while the first is alive sees an EMPTY save (two instances share one user-data-dir; the profile is locked by the first). This is a test-environment artifact, not a game defect — the solo 720p relaunch reads the save correctly (HUD "Collection 20/24 · 83%"). Do not run two instances concurrently when save state matters.
- **Quit:** `window.close()` → port dead in ~1 s (640×400 app) and ≤12 s (720p app), 0 stray processes, ports free, Xvfb stopped.

## Open items

1. **Wine install still needs approval** (to stamp FileVersion into the exe; packaged exe currently has no version metadata). `wine64` 9.0 is available in Ubuntu noble/universe; the install confirmation timed out and was not retried.
2. **Windows `.exe` not executed** — needs a real Windows machine.
3. Human-only gaps (unchanged): sound by ear, real gamepad, 60 fps feel; Steam depot/upload (needs a Steam partner account).
4. P3 cosmetic observations (not defects, not blocking): at 640×400 the ▶ Start Adventure button is only a ~6px sliver at the card's bottom edge before scrolling (title fully visible, scrollbar visible, scroll reveals it); the win-screen achievement toast briefly overlaps the "Collection 20/24 · 83%" line until it fades; the 💔 emoji on the game-over title renders as a placeholder box in this VM's font set (DOM text is correct).

## Notes for the next run

- Route driver is `driver/route-v3.mjs` (self-healing: relaunches the app on port **9240** if it dies, checks the page title is Penguin Peaks, clears the save per attempt). Run: `node driver/route-v3.mjs` (logs `logs/route-v3.log`, summary `logs/route-v3-summary.json`).
- Post-win driver for this run: `driver/post-win3.mjs` (win screen, C/T panels with correct IDs `collectionScreen`/`achScreen`, reload persistence, start-card measurements, streak scan, pause/resume, R restart). `driver/startcard-probe.mjs` does the real-mouse-click button test at 640×400. `driver/gameover.mjs` does the 3-falls-north game-over test (do NOT use `post-win.mjs`/`post-win2.mjs` for game-over: they use KeyS falls, which can never fall because south is clamped at z≤9, and they read IDs that do not exist).
- The 720p pass is `driver/visual-720-v2.mjs` on port **9241** (launch the app separately with `PP_WIDTH=1280 PP_HEIGHT=720`).
- A killed test script can leave a key held in the page: always `releaseAll()` + reload before fresh driving.
- The game has a soft world bound `z ≤ 9` (south) — falls for the game-over test must go north/east/west.
- Do NOT run two Electron instances at once when save state matters (second instance sees an empty save — profile lock, not a game bug).
- Do NOT `pkill -f` with a pattern that appears in your own command line (it kills your own shell — happened once this session with `Xvfb :98`). Kill by PID instead.
- No processes left running at the end of this session (both apps quit via `window.close()`, Xvfb stopped, ports 9240/9241 free).
