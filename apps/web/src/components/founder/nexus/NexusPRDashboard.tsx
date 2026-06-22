'use client'

import { useEffect, useState, useCallback } from 'react'
import type { NexusPR, NexusPRFile } from '@/lib/nexus/github-prs'

interface ApiResponse {
  status?: string
  prs?: NexusPR[]
  repos?: Array<{ owner: string; repo: string }>
  error?: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function DiffBlock({ file }: { file: NexusPRFile }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-sm border overflow-hidden"
      style={{ borderColor: 'var(--color-border, rgba(255,255,255,0.06))' }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-secondary, #9ca3af)' }}>
          {file.filename}
        </span>
        <span className="text-[10px] shrink-0 ml-2" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          <span style={{ color: '#4ade80' }}>+{file.additions}</span>
          {' / '}
          <span style={{ color: '#f87171' }}>-{file.deletions}</span>
          {' '}
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && file.patch && (
        <pre
          className="text-[10px] font-mono px-3 py-2 overflow-x-auto max-h-48 overflow-y-auto"
          style={{
            background: 'rgba(0,0,0,0.3)',
            color: 'var(--color-text-muted, #6b7280)',
            lineHeight: '1.6',
          }}
        >
          {file.patch}
        </pre>
      )}
      {open && !file.patch && (
        <p
          className="text-[10px] px-3 py-2"
          style={{ color: 'var(--color-text-muted, #6b7280)' }}
        >
          No diff available (binary or empty file)
        </p>
      )}
    </div>
  )
}

function RejectForm({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (reason: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="flex flex-col gap-2 mt-2">
      <textarea
        className="w-full text-[12px] rounded-sm px-3 py-2 resize-none"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--color-text-primary, #f9fafb)',
          outline: 'none',
        }}
        rows={2}
        placeholder="Reason for rejection…"
        value={reason}
        onChange={e => setReason(e.target.value)}
        disabled={loading}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(reason.trim() || 'No reason given')}
          disabled={loading}
          className="text-[11px] px-3 py-1.5 rounded-sm"
          style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
            opacity: loading ? 0.5 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Rejecting…' : 'Confirm reject'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="text-[11px] px-3 py-1.5 rounded-sm"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--color-text-muted, #6b7280)',
            opacity: loading ? 0.5 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function PRCard({ pr, onResolved }: { pr: NexusPR; onResolved: (number: number) => void }) {
  const [approving, setApproving] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setApproving(true)
    setError(null)
    try {
      const res = await fetch('/api/nexus/prs/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: pr.owner, repo: pr.repo, number: pr.number }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Approve failed')
      onResolved(pr.number)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
      setApproving(false)
    }
  }

  async function handleReject(reason: string) {
    setRejecting(true)
    setError(null)
    try {
      const res = await fetch('/api/nexus/prs/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: pr.owner, repo: pr.repo, number: pr.number, reason }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Reject failed')
      onResolved(pr.number)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed')
      setRejecting(false)
      setRejectOpen(false)
    }
  }

  return (
    <div
      className="rounded-sm border px-4 py-4 flex flex-col gap-3"
      style={{
        background: 'var(--surface-card, rgba(255,255,255,0.02))',
        borderColor: 'var(--color-border, rgba(255,255,255,0.06))',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={pr.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium hover:underline truncate"
              style={{ color: 'var(--color-text-primary, #f9fafb)' }}
            >
              {pr.title}
            </a>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-sm shrink-0 font-mono"
              style={{
                background: 'rgba(0,245,255,0.08)',
                color: '#00F5FF',
                border: '1px solid rgba(0,245,255,0.15)',
              }}
            >
              {pr.owner}/{pr.repo}#{pr.number}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
            <span>by {pr.user}</span>
            <span>{formatDate(pr.created_at)}</span>
            <span>
              {pr.fileCount} {pr.fileCount === 1 ? 'file' : 'files'} changed
            </span>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {pr.aiSummary && (
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary, #9ca3af)' }}>
          {pr.aiSummary}
        </p>
      )}

      {/* Diff preview — up to 3 files */}
      {pr.files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {pr.fileCount > 3 && (
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
              Showing 3 of {pr.fileCount} changed files
            </p>
          )}
          {pr.files.map(f => (
            <DiffBlock key={f.filename} file={f} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-[11px]" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      {/* Actions */}
      {!rejectOpen ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleApprove}
            disabled={approving || rejecting}
            className="text-[12px] px-4 py-1.5 rounded-sm font-medium"
            style={{
              background: 'rgba(22,163,74,0.15)',
              border: '1px solid rgba(22,163,74,0.3)',
              color: '#4ade80',
              opacity: approving || rejecting ? 0.5 : 1,
              cursor: approving || rejecting ? 'not-allowed' : 'pointer',
            }}
          >
            {approving ? 'Approving…' : 'Approve & Merge'}
          </button>
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            disabled={approving || rejecting}
            className="text-[12px] px-4 py-1.5 rounded-sm"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171',
              opacity: approving || rejecting ? 0.5 : 1,
              cursor: approving || rejecting ? 'not-allowed' : 'pointer',
            }}
          >
            Reject
          </button>
          <a
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] ml-1"
            style={{ color: 'var(--color-text-muted, #6b7280)', textDecoration: 'underline' }}
          >
            View on GitHub
          </a>
        </div>
      ) : (
        <RejectForm
          onConfirm={handleReject}
          onCancel={() => setRejectOpen(false)}
          loading={rejecting}
        />
      )}
    </div>
  )
}

export function NexusPRDashboard() {
  const [loading, setLoading] = useState(true)
  const [prs, setPRs] = useState<NexusPR[]>([])
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nexus/prs')
      const data = (await res.json()) as ApiResponse
      if (!res.ok) throw new Error(data.error ?? 'Failed to load PRs')
      setPRs(data.prs ?? [])
      setStatus(data.status ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PRs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleResolved(prNumber: number) {
    setPRs(prev => prev.filter(p => p.number !== prNumber))
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1].map(i => (
          <div
            key={i}
            className="rounded-sm border px-4 py-4 animate-pulse"
            style={{
              background: 'var(--surface-card, rgba(255,255,255,0.02))',
              borderColor: 'var(--color-border, rgba(255,255,255,0.06))',
              height: 120,
            }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-sm border px-4 py-4 text-[12px]"
        style={{
          borderColor: 'rgba(239,68,68,0.2)',
          background: 'rgba(239,68,68,0.05)',
          color: '#f87171',
        }}
      >
        <p className="font-medium mb-1">Failed to load PRs</p>
        <p style={{ color: '#fca5a5' }}>{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-2 text-[11px] underline"
          style={{ color: '#f87171' }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (status === 'not_configured') {
    return (
      <div
        className="rounded-sm border px-4 py-6 text-center"
        style={{
          borderColor: 'var(--color-border, rgba(255,255,255,0.06))',
          color: 'var(--color-text-muted, #6b7280)',
        }}
      >
        <p className="text-[13px] mb-1">GitHub token not configured</p>
        <p className="text-[11px]">Set GITHUB_TOKEN in your environment variables to enable PR approval.</p>
      </div>
    )
  }

  if (status === 'no_repos') {
    return (
      <div
        className="rounded-sm border px-4 py-6 text-center"
        style={{
          borderColor: 'var(--color-border, rgba(255,255,255,0.06))',
          color: 'var(--color-text-muted, #6b7280)',
        }}
      >
        <p className="text-[13px] mb-1">No repos configured</p>
        <p className="text-[11px]">Set NEXUS_REPOS=owner/repo1,owner/repo2 to specify which repos to watch.</p>
      </div>
    )
  }

  if (prs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <span className="text-[24px]" style={{ color: 'var(--color-text-muted, #6b7280)' }}>✓</span>
        <p className="text-[13px]" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          No pending PRs
        </p>
        <p className="text-[11px] max-w-sm" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          PRs tagged <code className="font-mono">nexus-pending-approval</code> will appear here for review.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          {prs.length} PR{prs.length !== 1 ? 's' : ''} awaiting approval
        </p>
        <button
          type="button"
          onClick={load}
          className="text-[11px]"
          style={{ color: 'var(--color-text-muted, #6b7280)', textDecoration: 'underline' }}
        >
          Refresh
        </button>
      </div>
      {prs.map(pr => (
        <PRCard key={`${pr.owner}/${pr.repo}#${pr.number}`} pr={pr} onResolved={handleResolved} />
      ))}
    </div>
  )
}
