// src/components/layout/SidebarNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
// Grouped nav data lives in the shared manifest (UNI-2341) so the global ⌘K
// CommandBar derives from the same source and can never drift from this list.
import { FOUNDER_NAV_GROUPS as NAV_GROUPS } from '@/lib/navigation/founder-nav'

interface SidebarNavProps { collapsed: boolean }

export function SidebarNav({ collapsed }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-3 px-2">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label ?? `group-${gi}`} className="flex flex-col gap-0.5">
          {group.label && !collapsed && (
            <span
              className="px-2 pb-0.5 text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              {group.label}
            </span>
          )}
          {group.label && collapsed && gi > 0 && (
            <div className="mx-2 mb-1 h-px" style={{ background: 'var(--color-border)' }} />
          )}
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'nav-item-hover relative flex items-center gap-2 px-2 h-8 rounded-sm text-[13px] font-medium transition-colors duration-100',
                  active
                    ? 'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-[var(--color-accent)] before:rounded-r-sm'
                    : ''
                )}
                style={active
                  ? { color: 'var(--color-text-primary)', background: 'var(--surface-elevated)' }
                  : { color: 'var(--color-text-muted)' }
                }
              >
                <Icon size={16} strokeWidth={1.75} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
