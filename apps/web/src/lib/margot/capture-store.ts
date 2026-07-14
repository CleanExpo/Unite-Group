/**
 * Service-role store for the mailbox capture pipeline (WS2 P1, dormant edge).
 * Loads the mailbox registry, the already-captured provider ids (for dedupe),
 * and upserts captured messages. Untested here (needs the migrated tables); the
 * capture LOGIC is tested against the pure functions. founder_id-scoped.
 *
 * New tables aren't in the generated Database types yet → loosely-typed client.
 */

import { createServiceClient } from '@/lib/supabase/service';

import type { CapturedMessage, MailboxAccount } from './capture';

export interface CaptureStore {
  loadActiveMailboxes(founderId: string): Promise<MailboxAccount[]>;
  loadSeenProviderIds(mailboxAccountId: string): Promise<Set<string>>;
  persistMessages(
    founderId: string,
    mailboxAccountId: string,
    rows: CapturedMessage[]
  ): Promise<number>;
}

export function createCaptureStore(): CaptureStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  return {
    async loadActiveMailboxes(founderId) {
      const { data, error } = await db
        .from('mailbox_account')
        .select('*')
        .eq('founder_id', founderId)
        .eq('status', 'active');
      if (error) throw new Error(`mailbox_account select: ${error.message}`);
      return (data ?? []).map(
        (r: Record<string, unknown>): MailboxAccount => ({
          id: r.id as string,
          founderId: r.founder_id as string,
          email: r.email as string,
          businessKey: r.business_key as string,
          label: (r.label as string) ?? '',
          provider: r.provider as MailboxAccount['provider'],
          scope: r.scope as MailboxAccount['scope'],
          receiptIngestion: Boolean(r.receipt_ingestion),
          status: r.status as MailboxAccount['status'],
        })
      );
    },

    async loadSeenProviderIds(mailboxAccountId) {
      const { data, error } = await db
        .from('captured_message')
        .select('provider_message_id')
        .eq('mailbox_account_id', mailboxAccountId);
      if (error) throw new Error(`captured_message select: ${error.message}`);
      return new Set(
        (data ?? []).map((r: { provider_message_id: string }) => r.provider_message_id)
      );
    },

    async persistMessages(founderId, mailboxAccountId, rows) {
      if (rows.length === 0) return 0;
      const { error } = await db.from('captured_message').upsert(
        rows.map(r => ({
          founder_id: founderId,
          mailbox_account_id: mailboxAccountId,
          business_key: r.businessKey,
          provider_message_id: r.providerMessageId,
          thread_id: r.threadId,
          from_address: r.fromAddress,
          to_address: r.toAddress,
          subject: r.subject,
          snippet: r.snippet,
          received_at: r.receivedAt,
          raw: r.raw,
        })),
        { onConflict: 'mailbox_account_id,provider_message_id' }
      );
      if (error) throw new Error(`captured_message upsert: ${error.message}`);
      return rows.length;
    },
  };
}
