#!/usr/bin/env node

/**
 * UNI-2567 items 7 and 8 — the test-evidence manifest and its completeness check.
 *
 * THE DEFECT. A required CI check reports the exit code of a test process. It does
 * not report whether the tests that justify the check's name actually ran. On main
 * at d1d57b8e5745e90259f2799cb9086e4a62689318 the required job "packages/spine —
 * type-check and bounded tests" concluded `success` with 3 of 22 tests executed;
 * the RLS matrix and the cross-tenant isolation suites were among the 19 that
 * self-skipped because SPINE_DATABASE_URL was absent.
 *
 * WHY THIS READS STRUCTURED DATA AND NOT THE CONSOLE LOG. Two earlier revisions
 * parsed the reporter's human-readable output. Both were defeated in adversarial
 * review, the second one twice over:
 *
 *   - Provenance read out of the log text: one `sed` over a committed fixture
 *     produced a gated PASS for the real SHA. A file cannot vouch for itself.
 *   - Suite lines read out of the log body: a `console.log` from any test file in
 *     the package printed reporter-shaped bytes into genuine CI output and forged
 *     a complete green report.
 *
 * The second is not patchable. Anything that can write to stdout can write bytes
 * that look like a reporter line, so tightening the pattern is a denylist and
 * denylists lose. Two changes follow:
 *
 *   1. EXECUTION comes from vitest's JSON reporter. A test's stdout is a captured
 *      field inside that structure, never a sibling of it, so reporter-shaped text
 *      printed by a test can no longer add or alter a suite record.
 *   2. PROVENANCE comes from the GitHub Actions API, keyed by job id — head_sha,
 *      job name, status, conclusion and run identity. It is never read from any
 *      file the caller supplies.
 *   3. THE EVIDENCE ITSELF comes out of the run's own artefact, downloaded through
 *      the API and re-bound to the resolved run and commit. Round six proved why:
 *      pointed at the fixture this repository's own README labels SYNTHETIC, the
 *      gate returned PASS for a real job on a real SHA, because binding the JOB
 *      never bound the FILE. `--gate` now refuses `--evidence` outright, so no
 *      caller-supplied byte reaches a gated verdict.
 *
 * THREAT MODEL — read this before trusting the gate further than it goes.
 * This defends against the defect UNI-2567 actually describes: suites silently
 * self-disabling while the job stays green, and stale or foreign evidence being
 * replayed for a commit it does not belong to. It does NOT defend against an
 * author who can land arbitrary code in the repository. Such an author can
 * overwrite `vitest-report.json` before the upload step, or simply delete the
 * assertions — no in-repo test gate can survive that, and claiming otherwise
 * would be the same overclaiming this file already had to correct once.
 *
 * THE RESIDUAL GAP, stated plainly and completely. Under `--gate` the evidence is
 * no longer among the caller's inputs, but these still are: `--repo`, `--job`,
 * `--run`, `--attempt`, `--sha`, `--root` and `--check`, plus the manifest itself,
 * which is a file in the same tree. The API authenticates that the named job
 * exists, ran on the named commit in the named run and attempt, and concluded
 * usably, and the artefact is then re-checked against that run and commit — it
 * does NOT prove the caller named the RIGHT job or repository. A caller free to
 * choose all of them can still select a foreign but internally consistent run,
 * and get a truthful answer about the wrong thing.
 *
 * Three narrower limits, so they are not mistaken for guarantees:
 *   - ATTEMPT BINDING IS BY TIME, NOT BY IDENTITY. GitHub exposes no attempt
 *     field on an artefact and offers no attempt-scoped artefact listing (both
 *     verified live), so a partial re-run carries the earlier attempt's artefacts
 *     into the new one. The gate refuses any artefact created before the
 *     attempt's `run_started_at`, which excludes exactly those carried-forward
 *     bytes. It cannot distinguish two artefacts created within one attempt's
 *     window — the duplicate-name refusal covers the case that matters — and it
 *     inherits whatever clock skew exists between the two API timestamps.
 *   - Workflow binding compares a DISPLAY NAME (`job.workflow_name`) against the
 *     manifest. Two workflow files may share a `name:`, so this narrows the set
 *     but does not identify a file. `check.workflow` is documentation, not a
 *     check.
 *   - The manifest's `job`, `reporter`, `prerequisite` and per-suite `gate` fields
 *     are descriptive. They are not enforced, and a reader should not infer that a
 *     declared `gate` is verified against the test source. `artifact` and
 *     `reportEntry` ARE enforced — they name what the gate downloads.
 *
 * That is tolerable only because of who the caller is meant to be. This is built
 * to run from inside the workflow it audits, where the values come from the
 * `github` context rather than from a person, and to be read by a human
 * inspecting a specific run. What remains of the gap closes at the arming step,
 * where repo/sha/run come from the CI context rather than argv — out of scope
 * here, and part of why nothing consumes this yet.
 *
 * COVERAGE IS PROVEN POSITIVELY. Earlier revisions protected a hardcoded list of
 * category names and suite-path substrings; a security suite named outside that
 * list walked straight through. Instead the manifest declares the capabilities a
 * required check must prove, and the gate demands that each one be carried by at
 * least one suite that actually executed. Deleting, renaming or relabelling a
 * suite then fails for absence of proof rather than for failing to match a string.
 *
 * DISARMED. No CI job runs this against live job output and it is not a required
 * check. Without --gate it reports and exits 0. Its SELF-TESTS do run in the
 * project-readiness job, which makes the manifest's freshness assertion binding on
 * that job — adding, renaming or deleting a spine test fails it until the manifest
 * is updated. That constraint is intended and is stated here rather than denied.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, inflateRawSync } from 'node:zlib';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const MANIFEST_PATH = join('config', 'ci-evidence-manifest.json');

export const EVIDENCE_CLASSES = Object.freeze(['REQUIRED_EVIDENCE', 'ALLOWED_NON_BLOCKING']);

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
/** owner/name, GitHub's own character set. Interpolated into an API path. */
const REPO_SEGMENT = /^[A-Za-z0-9._-]+$/u;
/**
 * owner/name, validated per segment. A single regex with a lookahead only caught
 * a TRAILING dot-segment: `../repo` walked straight through it, and this value is
 * interpolated into an API path.
 */
function isValidRepo(value) {
  if (typeof value !== 'string') return false;
  const segments = value.split('/');
  if (segments.length !== 2) return false;
  return segments.every((segment) => REPO_SEGMENT.test(segment) && segment !== '.' && segment !== '..');
}
const NUMERIC_ID = /^[0-9]+$/u;

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

/**
 * Rejects every manifest shape that could disarm the gate by construction.
 * `requiredCapabilities` is the positive-proof floor: it names what the check
 * must prove, independently of how any individual suite happens to be labelled.
 */
export function validateManifest(manifest) {
  if (!Array.isArray(manifest.checks) || manifest.checks.length === 0) {
    throw new Error(`${MANIFEST_PATH} declares no checks.`);
  }

  const checkIds = new Set();
  for (const check of manifest.checks) {
    if (typeof check.id !== 'string' || check.id === '') {
      throw new Error(`${MANIFEST_PATH} declares a check with no id.`);
    }
    if (checkIds.has(check.id)) {
      throw new Error(`${MANIFEST_PATH} declares duplicate check id "${check.id}".`);
    }
    checkIds.add(check.id);

    for (const field of ['requiredCheck', 'workflow', 'workflowName', 'job', 'workingDirectory']) {
      if (typeof check[field] !== 'string' || check[field] === '') {
        throw new Error(`Check "${check.id}" declares no ${field}.`);
      }
    }
    /*
     * `artifact` and `reporter` are no longer documentation. They name the
     * artefact the gate downloads and the entry inside it, so a check missing
     * either cannot be gated at all — and a manifest that omits them would leave
     * the gate falling back to a caller-supplied path, which is the forged-
     * evidence hole round six demonstrated.
     */
    for (const field of ['artifact', 'reportEntry']) {
      if (typeof check[field] !== 'string' || check[field] === '') {
        throw new Error(
          `Check "${check.id}" declares no ${field}. The gate fetches its evidence from the `
          + "run's own artefacts; without this it has no evidence it can trust.",
        );
      }
    }

    if (!Array.isArray(check.suites) || check.suites.length === 0) {
      throw new Error(`Check "${check.id}" declares no suites; an empty check passes vacuously.`);
    }
    if (!Array.isArray(check.requiredCapabilities) || check.requiredCapabilities.length === 0) {
      throw new Error(
        `Check "${check.id}" declares no requiredCapabilities. Without a coverage floor a `
        + 'check whose suites are all ALLOWED_NON_BLOCKING passes while proving nothing.',
      );
    }

    const suiteNames = new Set();
    const carried = new Set();
    for (const suite of check.suites) {
      if (typeof suite.suite !== 'string' || suite.suite === '') {
        throw new Error(`Check "${check.id}" declares a suite with no path.`);
      }
      if (suiteNames.has(suite.suite)) {
        throw new Error(`Check "${check.id}" declares duplicate suite "${suite.suite}".`);
      }
      suiteNames.add(suite.suite);

      if (!EVIDENCE_CLASSES.includes(suite.class)) {
        throw new Error(
          `Suite ${suite.suite} declares unknown class "${suite.class}". `
          + `Expected one of: ${EVIDENCE_CLASSES.join(', ')}.`,
        );
      }
      if (typeof suite.capability !== 'string' || suite.capability === '') {
        throw new Error(`Suite ${suite.suite} declares no capability.`);
      }
      if (suite.class === 'REQUIRED_EVIDENCE') carried.add(suite.capability);
    }

    for (const capability of check.requiredCapabilities) {
      if (!carried.has(capability)) {
        throw new Error(
          `Check "${check.id}" requires capability "${capability}" but no REQUIRED_EVIDENCE `
          + 'suite carries it. A required capability cannot be left without a proof.',
        );
      }
    }
  }

  return manifest;
}

export function loadManifest(root = repositoryRoot) {
  const raw = readFileSync(join(root, MANIFEST_PATH), 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${MANIFEST_PATH} is not valid JSON: ${error.message}`);
  }
  return validateManifest(parsed);
}

export function resolveCheck(manifest, id) {
  const matches = manifest.checks.filter((candidate) => candidate.id === id);
  if (matches.length === 0) {
    const known = manifest.checks.map((candidate) => candidate.id).join(', ') || 'none';
    throw new Error(`Unknown evidence check "${id}". Declared checks: ${known}.`);
  }
  return matches[0];
}

// ---------------------------------------------------------------------------
// Execution evidence — vitest JSON reporter
// ---------------------------------------------------------------------------

/**
 * A count from the report, or `null` when it is not one.
 *
 * `Number.isInteger` was the whole check, and it accepts negatives. Round eight
 * set `numFailedTestSuites` to `-1` and the decision path — which refuses `null`
 * and refuses `> 0`, and had no third case — graded the report PASS with no
 * violations. A number that cannot be a count is unknown metadata, and unknown
 * metadata is UNVERIFIABLE rather than zero.
 *
 * Applied to EVERY count read out of the report, not only the one that was
 * demonstrated. The cross-total comparison happens to catch a negative in the
 * `reported` set today, but that is a property of the comparison, not of the
 * parse, and the next field added would inherit the hole rather than the fix.
 */
function reportedCount(value) {
  if (!Number.isSafeInteger(value) || value < 0) return null;
  return value;
}

/**
 * Reads vitest's JSON reporter output into per-suite execution counts.
 *
 * vitest marks a skipped assertion `pending`. `executed` counts assertions that
 * actually ran: passed and failed both did, pending and todo did not. A failing
 * test is evidence — of a defect — so it does not reduce the executed count.
 */
export function parseVitestJsonReport(text, { workingDirectory = '', expectedRoot = null } = {}) {
  let report;
  try {
    report = JSON.parse(text);
  } catch (error) {
    throw new Error(`Test evidence is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(report.testResults)) {
    throw new Error('Test evidence has no testResults array; this is not a vitest JSON report.');
  }

  const marker = workingDirectory || '';
  const suites = [];
  const seen = new Map();
  /*
   * Every file must resolve through the SAME parent of the package directory.
   * Stripping at a boundary alone still let a vendored or nested copy — say
   * /w/vendor/<pkg>/tests/integration/rls.test.ts — collapse onto a required
   * suite's key. Requiring one consistent root is positive proof rather than a
   * denylist of directory names that would always lose.
   */
  const packageRoots = new Set();

  for (const file of report.testResults) {
    if (typeof file.name !== 'string') {
      throw new Error('Test evidence contains a file record with no name.');
    }
    /*
     * Anchored at a directory boundary and required to be unambiguous. An
     * unanchored lastIndexOf let any path merely CONTAINING the package prefix
     * collapse onto a required suite's key, so a nested or crafted file could
     * masquerade as one. Two occurrences means we cannot say which file this is,
     * and a guess is exactly what a completeness gate must not make.
     */
    const posix = file.name.split('\\').join('/');
    let suite = posix;
    if (marker) {
      /*
       * Match at a directory boundary, and accept the marker at the very start so
       * a relative path is handled too. More than one occurrence is refused rather
       * than guessed at.
       */
      const boundary = `/${marker}/`;
      const leading = `${marker}/`;
      // Count the leading occurrence too. Counting only `/marker/` let
      // `pkg/vendor/pkg/tests/x.test.ts` read as a single occurrence and strip
      // silently, which made the refusal comment below false.
      const occurrences = (posix.split(boundary).length - 1)
        + (posix.startsWith(leading) ? 1 : 0);
      if (occurrences > 1) {
        throw new Error(
          `AMBIGUOUS_SUITE_PATH: "${posix}" contains "${boundary}" ${occurrences} times; `
          + 'the suite it refers to cannot be determined.',
        );
      }
      const index = posix.indexOf(boundary);
      if (index >= 0) {
        suite = posix.slice(index + boundary.length);
        packageRoots.add(posix.slice(0, index));
      } else if (posix.startsWith(leading)) {
        suite = posix.slice(leading.length);
        packageRoots.add('');
      }
    }

    const assertions = Array.isArray(file.assertionResults) ? file.assertionResults : [];
    // Null prototype + hasOwn: `status in counts` was true for inherited keys, so
    // an assertion reporting status "constructor" or "__proto__" was counted as a
    // known bucket instead of being classified as unrecognised.
    const counts = Object.assign(Object.create(null), {
      passed: 0, failed: 0, pending: 0, skipped: 0, todo: 0, other: 0,
    });
    for (const assertion of assertions) {
      const status = assertion?.status;
      if (typeof status === 'string' && Object.hasOwn(counts, status)) counts[status] += 1;
      else counts.other += 1;
    }

    /*
     * `executed` is counted POSITIVELY — only statuses that prove a test ran.
     * Never `declared - skipped`: vitest 4 reports a skipped assertion as
     * "skipped" where vitest 3 said "pending", and an unrecognised status under
     * subtraction would silently inflate the executed count into a false pass.
     * Counting up means an unknown status is simply not evidence.
     */
    const declared = assertions.length;
    const executed = counts.passed + counts.failed;
    const skipped = counts.pending + counts.skipped + counts.todo;

    /*
     * A SUITE CAN FAIL WITHOUT A SINGLE ASSERTION FAILING. An afterAll hook that
     * throws, a global setup error, an unhandled rejection after the last test —
     * vitest records these at the FILE level (`status: "failed"`, a `message`)
     * while every assertionResult still says "passed". Round six demonstrated it:
     * flipping the file status and adding a failure message to an otherwise
     * complete report returned PASS with zero violations. Counting assertions is
     * necessary and not sufficient; the file's own verdict has to be read too.
     */
    const failureMessage = typeof file.message === 'string' && file.message.trim() !== ''
      ? file.message.trim()
      : (typeof file.failureMessage === 'string' && file.failureMessage.trim() !== ''
        ? file.failureMessage.trim()
        : null);
    const fileStatus = typeof file.status === 'string' ? file.status : null;

    const record = {
      suite,
      declared,
      executed,
      skipped,
      todo: counts.todo,
      passed: counts.passed,
      failed: counts.failed,
      unrecognised: counts.other,
      fileStatus,
      failureMessage,
      status: executed > 0 ? 'EXECUTED' : 'SKIPPED',
    };

    // Two records for one path is ambiguous evidence; refuse to pick a winner.
    /*
     * ANY repeated path is ambiguous, not just one whose headline counts differ.
     * Two records agreeing on executed/declared can still disagree on which
     * assertions ran, and picking the first is a silent guess.
     */
    const previous = seen.get(suite);
    if (previous) {
      previous.conflict = true;
      continue;
    }
    seen.set(suite, record);
    suites.push(record);
  }

  const totals = suites.reduce(
    (accumulator, suite) => ({
      executed: accumulator.executed + suite.executed,
      skipped: accumulator.skipped + suite.skipped,
      declared: accumulator.declared + suite.declared,
      passed: accumulator.passed + suite.passed,
      failed: accumulator.failed + suite.failed,
      todo: accumulator.todo + suite.todo,
    }),
    { executed: 0, skipped: 0, declared: 0, passed: 0, failed: 0, todo: 0 },
  );

  const reported = {
    total: reportedCount(report.numTotalTests),
    passed: reportedCount(report.numPassedTests),
    failed: reportedCount(report.numFailedTests),
    pending: reportedCount(report.numPendingTests),
    todo: reportedCount(report.numTodoTests),
  };

  /*
   * The report's own verdict on itself. `success` is not derivable from the
   * assertion records — that is the whole point: a run can be unsuccessful for a
   * reason no assertion expresses. Missing is UNVERIFIABLE, never assumed true.
   */
  const declaredSuccess = typeof report.success === 'boolean' ? report.success : null;

  /*
   * THE SUITE-SUMMARY FAMILY, NOT JUST THE ONE FIELD THAT WAS REPORTED.
   *
   * Round eight found `numFailedTestSuites: -1` reaching PASS and it was fixed.
   * Round nine then set `numTotalTestSuites`, `numPassedTestSuites` or
   * `numPendingTestSuites` to -1, or total suites to 0, or pending suites to 1,
   * and every one still printed `PASS; violations=0` — because those three
   * fields were never read at all. Fixing the field the reviewer named while
   * leaving its siblings unread is how a review loop returns one adjacent
   * finding per round.
   *
   * The checker already relies on this family to see failures that leave no
   * assertion record. So the whole family is parsed, and its internal
   * arithmetic is checked: a suite count that contradicts itself is evidence
   * about a report nobody should certify.
   */
  const suites_ = {
    total: reportedCount(report.numTotalTestSuites),
    passed: reportedCount(report.numPassedTestSuites),
    failed: reportedCount(report.numFailedTestSuites),
    pending: reportedCount(report.numPendingTestSuites),
  };
  const failedSuites = suites_.failed;
  /*
   * `numTotalTestSuites` counts SUITES, and `testResults` carries FILES — the
   * real captured evidence declares 12 suites across 6 file records, so an
   * equality check between them fires on a perfectly good report. That mistake
   * was made here and caught by the fixture: over-firing is a defect too, and
   * the control that stopped it was the untouched positive-control fixture.
   * Only the family's own arithmetic is checked.
   */
  const suiteSummary = {
    ...suites_,
    fileRecords: suites.length,
    coherent: Object.values(suites_).every((value) => value !== null)
      && suites_.passed + suites_.failed + suites_.pending === suites_.total
      && suites_.total > 0,
  };

  if (packageRoots.size > 1) {
    throw new Error(
      `INCONSISTENT_PACKAGE_ROOTS: files resolve through ${packageRoots.size} different `
      + `parents of "${marker}" (${[...packageRoots].join(', ')}). A vendored or nested copy `
      + 'cannot be told apart from the real package.',
    );
  }
  /*
   * Consistency alone is not proof of the RIGHT root: every record resolving
   * through /w/vendor/<pkg> is perfectly consistent and entirely wrong. And when
   * NOTHING matched the marker the root set is empty, which used to raise no
   * error at all — the report simply failed later for unrelated reasons. Both are
   * refusals now, so the root check is positive proof rather than a coincidence.
   */
  if (marker && suites.length > 0 && packageRoots.size === 0) {
    throw new Error(
      `UNROOTED_EVIDENCE: no file resolved through "${marker}", so nothing in this report `
      + 'can be attributed to the package under test.',
    );
  }
  const packageRoot = [...packageRoots][0] ?? null;
  if (expectedRoot !== null && packageRoot !== null && packageRoot !== expectedRoot) {
    throw new Error(
      `UNEXPECTED_PACKAGE_ROOT: files resolve through "${packageRoot}", not the expected `
      + `"${expectedRoot}". A vendored or nested copy resolves consistently too.`,
    );
  }

  return { suites, totals, reported, packageRoot, declaredSuccess, failedSuites, suiteSummary };
}

// ---------------------------------------------------------------------------
// Provenance — GitHub Actions API, never a caller-supplied file
// ---------------------------------------------------------------------------

/** Default fetcher. Injectable so tests never reach the network. */
export function ghJobFetcher(repo, jobId) {
  // Both are interpolated into an API path, so they are shape-checked here as
  // well as at the CLI boundary — a library caller gets the same guarantee.
  if (!isValidRepo(repo)) throw new Error(`INVALID_REPO: "${repo}" is not owner/name.`);
  if (!NUMERIC_ID.test(String(jobId))) throw new Error(`INVALID_JOB_ID: "${jobId}" is not numeric.`);
  const raw = execFileSync(
    'gh',
    ['api', `repos/${repo}/actions/jobs/${jobId}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Evidence custody — the report comes OUT of the run, not off the caller's disk
// ---------------------------------------------------------------------------

/**
 * Minimal ZIP reader. Actions artefacts are ZIPs, and pulling in a dependency for
 * this would widen the supply chain of a security gate to save sixty lines.
 * Supports stored (0) and deflate (8), which is everything actions/upload-artifact
 * emits; anything else is refused rather than guessed at. Verified against two
 * real artefacts from this repository before being wired in.
 */
/**
 * Every identifier an exported resolver compares must first BE an identifier.
 *
 * ONE HELPER, TWO BOUNDARIES, BECAUSE THE INSTANCE-BY-INSTANCE VERSION FAILED.
 * Round eight shaped the operands at `resolveEvidenceArtifact`; round nine then
 * called `resolveProvenance` — the sibling boundary, doing the same job — with
 * `repo: 'not/a/valid/repo'` and empty job/run/attempt ids and got back an
 * accepted provenance record of `{jobId:"", runId:"", runAttempt:""}`. Two
 * copies of a rule is one copy that will be missed, so there is now one.
 *
 * Absent arguments are the CALLER's contract and stay where they are: each
 * resolver has its own message about which argument it needs and why. This is
 * only about whether the values that did arrive are identifiers at all.
 */
function assertShapedIdentity({
  repo, jobId, expectedSha, expectedRunId, expectedRunAttempt, artifactId, prefix,
}) {
  if (repo !== undefined && !isValidRepo(repo)) {
    throw new Error(`INVALID_REPO: "${repo}" is not owner/name.`);
  }
  const numeric = [
    ['run id', expectedRunId, `${prefix}_RUN_UNSHAPED`],
    ['attempt', expectedRunAttempt, `${prefix}_ATTEMPT_UNSHAPED`],
    ['job id', jobId, `${prefix}_JOB_UNSHAPED`],
    ['artefact id', artifactId, `${prefix}_ARTIFACT_ID_UNSHAPED`],
  ];
  for (const [label, value, code] of numeric) {
    if (value === undefined) continue;
    if (!NUMERIC_ID.test(String(value ?? ''))) {
      throw new Error(
        `${code}: "${value}" is not a numeric ${label}, so nothing it is compared against can `
        + 'bind evidence to it.',
      );
    }
  }
  if (expectedSha !== undefined && expectedSha !== null && !SHA_PATTERN.test(String(expectedSha))) {
    throw new Error(
      `${prefix}_SHA_UNSHAPED: "${expectedSha}" is not a 40-hex commit, so evidence cannot be `
      + 'bound to it.',
    );
  }
}

const ZIP64_SENTINEL_16 = 0xffff;
const ZIP64_SENTINEL_32 = 0xffffffff;
/*
 * The only general-purpose flag bits this reader knows how to honour: 1 and 2
 * (deflate level hints, which change nothing it reads), 3 (data descriptor,
 * implemented in the entry walk), and 11 (UTF-8 member name, which is how it
 * decodes names anyway). Every other bit is refused — see the per-bit verdicts
 * at the check itself.
 */
const SUPPORTED_ZIP_FLAG_BITS = 0x080e;

/*
 * EVERY FIELD THE LOCAL AND CENTRAL HEADERS BOTH CARRY, ENUMERATED.
 *
 * Four rounds were lost to this one class — name checked but not method, method
 * but not crc/sizes, local flags but not central, and then a sweep that CLAIMED
 * to close the class while leaving version-needed, modification time and
 * modification date unread. The claim was in a comment saying "both copies of
 * EVERYTHING the two headers share are now compared", and it was false when
 * written.
 *
 * A comment cannot close a class. A table can: the loop below is driven by this
 * list, so adding a field here is the only way to check one, and a field that is
 * missing is visible as a gap in a table rather than invisible as an absence of
 * code. Offsets are from PKWARE APPNOTE 4.3.7 (local) and 4.3.12 (central).
 *
 * Deliberately ABSENT, with reasons, because "not in the table" must mean
 * "decided" and not "forgotten":
 *   signature          the two headers carry DIFFERENT signatures by definition
 *   version made by    central only
 *   comment length,
 *   disk number start,
 *   internal attrs,
 *   external attrs,
 *   local header offset   central only
 *   extra field length    duplicated in NAME only. The local and central extra
 *                         fields legitimately hold different records — APPNOTE
 *                         4.4.28 — so their lengths legitimately differ. Their
 *                         CONTENTS are validated separately, by allowlist.
 *   file name             compared as raw BYTES below, not through this table,
 *                         because two different byte sequences can decode to one
 *                         string and the bytes are what another reader sees.
 *   general-purpose flags compared BEFORE this table, because `streamed` is
 *                         derived from bit 3 and three rows below key off it.
 *                         Comparing it twice would leave the second comparison
 *                         permanently unreachable, which is a guard that cannot
 *                         fail — the thing this file's mutation harness exists
 *                         to catch. Checked exactly once, early.
 *   file name length      subsumed by the byte comparison: unequal lengths make
 *                         unequal byte slices, so the name check refuses it
 *                         first and a row here could never fire. It HAD a row
 *                         until the harness reported that dropping it changed
 *                         nothing — a passing test over an unreachable guard.
 */
/*
 * AGREEMENT IS NOT THE SAME AS SUPPORT, and the table only checked agreement.
 *
 * `version needed to extract` says which ZIP feature level a reader must
 * implement. Both copies saying 63 agree perfectly — and `unzip` refuses the
 * entry outright ("need PK compat. v6.3 (can do v4.5)") while this reader
 * happily returned its bytes. Two readers, two answers, from a field the sweep
 * had just been extended to cover: the duplicated-field table closed the
 * "do the copies match" question and left "is the value one we implement"
 * entirely open.
 *
 * 20 is the level this reader implements: version 2.0, stored and deflate, no
 * Zip64, no encryption. Anything above it declares a feature that is either
 * refused elsewhere in this walk or not implemented at all, so accepting it
 * would mean grading an archive by ignoring its own statement of what reading it
 * requires. The real artefact declares 20 in both headers.
 */
const MAX_SUPPORTED_ZIP_VERSION = 20;

const DUPLICATED_HEADER_FIELDS = Object.freeze([
  { label: 'version needed to extract', local: 4, central: 6, size: 2, maximum: MAX_SUPPORTED_ZIP_VERSION },
  { label: 'compression method', local: 8, central: 10, size: 2 },
  { label: 'last modified time', local: 10, central: 12, size: 2 },
  { label: 'last modified date', local: 12, central: 14, size: 2 },
  { label: 'CRC', local: 14, central: 16, size: 4, zeroWhenStreamed: true },
  { label: 'compressed size', local: 18, central: 20, size: 4, zeroWhenStreamed: true },
  { label: 'uncompressed size', local: 22, central: 24, size: 4, zeroWhenStreamed: true },
]);

/*
 * EXTRA FIELDS ARE NAME METADATA UNTIL PROVEN OTHERWISE.
 *
 * An entry's extra field is a TLV list, and one of its records — 0x7075, Unicode
 * Path — REPLACES the member name. A reader that ignores extra fields and a
 * reader that honours them disagree about which file an archive contains: the
 * reviewer built exactly that, and `bsdtar -tf` listed `other.json` while this
 * gate graded the same bytes as `vitest-report.json`.
 *
 * So this is an allowlist, not a denylist. Refusing the ids known to be
 * dangerous is detect-the-bad-thing, and an unknown id is by definition one
 * whose effect on the name is unknown. Everything not named here is refused with
 * its id in the message, so adding one is a deliberate act — the same shape as
 * the workflow content-pin one branch over.
 *
 * The artefacts this gate actually reads carry NO extra fields at all (the real
 * committed fixture has extraLength 0 in both headers). These three are allowed
 * because they are pure metadata that no reader interprets as identity, so a
 * future upload-artifact that starts emitting them does not break the gate.
 */
const SUPPORTED_EXTRA_FIELD_IDS = Object.freeze(new Map([
  [0x5455, 'extended timestamp'],
  [0x7855, 'Unix (uid/gid, legacy)'],
  [0x7875, 'Unix (uid/gid)'],
]));
/** Named separately so the refusal can say WHY rather than only "unsupported". */
const NAME_BEARING_EXTRA_FIELD_IDS = Object.freeze(new Map([
  [0x7075, 'Unicode Path, which replaces the member name'],
  [0x6375, 'Unicode Comment'],
]));

/** Reads a fixed-width field only when the whole field is inside the buffer. */
function zipUInt(buffer, at, width, what) {
  if (at < 0 || at + width > buffer.length) {
    throw new Error(`CORRUPT_ZIP: ${what} at offset ${at} runs past the end of the archive.`);
  }
  return width === 2 ? buffer.readUInt16LE(at) : buffer.readUInt32LE(at);
}

/**
 * Walks an entry's extra-field region as the TLV list it is, refusing anything
 * this reader does not implement.
 *
 * The region must TILE exactly — the same rule the entry walk applies to the
 * archive, for the same reason. A trailing byte the records do not account for
 * is a record another reader may well parse, and then the two readers disagree
 * about what the archive contains.
 */
function assertSupportedExtraFields(buffer, start, length, name, which) {
  let at = start;
  const end = start + length;
  if (end > buffer.length) {
    throw new Error(
      `CORRUPT_ZIP: the ${which} extra field of "${name}" runs past the end of the archive.`,
    );
  }
  while (at < end) {
    if (at + 4 > end) {
      throw new Error(
        `CORRUPT_ZIP: the ${which} extra field of "${name}" ends mid-record; `
        + `${end - at} byte(s) cannot hold a header.`,
      );
    }
    const id = buffer.readUInt16LE(at);
    const size = buffer.readUInt16LE(at + 2);
    if (at + 4 + size > end) {
      throw new Error(
        `CORRUPT_ZIP: extra field 0x${id.toString(16).padStart(4, '0')} of "${name}" declares `
        + `${size} bytes but only ${end - at - 4} remain in the ${which} extra region.`,
      );
    }
    if (NAME_BEARING_EXTRA_FIELD_IDS.has(id)) {
      throw new Error(
        `UNSUPPORTED_ZIP: "${name}" carries extra field 0x${id.toString(16).padStart(4, '0')} `
        + `(${NAME_BEARING_EXTRA_FIELD_IDS.get(id)}) in its ${which} header. This reader grades `
        + 'the member by its header name, so an archive carrying a second name reads as two '
        + 'different files depending on which reader opens it.',
      );
    }
    if (!SUPPORTED_EXTRA_FIELD_IDS.has(id)) {
      throw new Error(
        `UNSUPPORTED_ZIP: "${name}" carries extra field 0x${id.toString(16).padStart(4, '0')} in `
        + `its ${which} header, which this reader does not implement. Extra fields are allowed by `
        + 'id, not refused by id, because an unknown record is one whose effect on the entry is '
        + 'unknown.',
      );
    }
    at += 4 + size;
  }
}

export function readZipEntries(buffer) {
  let eocd = -1;
  const floor = Math.max(0, buffer.length - 22 - 65535);
  for (let index = buffer.length - 22; index >= floor; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) { eocd = index; break; }
  }
  if (eocd < 0) throw new Error('NOT_A_ZIP: the artefact has no end-of-central-directory record.');

  /*
   * THE EOCD'S OWN DECLARATIONS ARE CHECKED AGAINST EACH OTHER, NOT TRUSTED
   * SEPARATELY.
   *
   * Round eight built an archive holding two members both named
   * `vitest-report.json` and changed only the EOCD entry count from 2 to 1. The
   * reader walked one record, returned one entry, and the duplicate-name refusal
   * downstream never saw the second copy — so an ambiguous archive graded as
   * unambiguous evidence. A count is a claim; the only way to catch a false one
   * is to require that walking the directory ends exactly where the EOCD says it
   * does, and that every declaration agrees.
   */
  const diskNumber = zipUInt(buffer, eocd + 4, 2, 'EOCD disk number');
  const directoryDisk = zipUInt(buffer, eocd + 6, 2, 'EOCD directory-start disk');
  const countOnDisk = zipUInt(buffer, eocd + 8, 2, 'EOCD entries-on-disk');
  const count = zipUInt(buffer, eocd + 10, 2, 'EOCD entry count');
  const directorySize = zipUInt(buffer, eocd + 12, 4, 'EOCD directory size');
  const directoryStart = zipUInt(buffer, eocd + 16, 4, 'EOCD directory offset');

  /*
   * ONE CANONICAL ARCHIVE, OR NONE.
   *
   * Round nine accepted a valid ZIP with `GARBAGE` appended, and an EOCD
   * declaring a 4096-byte comment that was not there. Both are archives that
   * this reader and another reader would describe differently — and evidence
   * two tools disagree about is not evidence. The EOCD is the last structure in
   * a well-formed ZIP, so its declared comment must be exactly the bytes that
   * remain, and nothing may follow them.
   */
  const commentLength_ = zipUInt(buffer, eocd + 20, 2, 'EOCD comment length');
  if (eocd + 22 + commentLength_ !== buffer.length) {
    throw new Error(
      `CORRUPT_ZIP: the EOCD declares a ${commentLength_}-byte comment but `
      + `${buffer.length - eocd - 22} bytes follow it. The archive does not end where it says.`,
    );
  }

  if (diskNumber !== 0 || directoryDisk !== 0) {
    throw new Error('UNSUPPORTED_ZIP: a multi-disk archive is not evidence this reader accepts.');
  }
  if (countOnDisk !== count) {
    throw new Error(
      `CORRUPT_ZIP: the EOCD claims ${count} entries in total but ${countOnDisk} on this disk.`,
    );
  }
  // Any Zip64 sentinel means the real values live in a record this reader does
  // not parse. Reading the sentinel as a literal count or offset would silently
  // grade a fraction of the archive.
  if (count === ZIP64_SENTINEL_16 || countOnDisk === ZIP64_SENTINEL_16
    || directorySize === ZIP64_SENTINEL_32 || directoryStart === ZIP64_SENTINEL_32) {
    throw new Error('UNSUPPORTED_ZIP: Zip64 fields are present and this reader does not parse them.');
  }
  if (directoryStart + directorySize !== eocd) {
    throw new Error(
      `CORRUPT_ZIP: the central directory declares bytes ${directoryStart}..`
      + `${directoryStart + directorySize} but the EOCD begins at ${eocd}.`,
    );
  }

  let offset = directoryStart;
  const entries = [];
  // Each entry's byte extent in the local-records region, for the overlap check
  // after the walk. Round nine nested one entry's local header inside another
  // entry's data and both were accepted, so `vitest-report.json` could be a
  // region another reader sees as opaque bytes belonging to `outer.bin`.
  const extents = [];

  for (let n = 0; n < count; n += 1) {
    if (offset >= eocd) {
      throw new Error(
        `CORRUPT_ZIP: the EOCD claims ${count} entries but the directory ended after ${n}.`,
      );
    }
    if (zipUInt(buffer, offset, 4, 'central header signature') !== 0x02014b50) {
      throw new Error('CORRUPT_ZIP: central directory header signature is wrong.');
    }
    /*
     * THE CENTRAL COPY OF THE FLAGS, TOO.
     *
     * The previous round refused a streamed entry by reading bit 3 of the LOCAL
     * flags, and left the central copy unread — so an archive declaring the
     * entry streamed in the directory and not in the local header sailed past
     * the refusal. Exactly the pair-of-duplicated-fields mistake this reader
     * has now made three times: name checked but not method, method checked but
     * not crc/sizes, local flags checked but not central. Both copies of
     * EVERYTHING the two headers share, or the refusal is half a refusal.
     */
    const centralFlags = zipUInt(buffer, offset + 8, 2, 'central flags');
    const method = zipUInt(buffer, offset + 10, 2, 'compression method');
    const expectedCrc = zipUInt(buffer, offset + 16, 4, 'central CRC');
    const compressedSize = zipUInt(buffer, offset + 20, 4, 'compressed size');
    const uncompressedSize = zipUInt(buffer, offset + 24, 4, 'uncompressed size');
    const nameLength = zipUInt(buffer, offset + 28, 2, 'name length');
    const extraLength = zipUInt(buffer, offset + 30, 2, 'extra length');
    const commentLength = zipUInt(buffer, offset + 32, 2, 'comment length');
    /*
     * THE MULTI-DISK REFUSAL WAS ONLY HALF A REFUSAL.
     *
     * The EOCD's two disk fields were checked and the PER-ENTRY one was not.
     * An entry declaring `disk number start` 1 while the EOCD says 0 was
     * accepted: this reader ignored the field and followed the local-header
     * offset into the buffer it already had, while a reader that honours it goes
     * looking for a second volume and refuses. Same shape as every other
     * one-copy-checked finding on this file.
     */
    const entryDisk = zipUInt(buffer, offset + 34, 2, 'entry disk number start');
    if (entryDisk !== 0) {
      throw new Error(
        `UNSUPPORTED_ZIP: a central directory entry declares disk number ${entryDisk}, so its `
        + 'record lives on a volume this reader does not have. A reader honouring that field '
        + 'would refuse rather than read the bytes in this file.',
      );
    }
    /*
     * AND THE ENTRY MUST BE A REGULAR FILE.
     *
     * `version made by` names the creator system and `external attributes`
     * carries that system's file mode. With the Unix creator (high byte 3) and
     * mode `0120777`, the member IS A SYMLINK: its "content" is a path, and
     * `bsdtar -x` creates a link rather than the report. This reader graded the
     * bytes as the report and passed.
     *
     * The gate never extracts to disk, so nothing here follows a link — but the
     * archive still means two different things to two readers, which is the
     * property this whole walk defends. Refused rather than interpreted, and the
     * MS-DOS directory and volume-label bits with it.
     */
    const creatorSystem = zipUInt(buffer, offset + 4, 2, 'version made by') >> 8;
    const externalAttrs = zipUInt(buffer, offset + 38, 4, 'external attributes');
    /*
     * MY LAST FIX HERE WAS HALF A FIX, AND IT IS THE SAME HALF-FIX AS EVERY
     * OTHER ONE ON THIS FILE.
     *
     * It allowlisted creator systems {3, 7, 19} — Unix, Macintosh, OS X — and
     * checked the mode only for those. Every OTHER creator id encodes the mode in
     * the same sixteen bits, so `0120777` under creator 1, 5, 16 or 30 sailed
     * straight past a guard whose comment claimed it refused symlinks. Verified
     * on all four before writing this.
     *
     * The allowlist was the mistake. There is no creator id for which "the high
     * word says symlink" should be read as "regular file", so the mode is checked
     * whenever it is non-zero, whoever wrote the archive. A zero high word means
     * the creator recorded no mode at all — the common MS-DOS case — and stays
     * accepted.
     */
    const mode = (externalAttrs >>> 16) & 0xffff;
    const fileType = mode & 0o170000;
    if (mode !== 0 && fileType !== 0 && fileType !== 0o100000) {
      throw new Error(
        `UNSUPPORTED_ZIP: the member's external attributes describe file type 0`
        + `${fileType.toString(8)} (not a regular file), recorded by creator system `
        + `${creatorSystem}. A reader honouring them would create something other than the `
        + 'file whose bytes this gate graded.',
      );
    }
    // The MS-DOS attribute byte is the low 8 bits regardless of creator.
    if ((externalAttrs & 0x10) !== 0 || (externalAttrs & 0x08) !== 0) {
      throw new Error(
        'UNSUPPORTED_ZIP: the member is flagged as a directory or volume label in its MS-DOS '
        + 'attributes, so it is not the evidence file it claims to be.',
      );
    }
    const localOffset = zipUInt(buffer, offset + 42, 4, 'local header offset');
    if (compressedSize === ZIP64_SENTINEL_32 || uncompressedSize === ZIP64_SENTINEL_32
      || localOffset === ZIP64_SENTINEL_32) {
      throw new Error('UNSUPPORTED_ZIP: a Zip64 sentinel appears in a central directory entry.');
    }
    if (offset + 46 + nameLength > eocd) {
      throw new Error('CORRUPT_ZIP: a central directory entry name runs past the directory.');
    }
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

    /*
     * THE MEMBER NAME IS A NAME, NOT A PATH. `../vitest-report.json` and
     * `a/../../vitest-report.json` both resolve to the declared entry for a
     * reader that only compares strings, and round eight showed the dot-segment
     * form was accepted. Nothing legitimate that
     * actions/upload-artifact emits needs a dot segment, an absolute path, or a
     * backslash, so all three are refused rather than normalised — normalising
     * would mean deciding what the author meant.
     */
    /*
     * A TRAILING SLASH MAKES IT A DIRECTORY, and the name rules never said so.
     *
     * APPNOTE 4.4.17.1: a member whose name ends in `/` IS a directory entry.
     * `report.json/` was accepted and graded as the evidence file — this reader
     * saw a name it liked and read the bytes, while every extractor creates a
     * folder and finds no report at all. The MS-DOS directory bit is refused a
     * few lines down; the naming convention that means the same thing was not.
     */
    if (name.endsWith('/')) {
      throw new Error(
        `UNSAFE_ZIP_ENTRY: "${name}" ends in "/", which declares it a directory rather than the `
        + 'evidence file this gate grades.',
      );
    }
    if (name === '' || name.startsWith('/') || name.includes('\\')
      // A DRIVE LETTER IS ALSO AN ABSOLUTE PATH. Round nine slipped
      // `C:/vitest-report.json` past a check whose name claimed to refuse
      // absolute members, because it only knew the POSIX spelling — and the
      // downstream basename match then selected it as the report. Refusing
      // `\` and `/` while accepting `C:/` is refusing two of three spellings.
      || /^[A-Za-z]:/u.test(name)
      || name.split('/').some((segment) => segment === '.' || segment === '..')) {
      throw new Error(`UNSAFE_ZIP_ENTRY: "${name}" is not a plain archive member name.`);
    }

    // The local header's name/extra lengths differ from the central copy; using
    // the central ones lands mid-data.
    if (zipUInt(buffer, localOffset, 4, 'local header signature') !== 0x04034b50) {
      throw new Error(`CORRUPT_ZIP: local header signature is wrong for "${name}".`);
    }
    const localNameLength = zipUInt(buffer, localOffset + 26, 2, 'local name length');
    const localExtraLength = zipUInt(buffer, localOffset + 28, 2, 'local extra length');
    /*
     * THE NAME IS COMPARED AS BYTES, NOT AS A DECODED STRING.
     *
     * `buffer.toString('utf8', …)` maps every invalid sequence to U+FFFD, so two
     * DIFFERENT byte sequences decode to one identical string and a string
     * comparison passes over an archive whose two headers hold different names.
     * The bytes are what another reader sees; the decoded string is this
     * reader's interpretation of them.
     */
    const centralNameBytes = buffer.subarray(offset + 46, offset + 46 + nameLength);
    const localNameBytes = buffer.subarray(
      localOffset + 30, localOffset + 30 + localNameLength,
    );
    if (!centralNameBytes.equals(localNameBytes)) {
      throw new Error(
        `CORRUPT_ZIP: central directory calls this entry "${name}" but its local header `
        + `calls it "${localNameBytes.toString('utf8')}".`,
      );
    }
    /*
     * A NUL OR A CONTROL CHARACTER IN A NAME IS TWO NAMES.
     *
     * `dir\0ignored/vitest-report.json` was accepted, and the basename selector
     * downstream chose `vitest-report.json` from it — while `bsdtar` listed the
     * entry as `dir`, because C string handling stops at the NUL. One archive,
     * two members, depending on the reader. Nothing legitimate needs a control
     * character in a member name.
     */
    const controlAt = centralNameBytes.findIndex((byte) => byte < 0x20 || byte === 0x7f);
    if (controlAt !== -1) {
      throw new Error(
        `UNSAFE_ZIP_ENTRY: the member name contains a control character (0x`
        + `${centralNameBytes[controlAt].toString(16).padStart(2, '0')} at byte ${controlAt}), `
        + 'so different readers will disagree about where the name ends.',
      );
    }
    /*
     * BIT 11 SAYS WHICH ENCODING THE NAME IS IN, AND I WAS NOT ASKING.
     *
     * This reader calls `toString('utf8')` on every member name. APPNOTE 4.4.4
     * says the name is UTF-8 only when general-purpose bit 11 is SET; with the
     * bit clear it is the legacy IBM code page 437. So the bytes `c3 a9` are
     * `é` here and `├⌐` to a standards-based reader — one archive, two member
     * names, which is the same class as the Unicode Path extra field and the
     * NUL, at the site that decides the encoding rather than the site that
     * carries the name.
     *
     * A NON-ASCII BYTE IS REFUSED WHEN BIT 11 IS CLEAR rather than decoded as
     * CP437. Implementing a second encoding to grade a build artefact is a
     * larger surface than the problem deserves, and the two encodings agree
     * exactly on 0x00-0x7f — so refusing above that is the whole ambiguity,
     * removed without guessing. Verified against the committed real artefact
     * BEFORE writing this: its flags are 0x0008 (bit 11 clear) and its name is
     * pure ASCII, so nothing production emits is refused. That check came first
     * this time, which is the lesson of the two rounds this reader lost to
     * claims about what production emits.
     */
    if ((centralFlags & 0x0800) === 0) {
      const nonAsciiAt = centralNameBytes.findIndex((byte) => byte > 0x7f);
      if (nonAsciiAt !== -1) {
        throw new Error(
          `UNSAFE_ZIP_ENTRY: the member name carries byte 0x`
          + `${centralNameBytes[nonAsciiAt].toString(16)} at position ${nonAsciiAt} while `
          + 'general-purpose bit 11 is clear, which declares the name to be code page 437 and '
          + 'not UTF-8. This reader decodes UTF-8 only, so the name it grades would differ from '
          + 'the name a standards-based reader sees.',
        );
      }
    } else if (!Buffer.from(name, 'utf8').equals(centralNameBytes)) {
      /*
       * BIT 11 IS SET, SO THE NAME MUST SURVIVE THE ROUND TRIP. If re-encoding
       * the decoded name does not reproduce the original bytes, this reader
       * replaced something it could not decode — and every check below runs on
       * the replacement while another reader works on the bytes.
       */
      throw new Error(
        `UNSAFE_ZIP_ENTRY: the member name declares UTF-8 (general-purpose bit 11) but is not `
        + "valid UTF-8, so this reader's view of it differs from the bytes the archive carries.",
      );
    }
    /*
     * EXTRA FIELDS, BOTH COPIES. 0x7075 (Unicode Path) REPLACES the name, so an
     * archive can name `vitest-report.json` in its header and `other.json` in its
     * extra field — the reviewer built that and `bsdtar -tf` listed `other.json`
     * while this gate graded `vitest-report.json`. Allowlisted, not denylisted:
     * an unknown record is one whose effect is unknown.
     */
    assertSupportedExtraFields(buffer, offset + 46 + nameLength, extraLength, name, 'central');
    assertSupportedExtraFields(
      buffer, localOffset + 30 + localNameLength, localExtraLength, name, 'local',
    );

    const localMethod = zipUInt(buffer, localOffset + 8, 2, 'local method');
    const localCrc = zipUInt(buffer, localOffset + 14, 4, 'local CRC');
    const localCompressed = zipUInt(buffer, localOffset + 18, 4, 'local compressed size');
    const localUncompressed = zipUInt(buffer, localOffset + 22, 4, 'local uncompressed size');
    /*
     * STREAMED ENTRIES ARE THE LAYOUT THIS GATE ACTUALLY READS. I REFUSED THEM.
     *
     * I wrote "actions/upload-artifact does not stream — every artefact this
     * gate has ever read carries its sizes in the local header" and never once
     * opened an artefact to look. The reviewer did, in one command: repository
     * artefact 9264287002, produced by the same pinned upload-artifact SHA this
     * workflow uses, is 932 bytes with flags 0x0008 in BOTH headers, a zeroed
     * local crc and sizes, and a signed 16-byte descriptor at 819..835. My
     * refusal rejected it outright, and the tiling rule rejected the descriptor
     * as unaccounted bytes even with the refusal disabled. The gate could not
     * have read a single real artefact.
     *
     * That is the same defect as `npm ci` with no lockfile one branch over, and
     * the same one twice in a session: a claim about what production emits,
     * asserted from the armchair, never executed. The rule that would have
     * caught both: before refusing a construct because "ours never uses it",
     * fetch one of ours and look.
     *
     * So it is implemented, not half-honoured and not refused. Bit 3 means the
     * crc and sizes are zero in the local header and the real values follow the
     * data. Both halves are now enforced: the local values MUST be zero, and a
     * descriptor MUST be there carrying values that match the central record.
     */
    const localFlags = zipUInt(buffer, localOffset + 6, 2, 'local flags');
    // The two copies of the flags must agree at all, for the same reason every
    // other duplicated field must: two headers describing one entry differently
    // is an archive with two meanings. Round nine set localFlags=8 and
    // centralFlags=0 and was accepted, because only the local copy was read.
    if (localFlags !== centralFlags) {
      throw new Error(
        `CORRUPT_ZIP: "${name}" declares flags 0x${localFlags.toString(16)} in its local header `
        + `and 0x${centralFlags.toString(16)} in the central directory.`,
      );
    }
    /*
     * THE CLASS, NOT THE BIT. Bit 3 was the bit the reviewer named; it is one of
     * sixteen, and the others change how a record reads just as much. Every bit
     * gets a verdict here rather than waiting to be named individually:
     *
     *   0     encrypted                  REFUSED — the payload is not the file
     *   1,2   deflate level hint         accepted, changes nothing we read
     *   3     data descriptor            IMPLEMENTED below
     *   4     enhanced deflating         REFUSED — not raw deflate
     *   5     compressed patched data    REFUSED — payload is a patch, not content
     *   6     strong encryption          REFUSED — as bit 0
     *   7-10  unused                     REFUSED — an unused bit that is set is
     *                                    a writer we do not understand
     *   11    UTF-8 name                 accepted, this reader decodes UTF-8
     *   12    reserved (PKWARE)          REFUSED
     *   13    masked local header values REFUSED — this bit exists to make the
     *                                    local crc and sizes lie
     *   14,15 reserved                   REFUSED
     */
    const unsupportedFlags = localFlags & ~SUPPORTED_ZIP_FLAG_BITS & 0xffff;
    if (unsupportedFlags !== 0) {
      throw new Error(
        `UNSUPPORTED_ZIP: "${name}" sets general-purpose flag bit(s) `
        + `0x${unsupportedFlags.toString(16).padStart(4, '0')}, which change how the record is `
        + 'read in ways this reader does not implement.',
      );
    }
    const streamed = (localFlags & 0x08) !== 0;
    if (streamed) {
      /*
       * The other half of bit 3. The flag's whole meaning is "these three fields
       * are zero here"; a non-zero value in one of them is a second, contradictory
       * claim about the entry sitting beside the descriptor's claim, which is
       * precisely the two-meanings archive every other check in this walk exists
       * to refuse.
       */
      if (localCrc !== 0 || localCompressed !== 0 || localUncompressed !== 0) {
        throw new Error(
          `CORRUPT_ZIP: "${name}" sets the data-descriptor flag, which means its local crc and `
          + `sizes are zero and the real values follow the data, but the local header carries `
          + `crc ${localCrc}, compressed size ${localCompressed}, uncompressed size `
          + `${localUncompressed}.`,
        );
      }
    }
    /*
     * THE SWEEP, DRIVEN BY THE TABLE RATHER THAN BY MEMORY.
     *
     * The previous revision hand-wrote four comparisons and a comment claiming
     * every shared field was covered. Three were not: version-needed,
     * modification time and modification date are all duplicated and all were
     * unread, so an archive declaring version-needed 63 locally and 20 centrally
     * was accepted — one entry, two claims about what it takes to read it.
     *
     * Four rounds have now been lost to this one class, each fixing the field
     * that was named. Enumerating the table is the only version of this fix that
     * is not another instance of the same mistake.
     */
    for (const field of DUPLICATED_HEADER_FIELDS) {
      const localValue = zipUInt(buffer, localOffset + field.local, field.size,
        `local ${field.label}`);
      const centralValue = zipUInt(buffer, offset + field.central, field.size,
        `central ${field.label}`);
      // The three fields bit 3 zeroes locally are checked against zero above and
      // against the descriptor below; comparing them to the central copy here
      // would refuse every streamed entry, which is how this reader spent a round
      // rejecting every real artefact.
      if (field.zeroWhenStreamed && streamed) continue;
      if (localValue !== centralValue) {
        throw new Error(
          `CORRUPT_ZIP: "${name}" declares ${field.label} ${localValue} in its local header and `
          + `${centralValue} in the central directory; the two disagree about how to read it.`,
        );
      }
      /*
       * AND THE AGREED VALUE MUST BE ONE THIS READER SUPPORTS. Two headers
       * agreeing on a value neither this reader nor `unzip` can honour is still
       * an archive with two meanings — ours returns bytes, theirs refuses the
       * entry. Agreement was the only question the table asked, and it was half
       * the question.
       */
      if (field.maximum !== undefined && centralValue > field.maximum) {
        throw new Error(
          `UNSUPPORTED_ZIP: "${name}" declares ${field.label} ${centralValue}, above the `
          + `${field.maximum} this reader implements. A reader that cannot honour the declared `
          + 'feature level and returns the bytes anyway disagrees with every reader that can.',
        );
      }
    }
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) {
      throw new Error(`CORRUPT_ZIP: "${name}" declares more bytes than the archive holds.`);
    }
    // The local records region ends where the central directory begins. An entry
    // whose bytes run into the directory is describing a different archive.
    if (dataEnd > directoryStart) {
      throw new Error(
        `CORRUPT_ZIP: "${name}" extends into the central directory, so the archive's own `
        + 'layout is inconsistent.',
      );
    }
    /*
     * The record does not end at the data when the entry streams. PKWARE APPNOTE
     * 4.3.9 puts the descriptor immediately after the compressed bytes, and it is
     * part of the entry — so it belongs in the extent, or the tiling rule reports
     * it as unindexed bytes and refuses the archive. That is exactly what
     * happened to the real artefact once the blanket refusal was lifted.
     *
     * Only the SIGNED 16-byte form is accepted. The unsigned 12-byte form is
     * equally legal, and telling the two apart means guessing whether the first
     * four bytes are a signature or a CRC that happens to equal 0x08074b50 —
     * a heuristic, in a reader whose entire job is to not guess. upload-artifact
     * emits the signature (verified against artefact 9264287002), so requiring it
     * costs nothing real and keeps the extent arithmetic exact.
     */
    let recordEnd = dataEnd;
    if (streamed) {
      recordEnd = dataEnd + 16;
      if (recordEnd > directoryStart) {
        throw new Error(
          `CORRUPT_ZIP: "${name}" streams, so a 16-byte data descriptor must follow its data, `
          + `but only ${directoryStart - dataEnd} byte(s) remain before the central directory.`,
        );
      }
      if (zipUInt(buffer, dataEnd, 4, 'data descriptor signature') !== 0x08074b50) {
        throw new Error(
          `CORRUPT_ZIP: "${name}" streams but no signed data descriptor follows its data. `
          + 'This reader requires the 16-byte signed form; the unsigned form cannot be told '
          + 'from a CRC without guessing.',
        );
      }
      const descriptorFields = [
        ['CRC', zipUInt(buffer, dataEnd + 4, 4, 'descriptor CRC'), expectedCrc],
        ['compressed size', zipUInt(buffer, dataEnd + 8, 4, 'descriptor compressed size'),
          compressedSize],
        ['uncompressed size', zipUInt(buffer, dataEnd + 12, 4, 'descriptor uncompressed size'),
          uncompressedSize],
      ];
      // The descriptor is the streamed entry's only local claim about its own
      // bytes. If it disagrees with the directory, the archive means two things
      // again — the same rule as the non-streamed branch, applied to the copy
      // that actually exists.
      for (const [label, descriptor, central] of descriptorFields) {
        if (descriptor !== central) {
          throw new Error(
            `CORRUPT_ZIP: "${name}" declares ${label} ${descriptor} in its data descriptor and `
            + `${central} in the central directory; the two disagree about how to read it.`,
          );
        }
      }
    }
    extents.push({ name, start: localOffset, end: recordEnd });
    const raw = buffer.subarray(dataStart, dataEnd);

    let contents;
    if (method === 0) contents = raw;
    else if (method === 8) {
      contents = inflateRawSync(raw);
      /*
       * THE DEFLATE STREAM MUST CONSUME EVERY BYTE THE ENTRY DECLARES.
       *
       * `inflateRawSync` STOPS at the end of the deflate stream and silently
       * ignores whatever follows — verified: 13 bytes of real stream followed by
       * 400 bytes of anything inflates cleanly and returns the 13 bytes' output.
       *
       * So an entry could declare `compressedSize` 1000, carry a 50-byte stream,
       * and hold 950 unexamined bytes INSIDE ITS OWN EXTENT. The tiling rule does
       * not see it: tiling proves every byte belongs to SOME entry, and these
       * bytes do — they are just not payload. A complete unindexed local record
       * fits there, and a reader that scans for local headers rather than
       * following the directory finds a file this gate never graded.
       *
       * That is the same two-meanings archive as every other refusal here, at the
       * one place the tiling argument could not reach. Found by an independent
       * reviewer; the tiling comment two screens down claims "there is then
       * nowhere for an unindexed record to be", and this was where.
       *
       * Node exposes no consumed-byte count on the sync API, so the length is
       * recovered by binary search: inflating a PREFIX throws while the stream is
       * truncated and succeeds once it is complete, and that success is monotonic
       * in the prefix length (verified). The smallest prefix that inflates is
       * therefore exactly the stream's length. ~20 inflates for a 1MB entry.
       */
      let low = 1;
      let high = raw.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        try { inflateRawSync(raw.subarray(0, mid)); high = mid; } catch { low = mid + 1; }
      }
      if (low !== raw.length) {
        throw new Error(
          `CORRUPT_ZIP: "${name}" declares ${raw.length} compressed bytes but its deflate stream `
          + `ends after ${low}. The remaining ${raw.length - low} byte(s) are inside the entry `
          + 'and are not its payload, so another reader may find a record there.',
        );
      }
    }
    else throw new Error(`UNSUPPORTED_ZIP_METHOD: ${method} for "${name}".`);

    if (contents.length !== uncompressedSize) {
      throw new Error(
        `CORRUPT_ZIP: "${name}" inflated to ${contents.length} bytes, the header says ${uncompressedSize}.`,
      );
    }
    // The CRC is the archive's own integrity claim about this entry. Reading the
    // bytes without checking it would accept a truncated or altered payload whose
    // length happened to match.
    const actualCrc = crc32(contents);
    if (actualCrc !== expectedCrc) {
      throw new Error(
        `CORRUPT_ZIP: "${name}" has CRC ${actualCrc.toString(16)}, the header says `
        + `${expectedCrc.toString(16)}.`,
      );
    }
    entries.push({ name, contents });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (offset !== eocd) {
    throw new Error(
      `CORRUPT_ZIP: the central directory declared ${count} entries but ${eocd - offset} `
      + 'bytes remain unread before the EOCD; the archive holds records the count hides.',
    );
  }

  /*
   * NO TWO ENTRIES MAY CLAIM THE SAME BYTES. One entry's local header sitting
   * inside another entry's data means the same region is a header to this
   * reader and opaque payload to the next one — the archive means two different
   * things depending on who opens it, and this gate would be certifying whichever
   * one it happened to see.
   */
  /*
   * THE INDEXED ENTRIES MUST TILE THE WHOLE LOCAL-RECORDS REGION.
   *
   * Overlap alone was not enough, and round nine showed why: it put a SECOND
   * complete local record named `vitest-report.json` in the GAP between two
   * indexed extents. Nothing overlapped, the central directory declared only
   * the first, and the reader accepted the indexed payload while a second
   * record with the same name sat unread in the archive — a file that another
   * ZIP reader may well hand back instead.
   *
   * Checking for overlap is detect-the-bad-thing; requiring the extents to
   * account for every byte from zero to the directory is positive proof. There
   * is then nowhere for an unindexed record to be.
   */
  const ordered = [...extents].sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const entry of ordered) {
    if (entry.start < cursor) {
      throw new Error(
        `CORRUPT_ZIP: "${entry.name}" starts inside the preceding entry, so two entries claim `
        + 'the same bytes and the archive has no single meaning.',
      );
    }
    if (entry.start > cursor) {
      throw new Error(
        `CORRUPT_ZIP: ${entry.start - cursor} unindexed byte(s) sit before "${entry.name}". `
        + 'The central directory does not account for every record in the archive.',
      );
    }
    cursor = entry.end;
  }
  if (cursor !== directoryStart) {
    throw new Error(
      `CORRUPT_ZIP: ${directoryStart - cursor} byte(s) between the last indexed entry and the `
      + 'central directory are not accounted for by any entry.',
    );
  }

  return entries;
}

/** Lists a run's artefacts. Injectable so tests never reach the network. */
export function ghArtifactLister(repo, runId) {
  if (!isValidRepo(repo)) throw new Error(`INVALID_REPO: "${repo}" is not owner/name.`);
  if (!NUMERIC_ID.test(String(runId))) throw new Error(`INVALID_RUN_ID: "${runId}" is not numeric.`);
  const raw = execFileSync(
    'gh',
    ['api', '--paginate', `repos/${repo}/actions/runs/${runId}/artifacts?per_page=100`],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return JSON.parse(raw);
}

/**
 * Fetches one run ATTEMPT. Injectable so tests never reach the network.
 *
 * Verified live 2026-08-16 against the GitHub API, with positive controls:
 * `/runs/{id}/attempts/{n}` returns `run_attempt` and `run_started_at`;
 * `/runs/{id}/attempts/{n}/jobs` exists (15 jobs on the control run); and
 * `/runs/{id}/attempts/{n}/artifacts` returns 404 — there is NO attempt-scoped
 * artefact listing. That 404 was checked against a working sibling path so it
 * means "no such endpoint" rather than "wrong run".
 */
export function ghRunAttemptFetcher(repo, runId, attempt) {
  if (!isValidRepo(repo)) throw new Error(`INVALID_REPO: "${repo}" is not owner/name.`);
  if (!NUMERIC_ID.test(String(runId))) throw new Error(`INVALID_RUN_ID: "${runId}" is not numeric.`);
  if (!NUMERIC_ID.test(String(attempt))) {
    throw new Error(`INVALID_RUN_ATTEMPT: "${attempt}" is not numeric.`);
  }
  const raw = execFileSync(
    'gh',
    ['api', `repos/${repo}/actions/runs/${runId}/attempts/${attempt}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return JSON.parse(raw);
}

/** Downloads one artefact's ZIP. Injectable so tests never reach the network. */
export function ghArtifactDownloader(repo, artifactId) {
  if (!isValidRepo(repo)) throw new Error(`INVALID_REPO: "${repo}" is not owner/name.`);
  if (!NUMERIC_ID.test(String(artifactId))) {
    throw new Error(`INVALID_ARTIFACT_ID: "${artifactId}" is not numeric.`);
  }
  return execFileSync(
    'gh',
    ['api', `repos/${repo}/actions/artifacts/${artifactId}/zip`],
    { encoding: 'buffer', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

/**
 * THE FIX FOR THE FORGED-EVIDENCE P0. Round six pointed the checker at a fixture
 * the repository's own README declares SYNTHETIC and got a gated PASS for a real
 * job on a real SHA. Provenance bound the JOB; nothing bound the FILE to it, so
 * "neither fixture can be replayed as evidence for a real SHA" was simply false.
 *
 * The evidence is now fetched from the run's own artefacts through the API and
 * re-bound to the resolved run and commit. `--gate` no longer accepts a path at
 * all, so there is no caller-supplied byte in the graded evidence.
 */
export function resolveEvidenceArtifact({
  check, repo, runId, expectedSha, expectedRunAttempt,
  lister = ghArtifactLister, downloader = ghArtifactDownloader,
  attemptFetcher = ghRunAttemptFetcher,
}) {
  /*
   * VALIDATE THE OPERANDS, NOT ONLY THE RELATION BETWEEN THEM.
   *
   * Round nine called `resolveEvidenceArtifact` directly with `runId: ''`,
   * `workflow_run.id: ''` and `expectedSha: 'not-a-commit'` with a matching
   * `head_sha`, and got back an accepted source record. Every ownership check
   * above passed honestly: `'' === ''` is true and `'not-a-commit'` is truthy.
   * The comparisons were never the weak point — comparing two values nobody had
   * proved were identifiers was.
   *
   * The CLI validates these shapes before it calls in. That is not a defence:
   * this function is exported, tests call it directly, and a guarantee that only
   * holds for one caller is a guarantee about that caller. The boundary that
   * enforces a rule has to be the boundary that states it.
   */
  // ABSENT is the caller's contract and keeps its own message; UNSHAPED is about
  // the values that did arrive. Collapsing the two lost this refusal for one
  // commit — `assertShapedIdentity` skips `undefined` by design, so replacing
  // the inline block with it silently removed the absent-attempt guard.
  if (expectedRunAttempt === undefined) {
    throw new Error(
      'ARTIFACT_ATTEMPT_UNBOUND: expectedRunAttempt is required. A re-run reuses the run id, '
      + "so binding the run alone lets an earlier attempt's artefact stand in for a later one.",
    );
  }
  assertShapedIdentity({
    repo, expectedSha, expectedRunId: runId, expectedRunAttempt, prefix: 'ARTIFACT',
  });
  if (!check.artifact || !check.reportEntry) {
    throw new Error(
      `ARTIFACT_UNDECLARED: check "${check.id}" declares no artifact/reportEntry, so its `
      + 'evidence cannot be fetched from the run and cannot be gated.',
    );
  }
  const artifactName = resolveArtifactName(check, expectedSha);
  const listing = lister(repo, runId);
  const all = Array.isArray(listing?.artifacts) ? listing.artifacts : [];
  const named = all.filter((artifact) => artifact?.name === artifactName);

  if (named.length === 0) {
    throw new Error(
      `ARTIFACT_ABSENT: run ${runId} uploaded no artefact named "${artifactName}". `
      + 'A run that produced no evidence has not proven anything, so this is a refusal '
      + 'rather than an empty report.',
    );
  }
  if (named.length > 1) {
    throw new Error(
      `ARTIFACT_AMBIGUOUS: run ${runId} has ${named.length} artefacts named "${artifactName}"; `
      + 'which one is the evidence cannot be determined.',
    );
  }

  const [artifact] = named;
  // The artefact's OWN id, from the listing. The default downloader validates it
  // before building a URL, but round nine passed `id: 'not-an-id'` through the
  // injectable seam and got an accepted source record naming it — a guarantee
  // that holds only for the default caller is a guarantee about that caller.
  assertShapedIdentity({ artifactId: artifact.id, prefix: 'ARTIFACT' });
  if (artifact.expired === true) {
    throw new Error(
      `ARTIFACT_EXPIRED: "${artifactName}" from run ${runId} has expired. Expired evidence `
      + 'is absent evidence.',
    );
  }
  /*
   * THE OWNERSHIP CHECK IS UNCONDITIONAL, BECAUSE ABSENT IS NOT MATCHED.
   *
   * Both checks used to read `x !== undefined && x !== expected`, so an artefact
   * whose `workflow_run` was missing or partial skipped them entirely and was
   * accepted — while this file's header claimed the evidence is "re-bound to the
   * resolved run and commit". Round eight demonstrated it with an artefact
   * carrying no `workflow_run` at all. A guarantee with a conditional is a
   * guarantee about the inputs that happen to carry the field.
   *
   * This is the same defect class the previous commit on this branch was named
   * for — "absent is not passed" — recurring one layer out, which is why the
   * refusal is now stated once for the whole record rather than per field.
   */
  const owner = artifact.workflow_run;
  if (owner === null || typeof owner !== 'object' || Array.isArray(owner)) {
    throw new Error(
      `ARTIFACT_OWNERSHIP_UNVERIFIABLE: artefact ${artifact.id} carries no workflow_run, so it `
      + 'cannot be bound to a run or a commit. Unverifiable ownership is refused, not assumed.',
    );
  }
  const owningRun = owner.id;
  if (!NUMERIC_ID.test(String(owningRun ?? ''))) {
    throw new Error(
      `ARTIFACT_OWNERSHIP_UNVERIFIABLE: artefact ${artifact.id} names no numeric owning run id `
      + `(${JSON.stringify(owningRun)}).`,
    );
  }
  if (String(owningRun) !== String(runId)) {
    throw new Error(
      `ARTIFACT_FOREIGN_RUN: artefact ${artifact.id} belongs to run ${owningRun}, not ${runId}.`,
    );
  }
  if (!expectedSha) {
    throw new Error(
      `ARTIFACT_SHA_UNBOUND: no resolved commit was supplied, so artefact ${artifact.id} `
      + 'cannot be bound to the commit under test.',
    );
  }
  const owningSha = owner.head_sha;
  if (typeof owningSha !== 'string' || !SHA_PATTERN.test(owningSha)) {
    throw new Error(
      `ARTIFACT_OWNERSHIP_UNVERIFIABLE: artefact ${artifact.id} names no 40-hex owning head_sha `
      + `(${JSON.stringify(owningSha)}).`,
    );
  }
  if (owningSha !== expectedSha) {
    throw new Error(
      `ARTIFACT_FOREIGN_SHA: artefact ${artifact.id} was produced on ${owningSha}, not ${expectedSha}.`,
    );
  }

  /*
   * WHICH ATTEMPT PRODUCED THESE BYTES. GitHub exposes no attempt field on an
   * artefact — verified live: `workflow_run` carries exactly head_branch,
   * head_repository_id, head_sha, id and repository_id, and there is no
   * `/attempts/{n}/artifacts` endpoint. A partial re-run therefore CARRIES
   * attempt 1's artefacts into attempt 2, and round seven certified attempt 2
   * with attempt 1's bytes on exactly that basis.
   *
   * What the API does give is the artefact's `created_at` and the attempt's
   * `run_started_at`. An artefact created before the attempt began cannot have
   * come out of it. That is a real binding rather than a name check, and it is
   * the strongest one available; where it stops is stated in the header.
   */
  const attempt = attemptFetcher(repo, runId, expectedRunAttempt);
  if (String(attempt?.run_attempt) !== String(expectedRunAttempt)) {
    throw new Error(
      `ATTEMPT_MISMATCH: the API returned attempt ${attempt?.run_attempt} for the requested `
      + `attempt ${expectedRunAttempt}.`,
    );
  }
  const attemptStarted = Date.parse(attempt?.run_started_at ?? '');
  const artifactCreated = Date.parse(artifact.created_at ?? '');
  if (Number.isNaN(attemptStarted) || Number.isNaN(artifactCreated)) {
    throw new Error(
      'ARTIFACT_TIME_UNVERIFIABLE: the artefact has no usable created_at, or the attempt has '
      + 'no usable run_started_at, so which attempt produced these bytes cannot be established.',
    );
  }
  if (artifactCreated < attemptStarted) {
    throw new Error(
      `ARTIFACT_PRECEDES_ATTEMPT: artefact ${artifact.id} was created at ${artifact.created_at}, `
      + `before attempt ${expectedRunAttempt} started at ${attempt.run_started_at}. It is an `
      + 'earlier attempt\'s evidence carried forward by a partial re-run.',
    );
  }

  const entries = readZipEntries(downloader(repo, artifact.id));
  /*
   * actions/upload-artifact roots the archive at the common ancestor of the files
   * it matched, so a single-file upload yields a bare "vitest-report.json" while a
   * directory upload yields "some/nested/path/results.sarif" — both shapes were
   * observed in this repository's real artefacts. The spine artefact has never
   * been produced (its workflow change ships on this branch), so which shape it
   * will take is NOT verified. Accepting either and refusing when more than one
   * entry answers is the honest handling; guessing one layout would be a silent
   * assumption inside a gate.
   */
  const wanted = entries.filter(
    (entry) => entry.name === check.reportEntry
      || entry.name.split('/').pop() === check.reportEntry,
  );
  if (wanted.length === 0) {
    throw new Error(
      `ARTIFACT_MISSING_REPORT: "${artifactName}" contains `
      + `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} `
      + `(${entries.map((e) => e.name).join(', ') || 'none'}) but not "${check.reportEntry}".`,
    );
  }
  if (wanted.length > 1) {
    throw new Error(
      `ARTIFACT_DUPLICATE_REPORT: "${artifactName}" contains "${check.reportEntry}" `
      + `${wanted.length} times.`,
    );
  }

  return {
    text: wanted[0].contents.toString('utf8'),
    source: {
      artifactId: artifact.id,
      artifactName: artifact.name,
      digest: artifact.digest ?? null,
      sizeInBytes: artifact.size_in_bytes ?? null,
      // The member ACTUALLY graded, not the name the manifest asked for. Nested
      // and bare layouts both resolve, so reporting the declared name labelled
      // `nested/vitest-report.json` as `vitest-report.json` — a provenance record
      // that names a different file from the one it describes is worse than none.
      entry: wanted[0].name,
      declaredEntry: check.reportEntry,
      createdAt: artifact.created_at ?? null,
      runAttempt: expectedRunAttempt,
    },
  };
}

/**
 * The artefact name may carry the commit, as this repository's does
 * (`spine-test-evidence-${{ github.sha }}`). Substituting the SHA the API
 * resolved — never one the caller typed — makes the NAME itself a binding: an
 * artefact from another commit does not answer to it.
 */
export function resolveArtifactName(check, sha) {
  if (!check.artifact.includes('{sha}')) return check.artifact;
  if (!sha || !SHA_PATTERN.test(sha)) {
    throw new Error(
      `ARTIFACT_NAME_UNBOUND: check "${check.id}" names its artefact with {sha}, but no `
      + 'resolved 40-hex commit was available to substitute.',
    );
  }
  return check.artifact.split('{sha}').join(sha);
}

/**
 * Binds a job id to its commit, conclusion and identity using API metadata only.
 * Every mismatch is a refusal, never a downgrade to a graded result.
 */
export function resolveProvenance({
  check, repo, jobId, expectedSha, expectedRunId, expectedRunAttempt,
  fetcher = ghJobFetcher,
}) {
  // No default. A previous revision defaulted expectedRunId to null and then
  // skipped run binding when it was null, so a library caller who simply forgot
  // the argument silently got the weaker check.
  /*
   * Both are required. The previous revision closed this footgun for the run id
   * and left the identical one open for the attempt: `expectedRunAttempt = null`
   * defaulted, then the check below was skipped when null, so a caller who simply
   * omitted it silently got the weaker guarantee while the refusal message
   * claimed protection "across runs and re-run attempts".
   */
  if (expectedRunId === undefined) {
    throw new Error('PROVENANCE_UNBOUND: expectedRunId is required; pass the run id explicitly.');
  }
  if (expectedRunAttempt === undefined) {
    throw new Error(
      'PROVENANCE_UNBOUND: expectedRunAttempt is required. A re-run reuses the run id, so '
      + "binding the run alone lets an earlier attempt's evidence stand in for a later one.",
    );
  }
  /*
   * SHAPED, NOT MERELY PRESENT — the same class as the artefact resolver, at the
   * sibling boundary it was not applied to.
   *
   * Round eight called this with `repo: 'not/a/valid/repo'` and empty
   * job/run/attempt ids, and a fetcher returning matching empty fields, and got
   * an accepted provenance record of `{jobId:"", runId:"", runAttempt:""}`.
   * Requiring a value and requiring an identifier are different requirements,
   * and `'' !== undefined`.
   */
  assertShapedIdentity({
    repo, jobId, expectedSha, expectedRunId, expectedRunAttempt, prefix: 'PROVENANCE',
  });
  const job = fetcher(repo, jobId);

  const headSha = job?.head_sha;
  if (typeof headSha !== 'string' || !SHA_PATTERN.test(headSha)) {
    throw new Error(`PROVENANCE_ABSENT: job ${jobId} returned no usable head_sha.`);
  }
  if (headSha !== expectedSha) {
    throw new Error(
      `PROVENANCE_MISMATCH: --sha asserts ${expectedSha} but job ${jobId} ran on ${headSha}.`,
    );
  }
  if (job.name !== check.requiredCheck) {
    throw new Error(
      `PROVENANCE_WRONG_JOB: job ${jobId} is "${job.name}", not the required check `
      + `"${check.requiredCheck}". Evidence from another job does not satisfy this one.`,
    );
  }
  if (job.status !== 'completed') {
    throw new Error(`PROVENANCE_INCOMPLETE: job ${jobId} is "${job.status}", not completed.`);
  }
  /*
   * A cancelled or skipped job produced partial output at best, so its report is
   * not evidence of anything. A FAILED job is still evidence — the tests ran and
   * some of them failed — so failure is deliberately allowed through.
   */
  if (!['success', 'failure'].includes(job.conclusion)) {
    throw new Error(
      `PROVENANCE_UNUSABLE_CONCLUSION: job ${jobId} concluded "${job.conclusion}". `
      + 'Only success or failure produce a complete report.',
    );
  }
  /*
   * A job NAME is not unique: the same required check runs on every push, and a
   * re-run creates a new attempt. Without binding the run, evidence from any
   * other run of the same job on the same commit would satisfy this one.
   */
  if (String(job.run_id) !== String(expectedRunId)) {
    throw new Error(
      `PROVENANCE_WRONG_RUN: job ${jobId} belongs to run ${job.run_id}, not ${expectedRunId}.`,
    );
  }
  /*
   * A re-run reuses the run id and increments the attempt, so binding the run
   * alone still lets an earlier attempt's evidence stand in for a later one.
   */
  if (String(job.run_attempt) !== String(expectedRunAttempt)) {
    throw new Error(
      `PROVENANCE_WRONG_ATTEMPT: job ${jobId} is attempt ${job.run_attempt}, `
      + `not ${expectedRunAttempt}.`,
    );
  }
  /*
   * Unconditional on purpose. The previous revision guarded this with
   * `if (check.workflowName)` while the manifest declared no such field, so the
   * branch could never throw and a job from ANY workflow was accepted — a control
   * that read as protection and could not fire. validateManifest now requires
   * workflowName, so there is nothing to be defensive about: a missing value is a
   * manifest error raised earlier, not a reason to wave a job through here.
   */
  if (job.workflow_name !== check.workflowName) {
    throw new Error(
      `PROVENANCE_WRONG_WORKFLOW: job ${jobId} ran in `
      + `"${job.workflow_name}", not "${check.workflowName}".`,
    );
  }

  return {
    sha: headSha,
    jobId: String(jobId),
    jobName: job.name,
    runId: job.run_id ?? null,
    runAttempt: job.run_attempt ?? null,
    conclusion: job.conclusion ?? null,
    workflowName: job.workflow_name ?? null,
  };
}

// ---------------------------------------------------------------------------
// The completeness check
// ---------------------------------------------------------------------------

export function checkEvidenceCompleteness({ check, observed, provenance }) {
  const violations = [];
  const evidence = [];

  /*
   * COMPLETENESS IS NOT SUCCESS. A failed job's report is still evidence that the
   * tests RAN, which is why resolveProvenance accepts conclusion "failure" — but
   * a gate that answers PASS over a red job is worse than useless. Both the job's
   * own conclusion and any failing assertion are violations here, so the verdict
   * can never be greener than the run it describes.
   */
  if (provenance && provenance.conclusion === 'failure') {
    violations.push({
      suite: null,
      reason: 'JOB_CONCLUDED_FAILURE',
      status: 'FAILED',
      detail: `Job ${provenance.jobId} concluded "failure"; its evidence is complete but red.`,
    });
  }
  /*
   * An assertion status this build does not understand is an evidence problem,
   * not a silent bucket. Surfacing it is also what makes the prototype-safe
   * counting above observable: without it, `status in counts` and
   * `Object.hasOwn(counts, status)` are indistinguishable from the outside,
   * because an inherited key can only pollute a counter nothing reads.
   */
  for (const suite of observed.suites) {
    if (!suite.unrecognised) continue;
    violations.push({
      suite: suite.suite,
      reason: 'UNRECOGNISED_ASSERTION_STATUS',
      status: 'UNKNOWN',
      detail: `${suite.unrecognised} of ${suite.declared} assertions report a status this `
        + 'checker does not understand, so they cannot be counted as evidence either way.',
    });
  }

  for (const suite of observed.suites) {
    if (!suite.failed) continue;
    violations.push({
      suite: suite.suite,
      reason: 'SUITE_HAS_FAILURES',
      status: 'FAILED',
      executed: suite.executed,
      detail: `${suite.failed} of ${suite.declared} assertions failed.`,
    });
  }

  /*
   * THE FILE'S OWN VERDICT. A suite whose assertions all passed can still have
   * failed — an afterAll hook that throws, a setup error, an unhandled rejection.
   * Round six built exactly that report and the checker returned PASS with zero
   * violations, because nothing read below the assertion level.
   */
  for (const suite of observed.suites) {
    /*
     * A MISSING FILE VERDICT IS NOT A PASSING ONE. Round six added this guard and
     * round seven walked straight past it by DELETING `status` from every file
     * record: `fileStatus !== null` skipped the check and the report was
     * certified. That is the same missing-field-reads-as-success shape the
     * `success` guard already refuses, relocated one level down — and the lesson
     * is that adding a guard for a wrong VALUE without one for an absent value
     * just moves the hole.
     */
    if (suite.fileStatus === null) {
      violations.push({
        suite: suite.suite,
        reason: 'SUITE_FILE_VERDICT_ABSENT',
        status: 'UNKNOWN',
        executed: suite.executed,
        detail: 'The file record carries no `status`, so whether the suite itself passed '
          + 'cannot be read. Absent is not passed.',
      });
    } else if (suite.fileStatus !== 'passed') {
      violations.push({
        suite: suite.suite,
        reason: 'SUITE_FILE_NOT_PASSED',
        status: 'FAILED',
        executed: suite.executed,
        detail: `The file reports status "${suite.fileStatus}" regardless of its `
          + `${suite.passed} passing assertions.`,
      });
    }
    if (suite.failureMessage) {
      violations.push({
        suite: suite.suite,
        reason: 'SUITE_REPORTED_FAILURE_MESSAGE',
        status: 'FAILED',
        executed: suite.executed,
        detail: `The file carries a failure message: ${suite.failureMessage.slice(0, 200)}`,
      });
    }
  }

  if (observed.declaredSuccess === false) {
    violations.push({
      suite: null,
      reason: 'REPORT_DECLARES_FAILURE',
      status: 'FAILED',
      detail: 'The report sets success=false. Whatever the assertion counts say, the run '
        + 'that produced this evidence did not succeed.',
    });
  }
  if (observed.declaredSuccess === null) {
    violations.push({
      suite: null,
      reason: 'REPORT_UNVERIFIABLE',
      status: 'UNKNOWN',
      detail: 'The report has no boolean `success` field, so its own verdict on itself '
        + 'cannot be read. A missing field is not a passing one.',
    });
  }
  if (observed.failedSuites === null) {
    violations.push({
      suite: null,
      reason: 'REPORT_UNVERIFIABLE',
      status: 'UNKNOWN',
      detail: 'The report has no integer `numFailedTestSuites`, so a suite that failed '
        + 'outside its assertions cannot be counted.',
    });
  } else if (observed.failedSuites > 0) {
    violations.push({
      suite: null,
      reason: 'REPORT_DECLARES_FAILED_SUITES',
      status: 'FAILED',
      detail: `${observed.failedSuites} test suite(s) failed at the file level.`,
    });
  }

  /*
   * A SUITE SUMMARY THAT CONTRADICTS ITSELF IS NOT EVIDENCE.
   *
   * The three siblings of `numFailedTestSuites` were parsed but never read, so
   * a report claiming zero total suites, or a negative passed count, or one
   * pending suite that no file record shows, was certified. Each of those says
   * something different about whether the run happened, and none of them can be
   * reconciled with the per-file records the rest of this checker grades.
   */
  const summary = observed.suiteSummary;
  if (!summary || !summary.coherent) {
    violations.push({
      suite: null,
      reason: 'SUITE_SUMMARY_INCOHERENT',
      status: 'UNKNOWN',
      detail: 'The reporter\'s own suite counts do not add up ('
        + `total ${summary?.total}, passed ${summary?.passed}, failed ${summary?.failed}, `
        + `pending ${summary?.pending}), so what it claims about suites cannot be read.`,
    });
  } else if (summary.pending > 0) {
    violations.push({
      suite: null,
      reason: 'REPORT_DECLARES_PENDING_SUITES',
      status: 'FAILED',
      detail: `${summary.pending} test suite(s) never ran. A suite that was pending did not `
        + 'execute, which is the defect this checker exists to catch.',
    });
  }

  const declaredTotal = observed.totals.declared;
  if (typeof observed.reported.total !== 'number') {
    // Without the reporter's own total there is nothing to reconcile against, so
    // a truncated report is indistinguishable from a complete one. Refuse.
    violations.push({
      suite: null,
      reason: 'REPORT_UNVERIFIABLE',
      status: 'INCOMPLETE',
      detail: 'The evidence carries no numeric numTotalTests, so per-file records '
        + 'cannot be reconciled and truncation cannot be ruled out.',
    });
  } else if (observed.reported.total !== declaredTotal) {
    violations.push({
      suite: null,
      reason: 'SUMMARY_MISMATCH',
      status: 'INCONSISTENT',
      detail: `Per-file records account for ${declaredTotal} tests; the reporter's own `
        + `numTotalTests says ${observed.reported.total}.`,
    });
  }

  /*
   * A consistent TOTAL with an inconsistent distribution is still a broken
   * report: 22 tests where the summary claims 22 passed while the files show 3
   * passed and 19 skipped reconciles on the headline and nowhere else.
   */
  const distribution = [
    ['numPassedTests', observed.reported.passed, observed.totals.passed],
    ['numFailedTests', observed.reported.failed, observed.totals.failed],
    ['numTodoTests', observed.reported.todo, observed.totals.todo],
    ['numPendingTests', observed.reported.pending, observed.totals.skipped - observed.totals.todo],
  ];
  for (const [field, reported, computed] of distribution) {
    if (typeof reported !== 'number') {
      // Skipping a missing field let a selectively-edited summary evade the whole
      // distribution check while keeping numTotalTests consistent.
      violations.push({
        suite: null,
        reason: 'REPORT_UNVERIFIABLE',
        status: 'INCOMPLETE',
        detail: `The evidence carries no numeric ${field}, so the distribution cannot be `
          + 'reconciled.',
      });
      continue;
    }
    if (reported === computed) continue;
    violations.push({
      suite: null,
      reason: 'SUMMARY_MISMATCH',
      status: 'INCONSISTENT',
      detail: `Per-file records account for ${computed} ${field}; the reporter says ${reported}.`,
    });
  }

  for (const suite of observed.suites) {
    if (!suite.conflict) continue;
    violations.push({
      suite: suite.suite,
      reason: 'CONFLICTING_SUITE_RECORDS',
      status: 'AMBIGUOUS',
      detail: 'The report contains more than one record for this path. Even records whose '
        + 'headline counts agree may cover different assertions, so neither is chosen.',
    });
  }

  const observedBySuite = new Map(observed.suites.map((suite) => [suite.suite, suite]));
  const declaredSuites = new Set(check.suites.map((suite) => suite.suite));
  const executedCapabilities = new Set();

  for (const declared of check.suites) {
    const seen = observedBySuite.get(declared.suite);
    /*
     * PARTIAL EXECUTION IS PARTIAL EVIDENCE. `executed > 0` was enough to mark a
     * suite EXECUTED and to satisfy the capability floor, so a suite running one
     * trivial assertion while `describe.skipIf` disabled the RLS matrix scored as
     * proof of tenant isolation — UNI-2567's own defect surviving inside the tool
     * built to detect it. A REQUIRED_EVIDENCE suite must now execute every
     * assertion it declares; anything less is PARTIAL and proves nothing.
     */
    const fullyExecuted = Boolean(seen)
      && seen.declared > 0
      && seen.executed === seen.declared;
    const status = !seen
      ? 'UNAVAILABLE'
      : fullyExecuted ? 'EXECUTED' : seen.executed > 0 ? 'PARTIAL' : 'SKIPPED';

    const record = {
      suite: declared.suite,
      class: declared.class,
      capability: declared.capability,
      status,
      executed: seen ? seen.executed : 0,
      skipped: seen ? seen.skipped : 0,
      declared: seen ? seen.declared : 0,
    };
    evidence.push(record);

    if (fullyExecuted && !seen?.conflict) {
      executedCapabilities.add(declared.capability);
    }

    if (declared.class !== 'REQUIRED_EVIDENCE') continue;
    if (status === 'EXECUTED') continue;

    if (status === 'PARTIAL') {
      violations.push({
        ...record,
        reason: 'REQUIRED_EVIDENCE_PARTIALLY_EXECUTED',
        detail: `${record.executed} of ${record.declared} assertions ran; `
          + `${record.skipped} self-disabled.`,
      });
      continue;
    }

    violations.push({
      ...record,
      reason: record.status === 'UNAVAILABLE'
        ? 'REQUIRED_EVIDENCE_UNAVAILABLE'
        : 'REQUIRED_EVIDENCE_NOT_EXECUTED',
    });
  }

  // The coverage floor. This is what survives a rename or a relabel.
  for (const capability of check.requiredCapabilities) {
    if (executedCapabilities.has(capability)) continue;
    violations.push({
      suite: null,
      capability,
      reason: 'CAPABILITY_UNPROVEN',
      status: 'UNPROVEN',
      detail: `No suite executed that proves "${capability}".`,
    });
  }

  for (const seen of observed.suites) {
    if (declaredSuites.has(seen.suite)) continue;
    violations.push({
      suite: seen.suite,
      reason: 'UNDECLARED_SUITE',
      status: seen.status,
      executed: seen.executed,
      declared: seen.declared,
    });
  }

  return {
    check: check.id,
    requiredCheck: check.requiredCheck,
    provenance,
    sha: provenance?.sha ?? null,
    verdict: violations.length === 0 ? 'PASS' : 'FAIL',
    totals: observed.totals,
    reported: observed.reported,
    evidence,
    violations,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArguments(argv) {
  const options = {
    check: null, evidence: null, sha: null, job: null, run: null, attempt: null,
    repo: null, root: null, json: false, gate: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--check':
      case '--evidence':
      case '--sha':
      case '--job':
      case '--run':
      case '--attempt':
      case '--repo':
      case '--root': {
        const value = argv[index + 1];
        if (value === undefined || value.startsWith('--')) {
          throw new Error(`${argument} requires a value.`);
        }
        options[argument.slice(2)] = value;
        index += 1;
        break;
      }
      case '--json':
        options.json = true;
        break;
      case '--gate':
        options.gate = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function formatHuman(result) {
  const lines = [
    `evidence-completeness ${result.verdict} — ${result.requiredCheck}`,
    result.provenance
      ? `  sha: ${result.sha} (GitHub API, job ${result.provenance.jobId}, `
        + `run ${result.provenance.runId} attempt ${result.provenance.runAttempt})`
      : '  sha: UNVERIFIED (report-only mode; --gate refuses this)',
    result.evidenceSource
      ? `  evidence: artefact ${result.evidenceSource.artifactId} `
        + `"${result.evidenceSource.artifactName}" entry ${result.evidenceSource.entry} `
        + `(${result.evidenceSource.digest ?? 'no digest'})`
      : '  evidence: UNBOUND — a caller-supplied file, not fetched from the run. '
        + 'Advisory only; --gate refuses this.',
    `  tests: ${result.totals.executed} executed, ${result.totals.skipped} skipped, `
      + `${result.totals.declared} declared`,
  ];
  for (const record of result.evidence) {
    lines.push(
      `  ${record.status.padEnd(11)} ${record.class} ${record.capability} ${record.suite}`
      + ` (${record.executed}/${record.declared} executed)`,
    );
  }
  return lines;
}

export function main(argv = process.argv.slice(2), {
  root = repositoryRoot, io = console, fetcher = ghJobFetcher,
  lister = ghArtifactLister, downloader = ghArtifactDownloader,
  attemptFetcher = ghRunAttemptFetcher,
} = {}) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  if (!options.check || (!options.evidence && !options.gate)) {
    io.error(
      'Usage: ci-evidence-manifest.mjs --check <id> '
      + '(--evidence <vitest-json> | --gate) '
      + '[--job <id> --run <id> --attempt <n> --sha <40-hex> --repo <owner/name> '
      + '--root <workspace path>] [--json] [--gate]',
    );
    return 2;
  }

  /*
   * THE FORGED-EVIDENCE REFUSAL. Round six pointed --gate at the repository's own
   * declared-synthetic fixture and got a PASS for a real job on a real SHA,
   * because provenance bound the JOB while the evidence was whatever path the
   * caller typed. Under --gate there is now no caller-supplied evidence at all:
   * the report is downloaded from the resolved run's own artefact.
   */
  if (options.gate && options.evidence) {
    io.error(
      'UNBOUND_EVIDENCE_SOURCE: --gate does not accept --evidence. A local file cannot be '
      + 'shown to have come out of the job being certified, so the gate downloads the '
      + "run's own artefact instead. Use --evidence without --gate to inspect a file by hand.",
    );
    return 2;
  }

  /*
   * The gate accepts provenance ONLY from the API. A caller-supplied evidence file
   * can be edited; a job id resolves against GitHub. Report-only mode still grades
   * execution and never gates. It prints UNVERIFIED only when no --job was given —
   * supplying --job without --gate resolves and prints real provenance, which is
   * the intended way to inspect a specific run by hand.
   */
  const missing = ['job', 'run', 'attempt', 'sha', 'repo', 'root']
    .filter((key) => !options[key]);
  if (options.gate && missing.length > 0) {
    io.error(
      `REFUSED: --gate requires --${missing.join(', --')}. Provenance is resolved from the `
      + 'GitHub API: a local evidence file cannot vouch for its own commit, and a job name '
      + 'is unique to neither a run nor a re-run attempt.',
    );
    return 2;
  }
  if (options.sha && !SHA_PATTERN.test(options.sha)) {
    io.error(`--sha must be a 40-character lowercase hex commit SHA; received "${options.sha}".`);
    return 2;
  }
  if (options.repo && !isValidRepo(options.repo)) {
    io.error(`--repo must be owner/name; received "${options.repo}".`);
    return 2;
  }
  for (const [flag, value] of [['--job', options.job], ['--run', options.run],
    ['--attempt', options.attempt]]) {
    if (value !== null && !NUMERIC_ID.test(value)) {
      io.error(`${flag} must be numeric; received "${value}".`);
      return 2;
    }
  }

  let result;
  try {
    const manifest = loadManifest(root);
    const check = resolveCheck(manifest, options.check);

    const provenance = options.job
      ? resolveProvenance({
        check,
        repo: options.repo,
        jobId: options.job,
        expectedSha: options.sha,
        expectedRunId: options.run,
        expectedRunAttempt: options.attempt ?? undefined,
        fetcher,
      })
      : null;

    let evidenceText;
    let evidenceSource;
    if (options.gate) {
      const fetched = resolveEvidenceArtifact({
        check,
        repo: options.repo,
        runId: provenance.runId,
        expectedSha: provenance.sha,
        expectedRunAttempt: provenance.runAttempt,
        lister,
        downloader,
        attemptFetcher,
      });
      evidenceText = fetched.text;
      evidenceSource = fetched.source;
    } else {
      evidenceText = readFileSync(options.evidence, 'utf8');
      evidenceSource = null;
    }

    const observed = parseVitestJsonReport(evidenceText, {
      workingDirectory: check.workingDirectory,
      expectedRoot: options.root,
    });
    result = { ...checkEvidenceCompleteness({ check, observed, provenance }), evidenceSource };
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  if (options.json) {
    io.log(JSON.stringify(result, null, 2));
  } else {
    for (const line of formatHuman(result)) io.log(line);
  }

  for (const violation of result.violations) {
    io.error(`  ${violation.reason}: ${violation.suite ?? violation.capability ?? violation.detail}`);
  }

  if (result.verdict === 'FAIL' && !options.gate) {
    io.error('Reported without gating: this check is DISARMED (--gate to fail closed).');
  }

  return result.verdict === 'FAIL' && options.gate ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
