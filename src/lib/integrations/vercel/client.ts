// src/lib/integrations/vercel/client.ts
const TOKEN = process.env.VERCEL_INTEGRATION_TOKEN ?? "";
const TEAM_ID = process.env.VERCEL_TEAM_ID ?? "";

if (!TOKEN) console.warn("[vercel] VERCEL_INTEGRATION_TOKEN not set");
if (!TEAM_ID) console.warn("[vercel] VERCEL_TEAM_ID not set");

async function call<T>(path: string): Promise<T> {
  const teamSuffix = TEAM_ID
    ? `${path.includes("?") ? "&" : "?"}teamId=${TEAM_ID}`
    : "";
  const url = `https://api.vercel.com${path}${teamSuffix}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  link?: { repo?: string; org?: string };
  targets?: Record<string, { url?: string }>;
}

export interface VercelDeployment {
  uid: string;
  url: string;
  state: string;
  target?: string;
  meta?: { githubCommitSha?: string; githubCommitMessage?: string };
  ready?: number;
  created: number;
}

export interface VercelEnvVar {
  id: string;
  key: string;
  target: string[];
  type: string;
  updatedAt: number;
}

export async function listProjects(): Promise<VercelProject[]> {
  // NOTE: raised to API max (100/page). Cursor pagination is a follow-up if any
  // team exceeds 100 projects.
  return (await call<{ projects: VercelProject[] }>("/v10/projects?limit=100")).projects;
}

export async function listDeployments(projectId: string, limit = 100): Promise<VercelDeployment[]> {
  // NOTE: raised to API max (100/page). Cursor pagination via `?until=<ts>` is a
  // follow-up if deeper history is needed.
  return (await call<{ deployments: VercelDeployment[] }>(
    `/v6/deployments?projectId=${projectId}&limit=${limit}`
  )).deployments;
}

export async function listEnvVars(projectId: string): Promise<VercelEnvVar[]> {
  // value is encrypted in the listing; we only capture {key,target,updatedAt} + emptiness flag
  return (await call<{ envs: (VercelEnvVar & { value?: string })[] }>(
    `/v9/projects/${projectId}/env`
  )).envs;
}
