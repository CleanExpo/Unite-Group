/**
 * All-inbox capture pipeline (WS2 P1). Provider-agnostic: every mailbox — Google,
 * Microsoft, SiteGround, IMAP — flows through the SAME normalise → dedupe → store
 * path, so "capture all inboxes" is architecture, not per-provider special-casing.
 * (Today's live pull is Google-only; Microsoft + SiteGround register as built.)
 *
 * Pure core: the per-provider fetch is injected, so normalisation + dedupe are
 * unit-tested with no network. Seeded from the real 9 mailboxes in
 * `src/lib/email-accounts.ts` — the DB `mailbox_account` registry becomes the SSOT.
 */

import { EMAIL_ACCOUNTS, type EmailAccount, type EmailProvider } from '@/lib/email-accounts';

/** A mailbox as held in the registry (mirrors EmailAccount + a live status). */
export interface MailboxAccount {
  email: string;
  businessKey: string;
  label: string;
  provider: EmailProvider | 'imap';
  scope: 'owned' | 'client' | 'personal';
  receiptIngestion: boolean;
  status?: 'active' | 'paused' | 'disconnected';
}

/** What a provider fetch yields, before normalisation. */
export interface ProviderMessage {
  providerMessageId: string;
  threadId?: string;
  from: string;
  to?: string;
  subject?: string;
  snippet?: string;
  /** ISO 8601. */
  receivedAt: string;
  raw?: Record<string, unknown>;
}

/** A normalised message row, ready to persist to captured_message. */
export interface CapturedMessage {
  mailboxEmail: string;
  businessKey: string;
  providerMessageId: string;
  threadId: string | null;
  fromAddress: string;
  toAddress: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string;
  raw: Record<string, unknown>;
}

/** Fetch an account's recent messages (read-only). Provider-specific edge. */
export interface MailboxFetcher {
  provider: MailboxAccount['provider'];
  fetch(account: MailboxAccount, sinceIso: string): Promise<ProviderMessage[]>;
}

export function normaliseMessage(
  account: MailboxAccount,
  m: ProviderMessage
): CapturedMessage {
  return {
    mailboxEmail: account.email,
    businessKey: account.businessKey,
    providerMessageId: m.providerMessageId,
    threadId: m.threadId ?? null,
    fromAddress: m.from,
    toAddress: m.to ?? null,
    subject: m.subject ?? null,
    snippet: m.snippet ?? null,
    receivedAt: m.receivedAt,
    raw: m.raw ?? {},
  };
}

/**
 * Turn a provider fetch into the rows to persist, skipping already-captured
 * messages (dedupe on provider message id). Nothing dropped silently — a
 * duplicate is simply a no-op.
 */
export function planCapture(
  account: MailboxAccount,
  messages: ProviderMessage[],
  seenProviderIds: ReadonlySet<string>
): CapturedMessage[] {
  return messages
    .filter(m => m.providerMessageId && !seenProviderIds.has(m.providerMessageId))
    .map(m => normaliseMessage(account, m));
}

/** Seed the registry from the real hardcoded accounts (SSOT migration source). */
export const MAILBOX_SEED: MailboxAccount[] = EMAIL_ACCOUNTS.map(
  (a: EmailAccount): MailboxAccount => ({
    email: a.email,
    businessKey: a.businessKey,
    label: a.label,
    provider: a.provider,
    scope: a.scope,
    receiptIngestion: a.receiptIngestion,
    status: 'active',
  })
);

/**
 * Providers with a live fetcher wired. Google reuses the existing gmail pull;
 * Microsoft + SiteGround are the gap — they are the inboxes NOT captured today
 * (DR is Microsoft; CARSI ×2 are SiteGround). Register them here as built.
 */
export const PROVIDER_FETCHERS: Partial<
  Record<MailboxAccount['provider'], MailboxFetcher>
> = {};

/** Accounts whose provider has no live fetcher yet — surfaced, not silently skipped. */
export function uncapturedAccounts(
  accounts: MailboxAccount[]
): MailboxAccount[] {
  return accounts.filter(
    a => a.status !== 'disconnected' && !PROVIDER_FETCHERS[a.provider]
  );
}
