# Third-party notices — Penguin Peaks

All game art, levels, characters, music and code are original works
created for this project, except for the bundled library below.

## Three.js r186 — MIT License

- File: `app/assets/three.min.js` and `assets/three.min.js` (same bundled
  file, copied by `scripts/sync-web-demo.js` — see PP-09)
- Source: https://github.com/mrdoob/three.js
- License: MIT (see the license header inside `three.min.js`)
- Used for: 3D rendering only. No Three.js example code, models or
  textures are used.

## Everything else — original

- Pebbles the penguin, the red scarf, the sunset/snow/floating-ice
  look, all platforms, fish, crabs, flags, pines and the snowman:
  modelled and textured in code in `app/index.html`. No copied assets.
- Soundtrack and ambient wind: synthesized live with the Web Audio API
  in `app/index.html` (original 16-step pentatonic loop). No audio
  files, no licensed music.
- Fonts: system fonts only (Verdana/Geneva/sans-serif). No webfonts.

No network requests are made by the game at runtime: Three.js is
bundled locally and there is no CDN, analytics or telemetry.
