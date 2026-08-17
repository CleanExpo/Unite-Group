/**
 * Tests for the NUL-byte guard.
 *
 * The guard's own history is the reason these exist. Its first version selected
 * files with `f.slice(f.lastIndexOf('.'))`, which returns "e" for `Dockerfile`
 * — so every extensionless file in the repo (3 Dockerfiles, 4 CODEOWNERS, the
 * git hooks, LICENSE) was silently skipped while the guard reported "clean".
 * A gate that reports clean because it looked at nothing is worse than no gate,
 * so the negative-control test below writes a real NUL into a real extensionless
 * file and requires the guard to find it.
 */

import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { findOffenders, shouldScan, trackedScannablePaths } from '../check-no-nul-bytes.mjs';

test('shouldScan covers recognised text extensions', () => {
  for (const p of ['a.ts', 'src/b.tsx', 'x/y/c.mjs', 'README.md', '.github/workflows/ci.yml']) {
    assert.equal(shouldScan(p), true, p);
  }
});

test('shouldScan covers EXTENSIONLESS files — the bug this guard shipped with', () => {
  for (const p of [
    'apps/autopilot-runner/Dockerfile',
    'apps/workspace/Dockerfile',
    'packages/pi-ceo-operator-mcp/Dockerfile',
    '.github/CODEOWNERS',
    'LICENSE',
    '.husky/pre-commit',
  ]) {
    assert.equal(shouldScan(p), true, p);
  }
});

test('shouldScan takes the extension from the BASENAME, not the path', () => {
  // A dot in a DIRECTORY name must not be mistaken for the file's extension.
  assert.equal(shouldScan('config/nexus.d/Makefile'), true);
  // ...and must not make a genuinely binary file look like it has no extension.
  assert.equal(shouldScan('assets/v1.2/logo.png'), false);
});

test('shouldScan skips binary extensions', () => {
  for (const p of ['a.png', 'fonts/x.woff2', 'docs/spec.pdf', 'bin/tool.exe']) {
    assert.equal(shouldScan(p), false, p);
  }
});

test('a hidden dotfile is scanned, not treated as an extension', () => {
  assert.equal(shouldScan('.gitignore'), true);
  assert.equal(shouldScan('apps/web/.gitignore'), true);
});

test('NEGATIVE CONTROL: findOffenders detects a NUL in an extensionless file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nul-guard-'));
  try {
    const dockerfile = join(dir, 'Dockerfile');
    // Line 2 carries the NUL, so the reported line number is checkable too.
    writeFileSync(dockerfile, Buffer.from('FROM node:24\nRUN echo \x00 hi\n', 'binary'));
    const clean = join(dir, 'CODEOWNERS');
    writeFileSync(clean, '* @CleanExpo\n');

    const offenders = findOffenders([dockerfile, clean]);
    assert.equal(offenders.length, 1, 'exactly the dirty file is reported');
    assert.equal(offenders[0].file, dockerfile);
    assert.equal(offenders[0].line, 2);
    assert.equal(offenders[0].count, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findOffenders reports nothing for clean input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nul-guard-'));
  try {
    const f = join(dir, 'Dockerfile');
    writeFileSync(f, 'FROM node:24\nRUN true\n');
    assert.deepEqual(findOffenders([f]), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findOffenders ignores a tracked-but-missing path instead of throwing', () => {
  assert.deepEqual(findOffenders([join(tmpdir(), 'definitely-not-here-9f3a2b')]), []);
});

test('the real repo selection actually includes the Dockerfiles', () => {
  const paths = trackedScannablePaths();
  const dockerfiles = paths.filter((p) => p.endsWith('Dockerfile'));
  assert.ok(
    dockerfiles.length >= 3,
    `expected the repo's Dockerfiles to be scanned, got ${dockerfiles.length}: ${dockerfiles.join(', ')}`,
  );
});
