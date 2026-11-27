# Penguin Peaks — M1 Correctness Complete (PP-01..PP-10)

- **Branch:** `audit-remediation` (from baseline `4e53bf2520366a1305d7e3335e0f23ed7a903d50`)
- **Tip at M1 completion:** see `git log` (M1 commits below)
- **Method:** reproduce → fix → test → review → commit, per defect.
  Every test failed on the baseline first (log:
  `tests/logs/run-all-2026-11-27T14-50-02-731Z.log`, 0/10 green) and
  passes after its fix. Final run: **10/10 test files green**
  (`tests/logs/run-all-2026-11-27T14-57-32-640Z.log`).
- **Harness:** `tests/harness.js` — executes the real inline game JS in a
  Node `vm` sandbox with mocked WebGL/DOM/audio/storage, seeded RNG and
  a controllable fake clock (the audit's own method). Run with
  `node tests/run-all.js` (or `npm test`).

## Defect status

| Defect | Status | Evidence (test) | Fix commit |
|---|---|---|---|
| PP-01 P0 forced software rendering | FIXED | `test-pp01.js` — no unconditional SwiftShader switches; env-gated compat mode; GPU diagnostics logged; security posture kept | `435c72b` |
| PP-02 P0 frame-rate-dependent time | FIXED | `test-pp02.js` — 60/30/20/10/6 FPS all give G.time 60.00 s over 60 s; player/platform/enemy phases agree across rates; 6 FPS jump lands | `9ff6bb5` |
| PP-03 P1 duplicate movement alias | FIXED | `test-pp03.js` — all 4 alias pairs, both release orders, mixed keyboard/touch, live movement | `5264481` |
| PP-04 P1 action auto-repeat | FIXED | `test-pp04.js` — repeat P/Escape/R ignored; repeat Space no double jump; fresh re-press still double-jumps | `7a6ea95` |
| PP-05 P1 unwanted jump on restart | FIXED | `test-pp05.js` — queued Space after reset: vy stays 0 (was 10.07); transient fields cleared; restart mid-dash / from modal clean | `98ba3d5` |
| PP-06 P1 pause advances hazards | FIXED | `test-pp06.js` — 10 s P-pause, Esc-pause, panel pause: platforms/crabs/timer/player bit-identical; platform attachment + ride offset survive a 5 s pause | `f3ac118` (freeze itself came from the PP-02 playing-gate + gameClock; this commit adds the attachment regression test) |
| PP-07 P1 focus loss / input recovery | FIXED | `test-pp07.js` — blur/visibilitychange/gamepaddisconnected handlers exist; input cleared, auto-pause, deliberate resume required | `52eeb28` |
| PP-08 P1 concurrent instances/saves | FIXED | `test-pp08.js` — single-instance lock + focus in main.js; saves validated/clamped on load; write failure visible (errBox + G.saveError) | `0184639` |
| PP-09 P1 web/desktop divergence | FIXED | `test-pp09.js` — `scripts/sync-web-demo.js` deterministic; `index.html` byte-identical to `app/index.html`; double jump + dash run live in the web demo | `1629a59` (+ re-sync `1223534`) |
| PP-10 P2 medal display vs threshold | FIXED | `test-pp10.js` — 119.9/120.0/120.1/179.9/180.0/180.1 s all agree in tenths; bestTime stored precisely; save and medal UI agree | `a7b53f4` |

## Smoke (ad-hoc, post-M1)

Fish pickup, checkpoint 1 (double jump taught), win with 20 fish,
game over on last heart, pause/resume and R restart — all pass in the
harness (run 2026-11-27 ~20:27 IST).

## Remaining human-only gaps (NOT verified — do not claim)

- **Real Windows run:** the `.exe` has still never run on a real Windows
  machine. PP-01's hardware-GL default and GPU diagnostics are
  implemented but unmeasured on real hardware — needs a Windows launch
  recording renderer + frame times.
- **Sound by ear**, **real gamepad playthrough** (gamepad driving itself
  is M2 work; PP-07 only clears gamepad state), **human playtest**
  (full 20-fish and 24-fish runs, Day/level feel), **320px / small
  layouts**, **Steam / Store readiness**.
- Severe stalls (< 2 FPS sustained): physics catch-up is capped at 30
  steps/frame (0.5 s); excess is recorded in `G.stallSeconds` as an
  explicit performance interruption rather than silently slowing the
  game — documented behaviour, not a hidden loss.

## Not done (out of M0+M1 scope)

- M2 vertical slice, M3 content — dispatched separately by the coordinator.
- No store submission, no paid services, no publishing. Nothing pushed
  to `main`. History not rewritten.
