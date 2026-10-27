import { EDITIONS } from '@/app/cards/editions'
import { formatAud } from '@/app/grow/packages'
import { liveCardTiers } from '@/lib/public-pricing'
import { PRICE_NOTE, lowestCardPrice } from '@/lib/public-site'

import o from './cards-offer.module.css'
import { HOME_CARDS } from './home/copy'
import { GalleryTile } from './gallery-tile'
import g from './gallery.module.css'
import ps from './home-product-stack.module.css'
import s from './layout/public.module.css'
import { SectionIntro } from './section-intro'

export function CardsStrip() {
  const films = EDITIONS.filter((e) => e.name !== 'signature')
  const from = lowestCardPrice()
  const live = liveCardTiers()
  return (
    <section data-position id="cards" className={`${s.section} ${ps.sliceGallery}`} aria-labelledby="cards-title">
      <div className={s.wrap}>
        <SectionIntro id="cards-title" eyebrow={HOME_CARDS.eyebrow} title={HOME_CARDS.title} lead={HOME_CARDS.lead} align="center" className={g.intro} />
        <div className={g.track}>
          <ul className={g.grid}>
            {films.map((e) => (
              <li key={e.name}>
                <GalleryTile name={e.name} label={e.label} video={e.video} poster={e.poster} href={`/cards/order?edition=${e.name}`} />
              </li>
            ))}
          </ul>
        </div>
        <div className={`${s.offer} ${o.dock}`}>
          <a href="/cards/order" data-track="cta" data-track-label="home-strip-order" className={s.buttonPrimary}>
            {from ? `From ${from}` : 'Ask about a card'}
          </a>
          {live.length > 0 && (
            <>
              <ul className={o.prices}>
                {live.map((t) => (
                  <li key={t.id} data-tier={t.id}>
                    {t.name} {formatAud(t.priceAud)}
                  </li>
                ))}
              </ul>
              <p className={o.priceNote}>{PRICE_NOTE}</p>
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
