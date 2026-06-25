// apps/autopilot-runner/src/operator-jobs-tick.ts
//
// Entrypoint for one bounded sweep of the operator-jobs queue:
//   node dist/operator-jobs-tick.js     # or: npm run operator-jobs
//
// Claims + handles up to MAX_JOBS pending jobs, then exits — run it on a
// schedule (launchd/cron) alongside the presence heartbeat. Fail-closed:
// drains immediately unless CC_OPERATOR_JOBS_LIVE === '1'.

import { loadOperatorJobsConfig, runOperatorJobsOnce } from './operator-jobs.js'

const MAX_JOBS = 25

function log(msg: string): void {
  console.log(`[operator-jobs] ${msg}`)
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const loaded = loadOperatorJobsConfig(env)
  if (!loaded.ok) {
    log(`config error: ${loaded.error}`)
    return 1
  }
  const { config } = loaded

  if (!config.live) {
    log('CC_OPERATOR_JOBS_LIVE != 1 → draining; no jobs claimed.')
    return 0
  }

  const deps = { fetch, now: () => Date.now(), log }
  let processed = 0
  for (; processed < MAX_JOBS; processed++) {
    const out = await runOperatorJobsOnce(config, deps)
    if (out.outcome === 'idle' || out.outcome === 'drained') break
    if (out.outcome === 'done') log(`done ${out.jobId} — ${out.summary}`)
    else if (out.outcome === 'blocked') log(`blocked ${out.jobId} — ${out.reason}`)
  }
  log(`sweep complete — handled ${processed} job(s)`)
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => {
      if (code !== 0) process.exit(code)
    })
    .catch((e) => {
      log(`fatal: ${e instanceof Error ? e.message : String(e)}`)
      process.exit(1)
    })
}
