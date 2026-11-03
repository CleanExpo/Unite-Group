// Writes each channel-bot run into the CRM as a strategy insight (read by
// /api/strategy/insights), then reads it back to confirm the write landed.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { runChannelBots } from './orchestrator'

type RunOutput = Awaited<ReturnType<typeof runChannelBots>>

export async function persistChannelBotRun(db: SupabaseClient, founderId: string, out: RunOutput): Promise<string> {
  const lines = out.results.map((r) => `- ${r.bot}: ${r.status}${r.error ? ` (${r.error})` : ''}`)
  const reports = out.ready.map((a) => `- ${a.summary}`)
  const held = out.heldForApproval.map((a) => `- [needs approval ${a.actionId.slice(0, 12)}] ${a.summary}`)
  const body = ['Bot status:', ...lines, '', 'Reports:', ...(reports.length ? reports : ['- none']), '', 'Held for approval:', ...(held.length ? held : ['- none'])].join('\n')
  const { data, error } = await db
    .from('strategy_insights')
    .insert({
      founder_id: founderId,
      business_key: 'unite-group',
      run_date: new Date().toISOString().split('T')[0],
      type: 'strategy',
      title: `Channel bots daily run${out.allFailed ? ' — all bots failing' : out.anyFailed ? ' — some bots failing' : ''}`,
      body,
      priority: out.anyFailed || held.length ? 'high' : 'low',
      status: 'new',
      metadata: { source: 'channel-bots', results: out.results, heldForApproval: out.heldForApproval },
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`channel-bots insight write failed: ${error?.message ?? 'no row'}`)
  const { data: check, error: readErr } = await db.from('strategy_insights').select('id').eq('id', data.id).eq('founder_id', founderId).single()
  if (readErr || !check) throw new Error('channel-bots insight write not confirmed')
  return data.id as string
}
