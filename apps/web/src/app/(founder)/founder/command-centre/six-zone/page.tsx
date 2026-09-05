export const dynamic = 'force-dynamic'

import { chakra, syne, jbMono } from '../fonts'
import { loadActionQueueData } from '../ActionQueueTile'
import { loadBlockedLanesData } from '../BlockedLanesTile'
import { findColumnIndex } from '@/lib/command-centre/markdown'
import { SixZoneView } from './SixZoneView'

export default async function SixZoneCanvasPage() {
  const [queue, blocked] = await Promise.all([loadActionQueueData(), loadBlockedLanesData()])
  const actionIndex = findColumnIndex(queue.headers, 'action')
  const nextAction = actionIndex >= 0 ? (queue.rows[0]?.[actionIndex] ?? null) : null
  return <SixZoneView work={{ queued: queue.total_rows, blocked: blocked.blocked_count, source: queue.queue_path, nextAction, error: queue.read_error !== null || blocked.read_error !== null }} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
