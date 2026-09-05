'use client'

import Link from 'next/link'
import type { Campaign, CampaignStatus, CampaignObjective } from '@/lib/campaigns/types'
import { MissionControlShell } from '@/app/(founder)/founder/command-centre/MissionControlShell'

export type CampaignSummary = Pick<Campaign, 'id' | 'theme' | 'objective' | 'platforms' | 'postCount' | 'status' | 'createdAt'>

const STATUS_STYLES: Record<CampaignStatus, { label: string; className: string }> = {
  draft:      { label: 'Draft',      className: 'text-[var(--color-text-secondary)] bg-[var(--mission-raised)]/6 border border-[var(--mission-border)]' },
  generating: { label: 'Generating', className: 'text-[var(--mission-blue)] bg-[var(--mission-blue)]/10 border border-[var(--mission-blue)]/20 animate-pulse' },
  ready:      { label: 'Ready',      className: 'text-[var(--color-success)] bg-emerald-400/10 border border-emerald-400/20' },
  published:  { label: 'Published',  className: 'text-[var(--mission-blue)] bg-blue-400/10 border border-blue-400/20' },
}

const OBJECTIVE_STYLES: Record<CampaignObjective, { label: string; className: string }> = {
  awareness:  { label: 'Awareness',  className: 'text-[var(--mission-blue)] bg-purple-400/10 border border-purple-400/20' },
  engagement: { label: 'Engagement', className: 'text-[var(--mission-attention)] bg-amber-400/10 border border-amber-400/20' },
  conversion: { label: 'Conversion', className: 'text-[var(--color-success)] bg-emerald-400/10 border border-emerald-400/20' },
  retention:  { label: 'Retention',  className: 'text-[var(--mission-blue)] bg-blue-400/10 border border-blue-400/20' },
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'IG',
  facebook:  'FB',
  linkedin:  'LI',
  tiktok:    'TT',
  youtube:   'YT',
}

function formatPlatforms(platforms: string[]): string {
  return platforms
    .map(p => PLATFORM_LABELS[p] ?? p.toUpperCase().slice(0, 2))
    .join(' · ')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

interface CampaignCardProps {
  campaign: CampaignSummary
}

function CampaignCard({ campaign }: CampaignCardProps) {
  const status = STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft
  const objective = OBJECTIVE_STYLES[campaign.objective] ?? OBJECTIVE_STYLES.awareness

  return (
    <Link
      href={`/founder/campaigns/${campaign.id}`}
      className="block group"
    >
      <div
        className="rounded-sm border border-[var(--mission-border)] bg-[var(--surface-card)] p-5 flex flex-col gap-3 transition-colors duration-150 hover:border-[var(--mission-blue)]/30 hover:bg-[var(--mission-blue)]/2"
      >
        {/* Theme + status row */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] font-medium text-[var(--color-text-primary)] leading-snug line-clamp-2 flex-1">
            {campaign.theme}
          </p>
          <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm ${status.className}`}>
            {status.label}
          </span>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm ${objective.className}`}>
            {objective.label}
          </span>

          {campaign.platforms.length > 0 && (
            <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
              {formatPlatforms(campaign.platforms)}
            </span>
          )}

          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
            {campaign.postCount} post{campaign.postCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
            {formatDate(campaign.createdAt)}
          </span>
          <span
            className="text-[11px] text-[var(--mission-blue)]/0 group-hover:text-[var(--mission-blue)]/60 transition-colors duration-150"
          >
            View →
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="rounded-sm py-20 flex flex-col items-center justify-center text-center gap-4"
      style={{ border: '1px dashed color-mix(in srgb, var(--mission-blue) 15%, transparent)' }}
    >
      <div className="w-10 h-10 rounded-sm bg-[var(--mission-blue)]/6 border border-[var(--mission-blue)]/20 flex items-center justify-center">
        <span className="text-[var(--mission-blue)] text-lg">⚡</span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[14px] font-medium text-[var(--color-text-secondary)]">No campaigns yet</p>
        <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">
          Scan a website to get started — the engine will extract Brand DNA and generate a full campaign.
        </p>
      </div>
      <Link
        href="/founder/campaigns/new"
        className="mt-2 text-[12px] font-medium text-[var(--mission-blue)] hover:text-[var(--mission-blue)]/80 transition-colors duration-150"
      >
        Scan your first website →
      </Link>
    </div>
  )
}

export function CampaignsView({ campaigns }: { campaigns: CampaignSummary[] | null }) {
  return <MissionControlShell section="campaigns" title="Campaigns" description="Create and review campaigns across your brands and channels." actions={<Link href="/founder/campaigns/new" className="rounded-sm bg-[var(--mission-blue)] text-[var(--mission-blue-ink)] px-4 py-2 text-sm font-semibold">New Campaign</Link>}>
    {campaigns === null ? <div role="status" className="rounded-sm border border-[var(--mission-border)] bg-[var(--mission-surface)] p-6 text-[var(--mission-muted)]">Campaign data unavailable in this local preview. Sign in to the connected application to view your campaigns.</div>
      : campaigns.length === 0 ? <EmptyState /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{campaigns.map(campaign => <CampaignCard key={campaign.id} campaign={campaign} />)}</div>}
  </MissionControlShell>
}
