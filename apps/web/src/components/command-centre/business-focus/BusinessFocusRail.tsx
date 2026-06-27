import { buildBusinessFocusPayload, type BusinessFocusItem, type BusinessSignal } from '@/lib/command-centre/business-focus'
import { getProjects } from '@/lib/command-centre/registry'
import { SourceBadge } from '../SourceBadge'

const SIGNAL_LABEL: Record<BusinessSignal, string> = {
  live: 'live',
  watch: 'watch',
  needs_repo: 'repo needed',
  needs_url: 'url needed',
}

function signalColor(signal: BusinessSignal): string {
  if (signal === 'live') return 'var(--cc-ink)'
  if (signal === 'watch') return 'var(--cc-ink-dim)'
  return 'var(--cc-signal)'
}

function BusinessRow({ item }: { item: BusinessFocusItem }) {
  return (
    <article className="grid grid-cols-[0.5rem_minmax(0,1fr)] gap-3 px-5 py-4" style={{ background: 'var(--cc-bg-soft)' }}>
      <span aria-hidden="true" className="mt-1 h-10 w-1" style={{ background: item.color }} />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-mono text-sm uppercase tracking-[0.14em]" style={{ color: 'var(--cc-ink)' }}>
              {item.name}
            </h3>
            <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--cc-ink-hush)' }}>
              {item.primaryProjectName ?? 'No project mapped'} · {item.projectCount} project{item.projectCount === 1 ? '' : 's'}
            </p>
          </div>
          <span
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em]"
            style={{ color: signalColor(item.signal) }}
          >
            {SIGNAL_LABEL[item.signal]}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--cc-ink-dim)' }}>
          {item.nextAction}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {item.productionUrl && (
            <a
              href={item.productionUrl}
              className="border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
              style={{ borderColor: 'var(--cc-grid)', color: 'var(--cc-ink-dim)' }}
              target="_blank"
              rel="noreferrer"
            >
              app
            </a>
          )}
          {item.githubRepo && (
            <a
              href={`https://github.com/${item.githubRepo}`}
              className="border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
              style={{ borderColor: 'var(--cc-grid)', color: 'var(--cc-ink-dim)' }}
              target="_blank"
              rel="noreferrer"
            >
              repo
            </a>
          )}
          {item.integrationStatusUrl && (
            <a
              href={item.integrationStatusUrl}
              className="border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
              style={{ borderColor: 'var(--cc-grid)', color: 'var(--cc-ink-dim)' }}
              target="_blank"
              rel="noreferrer"
            >
              status
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export async function BusinessFocusRail() {
  const projects = await getProjects()
  const payload = buildBusinessFocusPayload(projects)

  return (
    <section className="flex flex-col" style={{ background: 'var(--cc-grid)' }} aria-label="Business focus rail">
      <header className="flex items-start justify-between gap-4 px-6 py-5" style={{ background: 'var(--cc-bg)' }}>
        <div className="min-w-0">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--cc-ink-dim)' }}>
            Business Focus
          </span>
          <h2 className="mt-1 text-xl font-semibold leading-tight" style={{ color: 'var(--cc-ink)' }}>
            Portfolio switchboard
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--cc-ink-dim)' }}>
            {payload.summary.owned} owned · {payload.summary.clients} client · {payload.summary.live} live
          </p>
        </div>
        <SourceBadge mode="live" label={`${payload.summary.businesses} businesses`} lastUpdatedAt={payload.generatedAt} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4" style={{ gap: 1, background: 'var(--cc-grid)' }}>
        {payload.items.map((item) => (
          <BusinessRow key={item.key} item={item} />
        ))}
      </div>
    </section>
  )
}
