# Penguin Peaks — M2 Vertical Slice Complete

- **Branch:** `audit-remediation` (from baseline `4e53bf2520366a1305d7e3335e0f23ed7a903d50`)
- **M1 tip:** `1d8c808` (PP-01..PP-10 fixed, 10/10 green) — see `AUDIT_M1.md`
- **M2 tip:** see `git log` (M2 commits below)
- **Method:** improve → regression-test-first where practical → test → review → commit, per area.
  Final run: **17/17 test files green** (`tests/logs/run-all-2026-11-27T15-14-30-453Z.log`,
  PP-01..PP-10 + M2a..M2g). Live Electron check (real app, real keys):
  `tests/evidence/m2-live-electron.json` + screenshots `tests/evidence/m2-*.png`.
- **Mission source:** `~/workspace/user/files/Penguin_Peaks_Audit_and_Improvement_Mission.pdf`
  §05 (vertical slice) and §07 gate M2. No M3 content work was started.

## What improved, per area (PDF §05)

| Area | Change | Evidence |
|---|---|---|
| Movement & camera (M2a) | Variable jump height (early Space release cuts the jump); coyote time + jump buffer 0.13 → 0.16 s; air control 10 → 14; landing-shadow blob on the island below (shrinks/fades with height); bouncing chevron above the next checkpoint/flag; camera look-ahead (velocity-scaled, follow 8/s so lag does not cancel it); camera never clips into an island top or below the sea | `tests/test-m2a-movement.js` (7 checks) |
| Belly slide (M2b) | **KEPT.** Hold X (keyboard/touch) or Y (gamepad) while moving: accelerates toward 11 u/s (vs 7.2 run), steers slowly toward input, brakes hard on reverse input, ends on release / jump (hop boost) / leaving the ground / low speed; slide pose (pitched, flattened, flippers spread) + snow spray | `tests/test-m2b-slide.js` (7 checks); live: sliding=true at 10.48 u/s in Electron (`m2-slide-640x400.png`) |
| Readability & art (M2a/M2f) | Landing shadow, objective chevron, per-level objective line; red scarf, sunset, snow, floating ice retained; all assets original (see `THIRD_PARTY_NOTICES.md` — bundled Three.js r186, MIT) | Live screenshots 640×400 / 720p / 1080p |
| Settings / accessibility (M2c) | Settings panel (O / gear button): quality presets (High/Medium/Low → pixel ratio + shadows + snow), render scale, music/SFX sliders, mute, reduced shake/flash, remappable controls (click, press a key), fullscreen button, save-location note. All persisted + validated on load | `tests/test-m2c-settings.js` (9 checks); live `m2-settings-720p.png` |
| Controller (M2d) | Gamepad API, polled once/frame: stick (0.25 dead zone) + D-pad move; A jump/confirm, X dash, Y slide (held), Start pause/resume, B close panel — edge-triggered; prompts switch to gamepad wording; disconnect still clears input + auto-pauses (PP-07) | `tests/test-m2d-gamepad.js` (7 checks, injected pads) |
| Audio & feedback (M2e) | Original synthesized soundtrack (16-step A-minor pentatonic loop + bass, no files, no licensed music), driven on the fixed timestep while playing; ambient wind noise loop; music/SFX are independent volume channels behind the mute gate; landing/hurt/collect cues distinct | `tests/test-m2e-audio.js` (6 checks) |
| Progression & UI (M2f) | Achievement toasts queue in order (a win can unlock 4 at once — old code showed only the last); level select on the start screen (worlds unlock by reaching checkpoints, persisted); objective line names world + next goal + fish count; compact card CSS for short viewports | `tests/test-m2f-ui.js` (5 checks); live 640×400 below |
| Save & packaging (M2g) | Versioned save schema v2 (v1 migrates: progress kept, new fields defaulted); `scripts/build-info.js` (`npm run build:info`) writes version + git SHA/branch/timestamp; package 1.1.0; `pack:win32` gains `--version-string` exe metadata; main.js logs the Electron userData save location | `tests/test-m2g-save.js` (6 checks) |

## M2 commits

| Commit | Area |
|---|---|
| `5952df3` | M2a movement + camera tuning |
| `f99d308` | M2b belly-slide prototype |
| `256d55e` | M2c settings + accessibility |
| `936abb2` | M2d controller support |
| `2ae4405` | M2e audio + feedback |
| `5ed5d30` | M2f progression + UI |
| `0c99e12` | M2g save + packaging |
| `417d22c` | Wire M2a..M2g into run-all.js (17/17 green) |

## Belly-slide verdict: KEPT (with a human caveat)

Automated controllability checks pass: it engages only while moving,
builds momentum past run speed, steers, brakes to a stop, exits cleanly
on jump/release/ground loss, and cannot start in the air or from a
standstill — and it works live in Electron (sliding=true, 10.48 u/s).
Whether it is *fun* is a feel judgment no harness can make: a human
playtest should confirm it before it is tuned further. Cosmetic note
from the live run: at slide speed the penguin rides low in the frame
(the camera is still catching up when the screenshot was taken 0.8 s
after engaging) — framing, not a defect.

## Live Electron evidence (real app, real keys, `tests/live-electron-check.cjs`)

- **640×400 start card — FIXED vs the audit note.** Card top 24 / bottom 376,
  Start button top 340 / bottom 384, **visible without scrolling** (the audit
  recorded only a ~6 px sliver before scrolling). The card still scrolls
  (scrollHeight 602 vs clientHeight 348 — the level-select row sits below
  the fold), but the primary action no longer needs the scroll.
  `tests/evidence/m2-start-640x400.png`
- **640×400 gameplay:** state playing, 2 s of holding W moved the penguin
  z 2 → −13.63, 2 fish collected, 3 hearts, game time 2.8 s.
  `tests/evidence/m2-gameplay-640x400.png`
- **720p settings:** panel visible, game paused, card 634 px tall (fits),
  quality + rebind controls present. `tests/evidence/m2-settings-720p.png`
- **1080p start:** card fits, Start visible. `tests/evidence/m2-start-1080p.png`
- **Console errors across all three launches: 0.**
- **Frame rate in this VM: 5.5 FPS at 640×400, 2.5 FPS at 720p** — this is
  SwiftShader software rendering on a 1.5-CPU VM, a floor for this
  environment, NOT a claim about real hardware. The fixed timestep
  (PP-02) is what keeps game time correct at any frame rate; real
  hardware FPS still needs a Windows/GPU run.

## Incidents during M2 (all fixed, tests prove it)

- M2c: `recomputeKeys` still used hardcoded WASD codes, so a remapped
  forward key did nothing — fixed by deriving directions from the
  remappable keyMap (PP-03 per-source tracking preserved).
- M2c: a `var keyMap={}` initializer ran after the early `applySettings()`
  call and wiped the rebuilt keymap, breaking W entirely — caught by
  PP-03/PP-04 regressions; `applySettings()` now runs at the bottom of
  the script after all top-level statements.
- M2b test: sliding north at 10+ u/s outruns the small northern islands
  and falls into gaps mid-test — the slide itself was fine; the test now
  slides south on the big start island.
- Live check: the managed Chromium binary refuses direct launch
  ("Hatch WebGL domain policy is required for browser startup") and the
  old `/tmp` Electron binary was gone after a service restart — the live
  check now uses the repo's own Electron (`npm install`, cached zips),
  which is also how the earlier verification ran.

## Remaining human-only gaps (NOT verified — do not claim)

- **Real Windows run:** the `.exe` has still never run on a real Windows
  machine; exe version-string stamping needs a Windows/Wine packaging
  run (flags are set, stamp unverified). Hardware-GL frame rates
  unmeasured. No Steam/Store readiness claimed.
- **Sound by ear** (music mix, wind level, cue balance), **real gamepad
  playthrough** (driving is implemented + harness-tested with injected
  pads; no physical controller was in this VM), **human playtest**
  (full 20-fish and 24-fish runs, belly-slide fun verdict, Day/level
  feel), **320 px layout**.
- Severe stalls (< 2 FPS sustained): unchanged from M1 — physics
  catch-up capped at 30 steps/frame, excess recorded in `G.stallSeconds`.

## Not done (out of M2 scope)

- M3 content (8 worlds / 24 levels is a PROPOSAL only), M4/M5.
- No store submission, no paid services, no publishing. Nothing pushed
  to `main`. History not rewritten. Push status: see the coordinator's
  report (remote is HTTPS with no credential helper; `gh` not logged in).
