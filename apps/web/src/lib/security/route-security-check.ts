import { readdirSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

const AUTH_PATTERNS = [
  /withAuth|requireAuth|requireAdmin|verifyAdminJwt|getServerSession|getAdminSession|requireCrmLeadIntegrationAccess/,
  /\bgetUser\s*\(|supabase\.auth\.(getSession|getUser)/,
  /timingSafe(Bearer|Token)Match|withSyncLifecycle/,
  /CRON_SECRET/,
]

const WEBHOOK_SIGNATURE_PATTERNS = [
  /verify[A-Za-z0-9]*Signature/,
  /verifyStripeSignature|webhooks\.constructEvent/,
  /verifyWebhookSignature|verifySignature/,
  /verifyDecisionCallbackData/,
]

const RATE_LIMIT_PATTERN = /withRateLimit|\b(?:rateLimit|isRateLimited)\s*\(|RATE_LIMITS\./

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const

// These routes are intentionally reviewed exceptions rather than hidden by a
// broad wildcard:
// - Telegram approval callback is an inactive convergence stub that records no
//   approval while its legacy ledger subsystem is absent.
// - Frontdesk chat ships dark: feature-flag off returns 404; feature-flag on
//   returns 503 until config/corpus/keys are provisioned.
// - Public lead capture is a reviewed website ingress route; proxy middleware
//   rate-limits it before auth, and the route only writes scoped CRM intake rows.
export const DEFAULT_ROUTE_SECURITY_ALLOWLIST = [
  '/api/telegram/approval-callback',
  '/api/frontdesk/chat',
  '/api/leads',
] as const

export interface RouteSecurityViolation {
  path: string
  file: string
  methods: string[]
}

interface FindRouteSecurityOptions {
  apiRoot?: string
  allowlist?: Iterable<string>
  cwd?: string
}

function hasProtectionPattern(content: string): boolean {
  if (AUTH_PATTERNS.some((pattern) => pattern.test(content))) return true
  if (WEBHOOK_SIGNATURE_PATTERNS.some((pattern) => pattern.test(content))) return true
  return RATE_LIMIT_PATTERN.test(content)
}

function detectMutatingMethods(content: string): string[] {
  return MUTATING_METHODS.filter((method) =>
    new RegExp(
      `export\\s+(async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\s*=`,
    ).test(content),
  )
}

function walkRoutes(
  dir: string,
  baseUrl: string,
  allowlist: Set<string>,
): RouteSecurityViolation[] {
  const violations: RouteSecurityViolation[] = []

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      violations.push(...walkRoutes(fullPath, `${baseUrl}/${entry}`, allowlist))
      continue
    }

    if (entry !== 'route.ts') continue

    const content = readFileSync(fullPath, 'utf8')
    const methods = detectMutatingMethods(content)
    if (methods.length === 0) continue
    if (hasProtectionPattern(content)) continue
    if (allowlist.has(baseUrl)) continue

    violations.push({
      path: baseUrl,
      file: fullPath,
      methods,
    })
  }

  return violations
}

export function findUnprotectedMutatingRoutes(
  options: FindRouteSecurityOptions = {},
): RouteSecurityViolation[] {
  const cwd = options.cwd ?? process.cwd()
  const apiRoot = options.apiRoot ?? join(cwd, 'src', 'app', 'api')
  const root = isAbsolute(apiRoot) ? apiRoot : join(cwd, apiRoot)
  const allowlist = new Set(options.allowlist ?? [])

  return walkRoutes(root, '/api', allowlist).sort((a, b) => a.path.localeCompare(b.path))
}
