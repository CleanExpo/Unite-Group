// UNI-3021: tell the card owner about a stored enquiry, through the same Mailtrap path as the card order alerts.
// Best effort only: the enquiry row is already stored before this runs, and nothing here throws.
// The owner gets the whole enquiry (privacy policy 13.1: "store it, and pass it to the card owner"). Unite Group gets a
// minimal alert (card, first name, reference) so the message and the visitor's email stay in the database, as in section 10.

import { leadAlertEmailTo, mailtrapFromEmail, sendEmail } from '@/lib/integrations/mailtrap'
import { EMAIL_RE } from './enquiry'

export interface CardEnquiryAlert {
  reference: string
  cardSlug: string
  /** card_profiles.email: the contact address the owner published on the card. */
  ownerEmail: string | null
  firstName: string
  business: string | null
  ask: string
  replyEmail: string | null
}

const SEND_TIMEOUT_MS = 5000

function usableAddress(email: string | null | undefined): string | null {
  const value = email?.trim() || null
  return value && value.length <= 254 && EMAIL_RE.test(value) ? value : null
}

/** Whether an owner email can be attempted: a Mailtrap key is set and the card carries a usable owner address. */
export function canEmailCardOwner(ownerEmail: string | null | undefined): boolean {
  return Boolean(process.env.MAILTRAP_API_KEY?.trim()) && usableAddress(ownerEmail) !== null
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function ownerEmailBody(a: CardEnquiryAlert): { text: string; html: string } {
  const rows: [string, string][] = [
    ['From', a.firstName],
    ['Business', a.business ?? 'Not given'],
    ['Reply email', a.replyEmail ?? 'Not given'],
    ['Message', a.ask],
    ['Reference', a.reference],
  ]
  const intro = 'Someone sent you an enquiry through your Living Business Card.'
  const outro = a.replyEmail ? 'Reply to this email to answer them.' : 'They did not leave a reply email.'
  return {
    text: [intro, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', outro].join('\n'),
    html: `<p>${intro}</p>${rows.map(([k, v]) => `<p><strong>${k}:</strong><br>${escapeHtml(v).replace(/\n/g, '<br>')}</p>`).join('')}<p>${outro}</p>`,
  }
}

function logFailure(who: 'owner' | 'internal', reason: unknown): void {
  // The reason is a transport error (HTTP status or timeout); the enquiry itself is never logged.
  console.error(`[cards] enquiry ${who} email failed:`, reason instanceof Error ? reason.message : String(reason))
}

/** Send both emails at once. ownerNotified is true only when Mailtrap accepted the owner's email and gave a message id. */
export async function sendCardEnquiryAlerts(a: CardEnquiryAlert): Promise<{ ownerNotified: boolean }> {
  const from = { email: mailtrapFromEmail(), name: 'Unite Group' }
  const ownerAddress = usableAddress(a.ownerEmail)
  const internal = leadAlertEmailTo()
  const sameInbox = ownerAddress?.toLowerCase() === internal.toLowerCase()

  const ownerSend = ownerAddress
    ? sendEmail({
        to: { email: ownerAddress },
        from,
        subject: `New enquiry from your Living Business Card (${a.reference})`,
        ...ownerEmailBody(a),
        ...(a.replyEmail ? { replyTo: { email: a.replyEmail } } : {}),
        categories: ['card-enquiry'],
        timeoutMs: SEND_TIMEOUT_MS,
      })
    : Promise.resolve(null)
  const internalSend = sameInbox
    ? Promise.resolve(null)
    : sendEmail({
        to: { email: internal },
        from,
        subject: `Card enquiry ${a.reference} on /c/${a.cardSlug}`,
        text: `Card: /c/${a.cardSlug}\nFirst name: ${a.firstName}\nReference: ${a.reference}\nOwner emailed: ${ownerAddress ? 'attempted' : 'no owner email on the card'}`,
        html: `<p>Card: /c/${escapeHtml(a.cardSlug)}</p><p>First name: ${escapeHtml(a.firstName)}</p><p>Reference: ${escapeHtml(a.reference)}</p><p>Owner emailed: ${ownerAddress ? 'attempted' : 'no owner email on the card'}</p>`,
        categories: ['card-enquiry-alert'],
        timeoutMs: SEND_TIMEOUT_MS,
      })

  const [ownerResult, internalResult] = await Promise.allSettled([ownerSend, internalSend])
  if (ownerResult.status === 'rejected') logFailure('owner', ownerResult.reason)
  if (internalResult.status === 'rejected') logFailure('internal', internalResult.reason)
  return { ownerNotified: ownerResult.status === 'fulfilled' && typeof ownerResult.value === 'string' }
}
