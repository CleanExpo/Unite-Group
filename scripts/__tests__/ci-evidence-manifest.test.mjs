import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkEvidenceCompleteness,
  loadManifest,
  main,
  parseVitestJsonReport,
  resolveCheck,
  resolveProvenance,
  validateManifest,
} from '../ci-evidence-manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, '..', '..');
const fixtures = join(here, 'fixtures');

/** Real vitest output; counts match live CI job 95119197937. See fixtures/README.md. */
const SKIPPED_EVIDENCE = join(fixtures, 'spine-skipped.vitest.json');
/** Synthetic positive control. */
const EXECUTED_EVIDENCE = join(fixtures, 'spine-all-executed.synthetic.vitest.json');

const REAL_SHA = 'd1d57b8e5745e90259f2799cb9086e4a62689318';
const OTHER_SHA = '0123456789abcdef0123456789abcdef01234567';
const SPINE_CHECK_ID = 'spine-required-tests';
const REPO = 'CleanExpo/Unite-Group';
const JOB_ID = '95119197937';
const REQUIRED_JOB_NAME = 'packages/spine — type-check and bounded tests';

const NULL_IO = { log: () => {}, error: () => {} };

function shippedCheck() {
  return resolveCheck(loadManifest(repositoryRoot), SPINE_CHECK_ID);
}

/** Stands in for `gh api`; the real fetcher is never called in tests. */
function stubFetcher(overrides = {}) {
  return () => ({
    head_sha: REAL_SHA,
    name: REQUIRED_JOB_NAME,
    status: 'completed',
    conclusion: 'success',
    run_id: 31928303697,
    run_attempt: 1,
    ...overrides,
  });
}

function observed(path) {
  return parseVitestJsonReport(readFileSync(path, 'utf8'), {
    workingDirectory: shippedCheck().workingDirectory,
  });
}

// ---------------------------------------------------------------------------
// Execution evidence
// ---------------------------------------------------------------------------

test('THE FINDING: a green job with zero tenant-isolation execution is FAIL', () => {
  const result = checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: observed(SKIPPED_EVIDENCE),
    provenance: { sha: REAL_SHA, jobId: JOB_ID, runId: 1, runAttempt: 1 },
  });

  assert.equal(result.verdict, 'FAIL');
  assert.deepEqual(result.totals, { executed: 3, skipped: 19, declared: 22 });

  const notExecuted = result.violations
    .filter((v) => v.reason === 'REQUIRED_EVIDENCE_NOT_EXECUTED')
    .map((v) => v.suite).sort();
  assert.deepEqual(notExecuted, [
    'tests/integration/c3_completeness.test.ts',
    'tests/integration/idempotency.test.ts',
    'tests/integration/match_isolation.test.ts',
    'tests/integration/outbox_race.test.ts',
    'tests/integration/rls.test.ts',
  ]);

  // The coverage floor fires independently of the per-suite records.
  const unproven = result.violations
    .filter((v) => v.reason === 'CAPABILITY_UNPROVEN')
    .map((v) => v.capability).sort();
  assert.deepEqual(unproven, [
    'data-completeness', 'migration-integrity', 'relay-concurrency', 'tenant-isolation',
  ]);
});

test('POSITIVE CONTROL: PASS is reachable when every declared suite executed', () => {
  const result = checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: observed(EXECUTED_EVIDENCE),
    provenance: { sha: REAL_SHA, jobId: JOB_ID, runId: 1, runAttempt: 1 },
  });

  assert.equal(result.verdict, 'PASS');
  assert.deepEqual(result.violations, []);
  assert.equal(result.totals.executed, 22);
});

test("a file whose own status is 'passed' while every test skipped is still SKIPPED", () => {
  // This is the UNI-2567 defect in miniature, and it is real: in the captured
  // report rls.test.ts carries status "passed" with 4 skipped assertions.
  const report = JSON.parse(readFileSync(SKIPPED_EVIDENCE, 'utf8'));
  const rls = report.testResults.find((f) => f.name.endsWith('rls.test.ts'));
  assert.equal(rls.status, 'passed');
  assert.equal(rls.assertionResults.filter((a) => a.status === 'skipped').length, 4);

  const record = observed(SKIPPED_EVIDENCE).suites
    .find((s) => s.suite === 'tests/integration/rls.test.ts');
  assert.equal(record.status, 'SKIPPED');
  assert.equal(record.executed, 0);
  assert.equal(record.skipped, 4);
});

test("executed is counted positively, so an unknown assertion status is not evidence", () => {
  const report = {
    numTotalTests: 2,
    testResults: [{
      name: '/w/pkg/tests/x.test.ts',
      status: 'passed',
      assertionResults: [{ status: 'quarantined' }, { status: 'disabled' }],
    }],
  };
  const parsed = parseVitestJsonReport(JSON.stringify(report), { workingDirectory: 'pkg' });

  assert.equal(parsed.suites[0].executed, 0);
  assert.equal(parsed.suites[0].status, 'SKIPPED');
});

test('a failing test counts as executed; it is evidence of a defect, not absence of a run', () => {
  const report = {
    numTotalTests: 2,
    testResults: [{
      name: '/w/pkg/tests/x.test.ts',
      status: 'failed',
      assertionResults: [{ status: 'failed' }, { status: 'passed' }],
    }],
  };
  const parsed = parseVitestJsonReport(JSON.stringify(report), { workingDirectory: 'pkg' });

  assert.equal(parsed.suites[0].executed, 2);
  assert.equal(parsed.suites[0].failed, 1);
  assert.equal(parsed.suites[0].status, 'EXECUTED');
});

test('bracketed and nested paths survive; the whole relative path is kept', () => {
  const report = {
    numTotalTests: 1,
    testResults: [{
      name: '/runner/pkg/src/app/api/[id]/__tests__/route.test.ts',
      status: 'passed',
      assertionResults: [{ status: 'passed' }],
    }],
  };
  const parsed = parseVitestJsonReport(JSON.stringify(report), { workingDirectory: 'pkg' });
  assert.equal(parsed.suites[0].suite, 'src/app/api/[id]/__tests__/route.test.ts');
});

test('numTotalTests disagreeing with the per-file records is SUMMARY_MISMATCH', () => {
  const report = JSON.parse(readFileSync(EXECUTED_EVIDENCE, 'utf8'));
  report.numTotalTests = 40;

  const result = checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: parseVitestJsonReport(JSON.stringify(report), {
      workingDirectory: shippedCheck().workingDirectory,
    }),
    provenance: { sha: REAL_SHA, jobId: JOB_ID },
  });

  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'SUMMARY_MISMATCH'));
});

test('two disagreeing records for one path are AMBIGUOUS, not silently first-wins', () => {
  const report = {
    numTotalTests: 5,
    testResults: [
      { name: '/w/pkg/tests/x.test.ts', status: 'passed', assertionResults: [{ status: 'skipped' }] },
      { name: '/w/pkg/tests/x.test.ts', status: 'passed', assertionResults: [{ status: 'passed' }, { status: 'passed' }] },
    ],
  };
  const parsed = parseVitestJsonReport(JSON.stringify(report), { workingDirectory: 'pkg' });
  assert.equal(parsed.suites.length, 1);
  assert.equal(parsed.suites[0].conflict, true);

  const result = checkEvidenceCompleteness({
    check: { id: 'x', requiredCheck: 'x', requiredCapabilities: ['unit'], suites: [{ suite: 'tests/x.test.ts', class: 'REQUIRED_EVIDENCE', capability: 'unit' }] },
    observed: parsed,
    provenance: { sha: REAL_SHA },
  });
  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'CONFLICTING_SUITE_RECORDS'));
});

test('non-JSON and non-vitest evidence is refused, not graded', () => {
  assert.throws(() => parseVitestJsonReport('not json'), /not valid JSON/);
  assert.throws(() => parseVitestJsonReport('{"foo":1}'), /not a vitest JSON report/);
});

// ---------------------------------------------------------------------------
// Provenance — the property both previous revisions failed on
// ---------------------------------------------------------------------------

test('provenance resolves from API metadata and binds job identity', () => {
  const provenance = resolveProvenance({
    check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA, fetcher: stubFetcher(),
  });
  assert.equal(provenance.sha, REAL_SHA);
  assert.equal(provenance.jobName, REQUIRED_JOB_NAME);
  assert.equal(provenance.runAttempt, 1);
});

test('a job that ran on a different commit is refused', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      fetcher: stubFetcher({ head_sha: OTHER_SHA }),
    }),
    /PROVENANCE_MISMATCH/,
  );
});

test('evidence from a different job does not satisfy this check', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      fetcher: stubFetcher({ name: 'apps/web — Playwright E2E' }),
    }),
    /PROVENANCE_WRONG_JOB/,
  );
});

test('an in-progress job is refused rather than graded on partial output', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      fetcher: stubFetcher({ status: 'in_progress' }),
    }),
    /PROVENANCE_INCOMPLETE/,
  );
});

test('a job with no usable head_sha is refused', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      fetcher: stubFetcher({ head_sha: null }),
    }),
    /PROVENANCE_ABSENT/,
  );
});

test('THE FORGERY, CLOSED: --gate refuses without API-resolved provenance', () => {
  const errors = [];
  const io = { log: () => {}, error: (line) => errors.push(line) };

  // Exactly the attack that defeated the previous revision: hand the gate a
  // local all-green file and assert the real SHA. There is now no argument
  // combination that lets a file speak for a commit.
  const status = main(
    ['--check', SPINE_CHECK_ID, '--evidence', EXECUTED_EVIDENCE, '--sha', REAL_SHA, '--gate'],
    { root: repositoryRoot, io, fetcher: stubFetcher() },
  );

  assert.equal(status, 2);
  assert.ok(errors.some((line) => line.includes('REFUSED')));
  assert.ok(errors.some((line) => line.includes('cannot vouch for its own commit')));
});

test('report-only mode grades execution but marks the SHA UNVERIFIED', () => {
  const outputs = [];
  const status = main(
    ['--check', SPINE_CHECK_ID, '--evidence', SKIPPED_EVIDENCE],
    { root: repositoryRoot, io: { log: (l) => outputs.push(l), error: () => {} }, fetcher: stubFetcher() },
  );
  assert.equal(status, 0);
  assert.ok(outputs.some((line) => line.includes('UNVERIFIED')));
});

test('main: exit 1 on the real skipped evidence under --gate, exit 0 on the control', () => {
  const errors = [];
  const io = { log: () => {}, error: (line) => errors.push(line) };
  const gated = (evidence) => main(
    ['--check', SPINE_CHECK_ID, '--evidence', evidence, '--sha', REAL_SHA,
      '--job', JOB_ID, '--repo', REPO, '--gate'],
    { root: repositoryRoot, io, fetcher: stubFetcher() },
  );

  assert.equal(gated(SKIPPED_EVIDENCE), 1);
  assert.ok(errors.some((line) => line.includes('tests/integration/rls.test.ts')));
  assert.equal(gated(EXECUTED_EVIDENCE), 0);
});

test('--sha must be lowercase 40-hex', () => {
  assert.equal(
    main(['--check', SPINE_CHECK_ID, '--evidence', EXECUTED_EVIDENCE, '--sha', 'NOT-A-SHA',
      '--job', JOB_ID, '--repo', REPO, '--gate'],
    { root: repositoryRoot, io: NULL_IO, fetcher: stubFetcher() }),
    2,
  );
});

test('--json emits a machine-readable record carrying full API provenance', () => {
  const outputs = [];
  main(['--check', SPINE_CHECK_ID, '--evidence', SKIPPED_EVIDENCE, '--sha', REAL_SHA,
    '--job', JOB_ID, '--repo', REPO, '--json'],
  { root: repositoryRoot, io: { log: (l) => outputs.push(l), error: () => {} }, fetcher: stubFetcher() });

  const record = JSON.parse(outputs.join('\n'));
  assert.equal(record.verdict, 'FAIL');
  assert.equal(record.provenance.sha, REAL_SHA);
  assert.equal(record.provenance.jobId, JOB_ID);
  assert.equal(record.provenance.conclusion, 'success');
});

// ---------------------------------------------------------------------------
// The manifest is the gate's own attack surface
// ---------------------------------------------------------------------------

const MINIMAL_SUITE = { suite: 'a.test.ts', class: 'REQUIRED_EVIDENCE', capability: 'unit' };
const MINIMAL_CHECK = {
  id: 'x',
  requiredCheck: 'x',
  workflow: 'w',
  job: 'j',
  workingDirectory: 'd',
  requiredCapabilities: ['unit'],
  suites: [MINIMAL_SUITE],
};

test('the shipped manifest validates', () => {
  assert.ok(loadManifest(repositoryRoot).checks.length > 0);
});

test('a check with no suites is rejected: it would pass vacuously', () => {
  assert.throws(
    () => validateManifest({ checks: [{ ...MINIMAL_CHECK, suites: [] }] }),
    /no suites/,
  );
});

test('duplicate check ids are rejected rather than silently shadowed', () => {
  assert.throws(
    () => validateManifest({ checks: [MINIMAL_CHECK, { ...MINIMAL_CHECK, requiredCheck: 'y' }] }),
    /duplicate check id/,
  );
});

test('a suite declared twice in one check is rejected', () => {
  assert.throws(
    () => validateManifest({ checks: [{ ...MINIMAL_CHECK, suites: [MINIMAL_SUITE, { ...MINIMAL_SUITE, class: 'ALLOWED_NON_BLOCKING' }] }] }),
    /duplicate suite/,
  );
});

test('THE VACUOUS-PASS CLASS, CLOSED: all-non-blocking suites cannot satisfy a capability', () => {
  assert.throws(
    () => validateManifest({
      checks: [{ ...MINIMAL_CHECK, suites: [{ ...MINIMAL_SUITE, class: 'ALLOWED_NON_BLOCKING' }] }],
    }),
    /no REQUIRED_EVIDENCE suite carries it/,
  );
});

test('a check declaring no requiredCapabilities is rejected', () => {
  assert.throws(
    () => validateManifest({ checks: [{ ...MINIMAL_CHECK, requiredCapabilities: [] }] }),
    /no requiredCapabilities/,
  );
});

test('THE RENAME, CLOSED: deleting the only suite proving a capability fails validation', () => {
  const manifest = loadManifest(repositoryRoot);
  const check = structuredClone(resolveCheck(manifest, SPINE_CHECK_ID));

  // Remove both tenant-isolation suites, as a rename-and-forget would.
  check.suites = check.suites.filter((s) => s.capability !== 'tenant-isolation');
  assert.throws(
    () => validateManifest({ checks: [check] }),
    /requires capability "tenant-isolation"/,
  );
});

test('relabelling a suite to an unprotected capability fails the floor, not a name pattern', () => {
  const check = structuredClone(shippedCheck());
  for (const suite of check.suites) {
    if (suite.capability === 'tenant-isolation') suite.capability = 'misc';
  }
  assert.throws(() => validateManifest({ checks: [check] }), /requires capability "tenant-isolation"/);
});

test('a required capability left unexecuted fails the gate even when suites are declared', () => {
  const check = structuredClone(shippedCheck());
  const result = checkEvidenceCompleteness({
    check,
    observed: observed(SKIPPED_EVIDENCE),
    provenance: { sha: REAL_SHA },
  });
  assert.ok(result.violations.some(
    (v) => v.reason === 'CAPABILITY_UNPROVEN' && v.capability === 'tenant-isolation',
  ));
});

test('resolveCheck refuses an unknown check id rather than returning an empty pass', () => {
  assert.throws(() => resolveCheck(loadManifest(repositoryRoot), 'no-such-check'), /no-such-check/);
});

// ---------------------------------------------------------------------------
// Freshness
// ---------------------------------------------------------------------------

test('the shipped manifest declares every spine test file on disk, at any depth', () => {
  const check = shippedCheck();
  assert.equal(typeof check.workingDirectory, 'string');
  const packageRoot = join(repositoryRoot, ...check.workingDirectory.split('/'));

  const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.test\.[cm]?[jt]sx?$/u.test(entry.name)
      ? [relative(packageRoot, full).split('\\').join('/')]
      : [];
  });

  assert.deepEqual(check.suites.map((s) => s.suite).sort(), walk(join(packageRoot, 'tests')).sort());
});

test('an undeclared executed suite fails: the manifest may not go stale', () => {
  const check = structuredClone(shippedCheck());
  check.suites = check.suites.filter((s) => s.suite !== 'tests/unit.test.ts');
  check.requiredCapabilities = check.requiredCapabilities.filter((c) => c !== 'unit');

  const result = checkEvidenceCompleteness({
    check, observed: observed(EXECUTED_EVIDENCE), provenance: { sha: REAL_SHA },
  });
  assert.ok(result.violations.some(
    (v) => v.reason === 'UNDECLARED_SUITE' && v.suite === 'tests/unit.test.ts',
  ));
});
