import {
  buildApprovalHandoff,
  renderApprovalHandoffMarkdown,
  validateApprovalHandoffInput,
} from '@/lib/personal-intelligence/approval-handoff';
import type { CandidateApprovalLedger } from '@/lib/personal-intelligence/candidate-approval-ledger';

const ledger: CandidateApprovalLedger = {
  generatedAt: '2026-05-25T16:00:00.000Z',
  reviewer: 'Phill',
  registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1f-source.json',
  sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1f-source.md',
  currentStatuses: [
    {
      candidateId: 'phase-1f-memory-1',
      candidateType: 'memory',
      sourceApprovalStatus: 'needs_approval',
      currentStatus: 'approved',
      nexusDestination: 'memory_candidate',
      title: 'Memory proposal: operating_rule',
      usefulSignal: 'Phill values local approval handoff before durable storage.',
      allowedNextAction: 'Eligible for a separate explicit durable-memory write approval; this ledger does not write memory.',
      verificationStep: 'Confirm durable and not raw.',
      sideEffectBoundary: 'no-execution',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1f-source.md',
      registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1f-source.json',
      updatedAt: '2026-05-25T16:01:00.000Z',
    },
    {
      candidateId: 'phase-1f-task-1',
      candidateType: 'task',
      sourceApprovalStatus: 'draft',
      currentStatus: 'approved',
      nexusDestination: 'task_candidate',
      title: 'Draft local handoff CLI',
      usefulSignal: 'A handoff CLI can create reviewable task proposals without task creation.',
      allowedNextAction: 'Eligible for a separate implementation plan; this ledger does not execute tasks.',
      verificationStep: 'Read back generated proposal only.',
      sideEffectBoundary: 'no-execution',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1f-source.md',
      registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1f-source.json',
      updatedAt: '2026-05-25T16:02:00.000Z',
    },
    {
      candidateId: 'phase-1f-experiment-1',
      candidateType: 'experiment',
      sourceApprovalStatus: 'needs_approval',
      currentStatus: 'parked',
      nexusDestination: 'agentic_thinking',
      title: 'Parked Nexus experiment',
      usefulSignal: 'Experiment should remain future review only.',
      allowedNextAction: 'Keep parked for later review; do not execute or route.',
      verificationStep: 'Confirm no experiment created.',
      sideEffectBoundary: 'no-execution',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1f-source.md',
      registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1f-source.json',
      updatedAt: '2026-05-25T16:03:00.000Z',
    },
    {
      candidateId: 'phase-1f-waste-1',
      candidateType: 'waste',
      sourceApprovalStatus: 'rejected',
      currentStatus: 'rejected',
      nexusDestination: 'waste_register',
      title: 'Waste-register evidence',
      usefulSignal: 'Rejected content should remain evidence-only.',
      allowedNextAction: 'Retain as rejected evidence only; do not operationalize.',
      verificationStep: 'Confirm no operational route.',
      sideEffectBoundary: 'no-execution',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1f-source.md',
      registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1f-source.json',
      updatedAt: '2026-05-25T16:04:00.000Z',
    },
    {
      candidateId: 'phase-1f-pending-1',
      candidateType: 'memory',
      sourceApprovalStatus: 'needs_approval',
      currentStatus: 'pending_review',
      nexusDestination: 'memory_candidate',
      title: 'Pending memory proposal',
      usefulSignal: 'Pending content must not be handed to memory write.',
      allowedNextAction: 'Do not execute, store, route, or deploy until an explicit ledger decision is recorded.',
      verificationStep: 'Confirm pending hold.',
      sideEffectBoundary: 'no-execution',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1f-source.md',
      registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1f-source.json',
      updatedAt: '2026-05-25T16:05:00.000Z',
    },
  ],
  auditTrail: [],
  sideEffectBoundaries: [
    'No durable memory writes occurred.',
    'No task execution occurred.',
    'No production database writes occurred.',
    'No deployment, publishing, or client-facing action occurred.',
  ],
};

describe('buildApprovalHandoff', () => {
  it('converts approval ledger statuses into explicit local-only human review action packs', () => {
    const handoff = buildApprovalHandoff({
      generatedAt: '2026-05-25T17:00:00.000Z',
      preparedBy: 'Margot',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1f-source.json',
      ledger,
    });

    expect(handoff.actionPacks.map((pack) => [pack.candidateId, pack.actionType, pack.reviewStatus])).toEqual([
      ['phase-1f-memory-1', 'memory_write_proposal', 'requires_human_review'],
      ['phase-1f-task-1', 'task_draft_proposal', 'requires_human_review'],
      ['phase-1f-experiment-1', 'future_review_proposal', 'parked'],
      ['phase-1f-waste-1', 'evidence_only', 'closed_no_action'],
      ['phase-1f-pending-1', 'pending_review_hold', 'pending_decision'],
    ]);
    expect(handoff.actionPacks.every((pack) => pack.sideEffectBoundary === 'proposal-only-no-execution')).toBe(true);
    expect(handoff.actionPacks[0].allowedDownstreamAction).toBe('Draft a separate durable-memory write request for human approval; do not write memory from this handoff.');
    expect(handoff.actionPacks[1].allowedDownstreamAction).toBe('Draft a separate local task proposal for human approval; do not create or execute a task from this handoff.');
    expect(handoff.sideEffectBoundaries).toContain('No durable memory writes occurred.');
    expect(handoff.sideEffectBoundaries).toContain('No tasks, experiments, production writes, deployments, or client-facing actions occurred.');
  });

  it('keeps waste candidates evidence-only even if a ledger status is approved, parked, or pending review', () => {
    const handoff = buildApprovalHandoff({
      generatedAt: '2026-05-25T17:00:00.000Z',
      preparedBy: 'Margot',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1f-source.json',
      ledger: {
        ...ledger,
        currentStatuses: [
          { ...ledger.currentStatuses[3], candidateId: 'phase-1f-waste-approved', currentStatus: 'approved' },
          { ...ledger.currentStatuses[3], candidateId: 'phase-1f-waste-parked', currentStatus: 'parked' },
          { ...ledger.currentStatuses[3], candidateId: 'phase-1f-waste-pending', currentStatus: 'pending_review' },
        ],
      },
    });

    expect(handoff.actionPacks.map((pack) => [pack.candidateId, pack.actionType, pack.reviewStatus])).toEqual([
      ['phase-1f-waste-approved', 'evidence_only', 'closed_no_action'],
      ['phase-1f-waste-parked', 'evidence_only', 'closed_no_action'],
      ['phase-1f-waste-pending', 'evidence_only', 'closed_no_action'],
    ]);
  });

  it('redacts sensitive handoff text and renders Markdown tables safely', () => {
    const handoff = buildApprovalHandoff({
      generatedAt: '2026-05-25T17:00:00.000Z',
      preparedBy: 'founder@example.com',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/private.json',
      ledger: {
        ...ledger,
        currentStatuses: [
          {
            ...ledger.currentStatuses[0],
            title: 'Memory | proposal\nwith newline',
            usefulSignal: 'api_key: SECRET123 belongs to founder@example.com',
          },
        ],
      },
    });
    const serialized = `${JSON.stringify(handoff)}\n${renderApprovalHandoffMarkdown(handoff)}`;

    expect(serialized).toContain('[redacted-email]');
    expect(serialized).toContain('[redacted-secret]');
    expect(serialized).toContain('Memory \\| proposal with newline');
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('SECRET123');
  });

  it('validates parsed input and fails closed for unsafe paths or ambiguous candidate state', () => {
    expect(() => validateApprovalHandoffInput({ generatedAt: '2026-05-25T17:00:00.000Z' })).toThrow(
      'approvalLedgerPath is required',
    );

    expect(() =>
      validateApprovalHandoffInput({
        generatedAt: '2026-05-25T17:00:00.000Z',
        preparedBy: 'Margot',
        approvalLedgerPath: '../outside.json',
        ledger,
      }),
    ).toThrow('approvalLedgerPath must stay under docs/margot/personal-intelligence/approval-ledger');

    expect(() =>
      validateApprovalHandoffInput({
        generatedAt: '2026-05-25T17:00:00.000Z',
        preparedBy: 'Margot',
        approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1f-source.json',
        ledger: {
          ...ledger,
          currentStatuses: [ledger.currentStatuses[0], { ...ledger.currentStatuses[1], candidateId: 'phase-1f-memory-1' }],
        },
      }),
    ).toThrow('duplicate ledger candidateId: phase-1f-memory-1');

    expect(() =>
      validateApprovalHandoffInput({
        generatedAt: '2026-05-25T17:00:00.000Z',
        preparedBy: 'Margot',
        approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1f-source.json',
        ledger: {
          ...ledger,
          currentStatuses: [{ ...ledger.currentStatuses[0], sideEffectBoundary: 'execute-now' }],
        },
      }),
    ).toThrow('ledger.currentStatuses[0].sideEffectBoundary must be no-execution');
  });
});
