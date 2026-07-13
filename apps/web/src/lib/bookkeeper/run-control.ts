import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'

export const BOOKKEEPER_STALE_RUN_MS = 15 * 60 * 1000

export interface RunningBookkeeperRun {
  id: string
  startedAt: string
  errorLog?: unknown[]
}

export interface BookkeeperRunStore {
  listRunning(founderId: string): Promise<RunningBookkeeperRun[]>
  markFailed(input: {
    founderId: string
    runs: RunningBookkeeperRun[]
    completedAt: string
    reason: 'stale_timeout'
  }): Promise<string[]>
}

export interface PrepareBookkeeperRunResult {
  activeRun: RunningBookkeeperRun | null
  recoveredStaleRunIds: string[]
}

export function createSupabaseBookkeeperRunStore(
  supabase: SupabaseClient = createServiceClient(),
): BookkeeperRunStore {
  return {
    async listRunning(founderId) {
      const { data, error } = await supabase
        .from('bookkeeper_runs')
        .select('id, started_at, error_log')
        .eq('founder_id', founderId)
        .eq('status', 'running')
        .order('started_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to inspect active bookkeeper runs: ${error.message}`)
      }

      return (data ?? []).map((run) => ({
        id: String(run.id),
        startedAt: String(run.started_at),
        errorLog: Array.isArray(run.error_log) ? run.error_log : [],
      }))
    },

    async markFailed({ founderId, runs, completedAt, reason }) {
      const recoveredIds: string[] = []

      for (const run of runs) {
        const { data, error } = await supabase
          .from('bookkeeper_runs')
          .update({
            status: 'failed',
            completed_at: completedAt,
            error_log: [
              ...(run.errorLog ?? []),
              {
                code: reason,
                message: 'Recovered a stale running record before a new bookkeeper run',
                recovered_at: completedAt,
              },
            ],
          })
          .eq('founder_id', founderId)
          .eq('status', 'running')
          .eq('id', run.id)
          .select('id')
          .maybeSingle()

        if (error) {
          throw new Error(
            `Failed to recover stale bookkeeper run ${run.id}: ${error.message}`,
          )
        }
        if (data?.id) recoveredIds.push(String(data.id))
      }

      return recoveredIds
    },
  }
}

export async function prepareBookkeeperRun(
  founderId: string,
  options: {
    now?: Date
    store?: BookkeeperRunStore
  } = {},
): Promise<PrepareBookkeeperRunResult> {
  const now = options.now ?? new Date()
  const store = options.store ?? createSupabaseBookkeeperRunStore()
  const staleBefore = now.getTime() - BOOKKEEPER_STALE_RUN_MS
  const running = await store.listRunning(founderId)

  const stale = running.filter(
    (run) => new Date(run.startedAt).getTime() <= staleBefore,
  )
  const fresh = running.filter(
    (run) => new Date(run.startedAt).getTime() > staleBefore,
  )

  const recoveredStaleRunIds =
    stale.length > 0
      ? await store.markFailed({
          founderId,
          runs: stale,
          completedAt: now.toISOString(),
          reason: 'stale_timeout',
        })
      : []

  return {
    activeRun: fresh[0] ?? null,
    recoveredStaleRunIds,
  }
}
