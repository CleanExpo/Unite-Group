// GET /api/cron/mailbox-capture
// WS2 P1 — capture EVERY inbox into captured_message. DORMANT: no-ops unless
// MAILBOX_CAPTURE_ENABLED=true and the mailbox_capture migration is applied.
// READ-ONLY against mailboxes; only inserts into captured_message. Google is
// wired (reuses the Gmail pull); Microsoft + SiteGround inboxes are REPORTED in
// `uncaptured` until their fetchers are built — never silently skipped.

import { NextResponse } from 'next/server';

import { createCaptureStore } from '@/lib/margot/capture-store';
import { googleFetcher } from '@/lib/margot/google-fetcher';
import {
  planCapture,
  uncapturedAccounts,
  type MailboxAccount,
  type MailboxFetcher,
} from '@/lib/margot/capture';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Live registry — providers with a wired fetcher. Add microsoft/siteground here as built. */
const LIVE_FETCHERS: Partial<Record<MailboxAccount['provider'], MailboxFetcher>> =
  { google: googleFetcher };

export async function GET(request: Request) {
  if (
    request.headers.get('authorization') !==
    `Bearer ${process.env.CRON_SECRET?.trim()}`
  ) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (process.env.MAILBOX_CAPTURE_ENABLED !== 'true') {
    return NextResponse.json({
      dormant: true,
      message: 'MAILBOX_CAPTURE_ENABLED is not true — capture is dormant',
    });
  }
  const founderId = process.env.FOUNDER_USER_ID;
  if (!founderId) {
    return NextResponse.json({ error: 'FOUNDER_USER_ID not set' }, { status: 500 });
  }

  const store = createCaptureStore();
  const accounts = await store.loadActiveMailboxes(founderId);
  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const results: Array<Record<string, unknown>> = [];
  for (const account of accounts) {
    const fetcher = LIVE_FETCHERS[account.provider];
    if (!fetcher || !account.id) continue; // reported in `uncaptured`
    try {
      const messages = await fetcher.fetch(account, sinceIso);
      const seen = await store.loadSeenProviderIds(account.id);
      const rows = planCapture(account, messages, seen);
      const captured = await store.persistMessages(founderId, account.id, rows);
      results.push({ mailbox: account.email, provider: account.provider, captured });
    } catch (e) {
      results.push({
        mailbox: account.email,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Surface the inboxes with no live fetcher (Microsoft/SiteGround today).
  const uncaptured = uncapturedAccounts(accounts, LIVE_FETCHERS).map(a => ({
    mailbox: a.email,
    provider: a.provider,
    reason: 'no live fetcher for this provider yet',
  }));

  return NextResponse.json({ enabled: true, sinceIso, results, uncaptured });
}
