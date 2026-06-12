# Unite-Group Developer Activity View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Phill (and Margot) a single page in the Unite-Group empire dashboard that shows exactly what every contracted developer is working on across every repo — commits today, open PRs, CI state, hours-since-last-push, blocked-on-review queue, and which Linear ticket each branch maps to. First user-of-record: **Rana Muzamil** (Pakistan-based software engineer; 712 CCW-CRM commits, 18 CARSI commits as of 2026-05-12).

**Architecture:** Reads from the `integration_github_*` and `integration_linear_*` tables populated by Plan 2 (Integration Mesh). Adds one new normalised table `developer_profile` (email → display name → 1Password vault → Linear user id mapping) so the dashboard joins commits across repos for the same person even when their git author identity differs by repo. The dashboard page is a Next.js server component that hits a new `/api/empire/developers` endpoint; no client-side polling — server fetches on each request with `cache: "no-store"`.

**Tech Stack:** Next.js 14 App Router (server components), Supabase Postgres reads, Recharts for the activity sparkline, Tailwind for layout. No new external API dependencies — relies entirely on the integration_* tables from Plan 2.

---

## Scope reference

- Depends on Plan 2 having created and populated: `integration_github_repos`, `integration_github_prs`, `integration_github_commits`, `integration_github_actions_runs`, `integration_linear_issues`, `integration_linear_teams`
- Existing pages to mirror in style: `src/app/empire/page.tsx`, `src/app/pi-ceo/activity/page.tsx`, `src/components/empire/EmpireSidebar.tsx`
- First developer profile: Rana Muzamil — git author email `ranamuzamil1199@gmail.com`

## File Structure

| Path | Purpose |
| --- | --- |
| `supabase/migrations/20260513000300_developer_profile.sql` | New `developer_profile` + `developer_branch_map` tables |
| `src/lib/developers/types.ts` | Shared types: `DeveloperProfile`, `DeveloperSnapshot`, `BranchTicketLink` |
| `src/lib/developers/repository.ts` | DB reads — assembles a `DeveloperSnapshot` per profile |
| `src/lib/developers/branch-ticket-resolver.ts` | Parses branch names → Linear identifier ("RA-3013", "CCW-160") and links to `integration_linear_issues` |
| `src/lib/developers/activity-aggregator.ts` | Rolls commit history into a 14-day sparkline + per-repo breakdown |
| `src/app/api/empire/developers/route.ts` | Unified read endpoint returning all `DeveloperSnapshot`s |
| `src/app/api/empire/developers/[email]/route.ts` | Single-developer drilldown |
| `src/app/empire/developers/page.tsx` | List view — every developer card |
| `src/app/empire/developers/[email]/page.tsx` | Drilldown page — full activity + PR queue + branch/ticket map |
| `src/components/empire/DeveloperCard.tsx` | Card showing name, avatar, 14-day sparkline, today's commits, open PRs, last push relative |
| `src/components/empire/ActivitySparkline.tsx` | Recharts area mini-chart, 14-day rolling commit count |
| `src/components/empire/BranchTicketMatrix.tsx` | Table mapping branch → repo → linked Linear ticket → CI state |
| `src/components/empire/StaleBranchAlert.tsx` | Red banner when branches haven't been pushed in >7 days |
| `src/components/empire/EmpireSidebar.tsx` | MODIFY: add "Developers" link |
| `tests/developers/branch-ticket-resolver.spec.ts` | Unit test for the regex matcher |
| `tests/developers/activity-aggregator.spec.ts` | Unit test for the rolling-window aggregator |
| `tests/developers/integration.spec.ts` | E2E test seeding fixture rows + asserting endpoint shape |
| `scripts/seed-developer-profiles.ts` | One-shot to seed Rana's profile (run once, then never again) |

---

## Task Decomposition

### Task 1: developer_profile schema

**Files:**
- Create: `supabase/migrations/20260513000300_developer_profile.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260513000300_developer_profile.sql
-- One row per human contractor or staff developer. Joins commits across
-- repos to a single person even when their git author email differs.

BEGIN;

CREATE TABLE IF NOT EXISTS public.developer_profile (
  id BIGSERIAL PRIMARY KEY,
  display_name TEXT NOT NULL,                  -- 'Rana Muzamil'
  primary_email CITEXT NOT NULL UNIQUE,        -- 'ranamuzamil1199@gmail.com'
  git_author_emails CITEXT[] NOT NULL DEFAULT '{}',  -- alternate emails
  github_login TEXT,                           -- 'rana-muzamil'
  linear_user_id TEXT REFERENCES public.integration_linear_teams(id) DEFERRABLE,
  onepassword_vault TEXT,                      -- e.g. 'Developers'
  role TEXT,                                   -- 'contract-engineer' | 'staff' | 'fractional'
  hourly_rate_aud NUMERIC(8,2),
  weekly_capacity_hours INT,
  country TEXT,                                -- ISO 3166 country code
  timezone TEXT,                               -- IANA, e.g. 'Asia/Karachi'
  hired_at DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- citext extension if not present
CREATE EXTENSION IF NOT EXISTS citext;

CREATE INDEX IF NOT EXISTS idx_dev_profile_active ON public.developer_profile(active) WHERE active = true;

-- Branch ↔ Ticket map: derived from commit messages + branch names
CREATE TABLE IF NOT EXISTS public.developer_branch_map (
  repo TEXT NOT NULL,                          -- 'CleanExpo/RestoreAssist'
  branch TEXT NOT NULL,
  linear_issue_id TEXT REFERENCES public.integration_linear_issues(id) ON DELETE SET NULL,
  developer_email CITEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (repo, branch)
);

CREATE INDEX IF NOT EXISTS idx_branch_map_developer ON public.developer_branch_map(developer_email);

-- RLS
ALTER TABLE public.developer_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_branch_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_read ON public.developer_profile FOR SELECT TO authenticated USING (
  (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin'
);
CREATE POLICY admin_write ON public.developer_profile FOR ALL TO authenticated
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin');

CREATE POLICY admin_all ON public.developer_branch_map FOR ALL TO authenticated
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin');

COMMIT;
```

- [ ] **Step 2: Apply via MCP**

`apply_migration` with `name=developer_profile`.

- [ ] **Step 3: Verify**

```sql
SELECT table_name, (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename=t.table_name) AS policies
FROM information_schema.tables t
WHERE table_schema='public' AND table_name IN ('developer_profile', 'developer_branch_map');
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260513000300_developer_profile.sql
git commit -m "feat(developers): developer_profile + branch_map schema"
```

---

### Task 2: Seed Rana's profile

**Files:**
- Create: `scripts/seed-developer-profiles.ts`

- [ ] **Step 1: Write the seed**

```typescript
// scripts/seed-developer-profiles.ts
// Run with: npx tsx scripts/seed-developer-profiles.ts
// Idempotent — uses upsert on primary_email.

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const profiles = [
    {
      display_name: "Rana Muzamil",
      primary_email: "ranamuzamil1199@gmail.com",
      git_author_emails: ["ranamuzamil1199@gmail.com"],
      github_login: "rana-muzamil",       // confirm via gh api users/rana-muzamil — adjust if wrong
      onepassword_vault: "Developers",
      role: "contract-engineer",
      country: "PK",
      timezone: "Asia/Karachi",
      hired_at: "2025-11-01",             // approximate — fix when 1Password tracks the start date
      active: true,
      notes: "Pakistan-based; primary repos: CCW-CRM (712 commits), CARSI (18 commits)",
    },
  ];

  for (const p of profiles) {
    const { error } = await sb.from("developer_profile").upsert(p, { onConflict: "primary_email" });
    if (error) {
      console.error(`upsert ${p.primary_email} failed:`, error);
      process.exit(1);
    }
    console.log(`✓ ${p.display_name} (${p.primary_email})`);
  }
}

main();
```

- [ ] **Step 2: Run**

```bash
NEXT_PUBLIC_SUPABASE_URL=$(op item get UNITE_GROUP_SUPABASE_URL --vault Unite-Group-Infrastructure --reveal --field credential) \
SUPABASE_SERVICE_ROLE_KEY=$(op item get UNITE_GROUP_SUPABASE_SERVICE_KEY --vault Unite-Group-Infrastructure --reveal --field credential) \
npx tsx scripts/seed-developer-profiles.ts
```

Expected: `✓ Rana Muzamil (ranamuzamil1199@gmail.com)`.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-developer-profiles.ts
git commit -m "chore(developers): seed Rana Muzamil profile"
```

---

### Task 3: Shared types

**Files:**
- Create: `src/lib/developers/types.ts`

- [ ] **Step 1: Write types**

```typescript
// src/lib/developers/types.ts

export interface DeveloperProfile {
  id: number;
  displayName: string;
  primaryEmail: string;
  gitAuthorEmails: string[];
  githubLogin: string | null;
  role: string | null;
  country: string | null;
  timezone: string | null;
  hiredAt: string | null;
  active: boolean;
}

export interface DailyCommitCount {
  date: string;       // 'YYYY-MM-DD' in developer's local TZ
  count: number;
}

export interface DeveloperOpenPR {
  id: string;         // 'CleanExpo/RestoreAssist#946'
  repo: string;
  number: number;
  title: string;
  headRef: string;
  ciState: string | null;
  mergeable: string | null;
  createdAt: string;
  updatedAt: string;
  daysOpen: number;
  linkedLinearIssueId: string | null;
}

export interface BranchTicketLink {
  repo: string;
  branch: string;
  linearIssueId: string | null;
  linearTitle: string | null;
  linearStatus: string | null;
  lastCommitAt: string | null;
  ciState: string | null;
}

export interface DeveloperSnapshot {
  profile: DeveloperProfile;

  // 14-day rolling sparkline
  sparkline: DailyCommitCount[];
  commitsToday: number;
  commitsThisWeek: number;
  commitsThisMonth: number;
  lastPushAt: string | null;
  hoursSinceLastPush: number | null;

  // Per-repo activity
  perRepo: Array<{ repo: string; commits14d: number; lastCommitAt: string | null }>;

  // PR queue
  openPRs: DeveloperOpenPR[];
  prsBlockedOnReview: DeveloperOpenPR[];   // open >2 days, mergeable, no requested changes
  staleBranches: BranchTicketLink[];        // no push in 7+ days

  // Linked tickets
  branchTicketMap: BranchTicketLink[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/developers/types.ts
git commit -m "feat(developers): shared types module"
```

---

### Task 4: Branch ↔ Linear ticket resolver

**Files:**
- Create: `src/lib/developers/branch-ticket-resolver.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/developers/branch-ticket-resolver.spec.ts
import { describe, it, expect } from "vitest";
import { extractLinearKey } from "@/lib/developers/branch-ticket-resolver";

describe("extractLinearKey", () => {
  it("pulls RA-3013 from feat/ra-3013-turnstile", () => {
    expect(extractLinearKey("feat/ra-3013-turnstile")).toBe("RA-3013");
  });
  it("pulls CCW-160 from fix/ccw-160-prisma-alembic", () => {
    expect(extractLinearKey("fix/ccw-160-prisma-alembic")).toBe("CCW-160");
  });
  it("pulls UNI-42 from uni-42-onboarding-start", () => {
    expect(extractLinearKey("uni-42-onboarding-start")).toBe("UNI-42");
  });
  it("returns null for unrelated branch names", () => {
    expect(extractLinearKey("main")).toBeNull();
    expect(extractLinearKey("feat/new-button")).toBeNull();
    expect(extractLinearKey("hotfix")).toBeNull();
  });
  it("handles uppercased input", () => {
    expect(extractLinearKey("feat/RA-3013-turnstile")).toBe("RA-3013");
  });
  it("ignores numbers that aren't preceded by 2-4 letter prefix", () => {
    expect(extractLinearKey("feat/123-something")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test (should fail)**

```bash
npm test tests/developers/branch-ticket-resolver.spec.ts
```
Expected: 6 failures, all "extractLinearKey is not a function".

- [ ] **Step 3: Write the resolver**

```typescript
// src/lib/developers/branch-ticket-resolver.ts
import { getAdminClient } from "@/lib/supabase/admin";

// Linear identifiers: 2-4 letters, hyphen, 1-5 digits.
const LINEAR_KEY = /\b([A-Z]{2,4})-(\d{1,5})\b/i;

export function extractLinearKey(branch: string): string | null {
  const match = branch.match(LINEAR_KEY);
  if (!match) return null;
  return `${match[1].toUpperCase()}-${match[2]}`;
}

export async function resolveBranchesToTickets(
  branches: Array<{ repo: string; branch: string; developerEmail: string; lastCommitAt: string | null }>
): Promise<void> {
  const sb = getAdminClient();
  const rows = branches
    .map((b) => ({
      repo: b.repo,
      branch: b.branch,
      linear_issue_id: extractLinearKey(b.branch),
      developer_email: b.developerEmail,
      last_seen_at: b.lastCommitAt ?? new Date().toISOString(),
    }))
    .filter((r) => r.linear_issue_id || r.branch !== "main");

  if (rows.length === 0) return;
  await sb.from("developer_branch_map").upsert(rows, { onConflict: "repo,branch" });
}
```

- [ ] **Step 4: Run test (should pass)**

```bash
npm test tests/developers/branch-ticket-resolver.spec.ts
```
Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/developers/branch-ticket-resolver.ts tests/developers/branch-ticket-resolver.spec.ts
git commit -m "feat(developers): branch → Linear ticket resolver"
```

---

### Task 5: 14-day commit aggregator

**Files:**
- Create: `src/lib/developers/activity-aggregator.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/developers/activity-aggregator.spec.ts
import { describe, it, expect } from "vitest";
import { aggregateRollingWindow } from "@/lib/developers/activity-aggregator";

describe("aggregateRollingWindow", () => {
  it("rolls per-commit timestamps into per-day counts in IST", () => {
    const commits = [
      { committed_at: "2026-05-12T07:00:00Z" }, // 2026-05-12 in Asia/Karachi (UTC+5)
      { committed_at: "2026-05-12T20:00:00Z" }, // 2026-05-13 in Asia/Karachi
      { committed_at: "2026-05-11T05:00:00Z" }, // 2026-05-11
    ];
    const result = aggregateRollingWindow(commits, "Asia/Karachi", 14, new Date("2026-05-13T00:00:00Z"));
    const map = Object.fromEntries(result.map((r) => [r.date, r.count]));
    expect(map["2026-05-11"]).toBe(1);
    expect(map["2026-05-12"]).toBe(1);
    expect(map["2026-05-13"]).toBe(1);
  });

  it("returns exactly N days with zero-fill", () => {
    const result = aggregateRollingWindow([], "UTC", 14, new Date("2026-05-13T00:00:00Z"));
    expect(result).toHaveLength(14);
    expect(result.every((r) => r.count === 0)).toBe(true);
  });

  it("the returned array is in ascending date order", () => {
    const result = aggregateRollingWindow([], "UTC", 5, new Date("2026-05-13T00:00:00Z"));
    expect(result.map((r) => r.date)).toEqual([
      "2026-05-09", "2026-05-10", "2026-05-11", "2026-05-12", "2026-05-13",
    ]);
  });
});
```

- [ ] **Step 2: Run test (fail)**

```bash
npm test tests/developers/activity-aggregator.spec.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/lib/developers/activity-aggregator.ts
import type { DailyCommitCount } from "./types";

export function aggregateRollingWindow(
  commits: Array<{ committed_at: string }>,
  timezone: string,
  windowDays: number,
  now: Date = new Date()
): DailyCommitCount[] {
  // Pre-fill window with zero days in dev's local TZ
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });

  const out: DailyCommitCount[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    out.push({ date: fmt.format(d), count: 0 });
  }
  const idx = new Map(out.map((r, i) => [r.date, i]));

  for (const c of commits) {
    const d = fmt.format(new Date(c.committed_at));
    const i = idx.get(d);
    if (i !== undefined) out[i].count++;
  }
  return out;
}

export function sumOverDays(counts: DailyCommitCount[], days: number): number {
  return counts.slice(-days).reduce((acc, r) => acc + r.count, 0);
}
```

- [ ] **Step 4: Run test (pass)**

```bash
npm test tests/developers/activity-aggregator.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/developers/activity-aggregator.ts tests/developers/activity-aggregator.spec.ts
git commit -m "feat(developers): 14-day commit aggregator"
```

---

### Task 6: Repository — assemble a DeveloperSnapshot per profile

**Files:**
- Create: `src/lib/developers/repository.ts`

- [ ] **Step 1: Implement**

```typescript
// src/lib/developers/repository.ts
import { getAdminClient } from "@/lib/supabase/admin";
import type { DeveloperProfile, DeveloperSnapshot, DeveloperOpenPR, BranchTicketLink } from "./types";
import { aggregateRollingWindow, sumOverDays } from "./activity-aggregator";
import { extractLinearKey } from "./branch-ticket-resolver";

export async function listDevelopers(): Promise<DeveloperProfile[]> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("developer_profile").select("*").eq("active", true)
    .order("display_name");
  if (error) throw error;
  return (data ?? []).map(rowToProfile);
}

export async function getDeveloperByEmail(email: string): Promise<DeveloperProfile | null> {
  const sb = getAdminClient();
  const { data } = await sb
    .from("developer_profile").select("*").eq("primary_email", email).maybeSingle();
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

export async function buildSnapshot(profile: DeveloperProfile): Promise<DeveloperSnapshot> {
  const sb = getAdminClient();
  const emails = profile.gitAuthorEmails.length ? profile.gitAuthorEmails : [profile.primaryEmail];

  // commits, last 30 days, all repos
  const { data: commits = [] } = await sb
    .from("integration_github_commits")
    .select("sha, repo, author_email, committed_at, branch")
    .in("author_email", emails)
    .gte("committed_at", new Date(Date.now() - 30 * 86400_000).toISOString())
    .order("committed_at", { ascending: false });

  // open PRs
  const { data: prs = [] } = await sb
    .from("integration_github_prs")
    .select("id, repo, number, title, author_email, head_ref, ci_state, mergeable, created_at, updated_at")
    .eq("state", "open")
    .in("author_email", emails);

  // branch → ticket map (already maintained by sync)
  const { data: branchMap = [] } = await sb
    .from("developer_branch_map")
    .select("repo, branch, linear_issue_id, last_seen_at")
    .eq("developer_email", profile.primaryEmail);

  // pull joined Linear data for the linked tickets
  const ticketIds = branchMap.map((b) => b.linear_issue_id).filter((id): id is string => !!id);
  const { data: linearIssues = [] } = ticketIds.length
    ? await sb
        .from("integration_linear_issues")
        .select("id, title, state_name, state_type")
        .in("id", ticketIds)
    : { data: [] };
  const linearById = new Map(linearIssues.map((i) => [i.id, i]));

  // sparkline
  const tz = profile.timezone ?? "UTC";
  const sparkline = aggregateRollingWindow(commits, tz, 14);
  const commitsToday = sumOverDays(sparkline, 1);
  const commitsThisWeek = sumOverDays(sparkline, 7);
  const commitsThisMonth = commits.length;

  // per repo
  const perRepoMap = new Map<string, { commits14d: number; lastCommitAt: string | null }>();
  for (const c of commits) {
    const slot = perRepoMap.get(c.repo) ?? { commits14d: 0, lastCommitAt: null };
    slot.commits14d++;
    if (!slot.lastCommitAt || c.committed_at > slot.lastCommitAt) slot.lastCommitAt = c.committed_at;
    perRepoMap.set(c.repo, slot);
  }
  const perRepo = [...perRepoMap.entries()].map(([repo, v]) => ({ repo, ...v }));

  const lastPushAt = commits[0]?.committed_at ?? null;
  const hoursSinceLastPush = lastPushAt
    ? Math.round((Date.now() - new Date(lastPushAt).getTime()) / 3600_000)
    : null;

  // map PRs
  const openPRs: DeveloperOpenPR[] = prs.map((pr) => {
    const daysOpen = Math.round((Date.now() - new Date(pr.created_at).getTime()) / 86400_000);
    return {
      id: pr.id,
      repo: pr.repo,
      number: pr.number,
      title: pr.title,
      headRef: pr.head_ref,
      ciState: pr.ci_state,
      mergeable: pr.mergeable,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      daysOpen,
      linkedLinearIssueId: extractLinearKey(pr.head_ref ?? ""),
    };
  });

  const prsBlockedOnReview = openPRs.filter(
    (pr) => pr.daysOpen >= 2 && pr.mergeable === "MERGEABLE" && pr.ciState === "success"
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/developers/repository.ts
git commit -m "feat(developers): repository.buildSnapshot — joins commits/PRs/branches/Linear"
```

---

### Task 7: API endpoints

**Files:**
- Create: `src/app/api/empire/developers/route.ts`
- Create: `src/app/api/empire/developers/[email]/route.ts`

- [ ] **Step 1: List endpoint**

```typescript
// src/app/api/empire/developers/route.ts
import { NextResponse } from "next/server";
import { listDevelopers, buildSnapshot } from "@/lib/developers/repository";
import { verifyAdminJwt } from "@/lib/auth/admin-jwt";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = req.headers.get("x-admin-token");
  const claims = auth ? await verifyAdminJwt(auth) : null;
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profiles = await listDevelopers();
  const snapshots = await Promise.all(profiles.map((p) => buildSnapshot(p)));
  return NextResponse.json({ developers: snapshots });
}
```

- [ ] **Step 2: Single-developer endpoint**

```typescript
// src/app/api/empire/developers/[email]/route.ts
import { NextResponse } from "next/server";
import { getDeveloperByEmail, buildSnapshot } from "@/lib/developers/repository";
import { verifyAdminJwt } from "@/lib/auth/admin-jwt";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ email: string }> }) {
  const auth = req.headers.get("x-admin-token");
  const claims = auth ? await verifyAdminJwt(auth) : null;
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await params;
  const profile = await getDeveloperByEmail(decodeURIComponent(email));
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ developer: await buildSnapshot(profile) });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/empire/developers/
git commit -m "feat(developers): API endpoints (list + drilldown)"
```

---

### Task 8: ActivitySparkline component

**Files:**
- Create: `src/components/empire/ActivitySparkline.tsx`

- [ ] **Step 1: Implement**

```typescript
// src/components/empire/ActivitySparkline.tsx
"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import type { DailyCommitCount } from "@/lib/developers/types";

export function ActivitySparkline({ data }: { data: DailyCommitCount[] }) {
  return (
    <div className="h-16 w-full">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b30000" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#b30000" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <Tooltip
            contentStyle={{ background: "#0e1014", border: "1px solid #2a2d33", fontSize: 12 }}
            labelStyle={{ color: "#fff" }}
          />
          <Area type="monotone" dataKey="count" stroke="#b30000" fill="url(#sparkFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit (recharts already in package.json from the dashboard build)**

```bash
git add src/components/empire/ActivitySparkline.tsx
git commit -m "feat(developers): ActivitySparkline component"
```

---

### Task 9: DeveloperCard component

**Files:**
- Create: `src/components/empire/DeveloperCard.tsx`

- [ ] **Step 1: Implement**

```typescript
// src/components/empire/DeveloperCard.tsx
import Link from "next/link";
import { ActivitySparkline } from "./ActivitySparkline";
import type { DeveloperSnapshot } from "@/lib/developers/types";

export function DeveloperCard({ snapshot }: { snapshot: DeveloperSnapshot }) {
  const { profile, sparkline, commitsToday, commitsThisWeek, openPRs, hoursSinceLastPush, prsBlockedOnReview, staleBranches } = snapshot;
  const stale = hoursSinceLastPush !== null && hoursSinceLastPush > 24 * 3;
  return (
    <Link href={`/empire/developers/${encodeURIComponent(profile.primaryEmail)}`} className="block">
      <article className="border border-gunmetal-700 rounded-lg p-4 hover:bg-gunmetal-800 transition">
        <header className="flex items-baseline justify-between">
          <h3 className="text-base font-semibold">{profile.displayName}</h3>
          <span className="text-xs text-gray-400">
            {profile.role} · {profile.country} · {profile.timezone}
          </span>
        </header>

        <div className="mt-3">
          <ActivitySparkline data={sparkline} />
        </div>

        <dl className="mt-3 grid grid-cols-4 gap-3 text-sm">
          <Stat label="Today" value={commitsToday} />
          <Stat label="7d" value={commitsThisWeek} />
          <Stat label="Open PRs" value={openPRs.length} />
          <Stat
            label="Hrs since push"
            value={hoursSinceLastPush ?? "—"}
            highlight={stale ? "text-candy-red" : undefined}
          />
        </dl>

        {(prsBlockedOnReview.length > 0 || staleBranches.length > 0) && (
          <div className="mt-3 flex gap-2 text-xs">
            {prsBlockedOnReview.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-200">
                {prsBlockedOnReview.length} blocked on review
              </span>
            )}
            {staleBranches.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-red-900/40 text-red-200">
                {staleBranches.length} stale branches
              </span>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className={`font-mono text-base ${highlight ?? ""}`}>{value}</dd>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/empire/DeveloperCard.tsx
git commit -m "feat(developers): DeveloperCard list-view tile"
```

---

### Task 10: BranchTicketMatrix + StaleBranchAlert

**Files:**
- Create: `src/components/empire/BranchTicketMatrix.tsx`
- Create: `src/components/empire/StaleBranchAlert.tsx`

- [ ] **Step 1: BranchTicketMatrix**

```typescript
// src/components/empire/BranchTicketMatrix.tsx
import type { BranchTicketLink } from "@/lib/developers/types";

export function BranchTicketMatrix({ rows }: { rows: BranchTicketLink[] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">No active branches.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-gray-400 text-xs uppercase">
        <tr>
          <th className="py-2">Repo</th><th>Branch</th><th>Linear</th><th>Status</th><th>Last Commit</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.repo}@${r.branch}`} className="border-t border-gunmetal-800">
            <td className="py-2 font-mono text-xs">{r.repo.split("/")[1]}</td>
            <td className="font-mono text-xs">{r.branch}</td>
            <td>
              {r.linearIssueId ? (
                <a className="text-candy-red hover:underline" href={`https://linear.app/unite-group/issue/${r.linearIssueId}`} target="_blank" rel="noreferrer">
                  {r.linearIssueId}
                </a>
              ) : <span className="text-gray-500">—</span>}
            </td>
            <td>{r.linearStatus ?? "—"}</td>
            <td className="text-xs text-gray-300">{r.lastCommitAt ? new Date(r.lastCommitAt).toLocaleString() : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: StaleBranchAlert**

```typescript
// src/components/empire/StaleBranchAlert.tsx
import type { BranchTicketLink } from "@/lib/developers/types";

export function StaleBranchAlert({ branches }: { branches: BranchTicketLink[] }) {
  if (branches.length === 0) return null;
  return (
    <aside className="border border-red-700 bg-red-950/40 text-red-100 p-3 rounded">
      <h4 className="font-semibold text-sm">{branches.length} stale branch{branches.length === 1 ? "" : "es"} (no push in 7+ days)</h4>
      <ul className="mt-2 text-xs space-y-1">
        {branches.slice(0, 5).map((b) => (
          <li key={`${b.repo}@${b.branch}`} className="font-mono">
            {b.repo.split("/")[1]} · {b.branch} · last {b.lastCommitAt ? new Date(b.lastCommitAt).toLocaleDateString() : "—"}
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/empire/BranchTicketMatrix.tsx src/components/empire/StaleBranchAlert.tsx
git commit -m "feat(developers): BranchTicketMatrix + StaleBranchAlert"
```

---

### Task 11: List page

**Files:**
- Create: `src/app/empire/developers/page.tsx`

- [ ] **Step 1: Implement**

```typescript
// src/app/empire/developers/page.tsx
import { DeveloperCard } from "@/components/empire/DeveloperCard";
import type { DeveloperSnapshot } from "@/lib/developers/types";

async function fetchAll(): Promise<DeveloperSnapshot[]> {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/empire/developers`, {
    headers: { "x-admin-token": process.env.PI_CEO_API_KEY ?? "" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`developers ${res.status}`);
  const json = await res.json();
  return json.developers;
}

export default async function DevelopersPage() {
  const developers = await fetchAll();
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Developers</h1>
        <p className="text-sm text-gray-400">Activity, PR queue, branch ↔ ticket mapping across the empire.</p>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {developers.map((dev) => (
          <DeveloperCard key={dev.profile.primaryEmail} snapshot={dev} />
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/empire/developers/page.tsx
git commit -m "feat(developers): list page"
```

---

### Task 12: Drilldown page

**Files:**
- Create: `src/app/empire/developers/[email]/page.tsx`

- [ ] **Step 1: Implement**

```typescript
// src/app/empire/developers/[email]/page.tsx
import Link from "next/link";
import { ActivitySparkline } from "@/components/empire/ActivitySparkline";
import { BranchTicketMatrix } from "@/components/empire/BranchTicketMatrix";
import { StaleBranchAlert } from "@/components/empire/StaleBranchAlert";
import type { DeveloperSnapshot } from "@/lib/developers/types";

async function fetchOne(email: string): Promise<DeveloperSnapshot> {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/empire/developers/${encodeURIComponent(email)}`, {
    headers: { "x-admin-token": process.env.PI_CEO_API_KEY ?? "" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`developer ${res.status}`);
  return (await res.json()).developer;
}

export default async function DeveloperDrilldown({ params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  const dev = await fetchOne(decodeURIComponent(email));
  const { profile, sparkline, perRepo, openPRs, prsBlockedOnReview, staleBranches, branchTicketMap, commitsThisMonth, hoursSinceLastPush } = dev;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-gray-400">
            {profile.role} · {profile.country} · {profile.timezone} · hired {profile.hiredAt}
          </p>
        </div>
        <Link href="/empire/developers" className="text-sm text-candy-red hover:underline">← All developers</Link>
      </header>

      <StaleBranchAlert branches={staleBranches} />

      <section>
        <h2 className="text-lg font-semibold mb-2">14-day activity</h2>
        <ActivitySparkline data={sparkline} />
        <dl className="mt-3 grid grid-cols-4 gap-3 text-sm">
          <Stat label="Commits/mo" value={commitsThisMonth} />
          <Stat label="Open PRs" value={openPRs.length} />
          <Stat label="Blocked on review" value={prsBlockedOnReview.length} />
          <Stat label="Hrs since push" value={hoursSinceLastPush ?? "—"} />
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Per-repo (last 30 days)</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-400 text-xs uppercase">
            <tr><th className="py-2">Repo</th><th>Commits</th><th>Last commit</th></tr>
          </thead>
          <tbody>
            {perRepo.map((r) => (
              <tr key={r.repo} className="border-t border-gunmetal-800">
                <td className="py-2 font-mono text-xs">{r.repo}</td>
                <td className="font-mono">{r.commits14d}</td>
                <td className="text-xs text-gray-300">{r.lastCommitAt ? new Date(r.lastCommitAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Open PRs</h2>
        {openPRs.length === 0 ? (
          <p className="text-sm text-gray-400">None.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-400 text-xs uppercase">
              <tr><th className="py-2">Repo</th><th>#</th><th>Title</th><th>Days open</th><th>CI</th><th>Mergeable</th></tr>
            </thead>
            <tbody>
              {openPRs.map((pr) => (
                <tr key={pr.id} className="border-t border-gunmetal-800">
                  <td className="py-2 font-mono text-xs">{pr.repo.split("/")[1]}</td>
                  <td className="font-mono">{pr.number}</td>
                  <td>{pr.title}</td>
                  <td className="font-mono">{pr.daysOpen}</td>
                  <td className={pr.ciState === "success" ? "text-green-400" : pr.ciState === "failure" ? "text-red-400" : "text-gray-400"}>
                    {pr.ciState ?? "—"}
                  </td>
                  <td>{pr.mergeable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Branch ↔ Ticket map</h2>
        <BranchTicketMatrix rows={branchTicketMap} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="font-mono text-base">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/empire/developers/[email]/page.tsx
git commit -m "feat(developers): drilldown page"
```

---

### Task 13: Sidebar entry

**Files:**
- Modify: `src/components/empire/EmpireSidebar.tsx`

- [ ] **Step 1: Add link**

Find the existing link list in `EmpireSidebar.tsx` (search for `"/empire/integrations"` from Plan 2). Add immediately after:

```tsx
<SidebarLink href="/empire/developers" icon={<DevelopersIcon />}>Developers</SidebarLink>
```

(`DevelopersIcon` — small inline SVG matching existing icon style. No Lucide per design memory.)

- [ ] **Step 2: Commit**

```bash
git add src/components/empire/EmpireSidebar.tsx
git commit -m "feat(empire): sidebar entry for Developers page"
```

---

### Task 14: Branch-map seeding job (one-shot, runs in GitHub sync)

**Files:**
- Modify: `src/lib/integrations/github/sync.ts`

- [ ] **Step 1: Add branch-map upsert to the existing commit sync**

In `syncCommits`, after the upsert of commit rows, group commits by `(repo, branch, author_email)` and call `resolveBranchesToTickets` from the resolver. Pseudocode:

```typescript
import { resolveBranchesToTickets } from "@/lib/developers/branch-ticket-resolver";

// (inside syncCommits, after the existing upsert)
const branches = new Map<string, { repo: string; branch: string; developerEmail: string; lastCommitAt: string }>();
for (const c of commits) {
  if (!c.commit.committer?.date) continue;
  const branch = c.commit.message.includes("Merge ") ? "main" : "main"; // GitHub commits API doesn't expose branch — use prs sync for branch info
  const key = `${repoFq}::${branch}::${c.commit.author?.email ?? ""}`;
  const existing = branches.get(key);
  if (!existing || c.commit.committer.date > existing.lastCommitAt) {
    branches.set(key, { repo: repoFq, branch, developerEmail: c.commit.author?.email ?? "", lastCommitAt: c.commit.committer.date });
  }
}
await resolveBranchesToTickets([...branches.values()]);
```

Note: commit objects don't carry `branch`. The proper source of branch info is the PR sync — use `pr.head.ref`. Fix the implementation to drive branch-map seeding from `syncPRs` instead:

```typescript
// inside syncPRs after the .upsert(rows) call:
const branchRows = prs.map((pr) => ({
  repo: repoFq,
  branch: pr.head.ref,
  developerEmail: pr.user?.email ?? "",       // GitHub doesn't always expose email here
  lastCommitAt: pr.updated_at,
}));
await resolveBranchesToTickets(branchRows);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/integrations/github/sync.ts
git commit -m "feat(developers): seed branch-ticket map from PR sync"
```

---

### Task 15: Integration test — full path

**Files:**
- Create: `tests/developers/integration.spec.ts`

- [ ] **Step 1: Write the test (uses an in-memory Supabase mock)**

```typescript
// tests/developers/integration.spec.ts
import { describe, it, expect, vi } from "vitest";
import { buildSnapshot } from "@/lib/developers/repository";

vi.mock("@/lib/supabase/admin", () => {
  const commits = [
    { sha: "a1", repo: "CleanExpo/CCW-CRM", author_email: "ranamuzamil1199@gmail.com", committed_at: new Date(Date.now() - 1 * 86400_000).toISOString(), branch: "main" },
    { sha: "b2", repo: "CleanExpo/CARSI", author_email: "ranamuzamil1199@gmail.com", committed_at: new Date(Date.now() - 3 * 86400_000).toISOString(), branch: "feat/ccw-160" },
  ];
  const prs = [
    {
      id: "CleanExpo/CCW-CRM#160", repo: "CleanExpo/CCW-CRM", number: 160,
      title: "feat: cin7 sync", author_email: "ranamuzamil1199@gmail.com",
      head_ref: "feat/ccw-160-cin7", ci_state: "success", mergeable: "MERGEABLE",
      created_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  return {
    getAdminClient: () => ({
      from: (t: string) => ({
        select: () => ({
          in: () => ({
            gte: () => ({
              order: () => ({ data: t === "integration_github_commits" ? commits : [], error: null }),
            }),
          }),
        }),
        // catch-alls
      }),
    }),
  };
});

describe("buildSnapshot E2E", () => {
  it("returns a sensible snapshot for Rana", async () => {
    const snapshot = await buildSnapshot({
      id: 1, displayName: "Rana Muzamil", primaryEmail: "ranamuzamil1199@gmail.com",
      gitAuthorEmails: ["ranamuzamil1199@gmail.com"], githubLogin: null,
      role: "contract-engineer", country: "PK", timezone: "Asia/Karachi",
      hiredAt: "2025-11-01", active: true,
    });
    expect(snapshot.profile.displayName).toBe("Rana Muzamil");
    expect(snapshot.sparkline).toHaveLength(14);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/developers/integration.spec.ts
git commit -m "test(developers): E2E snapshot integration"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Per-developer view with sparkline, today/week/month counts, open PRs, branch ↔ Linear map, stale branches
- ✅ Rana is the first profile (and the seed is idempotent for future devs)
- ✅ Reads only from `integration_*` tables — no external API calls at request time
- ✅ Branch-name → Linear key extraction is tested
- ✅ Per-day rollup correctly respects developer timezone (Asia/Karachi for Rana)
- ✅ Drilldown shows the same data + per-repo breakdown + PR queue + ticket map
- ✅ Sidebar entry added
- ✅ One-shot seed script

**2. Placeholder scan:** No "TBD". Every step has real code. The single in-pseudocode comment in Task 14 is replaced with the actual implementation block immediately below it.

**3. Type consistency:** `DeveloperProfile`, `DeveloperSnapshot`, `BranchTicketLink`, `DailyCommitCount` defined in `types.ts` (Task 3) and used identically in repository (Task 6), endpoints (Task 7), and pages (Tasks 11-12). `extractLinearKey` signature same in test (Task 4) and in repository.ts (Task 6).

---

## Execution Notes

- **Hard dependency:** Plan 2 (Integration Mesh) must be applied + at least one full GitHub + Linear sync run completed
- **Tasks 1-2** must run before all others (schema + seed)
- **Tasks 3-6** can run in parallel (types, resolver, aggregator, repository — minimal cross-dependencies)
- **Tasks 7-13** are UI plumbing; need 3-6 done
- **Task 14** is the bridge back to Plan 2 — it modifies the GitHub sync to populate `developer_branch_map`
- **Task 15** is the acceptance test
