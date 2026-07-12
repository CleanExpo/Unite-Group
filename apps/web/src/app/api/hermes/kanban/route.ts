import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { fetchIssuesByLabel } from "@/lib/integrations/linear";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ExecFileAsync = (
  file: string,
  args: string[],
  options: { timeout: number; windowsHide: boolean },
) => Promise<{ stdout: string; stderr?: string }>;

const defaultExecFileAsync = promisify(execFile) as ExecFileAsync;
let execFileAsync: ExecFileAsync = defaultExecFileAsync;

const STATUS_SYMBOLS: Record<string, string> = {
  "✓": "done",
  "▶": "ready",
  "●": "running",
  "■": "blocked",
  "○": "todo",
  "◌": "scheduled",
};

const HERMES_SOURCE_LABEL = "source:hermes-kanban";

interface LinearBacklink {
  identifier: string;
  url?: string;
}

interface HermesKanbanTask {
  id: string;
  status: string;
  assignee: string | null;
  title: string;
  linearLink?: LinearBacklink;
}

function parseTaskLine(line: string): HermesKanbanTask | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const symbol = trimmed[0];
  const fallbackStatus = STATUS_SYMBOLS[symbol];
  const withoutSymbol = fallbackStatus ? trimmed.slice(1).trim() : trimmed;
  const match = withoutSymbol.match(
    /^(t_[a-z0-9]+)\s+(\S+)\s+(.+?)\s{2,}(.+)$/i,
  );
  if (!match) return null;

  const [, id, rawStatus, rawAssignee, title] = match;
  const assignee = rawAssignee.trim();
  return {
    id,
    status: rawStatus || fallbackStatus || "unknown",
    assignee: assignee === "(unassigned)" ? null : assignee,
    title: title.trim(),
  };
}

function summarise(tasks: HermesKanbanTask[]) {
  return tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1;
    return acc;
  }, {});
}

function parseLinearBacklink(comments: unknown): LinearBacklink | undefined {
  if (!Array.isArray(comments)) return undefined;

  for (const comment of comments) {
    if (!comment || typeof comment !== "object") continue;
    const body =
      "body" in comment && typeof comment.body === "string"
        ? comment.body
        : undefined;
    if (!body) continue;
    const match = body.match(
      /Linear link:\s*([A-Z]+-\d+)(?:\s+(https?:\/\/\S+))?/,
    );
    if (match)
      return { identifier: match[1], ...(match[2] ? { url: match[2] } : {}) };
  }

  return undefined;
}

async function readExistingLinearBacklink(taskId: string) {
  const { stdout } = await execFileAsync(
    "hermes",
    ["kanban", "show", "--json", taskId],
    { timeout: 15_000, windowsHide: true },
  );
  const detail = JSON.parse(stdout) as { comments?: unknown };
  return parseLinearBacklink(detail.comments);
}

async function hydrateLinearBacklinks(tasks: HermesKanbanTask[]) {
  const hydrateableTaskIds = new Set(
    tasks
      .filter((task) => task.status !== "done")
      .slice(0, 25)
      .map((task) => task.id),
  );

  return Promise.all(
    tasks.map(async (task) => {
      if (!hydrateableTaskIds.has(task.id)) return task;
      try {
        const linearLink = await readExistingLinearBacklink(task.id);
        return linearLink ? { ...task, linearLink } : task;
      } catch {
        return task;
      }
    }),
  );
}

function isCliMissing(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT",
  );
}

function linearStateToHermes(stateType: string): string {
  if (stateType === "completed") return "done";
  if (stateType === "started") return "running";
  if (stateType === "backlog") return "scheduled";
  return "todo";
}

async function readHermesBoardFromLinear() {
  const issues = await fetchIssuesByLabel(HERMES_SOURCE_LABEL);
  const tasks: HermesKanbanTask[] = issues.map((issue) => ({
    id: issue.identifier,
    status: linearStateToHermes(issue.state?.type ?? ""),
    assignee: null,
    title: issue.title,
    linearLink: { identifier: issue.identifier, url: issue.url },
  }));
  return {
    source: "linear",
    configured: true,
    mode: "linear" as const,
    authority: "crm-cc_tasks" as const,
    readOnly: true,
    board: "legacy-linear-projection",
    summary: summarise(tasks),
    tasks,
    lastSyncedAt: new Date().toISOString(),
  };
}

async function readHermesBoardViaCli() {
  const [{ stdout: boardsStdout }, { stdout: listStdout }] = await Promise.all([
    execFileAsync("hermes", ["kanban", "boards", "list"], {
      timeout: 15_000,
      windowsHide: true,
    }),
    execFileAsync("hermes", ["kanban", "list"], {
      timeout: 15_000,
      windowsHide: true,
    }),
  ]);
  const tasks = await hydrateLinearBacklinks(
    listStdout
      .split(/\r?\n/)
      .map(parseTaskLine)
      .filter((task): task is HermesKanbanTask => Boolean(task)),
  );
  return {
    source: "hermes-kanban",
    configured: true,
    mode: "cli" as const,
    authority: "crm-cc_tasks" as const,
    readOnly: true,
    board: boardsStdout.includes("Current board:")
      ? (boardsStdout.match(/Current board:\s*(\S+)/)?.[1] ?? "default")
      : "default",
    summary: summarise(tasks),
    tasks,
    lastSyncedAt: new Date().toISOString(),
  };
}

async function readHermesBoard() {
  try {
    return await readHermesBoardViaCli();
  } catch (error) {
    if (!isCliMissing(error)) throw error;
    return readHermesBoardFromLinear();
  }
}

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    return NextResponse.json(await readHermesBoard(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Hermes projection unavailable";
    return NextResponse.json(
      {
        source: "hermes-kanban",
        configured: false,
        authority: "crm-cc_tasks",
        readOnly: true,
        error: message,
        summary: {},
        tasks: [],
        lastSyncedAt: new Date().toISOString(),
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/**
 * Hermes and Linear are projections only. Mutation input is deliberately not
 * parsed so no request body can resurrect a second execution authority.
 */
export async function POST(_request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  return NextResponse.json(
    {
      error: "hermes_projection_mutation_retired",
      authority: "crm-cc_tasks",
      mode: "read-only",
      intake: "/api/command-centre/work-packet",
    },
    {
      status: 410,
      headers: { Allow: "GET", "Cache-Control": "no-store" },
    },
  );
}

export const __test__ = {
  parseTaskLine,
  summarise,
  parseLinearBacklink,
  setExecFileForTest(mock: ExecFileAsync) {
    execFileAsync = mock;
  },
  resetExecFileForTest() {
    execFileAsync = defaultExecFileAsync;
  },
};
