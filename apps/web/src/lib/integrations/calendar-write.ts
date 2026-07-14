// src/lib/integrations/calendar-write.ts
// Google Calendar WRITE (WS2 P4). The read side lives in calendar.ts; this adds
// create, reusing the same per-account token flow (credentials_vault → decrypt →
// getValidToken). The event-body builder is pure + tested; the API call is the
// edge. Defaults to AEST (en-AU).

import { getValidToken, isGoogleConfigured, type StoredTokens } from './google-oauth'

export interface CreateEventInput {
  title: string
  /** ISO 8601 start. */
  startIso: string
  /** ISO 8601 end. */
  endIso: string
  description?: string
  /** IANA time zone; defaults to Australia/Brisbane (AEST). */
  timeZone?: string
}

export interface GoogleEventBody {
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
}

/** Build + validate a Google Calendar event body. Pure. */
export function buildEventBody(input: CreateEventInput): GoogleEventBody {
  const title = input.title?.trim()
  if (!title) throw new Error('buildEventBody: title is required')
  const start = new Date(input.startIso)
  const end = new Date(input.endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('buildEventBody: startIso/endIso must be valid ISO dates')
  }
  if (end.getTime() <= start.getTime()) {
    throw new Error('buildEventBody: end must be after start')
  }
  const timeZone = input.timeZone ?? 'Australia/Brisbane'
  const body: GoogleEventBody = {
    summary: title,
    start: { dateTime: input.startIso, timeZone },
    end: { dateTime: input.endIso, timeZone },
  }
  if (input.description) body.description = input.description
  return body
}

/** Create an event on the given account's primary calendar. Edge (needs Google + vault). */
export async function createCalendarEvent(
  founderId: string,
  email: string,
  input: CreateEventInput
): Promise<{ id: string; htmlLink?: string }> {
  if (!isGoogleConfigured()) throw new Error('Google is not configured')

  const { createServiceClient } = await import('@/lib/supabase/service')
  const { decrypt } = await import('@/lib/vault')
  const supabase = createServiceClient()

  const { data: rows } = await supabase
    .from('credentials_vault')
    .select('encrypted_value, iv, salt, notes')
    .eq('founder_id', founderId)
    .eq('service', 'google')

  const row = (rows ?? []).find((r) => (r.notes ?? '') === email)
  if (!row) throw new Error(`no connected Google account for ${email}`)

  const tokens: StoredTokens = JSON.parse(
    decrypt({ encryptedValue: row.encrypted_value, iv: row.iv, salt: row.salt })
  )
  const accessToken = await getValidToken(tokens)
  const body = buildEventBody(input)

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    throw new Error(`calendar create failed (${res.status}): ${await res.text()}`)
  }
  const created = (await res.json()) as { id: string; htmlLink?: string }
  return { id: created.id, htmlLink: created.htmlLink }
}
