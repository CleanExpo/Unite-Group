// src/lib/command-centre/lanes/wiki-enhance.ts
//
// Enqueue + inspect the "Wiki Knowledge Base enhancement" operator job.
//
// The button in the Command Deck enqueues one operator_jobs row
// (task_type 'wiki_enhance'); the Mac-side autopilot-runner operator-jobs
// poller claims it and runs the wiki-growth scan against the local Obsidian
// vault, streaming operator_events back. This module never executes anything —
// it only writes the queue row and reads status. Uses the founder-session
// server client (operator_jobs RLS is founder-scoped), never the service role.

import { createClient } from '@/lib/supabase/server'

export const WIKI_ENHANCE_TASK_TYPE = 'wiki_enhance'
export const WIKI_ENHANCE_LANE_ID = 'wiki'

// Statuses that count as "already in flight" — a second button press while one
// of these exists returns the existing job instead of duplicating it.
const ACTIVE_STATUSES = ['planned', 'queued', 'running'] as const

export interface WikiEnhanceJob {
  id: string
  status: string
  title: string
  created_at: string
  updated_at: string
}

export interface WikiEnhanceJobEvent {
  event_type: string
  detail: string
  at: string
}

export interface EnqueueResult {
  job: WikiEnhanceJob
  deduped: boolean
}

/**
 * Enqueue a wiki-enhancement run for the founder, or return the already-active
 * job if one is planned/queued/running (double-click safety).
 */
export async function enqueueWikiEnhance(founderId: string): Promise<EnqueueResult> {
  const db = await createClient()

  const { data: active, error: activeError } = await db
    .from('operator_jobs')
    .select('id,status,title,created_at,updated_at')
    .eq('founder_id', founderId)
    .eq('task_type', WIKI_ENHANCE_TASK_TYPE)
    .in('status', [...ACTIVE_STATUSES])
    .order('created_at', { ascending: false })
    .limit(1)
  if (activeError) throw new Error(`wiki-enhance active lookup failed: ${activeError.message}`)
  if (active && active.length > 0) return { job: active[0] as WikiEnhanceJob, deduped: true }

  const { data: job, error: insertError } = await db
    .from('operator_jobs')
    .insert({
      founder_id: founderId,
      lane_id: WIKI_ENHANCE_LANE_ID,
      title: 'Wiki Knowledge Base enhancement run',
      task_type: WIKI_ENHANCE_TASK_TYPE,
      status: 'queued',
      metadata: { requested_via: 'command-deck-button' },
    })
    .select('id,status,title,created_at,updated_at')
    .single()
  if (insertError) throw new Error(`wiki-enhance enqueue failed: ${insertError.message}`)

  const { error: eventError } = await db.from('operator_events').insert({
    founder_id: founderId,
    job_id: (job as WikiEnhanceJob).id,
    event_type: 'note',
    detail: 'created via Command Deck "Enhance Wiki KB" button',
  })
  if (eventError) throw new Error(`wiki-enhance event write failed: ${eventError.message}`)

  return { job: job as WikiEnhanceJob, deduped: false }
}

export interface WikiEnhanceStatus {
  job: WikiEnhanceJob | null
  events: WikiEnhanceJobEvent[]
}

/** Latest wiki-enhance job (any status) + its most recent events, for the button readout. */
export async function latestWikiEnhance(founderId: string): Promise<WikiEnhanceStatus> {
  const db = await createClient()

  const { data: jobs, error: jobError } = await db
    .from('operator_jobs')
    .select('id,status,title,created_at,updated_at')
    .eq('founder_id', founderId)
    .eq('task_type', WIKI_ENHANCE_TASK_TYPE)
    .order('created_at', { ascending: false })
    .limit(1)
  if (jobError) throw new Error(`wiki-enhance status lookup failed: ${jobError.message}`)
  const job = (jobs?.[0] as WikiEnhanceJob | undefined) ?? null
  if (!job) return { job: null, events: [] }

  const { data: events, error: eventsError } = await db
    .from('operator_events')
    .select('event_type,detail,at')
    .eq('founder_id', founderId)
    .eq('job_id', job.id)
    .order('at', { ascending: false })
    .limit(5)
  if (eventsError) throw new Error(`wiki-enhance events lookup failed: ${eventsError.message}`)

  return { job, events: (events as WikiEnhanceJobEvent[]) ?? [] }
}
