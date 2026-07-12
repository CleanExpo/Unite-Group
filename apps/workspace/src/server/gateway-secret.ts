type GatewaySecretStore = {
  apiToken?: string
  dashboardToken?: string
}

const GATEWAY_SECRET_SYMBOL = Symbol.for('hermes.workspace.gateway-secrets')
const TOKEN_ENV_NAMES = [
  'HERMES_API_TOKEN',
  'HERMES_DASHBOARD_TOKEN',
  'CLAUDE_API_TOKEN',
  'CLAUDE_DASHBOARD_TOKEN',
] as const

function store(): GatewaySecretStore {
  const root = globalThis as unknown as Record<
    symbol,
    GatewaySecretStore | undefined
  >
  return root[GATEWAY_SECRET_SYMBOL] ?? {}
}

function install(apiToken: string, dashboardToken: string): void {
  const root = globalThis as unknown as Record<
    symbol,
    GatewaySecretStore | undefined
  >
  const previous = root[GATEWAY_SECRET_SYMBOL] ?? {}
  root[GATEWAY_SECRET_SYMBOL] = Object.freeze({
    apiToken: apiToken || previous.apiToken || '',
    dashboardToken: dashboardToken || previous.dashboardToken || '',
  })
}

function captureAndScrubGatewayEnvironment(): void {
  const apiToken =
    process.env.HERMES_API_TOKEN || process.env.CLAUDE_API_TOKEN || ''
  const dashboardToken =
    process.env.HERMES_DASHBOARD_TOKEN ||
    process.env.CLAUDE_DASHBOARD_TOKEN ||
    ''
  if (apiToken || dashboardToken) install(apiToken, dashboardToken)
  for (const name of TOKEN_ENV_NAMES) delete process.env[name]
}

captureAndScrubGatewayEnvironment()

export function getGatewayApiToken(): string {
  return store().apiToken ?? ''
}

export function getGatewayDashboardToken(): string {
  return store().dashboardToken ?? ''
}
