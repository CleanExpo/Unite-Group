// Ported from Authority-Site tests/unit/lib/crm/approval-lifecycle.test.ts, 12/06/2026.
// Schema/API assumptions not yet validated against apps/web — see docs/convergence/migration-map.md.

import {
  buildCrmApprovalLifecycleInputFromTaskEvidence,
  evaluateCrmApprovalLifecycle,
  evaluateDecisionGatedAutoExecute,
} from '@/lib/crm/approval-lifecycle';

const baseInput = {
  id: 'approval-1',
  subjectType: 'lead_conversion' as const,
  requestedBy: 'Margot',
  requestedAt: '2026-05-23T09:00:00+10:00',
  now: '2026-05-23T10:00:00+10:00',
};

// The kill-switch assertions below depend on CRM_AUTO_EXECUTE being unset —
// isolate from ambient CI env rather than assuming it.
const ORIGINAL_CRM_AUTO_EXECUTE = process.env.CRM_AUTO_EXECUTE;
beforeEach(() => {
  delete process.env.CRM_AUTO_EXECUTE;
});
afterEach(() => {
  if (ORIGINAL_CRM_AUTO_EXECUTE === undefined) delete process.env.CRM_AUTO_EXECUTE;
  else process.env.CRM_AUTO_EXECUTE = ORIGINAL_CRM_AUTO_EXECUTE;
});

describe('evaluateCrmApprovalLifecycle', () => {
  it('classifies a requested approval as awaiting Phill review without auto-execution', () => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'requested',
      expiresAt: '2026-05-24T09:00:00+10:00',
    });

    expect(result).toEqual({
      id: 'approval-1',
      subjectType: 'lead_conversion',
      normalizedStatus: 'requested',
      decision: 'await_approval',
      requiresPhillReview: true,
      reasons: expect.arrayContaining([expect.stringContaining('awaiting approval')]),
      safeToAutoExecute: false,
      autoExecuteReason: 'kill_switch_off',
    });
  });

  it('allows manual execution recommendation for a fully approved approval while still blocking auto-execute', () => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'approved',
      approvedBy: 'Phill',
      approvalReference: 'BOARD-2026-05-23-CRM-1',
    });

    expect(result.normalizedStatus).toBe('approved');
    expect(result.decision).toBe('may_execute');
    expect(result.requiresPhillReview).toBe(false);
    expect(result.safeToAutoExecute).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining([expect.stringContaining('approved')]));
  });

  it('does not echo the raw approvedBy value in returned approval reasons', () => {
    const sensitiveApprover = 'phill.private@example.test';
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'approved',
      approvedBy: sensitiveApprover,
      approvalReference: 'BOARD-2026-05-23-CRM-1',
    });

    const returnedReasons = result.reasons.join(' ');
    expect(result.decision).toBe('may_execute');
    expect(returnedReasons).toContain('approved');
    expect(returnedReasons).toContain('recorded approver');
    expect(returnedReasons).not.toContain(sensitiveApprover);
  });

  it('does not echo approval reference or Board IDs in returned approval reasons', () => {
    const sensitiveApprovalReference = 'BOARD-2026-05-23-CRM-SECRET-1';
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'approved',
      approvedBy: 'Phill',
      approvalReference: sensitiveApprovalReference,
    });

    const returnedReasons = result.reasons.join(' ');
    expect(result.decision).toBe('may_execute');
    expect(returnedReasons).toContain('approved');
    expect(returnedReasons).toContain('reference recorded');
    expect(returnedReasons).not.toContain(sensitiveApprovalReference);
    expect(returnedReasons).not.toContain('BOARD-2026-05-23-CRM-SECRET-1');
  });

  it('does not echo a Board-like approval id in returned reasons', () => {
    const sensitiveBoardId = 'BOARD-APPROVAL-ID-777';
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      id: sensitiveBoardId,
      status: 'requested',
    });

    expect(result.decision).toBe('await_approval');
    expect(result.reasons.join(' ')).toContain('awaiting approval');
    expect(result.reasons.join(' ')).not.toContain(sensitiveBoardId);
  });

  it('rejects approved status without an approver and approval reference', () => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'approved',
      approvedBy: 'Phill',
      approvalReference: ' ',
    });

    expect(result.normalizedStatus).toBe('invalid');
    expect(result.decision).toBe('invalid_request');
    expect(result.requiresPhillReview).toBe(true);
    expect(result.safeToAutoExecute).toBe(false);
    expect(result.reasons.join(' ')).toContain('approvedBy and approvalReference');
  });

  it.each([
    ['rejected', 'rejection reason', { rejectionReason: 'Not enough identity evidence' }],
    ['cancelled', 'cancelled', {}],
    ['expired', 'expired', {}],
  ] as const)('classifies %s approvals as do-not-execute', (status, reasonText, extra) => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status,
      ...extra,
    });

    expect(result.normalizedStatus).toBe(status);
    expect(result.decision).toBe('do_not_execute');
    expect(result.requiresPhillReview).toBe(false);
    expect(result.safeToAutoExecute).toBe(false);
    expect(result.reasons.join(' ').toLowerCase()).toContain(reasonText);
  });

  it('does not echo direct raw rejectionReason values in returned rejection reasons', () => {
    const sensitiveRejectionReason = 'Rejected in BOARD-APPROVAL-ID-777 with BOARD-2026-05-23-CRM-SECRET-10';
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'rejected',
      rejectionReason: sensitiveRejectionReason,
    });

    const returnedReasons = result.reasons.join(' ');
    expect(result.normalizedStatus).toBe('rejected');
    expect(result.decision).toBe('do_not_execute');
    expect(returnedReasons).toContain('Rejection reason recorded.');
    expect(returnedReasons).not.toContain(sensitiveRejectionReason);
    expect(returnedReasons).not.toContain('BOARD-APPROVAL-ID-777');
    expect(returnedReasons).not.toContain('BOARD-2026-05-23-CRM-SECRET-10');
  });

  it('normalizes non-executed approvals to expired when now is after expiresAt', () => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'approved',
      approvedBy: 'Phill',
      approvalReference: 'BOARD-2026-05-23-CRM-2',
      expiresAt: '2026-05-23T09:30:00+10:00',
    });

    expect(result.normalizedStatus).toBe('expired');
    expect(result.decision).toBe('do_not_execute');
    expect(result.requiresPhillReview).toBe(false);
    expect(result.safeToAutoExecute).toBe(false);
    expect(result.reasons.join(' ').toLowerCase()).toContain('expired');
  });

  it('keeps already executed approvals executed even if expiresAt is in the past', () => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'executed',
      executedAt: '2026-05-23T09:20:00+10:00',
      expiresAt: '2026-05-23T09:30:00+10:00',
    });

    expect(result.normalizedStatus).toBe('executed');
    expect(result.decision).toBe('already_executed');
    expect(result.requiresPhillReview).toBe(false);
    expect(result.safeToAutoExecute).toBe(false);
  });

  it.each([
    ['requestedAt', { requestedAt: 'not-a-date' }, 'requestedAt must be parseable'],
    ['now', { now: 'not-a-date' }, 'now must be parseable'],
    ['expiresAt', { expiresAt: 'not-a-date' }, 'expiresAt must be parseable'],
    ['executedAt', { status: 'executed', executedAt: 'not-a-date' }, 'executedAt must be parseable'],
  ] as const)('marks approvals with invalid %s timestamps invalid', (_field, override, reasonText) => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'requested',
      ...override,
    });

    expect(result.normalizedStatus).toBe('invalid');
    expect(result.decision).toBe('invalid_request');
    expect(result.requiresPhillReview).toBe(true);
    expect(result.safeToAutoExecute).toBe(false);
    expect(result.reasons.join(' ')).toContain(reasonText);
  });

  it('requires executedAt for executed approvals', () => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'executed',
      executedAt: null,
    });

    expect(result.normalizedStatus).toBe('invalid');
    expect(result.decision).toBe('invalid_request');
    expect(result.requiresPhillReview).toBe(true);
    expect(result.reasons.join(' ')).toContain('executedAt');
  });

  it('marks missing required fields, unknown statuses, and unknown subject types invalid', () => {
    const missingRequired = evaluateCrmApprovalLifecycle({
      ...baseInput,
      id: ' ',
      status: 'requested',
    });
    const unknownStatus = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: 'needs_legal_review',
    });
    const unknownSubjectType = evaluateCrmApprovalLifecycle({
      ...baseInput,
      subjectType: 'bank_transfer' as never,
      status: 'requested',
    });

    expect(missingRequired.normalizedStatus).toBe('invalid');
    expect(missingRequired.decision).toBe('invalid_request');
    expect(missingRequired.reasons.join(' ')).toContain('id');
    expect(unknownStatus.normalizedStatus).toBe('invalid');
    expect(unknownStatus.decision).toBe('invalid_request');
    expect(unknownStatus.reasons.join(' ')).toContain('Unknown approval status');
    expect(unknownSubjectType.normalizedStatus).toBe('invalid');
    expect(unknownSubjectType.decision).toBe('invalid_request');
    expect(unknownSubjectType.subjectType).toBe('invalid');
    expect(unknownSubjectType.reasons.join(' ')).toContain('Unknown approval subjectType');
  });

  it('returns invalid subjectType for blank runtime subject types without echoing the blank input as a known type', () => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      subjectType: '   ' as never,
      status: 'requested',
    });

    expect(result.subjectType).toBe('invalid');
    expect(result.normalizedStatus).toBe('invalid');
    expect(result.decision).toBe('invalid_request');
    expect(result.reasons.join(' ')).toContain('Unknown approval subjectType');
  });

  it('does not echo unknown status values in returned invalid reasons', () => {
    const sensitiveStatus = 'needs_BOARD-2026-05-23-CRM-SECRET-11_review';
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      status: sensitiveStatus,
    });

    const returnedReasons = result.reasons.join(' ');
    expect(result.normalizedStatus).toBe('invalid');
    expect(result.decision).toBe('invalid_request');
    expect(returnedReasons).toContain('Unknown approval status supplied.');
    expect(returnedReasons).not.toContain(sensitiveStatus.toLowerCase());
    expect(returnedReasons).not.toContain('BOARD-2026-05-23-CRM-SECRET-11');
  });

  it('does not echo unknown subjectType values in returned invalid reasons', () => {
    const sensitiveSubjectType = 'bank_transfer_BOARD-APPROVAL-ID-888';
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      subjectType: sensitiveSubjectType as never,
      status: 'requested',
    });

    const returnedReasons = result.reasons.join(' ');
    expect(result.subjectType).toBe('invalid');
    expect(result.normalizedStatus).toBe('invalid');
    expect(result.decision).toBe('invalid_request');
    expect(returnedReasons).toContain('Unknown approval subjectType supplied.');
    expect(returnedReasons).not.toContain(sensitiveSubjectType);
    expect(returnedReasons).not.toContain('BOARD-APPROVAL-ID-888');
  });

  it.each(['client_merge', 'data_export'] as const)('flags %s approvals as high-risk Board/Phill review items even when approved', (subjectType) => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      id: `approval-${subjectType}`,
      subjectType,
      status: 'approved',
      approvedBy: 'Phill',
      approvalReference: 'BOARD-HIGH-RISK-1',
    });

    expect(result.normalizedStatus).toBe('approved');
    expect(result.decision).toBe('may_execute');
    expect(result.requiresPhillReview).toBe(true);
    expect(result.safeToAutoExecute).toBe(false);
    expect(result.reasons.join(' ')).toContain('high-risk');
    expect(result.reasons.join(' ')).toContain('Board/Phill review');
  });

  it('normalizes whitespace-padded runtime subjectType before output and high-risk checks', () => {
    const result = evaluateCrmApprovalLifecycle({
      ...baseInput,
      subjectType: ' data_export ' as never,
      status: 'approved',
      approvedBy: 'Phill',
      approvalReference: 'BOARD-HIGH-RISK-PADDED-1',
    });

    expect(result.subjectType).toBe('data_export');
    expect(result.normalizedStatus).toBe('approved');
    expect(result.decision).toBe('may_execute');
    expect(result.requiresPhillReview).toBe(true);
    expect(result.safeToAutoExecute).toBe(false);
    expect(result.reasons.join(' ')).toContain('high-risk');
    expect(result.reasons.join(' ')).toContain('Board/Phill review');
    expect(result.reasons.join(' ')).not.toContain('BOARD-HIGH-RISK-PADDED-1');
  });

  it('UNI-2234 regression: every evaluation carries a non-empty autoExecuteReason alongside safeToAutoExecute', () => {
    const original = process.env.CRM_AUTO_EXECUTE;
    delete process.env.CRM_AUTO_EXECUTE;

    try {
      const requested = evaluateCrmApprovalLifecycle({ ...baseInput, status: 'requested' });
      const invalid = evaluateCrmApprovalLifecycle({ ...baseInput, status: 'needs_legal_review' });

      expect(requested.safeToAutoExecute).toBe(false);
      expect(requested.autoExecuteReason).toBe('kill_switch_off');
      expect(invalid.safeToAutoExecute).toBe(false);
      expect(invalid.autoExecuteReason).toBe('kill_switch_off');
    } finally {
      if (original === undefined) delete process.env.CRM_AUTO_EXECUTE;
      else process.env.CRM_AUTO_EXECUTE = original;
    }
  });

  it('UNI-2234 review should-fix: a matrix-safe evaluation is forced unsafe when the decision is not may_execute', () => {
    process.env.CRM_AUTO_EXECUTE = '1';
    const safeSignals = { confidence: 0.9, hasExistingClientLink: false };

    // Sanity: with the kill switch on and passing L1 signals, the matrix alone says safe.
    const executable = evaluateDecisionGatedAutoExecute('lead_conversion', 'may_execute', safeSignals);
    expect(executable).toEqual({ safe: true, tier: 'L1', reason: 'l1_confidence_and_no_link_ok' });

    // The same signals under any non-executable decision must never surface safe: true.
    for (const decision of ['do_not_execute', 'await_approval', 'already_executed', 'invalid_request'] as const) {
      const gated = evaluateDecisionGatedAutoExecute('lead_conversion', decision, safeSignals);
      expect(gated).toEqual({ safe: false, tier: 'L1', reason: 'decision_not_executable' });
    }
  });
});

describe('buildCrmApprovalLifecycleInputFromTaskEvidence', () => {
  const baseTaskEvidence = {
    id: 'task-approval-1',
    status: 'blocked',
    priority: 'high',
    assignee_name: 'Phill',
    tags: ['crm', 'approval-required'],
    description: 'Awaiting Phill approval before CRM execution.',
    created_at: '2026-05-23T09:00:00+10:00',
    updated_at: '2026-05-23T09:05:00+10:00',
    due_at: '2026-05-24T09:00:00+10:00',
    completed_at: null,
    now: '2026-05-23T10:00:00+10:00',
  };

  it('maps the Stage 1 blocked high Phill approval-required task convention to a requested approval with metadata subject type', () => {
    const input = buildCrmApprovalLifecycleInputFromTaskEvidence({
      ...baseTaskEvidence,
      metadata: { subjectType: 'lead_conversion' },
    });

    expect(input).toMatchObject({
      id: 'task-approval-1',
      subjectType: 'lead_conversion',
      requestedBy: 'crm_approval_task',
      requestedAt: '2026-05-23T09:00:00+10:00',
      now: '2026-05-23T10:00:00+10:00',
      expiresAt: '2026-05-24T09:00:00+10:00',
      status: 'requested',
    });

    const result = evaluateCrmApprovalLifecycle(input);
    expect(result.normalizedStatus).toBe('requested');
    expect(result.decision).toBe('await_approval');
    expect(result.subjectType).toBe('lead_conversion');
  });

  it('defaults missing task subject type to other for Stage 1 approval tasks', () => {
    const result = evaluateCrmApprovalLifecycle(buildCrmApprovalLifecycleInputFromTaskEvidence(baseTaskEvidence));

    expect(result.subjectType).toBe('other');
    expect(result.normalizedStatus).toBe('requested');
    expect(result.decision).toBe('await_approval');
  });

  it('maps approved task metadata while evaluator reasons avoid echoing the approval reference', () => {
    const sensitiveApprovalReference = 'BOARD-2026-05-23-CRM-SECRET-9';
    const input = buildCrmApprovalLifecycleInputFromTaskEvidence({
      ...baseTaskEvidence,
      status: 'completed',
      completed_at: '2026-05-23T09:30:00+10:00',
      metadata: {
        subjectType: 'lead_conversion',
        approvalStatus: 'approved',
        approvedBy: 'Phill',
        approvalReference: sensitiveApprovalReference,
      },
    });

    expect(input.status).toBe('approved');
    expect(input.approvedBy).toBe('Phill');
    expect(input.approvalReference).toBe(sensitiveApprovalReference);

    const result = evaluateCrmApprovalLifecycle(input);
    expect(result.normalizedStatus).toBe('approved');
    expect(result.decision).toBe('may_execute');
    expect(result.reasons.join(' ')).not.toContain(sensitiveApprovalReference);
  });

  it('does not infer executed/already_executed from a completed task without explicit approval metadata', () => {
    const input = buildCrmApprovalLifecycleInputFromTaskEvidence({
      ...baseTaskEvidence,
      status: 'completed',
      completed_at: '2026-05-23T09:30:00+10:00',
      metadata: { subjectType: 'lead_conversion' },
    });

    expect(input.status).toBe('requested');
    expect(input.executedAt).toBeNull();

    const result = evaluateCrmApprovalLifecycle(input);
    expect(result.normalizedStatus).toBe('requested');
    expect(result.decision).not.toBe('already_executed');
    expect(result.decision).toBe('await_approval');
  });

  it("normalizes whitespace-padded mixed-case metadata approvalStatus ' Approved ' to approved", () => {
    const input = buildCrmApprovalLifecycleInputFromTaskEvidence({
      ...baseTaskEvidence,
      status: 'blocked',
      metadata: {
        subjectType: 'lead_conversion',
        approvalStatus: ' Approved ',
        approvedBy: 'Phill',
        approvalReference: 'BOARD-2026-05-23-CRM-11',
      },
    });

    expect(input.status).toBe('approved');

    const result = evaluateCrmApprovalLifecycle(input);
    expect(result.normalizedStatus).toBe('approved');
    expect(result.decision).toBe('may_execute');
  });

  it('preserves unknown explicit metadata approvalStatus so the evaluator returns invalid_request', () => {
    const input = buildCrmApprovalLifecycleInputFromTaskEvidence({
      ...baseTaskEvidence,
      status: 'blocked',
      metadata: {
        subjectType: 'lead_conversion',
        approvalStatus: ' needs_legal_review ',
      },
    });

    expect(input.status).toBe('needs_legal_review');

    const result = evaluateCrmApprovalLifecycle(input);
    expect(result.normalizedStatus).toBe('invalid');
    expect(result.decision).toBe('invalid_request');
    expect(result.reasons.join(' ')).toContain('Unknown approval status supplied.');
  });

  it('passes due_at and metadata expiresAt so the evaluator normalizes stale approvals to expired', () => {
    const dueAtResult = evaluateCrmApprovalLifecycle(
      buildCrmApprovalLifecycleInputFromTaskEvidence({
        ...baseTaskEvidence,
        due_at: '2026-05-23T09:30:00+10:00',
        now: '2026-05-23T10:00:00+10:00',
        metadata: { subjectType: 'lead_conversion' },
      }),
    );
    const metadataExpiresAtResult = evaluateCrmApprovalLifecycle(
      buildCrmApprovalLifecycleInputFromTaskEvidence({
        ...baseTaskEvidence,
        due_at: '2026-05-24T09:00:00+10:00',
        now: '2026-05-23T10:00:00+10:00',
        metadata: { subjectType: 'lead_conversion', expiresAt: '2026-05-23T09:30:00+10:00' },
      }),
    );

    expect(dueAtResult.normalizedStatus).toBe('expired');
    expect(metadataExpiresAtResult.normalizedStatus).toBe('expired');
  });

  it('preserves malformed metadata subject type so the evaluator returns invalid_request', () => {
    const result = evaluateCrmApprovalLifecycle(
      buildCrmApprovalLifecycleInputFromTaskEvidence({
        ...baseTaskEvidence,
        metadata: { subjectType: 'bank_transfer' },
      }),
    );

    expect(result.subjectType).toBe('invalid');
    expect(result.normalizedStatus).toBe('invalid');
    expect(result.decision).toBe('invalid_request');
  });

  it('does not copy raw Board IDs or approval references into operator-facing requestedBy or rejectionReason fields', () => {
    const sensitiveBoardId = 'BOARD-APPROVAL-ID-777';
    const sensitiveApprovalReference = 'BOARD-2026-05-23-CRM-SECRET-10';
    const input = buildCrmApprovalLifecycleInputFromTaskEvidence({
      ...baseTaskEvidence,
      id: sensitiveBoardId,
      metadata: {
        subjectType: 'lead_conversion',
        approvalStatus: 'rejected',
        approvalReference: sensitiveApprovalReference,
        rejectionReason: `Rejected in ${sensitiveBoardId} with ${sensitiveApprovalReference}`,
      },
    });

    expect(input.approvalReference).toBe(sensitiveApprovalReference);
    expect(input.requestedBy).not.toContain(sensitiveBoardId);
    expect(input.requestedBy).not.toContain(sensitiveApprovalReference);
    expect(input.rejectionReason).toBe('Rejection reason recorded in task metadata.');
    expect(input.rejectionReason).not.toContain(sensitiveBoardId);
    expect(input.rejectionReason).not.toContain(sensitiveApprovalReference);
  });
});
