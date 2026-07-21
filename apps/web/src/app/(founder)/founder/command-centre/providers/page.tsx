// src/app/(founder)/founder/command-centre/providers/page.tsx
//
// Providers deck (UNI-2378 wave 1) — the LLM provider pool, usage cockpit
// and cost allocation tiles RELOCATED wholesale from the main command deck
// when it went calm-cockpit. Every tile renders exactly as it did on
// page.tsx (all three are self-contained client panels); only the route
// moved. Deck register mirrors hermes-control-panel/page.tsx (fonts +
// styles.deck + shell tokens). Auth enforced by the (founder) layout.

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Chakra_Petch, Syne, JetBrains_Mono } from 'next/font/google'
import { ProviderAccountsTile } from '@/components/command-centre/provider-accounts/ProviderAccountsTile'
import { ProviderUsageCockpit } from '@/components/command-centre/provider-usage/ProviderUsageCockpit'
import { CostAllocationTile } from '@/components/command-centre/cost-allocation/CostAllocationTile'
import { DeckThemeShell } from '../DeckThemeShell'
import shell from '../shell.module.css'
import styles from '../command-deck.module.css'

const chakra = Chakra_Petch({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-chakra',
  display: 'swap',
})
const syne = Syne({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})
const jbMono = JetBrains_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
})

export default function ProvidersDeckPage() {
  return (
    <DeckThemeShell className={`${chakra.variable} ${syne.variable} ${jbMono.variable} ${styles.deck}`}>
      <Link href="/founder/command-centre" className={styles.plink}>
        &larr; Command deck
      </Link>

      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="providers">
        <h2>Providers</h2>
        <span className={shell.glassSub}>accounts pool · usage meters · cost allocation</span>
      </div>

      {/* The LLM provider pool — register plans, see live routing state. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.02s' }}>
        <ProviderAccountsTile />
      </section>

      {/* AI provider capacity — usage meters next to the accounts pool. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.04s' }}>
        <ProviderUsageCockpit />
      </section>

      {/* Cost allocation — metering spend per source vs revenue, current month. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.06s' }}>
        <CostAllocationTile />
      </section>
    </DeckThemeShell>
  )
}
