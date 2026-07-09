// src/app/(founder)/founder/campaigns/page.tsx
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Campaign, CampaignObjective, CampaignStatus } from '@/lib/campaigns/types'

// ─── DB Row ──────────────────────────────────────────────────────────────────

interface CampaignRow {
  id: string
  theme: string
  objective: string
  platforms: string[]
  post_count: number
  status: string
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapRow(row: CampaignRow): Pick<Campaign, 'id' | 'theme' | 'objective' | 'platforms' | 'postCount' | 'status' | 'createdAt'> {
  return {
    id: row.id,
    theme: row.theme,
    objective: row.objective as CampaignObjective,
    platforms: row.platforms as Campaign['platforms'],
    postCount: row.post_count,
    status: row.status as CampaignStatus,
    createdAt: row.created_at,
  }
}

const STATUS_STYLES: Record<CampaignStatus, { label: string; className: string }> = {
  draft:      { label: 'Draft',      className: 'text-[#5f5f66] bg-white/6 border border-white/10' },
  generating: { label: 'Generating', className: 'text-[#15803d] bg-[#16a34a]/10 border border-[#16a34a]/20 animate-pulse' },
  ready:      { label: 'Ready',      className: 'text-emerald-700 bg-emerald-400/10 border border-emerald-400/20' },
  published:  { label: 'Published',  className: 'text-blue-700 bg-blue-400/10 border border-blue-400/20' },
}

const OBJECTIVE_STYLES: Record<CampaignObjective, { label: string; className: string }> = {
  awareness:  { label: 'Awareness',  className: 'text-purple-700 bg-purple-400/10 border border-purple-400/20' },
  engagement: { label: 'Engagement', className: 'text-amber-700 bg-amber-400/10 border border-amber-400/20' },
  conversion: { label: 'Conversion', className: 'text-emerald-700 bg-emerald-400/10 border border-emerald-400/20' },
  retention:  { label: 'Retention',  className: 'text-blue-700 bg-blue-400/10 border border-blue-400/20' },
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
  campaign: ReturnType<typeof mapRow>
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
        className="rounded-sm border border-white/6 bg-[#fff7ec] p-5 flex flex-col gap-3 transition-colors duration-150 hover:border-[#16a34a]/30 hover:bg-[#16a34a]/2"
      >
        {/* Theme + status row */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] font-medium text-[#0A0A0A] leading-snug line-clamp-2 flex-1">
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
            <span className="text-[11px] font-mono text-[#5f5f66]">
              {formatPlatforms(campaign.platforms)}
            </span>
          )}

          <span className="text-[11px] font-mono text-[#6b6b6b]">
            {campaign.postCount} post{campaign.postCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#6b6b6b] font-mono">
            {formatDate(campaign.createdAt)}
          </span>
          <span
            className="text-[11px] text-[#15803d]/0 group-hover:text-[#15803d]/60 transition-colors duration-150"
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
      style={{ border: '1px dashed rgba(22, 163, 74,0.15)' }}
    >
      <div className="w-10 h-10 rounded-sm bg-[#16a34a]/6 border border-[#16a34a]/20 flex items-center justify-center">
        <span className="text-[#15803d] text-lg">⚡</span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[14px] font-medium text-[#52525b]">No campaigns yet</p>
        <p className="text-[12px] text-[#6b6b6b] max-w-xs">
          Scan a website to get started — the engine will extract Brand DNA and generate a full campaign.
        </p>
      </div>
      <Link
        href="/founder/campaigns/new"
        className="mt-2 text-[12px] font-medium text-[#15803d] hover:text-[#15803d]/80 transition-colors duration-150"
      >
        Scan your first website →
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CampaignsPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createServiceClient()

  const { data: rows, error } = await supabase
    .from('campaigns')
    .select('id, theme, objective, platforms, post_count, status, created_at')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })

  // No-Invaders #1: a query FAILURE must never render as an empty CRM.
  // Throw so the route's error.tsx boundary catches it and shows an honest
  // error state — only render EmptyState when the request genuinely succeeded
  // with zero rows.
  if (error) {
    throw new Error(`Failed to load campaigns: ${error.message}`)
  }

  const campaigns = (rows ?? []).map(r => mapRow(r as CampaignRow))

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[22px] font-semibold text-[#0A0A0A] tracking-tight">
            Campaigns
          </h1>
          <p className="text-[12px] text-[#5f5f66]">
            Synthex AI-generated multi-platform campaigns
          </p>
        </div>
        <Link
          href="/founder/campaigns/new"
          className="shrink-0 bg-[#16a34a] text-black text-[12px] font-semibold rounded-sm px-4 py-2 hover:bg-[#16a34a]/90 transition-colors duration-150"
        >
          New Campaign
        </Link>
      </div>

      {/* Campaign grid or empty state */}
      {campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {campaigns.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  )
}
