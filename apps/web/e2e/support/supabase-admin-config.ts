import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { config as loadDotenv } from 'dotenv'

if (existsSync('.env.local')) loadDotenv({ path: '.env.local', override: false })

const productionRef = 'lksfwktwtmyznckodsau'

type SupabaseApiKey = {
  api_key?: string
  name?: string
  type?: string
  description?: string
}

type SupabaseAdminConfig = {
  url: string
  anonKey: string
  serviceRoleKey: string
  host: string
}

function keyLabel(entry: SupabaseApiKey) {
  return `${entry.name ?? ''} ${entry.type ?? ''} ${entry.description ?? ''}`.toLowerCase()
}

function parseCliKeys(stdout: string) {
  const parsed = JSON.parse(stdout) as SupabaseApiKey[] | { api_keys?: SupabaseApiKey[] }
  return Array.isArray(parsed) ? parsed : parsed.api_keys ?? []
}

function resolveKeyFromCli(label: 'anon' | 'service_role') {
  const result = spawnSync(
    'supabase',
    ['projects', 'api-keys', '--project-ref', productionRef, '--output', 'json'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }
  )

  if (result.status !== 0) {
    throw new Error(
      `Supabase CLI api-key lookup failed with status ${result.status ?? 'unknown'}: ${(result.stderr || '').slice(0, 500)}`
    )
  }

  const keys = parseCliKeys(result.stdout)
  const match = keys.find((entry) => {
    const text = keyLabel(entry)
    if (label === 'anon') return text.includes('anon')
    return text.includes('service_role') || text.includes('service role')
  })

  if (!match?.api_key) {
    throw new Error(`Supabase CLI api-key lookup did not return a ${label} key`)
  }

  return match.api_key
}

export function loadSupabaseAdminConfig(): SupabaseAdminConfig {
  // E2E_SUPABASE_URL overrides NEXT_PUBLIC_SUPABASE_URL so the E2E suite
  // can target the dedicated non-prod lane rather than prod.
  const explicitE2EUrl = process.env.E2E_SUPABASE_URL?.trim()
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const url = explicitE2EUrl || configuredUrl || `https://${productionRef}.supabase.co`
  const host = new URL(url).host
  const projectRef = host.split('.')[0]

  // Prod safety: if no dedicated E2E URL was given, enforce the prod-only check
  // so local runs without E2E_SUPABASE_URL cannot accidentally target a wrong project.
  if (!explicitE2EUrl && projectRef !== productionRef) {
    throw new Error(`Expected production Supabase host for the approved exception, got ${host}`)
  }

  // In CI, secrets must be pre-configured. The CLI fallback is only available
  // locally where `supabase` is installed and linked to prod.
  const anonKey =
    process.env.E2E_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    resolveKeyFromCli('anon')

  const serviceRoleKey =
    process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    resolveKeyFromCli('service_role')

  return { url, anonKey, serviceRoleKey, host }
}

export function hasSupabaseAdminProvisioning() {
  try {
    loadSupabaseAdminConfig()
    return { ok: true as const, missing: [] as string[] }
  } catch (error) {
    return {
      ok: false as const,
      missing: [(error as Error).message],
    }
  }
}
