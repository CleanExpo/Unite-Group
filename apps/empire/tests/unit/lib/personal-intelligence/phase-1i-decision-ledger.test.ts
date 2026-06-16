import { encodeDecisionCallbackData, decodeDecisionCallbackData, verifyDecisionCallbackData, createApplyRequestShortId, buildTelegramApprovalKeyboard } from '@/lib/personal-intelligence/phase-1i-decision-ledger';

const signingKey = 'phase-1i-test-signing-key';
const context = { chatId: '-100123456', userId: '123456789', nowMs: Date.UTC(2026, 4, 26, 13, 4, 0) };

describe('Phase 1I Telegram decision ledger', () => {
  it('encodes compact signed callback_data and verifies tamper protection', () => {
    const callbackData = encodeDecisionCallbackData({ action: 'approve', applyRequestShortId: '9x2k1m7q', nonce: 'k3f82p', context, signingKey });
    expect(callbackData).toMatch(/^h1\|A\|9x2k1m7q\|k3f82p\|[A-Za-z0-9_-]{10}$/);
    expect(callbackData.length).toBeLessThanOrEqual(64);
    expect(verifyDecisionCallbackData({ callbackData, context, signingKey }).ok).toBe(true);
    expect(verifyDecisionCallbackData({ callbackData, context: { ...context, userId: '999' }, signingKey })).toMatchObject({ ok: false, code: 'ERR_BAD_SIG' });
  });

  it('builds all Telegram quick decision buttons', () => {
    const keyboard = buildTelegramApprovalKeyboard({ applyRequestId: 'apply-memory-1', context, signingKey, nonceFactory: () => 'k3f82p' });
    expect(keyboard.inline_keyboard.flat().map((button) => button.text)).toEqual(['✅ Approve', '❌ Reject', '⏸ Defer', '📝 Request Changes', '🔍 View Evidence']);
    expect(keyboard.inline_keyboard.flat().map((button) => decodeDecisionCallbackData(button.callback_data).action)).toEqual(['approve', 'reject', 'defer', 'request_changes', 'view_evidence']);
  });

  it('fails closed on unknown action and replay hooks', () => {
    const callbackData = encodeDecisionCallbackData({ action: 'approve', applyRequestShortId: createApplyRequestShortId('apply-memory-1'), nonce: 'k3f82p', context, signingKey });
    expect(verifyDecisionCallbackData({ callbackData: 'h1|X|9x2k1m7q|k3f82p|badbadbad1', context, signingKey })).toMatchObject({ ok: false, code: 'ERR_BAD_ACTION' });
    expect(verifyDecisionCallbackData({ callbackData, context, signingKey, replaySeen: () => true })).toMatchObject({ ok: false, code: 'ERR_REPLAY' });
  });
});
