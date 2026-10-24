import { PILLARS, SHIPPED_PILLAR, lowestCardPrice, pillarPath } from '@/lib/public-site'

import s from './public.module.css'

// Position 2. Four lines. Only the card is on sale, so only Conversion says so; every other line says Coming.
export function PillarsRow() {
  return (
    <section data-position id="pillars" className={`${s.section} ${s.sectionAlt}`} aria-labelledby="pillars-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>What we do</p>
        <h2 id="pillars-title" className={s.h2}>
          Four jobs, in the order a customer meets them.
        </h2>
        <ul className={s.grid4}>
          {PILLARS.map((p) => {
            const live = p.slug === SHIPPED_PILLAR
            return (
              <li key={p.slug}>
                <article className={s.pillar}>
                  <h3>
                    <a href={pillarPath(p.slug)}>{p.name}</a>
                  </h3>
                  <p>{p.line}</p>
                  <span className={`${s.status} ${live ? s.statusLive : ''}`}>
                    {live ? `From ${lowestCardPrice()} on sale now` : 'Coming'}
                  </span>
                </article>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
