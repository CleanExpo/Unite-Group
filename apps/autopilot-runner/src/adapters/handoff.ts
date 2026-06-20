// apps/autopilot-runner/src/adapters/handoff.ts
//
// Wires the (pure, tested) packet ingestion to the real environment: reads
// HANDOFF_URL + CRON_SECRET and binds fetchPacket to the global fetch. Config
// loading is pure + tested; the bound fetcher uses the real network at runtime.

import { fetchPacket, type FetchPacketResult } from '../packet'

export interface HandoffConfig {
  endpoint: string
  cronSecret: string
}

export type HandoffConfigResult = { ok: true; config: HandoffConfig } | { ok: false; error: string }

/** Read + validate the handoff config from the environment. Fail-closed. */
export function loadHandoffConfig(env: NodeJS.ProcessEnv): HandoffConfigResult {
  const endpoint = env.HANDOFF_URL?.trim()
  const cronSecret = env.CRON_SECRET?.trim()
  if (!endpoint) return { ok: false, error: 'HANDOFF_URL is not set' }
  if (!cronSecret) return { ok: false, error: 'CRON_SECRET is not set' }
  return { ok: true, config: { endpoint, cronSecret } }
}

/** Bind fetchPacket to the real fetch for the given config. */
export function makeFetchPacket(config: HandoffConfig): () => Promise<FetchPacketResult> {
  return () => fetchPacket({ endpoint: config.endpoint, cronSecret: config.cronSecret, fetchFn: fetch })
}
