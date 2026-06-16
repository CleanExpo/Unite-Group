// Audit-trail emitter for client mutations.
//
// Mirrors src/lib/data-room/record-cron-action.ts (#124): a single
// agent_actions insert per mutation so the ActivityLog (#117) and
// GlobalStatusBar (#116) light up when the founder creates or edits a
// client. Without this, mutations are invisible from the Command Center.
//
// Failure to record is logged but not fatal — the mutation already wrote
// to nexus_clients; a missed audit-log entry shouldn't surface as an
// HTTP error to the founder.

import type { SupabaseClient } from '@supabase/supabase-js';

export type ClientActionKind = 'created' | 'updated';

interface RecordClientActionInput {
  supabase: SupabaseClient;
  kind: ClientActionKind;
  /** The mutated row's slug — used for ActivityLog target text. */
  slug: string;
  /** Authenticated email of the founder making the change. */
  actorEmail: string;
  /** Mutated row's company_name for the idea_text summary. */
  companyName?: string;
  /** For 'updated', which keys were touched in the PATCH body. */
  fields?: string[];
}

export async function recordClientAction({
  supabase,
  kind,
  slug,
  actorEmail,
  companyName,
  fields,
}: RecordClientActionInput): Promise<void> {
  const action_type = kind === 'created' ? 'client_created' : 'client_updated';
  const label = companyName ?? slug;
  const idea_text =
    kind === 'created'
      ? `Client created: ${label}`
      : `Client updated: ${label}${fields?.length ? ` (${fields.join(', ')})` : ''}`;

  try {
    await supabase.from('agent_actions').insert({
      source: 'system',
      action_type,
      status: 'done',
      payload: {
        slug,
        actor_email: actorEmail,
        fields: fields ?? null,
        company_name: companyName ?? null,
      },
      idea_text,
    });
  } catch (err) {
    console.error('[clients/record-action] insert failed', err);
  }
}
