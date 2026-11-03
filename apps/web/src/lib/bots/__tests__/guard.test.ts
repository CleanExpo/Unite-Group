import { describe, expect, it } from 'vitest'

import {
  BOT_LIMITS,
  REPLY_TEMPLATES,
  allPossibleReplies,
  buildLeadBotSystemPrompt,
  guardReply,
  nextReply,
  readModelOutput,
  visitorDetails,
  type ModelRead,
} from '../guard'
import { isRateLimited, resetRateLimit } from '../rate-limit'

const read = (over: Partial<ModelRead> = {}): ModelRead => ({
  name: '',
  email: '',
  phone: '',
  need: '',
  phoneDeclined: false,
  askedAbout: 'none',
  ...over,
})

describe('the fixed reply set', () => {
  it('has no placeholders, and every possible reply passes every content rule', () => {
    const replies = allPossibleReplies()
    expect(replies.length).toBe((Object.keys(REPLY_TEMPLATES).length - 1) * 2)
    for (const r of replies) {
      expect(r).not.toMatch(/[{}<>]/)
      expect(guardReply(r)).toEqual({ blocked: false })
    }
  })
})

describe('guardReply (second layer, used on the templates and the visitor-typed need)', () => {
  it.each([
    'We add schema markup to your site so Google understands it.',
    'We add a sitemap and metadata so Google discovers your business in its AI results.',
    'People searching for a cafe near them will see you at the top.',
    // Codex review, 3e71470f.
    'We submit your business to online directories.',
  ])('flags the confidential method: %s', (text) => {
    expect(guardReply(text)).toEqual({ blocked: true, rule: 'confidential' })
  })

  it.each(['The lead bot is $99 a month.', 'The bot is 99 euros.', 'We can build it for 99 per bot.', 'The amount is 99.', 'Prices start low, plus GST.'])(
    'flags a price: %s',
    (text) => {
      expect(guardReply(text)).toMatchObject({ blocked: true, rule: 'price' })
    },
  )

  it.each(['CARSI can help with that.', 'Restore Assist handles that.', 'The founder also runs a restoration company.', 'N R P G members get this.'])(
    'flags the founder\'s other businesses: %s',
    (text) => {
      expect(guardReply(text)).toMatchObject({ blocked: true })
    },
  )
})

describe('buildLeadBotSystemPrompt', () => {
  const prompt = buildLeadBotSystemPrompt()

  it('carries the confidentiality guard and the no-price rule', () => {
    expect(prompt).toMatch(/CONFIDENTIAL: never describe, hint at or explain how Unite Group gets clients found in search/)
    expect(prompt).toMatch(/NO PRICES: never give a price/)
    expect(prompt).toMatch(/never mention restoration, disaster recovery or training businesses/)
  })

  it('tells the model it does not write replies, only JSON of the visitor\'s own words', () => {
    expect(prompt).toMatch(/You do not write the bot's replies/)
    expect(prompt).toMatch(/copy the visitor's own words exactly/)
    for (const k of ['"name"', '"email"', '"phone"', '"need"', '"phoneDeclined"', '"askedAbout"']) expect(prompt).toContain(k)
  })

  it('contains no amount of money, so it cannot leak one', () => {
    expect(prompt).not.toMatch(/\$\s?\d|\d\s?(?:dollars|aud)\b/i)
  })
})

describe('readModelOutput', () => {
  it('reads the JSON object, ignoring text around it, and coerces unknown values', () => {
    expect(readModelOutput('Sure: {"name":"Sam","email":"sam@example.com","phone":"","need":"x","phoneDeclined":"yes","askedAbout":"hack"} ok')).toEqual(
      read({ name: 'Sam', email: 'sam@example.com', need: 'x' }),
    )
  })

  it('returns null for prose or malformed JSON', () => {
    expect(readModelOutput('Thanks Sam, it is $99 a month.')).toBeNull()
    expect(readModelOutput('{not json}')).toBeNull()
    expect(readModelOutput('[1,2]')).toBeNull()
  })
})

describe('visitorDetails: only the visitor\'s own words get through', () => {
  const said = ['I run a cafe and want more bookings', "I'm Zoë O'Brien-Ngata", 'zoe.ob+cafe@example.com.au', '+61 (0)400 123-456']

  it('keeps details that are verbatim in what the visitor typed', () => {
    expect(
      visitorDetails(read({ name: "Zoë O'Brien-Ngata", email: 'Zoe.OB+cafe@example.com.au', phone: '+61 (0)400 123-456', need: 'want more bookings' }), said),
    ).toEqual({ name: "Zoë O'Brien-Ngata", email: 'zoe.ob+cafe@example.com.au', phone: '+61 (0)400 123-456', need: 'want more bookings' })
  })

  it.each([
    ['need', read({ need: 'We submit your business to online directories.' })],
    ['need', read({ need: 'Our pricing is great' })],
    ['name', read({ name: 'Restore Assist' })],
    ['email', read({ email: 'prices@example.com' })],
    ['phone', read({ phone: '0499 999 999' })],
  ])('drops a model-written %s the visitor never typed', (field, r) => {
    expect(visitorDetails(r, said)[field as 'need']).toBe('')
  })

  // Codex review, 17cd67c0: words split across turns must not be joined into a value the visitor never typed.
  it('never assembles a value from words split across visitor messages', () => {
    const split = ['I need a new', 'website', 'Sam', 'Lee', 'sam@', 'example.com', '0400', '000000']
    expect(visitorDetails(read({ need: 'new website', name: 'Sam Lee', email: 'sam@example.com', phone: '0400000000' }), split)).toEqual({
      name: '',
      email: '',
      phone: '',
      need: '',
    })
  })

  it('blanks a visitor-typed need that touches a guarded topic, and refuses prose as a name', () => {
    const typed = ['How much is it a month? I need help with my search ranking', 'Sam. We rank you on Google']
    expect(visitorDetails(read({ need: 'I need help with my search ranking', name: 'Sam. We rank you on Google' }), typed)).toEqual({
      name: '',
      email: '',
      phone: '',
      need: '',
    })
  })
})

describe('nextReply', () => {
  const lead = { name: 'Sam', email: 'sam@example.com', phone: '0400000000', need: 'more bookings' }

  it('asks for what is missing, in order, and only returns the capture once complete', () => {
    expect(nextReply(read(), { name: '', email: '', phone: '', need: '' })).toEqual({ reply: REPLY_TEMPLATES.askNeed, capture: null })
    expect(nextReply(read({ need: 'x' }), { ...lead, name: '', email: '', phone: '' })).toEqual({ reply: REPLY_TEMPLATES.askName, capture: null })
    expect(nextReply(read({ need: 'x' }), { ...lead, email: '', phone: '' }).reply).toBe(REPLY_TEMPLATES.askEmail)
    expect(nextReply(read({ need: 'x' }), { ...lead, phone: '' }).reply).toBe(REPLY_TEMPLATES.askPhone)
    expect(nextReply(read({ need: 'x', phoneDeclined: true }), { ...lead, phone: '' })).toEqual({
      reply: REPLY_TEMPLATES.captured,
      capture: { ...lead, phone: '' },
    })
    expect(nextReply(read({ need: 'x' }), lead)).toEqual({ reply: REPLY_TEMPLATES.captured, capture: lead })
  })

  it('moves on when a need was stated but could not be shown back', () => {
    expect(nextReply(read({ need: 'paraphrased by the model' }), { name: '', email: '', phone: '', need: '' }).reply).toBe(REPLY_TEMPLATES.askName)
  })

  it('prefixes the fixed deflection when the visitor asks about prices or methods, and retries on bad output', () => {
    expect(nextReply(read({ askedAbout: 'price' }), { name: '', email: '', phone: '', need: '' }).reply).toBe(
      `${REPLY_TEMPLATES.deflect} ${REPLY_TEMPLATES.askNeed}`,
    )
    expect(nextReply(null, lead)).toEqual({ reply: REPLY_TEMPLATES.retry, capture: null })
  })
})

describe('isRateLimited', () => {
  it(`allows ${BOT_LIMITS.ratePerWindow} messages per IP per minute, then refuses, then recovers`, () => {
    resetRateLimit()
    const t0 = 1_000_000
    for (let i = 0; i < BOT_LIMITS.ratePerWindow; i += 1) expect(isRateLimited('1.2.3.4', t0 + i)).toBe(false)
    expect(isRateLimited('1.2.3.4', t0 + 100)).toBe(true)
    expect(isRateLimited('5.6.7.8', t0 + 100)).toBe(false)
    expect(isRateLimited('1.2.3.4', t0 + BOT_LIMITS.rateWindowMs + 50)).toBe(false)
  })
})
