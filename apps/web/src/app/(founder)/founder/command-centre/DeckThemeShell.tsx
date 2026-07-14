'use client'

// DeckThemeShell — client wrapper for the command deck's visual register.
// The deck page stays a Server Component; only the Feel flip (deck ↔
// daylight) is client state, persisted in the ui store. Daylight is the
// Affirm-inspired paper/indigo register (docs/design/mobbin-ui-library.md).
import type { ReactNode } from 'react'
import { useUIStore } from '@/store/ui'
import styles from './command-deck.module.css'
import shell from './shell.module.css'

export function DeckThemeShell({ className, children }: { className: string; children: ReactNode }) {
  const deckTheme = useUIStore((s) => s.deckTheme)
  const setDeckTheme = useUIStore((s) => s.setDeckTheme)
  const daylight = deckTheme === 'daylight'
  return (
    <div className={daylight ? `${className} ${styles.daylight} ${shell.daylight}` : className}>
      {children}
      <button
        type="button"
        className={styles.feelToggle}
        onClick={() => setDeckTheme(daylight ? 'deck' : 'daylight')}
        aria-pressed={daylight}
        data-testid="deck-feel-toggle"
      >
        Feel: {daylight ? 'Daylight' : 'Deck'}
      </button>
    </div>
  )
}
