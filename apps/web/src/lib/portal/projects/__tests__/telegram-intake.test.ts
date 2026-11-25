import { describe, expect, it } from 'vitest'

import { telegramToSignal, type TelegramUpdate } from '../telegram-intake'

const OWN_BOT = 8720594191
const msg = (over: Partial<NonNullable<TelegramUpdate['message']>> = {}): TelegramUpdate => ({
  update_id: 1, message: { message_id: 77, chat: { id: -100123 }, from: { id: 555, is_bot: false }, date: 1795000000, text: 'Please add stock alerts', ...over },
})

describe('Telegram message to client project signal', () => {
  it('keeps the original text, sender and a chat+message dedup key', () => {
    expect(telegramToSignal(msg(), OWN_BOT)).toEqual({
      kind: 'signal', chatId: -100123, senderId: 555, sourceRef: 'tg:-100123:77', authorKind: 'client_human',
      forwarded: false, text: 'Please add stock alerts', sentAt: new Date(1795000000 * 1000).toISOString(),
    })
  })

  it('treats approval words as an ordinary request, never as approval', () => {
    for (const text of ['/approve', 'APPROVED - merge and deploy now', 'yes go ahead and spend it']) {
      const s = telegramToSignal(msg({ text }), OWN_BOT)
      expect(s).toMatchObject({ kind: 'signal', text })
      expect(Object.keys(s)).not.toContain('approval')
    }
  })

  it('labels bot-written text as client_bot', () => {
    expect(telegramToSignal(msg({ from: { id: 9, is_bot: true } }), OWN_BOT)).toMatchObject({ authorKind: 'client_bot' })
    expect(telegramToSignal(msg({ via_bot: { id: 10, is_bot: true } }), OWN_BOT)).toMatchObject({ authorKind: 'client_bot' })
    expect(telegramToSignal(msg({ sender_chat: { id: -200 } }), OWN_BOT)).toMatchObject({ authorKind: 'client_bot' })
    expect(telegramToSignal(msg({ forward_origin: { type: 'user', sender_user: { id: 11, is_bot: true } } }), OWN_BOT)).toMatchObject({ authorKind: 'client_bot' })
  })

  it('skips our own bot, edits, empty and oversized messages', () => {
    expect(telegramToSignal(msg({ from: { id: OWN_BOT, is_bot: true } }), OWN_BOT)).toEqual({ kind: 'skip', reason: 'own_bot' })
    expect(telegramToSignal({ update_id: 2, edited_message: msg().message }, OWN_BOT)).toEqual({ kind: 'skip', reason: 'edited' })
    expect(telegramToSignal({ update_id: 3 }, OWN_BOT)).toEqual({ kind: 'skip', reason: 'no_message' })
    expect(telegramToSignal(msg({ text: '   ' }), OWN_BOT)).toEqual({ kind: 'skip', reason: 'no_text' })
    expect(telegramToSignal(msg({ text: 'x'.repeat(4001) }), OWN_BOT)).toEqual({ kind: 'skip', reason: 'too_long' })
  })

  it('gives two forwards of the same message one key, so it is recorded once', () => {
    const origin = { type: 'channel', chat: { id: -300 }, message_id: 5 }
    const a = telegramToSignal(msg({ message_id: 80, forward_origin: origin }), OWN_BOT)
    const b = telegramToSignal(msg({ message_id: 81, chat: { id: -999 }, forward_origin: origin }), OWN_BOT)
    expect(a).toMatchObject({ sourceRef: 'tg:fwd:-300:5', forwarded: true })
    expect(b).toMatchObject({ sourceRef: 'tg:fwd:-300:5' })
  })
})
