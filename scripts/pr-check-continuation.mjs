#!/usr/bin/env node

/**
 * Read-only PR closure classifier.
 *
 * It turns an exact-SHA GitHub check readback into one honest next state. It
 * never reruns checks, edits a PR, merges, deploys, or accepts prose as proof.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SHA = /^[0-9a-f]{40}$/;
const FAILURE = new Set(['FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'STALE']);
const PENDING = new Set(['QUEUED', 'PENDING', 'IN_PROGRESS', 'WAITING', 'REQUESTED', 'EXPECTED']);
const PASS = new Set(['SUCCESS', 'NEUTRAL']);

function upper(value) {
  return typeof value === 'string' ? value.toUpperCase() : '';
}

export function normaliseCheck(check) {
  const kind = check?.__typename === 'StatusContext' ? 'status_context' : 'check_run';
  const name = kind === 'status_context' ? check?.context : check?.name;
  const status = kind === 'status_context' ? upper(check?.state) : upper(check?.status);
  const conclusion = kind === 'status_context' ? status : upper(check?.conclusion);
  return {
    kind,
    name: typeof name === 'string' && name.trim() ? name.trim() : 'unnamed check',
    status,
    conclusion,
    detailsUrl: typeof check?.detailsUrl === 'string'
      ? check.detailsUrl
      : typeof check?.targetUrl === 'string'
        ? check.targetUrl
        : null,
  };
}

function projection(state, payload, checks, fields) {
  return {
    schema: 'nexus.pr-check-continuation.v1',
    state,
    done: false,
    mergeAuthorised: false,
    deploymentAuthorised: false,
    pr: {
      number: Number.isInteger(payload?.number) ? payload.number : null,
      url: typeof payload?.url === 'string' ? payload.url : null,
      headSha: typeof payload?.headRefOid === 'string' ? payload.headRefOid : null,
      draft: payload?.isDraft === true,
    },
    checks,
    ...fields,
  };
}

export function classifyPrCheckReadback(payload, { expectedSha, attempt = 0, maxRepairAttempts = 3 } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return projection('unproven', payload, [], {
      currentWork: 'Validate the remote PR-check readback.',
      evidence: 'No usable GitHub PR object was supplied.',
      blocker: 'malformed_readback',
      nextAutomaticAction: 'read_back_pr_checks_again',
    });
  }
  if (!SHA.test(expectedSha ?? '') || payload.headRefOid !== expectedSha) {
    return projection('unproven', payload, [], {
      currentWork: 'Bind remote checks to the exact pushed candidate.',
      evidence: `Expected ${expectedSha ?? 'a valid SHA'}; observed ${payload.headRefOid ?? 'no SHA'}.`,
      blocker: 'head_sha_mismatch',
      nextAutomaticAction: 'read_back_exact_pr_head',
    });
  }
  if (!Number.isInteger(attempt) || attempt < 0 || !Number.isInteger(maxRepairAttempts) || maxRepairAttempts < 1) {
    return projection('unproven', payload, [], {
      currentWork: 'Validate bounded repair counters.',
      evidence: 'Repair attempt metadata is missing or invalid.',
      blocker: 'invalid_repair_budget',
      nextAutomaticAction: 'repair_continuation_metadata',
    });
  }

  const rawChecks = Array.isArray(payload.statusCheckRollup) ? payload.statusCheckRollup : [];
  const checks = rawChecks.map(normaliseCheck);
  if (checks.length === 0) {
    return projection('remote_checks_unproven', payload, checks, {
      currentWork: 'Wait for check discovery on the exact PR head.',
      evidence: 'The remote readback contains no check records.',
      blocker: 'no_remote_checks',
      nextAutomaticAction: 'poll_same_sha_check_readback',
    });
  }

  const failed = checks.filter((check) => FAILURE.has(check.conclusion) || FAILURE.has(check.status));
  const skipped = checks.filter((check) => check.conclusion === 'SKIPPED');
  const pending = checks.filter((check) => PENDING.has(check.status) || PENDING.has(check.conclusion));
  const unknown = checks.filter((check) =>
    !failed.includes(check)
    && !skipped.includes(check)
    && !pending.includes(check)
    && !PASS.has(check.conclusion),
  );

  if (failed.length > 0) {
    if (attempt >= maxRepairAttempts) {
      return projection('repair_limit_reached', payload, checks, {
        currentWork: 'Preserve the failed-check evidence after bounded repair attempts.',
        evidence: `${failed.length} check(s) failed at repair attempt ${attempt}/${maxRepairAttempts}.`,
        blocker: 'bounded_repair_exhausted',
        nextAutomaticAction: 'request_independent_failure_diagnosis',
        failedChecks: failed.map((check) => check.name),
      });
    }
    return projection('repair_required', payload, checks, {
      currentWork: `Triage ${failed[0].name} before any further release action.`,
      evidence: `${failed.length} completed check(s) failed on exact SHA ${expectedSha}.`,
      blocker: 'branch_or_platform_failure_requires_triage',
      nextAutomaticAction: 'inspect_first_failed_check_logs',
      repairAttempt: attempt,
      repairLimit: maxRepairAttempts,
      failedChecks: failed.map((check) => check.name),
      continuation: [
        'inspect_first_failed_check_logs',
        'classify_branch_vs_platform_failure',
        'repair_branch_if_caused',
        'run_local_preflight',
        'obtain_independent_same_sha_review',
        'issue_exact_sha_release_receipt',
        'push_existing_pr_branch',
        'read_back_same_sha_remote_checks',
      ],
    });
  }

  if (pending.length > 0) {
    return projection('remote_checks_pending', payload, checks, {
      currentWork: 'Wait for the exact-SHA remote checks to finish.',
      evidence: `${pending.length} check(s) are queued, pending, or in progress; none is treated as failed or passed.`,
      blocker: null,
      nextAutomaticAction: 'poll_same_sha_check_readback',
      pendingChecks: pending.map((check) => check.name),
    });
  }

  if (skipped.length > 0 || unknown.length > 0) {
    return projection('remote_checks_unproven', payload, checks, {
      currentWork: 'Resolve skipped or unrecognised check evidence.',
      evidence: `${skipped.length} skipped and ${unknown.length} unrecognised check(s) cannot prove readiness.`,
      blocker: skipped.length > 0 ? 'configuration_or_scope_gap' : 'unknown_check_state',
      nextAutomaticAction: 'classify_unproven_remote_checks',
      skippedChecks: skipped.map((check) => check.name),
      unknownChecks: unknown.map((check) => check.name),
    });
  }

  return projection('approval_pending', payload, checks, {
    currentWork: 'Hold the verified PR at the protected merge boundary.',
    evidence: `${checks.length} remote check(s) passed or concluded neutral on exact SHA ${expectedSha}.`,
    blocker: 'merge_authority_required',
    nextAutomaticAction: 'request_explicit_merge_authority',
  });
}

function valueOf(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function readPayload(args) {
  const input = valueOf(args, '--input');
  if (input) return JSON.parse(readFileSync(input, 'utf8'));
  const repo = valueOf(args, '--repo');
  const pr = valueOf(args, '--pr');
  if (!repo || !pr || !/^\d+$/.test(pr)) {
    throw new Error('supply --input <json>, or --repo <owner/name> --pr <number>');
  }
  const stdout = execFileSync('gh', [
    'pr', 'view', pr, '--repo', repo,
    '--json', 'number,url,isDraft,state,baseRefName,headRefName,headRefOid,statusCheckRollup',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(stdout);
}

export function main(args = process.argv.slice(2)) {
  const expectedSha = valueOf(args, '--expected-sha');
  const attempt = Number(valueOf(args, '--attempt') ?? 0);
  const maxRepairAttempts = Number(valueOf(args, '--max-repair-attempts') ?? 3);
  const result = classifyPrCheckReadback(readPayload(args), { expectedSha, attempt, maxRepairAttempts });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.state === 'repair_required' || result.state === 'repair_limit_reached' || result.state === 'remote_checks_unproven' || result.state === 'unproven' ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`PR check continuation refused: ${error instanceof Error ? error.message : 'unknown error'}\n`);
    process.exitCode = 1;
  }
}
