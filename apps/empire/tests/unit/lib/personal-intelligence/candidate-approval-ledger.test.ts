import {
  buildCandidateApprovalLedger,
  renderCandidateApprovalLedgerMarkdown,
  validateCandidateApprovalLedgerInput,
} from '@/lib/personal-intelligence/candidate-approval-ledger';
import type { CandidateRegisterBatch } from '@/lib/personal-intelligence/candidate-register';

const registerBatch: CandidateRegisterBatch = {
  generatedAt: '2026-05-25T14:00:00.000Z',
  sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1e-source.md',
  entries: [
    {
      candidateId: 'phase-1e-memory-1',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1e-source.md',
      candidateType: 'memory',
      approvalStatus: 'needs_approval',
      nexusDestination: 'memory_candidate',
      title: 'Memory proposal: user_preference',
      usefulSignal: 'Phill values verified long-horizon planning.',
      smallestNextAction: 'Review and approve before durable storage.',
      verificationStep: 'Confirm distilled and durable.',
      retentionPrivacyGuardrails: ['proposal only', 'no raw transcript'],
      createdAt: '2026-05-25T14:00:00.000Z',
      updatedAt: '2026-05-25T14:00:00.000Z',
    },
    {
      candidateId: 'phase-1e-task-1',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1e-source.md',
      candidateType: 'task',
      approvalStatus: 'draft',
      nexusDestination: 'task_candidate',
      title: 'Create a local review queue',
      usefulSignal: 'A candidate queue helps separate review from execution.',
      smallestNextAction: 'Draft the queue output.',
      verificationStep: 'Read back queue statuses.',
      retentionPrivacyGuardrails: ['local draft only'],
      createdAt: '2026-05-25T14:00:00.000Z',
      updatedAt: '2026-05-25T14:00:00.000Z',
    },
    {
      candidateId: 'phase-1e-experiment-1',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/phase-1e-source.md',
      candidateType: 'experiment',
      approvalStatus: 'needs_approval',
      nexusDestination: 'marketing_strategy',
      title: 'Local Nexus experiment',
      usefulSignal: 'Test one local strategy draft.',
      smallestNextAction: 'Park until reviewed.',
      verificationStep: 'Confirm no deploy.',
      retentionPrivacyGuardrails: ['no production writes'],
      createdAt: '2026-05-25T14:00:00.000Z',
      updatedAt: '2026-05-25T14:00:00.000Z',
    },
  ],
};

describe('buildCandidateApprovalLedger', () => {
  it('creates deterministic current statuses and immutable audit events for approved rejected and parked candidates', () => {
    const ledger = buildCandidateApprovalLedger({
      generatedAt: '2026-05-25T15:00:00.000Z',
      reviewer: 'Phill',
      registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
      registerBatch,
      decisions: [
        {
          candidateId: 'phase-1e-memory-1',
          decision: 'approved',
          decidedAt: '2026-05-25T15:01:00.000Z',
          decidedBy: 'Phill',
          rationale: 'Distilled durable founder preference; no raw content.',
        },
        {
          candidateId: 'phase-1e-task-1',
          decision: 'rejected',
          decidedAt: '2026-05-25T15:02:00.000Z',
          decidedBy: 'Phill',
          rationale: 'Duplicate of existing implementation lane.',
        },
        {
          candidateId: 'phase-1e-experiment-1',
          decision: 'parked',
          decidedAt: '2026-05-25T15:03:00.000Z',
          decidedBy: 'Phill',
          rationale: 'Useful but not today; preserve as local evidence only.',
        },
      ],
    });

    expect(ledger.currentStatuses.map((status) => [status.candidateId, status.currentStatus])).toEqual([
      ['phase-1e-memory-1', 'approved'],
      ['phase-1e-task-1', 'rejected'],
      ['phase-1e-experiment-1', 'parked'],
    ]);
    expect(ledger.auditTrail).toHaveLength(3);
    expect(ledger.auditTrail[0]).toMatchObject({
      eventId: 'phase-1e-memory-1-approved-2026-05-25t15-01-00-000z',
      candidateId: 'phase-1e-memory-1',
      decision: 'approved',
      immutable: true,
      sideEffectBoundary: 'local-ledger-only',
    });
    expect(ledger.currentStatuses[0].allowedNextAction).toBe('Eligible for a separate explicit durable-memory write approval; this ledger does not write memory.');
    expect(ledger.currentStatuses[1].allowedNextAction).toBe('Retain as rejected evidence only; do not operationalize.');
    expect(ledger.currentStatuses[2].allowedNextAction).toBe('Keep parked for later review; do not execute or route.');
  });

  it('defaults undecided candidates to pending review without executing or approving anything', () => {
    const ledger = buildCandidateApprovalLedger({
      generatedAt: '2026-05-25T15:00:00.000Z',
      reviewer: 'Phill',
      registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
      registerBatch,
      decisions: [],
    });

    expect(ledger.currentStatuses).toHaveLength(3);
    expect(ledger.currentStatuses.every((status) => status.currentStatus === 'pending_review')).toBe(true);
    expect(ledger.currentStatuses.every((status) => status.allowedNextAction.includes('Do not'))).toBe(true);
    expect(ledger.auditTrail).toEqual([]);
  });

  it('redacts sensitive rationale text in JSON and Markdown outputs', () => {
    const ledger = buildCandidateApprovalLedger({
      generatedAt: '2026-05-25T15:00:00.000Z',
      reviewer: 'founder@example.com',
      registerPath: 'docs/margot/personal-intelligence/candidate-register/private.json',
      registerBatch,
      decisions: [
        {
          candidateId: 'phase-1e-memory-1',
          decision: 'rejected',
          decidedAt: '2026-05-25T15:01:00.000Z',
          decidedBy: 'founder@example.com',
          rationale: 'Reject because api_key: SECRET123 appeared in founder@example.com notes.',
        },
      ],
    });
    const serialized = `${JSON.stringify(ledger)}\n${renderCandidateApprovalLedgerMarkdown(ledger)}`;

    expect(serialized).toContain('[redacted-email]');
    expect(serialized).toContain('[redacted-secret]');
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('SECRET123');
  });

  it('validates parsed ledger input and rejects unknown candidates or malformed decisions', () => {
    expect(() => validateCandidateApprovalLedgerInput({ generatedAt: '2026-05-25T15:00:00.000Z' })).toThrow(
      'registerPath is required',
    );

    expect(() =>
      validateCandidateApprovalLedgerInput({
        generatedAt: '2026-05-25T15:00:00.000Z',
        reviewer: 'Phill',
        registerPath: '../outside.json',
        registerBatch,
        decisions: [],
      }),
    ).toThrow('registerPath must stay under docs/margot/personal-intelligence/candidate-register');

    expect(() =>
      buildCandidateApprovalLedger({
        generatedAt: '2026-05-25T15:00:00.000Z',
        reviewer: 'Phill',
        registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
        registerBatch,
        decisions: [
          {
            candidateId: 'missing-candidate',
            decision: 'approved',
            decidedAt: '2026-05-25T15:01:00.000Z',
            decidedBy: 'Phill',
            rationale: 'Cannot approve unknown candidates.',
          },
        ],
      }),
    ).toThrow('decision references unknown candidateId: missing-candidate');

    expect(() =>
      validateCandidateApprovalLedgerInput({
        generatedAt: '2026-05-25T15:00:00.000Z',
        reviewer: 'Phill',
        registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
        registerBatch,
        decisions: [{ candidateId: 'phase-1e-memory-1', decision: 'execute' }],
      }),
    ).toThrow('decisions[0].decision must be approved, rejected, or parked');
  });

  it('strictly validates embedded register entries and duplicate decisions at the ledger boundary', () => {
    expect(() =>
      validateCandidateApprovalLedgerInput({
        generatedAt: '2026-05-25T15:00:00.000Z',
        reviewer: 'Phill',
        registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
        registerBatch: {
          ...registerBatch,
          entries: [{ ...registerBatch.entries[0], candidateType: 'credential_dump' }],
        },
        decisions: [],
      }),
    ).toThrow('registerBatch.entries[0].candidateType must be memory, task, waste, or experiment');

    expect(() =>
      validateCandidateApprovalLedgerInput({
        generatedAt: '2026-05-25T15:00:00.000Z',
        reviewer: 'Phill',
        registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
        registerBatch: {
          ...registerBatch,
          entries: [{ ...registerBatch.entries[0], approvalStatus: 'auto_execute' }],
        },
        decisions: [],
      }),
    ).toThrow('registerBatch.entries[0].approvalStatus must be draft, needs_approval, approved, or rejected');

    expect(() =>
      validateCandidateApprovalLedgerInput({
        generatedAt: '2026-05-25T15:00:00.000Z',
        reviewer: 'Phill',
        registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
        registerBatch: {
          ...registerBatch,
          sourceNotePath: '../private-note.md',
          entries: [registerBatch.entries[0]],
        },
        decisions: [],
      }),
    ).toThrow('registerBatch.sourceNotePath must stay under docs/margot/personal-intelligence/nexus-mapping-notes');

    expect(() =>
      validateCandidateApprovalLedgerInput({
        generatedAt: '2026-05-25T15:00:00.000Z',
        reviewer: 'Phill',
        registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
        registerBatch: {
          ...registerBatch,
          entries: [{ ...registerBatch.entries[0], retentionPrivacyGuardrails: ['ok', 123] }],
        },
        decisions: [],
      }),
    ).toThrow('registerBatch.entries[0].retentionPrivacyGuardrails[1] must be a string');

    expect(() =>
      validateCandidateApprovalLedgerInput({
        generatedAt: '2026-05-25T15:00:00.000Z',
        reviewer: 'Phill',
        registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
        registerBatch: {
          ...registerBatch,
          entries: [registerBatch.entries[0], { ...registerBatch.entries[1], candidateId: 'phase-1e-memory-1' }],
        },
        decisions: [],
      }),
    ).toThrow('duplicate registerBatch entry candidateId: phase-1e-memory-1');

    expect(() =>
      buildCandidateApprovalLedger({
        generatedAt: '2026-05-25T15:00:00.000Z',
        reviewer: 'Phill',
        registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
        registerBatch,
        decisions: [
          {
            candidateId: 'phase-1e-memory-1',
            decision: 'approved',
            decidedAt: '2026-05-25T15:01:00.000Z',
            decidedBy: 'Phill',
            rationale: 'First decision.',
          },
          {
            candidateId: 'phase-1e-memory-1',
            decision: 'rejected',
            decidedAt: '2026-05-25T15:02:00.000Z',
            decidedBy: 'Phill',
            rationale: 'Duplicate decision should be explicit in a future supersession model.',
          },
        ],
      }),
    ).toThrow('duplicate decision for candidateId: phase-1e-memory-1');
  });

  it('renders a Markdown ledger with escaped table cells and explicit no-side-effect boundaries', () => {
    const ledger = buildCandidateApprovalLedger({
      generatedAt: '2026-05-25T15:00:00.000Z',
      reviewer: 'Phill',
      registerPath: 'docs/margot/personal-intelligence/candidate-register/phase-1e-source.json',
      registerBatch: {
        ...registerBatch,
        entries: [{ ...registerBatch.entries[0], title: 'Memory | proposal\nwith newline' }],
      },
      decisions: [],
    });

    const markdown = renderCandidateApprovalLedgerMarkdown(ledger);
    expect(markdown).toContain('Memory \\| proposal with newline');
    expect(markdown).toContain('No durable memory writes, task execution, production writes, deployment, or client-facing action occurred.');
  });
});
