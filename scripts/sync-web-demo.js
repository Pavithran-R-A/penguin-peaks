'use strict';
/**
 * PP-09 — one canonical game source, deterministic copy pipeline.
 *
 * Canonical source: app/index.html (the desktop build).
 * Generated output:  index.html   (the root web demo).
 *
 * The two files used to diverge silently: the root demo lacked persistent
 * collection, double jump, dash and the start-card fix. Now the root demo
 * is a byte-for-byte copy of app/index.html, produced by this script, and
 * tests/test-pp09.js asserts the hashes match and both files pass the
 * same live feature checks. Run after any change to app/index.html:
 *
 *   node scripts/sync-web-demo.js   (or: npm run sync:web)
 *
 * Both files reference assets/three.min.js relatively, and both
 * app/assets/ and assets/ hold the same bundled library, so the copy
 * needs no path rewriting — by design, so a copy can never drift.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repo = path.resolve(__dirname, '..');
const src = path.join(repo, 'app', 'index.html');
const dst = path.join(repo, 'index.html');

const data = fs.readFileSync(src);
fs.writeFileSync(dst, data);
const hash = crypto.createHash('sha256').update(data).digest('hex');
console.log(`synced index.html <- app/index.html (${data.length} bytes, sha256 ${hash})`);
