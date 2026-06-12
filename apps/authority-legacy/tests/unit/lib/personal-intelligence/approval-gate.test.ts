import {
  buildApprovalGate,
  renderApprovalGateMarkdown,
  validateApprovalGateInput,
} from '@/lib/personal-intelligence/approval-gate';
import type { ApprovalDryRun } from '@/lib/personal-intelligence/approval-dry-run';

const dryRun: ApprovalDryRun = {
  dryRunName: 'phase-1h-source-dry-run',
  generatedAt: '2026-05-25T18:00:00.000Z',
  preparedBy: 'Margot',
  approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
  approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1e-source.json',
  sourceRegisterPath: 'docs/margot/personal-intelligence/candidate-register/phase-1d-source.json',
  sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1c-source.md',
  dryRunItems: [
    {
      dryRunItemId: 'phase-1g-memory-dry-run',
      actionPackId: 'phase-1f-memory-pack',
      candidateId: 'phase-1c-memory-1',
      candidateType: 'memory',
      sourceActionType: 'memory_write_proposal',
      sourceReviewStatus: 'approved',
      dryRunAction: 'dry_run_memory_write_request',
      executionStatus: 'not_executed',
      nexusDestination: 'memory_candidate',
      title: 'Memory proposal',
      wouldDo: 'Would draft a separate durable-memory write request for human approval.',
      mustNotDo: ['Must not write durable memory.'],
      verificationStep: 'Confirm durable and approved.',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1c-source.md',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1e-source.json',
      approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
      sideEffectBoundary: 'dry-run-only-no-execution',
      generatedAt: '2026-05-25T18:00:00.000Z',
    },
    {
      dryRunItemId: 'phase-1g-task-dry-run',
      actionPackId: 'phase-1f-task-pack',
      candidateId: 'phase-1c-task-1',
      candidateType: 'task',
      sourceActionType: 'task_draft_proposal',
      sourceReviewStatus: 'approved',
      dryRunAction: 'dry_run_task_draft',
      executionStatus: 'not_executed',
      nexusDestination: 'task_candidate',
      title: 'Task draft',
      wouldDo: 'Would draft a separate local task proposal for human approval.',
      mustNotDo: ['Must not create or execute tasks.'],
      verificationStep: 'Read back generated task draft only.',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1c-source.md',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1e-source.json',
      approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
      sideEffectBoundary: 'dry-run-only-no-execution',
      generatedAt: '2026-05-25T18:00:00.000Z',
    },
    {
      dryRunItemId: 'phase-1g-future-dry-run',
      actionPackId: 'phase-1f-future-pack',
      candidateId: 'phase-1c-experiment-1',
      candidateType: 'experiment',
      sourceActionType: 'future_review_proposal',
      sourceReviewStatus: 'parked',
      dryRunAction: 'dry_run_future_review_queue_item',
      executionStatus: 'not_executed',
      nexusDestination: 'agentic_thinking',
      title: 'Future review',
      wouldDo: 'Would preserve as a future review queue item only.',
      mustNotDo: ['Must not create experiments or route work.'],
      verificationStep: 'Confirm no experiment created.',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1c-source.md',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1e-source.json',
      approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
      sideEffectBoundary: 'dry-run-only-no-execution',
      generatedAt: '2026-05-25T18:00:00.000Z',
    },
    {
      dryRunItemId: 'phase-1g-waste-dry-run',
      actionPackId: 'phase-1f-waste-pack',
      candidateId: 'phase-1c-waste-1',
      candidateType: 'waste',
      sourceActionType: 'evidence_only',
      sourceReviewStatus: 'rejected',
      dryRunAction: 'dry_run_archive_evidence_marker',
      executionStatus: 'not_executed',
      nexusDestination: 'waste_register',
      title: 'Waste evidence',
      wouldDo: 'Would mark as local archive/evidence only.',
      mustNotDo: ['Must not operationalize evidence-only items.'],
      verificationStep: 'Confirm no operational route.',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1c-source.md',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1e-source.json',
      approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
      sideEffectBoundary: 'dry-run-only-no-execution',
      generatedAt: '2026-05-25T18:00:00.000Z',
    },
    {
      dryRunItemId: 'phase-1g-pending-dry-run',
      actionPackId: 'phase-1f-pending-pack',
      candidateId: 'phase-1c-memory-2',
      candidateType: 'memory',
      sourceActionType: 'pending_review_hold',
      sourceReviewStatus: 'pending_review',
      dryRunAction: 'dry_run_no_op_hold',
      executionStatus: 'not_executed',
      nexusDestination: 'memory_candidate',
      title: 'Pending hold',
      wouldDo: 'Would hold as a no-op pending decision.',
      mustNotDo: ['Must not create memory, tasks, experiments, routes, or production changes.'],
      verificationStep: 'Confirm pending hold.',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1c-source.md',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1e-source.json',
      approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
      sideEffectBoundary: 'dry-run-only-no-execution',
      generatedAt: '2026-05-25T18:00:00.000Z',
    },
  ],
  sideEffectBoundaries: ['No durable memory writes occurred.'],
};

describe('buildApprovalGate', () => {
  it('maps all five Phase 1G dry-run item types into approval-gated apply requests without side effects', () => {
    const gate = buildApprovalGate({
      gateName: 'phase-1h-gate',
      generatedAt: '2026-05-25T19:00:00.000Z',
      preparedBy: 'Margot',
      approvalDryRunPath: 'docs/margot/personal-intelligence/approval-dry-run/phase-1g-source.json',
      dryRun,
    });

    expect(gate.applyRequests.map((request) => [request.sourceDryRunId, request.requestedActionType, request.applyState])).toEqual([
      ['phase-1g-memory-dry-run', 'memory_apply_request', 'pending_human_gate'],
      ['phase-1g-task-dry-run', 'task_apply_request', 'pending_human_gate'],
      ['phase-1g-future-dry-run', 'future_queue_apply_request', 'pending_human_gate'],
      ['phase-1g-waste-dry-run', 'archive_marker_apply_request', 'pending_human_gate'],
      ['phase-1g-pending-dry-run', 'hold_apply_request', 'pending_human_gate'],
    ]);
    expect(gate.applyRequests.map((request) => request.sourceReviewStatus)).toEqual(['approved', 'approved', 'parked', 'rejected', 'pending_review']);
    expect(gate.applyRequests.every((request) => request.phase === '1H')).toBe(true);
    expect(gate.applyRequests.every((request) => request.requiresHumanApproval)).toBe(true);
    expect(gate.applyRequests.every((request) => request.noSideEffectDeclaration)).toBe(true);
    expect(gate.applyRequests[3].guardrailFlags).toContain('waste_or_rejected_non_operational');
    expect(gate.sideEffectBoundaries).toContain('No apply execution path was created or invoked.');
  });

  it('redacts sensitive text and renders deterministic Markdown', () => {
    const gate = buildApprovalGate({
      gateName: 'phase-1h-sensitive',
      generatedAt: '2026-05-25T19:00:00.000Z',
      preparedBy: 'founder@example.com',
      approvalDryRunPath: 'docs/margot/personal-intelligence/approval-dry-run/private.json',
      dryRun: {
        ...dryRun,
        dryRunItems: [
          {
            ...dryRun.dryRunItems[0],
            title: 'Memory | proposal\nwith newline',
            wouldDo: 'Would draft memory request for api_key: SECRET123 and founder@example.com',
          },
        ],
      },
    });
    const serialized = `${JSON.stringify(gate)}\n${renderApprovalGateMarkdown(gate)}`;

    expect(serialized).toContain('[redacted-email]');
    expect(serialized).toContain('[redacted-secret]');
    expect(serialized).toContain('Memory \\| proposal with newline');
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('SECRET123');
  });

  it('fails closed for missing identifiers, unknown dry-run action, and duplicate apply-request IDs', () => {
    expect(() => validateApprovalGateInput({ generatedAt: '2026-05-25T19:00:00.000Z' })).toThrow('approvalDryRunPath is required');

    expect(() =>
      validateApprovalGateInput({
        generatedAt: '2026-05-25T19:00:00.000Z',
        preparedBy: 'Margot',
        approvalDryRunPath: 'docs/margot/personal-intelligence/approval-dry-run/phase-1g-source.json',
        dryRun: { ...dryRun, dryRunItems: [{ ...dryRun.dryRunItems[0], candidateId: '' }] },
      }),
    ).toThrow('sourceCandidateId is required');

    expect(() =>
      validateApprovalGateInput({
        generatedAt: '2026-05-25T19:00:00.000Z',
        preparedBy: 'Margot',
        approvalDryRunPath: 'docs/margot/personal-intelligence/approval-dry-run/phase-1g-source.json',
        dryRun: { ...dryRun, dryRunItems: [{ ...dryRun.dryRunItems[0], dryRunAction: 'dry_run_execute_now' }] },
      }),
    ).toThrow('dryRunAction is invalid');

    expect(() =>
      buildApprovalGate({
        gateName: 'phase-1h-duplicate',
        generatedAt: '2026-05-25T19:00:00.000Z',
        preparedBy: 'Margot',
        approvalDryRunPath: 'docs/margot/personal-intelligence/approval-dry-run/phase-1g-source.json',
        dryRun: {
          ...dryRun,
          dryRunItems: [dryRun.dryRunItems[0], { ...dryRun.dryRunItems[0], dryRunItemId: 'phase-1g-memory-dry-run-duplicate-source' }],
        },
      }),
    ).toThrow('duplicate apply request id');
  });

  it('fails closed when dry-run decisions contradict approval-gate safety mappings', () => {
    const input = (item: Partial<(typeof dryRun.dryRunItems)[number]>) => ({
      generatedAt: '2026-05-25T19:00:00.000Z',
      preparedBy: 'Margot',
      approvalDryRunPath: 'docs/margot/personal-intelligence/approval-dry-run/phase-1g-source.json',
      dryRun: { ...dryRun, dryRunItems: [{ ...dryRun.dryRunItems[0], ...item }] },
    });

    expect(() => validateApprovalGateInput(input({ candidateType: 'waste', dryRunAction: 'dry_run_memory_write_request' }))).toThrow(
      'waste dry-run items must map to archive_marker_apply_request only',
    );
    expect(() => validateApprovalGateInput(input({ sourceReviewStatus: 'pending_review', dryRunAction: 'dry_run_task_draft' }))).toThrow(
      'pending_review dry-run items must map to hold_apply_request only',
    );
    expect(() => validateApprovalGateInput(input({ candidateType: 'memory', dryRunAction: 'dry_run_future_review_queue_item' }))).toThrow(
      'memory/task dry-run items must not map to future_queue_apply_request',
    );
    expect(() => validateApprovalGateInput(input({ sourceActionType: 'evidence_only', dryRunAction: 'dry_run_task_draft' }))).toThrow(
      'contradictory sourceDecisionType + requestedActionType',
    );
    expect(() => validateApprovalGateInput(input({ sourceReviewStatus: 'rejected' }))).toThrow(
      'memory apply requests must originate from approved memory dry-run items',
    );
    expect(() => validateApprovalGateInput(input({ ...dryRun.dryRunItems[1], sourceReviewStatus: 'parked' }))).toThrow(
      'task apply requests must originate from approved task dry-run items',
    );
    expect(() => validateApprovalGateInput(input({ ...dryRun.dryRunItems[4], sourceReviewStatus: 'approved' }))).toThrow(
      'hold apply requests must originate from pending_review dry-run items',
    );
    expect(() => validateApprovalGateInput(input({ ...dryRun.dryRunItems[2], sourceActionType: 'evidence_only', dryRunAction: 'dry_run_archive_evidence_marker' }))).toThrow(
      'archive marker apply requests must originate from waste or rejected evidence dry-run items',
    );
  });

  it('keeps waste approved, parked, and pending_review states non-executable and away from memory/task/future requests', () => {
    const wasteStatuses = ['approved', 'parked', 'pending_review'] as const;
    for (const status of wasteStatuses) {
      const gate = buildApprovalGate({
        gateName: `phase-1h-waste-${status}`,
        generatedAt: '2026-05-25T19:00:00.000Z',
        preparedBy: 'Margot',
        approvalDryRunPath: 'docs/margot/personal-intelligence/approval-dry-run/phase-1g-source.json',
        dryRun: {
          ...dryRun,
          dryRunItems: [
            {
              ...dryRun.dryRunItems[3],
              sourceReviewStatus: status,
              dryRunAction: 'dry_run_archive_evidence_marker',
              sourceActionType: 'evidence_only',
            },
          ],
        },
      });

      expect(gate.applyRequests).toHaveLength(1);
      expect(gate.applyRequests[0].requestedActionType).toBe('archive_marker_apply_request');
      expect(gate.applyRequests[0].applyState).toBe('pending_human_gate');
      expect(gate.applyRequests[0].guardrailFlags).toContain('waste_or_rejected_non_operational');
    }
  });
});
