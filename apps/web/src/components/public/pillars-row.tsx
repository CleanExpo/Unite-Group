import { PILLARS, SHIPPED_PILLAR, lowestCardPrice, pillarPath } from '@/lib/public-site'

import s from './public.module.css'
import { VISUALS } from './visuals'

// Position 3: four image cards, each a title, one line and a Coming chip, linked to its pillar page.
// Only the card is on sale, so only Conversion also says so.
export function PillarsRow() {
  return (
    <section data-position id="pillars" className={s.section} aria-labelledby="pillars-title">
      <div className={s.wrap}>
        <h2 id="pillars-title" className={s.h2}>
          Four jobs
        </h2>
        <ul className={s.grid4}>
          {PILLARS.map((p) => {
            const v = VISUALS[p.slug]
            const live = p.slug === SHIPPED_PILLAR
            return (
              <li key={p.slug}>
                <article className={`${s.mediaCard} ${v ? '' : s.plainCard}`} data-job>
                  {v && (
                    <div className={s.mediaBox}>
                      <img src={v.src} alt="" width={v.width} height={v.height} loading="lazy" decoding="async" />
                    </div>
                  )}
                  <div className={s.mediaText}>
                    <h3 className={s.cardTitle}>
                      <a href={pillarPath(p.slug)} className={s.stretch}>
                        {p.name}
                      </a>
                    </h3>
                    <p className={s.cardLine}>{p.line}</p>
                    <span className={s.chips}>
                      <span className={s.chip}>Coming</span>
                      {live && <span className={`${s.chip} ${s.chipLive}`}>Card from {lowestCardPrice()}</span>}
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
