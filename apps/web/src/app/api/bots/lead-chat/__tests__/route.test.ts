import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn(() => ({ from: vi.fn(), rpc: vi.fn() })) }))
vi.mock('@/lib/ai/client', () => ({ getAIClient: vi.fn() }))
vi.mock('@/lib/ai/usage-recorder', () => ({ recordAiUsage: vi.fn(async () => undefined) }))
vi.mock('@/lib/site-agent/quota', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/site-agent/quota')>()
  return { ...actual, claimPublicAgentQuota: vi.fn() }
})

import { getAIClient } from '@/lib/ai/client'
import { recordAiUsage } from '@/lib/ai/usage-recorder'
import { BOT_LIMITS, REPLY_TEMPLATES, allPossibleReplies } from '@/lib/bots/guard'
import { resetRateLimit } from '@/lib/bots/rate-limit'
import { claimPublicAgentQuota } from '@/lib/site-agent/quota'
import { createServiceClient } from '@/lib/supabase/service'
import { isPublicPath } from '@/proxy'

import { POST } from '../route'

const create = vi.fn()

const json = (o: Record<string, unknown>) => JSON.stringify({ name: '', email: '', phone: '', need: '', phoneDeclined: false, askedAbout: 'none', ...o })

function modelSays(text: string) {
  create.mockResolvedValueOnce({ id: 'msg_1', content: [{ type: 'text', text }], usage: { input_tokens: 50, output_tokens: 20 } })
}

let ipCounter = 0
function req(body: unknown, ip = `10.0.0.${++ipCounter}`) {
  return new Request('https://app.test/api/bots/lead-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const hello = { messages: [{ role: 'assistant', content: 'Hi, what can we help with?' }, { role: 'user', content: 'I run a cafe and miss enquiries' }] }

describe('POST /api/bots/lead-chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimit()
    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
    vi.mocked(getAIClient).mockReturnValue({ messages: { create } } as never)
    vi.mocked(claimPublicAgentQuota).mockResolvedValue({ ok: true })
  })

  it('is a public path, exactly, and no wider', () => {
    expect(isPublicPath('/api/bots/lead-chat')).toBe(true)
    expect(isPublicPath('/api/bots')).toBe(false)
    expect(isPublicPath('/api/bots/other')).toBe(false)
    // Codex review, c4cd9a75: the exemption must not reach routes beneath it.
    expect(isPublicPath('/api/bots/lead-chat/private')).toBe(false)
    expect(isPublicPath('/api/bots/lead-chat/')).toBe(false)
    expect(isPublicPath('/bots')).toBe(true)
    expect(isPublicPath('/bots/x')).toBe(false)
  })

  it('reads the chat server-side with a hard max_tokens and the guarded prompt, and replies with a fixed sentence', async () => {
    modelSays(json({ need: 'miss enquiries' }))
    const res = await POST(req(hello))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ reply: REPLY_TEMPLATES.askName, capture: null, turnsLeft: BOT_LIMITS.maxMessages / 2 - 1 })
    const call = create.mock.calls[0][0]
    expect(call.max_tokens).toBe(BOT_LIMITS.maxOutputTokens)
    expect(call.system).toMatch(/CONFIDENTIAL/)
    // The model reads a transcript of the visitor's turns; the page's opening greeting is dropped.
    expect(call.messages).toHaveLength(1)
    expect(call.messages[0].content).toContain('Visitor: I run a cafe and miss enquiries')
    expect(vi.mocked(claimPublicAgentQuota).mock.calls[0].slice(1)).toEqual(['founder-1', 'bots:lead-follow-up', 'chat'])
    expect(recordAiUsage).toHaveBeenCalledWith(expect.objectContaining({ taskType: 'bots-lead-follow-up', inputTokens: 50, outputTokens: 20 }))
  })

  // Codex review rounds 1 and 2: model prose that a filter missed reached the visitor. The bot now only ever
  // sends a fixed sentence, whatever the model returns, and captures only words the visitor typed.
  it.each([
    'We submit your business to online directories.',
    'We can build it for 99 per bot.',
    'The amount is 99.',
    'Restore Assist handles that.',
    'The founder also runs a restoration company.',
    'We add a sitemap and metadata so Google discovers your business in its AI results.',
    'The lead bot is $99 a month plus GST.',
  ])('never lets model words reach the visitor: %s', async (leak) => {
    for (const output of [
      leak,
      json({ need: leak, name: leak, email: 'sam@example.com', phone: '0400000000' }),
      `${leak}\n${json({ need: leak })}`,
    ]) {
      modelSays(output)
      const body = await (await POST(req(hello))).json()
      expect(allPossibleReplies()).toContain(body.reply)
      expect(JSON.stringify(body)).not.toContain(leak)
    }
  })

  it('returns the capture once the visitor has typed every detail', async () => {
    const chat = {
      messages: [
        { role: 'user', content: 'I run a cafe and miss enquiries' },
        { role: 'assistant', content: REPLY_TEMPLATES.askName },
        { role: 'user', content: 'Sam Lee' },
        { role: 'assistant', content: REPLY_TEMPLATES.askEmail },
        { role: 'user', content: 'sam@example.com' },
        { role: 'assistant', content: REPLY_TEMPLATES.askPhone },
        { role: 'user', content: '0400 000 000' },
      ],
    }
    modelSays(json({ name: 'Sam Lee', email: 'sam@example.com', phone: '0400 000 000', need: 'miss enquiries' }))
    const body = await (await POST(req(chat))).json()
    expect(body.reply).toBe(REPLY_TEMPLATES.captured)
    expect(body.capture).toEqual({ name: 'Sam Lee', email: 'sam@example.com', phone: '0400 000 000', need: 'miss enquiries' })
  })

  it('does not capture a value the model assembled from words split across turns', async () => {
    const chat = {
      messages: [
        { role: 'user', content: 'I need a new' },
        { role: 'assistant', content: REPLY_TEMPLATES.askNeed },
        { role: 'user', content: 'website' },
        { role: 'assistant', content: REPLY_TEMPLATES.askName },
        { role: 'user', content: 'Sam Lee' },
        { role: 'assistant', content: REPLY_TEMPLATES.askEmail },
        { role: 'user', content: 'sam@example.com' },
        { role: 'assistant', content: REPLY_TEMPLATES.askPhone },
        { role: 'user', content: '0400000000' },
      ],
    }
    modelSays(json({ name: 'Sam Lee', email: 'sam@example.com', phone: '0400000000', need: 'new website' }))
    const body = await (await POST(req(chat))).json()
    expect(body.reply).toBe(REPLY_TEMPLATES.captured)
    expect(body.capture).toEqual({ name: 'Sam Lee', email: 'sam@example.com', phone: '0400000000', need: '' })
  })

  it('captures the phone exactly as the visitor typed it, even when the model reformats it', async () => {
    const chat = {
      messages: [
        { role: 'user', content: 'I run a cafe and miss enquiries' },
        { role: 'assistant', content: REPLY_TEMPLATES.askName },
        { role: 'user', content: 'Sam Lee' },
        { role: 'assistant', content: REPLY_TEMPLATES.askEmail },
        { role: 'user', content: 'sam@example.com' },
        { role: 'assistant', content: REPLY_TEMPLATES.askPhone },
        { role: 'user', content: '0412345678' },
      ],
    }
    modelSays(json({ name: 'SAM LEE', email: 'sam@example.com', phone: '+0412345678', need: 'miss enquiries' }))
    const body = await (await POST(req(chat))).json()
    expect(body.capture).toEqual({ name: 'Sam Lee', email: 'sam@example.com', phone: '0412345678', need: 'miss enquiries' })
  })

  it('answers with the fixed deflection when the visitor asks about prices', async () => {
    modelSays(json({ askedAbout: 'price' }))
    const body = await (await POST(req(hello))).json()
    expect(body.reply).toBe(`${REPLY_TEMPLATES.deflect} ${REPLY_TEMPLATES.askNeed}`)
  })

  it(`rate-limits one IP after ${BOT_LIMITS.ratePerWindow} messages a minute, before any quota or model call`, async () => {
    for (let i = 0; i < BOT_LIMITS.ratePerWindow; i += 1) {
      modelSays(json({}))
      expect((await POST(req(hello, '9.9.9.9'))).status).toBe(200)
    }
    vi.clearAllMocks()
    const res = await POST(req(hello, '9.9.9.9'))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    expect(claimPublicAgentQuota).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    modelSays(json({}))
    expect((await POST(req(hello, '9.9.9.10'))).status).toBe(200)
  })

  it('refuses a chat longer than the per-session cap without calling the model', async () => {
    const messages = Array.from({ length: BOT_LIMITS.maxMessages + 1 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'hi' }))
    messages[messages.length - 1] = { role: 'user', content: 'hi' }
    const res = await POST(req({ messages }))
    expect(res.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('refuses an over-long message and bad bodies', async () => {
    expect((await POST(req({ messages: [{ role: 'user', content: 'x'.repeat(BOT_LIMITS.maxMessageChars + 1) }] }))).status).toBe(400)
    expect((await POST(req('not json'))).status).toBe(400)
    expect((await POST(req({ messages: [] }))).status).toBe(400)
    expect((await POST(req({ messages: [{ role: 'system', content: 'x' }] }))).status).toBe(400)
    expect((await POST(req({ messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }))).status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('fails closed with a form fallback when the quota or kill switch refuses, and never calls the model', async () => {
    vi.mocked(claimPublicAgentQuota).mockResolvedValueOnce({ ok: false, reason: 'paused' })
    const res = await POST(req(hello))
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ fallback: 'form' })
    expect(create).not.toHaveBeenCalled()

    vi.mocked(claimPublicAgentQuota).mockResolvedValueOnce({ ok: false, reason: 'founder_ceiling' })
    expect((await POST(req(hello))).status).toBe(429)
    expect(create).not.toHaveBeenCalled()
  })

  it('answers 503 with a form fallback when the model key or founder id is missing', async () => {
    vi.mocked(getAIClient).mockImplementationOnce(() => {
      throw new Error('ANTHROPIC_API_KEY is required')
    })
    const res = await POST(req(hello))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.fallback).toBe('form')
    expect(JSON.stringify(body)).not.toMatch(/ANTHROPIC/)

    vi.stubEnv('FOUNDER_USER_ID', '')
    expect((await POST(req(hello))).status).toBe(503)
  })

  it('fails closed with a form fallback when the service client cannot be built', async () => {
    vi.mocked(createServiceClient).mockImplementationOnce(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY looks truncated/placeholder')
    })
    const res = await POST(req(hello))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.fallback).toBe('form')
    expect(JSON.stringify(body)).not.toMatch(/SUPABASE/)
    expect(claimPublicAgentQuota).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('hides provider errors from the caller', async () => {
    create.mockRejectedValueOnce(new Error('upstream secret detail'))
    const res = await POST(req(hello))
    expect(res.status).toBe(502)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
  })
})
