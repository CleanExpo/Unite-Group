import type { PublicCard } from '@/lib/card/published'

import { DEMO_EDITION, EDITIONS, youtubeIdFor } from '@/app/cards/editions'
import { LivingFilm } from '@/app/cards/living-film'

import styles from './card.module.css'
import { EnquiryForm } from './enquiry-form'

/** The persistent card: server HTML and real links. The sample shows the moving Constellation film (client script) so buyers see a living card; client cards stay media-free. The enquiry form (the only script) renders only when enquiries are open. */
export function CardView({ card, enquiryOpen = false, sample = false }: { card: PublicCard; enquiryOpen?: boolean; sample?: boolean }) {
  const demo = EDITIONS.find((e) => e.name === DEMO_EDITION)
  const telHref = card.phone ? `tel:${card.phone.replace(/[^+\d]/g, '')}` : null
  return (
    <main className={styles.page}>
      {sample ? (
        <p className={styles.sample} data-sample-card>
          SAMPLE card. This is how your customers see your card page. The business is made up.{' '}
          <a href="/cards">Get your own card</a>
        </p>
      ) : null}
      {sample && demo ? (
        <div className={styles.film} data-sample-film>
          <LivingFilm src={demo.video} poster={demo.poster} label={`${demo.label} edition film`} youtubeId={youtubeIdFor(demo.name)} />
        </div>
      ) : null}
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
