import {
  COLLECTION_POLICY_LEAD,
  COLLECTION_POLICY_LINK_TEXT,
  COLLECTION_POLICY_TAIL,
  PRIVACY_POLICY_PATH,
  collectionNoticeText,
  type CollectionNoticeForm,
} from '@/lib/legal/collection-notice'

import s from './collection-notice.module.css'

/**
 * APP 5 collection notice for a public form that collects personal information. Place it inside the form,
 * directly before the submit button, so it is read at or before collection. The wording lives in
 * src/lib/legal/collection-notice.ts and nowhere else.
 * No consent control: this is a notice, and it asks for nothing.
 */
export function CollectionNotice({ form, tone = 'light' }: { form: CollectionNoticeForm; tone?: 'light' | 'dark' }) {
  return (
    <p className={`${s.notice} ${tone === 'dark' ? s.dark : s.light}`} data-collection-notice={form}>
      {collectionNoticeText(form)} {COLLECTION_POLICY_LEAD} <a href={PRIVACY_POLICY_PATH}>{COLLECTION_POLICY_LINK_TEXT}</a>
      {COLLECTION_POLICY_TAIL}
    </p>
  )
}
