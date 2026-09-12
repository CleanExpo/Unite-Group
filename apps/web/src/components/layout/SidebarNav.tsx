// src/components/layout/SidebarNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
// Grouped nav data lives in the shared manifest (UNI-2341) so the global ⌘K
// CommandBar derives from the same source and can never drift from this list.
import { FOUNDER_NAV_GROUPS as NAV_GROUPS, getActiveFounderNavHref } from '@/lib/navigation/founder-nav'

interface SidebarNavProps { collapsed: boolean }

export function SidebarNav({ collapsed }: SidebarNavProps) {
  const pathname = usePathname()
  const activeHref = getActiveFounderNavHref(pathname)

  return (
    <nav className="flex flex-col gap-3 px-2">
      {NAV_GROUPS.map((group, gi) => {
        const collapsible = 'collapsible' in group && group.collapsible && !collapsed
        const activeGroup = group.items.some(item => activeHref === item.href)
        const content = <>

          {group.label && !collapsed && !collapsible && (
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
            const active = activeHref === href
            return (
              <Link
                key={href}
                href={href}
                aria-label={collapsed ? label : undefined}
                aria-current={active ? (pathname === href ? 'page' : 'location') : undefined}
                className={cn(
                  'nav-item-hover relative flex items-center gap-2 px-2 h-8 rounded-sm text-[13px] font-medium transition-colors duration-100',
                  active
                    ? 'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-accent before:rounded-r-sm'
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
        </>
        return collapsible ? <details key={group.label} open={activeGroup || undefined} className="flex flex-col gap-0.5">
          <summary className="px-2 text-[13px] font-medium cursor-pointer">{group.label}</summary>
          <div className="flex flex-col gap-0.5 pl-2">{content}</div>
        </details> : <div key={group.label ?? `group-${gi}`} className="flex flex-col gap-0.5">{content}</div>
      })}
    </nav>
  )
}
