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
function buildZip(files, {
  corruptCrc = false,
  // ROUND EIGHT. The reviewer's archive held two members both named
  // `vitest-report.json` and simply LIED about how many there were, so the
  // reader walked one record and the duplicate-name refusal downstream never saw
  // the second copy. An object literal cannot express two identical keys, and
  // the EOCD fields were computed rather than settable, so the writer could not
  // build the archive that beat the reader. Both are now expressible.
  countOverride = null,
  directorySizeOverride = null,
  zip64Count = false,
  localNameOverride = null,
  // Stored (method 0) rather than deflated, so an entry's payload can be chosen
  // byte-for-byte. Needed to build the overlap case honestly: two entries can
  // only overlap while both still parse if one entry's data literally contains
  // the other's local record.
  stored = false,
  // Write every local record but emit central records only for the entries NOT
  // named here, with a self-consistent EOCD. This is the archive round nine
  // built: a complete, unindexed local record sitting in the gap between two
  // indexed extents, which no overlap check can see.
  omitFromDirectory = [],
} = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const pairs = Array.isArray(files) ? files : Object.entries(files);

  for (const [name, text] of pairs) {
    const raw = Buffer.isBuffer(text) ? text : Buffer.from(text, 'utf8');
    const deflated = stored ? raw : deflateRawSync(raw);
    const nameBytes = Buffer.from(name, 'utf8');
    const checksum = corruptCrc ? (crc32(raw) ^ 0xffffffff) >>> 0 : crc32(raw);

    const localNameBytes = localNameOverride === null
      ? nameBytes
      : Buffer.from(localNameOverride, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(stored ? 0 : 8, 8); // 0 = stored, 8 = deflate
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(localNameBytes.length, 26);
    locals.push(local, localNameBytes, deflated);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(stored ? 0 : 8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + localNameBytes.length + deflated.length;
  }

  const localBlock = Buffer.concat(locals);
  const keptCentrals = [];
  for (let index = 0; index < pairs.length; index += 1) {
    if (omitFromDirectory.includes(pairs[index][0])) continue;
    keptCentrals.push(centrals[index * 2], centrals[index * 2 + 1]);
  }
  const centralBlock = Buffer.concat(omitFromDirectory.length > 0 ? keptCentrals : centrals);
  const entryCount = omitFromDirectory.length > 0
    ? pairs.length - omitFromDirectory.length
    : pairs.length;
  const declaredCount = zip64Count ? 0xffff : (countOverride ?? entryCount);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(declaredCount, 8);
  eocd.writeUInt16LE(declaredCount, 10);
  eocd.writeUInt32LE(directorySizeOverride ?? centralBlock.length, 12);
  eocd.writeUInt32LE(localBlock.length, 16);
  return Buffer.concat([localBlock, centralBlock, eocd]);
}

/** The byte length of one central-directory record for a given member name. */
const centralRecordLength = (name) => 46 + Buffer.byteLength(name, 'utf8');

const ARTIFACT_NAME = `spine-test-evidence-${REAL_SHA}`;
const ARTIFACT_ID = 9264142624;

const ATTEMPT_STARTED = '2026-08-16T00:00:00Z';
const ARTIFACT_CREATED = '2026-08-16T00:05:00Z';

function stubLister(overrides = {}) {
  return () => ({
    artifacts: [{
      id: ARTIFACT_ID,
      name: ARTIFACT_NAME,
      expired: false,
      size_in_bytes: 934,
      digest: 'sha256:62e360b53e2b340cdca7df5e20b921209b0a4ec7be587bebfbedc1f91f8c2c27',
      created_at: ARTIFACT_CREATED,
      workflow_run: { id: Number(RUN_ID), head_sha: REAL_SHA },
      ...overrides,
    }],
  });
}

/** Stands in for the run-attempt endpoint. The real one is never called in tests. */
function stubAttempt(overrides = {}) {
  return () => ({
    id: Number(RUN_ID),
    run_attempt: Number(ATTEMPT),
    run_started_at: ATTEMPT_STARTED,
    head_sha: REAL_SHA,
    ...overrides,
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
      attemptFetcher: stubAttempt(),
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
    { root: repositoryRoot, io, fetcher: stubFetcher(), lister: stubLister(), downloader: stubDownloader(), attemptFetcher: stubAttempt() },
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
    attemptFetcher: stubAttempt(),
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
    attemptFetcher: stubAttempt(),
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
      attemptFetcher: stubAttempt(),
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
    root: repositoryRoot, io, fetcher: stubFetcher(), lister: stubLister(),
    downloader: stubDownloader(), attemptFetcher: stubAttempt(),
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
    // The WHOLE suite-summary family, because round nine showed the three
    // siblings of numFailedTestSuites were never read and a report could claim
    // zero total suites or one pending suite and still be certified. Real vitest
    // output emits all four — both fixtures in this repo carry them — so a
    // hand-built report that omits them is now correctly refused as
    // unreadable rather than quietly graded.
    numTotalTestSuites: 1, numPassedTestSuites: 1, numFailedTestSuites: 0, numPendingTestSuites: 0,
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
        lister: stubLister(), downloader: stubDownloader(), attemptFetcher: stubAttempt(),
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

// ---------------------------------------------------------------------------
// ROUND EIGHT (codex, independent). Each demonstrated open before being fixed.
// ---------------------------------------------------------------------------

test('A LYING EOCD COUNT CANNOT HIDE A SECOND EVIDENCE MEMBER', () => {
  // THE round-eight P1. Two members both named `vitest-report.json`, with the
  // EOCD count changed from 2 to 1 and its directory size cut to the first
  // record. The reader walked one entry and returned one name, so the
  // duplicate-name refusal downstream never saw the second copy and an ambiguous
  // archive graded as unambiguous evidence.
  const duplicated = [
    ['vitest-report.json', '{"first":true}'],
    ['vitest-report.json', '{"second":true}'],
  ];

  // The honest archive is already refused downstream — that is the control that
  // proves the check being bypassed is real.
  const honest = readZipEntries(buildZip(duplicated));
  assert.equal(honest.length, 2, 'both members must be visible when the count is honest');

  // And the lying one is refused HERE, before anything downstream can be misled.
  const lying = buildZip(duplicated, {
    countOverride: 1,
    directorySizeOverride: centralRecordLength('vitest-report.json'),
  });
  assert.throws(() => readZipEntries(lying), /CORRUPT_ZIP: the central directory declares/u);

  /*
   * The mirror case: a count that over-declares must not walk past the EOCD.
   *
   * THE MATCHER IS SPECIFIC ON PURPOSE. This assertion read `/CORRUPT_ZIP/`,
   * and round eight deleted `if (offset >= eocd)` and watched it still pass —
   * the next central-header signature check threw a different CORRUPT_ZIP and
   * satisfied the broad pattern. That is the third time in this file an
   * assertion has been satisfied by the wrong refusal, so every ZIP assertion
   * here now names the message it expects.
   */
  const overCounted = buildZip(duplicated, { countOverride: 3 });
  assert.throws(
    () => readZipEntries(overCounted),
    /the directory ended after/u,
    'the over-count guard must be what refuses this, not a later signature check',
  );
});

test('a count that leaves unread directory bytes is refused', () => {
  // Under-declaring by one, WITHOUT adjusting the directory size, must not be
  // read as a shorter archive — the trailing record is still there.
  const zip = buildZip([
    ['vitest-report.json', '{"a":1}'],
    ['other.json', '{"b":2}'],
  ], { countOverride: 1 });
  assert.throws(() => readZipEntries(zip), /bytes remain unread before the EOCD/u);
});

test('ZIP64 SENTINELS ARE REFUSED, not read as literal counts', () => {
  const zip = buildZip({ 'vitest-report.json': '{"a":1}' }, { zip64Count: true });
  assert.throws(() => readZipEntries(zip), /UNSUPPORTED_ZIP: Zip64/u);
});

test('A MEMBER NAME IS A NAME: dot segments and absolute paths are refused', () => {
  for (const name of ['../vitest-report.json', 'a/../../vitest-report.json',
    './vitest-report.json', '/vitest-report.json', 'a\\b.json']) {
    assert.throws(
      () => readZipEntries(buildZip({ [name]: '{"a":1}' })),
      /UNSAFE_ZIP_ENTRY/u,
      name,
    );
  }
  // And a plain nested name is still fine, so the guard does not cry wolf.
  assert.equal(readZipEntries(buildZip({ 'nested/report.json': '{"a":1}' }))[0].name,
    'nested/report.json');
});

test('AN ENTRY THAT IS NAMED TWO DIFFERENT THINGS IS REFUSED', () => {
  // One archive that reads as two different things depending on which copy of
  // the name a tool consults.
  const zip = buildZip({ 'vitest-report.json': '{"a":1}' }, { localNameOverride: 'other.json' });
  assert.throws(() => readZipEntries(zip), /its local header\s+calls it "other\.json"/u);
});

// ---------------------------------------------------------------------------
// ROUND NINE (codex, independent). Every one adjacent to a round-eight fix —
// the instance was closed and the class generator left running.
// ---------------------------------------------------------------------------

test('THE OPERANDS ARE VALIDATED, not only the relation between them', () => {
  // Round nine called the exported resolver with runId: '', workflow_run.id: ''
  // and expectedSha: 'not-a-commit' with a matching head_sha, and got back an
  // accepted source record. Every ownership comparison passed honestly:
  // '' === '' is true. Comparing two values nobody proved were identifiers is
  // the defect; the comparison never was.
  const base = {
    check: shippedCheck(), repo: REPO, expectedRunAttempt: ATTEMPT,
    attemptFetcher: stubAttempt(), downloader: stubDownloader(),
  };

  assert.throws(
    () => resolveEvidenceArtifact({
      ...base, runId: '', expectedSha: REAL_SHA, lister: stubLister(),
    }),
    /ARTIFACT_RUN_UNSHAPED/u,
    'an empty run id is not a run id',
  );
  assert.throws(
    () => resolveEvidenceArtifact({
      ...base, runId: 'abc', expectedSha: REAL_SHA, lister: stubLister(),
    }),
    /ARTIFACT_RUN_UNSHAPED/u,
  );
  assert.throws(
    () => resolveEvidenceArtifact({
      ...base, runId: RUN_ID, expectedSha: 'not-a-commit', lister: stubLister(),
    }),
    /ARTIFACT_SHA_UNSHAPED/u,
    'a truthy non-commit is not a commit',
  );
  assert.throws(
    () => resolveEvidenceArtifact({
      ...base, runId: RUN_ID, expectedSha: REAL_SHA, expectedRunAttempt: '', lister: stubLister(),
    }),
    /ARTIFACT_ATTEMPT_UNSHAPED/u,
    'an empty attempt is present-but-unshaped',
  );
  assert.throws(
    () => resolveEvidenceArtifact({
      ...base, runId: RUN_ID, expectedSha: REAL_SHA, expectedRunAttempt: undefined, lister: stubLister(),
    }),
    /ARTIFACT_ATTEMPT_UNBOUND/u,
    'an ABSENT attempt keeps its own message — collapsing the two lost this guard once',
  );
  assert.throws(
    () => resolveEvidenceArtifact({
      ...base, repo: 'not-a-repo', runId: RUN_ID, expectedSha: REAL_SHA, lister: stubLister(),
    }),
    /INVALID_REPO/u,
  );

  // And the well-shaped call still resolves, so the guard does not cry wolf.
  const ok = resolveEvidenceArtifact({
    ...base, runId: RUN_ID, expectedSha: REAL_SHA, lister: stubLister(),
  });
  assert.ok(ok.text.includes('testResults'));
});

test('THE WHOLE SUITE-SUMMARY FAMILY IS READ, not only the field that was reported', () => {
  // Round eight fixed numFailedTestSuites: -1. Round nine then set each of its
  // three siblings to -1, total to 0, and pending to 1 — every one still
  // printed PASS with zero violations, because those fields were never read.
  const base = JSON.parse(readFileSync(EXECUTED_EVIDENCE, 'utf8'));
  const graded = (overrides) => checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: parseVitestJsonReport(JSON.stringify({ ...base, ...overrides }), {
      workingDirectory: shippedCheck().workingDirectory,
    }),
  });

  for (const overrides of [
    { numTotalTestSuites: -1 }, { numPassedTestSuites: -1 }, { numPendingTestSuites: -1 },
    { numTotalTestSuites: 0 }, { numTotalTestSuites: 99 },
    /*
     * THE ZERO-SUITE CASE HAS TO BE INTERNALLY COHERENT OR IT PROVES NOTHING.
     *
     * `{ numTotalTestSuites: 0 }` alone leaves passed at 12, so the sum
     * mismatch refuses it and the `total > 0` clause is never consulted — round
     * ten deleted that clause and this test still passed. A report claiming
     * zero suites, zero passed, zero failed and zero pending adds up perfectly
     * and is still a report of a run that did not happen, so only positivity
     * can refuse it.
     */
    {
      numTotalTestSuites: 0, numPassedTestSuites: 0, numFailedTestSuites: 0,
      numPendingTestSuites: 0,
    },
  ]) {
    const result = graded(overrides);
    assert.equal(result.verdict, 'FAIL', JSON.stringify(overrides));
    assert.ok(
      result.violations.some((v) => v.reason === 'SUITE_SUMMARY_INCOHERENT'),
      JSON.stringify(overrides),
    );
  }

  // A pending suite never ran, which is the whole point of this checker.
  const pending = graded({ numPassedTestSuites: 11, numPendingTestSuites: 1 });
  assert.equal(pending.verdict, 'FAIL');
  assert.ok(pending.violations.some((v) => v.reason === 'REPORT_DECLARES_PENDING_SUITES'));

  // The untouched control still passes — over-firing is a defect too, and this
  // check was written wrong once already (it compared suites to file records,
  // which the real captured evidence proves are different units: 12 vs 6).
  assert.equal(graded({}).verdict, 'PASS');
});

test('THE ARCHIVE IS ONE CANONICAL WHOLE: no tail, no overlap', () => {
  const good = buildZip({ 'vitest-report.json': '{"a":1}' });

  // Bytes after the EOCD. Another reader may or may not see them; a gate that
  // grades an archive two tools describe differently is grading an opinion.
  assert.throws(
    () => readZipEntries(Buffer.concat([good, Buffer.from('GARBAGE')])),
    /does not end where it says/u,
  );

  // An EOCD declaring a comment that is not there.
  const lyingComment = Buffer.from(good);
  lyingComment.writeUInt16LE(4096, lyingComment.length - 2);
  assert.throws(() => readZipEntries(lyingComment), /does not end where it says/u);

  // And the honest archive still reads, so the bound is not always-on.
  assert.equal(readZipEntries(good)[0].name, 'vitest-report.json');
});

test('TWO ENTRIES MAY NOT CLAIM THE SAME BYTES', () => {
  /*
   * Round nine nested one entry's local header inside another entry's data, so
   * `vitest-report.json` was simultaneously a member of the archive and an
   * opaque region of `outer.bin` — and `resolveEvidenceArtifact` returned a
   * source record for it. Which of the two an arbitrary ZIP reader sees is not
   * determined by the format, so the archive has no single meaning.
   *
   * BUILT HONESTLY, because the first version of this test did not reach the
   * check it was named for. It pointed an offset into the middle of a deflate
   * stream, the local-header signature check threw first, and the assertion
   * `/CORRUPT_ZIP/` was satisfied by the wrong refusal — the mutation harness
   * caught it: the overlap branch could be deleted and this test still passed.
   * Both entries must PARSE for the overlap check to be the thing that fires,
   * so the outer entry is STORED and its payload is literally the inner entry's
   * local record.
   */
  const inner = buildZip({ 'vitest-report.json': '{"a":1}' }, { stored: true });
  const innerLocalLength = 30 + Buffer.byteLength('vitest-report.json') + '{"a":1}'.length;
  const innerLocal = inner.subarray(0, innerLocalLength);

  const zip = buildZip([
    ['outer.bin', Buffer.concat([Buffer.from('PAD'), innerLocal])],
    ['vitest-report.json', '{"a":1}'],
  ], { stored: true });

  // Repoint the report's local-header offset at the copy embedded in outer.bin.
  const directoryStart = 30 + Buffer.byteLength('outer.bin') + (3 + innerLocal.length)
    + 30 + Buffer.byteLength('vitest-report.json') + '{"a":1}'.length;
  const secondCentral = directoryStart + centralRecordLength('outer.bin');
  const overlapping = Buffer.from(zip);
  const embeddedAt = 30 + Buffer.byteLength('outer.bin') + 3;
  overlapping.writeUInt32LE(embeddedAt, secondCentral + 42);

  assert.throws(
    () => readZipEntries(overlapping),
    /claim the same bytes/u,
    'the overlap check must be what refuses this, not an earlier signature check',
  );
});

test('AN ENTRY MAY NOT RUN INTO THE CENTRAL DIRECTORY', () => {
  // The local-records region ends where the directory begins. An entry whose
  // declared bytes cross that line is describing a different archive.
  const zip = buildZip({ 'vitest-report.json': '{"a":1}' }, { stored: true });
  const overrun = Buffer.from(zip);
  const dataLength = '{"a":1}'.length;
  const nameLength = Buffer.byteLength('vitest-report.json');
  // BOTH headers, or the local/central size-disagreement check refuses it first
  // and this assertion passes without ever reaching the boundary rule — the
  // same wrong-throw trap that has now caught three assertions in this file.
  overrun.writeUInt32LE(dataLength + 64, 30 + nameLength + dataLength + 20); // central
  overrun.writeUInt32LE(dataLength + 64, 18); // local

  assert.throws(() => readZipEntries(overrun), /extends into the central directory/u);
});

test('EVERY ABSOLUTE SPELLING IS REFUSED, including the Windows one', () => {
  // The refusal's own name claimed absolute members were refused while
  // `C:/vitest-report.json` sailed through, and the downstream basename match
  // then selected it as the report.
  for (const name of ['C:/vitest-report.json', 'c:/vitest-report.json',
    'Z:/nested/vitest-report.json']) {
    assert.throws(
      () => readZipEntries(buildZip({ [name]: '{"a":1}' })),
      /UNSAFE_ZIP_ENTRY/u,
      name,
    );
  }
  // A colon that is not a drive letter is still a legal member name.
  assert.equal(
    readZipEntries(buildZip({ 'report:2026.json': '{"a":1}' }))[0].name,
    'report:2026.json',
  );
});

// ---------------------------------------------------------------------------
// ROUND TEN (codex, independent). Two classes, each already swept twice.
// ---------------------------------------------------------------------------

test('EVERY EXPORTED RESOLVER SHAPES ITS IDENTIFIERS, not just the one that was named', () => {
  /*
   * Round nine shaped the operands at `resolveEvidenceArtifact`. Round ten then
   * called `resolveProvenance` — the sibling boundary doing the same job — with
   * `repo: 'not/a/valid/repo'` and empty job/run/attempt ids, and got back an
   * accepted record of `{jobId:"", runId:"", runAttempt:""}`. Two copies of one
   * rule is one copy that will be missed, so both boundaries now share a helper.
   */
  const fetcher = () => ({
    head_sha: REAL_SHA, run_id: '', run_attempt: '', conclusion: 'success', status: 'completed',
  });
  const base = {
    check: shippedCheck(), expectedSha: REAL_SHA, fetcher,
  };

  assert.throws(
    () => resolveProvenance({
      ...base, repo: 'not/a/valid/repo', jobId: JOB_ID, expectedRunId: RUN_ID,
      expectedRunAttempt: ATTEMPT,
    }),
    /INVALID_REPO/u,
  );
  for (const [field, code] of [
    ['jobId', /PROVENANCE_JOB_UNSHAPED/u],
    ['expectedRunId', /PROVENANCE_RUN_UNSHAPED/u],
    ['expectedRunAttempt', /PROVENANCE_ATTEMPT_UNSHAPED/u],
  ]) {
    assert.throws(
      () => resolveProvenance({
        ...base,
        repo: REPO,
        jobId: JOB_ID,
        expectedRunId: RUN_ID,
        expectedRunAttempt: ATTEMPT,
        [field]: '',
      }),
      code,
      field,
    );
  }
  assert.throws(
    () => resolveProvenance({
      ...base, repo: REPO, jobId: JOB_ID, expectedRunId: RUN_ID, expectedRunAttempt: ATTEMPT,
      expectedSha: 'not-a-commit',
    }),
    /PROVENANCE_SHA_UNSHAPED/u,
  );

  // ABSENT is a different guarantee from UNSHAPED and keeps its own message.
  // The harness proved the run-id half of it had no control at all: deleting
  // `expectedRunId === undefined` left every test green, because every case
  // above passes a value and only ever exercises the shaping branch.
  assert.throws(
    () => resolveProvenance({
      ...base, repo: REPO, jobId: JOB_ID, expectedRunAttempt: ATTEMPT,
    }),
    /PROVENANCE_UNBOUND: expectedRunId is required/u,
  );
  assert.throws(
    () => resolveProvenance({
      ...base, repo: REPO, jobId: JOB_ID, expectedRunId: RUN_ID,
    }),
    /PROVENANCE_UNBOUND: expectedRunAttempt is required/u,
  );
});

test('THE ARTEFACT ID IS AN ID, even through the injectable seam', () => {
  // The default downloader validates it before building a URL. Round ten passed
  // `id: 'not-an-id'` through the seam and got an accepted source record naming
  // it — a guarantee that holds only for the default caller is a guarantee
  // about that caller, not about this function.
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
      lister: stubLister({ id: 'not-an-id' }),
      downloader: stubDownloader(),
    }),
    /ARTIFACT_ARTIFACT_ID_UNSHAPED/u,
  );
});

test('THE TWO HEADERS MUST AGREE ON EVERY FIELD THEY BOTH CARRY, not just the name', () => {
  /*
   * Round ten flipped ONLY the local header's compression method to stored
   * while the central said deflate, and the archive was accepted: this reader
   * follows the central copy, another reader follows the local one, and the two
   * decode the same bytes to different content. Checking the name and stopping
   * was the same instance-not-class mistake — the name is one of four
   * duplicated fields, so the other three were unguarded.
   */
  const zip = buildZip({ 'vitest-report.json': '{"a":1}' });
  const nameLength = Buffer.byteLength('vitest-report.json');

  const fields = [
    ['compression method', 8, 0, /compression method/u],
    ['CRC', 14, 0xdeadbeef, /CRC/u],
    ['compressed size', 18, 999, /compressed size/u],
    ['uncompressed size', 22, 999, /uncompressed size/u],
  ];
  for (const [label, offset, value, pattern] of fields) {
    const mutant = Buffer.from(zip);
    if (offset === 8) mutant.writeUInt16LE(value, offset);
    else mutant.writeUInt32LE(value, offset);
    assert.throws(() => readZipEntries(mutant), pattern, label);
  }

  // The honest archive still reads, so the agreement check is not always-on.
  assert.equal(readZipEntries(zip)[0].name, 'vitest-report.json');

  /*
   * A STREAMED ENTRY IS REFUSED, and this assertion is the reverse of what it
   * said one round ago.
   *
   * It used to assert that a streamed entry was ACCEPTED, on the reasoning that
   * refusing it would over-fire on a construct the format allows. Round nine
   * then set localFlags=8 with centralFlags=0, zeroed the local crc and sizes,
   * wrote no data descriptor at all, and walked through the exception — the
   * four bytes where APPNOTE 4.3.9.1 requires a descriptor were the next
   * central header.
   *
   * Honouring half of a format feature is worse than not implementing it. The
   * exception is gone, and actions/upload-artifact does not stream, so nothing
   * real is refused.
   */
  const streamed = Buffer.from(zip);
  streamed.writeUInt16LE(0x08, 6);
  streamed.writeUInt32LE(0, 14);
  streamed.writeUInt32LE(0, 18);
  streamed.writeUInt32LE(0, 22);
  assert.throws(() => readZipEntries(streamed), /streamed entry/u);
  void nameLength;
});

test('THE INDEXED ENTRIES MUST ACCOUNT FOR EVERY BYTE, so nothing can hide in a gap', () => {
  /*
   * Overlap alone was not enough. Round nine put a SECOND complete local record
   * named `vitest-report.json` in the GAP between two indexed extents: nothing
   * overlapped, the directory declared only the first, and the reader accepted
   * the indexed payload while a same-named record sat unread in the archive —
   * a file another ZIP reader may hand back instead.
   */
  const honest = buildZip([
    ['a.json', '{"a":1}'],
    ['b.json', '{"b":2}'],
  ], { stored: true });

  /*
   * THE TRAILING CASE: the last entry is unindexed, so the gap sits between the
   * final indexed extent and the central directory. The EOCD is entirely
   * self-consistent — this is a well-formed archive that simply does not
   * mention one of its own records.
   *
   * The assertions name their messages. The first version of this test asserted
   * `/CORRUPT_ZIP/` and was satisfied by the directory-span check firing first,
   * so both tiling mutants survived it. That is the FOURTH assertion in this
   * file caught by the wrong throw, which is why none of them are broad now.
   */
  const trailing = buildZip([
    ['a.json', '{"a":1}'],
    ['b.json', '{"b":2}'],
  ], { stored: true, omitFromDirectory: ['b.json'] });
  assert.throws(
    () => readZipEntries(trailing),
    /between the last indexed entry and the\s+central directory/u,
    'the trailing-gap rule must be what refuses this',
  );

  // THE INTERIOR CASE: the unindexed record sits between two indexed ones.
  const interior = buildZip([
    ['a.json', '{"a":1}'],
    ['hidden.json', '{"h":3}'],
    ['b.json', '{"b":2}'],
  ], { stored: true, omitFromDirectory: ['hidden.json'] });
  assert.throws(
    () => readZipEntries(interior),
    /unindexed byte\(s\) sit before/u,
    'the interior-gap rule must be what refuses this',
  );

  // The honest archive still reads both, so the tiling rule is not always-on.
  assert.deepEqual(readZipEntries(honest).map((e) => e.name), ['a.json', 'b.json']);
});

test('A NEGATIVE FAILED-SUITE COUNT IS UNVERIFIABLE, never a pass', () => {
  // The round-eight P1: `Number.isInteger` accepts negatives, and the decision
  // path refused only `null` and `> 0`, so `-1` reached PASS with no violations.
  const base = JSON.parse(readFileSync(EXECUTED_EVIDENCE, 'utf8'));

  for (const value of [-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2, '0', null]) {
    const parsed = parseVitestJsonReport(
      JSON.stringify({ ...base, numFailedTestSuites: value }),
      { expectedRoot: null },
    );
    assert.equal(parsed.failedSuites, null, JSON.stringify(value));
  }

  // Zero is still zero, and a real failure count is still read.
  assert.equal(
    parseVitestJsonReport(JSON.stringify({ ...base, numFailedTestSuites: 0 }), { expectedRoot: null })
      .failedSuites,
    0,
  );
  assert.equal(
    parseVitestJsonReport(JSON.stringify({ ...base, numFailedTestSuites: 3 }), { expectedRoot: null })
      .failedSuites,
    3,
  );
});

test('every reported count is validated, not only the one that was demonstrated', () => {
  const base = JSON.parse(readFileSync(EXECUTED_EVIDENCE, 'utf8'));
  const fields = ['numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests',
    'numTodoTests'];

  for (const field of fields) {
    const parsed = parseVitestJsonReport(
      JSON.stringify({ ...base, [field]: -1 }),
      { expectedRoot: null },
    );
    const key = { numTotalTests: 'total', numPassedTests: 'passed', numFailedTests: 'failed',
      numPendingTests: 'pending', numTodoTests: 'todo' }[field];
    assert.equal(parsed.reported[key], null, field);
  }
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
      expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
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
      expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
      lister: stubLister({ workflow_run: { id: Number(RUN_ID), head_sha: OTHER_SHA } }),
      downloader: stubDownloader(),
    }),
    /ARTIFACT_FOREIGN_SHA/,
  );
});

test('ABSENT OWNERSHIP IS REFUSED, not skipped past (round-eight P1)', () => {
  // Both ownership checks read `x !== undefined && x !== expected`, so an
  // artefact carrying no `workflow_run` at all skipped both and was accepted —
  // while this file's header claimed the evidence is re-bound to the resolved
  // run and commit. The mutation harness then proved the fix had no test: R23,
  // R24 and R25 all survived until these three cases existed.
  const cases = [
    [{ workflow_run: undefined }, /ARTIFACT_OWNERSHIP_UNVERIFIABLE.*no workflow_run/su],
    [{ workflow_run: null }, /ARTIFACT_OWNERSHIP_UNVERIFIABLE.*no workflow_run/su],
    [{ workflow_run: [] }, /ARTIFACT_OWNERSHIP_UNVERIFIABLE.*no workflow_run/su],
    [{ workflow_run: { head_sha: REAL_SHA } }, /ARTIFACT_OWNERSHIP_UNVERIFIABLE.*owning run id/su],
    [{ workflow_run: { id: Number(RUN_ID) } }, /ARTIFACT_OWNERSHIP_UNVERIFIABLE.*owning head_sha/su],
    [{ workflow_run: { id: Number(RUN_ID), head_sha: '' } },
      /ARTIFACT_OWNERSHIP_UNVERIFIABLE.*owning head_sha/su],
    // ROUND NINE: the relation was checked, the operands never were. An empty
    // owning run id compared equal to an empty runId.
    [{ workflow_run: { id: '', head_sha: REAL_SHA } },
      /ARTIFACT_OWNERSHIP_UNVERIFIABLE.*numeric owning run id/su],
    [{ workflow_run: { id: 'abc', head_sha: REAL_SHA } },
      /ARTIFACT_OWNERSHIP_UNVERIFIABLE.*numeric owning run id/su],
    [{ workflow_run: { id: Number(RUN_ID), head_sha: 'not-a-commit' } },
      /ARTIFACT_OWNERSHIP_UNVERIFIABLE.*40-hex owning head_sha/su],
  ];

  for (const [override, pattern] of cases) {
    assert.throws(
      () => resolveEvidenceArtifact({
        check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
        expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
        lister: stubLister(override),
        downloader: stubDownloader(),
      }),
      pattern,
      JSON.stringify(override),
    );
  }
});

test('an artefact cannot be bound to a commit that was never resolved', () => {
  // The sha check used to be `expectedSha && ...`, so calling without a resolved
  // commit skipped commit binding entirely rather than refusing.
  const check = { ...shippedCheck(), artifact: 'spine-test-evidence' };
  assert.throws(
    () => resolveEvidenceArtifact({
      check, repo: REPO, runId: RUN_ID, expectedSha: null,
      expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
      lister: () => ({
        artifacts: [{
          id: ARTIFACT_ID,
          name: 'spine-test-evidence',
          expired: false,
          created_at: ARTIFACT_CREATED,
          workflow_run: { id: Number(RUN_ID), head_sha: REAL_SHA },
        }],
      }),
      downloader: stubDownloader(),
    }),
    /ARTIFACT_SHA_UNBOUND/u,
  );
});

test('an expired artefact is absent evidence, not empty evidence', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
      lister: stubLister({ expired: true }), downloader: stubDownloader(),
    }),
    /ARTIFACT_EXPIRED/,
  );
});

test('a run that uploaded no evidence is a refusal, never a vacuous pass', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
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
      expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
      lister: twice, downloader: stubDownloader(),
    }),
    /ARTIFACT_AMBIGUOUS/,
  );
});

test('an artefact without the declared report entry is refused', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
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
      expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
      lister: stubLister(), downloader: stubDownloader(SKIPPED_EVIDENCE, entry),
    });
    assert.ok(fetched.text.includes('testResults'), entry);
  }
});

test('two entries answering to the same report name are refused, not picked between', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
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

// ---------------------------------------------------------------------------
// ROUND SEVEN. Each demonstrated open against 406572db0 before being fixed.
// ---------------------------------------------------------------------------

test('A MISSING FILE VERDICT IS NOT A PASSING ONE', () => {
  // Round six added a guard for the wrong VALUE and round seven walked past it by
  // deleting `status` from all six file records: `fileStatus !== null` skipped the
  // check and the report was certified with zero violations. Guarding a bad value
  // without guarding an absent one just moves the hole.
  const result = graded(executedReport((report) => {
    for (const file of report.testResults) delete file.status;
  }));

  assert.equal(result.verdict, 'FAIL');
  const absent = result.violations.filter((v) => v.reason === 'SUITE_FILE_VERDICT_ABSENT');
  assert.equal(absent.length, 6, JSON.stringify(result.violations.map((v) => v.reason)));
});

test('one file missing its verdict is enough to fail', () => {
  const result = graded(executedReport((report) => { delete report.testResults[0].status; }));
  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'SUITE_FILE_VERDICT_ABSENT'));
});

test("ATTEMPT 1'S ARTEFACT CANNOT CERTIFY ATTEMPT 2", () => {
  // GitHub exposes no attempt field on an artefact and has no attempt-scoped
  // listing (both verified live against the API), so a partial re-run carries the
  // earlier attempt's artefacts forward. Round seven certified attempt 2 with
  // attempt 1's bytes. Creation time is the binding that is actually available.
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(),
      repo: REPO,
      runId: RUN_ID,
      expectedSha: REAL_SHA,
      expectedRunAttempt: '2',
      lister: stubLister({ created_at: '2026-08-16T00:00:00Z' }),
      downloader: stubDownloader(),
      attemptFetcher: stubAttempt({ run_attempt: 2, run_started_at: '2026-08-16T09:00:00Z' }),
    }),
    /ARTIFACT_PRECEDES_ATTEMPT/,
  );
});

test('an artefact created DURING its attempt is accepted, so reruns still gate', () => {
  // The other direction: a guard that refused every rerun would be disabled by
  // the first engineer it blocked.
  const fetched = resolveEvidenceArtifact({
    check: shippedCheck(),
    repo: REPO,
    runId: RUN_ID,
    expectedSha: REAL_SHA,
    expectedRunAttempt: '2',
    lister: stubLister({ created_at: '2026-08-16T09:30:00Z' }),
    downloader: stubDownloader(),
    attemptFetcher: stubAttempt({ run_attempt: 2, run_started_at: '2026-08-16T09:00:00Z' }),
  });
  assert.ok(fetched.text.includes('testResults'));
  assert.equal(fetched.source.runAttempt, '2');
});

test('resolveEvidenceArtifact refuses an unbound attempt rather than defaulting', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      lister: stubLister(), downloader: stubDownloader(), attemptFetcher: stubAttempt(),
    }),
    /ARTIFACT_ATTEMPT_UNBOUND/,
  );
});

test('an attempt endpoint answering for a different attempt is refused', () => {
  assert.throws(
    () => resolveEvidenceArtifact({
      check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
      expectedRunAttempt: '2',
      lister: stubLister(), downloader: stubDownloader(),
      attemptFetcher: stubAttempt({ run_attempt: 1 }),
    }),
    /ATTEMPT_MISMATCH/,
  );
});

test('missing timestamps are UNVERIFIABLE, not assumed in order', () => {
  for (const [listerOverride, attemptOverride] of [
    [{ created_at: null }, {}],
    [{}, { run_started_at: undefined }],
    [{ created_at: 'not-a-date' }, {}],
  ]) {
    assert.throws(
      () => resolveEvidenceArtifact({
        check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
        expectedRunAttempt: ATTEMPT,
        lister: stubLister(listerOverride),
        downloader: stubDownloader(),
        attemptFetcher: stubAttempt(attemptOverride),
      }),
      /ARTIFACT_TIME_UNVERIFIABLE/,
      JSON.stringify(listerOverride),
    );
  }
});

test('THE EVIDENCE RECORD NAMES THE MEMBER IT ACTUALLY GRADED', () => {
  // Reporting the declared name labelled `nested/vitest-report.json` as
  // `vitest-report.json`. A provenance record that names a different file from
  // the one it describes is worse than no record, and the previous nested-layout
  // test asserted the false label.
  const fetched = resolveEvidenceArtifact({
    check: shippedCheck(), repo: REPO, runId: RUN_ID, expectedSha: REAL_SHA,
    expectedRunAttempt: ATTEMPT, attemptFetcher: stubAttempt(),
    lister: stubLister(),
    downloader: stubDownloader(SKIPPED_EVIDENCE, 'nested/vitest-report.json'),
  });

  assert.equal(fetched.source.entry, 'nested/vitest-report.json');
  assert.equal(fetched.source.declaredEntry, 'vitest-report.json');
});
