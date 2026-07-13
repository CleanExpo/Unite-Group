/**
 * Google mailbox fetcher (WS2 P1, dormant edge). Reuses the existing Gmail pull
 * (`fetchThreadsPaginated`) — no new integration — so the Google inboxes flow
 * through the same capture pipeline. Microsoft + SiteGround need their own
 * fetchers (new OAuth/IMAP integrations); until then those inboxes are surfaced
 * by `uncapturedAccounts`, never silently skipped.
 */

import { fetchThreadsPaginated } from '@/lib/integrations/google';

import type { MailboxAccount, MailboxFetcher, ProviderMessage } from './capture';

/** The subset of a Gmail thread we read (exact date field confirmed on first live run). */
interface GmailThreadLike {
  id: string;
  from?: string;
  subject?: string;
  snippet?: string;
  date?: string;
  lastMessageDate?: string;
}

export const googleFetcher: MailboxFetcher = {
  provider: 'google',
  async fetch(account: MailboxAccount, sinceIso: string): Promise<ProviderMessage[]> {
    if (!account.founderId) {
      throw new Error('googleFetcher: account.founderId is required');
    }
    const afterEpoch = Math.floor(new Date(sinceIso).getTime() / 1000);
    const { threads } = await fetchThreadsPaginated(account.founderId, account.email, {
      query: `in:inbox after:${afterEpoch}`,
      maxResults: 50,
    });
    return (threads ?? []).map((thread): ProviderMessage => {
      const t = thread as unknown as GmailThreadLike;
      return {
        providerMessageId: t.id,
        threadId: t.id,
        from: t.from ?? '',
        subject: t.subject,
        snippet: t.snippet,
        receivedAt: t.date ?? t.lastMessageDate ?? new Date().toISOString(),
        raw: t as unknown as Record<string, unknown>,
      };
    });
  },
};
