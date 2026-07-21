import { describe, it, expect, vi } from 'vitest';

import { signDecision, verifyDecision } from './telegram-decision';
import {
  handleTelegramDecision,
  type TelegramDecisionDeps,
} from './telegram-approval';
import type { Draft } from './approval-gate';

const KEY = 'test-signing-key';
const DRAFT_ID = 'a1b2c3d4-0000-4000-8000-000000000001';

describe('signed decision codec', () => {
  it('round-trips a decision and stays within Telegram 64-byte callback_data', () => {
    const token = signDecision(DRAFT_ID, 'approve', KEY);
    expect(Buffer.byteLength(token)).toBeLessThanOrEqual(64);
    expect(verifyDecision(token, KEY)).toEqual({
      draftId: DRAFT_ID,
      action: 'approve',
    });
  });

  it('rejects a tampered token, a wrong key, and a malformed token', () => {
    const token = signDecision(DRAFT_ID, 'approve', KEY);
    expect(verifyDecision(token.replace(/.$/, '0'), KEY)).toBeNull(); // tampered sig
    expect(verifyDecision(token, 'other-key')).toBeNull(); // wrong key
    expect(verifyDecision('a:only-two', KEY)).toBeNull(); // malformed
    expect(verifyDecision(`a:${DRAFT_ID}:tampered`, KEY)).toBeNull(); // forged payload
  });
});

function deps(draft: Draft | null) {
  const send = vi.fn(async () => {});
  const record = vi.fn(async () => {});
  const markSent = vi.fn(async () => {});
  const persistRejected = vi.fn(async () => {});
  const d: TelegramDecisionDeps = {
    getDraft: async () => draft,
    send,
    record,
    markSent,
    persistRejected,
  };
  return { d, send, record, markSent, persistRejected };
}

const awaiting: Draft = {
  id: DRAFT_ID,
  channel: 'email',
  status: 'awaiting_approval',
  body: 'reply',
};

describe('handleTelegramDecision — closes the loop through the gate', () => {
  it('approve → sends through the gate', async () => {
    const { d, send } = deps(awaiting);
    const token = signDecision(DRAFT_ID, 'approve', KEY);
    const r = await handleTelegramDecision(token, KEY, 'phill', d);
    expect(r).toMatchObject({ ok: true, action: 'approve', status: 'sent' });
    expect(send).toHaveBeenCalledOnce();
  });

  it('reject → persists rejected, never sends', async () => {
    const { d, send, persistRejected } = deps(awaiting);
    const token = signDecision(DRAFT_ID, 'reject', KEY);
    const r = await handleTelegramDecision(token, KEY, 'phill', d);
    expect(r).toMatchObject({ ok: true, action: 'reject', status: 'rejected' });
    expect(persistRejected).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses a forged decision and a missing draft', async () => {
    const { d } = deps(awaiting);
    expect(
      (await handleTelegramDecision('a:x:forged', KEY, 'phill', d)).ok
    ).toBe(false);
    const { d: d2 } = deps(null);
    const token = signDecision(DRAFT_ID, 'approve', KEY);
    expect((await handleTelegramDecision(token, KEY, 'phill', d2)).ok).toBe(false);
  });

  it('a re-fired callback on an already-sent draft does not double-send', async () => {
    const sent: Draft = { ...awaiting, status: 'sent' };
    const { d, send } = deps(sent);
    const token = signDecision(DRAFT_ID, 'approve', KEY);
    const r = await handleTelegramDecision(token, KEY, 'phill', d);
    expect(r.ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
