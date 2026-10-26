import { formatAud } from './packages'
import type { liveCardOffers } from './living-card'
import s from './living-card.module.css'

type Offer = ReturnType<typeof liveCardOffers>[number]

/** The Living Business Card offers on /grow, in the /cards/order house style. Renders nothing when no link is set. */
export function LivingCardSection({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) return null
  return (
    <section id="living-card" className={s.panel} aria-labelledby="living-card-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>LIVING BUSINESS CARD</p>
        <h2 id="living-card-title" className={s.title}>
          A short film that works as your business card.
        </h2>
        <p className={s.lead}>
          Send it by link or QR code. It plays on any phone and ends on your logo and contact details. One-off prices in AUD, GST
          included.
        </p>
        <div className={s.grid} data-count={offers.length}>
          {offers.map((offer) => (
            <article key={offer.id} data-card-offer={offer.id} className={offer.recommended ? `${s.card} ${s.recommended}` : s.card}>
              <div className={s.poster}>
                {/* eslint-disable-next-line @next/next/no-img-element -- same static posters as /cards, no optimiser needed */}
                <img src={offer.poster} alt={offer.posterAlt} loading="lazy" className={s.posterImg} />
                {offer.recommended && <span className={s.badge}>Recommended</span>}
              </div>
              <div className={s.body}>
                <h3 className={s.name}>{offer.name}</h3>
                {offer.priceAud > 0 && (
                  <p className={s.price}>
                    {formatAud(offer.priceAud)}
                    <span className={s.priceNote}>{offer.id === 'extra_business' ? ' each, inc GST' : ' inc GST'}</span>
                  </p>
                )}
                <p className={s.line}>{offer.line}</p>
                <ul className={s.benefits}>
                  {offer.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <a href={offer.link} className={offer.recommended ? `${s.buy} ${s.buyPrimary}` : s.buy}>
                  Buy {offer.name}
                </a>
              </div>
            </article>
          ))}
        </div>
        <p className={s.foot}>
          <a href="/cards" className={s.footLink}>
            See all ten card films
          </a>
        </p>
      </div>
    </section>
  )
}
