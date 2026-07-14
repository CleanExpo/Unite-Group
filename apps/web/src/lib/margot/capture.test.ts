import { describe, it, expect } from 'vitest';

import {
  normaliseMessage,
  planCapture,
  uncapturedAccounts,
  MAILBOX_SEED,
  PROVIDER_FETCHERS,
  type MailboxAccount,
  type ProviderMessage,
} from './capture';

const account: MailboxAccount = {
  email: 'phill@disasterrecovery.com.au',
  businessKey: 'dr',
  label: 'DR Primary',
  provider: 'microsoft',
  scope: 'owned',
  receiptIngestion: true,
  status: 'active',
};

const msg = (id: string): ProviderMessage => ({
  providerMessageId: id,
  threadId: 't1',
  from: 'client@example.com.au',
  subject: 'Burst pipe',
  receivedAt: '2026-07-14T00:00:00.000Z',
});

describe('capture — normalise + dedupe', () => {
  it('normalises a provider message onto its mailbox + business', () => {
    const c = normaliseMessage(account, msg('m1'));
    expect(c).toMatchObject({
      mailboxEmail: 'phill@disasterrecovery.com.au',
      businessKey: 'dr',
      providerMessageId: 'm1',
      fromAddress: 'client@example.com.au',
      subject: 'Burst pipe',
    });
    expect(c.toAddress).toBeNull();
  });

  it('skips already-captured messages (idempotent)', () => {
    const rows = planCapture(account, [msg('m1'), msg('m2')], new Set(['m1']));
    expect(rows.map(r => r.providerMessageId)).toEqual(['m2']);
  });

  it('captures nothing when everything is already seen', () => {
    const rows = planCapture(account, [msg('m1')], new Set(['m1']));
    expect(rows).toHaveLength(0);
  });
});

describe('registry seed + provider coverage', () => {
  it('seeds all 9 real mailboxes from EMAIL_ACCOUNTS', () => {
    expect(MAILBOX_SEED).toHaveLength(9);
    expect(MAILBOX_SEED.map(m => m.provider)).toContain('microsoft');
    expect(MAILBOX_SEED.map(m => m.provider)).toContain('siteground');
  });

  it('surfaces the inboxes not yet captured (no live fetcher) — DR + CARSI today', () => {
    const gap = uncapturedAccounts(MAILBOX_SEED);
    const providers = new Set(gap.map(a => a.provider));
    // With no fetchers registered, every active account is uncaptured — and
    // crucially the non-Google ones (microsoft/siteground) are surfaced.
    expect(providers.has('microsoft')).toBe(true);
    expect(providers.has('siteground')).toBe(true);
    // Registering a provider fetcher removes its accounts from the gap.
    expect(Object.keys(PROVIDER_FETCHERS)).toHaveLength(0);
  });
});
