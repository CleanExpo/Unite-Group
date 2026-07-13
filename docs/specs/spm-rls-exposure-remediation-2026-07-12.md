# SPM spec — Unite-Group RLS/PostgREST exposure remediation (2026-07-12)

> Decision-grade `/spm` spec. Read-only inputs; authorises no write on its own. Target: the
> **Unite-Group monorepo** (`CleanExpo/Unite-Group`, `D:/Authority-Site`, `origin/main c00fcfd6`) —
> apps `empire` (admin/ops + open signup) + `web` (founder data-plane) — against prod Supabase
> **`lksfwktwtmyznckodsau`**. **Supersedes the mis-targeted "Unite-Hub" spec** (that repo is dead;
> nothing uses it). True founder = **`contact@unite-group.in`** (id `70608186-a487-4efb-ae8a-71bd0dbfa151`).
> Tier **T3**. leveling_version 1.0, board_version 1.0.

---

## 1 Task

Close a **live PostgREST data-exposure** on prod `lksfwktwtmyznckodsau`: any internet caller reads
operational config (`kill_switch_flags`, `rbac_permissions`, `feature_flags`) and pricing anonymously,
and any self-minted account reads the full internal wiki + the **1Password and Vercel-env secret-index
catalogs**. Fix = **reverse the 2026-06-27 b5-RLS deferral** (exposure-driven REVOKE + service_role
lock + default-privileges revoke), **close open signup**, and **remove the one browser-side sensitive
read** in `apps/empire`. All prod DDL is founder-gated (manual SQL-editor apply, never `db push`).

## 2 Project context

- **Product.** Unite-Group monorepo. `apps/empire` = admin/command-centre (admin-JWT + MFA, `require-admin.ts`
  allow-list) **and the open marketing signup**; `apps/web` = founder data-plane (CRM/vault/memory).
  Both bind the browser to prod `lksfwktwtmyznckodsau` via `createBrowserClient` with the public
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`apps/{web,empire}/src/lib/supabase/client.ts`).
- **Prod.** `lksfwktwtmyznckodsau` ("Unite-Group"): 1,763 public tables (722 foreign-product co-tenant,
  1,692 empty). DDL is **manual + founder-gated** — CI applies nothing; `supabase db push` is **unsafe**
  (57 local-only vs 95 prod-only migration drift over the shared DB). Repo pattern: idempotent
  transaction-wrapped SQL under `docs/specs/sql/`, applied via the prod SQL editor / `supabase db query
  --linked` (from `apps/web`), then `supabase migration repair … --status applied --linked`.
- **Founder.** `contact@unite-group.in` (owns 7 businesses + 1,901 crm_contacts + 12 credentials_vault
  rows; last sign-in 2026-07-07). `support@synthex.social` (this session's login) has **never signed in
  and owns nothing** — it is NOT the founder.
- **Prior art.** `docs/specs/sql/2026-06-27-b5-rls-remediation.sql` already found "340 always-true
  policies" and **knowingly deferred 331** on config/integration tables as "acceptable for a
  single-founder app" — and ships the classification query + a `service_role`-lock template. This spec
  **reverses that deferral** (premise now false); it is completing a known-deferred fix, not net-new.

## 3 Problem statement (research-verified live)

1. **P0-A — anonymous + any-authenticated read of config/secret-index/wiki (LIVE).** Live enumeration:
   **1,330** public tables are anon-reachable and **1,614** reachable by any authenticated JWT via
   permissive policies (110 always-true). With **no login**, the anon role reads `kill_switch_flags`(15),
   `rbac_permissions`(22), `feature_flags`(15), `synthex_plans`(3) via `USING(tenant_id IS NULL …)` /
   `is_active=true` `{public}` policies — leaking the operational control + authorization model. With any
   self-minted JWT: `wiki_pages`(620), `integration_onepassword_index`(174), `integration_vercel_env_index`(1,165)
   via `authenticated USING(true)` — the **map of where every credential lives**. All 1,763 tables hold
   anon+authenticated SELECT grants; `pg_default_acl` re-grants ALL privileges to anon/authenticated on
   **every new table**. Reachable directly at `…lksfwktwtmyznckodsau.supabase.co/rest/v1/<table>` — the
   apps merely publish the key.
2. **P0-B — open account issuance keeps the authenticated surface reachable.** `apps/empire`
   `POST /api/auth/register` is deliberate self-service signup (`admin.createUser`, role `'user'`,
   rate-limited only — no allow-list/invite), and Supabase Google/email signup is open. 3 non-founder
   accounts already exist (`support@synthex.social`, `phill.mcgurk@gmail.com`, `duncan@homeloanessentials.com.au`).
   They cannot become admin (role `'user'` ≠ the `require-admin` allow-list), but each **can read the
   P0-A config/secret-index/wiki tables**.
3. **Code-layer gap (empire).** `apps/empire/src/app/wiki/page.tsx` is a `'use client'` component that
   reads `wiki_pages` in the **browser** with the anon client (`:111-118`) — the exposed read shipped as
   a product path; it must move server-side once the RLS is locked.
4. **P1 — empire `/api` authz is by-convention.** `apps/empire/src/middleware.ts:31-35` skips `/api`, so
   route auth is per-route self-gating; **47 of 123** routes don't import `requireAdmin` (some
   intentionally public: register/login/webhooks/CRON_SECRET-gated cron) — no structural guarantee a new
   privileged route is gated.

**NARROWED from the earlier (mis-targeted) audit — verified false here:** the founder **crown-jewel**
tables (`crm_contacts`, `credentials_vault` [rls_forced], `ai_memories`) enforce `founder_id=auth.uid()`
→ a rogue JWT reads **0** founder rows; `credentials_vault` never returns `encrypted_value`. `web` OAuth
state is **HMAC-signed** (CSRF-safe; replay caveat only). **No** unauthenticated `execFile`/shell route
exists. Founder identity is **correctly pinned** in `require-admin.ts` (`contact@unite-group.in`,
`phill.mcgurk@gmail.com`) and 76/123 empire routes fail closed. So there is **no CRM-destroying eviction
risk** and no unsigned-OAuth / open-exec finding on this product.

## 4 Desired outcome

- No public table is readable by `anon`/`authenticated` via PostgREST except an explicit,
  intentionally-public allow-list; config/secret-index/wiki tables are `service_role`-only (grants
  revoked + permissive policies dropped/replaced), and **default privileges are revoked** so new tables
  inherit nothing.
- Account issuance is **closed** (empire `/api/auth/register` allow-listed/disabled; Supabase open signup
  off; leaked-password on); the 3 non-founder accounts are **reconciled** (evict after founder confirms
  none is needed — all own 0 businesses).
- The empire wiki read is **server-side**; a coverage gate proves every privileged empire `/api` route is
  authenticated.
- Every prod change lands through the repo's **manual founder-gated SQL runbook** (`docs/specs/sql/`),
  proven by a live before/after role-sim — never `db push`, never CI.

## 5 Scope

### IN (release-blocking — this run)
- **WS1** Exposure-driven REVOKE + `service_role` lock + `ALTER DEFAULT PRIVILEGES` revoke (author the
  idempotent SQL runbook; APPLY founder-gated). Reverses the b5 deferral.
- **WS2** Close open signup + reconcile the 3 non-founder accounts (empire code + Supabase config +
  founder-gated eviction).
- **WS3** Move the `apps/empire` browser `wiki_pages` read server-side + empire `/api` auth-coverage gate.

### OUT (separate owner-gated program)
- **WS-GOV** The 722 foreign-product tables (`synthex_`/`guardian_`/`convex_`) + 1,692 empty tables +
  the 57/95 migration-drift reconcile — a governance/cleanup program (its own runbook already exists at
  `docs/convergence/`), not exposure-closing. `web` OAuth nonce/expiry is a defense-in-depth nice-to-have.

## 6 Existing capability review

| Capability | Exists as | Gap |
|---|---|---|
| RLS-remediation pattern | `docs/specs/sql/2026-06-27-b5-rls-remediation.sql` (classification query + service_role-lock template) | 331 policies **deferred** on a now-false premise → WS1 reverses it, reusing the template |
| Founder allow-list | `apps/empire/src/lib/security/require-admin.ts` (fails closed) | Correct — do not touch; reference for WS2 |
| Manual apply runbook | `docs/convergence/prod-migration-reconcile-runbook.md` (do-not-push + `migration repair`) | The apply path WS1 must follow |
| Crown-jewel RLS | `founder_id=auth.uid()` on crm/vault/memory | Correct — must stay green through WS1 (non-regression) |
| Server-side vault read | `apps/web/.../api/vault/entries` (getUser + founder_id, metadata-only) | The correct pattern WS3 mirrors for the empire wiki read |

## 7 Specialist board receipt

- **Tier T3.** Axes F2 I2 N1 X2 S2. Re-scope research (`wf_826c4783-273`, 3 read-only areas) **live-verified
  every load-bearing claim** and CORRECTED the prior mis-targeted audit (crown jewels scoped, founder
  correct, OAuth signed, exposure = config/index/wiki not CRM, b5 deferral to reverse). It served the
  adversarial/verification role for the re-scope.
- **Prior deliberations (still applicable to the DB-fix shape):** 5-seat MOA bench `wf_3e603db7-4de`
  (68/100 REDUCE-SCOPE) + 3-lens adversary `wf_7a08d0e0-20a` — their must_fixes (exposure-driven not
  literal-`true`; default-privileges revoke; authenticated-JWT verification; two-gate REVOKE+policy-drop;
  founder-reconcile-before-evict) are folded into §9/§13/§15.
- **No new bench convened for the re-scope** (reported T0/inline for the bench step) — the research is the
  fresh verification and it live-refuted the overclaims; re-running the bench would beat nothing. Honest
  receipt: this spec's evidence is first-source (repo files + live SQL), not simulated seats.

## 8 Judge challenge (inline, folded)

- **Reverse-don't-relitigate:** the exposure is already conceded by b5; ship the reversal, don't
  re-argue it. **Narrow correctly:** don't REVOKE the founder-scoped crown-jewel tables (they're
  correct) — only the config/index/wiki/global set. **Reader-proof before REVOKE:** the exposed set is
  read by server/service-role + the empire browser page (WS3) — no other client reader; prove per table.
  **Issuance-first:** closing signup is the fast non-DDL win. **Founder-safety:** all 3 non-founder
  accounts own 0 rows, but confirm with the founder before eviction (esp. `phill.mcgurk@gmail.com` — the
  human operator). **Apply-safety:** manual SQL-editor + `migration repair`, never `db push`.

## 9 Proposed solution (workstreams)

**WS1 — BUILD `docs/specs/sql/2026-07-12-rls-exposure-lock.sql`; APPLY founder-gated.** Idempotent,
transaction-wrapped (mirrors b5's convention):
- **Dynamically enumerate** the exposed set (rolled-back role-sim of `anon` + a synthetic `authenticated`
  JWT across all public tables → the 1,330 anon-reachable + 1,614 authenticated-reachable), classify each
  reader (service-role/server vs browser — proven from code), and EXCLUDE the correctly-scoped
  crown-jewel tables + a confirmed intentionally-public allow-list.
- For every exposed config/global/integration/index/wiki table with no legitimate client reader:
  `REVOKE ALL ON <t> FROM anon, authenticated` **AND** `DROP POLICY IF EXISTS` the permissive
  `USING(true)`/`tenant_id IS NULL`/`is_active` policies (two gates), each behind `to_regclass(...) IS
  NOT NULL`. `synthex_plans`/other genuinely-public tables: keep an explicit narrow read policy.
- **`ALTER DEFAULT PRIVILEGES FOR ROLE postgres, supabase_admin IN SCHEMA public REVOKE ALL ON TABLES,
  FUNCTIONS, SEQUENCES FROM anon, authenticated`** (kills the `pg_default_acl` re-grant).
- Paired **down-SQL** restoring prior grants/policies. Apply via prod SQL editor / `supabase db query
  --linked` + `migration repair --status applied`; **never `db push`**.

**WS2 — BUILD (empire code) + founder config.** Restrict `apps/empire/src/app/api/auth/register/route.ts`
to an allow-list/invite (or disable self-service); set Supabase Auth to no-open-signup + leaked-password
protection (founder dashboard); pin `FOUNDER_USER_ID=70608186-a487-4efb-ae8a-71bd0dbfa151`. Reconcile the
3 non-founder `auth.users` — founder confirms none is needed (all own 0 businesses; keep
`phill.mcgurk@gmail.com` if it's the operator) — then evict the rest + invalidate their sessions.

**WS3 — BUILD (empire code).** Replace the browser `wiki_pages` read in `apps/empire/src/app/wiki/page.tsx`
with a server component / `requireAdmin`-gated API route (mirror `apps/web/.../api/vault/entries`), so the
page works after WS1 locks the table. Add a CI grep asserting every `apps/empire/src/app/api/**/route.ts`
imports an auth gate (`requireAdmin`/`checkAdminToken`/`CRON_SECRET`) or is on an explicit public allow-list.

## 10 UX

Infra/security-facing. Founder: one SQL-editor apply session (WS1, transaction-wrapped, ~15 min after
review) + Supabase Auth toggles + account reconcile (WS2). Developer: the empire wiki page keeps working
(server read); a failing CI grep names any unauthenticated empire API route. End users unaffected (the
CRM/vault crown jewels were never exposed and stay scoped).

## 11 Technical design

- **REVOKE SQL (WS1):** per-table `REVOKE ALL … FROM anon, authenticated` + `DROP POLICY IF EXISTS`,
  `to_regclass` guards, idempotent; the enumeration query is b5's Section-2 classification query,
  inverted from "defer" to "lock". Transaction-wrapped; project ref asserted (`SELECT current_database()`)
  before mutation.
- **Signup close (WS2):** allow-list check in the register route before `createUser`; Supabase Auth config
  is a founder dashboard action (no MCP tool).
- **Empire wiki (WS3):** new `apps/empire/src/app/api/wiki/route.ts` (`requireAdmin`) returning the list;
  `wiki/page.tsx` fetches it server-side / via the gated API instead of `supabaseClient.from('wiki_pages')`.
- **Project pin:** every SQL step hard-codes `lksfwktwtmyznckodsau` + asserts the ref (a wrong-project
  write happened historically on this estate).

## 12 Security

- **Two gates** on the exposed set (grant-revoke + policy-drop) + **default-privileges revoke** so the
  fix can't regress on the next table. `service_role` (server) retains access — the app's server/service
  readers keep working.
- **Issuance close (WS2)** removes the authenticated-JWT vector for the config/index/wiki tables.
- **Do NOT touch** the founder-scoped crown-jewel policies, `require-admin.ts`, the vault, the signed web
  OAuth, or the service-role clients (all correct).
- **Founder-safety:** no account is deleted until the founder confirms it's unneeded and it owns 0 rows.

## 13 Verification plan

Sandbox: **one-project-pin** `lksfwktwtmyznckodsau`; **prod = read-only + rolled-back role-sim only** pre-gate;
mutation only in the founder SQL-editor session (transaction, reversible). Proof classes {proven-in-CI} /
{proven-by-rolled-back-role-sim} / {proven-after-founder-gate}.
- **CI, no DB** → the empire `/api` auth-coverage grep; the register allow-list unit test; WS3 server-read
  has no browser `.from('wiki_pages')`.
- **Rolled-back role-sim (prod, pre-gate)** → `BEGIN; SET LOCAL ROLE anon|authenticated (synthetic sub);
  SELECT count(*) FROM <exposed>; ROLLBACK;` — BEFORE returns rows for the exposed set; run the WS1 SQL
  inside the same rolled-back txn and re-select → 0/permission-denied; the founder-scoped crown-jewel
  tables read 0 for the rogue role BOTH before and after (non-regression baseline). Assert the enumerated
  anon-reachable/authenticated-reachable counts drop to the intended-public allow-list size.
- **After founder gate** → re-run `get_advisors(security)` + the role-sim on prod post-apply (the exposed
  set → 401/empty; `contact@unite-group.in` + the server/service readers + the empire wiki page still
  work); a new test table has no anon/authenticated grant (default-privileges proven).
- **Never** `supabase db push`; never assert from the migration ledger alone.

## 14 Loop & stress testing

- Idempotency: re-run the WS1 SQL in the same session → no-op. Durability: create a test table post-apply
  → assert no anon/authenticated grant. Non-regression: founder JWT + service-role readers + the empire
  wiki page + the `web` CRM/vault all green AFTER. Reversibility: the paired down-SQL restores BEFORE.
  Register allow-list: a non-allow-listed signup → 403.

## 15 Acceptance criteria — 100/100 contract

1. **AC-1** WS1 SQL dynamically enumerates the exposed set (role-sim anon + synthetic authenticated), with
   per-table reader proven; the founder-scoped crown-jewel tables + a confirmed public allow-list are
   EXCLUDED.
2. **AC-2** For every exposed table: `REVOKE ALL FROM anon, authenticated` **and** `DROP POLICY IF EXISTS`
   the permissive policy (two gates), idempotent (`to_regclass` guarded).
3. **AC-3** `ALTER DEFAULT PRIVILEGES FOR ROLE postgres, supabase_admin … REVOKE ALL … FROM anon,
   authenticated` is included; a post-apply test table has no anon/authenticated grant.
4. **AC-4** A paired down-SQL restores the prior state (reversibility proven in the rolled-back session).
5. **AC-5** WS1 applies via the founder SQL-editor / `supabase db query --linked` + `migration repair`;
   **no `supabase db push`, no CI apply**; project ref asserted.
6. **AC-6** Rolled-back role-sim: BEFORE the exposed set returns rows to anon/synthetic-authenticated →
   AFTER 401/empty; the crown-jewel tables read 0 for the rogue role both before/after (non-regression).
7. **AC-7** Empire `/api/auth/register` rejects non-allow-listed signups (unit test); Supabase open signup
   disabled + leaked-password enabled (founder); `FOUNDER_USER_ID=70608186-…` pinned.
8. **AC-8** The 3 non-founder accounts are reconciled — evicted only after founder confirmation + proven
   0-ownership; sessions invalidated; the founder still logs in + reads their data.
9. **AC-9** `apps/empire/src/app/wiki/page.tsx` no longer calls `supabaseClient.from('wiki_pages')` in the
   browser; the read is server/`requireAdmin`-gated and the page still renders for the founder.
10. **AC-10** A CI grep asserts every `apps/empire/src/app/api/**/route.ts` is auth-gated or on the public
    allow-list.
11. **AC-11** Governance (722 foreign + 1,692 empty + migration-drift) is documented as a SEPARATE
    owner-gated program, NOT built here.
12. **AC-12** No autonomous prod write; every prod change is the founder SQL session; the crown-jewel RLS,
    `require-admin.ts`, vault, signed web OAuth, and service-role clients are untouched.

## 16 /goal command

```
/goal Implement docs/specs/spm-rls-exposure-remediation-2026-07-12.md — author docs/specs/sql/2026-07-12-rls-exposure-lock.sql (dynamic exposed-set REVOKE anon,authenticated + DROP permissive policies + ALTER DEFAULT PRIVILEGES revoke + paired down-SQL, idempotent, project-pinned to lksfwktwtmyznckodsau) reversing the b5 deferral; build WS2 (empire /api/auth/register allow-list + FOUNDER_USER_ID pin) + WS3 (move empire wiki_pages read server-side + empire /api auth-coverage grep); verify per §13 with rolled-back prod role-sim (anon + synthetic authenticated) BEFORE→AFTER; ALL prod DDL/DML + Supabase Auth toggles + account eviction are FOUNDER GATES (SQL editor / supabase db query --linked + migration repair, NEVER db push); crown-jewel RLS + require-admin + vault untouched; governance cleanup is a separate program.
```

## 17 Implementation sequence

1. **WS2 issuance close (fast, non-DDL)** — empire register allow-list + Supabase Auth toggles + pin
   FOUNDER_USER_ID; reconcile accounts (founder-gated eviction). Collapses the authenticated vector first.
2. **WS3 empire code** — server-side wiki read + `/api` coverage grep (CI-provable; before WS1 locks the
   table so the page never breaks).
3. **WS1 author + rolled-back prove** — the exposure-lock SQL; prove BEFORE→AFTER via rolled-back prod
   role-sim; then **founder SQL-editor apply** + `migration repair` + post-apply live re-verify.
4. **Later** — WS-GOV governance program.

## 18 Session-handoff seed

- **Repo/prod.** `D:/Authority-Site` (`CleanExpo/Unite-Group`, `origin/main c00fcfd6`); prod
  `lksfwktwtmyznckodsau` (hard-pin). Research: `wf_826c4783-273`. Prior (DB-shape) benches:
  `wf_3e603db7-4de` + `wf_7a08d0e0-20a`.
- **Founder = `contact@unite-group.in`** (id `70608186-a487-4efb-ae8a-71bd0dbfa151`). `support@synthex.social`
  (this session's login) is NOT the founder.
- **First commands.** Read this spec + `docs/specs/sql/2026-06-27-b5-rls-remediation.sql` (Section 2) +
  `docs/convergence/prod-migration-reconcile-runbook.md`; rolled-back role-sim to enumerate the current
  exposed set.
- **Do not.** `supabase db push`; REVOKE the founder-scoped crown-jewel tables; delete any account before
  founder confirmation; touch another Supabase project.

## 19 Final recommendation

**APPROVE BUILD — conditional.** §15 (AC-1 … AC-12) is the 100/100 contract. The exposure is already
conceded by the 2026-06-27 b5 pass — this reverses its now-false deferral, correctly scoped (config/
secret-index/wiki, NOT the founder CRM/vault which are properly RLS-scoped) and verified live. Honest
ceiling: WS1 apply + WS2 config/eviction are `{proven-after-founder-gate}` (manual SQL session); the
autonomous run reaches `{proven-by-rolled-back-role-sim}` + `{proven-in-CI}` and authors the SQL/code.
Conditions: (1) founder confirms the 3 non-founder accounts are unneeded before eviction; (2) apply only
via the repo's manual SQL-editor + `migration repair` path, never `db push`; (3) keep the crown-jewel RLS,
`require-admin`, vault, and signed web OAuth untouched. The durable win: exposure-driven two-gate REVOKE +
default-privileges revoke (closes P0-A against regression) + issuance closure (P0-B).

SPM spec complete. Next safe action: build WS2 (issuance close) + WS3 (empire server-read + coverage grep) as CI-provable code, and author the WS1 exposure-lock SQL for the founder's gated apply.
