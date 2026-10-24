import { readMargotPhoneNumber } from '@/lib/margot/phone-line'
import { CONTACT_EMAIL } from '@/lib/public-site'

import { ContactForm } from './contact-form'
import { MargotPhoneLine } from './margot-phone-line'
import s from './public.module.css'

// Position 7. One route: the form. The email address is also plain selectable text, so a failed send is never a
// dead end. No reply time is promised until one is set.
// The Margot phone slot renders nothing until MARGOT_PHONE_NUMBER is a valid E.164 number. The reader and the
// component are byte-identical to feat/margot-phone-line, so the two branches merge into one home.
export function ContactBand() {
  return (
    <section data-position id="contact" className={s.section} aria-labelledby="contact-title">
      <div className={s.wrap}>
        <h2 id="contact-title" className={s.h2}>
          Ask a question
        </h2>
        <ContactForm />
        <div className={s.fallback}>
          <MargotPhoneLine number={readMargotPhoneNumber()} />
          <p>
            Or email <span>{CONTACT_EMAIL}</span>.
          </p>
        </div>
      </div>
    </section>
  )
}
