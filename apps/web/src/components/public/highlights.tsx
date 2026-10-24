import { CARD_FILM } from './film-config'
import { FilmPlayer } from './film-player'
import s from './public.module.css'
import { VisualImg } from './visual-img'
import { VISUALS, type Visual } from './visuals'

// Three big media cards, the first row under the hero: full-bleed picture or film, a bold title and ONE caption line.
// The film card plays the U reveal once with Replay and Pause; its title link sits under the film's own buttons.
export function Highlights() {
  const picture = (v: Visual | null) => (v ? <VisualImg visual={v} /> : null)
  return (
    <section id="highlights" className={`${s.section} ${s.tight}`} aria-label="Highlights">
      <div className={s.wrap}>
        <h2 className={s.srOnly}>Highlights</h2>
        <div className={s.mediaRow}>
          <article className={`${s.mediaCard} ${s.mediaFilm}`} data-media-card>
            <div className={s.mediaBox}>
              <FilmPlayer film={CARD_FILM} />
            </div>
            <span className={s.badge}>AI-generated</span>
            <div className={s.mediaText}>
              <h3 className={s.cardTitle}>
                <a href="/cards">Living cards</a>
              </h3>
              <p className={s.cardLine}>A video card that ends on your logo.</p>
            </div>
          </article>
          <article className={`${s.mediaCard} ${VISUALS.nexus ? '' : s.plainCard}`} data-media-card>
            <div className={s.mediaBox}>{picture(VISUALS.nexus)}</div>
            <div className={s.mediaText}>
              <h3 className={s.cardTitle}>
                <a href="/solutions/intelligence" className={s.stretch}>
                  Nexus CRM
                </a>
              </h3>
              <p className={s.cardLine}>The CRM we are building for the group.</p>
            </div>
          </article>
          <article className={s.mediaCard} data-media-card>
            <div className={s.mediaBox}>{picture(VISUALS.network)}</div>
            <div className={s.mediaText}>
              <h3 className={s.cardTitle}>
                <a href="#group" className={s.stretch}>
                  The network
                </a>
              </h3>
              <p className={s.cardLine}>Disaster Recovery and NRPG, connecting homes with restorers.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
