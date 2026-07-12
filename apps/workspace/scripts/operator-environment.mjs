import { readFileSync } from 'node:fs'

const GATEWAY_SECRET_SYMBOL = Symbol.for('hermes.workspace.gateway-secrets')
const TOKEN_ENV_NAMES = [
  'HERMES_API_TOKEN',
  'HERMES_DASHBOARD_TOKEN',
  'CLAUDE_API_TOKEN',
  'CLAUDE_DASHBOARD_TOKEN',
]

function unquote(value) {
  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1)
    }
  }
  return value
}

export function readGatewayKey(envPath) {
  let contents
  try {
    contents = readFileSync(envPath, 'utf8')
  } catch {
    throw new Error('API_SERVER_KEY is unavailable in the Hermes environment file')
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator < 1 || trimmed.slice(0, separator).trim() !== 'API_SERVER_KEY') continue
    const value = unquote(trimmed.slice(separator + 1).trim())
    if (value) return value
  }
  throw new Error('API_SERVER_KEY is unavailable in the Hermes environment file')
}

export function installGatewaySecrets({ apiToken, dashboardToken }) {
  const previous = globalThis[GATEWAY_SECRET_SYMBOL] || {}
  globalThis[GATEWAY_SECRET_SYMBOL] = Object.freeze({
    apiToken: apiToken || previous.apiToken || '',
    dashboardToken: dashboardToken || previous.dashboardToken || '',
  })
}

export function captureGatewaySecretsFromEnvironment(env = process.env) {
  const apiToken = env.HERMES_API_TOKEN || env.CLAUDE_API_TOKEN || ''
  const dashboardToken =
    env.HERMES_DASHBOARD_TOKEN || env.CLAUDE_DASHBOARD_TOKEN || ''
  if (apiToken || dashboardToken) {
    installGatewaySecrets({ apiToken, dashboardToken })
  }
  for (const name of TOKEN_ENV_NAMES) delete env[name]
}
