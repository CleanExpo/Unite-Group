'use client'

interface Props {
  selectedCount: number
  onArchive: () => void
  onDelete: () => void
  onMarkRead: () => void
  onMarkUnread: () => void
  onTriage: () => void
  loading?: boolean
}

export function BulkActionBar({ selectedCount, onArchive, onDelete, onMarkRead, onMarkUnread, onTriage, loading }: Props) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-(--surface-card) border border-white/20 px-4 py-3 rounded-sm">
      <span className="text-sm text-[#52525b] mr-1">
        {selectedCount} thread{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <div className="w-px h-4 bg-white/10" />
      <button
        onClick={onMarkRead}
        disabled={loading}
        className="text-xs text-[#52525b] hover:text-[#0A0A0A] transition-colors disabled:opacity-40"
      >
        Mark Read
      </button>
      <button
        onClick={onMarkUnread}
        disabled={loading}
        className="text-xs text-[#52525b] hover:text-[#0A0A0A] transition-colors disabled:opacity-40"
      >
        Mark Unread
      </button>
      <button
        onClick={onTriage}
        disabled={loading}
        className="text-xs text-[#15803d] hover:text-[#15803d]/70 transition-colors disabled:opacity-40"
      >
        AI Triage
      </button>
      <button
        onClick={onArchive}
        disabled={loading}
        className="text-xs text-[#52525b] hover:text-[#0A0A0A] transition-colors disabled:opacity-40"
      >
        Archive All
      </button>
      <button
        onClick={onDelete}
        disabled={loading}
        className="text-xs text-red-700 hover:text-red-700 transition-colors disabled:opacity-40"
      >
        Delete All
      </button>
    </div>
  )
}
