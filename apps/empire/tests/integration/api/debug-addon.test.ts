// Add-on probe redaction regression for the read-only Hermes Dashboard wrapper.
// This file replaced a temporary console-debug test with a deterministic safety
// assertion: the route may use local config/tools output to derive readiness,
// but it must not echo raw config or CLI stdout into the API payload.
jest.mock('server-only', () => ({}), { virtual: true });

type ExecResult = { ok: boolean; stdout: string; stderr: string; error?: string };
const execResults: ExecResult[] = [];
let execCallIndex = 0;

jest.mock('node:child_process', () => ({
  execFile: jest.fn((_file: string, _args: string[], _opts: unknown, cb?: (err: Error | null, v: unknown, s: string) => void) => {
    const finalCb = typeof _opts === 'function' ? (_opts as (e: Error | null, v: unknown, s: string) => void) : cb;
    const queued = execResults[execCallIndex++] ?? { ok: false, stdout: '', stderr: '', error: 'no_mock' };
    queueMicrotask(() => {
      if (queued.ok) {
        finalCb?.(null, { stdout: queued.stdout, stderr: queued.stderr }, '');
      } else {
        const err = new Error(queued.error ?? 'exec_failed') as Error & { stdout?: string; stderr?: string; code?: string };
        err.stdout = queued.stdout;
        err.stderr = queued.stderr;
        err.code = queued.error ?? 'exec_failed';
        finalCb?.(err, { stdout: queued.stdout, stderr: queued.stderr }, '');
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

const mockRequireAdmin = jest.fn();
jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: (req: unknown) => mockRequireAdmin(req),
}));

import { NextResponse } from 'next/server';
import { GET } from '@/app/api/command-center/hermes-dashboard/route';
import type { NextRequest } from 'next/server';
import path from 'node:path';

const HERMES_HOME_RUNTIME = process.env.HERMES_HOME?.trim() || '/Users/phillmcgurk/.hermes';
const HERMES_CONFIG_RUNTIME = process.env.HERMES_CONFIG_PATH?.trim() || path.join(HERMES_HOME_RUNTIME, 'config.yaml');
const HERMES_HOOKS_RUNTIME = process.env.HERMES_HOOKS_PATH?.trim() || path.join(HERMES_HOME_RUNTIME, 'hooks');

const originalFetch = (globalThis as { fetch?: unknown }).fetch;
const oldEnv = process.env;

function req(): NextRequest {
  return new Request('https://unite-group.in/api/command-center/hermes-dashboard') as NextRequest;
}

function pushExecStdout(stdout: string) {
  execResults.push({ ok: true, stdout, stderr: '' });
}

beforeEach(() => {
  execResults.length = 0;
  execCallIndex = 0;
  fsHandler = {
    stat: () => { throw new Error('fs.stat: no mock configured'); },
    readdir: () => [],
    readFile: () => { throw new Error('fs.readFile: no mock configured'); },
  };
  process.env = { ...oldEnv, COMMAND_CENTER_LOCAL_PREVIEW: 'true', NODE_ENV: 'development' };
  mockRequireAdmin.mockReset();
  mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'unauthorized' }, { status: 401 }));
  (globalThis as { fetch: unknown }).fetch = jest.fn(async () => ({ ok: true, status: 200 } as Response));
});

afterEach(() => {
  process.env = oldEnv;
});

afterAll(() => {
  if (originalFetch === undefined) {
    delete (globalThis as { fetch?: unknown }).fetch;
  } else {
    (globalThis as { fetch: unknown }).fetch = originalFetch;
  }
});

it('surfaces add-on readiness without leaking raw config or tool stdout', async () => {
  pushExecStdout('2 hermes dashboard process(es) running.');
  pushExecStdout('Gateway scheduler is running. 5 active job(s). Next run: 2026-06-12 08:00:00 AEST');
  pushExecStdout('');
  pushExecStdout('[]');
  pushExecStdout('[]');
  pushExecStdout('100.64.0.1 peer-a\n100.64.0.2 peer-b');
  pushExecStdout('- code_execution: enabled code_execution SHOULD_NOT_LEAK_TOOL_STDOUT');

  fsHandler = {
    stat: (p) => {
      if (p === '/Users/phillmcgurk/2nd-brain') return { isDirectory: () => true, isFile: () => false };
      if (p === '/Users/phillmcgurk/Documents/Obsidian Vault') return new Error('ENOENT');
      if (p.endsWith('/HOOK.yaml')) return { isDirectory: () => false, isFile: () => true };
      if (p.endsWith('/batch_runner.py')) return { isDirectory: () => false, isFile: () => true };
      return new Error('ENOENT');
    },
    readdir: (p) => {
      if (p === '/Users/phillmcgurk/2nd-brain') return [];
      if (p === HERMES_HOOKS_RUNTIME) {
        return [{ name: 'gateway-tick', isDirectory: () => true, isFile: () => false }];
      }
      return [];
    },
    readFile: (p) => {
      if (p === HERMES_CONFIG_RUNTIME) {
        return 'goals:\n  max_turns: 42\nauxiliary:\n  goal_judge: sensitive-judge-id\ncode_execution:\n  mode: project\n  max_tool_calls: 17\n  timeout: 111\nsecrets:\n  token: SHOULD_NOT_LEAK_CONFIG_TOKEN\n';
      }
      return new Error('ENOENT');
    },
  };

  const res = await GET(req());
  const body = await res.json();
  const serialized = JSON.stringify(body);

  expect(res.status).toBe(200);
  expect(mockRequireAdmin).not.toHaveBeenCalled();
  expect(body.addons.status).toBe('live');
  expect(body.addons.goals.metric).toBe('42 turns');
  expect(body.addons.codeExecution.metric).toBe('project · 17 calls');
  expect(body.addons.hooks.metric).toBe('1 hooks');
  expect(body.addons.batchProcessing.metric).toBe('batch_runner.py');
  expect(serialized).not.toContain('SHOULD_NOT_LEAK_CONFIG_TOKEN');
  expect(serialized).not.toContain('SHOULD_NOT_LEAK_TOOL_STDOUT');
  expect(serialized).not.toContain('sensitive-judge-id');
});