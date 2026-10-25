import s from './public.module.css'
import { COMING, COMING_NOTE, TODAY } from './today-coming-data'
import t from './today-coming.module.css'

// Today versus Coming: only what has shipped is a link. Anything not live is labelled Coming and is plain text.
// Not a numbered position (like the group), so it carries no data-position.
export function TodayComing() {
  return (
    <section id="today" className={s.section} aria-labelledby="today-title">
      <div className={s.wrap}>
        <h2 id="today-title" className={s.h2}>
          Today, and what is coming
        </h2>
        <div className={t.cols}>
          <div className={t.col} data-today>
            <h3 className={t.colTitle}>Available today</h3>
            <ul className={t.list} data-today-list>
              {TODAY.map((i) => (
                <li key={i.name} data-today-item className={t.item}>
                  <a href={i.href} className={`${t.row} ${t.live}`}>
                    <span className={t.head}>
                      <strong className={t.name} data-name>
                        {i.name}
                      </strong>
                      <span className={`${s.chip} ${s.chipLive}`} data-chip="live">
                        Live
                      </span>
                    </span>
                    <span className={t.line} data-line>
                      {i.line}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className={t.col} data-coming>
            <h3 className={t.colTitle}>Coming</h3>
            <ul className={t.list} data-coming-list>
              {COMING.map((i) => (
                <li key={i.name} data-coming-item className={t.item}>
                  <div className={`${t.row} ${t.quiet}`}>
                    <span className={t.head}>
                      <strong className={t.name} data-name>
                        {i.name}
                      </strong>
                      <span className={s.chip} data-chip="coming">
                        Coming
                      </span>
                    </span>
                    <span className={t.line} data-line>
                      {i.line}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className={t.note} data-coming-note>
              {COMING_NOTE}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
