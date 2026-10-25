import hs from './home-screens.module.css'
import { STEP_SCREENS } from './home-screens'
import s from './public.module.css'
import { ScreenFrame } from './screen-frame'

// Position 4: three steps that run today; the wording matches the /cards showroom. Each step shows the real screen
// for that step, with sample data (Phill, 25/10/2026: the real product, never abstract art).
export const STEPS = [
  { title: 'Pick an opener', body: 'Choose a film that ends on your logo.', screen: 'pick' },
  { title: 'Send your details', body: 'Logo, colours and contact details.', screen: 'send' },
  { title: 'Approve a proof', body: 'Check a private link before it goes live.', screen: 'approve' },
] as const

export function HowItWorks() {
  return (
    <section data-position id="how" className={s.section} aria-labelledby="how-title">
      <div className={s.wrap}>
        <h2 id="how-title" className={s.h2}>
          How it works
        </h2>
        <ol className={s.steps}>
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <article className={hs.card} data-step>
                <ScreenFrame screen={STEP_SCREENS[step.screen]} />
                <div className={hs.body}>
                  <span className={hs.stepNo}>0{i + 1}</span>
                  <h3 className={s.cardTitle}>{step.title}</h3>
                  <p className={s.cardLine}>{step.body}</p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
