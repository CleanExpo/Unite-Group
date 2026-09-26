'use client'

import styles from './mission-control-next.module.css'

export default function MissionControlNextError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={styles.page} role="alert">
      <p>Mission Control preview failed to render. Nothing was changed.</p>
      <button type="button" className={styles.button} onClick={reset}>
        Try again
      </button>
    </main>
  )
}
