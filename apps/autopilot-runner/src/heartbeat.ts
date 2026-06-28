// apps/autopilot-runner/src/heartbeat.ts
//
// Daemon entrypoint for the agent presence heartbeat. Run on the trusted agent
// machine (alongside the autopilot runner):
//
//   node dist/heartbeat.js        # or: npm run heartbeat
//
// It loads config from env, then upserts operator_agent_presence every ~15s so
// the live command-centre shows this agent as connected. Fail-closed: a missing
// env var refuses to start (exit 1) rather than silently never beating.

import { loadPresenceConfig, startHeartbeat } from './presence.js'

function log(msg: string): void {
  console.log(`[presence-heartbeat] ${msg}`)
}

export function main(env: NodeJS.ProcessEnv = process.env): number {
  const loaded = loadPresenceConfig(env)
  if (!loaded.ok) {
    log(`config error: ${loaded.error}`)
    return 1
  }

  const { config } = loaded
  log(
    `starting — agent=${config.agentId} host=${config.hostname} ` +
      `interval=${config.intervalMs}ms target=${config.supabaseUrl}/rest/v1/operator_agent_presence`,
  )

  const loop = startHeartbeat(config, { fetch, now: () => Date.now() }, log)

  const shutdown = () => {
    log('shutting down — stopping heartbeat')
    loop.stop()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return 0
}

// Only run when invoked directly (not when imported by a test).
if (import.meta.url === `file://${process.argv[1]}`) {
  const code = main()
  if (code !== 0) process.exit(code)
}
