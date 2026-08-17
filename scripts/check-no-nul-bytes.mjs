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

const EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.css', '.scss', '.html',
  '.yml', '.yaml', '.sql', '.sh', '.toml',
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

// Only files git actually tracks — node_modules and build output are not ours
// to police, and scanning them would make this slow enough to get skipped.
const files = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\n')
  .filter(Boolean)
  .filter((f) => EXTENSIONS.has(f.slice(f.lastIndexOf('.'))))
  .filter((f) => !ALLOWLIST.has(f));

const offenders = [];
for (const f of files) {
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

if (offenders.length === 0) {
  console.log(`NUL-byte guard: clean (${files.length} tracked source files)`);
  process.exit(0);
}

console.error('NUL BYTES FOUND — git will treat these files as binary and hide their diffs in review:\n');
for (const o of offenders) {
  console.error(`  ${o.file}:${o.line}  (${o.count} NUL byte${o.count === 1 ? '' : 's'})`);
}
console.error('\nFind the exact position with:');
console.error("  python3 -c \"d=open('FILE','rb').read(); i=d.index(b'\\\\x00'); print(repr(d[i-80:i+80]))\"");
process.exit(1);
