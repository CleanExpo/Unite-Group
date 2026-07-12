import { realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { installGatewaySecrets, readGatewayKey } from './scripts/operator-environment.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const home = process.env.HOME

try {
  if (!home) throw new Error('HOME is unavailable in the operator environment')
  const hermesHome = process.env.HERMES_HOME || join(home, '.hermes')
  const key = readGatewayKey(join(hermesHome, '.env'))
  installGatewaySecrets({ apiToken: key, dashboardToken: key })

  const serverEntry = realpathSync(join(scriptDir, 'server-entry.js'))
  if (dirname(serverEntry) !== scriptDir) {
    throw new Error('trusted workspace server entry escaped its directory')
  }
  await import(pathToFileURL(serverEntry).href)
} catch (error) {
  const message = error instanceof Error ? error.message : 'operator bootstrap failed'
  console.error(`[workspace] ${message}`)
  process.exit(1)
}
