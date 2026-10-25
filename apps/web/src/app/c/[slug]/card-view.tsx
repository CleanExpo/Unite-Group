import type { PublicCard } from '@/lib/card/published'

import styles from './card.module.css'
import { EnquiryForm } from './enquiry-form'

/** The persistent card: server HTML, real links, no media. The enquiry form (the only script) renders only when enquiries are open. */
export function CardView({ card, enquiryOpen = false }: { card: PublicCard; enquiryOpen?: boolean }) {
  const telHref = card.phone ? `tel:${card.phone.replace(/[^+\d]/g, '')}` : null
  return (
    <main className={styles.page}>
      <article className={styles.card}>
        {card.businessName ? <p className={styles.business}>{card.businessName}</p> : null}
        <h1 className={styles.name}>{card.displayName}</h1>
        {card.roleTitle ? <p className={styles.role}>{card.roleTitle}</p> : null}
        {card.serviceArea ? <p className={styles.area}>{card.serviceArea}</p> : null}
        <ul className={styles.actions}>
          {telHref ? (
            <li>
              <a className={styles.button} href={telHref}>Call</a>
            </li>
          ) : null}
          {card.email ? (
            <li>
              <a className={styles.button} href={`mailto:${card.email}`}>Email</a>
            </li>
          ) : null}
          <li>
            <a className={styles.button} href={`/c/${card.slug}/contact.vcf`}>Save contact</a>
          </li>
        </ul>
        {enquiryOpen ? <EnquiryForm slug={card.slug} fallback={{ phone: card.phone, email: card.email }} /> : null}
      </article>
    </main>
  )
}
