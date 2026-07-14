/**
 * Approve-then-send orchestration (WS2 P2). The ONLY sanctioned path from a
 * draft to a transmitted message. Enforces the approval gate: a draft is sent
 * only after explicit human approval, and the transmit (`send`), approval
 * record, and status write are all INJECTED edges (gmail `sendReply`, the
 * service-role store) — so this safety-critical flow is unit-tested without a
 * DB or a live mailbox.
 */

import {
  approveDraft,
  assertSendable,
  markSent,
  type Approval,
  type Draft,
} from './approval-gate';

export interface SendDeps {
  /** Transmit the approved draft (e.g. gmail.sendReply / Telegram Bot API). */
  send(draft: Draft): Promise<void>;
  /** Persist the approval decision. */
  record(approval: Approval): Promise<void>;
  /** Persist the 'sent' status transition for a draft id. */
  markSent(draftId: string): Promise<void>;
}

/**
 * Send an ALREADY-approved draft. Throws (via assertSendable) if the draft was
 * not approved — the retry-safe send path. Order: transmit, then mark sent, so
 * a transmit failure leaves the draft 'approved' (retryable), never a false 'sent'.
 */
export async function sendApprovedDraft(
  draft: Draft,
  deps: Pick<SendDeps, 'send' | 'markSent'>
): Promise<Draft> {
  assertSendable(draft);
  await deps.send(draft);
  const sent = markSent(draft);
  await deps.markSent(sent.id);
  return sent;
}

/**
 * Approve a draft awaiting review and send it. Records the approval BEFORE the
 * transmit; a transmit failure leaves an approved-but-unsent draft that
 * sendApprovedDraft can retry. Never sends an unapproved draft — approveDraft
 * throws on any non-'awaiting_approval' status.
 */
export async function approveAndSend(
  draft: Draft,
  approvedBy: string,
  via: 'telegram' | 'ui',
  deps: SendDeps,
  note?: string
): Promise<{ draft: Draft; approval: Approval }> {
  const { draft: approved, approval } = approveDraft(draft, approvedBy, via, note);
  await deps.record(approval);
  const sent = await sendApprovedDraft(approved, deps);
  return { draft: sent, approval };
}
