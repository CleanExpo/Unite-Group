import type { ApprovalItem } from '@/app/(founder)/founder/approvals/page'

function formatType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function ApprovalQueue({ items }: { items: ApprovalItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <span className="text-[24px]" style={{ color: 'var(--color-text-muted)' }}>&#x2713;</span>
        <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>No pending approvals</p>
        <p className="text-[11px] max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
          AI-requested actions awaiting your sign-off will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-[#fff7ec] border border-white/6 rounded-sm px-4 py-3 flex items-start gap-4"
        >
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium text-[#0A0A0A] truncate">{item.title}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-sm shrink-0"
                style={{
                  background: 'rgba(22, 163, 74, 0.08)',
                  color: 'var(--color-accent, #16a34a)',
                  border: '1px solid rgba(22, 163, 74, 0.15)',
                }}
              >
                {formatType(item.type)}
              </span>
            </div>
            {item.description && (
              <p className="text-[11px] text-[#5f5f66] line-clamp-2">{item.description}</p>
            )}
          </div>
          <time
            className="text-[11px] text-[#5f5f66] shrink-0 pt-0.5"
            dateTime={item.created_at}
          >
            {formatDate(item.created_at)}
          </time>
        </div>
      ))}
    </div>
  )
}
