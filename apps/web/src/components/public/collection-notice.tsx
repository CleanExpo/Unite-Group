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
export function CollectionNotice({ form, tone = 'light' }: { form: CollectionNoticeForm; tone?: 'light' | 'dark' }) {
  const toneClass = tone === 'dark' ? s.dark : s.light
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
