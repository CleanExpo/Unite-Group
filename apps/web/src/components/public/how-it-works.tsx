import s from './public.module.css'
import { VisualImg } from './visual-img'
import { VISUALS } from './visuals'

// Position 4: three steps that run today; the wording matches the /cards showroom.
export const STEPS = [
  { title: 'Pick an opener', body: 'Choose a film that ends on your logo.', visual: 'stepPick' },
  { title: 'Send your details', body: 'Logo, colours and contact details.', visual: 'stepSend' },
  { title: 'Approve a proof', body: 'Check a private link before it goes live.', visual: 'stepApprove' },
] as const

export function HowItWorks() {
  return (
    <section data-position id="how" className={s.section} aria-labelledby="how-title">
      <div className={s.wrap}>
        <h2 id="how-title" className={s.h2}>
          How it works
        </h2>
        <ol className={s.steps}>
          {STEPS.map((step, i) => {
            const v = VISUALS[step.visual]
            return (
              <li key={step.title}>
                <article className={`${s.mediaCard} ${v ? '' : s.plainCard}`} data-step>
                  {v && (
                    <div className={s.mediaBox}>
                      <VisualImg visual={v} />
                    </div>
                  )}
                  <div className={s.mediaText}>
                    <span className={s.stepNo}>0{i + 1}</span>
                    <h3 className={s.cardTitle}>{step.title}</h3>
                    <p className={s.cardLine}>{step.body}</p>
                  </div>
                </article>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
