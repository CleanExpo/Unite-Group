import {
  buildApprovalDryRun,
  renderApprovalDryRunMarkdown,
  validateApprovalDryRunInput,
} from '@/lib/personal-intelligence/approval-dry-run';
import type { ApprovalHandoff } from '@/lib/personal-intelligence/approval-handoff';

const handoff: ApprovalHandoff = {
  generatedAt: '2026-05-25T17:00:00.000Z',
  preparedBy: 'Margot',
  approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1g-source.json',
  sourceRegisterPath: 'docs/margot/personal-intelligence/candidate-register/phase-1g-source.json',
  sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1g-source.md',
  actionPacks: [
    {
      actionPackId: 'phase-1g-memory-pack',
      candidateId: 'phase-1g-memory-1',
      candidateType: 'memory',
      sourceReviewStatus: 'approved',
      actionType: 'memory_write_proposal',
      reviewStatus: 'requires_human_review',
      nexusDestination: 'memory_candidate',
      title: 'Memory proposal: operating_rule',
      proposal: 'Memory write proposal only: Phill values local dry-run review before durable storage.',
      allowedDownstreamAction: 'Draft a separate durable-memory write request for human approval; do not write memory from this handoff.',
      prohibitedActions: ['Do not write durable memory from this handoff.'],
      verificationStep: 'Confirm durable and not raw.',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1g-source.md',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1g-source.json',
      sideEffectBoundary: 'proposal-only-no-execution',
      generatedAt: '2026-05-25T17:00:00.000Z',
    },
    {
      actionPackId: 'phase-1g-task-pack',
      candidateId: 'phase-1g-task-1',
      candidateType: 'task',
      sourceReviewStatus: 'approved',
      actionType: 'task_draft_proposal',
      reviewStatus: 'requires_human_review',
      nexusDestination: 'task_candidate',
      title: 'Draft local applier dry-run CLI',
      proposal: 'Task draft proposal only: build dry-run output.',
      allowedDownstreamAction: 'Draft a separate local task proposal for human approval; do not create or execute a task from this handoff.',
      prohibitedActions: ['Do not create or execute tasks from this handoff.'],
      verificationStep: 'Read back generated dry-run only.',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1g-source.md',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1g-source.json',
      sideEffectBoundary: 'proposal-only-no-execution',
      generatedAt: '2026-05-25T17:00:00.000Z',
    },
    {
      actionPackId: 'phase-1g-future-pack',
      candidateId: 'phase-1g-experiment-1',
      candidateType: 'experiment',
      sourceReviewStatus: 'parked',
      actionType: 'future_review_proposal',
      reviewStatus: 'parked',
      nexusDestination: 'agentic_thinking',
      title: 'Parked Nexus experiment',
      proposal: 'Future review proposal only: preserve signal.',
      allowedDownstreamAction: 'Keep as a future-review proposal only; do not create an experiment, route work, or publish output from this handoff.',
      prohibitedActions: ['Do not create experiments from this handoff.'],
      verificationStep: 'Confirm no experiment created.',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1g-source.md',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1g-source.json',
      sideEffectBoundary: 'proposal-only-no-execution',
      generatedAt: '2026-05-25T17:00:00.000Z',
    },
    {
      actionPackId: 'phase-1g-evidence-pack',
      candidateId: 'phase-1g-waste-1',
      candidateType: 'waste',
      sourceReviewStatus: 'rejected',
      actionType: 'evidence_only',
      reviewStatus: 'closed_no_action',
      nexusDestination: 'waste_register',
      title: 'Waste-register evidence',
      proposal: 'Evidence-only record: keep closed.',
      allowedDownstreamAction: 'Retain as local evidence only; do not operationalize, route, or resurrect without a new explicit approval.',
      prohibitedActions: ['Do not operationalize.'],
      verificationStep: 'Confirm no operational route.',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1g-source.md',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1g-source.json',
      sideEffectBoundary: 'proposal-only-no-execution',
      generatedAt: '2026-05-25T17:00:00.000Z',
    },
    {
      actionPackId: 'phase-1g-pending-pack',
      candidateId: 'phase-1g-memory-2',
      candidateType: 'memory',
      sourceReviewStatus: 'pending_review',
      actionType: 'pending_review_hold',
      reviewStatus: 'pending_decision',
      nexusDestination: 'memory_candidate',
      title: 'Pending memory proposal',
      proposal: 'Pending review hold: await explicit ledger decision.',
      allowedDownstreamAction: 'Hold for explicit human decision; do not create memory, tasks, experiments, routes, or production changes.',
      prohibitedActions: ['Do not write durable memory from this handoff.'],
      verificationStep: 'Confirm pending hold.',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1g-source.md',
      approvalLedgerPath: 'docs/margot/personal-intelligence/approval-ledger/phase-1g-source.json',
      sideEffectBoundary: 'proposal-only-no-execution',
      generatedAt: '2026-05-25T17:00:00.000Z',
    },
  ],
  sideEffectBoundaries: [
    'No durable memory writes occurred.',
    'No tasks, experiments, production writes, deployments, or client-facing actions occurred.',
  ],
};

describe('buildApprovalDryRun', () => {
  it('transforms action packs into explicit no-execution dry-run next-step records', () => {
    const dryRun = buildApprovalDryRun({
      dryRunName: 'phase-1g-dry-run',
      generatedAt: '2026-05-25T18:00:00.000Z',
      preparedBy: 'Margot',
      approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
      handoff,
    });

    expect(dryRun.dryRunItems.map((item) => [item.actionPackId, item.dryRunAction, item.executionStatus])).toEqual([
      ['phase-1g-memory-pack', 'dry_run_memory_write_request', 'not_executed'],
      ['phase-1g-task-pack', 'dry_run_task_draft', 'not_executed'],
      ['phase-1g-future-pack', 'dry_run_future_review_queue_item', 'not_executed'],
      ['phase-1g-evidence-pack', 'dry_run_archive_evidence_marker', 'not_executed'],
      ['phase-1g-pending-pack', 'dry_run_no_op_hold', 'not_executed'],
    ]);
    expect(dryRun.dryRunItems.map((item) => item.sourceReviewStatus)).toEqual(['approved', 'approved', 'parked', 'rejected', 'pending_review']);
    expect(dryRun.dryRunItems.every((item) => item.sideEffectBoundary === 'dry-run-only-no-execution')).toBe(true);
    expect(dryRun.sideEffectBoundaries).toContain('No durable memory writes occurred.');
    expect(dryRun.sideEffectBoundaries).toContain('No task creation, task execution, experiment creation, routing, external mutation, production writes, deployments, or client-facing actions occurred.');
    expect(dryRun.dryRunItems[0].wouldDo).toContain('Would draft a separate durable-memory write request');
    expect(dryRun.dryRunItems[0].mustNotDo).toContain('Must not write durable memory.');
  });

  it('redacts sensitive dry-run text and renders Markdown safely', () => {
    const dryRun = buildApprovalDryRun({
      dryRunName: 'phase-1g-sensitive',
      generatedAt: '2026-05-25T18:00:00.000Z',
      preparedBy: 'founder@example.com',
      approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/private.json',
      handoff: {
        ...handoff,
        actionPacks: [
          {
            ...handoff.actionPacks[0],
            title: 'Memory | proposal\nwith newline',
            proposal: 'Memory write proposal only: api_key: SECRET123 belongs to founder@example.com',
          },
        ],
      },
    });
    const serialized = `${JSON.stringify(dryRun)}\n${renderApprovalDryRunMarkdown(dryRun)}`;

    expect(serialized).toContain('[redacted-email]');
    expect(serialized).toContain('[redacted-secret]');
    expect(serialized).toContain('Memory \\| proposal with newline');
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('SECRET123');
  });

  it('validates parsed input and fails closed for unsafe paths, duplicate packs, or executable boundaries', () => {
    expect(() => validateApprovalDryRunInput({ generatedAt: '2026-05-25T18:00:00.000Z' })).toThrow(
      'approvalHandoffPath is required',
    );

    expect(() =>
      validateApprovalDryRunInput({
        generatedAt: '2026-05-25T18:00:00.000Z',
        preparedBy: 'Margot',
        approvalHandoffPath: '../outside.json',
        handoff,
      }),
    ).toThrow('approvalHandoffPath must stay under docs/margot/personal-intelligence/approval-handoff');

    expect(() =>
      validateApprovalDryRunInput({
        generatedAt: '2026-05-25T18:00:00.000Z',
        preparedBy: 'Margot',
        approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
        handoff: {
          ...handoff,
          actionPacks: [handoff.actionPacks[0], { ...handoff.actionPacks[1], actionPackId: 'phase-1g-memory-pack' }],
        },
      }),
    ).toThrow('duplicate handoff actionPackId: phase-1g-memory-pack');

    expect(() =>
      validateApprovalDryRunInput({
        generatedAt: '2026-05-25T18:00:00.000Z',
        preparedBy: 'Margot',
        approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
        handoff: {
          ...handoff,
          actionPacks: [{ ...handoff.actionPacks[0], sideEffectBoundary: 'execute-now' }],
        },
      }),
    ).toThrow('handoff.actionPacks[0].sideEffectBoundary must be proposal-only-no-execution');
  });

  it('fails closed when action-pack decisions contradict the dry-run safety mapping', () => {
    expect(() =>
      validateApprovalDryRunInput({
        generatedAt: '2026-05-25T18:00:00.000Z',
        preparedBy: 'Margot',
        approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
        handoff: {
          ...handoff,
          actionPacks: [
            {
              ...handoff.actionPacks[3],
              sourceReviewStatus: 'approved',
              actionType: 'future_review_proposal',
              reviewStatus: 'parked',
            },
          ],
        },
      }),
    ).toThrow('waste action packs must remain evidence_only');

    expect(() =>
      validateApprovalDryRunInput({
        generatedAt: '2026-05-25T18:00:00.000Z',
        preparedBy: 'Margot',
        approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
        handoff: {
          ...handoff,
          actionPacks: [{ ...handoff.actionPacks[0], sourceReviewStatus: 'pending_review' }],
        },
      }),
    ).toThrow('pending_review candidates must remain pending_review_hold');

    expect(() =>
      validateApprovalDryRunInput({
        generatedAt: '2026-05-25T18:00:00.000Z',
        preparedBy: 'Margot',
        approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
        handoff: {
          ...handoff,
          actionPacks: [{ ...handoff.actionPacks[0], actionType: 'future_review_proposal', reviewStatus: 'parked' }],
        },
      }),
    ).toThrow('approved memory/task candidates must not be future_review_proposal');

    expect(() =>
      validateApprovalDryRunInput({
        generatedAt: '2026-05-25T18:00:00.000Z',
        preparedBy: 'Margot',
        approvalHandoffPath: 'docs/margot/personal-intelligence/approval-handoff/phase-1f-source.json',
        handoff: {
          ...handoff,
          actionPacks: [{ ...handoff.actionPacks[4], actionType: 'evidence_only' }],
        },
      }),
    ).toThrow('pending_review candidates must remain pending_review_hold');
  });
});
