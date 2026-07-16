'use client'

import type { GmailThread } from '@/lib/integrations/google'
import type { TriageCategory } from '@/lib/ai/capabilities/email-triage'
import { ThreadRow } from './ThreadRow'

interface TriageMap {
  [threadId: string]: { category: TriageCategory; action: string }
}

interface Props {
  threads: GmailThread[]
  activeThreadId: string | null
  checkedIds: Set<string>
  triageMap: TriageMap
  hasMore: boolean
  loading: boolean
  onCheck: (id: string, checked: boolean) => void
  onToggleAll: (ids: string[], checked: boolean) => void
  onThreadClick: (id: string) => void
  onLoadMore: () => void
}

export function ThreadList({
  threads,
  activeThreadId,
  checkedIds,
  triageMap,
  hasMore,
  loading,
  onCheck,
  onToggleAll,
  onThreadClick,
  onLoadMore,
}: Props) {
  if (threads.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[#5f5f66]">No threads found</p>
      </div>
    )
  }

  const allChecked = threads.length > 0 && threads.every(t => checkedIds.has(t.id))

  return (
    <div className="flex flex-col h-full">
      {/* Select-all header — acts on loaded threads only */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/6 shrink-0">
        <div
          className="shrink-0"
          onClick={() => onToggleAll(threads.map(t => t.id), !allChecked)}
        >
          <div
            role="checkbox"
            aria-checked={allChecked}
            aria-label="Select all threads"
            className={[
              'w-4 h-4 rounded-sm border flex items-center justify-center transition-colors cursor-pointer',
              allChecked ? 'bg-[#16a34a] border-[#16a34a]' : 'border-white/20 hover:border-white/40',
            ].join(' ')}
          >
            {allChecked && (
              <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 12 12">
                <path d="M1 6l4 4L11 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-xs text-[#5f5f66]">Select all</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.map(thread => (
          <ThreadRow
            key={`${thread.email}-${thread.id}`}
            thread={thread}
            selected={checkedIds.has(thread.id)}
            active={thread.id === activeThreadId}
            triageInfo={triageMap[thread.id]}
            onCheck={onCheck}
            onClick={onThreadClick}
          />
        ))}

        {loading && (
          <div className="flex items-center justify-center py-6">
            <span className="text-xs text-[#5f5f66]">Loading…</span>
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={onLoadMore}
            className="w-full py-3 text-xs text-[#5f5f66] hover:text-[#3f3f46] transition-colors border-t border-white/4"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  )
}
