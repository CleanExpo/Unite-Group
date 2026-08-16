import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkEvidenceCompleteness,
  loadManifest,
  main,
  parseVitestEvidence,
  resolveCheck,
} from '../ci-evidence-manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, '..', '..');
const fixtures = join(here, 'fixtures');

/**
 * Real CI output. Monorepo CI run 31928303697, job 95119197937, on main at
 * d1d57b8e5745e90259f2799cb9086e4a62689318. The job concluded `success`.
 */
const REAL_SKIPPED_LOG = join(fixtures, 'spine-required-job-95119197937.log');
const REAL_SHA = 'd1d57b8e5745e90259f2799cb9086e4a62689318';

/** Synthetic. Positive control only — see fixtures/README.md. */
const SYNTHETIC_EXECUTED_LOG = join(fixtures, 'spine-all-executed.synthetic.log');

const SPINE_CHECK_ID = 'spine-required-tests';

function readFixture(path) {
  return readFileSync(path, 'utf8');
}

test('parses the real required-job log into per-suite execution counts', () => {
  const observed = parseVitestEvidence(readFixture(REAL_SKIPPED_LOG));

  assert.equal(observed.suites.length, 6);
  assert.deepEqual(observed.totals, { executed: 3, skipped: 19, declared: 22 });

  const bySuite = new Map(observed.suites.map((suite) => [suite.suite, suite]));

  assert.deepEqual(bySuite.get('tests/integration/rls.test.ts'), {
    suite: 'tests/integration/rls.test.ts',
    declared: 4,
    executed: 0,
    skipped: 4,
    status: 'SKIPPED',
  });
  assert.deepEqual(bySuite.get('tests/unit.test.ts'), {
    suite: 'tests/unit.test.ts',
    declared: 3,
    executed: 3,
    skipped: 0,
    status: 'EXECUTED',
  });
});

test('a partially-skipped suite counts as EXECUTED but keeps its skipped count visible', () => {
  const observed = parseVitestEvidence(
    ' ✓ tests/integration/partial.test.ts (5 tests | 2 skipped) 40ms\n',
  );

  assert.deepEqual(observed.suites, [{
    suite: 'tests/integration/partial.test.ts',
    declared: 5,
    executed: 3,
    skipped: 2,
    status: 'EXECUTED',
  }]);
});

test('THE FINDING: the real required job is GREEN while required tenant-isolation evidence never executed', () => {
  const manifest = loadManifest(repositoryRoot);
  const check = resolveCheck(manifest, SPINE_CHECK_ID);
  const observed = parseVitestEvidence(readFixture(REAL_SKIPPED_LOG));

  const result = checkEvidenceCompleteness({ check, observed, sha: REAL_SHA });

  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.sha, REAL_SHA);
  assert.equal(result.requiredCheck, 'packages/spine — type-check and bounded tests');

  const violatingSuites = result.violations.map((violation) => violation.suite).sort();
  assert.deepEqual(violatingSuites, [
    'tests/integration/c3_completeness.test.ts',
    'tests/integration/idempotency.test.ts',
    'tests/integration/match_isolation.test.ts',
    'tests/integration/outbox_race.test.ts',
    'tests/integration/rls.test.ts',
  ]);

  for (const violation of result.violations) {
    assert.equal(violation.reason, 'REQUIRED_EVIDENCE_NOT_EXECUTED');
    assert.equal(violation.status, 'SKIPPED');
    assert.equal(violation.class, 'REQUIRED_EVIDENCE');
  }

  const isolation = result.violations.find(
    (violation) => violation.suite === 'tests/integration/rls.test.ts',
  );
  assert.equal(isolation.category, 'tenant-isolation');
});

test('POSITIVE CONTROL: the checker returns PASS when every declared suite executed', () => {
  const manifest = loadManifest(repositoryRoot);
  const check = resolveCheck(manifest, SPINE_CHECK_ID);
  const observed = parseVitestEvidence(readFixture(SYNTHETIC_EXECUTED_LOG));

  const result = checkEvidenceCompleteness({ check, observed, sha: 'synthetic' });

  assert.equal(result.verdict, 'PASS');
  assert.deepEqual(result.violations, []);
  assert.equal(result.evidence.length, 6);
  for (const record of result.evidence) {
    assert.equal(record.status, 'EXECUTED');
  }
});

test('a declared suite missing from the report is UNAVAILABLE, not silently absent', () => {
  const check = {
    id: 'synthetic',
    requiredCheck: 'synthetic check',
    suites: [
      { suite: 'tests/integration/rls.test.ts', class: 'REQUIRED_EVIDENCE', category: 'tenant-isolation' },
      { suite: 'tests/integration/vanished.test.ts', class: 'REQUIRED_EVIDENCE', category: 'tenant-isolation' },
    ],
  };
  const observed = parseVitestEvidence(readFixture(SYNTHETIC_EXECUTED_LOG));

  const result = checkEvidenceCompleteness({ check, observed, sha: 'synthetic' });

  assert.equal(result.verdict, 'FAIL');

  const unavailable = result.violations.filter(
    (violation) => violation.reason === 'REQUIRED_EVIDENCE_UNAVAILABLE',
  );
  assert.equal(unavailable.length, 1);
  assert.equal(unavailable[0].suite, 'tests/integration/vanished.test.ts');
  assert.equal(unavailable[0].status, 'UNAVAILABLE');
  assert.equal(unavailable[0].executed, 0);
});

test('an executed suite absent from the manifest fails as UNDECLARED — the manifest may not go stale', () => {
  const check = {
    id: 'synthetic',
    requiredCheck: 'synthetic check',
    suites: [
      { suite: 'tests/unit.test.ts', class: 'REQUIRED_EVIDENCE', category: 'unit' },
    ],
  };
  const observed = parseVitestEvidence(readFixture(SYNTHETIC_EXECUTED_LOG));

  const result = checkEvidenceCompleteness({ check, observed, sha: 'synthetic' });

  assert.equal(result.verdict, 'FAIL');
  const undeclared = result.violations.filter(
    (violation) => violation.reason === 'UNDECLARED_SUITE',
  );
  assert.equal(undeclared.length, 5);
  assert.ok(undeclared.some((violation) => violation.suite === 'tests/integration/rls.test.ts'));
});

test('ALLOWED_NON_BLOCKING suites are recorded when they do not execute, but do not fail the gate', () => {
  const check = {
    id: 'synthetic',
    requiredCheck: 'synthetic check',
    suites: [
      { suite: 'tests/integration/rls.test.ts', class: 'ALLOWED_NON_BLOCKING', category: 'tenant-isolation' },
      { suite: 'tests/integration/match_isolation.test.ts', class: 'ALLOWED_NON_BLOCKING', category: 'tenant-isolation' },
      { suite: 'tests/integration/c3_completeness.test.ts', class: 'ALLOWED_NON_BLOCKING', category: 'data-completeness' },
      { suite: 'tests/integration/idempotency.test.ts', class: 'ALLOWED_NON_BLOCKING', category: 'migration-integrity' },
      { suite: 'tests/integration/outbox_race.test.ts', class: 'ALLOWED_NON_BLOCKING', category: 'relay-concurrency' },
      { suite: 'tests/unit.test.ts', class: 'ALLOWED_NON_BLOCKING', category: 'unit' },
    ],
  };
  const observed = parseVitestEvidence(readFixture(REAL_SKIPPED_LOG));

  const result = checkEvidenceCompleteness({ check, observed, sha: REAL_SHA });

  assert.equal(result.verdict, 'PASS');
  assert.deepEqual(result.violations, []);
  const skipped = result.evidence.filter((record) => record.status === 'SKIPPED');
  assert.equal(skipped.length, 5);
});

test('the shipped manifest declares every spine test file that exists on disk', () => {
  const manifest = loadManifest(repositoryRoot);
  const check = resolveCheck(manifest, SPINE_CHECK_ID);
  const spineRoot = join(repositoryRoot, 'packages', 'spine', 'packages', 'spine');

  const onDisk = [
    ...readdirSync(join(spineRoot, 'tests'), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.test.ts'))
      .map((entry) => `tests/${entry.name}`),
    ...readdirSync(join(spineRoot, 'tests', 'integration'), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.test.ts'))
      .map((entry) => `tests/integration/${entry.name}`),
  ].sort();

  const declared = check.suites.map((suite) => suite.suite).sort();
  assert.deepEqual(declared, onDisk);
});

test('every declared REQUIRED_EVIDENCE suite in the shipped manifest carries a category', () => {
  const manifest = loadManifest(repositoryRoot);
  for (const check of manifest.checks) {
    for (const suite of check.suites) {
      assert.ok(['REQUIRED_EVIDENCE', 'ALLOWED_NON_BLOCKING'].includes(suite.class), suite.suite);
      assert.equal(typeof suite.category, 'string');
      assert.notEqual(suite.category, '');
    }
  }
});

test('resolveCheck refuses an unknown check id rather than returning an empty pass', () => {
  const manifest = loadManifest(repositoryRoot);
  assert.throws(() => resolveCheck(manifest, 'no-such-check'), /no-such-check/);
});

test('main exits non-zero on the real skipped run and zero on the executed control', () => {
  const errors = [];
  const outputs = [];
  const io = { log: (line) => outputs.push(line), error: (line) => errors.push(line) };

  const failing = main(
    ['--check', SPINE_CHECK_ID, '--report', REAL_SKIPPED_LOG, '--sha', REAL_SHA, '--gate'],
    { root: repositoryRoot, io },
  );
  assert.equal(failing, 1);
  assert.ok(errors.some((line) => line.includes('tests/integration/rls.test.ts')));

  const passing = main(
    ['--check', SPINE_CHECK_ID, '--report', SYNTHETIC_EXECUTED_LOG, '--sha', 'synthetic', '--gate'],
    { root: repositoryRoot, io },
  );
  assert.equal(passing, 0);
});

test('main without --gate reports the finding but does not fail: the checker ships DISARMED', () => {
  const io = { log: () => {}, error: () => {} };
  const status = main(
    ['--check', SPINE_CHECK_ID, '--report', REAL_SKIPPED_LOG, '--sha', REAL_SHA],
    { root: repositoryRoot, io },
  );
  assert.equal(status, 0);
});

test('--json emits a machine-readable manifest record keyed by SHA', () => {
  const outputs = [];
  const io = { log: (line) => outputs.push(line), error: () => {} };

  main(
    ['--check', SPINE_CHECK_ID, '--report', REAL_SKIPPED_LOG, '--sha', REAL_SHA, '--json'],
    { root: repositoryRoot, io },
  );

  const record = JSON.parse(outputs.join('\n'));
  assert.equal(record.sha, REAL_SHA);
  assert.equal(record.verdict, 'FAIL');
  assert.equal(record.check, SPINE_CHECK_ID);
  assert.equal(record.evidence.length, 6);
  assert.equal(record.violations.length, 5);
});
