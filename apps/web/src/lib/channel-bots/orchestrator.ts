// UNI-3231 — CRM orchestrator for the channel bots.
// Runs every registered bot and applies the approval gate: no public post or
// profile change is ever executed without an explicit founder approval id.

import type { ChannelBot, ChannelBotAction, ChannelBotContext, ChannelBotId, ChannelBotResult } from './types'
import { youtubeBot } from './youtube-bot'
import { searchConsoleBot } from './search-console-bot'

export const BUILT_BOTS: ChannelBot[] = [youtubeBot, searchConsoleBot]
export const PLANNED_BOTS: ChannelBotId[] = ['linkedin', 'facebook', 'instagram', 'x', 'google-business-profile']

export function requiresApproval(action: ChannelBotAction): boolean {
  return action.kind !== 'report'
}

/** Split actions into those safe to run now and those held for approval. */
export function gateActions(actions: ChannelBotAction[], approvedSummaries: Set<string> = new Set()) {
  const ready: ChannelBotAction[] = []
  const held: ChannelBotAction[] = []
  for (const a of actions) {
    if (!requiresApproval(a) || approvedSummaries.has(a.summary)) ready.push(a)
    else held.push(a)
  }
  return { ready, held }
}

export async function runChannelBots(ctx: ChannelBotContext, bots: ChannelBot[] = BUILT_BOTS) {
  const results: ChannelBotResult[] = await Promise.all(
    bots.map(async (b) => {
      try {
        return await b.run(ctx)
      } catch (e) {
        return { bot: b.id, status: 'error' as const, actions: [], error: e instanceof Error ? e.message : 'unknown' }
      }
    }),
  )
  for (const id of PLANNED_BOTS) results.push({ bot: id, status: 'not_built', actions: [] })
  const { ready, held } = gateActions(results.flatMap((r) => r.actions))
  return { results, ready, heldForApproval: held }
}
