#!/usr/bin/env node

/**
 * UNI-2567 items 7 and 8 — the test-evidence manifest and its completeness check.
 *
 * A required CI check reports the exit code of a test process. It does not report
 * whether the tests that justify the check's name actually ran. On main at
 * d1d57b8e5745e90259f2799cb9086e4a62689318 the required job
 * "packages/spine — type-check and bounded tests" concluded `success` with 3 of
 * 22 tests executed; the RLS matrix and the cross-tenant isolation suites were
 * among the 19 that self-skipped because SPINE_DATABASE_URL was absent.
 *
 * Input is a RAW GitHub Actions job log, exactly as `gh api
 * repos/{owner}/{repo}/actions/jobs/{id}/logs` returns it. Normalisation happens
 * here, not in the caller's shell — a checker that only reads hand-cleaned input
 * cannot read the artefact it exists to read.
 *
 * Three properties this refuses to give up:
 *
 *   1. Provenance is DERIVED from the log, never accepted from the caller. The
 *      log proves which SHA was checked out; --sha is an assertion checked
 *      against that proof. A log with no provenance is rejected outright, so a
 *      committed all-green file cannot be replayed as evidence for another SHA.
 *   2. Silence is never success. The reporter's own summary line must be present
 *      and must reconcile with the per-suite lines, so a truncated or crashed run
 *      is distinguishable from a clean one.
 *   3. Suite lines are read only INSIDE the reporter's own section, so a
 *      console.log, an assertion diff or a quoted inner log cannot forge a suite.
 *
 * It ships DISARMED as a gate: no CI job runs this against live job output, and
 * it is not a required check. Without --gate it reports and exits 0. Note that
 * its SELF-TESTS do run in the existing project-readiness job, which makes the
 * manifest's freshness assertion binding on that job — see MANIFEST_PATH below.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const MANIFEST_PATH = join('config', 'ci-evidence-manifest.json');

export const EVIDENCE_CLASSES = Object.freeze(['REQUIRED_EVIDENCE', 'ALLOWED_NON_BLOCKING']);

/**
 * Categories whose proof is the reason the required check exists. Declaring one
 * of these ALLOWED_NON_BLOCKING would disarm the gate with a one-word manifest
 * edit, in the same PR, by the same author — so the code refuses it outright.
 */
export const PROTECTED_CATEGORIES = Object.freeze([
  'tenant-isolation',
  'migration-integrity',
  'auth',
  'security',
  'release-integrity',
]);

/**
 * Suite paths whose subject matter is security-critical regardless of how the
 * manifest labels them. Without this, PROTECTED_CATEGORIES is circular: the same
 * author, in the same PR, could relabel `rls.test.ts` from `tenant-isolation` to
 * something unprotected and then mark it non-blocking. Path -> category is bound
 * here, in code, so the relabel is what fails.
 */
export const PROTECTED_SUITE_PATTERNS = Object.freeze([
  /(^|\/)rls[._-]/u,
  /isolation/u,
  /(^|\/)auth[._-]/u,
  /tenant/u,
  /idempotency/u,
]);

const ANSI = /\[[0-9;]*[A-Za-z]/gu;
const ACTIONS_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s?/u;

/** `git ... fetch ... +<sha>:refs/remotes/origin/<branch>` in the checkout step. */
const CHECKOUT_FETCH_SHA = /\+([0-9a-f]{40}):refs\/remotes\//u;
/** The bare 40-hex line emitted by `git rev-parse refs/remotes/origin/<branch>`. */
const REV_PARSE_SHA = /^([0-9a-f]{40})$/u;

/** Vitest's own run banner and final summary bracket the reporter's section. */
const RUN_BANNER = /^\s*RUN\s+v\d/u;
const SUMMARY_TESTS = /^\s*Tests\s+(.+?)\s*$/u;
const SUMMARY_FILES = /^\s*Test Files\s+/u;

/**
 * A per-file result line. The count block is `(N tests)` optionally followed by
 * `| N passed`, `| N failed`, `| N skipped`, `| N todo` in any order. The status
 * glyph is deliberately not trusted; the counts decide the status.
 */
const SUITE_LINE = /(?:^|\s)([\w./-]+\.test\.[cm]?[jt]sx?)\s+\((\d+)\s+tests?((?:\s*\|\s*\d+\s+\w+)*)\)/u;
const COUNT_MODIFIER = /\|\s*(\d+)\s+(\w+)/gu;

/** Strips the Actions timestamp prefix and ANSI colouring from a raw job log. */
export function normaliseJobLog(raw) {
  return raw
    .replace(/^﻿/u, '')
    .replace(/\r\n/gu, '\n')
    .split('\n')
    .map((line) => line.replace(ANSI, '').replace(ACTIONS_TIMESTAMP, ''))
    .join('\n');
}

/**
 * The SHA the runner actually checked out, read out of the log itself. Returns
 * null when the log carries no checkout evidence — which is a refusal, not a pass.
 */
export function extractProvenanceSha(normalised) {
  const lines = normalised.split('\n');
  for (const line of lines) {
    const fetched = CHECKOUT_FETCH_SHA.exec(line);
    if (fetched) return fetched[1];
  }
  for (const line of lines) {
    const revParsed = REV_PARSE_SHA.exec(line.trim());
    if (revParsed) return revParsed[1];
  }
  return null;
}

function parseCountModifiers(tail) {
  const counts = {};
  for (const [, value, label] of tail.matchAll(COUNT_MODIFIER)) {
    counts[label] = Number.parseInt(value, 10);
  }
  return counts;
}

/**
 * Reads the reporter's section of a normalised log into per-suite execution
 * counts plus the summary the reporter itself printed.
 *
 * `executed` excludes skipped and todo. A FAILED test executed — it is evidence,
 * just evidence of a defect — so failures do not reduce the executed count.
 */
export function parseVitestEvidence(rawOrNormalised) {
  const normalised = normaliseJobLog(rawOrNormalised);
  const lines = normalised.split('\n');

  let inSection = false;
  let summary = null;
  const suites = [];
  const seen = new Set();
  const malformed = [];

  for (const line of lines) {
    if (!inSection) {
      if (RUN_BANNER.test(line)) inSection = true;
      continue;
    }

    if (SUMMARY_FILES.test(line)) continue;

    const summaryMatch = SUMMARY_TESTS.exec(line);
    if (summaryMatch) {
      const totalMatch = /\((\d+)\)\s*$/u.exec(summaryMatch[1]);
      const counts = {};
      for (const [, value, label] of summaryMatch[1].matchAll(/(\d+)\s+(passed|failed|skipped|todo)/gu)) {
        counts[label] = Number.parseInt(value, 10);
      }
      summary = {
        total: totalMatch
          ? Number.parseInt(totalMatch[1], 10)
          : Object.values(counts).reduce((sum, value) => sum + value, 0),
        passed: counts.passed ?? 0,
        failed: counts.failed ?? 0,
        skipped: counts.skipped ?? 0,
        todo: counts.todo ?? 0,
      };
      inSection = false;
      continue;
    }

    const match = SUITE_LINE.exec(line);
    if (!match) continue;

    const [, suite, declaredRaw, tail] = match;
    if (seen.has(suite)) continue;

    const declared = Number.parseInt(declaredRaw, 10);
    const counts = parseCountModifiers(tail ?? '');
    const skipped = counts.skipped ?? 0;
    const todo = counts.todo ?? 0;
    const executed = declared - skipped - todo;

    if (executed < 0 || skipped < 0 || todo < 0) {
      malformed.push({ suite, declared, skipped, todo, line: line.trim() });
      continue;
    }

    seen.add(suite);
    suites.push({
      suite,
      declared,
      executed,
      skipped,
      todo,
      failed: counts.failed ?? 0,
      status: executed > 0 ? 'EXECUTED' : 'SKIPPED',
    });
  }

  const totals = suites.reduce(
    (accumulator, suite) => ({
      executed: accumulator.executed + suite.executed,
      skipped: accumulator.skipped + suite.skipped,
      todo: accumulator.todo + suite.todo,
      declared: accumulator.declared + suite.declared,
    }),
    { executed: 0, skipped: 0, todo: 0, declared: 0 },
  );

  return { suites, totals, summary, malformed };
}

/** Throws on any manifest that could disarm the gate by construction. */
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

    if (!Array.isArray(check.suites) || check.suites.length === 0) {
      throw new Error(`Check "${check.id}" declares no suites; an empty check passes vacuously.`);
    }

    const suiteNames = new Set();
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
      if (typeof suite.category !== 'string' || suite.category === '') {
        throw new Error(`Suite ${suite.suite} declares no category.`);
      }
      const protectedByPath = PROTECTED_SUITE_PATTERNS.some((pattern) => pattern.test(suite.suite));
      if ((PROTECTED_CATEGORIES.includes(suite.category) || protectedByPath)
        && suite.class !== 'REQUIRED_EVIDENCE') {
        throw new Error(
          `Suite ${suite.suite} declares protected category "${suite.category}" as `
          + `${suite.class}. Protected categories must be REQUIRED_EVIDENCE.`,
        );
      }
      if (protectedByPath && !PROTECTED_CATEGORIES.includes(suite.category)) {
        throw new Error(
          `Suite ${suite.suite} is security-critical by path but declares unprotected `
          + `category "${suite.category}". Relabelling cannot remove a suite from `
          + `protection; use one of: ${PROTECTED_CATEGORIES.join(', ')}.`,
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

/**
 * Compares declared expectation against observed execution for one SHA.
 *
 * Report-integrity failures come FIRST and are not per-suite: a report that
 * cannot be trusted must never be graded suite by suite, because a truncated log
 * is a report in which every remaining suite is simply missing.
 */
export function checkEvidenceCompleteness({ check, observed, sha }) {
  const violations = [];
  const evidence = [];

  if (observed.malformed.length > 0) {
    for (const bad of observed.malformed) {
      violations.push({
        suite: bad.suite,
        class: null,
        category: null,
        status: 'MALFORMED',
        reason: 'MALFORMED_SUITE_LINE',
        detail: bad.line,
      });
    }
  }

  if (!observed.summary) {
    violations.push({
      suite: null,
      class: null,
      category: null,
      status: 'INCOMPLETE',
      reason: 'INCOMPLETE_REPORT',
      detail: 'The reporter printed no "Tests …" summary; the run did not complete.',
    });
  } else {
    const observedTotal = observed.totals.declared;
    if (observedTotal !== observed.summary.total) {
      violations.push({
        suite: null,
        class: null,
        category: null,
        status: 'INCONSISTENT',
        reason: 'SUMMARY_MISMATCH',
        detail: `Per-suite lines account for ${observedTotal} tests; the reporter's own `
          + `summary says ${observed.summary.total}.`,
      });
    }
    if (observed.totals.skipped !== observed.summary.skipped) {
      violations.push({
        suite: null,
        class: null,
        category: null,
        status: 'INCONSISTENT',
        reason: 'SUMMARY_MISMATCH',
        detail: `Per-suite lines account for ${observed.totals.skipped} skipped; the `
          + `reporter's own summary says ${observed.summary.skipped}.`,
      });
    }
  }

  const observedBySuite = new Map(observed.suites.map((suite) => [suite.suite, suite]));
  const declaredSuites = new Set(check.suites.map((suite) => suite.suite));

  for (const declared of check.suites) {
    const seen = observedBySuite.get(declared.suite);
    const record = {
      suite: declared.suite,
      class: declared.class,
      category: declared.category,
      status: seen ? seen.status : 'UNAVAILABLE',
      executed: seen ? seen.executed : 0,
      skipped: seen ? seen.skipped : 0,
      declared: seen ? seen.declared : 0,
    };
    evidence.push(record);

    if (declared.class !== 'REQUIRED_EVIDENCE') continue;
    if (record.status === 'EXECUTED') continue;

    violations.push({
      ...record,
      reason: record.status === 'UNAVAILABLE'
        ? 'REQUIRED_EVIDENCE_UNAVAILABLE'
        : 'REQUIRED_EVIDENCE_NOT_EXECUTED',
    });
  }

  for (const seen of observed.suites) {
    if (declaredSuites.has(seen.suite)) continue;
    violations.push({
      suite: seen.suite,
      class: null,
      category: null,
      status: seen.status,
      executed: seen.executed,
      skipped: seen.skipped,
      declared: seen.declared,
      reason: 'UNDECLARED_SUITE',
    });
  }

  return {
    check: check.id,
    requiredCheck: check.requiredCheck,
    sha,
    verdict: violations.length === 0 ? 'PASS' : 'FAIL',
    totals: observed.totals,
    summary: observed.summary,
    evidence,
    violations,
  };
}

export function parseArguments(argv) {
  const options = { check: null, report: null, sha: null, json: false, gate: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--check':
      case '--report':
      case '--sha': {
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
    `  sha: ${result.sha} (proven by the job log's checkout step)`,
    `  tests: ${result.totals.executed} executed, ${result.totals.skipped} skipped, `
      + `${result.totals.declared} declared`,
  ];
  for (const record of result.evidence) {
    lines.push(
      `  ${record.status.padEnd(11)} ${record.class} ${record.category} ${record.suite}`
      + ` (${record.executed}/${record.declared} executed)`,
    );
  }
  return lines;
}

export function main(argv = process.argv.slice(2), { root = repositoryRoot, io = console } = {}) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  if (!options.check || !options.report || !options.sha) {
    io.error(
      'Usage: ci-evidence-manifest.mjs --check <id> --report <raw-job-log> --sha <40-hex> '
      + '[--json] [--gate]',
    );
    return 2;
  }

  if (!/^[0-9a-f]{40}$/u.test(options.sha)) {
    io.error(`--sha must be a 40-character hex commit SHA; received "${options.sha}".`);
    return 2;
  }

  let result;
  try {
    const manifest = loadManifest(root);
    const check = resolveCheck(manifest, options.check);
    const raw = readFileSync(options.report, 'utf8');
    const normalised = normaliseJobLog(raw);

    const provenSha = extractProvenanceSha(normalised);
    if (!provenSha) {
      io.error(
        'PROVENANCE_ABSENT: the report carries no checkout evidence, so it cannot be bound '
        + 'to a commit. Supply the raw job log from '
        + '`gh api repos/{owner}/{repo}/actions/jobs/{id}/logs`.',
      );
      return 2;
    }
    if (provenSha !== options.sha) {
      io.error(
        `PROVENANCE_MISMATCH: --sha asserts ${options.sha} but the report proves the runner `
        + `checked out ${provenSha}. This report is not evidence for the asserted commit.`,
      );
      return 2;
    }

    const observed = parseVitestEvidence(normalised);
    result = checkEvidenceCompleteness({ check, observed, sha: provenSha });
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
    io.error(`  ${violation.reason}: ${violation.suite ?? violation.detail}`);
  }

  if (result.verdict === 'FAIL' && !options.gate) {
    io.error('Reported without gating: this check is DISARMED (--gate to fail closed).');
  }

  return result.verdict === 'FAIL' && options.gate ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
