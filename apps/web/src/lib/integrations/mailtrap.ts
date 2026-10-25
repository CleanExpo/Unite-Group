// src/lib/integrations/mailtrap.ts
// Minimal Mailtrap Email Sending client (same provider CARSI uses). No SDK, one fetch.
// Safe no-op: without MAILTRAP_API_KEY it logs a warning and returns null, it never throws for that.

export interface MailtrapRecipient {
  email: string
  name?: string
}

export interface MailtrapSendInput {
  to: MailtrapRecipient | MailtrapRecipient[]
  from: MailtrapRecipient
  subject: string
  html: string
  text?: string
  replyTo?: MailtrapRecipient
  /** Mailtrap accepts one category; the first is used. */
  categories?: string[]
  /** Kept for call-site compatibility; tracking is set per sending domain in Mailtrap. */
  disableTracking?: boolean
  timeoutMs?: number
}

export const MAILTRAP_SEND_URL = 'https://send.api.mailtrap.io/api/send'
export const DEFAULT_FROM_EMAIL = 'contact@unite-group.in'

/** Sender address for Unite-Group mail: MAILTRAP_FROM_EMAIL, else contact@unite-group.in. */
export function mailtrapFromEmail(): string {
  return process.env.MAILTRAP_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL
}

/** Send one email. Returns the first message id, or null when no API key is set. Throws on HTTP errors. */
export async function sendEmail(input: MailtrapSendInput): Promise<string | null> {
  const key = process.env.MAILTRAP_API_KEY?.trim()
  if (!key) {
    console.warn('[mailtrap] send skipped: MAILTRAP_API_KEY not set')
    return null
  }
  const body: Record<string, unknown> = {
    from: input.from,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
  }
  if (input.text) body.text = input.text
  if (input.replyTo) body.reply_to = input.replyTo
  if (input.categories?.[0]) body.category = input.categories[0]
  const res = await fetch(MAILTRAP_SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(input.timeoutMs ?? 10_000),
  })
  if (!res.ok) throw new Error(`[mailtrap] send failed: HTTP ${res.status}`)
  const json = (await res.json().catch(() => ({}))) as { message_ids?: string[] }
  return json.message_ids?.[0] ?? null
}
