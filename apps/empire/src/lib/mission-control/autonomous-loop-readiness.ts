import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type LoopReadinessState = 'ready' | 'blocked' | 'warning';

export interface LoopReadinessCheck {
  id: string;
  label: string;
  state: LoopReadinessState;
  detail: string;
  required: boolean;
}

export interface LoopReadinessPayload {
  source: string;
  generatedAt: string;
  overall: LoopReadinessState;
  checks: LoopReadinessCheck[];
  nextAction: string;
}

function envPresent(env: NodeJS.ProcessEnv, key: string): boolean {
  return Boolean(env[key]?.trim());
}

function checkScript(root: string, relativePath: string): boolean {
  return existsSync(join(root, relativePath));
}

function rollup(checks: LoopReadinessCheck[]): LoopReadinessState {
  if (checks.some((check) => check.required && check.state === 'blocked')) return 'blocked';
  if (checks.some((check) => check.state !== 'ready')) return 'warning';
  return 'ready';
}

function nextAction(overall: LoopReadinessState, checks: LoopReadinessCheck[]): string {
  if (overall === 'ready') return 'Start scripts/start-mission-control-loop.sh or daemonize it.';
  const blocker = checks.find((check) => check.required && check.state === 'blocked');
  if (blocker) return blocker.detail;
  const warning = checks.find((check) => check.state === 'warning');
  return warning?.detail ?? 'Review loop readiness warnings.';
}

export function buildAutonomousLoopReadiness(args?: {
  env?: NodeJS.ProcessEnv;
  root?: string;
  now?: Date;
}): LoopReadinessPayload {
  const sourceEnv = args?.env ?? process.env;
  const root = args?.root ?? process.cwd();
  const generatedAt = (args?.now ?? new Date()).toISOString();

  const runnerConfigured = envPresent(sourceEnv, 'MISSION_CONTROL_RUNNER_CMD');
  const linearConfigured = envPresent(sourceEnv, 'LINEAR_API_KEY');
  const loopScriptExists = checkScript(root, 'scripts/mission-control-linear-loop.mjs');
  const starterExists = checkScript(root, 'scripts/start-mission-control-loop.sh');
  const pushEnabled = sourceEnv.MISSION_CONTROL_PUSH === '1';
  const pushTarget = sourceEnv.MISSION_CONTROL_PUSH_TARGET?.trim() ?? '';

  const checks: LoopReadinessCheck[] = [
    {
      id: 'linear-api-key',
      label: 'Linear claim access',
      state: linearConfigured ? 'ready' : 'blocked',
      detail: linearConfigured
        ? 'Linear API key is present for issue claim/update.'
        : 'Add LINEAR_API_KEY to the worker or daemon environment.',
      required: true,
    },
    {
      id: 'runner-command',
      label: 'Agent runner',
      state: runnerConfigured ? 'ready' : 'blocked',
      detail: runnerConfigured
        ? 'Runner command is configured.'
        : 'Set MISSION_CONTROL_RUNNER_CMD, for example Claude Code with the generated prompt file.',
      required: true,
    },
    {
      id: 'loop-script',
      label: 'Loop script',
      state: loopScriptExists ? 'ready' : 'blocked',
      detail: loopScriptExists
        ? 'mission-control-linear-loop script exists.'
        : 'scripts/mission-control-linear-loop.mjs is missing.',
      required: true,
    },
    {
      id: 'starter-script',
      label: 'Starter script',
      state: starterExists ? 'ready' : 'warning',
      detail: starterExists
        ? 'start-mission-control-loop.sh can be run from anywhere.'
        : 'Add scripts/start-mission-control-loop.sh so the loop always starts from the repo root.',
      required: false,
    },
    {
      id: 'push-mode',
      label: 'Git push mode',
      state: pushEnabled ? 'ready' : 'warning',
      detail: pushEnabled
        ? `Push enabled${pushTarget ? ` to ${pushTarget}` : ' for the current branch'}.`
        : 'MISSION_CONTROL_PUSH is not enabled; work can be committed locally but will not ship.',
      required: false,
    },
    {
      id: 'done-mode',
      label: 'Linear completion mode',
      state: sourceEnv.MISSION_CONTROL_COMPLETE_ON_SUCCESS === '1' ? 'ready' : 'warning',
      detail:
        sourceEnv.MISSION_CONTROL_COMPLETE_ON_SUCCESS === '1'
          ? 'Successful issues are marked Done.'
          : 'Successful issues stop at In Review; set MISSION_CONTROL_COMPLETE_ON_SUCCESS=1 for full closure.',
      required: false,
    },
  ];

  const overall = rollup(checks);

  return {
    source: 'mission-control:autonomous-loop-readiness',
    generatedAt,
    overall,
    checks,
    nextAction: nextAction(overall, checks),
  };
}
