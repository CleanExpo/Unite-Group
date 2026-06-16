// src/lib/integrations/linear/sync.ts
import { getAdminClient } from "@/lib/supabase/admin";

const TOKEN = process.env.LINEAR_API_KEY ?? "";
const ENDPOINT = "https://api.linear.app/graphql";

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) throw new Error(`Linear: ${JSON.stringify(json.errors)}`);
  return json.data as T;
}

type Team = { id: string; name: string; key: string; activeCycle?: { id: string } | null };
type Project = {
  id: string;
  name: string;
  teams: { nodes: Array<{ id: string }> };
  state: string;
  progress: number;
};
type Issue = {
  id: string;
  identifier: string;
  team: { id: string };
  project?: { id: string } | null;
  title: string;
  state: { name: string; type: string };
  priority: number;
  assignee?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export async function syncLinear(): Promise<{
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<{ entity: string; error: string }>;
}> {
  const sb = getAdminClient();
  let total = 0;
  const succeeded: string[] = [];
  const failed: Array<{ entity: string; error: string }> = [];

  // ── Teams ─────────────────────────────────────────────
  try {
    const data = await gql<{ teams: { nodes: Team[] } }>(
      `{ teams { nodes { id name key activeCycle { id } } } }`
    );

    const rows = data.teams.nodes.map((team) => ({
      id: team.id,
      name: team.name,
      key: team.key,
      active_cycle_id: team.activeCycle?.id ?? null,
      fetched_at: new Date().toISOString(),
    }));
    if (rows.length) {
      await sb.from("integration_linear_teams").upsert(rows, { onConflict: "id" });
      total += rows.length;
    }
    succeeded.push("teams");
  } catch (e) {
    failed.push({
      entity: "teams",
      error: `${(e as Error)?.message ?? String(e)}`,
    });
  }

  // ── Projects ──────────────────────────────────────────
  try {
    const projData = await gql<{ projects: { nodes: Project[] } }>(
      `{ projects(first: 100) { nodes { id name teams { nodes { id } } state progress } } }`
    );

    const rows = projData.projects.nodes.map((p) => ({
      id: p.id,
      name: p.name,
      team_id: p.teams.nodes[0]?.id ?? null,
      state: p.state,
      progress: p.progress,
      fetched_at: new Date().toISOString(),
    }));
    if (rows.length) {
      await sb.from("integration_linear_projects").upsert(rows, { onConflict: "id" });
      total += rows.length;
    }
    succeeded.push("projects");
  } catch (e) {
    failed.push({
      entity: "projects",
      error: `${(e as Error)?.message ?? String(e)}`,
    });
  }

  // ── Issues (open + recently updated, last 30 days) ────
  // Linear caps `first` at 250 — paginate with cursor to cover all matching
  // issues. Cap total pages to avoid runaway loops on a misconfigured filter.
  try {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const allNodes: Issue[] = [];
    let cursor: string | null = null;
    const MAX_PAGES = 20; // 20 * 250 = 5000 issues hard ceiling
    for (let page = 0; page < MAX_PAGES; page++) {
      const issuesData: {
        issues: {
          nodes: Issue[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      } = await gql(
        `query($since: DateTimeOrDuration!, $after: String) {
          issues(filter: { updatedAt: { gte: $since } }, first: 250, after: $after) {
            nodes {
              id identifier team { id } project { id } title
              state { name type } priority
              assignee { id name }
              createdAt updatedAt completedAt
            }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        { since, after: cursor }
      );
      allNodes.push(...issuesData.issues.nodes);
      if (!issuesData.issues.pageInfo.hasNextPage) break;
      cursor = issuesData.issues.pageInfo.endCursor;
      if (!cursor) break;
    }

    const rows = allNodes.map((issue) => ({
      id: issue.id,
      team_id: issue.team.id,
      project_id: issue.project?.id ?? null,
      title: issue.title,
      state_name: issue.state.name,
      state_type: issue.state.type,
      priority: issue.priority,
      assignee_id: issue.assignee?.id ?? null,
      assignee_name: issue.assignee?.name ?? null,
      created_at: issue.createdAt,
      updated_at: issue.updatedAt,
      completed_at: issue.completedAt,
      fetched_at: new Date().toISOString(),
    }));
    if (rows.length) {
      await sb.from("integration_linear_issues").upsert(rows, { onConflict: "id" });
      total += rows.length;
    }
    succeeded.push("issues");
  } catch (e) {
    failed.push({
      entity: "issues",
      error: `${(e as Error)?.message ?? String(e)}`,
    });
  }

  return { rowsUpserted: total, succeeded, failed };
}
