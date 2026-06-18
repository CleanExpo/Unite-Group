export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BUSINESSES } from '@/lib/businesses'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type IconProps = { size?: number; strokeWidth?: number; className?: string } & React.SVGProps<SVGSVGElement>

function iconBase(size: number, strokeWidth: number, className: string | undefined, props: React.SVGProps<SVGSVGElement>) {
  return {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    className, 'aria-hidden': true, ...props,
  }
}

function FileText({ size = 14, strokeWidth = 2, className, ...props }: IconProps) {
  return (
    <svg {...iconBase(size, strokeWidth, className, props)}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  )
}

function Plus({ size = 14, strokeWidth = 2, className, ...props }: IconProps) {
  return (
    <svg {...iconBase(size, strokeWidth, className, props)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function Megaphone({ size = 16, strokeWidth = 2, className, ...props }: IconProps) {
  return (
    <svg {...iconBase(size, strokeWidth, className, props)}>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  )
}

function Scale({ size = 16, strokeWidth = 2, className, ...props }: IconProps) {
  return (
    <svg {...iconBase(size, strokeWidth, className, props)}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  )
}

function BookOpen({ size = 16, strokeWidth = 2, className, ...props }: IconProps) {
  return (
    <svg {...iconBase(size, strokeWidth, className, props)}>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

function UserPlus({ size = 16, strokeWidth = 2, className, ...props }: IconProps) {
  return (
    <svg {...iconBase(size, strokeWidth, className, props)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  )
}

function FlaskConical({ size = 14, strokeWidth = 2, className, ...props }: IconProps) {
  return (
    <svg {...iconBase(size, strokeWidth, className, props)}>
      <path d="M10 2v7.31" />
      <path d="M14 9.3V2" />
      <path d="M8.5 2h7" />
      <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
      <path d="M5.52 16h12.96" />
    </svg>
  )
}

interface Props {
  params: Promise<{ businessKey: string }>
}

export default async function BusinessHubPage({ params }: Props) {
  const { businessKey } = await params

  // Validate business key against config
  const business = BUSINESSES.find((b) => b.key === businessKey)
  if (!business) {
    redirect('/founder')
  }

  const user = await getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const supabase = createServiceClient()

  // Look up the DB business record by slug to get the UUID
  const { data: dbBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('founder_id', user.id)
    .eq('slug', businessKey)
    .maybeSingle()

  const businessId = dbBusiness?.id

  // Fetch data in parallel — gracefully handle missing DB business
  const [contactsResult, pagesResult, xeroResult, experimentsResult] = await Promise.all([
    businessId
      ? supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('founder_id', user.id)
          .eq('business_id', businessId)
      : Promise.resolve({ count: 0 }),
    businessId
      ? supabase
          // nexus_* is an older Notion-like sub-system scoped by owner_id (the
          // founder, single-tenant) — it has no founder_id column. Filtering
          // founder_id here errored against the real schema.
          .from('nexus_pages')
          .select('id, title, updated_at')
          .eq('owner_id', user.id)
          .eq('business_id', businessId)
          .order('updated_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    businessId
      ? supabase
          .from('credentials_vault')
          .select('id', { count: 'exact', head: true })
          .eq('founder_id', user.id)
          .eq('service', 'xero')
          .eq('business_id', businessId)
      : Promise.resolve({ count: 0 }),
    supabase
      .from('experiments')
      .select('id, title, status, experiment_type, created_at')
      .eq('founder_id', user.id)
      .eq('business_key', businessKey)
      .in('status', ['draft', 'active', 'completed'])
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const contactCount = ('count' in contactsResult ? contactsResult.count : 0) ?? 0
  const pages = ('data' in pagesResult ? pagesResult.data : []) ?? []
  const xeroConnected = (('count' in xeroResult ? xeroResult.count : 0) ?? 0) > 0
  const experiments = (('data' in experimentsResult ? experimentsResult.data : []) ?? []) as Array<{ id: string; title: string; status: string; experiment_type: string; created_at: string }>

  const quickActions = [
    { label: 'New Post', href: '/founder/social', icon: Megaphone },
    { label: 'Advisory Case', href: '/founder/advisory', icon: Scale },
    { label: 'View Bookkeeper', href: '/founder/bookkeeper', icon: BookOpen },
    { label: 'Add Contact', href: '/founder/contacts', icon: UserPlus },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className="rounded-full"
          style={{ width: 10, height: 10, background: business.color, display: 'inline-block' }}
        />
        <h1
          className="text-xl font-light"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {business.name}
        </h1>
        <span
          className="text-[11px] px-2 py-0.5 rounded-sm font-medium uppercase tracking-wider"
          style={{
            background: 'rgba(0, 245, 255, 0.08)',
            color: '#00F5FF',
            border: '1px solid rgba(0, 245, 255, 0.15)',
          }}
        >
          {business.status}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="rounded-sm p-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-disabled)' }}>
            Xero
          </p>
          <p
            className="text-sm font-medium"
            style={{ color: xeroConnected ? '#00F5FF' : 'var(--color-text-muted)' }}
          >
            {xeroConnected ? 'Connected' : 'Not connected'}
          </p>
        </div>
        <div
          className="rounded-sm p-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-disabled)' }}>
            Contacts
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {contactCount}
          </p>
        </div>
        <div
          className="rounded-sm p-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-disabled)' }}>
            Pages
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {pages.length}
          </p>
        </div>
      </div>

      {/* Active Experiments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Experiments
          </h2>
          <Link href="/founder/experiments" className="text-[11px]" style={{ color: '#00F5FF' }}>
            View all →
          </Link>
        </div>
        {experiments.length === 0 ? (
          <p className="text-[13px] py-4" style={{ color: 'var(--color-text-disabled)' }}>
            No experiments yet. Generate one with Synthex AI.
          </p>
        ) : (
          <div className="rounded-sm divide-y" style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)' }}>
            {experiments.map(exp => (
              <Link key={exp.id} href={`/founder/experiments/${exp.id}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:brightness-110"
                style={{ color: 'var(--color-text-primary)' }}>
                <div className="flex items-center gap-2">
                  <FlaskConical size={14} strokeWidth={1.5} style={{ color: 'var(--color-text-disabled)' }} />
                  <span className="text-[13px] truncate">{exp.title}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-sm font-medium uppercase tracking-wider"
                  style={{
                    background: exp.status === 'active' ? 'rgba(0, 245, 255, 0.08)' : exp.status === 'completed' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                    color: exp.status === 'active' ? '#00F5FF' : exp.status === 'completed' ? '#22c55e' : 'var(--color-text-muted)',
                  }}>
                  {exp.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Nexus Pages */}
      <div>
        <h2
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Nexus Pages
        </h2>
        <div
          className="rounded-sm divide-y"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--color-border)',
            borderColor: 'var(--color-border)',
          }}
        >
          {pages.length === 0 && (
            <p
              className="px-4 py-6 text-center text-[13px]"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              No pages yet. Create your first page below.
            </p>
          )}
          {(pages as Array<{ id: string; title: string; updated_at: string }>).map((page) => (
            <Link
              key={page.id}
              href={`/founder/${businessKey}/page/${page.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-100 hover:brightness-110"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <FileText size={14} strokeWidth={1.5} style={{ color: 'var(--color-text-disabled)' }} />
              <span className="text-[13px] flex-1 truncate">{page.title}</span>
              <span className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
                {new Date(page.updated_at).toLocaleDateString('en-AU')}
              </span>
            </Link>
          ))}
          <Link
            href={`/founder/${businessKey}/page/new`}
            className="flex items-center gap-2 px-4 py-3 transition-colors duration-100"
            style={{ color: '#00F5FF' }}
          >
            <Plus size={14} strokeWidth={2} />
            <span className="text-[13px] font-medium">New Page</span>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="rounded-sm p-4 flex items-center gap-3 transition-colors duration-100 hover:brightness-110"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <action.icon size={16} strokeWidth={1.5} style={{ color: business.color }} />
              <span className="text-[13px] font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
