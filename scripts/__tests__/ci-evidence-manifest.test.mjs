import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PROTECTED_CATEGORIES,
  checkEvidenceCompleteness,
  extractProvenanceSha,
  loadManifest,
  main,
  normaliseJobLog,
  parseVitestEvidence,
  resolveCheck,
  validateManifest,
} from '../ci-evidence-manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, '..', '..');
const fixtures = join(here, 'fixtures');

/**
 * Real CI output, byte-for-byte. Monorepo CI run 31928303697, job 95119197937.
 * The log's own checkout step proves the SHA below; the job concluded `success`.
 */
const REAL_RAW_LOG = join(fixtures, 'spine-required-job-95119197937.raw.log');
const REAL_SHA = 'd1d57b8e5745e90259f2799cb9086e4a62689318';

/** Synthetic. Positive control only — see fixtures/README.md. */
const SYNTHETIC_LOG = join(fixtures, 'spine-all-executed.synthetic.log');
const SYNTHETIC_SHA = '0123456789abcdef0123456789abcdef01234567';

const SPINE_CHECK_ID = 'spine-required-tests';
const NULL_IO = { log: () => {}, error: () => {} };

function readFixture(path) {
  return readFileSync(path, 'utf8');
}

function shippedCheck() {
  return resolveCheck(loadManifest(repositoryRoot), SPINE_CHECK_ID);
}

// ---------------------------------------------------------------------------
// Normalisation — the defect that made the first revision unusable.
// ---------------------------------------------------------------------------

test('THE REGRESSION: an untouched raw CI log parses, ANSI and timestamps and all', () => {
  const raw = readFixture(REAL_RAW_LOG);

  // Prove the fixture really is un-normalised, so this test cannot silently
  // start asserting against pre-cleaned input.
  assert.ok(raw.includes('\u001b['), 'fixture must still contain ANSI escapes');
  assert.match(raw, /\n\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z /u);
  assert.ok(raw.charCodeAt(0) === 0xfeff, 'fixture must retain the raw log BOM');

  const observed = parseVitestEvidence(raw);

  assert.equal(observed.suites.length, 6);
  assert.deepEqual(observed.totals, { executed: 3, skipped: 19, todo: 0, declared: 22 });
});

test('normaliseJobLog strips the Actions timestamp prefix and ANSI colouring', () => {
  const raw = '2026-08-16T05:08:46.1616489Z  \u001b[2m\u001b[90m\u2193\u001b[39m\u001b[22m x.test.ts \u001b[2m(\u001b[22m4 tests\u001b[2m)\u001b[22m';
  assert.equal(normaliseJobLog(raw), ' \u2193 x.test.ts (4 tests)');
});

// ---------------------------------------------------------------------------
// Provenance — a report may not be replayed as evidence for another commit.
// ---------------------------------------------------------------------------

test('the SHA is derived from the log, not taken from the caller', () => {
  assert.equal(extractProvenanceSha(normaliseJobLog(readFixture(REAL_RAW_LOG))), REAL_SHA);
  assert.equal(extractProvenanceSha(normaliseJobLog(readFixture(SYNTHETIC_LOG))), SYNTHETIC_SHA);
});

test('a log with no checkout evidence is refused rather than graded', () => {
  assert.equal(extractProvenanceSha(' RUN  v4.1.10 /x\n x.test.ts (1 test)\n Tests  1 passed (1)'), null);
});

test('THE FORGERY, CLOSED: the committed green fixture cannot pass for another SHA', () => {
  const errors = [];
  const status = main(
    ['--check', SPINE_CHECK_ID, '--report', SYNTHETIC_LOG, '--sha', REAL_SHA, '--gate'],
    { root: repositoryRoot, io: { log: () => {}, error: (line) => errors.push(line) } },
  );

  assert.equal(status, 2);
  assert.ok(errors.some((line) => line.includes('PROVENANCE_MISMATCH')));
  assert.ok(errors.some((line) => line.includes(SYNTHETIC_SHA)));
});

test('a non-SHA --sha is refused outright', () => {
  const errors = [];
  const status = main(
    ['--check', SPINE_CHECK_ID, '--report', SYNTHETIC_LOG, '--sha', 'TOTALLY-MADE-UP', '--gate'],
    { root: repositoryRoot, io: { log: () => {}, error: (line) => errors.push(line) } },
  );

  assert.equal(status, 2);
  assert.ok(errors.some((line) => line.includes('40-character hex')));
});

test('--sha is mandatory; it cannot be omitted to skip the provenance bind', () => {
  const status = main(
    ['--check', SPINE_CHECK_ID, '--report', REAL_RAW_LOG, '--gate'],
    { root: repositoryRoot, io: NULL_IO },
  );
  assert.equal(status, 2);
});

// ---------------------------------------------------------------------------
// The finding, and its positive control.
// ---------------------------------------------------------------------------

test('THE FINDING: the real required job is GREEN while tenant-isolation evidence never executed', () => {
  const observed = parseVitestEvidence(readFixture(REAL_RAW_LOG));
  const result = checkEvidenceCompleteness({ check: shippedCheck(), observed, sha: REAL_SHA });

  assert.equal(result.verdict, 'FAIL');

  const notExecuted = result.violations
    .filter((violation) => violation.reason === 'REQUIRED_EVIDENCE_NOT_EXECUTED')
    .map((violation) => violation.suite)
    .sort();
  assert.deepEqual(notExecuted, [
    'tests/integration/c3_completeness.test.ts',
    'tests/integration/idempotency.test.ts',
    'tests/integration/match_isolation.test.ts',
    'tests/integration/outbox_race.test.ts',
    'tests/integration/rls.test.ts',
  ]);

  const isolation = result.violations.find((v) => v.suite === 'tests/integration/rls.test.ts');
  assert.equal(isolation.category, 'tenant-isolation');
  assert.equal(isolation.class, 'REQUIRED_EVIDENCE');
});

test('POSITIVE CONTROL: PASS is reachable when every declared suite executed', () => {
  const observed = parseVitestEvidence(readFixture(SYNTHETIC_LOG));
  const result = checkEvidenceCompleteness({ check: shippedCheck(), observed, sha: SYNTHETIC_SHA });

  assert.equal(result.verdict, 'PASS');
  assert.deepEqual(result.violations, []);
  assert.equal(result.evidence.length, 6);
});

test('main: exit 1 on the real skipped run under --gate, exit 0 on the executed control', () => {
  const errors = [];
  const io = { log: () => {}, error: (line) => errors.push(line) };

  assert.equal(
    main(['--check', SPINE_CHECK_ID, '--report', REAL_RAW_LOG, '--sha', REAL_SHA, '--gate'],
      { root: repositoryRoot, io }),
    1,
  );
  assert.ok(errors.some((line) => line.includes('tests/integration/rls.test.ts')));

  assert.equal(
    main(['--check', SPINE_CHECK_ID, '--report', SYNTHETIC_LOG, '--sha', SYNTHETIC_SHA, '--gate'],
      { root: repositoryRoot, io }),
    0,
  );
});

test('main without --gate reports the finding but does not fail: DISARMED as a gate', () => {
  assert.equal(
    main(['--check', SPINE_CHECK_ID, '--report', REAL_RAW_LOG, '--sha', REAL_SHA],
      { root: repositoryRoot, io: NULL_IO }),
    0,
  );
});

test('--json emits a machine-readable record carrying the proven SHA', () => {
  const outputs = [];
  main(['--check', SPINE_CHECK_ID, '--report', REAL_RAW_LOG, '--sha', REAL_SHA, '--json'],
    { root: repositoryRoot, io: { log: (line) => outputs.push(line), error: () => {} } });

  const record = JSON.parse(outputs.join('\n'));
  assert.equal(record.sha, REAL_SHA);
  assert.equal(record.verdict, 'FAIL');
  assert.equal(record.summary.skipped, 19);
  assert.equal(record.evidence.length, 6);
});

// ---------------------------------------------------------------------------
// Silence is never success.
// ---------------------------------------------------------------------------

test('a run truncated before the summary is INCOMPLETE, not a clean pass', () => {
  const full = normaliseJobLog(readFixture(SYNTHETIC_LOG));
  const truncated = full.slice(0, full.indexOf(' Test Files'));

  const observed = parseVitestEvidence(truncated);
  assert.equal(observed.summary, null);

  const result = checkEvidenceCompleteness({ check: shippedCheck(), observed, sha: SYNTHETIC_SHA });
  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'INCOMPLETE_REPORT'));
});

test('per-suite lines that disagree with the reporter summary fail as SUMMARY_MISMATCH', () => {
  const doctored = normaliseJobLog(readFixture(SYNTHETIC_LOG))
    .replace('      Tests  22 passed (22)', '      Tests  40 passed (40)');

  const result = checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: parseVitestEvidence(doctored),
    sha: SYNTHETIC_SHA,
  });

  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'SUMMARY_MISMATCH'));
});

test('an empty report is FAIL, and is distinguishable from a clean pass', () => {
  const result = checkEvidenceCompleteness({
    check: shippedCheck(),
    observed: parseVitestEvidence(''),
    sha: SYNTHETIC_SHA,
  });

  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'INCOMPLETE_REPORT'));
  assert.equal(result.violations.filter((v) => v.reason === 'REQUIRED_EVIDENCE_UNAVAILABLE').length, 6);
});

// ---------------------------------------------------------------------------
// Only the reporter's own section counts as evidence.
// ---------------------------------------------------------------------------

test('a suite line forged outside the reporter section is not evidence', () => {
  const forged = [
    '[command]/usr/bin/git -c protocol.version=2 fetch origin +0123456789abcdef0123456789abcdef01234567:refs/remotes/origin/main',
    'stdout | some.test.ts > logs a line',
    ' \u2713 tests/integration/rls.test.ts (4 tests) 604ms',
    ' RUN  v4.1.10 /home/runner/work/x',
    ' \u2713 tests/unit.test.ts (3 tests) 5ms',
    ' Test Files  1 passed (1)',
    '      Tests  3 passed (3)',
  ].join('\n');

  const observed = parseVitestEvidence(forged);
  assert.deepEqual(observed.suites.map((s) => s.suite), ['tests/unit.test.ts']);
});

test('lines after the summary are outside the section too', () => {
  const trailing = [
    ' RUN  v4.1.10 /x',
    ' \u2713 tests/unit.test.ts (3 tests) 5ms',
    '      Tests  3 passed (3)',
    ' \u2713 tests/integration/rls.test.ts (4 tests) 604ms',
  ].join('\n');

  assert.deepEqual(parseVitestEvidence(trailing).suites.map((s) => s.suite), ['tests/unit.test.ts']);
});

// ---------------------------------------------------------------------------
// Count parsing.
// ---------------------------------------------------------------------------

test('failed and todo suites parse; failures count as executed, todo does not', () => {
  const observed = parseVitestEvidence([
    ' RUN  v4.1.10 /x',
    ' \u00d7 a.test.ts (4 tests | 2 failed)',
    ' \u2713 b.test.ts (5 tests | 1 todo)',
    ' \u00d7 c.test.ts (6 tests | 2 failed | 1 skipped)',
    ' \u2713 d.test.ts (1 test)',
    '      Tests  16 passed (16)',
  ].join('\n'));

  const byName = new Map(observed.suites.map((s) => [s.suite, s]));
  assert.equal(byName.get('a.test.ts').executed, 4);
  assert.equal(byName.get('a.test.ts').failed, 2);
  assert.equal(byName.get('b.test.ts').executed, 4);
  assert.equal(byName.get('b.test.ts').todo, 1);
  assert.equal(byName.get('c.test.ts').executed, 5);
  assert.equal(byName.get('d.test.ts').executed, 1);
  assert.equal(byName.get('d.test.ts').status, 'EXECUTED');
});

test('a line claiming more skipped than declared is MALFORMED, never a negative count', () => {
  const observed = parseVitestEvidence(' RUN  v4.1.10 /x\n \u2193 a.test.ts (2 tests | 5 skipped)\n      Tests  0 passed (0)');

  assert.deepEqual(observed.suites, []);
  assert.equal(observed.malformed.length, 1);
  assert.equal(observed.totals.executed, 0);

  const result = checkEvidenceCompleteness({
    check: { id: 'x', requiredCheck: 'x', suites: [{ suite: 'a.test.ts', class: 'REQUIRED_EVIDENCE', category: 'unit' }] },
    observed,
    sha: SYNTHETIC_SHA,
  });
  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.violations.some((v) => v.reason === 'MALFORMED_SUITE_LINE'));
});

test('the suite path is captured whole, not shaved by the preceding glyph column', () => {
  const withGlyph = parseVitestEvidence(' RUN  v4.1.10 /x\n \u2713 tests/integration/rls.test.ts (4 tests) 604ms\n      Tests  4 passed (4)');
  const withoutGlyph = parseVitestEvidence(' RUN  v4.1.10 /x\ntests/integration/rls.test.ts (4 tests) 604ms\n      Tests  4 passed (4)');

  assert.equal(withGlyph.suites[0].suite, 'tests/integration/rls.test.ts');
  assert.equal(withoutGlyph.suites[0].suite, 'tests/integration/rls.test.ts');
});

// ---------------------------------------------------------------------------
// The manifest is the gate's own attack surface.
// ---------------------------------------------------------------------------

test('a check declaring no suites is rejected: an empty check would pass vacuously', () => {
  assert.throws(
    () => validateManifest({ checks: [{ id: 'empty', requiredCheck: 'x', suites: [] }] }),
    /no suites/,
  );
});

test('duplicate check ids are rejected rather than silently shadowed', () => {
  assert.throws(
    () => validateManifest({
      checks: [
        { id: 'dup', requiredCheck: 'x', suites: [{ suite: 'a.test.ts', class: 'REQUIRED_EVIDENCE', category: 'unit' }] },
        { id: 'dup', requiredCheck: 'y', suites: [{ suite: 'b.test.ts', class: 'REQUIRED_EVIDENCE', category: 'unit' }] },
      ],
    }),
    /duplicate check id/,
  );
});

test('a suite declared twice in one check is rejected', () => {
  assert.throws(
    () => validateManifest({
      checks: [{
        id: 'x',
        requiredCheck: 'x',
        suites: [
          { suite: 'a.test.ts', class: 'REQUIRED_EVIDENCE', category: 'unit' },
          { suite: 'a.test.ts', class: 'ALLOWED_NON_BLOCKING', category: 'unit' },
        ],
      }],
    }),
    /duplicate suite/,
  );
});

test('THE ONE-WORD BYPASS, CLOSED: a protected category cannot be ALLOWED_NON_BLOCKING', () => {
  for (const category of PROTECTED_CATEGORIES) {
    assert.throws(
      () => validateManifest({
        checks: [{
          id: 'x',
          requiredCheck: 'x',
          suites: [{ suite: 'a.test.ts', class: 'ALLOWED_NON_BLOCKING', category }],
        }],
      }),
      /must be REQUIRED_EVIDENCE/,
      `category ${category} must be protected`,
    );
  }
});

test('RELABELLING, CLOSED: a security-critical suite cannot escape via its category', () => {
  for (const suite of ['tests/integration/rls.test.ts', 'tests/integration/match_isolation.test.ts']) {
    // Relabel to something unprotected, then try to mark it non-blocking.
    assert.throws(
      () => validateManifest({
        checks: [{ id: 'x', requiredCheck: 'x', suites: [{ suite, class: 'ALLOWED_NON_BLOCKING', category: 'misc' }] }],
      }),
      /must be REQUIRED_EVIDENCE|security-critical by path/,
      suite,
    );
    // Even kept REQUIRED_EVIDENCE, an unprotected label is refused.
    assert.throws(
      () => validateManifest({
        checks: [{ id: 'x', requiredCheck: 'x', suites: [{ suite, class: 'REQUIRED_EVIDENCE', category: 'misc' }] }],
      }),
      /security-critical by path/,
      suite,
    );
  }
});

test('ALLOWED_NON_BLOCKING still works for an unprotected category', () => {
  const check = {
    id: 'x',
    requiredCheck: 'x',
    suites: [{ suite: 'tests/unit.test.ts', class: 'ALLOWED_NON_BLOCKING', category: 'lint-smoke' }],
  };
  validateManifest({ checks: [check] });

  const observed = parseVitestEvidence(
    ' RUN  v4.1.10 /x\n \u2193 tests/unit.test.ts (3 tests | 3 skipped)\n      Tests  0 passed | 3 skipped (3)',
  );
  const result = checkEvidenceCompleteness({ check, observed, sha: SYNTHETIC_SHA });

  assert.equal(result.verdict, 'PASS');
  assert.equal(result.evidence[0].status, 'SKIPPED');
});

test('malformed manifest JSON is reported, not swallowed', () => {
  assert.throws(() => loadManifest(join(here, 'fixtures')), /ENOENT|not valid JSON/);
});

test('resolveCheck refuses an unknown check id rather than returning an empty pass', () => {
  assert.throws(() => resolveCheck(loadManifest(repositoryRoot), 'no-such-check'), /no-such-check/);
});

// ---------------------------------------------------------------------------
// Staleness: the manifest must track the tree, recursively and across extensions.
// ---------------------------------------------------------------------------

test('the shipped manifest declares every spine test file on disk, at any depth', () => {
  const check = shippedCheck();
  // Resolved from the manifest, not hardcoded: workingDirectory is a live field,
  // so a wrong value fails here instead of sitting in the file as decoration.
  assert.equal(typeof check.workingDirectory, 'string');
  const spineTests = join(repositoryRoot, ...check.workingDirectory.split('/'), 'tests');

  const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.test\.[cm]?[jt]sx?$/u.test(entry.name)
      ? [relative(join(spineTests, '..'), full).split('\\').join('/')]
      : [];
  });

  assert.deepEqual(check.suites.map((s) => s.suite).sort(), walk(spineTests).sort());
});

test('every shipped manifest entry survives full validation', () => {
  const manifest = loadManifest(repositoryRoot);
  assert.ok(manifest.checks.length > 0);
  for (const check of manifest.checks) {
    assert.ok(check.suites.length > 0);
    assert.equal(typeof check.requiredCheck, 'string');
  }
});
