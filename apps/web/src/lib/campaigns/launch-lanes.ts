import type { CampaignObjective } from './types'
import type { SocialPlatform } from '@/lib/integrations/social/types'

export interface SynthexLaunchLane {
  businessKey: 'ccw' | 'carsi' | 'restore'
  brandName: string
  websiteUrl: string
  purpose: string
  pilotTheme: string
  objective: CampaignObjective
  platforms: SocialPlatform[]
}

/**
 * The first protected Synthex launch lanes.
 *
 * Synthex owns the marketing work. Each lane keeps the generated data under
 * the business key that owns the brand, channels and analytics.
 */
export const SYNTHEX_LAUNCH_LANES: readonly SynthexLaunchLane[] = [
  {
    businessKey: 'ccw',
    brandName: 'Carpet Cleaners Warehouse',
    websiteUrl: 'https://ccwonline.com.au',
    purpose: 'Qualified product, workshop and service enquiries',
    pilotTheme: 'Choose the right carpet-cleaning equipment and reduce downtime',
    objective: 'conversion',
    platforms: ['facebook', 'instagram', 'linkedin', 'youtube'],
  },
  {
    businessKey: 'carsi',
    brandName: 'CARSI',
    websiteUrl: 'https://carsi.com.au',
    purpose: 'Training enrolments and trusted industry education',
    pilotTheme: 'Practical, evidence-led restoration training for Australian professionals',
    objective: 'conversion',
    platforms: ['facebook', 'instagram', 'linkedin', 'youtube'],
  },
  {
    businessKey: 'restore',
    brandName: 'RestoreAssist',
    websiteUrl: 'https://restoreassist.app',
    purpose: 'Product launch, qualified demos and recurring subscriptions',
    pilotTheme: 'Reduce restoration admin and move every job forward with confidence',
    objective: 'conversion',
    platforms: ['facebook', 'instagram', 'linkedin', 'youtube'],
  },
] as const

export function getSynthexLaunchLane(businessKey: string | null | undefined) {
  return SYNTHEX_LAUNCH_LANES.find((lane) => lane.businessKey === businessKey)
}
