import { PILLARS, SHIPPED_PILLAR, lowestCardPrice, pillarPath } from '@/lib/public-site'

import hs from './home-screens.module.css'
import { JOB_SCREENS } from './home-screens'
import s from './public.module.css'
import { ScreenFrame } from './screen-frame'

// Position 3: four cards, each a real product screen, a title, one line and a Coming chip, linked to its pillar page.
// Only the card is on sale, so only Conversion also says so.
export function PillarsRow() {
  const from = lowestCardPrice()
  return (
    <section data-position id="pillars" className={s.section} aria-labelledby="pillars-title">
      <div className={s.wrap}>
        <h2 id="pillars-title" className={s.h2}>
          Four jobs
        </h2>
        <ul className={s.grid4}>
          {PILLARS.map((p) => {
            const live = p.slug === SHIPPED_PILLAR
            return (
              <li key={p.slug}>
                <article className={hs.card} data-job>
                  <ScreenFrame screen={JOB_SCREENS[p.slug]} />
                  <div className={hs.body}>
                    <h3 className={s.cardTitle}>
                      <a href={pillarPath(p.slug)} className={s.stretch}>
                        {p.name}
                      </a>
                    </h3>
                    <p className={s.cardLine}>{p.line}</p>
                    <span className={s.chips}>
                      <span className={s.chip}>Coming</span>
                      {live && <span className={`${s.chip} ${s.chipLive}`}>{from ? `Card from ${from}` : 'Card on enquiry'}</span>}
                    </span>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
