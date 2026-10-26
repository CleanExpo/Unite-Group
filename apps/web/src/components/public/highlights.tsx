import { CARD_FILM } from './film-config'
import { FilmPlayer } from './film-player'
import { HOME_HIGHLIGHTS } from './home-copy'
import hl from './highlights.module.css'
import ps from './home-product-stack.module.css'
import s from './public.module.css'
import { VisualImg } from './visual-img'
import { VISUALS, type Visual } from './visuals'

export function Highlights() {
  const picture = (v: Visual | null) => (v ? <VisualImg visual={v} /> : null)
  const [film, nexus, pricing] = HOME_HIGHLIGHTS.cards
  return (
    <section id="highlights" className={`${s.section} ${ps.slice} ${ps.sliceOffers}`} aria-label={HOME_HIGHLIGHTS.srTitle}>
      <div className={s.wrap}>
        <div className={hl.row}>
          <article className={`${hl.card} ${hl.filmCard}`} data-media-card data-spot="film">
            <div className={hl.media}>
              <FilmPlayer film={CARD_FILM} controls="bottom" />
            </div>
            <span className={hl.badge}>AI-generated</span>
            <div className={hl.text}>
              <h3 className={hl.title}>
                <a href={film.href}>{film.title}</a>
              </h3>
              <p className={hl.line}>{film.line}</p>
            </div>
          </article>
          <article className={hl.card} data-media-card data-spot="nexus">
            <div className={hl.media}>{picture(VISUALS.nexus)}</div>
            <div className={hl.text}>
              <h3 className={hl.title}>
                <a href={nexus.href} className={hl.stretch}>
                  {nexus.title}
                </a>
              </h3>
              <p className={hl.line}>{nexus.line}</p>
              <span className={s.chip} data-chip="coming">
                Coming
              </span>
            </div>
          </article>
          <article className={hl.card} data-media-card data-spot="pricing">
            <div className={hl.media}>{picture(VISUALS.network)}</div>
            <div className={hl.text}>
              <h3 className={hl.title}>
                <a href={pricing.href} className={hl.stretch}>
                  {pricing.title}
                </a>
              </h3>
              <p className={hl.line}>{pricing.line}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
