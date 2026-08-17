#!/usr/bin/env node
/**
 * Fail if any source file contains a NUL byte.
 *
 * WHY THIS GUARD EXISTS. On 16/08/2026 a single 0x00 byte reached `main` inside
 * apps/web/src/lib/metering/fetchers/anthropic.ts, introduced by a heredoc write
 * during PR #1009. Nothing caught it:
 *
 *   - TypeScript compiled it (a NUL is valid UTF-8 and a legal string literal)
 *   - every test passed (it sat inside a Map key, where it worked correctly)
 *   - ESLint passed
 *   - CI passed all 17 checks
 *
 * The damage was not runtime. Git classifies a file containing NUL as BINARY, so
 * it renders as `Bin 0 -> 5804 bytes` in a diff and its contents are invisible in
 * pull requests. That file went through review — human and automated — with
 * nobody able to see a single line of it. A defect that hides the code from
 * review is worse than one that breaks a test, because it disables the process
 * that would have caught everything else.
 *
 * Runs in milliseconds. No dependencies.
 */

import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Binary formats, which legitimately contain NUL and are not review surface.
 *
 * DENYLIST, NOT AN ALLOWLIST — and that inversion is the whole point. The first
 * two versions of this guard listed the extensions to *include*, and both were
 * wrong in the same way: whatever was not on the list was skipped in silence.
 * Version one missed every extensionless file (3 Dockerfiles, 4 CODEOWNERS, the
 * git hooks); version two still skipped 273 tracked files, among them 28 Python
 * files, 21 PowerShell scripts, `apps/web/vitest.config.mts` and a `.prisma`
 * schema. All real source. A NUL in any of them hides its diff exactly as well
 * as a NUL in a .ts file. Both gaps were found in review on PR #1017, not by
 * the guard.
 *
 * Inverted, the failure mode inverts with it: a binary format nobody listed
 * gets REPORTED rather than skipped. That is a loud, one-line fix (add the
 * extension here, or the file to ALLOWLIST) instead of a gate that quietly
 * inspects nothing and prints "clean".
 */
const BINARY_EXTENSIONS = new Set([
  // images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.tiff', '.ico', '.icns',
  // fonts
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  // archives and documents
  '.pdf', '.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar', '.jar',
  // audio and video
  '.mp3', '.mp4', '.m4a', '.mov', '.avi', '.webm', '.wav', '.ogg',
  // compiled and packed artefacts
  '.wasm', '.exe', '.dll', '.so', '.dylib', '.node', '.bin', '.class',
  '.pyc', '.pyo', '.db', '.sqlite', '.sqlite3',
  // key material
  '.p12', '.pfx', '.keystore',
]);

/**
 * Known pre-existing offenders, allowlisted so this guard can be adopted today
 * rather than blocked behind unrelated cleanup.
 *
 * Listed EXPLICITLY, file by file, rather than by excluding a directory — the
 * point of this guard is that such files are visible. An excluded folder would
 * hide the next one.
 */
const ALLOWLIST = new Map([
  [
    'apps/empire/src/lib/innovation/framework/types.ts',
    // UTF-16 LE with a BOM (0xFF 0xFE), so exactly half its bytes are NUL —
    // 9,241 of 18,484. Not introduced by the change that added this guard;
    // found BY it on first run. apps/empire is reference-only per CLAUDE.md
    // ("do not build new features here"), so re-encoding it to UTF-8 is a
    // separate, scoped decision rather than something to slip into an
    // unrelated commit. Its diffs are invisible in review until that happens.
    'pre-existing UTF-16 file in reference-only apps/empire — see PR discussion',
  ],
]);

/**
 * Should this tracked path be scanned? Everything except a known binary format.
 *
 * The extension is taken from the BASENAME, not the whole path — `foo.d/Makefile`
 * has no extension even though the path contains a dot. Getting that wrong is
 * not hypothetical: the original selection computed `f.slice(f.lastIndexOf('.'))`
 * over the whole path, which returns "e" for `Dockerfile` (`lastIndexOf` gives
 * -1 and `slice(-1)` is the last character), and every extensionless file in the
 * repo was excluded while the guard reported clean.
 *
 * A leading dot is a hidden file (`.gitignore`), not an extension.
 */
export function shouldScan(path) {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return true;
  return !BINARY_EXTENSIONS.has(base.slice(dot).toLowerCase());
}

/** Scan the given paths, returning one entry per offending file. */
export function findOffenders(paths) {
  const offenders = [];
  for (const f of paths) {
    let buf;
    try {
      // A deleted-but-tracked path is not an error for this check.
      if (!statSync(f).isFile()) continue;
      buf = readFileSync(f);
    } catch {
      continue;
    }
    const idx = buf.indexOf(0);
    if (idx !== -1) {
      const line = buf.subarray(0, idx).toString('utf8').split('\n').length;
      offenders.push({ file: f, line, count: buf.filter((b) => b === 0).length });
    }
  }
  return offenders;
}

/** Tracked paths this guard is responsible for. */
export function trackedScannablePaths() {
  // Only files git actually tracks — node_modules and build output are not ours
  // to police, and scanning them would make this slow enough to get skipped.
  return execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n')
    .filter(Boolean)
    .filter(shouldScan)
    .filter((f) => !ALLOWLIST.has(f));
}

function main() {
  const files = trackedScannablePaths();
  const offenders = findOffenders(files);

  if (offenders.length === 0) {
    console.log(`NUL-byte guard: clean (${files.length} tracked source files)`);
    return 0;
  }

  console.error('NUL BYTES FOUND — git will treat these files as binary and hide their diffs in review:\n');
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  (${o.count} NUL byte${o.count === 1 ? '' : 's'})`);
  }
  console.error('\nFind the exact position with:');
  console.error("  python3 -c \"d=open('FILE','rb').read(); i=d.index(b'\\\\x00'); print(repr(d[i-80:i+80]))\"");
  return 1;
}

// Only run when invoked directly. Without this, importing the module for a test
// would execute the whole scan and call process.exit out from under the runner.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
