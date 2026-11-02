import { CONTACT_EMAIL } from '@/lib/public-site'
import m from '@/public/layout/marketing-page.module.css'

/** The call offer: the booking page when there is one, otherwise the time asked for on the form, with email to change it. */
export function BookCall({ bookingUrl }: { bookingUrl: string | null }) {
  if (bookingUrl) {
    return (
      <>
        <p>Pick a time that suits you and we will go through your answers together.</p>
        <div className={m.actions}>
          <a href={bookingUrl} className={m.btnPrimary}>Book a call</a>
        </div>
      </>
    )
  }
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Book a call about my new website')}`
  return (
    <>
      <p>If you asked for a call on the form, we will contact you to confirm a time. To ask for one now or change the time, email us two times that suit you.</p>
      <div className={m.actions}>
        <a href={mailto} className={m.btnPrimary}>Book a call by email</a>
      </div>
    </>
  )
}
