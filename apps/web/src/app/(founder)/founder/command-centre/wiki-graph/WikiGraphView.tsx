import type { buildWikiGraph } from '@/lib/command-centre/wiki-graph'
import { WikiGraphCanvas } from '@/components/command-centre/wiki-graph/WikiGraphCanvas'
import { MissionControlShell } from '../MissionControlShell'

const WIKI_PAGES_LIMIT = 1000

function formatSync(iso: string | null): string {
  if (!iso) return 'never'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return d.toLocaleString('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export interface WikiGraphViewProps { graph: ReturnType<typeof buildWikiGraph> | null; error: boolean; truncated: boolean; className?: string }

export function WikiGraphView({ graph, error, truncated, className }: WikiGraphViewProps) {
  return (
    <MissionControlShell section="wiki-graph" title="Wiki graph" className={className}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {truncated && (
            <span style={{ fontSize: 11, color: 'var(--mission-attention)' }}>
              showing first {WIKI_PAGES_LIMIT} pages
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: 12, color: 'var(--mission-muted)' }}>
          <span>
            <b style={{ color: 'var(--mission-ink)' }}>{error ? 'Unavailable' : graph?.pageCount ?? 0}</b> pages
          </span>
          <span>
            <b style={{ color: 'var(--mission-ink)' }}>{error ? 'Unavailable' : graph?.edges.length ?? 0}</b> links
          </span>
          <span>
            synced <b style={{ color: 'var(--mission-ink)' }}>{formatSync(graph?.lastSync ?? null)}</b>
          </span>
        </div>
      </header>

      {error ? (
        <EmptyState
          title="Wiki graph unavailable"
          detail="Could not read the wiki knowledge base. The wiki_pages source did not respond."
        />
      ) : !graph || graph.pageCount === 0 ? (
        <EmptyState
          title="Wiki not synced"
          detail="0 pages found in the knowledge base. Once the Obsidian 2nd Brain sync populates wiki_pages, the graph will render here."
        />
      ) : (
        <div style={{ height: 'min(70vh, 760px)', minHeight: 400, position: 'relative' }}>
          <WikiGraphCanvas nodes={graph.nodes} edges={graph.edges} />
          <p style={{ margin: '0.5rem 0 0', fontSize: 11, color: 'var(--mission-muted)' }}>
            Drag to pan · scroll to zoom · drag a node to move it · hover to highlight neighbours · click to open the page
          </p>
        </div>
      )}
    </MissionControlShell>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 8,
        borderRadius: 2,
        border: '1px solid var(--mission-border)',
        background: 'var(--mission-surface)',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--mission-blue)' }}>{title}</span>
      <span style={{ fontSize: 12, color: 'var(--mission-muted)', maxWidth: 420 }}>{detail}</span>
    </div>
  )
}
