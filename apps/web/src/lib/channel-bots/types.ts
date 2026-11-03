// Channel bots (UNI-3223) — shared types for the CRM orchestrator.

export type ChannelBotId =
  | 'youtube'
  | 'search-console'
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'google-business-profile'

/** A proposed action. Anything public-facing must pass the approval gate. */
export interface ChannelBotAction {
  bot: ChannelBotId
  kind: 'report' | 'public_post' | 'profile_update'
  summary: string
  payload?: Record<string, unknown>
}

export interface ChannelBotResult {
  bot: ChannelBotId
  status: 'ok' | 'not_connected' | 'error' | 'not_built'
  metrics?: Record<string, number | string>
  actions: ChannelBotAction[]
  error?: string
}

export interface ChannelBotContext {
  founderId: string
  accountEmail: string
  getGoogleToken: () => Promise<string>
  fetchImpl?: typeof fetch
}

export interface ChannelBot {
  id: ChannelBotId
  run(ctx: ChannelBotContext): Promise<ChannelBotResult>
}

export const BRAND_ACCOUNT_EMAIL = 'contact@unite-group.in'
export const YOUTUBE_CHANNEL_ID = 'UCs-hljSgoapXemwXQAAUHZg'
export const SEARCH_CONSOLE_PROPERTY = 'sc-domain:unite-group.in'
