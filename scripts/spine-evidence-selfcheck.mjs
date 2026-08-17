#!/usr/bin/env node

/**
 * UNI-2580 — arms the required "packages/spine — type-check and bounded tests"
 * job against its own freshly-generated evidence.
 *
 * THE DEFECT THIS CLOSES. That job passes SPINE_DATABASE_URL from a secret that
 * does not exist in the repository. Every integration suite is guarded with
 * `describe.skipIf(!hasDb)`, so all five self-skip and the job's `npm test`
 * step still exits 0 — the required check concludes `success` with 19 of 22
 * tests never executed, including the RLS and cross-tenant isolation suites.
 * Nothing in the job read the report it had just written to notice.
 *
 * WHY THIS IS A SEPARATE FILE FROM ci-evidence-manifest.mjs'S --gate, RATHER
 * THAN A CALL TO IT. `--gate` answers a harder and different question: "did
 * THIS evidence really come out of THAT completed job", defending against a
 * forged fixture or a stale artefact replayed for a commit it does not belong
 * to (see the extensive round six/seven/eight/nine history at the top of that
 * file). It does that by refusing any caller-supplied file outright and
 * instead downloading the report from the run's own artefact via the GitHub
 * API, keyed to a job whose status is "completed".
 *
 * A job cannot ask that question about itself. While it is still running, the
 * Jobs API reports its own status as "in_progress", never "completed" — so
 * resolveProvenance's completed-job requirement can never be satisfied from
 * inside the job it would be checking. That is a property of the API, not a
 * gap in ci-evidence-manifest.mjs, and no amount of wiring closes it from here.
 *
 * This script asks the NARROWER question that a job CAN answer about itself:
 * "does the report my own `npm test` step just wrote, in this same job, before
 * anything else in the run touched it, show every REQUIRED_EVIDENCE suite the
 * manifest declares actually executing." There is nothing to forge or replay
 * at this call site — the file is read from the exact path the preceding step
 * wrote a few seconds earlier — so the completeness accounting itself is
 * reused verbatim from ci-evidence-manifest.mjs (loadManifest, resolveCheck,
 * parseVitestJsonReport, checkEvidenceCompleteness). Only the provenance and
 * artefact-fetch layer, which answers a question this call site does not have,
 * is left out; `provenance` is passed through as `null`, and
 * checkEvidenceCompleteness already treats that as "no job-conclusion claim to
 * check" rather than as a pass.
 *
 * THREAT MODEL, stated with the same honesty ci-evidence-manifest.mjs states
 * its own. This defends against a required-evidence suite silently
 * self-disabling while the job it runs inside stays green — exactly the
 * UNI-2567/UNI-2580 defect. It does NOT defend against an author who can land
 * arbitrary code in the repository: such an author can edit this script, the
 * manifest, the test files, or overwrite vitest-report.json before this step
 * runs. No in-job gate can survive that, and ci-evidence-manifest.mjs's own
 * header says so about the identical limit on its upload step. The downstream
 * --gate path (keyed to a completed job, fetching the artefact independently
 * through the API) is where that class of risk is meant to be caught, and
 * remains available — wiring it as a required check is a separate, later
 * arming step, not a defect in this one.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkEvidenceCompleteness,
  loadManifest,
  parseVitestJsonReport,
  resolveCheck,
} from './ci-evidence-manifest.mjs';

/**
 * Runs the completeness check against a report already on disk.
 *
 * `root` is deliberately NOT accepted here: loadManifest's own default
 * resolves the manifest path relative to ci-evidence-manifest.mjs's own
 * location, which is correct regardless of the caller's working directory
 * (the spine job's default working-directory is nested four levels under the
 * repository root). Accepting a second, independent root here would just be
 * two places that can disagree about where the manifest lives.
 */
export function runSelfCheck({
  checkId, evidencePath, expectedRoot = null, io = console,
}) {
  const manifest = loadManifest();
  const check = resolveCheck(manifest, checkId);
  const evidenceText = readFileSync(evidencePath, 'utf8');
  const observed = parseVitestJsonReport(evidenceText, {
    workingDirectory: check.workingDirectory,
    expectedRoot,
  });
  // provenance: null — see the file header. checkEvidenceCompleteness's only
  // provenance-gated violation is JOB_CONCLUDED_FAILURE, which simply cannot
  // fire without one; every other violation class (suites that never ran,
  // capabilities left unproven, a report whose own counts do not add up) is
  // unaffected by provenance being absent.
  return checkEvidenceCompleteness({ check, observed, provenance: null });
}

function parseArguments(argv) {
  const options = { check: null, evidence: null, expectedRoot: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--check':
      case '--evidence':
      case '--expected-root': {
        const value = argv[index + 1];
        if (value === undefined || value.startsWith('--')) {
          throw new Error(`${argument} requires a value.`);
        }
        if (argument === '--expected-root') options.expectedRoot = value;
        else options[argument.slice(2)] = value;
        index += 1;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.check || !options.evidence) {
    throw new Error(
      'Usage: spine-evidence-selfcheck.mjs --check <id> --evidence <vitest-json> '
      + '[--expected-root <path>]',
    );
  }
  return options;
}

export function main(argv = process.argv.slice(2), { io = console } = {}) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  let result;
  try {
    result = runSelfCheck({
      checkId: options.check,
      evidencePath: options.evidence,
      expectedRoot: options.expectedRoot,
      io,
    });
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  io.log(`spine-evidence-selfcheck ${result.verdict} — ${result.requiredCheck}`);
  io.log(
    `  tests: ${result.totals.executed} executed, ${result.totals.skipped} skipped, `
    + `${result.totals.declared} declared`,
  );
  for (const violation of result.violations) {
    io.error(`  ${violation.reason}: ${violation.suite ?? violation.capability ?? violation.detail}`);
  }

  return result.verdict === 'FAIL' ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
