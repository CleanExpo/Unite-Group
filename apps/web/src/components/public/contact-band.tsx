import { readMargotPhoneNumber } from '@/lib/margot/phone-line'
import { CONTACT_EMAIL } from '@/lib/public-site'

import cb from './contact-band.module.css'
import { ContactForm } from './contact-form'
import { HOME_CONTACT } from './home/copy'
import { MargotPhoneLine } from './site/margot-phone-line'
import s from './layout/public.module.css'
import { SectionIntro } from './section-intro'

export function ContactBand() {
  return (
    <section data-position id="contact" className={s.section} aria-labelledby="contact-title">
      <div className={s.wrap}>
        <div className={cb.layout}>
          <SectionIntro id="contact-title" eyebrow={HOME_CONTACT.eyebrow} title={HOME_CONTACT.title} lead={HOME_CONTACT.lead} />
          <div className={cb.panel}>
            <ContactForm />
            <div className={cb.fallback}>
              <MargotPhoneLine number={readMargotPhoneNumber()} />
              <p>
                Or email <span>{CONTACT_EMAIL}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
