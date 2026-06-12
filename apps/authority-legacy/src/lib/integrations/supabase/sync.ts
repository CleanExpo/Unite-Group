// src/lib/integrations/supabase/sync.ts
import { getAdminClient } from "@/lib/supabase/admin";
import { listProjects, listAdvisors, type SupabaseProject } from "./client";

async function syncProject(p: SupabaseProject): Promise<number> {
  const sb = getAdminClient();

  // Fetch BOTH security and performance advisors and concatenate. The findings
  // table doesn't yet have a `category` column, so for now the counts are
  // aggregated across both types — schema-level split is a follow-up.
  const [{ lints: securityLints }, { lints: performanceLints }] = await Promise.all([
    listAdvisors(p.ref, "security"),
    listAdvisors(p.ref, "performance"),
  ]);
  const lints = [...securityLints, ...performanceLints];

  const counts = { ERROR: 0, WARN: 0, INFO: 0 };
  for (const l of lints) counts[l.level]++;

  // Use ONE run timestamp for every row written in this project's sync so the
  // post-insert cleanup can target only stale rows (avoids the
  // DELETE-then-INSERT empty-table window if two cron firings overlap).
  const runTimestamp = new Date().toISOString();

  await sb.from("integration_supabase_projects").upsert(
    {
      ref: p.ref,
      name: p.name,
      region: p.region,
      status: p.status,
      pg_version: p.database.version,
      total_advisor_findings: lints.length,
      advisor_errors: counts.ERROR,
      advisor_warns: counts.WARN,
      advisor_infos: counts.INFO,
      fetched_at: runTimestamp,
    },
    { onConflict: "ref" }
  );

  const findingRows = lints.map((l) => ({
    project_ref: p.ref,
    finding_name: l.name,
    severity: l.level,
    detail: l.detail.slice(0, 1000),
    resource_name:
      l.detail.match(/`public\.([a-zA-Z0-9_]+)`/)?.[1] ?? null,
    fetched_at: runTimestamp,
  }));

  // Tolerate empty findings — don't call .insert([]).
  if (findingRows.length > 0) {
    for (let i = 0; i < findingRows.length; i += 500) {
      await sb
        .from("integration_supabase_advisor_findings")
        .insert(findingRows.slice(i, i + 500));
    }
  }

  // Sweep older rows for this project AFTER the new rows are in. This keeps
  // the findings table non-empty at all times for overlapping cron runs.
  await sb
    .from("integration_supabase_advisor_findings")
    .delete()
    .eq("project_ref", p.ref)
    .lt("fetched_at", runTimestamp);

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

  // Parallelise per-project syncs — each project is independent (own ref,
  // own rows). Sequential loop hit Vercel's 60s function timeout at ~22
  // projects × 2 advisor calls + DB writes each.
  const results = await Promise.allSettled(
    projects.map(async (p) => ({ ref: p.ref, count: await syncProject(p) })),
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      total += r.value.count;
      succeeded.push(r.value.ref);
    } else {
      // Reason carries the rejection — extract project ref from the underlying
      // Error message if we can; fall back to "unknown".
      const err = r.reason;
      const message = err instanceof Error ? err.message : String(err);
      // Best-effort: the Supabase Mgmt error includes the project ref in path.
      const refMatch = message.match(/\/projects\/([a-z0-9]+)\//);
      failed.push({
        project: refMatch?.[1] ?? "unknown",
        error: message,
      });
    }
  }

  return { rowsUpserted: total, succeeded, failed };
}
