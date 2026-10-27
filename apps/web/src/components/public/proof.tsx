import { HOME_PROOF } from './home-copy'
import p from './proof.module.css'
import s from './public.module.css'
import { VisualImg } from './visual-img'
import { VISUALS } from './visuals'

export function Proof() {
  const v = VISUALS.showroom
  return (
    <section data-position id="proof" className={s.section} aria-labelledby="proof-title">
      <div className={s.wrap}>
        <div className={`${p.strip} ${v ? '' : p.plain}`}>
          {v ? (
            <div className={p.thumb}>
              <VisualImg visual={v} />
            </div>
          ) : null}
          <div className={p.copy}>
            <h2 id="proof-title" className={p.title}>{HOME_PROOF.title}</h2>
            <p className={p.line}>{HOME_PROOF.line}</p>
            <a href="/cards" className={s.buttonSecondary}>
              {HOME_PROOF.cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
