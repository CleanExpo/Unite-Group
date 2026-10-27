import { formatAud } from '@/app/grow/packages'
import { PLUS_GST, SIGNATURE_ADDON, STARTER_PLAN, liveCardTiers } from '@/lib/public-pricing'
import { CONTACT_EMAIL, PRICE_NOTE } from '@/lib/public-site'

import { HOME_FAQ } from './home/copy'
import s from './layout/public.module.css'
import { SectionIntro } from './section-intro'

export function answers() {
  const live = liveCardTiers()
  const card = live.length
    ? `${live.map((t) => `${t.name} is ${formatAud(t.priceAud)}`).join(' and ')}. ${PRICE_NOTE}.`
    : 'Online card orders are not open yet, so ask us for a price.'
  return [
    {
      q: 'What is a video business card?',
      a: 'A link or QR code that plays a short film ending on your logo, then shows your details and saves to contacts in one tap.',
    },
    {
      q: 'What does it cost?',
      a: `${card} The card has no monthly fee. Our Starter plan is a separate monthly service, ${formatAud(STARTER_PLAN.priceAud)} a month, with email signatures at ${formatAud(SIGNATURE_ADDON.priceAud)} each, both ${PLUS_GST}, on our pricing page.`,
    },
    {
      q: 'Is the film made with AI?',
      a: 'The example films on the showroom are AI-generated, and each one is labelled that way. Yours ends on your own logo.',
    },
    {
      q: 'What happens after I order?',
      a: 'You send your logo and details, and we send you a private proof to check. Nothing goes live until you approve it.',
    },
    {
      q: 'How long does my card stay online?',
      a: `We host your card for 12 months from the day it goes live, with no monthly fee. We email you at least 30 days before hosting ends with the renewal price, and it does not renew unless you choose to pay. The full wording is in the card order terms. Email ${CONTACT_EMAIL} with any question.`,
    },
    {
      q: 'Who do you work with?',
      a: 'We are an online business serving customers in Australia and New Zealand. We do not have a shopfront.',
    },
  ] as const
}

export function Answers() {
  return (
    <section data-position id="answers" className={s.section} aria-labelledby="answers-title">
      <div className={s.wrap}>
        <SectionIntro id="answers-title" eyebrow={HOME_FAQ.eyebrow} title={HOME_FAQ.title} lead={HOME_FAQ.lead} />
        <div className={s.faq}>
          {answers().map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
