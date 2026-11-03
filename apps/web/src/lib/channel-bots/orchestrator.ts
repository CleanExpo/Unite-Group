// UNI-3231 — CRM orchestrator for the channel bots.
// Runs every registered bot and applies the approval gate: no public post or
// profile change is ever executed without an explicit founder approval id.

import { createHash } from 'node:crypto'
import type { ChannelBot, ChannelBotAction, ChannelBotContext, ChannelBotId, ChannelBotResult } from './types'
import { youtubeBot } from './youtube-bot'
import { searchConsoleBot } from './search-console-bot'

export const BUILT_BOTS: ChannelBot[] = [youtubeBot, searchConsoleBot]
export const PLANNED_BOTS: ChannelBotId[] = ['linkedin', 'facebook', 'instagram', 'x', 'google-business-profile']

export function requiresApproval(action: ChannelBotAction): boolean {
  return action.kind !== 'report'
}

/**
 * Immutable action id: a digest of bot, kind, summary and payload. A founder
 * approval is bound to this id, so any change to the action voids it.
 */
export function actionId(action: ChannelBotAction): string {
  const canonical = JSON.stringify([action.bot, action.kind, action.summary, action.payload ?? null])
  return createHash('sha256').update(canonical).digest('hex')
}

/** Split actions into those safe to run now and those held for founder approval. */
export function gateActions(actions: ChannelBotAction[], approvedActionIds: ReadonlySet<string> = new Set()) {
  const ready: ChannelBotAction[] = []
  const held: Array<ChannelBotAction & { actionId: string }> = []
  for (const a of actions) {
    const id = actionId(a)
    if (!requiresApproval(a) || approvedActionIds.has(id)) ready.push(a)
    else held.push({ ...a, actionId: id })
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
  const allFailed = results.filter((r) => r.status !== 'not_built').every((r) => r.status !== 'ok')
  return { results, ready, heldForApproval: held, allFailed }
}
