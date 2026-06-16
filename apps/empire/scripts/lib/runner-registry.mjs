/**
 * Multi-runner registry plumbing for the Mission Control loop. [UNI-2135]
 *
 * Pure, side-effect-free logic so it can be unit-tested in isolation from the
 * worker (whose `main()` runs at import time). No `process.env` reads, no
 * wall-clock, no I/O — the caller passes `env` in and gets a value out.
 *
 * Env-var contract:
 *   MISSION_CONTROL_RUNNER_CMD          → legacy single command; becomes the
 *                                         `default` runner's command (back-compat).
 *   MISSION_CONTROL_RUNNERS             → comma list of named runners, e.g.
 *                                         `claude,codex,gemini,minimax`.
 *   MISSION_CONTROL_RUNNER_CMD_<NAME>   → command for a named runner, name
 *                                         upper-cased (e.g. ..._CODEX). A listed
 *                                         name with no command env is configured:false.
 *   MISSION_CONTROL_DEFAULT_RUNNER      → explicit default runner name (optional).
 *
 * Default-runner precedence:
 *   1. explicit MISSION_CONTROL_DEFAULT_RUNNER (if that runner exists)
 *   2. `default` runner if it has a command
 *   3. the first configured named runner (in MISSION_CONTROL_RUNNERS order)
 *   4. null
 */

/**
 * @typedef {Object} Runner
 * @property {string} name      Runner identifier (e.g. 'default', 'codex').
 * @property {string} command   Command template ('' when not configured).
 * @property {boolean} configured  True when a non-empty command is present.
 */

/**
 * @typedef {Object} Registry
 * @property {Runner[]} runners       Stable list; `default` (if any) first.
 * @property {string|null} defaultRunner  Name of the resolved default runner.
 */

/** Upper-case a runner name into its command env-var suffix. */
function commandEnvKey(name) {
  return `MISSION_CONTROL_RUNNER_CMD_${name.toUpperCase()}`;
}

/**
 * Build the runner registry from an environment-like object.
 *
 * @param {Record<string, string | undefined>} env  Typically `process.env`.
 * @returns {Registry}
 */
export function parseRunnerRegistry(env = {}) {
  /** @type {Map<string, Runner>} */
  const byName = new Map();
  /** @type {string[]} */
  const order = [];

  const add = (name, command) => {
    const trimmedCommand = (command ?? '').trim();
    if (!byName.has(name)) order.push(name);
    byName.set(name, {
      name,
      command: trimmedCommand,
      configured: trimmedCommand.length > 0,
    });
  };

  // Legacy/back-compat: MISSION_CONTROL_RUNNER_CMD → the `default` runner.
  const legacyCommand = (env.MISSION_CONTROL_RUNNER_CMD ?? '').trim();
  if (legacyCommand) {
    add('default', legacyCommand);
  }

  // Named runners from MISSION_CONTROL_RUNNERS.
  const namedRunners = (env.MISSION_CONTROL_RUNNERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const name of namedRunners) {
    add(name, env[commandEnvKey(name)]);
  }

  const runners = order.map((name) => byName.get(name));

  // Default-runner precedence.
  let defaultRunner = null;
  const explicit = (env.MISSION_CONTROL_DEFAULT_RUNNER ?? '').trim();
  if (explicit && byName.has(explicit)) {
    defaultRunner = explicit;
  } else if (byName.get('default')?.configured) {
    defaultRunner = 'default';
  } else {
    const firstConfigured = runners.find((r) => r.configured);
    defaultRunner = firstConfigured ? firstConfigured.name : null;
  }

  return { runners, defaultRunner };
}

/**
 * Resolve which runner should handle an issue.
 *
 * A `runner:<name>` label that matches a runner in the registry wins; otherwise
 * the registry's default runner is used. Returns the chosen runner object, or
 * null when nothing is configured / the default points at an unknown runner.
 *
 * @param {Set<string>} labelNamesSet  Set of the issue's label names.
 * @param {Registry} registry
 * @returns {Runner | null}
 */
export function resolveRunnerForIssue(labelNamesSet, registry) {
  if (!registry || !Array.isArray(registry.runners)) return null;
  const byName = new Map(registry.runners.map((r) => [r.name, r]));

  if (labelNamesSet) {
    for (const label of labelNamesSet) {
      if (typeof label === 'string' && label.startsWith('runner:')) {
        const wanted = label.slice('runner:'.length).trim();
        if (wanted && byName.has(wanted)) {
          return byName.get(wanted);
        }
      }
    }
  }

  if (registry.defaultRunner && byName.has(registry.defaultRunner)) {
    return byName.get(registry.defaultRunner);
  }

  return null;
}
