import { CARD_TIERS } from '@/app/cards/order/order-view'
import { formatAud } from '@/app/grow/packages'
import { CONTACT_EMAIL, PRICE_NOTE } from '@/lib/public-site'

import s from './public.module.css'

// Position 6. Real questions with answers that match /cards and /cards/order. Where a fact is not set,
// the answer says so plainly instead of guessing.
export function answers() {
  const [ready, custom] = CARD_TIERS
  return [
    {
      q: 'What is a video business card?',
      a: 'A link or QR code that plays a short film ending on your logo, then shows your details and saves to contacts in one tap.',
    },
    {
      q: 'What does it cost?',
      a: `${ready.name} is ${formatAud(ready.priceAud)} and ${custom.name} is ${formatAud(custom.priceAud)}. ${PRICE_NOTE}. There is no subscription.`,
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
      a: `We have not set a hosting term yet, so we will not promise one here. Email ${CONTACT_EMAIL} and we will answer in writing.`,
    },
    {
      q: 'Who do you work with?',
      a: 'We are an online business serving customers in Australia and New Zealand. We do not have a shopfront.',
    },
  ] as const
}

export function Answers() {
  return (
    <section data-position id="answers" className={`${s.section} ${s.sectionAlt}`} aria-labelledby="answers-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>Resources</p>
        <h2 id="answers-title" className={s.h2}>
          Questions people ask first.
        </h2>
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
