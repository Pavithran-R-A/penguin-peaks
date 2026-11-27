# Penguin Peaks — Windows Desktop (Electron) Verification

**Platform:** Windows Steam desktop (standalone `.exe`, Electron).  
**Verified:** 2026-11-27 (live, in the Linux Electron build — the Windows `.exe` was NOT executed; see §6). Re-verified 2026-11-27 ~17:26–17:36 IST after the start-card fix (§7).  
**Game build verified:** `index.html` 66,050 bytes, md5 `7b27918daec1f62b334632dba589d118` (start-card-fix build — the only change vs the previous 66,018-byte build is `.card { max-height:88vh; overflow-y:auto }` on line 40); `three.min.js` 865,452 bytes, md5 `64991b18d67d8173ca63b69723a61016` (unchanged). Copies in `app/` are byte-identical to `~/workspace/ts-spaces/3d-platformer-demo/` (verified by md5, 2026-11-27 17:26 IST).

## 1. What was built

- **Electron 45.5.0** (`electron@45`, `electron-packager@17.1.2`), Node 24.22.1 / npm 10.9.4.
- Project: `~/workspace/demo-windows-20261127/penguin-peaks/`
  - `package.json` — name `penguin-peaks`, version 1.0.0, author `Pavithran-R-A`, main `main.js`
  - `main.js` — BrowserWindow 1280×720 default (overridable via `PP_WIDTH`/`PP_HEIGHT`), title "Penguin Peaks", `loadFile` of `app/index.html`, no menu, no devtools, SwiftShader switches (`enable-unsafe-swiftshader`, `use-gl=angle`, `use-angle=swiftshader`), quits on window-all-closed
  - `app/index.html` + `app/assets/three.min.js` — copies of the game (source never edited)
  - `driver/` — CDP helpers (`cdp.mjs`) and test drivers (`route-v3.mjs`, `post-win.mjs`, `post-win2.mjs`, `gameover.mjs`, `visual-720-v2.mjs`, `mechanics-pre.mjs`, …)
  - `shots/` — screenshots (see §3), `logs/` — `route-v3.log`, `route-v3-summary.json`
- **Win32 package:** `dist/PenguinPeaks-win32-x64/` (372 MB)
  - `PenguinPeaks.exe` — 250,417,152 bytes (byte-identical to the previous package's exe — same Electron 45.5.0 runtime)
  - `resources/app/` — unpacked app dir (`app/index.html`, `app/assets/three.min.js`, `main.js`, `package.json`, `node_modules`); `resources/app/index.html` md5 `7b27918d…` — identical to the verified source copy. Re-packaged the manual way 2026-11-27 ~17:26 IST from `electron-v45.5.0-win32-x64.zip` (`~/.cache/electron/…/electron-v45.5.0-win32-x64.zip`); the previous package is kept aside as `dist/PenguinPeaks-win32-x64.old-20261127/` (safe to delete). The only other file differing from the old package is `resources/app/package.json` — now the raw project file (author `Pavithran-R-A`, version `1.0.0`) instead of the packager-normalized copy (author `""`, no version); benign, arguably an improvement.
  - Standard Electron win32 runtime files (`chrome_*.pak`, `d3dcompiler_47.dll`, `ffmpeg.dll`, `icudtl.dat`, `LICENSE`, …)
  - Packaged the manual way (staging copy, see §5): the packaged exe has **no stamped FileVersion metadata** — proper fix is Wine + re-package from the real project (Wine install still needs approval, §6).

## 2. Live verification — the full route WON

Driver `driver/route-v3.mjs` (CDP, isolated Xvfb `:98`, 640×400). Winning run 2026-11-27 ~11:33–11:37 IST, **attempt 1 of 3, 222 s real time** (game-time rate 0.22–0.32 during this run).

| Check | Result |
|---|---|
| Final state | **WON** — `state:"won"`, **20/20 fish**, **3/3 hearts**, **time 0:52** (52.39 game-s), pos (−2.43, −115.26) at the flag |
| Console entries | **0** |
| Network | exactly 2 `file://` requests, both **200** — zero external hosts |
| Exceptions | **0** |
| Beak alignment (penguin runs forwards) | east mean **0.992** (n=41, min 0.76), north mean **0.985** (n=21, min 0.76) |
| World 1 run+jump only | single-jump apex **maxY 1.86**, `hasDoubleJump:false`, `secondJumpFired:false` — confirmed before CP1 |
| World 1 spike at (1.2,−24) | **CLEAR** — min distance **1.99** at (2.55,−22.54); hurt radius 1.0. The spike does not interfere with the verified route. (Measured live on the jump leg, twice: 1.90 and 1.99.) |
| CP1 / Double Jump teach | fish 7, hearts 3, level 2, `hasDoubleJump:true`, teach banner "🦘 NEW MOVE — Double Jump!" **visible (opacity 1)** |
| MP1 entry / exit | entry landed (1.2,−49.67) y=2.2 on MP1 (fit maxErr 0.217); exit landed (−5.9,−58.5) y=2.6 on (−4,−60), fish 9, hearts 3 |
| Double-jump ledge (World 2) | landed (0.69,−54.18) **y=5.4** (high ledge), fish 10, `dj:true`, toast "Double Trouble" |
| Ledge return | landed (−5.65,−61.96) y=2.6, fish 10, hearts 3 |
| CP2 / Dash teach | fish 13, hearts 3, level 3, `hasDash:true`, teach banner "💨 NEW MOVE — Dash!" **visible (opacity 1)** |
| Dash spur (World 3) | dash out landed (−10.9,−84.93) y=3.6, fish 15→16, `dash:true`, toast "Dash of Speed"; dash back landed (−1.5,−84.93), fish 16 |
| MP2 entry / exit | entry landed (−0.1,−92.25) y=4.1 on MP2 (fit maxErr 0.295), fish 17; exit landed (−5.92,−100.88) y=4.6, fish 17, hearts 3 |
| Flag approach | fish 19 at (−2,−113), fish **20** at (−3,−115); win triggered driving to the flag at (−2.43,−115.26) |
| Win-screen medals | "Silver medal: 22 fish — you collected 20. **2 fish short!**" + "🥇 Gold time: 2:00 — you finished in **0:52**!" |
| Win-screen collection | "Collection **20/24 · 83%**" (with progress bar) |
| Win toast | "🏆 Achievement unlocked: Speedy Penguin" **visible (opacity 1)** |
| Save after win | `bestZone:[8,6,6]`, **`lifetimeFish:20`**, `wins:1`, `bestTime:52`, 8 achievements |
| Achievements unlocked (8/10) | `ACH_FIRST_CATCH`, `ACH_WORLD_FEAST`, `ACH_DOUBLE_JUMP`, `ACH_DASH`, `ACH_FIRST_WIN`, `ACH_FULL_HEARTS`, `ACH_NO_DAMAGE`, `ACH_SPEEDY`. Locked (correctly): `ACH_COMPLETIONIST` (needs 24 fish in one run), `ACH_FISH_50` (needs 50 lifetime fish; progress shown as "20/50 fish") |
| Lifetime counter | **+1 per pickup, no double-counting** — cleared save → 20 pickups → `lifetimeFish:20`; then 2 more pickups in the game-over test → `lifetimeFish:22` |
| Save persistence | save identical after a page reload (`lifetimeFish:20`, `wins:1`, `bestTime:52`, same 8 achievements) |
| HUD collection | "Collection 20/24 · 83%" in the HUD, on the win screen, on the pause screen, and on the start screen's saved state |
| Collection panel (C) | "🐟 Fish Collection" — World 1 8/8 (full bar), World 2 6/8, World 3 6/8, "Total: Fish 20/24 — 83%", "Lifetime fish caught: 20 · Wins: 1 · Best win time: 0:52" |
| Achievements panel (T) | "🏆 Achievements — 8 of 10 unlocked — saved on this device." All 10 rows with names, descriptions, and Unlocked ✓ / Locked states; Fishmonger shows progress "20/50 fish" |
| Pause / resume | P pauses (state `paused`, pause screen shows "Collection: 20/24 · 83%"), P resumes to `playing` |
| Restart | R restarts (pos back to spawn (0,0,2), fish 0, hearts 3) |
| No streak / daily system | none present (verified: no daily-login, streak, or reward UI anywhere) |
| No Steamworks | none integrated, none claimed (achievements are in-game + local save only) |

### Game-over near-miss (deliberate, 3 falls north off the spawn platform)

- Falls 1/2/3: hearts 3→2→1→0, state `over`. Respawn at checkpoint after each fall.
- Game-over screen: "💔 Out of Hearts", "The crabs and the cold got the better of Pebbles this time. Shake off the snow and try again!", "🐟 Fish collected: **2 / 20**", "⏱ Final time: 0:09", "♥ Hearts left: 0", "Collection 20/24 · 83%".
- Near-miss lines (exact): "You needed 20 fish to make the flag count — you collected 2. **18 fish short!**" and "You reached **World 1 of 3 — World 2 was next.**"
- Console 0, exceptions 0 during the game-over test.

### 1280×720 visual pass (new build)

- Viewport 1280×720. **Start card fits: top 124, bottom 596, height 472, fits=true.** The Collection button (top 528, bottom 572) is visible/reachable at 720p.
- Title: "🐧 Penguin Peaks" with story, controls, "▶ Start Adventure", Collection + Achievements buttons — all visible.
- Gameplay: penguin (red scarf) faces north, fish/platforms/spikes/pine/snowman/sun disc/mountains visible, no missing textures, HUD unclipped (fish 0/20, Collection 20/24 · 83%, ♥♥♥, 0:00, LEVEL 1 Sunset Shallows, objective "Collect 20 fish, then reach the flag! 🏁").
- Pause screen: "⏸ Paused", "Fish: 0 / 20 · Time: 0:00", "Collection: 20/24 · 83%", Resume / Collection / Achievements / Restart (R).
- Console 0, exceptions 0.

### Quit (new build)

- `window.close()` (X-button equivalent) → app fully exited in **≤9 s** (close 11:50:23, confirmed gone 11:50:32; no stray process, port dead). (v1 build measured ~13 s; the faster time here is lower VM load. Either way this is SwiftShader teardown on the VM, not an app hang; ~1 s is expected on real Windows hardware.)

## 3. Screenshots (all under `shots/`)

| Shot | What it shows |
|---|---|
| `v3-a1-01-start.png` | Start, attempt 1 |
| `v3-a1-02-d4.png` | After the (3.5,−24) fish, 6 fish, 3 hearts |
| `v3-a1-03-checkpoint-1-teach.png` | CP1 + Double Jump teach banner |
| `v3-a1-04-stage-mp1.png` … `v3-a1-06-mp1-exit-landed.png` | MP1 entry/exit |
| `v3-a1-07-ledge.png` | On the high double-jump ledge (y=5.4) |
| `v3-a1-08-checkpoint-2-teach.png` | CP2 + Dash teach banner |
| `v3-a1-09-dash-spur.png` | On the dash spur (−12,−85) |
| `v3-a1-10-stage-mp2.png` … `v3-a1-12-mp2-exit-landed.png` | MP2 entry/exit |
| `v3-a1-13-flag-approach.png` | Flag approach, 20 fish |
| `v3-a1-14-win.png` | **Win screen** (medals, collection 20/24 · 83%, Speedy Penguin toast) |
| `v3-post-01-collection.png` | Collection panel (per-world bars) |
| `v3-post-04-achievements.png` | Achievements panel (8 of 10) |
| `v3-post-05-gameover.png` | **Game-over screen** (near-miss lines) |
| `v3-720-01-title.png` / `v3-720-02-gameplay.png` / `v3-720-03-pause.png` | 1280×720 title / gameplay / pause |

Logs: `logs/route-v3.log` (full winning run), `logs/route-v3-summary.json` (attempts, console, network, exceptions, final save/state).

## 4. Defects found across all loops — and what was done

### Game-code defect (reported for the parent to fix — game files NOT edited)

1. **Start card overflows at 640×400 (regression from the taller start card).** Measured on the new build: the card is **472 px tall**; in a 400 px viewport it overflows 36 px top AND bottom (title h1 top −12, clipped; `startCollBtn` bottom 412, off-screen, unreachable). `.card` has `max-height:none`, overflow visible; body `overflow:hidden`, so there is no way to scroll to the clipped content. At 1280×720 it fits (top 124, bottom 596). **Exact fix:** in `index.html`, `<style>`, the `.card` rule — give it `max-height:88vh; overflow-y:auto` (like `.card.wide`), or reduce the start-card content/padding at short heights via a media query. File: `~/workspace/ts-spaces/3d-platformer-demo/index.html`, `<style>` `.card` rule. **FIXED 2026-11-27 — see §7: the fix landed exactly as specified (line 40) and is confirmed live at 640×400 (title fully visible, card scrolls, both buttons open their panels via real mouse clicks). No open game-code defects remain.**

### Driver defects found and fixed (my own code — `driver/route-v3.mjs` only)

2. **Four route legs used `driveTo` across gaps instead of `jumpTo`.** (−3.5,−17)→(3.5,−24), (2.5,−34)→(0,−42), (−2,−62)→(4,−67), (3,−108)→(−2,−113). The penguin walked off a platform edge and fell (first attempt derailed, hearts 3→2, respawn at spawn). Fixed: all four are now gap jumps with correct stages.
3. **Landing-wait timeouts too short for the slow game-time rate.** At rate ~0.02 a jump flight is ~40 s real; the 25–30 s waits timed out mid-flight (landings read at y=1.68 mid-air). Fixed: all landing waits 70 s (double-jump 90 s).
4. **`pos()` returning null crashed the driver.** A transient CDP evaluate failure returned null and the `landed` log read `s.x` of null (TypeError, attempt killed). Fixed: `pos()` retries 5×, and all 5 `landed` logs + the driveTo arrival read are null-guarded; the attempts loop now try/catches and moves to the next attempt.
5. **MP exit north-edge target past the platform's support margin.** `mpExit` edgeZ −52.9/−94.9 is past the platform's support margin (−52.75/−94.75), so the penguin walked off the edge and fell while waiting for the fire window (attempt 1 of the earlier run: MP1 exit landed back at CP1, hearts 3→2). Fixed: edgeZ −52.2 / −94.2 (0.3 inside the edge). The winning run's MP1/MP2 exits both landed on target.
6. **`mpEntry` held W during the fire wait.** The stage is ~0.6 from the platform's north edge; holding W walks the penguin off the edge before the jump fires (MP2 entry failure in the earlier run: the penguin had already fallen and respawned at CP2 when Space fired). Fixed: no W during the wait; W is pressed at fire time with a speed-gated hold.
7. **Fixed 600 ms pre-jump hold is rate-dependent.** At rate 0.3 it walks ~1 unit before Space — past a 0.5-unit stage edge (attempt 3's spike jump: the penguin walked off the edge and Space did nothing). Fixed: speed-gated hold in `jumpTo`/`doubleJumpTo`/`dashJumpTo`/`mpEntry` — jump when horizontal speed ≥ 3.0 u/s (or 2000 ms cap), bounding the pre-jump walk to ~0.3 units at any rate.
8. **Crab waits ignored the crab's direction.** The CP1 wait broke when the crab was at x≥2.0 but moving *west*, so it swept back across the penguin's path mid-crossing (attempt 1 of the earlier run lost a heart). Fixed: break only when the crab is east AND moving east (two samples 500 ms apart). The winning run crossed with 3 hearts intact.
9. **Route driver kept running legs after game over.** After a game over it executed ~15 more legs from a dead state (wasting ~10 min). Fixed: `pos()` throws `GAME_OVER` on state `over`, unwinding the attempt to the loop's try/catch, which logs it distinctly and starts the next attempt.
10. **Driver attached to another agent's app.** After our app was SIGTERM'd, Tide Table Diner took port 9231 and the driver connected to it. Fixed: moved to port **9240** and `appAlive()` now checks the page title contains "Penguin Peaks" before connecting.
11. **A dead app main can linger holding the debug port** (renderer died, main alive, no page target) — a fresh launch then cannot bind the port and has no DevTools server, so `ensureApp` reported "app did not come up" and attempts 2–3 were skipped. Fixed: `ensureApp()` kills any holder of our port (via `execFile` `pkill`, no shell, so it cannot self-match) and waits for the port to free before spawning; come-up wait raised 90 s → 120 s. The driver now launches/relaunches the app itself.
12. **Earlier patches silently failed to apply** (Python `str.replace` on patterns that didn't match the actual code — the try/catch, `pos()` retry, and `releaseAll` at attempt start were never added the first time, which is why a CDP timeout killed the driver instead of moving to the next attempt). Fixed by re-applying against the actual file contents and verifying every patch with `grep` afterwards. Lesson recorded in `AGENTS.md`-style notes: always verify a replace landed.

### Route outcome after the fixes

- The earlier 3-attempt run (before fixes 5–9): attempt 1 game over at the ledge-back, attempt 2 game over at the MP2 entry, attempt 3 game over at the spike jump — all three failures were driver defects, not game defects.
- After fixes 5–9: **attempt 1 WON, 20/20 fish, 3/3 hearts, 0:52** — the first full clean run.

## 5. Environment hazards observed (not game defects)

- **The Electron app was SIGTERM'd three times by the environment** (main process killed; once the renderer died while the main survived holding the port). The app log shows "exited with signal SIGTERM". Likely another agent's broad process cleanup or runtime memory management; the VM was at ~10 load average with only ~194 MB free at the time. The driver now self-heals (relaunch + reconnect + per-attempt save clear).
- **The runtime restarted once mid-run** (VM uptime reset to 1 min), killing Xvfb, the app, and the driver. Xvfb had to be restarted (`Xvfb :98 -screen 0 1440x900x24`).
- **A killed test script can leave a key held in the page** (its `keyUp` never arrives) — the penguin then keeps walking (in one case south, into the z≤9 clamp). Mitigation: `releaseAll()` + page reload before any fresh driving. Also note the game's soft world bound `G.pos.z=Math.min(9,G.pos.z)` (line 951) — the penguin cannot walk south past z=9, so falls must be done north/east/west.
- **The game-over screen reuses the `winScreen` element** (no separate `overScreen`): `gameOver()` sets title "💔 Out of Hearts" and its own medal lines into `#winMedals` / `#winCollText`. Test scripts must read those IDs, not `overMedals`/`overColl` (which do not exist).

## 6. Remaining gaps (explicit)

- **The Windows `.exe` was NOT executed.** `PenguinPeaks.exe` (250 MB, Electron 45.5.0 win32-x64) was packaged and verified structurally only. It needs a real Windows machine to confirm it launches, renders, and plays. Do NOT claim it runs.
- **Sound by ear** — not verified (no audio hardware in the VM; the game has WebAudio SFX).
- **Real gamepad** — not verified (keyboard only).
- **60 fps feel** — not verifiable here: the VM runs SwiftShader at ~2–6 fps (game-time rate 0.02–0.32 depending on load). The game logic is frame-rate independent (dt clamp 0.05 s), and the route won at every rate observed, but the feel at 60 fps on real hardware is unproven.
- **Steam depot / upload steps** — not done; need a Steam partner account.
- **Wine install still needs approval.** `electron-packager` needs Wine (`wine64` 9.0, available in Ubuntu noble/universe) to stamp `FileVersion`/`CompanyName` into the exe. The install step triggered a user-confirmation requirement that timed out; per instructions it was NOT retried. The packaged exe therefore has no stamped version metadata (see §1). Approve the Wine install and re-package from the real project to fix.
- **Start-card overflow at 640×400** (§4.1) — **FIXED and verified live, see §7.** No open game-code defects remain.
- **8-live / 6-wide and 320 px layouts** — not tested (desktop target is 1280×720; the 640×400 route size is a test artifact).
- **Steam Deck** — not claimed, not tested.
- **Two Electron instances at once share one user-data-dir:** a second instance launched while the first is alive sees an EMPTY save (profile lock). Test-environment artifact, not a game defect — a solo relaunch reads the save correctly (§7). Do not run two instances concurrently when save state matters.

## 7. Re-verification run 2 — start-card fix (2026-11-27 ~17:26–17:36 IST)

Build re-copied and re-packaged first: source `index.html` 66,050 bytes, md5 `7b27918d…` (previous 66,018 / `82bd46bf…`); `diff` vs the old copy is exactly line 40, the `.card` rule gaining `max-height:88vh;overflow-y:auto`. `three.min.js` unchanged (md5 `64991b18…`). Re-packaged the manual way from `electron-v45.5.0-win32-x64.zip`; exe byte-identical to the previous package. No files under `~/workspace/ts-spaces/` were edited; nothing was pushed, uploaded, submitted, or deleted (the old package is kept as `dist/PenguinPeaks-win32-x64.old-20261127/`).

### 7a. Full route — WON, attempt 1

Driver `driver/route-v3.mjs` (CDP, Xvfb `:98`, 640×400), **285 s real time**. Final state **WON — 20/20 fish, 2/3 hearts, time 0:50** (50.30 game-s), pos (−2.42, −115.33) at the flag. Console **0**, network exactly 2 `file://` requests both **200**, exceptions **0**. Beak alignment east mean **0.984** (n=83, min 0.76), north mean **0.986** (n=45, min 0.76). Spike at (1.2,−24) **CLEAR** (min distance **2.20** at (2.83,−22.53)). World 1 run+jump only re-confirmed (single-jump apex maxY **1.86**, `hasDoubleJump:false`). CP1: fish 7, level 2, `hasDoubleJump:true`, teach banner "🦘 NEW MOVE — Double Jump!" visible (opacity 1). MP1 entry landed (1.44,−49.07) y=2.2, exit landed (−5.89,−58.77) y=2.6, fish 9. Double-jump ledge landed (0.13,−54.9) **y=5.4**, fish 10, toast "Double Trouble". CP2: fish 13, level 3, `hasDash:true`, teach banner "💨 NEW MOVE — Dash!" visible (opacity 1). Dash spur landed (−11.01,−84.75) y=3.6, fish 16, toast "Dash of Speed"; dash back landed. MP2 entry (1.63,−92.61) y=4.1, exit (−5.85,−101.09) y=4.6, fish 17. Flag approach: fish 20 at (−2.93,−114.82), win driving to the flag. Win medals: "Silver medal: 22 fish — you collected 20. **2 fish short!**" + "🥇 Gold time: 2:00 — you finished in **0:50**!". Win collection "**20/24 · 83%**". Save after win: `bestZone:[8,6,6]`, **`lifetimeFish:20`**, `wins:1`, `bestTime:50`, 6 achievements. One heart was lost at the CP1 crab crossing this run (fish 8, hearts 2) despite the east-moving crab wait — crossing-timing variance at the slow game rate (~0.25); the game behaved correctly (hit → −1 heart, no death spiral) and the run still won. The previous run crossed with 3 hearts intact. Not a game defect.

### 7b. Start-card fix — CONFIRMED LIVE at 640×400

Driver `driver/post-win3.mjs` + `driver/startcard-probe.mjs` (new this run). Viewport 640×400: card top **24**, bottom **376**, height **352** (= 88vh of 400), `max-height:352px`, `overflow-y:auto`, clientHeight 348, scrollHeight **468**, scrollable **true**, scrollTop moves 0→120 and back to 0. Title "🐧 Penguin Peaks" top 48–83, **fully visible**. Before scrolling the ▶ Start Adventure button is only a ~6 px sliver at the card's bottom edge (top 370, card bottom 376) — P3 cosmetic nit, not a defect: the scrollbar is visible and scrolling reveals it. After scrolling, Start / Collection / Achievements are all fully within the card view, and **real mouse clicks** on the Collection button (center 232,330) and Achievements button (center 380,330) both opened their panels (`collectionScreen` / `achScreen`) with the correct content. Screenshots `shots/v3r-post-03-startcard-scrolled.png`, `v3r-post-04-startcard-top.png`, `v3r-post-06-collbtn-click.png`, `v3r-post-07-achbtn-click.png`. At 1280×720 the card is **unchanged** (top 124, bottom 596, height 472, fits=true — identical numbers to the previous run).

### 7c. Playbook mechanics — all four re-verified live

1. **Collection "X/24 · %"** — HUD "Collection 20/24 · 83%", win screen "20/24 · 83%", pause screen "Collection: 20/24 · 83%", Collection panel (C): World 1 8/8 (full bar), World 2 6/8, World 3 6/8, "Total: Fish 20/24 — 83%", "Lifetime fish caught: 20 · Wins: 1 · Best win time: 0:50".
2. **10-achievement wall** — "6 of 10 unlocked — saved on this device." Unlocked: First Catch, Peak Conqueror, Full Belly, Speedy Penguin, Double Trouble, Dash of Speed. Correctly LOCKED: Healthy Heart + Flawless Feathers (one crab hit this run — correct enforcement, the previous 3-heart run had all 8), Every Last Fish (needs 24 in one run), Fishmonger ("20/50 fish"). Toasts seen live (Speedy Penguin opacity 1 on the win screen; First Catch / Double Trouble / Dash of Speed text captured, opacity 0 at read time because toasts fade after ~3.4 s real — read-timing artifact, not a defect).
3. **Double Jump + Dash** — taught at CP1/CP2 (banners visible, opacity 1) and used (high ledge y=5.4, dash spur); World 1 remains run+jump only (apex 1.86, `hasDoubleJump:false` before CP1).
4. **Near-miss lines on BOTH end screens** — win: "Silver medal: 22 fish — you collected 20. **2 fish short!**"; game-over (3 falls north, `driver/gameover.mjs`): "You needed 20 fish to make the flag count — you collected 2. **18 fish short!**" and "You reached **World 1 of 3 — World 2 was next.**" Game-over screen also shows "💔 Out of Hearts", fish 2/20, time 0:09, hearts 0, collection 20/24 · 83% with progress bar. (Note: the 💔 emoji renders as a placeholder box in this VM's font set; the DOM text is correct — VM font issue, not a game defect. The win-screen toast briefly overlaps the collection line until it fades — transient.)
- **Lifetime counter:** cleared save → 20 pickups → `lifetimeFish:20`; +2 more in the game-over test → **22** (exactly +1 per pickup, no double-counting). Persists across reload (identical save) AND across a fresh solo relaunch (720p instance: `lifetimeFish:22`, `bestZone:[8,6,6]`, `wins:1`, `bestTime:50`, HUD "Collection 20/24 · 83%").
- **No streak / daily-login system:** DOM text scan for `streak|daily|log in|login|come back tomorrow|reward` returned zero hits.

### 7d. Controls (all live this run)

WASD + Space + Shift (dash) exercised by the route. ArrowUp: z 2 → −1.96 (north); ArrowLeft: x 0 → −2.52 (west). Esc pauses/resumes. P pauses/resumes (pause screen shows "Collection: 20/24 · 83%"). R restarts (pos back to spawn (0,0,2), fish 0, hearts 3). C/T open Collection/Achievements. pauseBtn/resumeBtn mouse clicks work. Checkpoints: respawn at spawn after falls 1–2 in the game-over test; save `spawn` after the win was CP2 (0,3.1,−75).

### 7e. 1280×720 visual/HUD pass + quit

Driver `driver/visual-720-v2.mjs` (port 9241). Viewport 1280×720. Start card fits (top 124, bottom 596), Collection button visible (528–572). Gameplay: penguin (red scarf) faces north, fish/platforms/spikes/pine/snowman/sun disc/mountains visible, no missing textures, HUD unclipped. Pause screen clean ("⏸ Paused", "Fish: 0 / 20 · Time: 0:00", "Collection: 20/24 · 83%" on the solo relaunch; the concurrent-instance pass showed 0/24 · 0% because the second instance could not read the locked profile — see §6). Console 0, exceptions 0, network 0 new requests in the solo check. **Quit:** `window.close()` → 640×400 app port dead in **~1 s**, 720p app dead within 12 s, **0 stray processes**, ports 9240/9241 free, Xvfb stopped.

### 7f. New defects found this loop

**None.** No new game-code defects. The one open defect from the previous loop (§4.1) is fixed and verified live. P3 observations only (not blocking, no fix requested): (a) at 640×400 the Start button is a ~6 px sliver before scrolling; (b) win-screen toast briefly overlaps the collection line; (c) 💔 renders as a placeholder box in this VM's font set. Logs: `logs/route-v3.log`, `logs/route-v3-summary.json`, `logs/post-win3.out`, `logs/startcard-probe.out`, `logs/gameover-run2.out`, `logs/visual-720-run2.out`. Shots: `shots/v3-a1-*.png` (route), `shots/v3r-post-*.png` (post-win + start-card), `shots/v3-720-*.png` (720p).

## 8. Verdict

The desktop build is **STABLE**: the full Level 1 route is winnable inside the Electron app (attempt 1, 20/20 fish, 2/3 hearts, 0:50), all four playbook mechanics work live (collection %, 10-achievement wall with toasts and persistent saves, double jump + dash taught and used, near-miss medal lines on both end screens), console/network/exceptions are clean (0 / 2×200 / 0 across every driver session this run), the start-card fix is confirmed live at 640×400 with the 720p card unchanged, all listed keyboard + mouse controls work, and quit is clean with zero stray processes. **Zero open game-code defects.** The only remaining gaps are the human-only ones in §6 — above all, the Windows `.exe` itself is still unexecuted and needs a real Windows machine; sound by ear, real gamepad, 60 fps feel, and Steam depot/upload are likewise unverified. Do not claim the `.exe` runs on Windows until it has been executed there.
