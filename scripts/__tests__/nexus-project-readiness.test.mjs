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
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
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
      '      - run: npm ci',
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

function workflowJobBlock(workflow, jobId) {
  const lines = workflow.split('\n');
  const start = lines.findIndex((line) => line === `  ${jobId}:`);
  assert.notEqual(start, -1, `expected workflow job ${jobId}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
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

test('treats an unpinned Dockerfile frontend as a floating container image', () => {
  const root = makeRoot();
  write(root, 'Dockerfile', [
    '# syntax=docker/dockerfile:1',
    'FROM node:24-slim@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '',
  ].join('\n'));
  execFileSync('git', ['add', 'Dockerfile'], { cwd: root });

  const result = finding(scanProject(root), 'containers.floating-images');

  assert.equal(result.status, 'fail');
  assert.deepEqual(result.evidence[0], {
    path: 'Dockerfile',
    detail: 'Container image is not digest-pinned: docker/dockerfile:1',
    line: 1,
  });
});

test('includes explicit setup-node matrix versions in the Node runtime finding', () => {
  const root = makeRoot();
  write(root, '.github/workflows/ci.yml', [
    'env:',
    '  NODE_VERSION: "24"',
    'jobs:',
    '  autopilot:',
    '    strategy:',
    '      matrix:',
    "        node-version: ['22.x', '24.14.1']",
    '    defaults:',
    '      run:',
    '        working-directory: apps/autopilot-runner',
    '    steps:',
    '      - uses: actions/setup-node@v6',
    '        with:',
    '          node-version: ${{ matrix.node-version }}',
    '      - run: npm ci',
    '      - run: npm run test',
    '      - run: npm run type-check',
    '      - run: npm run build',
    '',
  ].join('\n'));
  execFileSync('git', ['add', '.github/workflows/ci.yml'], { cwd: root });

  const result = finding(scanProject(root), 'toolchain.package-lock-node-matrix');

  assert.equal(result.status, 'fail');
  assert.ok(result.evidence.some((item) => item.detail.includes('Observed exact Node major 22')));
  assert.ok(result.evidence.some((item) => item.detail.includes('Observed exact Node major 24')));
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

test('keeps every legacy Linear executor entrypoint permanently retired', () => {
  const rootManifest = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8'));
  const empireManifest = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'apps/empire/package.json'), 'utf8'));
  for (const manifest of [rootManifest, empireManifest]) {
    assert.deepEqual(
      Object.keys(manifest.scripts ?? {}).filter((name) => name.startsWith('mission-control:linear-')),
      [],
    );
  }

  const entrypoint = join(REPOSITORY_ROOT, 'apps/empire/scripts/mission-control-linear-loop.mjs');
  const source = readFileSync(entrypoint, 'utf8');
  assert.doesNotMatch(source, /\bimport\b|process\.env|process\.loadEnvFile|\bfetch\s*\(|\bspawn|git\s+(?:add|commit|push)/i);

  const result = spawnSync(process.execPath, [entrypoint, '--preflight'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      LINEAR_API_KEY: 'sentinel-linear-secret',
      MISSION_CONTROL_RUNNER_CMD: 'sentinel-runner-command',
      MISSION_CONTROL_PUSH: '1',
    },
  });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '[mission-control-loop] permanently retired; CRM OWNEST is authoritative.\n');
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /sentinel/);

  for (const relativePath of [
    'apps/empire/scripts/start-mission-control-loop.sh',
    'apps/empire/scripts/start-mission-control-handoff-loop.sh',
  ]) {
    const launcher = readFileSync(join(REPOSITORY_ROOT, relativePath), 'utf8');
    const executable = launcher
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#'))
      .join('\n');
    assert.doesNotMatch(executable, /\.env|MISSION_CONTROL_|\bnode\b|\bexec\b|\bfetch\b|\bgit\b/i);
  }

  for (const relativePath of [
    'apps/web/src/app/api/cron/linear-claim/route.ts',
    'apps/web/src/app/api/cron/linear-handoff/route.ts',
  ]) {
    const route = readFileSync(join(REPOSITORY_ROOT, relativePath), 'utf8');
    assert.match(route, /status:\s*410/);
    assert.doesNotMatch(route, /integrations\/linear|claimNextEligibleIssue|updateIssueState|addComment|fetchClaimCandidates/);
  }
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

test('recognises the governed web build wrapper as the real CI build gate', () => {
  const root = makeRoot();
  write(root, 'apps/web/package.json', JSON.stringify({
    name: 'web',
    private: true,
    scripts: {
      lint: 'eslint src',
      'type-check': 'tsc --noEmit',
      test: 'vitest run',
      build: 'next build',
    },
  }, null, 2));
  write(root, 'config/nexus-project-readiness.json', JSON.stringify({
    schemaVersion: 1,
    p0FindingIds: ['ci.active-package-coverage'],
    activePackages: [{
      path: 'apps/web',
      manager: 'pnpm',
      lockfile: 'pnpm-lock.yaml',
      requiredScripts: ['lint', 'type-check', 'test', 'build'],
    }],
    sourceOfTruthChecks: [],
  }, null, 2));
  write(root, 'apps/web/pnpm-lock.yaml', "lockfileVersion: '9.0'\n");
  write(root, '.github/workflows/ci.yml', [
    'jobs:',
    '  web:',
    '    defaults:',
    '      run:',
    '        working-directory: apps/web',
    '    steps:',
    '      - run: pnpm install --frozen-lockfile',
    '      - run: pnpm run lint',
    '      - run: pnpm run type-check',
    '      - run: pnpm run test',
    '      - run: node ../../scripts/verify-web-ci-build.mjs',
    '',
  ].join('\n'));
  execFileSync('git', ['add', '.'], { cwd: root });

  const report = scanProject(root);

  assert.equal(finding(report, 'ci.active-package-coverage').status, 'pass');
});

test('rejects disabled, conditional, commented, and continue-on-error CI coverage', () => {
  const root = makeRoot();
  write(root, '.github/workflows/ci.yml', [
    'jobs:',
    '  autopilot:',
    '    if: ${{ false }}',
    '    defaults:',
    '      run:',
    '        working-directory: apps/autopilot-runner',
    '    steps:',
    '      - run: npm ci',
    '      # - run: npm run test',
    '      # - run: npm run type-check',
    '      # - run: npm run build',
    '      - run: npm run test',
    '        continue-on-error: true',
    '      - run: npm run type-check',
    '      - run: npm run build',
    '',
  ].join('\n'));
  execFileSync('git', ['add', '.'], { cwd: root });

  const report = scanProject(root);

  assert.equal(finding(report, 'ci.active-package-coverage').status, 'fail');
});

test('fails closed for semantically invalid but parseable readiness configuration', () => {
  const cases = [
    {
      name: 'arbitrary object',
      config: {},
      expected: /schemaVersion must equal 1/,
    },
    {
      name: 'empty P0 policy',
      config: {
        schemaVersion: 1,
        p0FindingIds: [],
        activePackages: [],
        sourceOfTruthChecks: [],
      },
      expected: /p0FindingIds must not be empty/,
    },
    {
      name: 'unknown P0 finding',
      config: {
        schemaVersion: 1,
        p0FindingIds: ['imaginary.all-green'],
        activePackages: [],
        sourceOfTruthChecks: [],
      },
      expected: /unknown finding id imaginary\.all-green/,
    },
    {
      name: 'mismatched manager lockfile',
      config: {
        schemaVersion: 1,
        p0FindingIds: ['ci.active-package-coverage'],
        activePackages: [{
          path: 'apps/autopilot-runner',
          manager: 'npm',
          lockfile: 'pnpm-lock.yaml',
          requiredScripts: ['test'],
        }],
        sourceOfTruthChecks: [],
      },
      expected: /lockfile must be package-lock\.json for manager npm/,
    },
  ];

  for (const scenario of cases) {
    const root = makeRoot();
    write(root, 'config/nexus-project-readiness.json', JSON.stringify(scenario.config, null, 2));

    const report = scanProject(root);
    const configuration = finding(report, 'scanner.configuration');

    assert.equal(configuration.status, 'unknown', scenario.name);
    assert.match(configuration.evidence[0].detail, scenario.expected, scenario.name);
    assert.deepEqual(evaluateGate(report), {
      blockingFindingIds: ['scanner.configuration'],
      exitCode: 1,
    }, scenario.name);
  }
});

test('requires a frozen install from the configured package manager', () => {
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
    '      - run: npm install',
    '      - run: npm run test',
    '      - run: npm run type-check',
    '      - run: npm run build',
    '',
  ].join('\n'));

  const result = finding(scanProject(root), 'ci.active-package-coverage');

  assert.equal(result.status, 'fail');
  assert.match(result.evidence[0].detail, /npm frozen install/);
});

test('rejects a locked CI lane that uses a different package manager', () => {
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
    '      - run: pnpm install --frozen-lockfile',
    '      - run: pnpm run test',
    '      - run: pnpm run type-check',
    '      - run: pnpm run build',
    '',
  ].join('\n'));

  const result = finding(scanProject(root), 'ci.active-package-coverage');

  assert.equal(result.status, 'fail');
  assert.match(result.evidence[0].detail, /npm frozen install/);
  assert.match(result.evidence[0].detail, /test, type-check, build/);
});

test('rejects verification commands that are not bound to the configured package cwd', () => {
  const root = makeRoot();
  write(root, '.github/workflows/ci.yml', [
    'env:',
    '  NODE_VERSION: "22"',
    'jobs:',
    '  autopilot:',
    '    steps:',
    '      - run: npm --prefix apps/autopilot-runner ci',
    '      - run: npm --prefix apps/autopilot-runner run test',
    '      - run: npm --prefix apps/autopilot-runner run type-check',
    '      - run: npm --prefix apps/autopilot-runner run build',
    '',
  ].join('\n'));

  const result = finding(scanProject(root), 'ci.active-package-coverage');

  assert.equal(result.status, 'fail');
  assert.match(result.evidence[0].detail, /defaults\.run\.working-directory/);
});

test('repository P0 CI policy explicitly covers all production verification lanes', () => {
  const config = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'config/nexus-project-readiness.json'), 'utf8'));
  const packages = new Map(config.activePackages.map((entry) => [entry.path, entry]));

  assert.ok(packages.get('apps/workspace').requiredScripts.includes('type-check'));
  assert.ok(packages.get('apps/autopilot-runner').requiredScripts.includes('verify:container'));
  assert.ok(packages.get('apps/spec-board').requiredScripts.includes('type-check'));
  assert.equal(finding(scanProject(REPOSITORY_ROOT), 'ci.active-package-coverage').status, 'pass');
});

test('repository containers and active packages use the reviewed Node 24 runtime matrix', () => {
  const report = scanProject(REPOSITORY_ROOT);
  for (const id of [
    'containers.floating-images',
    'containers.missing-local-inputs',
    'toolchain.package-lock-node-matrix',
  ]) {
    assert.equal(finding(report, id).status, 'pass', `${id} should pass`);
  }

  const config = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'config/nexus-project-readiness.json'), 'utf8'));
  for (const activePackage of config.activePackages) {
    const manifest = JSON.parse(readFileSync(join(REPOSITORY_ROOT, activePackage.path, 'package.json'), 'utf8'));
    assert.equal(
      manifest.engines?.node,
      '>=24.14.1 <25',
      `${activePackage.path} must use the reviewed Node 24 range`,
    );
    assert.equal(
      manifest.devDependencies?.['@types/node'],
      '^24.0.0',
      `${activePackage.path} must compile against Node 24 types`,
    );
  }
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

test('keeps root package verification non-mutating and bound to the CI toolchain', () => {
  const rootPackage = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8'));
  const workspacePackage = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'apps/workspace/package.json'), 'utf8'));
  const workflow = readFileSync(join(REPOSITORY_ROOT, '.github/workflows/ci.yml'), 'utf8');
  const webJob = workflowJobBlock(workflow, 'web');
  const workspaceJob = workflowJobBlock(workflow, 'workspace');
  const workspaceCommand = rootPackage.scripts?.['verify:workspace'];
  const webCommand = rootPackage.scripts?.['verify:web'];

  assert.equal(rootPackage.packageManager, 'pnpm@9.15.0');
  assert.equal(workspacePackage.packageManager, 'pnpm@9.15.0');
  assert.match(rootPackage.engines?.node ?? '', /24\.14\.1/);
  assert.match(workspacePackage.engines?.node ?? '', /24\.14\.1/);
  assert.match(workflow, /NODE_VERSION:\s*["']24["']/);
  assert.match(webJob, /working-directory:\s*apps\/web/);
  assert.match(webJob, /version:\s*9\.15\.0/);
  assert.match(workspaceJob, /working-directory:\s*apps\/workspace/);
  assert.match(workspaceJob, /version:\s*9\.15\.0/);

  assert.equal(typeof workspaceCommand, 'string');
  assert.match(workspaceCommand, /corepack pnpm@9\.15\.0 install --frozen-lockfile/);
  assert.match(workspaceCommand, /corepack pnpm@9\.15\.0 exec tsc --noEmit/);
  assert.match(workspaceCommand, /corepack pnpm@9\.15\.0 run test/);
  assert.match(workspaceCommand, /corepack pnpm@9\.15\.0 run build/);
  assert.doesNotMatch(workspaceCommand, /(?:pnpm run check|--write\b|--fix\b)/);

  assert.equal(typeof webCommand, 'string');
  assert.match(webCommand, /corepack pnpm@9\.15\.0 install --frozen-lockfile/);
  assert.match(webCommand, /node \.\.\/\.\.\/scripts\/verify-web-ci-build\.mjs/);
  assert.match(webJob, /node \.\.\/\.\.\/scripts\/verify-web-ci-build\.mjs/);
  assert.match(rootPackage.scripts?.verify ?? '', /verify:workspace/);
});
