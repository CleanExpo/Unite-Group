// src/lib/integrations/digitalocean/sync.ts
import { getAdminClient } from "@/lib/supabase/admin";
import {
  listApps,
  listDroplets,
  listDatabases,
  type DOApp,
  type DODroplet,
  type DODatabase,
} from "./client";

const COST_BY_DROPLET_SIZE: Record<string, number> = {
  "s-1vcpu-1gb": 6,
  "s-2vcpu-2gb": 18,
  "s-2vcpu-4gb-amd": 27,
  "s-4vcpu-8gb": 48,
  "s-8vcpu-16gb": 96,
};

async function upsertApp(app: DOApp): Promise<void> {
  const sb = getAdminClient();
  await sb.from("integration_do_apps").upsert(
    {
      id: app.id,
      name: app.spec.name,
      project_name: app.project_name,
      region: app.spec.region,
      live_url: app.live_url,
      active_deployment_id: app.active_deployment?.id,
      active_deployment_phase: app.active_deployment?.phase,
      last_deployment_phase: app.active_deployment?.phase,
      last_deployment_progress_at: app.active_deployment?.updated_at,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

async function upsertDroplet(d: DODroplet): Promise<void> {
  const sb = getAdminClient();
  const ipv4 = d.networks.v4.find((n) => n.type === "public")?.ip_address;
  await sb.from("integration_do_droplets").upsert(
    {
      id: d.id,
      name: d.name,
      region: d.region.slug,
      size: d.size_slug,
      status: d.status,
      ipv4,
      created_at: d.created_at,
      monthly_cost_usd: COST_BY_DROPLET_SIZE[d.size_slug] ?? null,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

async function upsertDatabase(db: DODatabase): Promise<void> {
  const sb = getAdminClient();
  await sb.from("integration_do_databases").upsert(
    {
      id: db.id,
      name: db.name,
      engine: db.engine,
      version: db.version,
      status: db.status,
      region: db.region,
      monthly_cost_usd: null,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

export async function syncDigitalOcean(): Promise<{
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<{ entity: string; error: string }>;
}> {
  let total = 0;
  const succeeded: string[] = [];
  const failed: Array<{ entity: string; error: string }> = [];

  let apps: DOApp[] = [];
  try {
    apps = await listApps();
  } catch (e) {
    failed.push({
      entity: "apps:list",
      error: e instanceof Error ? e.message : String(e),
    });
  }
  for (const app of apps) {
    const key = `app:${app.id}`;
    try {
      await upsertApp(app);
      total++;
      succeeded.push(key);
    } catch (e) {
      failed.push({
        entity: key,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  let droplets: DODroplet[] = [];
  try {
    droplets = await listDroplets();
  } catch (e) {
    failed.push({
      entity: "droplets:list",
      error: e instanceof Error ? e.message : String(e),
    });
  }
  for (const d of droplets) {
    const key = `droplet:${d.id}`;
    try {
      await upsertDroplet(d);
      total++;
      succeeded.push(key);
    } catch (e) {
      failed.push({
        entity: key,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  let databases: DODatabase[] = [];
  try {
    databases = await listDatabases();
  } catch (e) {
    failed.push({
      entity: "databases:list",
      error: e instanceof Error ? e.message : String(e),
    });
  }
  for (const db of databases) {
    const key = `database:${db.id}`;
    try {
      await upsertDatabase(db);
      total++;
      succeeded.push(key);
    } catch (e) {
      failed.push({
        entity: key,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { rowsUpserted: total, succeeded, failed };
}
