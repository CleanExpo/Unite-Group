import { notFound } from 'next/navigation'
import { isMissionControlNextEnabled } from '@/lib/mission-control-next/flag'
import { parseTab } from '@/lib/mission-control-next/tabs'
import { MissionControlNext } from './MissionControlNext'

// UNI-2776 preview. Founder-only access is enforced by the private-access middleware;
// this flag keeps the route 404 until MISSION_CONTROL_VNEXT_PREVIEW is exactly 'true'.
export const dynamic = 'force-dynamic'

export default async function MissionControlNextPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  if (!isMissionControlNextEnabled()) notFound()
  const { tab } = await searchParams
  return <MissionControlNext tab={parseTab(tab)} />
}
