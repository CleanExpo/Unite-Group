import { FilmPlayer } from './film-player'
import { HERO_FILM } from './film-config'
import h from './hero.module.css'

// Position 1: molten orange shards on navy-black. The U is the single focal point.
// The H1, the wordmark, the one Nexus line and both CTAs are real HTML in the server markup; the poster (the exact
// last frame of the film) paints with them, and the film starts later, only when motion is allowed.
// The card offer is not here: it is one offer, lower down (Phill 25/10/2026).
export function Hero() {
  return (
    <section data-position id="hero" data-mode="spotlight" className={h.hero} aria-labelledby="hero-title">
      <div className={h.stage} data-hero-media>
        <FilmPlayer film={HERO_FILM} priority fade className={h.film} />
      </div>
      <div className={h.copy}>
        <p className={h.wordmark} data-wordmark>
          Unite-Group Nexus
        </p>
        <h1 id="hero-title" className={h.h1}>
          Every business. <span className={h.accent}>One system.</span>
        </h1>
        <p className={h.sub}>The CRM we are building to run the businesses behind it.</p>
        <div className={h.actions}>
          <a href="#start" data-track="cta" data-track-label="home-hero-start" className={h.cta}>
            Where do you want to start?
          </a>
          <a href="#contact" data-track="cta" data-track-label="home-hero-ask-question" className={h.ghost}>
            Ask a question
          </a>
        </div>
      </div>
    </section>
  )
}
