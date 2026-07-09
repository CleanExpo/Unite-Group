// UNI-2234 — CRM execution stage (slice 4) tests.
// Proves: dormant by default (armed off + empty registry), and when armed with an
// injected executor it does write-then-confirm journaling and executing→executed|failed.

import {
  runCrmAutoExecution,
  isCrmDispatchArmed,
  resolveSubjectExecutor,
  type CrmExecutor,
} from '@/lib/crm/crm-auto-executor';
import type { CrmApprovalLifecycleEvaluation } from '@/lib/crm/approval-lifecycle';
import type { CrmAdmissionDecision } from '@/lib/crm/mission-control-execution';

const evaluation: CrmApprovalLifecycleEvaluation = {
  id: 'appr_1',
  subjectType: 'lead_conversion',
  normalizedStatus: 'approved',
  decision: 'may_execute',
  requiresPhillReview: false,
  reasons: [],
  safeToAutoExecute: true,
  autoExecuteReason: 'l1_confidence_and_no_link_ok',
};

const admitted: CrmAdmissionDecision = {
  admitted: true,
  state: 'queued',
  operatorStatus: 'queued',
  reason: 'l1_confidence_and_no_link_ok',
  dispatchEnabled: false,
};
const notAdmitted: CrmAdmissionDecision = { ...admitted, admitted: false, state: 'needs_review', operatorStatus: 'blocked' };

describe('dormant defaults (Board gate)', () => {
  const original = process.env.CRM_DISPATCH_ARMED;
  afterEach(() => {
    if (original === undefined) delete process.env.CRM_DISPATCH_ARMED;
    else process.env.CRM_DISPATCH_ARMED = original;
  });

  it('isCrmDispatchArmed is false unless CRM_DISPATCH_ARMED === "1"', () => {
    delete process.env.CRM_DISPATCH_ARMED;
    expect(isCrmDispatchArmed()).toBe(false);
    process.env.CRM_DISPATCH_ARMED = 'true';
    expect(isCrmDispatchArmed()).toBe(false);
    process.env.CRM_DISPATCH_ARMED = '1';
    expect(isCrmDispatchArmed()).toBe(true);
  });

  it('resolveSubjectExecutor returns null for every subject (no real mutations yet)', () => {
    for (const s of ['lead_conversion', 'opportunity_commitment', 'client_merge', 'data_export', 'other']) {
      expect(resolveSubjectExecutor(s)).toBeNull();
    }
  });
});

describe('runCrmAutoExecution', () => {
  it('needs-review when not admitted — never runs the executor', async () => {
    const executor = vi.fn();
    const res = await runCrmAutoExecution(evaluation, notAdmitted, executor as unknown as CrmExecutor);
    expect(res.state).toBe('needs_review');
    expect(res.reason).toBe('not_admitted');
    expect(executor).not.toHaveBeenCalled();
  });

  it('needs-review with no executor — nothing to run, no journal', async () => {
    const journal = vi.fn().mockResolvedValue(undefined);
    const res = await runCrmAutoExecution(evaluation, admitted, null, { journal });
    expect(res.state).toBe('needs_review');
    expect(res.reason).toBe('no_executor');
    expect(journal).not.toHaveBeenCalled();
  });

  it('executed + write-then-confirm journal when an injected executor resolves', async () => {
    const journal = vi.fn().mockResolvedValue(undefined);
    const executor: CrmExecutor = vi.fn().mockResolvedValue({ leadId: 'l1', clientId: 'c1' });
    const res = await runCrmAutoExecution(evaluation, admitted, executor, { journal });
    expect(res.state).toBe('executed');
    expect(res.result).toEqual({ leadId: 'l1', clientId: 'c1' });
    expect(journal).toHaveBeenCalledTimes(1);
    expect(journal.mock.calls[0][0]).toMatchObject({ kind: 'crm_auto_execution', detail: { outcome: 'executed', approvalId: 'appr_1' } });
  });

  it('failed (execution_error) + journal when the executor throws', async () => {
    const journal = vi.fn().mockResolvedValue(undefined);
    const executor: CrmExecutor = vi.fn().mockRejectedValue(new Error('db down'));
    const res = await runCrmAutoExecution(evaluation, admitted, executor, { journal });
    expect(res.state).toBe('failed');
    expect(res.reason).toBe('execution_error');
    expect(journal.mock.calls[0][0]).toMatchObject({ kind: 'crm_auto_execution', detail: { outcome: 'failed' } });
  });

  it('failed (execution_timeout) when the executor hangs past the timeout', async () => {
    const executor: CrmExecutor = vi.fn().mockImplementation(() => new Promise(() => {}));
    const res = await runCrmAutoExecution(evaluation, admitted, executor, { timeoutMs: 5 });
    expect(res.state).toBe('failed');
    expect(res.reason).toBe('execution_timeout');
  });
});
