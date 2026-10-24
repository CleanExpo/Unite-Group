import s from './public.module.css'

// Position 5. One honest sentence about a real artefact. No rows, no numbers, no testimonials.
export function Proof() {
  return (
    <section data-position id="proof" className={s.section} aria-labelledby="proof-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>Results</p>
        <h2 id="proof-title" className={s.h2}>
          See it before you ask.
        </h2>
        <p className={s.lead}>
          The card showroom plays every film we have made, so you can watch one before you get in touch.{' '}
          <a href="/cards">Open the showroom</a>.
        </p>
      </div>
    </section>
  )
}
