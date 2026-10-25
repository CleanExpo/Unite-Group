// apps/autopilot-runner/src/index.ts
//
// Permanent retirement boundary for the legacy hosted Linear author/publisher.
//
// That executor ran an untrusted coding worker beside a privileged orchestrator
// in the same Unix identity, PID namespace, and linked Git worktree. Filtering
// the worker's child environment cannot close access through /proc, shared Git
// configuration, hooks/filters, or surviving descendants. The environment flag
// therefore cannot reactivate this path. CRM-authoritative OWNEST is the only
// execution lane eligible for a future, separately gated rollout.

function log(message: string): void {
  console.log(`[autopilot-runner] ${message}`)
}

/**
 * Keep the former container command deterministic while making activation
 * impossible. An attempted activation (CC_LINEAR_LIVE=1) is refused and logged
 * distinctly, but exits 0: the refusal is the correct outcome, and a non-zero
 * exit made Railway mark every deploy of the surviving service CRASHED, which
 * failed the GitHub "autopilot-runner / production" deployment on each push to
 * main (a84a123f, 26/10/2026). No other configuration or credential is read.
 */
export async function main(env: NodeJS.ProcessEnv = process.env): Promise<number> {
  if (env.CC_LINEAR_LIVE === '1') {
    log('CC_LINEAR_LIVE is permanently retired; no credentials, work, Git, or network were accessed.')
    return 0
  }

  log('legacy Linear author/publisher retired; draining with no work claimed.')
  return 0
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      log(`fatal: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    })
}
