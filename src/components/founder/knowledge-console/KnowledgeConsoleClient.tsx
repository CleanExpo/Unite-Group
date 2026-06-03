'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bot,
  Boxes,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  GitBranch,
  Inbox,
  ListChecks,
  Map,
  Network,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

type ProjectKey =
  | 'restoreassist'
  | 'synthex'
  | 'nexus'
  | 'carsi'
  | 'ccw'
  | 'disaster-recovery'

type KnowledgeProject = {
  key: ProjectKey
  label: string
  path: string
  status: 'mapped' | 'planned' | 'watching'
  notes: number
  tags: string[]
}

const PROJECTS: KnowledgeProject[] = [
  {
    key: 'restoreassist',
    label: 'RestoreAssist',
    path: '/02-Projects/RestoreAssist',
    status: 'mapped',
    notes: 42,
    tags: ['app-store', 'disaster-recovery', 'handoffs'],
  },
  {
    key: 'synthex',
    label: 'Synthex',
    path: '/02-Projects/Synthex',
    status: 'watching',
    notes: 35,
    tags: ['automation', 'crm', 'campaigns'],
  },
  {
    key: 'nexus',
    label: 'Unite-Group Nexus',
    path: '/02-Projects/Unite-Group-Nexus',
    status: 'mapped',
    notes: 57,
    tags: ['founder-os', 'hermes', 'codex'],
  },
  {
    key: 'carsi',
    label: 'CARSI',
    path: '/02-Projects/CARSI',
    status: 'planned',
    notes: 18,
    tags: ['research', 'market'],
  },
  {
    key: 'ccw',
    label: 'CCW',
    path: '/02-Projects/CCW',
    status: 'planned',
    notes: 24,
    tags: ['seo', 'content', 'catalogue'],
  },
  {
    key: 'disaster-recovery',
    label: 'Disaster Recovery / NRPG',
    path: '/02-Projects/Disaster-Recovery-NRPG',
    status: 'watching',
    notes: 31,
    tags: ['ops', 'response', 'field-work'],
  },
]

const NOTE_EXCERPT = [
  '# Knowledge Console Phase 1',
  '',
  'Obsidian stays local-first. Nexus renders the operational view.',
  '',
  '## Source model',
  '- Git/filesystem sync bridge for production ingestion',
  '- Obsidian URI links for local convenience',
  '- Local plugin bridge only after security review',
  '',
  '## Guardrails',
  '- Read-only by default',
  '- Founder-scoped records only',
  '- Hermes must cite note paths',
].join('\n')

const ACTIONS = [
  { label: 'Summarise selected note', icon: Sparkles, state: 'Planned' },
  { label: 'Extract action items', icon: ListChecks, state: 'Approval gated' },
  { label: 'Generate Codex handoff', icon: Bot, state: 'Planned' },
  { label: 'Prepare project briefing', icon: FileSearch, state: 'Planned' },
]

function statusLabel(status: KnowledgeProject['status']) {
  if (status === 'mapped') return 'Mapped'
  if (status === 'watching') return 'Watching'
  return 'Planned'
}

export function KnowledgeConsoleClient() {
  const [activeProjectKey, setActiveProjectKey] = useState<ProjectKey>('nexus')

  const activeProject = useMemo(
    () => PROJECTS.find((project) => project.key === activeProjectKey) ?? PROJECTS[0],
    [activeProjectKey],
  )

  return (
    <div className="flex min-h-full flex-col gap-5 p-4 md:p-6">
      <PageHeader
        title="Knowledge Console"
        subtitle="Read-only command centre for Obsidian-sourced project knowledge, Hermes handoffs, and future RAG."
        tip="Phase 1 is intentionally disconnected: no vault reads, no local Obsidian API, no write-back."
      />

      <div className="grid min-h-[calc(100vh-170px)] gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <aside
          className="flex min-h-[520px] flex-col rounded-sm border"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--color-accent)' }}>
              <Boxes size={14} strokeWidth={1.7} />
              Vault Explorer
            </div>
            <p className="mt-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              Project groups model the proposed Obsidian vault taxonomy.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {PROJECTS.map((project) => {
              const active = project.key === activeProject.key
              return (
                <button
                  key={project.key}
                  type="button"
                  onClick={() => setActiveProjectKey(project.key)}
                  className="mb-1 flex w-full items-start gap-3 rounded-sm px-3 py-3 text-left transition-colors"
                  style={{
                    background: active ? 'var(--color-accent-10)' : 'transparent',
                    border: active ? '1px solid var(--color-accent-border)' : '1px solid transparent',
                    color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  <Network size={15} className="mt-0.5 shrink-0" strokeWidth={1.6} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{project.label}</span>
                    <span className="mt-1 block truncate text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {project.path}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
                      <span>{project.notes} notes</span>
                      <span aria-hidden="true">/</span>
                      <span>{statusLabel(project.status)}</span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <main className="grid min-h-[520px] gap-4 lg:grid-rows-[auto_minmax(0,1fr)]">
          <section
            className="rounded-sm border p-4"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--color-accent)' }}>
                  <Map size={14} strokeWidth={1.7} />
                  Project Knowledge Map
                </div>
                <h2 className="mt-2 text-[18px] font-light" style={{ color: 'var(--color-text-primary)' }}>
                  {activeProject.label}
                </h2>
                <p className="mt-1 max-w-2xl text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Static preview of linked notes, tags, handoffs, and extraction lanes. Real data arrives after founder-scoped ingestion is approved.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeProject.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-sm border px-2 py-1 text-[11px]"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div
              className="flex min-h-[420px] flex-col overflow-hidden rounded-sm border"
              style={{ background: 'var(--surface-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--color-accent)' }}>
                    Markdown Note Preview
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    {activeProject.path}/Knowledge Console Phase 1.md
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-8 items-center gap-2 rounded-sm border px-3 text-[12px] opacity-50"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  title="Enabled later when a safe Obsidian URI is stored from ingestion metadata."
                >
                  <ExternalLink size={13} strokeWidth={1.7} />
                  Open in Obsidian
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_240px]">
                <pre
                  className="min-h-0 overflow-auto whitespace-pre-wrap p-4 font-mono text-[12px] leading-6"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {NOTE_EXCERPT}
                </pre>

                <div className="border-t p-4 lg:border-l lg:border-t-0" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-[12px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                    Frontmatter
                  </p>
                  <dl className="mt-3 space-y-3 text-[12px]">
                    {[
                      ['source', 'obsidian'],
                      ['note_type', 'handoff'],
                      ['status', 'draft'],
                      ['visibility', 'internal'],
                      ['owner', 'phill'],
                    ].map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <dt style={{ color: 'var(--color-text-disabled)' }}>{key}</dt>
                        <dd className="truncate" style={{ color: 'var(--color-text-primary)' }}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <Panel title="Hermes Actions" icon={Bot}>
                {ACTIONS.map(({ label, icon: Icon, state }) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-sm border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="flex min-w-0 items-center gap-2 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                      <Icon size={13} className="shrink-0" strokeWidth={1.7} />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-disabled)' }}>
                      {state}
                    </span>
                  </div>
                ))}
              </Panel>

              <Panel title="Agent Handoffs" icon={GitBranch}>
                {['Hermes', 'Codex', 'Rana', 'Margot'].map((agent) => (
                  <div key={agent} className="flex items-center justify-between text-[12px]">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{agent}</span>
                    <span style={{ color: 'var(--color-text-disabled)' }}>Queued model</span>
                  </div>
                ))}
              </Panel>

              <Panel title="Research Inbox" icon={Inbox}>
                <p className="text-[12px] leading-5" style={{ color: 'var(--color-text-secondary)' }}>
                  Captured research will land here for project classification before Hermes or Codex handoff.
                </p>
              </Panel>
            </div>
          </section>
        </main>

        <aside className="grid min-h-[520px] content-start gap-4">
          <Panel title="Action Extractor" icon={ListChecks}>
            <div className="rounded-sm border p-3" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Founder approval required
              </p>
              <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--color-text-secondary)' }}>
                Future extracted actions will be staged for approval before creating tasks or writing records.
              </p>
            </div>
          </Panel>

          <Panel title="Integration Posture" icon={ShieldCheck}>
            {[
              'Read-only shell active',
              'No local API exposure',
              'No write-back enabled',
              'Founder-scoped schema planned',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                <CheckCircle2 size={13} strokeWidth={1.7} style={{ color: 'var(--color-accent)' }} />
                {item}
              </div>
            ))}
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section
      className="rounded-sm border p-4"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--color-border)' }}
    >
      <div className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--color-accent)' }}>
        <Icon size={14} strokeWidth={1.7} />
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

