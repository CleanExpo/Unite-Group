import { EDITIONS } from '@/app/cards/editions'
import { CARD_TIERS } from '@/app/cards/order/order-view'
import { formatAud } from '@/app/grow/packages'

import { CONTACT_MAILTO } from './site-nav'
import { PRICE_NOTE, lowestCardPrice } from '@/lib/public-site'

import { GalleryTile } from './gallery-tile'
import g from './gallery.module.css'
import s from './public.module.css'

// Position 2: the nine edition films from public/cards/media as a gallery, poster first. Prices come from CARD_TIERS,
// the same constant /cards/order reads, so they cannot drift. The signature U reveal plays in the media row above.
export function CardsStrip() {
  const films = EDITIONS.filter((e) => e.name !== 'signature')
  return (
    <section data-position id="cards" className={s.section} aria-labelledby="cards-title">
      <div className={s.wrap}>
        <h2 id="cards-title" className={s.h2}>
          Living cards
        </h2>
        <ul className={g.grid}>
          {films.map((e) => (
            <li key={e.name}>
              <GalleryTile name={e.name} label={e.label} video={e.video} poster={e.poster} href={`/cards/order?edition=${e.name}`} />
            </li>
          ))}
        </ul>
        <div className={s.offer}>
          <a href="/cards/order" data-track="cta" data-track-label="home-strip-order" className={s.buttonPrimary}>
            From {lowestCardPrice()}
          </a>
          <ul className={s.prices}>
            {CARD_TIERS.map((t) => (
              <li key={t.id} data-tier={t.id}>
                {t.name} {formatAud(t.priceAud)}
              </li>
            ))}
          </ul>
          <p className={s.priceNote}>{PRICE_NOTE}</p>
          <a href="/cards" data-track="cta" data-track-label="home-strip-see-card" className={s.buttonSecondary}>
            See the living card
          </a>
          <a href={CONTACT_MAILTO} data-contact-email className={s.buttonSecondary}>
            Email us
          </a>
        </div>
      </div>
    </section>
  )
}
