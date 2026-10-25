import s from './collection-notice.module.css'

/**
 * APP 5 collection notice for any public enquiry or feedback form on a card route.
 * `to` names who receives the message: pass the card owner as well for a card visitor's form.
 * No consent control: this is a notice, and it asks for nothing.
 */
export function CollectionNotice({ to = 'Unite Group' }: { to?: string }) {
  return (
    <p className={s.notice}>
      Your message goes to {to}. We collect your details to reply to you and to manage your enquiry or order. You can ask to
      access, correct or delete them. Read our <a href="/privacy-policy">privacy policy</a>.
    </p>
  )
}
