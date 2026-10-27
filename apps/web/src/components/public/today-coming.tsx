import ps from './home-product-stack.module.css'
import s from './public.module.css'
import { COMING, COMING_NOTE, TODAY } from './today-coming-data'
import t from './today-coming.module.css'

export function TodayComing() {
  return (
    <section id="today" className={`${s.section} ${ps.slice} ${ps.sliceStatus}`} aria-label="What is live and what is coming">
      <div className={s.wrap}>
        <div className={t.bar}>
          <div className={t.row}>
            <span className={t.label}>Live</span>
            <ul className={t.list} data-today-list>
              {TODAY.map((i) => (
                <li key={i.name} data-today-item className={t.item}>
                  <a href={i.href} className={`${t.pill} ${t.pillLive}`}>
                    <strong data-name>{i.name}</strong>
                    <span data-line>{i.line}</span>
                    <span className={`${s.chip} ${s.chipLive}`} data-chip="live">
                      Live
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className={t.row} data-coming>
            <span className={t.label}>Coming</span>
            <ul className={t.list} data-coming-list>
              {COMING.map((i) => (
                <li key={i.name} data-coming-item className={t.item}>
                  <span className={`${t.pill} ${t.pillQuiet}`}>
                    <strong data-name>{i.name}</strong>
                    <span data-line>{i.line}</span>
                    <span className={s.chip} data-chip="coming">
                      Coming
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className={t.note} data-coming-note>
            {COMING_NOTE}
          </p>
        </div>
      </div>
    </section>
  )
}
