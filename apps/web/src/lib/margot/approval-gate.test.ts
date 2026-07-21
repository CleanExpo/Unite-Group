import { describe, it, expect } from 'vitest';

import {
  approveDraft,
  rejectDraft,
  assertSendable,
  markSent,
  ApprovalError,
  type Draft,
} from './approval-gate';

const awaiting: Draft = {
  id: 'd1',
  channel: 'email',
  status: 'awaiting_approval',
  body: 'Thanks for reaching out — happy to help.',
};

describe('Margot approval gate — confirm before send', () => {
  it('approving an awaiting draft yields approved + an approval record', () => {
    const { draft, approval } = approveDraft(awaiting, 'phill', 'ui');
    expect(draft.status).toBe('approved');
    expect(approval).toMatchObject({ draftId: 'd1', approvedBy: 'phill', via: 'ui' });
  });

  it('REFUSES to send an unapproved draft (the core safety)', () => {
    expect(() => assertSendable(awaiting)).toThrow(ApprovalError);
    expect(() => assertSendable(awaiting)).toThrow(/not 'approved'/);
  });

  it('allows send only after approval, then marks sent', () => {
    const { draft: approved } = approveDraft(awaiting, 'phill', 'telegram');
    expect(() => assertSendable(approved)).not.toThrow();
    expect(markSent(approved).status).toBe('sent');
  });

  it('a rejected draft can never be sent', () => {
    const rejected = rejectDraft(awaiting, 'off-tone');
    expect(rejected.status).toBe('rejected');
    expect(() => assertSendable(rejected)).toThrow(ApprovalError);
  });

  it('cannot approve twice or approve a non-awaiting draft', () => {
    const { draft: approved } = approveDraft(awaiting, 'phill', 'ui');
    expect(() => approveDraft(approved, 'phill', 'ui')).toThrow(/status 'approved'/);
    const sent: Draft = { ...awaiting, status: 'sent' };
    expect(() => approveDraft(sent, 'phill', 'ui')).toThrow(ApprovalError);
  });

  it('requires an approver identity', () => {
    expect(() => approveDraft(awaiting, '', 'ui')).toThrow(/approvedBy is required/);
  });
});
