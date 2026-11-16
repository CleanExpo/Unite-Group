/**
 * Start the local world service.
 *   tsx src/lib/restoration-world/service/serve.ts --mode live --port 8787
 *   tsx src/lib/restoration-world/service/serve.ts --mode test --port 8788
 * Loopback only. Fictional data only. Not a deployment target.
 */
import { startWorldServer } from './http-server'
import type { ServiceMode } from './world-service'

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const mode = arg('mode', 'live') as ServiceMode
const port = Number(arg('port', mode === 'test' ? '8788' : '8787'))

startWorldServer({ mode, port })
  .then(running => {
    process.stdout.write(`restoration-world service mode=${mode} url=${running.url}\n`)
    const stop = () => running.close().then(() => process.exit(0))
    process.on('SIGINT', stop)
    process.on('SIGTERM', stop)
  })
  .catch(error => {
    process.stderr.write(`failed to start: ${(error as Error).message}\n`)
    process.exit(1)
  })
