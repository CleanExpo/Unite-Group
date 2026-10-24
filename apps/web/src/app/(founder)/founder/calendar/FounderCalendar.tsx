'use client'

// FounderCalendar — UNI-2348. Google events and Synthex posts on one day-by-day
// calendar. Posts come from the stored post-lifecycle rows (never mock data),
// sit on their scheduled day (else the day first drafted, AEST) and are
// coloured by status. An "Awaiting your approval" strip lists every post
// waiting on the founder; clicking a post shows the full post and a
// synthex.social approve link. A missing migration or a failed read is said
// plainly, never shown as an empty calendar.

import { useState } from 'react'
import type { CalendarEvent } from '@/lib/integrations/calendar'
import { calendarDay, type SynthexPost, type SynthexPostsResult } from '@/lib/command-centre/synthex-posts'
import type { SynthexPostStatus } from '@/lib/integrations/synthex-events'
import { linkedInPostUrl, synthexApproveUrl } from '@/lib/integrations/synthex-links'

const STATUS_COLOURS: Record<SynthexPostStatus, string> = {
  drafted: '#6B7280',
  awaiting_approval: '#F59E0B',
  approved: '#3B82F6',
  scheduled: '#3B82F6',
  published: '#16a34a',
  failed: '#EF4444',
}

const muted = { color: 'var(--color-text-muted)' }
const secondary = { color: 'var(--color-text-secondary)' }
const border = { borderColor: 'var(--color-border)' }

function statusLabel(status: SynthexPostStatus | null): string {
  return status ? status.replaceAll('_', ' ') : 'status not sent'
}

function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-AU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
}

function aest(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' AEST'
}

function firstLine(text: string | null): string {
  const line = (text ?? '').split('\n')[0].trim()
  return line ? (line.length > 90 ? `${line.slice(0, 89)}…` : line) : '(no text sent)'
}

function PostButton({ post, onSelect, testId }: { post: SynthexPost; onSelect: (post: SynthexPost) => void; testId: string }) {
  const colour = post.status ? STATUS_COLOURS[post.status] : STATUS_COLOURS.drafted
  return (
    <button
      type="button"
      data-testid={testId}
      data-status={post.status ?? 'unknown'}
      onClick={() => onSelect(post)}
      className="w-full text-left border border-l-4 px-4 py-2 rounded-sm hover:border-white/18 transition-colors"
      style={{ ...border, borderLeftColor: colour }}
    >
      <span className="text-[10px] uppercase tracking-wider" style={{ color: colour }}>
        Synthex · {statusLabel(post.status)}{post.platform ? ` · ${post.platform}` : ''}
      </span>
      <span className="block text-sm truncate">{firstLine(post.text)}</span>
    </button>
  )
}

function PostDetail({ post, onClose }: { post: SynthexPost; onClose: () => void }) {
  const approve = synthexApproveUrl(post.approveUrl)
  const live = linkedInPostUrl(post.postUrl)
  return (
    <section aria-label="Post details" className="border px-4 py-4 rounded-sm space-y-3" style={border}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-semibold">Synthex post · {statusLabel(post.status)}</h2>
        <button type="button" className="text-xs hover:underline" style={secondary} onClick={onClose}>Close</button>
      </div>
      <p className="text-sm whitespace-pre-wrap break-words">{post.text ?? '(no text sent)'}</p>
      {post.thumbnailUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.thumbnailUrls.map((url, i) => (
            <img key={url} src={url} alt={`Media thumbnail ${i + 1}`} width={96} height={96} loading="lazy" referrerPolicy="no-referrer" className="rounded-sm object-cover w-24 h-24" />
          ))}
        </div>
      )}
      <dl className="text-xs grid gap-1" style={secondary}>
        <div>Platform: {post.platform ?? 'not sent'}</div>
        <div>Business: {post.businessSlug ?? post.orgSlug ?? 'not sent'}</div>
        <div>Mission id: {post.missionId ?? 'none sent'}</div>
        <div>Post id: {post.postId}</div>
        {post.scheduledAt && <div>Scheduled: {aest(post.scheduledAt)}</div>}
        {post.publishedAt && <div>Published: {aest(post.publishedAt)}</div>}
      </dl>
      <div className="flex flex-wrap gap-4 text-sm">
        {approve && <a href={approve} target="_blank" rel="noopener noreferrer" className="text-[#15803d] hover:underline">Review and approve in Synthex</a>}
        {!approve && post.approveUrl && <span className="text-xs" style={muted}>Approve link (not Synthex, not linked): {post.approveUrl}</span>}
        {live && <a href={live} target="_blank" rel="noopener noreferrer" className="text-[#15803d] hover:underline">Open LinkedIn post</a>}
      </div>
    </section>
  )
}

export function FounderCalendar({ events, posts }: { events: CalendarEvent[]; posts: SynthexPostsResult }) {
  const [selected, setSelected] = useState<SynthexPost | null>(null)
  const awaiting = posts.posts.filter(p => p.status === 'awaiting_approval')

  const days = new Map<string, { events: CalendarEvent[]; posts: SynthexPost[] }>()
  const dayOf = (day: string) => days.get(day) ?? days.set(day, { events: [], posts: [] }).get(day)!
  for (const event of events) if (event.start) dayOf(calendarDay(event.start)).events.push(event)
  for (const post of posts.posts) dayOf(post.day).posts.push(post)
  const ordered = [...days.entries()].sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      {posts.source === 'connected' && (
        <section aria-label="Awaiting your approval" className="border px-4 py-3 rounded-sm space-y-2" style={{ borderColor: STATUS_COLOURS.awaiting_approval }}>
          <h2 className="text-sm font-semibold">Awaiting your approval ({awaiting.length})</h2>
          {awaiting.length === 0
            ? <p className="text-sm" style={muted}>Nothing is waiting for your approval.</p>
            : awaiting.map(p => <PostButton key={p.postId} post={p} onSelect={setSelected} testId={`awaiting-post-${p.postId}`} />)}
        </section>
      )}

      {posts.source === 'not_connected' && posts.reason === 'migration_not_applied' && (
        <p className="border px-4 py-3 rounded-sm text-sm" style={{ ...border, ...secondary }}>
          Synthex posts unavailable — the cc_synthex_post_events migration is not applied.
        </p>
      )}
      {posts.source === 'error' && (
        <p role="alert" className="border px-4 py-3 rounded-sm text-sm" style={{ borderColor: '#EF4444', color: '#FCA5A5' }}>
          Synthex posts could not be loaded. This is a load error, not an empty calendar.
        </p>
      )}
      {posts.source === 'connected' && posts.posts.length === 0 && (
        <p className="text-sm" style={muted}>No Synthex posts yet</p>
      )}
      {posts.truncated && <p className="text-xs" style={muted}>Only the most recent Synthex post events were read.</p>}

      {selected && <PostDetail post={selected} onClose={() => setSelected(null)} />}

      {ordered.map(([day, entry]) => (
        <section key={day} aria-label={dayLabel(day)} className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider" style={muted}>{dayLabel(day)}</h3>
          {entry.events.map(event => (
            <div key={event.id} className="border px-4 py-3 rounded-sm flex items-center gap-4" style={border}>
              <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: event.colour }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{event.title}</p>
                <p className="text-xs mt-0.5" style={secondary}>{new Date(event.start).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider shrink-0" style={muted}>{event.businessKey}</span>
            </div>
          ))}
          {entry.posts.map(post => <PostButton key={post.postId} post={post} onSelect={setSelected} testId={`calendar-post-${post.postId}`} />)}
        </section>
      ))}
    </div>
  )
}
