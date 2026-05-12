// src/lib/integrations/github/sync.ts
import { getAdminClient } from "@/lib/supabase/admin";
import { octokit, TRACKED_REPOS } from "./client";

async function upsertRepo(repoFq: string) {
  const sb = getAdminClient();
  const [owner, name] = repoFq.split("/");
  const { data } = await octokit.repos.get({ owner, repo: name });
  await sb.from("integration_github_repos").upsert({
    id: repoFq,
    name: data.name,
    owner,
    default_branch: data.default_branch,
    is_private: data.private,
    last_pushed_at: data.pushed_at,
    open_prs_count: 0,    // filled below
    open_issues_count: data.open_issues_count,
    fetched_at: new Date().toISOString(),
  });
}

async function syncPRs(repoFq: string): Promise<number> {
  const sb = getAdminClient();
  const [owner, repo] = repoFq.split("/");
  const prs = await octokit.paginate(octokit.pulls.list, {
    owner, repo, state: "open", per_page: 100,
  });
  const rows = prs.map((pr) => ({
    id: `${repoFq}#${pr.number}`,
    repo: repoFq,
    number: pr.number,
    title: pr.title,
    state: pr.merged_at ? "merged" : pr.state,
    author_login: pr.user?.login,
    author_email: null,   // PR list doesn't carry email — fill on demand
    head_ref: pr.head.ref,
    base_ref: pr.base.ref,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    merged_at: pr.merged_at,
    mergeable: (pr as { mergeable_state?: string }).mergeable_state ?? "UNKNOWN",
    ci_state: null,       // ci state requires another API call — done below
    fetched_at: new Date().toISOString(),
  }));
  await sb.from("integration_github_prs").upsert(rows);
  await sb.from("integration_github_repos").update({ open_prs_count: prs.length }).eq("id", repoFq);
  return rows.length;
}

async function syncCommits(repoFq: string, sinceDays = 30): Promise<number> {
  const sb = getAdminClient();
  const [owner, repo] = repoFq.split("/");
  const since = new Date(Date.now() - sinceDays * 86400_000).toISOString();
  const commits = await octokit.paginate(octokit.repos.listCommits, {
    owner, repo, since, per_page: 100,
  });
  const rows = commits.map((c) => ({
    sha: c.sha,
    repo: repoFq,
    author_login: c.author?.login,
    author_email: c.commit.author?.email,
    committed_at: c.commit.committer?.date,
    message_subject: c.commit.message.split("\n")[0].slice(0, 200),
    branch: null,
    fetched_at: new Date().toISOString(),
  }));
  await sb.from("integration_github_commits").upsert(rows);
  return rows.length;
}

async function syncActionsRuns(repoFq: string): Promise<number> {
  const sb = getAdminClient();
  const [owner, repo] = repoFq.split("/");
  const runs = (
    await octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 30 })
  ).data.workflow_runs;
  const rows = runs.map((r) => ({
    id: r.id,
    repo: repoFq,
    workflow_name: r.name,
    head_branch: r.head_branch,
    head_sha: r.head_sha,
    status: r.status,
    conclusion: r.conclusion,
    started_at: r.run_started_at,
    completed_at: r.updated_at,
    fetched_at: new Date().toISOString(),
  }));
  await sb.from("integration_github_actions_runs").upsert(rows);
  return rows.length;
}

async function syncSecretsIndex(repoFq: string): Promise<number> {
  const sb = getAdminClient();
  const [owner, repo] = repoFq.split("/");
  try {
    const secrets = (await octokit.actions.listRepoSecrets({ owner, repo })).data.secrets;
    const rows = secrets.map((s) => ({
      repo: repoFq,
      secret_name: s.name,
      updated_at: s.updated_at,
      fetched_at: new Date().toISOString(),
    }));
    await sb.from("integration_github_secrets_index").upsert(rows);
    return rows.length;
  } catch {
    return 0;
  }
}

export async function syncGitHub(): Promise<{ rowsUpserted: number }> {
  let total = 0;
  for (const repo of TRACKED_REPOS) {
    await upsertRepo(repo);
    total += await syncPRs(repo);
    total += await syncCommits(repo);
    total += await syncActionsRuns(repo);
    total += await syncSecretsIndex(repo);
  }
  return { rowsUpserted: total };
}
