// src/lib/integrations/github/sync.ts
import { getAdminClient } from "@/lib/supabase/admin";
import { extractLinearKey } from "@/lib/developers/branch-ticket-resolver";
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

// ── developer_branch_map seeder ──────────────────────────────────────────
//
// For each branch on each tracked repo:
//   1. Extract a Linear ticket key from the branch name (may be null).
//   2. Resolve the branch author by fetching the most recent commit on the
//      branch and matching its author_email against developer_profile
//      `git_author_emails` arrays. If no match, skip — don't pollute.
//   3. Upsert (developer_email, repo, branch_name) with last_seen_at =
//      runTimestamp.
//
// After every repo has been processed, callers sweep stale rows:
//   DELETE FROM developer_branch_map
//   WHERE developer_email IN (touched) AND last_seen_at < runTimestamp
//
// Per-branch try/catch — one 404/quota error doesn't kill the sweep,
// matching the per-entity error pattern from Plan 2 (sync-contract.spec.ts).
async function loadDeveloperEmailIndex(): Promise<Map<string, string>> {
  // emailLower → primaryEmail
  const sb = getAdminClient();
  const idx = new Map<string, string>();
  const { data, error } = await sb
    .from("developer_profile")
    .select("primary_email, git_author_emails")
    .eq("active", true);
  if (error) {
    console.warn(`[github.sync] developer_profile load failed: ${String(error)}`);
    return idx;
  }
  for (const row of (data ?? []) as Array<{
    primary_email: string;
    git_author_emails: string[] | null;
  }>) {
    const primary = row.primary_email;
    idx.set(primary.toLowerCase(), primary);
    for (const alt of row.git_author_emails ?? []) {
      idx.set(alt.toLowerCase(), primary);
    }
  }
  return idx;
}

async function seedBranchMapForRepo(
  repoFq: string,
  runTimestamp: string,
  devEmailIndex: Map<string, string>,
  touchedEmails: Set<string>,
): Promise<{ upserted: number; perBranchFailures: number }> {
  // If we have no developer profiles, there's nothing to map — skip the
  // GitHub API calls entirely to save quota.
  if (devEmailIndex.size === 0) {
    return { upserted: 0, perBranchFailures: 0 };
  }

  const sb = getAdminClient();
  const [owner, repo] = repoFq.split("/");

  // listBranches is paginated; tracked repos can carry >100 branches.
  const branches = await octokit.paginate(octokit.repos.listBranches, {
    owner,
    repo,
    per_page: 100,
  });

  let upserted = 0;
  let perBranchFailures = 0;

  for (const b of branches) {
    try {
      // Most recent commit on the branch → first commit's author_email.
      // Use sha=<branch> to filter to this branch's history, per_page=1.
      const { data: headCommits } = await octokit.repos.listCommits({
        owner,
        repo,
        sha: b.name,
        per_page: 1,
      });
      const head = headCommits[0];
      const authorEmail = head?.commit?.author?.email?.toLowerCase();
      if (!authorEmail) continue;

      const developerEmail = devEmailIndex.get(authorEmail);
      if (!developerEmail) continue; // Don't pollute — only known developers.

      const linearIssueId = extractLinearKey(b.name);

      // Schema PK is (repo, branch); developer_email is a separate column.
      // We upsert against the PK so the same branch can be re-claimed if
      // the head author changed.
      const { error } = await sb.from("developer_branch_map").upsert(
        {
          repo: repoFq,
          branch: b.name,
          linear_issue_id: linearIssueId,
          developer_email: developerEmail,
          last_seen_at: runTimestamp,
        },
        { onConflict: "repo,branch" },
      );
      if (error) {
        perBranchFailures++;
        console.warn(
          `[github.sync] branch-map upsert ${repoFq}@${b.name} failed: ${String(error)}`,
        );
        continue;
      }
      touchedEmails.add(developerEmail);
      upserted++;
    } catch (e) {
      perBranchFailures++;
      console.warn(
        `[github.sync] branch-map ${repoFq}@${b.name} threw: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  return { upserted, perBranchFailures };
}

async function sweepStaleBranchMap(
  runTimestamp: string,
  touchedEmails: Set<string>,
): Promise<number> {
  if (touchedEmails.size === 0) return 0;
  const sb = getAdminClient();
  const { error, count } = await sb
    .from("developer_branch_map")
    .delete({ count: "exact" })
    .in("developer_email", [...touchedEmails])
    .lt("last_seen_at", runTimestamp);
  if (error) {
    console.warn(`[github.sync] branch-map sweep failed: ${String(error)}`);
    return 0;
  }
  return count ?? 0;
}

export async function syncGitHub(): Promise<{
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<{ repo: string; error: string }>;
}> {
  let total = 0;
  const succeeded: string[] = [];
  const failed: Array<{ repo: string; error: string }> = [];

  // Single run timestamp — every upsert in this invocation uses it, so the
  // sweep can DELETE WHERE last_seen_at < runTimestamp to evict branches
  // that have since been deleted from GitHub.
  const runTimestamp = new Date().toISOString();
  const devEmailIndex = await loadDeveloperEmailIndex();
  const touchedEmails = new Set<string>();

  for (const repo of TRACKED_REPOS) {
    try {
      await upsertRepo(repo);
      total += await syncPRs(repo);
      total += await syncCommits(repo);
      total += await syncActionsRuns(repo);
      total += await syncSecretsIndex(repo);
      // Branch-map seeder runs after the canonical syncs. Failures here
      // don't fail the repo — branch enumeration can fail on quota /
      // archived repos and we'd rather keep the rest of the sync clean.
      try {
        const { upserted } = await seedBranchMapForRepo(
          repo,
          runTimestamp,
          devEmailIndex,
          touchedEmails,
        );
        total += upserted;
      } catch (e) {
        console.warn(
          `[github.sync] seedBranchMap ${repo} failed: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
      succeeded.push(repo);
    } catch (e) {
      failed.push({
        repo,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Sweep stale rows across all touched developers in a single DELETE.
  try {
    await sweepStaleBranchMap(runTimestamp, touchedEmails);
  } catch (e) {
    console.warn(
      `[github.sync] sweep failed: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }

  return { rowsUpserted: total, succeeded, failed };
}
