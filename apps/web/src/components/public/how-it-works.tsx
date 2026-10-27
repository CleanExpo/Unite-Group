import hs from './home-screens.module.css'
import { HOME_HOW } from './home/copy'
import { STEP_SCREENS } from './home-screens'
import s from './layout/public.module.css'
import { ScreenFrame } from './screen-frame'
import { SectionIntro } from './section-intro'

export const STEPS = [
  { title: 'Pick an opener', body: 'Select one of nine films from the showroom.', screen: 'pick' },
  { title: 'Send your details', body: 'Logo, palette, and how people should reach you.', screen: 'send' },
  { title: 'Approve a proof', body: 'Review a private link before anything goes live.', screen: 'approve' },
] as const

export function HowItWorks() {
  return (
    <section data-position id="how" className={s.section} aria-labelledby="how-title">
      <div className={s.wrap}>
        <SectionIntro id="how-title" eyebrow={HOME_HOW.eyebrow} title={HOME_HOW.title} lead={HOME_HOW.lead} />
        <ol className={`${s.steps} ${hs.stepFlow}`}>
          {STEPS.map((step, i) => (
            <li key={step.title} data-step-index={i + 1}>
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
