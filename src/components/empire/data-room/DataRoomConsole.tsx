'use client';

// DataRoomConsole — interactive admin UI for /[locale]/empire/data-room.
// Lists every data_room_documents row, lets the founder approve/reject/
// supersede each row, and triggers the ZIP export endpoint.

import { useCallback, useMemo, useState } from 'react';

interface DocRow {
  id: string;
  kind: string;
  business_id: string | null;
  period_start: string | null;
  period_end: string | null;
  generated_at: string;
  audit_status: string;
  updated_at: string;
}

type AuditAction = 'approved' | 'rejected' | 'superseded';

const KIND_LABELS: Record<string, string> = {
  cohort_metrics: 'Cohort metrics',
  pl_summary: 'P&L summary',
  vendor_contracts: 'Vendor contracts',
  ip_audit: 'IP audit',
  incident_timeline: 'Incident timeline',
  pdf_export: 'PDF export',
};

const AUDIT_BADGE: Record<string, { label: string; tone: string }> = {
  pending: { label: 'pending', tone: 'var(--ink-secondary)' },
  approved: { label: 'approved', tone: '#10b981' },
  rejected: { label: 'rejected', tone: '#f87171' },
  superseded: { label: 'superseded', tone: 'var(--ink-hush, #888)' },
};

export function DataRoomConsole({
  initialDocuments,
  fetchError,
}: {
  initialDocuments: DocRow[];
  fetchError: boolean;
}) {
  const [docs, setDocs] = useState<DocRow[]>(initialDocuments);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>('');

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, superseded: 0 };
    for (const d of docs) {
      if (d.audit_status in c) {
        c[d.audit_status as keyof typeof c] += 1;
      }
    }
    return c;
  }, [docs]);

  const setAuditStatus = useCallback(
    async (id: string, audit_status: AuditAction) => {
      setPendingId(id);
      setNotice('');
      try {
        const res = await fetch(`/api/empire/data-room/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ audit_status }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `http_${res.status}`);
        }
        const body = (await res.json()) as {
          document: { id: string; audit_status: string; updated_at: string };
        };
        setDocs((current) =>
          current.map((d) =>
            d.id === id
              ? { ...d, audit_status: body.document.audit_status, updated_at: body.document.updated_at }
              : d,
          ),
        );
        setNotice(`Marked ${id.slice(0, 8)}… as ${audit_status}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'update_failed';
        setNotice(`Update failed: ${msg}.`);
      } finally {
        setPendingId(null);
      }
    },
    [],
  );

  return (
    <main style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <CountTile label="Pending" value={counts.pending} tone="var(--ink-secondary)" />
        <CountTile label="Approved" value={counts.approved} tone="#10b981" />
        <CountTile label="Rejected" value={counts.rejected} tone="#f87171" />
        <CountTile label="Superseded" value={counts.superseded} tone="var(--ink-hush, #888)" />
        <a
          href="/api/empire/data-room/export"
          style={{
            marginLeft: 'auto',
            padding: '8px 14px',
            border: '1px solid var(--border-default)',
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--ink-primary)',
            textDecoration: 'none',
          }}
        >
          Export ZIP
        </a>
      </section>

      {fetchError && (
        <div
          role="alert"
          style={{
            borderLeft: '2px solid #f87171',
            padding: '10px 14px',
            color: '#f87171',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}
        >
          Failed to read data_room_documents. The page is showing an empty list.
        </div>
      )}
      {notice && (
        <div
          aria-live="polite"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--ink-secondary)',
          }}
        >
          {notice}
        </div>
      )}

      {docs.length === 0 ? (
        <p style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>
          No data-room documents yet. POST to /api/empire/data-room/&lt;kind&gt; to
          generate one.
        </p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}
        >
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-default)' }}>
              <Th>Kind</Th>
              <Th>Period</Th>
              <Th>Generated</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const badge = AUDIT_BADGE[d.audit_status] ?? {
                label: d.audit_status,
                tone: 'var(--ink-secondary)',
              };
              const isPending = pendingId === d.id;
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                  <Td>{KIND_LABELS[d.kind] ?? d.kind}</Td>
                  <Td>
                    {d.period_start ? `${d.period_start} → ${d.period_end ?? '—'}` : (d.period_end ?? '—')}
                  </Td>
                  <Td>{formatDate(d.generated_at)}</Td>
                  <Td>
                    <span style={{ color: badge.tone, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      {badge.label}
                    </span>
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <ActionButton
                        disabled={isPending || d.audit_status === 'approved'}
                        onClick={() => setAuditStatus(d.id, 'approved')}
                        label="Approve"
                      />
                      <ActionButton
                        disabled={isPending || d.audit_status === 'rejected'}
                        onClick={() => setAuditStatus(d.id, 'rejected')}
                        label="Reject"
                      />
                      <ActionButton
                        disabled={isPending || d.audit_status === 'superseded'}
                        onClick={() => setAuditStatus(d.id, 'superseded')}
                        label="Supersede"
                      />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: '8px 12px',
        color: 'var(--ink-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '8px 12px', color: 'var(--ink-primary)' }}>{children}</td>;
}

function CountTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 80 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'var(--ink-secondary)',
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: tone }}>
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 8px',
        border: '1px solid var(--border-default)',
        borderRadius: 4,
        background: 'var(--surface-1)',
        color: 'var(--ink-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
