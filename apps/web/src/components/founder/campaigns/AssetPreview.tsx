'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { CampaignAsset, VisualType } from '@/lib/campaigns/types'
import type { SocialPlatform } from '@/lib/integrations/social/types'

interface AssetPreviewProps {
  asset: CampaignAsset
  onRegenerateImage?: (assetId: string) => void
  onApprove?: (assetId: string) => void
}

const PLATFORM_BADGE: Record<SocialPlatform, string> = {
  instagram: 'bg-pink-500/20 text-[var(--mission-blue)]',
  facebook:  'bg-blue-500/20 text-[var(--mission-blue)]',
  linkedin:  'bg-sky-600/20 text-[var(--mission-blue)]',
  tiktok:    'bg-[var(--mission-raised)]/10 text-[var(--mission-ink)]',
  youtube:   'bg-red-500/20 text-[var(--color-danger)]',
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook:  'Facebook',
  linkedin:  'LinkedIn',
  tiktok:    'TikTok',
  youtube:   'YouTube',
}

const STATUS_BADGE: Record<CampaignAsset['status'], string> = {
  pending_image:    'bg-amber-500/20 text-[var(--mission-attention)]',
  generating_image: 'bg-cyan-500/20 text-[var(--mission-blue)] animate-pulse',
  ready:            'bg-green-500/20 text-[var(--color-success)]',
  review:           'bg-amber-500/20 text-[var(--mission-attention)]',
  published:        'bg-blue-500/20 text-[var(--mission-blue)]',
}

const STATUS_LABEL: Record<CampaignAsset['status'], string> = {
  pending_image:    'Pending Image',
  generating_image: 'Generating',
  ready:            'Ready',
  review:           'Needs Review',
  published:        'Published',
}

const VISUAL_TYPE_BADGE: Record<VisualType, string> = {
  photo:        'bg-[var(--mission-raised)]/5 text-[var(--color-text-secondary)]',
  infographic:  'bg-violet-500/20 text-[var(--mission-blue)]',
  diagram:      'bg-emerald-500/20 text-[var(--color-success)]',
  data_viz:     'bg-sky-500/20 text-[var(--mission-blue)]',
  process_flow: 'bg-amber-500/20 text-[var(--mission-attention)]',
}

const VISUAL_TYPE_LABEL: Record<VisualType, string> = {
  photo:        'Photo',
  infographic:  'Infographic',
  diagram:      'Diagram',
  data_viz:     'Data Viz',
  process_flow: 'Process Flow',
}

function QualityScorePill({ score }: { score: number }) {
  const colour = score >= 70
    ? 'bg-green-500/20 text-[var(--color-success)]'
    : 'bg-amber-500/20 text-[var(--mission-attention)]'
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded-sm ${colour}`}>
      Q:{score}
    </span>
  )
}

export function AssetPreview({ asset, onRegenerateImage, onApprove }: AssetPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)

  const copyTruncated = asset.copy.length > 150 && !expanded
    ? asset.copy.slice(0, 150) + '…'
    : asset.copy

  async function handleApprove() {
    if (!onApprove) return
    setApproving(true)
    setApproveError(null)
    try {
      // UNI-2395 — persist the approval server-side before flipping any state.
      const res = await fetch(`/api/campaigns/${asset.campaignId}/assets/${asset.id}/approve`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      onApprove(asset.id)
    } catch (err) {
      // Never present a failed approval as approved — keep the review state, surface the error.
      setApproveError(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--mission-border)] rounded-sm p-4 flex flex-col gap-3">
      {/* Header row — platform + visual type + status badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-sm ${PLATFORM_BADGE[asset.platform]}`}>
          {PLATFORM_LABEL[asset.platform]}
        </span>
        {asset.visualType !== 'photo' && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-sm ${VISUAL_TYPE_BADGE[asset.visualType]}`}>
            {VISUAL_TYPE_LABEL[asset.visualType]}
          </span>
        )}
        {asset.imageEngine === 'paper_banana' && asset.qualityScore !== null && (
          <QualityScorePill score={asset.qualityScore} />
        )}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-sm ml-auto ${STATUS_BADGE[asset.status]}`}>
          {STATUS_LABEL[asset.status]}
        </span>
      </div>

      {/* Image area */}
      {asset.imageUrl ? (
        <Image
          src={asset.imageUrl}
          alt={asset.headline ?? 'Campaign asset'}
          width={400}
          height={400}
          className="w-full aspect-square object-cover rounded-sm"
        />
      ) : (
        <div className="w-full aspect-square bg-[var(--mission-raised)]/3 border border-[var(--mission-border)] rounded-sm flex items-center justify-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            {asset.status === 'generating_image' ? 'Image generating…' : 'No image'}
          </span>
        </div>
      )}

      {/* Headline */}
      {asset.headline && (
        <p className="text-[var(--color-text-primary)] text-sm font-semibold leading-snug">
          {asset.headline}
        </p>
      )}

      {/* Copy text */}
      <div className="flex flex-col gap-1">
        <p className="text-[var(--mission-ink)] text-sm leading-relaxed whitespace-pre-line">
          {copyTruncated}
        </p>
        {asset.copy.length > 150 && (
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-secondary)] transition-colors text-left"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* CTA */}
      {asset.cta && (
        <p className="text-[var(--mission-blue)] text-xs font-medium">
          {asset.cta}
        </p>
      )}

      {/* Hashtags */}
      {asset.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {asset.hashtags.map(tag => (
            <span
              key={tag}
              className="bg-[var(--mission-raised)]/5 text-[var(--color-text-secondary)] text-xs px-2 py-0.5 rounded-sm"
            >
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}

      {/* Dimensions + engine */}
      <p className="font-mono text-[var(--color-text-secondary)] text-xs">
        {asset.width}×{asset.height}
        {asset.imageEngine && ` · ${asset.imageEngine === 'paper_banana' ? 'PaperBanana' : 'Gemini'}`}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        {(asset.status === 'pending_image' || asset.status === 'review') && onRegenerateImage && (
          <button
            onClick={() => onRegenerateImage(asset.id)}
            className="border border-[var(--mission-border)] text-[var(--color-text-secondary)] hover:border-[var(--mission-border)] hover:text-[var(--mission-ink)] text-xs px-3 py-1.5 rounded-sm transition-colors"
          >
            Regenerate
          </button>
        )}

        {asset.status === 'review' && onApprove && (
          <button
            onClick={() => void handleApprove()}
            disabled={approving}
            className="bg-[var(--mission-blue)] text-[var(--mission-blue-ink)] text-xs font-medium rounded-sm px-3 py-1.5 hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {approving ? 'Approving…' : 'Approve'}
          </button>
        )}

        {asset.status === 'ready' && (
          <span className="text-xs text-[var(--mission-blue)]">Ready for campaign approval</span>
        )}
      </div>

      {/* Approve error */}
      {approveError && (
        <p className="text-[var(--color-danger)] text-xs" role="alert">
          {approveError}
        </p>
      )}

    </div>
  )
}
