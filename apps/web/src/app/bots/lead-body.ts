// The /api/leads body for a lead from the /bots demo (UNI-3217). The demo writes through the existing
// public lead capture (crm_leads, UNI-2355) rather than a second write path. Exported so the wire contract
// is tested, not paraphrased.

export const BOTS_OFFER_ID = 'bots-lead-follow-up'

export type BotLeadInput = {
  name: string
  email: string
  phone: string
  need: string
  marketingConsent: boolean
  /** 'chat' when the bot gathered the details, 'form' when the visitor used the fallback form. */
  via: 'chat' | 'form'
}

export function buildBotLeadBody(input: BotLeadInput) {
  const name = input.name.trim()
  const [first, ...rest] = name.split(/\s+/)
  const phone = input.phone.trim()
  return {
    first_name: first || name,
    last_name: rest.length ? rest.join(' ') : undefined,
    email: input.email.trim().toLowerCase(),
    phone: phone || undefined,
    interests: BOTS_OFFER_ID,
    message: [`Offer: ${BOTS_OFFER_ID}`, `Captured by: ${input.via === 'chat' ? 'lead follow-up demo bot' : 'demo fallback form'}`, `Need: ${input.need.trim()}`].join('\n'),
    referral_source: `${BOTS_OFFER_ID}:${input.via}`,
    marketing_consent: input.marketingConsent,
    business_key: 'unite-smb',
  }
}
