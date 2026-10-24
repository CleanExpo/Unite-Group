import { CARD_TIERS } from '@/app/cards/order/order-view'
import { formatAud } from '@/app/grow/packages'

import { HeroFigure } from './hero-figure'
import { HeroMedia } from './hero-media'
import h from './hero.module.css'
import { PauseControl } from './pause-control'
import s from './public.module.css'

const VIEWS = [
  { value: 'assembled', label: 'Assembled' },
  { value: 'exploded', label: 'Exploded' },
  { value: 'inside', label: 'Inside' },
] as const

// Position 1. The words come first in the document so the H1 paints before the figure. The figure lives
// inside [data-hero-media], the slot for the later poster and rendered-frame sequence (16:9 desktop,
// 9:16 mobile crop, poster, muted loop). The SVG stays as the no-script, reduced-motion and crawler fallback.
export function Hero() {
  return (
    <section data-position id="hero" className={h.hero} aria-labelledby="hero-title">
      <div className={`${s.wrap} ${h.grid}`}>
        <div>
          <p className={s.eyebrow}>Australia and New Zealand</p>
          <h1 id="hero-title" className={h.h1}>
            Unite Group makes video business cards that open on your logo.
          </h1>
          <p className={h.storyLine}>Every business. One system.</p>
          <p className={h.sub}>
            One link or QR code. It plays a short film, then shows your details and saves to contacts in one tap.
          </p>
          <div className={h.actions}>
            <a href="/cards" className={s.buttonPrimary}>
              See the living card
            </a>
            <a href="#contact">Ask a question</a>
          </div>
          <p className={h.prices}>
            {CARD_TIERS.map((t, i) => (
              <span key={t.id}>
                {i > 0 ? ' · ' : ''}
                <strong>{formatAud(t.priceAud)}</strong> {t.name.toLowerCase()}
              </span>
            ))}
            . One-off price, GST included.
          </p>
        </div>

        <HeroMedia>
          <div className={h.stage}>
            <fieldset className={h.views}>
              <legend>Figure view</legend>
              {VIEWS.map((v, i) => (
                <span key={v.value}>
                  <input
                    className={h.radio}
                    type="radio"
                    name="hero-view"
                    id={`hero-view-${v.value}`}
                    value={v.value}
                    defaultChecked={i === 0}
                  />
                  <label className={h.viewLabel} htmlFor={`hero-view-${v.value}`}>
                    {v.label}
                  </label>
                </span>
              ))}
            </fieldset>
            <HeroFigure />
          </div>
          <PauseControl targetId="hero-figure" />
        </HeroMedia>
      </div>
    </section>
  )
}
