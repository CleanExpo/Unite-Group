// Server component: per-client audit-trail panel on the edit page.
// Reads the rows emitted by #138's POST/PATCH recorders, filtered to
// payload->>slug = <slug>. Renders below the edit form so the founder
// sees who changed what when right where they're editing.

import type { ClientActivityRow } from '@/lib/empire/read-client-activity';

export function ClientActivityPanel({
  rows,
  fetchError,
}: {
  rows: ClientActivityRow[];
  fetchError: boolean;
}) {
  return (
    <section
      aria-label="Recent activity"
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 32px 48px',
      }}
    >
      <h2
        style={{
          margin: '0 0 12px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'var(--ink-secondary, #94a3b8)',
          fontFamily: 'var(--font-mono, monospace)',
          borderTop: '1px solid var(--border-hairline, #1f1f23)',
          paddingTop: 18,
        }}
      >
        Recent activity
      </h2>

      {fetchError && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '10px 14px',
            borderLeft: '2px solid #f87171',
            color: '#f87171',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 12,
          }}
        >
          Failed to read agent_actions. The audit trail may be incomplete.
        </p>
      )}

      {!fetchError && rows.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary, #94a3b8)' }}>
          No recorded activity yet. Once you save changes, every POST and
          PATCH will appear here.
        </p>
      )}

      {rows.length > 0 && (
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {rows.map((r) => {
            const tone = r.action_type === 'client_created' ? '#10b981' : '#f59e0b';
            return (
              <li
                key={r.id}
                style={{
                  padding: '10px 14px',
                  borderLeft: `2px solid ${tone}`,
                  background: 'var(--surface-1, #18181b)',
                  borderRadius: 4,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span style={{ color: 'var(--ink-primary, #f5f5f5)', fontWeight: 600 }}>
                  {r.idea_text ?? r.action_type}
                </span>
                <span style={{ color: 'var(--ink-secondary, #94a3b8)', fontSize: 11 }}>
                  {r.actor_email ?? 'unknown'} · {formatDate(r.created_at)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-AU', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}
