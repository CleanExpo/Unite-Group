import { BUSINESSES, type Business } from '@/lib/businesses'
import type { CommandCentreProject } from './registry'

export type BusinessSignal = 'live' | 'watch' | 'needs_repo' | 'needs_url'

export interface BusinessFocusItem {
  key: Business['key']
  name: Business['name']
  type: Business['type']
  status: Business['status']
  color: Business['color']
  signal: BusinessSignal
  projectCount: number
  primaryProjectName: string | null
  productionUrl: string | null
  githubRepo: string | null
  integrationStatusUrl: string | null
  nextAction: string
}

export interface BusinessFocusPayload {
  source: 'cc:business-focus'
  generatedAt: string
  summary: {
    businesses: number
    owned: number
    clients: number
    live: number
    watch: number
    needsRepo: number
    needsUrl: number
  }
  items: BusinessFocusItem[]
}

// CommandCentre registry project names (repo-style) per business key. This is
// distinct from the Kanban path's Linear project names (see linear.ts) — the
// registry and Linear use different naming, so the two maps must stay separate.
const PROJECTS_BY_BUSINESS_KEY: Record<Business['key'], string[]> = {
  dr: ['Disaster-Recovery'],
  nrpg: ['DR-NRPG'],
  carsi: ['CARSI'],
  restore: ['RestoreAssist'],
  synthex: ['Synthex'],
  ato: ['ATO-APP'],
  itr: ['Dimitri-ITR'],
  ccw: ['CCW-CRM', 'CCW'],
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function projectsForBusiness(business: Business, projects: CommandCentreProject[]): CommandCentreProject[] {
  const expectedNames = new Set((PROJECTS_BY_BUSINESS_KEY[business.key] ?? []).map(normalize))
  return projects.filter((project) => expectedNames.has(normalize(project.name)))
}

function signalFor(projects: CommandCentreProject[]): BusinessSignal {
  if (projects.length === 0) return 'needs_repo'
  if (projects.every((project) => !project.github_repo)) return 'needs_repo'
  if (projects.every((project) => !project.production_url)) return 'needs_url'
  if (projects.some((project) => project.status !== 'active' || !project.production_url || !project.github_repo)) return 'watch'
  return 'live'
}

function nextActionFor(signal: BusinessSignal, business: Business, project: CommandCentreProject | null): string {
  if (signal === 'needs_repo') return `Connect ${business.name} to a repo-backed project before assigning agent work.`
  if (signal === 'needs_url') return `Add the production URL for ${project?.name ?? business.name} so Mission Control can verify it.`
  if (signal === 'watch') return `Review ${business.name} project coverage and close missing launch evidence.`
  return `Keep ${business.name} in the live sweep and route the next useful task.`
}

export function buildBusinessFocusPayload(
  projects: CommandCentreProject[],
  now: Date = new Date(),
): BusinessFocusPayload {
  const items = BUSINESSES.map((business) => {
    const matches = projectsForBusiness(business, projects)
    const primary = matches.find((project) => project.status === 'active') ?? matches[0] ?? null
    const signal = signalFor(matches)

    return {
      key: business.key,
      name: business.name,
      type: business.type,
      status: business.status,
      color: business.color,
      signal,
      projectCount: matches.length,
      primaryProjectName: primary?.name ?? null,
      productionUrl: primary?.production_url ?? null,
      githubRepo: primary?.github_repo ?? null,
      integrationStatusUrl: primary?.integration_status_url ?? null,
      nextAction: nextActionFor(signal, business, primary),
    }
  })

  return {
    source: 'cc:business-focus',
    generatedAt: now.toISOString(),
    summary: {
      businesses: items.length,
      owned: items.filter((item) => item.type === 'owned').length,
      clients: items.filter((item) => item.type === 'client').length,
      live: items.filter((item) => item.signal === 'live').length,
      watch: items.filter((item) => item.signal === 'watch').length,
      needsRepo: items.filter((item) => item.signal === 'needs_repo').length,
      needsUrl: items.filter((item) => item.signal === 'needs_url').length,
    },
    items,
  }
}
