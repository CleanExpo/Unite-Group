/**
 * Tests for the absolute-home-path guard.
 *
 * The guard's job is to fail when a tracked file embeds `/Users/<name>/` or
 * `/home/<name>/`. A gate that reports clean because it looked at nothing is
 * worse than no gate, so the mutation control writes a real home path into a
 * real extensionless file and requires the guard to find it.
 *
 * Fixture strings are constructed so THIS file does not itself match the
 * denylist — joining `Users` as a separate token is intentional.
 */

import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  HOME_PATH_RE,
  allowlistReason,
  allowlistedPaths,
  findOffenders,
  shouldScan,
  trackedScannablePaths,
} from '../check-no-absolute-home-paths.mjs';

function leak(parts) {
  return ['', ...parts].join('/');
}

test('shouldScan covers recognised text extensions', () => {
  for (const p of ['a.ts', 'src/b.tsx', 'x/y/c.mjs', 'README.md', '.github/workflows/ci.yml']) {
    assert.equal(shouldScan(p), true, p);
  }
});

test('shouldScan covers EXTENSIONLESS files', () => {
  for (const p of [
    'apps/autopilot-runner/Dockerfile',
    '.github/CODEOWNERS',
    'LICENSE',
    '.husky/pre-commit',
  ]) {
    assert.equal(shouldScan(p), true, p);
  }
});

test('shouldScan takes the extension from the BASENAME, not the path', () => {
  assert.equal(shouldScan('config/nexus.d/Makefile'), true);
  assert.equal(shouldScan('assets/v1.2/logo.png'), false);
});

test('shouldScan skips binary extensions, case-insensitively', () => {
  for (const p of ['a.png', 'fonts/x.woff2', 'docs/spec.pdf', 'bin/tool.exe', 'img/PHOTO.JPG']) {
    assert.equal(shouldScan(p), false, p);
  }
});

test('shouldScan defaults UNKNOWN extensions to scanned, not skipped', () => {
  for (const p of ['a.rune', 'b.ejs', 'c.graphql', 'd.tf', 'e.rs', 'f.go']) {
    assert.equal(shouldScan(p), true, p);
  }
});

test('a hidden dotfile is scanned, not treated as an extension', () => {
  assert.equal(shouldScan('.gitignore'), true);
  assert.equal(shouldScan('apps/web/.gitignore'), true);
});

test('HOME_PATH_RE matches a username path and not a discussed pattern', () => {
  const hit = leak(['Users', 'someone', 'secret']);
  assert.ok(HOME_PATH_RE.test(hit), 'constructed leak must match');
  HOME_PATH_RE.lastIndex = 0;
  assert.equal(HOME_PATH_RE.test('/Users/<name>/'), false, 'angle-bracket discussion form must not match');
  HOME_PATH_RE.lastIndex = 0;
  assert.equal(HOME_PATH_RE.test('/tmp/unite-test-home/secret'), false);
});

test('POSITIVE CONTROL: findOffenders detects a constructed home path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'home-path-guard-'));
  try {
    const dirty = join(dir, 'Dockerfile');
    writeFileSync(dirty, `FROM node:24\nWORKDIR ${leak(['Users', 'someone', 'src'])}\n`);
    const clean = join(dir, 'CODEOWNERS');
    writeFileSync(clean, '* @CleanExpo\n');

    const offenders = findOffenders([dirty, clean]);
    assert.equal(offenders.length, 1, 'exactly the dirty file is reported');
    assert.equal(offenders[0].file, dirty);
    assert.equal(offenders[0].line, 2);
    assert.equal(offenders[0].count, 1);
    assert.equal(offenders[0].sample, leak(['Users', 'someone']) + '/');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('MUTATION CONTROL: a clean file goes red when a home path is planted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'home-path-mut-'));
  try {
    const f = join(dir, 'notes.txt');
    writeFileSync(f, 'cwd=$HOME/project\n');
    assert.deepEqual(findOffenders([f]), []);
    writeFileSync(f, `cwd=${leak(['home', 'runner', 'work'])}/\n`);
    const offenders = findOffenders([f]);
    assert.equal(offenders.length, 1);
    assert.equal(offenders[0].count, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findOffenders reports nothing for clean input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'home-path-clean-'));
  try {
    const f = join(dir, 'Dockerfile');
    writeFileSync(f, 'FROM node:24\nWORKDIR /opt/app\n');
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

test('the real repo selection still excludes binary assets', () => {
  const paths = trackedScannablePaths();
  const binary = paths.filter((p) => /\.(png|jpe?g|webp|woff2?|ico)$/i.test(p));
  assert.deepEqual(binary, [], 'binary assets must not be scanned');
});

test('every ALLOWLIST entry has a written reason and is a real tracked path', () => {
  const listed = allowlistedPaths();
  assert.ok(listed.length > 0, 'allowlist must not be empty on day one — the remaining docs are why');
  for (const f of listed) {
    const reason = allowlistReason(f);
    assert.ok(typeof reason === 'string' && reason.trim().length > 10, `${f} is missing a written reason`);
    assert.equal(f.includes('\\'), false, `${f} must be repo-relative with forward slashes`);
    assert.ok(existsSync(f), `${f} is allowlisted but missing on disk`);
    assert.ok(!reason.includes(leak(['Users', 'x'])), `${f} reason must not itself embed a home path`);
  }
  // Positive control on real content: at least one allowlisted file still matches,
  // otherwise the allowlist is stale theatre.
  const hits = findOffenders(listed);
  assert.ok(
    hits.length > 0,
    'allowlisted files no longer match the denylist — shrink the allowlist rather than keeping ghosts',
  );
});

test('the real repo scan (allowlist excluded) is clean', () => {
  const offenders = findOffenders(trackedScannablePaths());
  assert.deepEqual(
    offenders,
    [],
    `unguarded home paths remain:\n${offenders.map((o) => `  ${o.file}:${o.line} ${o.sample}`).join('\n')}`,
  );
});
