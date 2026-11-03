import { describe, expect, it } from 'vitest'

import { BOT_LIMITS, SAFE_DEFLECTION, buildLeadBotSystemPrompt, extractLead, guardReply } from '../guard'
import { isRateLimited, resetRateLimit } from '../rate-limit'

describe('guardReply', () => {
  it('lets a clean reply through unchanged', () => {
    const clean = 'Thanks Sam. What is the best email for the team to reach you on?'
    expect(guardReply(clean)).toEqual({ text: clean, blocked: false })
  })

  it.each([
    'We add schema markup to your site so Google understands it.',
    'Structured data is how we do it.',
    'Our JSON-LD setup gets you cited.',
    'We use SEO and GEO tactics.',
    'Your business gets found in AI search answers.',
    'We improve your search visibility over time.',
    'This lifts your rankings in a few weeks.',
    'We publish an llms.txt file for you.',
  ])('replaces a reply that describes the confidential method: %s', (reply) => {
    expect(guardReply(reply)).toEqual({ text: SAFE_DEFLECTION, blocked: true, rule: 'confidential' })
  })

  it.each([
    'The lead bot is $99 a month.',
    'It is A$1,500 to set up.',
    'That comes to 200 dollars.',
    'Prices start low, plus GST.',
    'Our pricing is simple.',
    'It costs less than a receptionist.',
  ])('replaces a reply that gives a price: %s', (reply) => {
    expect(guardReply(reply)).toEqual({ text: SAFE_DEFLECTION, blocked: true, rule: 'price' })
  })

  it.each(['CARSI can help with that.', 'Try Disaster Recovery.', 'NRPG members get this.', 'RestoreAssist does that.'])(
    'replaces a reply that names one of the founder\'s other businesses: %s',
    (reply) => {
      expect(guardReply(reply)).toMatchObject({ blocked: true, rule: 'other-business' })
    },
  )

  it('does not let a restaurant or cafe enquiry trip the guard', () => {
    expect(guardReply('Happy to help your restaurant answer more enquiries.').blocked).toBe(false)
  })

  it('the deflection itself is clean', () => {
    expect(guardReply(SAFE_DEFLECTION).blocked).toBe(false)
  })
})

describe('buildLeadBotSystemPrompt', () => {
  const prompt = buildLeadBotSystemPrompt()

  it('carries the confidentiality guard and the no-price rule', () => {
    expect(prompt).toMatch(/CONFIDENTIAL: never describe, hint at or explain how Unite Group gets clients found in search/)
    expect(prompt).toMatch(/NO PRICES: never give a price/)
    expect(prompt).toMatch(/never mention restoration, disaster recovery or training businesses/)
  })

  it('contains no amount of money, so it cannot leak one', () => {
    expect(prompt).not.toMatch(/\$\s?\d|\d\s?(?:dollars|aud)\b/i)
  })

  it('asks for the four lead fields', () => {
    for (const k of ['"name"', '"email"', '"phone"', '"need"']) expect(prompt).toContain(k)
  })
})

describe('extractLead', () => {
  it('returns the lead and strips the block from the visible text', () => {
    const reply = 'Thanks Sam, I have it all.\n<lead>{"name":"Sam Lee","email":"Sam@Example.com","phone":"0400 000 000","need":"More bookings"}</lead>'
    expect(extractLead(reply)).toEqual({
      text: 'Thanks Sam, I have it all.',
      lead: { name: 'Sam Lee', email: 'sam@example.com', phone: '0400 000 000', need: 'More bookings' },
    })
  })

  it('drops a block with an invalid email, never showing it', () => {
    expect(extractLead('Ok <lead>{"name":"Sam","email":"nope","phone":"","need":"x"}</lead>')).toEqual({ text: 'Ok', lead: null })
  })

  it('drops a malformed block', () => {
    expect(extractLead('Ok <lead>{not json</lead>')).toEqual({ text: 'Ok', lead: null })
    expect(extractLead('Ok <lead>{"name":"a"')).toEqual({ text: 'Ok', lead: null })
  })

  it('returns plain text when there is no block', () => {
    expect(extractLead('  What is your name?  ')).toEqual({ text: 'What is your name?', lead: null })
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
