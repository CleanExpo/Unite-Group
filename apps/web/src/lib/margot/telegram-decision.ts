/**
 * Signed Telegram decision codec (WS2 P5). Encodes an approve/reject decision
 * for a draft into Telegram inline-button `callback_data` (max 64 bytes),
 * HMAC-signed with TELEGRAM_DECISION_SIGNING_KEY so a decision can't be forged.
 * Pure + unit-tested; the route verifies before acting through the approval gate.
 *
 * Format: `{a|r}:{draftId}:{sig16}` — action(1) + ':' + uuid(36) + ':' + 16 hex
 * chars (8-byte truncated HMAC-SHA256) = 55 bytes, within Telegram's 64-byte cap.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export type DecisionAction = 'approve' | 'reject';

const ACTION_CODE: Record<DecisionAction, string> = { approve: 'a', reject: 'r' };
const CODE_ACTION: Record<string, DecisionAction> = { a: 'approve', r: 'reject' };

function sig(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('hex').slice(0, 16);
}

export function signDecision(
  draftId: string,
  action: DecisionAction,
  key: string
): string {
  const code = ACTION_CODE[action];
  const payload = `${code}:${draftId}`;
  return `${payload}:${sig(payload, key)}`;
}

export function verifyDecision(
  token: string,
  key: string
): { draftId: string; action: DecisionAction } | null {
  const parts = token.split(':');
  if (parts.length !== 3) return null;
  const [code, draftId, provided] = parts;
  const action = CODE_ACTION[code];
  if (!action || !draftId) return null;
  const expected = sig(`${code}:${draftId}`, key);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { draftId, action };
}
