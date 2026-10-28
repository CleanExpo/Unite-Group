import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/calendar-write', () => ({ createCalendarEvent: vi.fn() }))

import { NextRequest } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/integrations/calendar-write'
import { POST } from '../route'

const valid = {
  email: 'founder@example.test',
  title: 'Standup',
  startIso: '2026-11-01T09:00:00Z',
  endIso: '2026-11-01T09:30:00Z',
  description: 'daily',
  timeZone: 'Australia/Brisbane',
}

function req(body: unknown, raw = false) {
  return new NextRequest('http://localhost/api/calendar/events', {
    method: 'POST',
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

describe('POST /api/calendar/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    vi.mocked(createCalendarEvent).mockResolvedValue({ id: 'evt-1' } as never)
  })

  it('refuses unauthenticated requests without creating an event', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(req(valid))
    expect(res.status).toBe(401)
    expect(createCalendarEvent).not.toHaveBeenCalled()
  })

  it('rejects a body missing required fields with 400', async () => {
    const res = await POST(req({ ...valid, endIso: undefined }))
    expect(res.status).toBe(400)
    expect(createCalendarEvent).not.toHaveBeenCalled()
  })

  it('rejects unparseable JSON with 400', async () => {
    const res = await POST(req('nope', true))
    expect(res.status).toBe(400)
    expect(createCalendarEvent).not.toHaveBeenCalled()
  })

  it('creates the event for the signed-in founder and returns 201', async () => {
    const res = await POST(req(valid))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true, event: { id: 'evt-1' } })
    expect(createCalendarEvent).toHaveBeenCalledWith('user-123', valid.email, {
      title: valid.title,
      startIso: valid.startIso,
      endIso: valid.endIso,
      description: valid.description,
      timeZone: valid.timeZone,
    })
  })

  it('surfaces a calendar write failure as 400 with the message', async () => {
    vi.mocked(createCalendarEvent).mockRejectedValue(new Error('account not connected'))
    const res = await POST(req(valid))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'account not connected' })
  })
})
