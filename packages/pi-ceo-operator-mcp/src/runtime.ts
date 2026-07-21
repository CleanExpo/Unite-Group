import { execFile as execFileCallback } from "node:child_process";
import { readFile as nodeReadFile } from "node:fs/promises";
import { homedir as nodeHomedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { McpServer } from "skybridge/server";
import { z } from "zod";

export const SERVER_INFO = { name: "pi-ceo-operator", version: "0.1.0" } as const;
export const PORTFOLIO_REPOS = [
  "Pi-Dev-Ops", "Disaster-Recovery", "DR-NRPG", "ATO", "RestoreAssist",
  "CARSI", "Unite-Group", "Synthex", "CCW-CRM",
] as const;
const ORG = "CleanExpo";
const execFileDefault = promisify(execFileCallback);

export type RepoHealth = {
  repo: string;
  latest_conclusion: "success" | "failure" | "cancelled" | "skipped" | "unknown";
  fail_count_last_10: number;
  latest_run_url?: string;
  error?: string;
};
export type PilotOutcome = { outcome: string; tenant_slug?: string; ts: string; error?: string; error_type?: string };
type ExecResult = { stdout: string | Buffer; stderr: string | Buffer };
export type RuntimeDependencies = {
  execFile: (file: string, args: string[]) => Promise<ExecResult>;
  readFile: (path: string, encoding: "utf8") => Promise<string>;
  homedir: () => string;
  now: () => Date;
};

const defaults: RuntimeDependencies = {
  execFile: async (file, args) => execFileDefault(file, args) as Promise<ExecResult>,
  readFile: nodeReadFile,
  homedir: nodeHomedir,
  now: () => new Date(),
};
const portfolioInput = z.object({}).strict();
const pilotInput = z.object({ limit: z.number().int().min(1).max(50).default(10) }).strict();

function dependencies(overrides: Partial<RuntimeDependencies> = {}): RuntimeDependencies {
  return { ...defaults, ...overrides };
}

export function validatePortfolioInput(value: unknown): Record<string, never> {
  return portfolioInput.parse(value);
}

export function validatePilotInput(value: unknown): { limit: number } {
  return pilotInput.parse(value);
}

export function redactError(_value: unknown, kind: "command" | "file" = "command"): string {
  return kind === "file" ? "Local outcome log unavailable (redacted)." : "External command failed (redacted).";
}

export function redactRepoResults<T extends { repos: RepoHealth[] }>(value: T): T {
  return {
    ...value,
    repos: value.repos.map((repo) => repo.error ? { ...repo, error: redactError(repo.error) } : repo),
  };
}

async function fetchRepoHealth(repo: string, deps: RuntimeDependencies): Promise<RepoHealth> {
  try {
    const { stdout } = await deps.execFile("gh", [
      "api",
      `repos/${ORG}/${repo}/actions/runs?branch=main&per_page=10`,
      "--jq",
      "{runs: [.workflow_runs[] | {conclusion, html_url, name}]}",
    ]);
    const parsed = JSON.parse(String(stdout)) as { runs?: Array<{ conclusion: string | null; html_url: string }> };
    const runs = Array.isArray(parsed.runs) ? parsed.runs : [];
    const latest = runs[0];
    const allowed = new Set(["success", "failure", "cancelled", "skipped"]);
    const conclusion = latest?.conclusion && allowed.has(latest.conclusion) ? latest.conclusion : "unknown";
    return {
      repo,
      latest_conclusion: conclusion as RepoHealth["latest_conclusion"],
      fail_count_last_10: runs.filter((run) => run.conclusion === "failure").length,
      ...(latest?.html_url ? { latest_run_url: latest.html_url } : {}),
    };
  } catch (error) {
    return { repo, latest_conclusion: "unknown", fail_count_last_10: 0, error: redactError(error) };
  }
}

export async function getPortfolioHealth(overrides: Partial<RuntimeDependencies> = {}) {
  const deps = dependencies(overrides);
  const repos = await Promise.all(PORTFOLIO_REPOS.map((repo) => fetchRepoHealth(repo, deps)));
  return {
    repos,
    total_fails: repos.reduce((total, repo) => total + repo.fail_count_last_10, 0),
    timestamp: deps.now().toISOString(),
    repos_with_errors: repos.filter((repo) => repo.error).length,
  };
}

export async function getPilotV1Outcomes(limit: number, overrides: Partial<RuntimeDependencies> = {}) {
  const validated = validatePilotInput({ limit });
  const deps = dependencies(overrides);
  const log_path = join(deps.homedir(), ".hermes/logs/pilot_v1_scheduler.log");
  try {
    const contents = await deps.readFile(log_path, "utf8");
    const outcomes: PilotOutcome[] = [];
    for (const line of contents.trim().split("\n").reverse()) {
      if (outcomes.length >= validated.limit) break;
      try {
        const value: unknown = JSON.parse(line);
        if (value && typeof value === "object" && !Array.isArray(value) && typeof (value as { outcome?: unknown }).outcome === "string") {
          const source = value as Record<string, unknown>;
          outcomes.push({
            outcome: source.outcome as string,
            ts: typeof source.ts === "string" ? source.ts : "",
            ...(typeof source.tenant_slug === "string" ? { tenant_slug: source.tenant_slug } : {}),
            ...(source.error !== undefined ? { error: "Scheduler outcome error (redacted)." } : {}),
            ...(source.error_type !== undefined ? { error_type: "redacted" } : {}),
          });
        }
      } catch { /* Non-JSON scheduler noise is intentionally ignored. */ }
    }
    return { outcomes, log_path };
  } catch (error) {
    return { outcomes: [] as PilotOutcome[], log_path, error: redactError(error, "file") };
  }
}

export function allowedAlpicArgv(probe: "version" | "help" | string): string[] {
  if (probe === "version") return ["--version"];
  if (probe === "help") return ["--help"];
  throw new Error("EVIDENCE_INCOMPLETE: no approved third Alpic command");
}

export function createOperatorServer(overrides: Partial<RuntimeDependencies> = {}) {
  const deps = dependencies(overrides);
  const server = new McpServer(SERVER_INFO, { capabilities: {} });
  server.express.get("/healthz", (_request: Request, response: Response) => response.json({ status: "ready", service: "pi-ceo-operator" }));
  return server
    .registerTool(
      {
        name: "get-portfolio-health",
        description: "Get a read-only snapshot of CI health across the Unite-Group portfolio.",
        // Skybridge 1.2.7 accepts a complete Zod schema at runtime but its
        // overload exposes only the raw-shape branch. Preserve strict parsing
        // while containing the compatibility cast at this framework boundary.
        inputSchema: portfolioInput as never,
        annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
        view: { component: "portfolio-health", description: "Portfolio health grid card" },
        _meta: { "openai/toolInvocation/invoking": "Reading portfolio health", "openai/toolInvocation/invoked": "Portfolio health ready" },
      },
      async (args) => {
        validatePortfolioInput(args);
        const structuredContent = await getPortfolioHealth(deps);
        const summary = `Portfolio snapshot — ${structuredContent.total_fails} fails across the rolling-10 window of ${PORTFOLIO_REPOS.length} repos. ${structuredContent.repos_with_errors ? `${structuredContent.repos_with_errors} repo(s) returned a redacted error.` : "All repos returned data."}`;
        return { structuredContent, content: [{ type: "text" as const, text: summary }] };
      },
    )
    .registerTool(
      {
        name: "get-pilot-v1-outcomes",
        description: "Read recent Pilot V1 scheduler outcomes from the local Hermes log. Read-only.",
        inputSchema: pilotInput as never,
        annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      },
      async (args) => {
        const { limit } = validatePilotInput(args);
        const structuredContent = await getPilotV1Outcomes(limit, deps);
        const counts = structuredContent.outcomes.reduce<Record<string, number>>((acc, outcome) => {
          acc[outcome.outcome] = (acc[outcome.outcome] ?? 0) + 1;
          return acc;
        }, {});
        const summary = structuredContent.error
          ? `Could not read Pilot V1 log: ${structuredContent.error}`
          : `Read ${structuredContent.outcomes.length} recent Pilot V1 cycles. Outcomes: ${Object.entries(counts).map(([key, value]) => `${value}× ${key}`).join(", ")}.`;
        return { structuredContent, content: [{ type: "text" as const, text: summary }] };
      },
    );
}

export async function applyProductionManifest(
  server: ReturnType<typeof createOperatorServer>,
  importer: () => Promise<{ default: Record<string, { file: string }> }> = () => import("./vite-manifest.js"),
) {
  const { default: manifest } = await importer();
  server.setViteManifest(manifest);
  return server;
}
