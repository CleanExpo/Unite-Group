import styles from './mission-control-next.module.css'

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true">
      <p className={styles.muted}>Loading Mission Control…</p>
    </main>
  )
}
