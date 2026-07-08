'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FOUNDER_NAV_ITEMS } from '@/lib/navigation/founder-nav'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command'
import { useUIStore } from '@/store/ui'
import type { SearchResults } from '@/app/api/search/route'

interface NavCommand {
  type: 'nav'
  label: string
  icon: LucideIcon
  path: string
  shortcut?: string
}

interface ActionCommand {
  type: 'action'
  label: string
  icon: LucideIcon
  action: () => void
  shortcut?: string
}

type Command = NavCommand | ActionCommand

// UNI-2341 — derived from the shared founder-nav manifest; previously a separate
// hardcoded list that had drifted to 14 of 26 destinations.
const NAV_COMMANDS: NavCommand[] = FOUNDER_NAV_ITEMS.map((item) => ({
  type: 'nav',
  label: item.label,
  icon: item.icon,
  path: item.href,
}))

export function CommandBar() {
  const router = useRouter()
  const commandBarOpen = useUIStore((s) => s.commandBarOpen)
  const toggleCommandBar = useUIStore((s) => s.toggleCommandBar)
  const toggleCapture = useUIStore((s) => s.toggleCapture)

  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)

  // Memoised to avoid re-creating the array on every render — only rebuilds when toggle fns change
  const ACTION_COMMANDS: ActionCommand[] = useMemo(() => [
    {
      type: 'action',
      label: 'Capture Idea',
      icon: Zap,
      action: toggleCapture,
      shortcut: '\u2318I',
    },
  ], [toggleCapture])

  // Debounced search effect
  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        if (!res.ok) {
          setResults(null)
          setLoading(false)
          return
        }
        const data: SearchResults = await res.json()
        setResults(data)
        setLoading(false)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setResults(null)
        setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  // Reset all search state when the dialog closes
  useEffect(() => {
    if (!commandBarOpen) {
      setQuery('')
      setResults(null)
      setLoading(false)
    }
  }, [commandBarOpen])

  if (!commandBarOpen) return null

  function run(cmd: Command) {
    if (cmd.type === 'nav') {
      router.push(cmd.path)
    } else {
      cmd.action()
    }
    toggleCommandBar()
  }

  const isSearchMode = query.length >= 2

  return (
    <CommandDialog open={commandBarOpen} onOpenChange={toggleCommandBar} shouldFilter={!isSearchMode}>
      <CommandInput
        placeholder="Search pages and actions\u2026"
        onValueChange={setQuery}
        value={query}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Nav + Actions — only visible in non-search mode (cmdk filters them) */}
        {!isSearchMode && (
          <>
            <CommandGroup heading="Navigate">
              {NAV_COMMANDS.map((cmd) => (
                <CommandItem
                  key={cmd.label}
                  value={cmd.label}
                  onSelect={() => run(cmd)}
                >
                  <cmd.icon
                    size={14}
                    strokeWidth={1.5}
                    style={{ color: 'var(--color-text-disabled)' }}
                  />
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Actions">
              {ACTION_COMMANDS.map((cmd) => (
                <CommandItem
                  key={cmd.label}
                  value={cmd.label}
                  onSelect={() => run(cmd)}
                >
                  <cmd.icon
                    size={14}
                    strokeWidth={1.5}
                    style={{ color: 'var(--color-text-disabled)' }}
                  />
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Loading state */}
        {isSearchMode && loading && (
          <CommandEmpty>{'Searching\u2026'}</CommandEmpty>
        )}

        {/* Search results */}
        {isSearchMode && !loading && results && (
          <>
            {results.contacts.length > 0 && (
              <CommandGroup heading="Contacts">
                {results.contacts.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => { router.push('/founder/contacts'); toggleCommandBar() }}
                  >
                    <span>{c.name}</span>
                    {c.company && (
                      <span style={{ color: 'var(--color-text-disabled)' }}>{c.company}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.pages.length > 0 && (
              <CommandGroup heading="Pages">
                {results.pages.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => { router.push(`/founder/notes`); toggleCommandBar() }}
                  >
                    <span>{p.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.approvals.length > 0 && (
              <CommandGroup heading="Approvals">
                {results.approvals.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={a.id}
                    onSelect={() => { router.push('/founder/approvals'); toggleCommandBar() }}
                  >
                    <span>{a.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
