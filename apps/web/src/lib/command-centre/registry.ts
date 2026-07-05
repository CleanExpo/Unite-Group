// src/lib/command-centre/registry.ts
//
// Typed, read-only accessor over the Nexus Command Centre project registry.
// Derives every project from the portfolio SSOT (`.portfolio/PORTFOLIO.yaml`
// at the repo root) so a product added there appears on the deck with no
// second edit — see UNI-2297. No DB writes, no secrets — env var names only.
//
// Deployment note: the root YAML sits OUTSIDE apps/web's output-file-tracing
// root, so it never enters the Vercel lambda bundle. The `prebuild` step
// (scripts/sync-portfolio-registry.mjs) copies it to the in-tree
// `data/command-centre/portfolio.yaml`, which this module reads first; the
// root path is a fallback for dev/test where the copy may not exist yet.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'

export type DeploymentTarget = 'Vercel' | 'Railway' | 'Docker' | string

export type ProjectStatus = 'active' | 'stub' | 'paused' | 'archived' | string

/**
 * A single project the command centre can read about (and, later, act on).
 * Mirrors the `cc_projects` shape in the Nexus spec. Read-only here.
 */
export interface CommandCentreProject {
  name: string
  repo_path: string
  github_repo: string | null
  business_purpose: string
  brand_rules_ref: string
  deployment_target: DeploymentTarget
  owner: string
  status: ProjectStatus
  evidence_vault_path: string
  validation_commands: string[]
  linear_prefix: string
  production_url: string | null
  integration_status_url?: string | null
}

// -- PORTFOLIO.yaml shape (only the fields this mapper reads) ---------------
// The root .portfolio/ has no schema file or CI validation of its own; this
// module's guards below are the validation the deck relies on.

interface PortfolioProduct {
  canonical_name: string
  purpose: string
  status: string
  note?: string
  owner?: string
  github?: { org?: string | null; repo?: string | null } | null
  local?: { canonical_path?: string | null; access_via?: string } | null
  vercel?: { production?: { domain?: string | null } | null } | null
  workflow?: { ci_required_checks?: string[] } | null
  stack?: { package_manager?: string } | null
  linear?: { team_key?: string } | null
}

interface PortfolioYaml {
  products: PortfolioProduct[]
}

/** In-tree copy written by `prebuild` — the path that ships in the lambda bundle. */
function inTreePortfolioYamlPath(): string {
  return path.join(process.cwd(), 'data', 'command-centre', 'portfolio.yaml')
}

/** The SSOT itself, two levels above apps/web (repo root). Dev/test fallback only. */
function repoRootPortfolioYamlPath(): string {
  return path.join(process.cwd(), '..', '..', '.portfolio', 'PORTFOLIO.yaml')
}

const OWNER_DISPLAY_NAMES: Record<string, string> = {
  phill: 'Phill McGurk',
}

// Hosts with a confirmed live `/api/v1/connections/status` endpoint. Mirrors
// the allow-list in `project-integrations.ts` (APPROVED_INTEGRATION_STATUS_HOSTS)
// — keep the two in sync when either changes.
const KNOWN_INTEGRATION_STATUS_HOSTS = new Set([
  'restoreassist.app',
  'synthex.social',
  'disasterrecovery.com.au',
  'nrpg.business',
  'ccw-crm-web.vercel.app',
  'ato-ai.app',
  'carsi.com.au',
])

// linear_prefix isn't part of the portfolio schema. Prefer a product's own
// `linear.team_key` when the YAML declares one; otherwise fall back to these
// known overrides (sourced from the prior seed's real values), defaulting to
// the shared Unite-Group team prefix.
const LINEAR_PREFIX_OVERRIDES: Record<string, string> = {
  RestoreAssist: 'RA',
  'CCW-CRM': 'CCW',
}

function isPlaceholder(value: string | null | undefined): boolean {
  return !value || value === 'TBD' || value === 'null'
}

function kebabCase(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function deriveGithubRepo(product: PortfolioProduct): string | null {
  const org = product.github?.org
  const repo = product.github?.repo
  if (isPlaceholder(org) || isPlaceholder(repo)) return null
  return `${org}/${repo}`
}

function deriveProductionUrl(product: PortfolioProduct): string | null {
  const domain = product.vercel?.production?.domain
  if (isPlaceholder(domain)) return null
  return `https://${domain}`
}

function deriveIntegrationStatusUrl(productionUrl: string | null): string | null {
  if (!productionUrl) return null
  if (!KNOWN_INTEGRATION_STATUS_HOSTS.has(new URL(productionUrl).hostname)) return null
  return `${productionUrl}/api/v1/connections/status`
}

function deriveValidationCommands(product: PortfolioProduct): string[] {
  const checks = product.workflow?.ci_required_checks ?? []
  const pm = product.stack?.package_manager ?? 'pnpm'
  return checks.map((check) => `${pm} ${check === 'typecheck' ? 'type-check' : check}`)
}

function deriveLinearPrefix(product: PortfolioProduct): string {
  return product.linear?.team_key ?? LINEAR_PREFIX_OVERRIDES[product.canonical_name] ?? 'UNI'
}

function deriveOwner(product: PortfolioProduct): string {
  const raw = product.owner
  if (!raw) return 'Phill McGurk'
  return OWNER_DISPLAY_NAMES[raw] ?? raw
}

function toCommandCentreProject(product: PortfolioProduct): CommandCentreProject {
  const productionUrl = deriveProductionUrl(product)
  const repoPath = (product.local?.access_via ?? product.local?.canonical_path ?? '').replace(/\\/g, '/')

  return {
    name: product.canonical_name,
    repo_path: repoPath,
    github_repo: deriveGithubRepo(product),
    business_purpose: product.purpose,
    brand_rules_ref: `brand-context/${kebabCase(product.canonical_name)}.md`,
    deployment_target: 'Vercel',
    owner: deriveOwner(product),
    status: product.status,
    evidence_vault_path: `raw/command-centre/${product.canonical_name}`,
    validation_commands: deriveValidationCommands(product),
    linear_prefix: deriveLinearPrefix(product),
    production_url: productionUrl,
    integration_status_url: deriveIntegrationStatusUrl(productionUrl),
  }
}

/**
 * Keep the richer (longer `purpose`) entry when two products share a
 * canonical_name — e.g. the historical CCW / CCW-CRM duplicate. There is no
 * CI validation on the root SSOT, so this is the gate that ensures the deck
 * never renders a duplicate row.
 */
function dedupeByCanonicalName(products: PortfolioProduct[]): PortfolioProduct[] {
  const byName = new Map<string, PortfolioProduct>()
  for (const [index, product] of products.entries()) {
    if (typeof product?.canonical_name !== 'string' || typeof product?.purpose !== 'string') {
      throw new Error(
        `command-centre registry: malformed PORTFOLIO.yaml — products[${index}] is missing a string canonical_name/purpose`,
      )
    }
    const key = product.canonical_name.toLowerCase()
    const existing = byName.get(key)
    if (!existing || product.purpose.length > existing.purpose.length) {
      byName.set(key, product)
    }
  }
  return [...byName.values()]
}

/** Pure mapper from PORTFOLIO.yaml source text to command-centre projects. */
export function mapPortfolioYamlToProjects(yamlSource: string): CommandCentreProject[] {
  const parsed = parseYaml(yamlSource) as PortfolioYaml
  if (!parsed || !Array.isArray(parsed.products)) {
    throw new Error('command-centre registry: malformed PORTFOLIO.yaml (missing "products" array)')
  }
  return dedupeByCanonicalName(parsed.products).map(toCommandCentreProject)
}

/** In-tree bundled copy first (production); repo-root SSOT as dev/test fallback. */
async function readPortfolioSource(): Promise<string> {
  try {
    return await readFile(inTreePortfolioYamlPath(), 'utf-8')
  } catch {
    return readFile(repoRootPortfolioYamlPath(), 'utf-8')
  }
}

/**
 * Load every project from the portfolio SSOT. Read-only.
 * A missing or malformed SSOT degrades to an EMPTY registry (with the error
 * logged) rather than throwing — a blank tile is honest and recoverable; an
 * error boundary across the whole deck is not.
 */
export async function getProjects(): Promise<CommandCentreProject[]> {
  try {
    const raw = await readPortfolioSource()
    return mapPortfolioYamlToProjects(raw)
  } catch (error) {
    console.error('command-centre registry: failed to load portfolio SSOT — serving empty registry.', error)
    return []
  }
}

/** Look up a single project by its canonical name (case-insensitive). */
export async function getProjectByName(name: string): Promise<CommandCentreProject | undefined> {
  const projects = await getProjects()
  const target = name.trim().toLowerCase()
  return projects.find((p) => p.name.toLowerCase() === target)
}
