// Owner-sent review request text and links. Pure, browser-safe (no node imports): the owner's form uses these to fill
// in a text or email that the owner sends from their own phone or account. We send nothing.

/**
 * The pre-filled message. Same words for every customer: no "were you happy?" filter, no discount, prize or other
 * incentive (Google review policy, ACCC). It names the sender and says how to stop further asks (Spam Act).
 */
export function buildRequestMessage(p: { firstName: string; senderName: string; businessName: string | null; link: string }): string {
  const from = p.businessName ? `${p.senderName} from ${p.businessName}` : p.senderName
  return [
    `Hi ${p.firstName}, it's ${from}. Thanks for having us out.`,
    `If you have a minute, would you leave an honest Google review? It helps other people decide.`,
    p.link,
    `Reply STOP and I won't ask again.`,
  ].join('\n')
}

/** Words that would make a request an incentive or a filter. The message and owner copy must contain none of them. */
export const BANNED_REQUEST_WORDS = [
  'discount', 'voucher', 'prize', 'draw', 'reward', 'gift', 'free', 'win', '% off', 'coupon',
  'happy', 'satisfied', '5 star', 'five star', '5-star', 'positive review', 'good review',
]

export function bannedWordsIn(text: string): string[] {
  const lower = text.toLowerCase()
  return BANNED_REQUEST_WORDS.filter((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\%]/g, '\\$&')}([^a-z]|$)`).test(lower))
}

/** sms: link the owner's phone opens with the text filled in. iOS and Android both accept ?body=. */
export function smsHref(mobile: string, body: string): string {
  return `sms:${mobile}?body=${encodeURIComponent(body)}`
}

export function mailtoHref(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** The link inside the message: through our redirect, so the open is counted against this request (no personal data). */
export function requestReviewLink(baseUrl: string, slug: string, requestId: string): string {
  return `${baseUrl}/c/${slug}/review?q=${encodeURIComponent(requestId)}`
}
