'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { MISSION_CONTROL_ROUTES, type MissionControlSection } from '@/lib/navigation/mission-control'
import { DeckThemeShell, DeckThemeToggle } from './DeckThemeShell'
import styles from './founder-desk.module.css'
import deckStyles from './command-deck.module.css'

export function MissionControlShell({ section, title, description, actions, className = '', children }: {
  section: MissionControlSection
  title?: string
  description?: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  return <DeckThemeShell className={`${styles.shell} ${deckStyles.missionTokens} ${className}`} showToggle={false}>
    <div className={styles.workspace} data-mission-control="true" data-mission-home-palette={section === 'home' && Boolean(actions) ? 'true' : undefined}>
      <Topbar missionControl home={section === 'home' && Boolean(actions)} className={styles.workspaceChrome} searchAction={section === 'home' ? actions : undefined} themeControl={<DeckThemeToggle className={styles.workspaceThemeToggle} />} />
      <nav className={styles.workspaceNav} aria-label="Mission Control workspaces">
        {MISSION_CONTROL_ROUTES.map(route => <Link key={route.section} href={route.href} aria-current={route.section === section ? 'page' : undefined} id={section === 'home' ? route.section === 'portfolio' ? 'portfolio' : route.section === 'knowledge' ? 'capability-bus' : undefined : undefined}>{route.label}</Link>)}
      </nav>
      {title && <div className={styles.workspaceHeading}><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{section !== 'home' && actions}</div>}
      {!title && section !== 'home' && actions}
      {children}
    </div>
  </DeckThemeShell>
}
