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
 * The residual gap, stated plainly: `--evidence` is a path the caller supplies,
 * and provenance authenticates the JOB, not the FILE. Binding the two requires
 * downloading the run's artefact through the API and is deliberately left to the
 * arming step, which is out of scope here. Until then a gated PASS proves the
 * named job ran on the named commit AND that this report shows full execution —
 * it does not prove the report came out of that job.
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

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const MANIFEST_PATH = join('config', 'ci-evidence-manifest.json');

export const EVIDENCE_CLASSES = Object.freeze(['REQUIRED_EVIDENCE', 'ALLOWED_NON_BLOCKING']);

const SHA_PATTERN = /^[0-9a-f]{40}$/u;

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

    for (const field of ['requiredCheck', 'workflow', 'job', 'workingDirectory']) {
      if (typeof check[field] !== 'string' || check[field] === '') {
        throw new Error(`Check "${check.id}" declares no ${field}.`);
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
 * Reads vitest's JSON reporter output into per-suite execution counts.
 *
 * vitest marks a skipped assertion `pending`. `executed` counts assertions that
 * actually ran: passed and failed both did, pending and todo did not. A failing
 * test is evidence — of a defect — so it does not reduce the executed count.
 */
export function parseVitestJsonReport(text, { workingDirectory = '' } = {}) {
  let report;
  try {
    report = JSON.parse(text);
  } catch (error) {
    throw new Error(`Test evidence is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(report.testResults)) {
    throw new Error('Test evidence has no testResults array; this is not a vitest JSON report.');
  }

  const marker = workingDirectory ? `${workingDirectory}/` : '';
  const suites = [];
  const seen = new Map();

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
      const boundary = `/${marker}`;
      const occurrences = posix.split(boundary).length - 1;
      if (occurrences > 1) {
        throw new Error(
          `AMBIGUOUS_SUITE_PATH: "${posix}" contains "${boundary}" ${occurrences} times; `
          + 'the suite it refers to cannot be determined.',
        );
      }
      const index = posix.indexOf(boundary);
      if (index >= 0) suite = posix.slice(index + boundary.length);
    }

    const assertions = Array.isArray(file.assertionResults) ? file.assertionResults : [];
    const counts = { passed: 0, failed: 0, pending: 0, skipped: 0, todo: 0, other: 0 };
    for (const assertion of assertions) {
      const status = assertion?.status;
      if (status in counts) counts[status] += 1;
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

    const record = {
      suite,
      declared,
      executed,
      skipped,
      failed: counts.failed,
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
    }),
    { executed: 0, skipped: 0, declared: 0 },
  );

  const reported = {
    total: report.numTotalTests,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    pending: report.numPendingTests,
    todo: report.numTodoTests,
  };

  return { suites, totals, reported };
}

// ---------------------------------------------------------------------------
// Provenance — GitHub Actions API, never a caller-supplied file
// ---------------------------------------------------------------------------

/** Default fetcher. Injectable so tests never reach the network. */
export function ghJobFetcher(repo, jobId) {
  const raw = execFileSync(
    'gh',
    ['api', `repos/${repo}/actions/jobs/${jobId}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return JSON.parse(raw);
}

/**
 * Binds a job id to its commit, conclusion and identity using API metadata only.
 * Every mismatch is a refusal, never a downgrade to a graded result.
 */
export function resolveProvenance({
  check, repo, jobId, expectedSha, expectedRunId = null, fetcher = ghJobFetcher,
}) {
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
  if (expectedRunId !== null && String(job.run_id) !== String(expectedRunId)) {
    throw new Error(
      `PROVENANCE_WRONG_RUN: job ${jobId} belongs to run ${job.run_id}, not ${expectedRunId}.`,
    );
  }
  if (job.workflow_name !== undefined && !check.workflow.endsWith(`${job.workflow_name}.yml`)
    && job.workflow_name !== check.workflowName) {
    // Advisory only when the manifest does not declare a workflow display name.
    if (check.workflowName) {
      throw new Error(
        `PROVENANCE_WRONG_WORKFLOW: job ${jobId} ran in "${job.workflow_name}", not `
        + `"${check.workflowName}".`,
      );
    }
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

  for (const suite of observed.suites) {
    if (!suite.conflict) continue;
    violations.push({
      suite: suite.suite,
      reason: 'CONFLICTING_SUITE_RECORDS',
      status: 'AMBIGUOUS',
      detail: 'The report contains two disagreeing records for this path.',
    });
  }

  const observedBySuite = new Map(observed.suites.map((suite) => [suite.suite, suite]));
  const declaredSuites = new Set(check.suites.map((suite) => suite.suite));
  const executedCapabilities = new Set();

  for (const declared of check.suites) {
    const seen = observedBySuite.get(declared.suite);
    const record = {
      suite: declared.suite,
      class: declared.class,
      capability: declared.capability,
      status: seen ? seen.status : 'UNAVAILABLE',
      executed: seen ? seen.executed : 0,
      skipped: seen ? seen.skipped : 0,
      declared: seen ? seen.declared : 0,
    };
    evidence.push(record);

    if (record.status === 'EXECUTED' && !seen?.conflict) {
      executedCapabilities.add(declared.capability);
    }

    if (declared.class !== 'REQUIRED_EVIDENCE') continue;
    if (record.status === 'EXECUTED') continue;

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
    check: null, evidence: null, sha: null, job: null, run: null, repo: null,
    json: false, gate: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--check':
      case '--evidence':
      case '--sha':
      case '--job':
      case '--run':
      case '--repo': {
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
} = {}) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  if (!options.check || !options.evidence) {
    io.error(
      'Usage: ci-evidence-manifest.mjs --check <id> --evidence <vitest-json> '
      + '[--job <id> --run <id> --sha <40-hex> --repo <owner/name>] [--json] [--gate]',
    );
    return 2;
  }

  /*
   * The gate accepts provenance ONLY from the API. A caller-supplied evidence
   * file can be edited; a job id resolves against GitHub. Report-only mode still
   * grades execution, but says UNVERIFIED and can never gate.
   */
  if (options.gate && (!options.job || !options.sha || !options.repo || !options.run)) {
    io.error(
      'REFUSED: --gate requires --job, --run, --sha and --repo so provenance is resolved '
      + 'from the GitHub API. A local evidence file cannot vouch for its own commit, and a '
      + 'job name alone is not unique across runs and re-run attempts.',
    );
    return 2;
  }
  if (options.sha && !SHA_PATTERN.test(options.sha)) {
    io.error(`--sha must be a 40-character lowercase hex commit SHA; received "${options.sha}".`);
    return 2;
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
        fetcher,
      })
      : null;

    const observed = parseVitestJsonReport(readFileSync(options.evidence, 'utf8'), {
      workingDirectory: check.workingDirectory,
    });
    result = checkEvidenceCompleteness({ check, observed, provenance });
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
