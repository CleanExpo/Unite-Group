// src/lib/integrations/railway/sync.ts
import { getAdminClient } from "@/lib/supabase/admin";
import { listServices, type RailwayService } from "./client";

const PROJECTS: string[] = (process.env.RAILWAY_PROJECT_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function syncService(svc: RailwayService): Promise<number> {
  const sb = getAdminClient();
  const latest = svc.deployments.edges[0]?.node;

  await sb.from("integration_railway_services").upsert(
    {
      id: svc.id,
      project_id: svc.projectId,
      name: svc.name,
      last_deployment_id: latest?.id,
      last_deployment_status: latest?.status,
      last_deployment_at: latest?.createdAt,
      service_url: latest?.staticUrl ?? latest?.url ?? null,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  const depRows = svc.deployments.edges.map((e) => ({
    id: e.node.id,
    service_id: svc.id,
    status: e.node.status,
    commit_sha: e.node.meta?.commitSha,
    created_at: e.node.createdAt,
    finished_at: null,
    fetched_at: new Date().toISOString(),
  }));
  if (depRows.length) {
    await sb
      .from("integration_railway_deployments")
      .upsert(depRows, { onConflict: "id" });
  }
  return 1 + depRows.length;
}

export async function syncRailway(): Promise<{
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<{ projectId: string; error: string }>;
}> {
  let total = 0;
  const succeeded: string[] = [];
  const failed: Array<{ projectId: string; error: string }> = [];

  if (PROJECTS.length === 0) {
    console.warn("[railway] RAILWAY_PROJECT_IDS is empty — skipping sync");
    return { rowsUpserted: 0, succeeded, failed };
  }

  for (const projectId of PROJECTS) {
    try {
      const services = await listServices(projectId);
      for (const svc of services) {
        try {
          total += await syncService(svc);
        } catch (e) {
          failed.push({
            projectId: `${projectId}/${svc.id}`,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
      succeeded.push(projectId);
    } catch (e) {
      failed.push({
        projectId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { rowsUpserted: total, succeeded, failed };
}
