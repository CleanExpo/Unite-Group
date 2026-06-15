// /api/command-center/hermes-dashboard is the read-only Mission Control
// wrapper that probes the local Hermes CLI / kanban / cron / context-mesh /
// addons surfaces and forwards a degraded-safe envelope to the browser. The
// route is intentionally narrow: it is admin-gated outside local preview,
// never raises 5xx for probe failures (so the wrapper can render a degraded
// card), always emits a fresh generatedAt ISO timestamp, and never exposes
// any secret-bearing value. These tests pin that narrow contract with a
// fully mocked child_process, fs, and global fetch.

jest.mock('server-only', () => ({}), { virtual: true });

type ExecResult = { ok: boolean; stdout: string; stderr: string; error?: string };
const execResults: ExecResult[] = [];
let execCallIndex = 0;

jest.mock('node:child_process', () => ({
  execFile: jest.fn((_file: string, _args: string[], _opts: unknown, cb?: (err: Error | null, stdout: string, stderr: string) => void) => {
    // The promisified caller (used by the route via `promisify(execFile)`) passes
    // (file, args, options) and expects a callback at the end. The legacy caller
    // passes (file, args, callback). Pick the right one.
    const finalCb = typeof _opts === 'function' ? (_opts as (e: Error | null, o: string, s: string) => void) : cb;
    const queued = execResults[execCallIndex++] ?? { ok: false, stdout: '', stderr: '', error: 'no_mock' };
    // Fire the callback on a microtask (queueMicrotask) so the awaiting Promise
    // resolves before the next macrotask; setImmediate is too coarse and races with
    // the test's later assertions when `Promise.all` finishes after the await.
    //
    // CRITICAL: util.promisify wraps the *mocked* execFile (which has no
    // [util.promisify.custom] Symbol on it), so the standard promisify wrapping
    // is used. Standard wrapping resolves to `values[0]` from the callback.
    // We pass the multi-arg result as a single { stdout, stderr } object so the
    // awaited Promise resolves to that object, mirroring what the real
    // child_process.execFile[promisify.custom] would have returned.
    queueMicrotask(() => {
      if (queued.ok) {
        finalCb?.(null, { stdout: queued.stdout, stderr: queued.stderr });
      } else {
        const err = new Error(queued.error ?? 'exec_failed') as Error & { stdout?: string; stderr?: string; code?: string };
        err.stdout = queued.stdout;
        err.stderr = queued.stderr;
        err.code = queued.error ?? 'exec_failed';
        finalCb?.(err, { stdout: queued.stdout, stderr: queued.stderr });
      }
    });
  }),
}));

type FsEntry = { name: string; isDirectory: () => boolean; isFile: () => boolean };
type FsStat = { isDirectory: () => boolean; isFile: () => boolean };
type FsHandler = {
  stat: (p: string) => FsStat | Error;
  readdir: (p: string) => FsEntry[] | Error;
  readFile: (p: string) => string | Error;
};
let fsHandler: FsHandler = {
  stat: () => { throw new Error('fs.stat: no mock configured'); },
  readdir: () => [],
  readFile: () => { throw new Error('fs.readFile: no mock configured'); },
};
function setFsHandler(h: Partial<FsHandler>) {
  fsHandler = { stat: h.stat ?? fsHandler.stat, readdir: h.readdir ?? fsHandler.readdir, readFile: h.readFile ?? fsHandler.readFile };
}
function resetFsHandler() {
  fsHandler = {
    stat: () => { throw new Error('fs.stat: no mock configured'); },
    readdir: () => [],
    readFile: () => { throw new Error('fs.readFile: no mock configured'); },
  };
}

jest.mock('node:fs', () => ({
  promises: {
    stat: jest.fn(async (p: string) => {
      const r = fsHandler.stat(p);
      if (r instanceof Error) throw r;
      return r;
    }),
    readdir: jest.fn(async (p: string) => {
      const r = fsHandler.readdir(p);
      if (r instanceof Error) throw r;
      return r;
    }),
    readFile: jest.fn(async (p: string) => {
      const r = fsHandler.readFile(p);
      if (r instanceof Error) throw r;
      return r;
    }),
  },
}));

type FetchResult = { ok: boolean; status: number };
const fetchQueue: Array<FetchResult | Error> = [];
let fetchCallIndex = 0;
const originalFetch = (globalThis as { fetch?: unknown }).fetch;
(globalThis as { fetch: unknown }).fetch = jest.fn(async (_url: string) => {
  const queued = fetchQueue[fetchCallIndex++] ?? { ok: false, status: 0 };
  if (queued instanceof Error) throw queued;
  return {
    ok: queued.ok,
    status: queued.status,
  } as Response;
});

const mockRequireAdmin = jest.fn();
jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: (req: unknown) => mockRequireAdmin(req),
}));

import { NextResponse } from 'next/server';
import { GET } from '@/app/api/command-center/hermes-dashboard/route';
import type { NextRequest } from 'next/server';
import path from 'node:path';

// The route reads HERMES_HOME at module-load time, so we capture the same
// value here to ensure fs mock paths align with whatever Hermes profile is
// active in the current shell (e.g. ~/.hermes vs ~/.hermes/profiles/nexus-cfo).
const HERMES_HOME_RUNTIME = process.env.HERMES_HOME?.trim() || '/Users/phillmcgurk/.hermes';
const HERMES_CONFIG_RUNTIME = process.env.HERMES_CONFIG_PATH?.trim() || path.join(HERMES_HOME_RUNTIME, 'config.yaml');
const HERMES_HOOKS_RUNTIME = process.env.HERMES_HOOKS_PATH?.trim() || path.join(HERMES_HOME_RUNTIME, 'hooks');

function req(): NextRequest {
  return new Request('https://unite-group.in/api/command-center/hermes-dashboard') as NextRequest;
}

function pushExecStdout(stdout: string) {
  execResults.push({ ok: true, stdout, stderr: '' });
}
function pushExecFailure(error: string) {
  execResults.push({ ok: false, stdout: '', stderr: '', error });
}

beforeEach(() => {
  execResults.length = 0;
  execCallIndex = 0;
  resetFsHandler();
  mockRequireAdmin.mockReset();
  // Default: admin gate is closed unless a test overrides. Return a real
  // NextResponse (not a plain Response) so the route's `gate instanceof
  // NextResponse` check matches and short-circuits before running probes.
  mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'unauthorized' }, { status: 401 }));
});

afterAll(() => {
  if (originalFetch === undefined) {
    delete (globalThis as { fetch?: unknown }).fetch;
  } else {
    (globalThis as { fetch: unknown }).fetch = originalFetch;
  }
});

describe('GET /api/command-center/hermes-dashboard', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
    delete process.env.COMMAND_CENTER_LOCAL_PREVIEW;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('returns 401 with { error: "unauthorized" } when requireAdmin short-circuits with an anonymous caller and local preview is off', async () => {
    mockRequireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    );

    const res = await GET(req());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
    // The route must NOT run any CLI / fs / fetch probes when the admin gate is closed.
    expect(execCallIndex).toBe(0);
    expect(fetchCallIndex).toBe(0);
  });

  it('bypasses the admin gate and returns a structured envelope with Cache-Control: no-store when local preview is enabled in non-production', async () => {
    process.env.COMMAND_CENTER_LOCAL_PREVIEW = 'true';
    process.env.NODE_ENV = 'development';

    // Probe queue (route calls runCommand + runCommand + runCommand + countGatewayProcesses + readKanban + readContextStatus + readAddonStatus):
    // 1) `hermes dashboard --status` (runCommand) -> ok with a "2 hermes dashboard process" line
    pushExecStdout('2 hermes dashboard process(es) running.');
    // 2) dashboard HTTP fetch -> ok=true, status 200
    fetchQueue.push({ ok: true, status: 200 });
    // 3) `hermes cron status` (runCommand) -> ok
    pushExecStdout('Gateway scheduler is running. 5 active job(s). Next run: 2026-06-12 08:00:00 AEST');
    // 4) `/bin/ps -ax -o pid=,command=` (countGatewayProcesses) -> empty (the cron status text already says running)
    pushExecStdout('');
    // 5) `hermes kanban boards list --json` -> empty array (no boards => currentBoard=unknown)
    pushExecStdout('[]');
    // 6) `hermes kanban list --json` -> empty array (no tasks)
    pushExecStdout('[]');
    // 7) `tailscale status` -> ok with three online peers
    pushExecStdout('100.64.0.1 peer-a\n100.64.0.2 peer-b\n100.64.0.3 peer-c');
    // 8) `hermes tools list` -> includes "enabled code_execution"
    pushExecStdout('- code_execution: enabled code_execution for safe multi-step work');

    setFsHandler({
      stat: (p) => {
        if (p === '/Users/phillmcgurk/2nd-brain') return { isDirectory: () => true, isFile: () => false };
        if (p === '/Users/phillmcgurk/Documents/Obsidian Vault') return new Error('ENOENT');
        if (p.endsWith('/HOOK.yaml')) return { isDirectory: () => false, isFile: () => true };
        if (p.endsWith('/batch_runner.py')) return { isDirectory: () => false, isFile: () => true };
        return new Error('ENOENT');
      },
      readdir: (p) => {
        if (p === '/Users/phillmcgurk/2nd-brain') return [];
        if (p === HERMES_HOOKS_RUNTIME) return [
          { name: 'gateway-tick', isDirectory: () => true, isFile: () => false },
        ];
        return [];
      },
      readFile: (p) => {
        if (p === HERMES_CONFIG_RUNTIME) {
          return 'goals:\n  max_turns: 20\nauxiliary:\n  goal_judge: simple\ncode_execution:\n  mode: project\n  max_tool_calls: 50\n  timeout: 300\n';
        }
        return new Error('ENOENT');
      },
    });

    const res = await GET(req());

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    // Admin gate must be skipped when local preview is on (do not leak that we even hit it).
    expect(mockRequireAdmin).not.toHaveBeenCalled();

    const body = await res.json();
    expect(body.source).toBe('local-hermes-dashboard-wrapper');
    expect(typeof body.generatedAt).toBe('string');
    expect(new Date(body.generatedAt).toString()).not.toBe('Invalid Date');
    expect(body.docsContract.mode).toBe('read-only wrapper');
    expect(body.dashboard.status).toBe('live');
    expect(body.dashboard.processCount).toBe(2);
    expect(body.cron.status).toBe('live');
    expect(body.cron.gatewayRunning).toBe(true);
    expect(body.cron.activeJobs).toBe(5);
    expect(body.cron.nextRunAt).toBe('2026-06-12 08:00:00 AEST');
    expect(body.kanban.status).toBe('live');
    expect(body.kanban.currentBoard).toBe('unknown');
    expect(body.kanban.taskCount).toBe(0);
    expect(body.context.status).toBe('degraded'); // second-brain has 0 markdown files in this mock
    expect(body.context.secondBrain.canonical).toBe(false);
    expect(body.context.tailscale.onlinePeers).toBe(3);
    expect(body.addons.status).toBe('live');
    expect(body.addons.goals.metric).toBe('20 turns');
    expect(body.addons.codeExecution.status).toBe('live');
    expect(body.addons.hooks.metric).toBe('1 hooks');
    expect(body.addons.batchProcessing.metric).toBe('batch_runner.py');
  });

  it('forwards a degraded probe envelope (dashboard HTTP fetch fails + kanban CLI times out) unchanged at status 200 so the wrapper can render a degraded card', async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, actorEmail: 'contact@unite-group.in' });

    // 1) `hermes dashboard --status` -> ok stdout (process scan still runs)
    pushExecStdout('1 hermes dashboard process(es) running.');
    // 2) dashboard HTTP fetch -> network error (fetch throws)
    fetchQueue.push(new Error('econnrefused 127.0.0.1:9119'));
    // 3) `hermes cron status` -> ok with "gateway is not running" (degraded)
    pushExecStdout('Gateway is not running. 0 active job(s). Next run: never');
    // 4) `/bin/ps -ax` for gateway processes -> empty (confirms gateway not running)
    pushExecStdout('');
    // 5) `hermes kanban boards list --json` -> JSON parse failure (returns [] from parseJsonArray)
    pushExecStdout('not-json');
    // 6) `hermes kanban list --json` -> exec failure (CLI times out / exits non-zero)
    pushExecFailure('kanban_cli_timeout');
    // 7) `tailscale status` -> exec failure
    pushExecFailure('tailscale_missing');
    // 8) `hermes tools list` -> exec failure (no code-execution enabled)
    pushExecFailure('hermes_cli_missing');

    setFsHandler({
      stat: (p) => {
        if (p === '/Users/phillmcgurk/2nd-brain') return new Error('ENOENT');
        if (p === '/Users/phillmcgurk/Documents/Obsidian Vault') return new Error('ENOENT');
        if (p.endsWith('/HOOK.yaml')) return new Error('ENOENT');
        if (p.endsWith('/batch_runner.py')) return new Error('ENOENT');
        return new Error('ENOENT');
      },
      readdir: (p) => {
        if (p === HERMES_HOOKS_RUNTIME) return new Error('ENOENT');
        return [];
      },
      readFile: (p) => {
        if (p === HERMES_CONFIG_RUNTIME) return '';
        return new Error('ENOENT');
      },
    });

    const res = await GET(req());

    // The route intentionally keeps 200 even when every probe is degraded; the wrapper renders the degraded card.
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');

    const body = await res.json();
    expect(body.source).toBe('local-hermes-dashboard-wrapper');
    expect(typeof body.generatedAt).toBe('string');
    expect(body.dashboard.status).toBe('degraded');
    expect(body.dashboard.processCount).toBe(0);
    expect(body.dashboard.note).toMatch(/dashboard HTTP probe failed/);
    expect(body.cron.status).toBe('degraded');
    expect(body.cron.gatewayRunning).toBe(false);
    expect(body.cron.activeJobs).toBe(0);
    // cron text says "Gateway is not running", so the route treats the CLI as ok
    // and does NOT attach an error string to body.cron.error. (The error path is
    // reserved for when the cron CLI itself fails before emitting any text.)
    expect(body.cron.error).toBeUndefined();
    expect(body.kanban.status).toBe('degraded');
    expect(body.kanban.taskCount).toBe(0);
    expect(body.context.status).toBe('degraded');
    expect(body.context.secondBrain.markdownFiles).toBe(0);
    expect(body.context.tailscale.status).toBe('missing');
    expect(body.addons.status).toBe('degraded');
    expect(body.addons.goals.metric).toBe('20 turns'); // YAML default fallback
    expect(body.addons.batchProcessing.metric).toBe('missing runner');
  });

  it('parses singular cron "1 active job" output so the wrapper does not render 0 active jobs for a live gateway', async () => {
    mockRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'contact@unite-group.in' });

    pushExecStdout('1 hermes dashboard process(es) running.');
    fetchQueue.push({ ok: true, status: 200 });
    pushExecStdout('Gateway scheduler is running. 1 active job. Next run: 2026-06-12 09:00:00 AEST');
    pushExecStdout('');
    pushExecStdout('[]');
    pushExecStdout('[]');
    pushExecStdout('100.64.0.1 peer-a');
    pushExecStdout('- code_execution: enabled code_execution');

    setFsHandler({
      stat: (p) => {
        if (p === '/Users/phillmcgurk/2nd-brain') return { isDirectory: () => true, isFile: () => false };
        if (p === '/Users/phillmcgurk/Documents/Obsidian Vault') return new Error('ENOENT');
        if (p.endsWith('/HOOK.yaml')) return new Error('ENOENT');
        if (p.endsWith('/batch_runner.py')) return new Error('ENOENT');
        return new Error('ENOENT');
      },
      readdir: (p) => {
        if (p === '/Users/phillmcgurk/2nd-brain') return [];
        if (p === HERMES_HOOKS_RUNTIME) return new Error('ENOENT');
        return [];
      },
      readFile: (p) => {
        if (p === HERMES_CONFIG_RUNTIME) return '';
        return new Error('ENOENT');
      },
    });

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.cron.status).toBe('live');
    expect(body.cron.gatewayRunning).toBe(true);
    expect(body.cron.activeJobs).toBe(1);
    expect(body.cron.nextRunAt).toBe('2026-06-12 09:00:00 AEST');
  });

  it('always returns a fresh ISO generatedAt timestamp on every call (never undefined, never from the upstream empty body)', async () => {
    mockRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'contact@unite-group.in' });

    // Probe queue (intentionally minimal: dashboard ok + http ok + cron ok + ps ok + kanban ok + tailscale ok + tools ok + 2nd-brain present).
    pushExecStdout('1 hermes dashboard process(es) running.');
    fetchQueue.push({ ok: true, status: 200 });
    pushExecStdout('Gateway is running. 1 active job(s). Next run: 2026-06-12 09:00:00 AEST');
    pushExecStdout('');
    pushExecStdout('[]');
    pushExecStdout('[]');
    pushExecStdout('100.64.0.1 peer-a');
    pushExecStdout('- code_execution: enabled code_execution');

    setFsHandler({
      stat: (p) => {
        if (p === '/Users/phillmcgurk/2nd-brain') return { isDirectory: () => true, isFile: () => false };
        if (p === '/Users/phillmcgurk/Documents/Obsidian Vault') return new Error('ENOENT');
        if (p.endsWith('/HOOK.yaml')) return new Error('ENOENT');
        if (p.endsWith('/batch_runner.py')) return new Error('ENOENT');
        return new Error('ENOENT');
      },
      readdir: (p) => {
        if (p === '/Users/phillmcgurk/2nd-brain') return [];
        if (p === HERMES_HOOKS_RUNTIME) return new Error('ENOENT');
        return [];
      },
      readFile: (p) => {
        if (p === HERMES_CONFIG_RUNTIME) return '';
        return new Error('ENOENT');
      },
    });

    const before = Date.now();
    const res = await GET(req());
    const after = Date.now();
    const body = await res.json();
    const generatedMs = new Date(body.generatedAt).getTime();

    expect(typeof body.generatedAt).toBe('string');
    expect(Number.isFinite(generatedMs)).toBe(true);
    // generatedAt must be set from local clock, not from any upstream field, and must be between before/after.
    expect(generatedMs).toBeGreaterThanOrEqual(before);
    expect(generatedMs).toBeLessThanOrEqual(after);
  });
});
