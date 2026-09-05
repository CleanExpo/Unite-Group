'use client'

import { use } from 'react'
import { CampaignDetailView } from '@/components/founder/campaigns/CampaignDetailView'

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <CampaignDetailView id={id} />
}
