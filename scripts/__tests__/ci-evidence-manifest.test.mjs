import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { crc32, deflateRawSync } from 'node:zlib';

import {
  checkEvidenceCompleteness,
  loadManifest,
  main,
  parseVitestJsonReport,
  readZipEntries,
  resolveArtifactName,
  resolveCheck,
  resolveEvidenceArtifact,
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
const RUN_ID = '31928303697';
const ATTEMPT = '1';
const ROOT = '/home/runner/work/Unite-Group/Unite-Group';

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
    workflow_name: 'Monorepo CI',
    ...overrides,
  });
}

function observed(path) {
  return parseVitestJsonReport(readFileSync(path, 'utf8'), {
    workingDirectory: shippedCheck().workingDirectory,
  });
}

// ---------------------------------------------------------------------------
// Artefact stubs. These build a REAL ZIP rather than mocking the reader, so the
// reader is exercised by every gated test rather than trusted.
// ---------------------------------------------------------------------------

/**
 * Minimal writer: deflate entries, central directory, EOCD.
 * `corruptCrc` writes a CRC that does not match the payload — the only way to
 * exercise the reader's CRC check, because any byte flip inside a deflate stream
 * makes inflate itself throw first.
 */
function buildZip(files, { corruptCrc = false } = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text, 'utf8');
    const deflated = deflateRawSync(raw);
    const nameBytes = Buffer.from(name, 'utf8');
    const checksum = corruptCrc ? (crc32(raw) ^ 0xffffffff) >>> 0 : crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, deflated);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + deflated.length;
  }

  const localBlock = Buffer.concat(locals);
  const centralBlock = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(centralBlock.length, 12);
  eocd.writeUInt32LE(localBlock.length, 16);
  return Buffer.concat([localBlock, centralBlock, eocd]);
}

const ARTIFACT_NAME = `spine-test-evidence-${REAL_SHA}`;
const ARTIFACT_ID = 9264142624;

function stubLister(overrides = {}) {
  return () => ({
    artifacts: [{
      id: ARTIFACT_ID,
      name: ARTIFACT_NAME,
      expired: false,
      size_in_bytes: 934,
      digest: 'sha256:62e360b53e2b340cdca7df5e20b921209b0a4ec7be587bebfbedc1f91f8c2c27',
      workflow_run: { id: Number(RUN_ID), head_sha: REAL_SHA },
      ...overrides,
    }],
  });
}

function stubDownloader(evidencePath = SKIPPED_EVIDENCE, entry = 'vitest-report.json') {
  return () => buildZip({ [entry]: readFileSync(evidencePath, 'utf8') });
}

const GATE_ARGS = ['--check', SPINE_CHECK_ID, '--sha', REAL_SHA, '--job', JOB_ID,
  '--run', RUN_ID, '--attempt', ATTEMPT, '--repo', REPO, '--root', ROOT, '--gate'];

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
  assert.deepEqual(result.totals, {
    executed: 3, skipped: 19, declared: 22, passed: 3, failed: 0, todo: 0,
  });

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

test('provenance resolves from API metadata and binds commit, job, run and attempt', () => {
  const provenance = resolveProvenance({
    check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
    expectedRunId: RUN_ID, expectedRunAttempt: ATTEMPT, fetcher: stubFetcher(),
  });
  assert.equal(provenance.sha, REAL_SHA);
  assert.equal(provenance.jobName, REQUIRED_JOB_NAME);
  assert.equal(provenance.runId, 31928303697);
  assert.equal(provenance.runAttempt, 1);
  assert.equal(provenance.workflowName, 'Monorepo CI');
});

test('a job that ran on a different commit is refused', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      expectedRunId: RUN_ID, expectedRunAttempt: ATTEMPT, fetcher: stubFetcher({ head_sha: OTHER_SHA }),
    }),
    /PROVENANCE_MISMATCH/,
  );
});

test('evidence from a different job does not satisfy this check', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      expectedRunId: RUN_ID, expectedRunAttempt: ATTEMPT, fetcher: stubFetcher({ name: 'apps/web — Playwright E2E' }),
    }),
    /PROVENANCE_WRONG_JOB/,
  );
});

test('an in-progress job is refused rather than graded on partial output', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      expectedRunId: RUN_ID, expectedRunAttempt: ATTEMPT, fetcher: stubFetcher({ status: 'in_progress' }),
    }),
    /PROVENANCE_INCOMPLETE/,
  );
});

test('a job with no usable head_sha is refused', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      expectedRunId: RUN_ID, expectedRunAttempt: ATTEMPT, fetcher: stubFetcher({ head_sha: null }),
    }),
    /PROVENANCE_ABSENT/,
  );
});

test('THE FORGERY, CLOSED: --gate refuses a caller-supplied evidence file outright', () => {
  const errors = [];
  const io = { log: () => {}, error: (line) => errors.push(line) };

  // Round six's attack: point --gate at the fixture this repository's own README
  // labels SYNTHETIC, with fully-bound provenance for a real job on a real SHA.
  // It returned PASS, because provenance bound the JOB while the evidence was
  // whatever path the caller typed. There is now no path argument to give it.
  const status = main(
    [...GATE_ARGS, '--evidence', EXECUTED_EVIDENCE],
    {
      root: repositoryRoot,
      io,
      fetcher: stubFetcher(),
      lister: stubLister(),
      downloader: stubDownloader(),
    },
  );

  assert.equal(status, 2);
  assert.ok(errors.some((line) => line.includes('UNBOUND_EVIDENCE_SOURCE')), errors.join('\n'));
});

test('--gate still refuses without API-resolved provenance', () => {
  const errors = [];
  const io = { log: () => {}, error: (line) => errors.push(line) };
  const status = main(
    ['--check', SPINE_CHECK_ID, '--sha', REAL_SHA, '--gate'],
    { root: repositoryRoot, io, fetcher: stubFetcher(), lister: stubLister(), downloader: stubDownloader() },
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
  const gated = (evidence) => main(GATE_ARGS, {
    root: repositoryRoot,
    io,
    fetcher: stubFetcher(),
    lister: stubLister(),
    downloader: stubDownloader(evidence),
  });

  assert.equal(gated(SKIPPED_EVIDENCE), 1);
  assert.ok(errors.some((line) => line.includes('tests/integration/rls.test.ts')));
  assert.equal(gated(EXECUTED_EVIDENCE), 0);
});

test('a gated PASS names the artefact its evidence came out of', () => {
  const outputs = [];
  main([...GATE_ARGS, '--json'], {
    root: repositoryRoot,
    io: { log: (l) => outputs.push(l), error: () => {} },
    fetcher: stubFetcher(),
    lister: stubLister(),
    downloader: stubDownloader(EXECUTED_EVIDENCE),
  });

  const record = JSON.parse(outputs.join('\n'));
  assert.equal(record.evidenceSource.artifactId, ARTIFACT_ID);
  assert.equal(record.evidenceSource.artifactName, ARTIFACT_NAME);
  assert.equal(record.evidenceSource.entry, 'vitest-report.json');
});

test('report-only mode labels its evidence UNBOUND rather than implying otherwise', () => {
  const outputs = [];
  main(['--check', SPINE_CHECK_ID, '--evidence', EXECUTED_EVIDENCE], {
    root: repositoryRoot,
    io: { log: (l) => outputs.push(l), error: () => {} },
    fetcher: stubFetcher(),
  });

  assert.ok(outputs.some((line) => line.includes('evidence: UNBOUND')), outputs.join('\n'));
});

test('--sha must be lowercase 40-hex', () => {
  assert.equal(
    main(['--check', SPINE_CHECK_ID, '--evidence', EXECUTED_EVIDENCE, '--sha', 'NOT-A-SHA',
      '--job', JOB_ID, '--run', RUN_ID, '--attempt', ATTEMPT, '--repo', REPO, '--root', ROOT, '--gate'],
    { root: repositoryRoot, io: NULL_IO, fetcher: stubFetcher() }),
    2,
  );
});

test('--json emits a machine-readable record carrying full API provenance', () => {
  const outputs = [];
  main(['--check', SPINE_CHECK_ID, '--evidence', SKIPPED_EVIDENCE, '--sha', REAL_SHA,
    '--job', JOB_ID, '--run', RUN_ID, '--attempt', ATTEMPT, '--repo', REPO, '--root', ROOT, '--json'],
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
  workflowName: 'W',
  job: 'j',
  artifact: 'a',
  reportEntry: 'r.json',
  workingDirectory: 'd',
  requiredCapabilities: ['unit'],
  suites: [MINIMAL_SUITE],
};

test('the shipped manifest validates and declares the spine check by name', () => {
  // `checks.length > 0` was tautological: validateManifest already throws on an
  // empty list, so the assertion could never be false. Assert real content.
  const manifest = loadManifest(repositoryRoot);
  const ids = manifest.checks.map((c) => c.id);
  assert.ok(ids.includes(SPINE_CHECK_ID), ids.join(', '));
  assert.equal(manifest.version, 2);
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

// ---------------------------------------------------------------------------
// Round-three findings (independent review, qwen3.8): provenance completeness,
// path ambiguity, duplicate records, unverifiable reports.
// ---------------------------------------------------------------------------

test('a cancelled job is refused; its report is partial at best', () => {
  for (const conclusion of ['cancelled', 'skipped', null]) {
    assert.throws(
      () => resolveProvenance({
        check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
        expectedRunId: RUN_ID, expectedRunAttempt: ATTEMPT, fetcher: stubFetcher({ conclusion }),
      }),
      /PROVENANCE_UNUSABLE_CONCLUSION/,
      String(conclusion),
    );
  }
});

test('a FAILED job is still evidence: the tests ran, some of them failed', () => {
  const provenance = resolveProvenance({
    check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
    expectedRunId: RUN_ID, expectedRunAttempt: ATTEMPT, fetcher: stubFetcher({ conclusion: 'failure' }),
  });
  assert.equal(provenance.conclusion, 'failure');
});

test('evidence from another run of the same job on the same commit is refused', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      expectedRunId: '99999999999', expectedRunAttempt: ATTEMPT, fetcher: stubFetcher(),
    }),
    /PROVENANCE_WRONG_RUN/,
  );
});

test('--gate names every binding it is missing, and refuses on any one of them', () => {
  // NOTE: no --evidence here, and that matters. The UNBOUND_EVIDENCE_SOURCE
  // refusal added in round six sits EARLIER in main() than this check, so leaving
  // --evidence in the base args made every case exit 2 for the wrong reason —
  // the status assertion still passed and only the message differed. A new rule
  // inserted ahead of an existing one silently disarms its positive controls.
  const base = ['--check', SPINE_CHECK_ID, '--sha', REAL_SHA,
    '--job', JOB_ID, '--run', RUN_ID, '--attempt', ATTEMPT, '--repo', REPO, '--root', ROOT, '--gate'];

  for (const flag of ['--run', '--attempt', '--root', '--repo', '--job']) {
    const index = base.indexOf(flag);
    const argv = [...base.slice(0, index), ...base.slice(index + 2)];
    const errors = [];
    const status = main(argv, {
      root: repositoryRoot,
      io: { log: () => {}, error: (l) => errors.push(l) },
      fetcher: stubFetcher(),
      lister: stubLister(),
      downloader: stubDownloader(),
    });
    assert.equal(status, 2, flag);
    assert.ok(errors.some((line) => line.includes(flag)), `${flag}: ${errors.join(' | ')}`);
  }
});

test('a path containing the package prefix twice is AMBIGUOUS, not silently resolved', () => {
  const report = {
    numTotalTests: 1,
    testResults: [{
      name: '/w/packages/spine/packages/spine/vendor/packages/spine/packages/spine/tests/integration/rls.test.ts',
      status: 'passed',
      assertionResults: [{ status: 'passed' }],
    }],
  };
  assert.throws(
    () => parseVitestJsonReport(JSON.stringify(report), {
      workingDirectory: 'packages/spine/packages/spine',
    }),
    /AMBIGUOUS_SUITE_PATH/,
  );
});

test('the package prefix is matched at a directory boundary, not as a substring', () => {
  const report = {
    numTotalTests: 1,
    testResults: [{
      name: '/w/not-pkg-decoy/tests/x.test.ts', status: 'passed', assertionResults: [{ status: 'passed' }],
    }],
  };
  // No `/pkg/` boundary anywhere, so nothing resolves through the package and the
  // whole report is refused rather than graded on paths it cannot attribute.
  assert.throws(
    () => parseVitestJsonReport(JSON.stringify(report), { workingDirectory: 'pkg' }),
    /UNROOTED_EVIDENCE/,
  );
});

test('duplicate records are a conflict even when their headline counts agree', () => {
  const report = {
    numTotalTests: 2,
    testResults: [
      { name: '/w/pkg/tests/x.test.ts', status: 'passed', assertionResults: [{ status: 'passed', title: 'a' }] },
      { name: '/w/pkg/tests/x.test.ts', status: 'passed', assertionResults: [{ status: 'passed', title: 'b' }] },
    ],
  };
  const parsed = parseVitestJsonReport(JSON.stringify(report), { workingDirectory: 'pkg' });
  assert.equal(parsed.suites[0].conflict, true);
});

test('evidence with no numeric numTotalTests is REPORT_UNVERIFIABLE, not a free pass', () => {
  const report = JSON.parse(readFileSync(EXECUTED_EVIDENCE, 'utf8'));
  delete report.numTotalTests;

  const result = checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: parseVitestJsonReport(JSON.stringify(report), {
      workingDirectory: shippedCheck().workingDirectory,
    }),
    provenance: { sha: REAL_SHA },
  });

  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'REPORT_UNVERIFIABLE'));
});

test('an evidence file with no testResults entries cannot pass', () => {
  const result = checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: parseVitestJsonReport('{"numTotalTests":0,"testResults":[]}', {
      workingDirectory: shippedCheck().workingDirectory,
    }),
    provenance: { sha: REAL_SHA },
  });
  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.violations.filter((v) => v.reason === 'REQUIRED_EVIDENCE_UNAVAILABLE').length, 6);
});

// ---------------------------------------------------------------------------
// The dead-guard class. Self-caught: PROVENANCE_WRONG_WORKFLOW was previously
// wrapped in `if (check.workflowName)` while the manifest declared no such
// field, so a job from ANY workflow was accepted and the guard could not fire.
// ---------------------------------------------------------------------------

test('THE DEAD GUARD, CLOSED: a job from another workflow is refused', () => {
  for (const workflowName of ['Totally Unrelated Workflow', '', undefined]) {
    assert.throws(
      () => resolveProvenance({
        check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
        expectedRunId: RUN_ID, expectedRunAttempt: ATTEMPT, fetcher: stubFetcher({ workflow_name: workflowName }),
      }),
      /PROVENANCE_WRONG_WORKFLOW/,
      String(workflowName),
    );
  }
});

test('the matching workflow is still accepted, so the guard is not simply always-on', () => {
  const provenance = resolveProvenance({
    check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
    expectedRunId: RUN_ID, expectedRunAttempt: ATTEMPT, fetcher: stubFetcher({ workflow_name: 'Monorepo CI' }),
  });
  assert.equal(provenance.workflowName, 'Monorepo CI');
});

test('a manifest without workflowName is rejected: the guard may never be unreachable', () => {
  const check = structuredClone(shippedCheck());
  delete check.workflowName;
  assert.throws(() => validateManifest({ checks: [check] }), /declares no workflowName/);
});

test("the manifest's workflowName matches the declared workflow file's own name", () => {
  // Anti-stale: renaming the workflow in ci.yml without updating the manifest
  // would otherwise silently refuse every real job.
  const check = shippedCheck();
  const workflow = readFileSync(join(repositoryRoot, ...check.workflow.split('/')), 'utf8');
  const declared = /^name:\s*(.+?)\s*$/mu.exec(workflow);

  assert.ok(declared, `${check.workflow} declares no top-level name:`);
  assert.equal(check.workflowName, declared[1]);
});

// ---------------------------------------------------------------------------
// Round-four findings (qwen3.8, independent): completeness is not success,
// unrooted paths, prototype-unsafe counting, partial reconciliation, unbound
// run/attempt, unvalidated API targeting.
// ---------------------------------------------------------------------------

test('THE SELF-DEFEAT, CLOSED: a complete but FAILED run cannot return PASS', () => {
  const report = JSON.parse(readFileSync(EXECUTED_EVIDENCE, 'utf8'));
  // Every suite executed; one assertion failed. Completeness is satisfied.
  const rls = report.testResults.find((f) => f.name.endsWith('rls.test.ts'));
  rls.assertionResults[0].status = 'failed';
  report.numPassedTests -= 1;
  report.numFailedTests = 1;

  const result = checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: parseVitestJsonReport(JSON.stringify(report), {
      workingDirectory: shippedCheck().workingDirectory,
    }),
    provenance: { sha: REAL_SHA, jobId: JOB_ID, conclusion: 'failure' },
  });

  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'JOB_CONCLUDED_FAILURE'));
  assert.ok(result.violations.some(
    (v) => v.reason === 'SUITE_HAS_FAILURES' && v.suite === 'tests/integration/rls.test.ts',
  ));
});

test('a vendored copy under a different root is refused, not silently accepted', () => {
  const wd = shippedCheck().workingDirectory;
  const report = {
    numTotalTests: 2,
    testResults: [
      { name: `/w/${wd}/tests/unit.test.ts`, status: 'passed', assertionResults: [{ status: 'passed' }] },
      { name: `/w/vendor/${wd}/tests/integration/rls.test.ts`, status: 'passed', assertionResults: [{ status: 'passed' }] },
    ],
  };
  assert.throws(
    () => parseVitestJsonReport(JSON.stringify(report), { workingDirectory: wd }),
    /INCONSISTENT_PACKAGE_ROOTS/,
  );
});

test('a relative path that starts with the package directory still resolves', () => {
  const parsed = parseVitestJsonReport(JSON.stringify({
    numTotalTests: 1,
    testResults: [{ name: 'pkg/tests/x.test.ts', status: 'passed', assertionResults: [{ status: 'passed' }] }],
  }), { workingDirectory: 'pkg' });
  assert.equal(parsed.suites[0].suite, 'tests/x.test.ts');
});

test('an assertion status naming an inherited property is COUNTED as unrecognised', () => {
  // The earlier version of this test asserted executed === 0, which was true
  // with or without the fix — an inherited key can only pollute a counter that
  // nothing reads. Assert the observable that actually distinguishes them.
  for (const status of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    const parsed = parseVitestJsonReport(JSON.stringify({
      numTotalTests: 1,
      testResults: [{ name: '/w/pkg/tests/x.test.ts', status: 'passed', assertionResults: [{ status }] }],
    }), { workingDirectory: 'pkg' });
    assert.equal(parsed.suites[0].unrecognised, 1, status);
    assert.equal(parsed.suites[0].executed, 0, status);
  }
});

test('an unrecognised assertion status is a violation, not a silent bucket', () => {
  const result = checkEvidenceCompleteness({
    check: {
      id: 'x', requiredCheck: 'x', requiredCapabilities: ['unit'],
      suites: [{ suite: 'tests/x.test.ts', class: 'REQUIRED_EVIDENCE', capability: 'unit' }],
    },
    observed: parseVitestJsonReport(JSON.stringify({
      numTotalTests: 2,
      numPassedTests: 1,
      testResults: [{
        name: '/w/pkg/tests/x.test.ts',
        status: 'passed',
        assertionResults: [{ status: 'passed' }, { status: 'quarantined' }],
      }],
    }), { workingDirectory: 'pkg' }),
    provenance: { sha: REAL_SHA, conclusion: 'success' },
  });

  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'UNRECOGNISED_ASSERTION_STATUS'));
});

test('a consistent total with an inconsistent distribution is still SUMMARY_MISMATCH', () => {
  const report = JSON.parse(readFileSync(SKIPPED_EVIDENCE, 'utf8'));
  // Total still 22, but the summary now claims everything passed.
  report.numPassedTests = 22;
  report.numPendingTests = 0;

  const result = checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: parseVitestJsonReport(JSON.stringify(report), {
      workingDirectory: shippedCheck().workingDirectory,
    }),
    provenance: { sha: REAL_SHA, jobId: JOB_ID, conclusion: 'success' },
  });

  assert.equal(result.reported.total, result.totals.declared);
  assert.ok(result.violations.some(
    (v) => v.reason === 'SUMMARY_MISMATCH' && v.detail.includes('numPassedTests'),
  ));
});

test('resolveProvenance refuses to run unbound rather than silently weakening', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      fetcher: stubFetcher(),
    }),
    /PROVENANCE_UNBOUND/,
  );
});

test('an earlier attempt of the same run is refused when the attempt is bound', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      expectedRunId: RUN_ID, expectedRunAttempt: '2', fetcher: stubFetcher({ run_attempt: 1 }),
    }),
    /PROVENANCE_WRONG_ATTEMPT/,
  );
});

test('API targeting inputs are shape-checked at both boundaries', () => {
  const errors = [];
  const io = { log: () => {}, error: (l) => errors.push(l) };
  const run = (overrides) => main([
    '--check', SPINE_CHECK_ID, '--sha', REAL_SHA,
    '--job', overrides.job ?? JOB_ID, '--run', overrides.run ?? RUN_ID,
    '--attempt', ATTEMPT, '--repo', overrides.repo ?? REPO, '--root', ROOT, '--gate',
  ], {
    root: repositoryRoot, io, fetcher: stubFetcher(), lister: stubLister(), downloader: stubDownloader(),
  });

  assert.equal(run({ repo: 'not-a-repo' }), 2);
  assert.equal(run({ job: '12; rm -rf /' }), 2);
  assert.equal(run({ run: 'abc' }), 2);
  assert.ok(errors.some((l) => l.includes('owner/name')));
  assert.ok(errors.some((l) => l.includes('--job must be numeric')));
});

// ---------------------------------------------------------------------------
// Round-five findings (qwen3.8, independent). Each of these was DEMONSTRATED
// open against the previous head before being fixed.
// ---------------------------------------------------------------------------

test('THE CORE HOLE, CLOSED: a partially-executed required suite proves nothing', () => {
  // 1 assertion runs, 4 self-disable. Previously: PASS with 0 violations — the
  // UNI-2567 defect alive inside the tool built to detect it.
  const check = {
    id: 'x', requiredCheck: 'x', requiredCapabilities: ['tenant-isolation'],
    suites: [{ suite: 'tests/rls.test.ts', class: 'REQUIRED_EVIDENCE', capability: 'tenant-isolation' }],
  };
  const report = {
    numTotalTests: 5, numPassedTests: 1, numFailedTests: 0, numPendingTests: 4, numTodoTests: 0,
    testResults: [{
      name: '/w/pkg/tests/rls.test.ts',
      status: 'passed',
      assertionResults: [
        { status: 'passed' }, { status: 'skipped' }, { status: 'skipped' },
        { status: 'skipped' }, { status: 'skipped' },
      ],
    }],
  };

  const result = checkEvidenceCompleteness({
    check,
    observed: parseVitestJsonReport(JSON.stringify(report), { workingDirectory: 'pkg' }),
    provenance: { sha: REAL_SHA, conclusion: 'success' },
  });

  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.evidence[0].status, 'PARTIAL');
  assert.ok(result.violations.some((v) => v.reason === 'REQUIRED_EVIDENCE_PARTIALLY_EXECUTED'));
  assert.ok(result.violations.some(
    (v) => v.reason === 'CAPABILITY_UNPROVEN' && v.capability === 'tenant-isolation',
  ));
});

test('a fully-executed suite still proves its capability, so the floor is not always-on', () => {
  const check = {
    id: 'x', requiredCheck: 'x', requiredCapabilities: ['tenant-isolation'],
    suites: [{ suite: 'tests/rls.test.ts', class: 'REQUIRED_EVIDENCE', capability: 'tenant-isolation' }],
  };
  const report = {
    success: true,
    numFailedTestSuites: 0,
    numTotalTests: 2, numPassedTests: 2, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0,
    testResults: [{
      name: '/w/pkg/tests/rls.test.ts', status: 'passed',
      assertionResults: [{ status: 'passed' }, { status: 'passed' }],
    }],
  };

  const result = checkEvidenceCompleteness({
    check,
    observed: parseVitestJsonReport(JSON.stringify(report), { workingDirectory: 'pkg' }),
    provenance: { sha: REAL_SHA, conclusion: 'success' },
  });

  assert.equal(result.verdict, 'PASS');
  assert.equal(result.evidence[0].status, 'EXECUTED');
});

test('THE FALSE COMMENT, CLOSED: a leading marker counts toward ambiguity', () => {
  // pkg/vendor/pkg/tests/x.test.ts previously resolved silently to tests/x.test.ts.
  assert.throws(
    () => parseVitestJsonReport(JSON.stringify({
      numTotalTests: 1,
      testResults: [{ name: 'pkg/vendor/pkg/tests/x.test.ts', status: 'passed', assertionResults: [{ status: 'passed' }] }],
    }), { workingDirectory: 'pkg' }),
    /AMBIGUOUS_SUITE_PATH/,
  );
});

test('a consistently-wrong root is refused when the expected root is known', () => {
  const report = {
    numTotalTests: 1, numPassedTests: 1, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0,
    testResults: [{ name: '/w/vendor/pkg/tests/x.test.ts', status: 'passed', assertionResults: [{ status: 'passed' }] }],
  };
  // Consistent on its own — every record shares the root /w/vendor.
  const permissive = parseVitestJsonReport(JSON.stringify(report), { workingDirectory: 'pkg' });
  assert.equal(permissive.packageRoot, '/w/vendor');

  assert.throws(
    () => parseVitestJsonReport(JSON.stringify(report), { workingDirectory: 'pkg', expectedRoot: '/w' }),
    /UNEXPECTED_PACKAGE_ROOT/,
  );
});

test('a report where nothing resolves through the package is refused, not graded', () => {
  assert.throws(
    () => parseVitestJsonReport(JSON.stringify({
      numTotalTests: 1,
      testResults: [{ name: '/elsewhere/tests/x.test.ts', status: 'passed', assertionResults: [{ status: 'passed' }] }],
    }), { workingDirectory: 'pkg' }),
    /UNROOTED_EVIDENCE/,
  );
});

test('a selectively-edited summary cannot evade the distribution check', () => {
  const report = JSON.parse(readFileSync(EXECUTED_EVIDENCE, 'utf8'));
  delete report.numPassedTests;
  delete report.numPendingTests;

  const result = checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: parseVitestJsonReport(JSON.stringify(report), {
      workingDirectory: shippedCheck().workingDirectory,
    }),
    provenance: { sha: REAL_SHA, conclusion: 'success' },
  });

  assert.equal(result.verdict, 'FAIL');
  const unverifiable = result.violations.filter((v) => v.reason === 'REPORT_UNVERIFIABLE');
  assert.equal(unverifiable.length, 2);
  assert.ok(unverifiable.some((v) => v.detail.includes('numPassedTests')));
});

test('resolveProvenance refuses an unbound ATTEMPT, not just an unbound run', () => {
  assert.throws(
    () => resolveProvenance({
      check: shippedCheck(), repo: REPO, jobId: JOB_ID, expectedSha: REAL_SHA,
      expectedRunId: RUN_ID, fetcher: stubFetcher(),
    }),
    /PROVENANCE_UNBOUND: expectedRunAttempt/,
  );
});

test('the real captured report satisfies the distribution invariant for this vitest', () => {
  // The numPendingTests <-> (skipped - todo) mapping is asserted against real
  // vitest 4.1.10 output rather than assumed across versions.
  const real = observed(SKIPPED_EVIDENCE);
  assert.equal(real.reported.pending, real.totals.skipped - real.totals.todo);
  assert.equal(real.reported.total, real.totals.declared);
  assert.equal(real.reported.pending, 19);
});

test('--repo rejects dot segments that could reshape the API path', () => {
  for (const repo of ['owner/..', '../repo', './x']) {
    assert.equal(
      main(['--check', SPINE_CHECK_ID, '--sha', REAL_SHA,
        '--job', JOB_ID, '--run', RUN_ID, '--attempt', ATTEMPT, '--repo', repo, '--root', ROOT, '--gate'],
      {
        root: repositoryRoot, io: NULL_IO, fetcher: stubFetcher(),
        lister: stubLister(), downloader: stubDownloader(),
      }),
      2,
      repo,
    );
  }
});

// ---------------------------------------------------------------------------
// ROUND SIX: a suite can fail without an assertion failing
// ---------------------------------------------------------------------------

/** The synthetic all-green report, optionally sabotaged. */
function executedReport(mutate = () => {}) {
  const report = JSON.parse(readFileSync(EXECUTED_EVIDENCE, 'utf8'));
  mutate(report);
  return parseVitestJsonReport(JSON.stringify(report), {
    workingDirectory: shippedCheck().workingDirectory,
  });
}

const GOOD_PROVENANCE = { sha: REAL_SHA, jobId: JOB_ID, runId: 1, runAttempt: 1, conclusion: 'success' };
const graded = (obs) => checkEvidenceCompleteness({
  check: shippedCheck(), observed: obs, provenance: GOOD_PROVENANCE,
});

test('the untouched synthetic control still PASSes, so the guards below are not always-on', () => {
  const result = graded(executedReport());
  assert.equal(result.verdict, 'PASS', JSON.stringify(result.violations));
});

test('A SUITE THAT ERRORED OUTSIDE ITS ASSERTIONS IS NOT COMPLETE EVIDENCE', () => {
  // Round six's second P0: every assertionResult says "passed" while the file
  // itself failed — an afterAll hook that throws, a setup error, an unhandled
  // rejection. Counting assertions alone certified it as green.
  const result = graded(executedReport((report) => {
    report.testResults[0].status = 'failed';
    report.testResults[0].message = 'afterAll hook threw: connection reset';
  }));

  assert.equal(result.verdict, 'FAIL');
  const reasons = result.violations.map((v) => v.reason);
  assert.ok(reasons.includes('SUITE_FILE_NOT_PASSED'), reasons.join(', '));
  assert.ok(reasons.includes('SUITE_REPORTED_FAILURE_MESSAGE'), reasons.join(', '));
});

test("a report declaring its own failure is refused however its assertions read", () => {
  const result = graded(executedReport((report) => { report.success = false; }));

  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'REPORT_DECLARES_FAILURE'));
});

test('numFailedTestSuites > 0 fails even when every assertion passed', () => {
  const result = graded(executedReport((report) => { report.numFailedTestSuites = 1; }));

  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'REPORT_DECLARES_FAILED_SUITES'));
});

test('a missing success or numFailedTestSuites field is UNVERIFIABLE, not passing', () => {
  for (const field of ['success', 'numFailedTestSuites']) {
    const result = graded(executedReport((report) => { delete report[field]; }));
    assert.equal(result.verdict, 'FAIL', field);
    assert.ok(result.violations.some((v) => v.reason === 'REPORT_UNVERIFIABLE'), field);
  }
});

// ---------------------------------------------------------------------------
// ROUND SIX: the evidence file must come OUT of the run
// ---------------------------------------------------------------------------

test('the ZIP reader round-trips a real deflate archive and verifies its CRC', () => {
  const zip = buildZip({ 'vitest-report.json': '{"ok":true}', 'nested/other.txt': 'hello' });
  const entries = readZipEntries(zip);

  assert.equal(entries.length, 2);
  assert.equal(entries[0].contents.toString('utf8'), '{"ok":true}');
  assert.equal(entries[1].name, 'nested/other.txt');
});

test('a corrupted archive is refused rather than partially read', () => {
  // A long, highly compressible payload so the deflate stream is several bytes
  // and a flip lands inside it. The uncompressed LENGTH still matches, so only
  // the CRC can tell — without that check this returned altered bytes as evidence.
  const name = 'vitest-report.json';
  const zip = buildZip({ [name]: `{"testResults":[],"filler":"${'a'.repeat(4000)}"}` });
  const payloadStart = 30 + Buffer.byteLength(name) + 4;

  let refused = 0;
  for (const offset of [0, 1, 2, 3]) {
    const corrupt = Buffer.from(zip);
    corrupt[payloadStart + offset] ^= 0xff;
    try {
      readZipEntries(corrupt);
    } catch {
      refused += 1;
    }
  }
  assert.equal(refused, 4, 'a byte flip inside the payload was accepted');
});

test("an archive whose CRC disagrees with its payload is refused", () => {
  // The control the byte-flip test could NOT provide. A flip inside a deflate
  // stream makes inflate throw before the CRC is ever consulted, so that test
  // passed with the CRC check deleted — it proved nothing about it. Here the
  // payload inflates perfectly and only the recorded CRC is wrong, which is
  // exactly the archive a truncated-then-repadded upload would produce.
  const zip = buildZip({ 'vitest-report.json': '{"testResults":[]}' }, { corruptCrc: true });
  assert.throws(() => readZipEntries(zip), /CORRUPT_ZIP: .*has CRC/);
});

test('a buffer that is not a ZIP at all is refused', () => {
  assert.throws(() => readZipEntries(Buffer.from('not a zip, just bytes')), /NOT_A_ZIP/);
});

test('the artefact name carries the API-resolved commit, not one the caller typed', () => {
  const check = { ...shippedCheck(), artifact: 'spine-test-evidence-{sha}' };
  assert.equal(resolveArtifactName(check, REAL_SHA), `spine-test-evidence-${REAL_SHA}`);
  assert.throws(() => resolveArtifactName(check, null), /ARTIFACT_NAME_UNBOUND/);
  assert.throws(() => resolveArtifactName(check, 'HEAD'), /ARTIFACT_NAME_UNBOUND/);
});

test('AN ARTEFACT FROM ANOTHER RUN IS REFUSED, not graded', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      lister: stubLister({ workflow_run: { id: 424242, head_sha: REAL_SHA } }),
      downloader: stubDownloader(),
    }),
    /ARTIFACT_FOREIGN_RUN/,
  );
});

test('an artefact produced on another commit is refused', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      lister: stubLister({ workflow_run: { id: Number(RUN_ID), head_sha: OTHER_SHA } }),
      downloader: stubDownloader(),
    }),
    /ARTIFACT_FOREIGN_SHA/,
  );
});

test('an expired artefact is absent evidence, not empty evidence', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      lister: stubLister({ expired: true }), downloader: stubDownloader(),
    }),
    /ARTIFACT_EXPIRED/,
  );
});

test('a run that uploaded no evidence is a refusal, never a vacuous pass', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      lister: () => ({ artifacts: [] }), downloader: stubDownloader(),
    }),
    /ARTIFACT_ABSENT/,
  );
});

test('two artefacts of the same name cannot be silently disambiguated', () => {
  const twice = () => ({
    artifacts: [
      { id: 1, name: ARTIFACT_NAME, expired: false, workflow_run: { id: Number(RUN_ID), head_sha: REAL_SHA } },
      { id: 2, name: ARTIFACT_NAME, expired: false, workflow_run: { id: Number(RUN_ID), head_sha: REAL_SHA } },
    ],
  });
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      lister: twice, downloader: stubDownloader(),
    }),
    /ARTIFACT_AMBIGUOUS/,
  );
});

test('an artefact without the declared report entry is refused', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      lister: stubLister(), downloader: () => buildZip({ 'something-else.json': '{}' }),
    }),
    /ARTIFACT_MISSING_REPORT/,
  );
});

test('the report entry is found whether upload-artifact nested it or not', () => {
  // Both layouts were observed in this repository's real artefacts and which one
  // the spine artefact will take is not yet verified, so both must resolve.
  for (const entry of ['vitest-report.json', 'packages/spine/vitest-report.json']) {
    const fetched = resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      lister: stubLister(), downloader: stubDownloader(SKIPPED_EVIDENCE, entry),
    });
    assert.ok(fetched.text.includes('testResults'), entry);
  }
});

test('two entries answering to the same report name are refused, not picked between', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      lister: stubLister(),
      downloader: () => buildZip({
        'vitest-report.json': '{"testResults":[]}',
        'nested/vitest-report.json': '{"testResults":[]}',
      }),
    }),
    /ARTIFACT_DUPLICATE_REPORT/,
  );
});

test('a manifest check declaring no artifact or reportEntry cannot be gated', () => {
  for (const field of ['artifact', 'reportEntry']) {
    const broken = { ...MINIMAL_CHECK };
    delete broken[field];
    assert.throws(() => validateManifest({ checks: [broken] }), new RegExp(`declares no ${field}`));
  }
});

test('the shipped manifest names the artefact ci.yml actually uploads', () => {
  // Anti-stale: renaming the artefact in ci.yml without updating the manifest
  // would leave the gate looking for something no run produces.
  const check = shippedCheck();
  const workflow = readFileSync(join(repositoryRoot, check.workflow), 'utf8');
  const expected = check.artifact.split('{sha}').join('${{ github.sha }}');

  assert.ok(workflow.includes(`name: ${expected}`), `ci.yml does not upload "${expected}"`);
  assert.ok(workflow.includes(check.reportEntry), `ci.yml never mentions "${check.reportEntry}"`);
});
