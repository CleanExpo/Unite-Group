import s from './public.module.css'

// Position 4. Three steps that run today; the wording matches the /cards showroom.
export const STEPS = [
  { title: 'Pick an opener', body: 'Choose the film you like. Yours ends on your own logo, not ours.' },
  { title: 'Send your details', body: 'Your logo, colours, contact details and the businesses you want linked.' },
  { title: 'Approve a proof', body: 'We build your card and send you a private link to check before anything goes live.' },
] as const

export function HowItWorks() {
  return (
    <section data-position id="how" className={`${s.section} ${s.sectionAlt}`} aria-labelledby="how-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>How it works</p>
        <h2 id="how-title" className={s.h2}>
          Three steps from idea to a card you can share.
        </h2>
        <ol className={s.steps}>
          {STEPS.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
