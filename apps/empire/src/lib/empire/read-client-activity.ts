// Server-only helper that lists agent_actions rows scoped to a single
// client slug. Powers the "Recent activity" panel on the client edit
// page — surfaces the audit trail emitted by #138's POST/PATCH
// recorders alongside the form so the founder doesn't have to flip
// to /command-center's ActivityLog to see what changed when.

import { getAdminClient } from '@/lib/supabase/admin';

export interface ClientActivityRow {
  id: string;
  action_type: string;
  status: string;
  idea_text: string | null;
  actor_email: string | null;
  fields: string[] | null;
  created_at: string;
}

export interface ClientActivityResult {
  rows: ClientActivityRow[];
  fetchedAt: string;
}

const CLIENT_ACTION_TYPES = ['client_created', 'client_updated'] as const;

export async function readClientActivity(
  slug: string,
  limit = 20,
): Promise<ClientActivityResult | null> {
  try {
    const supabase = getAdminClient();
    // payload->>slug = <slug>. Supabase JS exposes `.eq('payload->>slug', slug)`
    // as the operator-suffix shorthand for the JSONB path operator.
    const { data, error } = await supabase
      .from('agent_actions')
      .select('id, action_type, status, idea_text, payload, created_at')
      .in('action_type', CLIENT_ACTION_TYPES as unknown as string[])
      .eq('payload->>slug', slug)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return null;
    const rows = (data ?? []).map((r) => {
      const payload = (r.payload ?? {}) as Record<string, unknown>;
      const actor_email =
        typeof payload.actor_email === 'string' ? payload.actor_email : null;
      const fields = Array.isArray(payload.fields)
        ? (payload.fields as unknown[]).filter((f): f is string => typeof f === 'string')
        : null;
      return {
        id: r.id as string,
        action_type: r.action_type as string,
        status: r.status as string,
        idea_text: (r.idea_text as string | null) ?? null,
        actor_email,
        fields,
        created_at: r.created_at as string,
      };
    });

    return {
      rows,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
