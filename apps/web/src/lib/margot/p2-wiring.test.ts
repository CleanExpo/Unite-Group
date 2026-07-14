import { describe, it, expect, vi } from 'vitest';

import { generateFounderDraft } from './draft-reply';
import { approveAndSend, sendApprovedDraft } from './send-on-approval';
import { ApprovalError, type Draft } from './approval-gate';
import type { FounderVoice, IncomingEmail } from './draft-reply-prompt';

const voice: FounderVoice = {
  name: 'Phill',
  signOff: 'Cheers, Phill',
  toneGuidelines: ['Direct'],
  neverDo: [],
};
const email: IncomingEmail = {
  from: 'c@x.com.au',
  subject: 'Quote',
  body: 'Burst pipe help?',
};

describe('generateFounderDraft', () => {
  it('feeds the founder-voice prompts to the LLM and returns the trimmed body', async () => {
    const complete = vi.fn(async (system: string, user: string) => {
      expect(system).toContain('AS Phill');
      expect(user).toContain('Burst pipe help?');
      return '  On my way — call me on 0400… \n';
    });
    const body = await generateFounderDraft(email, voice, complete);
    expect(body).toBe('On my way — call me on 0400…');
    expect(complete).toHaveBeenCalledOnce();
  });

  it('throws on an empty model response', async () => {
    await expect(generateFounderDraft(email, voice, async () => '   ')).rejects.toThrow(
      /empty draft/
    );
  });
});

function draft(status: Draft['status']): Draft {
  return { id: 'd1', channel: 'email', status, body: 'hi' };
}

describe('approveAndSend / sendApprovedDraft — gate enforced', () => {
  it('approves then sends, recording approval and marking sent', async () => {
    const send = vi.fn(async () => {});
    const record = vi.fn(async () => {});
    const markSentFn = vi.fn(async () => {});
    const { draft: result, approval } = await approveAndSend(
      draft('awaiting_approval'),
      'phill',
      'telegram',
      { send, record, markSent: markSentFn }
    );
    expect(result.status).toBe('sent');
    expect(approval).toMatchObject({ approvedBy: 'phill', via: 'telegram' });
    expect(record).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledOnce();
    expect(markSentFn).toHaveBeenCalledWith('d1');
  });

  it('NEVER sends an unapproved draft', async () => {
    const send = vi.fn(async () => {});
    await expect(
      sendApprovedDraft(draft('awaiting_approval'), { send, markSent: vi.fn() })
    ).rejects.toThrow(ApprovalError);
    expect(send).not.toHaveBeenCalled();
  });

  it('a transmit failure leaves the draft unsent (retry-safe)', async () => {
    const send = vi.fn(async () => {
      throw new Error('smtp down');
    });
    const markSentFn = vi.fn(async () => {});
    await expect(
      sendApprovedDraft(draft('approved'), { send, markSent: markSentFn })
    ).rejects.toThrow(/smtp down/);
    expect(markSentFn).not.toHaveBeenCalled(); // never marked sent on transmit failure
  });
});
