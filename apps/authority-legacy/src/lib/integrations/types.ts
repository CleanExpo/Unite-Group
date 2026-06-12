// src/lib/integrations/types.ts
// Shared types every integration client/sync exports.

export type IntegrationName =
  | "github"
  | "vercel"
  | "railway"
  | "digitalocean"
  | "supabase"
  | "onepassword"
  | "linear"
  | "stripe"
  | "composio";

export interface SyncRunOutcome {
  integration: IntegrationName;
  status: "ok" | "error" | "partial";
  rowsUpserted: number;
  error?: string;
  startedAt: string;
  completedAt: string;
}

export interface IntegrationClient {
  /** Quick health probe — usually a lightweight whoami / ping. */
  health(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
  /** Full sync — writes to Postgres, returns count of rows upserted. */
  sync(): Promise<{ rowsUpserted: number }>;
}

export interface NormalisedRepoState {
  id: string;          // 'CleanExpo/RestoreAssist'
  name: string;
  owner: string;
  defaultBranch: string;
  isPrivate: boolean;
  lastPushedAt: string;
  openPrsCount: number;
  openIssuesCount: number;
}

export interface NormalisedDeployState {
  id: string;
  url: string;
  state: "READY" | "ERROR" | "BUILDING" | "QUEUED" | "CANCELED";
  target: "production" | "preview";
  commitSha: string;
  commitMessage?: string;
  readyAt?: string;
  createdAt: string;
}
