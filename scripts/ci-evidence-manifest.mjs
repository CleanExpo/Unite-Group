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
 * This module reads a declared manifest of expected suites, parses the observed
 * execution out of a test reporter's output, and answers one question per SHA:
 * did every REQUIRED_EVIDENCE suite actually execute.
 *
 * It ships DISARMED. Without --gate it reports and exits 0. Nothing consumes it
 * in CI and it is not a required check; arming it is a separate, deliberate act.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const MANIFEST_PATH = join('config', 'ci-evidence-manifest.json');

const EVIDENCE_CLASSES = Object.freeze(['REQUIRED_EVIDENCE', 'ALLOWED_NON_BLOCKING']);

/**
 * Vitest per-file result lines, e.g.
 *   ✓ tests/unit.test.ts (3 tests) 5ms
 *   ↓ tests/integration/rls.test.ts (4 tests | 4 skipped)
 *   ✓ tests/integration/mixed.test.ts (5 tests | 2 skipped) 40ms
 * The status glyph is deliberately not trusted; the counts decide the status.
 */
const SUITE_LINE = /^\s*\S*\s*(\S+\.test\.[cm]?[jt]sx?)\s+\((\d+)\s+tests?(?:\s*\|\s*(\d+)\s+skipped)?\)/u;

export function loadManifest(root = repositoryRoot) {
  const raw = readFileSync(join(root, MANIFEST_PATH), 'utf8');
  const manifest = JSON.parse(raw);
  if (!Array.isArray(manifest.checks)) {
    throw new Error(`${MANIFEST_PATH} declares no checks array.`);
  }
  return manifest;
}

export function resolveCheck(manifest, id) {
  const check = manifest.checks.find((candidate) => candidate.id === id);
  if (!check) {
    const known = manifest.checks.map((candidate) => candidate.id).join(', ') || 'none';
    throw new Error(`Unknown evidence check "${id}". Declared checks: ${known}.`);
  }
  return check;
}

/**
 * Reads a vitest run's output into per-suite execution counts. A suite whose
 * executed count is zero is SKIPPED, whatever the process exit code was.
 */
export function parseVitestEvidence(output) {
  const suites = [];
  const seen = new Set();

  for (const line of output.split(/\r?\n/u)) {
    const match = SUITE_LINE.exec(line);
    if (!match) continue;

    const [, suite, declaredRaw, skippedRaw] = match;
    if (seen.has(suite)) continue;
    seen.add(suite);

    const declared = Number.parseInt(declaredRaw, 10);
    const skipped = skippedRaw === undefined ? 0 : Number.parseInt(skippedRaw, 10);
    const executed = declared - skipped;

    suites.push({
      suite,
      declared,
      executed,
      skipped,
      status: executed > 0 ? 'EXECUTED' : 'SKIPPED',
    });
  }

  const totals = suites.reduce(
    (accumulator, suite) => ({
      executed: accumulator.executed + suite.executed,
      skipped: accumulator.skipped + suite.skipped,
      declared: accumulator.declared + suite.declared,
    }),
    { executed: 0, skipped: 0, declared: 0 },
  );

  return { suites, totals };
}

/**
 * Compares declared expectation against observed execution for one SHA.
 *
 * Three ways to fail:
 *   REQUIRED_EVIDENCE_NOT_EXECUTED — declared, present, zero tests ran.
 *   REQUIRED_EVIDENCE_UNAVAILABLE  — declared, absent from the report entirely.
 *   UNDECLARED_SUITE               — observed but undeclared; the manifest is stale
 *                                    and its coverage claim can no longer be trusted.
 */
export function checkEvidenceCompleteness({ check, observed, sha }) {
  const observedBySuite = new Map(observed.suites.map((suite) => [suite.suite, suite]));
  const declaredSuites = new Set(check.suites.map((suite) => suite.suite));

  const evidence = [];
  const violations = [];

  for (const declared of check.suites) {
    if (!EVIDENCE_CLASSES.includes(declared.class)) {
      throw new Error(
        `Suite ${declared.suite} declares unknown class "${declared.class}". `
        + `Expected one of: ${EVIDENCE_CLASSES.join(', ')}.`,
      );
    }

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
    `  sha: ${result.sha ?? 'unknown'}`,
    `  tests: ${result.totals.executed} executed, ${result.totals.skipped} skipped, ${result.totals.declared} declared`,
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

  if (!options.check || !options.report) {
    io.error('Usage: ci-evidence-manifest.mjs --check <id> --report <path> [--sha <sha>] [--json] [--gate]');
    return 2;
  }

  let result;
  try {
    const manifest = loadManifest(root);
    const check = resolveCheck(manifest, options.check);
    const observed = parseVitestEvidence(readFileSync(options.report, 'utf8'));
    result = checkEvidenceCompleteness({ check, observed, sha: options.sha });
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
    io.error(`  ${violation.reason}: ${violation.suite}`);
  }

  if (result.verdict === 'FAIL' && !options.gate) {
    io.error('Reported without gating: this check is DISARMED (--gate to fail closed).');
  }

  return result.verdict === 'FAIL' && options.gate ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
