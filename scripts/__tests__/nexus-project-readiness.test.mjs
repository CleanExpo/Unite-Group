import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  evaluateGate,
  scanProject,
} from '../nexus-project-readiness.mjs';

const SCRIPT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'nexus-project-readiness.mjs');
const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function write(root, path, content) {
  const destination = join(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function makeRoot({ risky = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'nexus-readiness-'));
  temporaryRoots.push(root);

  write(root, 'package.json', JSON.stringify({
    name: 'fixture',
    private: true,
    engines: { node: '>=22' },
  }, null, 2));
  write(root, 'config/nexus-project-readiness.json', JSON.stringify({
    schemaVersion: 1,
    p0FindingIds: [
      'ci.active-package-coverage',
      'security.tracked-auth-artifacts',
    ],
    activePackages: [
      {
        path: 'apps/autopilot-runner',
        manager: 'npm',
        lockfile: 'package-lock.json',
        requiredScripts: ['test', 'type-check', 'build'],
      },
    ],
    sourceOfTruthChecks: [
      {
        id: 'unite-hub-retirement',
        description: 'Retired products cannot be described as live.',
        assertions: [
          {
            path: 'AGENTS.md',
            forbid: ['Unite-Hub is a SEPARATE LIVE'],
          },
          {
            path: 'SOURCE-OF-TRUTH.md',
            require: ['SUPERSEDED 2026-06-20'],
          },
        ],
      },
    ],
  }, null, 2));
  write(root, 'SOURCE-OF-TRUTH.md', 'SUPERSEDED 2026-06-20\n');
  write(root, 'AGENTS.md', risky
    ? 'Unite-Hub is a SEPARATE LIVE parallel product.\n'
    : 'Unite-Group is the canonical product.\n');
  write(root, 'apps/autopilot-runner/package.json', JSON.stringify({
    name: '@unite/autopilot-runner',
    private: true,
    scripts: {
      test: 'node --test',
      'type-check': 'tsc --noEmit',
      build: 'tsc',
    },
  }, null, 2));
  write(root, 'apps/autopilot-runner/package-lock.json', JSON.stringify({
    name: '@unite/autopilot-runner',
    lockfileVersion: 3,
    packages: {},
  }, null, 2));

  const ciBody = risky
    ? 'env:\n  NODE_VERSION: "24"\njobs:\n  web:\n    steps: []\n'
    : [
      'env:',
      '  NODE_VERSION: "22"',
      'jobs:',
      '  autopilot:',
      '    defaults:',
      '      run:',
      '        working-directory: apps/autopilot-runner',
      '    steps:',
      '      - run: npm run test',
      '      - run: npm run type-check',
      '      - run: npm run build',
      '',
    ].join('\n');
  write(root, '.github/workflows/ci.yml', ciBody);

  if (risky) {
    write(root, 'apps/legacy-ui/.github/workflows/ci.yml', 'jobs: {}\n');
    write(root, '.claude/settings.local.json', '{"permissions": {"allow": ["raw sql"]}}\n');
    write(root, 'docker-compose.yml', [
      'services:',
      '  app:',
      '    build:',
      '      context: .',
      '      dockerfile: Dockerfile',
      '    image: vendor/app:latest',
      '    volumes:',
      '      - ./missing-init.sql:/docker-entrypoint-initdb.d/init.sql',
      '',
    ].join('\n'));
    write(root, 'Dockerfile', 'FROM node:20-slim\nCOPY missing-package.json ./\n');
    write(root, 'apps/workspace/src/swarm-environment.ts', "readOnlyRoots: [join(homedir(), '.ssh')]\n");
    write(root, 'apps/autopilot-runner/scripts/heartbeat.sh', 'export SUPABASE_URL="${SUPABASE_URL:-https://prod-ref.supabase.co}"\n');
  } else {
    write(root, 'docker-compose.yml', 'services:\n  app:\n    image: vendor/app@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n');
  }

  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  if (risky) execFileSync('git', ['add', '-f', '.claude/settings.local.json'], { cwd: root });
  return root;
}

function finding(report, id) {
  const match = report.findings.find((entry) => entry.id === id);
  assert.ok(match, `expected finding ${id}`);
  return match;
}

function snapshotFiles(root) {
  const output = {};
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === '.git') continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else {
        output[relative(root, absolute)] = readFileSync(absolute, 'utf8');
      }
    }
  };
  visit(root);
  return output;
}

test('reports every required readiness risk with actionable evidence', () => {
  const root = makeRoot({ risky: true });

  const report = scanProject(root);

  for (const id of [
    'ci.nested-workflows',
    'ci.active-package-coverage',
    'security.tracked-auth-artifacts',
    'containers.missing-local-inputs',
    'containers.floating-images',
    'security.ssh-home-exposure',
    'runtime.implicit-production-url-defaults',
    'toolchain.package-lock-node-matrix',
    'source-of-truth.unite-hub-retirement',
  ]) {
    const result = finding(report, id);
    assert.equal(result.status, 'fail', `${id} should fail`);
    assert.ok(result.evidence.length > 0, `${id} should include evidence`);
    assert.ok(result.remediation.length > 0, `${id} should include remediation`);
    assert.ok(result.verification.length > 0, `${id} should include verification`);
    assert.ok(result.rollback.length > 0, `${id} should include rollback`);
  }

  const gate = evaluateGate(report);
  assert.deepEqual(gate.blockingFindingIds, [
    'ci.active-package-coverage',
    'security.tracked-auth-artifacts',
  ]);
  assert.equal(gate.exitCode, 1);
});

test('is deterministic, read-only, and ignores node_modules, git, and archive inputs', () => {
  const root = makeRoot();
  write(root, 'node_modules/pkg/.claude/settings.local.json', '{}\n');
  write(root, 'archive/old/.claude/settings.local.json', '{}\n');
  write(root, 'apps/workspace/src/swarm-environment.test.ts', "expect(join(homedir(), '.ssh')).toBeDefined()\n");
  execFileSync('git', ['add', '-f', 'archive/old/.claude/settings.local.json'], { cwd: root });
  const before = snapshotFiles(root);

  const first = scanProject(root);
  const second = scanProject(root);

  assert.deepEqual(second, first);
  assert.deepEqual(snapshotFiles(root), before);
  assert.equal(finding(first, 'ci.active-package-coverage').status, 'pass');
  assert.equal(finding(first, 'security.tracked-auth-artifacts').status, 'pass');
  assert.equal(finding(first, 'security.ssh-home-exposure').status, 'pass');
  assert.deepEqual(evaluateGate(first), { blockingFindingIds: [], exitCode: 0 });
});

test('treats explicit SSH denylist references as a passing security control', () => {
  const root = makeRoot();
  write(root, 'apps/workspace/src/swarm-environment.ts', [
    "export const SWARM_SENSITIVE_HOME_ROOTS = [",
    "  join(homedir(), '.ssh'),",
    ']',
    'export const SWARM_FORBIDDEN_PATHS = [',
    '  ...SWARM_SENSITIVE_HOME_ROOTS,',
    ']',
    'export function getEnvironment() {',
    '  return {',
    '    writableRoots: [canonicalRepo],',
    '    readOnlyRoots: [memoryRoot],',
    '    forbiddenRoots: SWARM_FORBIDDEN_PATHS,',
    '  }',
    '}',
    '',
  ].join('\n'));

  const report = scanProject(root);

  assert.equal(finding(report, 'security.ssh-home-exposure').status, 'pass');
});

test('still rejects SSH paths wired into agent-visible roots and mounts', () => {
  const root = makeRoot();
  write(root, 'apps/workspace/src/swarm-selection.ts', [
    "const SSH_HOME = join(homedir(), '.ssh')",
    'export const selectionRoots = [SSH_HOME]',
    '',
  ].join('\n'));
  write(root, 'docker-compose.yml', [
    'services:',
    '  agent:',
    '    image: vendor/agent@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '    volumes:',
    '      - ${HOME}/.ssh:/agent/.ssh:ro',
    '',
  ].join('\n'));

  const report = scanProject(root);
  const result = finding(report, 'security.ssh-home-exposure');

  assert.equal(result.status, 'fail');
  assert.deepEqual(result.evidence.map((item) => item.path), [
    'apps/workspace/src/swarm-selection.ts',
    'docker-compose.yml',
  ]);
});

test('requires configured validation scripts in the same root CI job', () => {
  const root = makeRoot();
  write(root, '.github/workflows/ci.yml', [
    'env:',
    '  NODE_VERSION: "22"',
    'jobs:',
    '  autopilot:',
    '    defaults:',
    '      run:',
    '        working-directory: apps/autopilot-runner',
    '    steps:',
    '      - run: npm run build',
    '',
  ].join('\n'));

  const report = scanProject(root);

  assert.equal(finding(report, 'ci.active-package-coverage').status, 'fail');
});

test('keeps configuration failure visible and fails the gate closed', () => {
  const root = makeRoot();
  write(root, 'config/nexus-project-readiness.json', '{not-json\n');

  const report = scanProject(root);

  assert.equal(finding(report, 'scanner.configuration').status, 'unknown');
  assert.deepEqual(evaluateGate(report), {
    blockingFindingIds: ['scanner.configuration'],
    exitCode: 1,
  });
});

test('does not resolve Compose build inputs outside the requested project root', () => {
  const root = makeRoot();
  write(root, 'docker-compose.yml', [
    'services:',
    '  app:',
    '    build:',
    '      context: ..',
    '      dockerfile: Dockerfile',
    '',
  ].join('\n'));

  const report = scanProject(root);

  assert.equal(finding(report, 'containers.missing-local-inputs').status, 'unknown');
});

test('supports --root and --json without writing the target', () => {
  const root = makeRoot();
  const before = snapshotFiles(root);

  const run = spawnSync(process.execPath, [SCRIPT_PATH, '--root', root, '--json', '--gate'], {
    encoding: 'utf8',
  });

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const report = JSON.parse(run.stdout);
  assert.equal(report.root, root);
  assert.equal(report.summary.blocking, 0);
  assert.deepEqual(snapshotFiles(root), before);
});
