#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const repoRoot = process.cwd()
const canonicalEnvPath = process.env.LINEAR_CANONICAL_ENV_PATH
  ?? 'D:/Unite-Group/Nexus-Hub/secrets/local.env'
const bridgePath = path.join(repoRoot, '.linear-api-key')
const evidencePath = path.join(repoRoot, 'docs', 'margot', 'linear-auth-evidence.md')
const linearApiUrl = 'https://api.linear.app/graphql'

function parseEnvValue(text, keyName) {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [rawKey, ...rawValueParts] = line.split('=')
    if (rawKey.trim() !== keyName) continue
    let value = rawValueParts.join('=').trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim()
    }
    return value
  }
  return ''
}

function fingerprint(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}

function redactEmail(email) {
  if (!email || !email.includes('@')) return 'available'
  const [user, domain] = email.split('@')
  return `${user.slice(0, 2)}***@${domain}`
}

async function readCanonicalLinearKey() {
  if (!existsSync(canonicalEnvPath)) {
    throw new Error(`Canonical env file not found: ${canonicalEnvPath}`)
  }
  const envText = await readFile(canonicalEnvPath, 'utf8')
  const apiKey = parseEnvValue(envText, 'LINEAR_API_KEY')
  if (!apiKey) {
    throw new Error(`LINEAR_API_KEY missing from canonical env file: ${canonicalEnvPath}`)
  }
  return apiKey
}

async function repairBridge(apiKey) {
  let current = ''
  if (existsSync(bridgePath)) current = (await readFile(bridgePath, 'utf8')).trim()
  const changed = current !== apiKey
  if (changed) await writeFile(bridgePath, `${apiKey}\n`, { mode: 0o600 })
  return { changed, existed: existsSync(bridgePath) }
}

async function verifyLinear(apiKey) {
  const response = await fetch(linearApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: 'query LinearAuthEvidence { viewer { id name email } organization { id name urlKey } }',
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Linear GraphQL viewer query failed with HTTP ${response.status}`)
  }
  if (body.errors?.length) {
    throw new Error(`Linear GraphQL viewer query returned error: ${body.errors[0]?.message ?? 'unknown error'}`)
  }
  if (!body.data?.viewer?.id || !body.data?.organization?.id) {
    throw new Error('Linear GraphQL viewer query returned incomplete viewer/organization data')
  }
  return body.data
}

async function writeEvidence({ apiKey, bridge, viewer, organization }) {
  await mkdir(path.dirname(evidencePath), { recursive: true })
  const now = new Date().toISOString()
  const content = `# Linear Authentication Evidence\n\n` +
    `Last verified: ${now}\n\n` +
    `## Credential bridge\n\n` +
    `- Canonical source: \`${canonicalEnvPath}\`\n` +
    `- Project bridge: \`${bridgePath}\`\n` +
    `- Bridge action: ${bridge.changed ? 'repaired from canonical source' : 'already matched canonical source'}\n` +
    `- Secret fingerprint: sha256:${fingerprint(apiKey)} (first 12 hex chars only; secret not printed)\n\n` +
    `## Linear viewer verification\n\n` +
    `- GraphQL endpoint: \`${linearApiUrl}\`\n` +
    `- Query: \`viewer { id name email } organization { id name urlKey }\`\n` +
    `- Result: HTTP 200, viewer \`${viewer.name}\` (${redactEmail(viewer.email)}), organization \`${organization.name}\` / \`${organization.urlKey}\`\n\n` +
    `## Operating rule\n\n` +
    `Use \`${canonicalEnvPath}\` as the source of truth for \`LINEAR_API_KEY\`. Regenerate \`.linear-api-key\` with \`npm run linear\` whenever repo scripts need the project-local bridge. Do not print the key in terminal output or documentation.\n`
  await writeFile(evidencePath, content, 'utf8')
}

async function main() {
  const apiKey = await readCanonicalLinearKey()
  const bridge = await repairBridge(apiKey)
  const data = await verifyLinear(apiKey)
  await writeEvidence({ apiKey, bridge, viewer: data.viewer, organization: data.organization })

  console.log('Linear authentication verified')
  console.log(`canonical_env=${canonicalEnvPath}`)
  console.log(`bridge_path=${bridgePath}`)
  console.log(`bridge_action=${bridge.changed ? 'repaired' : 'unchanged'}`)
  console.log(`secret_fingerprint=sha256:${fingerprint(apiKey)}`)
  console.log(`viewer=${data.viewer.name}`)
  console.log(`organization=${data.organization.name}/${data.organization.urlKey}`)
  console.log(`evidence=${evidencePath}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
