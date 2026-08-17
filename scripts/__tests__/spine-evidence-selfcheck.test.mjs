/**
 * UNI-2580 — proves two things:
 *
 *   1. THE DEFECT, empirically. The real vitest evidence from a live CI run
 *      (spine-skipped.vitest.json — 19 of 22 self-skipped for want of
 *      SPINE_DATABASE_URL, see fixtures/README.md) fails the completeness
 *      check, and the synthetic all-executed fixture — the positive control —
 *      passes it. That pairing is the proof: a checker that could only ever
 *      say FAIL would not be evidence of anything, and one that could only
 *      ever say PASS would not be a gate.
 *   2. THE FIX IS WIRED, not just written. The required
 *      "packages/spine — type-check and bounded tests" job in ci.yml actually
 *      calls scripts/spine-evidence-selfcheck.mjs between generating the
 *      report and uploading it, so a run producing evidence shaped like
 *      fixture (1) now fails the job itself instead of merely being uploaded
 *      for someone to notice later.
 *
 * The two "the required spine job …" tests below were RED before this change:
 * ci.yml's spine job ran type-check, test, and upload — nothing read the
 * report it had just written, so the job could and did conclude `success`
 * with 19 of 22 tests never executed (live CI job 95119197937).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { main, runSelfCheck } from '../spine-evidence-selfcheck.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const fixtures = join(here, 'fixtures');

/** Real vitest output, 19 of 22 tests self-skipped. See fixtures/README.md. */
const SKIPPED_EVIDENCE = join(fixtures, 'spine-skipped.vitest.json');
/** Synthetic positive control: every skipped assertion flipped to passed. */
const EXECUTED_EVIDENCE = join(fixtures, 'spine-all-executed.synthetic.vitest.json');

const SPINE_CHECK_ID = 'spine-required-tests';
/** The prefix baked into both fixtures' absolute test-file paths. */
const CI_ROOT = '/home/runner/work/Unite-Group/Unite-Group';

const NULL_IO = { log: () => {}, error: () => {} };

// ── the workflow is actually wired ──────────────────────────────────────────

/**
 * Extracts the `spine:` job block as raw text, the same deliberately-literal
 * approach preflight.test.mjs uses to read ci.yml — a real YAML parser would
 * be more code and another dependency for a stdlib-only readiness kernel.
 */
function spineJobBlock() {
  const text = readFileSync(resolve(repoRoot, '.github/workflows/ci.yml'), 'utf8');
  const lines = text.split('\n');
  const start = lines.findIndex((line) => /^ {2}spine:\s*$/.test(line));
  assert.notEqual(start, -1, 'ci.yml must declare a top-level `spine:` job');
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^ {2}\S/.test(line));
  return rest.slice(0, end === -1 ? rest.length : end).join('\n');
}

test('the required spine job calls the evidence completeness check', () => {
  const block = spineJobBlock();
  assert.ok(
    block.includes('scripts/spine-evidence-selfcheck.mjs'),
    'the spine job must run scripts/spine-evidence-selfcheck.mjs — without it the job can '
      + 'conclude `success` while REQUIRED_EVIDENCE suites self-skipped (UNI-2580)',
  );
  assert.ok(
    block.includes(`--check ${SPINE_CHECK_ID}`),
    'the evidence check must be bound to the spine-required-tests manifest entry, the one '
      + 'declaring tenant-isolation/migration-integrity/data-completeness/relay-concurrency',
  );
});

test('the evidence check runs after the report exists and before it is uploaded', () => {
  const block = spineJobBlock();
  const testAt = block.indexOf('outputFile=vitest-report.json');
  const checkAt = block.indexOf('scripts/spine-evidence-selfcheck.mjs');
  const uploadAt = block.indexOf('Upload test-evidence report');
  assert.ok(testAt !== -1 && checkAt !== -1 && uploadAt !== -1, 'all three steps must be present');
  assert.ok(
    testAt < checkAt && checkAt < uploadAt,
    'the check must read the report the Test step just wrote, and run before the upload step '
      + 'so an incomplete run fails the job rather than merely being uploaded for later reading',
  );
});

test('the required spine job stays unconditional', () => {
  // Mirrors nexus-project-readiness.mjs's own coverage rule (workflowJobIsUnconditional):
  // an `if:` or `continue-on-error:` anywhere in this job's block makes the ALREADY-REQUIRED
  // "project-readiness" job stop counting `spine` as CI coverage for the package.
  const block = spineJobBlock();
  const uncommented = block.split('\n').filter((line) => !line.trim().startsWith('#'));
  assert.ok(
    !uncommented.some((line) => /^\s*(?:-\s*)?(?:if|continue-on-error):/i.test(line)),
    'adding the evidence-completeness step must not introduce a conditional step',
  );
});

// ── the check itself: it can say no, and it can say yes ─────────────────────

test('the real skipped-evidence fixture fails closed', () => {
  const exitCode = main(
    ['--check', SPINE_CHECK_ID, '--evidence', SKIPPED_EVIDENCE, '--expected-root', CI_ROOT],
    { io: NULL_IO },
  );
  assert.equal(exitCode, 1, 'a report with 19 of 22 required assertions self-skipped must fail');
});

test('positive control: the synthetic all-executed fixture passes', () => {
  // Proves the checker CAN return PASS — derived from the fixture above by flipping every
  // skipped assertion to passed; see fixtures/README.md. Without this, "FAIL on the real
  // fixture" would be indistinguishable from a checker that always fails.
  const exitCode = main(
    ['--check', SPINE_CHECK_ID, '--evidence', EXECUTED_EVIDENCE, '--expected-root', CI_ROOT],
    { io: NULL_IO },
  );
  assert.equal(exitCode, 0, 'a report with every required assertion executed must pass');
});

test('the FAIL verdict names the required-evidence suites that never ran', () => {
  const result = runSelfCheck({
    checkId: SPINE_CHECK_ID,
    evidencePath: SKIPPED_EVIDENCE,
    expectedRoot: CI_ROOT,
    io: NULL_IO,
  });
  assert.equal(result.verdict, 'FAIL');
  const skippedSuites = result.violations
    .filter((v) => v.reason === 'REQUIRED_EVIDENCE_NOT_EXECUTED')
    .map((v) => v.suite);
  assert.ok(
    skippedSuites.includes('tests/integration/rls.test.ts'),
    'the RLS tenant-isolation suite must be named among the unexecuted required evidence',
  );
});

test('an unknown check id is refused rather than silently reporting nothing', () => {
  const exitCode = main(['--check', 'not-a-real-check', '--evidence', SKIPPED_EVIDENCE], { io: NULL_IO });
  assert.equal(exitCode, 2);
});

test('missing arguments are refused', () => {
  assert.equal(main([], { io: NULL_IO }), 2);
  assert.equal(main(['--check', SPINE_CHECK_ID], { io: NULL_IO }), 2);
});
