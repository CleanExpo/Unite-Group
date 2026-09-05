'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useUIStore } from '@/store/ui'
import { getMissionControlSection } from '@/lib/navigation/mission-control'
import { useDeckTheme } from '@/app/(founder)/founder/command-centre/DeckThemeShell'
import missionStyles from '@/app/(founder)/founder/command-centre/founder-desk.module.css'

// Lazy-load overlay components — defers JS bundle until first render
const IdeaCapture = dynamic(
  () => import('./IdeaCapture').then(m => ({ default: m.IdeaCapture })),
  { ssr: false }
)
const CommandBar = dynamic(
  () => import('./CommandBar').then(m => ({ default: m.CommandBar })),
  { ssr: false }
)

interface FounderShellProps {
  children: React.ReactNode
  user: { name: string; email: string }
}

export function FounderShell({ children, user }: FounderShellProps) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleCommandBar = useUIStore((s) => s.toggleCommandBar)
  const toggleCapture = useUIStore((s) => s.toggleCapture)
  const pathname = usePathname()
  // UNI-2397/UNI-2398 — the command-centre HOME page registers its own ⌘K
  // palette (command-centre/CommandPalette.tsx), mounted only in its page.tsx.
  // Exact-match the home route and its mounted palette marker. Loading/error
  // boundaries lack that palette, so the shell CommandBar keeps search working
  // there, on every subpage, and everywhere else in the founder app.
  const onCommandDeck = pathname === '/founder/command-centre'
  const onMissionControl = getMissionControlSection(pathname) !== null
  const { daylight } = useDeckTheme()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      if (e.key === '\\') { e.preventDefault(); toggleSidebar(); return }
      if (e.key === 'k')  {
        if (onCommandDeck && document.querySelector('[data-mission-home-palette="true"]')) return
        e.preventDefault(); toggleCommandBar(); return
      }
      if (e.key === 'i')  { e.preventDefault(); toggleCapture(); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleSidebar, toggleCommandBar, toggleCapture, onCommandDeck])

  return (
    <div
      className={`flex h-screen overflow-hidden ${onMissionControl ? `${missionStyles.missionTheme} ${daylight ? missionStyles.missionDaylight : ''}` : ''}`}
      style={{ background: 'var(--surface-canvas)' }}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      <Sidebar user={user} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {!onMissionControl && <Topbar />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <IdeaCapture />
      <CommandBar />
    </div>
  )
}
