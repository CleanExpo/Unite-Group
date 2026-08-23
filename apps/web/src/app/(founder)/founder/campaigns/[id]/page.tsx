'use client'

// src/app/(founder)/founder/campaigns/[id]/page.tsx
// Campaign detail view — loads campaign + assets, renders AssetPreview for each.

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AssetPreview } from '@/components/founder/campaigns/AssetPreview'
import type { Campaign, CampaignAsset } from '@/lib/campaigns/types'
import type { CampaignApprovalState } from '@/lib/campaigns/approval'

type IconProps = { size?: number; className?: string } & React.SVGProps<SVGSVGElement>

function ArrowLeft({ size = 14, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

function RefreshCw({ size = 13, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function Trash2({ size = 13, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  tiktok: 'TikTok', youtube: 'YouTube',
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  draft:      { label: 'Draft',      color: 'var(--color-text-disabled)' },
  generating: { label: 'Generating', color: '#15803d' },
  ready:      { label: 'Ready',      color: '#22c55e' },
  published:  { label: 'Published',  color: '#3b82f6' },
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [assets, setAssets] = useState<CampaignAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [approval, setApproval] = useState<CampaignApprovalState | null>(null)
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      if (res.status === 404) { setError('Campaign not found.'); return }
      if (!res.ok) { setError('Failed to load campaign.'); return }
      const data = await res.json() as { campaign: Campaign; assets: CampaignAsset[]; approval: CampaignApprovalState }
      setCampaign(data.campaign)
      setAssets(data.assets ?? [])
      setApproval(data.approval)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  async function handleDelete() {
    if (!confirm('Delete this campaign and all its assets? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/founder/campaigns')
    } finally {
      setDeleting(false)
    }
  }

  function handleRegenerateImage(assetId: string) {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'generating_image' } : a))
    setApproval((current) => current ? { ...current, status: 'stale' } : current)
    // Reload after a short delay to pick up the new image
    setTimeout(() => void load(), 5000)
  }

  function handleApprove(assetId: string) {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'ready' } : a))
    setApproval((current) => current ? { ...current, status: 'stale' } : current)
  }

  async function handleCampaignApproval() {
    setApprovalBusy(true)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/campaigns/${id}/approval`, { method: 'POST' })
      const body = await res.json().catch(() => ({})) as { error?: string; approval?: CampaignApprovalState }
      if (!res.ok || !body.approval) throw new Error(body.error ?? 'Approval could not be recorded')
      setApproval(body.approval)
      setActionMessage('Exact campaign version approved. It is ready to become channel drafts.')
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setApprovalBusy(false)
    }
  }

  async function handlePrepareDrafts() {
    setPreparing(true)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/campaigns/${id}/publish`, { method: 'POST' })
      const body = await res.json().catch(() => ({})) as { error?: string; draftsCreated?: number; alreadyPrepared?: boolean }
      if (!res.ok) throw new Error(body.error ?? 'Channel drafts could not be prepared')
      setActionMessage(body.alreadyPrepared
        ? 'Channel drafts were already prepared. Nothing was duplicated.'
        : `${body.draftsCreated ?? 0} channel draft(s) prepared. Nothing was published externally.`)
      await load()
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Draft preparation failed')
    } finally {
      setPreparing(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm" style={{ background: 'var(--surface-elevated)' }} />
          <div className="h-5 w-48 rounded-sm" style={{ background: 'var(--surface-elevated)' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-sm border" style={{ borderColor: 'var(--color-border)', background: 'var(--surface-card)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-[14px]" style={{ color: 'var(--color-text-muted)' }}>{error ?? 'Campaign not found.'}</p>
        <Link href="/founder/campaigns" className="text-[12px]" style={{ color: '#15803d' }}>
          ← Back to campaigns
        </Link>
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft
  const platforms = campaign.platforms.map(p => PLATFORM_LABEL[p] ?? p).join(' · ')
  const published = assets.filter(a => a.status === 'published').length
  const ready = assets.filter(a => a.status === 'ready').length
  const allReady = assets.length > 0 && ready === assets.length
  const campaignApproved = approval?.status === 'approved'

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/founder/campaigns"
          className="mt-1 p-1.5 rounded-sm border transition-colors shrink-0"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          aria-label="Back to campaigns"
        >
          <ArrowLeft size={14} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              {campaign.theme}
            </h1>
            <span
              className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm border"
              style={{ color: statusStyle.color, borderColor: `${statusStyle.color}40` }}
            >
              {statusStyle.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-[12px]" style={{ color: 'var(--color-text-disabled)' }}>
            {campaign.brandName && <span>{campaign.brandName}</span>}
            {platforms && <span>{platforms}</span>}
            <span>{assets.length} assets</span>
            {ready > 0 && <span style={{ color: '#22c55e' }}>{ready} ready</span>}
            {published > 0 && <span style={{ color: '#3b82f6' }}>{published} published</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="p-1.5 rounded-sm border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            aria-label="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="p-1.5 rounded-sm border transition-colors disabled:opacity-40"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            aria-label="Delete campaign"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <section className="rounded-sm border border-[#16a34a]/20 bg-[#16a34a]/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[12px] font-semibold text-[#0A0A0A]">Synthex approval gate</p>
            <p className="mt-1 text-[11px] text-[#5f5f66]">
              {campaignApproved
                ? 'This exact copy and image set is approved. Any change makes the approval stale.'
                : approval?.status === 'stale'
                  ? 'The campaign changed after approval. Review it and approve the new version.'
                  : 'Review every asset, then approve the exact campaign before creating channel drafts.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCampaignApproval()}
              disabled={!allReady || approvalBusy}
              className="rounded-sm border border-[#16a34a]/40 px-3 py-2 text-[11px] font-semibold text-[#15803d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {approvalBusy ? 'Recording…' : campaignApproved ? 'Re-approve exact version' : 'Approve exact campaign'}
            </button>
            <button
              type="button"
              onClick={() => void handlePrepareDrafts()}
              disabled={!campaignApproved || preparing}
              className="rounded-sm bg-[#16a34a] px-3 py-2 text-[11px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {preparing ? 'Preparing…' : 'Prepare channel drafts'}
            </button>
          </div>
        </div>
        {actionMessage && <p className="mt-3 text-[11px] text-[#52525b]" role="status">{actionMessage}</p>}
      </section>

      <div className="flex flex-wrap gap-2" aria-label="Synthex optimisation controls">
        {['SEO', 'AEO / GEO', 'Schema', 'E-E-A-T', 'Evidence', 'Captions + alt text'].map((control) => (
          <span key={control} className="rounded-sm border border-white/10 px-2 py-1 text-[10px] text-[#5f5f66]">
            {control}
          </span>
        ))}
      </div>

      {/* Asset grid */}
      {assets.length === 0 ? (
        <div className="rounded-sm border py-16 flex flex-col items-center gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[13px]" style={{ color: 'var(--color-text-disabled)' }}>
            {campaign.status === 'generating' ? 'Assets are being generated…' : 'No assets yet.'}
          </p>
          {campaign.status === 'generating' && (
            <button onClick={() => void load()} className="text-[11px]" style={{ color: '#15803d' }}>
              Refresh
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <AssetPreview
              key={asset.id}
              asset={asset}
              onRegenerateImage={() => handleRegenerateImage(asset.id)}
              onApprove={() => handleApprove(asset.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
