import { CONTACT_EMAIL } from '@/lib/public-site'

import { ContactForm } from './contact-form'
import s from './public.module.css'

// Position 7. One route: the form. The email address is also plain selectable text, so a failed send
// is never a dead end. Phone is left out until Phill supplies a number. No reply time is promised
// until one is set.
export function ContactBand() {
  return (
    <section data-position id="contact" className={s.section} aria-labelledby="contact-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>Contact</p>
        <h2 id="contact-title" className={s.h2}>
          Ask a question.
        </h2>
        <p className={s.lead}>We reply by email. We have not set a reply time yet, so we will not promise one.</p>
        <ContactForm />
        <p className={s.fallback}>
          Or email <span>{CONTACT_EMAIL}</span>.
        </p>
      </div>
    </section>
  )
}
