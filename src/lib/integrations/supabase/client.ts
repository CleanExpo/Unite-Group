// src/lib/integrations/supabase/client.ts
// Supabase MANAGEMENT API client (not the Postgres client).
// Raw fetch against https://api.supabase.com/v1 — do NOT import from
// @supabase/supabase-js here.

const TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN ?? "";
if (!TOKEN) console.warn("[supabase] SUPABASE_MANAGEMENT_TOKEN not set");

const BASE = "https://api.supabase.com/v1";

async function call<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Supabase Mgmt ${path} ${res.status}`);
  return (await res.json()) as T;
}

export interface SupabaseProject {
  id: string;
  ref: string;
  name: string;
  region: string;
  status: string;
  database: { version: string };
}

export interface SupabaseLintFinding {
  name: string;
  level: "ERROR" | "WARN" | "INFO";
  detail: string;
  metadata?: { schema?: string; name?: string };
}

export async function listProjects(): Promise<SupabaseProject[]> {
  return await call<SupabaseProject[]>("/projects");
}

export async function listAdvisors(
  projectRef: string,
  type: "security" | "performance",
): Promise<{ lints: SupabaseLintFinding[] }> {
  return await call<{ lints: SupabaseLintFinding[] }>(
    `/projects/${projectRef}/advisors?type=${type}`,
  );
}
