'use client'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  auto_matched:    { label: 'Auto',       color: 'var(--mission-blue)', bg: 'color-mix(in srgb, var(--mission-blue) 8%, transparent)', border: 'color-mix(in srgb, var(--mission-blue) 20%, transparent)' },
  suggested_match: { label: 'Suggested',  color: 'var(--mission-attention)', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)' },
  unmatched:       { label: 'Unmatched',  color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  manual_review:   { label: 'Review',     color: 'var(--mission-attention)', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  reconciled:      { label: 'Reconciled', color: 'var(--mission-blue)', bg: 'color-mix(in srgb, var(--mission-blue) 12%, transparent)', border: 'color-mix(in srgb, var(--mission-blue) 30%, transparent)' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'var(--mission-muted)', bg: 'rgba(136,136,136,0.08)', border: 'rgba(136,136,136,0.2)' }
  return (
    <span
      className="text-[10px] font-medium tracking-widest uppercase px-2 py-0.5 rounded-sm"
      style={{ color: config.color, backgroundColor: config.bg, border: `1px solid ${config.border}` }}
    >
      {config.label}
    </span>
  )
}
