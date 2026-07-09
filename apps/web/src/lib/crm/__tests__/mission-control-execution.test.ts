// UNI-2234 — CRM Mission Control consumer core (slice 1) tests.
// Proves: admission == safeToAutoExecute; dispatch is always disabled (Board gate);
// the consumer is inert through the real lifecycle evaluator (behaviour-neutral).

import {
  resolveCrmAdmission,
  buildCrmAdmissionEvidenceRow,
  buildCrmOperatorJobInsert,
  buildCrmOperatorEventInsert,
  persistCrmMissionControlJob,
  CRM_MISSION_CONTROL_LANE_ID,
  type CrmMissionControlState,
  type CrmOperatorJobsWriteClient,
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

describe('buildCrmOperatorJobInsert', () => {
  it('records a needs-review approval as a poller-inert operator_jobs row on the CRM lane', () => {
    const evalResult = evaluation({ safeToAutoExecute: false, autoExecuteReason: 'kill_switch_off' });
    const decision = resolveCrmAdmission(evalResult);
    const job = buildCrmOperatorJobInsert('founder_1', evalResult, decision);

    expect(job).toEqual({
      founder_id: 'founder_1',
      lane_id: CRM_MISSION_CONTROL_LANE_ID,
      title: 'CRM approval appr_1',
      task_type: 'lead_conversion',
      status: 'blocked',
      external_action_requested: false,
      production_action_requested: false,
      api_key_requested: false,
      evidence_refs: [],
      metadata: {
        approvalId: 'appr_1',
        subjectType: 'lead_conversion',
        lifecycleDecision: 'may_execute',
        admitted: false,
        missionControlState: 'needs_review',
        reason: 'kill_switch_off',
      },
    });
  });

  it('SAFETY: an admitted approval is still persisted status:blocked (never planned/queued) so the shared autopilot poller can never claim a CRM row', () => {
    const admitted = resolveCrmAdmission(
      evaluation({ safeToAutoExecute: true, autoExecuteReason: 'l1_confidence_and_no_link_ok' }),
    );
    expect(admitted.state).toBe<CrmMissionControlState>('queued'); // founder-facing state
    const job = buildCrmOperatorJobInsert('founder_1', evaluation({ safeToAutoExecute: true }), admitted);

    // The poller claims operator_jobs with status in (planned, queued). A CRM row
    // must never enter that claim set — the founder-facing 'queued' lives in metadata.
    expect(job.status).toBe('blocked');
    expect(job.status).not.toBe('queued');
    expect(job.status).not.toBe('planned');
    expect(job.metadata.missionControlState).toBe('queued');
    expect(job.production_action_requested).toBe(false);
  });
});

describe('buildCrmOperatorEventInsert', () => {
  it('builds a created event to the blocked record status carrying the mission-control state in the detail', () => {
    const decision = resolveCrmAdmission(evaluation({ safeToAutoExecute: false, autoExecuteReason: 'kill_switch_off' }));
    const event = buildCrmOperatorEventInsert('founder_1', 'job_1', decision);

    expect(event).toEqual({
      founder_id: 'founder_1',
      job_id: 'job_1',
      event_type: 'created',
      from_status: null,
      to_status: 'blocked',
      detail: 'CRM approval admission → needs_review (kill_switch_off)',
      evidence_ref: null,
    });
  });
});

describe('persistCrmMissionControlJob', () => {
  function fakeClient(opts: {
    existing?: Array<{ id: string }>;
    selectError?: string;
    insertError?: string;
    insertRow?: { id: string } | null;
    eventError?: string;
  } = {}): { client: CrmOperatorJobsWriteClient; jobInserts: unknown[]; eventInserts: unknown[] } {
    const jobInserts: unknown[] = [];
    const eventInserts: unknown[] = [];
    const selectBuilder = {
      eq() {
        return this;
      },
      async limit() {
        return { data: opts.existing ?? [], error: opts.selectError ? { message: opts.selectError } : null };
      },
    };
    const client = {
      from(table: string) {
        if (table === 'operator_jobs') {
          return {
            select: () => selectBuilder,
            insert: (payload: unknown) => {
              jobInserts.push(payload);
              return {
                select: () => ({
                  single: async () => ({
                    data: opts.insertError ? null : opts.insertRow ?? { id: 'job_new' },
                    error: opts.insertError ? { message: opts.insertError } : null,
                  }),
                }),
              };
            },
          };
        }
        return {
          insert: async (payload: unknown) => {
            eventInserts.push(payload);
            return { data: null, error: opts.eventError ? { message: opts.eventError } : null };
          },
        };
      },
    } as unknown as CrmOperatorJobsWriteClient;
    return { client, jobInserts, eventInserts };
  }

  const evalResult = evaluation({ safeToAutoExecute: false, autoExecuteReason: 'kill_switch_off' });

  it('inserts a job + created event and returns the new job id when none exists', async () => {
    const { client, jobInserts, eventInserts } = fakeClient({ insertRow: { id: 'job_abc' } });
    const decision = resolveCrmAdmission(evalResult);

    const result = await persistCrmMissionControlJob({ client, founderId: 'f1', evaluation: evalResult, decision });

    expect(result).toEqual({ jobId: 'job_abc', deduped: false });
    expect(jobInserts).toHaveLength(1);
    expect(eventInserts).toHaveLength(1);
    expect((eventInserts[0] as { job_id: string }).job_id).toBe('job_abc');
  });

  it('dedups on approval id — returns the existing job without inserting', async () => {
    const { client, jobInserts, eventInserts } = fakeClient({ existing: [{ id: 'job_existing' }] });
    const decision = resolveCrmAdmission(evalResult);

    const result = await persistCrmMissionControlJob({ client, founderId: 'f1', evaluation: evalResult, decision });

    expect(result).toEqual({ jobId: 'job_existing', deduped: true });
    expect(jobInserts).toHaveLength(0);
    expect(eventInserts).toHaveLength(0);
  });

  it('is authoritative — throws when the job insert fails (no silent false-green)', async () => {
    const { client } = fakeClient({ insertError: 'rls denied' });
    const decision = resolveCrmAdmission(evalResult);

    await expect(
      persistCrmMissionControlJob({ client, founderId: 'f1', evaluation: evalResult, decision }),
    ).rejects.toThrow(/CRM operator_jobs insert failed/);
  });

  it('throws when the created-event insert fails', async () => {
    const { client } = fakeClient({ insertRow: { id: 'job_abc' }, eventError: 'event rls denied' });
    const decision = resolveCrmAdmission(evalResult);

    await expect(
      persistCrmMissionControlJob({ client, founderId: 'f1', evaluation: evalResult, decision }),
    ).rejects.toThrow(/CRM operator_events insert failed/);
  });

  it('throws when the dedup lookup fails', async () => {
    const { client } = fakeClient({ selectError: 'select boom' });
    const decision = resolveCrmAdmission(evalResult);

    await expect(
      persistCrmMissionControlJob({ client, founderId: 'f1', evaluation: evalResult, decision }),
    ).rejects.toThrow(/CRM operator_jobs dedup lookup failed/);
  });
});
