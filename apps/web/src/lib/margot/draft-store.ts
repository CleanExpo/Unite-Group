/**
 * Service-role store for Margot drafts + approvals (WS2 P2, dormant edge).
 * The DB implementation behind the tested send-on-approval orchestration.
 * Untested here by design (needs the migrated tables); the ORCHESTRATION is
 * tested against fakes. Founder-scoped writes; inert until the migration is
 * validated on a Supabase DB branch and applied.
 *
 * New tables aren't in the generated Database types yet, so the client is used
 * loosely-typed (regenerate types after the migration lands).
 */

import { createServiceClient } from '@/lib/supabase/service';

import type { Approval, Draft } from './approval-gate';

/** A draft plus the fields the email send needs (beyond the gate's minimal Draft). */
export interface StoredDraft extends Draft {
  founderId: string;
  accountEmail: string | null;
  threadId: string | null;
  toAddress: string | null;
  subject: string | null;
  sourceMessageId: string | null;
}

export interface CreateDraftInput {
  founderId: string;
  businessKey?: string;
  channel?: 'email' | 'telegram';
  accountEmail?: string;
  sourceMessageId?: string;
  threadId?: string;
  toAddress?: string;
  subject?: string;
  body: string;
  voiceMeta?: Record<string, unknown>;
}

export interface MargotDraftStore {
  createDraft(input: CreateDraftInput): Promise<string>;
  getDraft(id: string, founderId: string): Promise<StoredDraft | null>;
  recordApproval(approval: Approval, founderId: string): Promise<void>;
  markSent(id: string): Promise<void>;
  markRejected(id: string): Promise<void>;
}

export function createMargotDraftStore(): MargotDraftStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  return {
    async createDraft(input) {
      const { data, error } = await db
        .from('margot_email_draft')
        .insert({
          founder_id: input.founderId,
          business_key: input.businessKey ?? null,
          channel: input.channel ?? 'email',
          account_email: input.accountEmail ?? null,
          source_message_id: input.sourceMessageId ?? null,
          thread_id: input.threadId ?? null,
          to_address: input.toAddress ?? null,
          subject: input.subject ?? null,
          body: input.body,
          voice_meta: input.voiceMeta ?? {},
          status: 'awaiting_approval',
        })
        .select('id')
        .single();
      if (error) throw new Error(`margot_email_draft insert: ${error.message}`);
      return data.id as string;
    },

    async getDraft(id, founderId) {
      const { data, error } = await db
        .from('margot_email_draft')
        .select('*')
        .eq('id', id)
        .eq('founder_id', founderId)
        .maybeSingle();
      if (error) throw new Error(`margot_email_draft select: ${error.message}`);
      if (!data) return null;
      return {
        id: data.id,
        channel: data.channel,
        status: data.status,
        body: data.body,
        founderId: data.founder_id,
        accountEmail: data.account_email,
        threadId: data.thread_id,
        toAddress: data.to_address,
        subject: data.subject,
        sourceMessageId: data.source_message_id,
      };
    },

    async recordApproval(approval, founderId) {
      const { error } = await db.from('margot_draft_approval').insert({
        founder_id: founderId,
        draft_id: approval.draftId,
        via: approval.via,
        note: approval.note ?? null,
      });
      if (error) throw new Error(`margot_draft_approval insert: ${error.message}`);
      const { error: upErr } = await db
        .from('margot_email_draft')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', approval.draftId);
      if (upErr) throw new Error(`margot_email_draft approve: ${upErr.message}`);
    },

    async markSent(id) {
      const { error } = await db
        .from('margot_email_draft')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(`margot_email_draft markSent: ${error.message}`);
    },

    async markRejected(id) {
      const { error } = await db
        .from('margot_email_draft')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        throw new Error(`margot_email_draft markRejected: ${error.message}`);
      }
    },
  };
}
