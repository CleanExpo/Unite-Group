import { describe, it, expect } from 'vitest';

import {
  buildFounderReplySystemPrompt,
  buildFounderReplyUserMessage,
  type FounderVoice,
  type IncomingEmail,
} from './draft-reply-prompt';

const voice: FounderVoice = {
  name: 'Phill',
  signOff: 'Cheers, Phill',
  toneGuidelines: ['Direct and warm', 'No corporate-speak'],
  neverDo: ['Never over-promise timelines'],
};

describe('founder-voice reply prompt', () => {
  it('drafts in the founder voice and signs off correctly', () => {
    const p = buildFounderReplySystemPrompt(voice);
    expect(p).toContain('AS Phill');
    expect(p).toContain('Cheers, Phill');
    expect(p).toContain('Direct and warm');
    expect(p).toContain('Never over-promise timelines');
  });

  it('states plainly that a human reviews and sends (confirm-before-send)', () => {
    const p = buildFounderReplySystemPrompt(voice);
    expect(p).toMatch(/DRAFT only/);
    expect(p).toMatch(/reviews every draft and sends/i);
    expect(p).toMatch(/never imply the reply is automated/i);
  });

  it('forbids inventing facts and enforces Australian English', () => {
    const p = buildFounderReplySystemPrompt(voice);
    expect(p).toMatch(/Never invent facts/i);
    expect(p).toMatch(/Australian English/i);
    expect(p).toContain('body text');
  });

  it('user message carries the incoming email context', () => {
    const email: IncomingEmail = {
      from: 'client@example.com.au',
      subject: 'Water damage quote',
      body: 'Can you help with a burst pipe?',
      businessName: 'Disaster Recovery',
    };
    const m = buildFounderReplyUserMessage(email);
    expect(m).toContain('Disaster Recovery');
    expect(m).toContain('Water damage quote');
    expect(m).toContain('burst pipe');
  });
});
