/**
 * Unit tests for the multi-runner registry plumbing. [UNI-2135]
 *
 * The module under test is a plain ESM `.mjs` with no external deps; we load it
 * via dynamic `import()` so ts-jest does not need to statically resolve the
 * `.mjs` extension.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

type Runner = { name: string; command: string; configured: boolean };
type Registry = { runners: Runner[]; defaultRunner: string | null };

let parseRunnerRegistry: (env: Record<string, string | undefined>) => Registry;
let resolveRunnerForIssue: (labels: Set<string>, registry: Registry) => Runner | null;

// The module under test is a plain ESM `.mjs` with no deps. Jest's CJS runtime
// cannot `require()` ESM, and its VM sandbox blocks real dynamic `import()`
// without `--experimental-vm-modules`. Rather than couple this suite to a flag,
// we load the source, neutralise the `export` keywords, and evaluate it in a
// `vm` sandbox — stdlib only, no new dependencies.
beforeAll(() => {
  const modulePath = resolve(__dirname, '../../../scripts/lib/runner-registry.mjs');
  const source = readFileSync(modulePath, 'utf8').replace(/export\s+function/g, 'function');
  const sandbox: Record<string, unknown> = {};
  vm.runInNewContext(
    `${source}\nthis.parseRunnerRegistry = parseRunnerRegistry;\nthis.resolveRunnerForIssue = resolveRunnerForIssue;`,
    sandbox,
  );
  parseRunnerRegistry = sandbox.parseRunnerRegistry as typeof parseRunnerRegistry;
  resolveRunnerForIssue = sandbox.resolveRunnerForIssue as typeof resolveRunnerForIssue;
});

describe('parseRunnerRegistry', () => {
  it('maps the legacy MISSION_CONTROL_RUNNER_CMD to the default runner', () => {
    const registry = parseRunnerRegistry({ MISSION_CONTROL_RUNNER_CMD: 'claude -p "{prompt}"' });
    expect(registry.runners).toEqual([{ name: 'default', command: 'claude -p "{prompt}"', configured: true }]);
    expect(registry.defaultRunner).toBe('default');
  });

  it('parses a named registry with per-runner command env vars', () => {
    const registry = parseRunnerRegistry({
      MISSION_CONTROL_RUNNERS: 'claude,codex,gemini',
      MISSION_CONTROL_RUNNER_CMD_CLAUDE: 'claude -p "{prompt}"',
      MISSION_CONTROL_RUNNER_CMD_CODEX: 'codex run {issue}',
      MISSION_CONTROL_RUNNER_CMD_GEMINI: 'gemini --prompt {prompt}',
    });
    expect(registry.runners.map((r) => r.name)).toEqual(['claude', 'codex', 'gemini']);
    expect(registry.runners.every((r) => r.configured)).toBe(true);
    // No legacy default and no explicit default → first configured named runner.
    expect(registry.defaultRunner).toBe('claude');
  });

  it('marks a listed name without a command env as configured:false', () => {
    const registry = parseRunnerRegistry({
      MISSION_CONTROL_RUNNERS: 'codex,minimax',
      MISSION_CONTROL_RUNNER_CMD_CODEX: 'codex run {issue}',
      // No MISSION_CONTROL_RUNNER_CMD_MINIMAX.
    });
    const minimax = registry.runners.find((r) => r.name === 'minimax');
    expect(minimax).toEqual({ name: 'minimax', command: '', configured: false });
  });

  it('uses built-in commands for known runner presets', () => {
    const registry = parseRunnerRegistry({ MISSION_CONTROL_RUNNERS: 'claude,cursor' });
    expect(registry.runners).toEqual([
      { name: 'claude', command: 'claude -p "$(cat {prompt})"', configured: true },
      { name: 'cursor', command: 'cursor-agent -p "$(cat {prompt})" --output-format text', configured: true },
    ]);
    expect(registry.defaultRunner).toBe('claude');
  });

  it('lets explicit named runner commands override built-in presets', () => {
    const registry = parseRunnerRegistry({
      MISSION_CONTROL_RUNNERS: 'cursor',
      MISSION_CONTROL_RUNNER_CMD_CURSOR: 'cursor-agent -p "$(cat {prompt})" --model composer-2.5',
    });
    expect(registry.runners).toEqual([
      { name: 'cursor', command: 'cursor-agent -p "$(cat {prompt})" --model composer-2.5', configured: true },
    ]);
  });

  it('returns an empty registry with null default for zero config', () => {
    const registry = parseRunnerRegistry({});
    expect(registry.runners).toEqual([]);
    expect(registry.defaultRunner).toBeNull();
  });

  describe('default-runner precedence', () => {
    it('honours an explicit MISSION_CONTROL_DEFAULT_RUNNER', () => {
      const registry = parseRunnerRegistry({
        MISSION_CONTROL_RUNNER_CMD: 'claude -p "{prompt}"',
        MISSION_CONTROL_RUNNERS: 'codex',
        MISSION_CONTROL_RUNNER_CMD_CODEX: 'codex run',
        MISSION_CONTROL_DEFAULT_RUNNER: 'codex',
      });
      expect(registry.defaultRunner).toBe('codex');
    });

    it('ignores an explicit default that names an unknown runner and falls through', () => {
      const registry = parseRunnerRegistry({
        MISSION_CONTROL_RUNNER_CMD: 'claude -p "{prompt}"',
        MISSION_CONTROL_DEFAULT_RUNNER: 'nope',
      });
      // Falls through to the configured `default` runner.
      expect(registry.defaultRunner).toBe('default');
    });

    it('prefers a configured default runner over the first named runner', () => {
      const registry = parseRunnerRegistry({
        MISSION_CONTROL_RUNNER_CMD: 'claude -p "{prompt}"',
        MISSION_CONTROL_RUNNERS: 'codex',
        MISSION_CONTROL_RUNNER_CMD_CODEX: 'codex run',
      });
      expect(registry.defaultRunner).toBe('default');
    });

    it('falls back to the first configured named runner when default has no command', () => {
      const registry = parseRunnerRegistry({
        MISSION_CONTROL_RUNNERS: 'codex,gemini',
        // codex listed but unconfigured; gemini configured.
        MISSION_CONTROL_RUNNER_CMD_GEMINI: 'gemini go',
      });
      expect(registry.defaultRunner).toBe('gemini');
    });
  });
});

describe('resolveRunnerForIssue', () => {
  const registry: Registry = {
    runners: [
      { name: 'default', command: 'claude -p "{prompt}"', configured: true },
      { name: 'codex', command: 'codex run {issue}', configured: true },
      { name: 'minimax', command: '', configured: false },
    ],
    defaultRunner: 'default',
  };

  it('selects the runner named by a runner:<name> label', () => {
    const chosen = resolveRunnerForIssue(new Set(['mesh:auto', 'runner:codex']), registry);
    expect(chosen?.name).toBe('codex');
  });

  it('falls back to the default runner when no runner: label is present', () => {
    const chosen = resolveRunnerForIssue(new Set(['mesh:auto']), registry);
    expect(chosen?.name).toBe('default');
  });

  it('falls back to the default runner for an unknown runner: label', () => {
    const chosen = resolveRunnerForIssue(new Set(['runner:does-not-exist']), registry);
    expect(chosen?.name).toBe('default');
  });

  it('returns a known-but-unconfigured runner so the caller can fail safe', () => {
    // runner:minimax matches a registry entry whose command is unset. Selection
    // wins on the label match; runOnce's !runner.configured guard then writes the
    // prompt + comments + throws rather than running a blank command.
    const chosen = resolveRunnerForIssue(new Set(['runner:minimax']), registry);
    expect(chosen).toEqual({ name: 'minimax', command: '', configured: false });
  });

  it('returns null when nothing is configured', () => {
    const empty: Registry = { runners: [], defaultRunner: null };
    expect(resolveRunnerForIssue(new Set(['runner:codex']), empty)).toBeNull();
  });
});
