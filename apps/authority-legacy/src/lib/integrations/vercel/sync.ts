// src/lib/integrations/vercel/sync.ts
import { getAdminClient } from "@/lib/supabase/admin";
import { listProjects, listDeployments, listEnvVars } from "./client";

export async function syncVercel(): Promise<{
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<{ project: string; error: string }>;
}> {
  const sb = getAdminClient();
  let total = 0;
  const succeeded: string[] = [];
  const failed: Array<{ project: string; error: string }> = [];

  const projects = await listProjects();
  for (const p of projects) {
    try {
      const deps = await listDeployments(p.id, 100);
      const latest = deps[0];

      await sb.from("integration_vercel_projects").upsert(
        {
          id: p.id,
          name: p.name,
          framework: p.framework,
          git_repo: p.link?.repo ? `${p.link.org}/${p.link.repo}` : null,
          production_url: p.targets?.production?.url ?? null,
          last_deployment_id: latest?.uid,
          last_deployment_state: latest?.state,
          last_deployment_at: latest ? new Date(latest.created).toISOString() : null,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      total++;

      const depRows = deps.map((d) => ({
        id: d.uid,
        project_id: p.id,
        url: d.url,
        state: d.state,
        target: d.target ?? "preview",
        commit_sha: d.meta?.githubCommitSha,
        commit_message: d.meta?.githubCommitMessage,
        ready_at: d.ready ? new Date(d.ready).toISOString() : null,
        created_at: new Date(d.created).toISOString(),
        fetched_at: new Date().toISOString(),
      }));
      if (depRows.length)
        await sb
          .from("integration_vercel_deployments")
          .upsert(depRows, { onConflict: "id" });
      total += depRows.length;

      // env-var index — captures the smoking-gun "set but empty" pattern from RA Sign-In
      const envs = await listEnvVars(p.id);
      const envRows = envs.flatMap((e) =>
        e.target.map((target) => ({
          project_id: p.id,
          env_target: target,
          key: e.key,
          is_empty: false,   // we can't see the actual value via the listing — pre-flight elsewhere
          value_length: null,
          updated_at: new Date(e.updatedAt).toISOString(),
          fetched_at: new Date().toISOString(),
        }))
      );
      if (envRows.length)
        await sb
          .from("integration_vercel_env_index")
          .upsert(envRows, { onConflict: "project_id,env_target,key" });
      total += envRows.length;

      succeeded.push(p.id);
    } catch (e) {
      failed.push({
        project: p.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { rowsUpserted: total, succeeded, failed };
}
