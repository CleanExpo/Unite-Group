// UNI-2234 — CRM Mission Control consumer core (slice 1) tests.
// Proves: admission == safeToAutoExecute; dispatch is always disabled (Board gate);
// the consumer is inert through the real lifecycle evaluator (behaviour-neutral).

import {
  resolveCrmAdmission,
  buildCrmAdmissionEvidenceRow,
  type CrmMissionControlState,
} from '@/lib/crm/mission-control-execution';
import {
  evaluateCrmApprovalLifecycle,
  type CrmApprovalLifecycleEvaluation,
} from '@/lib/crm/approval-lifecycle';

function evaluation(overrides: Partial<CrmApprovalLifecycleEvaluation> = {}): CrmApprovalLifecycleEvaluation {
  return {
    id: 'appr_1',
    subjectType: 'lead_conversion',
    normalizedStatus: 'approved',
    decision: 'may_execute',
    requiresPhillReview: false,
    reasons: [],
    safeToAutoExecute: false,
    autoExecuteReason: 'kill_switch_off',
    ...overrides,
  };
}

describe('resolveCrmAdmission', () => {
  it('admits and queues when safeToAutoExecute is true', () => {
    const decision = resolveCrmAdmission(
      evaluation({ safeToAutoExecute: true, autoExecuteReason: 'l1_confidence_and_no_link_ok' }),
    );
    expect(decision.admitted).toBe(true);
    expect(decision.state).toBe<CrmMissionControlState>('queued');
    expect(decision.operatorStatus).toBe('queued');
    expect(decision.reason).toBe('l1_confidence_and_no_link_ok');
  });

  it('routes to needs_review (blocked) when safeToAutoExecute is false, preserving the reason', () => {
    const decision = resolveCrmAdmission(
      evaluation({ safeToAutoExecute: false, autoExecuteReason: 'kill_switch_off' }),
    );
    expect(decision.admitted).toBe(false);
    expect(decision.state).toBe<CrmMissionControlState>('needs_review');
    expect(decision.operatorStatus).toBe('blocked');
    expect(decision.reason).toBe('kill_switch_off');
  });

  it.each([
    ['do_not_execute', 'high_risk_never_auto'],
    ['await_approval', 'signal_unavailable'],
    ['invalid_request', 'kill_switch_off'],
    ['already_executed', 'kill_switch_off'],
  ] as const)('never admits a non-executable lifecycle decision (%s)', (decisionKind, reason) => {
    const result = resolveCrmAdmission(
      evaluation({ decision: decisionKind, safeToAutoExecute: false, autoExecuteReason: reason }),
    );
    expect(result.admitted).toBe(false);
    expect(result.state).toBe<CrmMissionControlState>('needs_review');
  });

  it('never enables dispatch — the Board-gate invariant holds in every branch', () => {
    expect(resolveCrmAdmission(evaluation({ safeToAutoExecute: true })).dispatchEnabled).toBe(false);
    expect(resolveCrmAdmission(evaluation({ safeToAutoExecute: false })).dispatchEnabled).toBe(false);
  });
});

describe('behaviour-neutral through the real lifecycle evaluator', () => {
  // evaluateCrmApprovalLifecycle passes no auto-exec signals, so safeToAutoExecute is
  // always false today ⇒ every real approval routes to needs_review. Nothing auto-queues.
  const originalKillSwitch = process.env.CRM_AUTO_EXECUTE;
  afterEach(() => {
    if (originalKillSwitch === undefined) delete process.env.CRM_AUTO_EXECUTE;
    else process.env.CRM_AUTO_EXECUTE = originalKillSwitch;
  });

  it.each([undefined, '1'])('an approved lead_conversion never auto-admits (kill switch=%s)', (kill) => {
    if (kill === undefined) delete process.env.CRM_AUTO_EXECUTE;
    else process.env.CRM_AUTO_EXECUTE = kill;

    const lifecycle = evaluateCrmApprovalLifecycle({
      id: 'appr_real',
      subjectType: 'lead_conversion',
      requestedBy: 'crm',
      requestedAt: '2026-07-09T00:00:00.000Z',
      now: '2026-07-09T00:01:00.000Z',
      status: 'approved',
      approvedBy: 'phill',
      approvalReference: 'ref-1',
    });

    const decision = resolveCrmAdmission(lifecycle);
    expect(decision.admitted).toBe(false);
    expect(decision.state).toBe<CrmMissionControlState>('needs_review');
  });
});

describe('buildCrmAdmissionEvidenceRow', () => {
  it('produces a write-then-confirm evidence row capturing the admission decision', () => {
    const evalResult = evaluation({ safeToAutoExecute: false, autoExecuteReason: 'l1_confidence_below_threshold' });
    const decision = resolveCrmAdmission(evalResult);
    const row = buildCrmAdmissionEvidenceRow(evalResult, decision);

    expect(row.kind).toBe('crm_approval_admission');
    expect(row.evidence_path).toBeNull();
    expect(row.summary).toContain('appr_1');
    expect(row.summary).toContain('needs_review');
    expect(row.detail).toMatchObject({
      approvalId: 'appr_1',
      subjectType: 'lead_conversion',
      lifecycleDecision: 'may_execute',
      admitted: false,
      state: 'needs_review',
      operatorStatus: 'blocked',
      reason: 'l1_confidence_below_threshold',
      dispatchEnabled: false,
    });
  });
});
