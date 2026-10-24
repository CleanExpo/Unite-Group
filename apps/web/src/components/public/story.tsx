import { ALSO, TILES } from './businesses'
import s from './public.module.css'
import t from './story.module.css'

// "The group": six dark glass tiles, each the business's real logo and one line. A name links only where its site
// answered 200 (see businesses.ts). The approved Disaster Recovery sentence is shown once, as a caption under the tiles.
export function Story() {
  return (
    <section id="group" className={s.section} aria-labelledby="story-title">
      <div className={s.wrap}>
        <h2 id="story-title" className={s.h2}>
          The group
        </h2>
        <ul className={t.tiles} data-businesses>
          {TILES.map((b) => (
            <li key={b.name} className={t.tileItem} data-tile>
              <a href={b.url} rel="noopener" className={t.tile}>
                {b.logo ? (
                  <span className={t.plate}>
                    <img src={b.logo} alt="" width={64} height={64} loading="lazy" decoding="async" />
                  </span>
                ) : null}
                <span className={t.label}>
                  <span className={t.name} {...(b.logo ? {} : { 'data-wordmark': '' })}>
                    {b.name}
                  </span>
                  {b.tag && <span className={t.tag}>{b.tag}</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
        {TILES.filter((b) => b.line).map((b) => (
          <p key={b.name} className={t.drline} data-dr-line>
            <strong>{b.name}</strong> {b.line}
          </p>
        ))}
        <ul className={t.more} data-businesses-more>
          {ALSO.map((b) => (
            <li key={b.name}>{b.url ? <a href={b.url} rel="noopener">{b.name}</a> : b.name}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
