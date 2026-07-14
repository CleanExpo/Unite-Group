// src/store/ui.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'
// Command-deck visual register: 'deck' (flight-deck dark, default) or
// 'daylight' (Affirm-inspired paper/indigo — see docs/design/mobbin-ui-library.md).
type DeckTheme = 'deck' | 'daylight'

interface UIStore {
  sidebarOpen: boolean
  expandedBusinesses: string[]
  theme: Theme
  deckTheme: DeckTheme
  captureOpen: boolean
  commandBarOpen: boolean
  toggleSidebar: () => void
  toggleBusiness: (key: string) => void
  setTheme: (theme: Theme) => void
  setDeckTheme: (deckTheme: DeckTheme) => void
  toggleCapture: () => void
  toggleCommandBar: () => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      expandedBusinesses: [],
      theme: 'light',
      deckTheme: 'deck',
      captureOpen: false,
      commandBarOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleBusiness: (key) =>
        set((s) => ({
          expandedBusinesses: s.expandedBusinesses.includes(key)
            ? s.expandedBusinesses.filter((k) => k !== key)
            : [...s.expandedBusinesses, key],
        })),
      setTheme: (theme) => set({ theme }),
      setDeckTheme: (deckTheme) => set({ deckTheme }),
      toggleCapture: () => set((s) => ({ captureOpen: !s.captureOpen })),
      toggleCommandBar: () => set((s) => ({ commandBarOpen: !s.commandBarOpen })),
    }),
    {
      name: 'nexus-ui',
      // commandBarOpen intentionally excluded — always starts closed
      partialize: (s) => ({
        sidebarOpen: s.sidebarOpen,
        expandedBusinesses: s.expandedBusinesses,
        theme: s.theme,
        deckTheme: s.deckTheme,
      }),
    }
  )
)
