#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = join(repositoryRoot, 'apps', 'web');

const SAFE_PASSTHROUGH = Object.freeze([
  'PATH',
  'Path',
  'HOME',
  'TMPDIR',
  'TEMP',
  'TMP',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TZ',
  'TERM',
  'NO_COLOR',
  'FORCE_COLOR',
  'COREPACK_HOME',
  'PNPM_HOME',
  'XDG_CACHE_HOME',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
  'NODE_EXTRA_CA_CERTS',
  'SystemRoot',
  'SYSTEMROOT',
  'ComSpec',
  'COMSPEC',
  'PATHEXT',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
]);

export const WEB_BUILD_PLACEHOLDERS = Object.freeze({
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'ci-placeholder-anon-key',
  NEXT_PUBLIC_APP_URL: 'https://verification.invalid',
  ANTHROPIC_API_KEY: 'ci-placeholder-anthropic-key',
  SUPABASE_SERVICE_ROLE_KEY: 'ci-placeholder-service-role-key',
  VAULT_ENCRYPTION_KEY: '12345678901234567890123456789012',
  CRON_SECRET: 'ci-placeholder-cron-secret',
  FOUNDER_USER_ID: '00000000-0000-0000-0000-000000000000',
});

/** Build-only environment: deterministic structural values, never live secrets. */
export function buildVerificationEnvironment(parent = process.env) {
  const environment = {};
  for (const key of SAFE_PASSTHROUGH) {
    if (typeof parent[key] === 'string' && parent[key] !== '') environment[key] = parent[key];
  }

  return {
    ...environment,
    ...WEB_BUILD_PLACEHOLDERS,
    CI: '1',
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
  };
}

/** Next loads these files after process.env; verification refuses that bypass. */
export function findBuildEnvironmentFiles(root = webRoot) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^\.env(?:\..+)?$/.test(name) && !name.endsWith('.example'))
    .sort((left, right) => left.localeCompare(right));
}

export function buildCorepackInvocation(platform = process.platform, parent = process.env) {
  if (platform === 'win32') {
    const commandInterpreter = parent.ComSpec
      ?? parent.COMSPEC
      ?? (parent.SystemRoot ? `${parent.SystemRoot}\\System32\\cmd.exe` : 'cmd.exe');
    return {
      file: commandInterpreter,
      args: ['/d', '/s', '/c', 'corepack.cmd pnpm@9.15.0 run build'],
    };
  }
  return {
    file: 'corepack',
    args: ['pnpm@9.15.0', 'run', 'build'],
  };
}

export function main(parent = process.env) {
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);
  if (nodeMajor !== 24) {
    console.error(`Web verification requires Node 24; received ${process.version}.`);
    return 1;
  }

  const envFiles = findBuildEnvironmentFiles();
  if (envFiles.length > 0) {
    console.error(`Web verification refused local Next.js env inputs: ${envFiles.join(', ')}`);
    return 1;
  }

  const invocation = buildCorepackInvocation(process.platform, parent);
  const result = spawnSync(invocation.file, invocation.args, {
    cwd: webRoot,
    env: buildVerificationEnvironment(parent),
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.error(result.error instanceof Error ? result.error.message : String(result.error));
    return 1;
  }
  return result.status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
