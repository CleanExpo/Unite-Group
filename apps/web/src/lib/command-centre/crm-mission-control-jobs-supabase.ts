// UNI-2234 — CRM Mission Control read path (slice 3 surface).
//
// Reads the founder's recent CRM operator_jobs (lane_id 'crm_mission_control',
// written by the approval-process route — see src/lib/crm/mission-control-execution.ts)
// and maps them to a view the CrmAutonomyPanel renders. Founder-scoped via the
// session client + explicit founder_id filter (defence in depth; RLS also scopes).
//
// Honesty rules (NorthStar): no founder ⇒ 'not_connected'; a query failure ⇒
// 'error' with the reason. Never fabricates rows on failure. The founder-facing
// state lives in metadata.missionControlState (the row status is always the
// poller-inert 'blocked' — see the persistence module's SAFETY note).

import { createClient } from '@/lib/supabase/server'

export const CRM_MISSION_CONTROL_LANE_ID = 'crm_mission_control'

export type CrmMissionControlJobSource = 'connected' | 'not_connected' | 'error'

export interface CrmMissionControlJobView {
  id: string
  subjectType: string
  missionControlState: string
  reason: string | null
  admitted: boolean
  createdAt: string | null
}

export interface CrmMissionControlJobsResult {
  jobs: CrmMissionControlJobView[]
  source: CrmMissionControlJobSource
  error?: string
}

const DEFAULT_CAP = 8

interface OperatorJobRow {
  id: string
  task_type: string | null
  status: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Pure mapper: an operator_jobs row → the panel view. Prefers the founder-facing
 *  metadata state/subject; falls back to the row columns. */
export function mapCrmMissionControlJob(row: OperatorJobRow): CrmMissionControlJobView {
  const md = row.metadata ?? {}
  return {
    id: row.id,
    subjectType: str(md['subjectType']) ?? str(row.task_type) ?? 'unknown',
    missionControlState: str(md['missionControlState']) ?? str(row.status) ?? 'unknown',
    reason: str(md['reason']),
    admitted: md['admitted'] === true,
    createdAt: row.created_at,
  }
}

export async function loadCrmMissionControlJobs(
  founderId: string | null,
  cap: number = DEFAULT_CAP,
): Promise<CrmMissionControlJobsResult> {
  if (!founderId) return { jobs: [], source: 'not_connected' }
  try {
    const db = await createClient()
    const { data, error } = await db
      .from('operator_jobs')
      .select('id,task_type,status,metadata,created_at')
      .eq('founder_id', founderId)
      .eq('lane_id', CRM_MISSION_CONTROL_LANE_ID)
      .order('created_at', { ascending: false })
      .limit(cap)
    if (error) return { jobs: [], source: 'error', error: error.message }
    const rows = (data ?? []) as OperatorJobRow[]
    return { jobs: rows.map(mapCrmMissionControlJob), source: 'connected' }
  } catch (e) {
    return { jobs: [], source: 'error', error: e instanceof Error ? e.message : 'unknown error' }
  }
}
