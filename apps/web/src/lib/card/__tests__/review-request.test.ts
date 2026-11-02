import { describe, expect, it, vi } from 'vitest'

import { bannedWordsIn, buildRequestMessage, mailtoHref, requestReviewLink, smsHref } from '../review-message'
import { loadOwnerCards, savePlaceId } from '../review-owner'
import {
  createReviewRequest, normaliseContact, recipientHash, recordReviewOptOut, validateReviewRequest, type ReviewRequestInput,
} from '../review-request'
import { getCardReviewLink, logReviewEvent } from '../review-store'

const base: ReviewRequestInput = { slug: 'sam', firstName: 'Jo', contact: '0412 345 678', channel: 'owner_sms', consent: true }
const rpcClient = (result: { data: unknown; error: { message: string } | null }) => {
  const rpc = vi.fn().mockResolvedValue(result)
  return { c: { rpc }, rpc }
}

describe('consent is required', () => {
  it('refuses without the tick and never reaches the database', async () => {
    for (const consent of [false, undefined, 'yes', 1] as unknown as boolean[]) {
      const m = rpcClient({ data: [{ id: 'x', outcome: 'created' }], error: null })
      const r = await createReviewRequest(m.c, { ...base, consent })
      expect(r).toMatchObject({ ok: false, status: 400 })
      expect(m.rpc).not.toHaveBeenCalled()
    }
  })

  it('maps the database consent refusal too (defence in depth)', async () => {
    const m = rpcClient({ data: null, error: { message: 'card_review_consent_required' } })
    expect(await createReviewRequest(m.c, base)).toMatchObject({ ok: false, status: 400 })
  })
})

describe('the raw contact never leaves the app', () => {
  it('sends the database a sha256 hash, never the number or email', async () => {
    const m = rpcClient({ data: [{ id: 'req-1', outcome: 'created' }], error: null })
    await createReviewRequest(m.c, base)
    const [fn, args] = m.rpc.mock.calls[0]
    expect(fn).toBe('card_create_review_request')
    expect(args.p_recipient_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(args.p_consent).toBe(true)
    expect(JSON.stringify(args)).not.toMatch(/0412|\+614/)
  })

  it('normalises the same person to the same hash, so dedupe and opt-out hold across spellings', () => {
    const a = normaliseContact('0412 345 678')!
    const b = normaliseContact('+61 412-345-678')!
    expect(recipientHash('sam', a)).toBe(recipientHash('sam', b))
    expect(recipientHash('sam', normaliseContact('Jo@Example.com ')!)).toBe(recipientHash('sam', normaliseContact('jo@example.com')!))
    // scoped to the card: another business gets an unrelated hash for the same customer
    expect(recipientHash('sam', a)).not.toBe(recipientHash('other', a))
  })

  it('refuses contacts it cannot normalise, and a channel that does not match the contact', () => {
    expect(validateReviewRequest({ ...base, contact: '12345' }).ok).toBe(false)
    expect(validateReviewRequest({ ...base, contact: 'jo@example.com', channel: 'owner_sms' }).ok).toBe(false)
    expect(validateReviewRequest({ ...base, channel: 'owner_email' }).ok).toBe(false)
    expect(validateReviewRequest({ ...base, channel: 'sent_email' as never }).ok).toBe(false)
    expect(validateReviewRequest({ ...base, firstName: '   ' }).ok).toBe(false)
    expect(validateReviewRequest({ ...base, slug: '../x' }).ok).toBe(false)
  })
})

describe('one request per recipient per job (day), opt-out respected', () => {
  it('a repeat for the same customer returns the same request as a duplicate', async () => {
    const m = rpcClient({ data: [{ id: 'req-1', outcome: 'duplicate' }], error: null })
    expect(await createReviewRequest(m.c, base)).toEqual({ ok: true, requestId: 'req-1', duplicate: true })
  })

  it('an opted-out customer is refused, with no request id to send', async () => {
    const m = rpcClient({ data: [{ id: null, outcome: 'opted_out' }], error: null })
    expect(await createReviewRequest(m.c, base)).toMatchObject({ ok: false, status: 409 })
  })

  it('anything other than a row id with a known outcome is an error, never a success', async () => {
    for (const data of [null, [], [{ outcome: 'created' }], [{ id: 'x', outcome: 'weird' }]]) {
      expect((await createReviewRequest(rpcClient({ data, error: null }).c, base)).ok).toBe(false)
    }
    expect(await createReviewRequest(rpcClient({ data: null, error: { message: 'card_review_not_owner' } }).c, base)).toMatchObject({ status: 403 })
    expect(await createReviewRequest(rpcClient({ data: null, error: { message: 'boom' } }).c, base)).toMatchObject({ status: 500 })
  })

  it('records an opt-out by hash only, and only reports success on true', async () => {
    const m = rpcClient({ data: true, error: null })
    expect(await recordReviewOptOut(m.c, 'sam', '0412345678')).toEqual({ ok: true })
    expect(m.rpc.mock.calls[0][1]).toEqual({ p_card_slug: 'sam', p_recipient_hash: recipientHash('sam', normaliseContact('0412345678')!) })
    expect((await recordReviewOptOut(rpcClient({ data: null, error: null }).c, 'sam', '0412345678')).ok).toBe(false)
    expect((await recordReviewOptOut(rpcClient({ data: true, error: null }).c, 'sam', 'nope')).ok).toBe(false)
  })
})

describe('the message: no gating, no incentives, sender named, STOP offered', () => {
  const msg = buildRequestMessage({ firstName: 'Jo', senderName: 'Sam Smith', businessName: 'Sam Co', link: 'https://unite-group.in/c/sam/review?q=1' })

  it('names the sender, carries the link and a way to stop', () => {
    expect(msg).toContain('Sam Smith from Sam Co')
    expect(msg).toContain('https://unite-group.in/c/sam/review?q=1')
    expect(msg).toContain('Reply STOP')
  })

  it('contains no incentive or happy-customer filter wording', () => {
    expect(bannedWordsIn(msg)).toEqual([])
  })

  it('the word check catches the wording it is there to catch (control)', () => {
    expect(bannedWordsIn('Were you happy? Leave a 5 star review for 10% off')).toEqual(expect.arrayContaining(['happy', '5 star', '% off']))
    expect(bannedWordsIn('Go in the draw to win a gift card')).toEqual(expect.arrayContaining(['draw', 'win', 'gift']))
    expect(bannedWordsIn('window')).toEqual([])
  })

  it('builds owner-sent sms: and mailto: links with the message encoded', () => {
    expect(smsHref('+61412345678', 'a b&c')).toBe('sms:+61412345678?body=a%20b%26c')
    expect(mailtoHref('jo@example.com', 'Hi', 'a\nb')).toBe('mailto:jo@example.com?subject=Hi&body=a%0Ab')
    expect(requestReviewLink('https://unite-group.in', 'sam', 'abc')).toBe('https://unite-group.in/c/sam/review?q=abc')
  })
})

describe('review link store', () => {
  const reader = (result: { data: unknown; error: { message: string } | null }) => {
    const maybeSingle = vi.fn().mockResolvedValue(result)
    return { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })), rpc: vi.fn() } as never
  }
  it('ready, none and unavailable are three different answers', async () => {
    const pub = '2026-11-02T00:00:00Z'
    expect(await getCardReviewLink('sam', reader({ data: { google_place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4', published_at: pub }, error: null })))
      .toEqual({ state: 'ready', url: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4' })
    expect(await getCardReviewLink('sam', reader({ data: { google_place_id: null, published_at: pub }, error: null }))).toEqual({ state: 'none' })
    expect(await getCardReviewLink('sam', reader({ data: { google_place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4', published_at: null }, error: null }))).toEqual({ state: 'none' })
    expect(await getCardReviewLink('sam', reader({ data: { google_place_id: 'bad id', published_at: pub }, error: null }))).toEqual({ state: 'none' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await getCardReviewLink('sam', reader({ data: null, error: { message: 'column card_profiles.google_place_id does not exist' } }))).toEqual({ state: 'unavailable' })
  })

  it('logs an event with no personal fields and reports false on any failure', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null })
    expect(await logReviewEvent({ slug: 'sam', kind: 'review_tap', uaClass: 'mobile' }, { rpc } as never)).toBe(true)
    expect(rpc).toHaveBeenCalledWith('card_log_review_event', { p_card_slug: 'sam', p_kind: 'review_tap', p_request_id: null, p_ua_class: 'mobile' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await logReviewEvent({ slug: 'sam', kind: 'review_tap' }, { rpc: vi.fn().mockRejectedValue(new Error('down')) } as never)).toBe(false)
    expect(await logReviewEvent({ slug: 'sam', kind: 'review_tap' }, { rpc: vi.fn().mockResolvedValue({ data: false, error: null }) } as never)).toBe(false)
    expect(await logReviewEvent({ slug: '../x', kind: 'review_tap' }, { rpc } as never)).toBe(false)
  })
})

describe('owner settings', () => {
  it('a failed read is an error, never an empty list', async () => {
    const client = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'x' } }) })) })) }
    expect(await loadOwnerCards(client as never, 'f1')).toEqual({ status: 'error', message: 'could not read your cards' })
  })

  it('scopes the card list to the signed-in founder', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [], error: null })
    const client = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })) }
    expect(await loadOwnerCards(client as never, 'f1')).toEqual({ status: 'ok', cards: [] })
    expect(eq).toHaveBeenCalledWith('founder_id', 'f1')
  })

  it('saves a valid Place ID, refuses junk without writing, and treats zero updated rows as not saved', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ card_slug: 'sam' }], error: null })
    const update = vi.fn(() => ({ eq: vi.fn(() => ({ select })) }))
    const client = { from: vi.fn(() => ({ update })) }
    expect(await savePlaceId(client as never, 'sam', ' ChIJN1t_tDeuEmsRUsoyG83frY4 ')).toEqual({ ok: true, placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4' })
    expect(update).toHaveBeenCalledWith({ google_place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4' })
    update.mockClear()
    expect((await savePlaceId(client as never, 'sam', 'https://evil.example')).ok).toBe(false)
    expect(update).not.toHaveBeenCalled()
    select.mockResolvedValueOnce({ data: [], error: null })
    expect((await savePlaceId(client as never, 'sam', 'ChIJN1t_tDeuEmsRUsoyG83frY4')).ok).toBe(false)
  })
})
