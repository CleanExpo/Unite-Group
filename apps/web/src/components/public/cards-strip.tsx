import { CARD_TIERS } from '@/app/cards/order/order-view'
import { formatAud } from '@/app/grow/packages'
import { PRICE_NOTE } from '@/lib/public-site'

import { CARD_FILM } from './film-config'
import { FilmPlayer } from './film-player'

import s from './public.module.css'

// Position 3. Prices come from CARD_TIERS, the same constant /cards/order reads, so they cannot drift.
// The film tile plays the U reveal once when it scrolls into view (its poster shows until then, and always under
// reduced motion), with Replay and Pause. The files are named in film-config.ts.

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
            <FilmPlayer film={CARD_FILM} controls="bottom" />
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
                  <a href="/cards/order" aria-label={`Order the ${t.name} card`}>
                    Order this card
                  </a>
                </li>
              ))}
            </ul>
            <p className={s.stripCta}>
              <a href="/cards" className={s.buttonSecondary}>
                See the living card
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
