/**
 * Pi-CEO Operator MCP App — server.
 *
 * Phase B POC of the Skybridge rollout (see Pi-CEO/skills/skybridge-rollout/
 * SKILL.md). Implements two read-only tools that give the Unite-Group operator
 * a portfolio snapshot inside Claude / ChatGPT without opening 8 browser tabs.
 *
 * Tools registered:
 *   - get-portfolio-health  → repo CI states + view-rendered card
 *   - get-pilot-v1-outcomes → recent Pilot V1 scheduler outcomes from log
 *
 * Both annotated readOnlyHint=true, destructiveHint=false. No tools mutate
 * state in this POC. The trigger_shipit tool from SPEC.md §Out-of-Scope is
 * deliberately not implemented yet — destructive actions need a separate
 * confirmation pattern design.
 */
import { McpServer } from "skybridge/server";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const PORTFOLIO_REPOS = [
  "Pi-Dev-Ops",
  "Disaster-Recovery",
  "DR-NRPG",
  "ATO",
  "RestoreAssist",
  "CARSI",
  "Unite-Group",
  "Synthex",
  "CCW-CRM",
] as const;

const ORG = "CleanExpo";

type RepoHealth = {
  repo: string;
  latest_conclusion:
    | "success"
    | "failure"
    | "cancelled"
    | "skipped"
    | "unknown";
  fail_count_last_10: number;
  latest_run_url?: string;
  error?: string;
};

async function fetchRepoHealth(repo: string): Promise<RepoHealth> {
  try {
    // gh is authenticated via the operator's local gh CLI session — no
    // tokens are passed through the MCP server. This intentionally limits
    // the POC to the operator's own machine.
    const { stdout } = await execFile("gh", [
      "api",
      `repos/${ORG}/${repo}/actions/runs?branch=main&per_page=10`,
      "--jq",
      "{runs: [.workflow_runs[] | {conclusion, html_url, name}]}",
    ]);
    const parsed = JSON.parse(stdout) as {
      runs: Array<{
        conclusion: string | null;
        html_url: string;
        name: string;
      }>;
    };
    const runs = parsed.runs ?? [];
    const latest = runs[0];
    const fails = runs.filter((r) => r.conclusion === "failure").length;
    return {
      repo,
      latest_conclusion:
        (latest?.conclusion as RepoHealth["latest_conclusion"]) ?? "unknown",
      fail_count_last_10: fails,
      latest_run_url: latest?.html_url,
    };
  } catch (err) {
    return {
      repo,
      latest_conclusion: "unknown",
      fail_count_last_10: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

type PilotOutcome = {
  outcome: string;
  tenant_slug?: string;
  ts: string;
  error?: string;
  error_type?: string;
};

async function readPilotV1Outcomes(limit: number): Promise<{
  outcomes: PilotOutcome[];
  log_path: string;
  error?: string;
}> {
  const log_path = join(homedir(), ".hermes/logs/pilot_v1_scheduler.log");
  try {
    const contents = await readFile(log_path, "utf8");
    const lines = contents.trim().split("\n").slice(-limit).reverse();
    const outcomes: PilotOutcome[] = [];
    for (const line of lines) {
      // Each line should be a single JSON record from swarm.pilot.cli, but
      // tolerate stderr noise from `railway run` etc. by skipping non-JSON.
      try {
        const obj = JSON.parse(line);
        if (obj && typeof obj === "object" && "outcome" in obj) {
          outcomes.push(obj as PilotOutcome);
        }
      } catch {
        // skip non-JSON noise
      }
    }
    return { outcomes, log_path };
  } catch (err) {
    return {
      outcomes: [],
      log_path,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const server = new McpServer(
  {
    name: "pi-ceo-operator",
    version: "0.1.0",
  },
  { capabilities: {} },
)
  .registerTool(
    {
      name: "get-portfolio-health",
      description:
        "Get a snapshot of CI health across the current Unite-Group portfolio repositories on the main branch. Returns per-repo latest-run conclusion + rolling-10 failure count. Read-only. No external mutations.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
      view: {
        component: "portfolio-health",
        description: "Portfolio health grid card",
      },
    },
    async () => {
      const results = await Promise.all(PORTFOLIO_REPOS.map(fetchRepoHealth));
      const total_fails = results.reduce(
        (acc, r) => acc + r.fail_count_last_10,
        0,
      );
      const errors = results.filter((r) => r.error);

      const structuredContent = {
        repos: results,
        total_fails,
        timestamp: new Date().toISOString(),
        repos_with_errors: errors.length,
      };

      const summary = `Portfolio snapshot — ${total_fails} fails across the rolling-10 window of ${PORTFOLIO_REPOS.length} repos. ${
        errors.length > 0
          ? `${errors.length} repo(s) returned an error (likely auth / network).`
          : "All repos returned data."
      }`;

      return {
        structuredContent,
        content: [{ type: "text", text: summary }],
      };
    },
  )
  .registerTool(
    {
      name: "get-pilot-v1-outcomes",
      description:
        "Read the most recent Pilot V1 scheduler outcomes from the local Hermes cron log. Each entry is a JSON record from `python -m swarm.pilot.cli scheduler` (outcome: sent / no_suggestion / off_hours / paused / disabled / error / skipped). Read-only.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe(
            "How many of the most recent outcomes to return (1-50, default 10)",
          ),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async ({ limit }) => {
      const result = await readPilotV1Outcomes(limit);
      const counts = result.outcomes.reduce<Record<string, number>>(
        (acc, o) => {
          acc[o.outcome] = (acc[o.outcome] ?? 0) + 1;
          return acc;
        },
        {},
      );
      const summary = result.error
        ? `Could not read Pilot V1 log (${result.log_path}): ${result.error}`
        : `Read ${result.outcomes.length} recent Pilot V1 cycles. Outcomes: ${Object.entries(
            counts,
          )
            .map(([k, v]) => `${v}× ${k}`)
            .join(", ")}.`;

      return {
        structuredContent: result,
        content: [{ type: "text", text: summary }],
      };
    },
  );

if (process.env.NODE_ENV === "production") {
  const { default: manifest } = await import("./vite-manifest.js");
  server.setViteManifest(manifest);
}

export default await server.run();

export type AppType = typeof server;
