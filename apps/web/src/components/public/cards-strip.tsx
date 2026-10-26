import { EDITIONS } from '@/app/cards/editions'
import { formatAud } from '@/app/grow/packages'
import { liveCardTiers } from '@/lib/public-pricing'
import { PRICE_NOTE, lowestCardPrice } from '@/lib/public-site'

import { GalleryTile } from './gallery-tile'
import g from './gallery.module.css'
import s from './public.module.css'

// Position 2: the ten edition films from public/cards/media as a gallery, poster first. Prices come from liveCardTiers,
// the same payment-link gate /cards/order reads, so they cannot drift. The signature U reveal plays in the media row above.
export function CardsStrip() {
  const films = EDITIONS.filter((e) => e.name !== 'signature')
  const from = lowestCardPrice()
  const live = liveCardTiers()
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
            {from ? `From ${from}` : 'Ask about a card'}
          </a>
          {live.length > 0 && (
            <>
              <ul className={s.prices}>
                {live.map((t) => (
                  <li key={t.id} data-tier={t.id}>
                    {t.name} {formatAud(t.priceAud)}
                  </li>
                ))}
              </ul>
              <p className={s.priceNote}>{PRICE_NOTE}</p>
            </>
          )}
          <a href="/cards" data-track="cta" data-track-label="home-strip-see-card" className={s.buttonSecondary}>
            See the living card
          </a>
        </div>
      </div>
    </section>
  )
}
