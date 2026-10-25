import s from './public.module.css'
import { VisualImg } from './visual-img'
import { VISUALS } from './visuals'

// Position 5: a banner over the showroom picture. One honest line about a real artefact; no numbers, no testimonials.
export function Proof() {
  const v = VISUALS.showroom
  return (
    <section data-position id="proof" className={s.section} aria-labelledby="proof-title">
      <div className={s.wrap}>
        <div className={`${s.banner} ${v ? '' : s.plainBanner}`}>
          {v && <VisualImg visual={v} />}
          <div className={s.bannerText}>
            <h2 id="proof-title" className={s.bannerTitle}>
              See it before you ask
            </h2>
            <p className={s.cardLine}>Watch the card films in our showroom.</p>
            <a href="/cards" className={s.buttonSecondary}>
              Open the showroom
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
