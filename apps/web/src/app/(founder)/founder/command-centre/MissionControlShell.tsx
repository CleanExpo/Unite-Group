'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { MISSION_CONTROL_ROUTES, type MissionControlSection } from '@/lib/navigation/mission-control'
import { DeckThemeShell, DeckThemeToggle } from './DeckThemeShell'
import styles from './founder-desk.module.css'
import deckStyles from './command-deck.module.css'
import navigation from './mission-control-navigation.module.css'

export function MissionControlShell({ section, title, description, actions, className = '', children }: {
  section: MissionControlSection
  title?: string
  description?: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  const activeSecondary = MISSION_CONTROL_ROUTES.find(route => !route.primary && route.section === section)
  const workspaceLinks = MISSION_CONTROL_ROUTES.map(route => ({
    primary: route.primary,
    link: <Link key={route.section} href={route.href} aria-current={route.section === section ? 'page' : undefined} id={section === 'home' ? route.section === 'portfolio' ? 'portfolio' : route.section === 'knowledge' ? 'capability-bus' : undefined : undefined}>{route.label}</Link>,
  }))

  return <DeckThemeShell className={`${styles.shell} ${deckStyles.missionTokens} ${className}`} showToggle={false}>
    <div className={styles.workspace} data-mission-control="true" data-mission-home-palette={section === 'home' && Boolean(actions) ? 'true' : undefined}>
      <Topbar missionControl home={section === 'home' && Boolean(actions)} className={styles.workspaceChrome} searchAction={section === 'home' ? actions : undefined} themeControl={<DeckThemeToggle className={styles.workspaceThemeToggle} />} />
      <nav className={styles.workspaceNav} aria-label="Mission Control workspaces">
        {workspaceLinks.filter(item => item.primary).map(item => item.link)}
        <details className={navigation.more} data-active={Boolean(activeSecondary)}>
          <summary>
            <span>More workspaces</span>
            {activeSecondary && <span className={navigation.activeWorkspace}><span aria-hidden="true"> · </span><span className="sr-only">Current workspace: </span>{activeSecondary.label}</span>}
          </summary>
          <div className={navigation.secondaryLinks}>
            {workspaceLinks.filter(item => !item.primary).map(item => item.link)}
          </div>
        </details>
      </nav>
      {title && <div className={styles.workspaceHeading}><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{section !== 'home' && actions}</div>}
      {!title && section !== 'home' && actions}
      {children}
    </div>
  </DeckThemeShell>
}
