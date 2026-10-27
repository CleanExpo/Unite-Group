import { PILLARS, SHIPPED_PILLAR, lowestCardPrice, pillarPath } from '@/lib/public-site'

import hs from './home-screens.module.css'
import { HOME_PILLARS } from './home/copy'
import { JOB_SCREENS } from './home-screens'
import s from './layout/public.module.css'
import { ScreenFrame } from './screen-frame'
import { SectionIntro } from './section-intro'

export function PillarsRow() {
  const from = lowestCardPrice()
  return (
    <section data-position id="pillars" className={s.section} aria-labelledby="pillars-title">
      <div className={s.wrap}>
        <SectionIntro id="pillars-title" eyebrow={HOME_PILLARS.eyebrow} title={HOME_PILLARS.title} />
        <ul className={`${s.grid4} ${hs.jobGrid}`}>
          {PILLARS.map((p) => {
            const live = p.slug === SHIPPED_PILLAR
            return (
              <li key={p.slug} data-pillar={p.slug} {...(live ? { 'data-featured': '' } : {})}>
                <article className={`${hs.card} ${live ? hs.featured : ''}`} data-job>
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
