import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  WEB_BUILD_PLACEHOLDERS,
  buildCorepackInvocation,
  buildVerificationEnvironment,
  findBuildEnvironmentFiles,
} from '../verify-web-ci-build.mjs';

test('builds with fixed non-secret structural placeholders', () => {
  const environment = buildVerificationEnvironment({
    PATH: '/usr/bin:/bin',
    HOME: '/tmp/home',
    LANG: 'en_AU.UTF-8',
  });

  assert.equal(environment.PATH, '/usr/bin:/bin');
  assert.equal(environment.HOME, '/tmp/home');
  assert.equal(environment.CI, '1');
  assert.equal(environment.NODE_ENV, 'production');
  assert.equal(environment.NEXT_TELEMETRY_DISABLED, '1');
  assert.equal(environment.NEXT_PUBLIC_APP_URL, 'https://verification.invalid');
  for (const [key, value] of Object.entries(WEB_BUILD_PLACEHOLDERS)) {
    assert.equal(environment[key], value);
  }
});

test('does not forward unrelated ambient service or provider credentials', () => {
  const environment = buildVerificationEnvironment({
    PATH: '/usr/bin:/bin',
    HOME: '/tmp/home',
    STRIPE_SECRET_KEY: 'billing-secret',
    OPENAI_API_KEY: 'provider-secret',
    GH_RUNNER_PRIVATE_KEY: 'github-secret',
    EXISTING_UNRELATED_SECRET: 'other-secret',
    ANTHROPIC_API_KEY: 'real-provider-secret',
  });

  assert.equal(environment.ANTHROPIC_API_KEY, WEB_BUILD_PLACEHOLDERS.ANTHROPIC_API_KEY);
  assert.equal(environment.STRIPE_SECRET_KEY, undefined);
  assert.equal(environment.OPENAI_API_KEY, undefined);
  assert.equal(environment.GH_RUNNER_PRIVATE_KEY, undefined);
  assert.equal(environment.EXISTING_UNRELATED_SECRET, undefined);
});

test('fails its env-file preflight on Next production env inputs but ignores templates', () => {
  const root = mkdtempSync(join(tmpdir(), 'nexus-web-build-env-'));
  try {
    writeFileSync(join(root, '.env.example'), 'SAFE_TEMPLATE=1\n');
    writeFileSync(join(root, '.env.local.example'), 'SAFE_TEMPLATE=1\n');
    assert.deepEqual(findBuildEnvironmentFiles(root), []);

    writeFileSync(join(root, '.env.local'), 'REAL_SECRET=do-not-read\n');
    writeFileSync(join(root, '.env.production'), 'ANOTHER_SECRET=do-not-read\n');
    assert.deepEqual(findBuildEnvironmentFiles(root), ['.env.local', '.env.production']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('constructs fixed POSIX and Windows Corepack invocations without user input', () => {
  assert.deepEqual(buildCorepackInvocation('linux', {}), {
    file: 'corepack',
    args: ['pnpm@9.15.0', 'run', 'build'],
  });
  assert.deepEqual(buildCorepackInvocation('win32', { ComSpec: 'C:\\Windows\\System32\\cmd.exe' }), {
    file: 'C:\\Windows\\System32\\cmd.exe',
    args: ['/d', '/s', '/c', 'corepack.cmd pnpm@9.15.0 run build'],
  });
});
