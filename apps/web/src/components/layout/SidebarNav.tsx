// src/components/layout/SidebarNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Columns2, Lock, FileText, ClipboardCheck, Scale, Share2, FlaskConical, Users, Settings, Receipt, Mail, CalendarDays, Brain, Sparkles, BarChart2, Megaphone, ScrollText, Building2, Library, Command, Bot, NotebookText } from 'lucide-react'
import { cn } from '@/lib/utils'

// Grouped into a few clearly-labelled sections so the nav reads as organised,
// not a squashed wall of 24 flat links. Section labels show when expanded; a thin
// divider separates groups when collapsed.
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: '/founder/dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
      { href: '/founder/command-centre', label: 'Command Centre',  icon: Command },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/founder/bookkeeper', label: 'Bookkeeper', icon: BookOpen },
      { href: '/founder/xero',       label: 'Xero',       icon: Receipt },
      { href: '/founder/invoices',   label: 'Invoices',   icon: ScrollText },
      { href: '/founder/approvals',  label: 'Approvals',  icon: ClipboardCheck },
    ],
  },
  {
    label: 'Pipeline',
    items: [
      { href: '/founder/kanban',   label: 'Kanban',   icon: Columns2 },
      { href: '/founder/contacts', label: 'Contacts', icon: Users },
      { href: '/founder/email',    label: 'Email',    icon: Mail },
      { href: '/founder/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/founder/social',      label: 'Social',      icon: Share2 },
      { href: '/founder/campaigns',   label: 'Campaigns',   icon: Megaphone },
      { href: '/founder/analytics',   label: 'Analytics',   icon: BarChart2 },
      { href: '/founder/experiments', label: 'Experiments', icon: FlaskConical },
    ],
  },
  {
    label: 'Advisory',
    items: [
      { href: '/founder/advisory',  label: 'Advisory',  icon: Scale },
      { href: '/founder/strategy',  label: 'Strategy',  icon: Brain },
      { href: '/founder/boardroom', label: 'Boardroom', icon: Building2 },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { href: '/founder/notes',             label: 'Notes',             icon: FileText },
      { href: '/founder/knowledge-console', label: 'Knowledge Console', icon: Library },
      { href: '/founder/wiki',              label: 'Wiki',              icon: NotebookText },
      { href: '/founder/pi',                label: 'Pi',                icon: Bot },
      { href: '/founder/skills',            label: 'Skills',            icon: Sparkles },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/founder/vault',    label: 'Vault',    icon: Lock },
      { href: '/founder/settings', label: 'Settings', icon: Settings },
    ],
  },
] as const

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
