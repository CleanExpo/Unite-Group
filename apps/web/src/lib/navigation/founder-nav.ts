// src/lib/navigation/founder-nav.ts
//
// UNI-2341 — single nav manifest for the founder shell. SidebarNav renders the
// grouped form; CommandBar (global ⌘K) derives its jump list from the same
// data, so the two can never drift again (CommandBar was missing 12 of 26
// destinations when they were maintained as separate hardcoded arrays).

import type { LucideIcon } from 'lucide-react'
import { BookOpen, Columns2, Lock, FileText, ClipboardCheck, Scale, Share2, FlaskConical, Users, Settings, Receipt, Mail, CalendarDays, Brain, Sparkles, BarChart2, Megaphone, ScrollText, Building2, Library, Command, Bot, NotebookText, GitPullRequest, TrendingUp, Clapperboard } from 'lucide-react'

export interface FounderNavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface FounderNavGroup {
  label: string | null
  items: readonly FounderNavItem[]
}

export const FOUNDER_NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: '/founder/command-centre', label: 'Command Centre',  icon: Command },
      { href: '/founder/nexus',          label: 'PR Approvals',    icon: GitPullRequest },
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
      { href: '/founder/kanban',        label: 'Kanban',        icon: Columns2 },
      { href: '/founder/opportunities', label: 'Opportunities', icon: TrendingUp },
      { href: '/founder/contacts',      label: 'Contacts',      icon: Users },
      { href: '/founder/email',    label: 'Email',    icon: Mail },
      { href: '/founder/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/founder/social',      label: 'Social',      icon: Share2 },
      { href: '/founder/campaigns',   label: 'Campaigns',   icon: Megaphone },
      { href: '/founder/brand-video', label: 'Brand Video', icon: Clapperboard },
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

/** Flat ordered list of every founder nav destination. */
export const FOUNDER_NAV_ITEMS: readonly FounderNavItem[] = FOUNDER_NAV_GROUPS.flatMap((g) => [...g.items])
