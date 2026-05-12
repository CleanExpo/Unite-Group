// src/lib/integrations/supabase/sync.ts
import { getAdminClient } from "@/lib/supabase/admin";
import { listProjects, listAdvisors, type SupabaseProject } from "./client";

async function syncProject(p: SupabaseProject): Promise<number> {
  const sb = getAdminClient();
  const { lints } = await listAdvisors(p.ref, "security");

  const counts = { ERROR: 0, WARN: 0, INFO: 0 };
  for (const l of lints) counts[l.level]++;

  await sb.from("integration_supabase_projects").upsert({
    ref: p.ref,
    name: p.name,
    region: p.region,
    status: p.status,
    pg_version: p.database.version,
    total_advisor_findings: lints.length,
    advisor_errors: counts.ERROR,
    advisor_warns: counts.WARN,
    advisor_infos: counts.INFO,
    fetched_at: new Date().toISOString(),
  });

  // Full refresh of findings for this project: delete then insert.
  await sb
    .from("integration_supabase_advisor_findings")
    .delete()
    .eq("project_ref", p.ref);

  const findingRows = lints.map((l) => ({
    project_ref: p.ref,
    finding_name: l.name,
    severity: l.level,
    detail: l.detail.slice(0, 1000),
    resource_name:
      l.detail.match(/`public\.([a-zA-Z0-9_]+)`/)?.[1] ?? null,
    fetched_at: new Date().toISOString(),
  }));

  // Tolerate empty findings — don't call .insert([]).
  if (findingRows.length > 0) {
    for (let i = 0; i < findingRows.length; i += 500) {
      await sb
        .from("integration_supabase_advisor_findings")
        .insert(findingRows.slice(i, i + 500));
    }
  }

  // 1 project row + N finding rows
  return 1 + findingRows.length;
}

export async function syncSupabase(): Promise<{
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<{ project: string; error: string }>;
}> {
  let total = 0;
  const succeeded: string[] = [];
  const failed: Array<{ project: string; error: string }> = [];

  const projects = await listProjects();
  for (const p of projects) {
    try {
      total += await syncProject(p);
      succeeded.push(p.ref);
    } catch (e) {
      failed.push({
        project: p.ref,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { rowsUpserted: total, succeeded, failed };
}
