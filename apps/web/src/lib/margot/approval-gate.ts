/**
 * Margot approval gate — the confirm-before-send state machine (WS2).
 *
 * Ports the DISCIPLINE of the apps/empire personal-intelligence gate into
 * apps/web without its candidate/dry-run coupling: a draft has NO send path
 * until a human explicitly approves it. Pure functions over the draft state, so
 * the safety invariant is unit-tested and independent of the DB/transport.
 *
 * Invariant: a draft can be sent ONLY from `approved`. `assertSendable` is the
 * single choke point the email/Telegram send code MUST call before it hands a
 * body to `gmail.sendReply` or the Telegram Bot API. There is no auto-send.
 */

export type DraftChannel = 'email' | 'telegram';
export type DraftStatus =
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'sent';

export interface Draft {
  id: string;
  channel: DraftChannel;
  status: DraftStatus;
  body: string;
}

export interface Approval {
  draftId: string;
  approvedBy: string;
  via: 'telegram' | 'ui';
  note?: string;
}

export class ApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApprovalError';
  }
}

/** Approve a draft awaiting review. Yields the approved draft + an approval record. */
export function approveDraft(
  draft: Draft,
  approvedBy: string,
  via: 'telegram' | 'ui',
  note?: string
): { draft: Draft; approval: Approval } {
  if (draft.status !== 'awaiting_approval') {
    throw new ApprovalError(
      `cannot approve a draft in status '${draft.status}' — only 'awaiting_approval'`
    );
  }
  if (!approvedBy) {
    throw new ApprovalError('approveDraft: approvedBy is required');
  }
  return {
    draft: { ...draft, status: 'approved' },
    approval: { draftId: draft.id, approvedBy, via, note },
  };
}

/** Reject a draft awaiting review — it can never be sent. */
export function rejectDraft(draft: Draft, _note?: string): Draft {
  if (draft.status !== 'awaiting_approval') {
    throw new ApprovalError(
      `cannot reject a draft in status '${draft.status}' — only 'awaiting_approval'`
    );
  }
  return { ...draft, status: 'rejected' };
}

/**
 * The choke point. Throws unless the draft has been explicitly approved. Every
 * send path MUST call this immediately before transmitting.
 */
export function assertSendable(draft: Draft): void {
  if (draft.status !== 'approved') {
    throw new ApprovalError(
      `refusing to send: draft '${draft.id}' is '${draft.status}', not 'approved'`
    );
  }
}

/** Mark an approved draft as sent (call after a successful transmit). */
export function markSent(draft: Draft): Draft {
  assertSendable(draft);
  return { ...draft, status: 'sent' };
}
