import {
  COLLECTION_ACCESS,
  COLLECTION_POLICY_LEAD,
  COLLECTION_POLICY_LINK_TEXT,
  COLLECTION_POLICY_TAIL,
  COLLECTION_PURPOSES,
  COLLECTION_RECIPIENTS,
  PRIVACY_POLICY_PATH,
  type CollectionNoticeForm,
} from '@/lib/legal/collection-notice'
import { COMPANY_NAME } from '@/lib/legal/company'

import s from './collection-notice.module.css'

/**
 * APP 5 collection notice for a public form that collects personal information. Place it inside the form,
 * directly before the submit button, so it is read at or before collection. The wording lives in
 * src/lib/legal/collection-notice.ts and nowhere else.
 * No consent control: this is a notice, and it asks for nothing.
 */
export function CollectionNotice({
  form,
  tone = 'light',
  collapsible = false,
}: {
  form: CollectionNoticeForm
  tone?: 'light' | 'dark'
  /** Shows a one-line privacy summary with the full notice one tap away, still directly before the submit button. */
  collapsible?: boolean
}) {
  const toneClass = tone === 'dark' ? s.dark : s.light
  if (collapsible) {
    return (
      <div data-collection-notice={form}>
        <details className={`${s.box} ${toneClass} ${s.compact}`} aria-label="Privacy collection notice">
          <summary className={s.title}>
            Privacy: what we collect and why
          </summary>
          <p className={s.lead}>
            {COMPANY_NAME} collects the information you provide {COLLECTION_PURPOSES[form]}.
          </p>
          <p className={s.detail}>{COLLECTION_RECIPIENTS}</p>
          <p className={s.detail}>
            {COLLECTION_ACCESS} {COLLECTION_POLICY_LEAD}{' '}
            <a href={PRIVACY_POLICY_PATH}>{COLLECTION_POLICY_LINK_TEXT}</a>
            {COLLECTION_POLICY_TAIL}
          </p>
        </details>
        {/* the policy link sits outside <summary>: a link inside summary is not reliably reachable or announced */}
        <p className={s.detail} data-collection-policy-link>
          See our <a href={PRIVACY_POLICY_PATH}>{COLLECTION_POLICY_LINK_TEXT}</a>.
        </p>
      </div>
    )
  }
  return (
    <aside className={`${s.box} ${toneClass}`} data-collection-notice={form} aria-label="Privacy collection notice">
      <p className={s.title}>Privacy</p>
      <p className={s.lead}>
        {COMPANY_NAME} collects the information you provide {COLLECTION_PURPOSES[form]}.
      </p>
      <p className={s.detail}>{COLLECTION_RECIPIENTS}</p>
      <p className={s.detail}>
        {COLLECTION_ACCESS} {COLLECTION_POLICY_LEAD}{' '}
        <a href={PRIVACY_POLICY_PATH}>{COLLECTION_POLICY_LINK_TEXT}</a>
        {COLLECTION_POLICY_TAIL}
      </p>
    </aside>
  )
}
