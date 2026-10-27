import { FilmPlayer } from './film-player'
import { HERO_FILM } from './film-config'
import { HOME_HERO } from './home-copy'
import h from './hero.module.css'

// Editorial hero: shared typographic voice, framed film with replay/pause once motion is allowed.
export function Hero() {
  return (
    <section data-position id="hero" data-mode="spotlight" className={h.hero} aria-labelledby="hero-title">
      <div className={h.shell}>
        <div className={h.grid}>
          <div className={h.copy}>
            <p className={h.eyebrow}>
              <span className={h.eyebrowLine} aria-hidden="true" />
              <span data-wordmark>{HOME_HERO.wordmark}</span> · {HOME_HERO.kicker}
            </p>
            <h1 id="hero-title" className={h.h1}>
              {HOME_HERO.title}
            </h1>
            <p className={h.lead}>{HOME_HERO.lead}</p>
            <div className={h.actions}>
              <a href={HOME_HERO.primaryHref} data-track="cta" data-track-label="home-hero-start" className={h.cta}>
                {HOME_HERO.primaryCta}
              </a>
              <a href={HOME_HERO.secondaryHref} data-track="cta" data-track-label="home-hero-ask-question" className={h.ghost}>
                {HOME_HERO.secondaryCta}
              </a>
            </div>
          </div>
          <div className={h.stageWrap}>
            <div className={h.stageFrame}>
              <div className={h.stage} data-hero-media>
                <span className={h.stageGrain} aria-hidden="true" />
                <FilmPlayer
                  film={HERO_FILM}
                  priority
                  fade
                  controls="bottom"
                  progress
                  visibleThreshold={0.2}
                  className={h.film}
                />
              </div>
              <p className={h.stageCaption}>Hero film · copper U assembly</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
