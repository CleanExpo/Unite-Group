import type { PublicCard } from '@/lib/card/published'

import { DEMO_EDITION, EDITIONS, youtubeIdFor } from '@/app/cards/editions'
import { LivingFilm } from '@/app/cards/living-film'

import styles from './card.module.css'
import { EnquiryForm } from './enquiry-form'

/** The persistent card: server HTML and real links. The sample shows the moving Constellation film (client script) so buyers see a living card; client cards stay media-free. The enquiry form (the only script) renders only when enquiries are open. */
export function CardView({
  card, enquiryOpen = false, ownerAlerts = false, sample = false, reviewOpen = false, highlightReview = false,
}: {
  card: PublicCard; enquiryOpen?: boolean; ownerAlerts?: boolean; sample?: boolean
  /** The card has a valid Google Place ID. The button links to our /review redirect, never straight to Google. */
  reviewOpen?: boolean
  /** ?r=1 from the QR: show the review button first and ringed. The card stays the landing page. */
  highlightReview?: boolean
}) {
  const demo = EDITIONS.find((e) => e.name === DEMO_EDITION)
  const telHref = card.phone ? `tel:${card.phone.replace(/[^+\d]/g, '')}` : null
  // Google review policy: the same button for every visitor, never behind a feedback question or the enquiry form
  const review = reviewOpen ? (
    <li>
      <a
        className={[styles.button, styles.review, highlightReview ? styles.reviewHighlight : ''].filter(Boolean).join(' ')}
        href={`/c/${card.slug}/review`}
        id="review"
        data-review-button
        rel="nofollow"
      >
        Leave us a Google review
      </a>
    </li>
  ) : null
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
        {card.staff?.logoUrl ? <img className={styles.logo} src={card.staff.logoUrl} alt="" referrerPolicy="no-referrer" /> : null}
        {card.staff?.photoUrl ? <img className={styles.photo} src={card.staff.photoUrl} alt={card.displayName} referrerPolicy="no-referrer" /> : null}
        {card.businessName ? <p className={styles.business}>{card.businessName}</p> : null}
        <h1 className={styles.name}>{card.displayName}</h1>
        {card.roleTitle ? <p className={styles.role}>{card.roleTitle}</p> : null}
        {card.serviceArea ? <p className={styles.area}>{card.serviceArea}</p> : null}
        {card.staff?.address ? <p className={styles.area}>{card.staff.address}</p> : null}
        {card.staff?.offer ? <p className={styles.area} data-card-offer>{card.staff.offer}</p> : null}
        <ul className={styles.actions}>
          {highlightReview ? review : null}
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
          {card.staff?.website ? (
            <li>
              <a className={styles.button} href={card.staff.website} rel="noopener noreferrer nofollow">Website</a>
            </li>
          ) : null}
          <li>
            <a className={styles.button} href={`/c/${card.slug}/contact.vcf`}>Save contact</a>
          </li>
          {highlightReview ? null : review}
        </ul>
        {enquiryOpen ? <EnquiryForm slug={card.slug} fallback={{ phone: card.phone, email: card.email }} ownerAlerts={ownerAlerts} /> : null}
      </article>
    </main>
  )
}
