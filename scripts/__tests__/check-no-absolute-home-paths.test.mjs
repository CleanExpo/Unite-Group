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
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  HOME_PATH_RE,
  allowlistReason,
  allowlistedPaths,
  findOffenders,
  findTrackedOffenders,
  shouldScan,
  trackedEntries,
  trackedScannablePaths,
} from '../check-no-absolute-home-paths.mjs';

const GUARD = fileURLToPath(new URL('../check-no-absolute-home-paths.mjs', import.meta.url));
const SWARM_ENV_CHECK = fileURLToPath(
  new URL('../../apps/workspace/scripts/swarm-env-check.sh', import.meta.url),
);

/** A throwaway git repo; `setup(dir)` writes and stages whatever the case needs. */
function withScratchRepo(setup, body) {
  const dir = mkdtempSync(join(tmpdir(), 'home-path-repo-'));
  try {
    const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
    git('init', '-q');
    setup(dir, git);
    return body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runGuardIn(dir) {
  return spawnSync(process.execPath, [GUARD], { cwd: dir, encoding: 'utf8' });
}

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
  const offenders = findTrackedOffenders(trackedEntries());
  assert.deepEqual(
    offenders,
    [],
    `unguarded home paths remain:\n${offenders.map((o) => `  ${o.file}:${o.line} ${o.sample}`).join('\n')}`,
  );
});

test('the LaunchAgent plist templates are SCANNED, not allowlisted, and carry placeholders', () => {
  const plists = [
    'apps/workspace/deploy/ai.hermes.dashboard.plist',
    'apps/workspace/deploy/ai.hermes.workspace.plist',
  ];
  const scanned = trackedScannablePaths();
  for (const p of plists) {
    assert.ok(existsSync(p), `${p} must exist, or this test proves nothing`);
    assert.equal(allowlistReason(p), null, `${p} must not be allowlisted — it holds runtime-executable paths`);
    assert.ok(scanned.includes(p), `${p} must be in the scanned set`);
    assert.match(readFileSync(p, 'utf8'), /__HOME__\//, `${p} must use the __HOME__ install-time placeholder`);
  }
  assert.deepEqual(findOffenders(plists), [], 'plist templates must not embed a home path');
});

// Review round 3 (UNI-2660) planted each of these in a scratch repo and the guard
// printed "clean". Each case now runs the real guard end to end and requires red.
const BYPASS_CASES = [
  ['a non-ASCII filename (git C-quotes it)', (dir, git) => {
    writeFileSync(join(dir, 'é.ts'), `const p = "${leak(['Users', 'someone', 'cfg'])}";\n`);
    git('add', '.');
  }],
  ['a filename holding a double quote', (dir, git) => {
    writeFileSync(join(dir, 'bad"name.ts'), `const p = "${leak(['Users', 'someone', 'cfg'])}";\n`);
    git('add', '.');
  }],
  ['a filename holding a newline', (dir, git) => {
    writeFileSync(join(dir, 'bad\nname.ts'), `const p = "${leak(['home', 'someone', 'cfg'])}";\n`);
    git('add', '.');
  }],
  ['a symlink whose tracked target is a home path', (dir, git) => {
    symlinkSync(leak(['Users', 'someone', 'private', 'config']), join(dir, 'link.ts'));
    git('add', '.');
  }],
  ['a symlink with a binary extension (link.png)', (dir, git) => {
    symlinkSync(leak(['Users', 'someone', 'private', 'config']), join(dir, 'link.png'));
    git('add', '.');
  }],
  ['a deleted-but-still-indexed file', (dir, git) => {
    writeFileSync(join(dir, 'gone.ts'), `const p = "${leak(['Users', 'someone', 'cfg'])}";\n`);
    git('add', '.');
    rmSync(join(dir, 'gone.ts'));
  }],
  ['an unstaged edit to a tracked file', (dir, git) => {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'ok.ts'), 'export {};\n');
    git('add', '.');
    writeFileSync(join(dir, 'src', 'ok.ts'), `const p = "${leak(['Users', 'someone', 'cfg'])}";\n`);
  }],
];

for (const [label, setup] of BYPASS_CASES) {
  test(`END TO END: the guard goes red for ${label}`, () => {
    withScratchRepo(setup, (dir) => {
      const res = runGuardIn(dir);
      assert.equal(res.status, 1, `expected exit 1, got ${res.status}\n${res.stdout}${res.stderr}`);
      assert.match(res.stderr, /ABSOLUTE HOME PATHS FOUND/);
    });
  });
}

test('END TO END: the same scratch repo with a clean file stays green', () => {
  withScratchRepo((dir, git) => {
    writeFileSync(join(dir, 'é.ts'), 'const p = "$HOME/cfg";\n');
    symlinkSync('relative/target', join(dir, 'link.ts'));
    git('add', '.');
  }, (dir) => {
    const res = runGuardIn(dir);
    assert.equal(res.status, 0, `${res.stdout}${res.stderr}`);
    assert.match(res.stdout, /clean \(2 tracked files/);
  });
});

// UNI-2660 replaced swarm-env-check.sh's founder-machine path with the checkout's
// own root. That must not turn it into "any Git project with a name passes".
test('swarm-env-check refuses an unrelated repository', () => {
  withScratchRepo((dir) => {
    writeFileSync(join(dir, 'package.json'), '{"name":"unrelated-product"}\n');
  }, (dir) => {
    const res = spawnSync('bash', [SWARM_ENV_CHECK], { cwd: dir, encoding: 'utf8' });
    assert.equal(res.status, 1, `${res.stdout}${res.stderr}`);
    assert.match(res.stdout, /not the canonical repo/);
  });
});

test('swarm-env-check refuses a repo named unite-group with no hermes-workspace', () => {
  withScratchRepo((dir) => {
    writeFileSync(join(dir, 'package.json'), '{"name":"unite-group"}\n');
  }, (dir) => {
    const res = spawnSync('bash', [SWARM_ENV_CHECK], { cwd: dir, encoding: 'utf8' });
    assert.equal(res.status, 1, `${res.stdout}${res.stderr}`);
    assert.match(res.stdout, /unexpected workspace package name/);
  });
});

test('swarm-env-check accepts this checkout', () => {
  const res = spawnSync('bash', [SWARM_ENV_CHECK], { encoding: 'utf8' });
  assert.equal(res.status, 0, `${res.stdout}${res.stderr}`);
  assert.match(res.stdout, /package=hermes-workspace/);
});
