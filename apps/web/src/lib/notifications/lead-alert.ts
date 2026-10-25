import { dedupKey } from './dedup-key'
import { GROW_PACKAGES } from '@/app/grow/packages'
import { EDITIONS } from '@/app/cards/editions'
import { sendEmail } from '@/lib/integrations/sendgrid'
import { createServiceClient } from '@/lib/supabase/service'

const CAP_MS = 6000

export type Outcome = 'sent' | 'failed' | 'unconfigured'
export type LogOutcome = Outcome | 'pending' | 'deduped'
export type NotifyResult = { email: Outcome | 'deduped' }
export type LeadAlertPayload = {
  type: 'new_lead'
  leadId: string
  firstName: string
  businessName: string | null
  interests: string | null
  capturedAt: string
}

export function packageLabel(interests: string | null): string {
  const grow = GROW_PACKAGES.find((item) => item.id === interests)
  if (grow) return grow.name
  if (interests === 'living-card') return 'Living card'
  if (interests?.startsWith('living-card:')) {
    const edition = EDITIONS.find((item) => item.name === interests.slice('living-card:'.length))
    if (edition) return `Living card: ${edition.name}`
  }
  return 'Not specified'
}

/** Every value packageLabel can return, so erasure can derive every keyed hash for one address. */
export function allPackageLabels(): string[] {
  return [...GROW_PACKAGES.map((item) => item.name), 'Living card',
    ...EDITIONS.map((item) => `Living card: ${item.name}`), 'Not specified']
}

function flatten(value: string): string {
  return Array.from(value.replace(/[\p{Cf}\u2028\u2029]/gu, '')).filter((character) => {
    const code = character.charCodeAt(0)
    return code > 31 && (code < 127 || code > 159)
  }).join('').slice(0, 80)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

export function buildAlertText(payload: LeadAlertPayload): { text: string; html: string } {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://unite-group.in'
  const baseUrl = new URL(base)
  if (!['https:', 'http:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) {
    throw new Error('Invalid alert base URL')
  }
  const link = new URL(`/founder/leads/${encodeURIComponent(payload.leadId)}`, baseUrl).toString()
  const lines = [flatten(payload.firstName), payload.businessName ? flatten(payload.businessName).trim() || 'Not given' : 'Not given', packageLabel(payload.interests)]
  return {
    text: [...lines, link, `Ref: ${payload.leadId}`].join('\n'),
    html: `${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}<p><a href="${escapeHtml(link)}">View enquiry</a></p><p>Ref: ${escapeHtml(payload.leadId)}</p>`,
  }
}

export function logAlertError(error: unknown): void {
  const detail = error as { name?: unknown; status?: unknown; code?: unknown } | null
  const name = error instanceof Error ? error.name : typeof detail?.name === 'string' ? detail.name : 'Error'
  const status = typeof detail?.status === 'number' ? detail.status : typeof detail?.code === 'number' ? detail.code : undefined
  console.error('[Notify] lead alert failed:', name, status)
}

export async function deliverLeadAlert(payload: LeadAlertPayload): Promise<NotifyResult> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      deliver(payload, controller.signal, Date.now()),
      new Promise<NotifyResult>((resolve) => {
        timer = setTimeout(() => {
          controller.abort()
          console.error('[Notify] lead alert failed:', 'TimeoutError')
          resolve({ email: 'failed' })
        }, CAP_MS)
      }),
    ])
  } catch (error) {
    logAlertError(error)
    return { email: 'failed' }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function deliver(payload: LeadAlertPayload, signal: AbortSignal, startedAt: number): Promise<NotifyResult> {
  const label = packageLabel(payload.interests)
  console.log(`[Notify] type=new_lead title="New enquiry" metadata=${JSON.stringify({ source_id: payload.leadId, package_label: label })}`)
  const founder = process.env.FOUNDER_USER_ID?.trim()
  let client: ReturnType<typeof createServiceClient> | undefined
  let claimed = false
  if (founder) {
    try {
      client = createServiceClient()
      const { data: lead, error: leadError } = await client.from('crm_leads').select('email')
        .eq('id', payload.leadId).eq('founder_id', founder).abortSignal(signal).single()
      if (leadError) throw leadError
      if (!lead?.email) throw new Error('Lead lookup failed')
      const key = dedupKey(founder, String(lead.email), label)
      if (key === null) console.error('[Notify] ALERT_DEDUP_SECRET not set: duplicate suppression is off')
      const { data, error } = await client.rpc('claim_alert', {
        p_founder: founder, p_kind: 'new_lead', p_source_id: payload.leadId,
        p_dedup_key: key, p_window_minutes: 60,
      }).abortSignal(signal)
      if (error) throw error
      if (!data?.some((row: { channel: string }) => row.channel === 'email')) return { email: 'deduped' }
      claimed = true
    } catch (error) {
      logAlertError(error)
    }
  }
  if (signal.aborted) return { email: 'failed' }
  let outcome: Outcome = 'unconfigured'
  const to = process.env.LEAD_ALERT_EMAIL_TO?.trim()
  const from = process.env.SENDGRID_FROM_EMAIL?.trim()
  if (to && from && process.env.SENDGRID_API_KEY?.trim()) {
    try {
      const content = buildAlertText(payload)
      // SendGrid must time out before the cap does, or an accepted email leaves its row pending.
      const timeoutMs = Math.min(5000, CAP_MS - (Date.now() - startedAt) - 500)
      if (timeoutMs < 1000) throw new Error('No time left to send')
      await sendEmail({ to: { email: to }, from: { email: from }, subject: 'New enquiry', ...content, timeoutMs, disableTracking: true })
      outcome = signal.aborted ? 'failed' : 'sent'
    } catch (error) {
      outcome = 'failed'
      logAlertError(error)
    }
  }
  if (claimed && client && !signal.aborted) {
    try {
      const { error } = await client.from('alert_delivery_log').update({ outcome, updated_at: new Date().toISOString() })
        .eq('founder_id', founder).eq('source_kind', 'new_lead').eq('source_id', payload.leadId)
        .eq('channel', 'email').eq('outcome', 'pending').abortSignal(signal)
      if (error) logAlertError(error)
    } catch (error) {
      logAlertError(error)
    }
  }
  return { email: outcome }
}
