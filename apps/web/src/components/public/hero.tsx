import { FilmPlayer } from './film-player'
import { HERO_FILM } from './film-config'
import h from './hero.module.css'

// Position 1, Mode B (Cinematic Spotlight): the one dark band on the page. The U is the single focal point.
// The H1, the wordmark, the Nexus line and both CTAs are real HTML in the server markup; the poster (the exact
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
        <p className={h.sub}>
          Unite-Group Nexus is the CRM and operating system we are building to run the businesses behind it, from Disaster Recovery and NRPG to CARSI,
          RestoreAssist and Trade Hall.
        </p>
        <div className={h.actions}>
          <a href="#group" className={h.cta}>
            See how the group fits together
          </a>
          <a href="#contact" className={h.ghost}>
            Ask a question
          </a>
        </div>
      </div>
    </section>
  )
}
