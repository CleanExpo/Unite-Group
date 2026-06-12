'use client'

export function ApprovalQueue() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <span className="text-[24px]" style={{ color: 'var(--color-text-muted)' }}>&#x2713;</span>
      <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>No pending approvals</p>
      <p className="text-[11px] max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
        AI-requested actions awaiting your sign-off will appear here once the approvals pipeline is connected.
      </p>
    </div>
  )
}
