// tests/integrations/developer-snapshot.e2e.spec.ts
//
// Plan 3 Wave D Task 15 — END-TO-END developer snapshot test.
//
// SCOPE — this is the BEHAVIOURAL E2E that the in-memory mock at
// tests/developers/snapshot-e2e.spec.ts deliberately does NOT cover.
// It actually inserts fixtures into a real Supabase (sandbox) database,
// invokes `buildSnapshot` against the real PostgREST client, and asserts
// the snapshot shape contains the fixtures we just wrote.
//
// SKIPS GRACEFULLY when `SUPABASE_SANDBOX_URL` is unset so CI runs for
// contributors without sandbox access stay green.
//
// CLEANUP — fixtures use a per-run UUID-tagged primary_email
// (`e2e-test-<uuid>@unite-group.in`) so we can DELETE everything by that
// tag in a `finally` block, even on assertion failure.

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

jest.setTimeout(30_000);

const SANDBOX_URL = process.env.SUPABASE_SANDBOX_URL;
const SANDBOX_KEY =
  process.env.SUPABASE_SANDBOX_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

// Bail out before importing the repository — `getAdminClient` reads
// NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY at first call; we
// re-point those at the sandbox INSIDE `beforeAll` and restore in `afterAll`
// so the test is hermetic.
const shouldSkip = !SANDBOX_URL || !SANDBOX_KEY;

if (shouldSkip) {
  console.warn(
    "[developer-snapshot.e2e] SUPABASE_SANDBOX_URL or service key not set — skipping E2E test (CI-safe).",
  );
}

// Use describe.skip if env missing — Jest still discovers the file but
// reports a clean skip rather than a failure.
const maybeDescribe = shouldSkip ? describe.skip : describe;

maybeDescribe("buildSnapshot — real sandbox DB roundtrip", () => {
  // Per-run tag — unique email + commit-sha prefix + branch prefix so we
  // can DELETE-by-tag even if assertions throw.
  const runTag = randomUUID().slice(0, 8);
  const FIXTURE_EMAIL = `e2e-test-${runTag}@unite-group.in`;
  const FIXTURE_REPO = `e2e-test/${runTag}`;
  const FIXTURE_BRANCH = `feat/UG-${runTag.replace(/[^0-9]/g, "").padStart(3, "1")}-snapshot-roundtrip`;
  const FIXTURE_TICKET_KEY = `UG-${runTag.replace(/[^0-9]/g, "").padStart(3, "1")}`;
  const FIXTURE_COMMIT_SHAS = [
    `e2e-${runTag}-sha-1`,
    `e2e-${runTag}-sha-2`,
    `e2e-${runTag}-sha-3`,
  ];

  let sb: SupabaseClient;
  let originalUrl: string | undefined;
  let originalKey: string | undefined;
  let createdProfileId: number | null = null;

  beforeAll(() => {
    // Stash + re-point env so `getAdminClient` inside repository.ts hits
    // the sandbox. We don't memoise getAdminClient at module-load — it's
    // called per-invocation — so this swap is safe.
    originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = SANDBOX_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SANDBOX_KEY;
    sb = createClient(SANDBOX_URL!, SANDBOX_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  afterAll(async () => {
    // Best-effort cleanup — every row is keyed off the runTag, so this
    // deletes only this test's fixtures even if multiple runs collide.
    try {
      if (sb) {
        await sb
          .from("integration_github_commits")
          .delete()
          .in("sha", FIXTURE_COMMIT_SHAS);
        await sb
          .from("developer_branch_map")
          .delete()
          .eq("repo", FIXTURE_REPO);
        if (createdProfileId !== null) {
          await sb
            .from("developer_profile")
            .delete()
            .eq("id", createdProfileId);
        } else {
          await sb
            .from("developer_profile")
            .delete()
            .eq("primary_email", FIXTURE_EMAIL);
        }
      }
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  it("inserts fixtures, builds snapshot, and surfaces commits + branchTicketMap", async () => {
    // 1) Insert developer_profile.
    const { data: profileInsert, error: profileErr } = await sb
      .from("developer_profile")
      .insert({
        display_name: `E2E Test ${runTag}`,
        primary_email: FIXTURE_EMAIL,
        git_author_emails: [FIXTURE_EMAIL],
        role: "contract-engineer",
        timezone: "UTC",
        country: "AU",
        active: true,
      })
      .select("id")
      .single();
    expect(profileErr).toBeNull();
    expect(profileInsert?.id).toBeDefined();
    createdProfileId = profileInsert!.id as number;

    // 2) Insert integration_github_commits — 3 commits, all this month.
    const nowMs = Date.now();
    const commitRows = FIXTURE_COMMIT_SHAS.map((sha, i) => ({
      sha,
      repo: FIXTURE_REPO,
      author_login: `e2e-bot-${runTag}`,
      author_email: FIXTURE_EMAIL,
      committed_at: new Date(nowMs - (i + 1) * 3_600_000).toISOString(),
      message_subject: `e2e fixture commit ${i + 1}`,
      branch: null,
      fetched_at: new Date().toISOString(),
    }));
    const { error: commitsErr } = await sb
      .from("integration_github_commits")
      .insert(commitRows);
    expect(commitsErr).toBeNull();

    // 3) Insert developer_branch_map — one row that links our fixture
    //    branch to a Linear key. We intentionally use a Linear key we
    //    DON'T expect to exist in integration_linear_issues; the snapshot
    //    must still surface the branch with linearTitle: null.
    const { error: branchMapErr } = await sb.from("developer_branch_map").upsert(
      {
        repo: FIXTURE_REPO,
        branch: FIXTURE_BRANCH,
        linear_issue_id: FIXTURE_TICKET_KEY,
        developer_email: FIXTURE_EMAIL,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "repo,branch" },
    );
    expect(branchMapErr).toBeNull();

    // 4) Call buildSnapshot — imported lazily so the env re-point above
    //    is applied before getAdminClient first runs.
    const { buildSnapshot } = await import("@/lib/developers/repository");
    const snapshot = await buildSnapshot({
      id: createdProfileId,
      displayName: `E2E Test ${runTag}`,
      primaryEmail: FIXTURE_EMAIL,
      gitAuthorEmails: [FIXTURE_EMAIL],
      githubLogin: null,
      role: "contract-engineer",
      country: "AU",
      timezone: "UTC",
      hiredAt: null,
      active: true,
    });

    // 5) Assertions — fixture commits surface, branch map joins.
    expect(snapshot.profile.primaryEmail).toBe(FIXTURE_EMAIL);
    expect(snapshot.commitsThisMonth).toBeGreaterThanOrEqual(3);
    expect(snapshot.sparkline).toHaveLength(14);

    const fixtureCommitShas = new Set(FIXTURE_COMMIT_SHAS);
    const ourRepoEntry = snapshot.perRepo.find(
      (r) => r.repo === FIXTURE_REPO,
    );
    expect(ourRepoEntry).toBeDefined();
    expect(ourRepoEntry!.commits14d).toBeGreaterThanOrEqual(3);

    // hoursSinceLastPush is computed from the freshest commit (~1h ago).
    expect(snapshot.hoursSinceLastPush).not.toBeNull();
    expect(snapshot.hoursSinceLastPush!).toBeLessThanOrEqual(2);

    // branchTicketMap surfaces our fixture branch.
    const ourBranch = snapshot.branchTicketMap.find(
      (b) => b.repo === FIXTURE_REPO && b.branch === FIXTURE_BRANCH,
    );
    expect(ourBranch).toBeDefined();
    expect(ourBranch!.linearIssueId).toBe(FIXTURE_TICKET_KEY);
    // Linear key isn't in integration_linear_issues for this test → null title.
    // (We tolerate either null OR a string if the sandbox happens to contain
    //  a colliding row — the join is what we're proving, not the fixture.)
    expect(
      ourBranch!.linearTitle === null ||
        typeof ourBranch!.linearTitle === "string",
    ).toBe(true);

    // Sanity: every fixture commit sha is reachable via a direct query.
    const { data: directCommits } = await sb
      .from("integration_github_commits")
      .select("sha")
      .in("sha", [...fixtureCommitShas]);
    expect(directCommits?.length).toBe(FIXTURE_COMMIT_SHAS.length);
  });
});
