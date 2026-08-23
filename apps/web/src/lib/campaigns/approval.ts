import { createHash } from 'node:crypto'
import type { CampaignAsset } from './types'

export interface CampaignApprovalReceipt {
  status: 'approved' | 'revoked'
  approvedBy: string | null
  approvedAt: string | null
  assetFingerprint: string | null
}

export interface CampaignApprovalState {
  status: 'approved' | 'required' | 'stale'
  approvedAt: string | null
  assetFingerprint: string
}

type FingerprintAsset = Pick<
  CampaignAsset,
  | 'id'
  | 'platform'
  | 'copy'
  | 'headline'
  | 'cta'
  | 'hashtags'
  | 'imageUrl'
  | 'imagePrompt'
  | 'width'
  | 'height'
  | 'variant'
  | 'visualType'
>

function stableAsset(asset: FingerprintAsset) {
  return {
    id: asset.id,
    platform: asset.platform,
    copy: asset.copy,
    headline: asset.headline,
    cta: asset.cta,
    hashtags: [...asset.hashtags].sort(),
    imageUrl: asset.imageUrl,
    imagePrompt: asset.imagePrompt,
    width: asset.width,
    height: asset.height,
    variant: asset.variant,
    visualType: asset.visualType,
  }
}

export function fingerprintCampaignAssets(assets: FingerprintAsset[]): string {
  const stable = [...assets]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(stableAsset)

  return createHash('sha256').update(JSON.stringify(stable)).digest('hex')
}

export function readCampaignApproval(
  metadata: Record<string, unknown> | null | undefined,
): CampaignApprovalReceipt | null {
  const approval = metadata?.approval
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) return null

  const row = approval as Record<string, unknown>
  if (row.status !== 'approved' && row.status !== 'revoked') return null

  return {
    status: row.status,
    approvedBy: typeof row.approvedBy === 'string' ? row.approvedBy : null,
    approvedAt: typeof row.approvedAt === 'string' ? row.approvedAt : null,
    assetFingerprint: typeof row.assetFingerprint === 'string' ? row.assetFingerprint : null,
  }
}

export function getCampaignApprovalState(
  metadata: Record<string, unknown> | null | undefined,
  assets: FingerprintAsset[],
): CampaignApprovalState {
  const assetFingerprint = fingerprintCampaignAssets(assets)
  const receipt = readCampaignApproval(metadata)

  if (!receipt || receipt.status !== 'approved') {
    return { status: 'required', approvedAt: null, assetFingerprint }
  }

  if (receipt.assetFingerprint !== assetFingerprint) {
    return { status: 'stale', approvedAt: receipt.approvedAt, assetFingerprint }
  }

  return { status: 'approved', approvedAt: receipt.approvedAt, assetFingerprint }
}
