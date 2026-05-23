import { evaluateCrmApprovalLifecycle } from '@/lib/crm/approval-lifecycle';

const baseInput = {
  id: 'approval-1',
  subjectType: 'lead_conversion' as const,
  requestedBy: 'Margot',
  requestedAt: '2026-05-23T09:00:00+10:00',
  now: '2026-05-23T10:00:00+10:00',
};

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
});
