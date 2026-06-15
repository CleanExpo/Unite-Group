import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/require-admin';

export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);
const HERMES_BIN = process.env.HERMES_BIN?.trim() || 'hermes';
const TAILSCALE_BIN = process.env.TAILSCALE_BIN?.trim() || '/Applications/Tailscale.app/Contents/MacOS/Tailscale';
const SECOND_BRAIN_PATH = process.env.UNITE_SECOND_BRAIN_PATH?.trim() || '/Users/phillmcgurk/2nd-brain';
const LEGACY_OBSIDIAN_PATH = process.env.OBSIDIAN_VAULT_PATH?.trim() || '/Users/phillmcgurk/Documents/Obsidian Vault';
const HERMES_HOME = process.env.HERMES_HOME?.trim() || '/Users/phillmcgurk/.hermes';
const HERMES_CONFIG_PATH = process.env.HERMES_CONFIG_PATH?.trim() || path.join(HERMES_HOME, 'config.yaml');
const HERMES_HOOKS_PATH = process.env.HERMES_HOOKS_PATH?.trim() || path.join(HERMES_HOME, 'hooks');
const HERMES_SOURCE_PATH = process.env.HERMES_SOURCE_PATH?.trim() || path.join(HERMES_HOME, 'hermes-agent');

type ProbeStatus = 'live' | 'degraded' | 'missing';

type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  error?: string;
};

type BoardRow = {
  slug?: string;
  name?: string;
  is_current?: boolean;
  counts?: Record<string, number>;
  total?: number;
};

type TaskRow = {
  status?: string;
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function isLocalPreview() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.COMMAND_CENTER_LOCAL_PREVIEW === 'true'
  );
}

async function runCommand(file: string, args: string[], timeout = 5_000): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      timeout,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, stdout, stderr };
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string; code?: string | number };
    return {
      ok: false,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      error: err.code ? String(err.code) : err.message,
    };
  }
}

function parseJsonArray<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function countByStatus(tasks: TaskRow[]) {
  return tasks.reduce<Record<string, number>>((acc, task) => {
    const status = task.status ?? 'unknown';
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
}

async function probeDashboardHttp(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_000);
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/status`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    return { ok: res.ok, statusCode: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'dashboard_http_probe_failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseDashboardStatus(
  stdout: string,
  ok: boolean,
  http: { ok: boolean; statusCode?: number; error?: string },
  error?: string,
) {
  const reportedProcessCount = Number(stdout.match(/(\d+)\s+hermes dashboard process/i)?.[1] ?? 0);
  const url = process.env.HERMES_DASHBOARD_URL?.trim() || 'http://127.0.0.1:9119';
  return {
    status: ok && http.ok ? 'live' as ProbeStatus : 'degraded' as ProbeStatus,
    processCount: http.ok ? Math.max(reportedProcessCount, 1) : 0,
    url,
    note: http.ok
      ? `Hermes dashboard HTTP status endpoint is reachable. CLI process scan reported ${reportedProcessCount}.`
      : `dashboard HTTP probe failed: ${http.error ?? http.statusCode ?? error ?? 'unknown'}`,
  };
}

function parseCronStatus(stdout: string, ok: boolean, gatewayProcessCount = 0, error?: string) {
  const activeJobs = Number(stdout.match(/(\d+)\s+active job(?:\(s\)|s)?\b/i)?.[1] ?? 0);
  const statusSaysGatewayRunning = ok && !/gateway is not running/i.test(stdout);
  const gatewayRunning = statusSaysGatewayRunning || gatewayProcessCount > 0;
  const nextRunAt = stdout.match(/Next run:\s*([^\n]+)/i)?.[1]?.trim();
  return {
    status: gatewayRunning ? 'live' as ProbeStatus : 'degraded' as ProbeStatus,
    gatewayRunning,
    gatewayProcessCount,
    activeJobs,
    nextRunAt,
    note: gatewayRunning
      ? gatewayProcessCount > 0 && !statusSaysGatewayRunning
        ? 'Gateway process detected via OS fallback; cron status text is stale/degraded but jobs have a live runner.'
        : 'Gateway scheduler is available.'
      : 'Gateway is not running, so scheduled cron jobs will not fire.',
    error: ok ? undefined : error,
  };
}

async function countGatewayProcesses() {
  const result = await runCommand('/bin/ps', ['-ax', '-o', 'pid=,command='], 5_000);
  if (!result.ok) return 0;
  return result.stdout
    .split(/\r?\n/)
    .filter((line) => /hermes_cli\.main\s+gateway\s+run/i.test(line) || /hermes\s+gateway\s+run/i.test(line))
    .length;
}

async function readKanban() {
  const [boardsResult, tasksResult] = await Promise.all([
    runCommand(HERMES_BIN, ['kanban', 'boards', 'list', '--json']),
    runCommand(HERMES_BIN, ['kanban', 'list', '--json']),
  ]);

  const boards = parseJsonArray<BoardRow>(boardsResult.stdout);
  const tasks = parseJsonArray<TaskRow>(tasksResult.stdout);
  const currentBoard = boards.find((board) => board.is_current) ?? boards[0];
  const counts = currentBoard?.counts ?? countByStatus(tasks);
  const total = currentBoard?.total ?? Object.values(counts).reduce((sum, value) => sum + value, 0);

  return {
    status: boardsResult.ok && tasksResult.ok ? 'live' as ProbeStatus : 'degraded' as ProbeStatus,
    currentBoard: currentBoard?.slug ?? 'unknown',
    boards: boards.map((board) => ({
      slug: board.slug ?? 'unknown',
      name: board.name ?? board.slug ?? 'unknown',
      total: board.total ?? 0,
      counts: board.counts ?? {},
      current: Boolean(board.is_current),
    })),
    taskCount: total,
    counts,
    note: boardsResult.ok && tasksResult.ok
      ? 'Hermes Kanban board read succeeded.'
      : 'Kanban CLI probe degraded; wrapper will stay read-only.',
  };
}

async function countMarkdownFiles(root: string): Promise<number | null> {
  try {
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) return null;
  } catch {
    return null;
  }

  async function walk(dir: string): Promise<number> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
      if (entry.name.startsWith('.git')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) count += await walk(full);
      if (entry.isFile() && entry.name.endsWith('.md')) count += 1;
    }
    return count;
  }

  return walk(root);
}

async function readContextStatus() {
  const [secondBrainMd, legacyObsidianMd, tailscaleResult] = await Promise.all([
    countMarkdownFiles(SECOND_BRAIN_PATH),
    countMarkdownFiles(LEGACY_OBSIDIAN_PATH),
    runCommand(TAILSCALE_BIN, ['status'], 5_000),
  ]);

  const tailnetLines = tailscaleResult.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const onlinePeers = tailnetLines.filter((line) => !/offline/i.test(line)).length;

  return {
    status: secondBrainMd && tailscaleResult.ok ? 'live' as ProbeStatus : 'degraded' as ProbeStatus,
    secondBrain: {
      path: SECOND_BRAIN_PATH,
      markdownFiles: secondBrainMd ?? 0,
      canonical: Boolean(secondBrainMd && secondBrainMd > 0),
    },
    legacyObsidian: {
      path: LEGACY_OBSIDIAN_PATH,
      markdownFiles: legacyObsidianMd ?? 0,
      note: legacyObsidianMd === 0 ? 'Legacy Obsidian folder has no markdown files.' : 'Legacy Obsidian folder contains markdown files.',
    },
    tailscale: {
      status: tailscaleResult.ok ? 'live' as ProbeStatus : 'missing' as ProbeStatus,
      onlinePeers,
      note: tailscaleResult.ok ? 'Tailnet reachable from local Mac.' : 'Tailscale CLI probe failed.',
    },
  };
}

async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function readYamlSectionValue(configText: string | null, section: string, key: string) {
  if (!configText) return undefined;
  const lines = configText.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${section}:`);
  if (start === -1) return undefined;
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && !line.startsWith(' ')) break;
    const match = line.match(new RegExp(`^\\s+${key}:\\s*([^#]+)`));
    if (match) return match[1]?.trim().replace(/^['"]|['"]$/g, '');
  }
  return undefined;
}

async function countHookManifests() {
  try {
    const entries = await fs.readdir(HERMES_HOOKS_PATH, { withFileTypes: true });
    const hookNames: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifest = path.join(HERMES_HOOKS_PATH, entry.name, 'HOOK.yaml');
      try {
        const stat = await fs.stat(manifest);
        if (stat.isFile()) hookNames.push(entry.name);
      } catch {
        // Ignore directories that are not hook manifests.
      }
    }
    return { exists: true, hookNames };
  } catch {
    return { exists: false, hookNames: [] as string[] };
  }
}

async function readAddonStatus() {
  const [configText, toolsResult, hooks, batchRunnerStat] = await Promise.all([
    readTextFile(HERMES_CONFIG_PATH),
    runCommand(HERMES_BIN, ['tools', 'list'], 5_000),
    countHookManifests(),
    fs.stat(path.join(HERMES_SOURCE_PATH, 'batch_runner.py')).catch(() => null),
  ]);

  const goalTurns = Number(readYamlSectionValue(configText, 'goals', 'max_turns') ?? 20);
  const goalJudgeProvider = readYamlSectionValue(configText, 'auxiliary', 'goal_judge') ? 'custom judge' : 'default judge';
  const codeMode = readYamlSectionValue(configText, 'code_execution', 'mode') ?? 'project';
  const codeMaxCalls = Number(readYamlSectionValue(configText, 'code_execution', 'max_tool_calls') ?? 50);
  const codeTimeout = Number(readYamlSectionValue(configText, 'code_execution', 'timeout') ?? 300);
  const codeEnabled = toolsResult.ok && /enabled\s+code_execution/i.test(toolsResult.stdout);
  const batchRunnerPresent = Boolean(batchRunnerStat?.isFile());
  const hooksStatus: ProbeStatus = hooks.exists ? (hooks.hookNames.length > 0 ? 'live' : 'degraded') : 'missing';

  const goals = {
    status: configText && goalTurns > 0 ? 'live' as ProbeStatus : 'degraded' as ProbeStatus,
    metric: `${Number.isFinite(goalTurns) ? goalTurns : 20} turns`,
    note: `Persistent /goal and /subgoal loop available with ${goalJudgeProvider}; judge calls stay small and cache-safe.`,
  };
  const codeExecution = {
    status: codeEnabled ? 'live' as ProbeStatus : 'degraded' as ProbeStatus,
    metric: `${codeMode} · ${Number.isFinite(codeMaxCalls) ? codeMaxCalls : 50} calls`,
    note: `execute_code available for mechanical multi-step workflows; timeout ${Number.isFinite(codeTimeout) ? codeTimeout : 300}s.`,
  };
  const hooksProbe = {
    status: hooksStatus,
    metric: `${hooks.hookNames.length} hooks`,
    note: hooks.hookNames.length > 0
      ? `Gateway hook manifests present: ${hooks.hookNames.join(', ')}.`
      : 'Hooks directory is available but no hook manifests were found.',
  };
  const batchProcessing = {
    status: batchRunnerPresent ? 'live' as ProbeStatus : 'missing' as ProbeStatus,
    metric: batchRunnerPresent ? 'batch_runner.py' : 'missing runner',
    note: batchRunnerPresent
      ? 'Batch runner is present for checkpointed dataset/trajectory runs; wrapper only reports readiness.'
      : 'Hermes batch runner was not found under the local source checkout.',
  };

  const statuses = [goals.status, codeExecution.status, hooksProbe.status, batchProcessing.status];
  return {
    status: statuses.every((status) => status === 'live') ? 'live' as ProbeStatus : 'degraded' as ProbeStatus,
    goals,
    codeExecution,
    hooks: hooksProbe,
    batchProcessing,
  };
}

export async function GET(req: NextRequest) {
  if (!isLocalPreview()) {
    const gate = await requireAdmin(req);
    if (gate instanceof NextResponse) return gate;
  }

  const dashboardUrl = process.env.HERMES_DASHBOARD_URL?.trim() || 'http://127.0.0.1:9119';
  const [dashboardResult, dashboardHttp, cronResult, gatewayProcessCount, kanban, context, addons] = await Promise.all([
    runCommand(HERMES_BIN, ['dashboard', '--status']),
    probeDashboardHttp(dashboardUrl),
    runCommand(HERMES_BIN, ['cron', 'status']),
    countGatewayProcesses(),
    readKanban(),
    readContextStatus(),
    readAddonStatus(),
  ] as const);

  return jsonResponse({
    source: 'local-hermes-dashboard-wrapper',
    generatedAt: new Date().toISOString(),
    docsContract: {
      mode: 'read-only wrapper',
      dashboardExtensionPath: '~/.hermes/plugins/<name>/dashboard/',
      missionControlPattern: 'Unite-Group calls local Hermes dashboard/kanban/cron/add-on probes; no secrets or .env values are exposed.',
      subscriptionProxy: 'Optional raw-model passthrough only; not used as the Mission Control agent wrapper.',
      addons: 'Goals, code execution, hooks, and batch processing are surfaced as read-only readiness cards.',
    },
    dashboard: parseDashboardStatus(
      dashboardResult.stdout,
      dashboardResult.ok,
      dashboardHttp,
      dashboardResult.error,
    ),
    cron: parseCronStatus(cronResult.stdout, cronResult.ok, Number(gatewayProcessCount) || 0, cronResult.error),
    kanban,
    context,
    addons,
  });
}
