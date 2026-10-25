// src/components/founder/inbox/InboxView.tsx
// Presentational Founder Inbox. Server-safe (no client hooks). Failed reads are
// shown as a banner naming the source; they are never rendered as "No enquiries".
import Link from 'next/link'
import {
  INBOX_SOURCES,
  INBOX_SOURCE_LABELS,
  filterInbox,
  type InboxResult,
  type InboxSource,
} from '@/lib/crm/inbox'
import styles from './inbox.module.css'

const BRISBANE = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Brisbane',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

export function formatBrisbane(iso: string): string {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 'Unknown time' : `${BRISBANE.format(new Date(t))} AEST`
}

function list(sources: InboxSource[]): string {
  return sources.map((s) => INBOX_SOURCE_LABELS[s]).join(', ')
}

export function InboxView({ result, source }: { result: InboxResult; source: InboxSource | null }) {
  const visible = filterInbox(result.items, source)
  const hasErrors = result.failedSources.length > 0

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Inbox</h1>
      <p className={styles.sub}>Everything that came in from the website and cards, last 90 days, newest first.</p>

      <nav className={styles.filters} aria-label="Filter by source">
        <Link href="/founder/inbox" className={source === null ? styles.filterActive : styles.filter}>
          All
        </Link>
        {INBOX_SOURCES.map((s) => (
          <Link
            key={s}
            href={`/founder/inbox?source=${s}`}
            className={source === s ? styles.filterActive : styles.filter}
          >
            {INBOX_SOURCE_LABELS[s]}
          </Link>
        ))}
      </nav>

      {hasErrors && (
        <div role="alert" className={styles.error}>
          Could not load: {list(result.failedSources)}. Items from these sources are missing below, so this list is
          incomplete.
        </div>
      )}
      {result.contactLinksFailed && (
        <div role="alert" className={styles.error}>
          Contact links could not be loaded. Items are shown without links to contacts.
        </div>
      )}
      {result.truncated.length > 0 && (
        <div role="status" className={styles.note}>
          Showing the most recent rows only for: {list(result.truncated)}. Older items are not shown.
        </div>
      )}

      {visible.length === 0 ? (
        hasErrors ? null : (
          <p className={styles.empty}>
            {result.items.length === 0 ? 'No enquiries yet' : 'No enquiries from this source in the last 90 days'}
          </p>
        )
      ) : (
        <ul className={styles.list}>
          {visible.map((item) => (
            <li key={item.id} className={styles.row}>
              <div className={styles.rowHead}>
                <span className={styles.badge} data-source={item.source}>
                  {INBOX_SOURCE_LABELS[item.source]}
                </span>
                <time dateTime={item.receivedAt} className={styles.time}>
                  {formatBrisbane(item.receivedAt)}
                </time>
              </div>
              <div className={styles.who}>
                {item.contactId ? (
                  <Link href={`/founder/contacts/${item.contactId}`}>{item.name}</Link>
                ) : (
                  item.name
                )}
                {item.email ? <span className={styles.meta}> {item.email}</span> : null}
                {item.origin ? <span className={styles.meta}> {item.origin}</span> : null}
              </div>
              {item.preview ? <p className={styles.preview}>{item.preview}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
