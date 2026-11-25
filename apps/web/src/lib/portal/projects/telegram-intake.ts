// Telegram message -> client project signal, as a pure function. No network, no database.
// The output feeds portal_team_record_project_signal, which stores it as a `proposed` item and dedupes on source_ref.
//   * A message is DATA. Words like "approve", "/approve", "yes, merge" or "deploy" change nothing: there is no
//     approval path from here. Approvals go through the separately authorised mechanisms (RA-8365).
//   * Bot-written text is labelled client_bot (from.is_bot, via_bot, or a sender_chat post). It is never presented
//     as the client's confirmed decision.
//   * Our own bot's echoes are skipped (ownBotId).
//   * Dedup key: a forwarded message keys on its ORIGIN (chat + message id) when Telegram exposes one, so forwarding
//     the same message twice records it once. Otherwise chat id + message id.
// Sender-to-tenant mapping is NOT decided here: the caller must resolve chat/sender to a tenant from an allow-list,
// and refuse unknown senders. No such mapping exists yet; see the handoff (blocked on a founder decision).

export interface TelegramUser { id: number; is_bot?: boolean }
export interface TelegramChat { id: number; type?: string }
export interface TelegramMessage {
  message_id: number
  chat: TelegramChat
  from?: TelegramUser
  sender_chat?: TelegramChat
  via_bot?: TelegramUser
  date?: number
  text?: string
  caption?: string
  forward_origin?: { type: string; chat?: TelegramChat; message_id?: number; sender_user?: TelegramUser }
}
export interface TelegramUpdate { update_id: number; message?: TelegramMessage; edited_message?: TelegramMessage }

export type TelegramSignal = {
  kind: 'signal'
  chatId: number
  senderId: number | null
  sourceRef: string
  authorKind: 'client_human' | 'client_bot'
  forwarded: boolean
  text: string
  sentAt: string | null
}
export type TelegramSkip = { kind: 'skip'; reason: 'no_message' | 'edited' | 'own_bot' | 'no_text' | 'too_long' }

const MAX_TEXT = 4000

export function telegramToSignal(update: TelegramUpdate, ownBotId: number | null): TelegramSignal | TelegramSkip {
  if (!update.message) return { kind: 'skip', reason: update.edited_message ? 'edited' : 'no_message' }
  const m = update.message
  if (ownBotId !== null && (m.from?.id === ownBotId || m.via_bot?.id === ownBotId)) return { kind: 'skip', reason: 'own_bot' }
  const text = (m.text ?? m.caption ?? '').trim()
  if (!text) return { kind: 'skip', reason: 'no_text' }
  if (text.length > MAX_TEXT) return { kind: 'skip', reason: 'too_long' }

  const botAuthored = m.from?.is_bot === true || m.via_bot !== undefined || m.sender_chat !== undefined
    || m.forward_origin?.sender_user?.is_bot === true
  const origin = m.forward_origin
  const forwarded = origin !== undefined
  const sourceRef = origin?.chat && typeof origin.message_id === 'number'
    ? `tg:fwd:${origin.chat.id}:${origin.message_id}`
    : `tg:${m.chat.id}:${m.message_id}`

  return {
    kind: 'signal',
    chatId: m.chat.id,
    senderId: m.from?.id ?? null,
    sourceRef,
    authorKind: botAuthored ? 'client_bot' : 'client_human',
    forwarded,
    text,
    sentAt: typeof m.date === 'number' ? new Date(m.date * 1000).toISOString() : null,
  }
}
