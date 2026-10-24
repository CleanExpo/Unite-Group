import { CARD_TIERS } from '@/app/cards/order/order-view'
import { formatAud } from '@/app/grow/packages'
import { PRICE_NOTE } from '@/lib/public-site'

import s from './public.module.css'

// Position 3. Prices come from CARD_TIERS, the same constant /cards/order reads, so they cannot drift.
// The frame is a real poster from public/cards/media. It ends on the wordmark; a frame from before the
// wordmark is not in the repo yet.
const FRAME = '/cards/media/unite-nexus-u-reveal-poster-9x16.jpg'

export function CardsStrip() {
  return (
    <section data-position id="cards" className={s.section} aria-labelledby="cards-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>Living cards</p>
        <h2 id="cards-title" className={s.h2}>
          A video business card, ready to share.
        </h2>
        <div className={s.cardsRow}>
          <figure className={s.frame}>
            <img src={FRAME} alt="A frame from a video business card: a copper U that ends on the Unite-Group Nexus name" width={720} height={1280} loading="lazy" />
            <figcaption className={s.badge}>AI-generated</figcaption>
          </figure>
          <div>
            <ul className={s.tiers}>
              {CARD_TIERS.map((t) => (
                <li key={t.id} className={s.tier} data-tier={t.id}>
                  <h3>{t.name}</h3>
                  <p className={s.price}>{formatAud(t.priceAud)}</p>
                  <p className={s.priceNote}>{PRICE_NOTE}</p>
                  <p>{t.line}</p>
                  <a href="/cards/order" data-track="cta" data-track-label={`home-strip-order-${t.id}`} aria-label={`Order the ${t.name} card`}>
                    Order this card
                  </a>
                </li>
              ))}
            </ul>
            <p className={s.stripCta}>
              <a href="/cards" data-track="cta" data-track-label="home-strip-see-card" className={s.buttonSecondary}>
                See the living card
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
