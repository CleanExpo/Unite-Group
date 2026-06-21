// apps/autopilot-runner/src/index.ts
//
// Entrypoint. Boots the runner, honours the kill switch, validates the handoff
// config, and (when configured) fetches a packet to prove the read-side works.
// The credential-gated adapters — the GitHub App PR client and Claude authoring
// — are NOT yet wired. Until Phase-0 (the two GitHub Apps + Railway secrets)
// exists, the runner boots, reports honestly, and stops before it would need a
// capability it does not have. No pretending to be live.

import { loadHandoffConfig, makeFetchPacket } from './adapters/handoff'

function log(msg: string): void {
  console.log(`[autopilot-runner] ${msg}`)
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const live = env.CC_LINEAR_LIVE === '1'
  log(`boot — live gate ${live ? 'ON' : 'OFF'}`)
  if (!live) {
    log('CC_LINEAR_LIVE != 1 → draining; no work claimed.')
    return 0
  }

  const handoff = loadHandoffConfig(env)
  if (!handoff.ok) {
    log(`config error: ${handoff.error}`)
    return 1
  }
  log(`handoff config OK → ${handoff.config.endpoint}`)

  const result = await makeFetchPacket(handoff.config)()
  if (result.status === 'error') {
    log(`handoff fetch error: ${result.error}`)
    return 1
  }
  if (result.status === 'idle') {
    log('no eligible work (idle).')
    return 0
  }

  log(
    `claimed packet ${result.packet.issue.identifier} — but author + GitHub App ` +
      'adapters are not wired yet (awaiting Phase-0). Stopping before any change.',
  )
  return 0
}

// Only auto-run when executed directly (not when imported by a test).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      log(`fatal: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    })
}
