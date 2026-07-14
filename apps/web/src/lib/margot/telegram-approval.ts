/**
 * Telegram decision handler (WS2 P5). Verifies a signed inline-button decision,
 * loads the draft, and routes it THROUGH the approval gate — approve → send,
 * reject → rejected. Injected edges (draft store, sender) so the loop is
 * unit-tested. Idempotent: a re-fired callback on an already-handled draft
 * returns a graceful result, never a double-send (the gate throws, we catch).
 */

import { verifyDecision } from './telegram-decision';
import { approveAndSend, type SendDeps } from './send-on-approval';
import { rejectDraft, ApprovalError, type Draft } from './approval-gate';

export interface TelegramDecisionDeps extends SendDeps {
  getDraft(draftId: string): Promise<Draft | null>;
  persistRejected(draftId: string): Promise<void>;
}

export interface DecisionResult {
  ok: boolean;
  action?: 'approve' | 'reject';
  status?: string;
  reason?: string;
}

export async function handleTelegramDecision(
  callbackData: string,
  signingKey: string,
  approvedBy: string,
  deps: TelegramDecisionDeps
): Promise<DecisionResult> {
  const decision = verifyDecision(callbackData, signingKey);
  if (!decision) {
    return { ok: false, reason: 'invalid or forged decision signature' };
  }

  const draft = await deps.getDraft(decision.draftId);
  if (!draft) return { ok: false, reason: 'draft not found' };

  try {
    if (decision.action === 'reject') {
      const rejected = rejectDraft(draft);
      await deps.persistRejected(rejected.id);
      return { ok: true, action: 'reject', status: rejected.status };
    }
    const { draft: sent } = await approveAndSend(
      draft,
      approvedBy,
      'telegram',
      deps
    );
    return { ok: true, action: 'approve', status: sent.status };
  } catch (e) {
    if (e instanceof ApprovalError) {
      // Already approved/rejected/sent — a re-fired callback. Not an error.
      return { ok: false, action: decision.action, reason: e.message };
    }
    throw e;
  }
}
