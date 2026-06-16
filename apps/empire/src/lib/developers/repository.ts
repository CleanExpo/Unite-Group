// src/lib/developers/repository.ts
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  DeveloperProfile,
  DeveloperSnapshot,
  DeveloperOpenPR,
  BranchTicketLink,
} from "./types";
import { aggregateRollingWindow, sumOverDays } from "./activity-aggregator";
import { extractLinearKey } from "./branch-ticket-resolver";

export async function listDevelopers(): Promise<DeveloperProfile[]> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("developer_profile")
    .select("*")
    .eq("active", true)
    .order("display_name");
  if (error) throw error;
  return (data ?? []).map(rowToProfile);
}

export async function getDeveloperByEmail(
  email: string,
): Promise<DeveloperProfile | null> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("developer_profile")
    .select("*")
    .eq("primary_email", email)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProfile(data) : null;
}

function rowToProfile(r: Record<string, unknown>): DeveloperProfile {
  return {
    id: r.id as number,
    displayName: r.display_name as string,
    primaryEmail: r.primary_email as string,
    gitAuthorEmails: (r.git_author_emails as string[]) ?? [],
    githubLogin: (r.github_login as string) ?? null,
    role: (r.role as string) ?? null,
    country: (r.country as string) ?? null,
    timezone: (r.timezone as string) ?? null,
    hiredAt: (r.hired_at as string) ?? null,
    active: r.active as boolean,
  };
}

interface CommitRow {
  sha: string;
  repo: string;
  author_email: string | null;
  committed_at: string;
  branch: string | null;
}

interface PrRow {
  id: string;
  repo: string;
  number: number;
  title: string;
  author_email: string | null;
  head_ref: string | null;
  ci_state: string | null;
  mergeable: string | null;
  created_at: string;
  updated_at: string;
}

interface BranchMapRow {
  repo: string;
  branch: string;
  linear_issue_id: string | null;
  last_seen_at: string | null;
}

interface LinearIssueRow {
  id: string;
  title: string;
  state_name: string | null;
  state_type: string | null;
}

type PgResult<T> = { data: T[] | null; error: unknown };

function pickRows<T>(
  result: PromiseSettledResult<PgResult<T>>,
  label: string,
): T[] {
  if (result.status === "rejected") {
    console.warn(`[developers] ${label} rejected: ${String(result.reason)}`);
    return [];
  }
  if (result.value.error) {
    console.warn(`[developers] ${label} error: ${String(result.value.error)}`);
    return [];
  }
  return (result.value.data ?? []) as T[];
}

export async function buildSnapshot(
  profile: DeveloperProfile,
): Promise<DeveloperSnapshot> {
  const sb = getAdminClient();
  const emails = profile.gitAuthorEmails.length
    ? profile.gitAuthorEmails
    : [profile.primaryEmail];

  // Tier 1: commits, prs, branchMap fire in parallel. Promise.allSettled
  // so one failure (e.g. missing table) degrades gracefully instead of
  // taking down the whole snapshot — mirrors integrations/dashboard-state.ts.
  const [commitsRes, prsRes, branchMapRes] = await Promise.allSettled([
    // .limit(5000) — PostgREST default cap is 1000; Rana is at ~953/mo and
    // would silently truncate. 5K gives headroom; warn-log fires if hit.
    sb
      .from("integration_github_commits")
      .select("sha, repo, author_email, committed_at, branch")
      .in("author_email", emails)
      .gte(
        "committed_at",
        new Date(Date.now() - 30 * 86400_000).toISOString(),
      )
      .order("committed_at", { ascending: false })
      .limit(5000),
    sb
      .from("integration_github_prs")
      .select(
        "id, repo, number, title, author_email, head_ref, ci_state, mergeable, created_at, updated_at",
      )
      .eq("state", "open")
      .in("author_email", emails),
    sb
      .from("developer_branch_map")
      .select("repo, branch, linear_issue_id, last_seen_at")
      .eq("developer_email", profile.primaryEmail),
  ]);

  const commits: CommitRow[] = pickRows<CommitRow>(
    commitsRes,
    `commits[${profile.primaryEmail}]`,
  );
  if (commits.length === 5000) {
    console.warn(
      `[developers] commit limit hit for ${profile.primaryEmail} — increase the LIMIT`,
    );
  }
  const prs: PrRow[] = pickRows<PrRow>(prsRes, `prs[${profile.primaryEmail}]`);
  const branchMap: BranchMapRow[] = pickRows<BranchMapRow>(
    branchMapRes,
    `branchMap[${profile.primaryEmail}]`,
  );

  // Tier 2: linearIssues depends on branchMap ticket ids.
  const ticketIds = branchMap
    .map((b) => b.linear_issue_id)
    .filter((id): id is string => !!id);
  let linearIssues: LinearIssueRow[] = [];
  if (ticketIds.length > 0) {
    const linearRes = await Promise.allSettled([
      sb
        .from("integration_linear_issues")
        .select("id, title, state_name, state_type")
        .in("id", ticketIds),
    ]);
    linearIssues = pickRows<LinearIssueRow>(
      linearRes[0],
      `linearIssues[${profile.primaryEmail}]`,
    );
  }
  const linearById = new Map(linearIssues.map((i) => [i.id, i]));

  // sparkline
  const tz = profile.timezone ?? "UTC";
  const sparkline = aggregateRollingWindow(commits, tz, 14);
  const commitsToday = sumOverDays(sparkline, 1);
  const commitsThisWeek = sumOverDays(sparkline, 7);
  const commitsThisMonth = commits.length;

  // per repo
  const perRepoMap = new Map<
    string,
    { commits14d: number; lastCommitAt: string | null }
  >();
  for (const c of commits) {
    const slot = perRepoMap.get(c.repo) ?? {
      commits14d: 0,
      lastCommitAt: null,
    };
    slot.commits14d++;
    if (!slot.lastCommitAt || c.committed_at > slot.lastCommitAt) {
      slot.lastCommitAt = c.committed_at;
    }
    perRepoMap.set(c.repo, slot);
  }
  const perRepo = [...perRepoMap.entries()].map(([repo, v]) => ({
    repo,
    ...v,
  }));

  const lastPushAt = commits[0]?.committed_at ?? null;
  const hoursSinceLastPush = lastPushAt
    ? Math.round((Date.now() - new Date(lastPushAt).getTime()) / 3600_000)
    : null;

  // map PRs
  const openPRs: DeveloperOpenPR[] = prs.map((pr) => {
    const daysOpen = Math.round(
      (Date.now() - new Date(pr.created_at).getTime()) / 86400_000,
    );
    return {
      id: pr.id,
      repo: pr.repo,
      number: pr.number,
      title: pr.title,
      headRef: pr.head_ref ?? "",
      ciState: pr.ci_state,
      mergeable: pr.mergeable,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      daysOpen,
      linkedLinearIssueId: extractLinearKey(pr.head_ref ?? ""),
    };
  });

  const prsBlockedOnReview = openPRs.filter(
    (pr) =>
      pr.daysOpen >= 2 &&
      pr.mergeable === "MERGEABLE" &&
      pr.ciState === "success",
  );

  const branchTicketMap: BranchTicketLink[] = branchMap.map((b) => {
    const issue = b.linear_issue_id ? linearById.get(b.linear_issue_id) : null;
    return {
      repo: b.repo,
      branch: b.branch,
      linearIssueId: b.linear_issue_id,
      linearTitle: issue?.title ?? null,
      linearStatus: issue?.state_name ?? null,
      lastCommitAt: b.last_seen_at,
      ciState: null,
    };
  });

  const staleBranches = branchTicketMap.filter((b) => {
    if (!b.lastCommitAt) return false;
    return Date.now() - new Date(b.lastCommitAt).getTime() > 7 * 86400_000;
  });

  return {
    profile,
    sparkline,
    commitsToday,
    commitsThisWeek,
    commitsThisMonth,
    lastPushAt,
    hoursSinceLastPush,
    perRepo,
    openPRs,
    prsBlockedOnReview,
    staleBranches,
    branchTicketMap,
  };
}
