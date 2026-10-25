// src/lib/integrations/email-provider.ts
// One send path for alert and notification email.
//   1. MAILTRAP_API_KEY set (and, for no-tracking messages, MAILTRAP_TRACKING_DISABLED=true)
//      -> Mailtrap Email Sending API (the sender CARSI uses:
//      same endpoint and request shape as CARSI src/lib/server/email.ts).
//   2. else SendGrid (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL) -> existing client.
//   3. else nothing is configured and callers keep their "unconfigured" behaviour.
// The provider is chosen by configuration, never by a failed send, so one message
// is never delivered twice. A failed send always throws; it never looks like success.
// Unlike CARSI's helper there is no dev-console mode: that mode reports sent=true
// for mail that was never delivered, which an alert pipeline must not do.
// Env values are read only to send. They are never logged, returned or put in an error.

import { sendEmail as sendViaSendGrid, type SendEmailInput } from '@/lib/integrations/sendgrid'

export type { SendEmailInput }

export type EmailProvider = 'mailtrap' | 'sendgrid'

/** Sender used when EMAIL_FROM is not set. */
export const DEFAULT_EMAIL_FROM = 'alerts@unite-group.in'

// Same constant as CARSI src/lib/server/email.ts.
const MAILTRAP_SEND_URL = 'https://send.api.mailtrap.io/api/send'
const DEFAULT_TIMEOUT_MS = 15_000

export class EmailSendError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'EmailSendError'
    this.status = status
  }
}

export interface ResolvedSender {
  provider: EmailProvider
  /** Sender address for the chosen provider ("name <address>" is accepted for Mailtrap). */
  from: string
}

export interface ResolveOptions {
  /**
   * The message must not be click- or open-tracked. SendGrid can switch tracking off per message.
   * Mailtrap tracks per sending domain in its dashboard and the API cannot override it, so Mailtrap
   * is eligible for such a message only once the founder has confirmed the domain setting by setting
   * MAILTRAP_TRACKING_DISABLED=true.
   */
  noTracking?: boolean
}

/** Which provider will send, and from where. Null when no provider is configured. */
export function resolveEmailSender(options: ResolveOptions = {}): ResolvedSender | null {
  const trackingOk = !options.noTracking || process.env.MAILTRAP_TRACKING_DISABLED?.trim() === 'true'
  if (process.env.MAILTRAP_API_KEY?.trim() && trackingOk) {
    return { provider: 'mailtrap', from: process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM }
  }
  const sendgridFrom = process.env.SENDGRID_FROM_EMAIL?.trim()
  if (process.env.SENDGRID_API_KEY?.trim() && sendgridFrom) {
    return { provider: 'sendgrid', from: sendgridFrom }
  }
  return null
}

type Address = { email: string; name?: string }

// Same parsing as CARSI: "Name <address>" or a bare address.
function parseEmailAddress(raw: string): Address {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, '')
    return { name: name || undefined, email: match[2].trim() }
  }
  return { email: trimmed }
}

// A display name must not hold angle brackets (it would read as a second address). One bare address: no whitespace, control characters, angle brackets, quotes or second @.
const BARE_ADDRESS = /^[^\s<>"@\u0000-\u001f\u007f]+@[^\s<>"@\u0000-\u001f\u007f]+$/
// Control characters are rejected before any parsing: the "Name <address>" pattern would
// otherwise skip a value containing a line break and pass it through as a bare address.
const CONTROL = /[\u0000-\u001f\u007f]/

function toAddress(person: Address): Address {
  if (CONTROL.test(person.email) || (person.name !== undefined && CONTROL.test(person.name))) {
    throw new EmailSendError('[Mailtrap] invalid address')
  }
  const parsed = person.name ? { email: person.email.trim(), name: person.name } : parseEmailAddress(person.email)
  if (!BARE_ADDRESS.test(parsed.email) || (parsed.name !== undefined && (CONTROL.test(parsed.name) || /[<>]/.test(parsed.name)))) {
    throw new EmailSendError('[Mailtrap] invalid address')
  }
  const name = parsed.name?.trim()
  return name ? { email: parsed.email, name } : { email: parsed.email }
}

async function sendViaMailtrap(input: SendEmailInput): Promise<string> {
  const key = process.env.MAILTRAP_API_KEY?.trim()
  if (!key) throw new EmailSendError('[Mailtrap] MAILTRAP_API_KEY not configured')

  const recipients = Array.isArray(input.to) ? input.to : [input.to]
  const payload: Record<string, unknown> = {
    from: toAddress(input.from),
    to: recipients.map(toAddress),
    subject: input.subject,
    html: input.html,
  }
  if (input.text) payload.text = input.text
  if (input.replyTo) payload.reply_to = toAddress(input.replyTo)

  let response: Response
  try {
    response = await fetch(MAILTRAP_SEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(input.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      redirect: 'error',
    })
  } catch {
    // Network failure or timeout. The cause is dropped on purpose: it can echo request details.
    throw new EmailSendError('[Mailtrap] request failed')
  }

  const parsed = await response
    .json()
    .then((body: unknown) => (body && typeof body === 'object' ? (body as { success?: unknown; message_ids?: unknown }) : null))
    .catch(() => null)

  if (!response.ok || parsed?.success === false) {
    throw new EmailSendError(`[Mailtrap] send failed (HTTP ${response.status})`, response.status)
  }

  const first = Array.isArray(parsed?.message_ids) ? parsed.message_ids[0] : undefined
  const messageId = typeof first === 'string' ? first.trim() : ''
  if (!messageId) {
    throw new EmailSendError('[Mailtrap] accepted without a message id', response.status)
  }
  return messageId
}

/**
 * Send one email through the configured provider. Returns the provider message id.
 * Throws EmailSendError (Mailtrap) or the SendGrid client's error on any failure.
 */
export async function sendEmail(input: SendEmailInput): Promise<string> {
  if (resolveEmailSender({ noTracking: input.disableTracking })?.provider === 'mailtrap') return sendViaMailtrap(input)
  return sendViaSendGrid(input)
}
