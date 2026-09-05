import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyPrCheckReadback } from '../pr-check-continuation.mjs';

const SHA = 'a'.repeat(40);

function payload(statusCheckRollup, overrides = {}) {
  return {
    number: 1079,
    url: 'https://example.invalid/pr/1079',
    isDraft: true,
    headRefOid: SHA,
    statusCheckRollup,
    summary: 'Everything looks great and is done!',
    ...overrides,
  };
}

function check(name, status, conclusion = '') {
  return { __typename: 'CheckRun', name, status, conclusion };
}

test('positive prose cannot override a failed exact-SHA check', () => {
  const result = classifyPrCheckReadback(payload([
    check('Nexus project-readiness P0 gate', 'COMPLETED', 'FAILURE'),
    check('web', 'COMPLETED', 'SUCCESS'),
  ]), { expectedSha: SHA, attempt: 0 });

  assert.equal(result.state, 'repair_required');
  assert.equal(result.done, false);
  assert.equal(result.nextAutomaticAction, 'inspect_first_failed_check_logs');
  assert.deepEqual(result.failedChecks, ['Nexus project-readiness P0 gate']);
  assert.deepEqual(result.continuation, [
    'inspect_first_failed_check_logs',
    'classify_branch_vs_platform_failure',
    'repair_branch_if_caused',
    'run_local_preflight',
    'obtain_independent_same_sha_review',
    'issue_exact_sha_release_receipt',
    'push_existing_pr_branch',
    'read_back_same_sha_remote_checks',
  ]);
});

test('pending remains pending and does not start a repair', () => {
  const result = classifyPrCheckReadback(payload([
    check('Nexus project-readiness P0 gate', 'COMPLETED', 'SUCCESS'),
    check('workspace', 'QUEUED'),
  ]), { expectedSha: SHA });

  assert.equal(result.state, 'remote_checks_pending');
  assert.equal(result.blocker, null);
  assert.equal(result.nextAutomaticAction, 'poll_same_sha_check_readback');
  assert.equal(result.done, false);
});

test('all-green checks stop at protected merge approval', () => {
  const result = classifyPrCheckReadback(payload([
    check('Nexus project-readiness P0 gate', 'COMPLETED', 'SUCCESS'),
    check('web', 'COMPLETED', 'SUCCESS'),
    { __typename: 'StatusContext', context: 'Vercel Preview', state: 'SUCCESS' },
  ]), { expectedSha: SHA });

  assert.equal(result.state, 'approval_pending');
  assert.equal(result.blocker, 'merge_authority_required');
  assert.equal(result.mergeAuthorised, false);
  assert.equal(result.deploymentAuthorised, false);
  assert.equal(result.done, false);
});

test('skipped and unknown checks remain unproven', () => {
  const skipped = classifyPrCheckReadback(payload([
    check('Nexus project-readiness P0 gate', 'COMPLETED', 'SUCCESS'),
    check('e2e', 'COMPLETED', 'SKIPPED'),
  ]), { expectedSha: SHA });
  assert.equal(skipped.state, 'remote_checks_unproven');
  assert.equal(skipped.blocker, 'configuration_or_scope_gap');

  const unknown = classifyPrCheckReadback(payload([
    check('Nexus project-readiness P0 gate', 'COMPLETED', 'SUCCESS'),
    check('mystery', 'COMPLETED', 'LOUDLY_GREEN'),
  ]), { expectedSha: SHA });
  assert.equal(unknown.state, 'remote_checks_unproven');
  assert.equal(unknown.blocker, 'unknown_check_state');
});

test('missing checks and mismatched SHA fail closed', () => {
  const absent = classifyPrCheckReadback(payload([]), { expectedSha: SHA });
  assert.equal(absent.state, 'remote_checks_unproven');
  assert.equal(absent.blocker, 'no_remote_checks');

  const mismatch = classifyPrCheckReadback(payload([
    check('web', 'COMPLETED', 'SUCCESS'),
  ], { headRefOid: 'b'.repeat(40) }), { expectedSha: SHA });
  assert.equal(mismatch.state, 'unproven');
  assert.equal(mismatch.blocker, 'head_sha_mismatch');
});

test('bounded repair prevents an infinite resubmission loop', () => {
  const result = classifyPrCheckReadback(payload([
    check('Nexus project-readiness P0 gate', 'COMPLETED', 'FAILURE'),
  ]), { expectedSha: SHA, attempt: 1, maxRepairAttempts: 1 });

  assert.equal(result.state, 'repair_limit_reached');
  assert.equal(result.blocker, 'bounded_repair_exhausted');
  assert.equal(result.nextAutomaticAction, 'request_independent_failure_diagnosis');
  assert.equal(result.done, false);
});

test('invalid repair counters cannot create a release state', () => {
  const result = classifyPrCheckReadback(payload([
    check('web', 'COMPLETED', 'SUCCESS'),
  ]), { expectedSha: SHA, attempt: -1 });

  assert.equal(result.state, 'unproven');
  assert.equal(result.blocker, 'invalid_repair_budget');
});

test('a green non-required check cannot hide an absent required check', () => {
  const result = classifyPrCheckReadback(payload([
    { __typename: 'StatusContext', context: 'Vercel Preview', state: 'SUCCESS' },
  ]), { expectedSha: SHA });

  assert.equal(result.state, 'remote_checks_unproven');
  assert.equal(result.blocker, 'required_checks_missing');
  assert.deepEqual(result.missingRequiredChecks, ['Nexus project-readiness P0 gate']);
});

test('unknown check record types fail closed even when labelled successful', () => {
  const result = classifyPrCheckReadback(payload([
    check('Nexus project-readiness P0 gate', 'COMPLETED', 'SUCCESS'),
    { __typename: 'UnexpectedCheckKind', name: 'mystery', status: 'COMPLETED', conclusion: 'SUCCESS' },
  ]), { expectedSha: SHA });

  assert.equal(result.state, 'remote_checks_unproven');
  assert.equal(result.blocker, 'malformed_check_record');
});

test('pending CLI readback exits non-zero', async () => {
  const { mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const dir = mkdtempSync(join(tmpdir(), 'pr-check-continuation-'));
  const input = join(dir, 'readback.json');
  try {
    writeFileSync(input, JSON.stringify(payload([
      check('Nexus project-readiness P0 gate', 'IN_PROGRESS'),
    ])));
    const run = spawnSync(process.execPath, [
      new URL('../pr-check-continuation.mjs', import.meta.url).pathname,
      '--input', input,
      '--expected-sha', SHA,
    ], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.equal(JSON.parse(run.stdout).state, 'remote_checks_pending');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
