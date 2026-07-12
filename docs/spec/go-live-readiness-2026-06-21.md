# Go-Live Readiness — Sequenced (2026-06-21)

> **SUPERSEDED FOR EXECUTION AUTHORITY 12/07/2026:** the Linear claim/handoff
> routes and Empire Mission Control loop described below are permanently retired.
> They do not claim, author, commit, push, or complete work. CRM `cc_tasks` is
> authoritative; Linear and Hermes are projections. Use the current Nexus
> foundation and OWNEST runbooks. Historical measurements below are retained as
> dated evidence and must not be used as go-live instructions.

> **Honest headline.** Foundations are **close** — every SSOT artefact (single Linear project + 2 epics + 10 sub-issues, the registry join, two gate-ready specs, the four agent-infra pieces, the brain vault) is present and substantive `[VERIFIED across Brief 5]`. The live `apps/web` deployment is real, READY, and auth-gated in prod `[VERIFIED Brief 1]`. But the four stages do **not** all advance together: **CRM V1 (Stage 2) is partial** and blocked first on a *definitional* model fork, not code; the **autonomous take-over loop (Stage 3) is far and is the single largest build** — **the deployed app does not yet run the orchestration loop.** It can pull/claim from Linear but cannot plan, build, verify, or ship, because the swarm runs **locally on the Mac via tmux** and **no hosted runner exists** `[VERIFIED Brief 4; CC_LINEAR_LIVE gate + hardcoded TEAM_KEY/PROJECT_NAME + zero swarm symbols in apps/web/src confirmed this session]`. The one liberating finding: **first product (Stage 4) is NOT gated by Stage 2** — both Duncan ventures live outside `apps/web`, so ITR Phase 1 can ship on its own Sydney project in parallel `[VERIFIED Brief 5]`. The binding constraints on first-ship are **legal + human sign-off**, not engineering.

## The finish line (sequenced)

Four stages, unlocking in order:

1. **Foundations in place** — SSOT, specs, agent infra, brain vault, spec-board.
2. **CRM V1 live in prod** — `apps/web` trustworthy: model drift resolved, approval-exec wired, auth fixed, providers connected.
3. **Autonomous loop** — the *deployed* app pulls from the single Linear project (Duncan Perkins Ventures pattern), dispatches the swarm, builds, verifies, ships — replacing today's local/Hermes/manual loop. **The deployed app does not yet do this.**
4. **First product ships** — a Duncan venture spec → a deployed app.

---

## Stage 1 — Foundations: **CLOSE** (1 partial element, expected)

**DONE [VERIFIED — Brief 5]:**
- SSOT Linear project "Duncan Perkins Ventures" (`d518b78d-…`, team UNI) + 2 epics (UNI-2158 ITR, UNI-2159 DIY) + all 10 phase sub-issues (UNI-2160→2169), each with DoD + `Spec §` reference — internally consistent.
- `projects.json` registry carries `linear_project_id` matching the Linear project + both spec paths — the clean machine join. `[INFERENCE — exact-match per Brief 5; not re-diffed this session]`
- Both specs (`apps/spec-board/projects/duncan-{itr-button,diy-home-loan}/spec.md`) read in full: 10 fable-engine sections, every claim tagged, both at `[STATUS] gate: awaiting approval`.
- Agent infra all present and substantive: `soul.md`, tiered memory (`getTieredContext`, swarm-memory.ts), `adversarial-evaluator` skill, `handoff` skill + `memory.md`. `[VERIFIED — Brief 5 (presence); "substantive" is Brief 5's read, not re-graded here]`
- Brain vault (~40 docs + 10 plaud transcripts + 6 Duncan corpus files) `[VERIFIED — Brief 5]`. Spec-board app reportedly builds via `verify:spec-board`, own Supabase `yhteftfnoegmdkimzzjd` — **build claim is `[UNCONFIRMED]` (not re-run this session)**.

**PARTIAL [VERIFIED — Brief 5, A13]:** Autonomous-loop *read-side* wiring in `apps/web` (`@linear/sdk`, `linear.ts`, `/api/linear/issues` GET+PATCH) exists but is unconfigured (empty board when `LINEAR_API_KEY` unset) and not confirmed pointed at the Duncan project — **this is Stage 3 work, not a Stage 1 gap.**

**STALE-DOC defects (not blockers) [VERIFIED — Briefs 1 & 5]:** `.portfolio/PORTFOLIO.yaml` still names the deleted `unite-hub` Vercel project + `unite-hub-self.vercel.app` as production (Brief 1) and still frames Unite-Hub as the surviving lead product (Brief 5). Registry SSOT lags the 20/06/2026 wind-down. Doc fix only.

---

## Stage 2 — CRM V1 live in prod: **PARTIAL** (between 1 and 2 of 5 V1 gates met — see table; 7 ordered blockers)

**Infra leg DONE [VERIFIED — Brief 1]:** Live project `unite-group` (`prj_IfUu…`), current production deployment `dpl_3QYM…` state **READY** on HEAD commit `86c0c8ab7`, serving 200 behind auth at `unite-group.in` + `unite-group.vercel.app`. Recent prod history healthy (last ~9 prod deploys READY); the one ERROR deploy was a **preview**, never prod. CI runs full lint→type-check→test→build on `apps/web` per push/PR.

**Auth leg CLOSE — verify, don't build [VERIFIED — Brief 3 for code presence]:** Login gate (`proxy.ts`), allow-list (`private-access.ts`), Google SSO flow, OAuth callback, and PR #358 signup hooks are all code-complete `[VERIFIED — Brief 3]`. Prod env reported present: Supabase keys, `GOOGLE_CLIENT_ID/SECRET`, `FOUNDER_USER_ID` `[INFERENCE — Brief 3; env presence not re-read this session]`. **The "Google login broken" flag is reported STALE** (env migrated to GCP `unite-group-nexus`) — **but end-to-end Google login is `[UNCONFIRMED]` until one real browser sign-in proves it.** Remaining = **verification** (one real browser sign-in + confirm `auth_allowlist` rows).

**Providers leg PARTIAL [VERIFIED — Brief 3]:** Xero **close** — both credential pairs (`XERO_*`, `DR_*`, `XERO_TENANT_ID_DR`) reported present, CSRF-hardened code; remaining = per-business browser consent (consent itself `[UNCONFIRMED]` until performed). Social **far** — only a mis-named `FACEBOOK_APP_ID` exists (code reads `META_APP_ID`), no secret; none of META/LinkedIn/TikTok/Reddit/YouTube configured → all read `configured:false`. Social is optional for V1.

**The deepest blocker is DEFINITIONAL, not code [VERIFIED — Brief 2 + status doc]:** `spec.md` describes a `crm_leads/crm_contacts/crm_opportunities` model that is **NOT in prod**; the live founder CRM runs on `contacts`/`leads`/`pipeline_stages`. Until that fork is resolved, "CRM V1 trustworthy" has no measurable line.

**The 5 V1 gates [VERIFIED — Brief 2]:**

| Gate | Verdict |
|---|---|
| G1 `crm_contacts`/`crm_opportunities` in prod | **MISSING** as written; `contacts` CRM shipped off-spec (live UI + `contacts/route.ts`) |
| G2 approval-exec wired | **MISSING** for spec engine (`approval-lifecycle.ts` orphaned); a parallel approval→execute IS live for **advisory cases** off-spec |
| G3 pipeline+forecast READ dashboard | **MISSING** — `opportunity-forecast.ts` test-only, no dashboard page |
| G4 advisory AI in daily digest | **MISSING** — `overnight-digest/route.ts` = tasks+sessions only |
| G5 email/calendar 2-way | **Email 2-way MET** (`gmail.ts sendReply` route-wired); calendar read-only (spec accepts as fallback) |

Net: **1 gate fully met (G5 email leg), the rest missing as written** against spec literally; a working off-spec `contacts` CRM exists. **Correction [VERIFIED — Brief 2]:** neither `check:schema-drift` nor `security:routes-check` exists at all — `spec.md`'s claim they "exist but aren't in CI" is stale.

**Ordered Stage-2 blockers [Brief 2]:**
1. **B1 — Reconcile the model fork** (adopt-reality vs honor-spec). **Human decision (Phill); gates B2–B5.** Status doc recommends adopt-reality.
2. **B2 — Build + wire `check:schema-drift` into CI** + resolve `founder_id` vs `workspace_id` scoping split.
3. **B3 — Approval-exec on the chosen model** (wire or formally retire `approval-lifecycle.ts`; standardise on the live advisory pattern).
4. **B4 — Pipeline+forecast READ surface** (G3) against the chosen table.
5. **B5 — Advisory AI into the digest** (G4) — data exists, digest doesn't read it.
6. **B6 — Calendar 2-way** (G5 remainder) — exceed-scope, not blocking.
7. **B7 — `security:routes-check` + enforced TOTP MFA** on `ALLOWED_ADMINS` (spec §11 hard V1 gate before real PII to prod).

---

## Stage 3 — Autonomous loop (the app takes over): **FAR — the largest build** (8 ordered missing pieces)

**Brutal verdict [VERIFIED — Brief 4; corroborated this session].** The deployed app **does not yet run the orchestration loop.** It is a **Linear-aware dispatcher-without-an-executor**: it can do the FIRST loop step (pull + claim) and last-mile bookkeeping (link tasks, list PRs), but **cannot plan, build, verify, or ship** — by deliberate design every execution path refuses to dispatch. Of the five loop stages (pull → plan → build → verify → ship), **only pull lives in prod, and it defaults to dry-run.** Do not soften this: today the loop is run by the local Mac, not the deployment.

**What IS in prod [VERIFIED — this session].** `vercel.json` schedules `/api/cron/linear-claim` + `/api/cron/linear-queue-health` (cron entries present, lines 64/68). `linear-claim` fetches eligible Linear issues, filters, prioritises, and — only when **both** `opts.live` and `process.env.CC_LINEAR_LIVE === '1'` — moves the card + posts a receipt (`linear-claim/route.ts:64`, `linear-claim.ts:236`). Route header is explicit: **DRY-RUN unless `CC_LINEAR_LIVE === '1'`** (`linear-claim/route.ts:10`). It emits a packet of shell-command strings for an *external* runner; the app never runs them. `[VERIFIED]`

**Where the swarm actually runs [VERIFIED — this session].** `grep` for swarm/tmux symbols in `apps/web/src` → **zero hits** (only a CC_LINEAR_LIVE comment, no swarm code). Per Brief 4 the swarm lives entirely in `apps/workspace` (Hermes) and runs via **tmux driving local `claude` processes** (`execFileSync('python3'…)`, `execFile(tmux,…)`) — structurally impossible on Vercel serverless. The operator-gateway is explicit (Brief 4): **"NO live job runner and NO production DB in this layer"**, `local-execution` returns `policy_refused` / `dispatchPerformed:false`.

**Config gap [VERIFIED — this session].** The loop is hardcoded `TEAM_KEY='UNI'`, `PROJECT_NAME='Unite-Group'` (`linear-claim/route.ts:31-32`, `linear-handoff/route.ts:23-24`, `linear-queue-health/route.ts:21-22`) — must be reconciled with the **"Duncan Perkins Ventures"** SSOT project. **`[UNCONFIRMED]` whether `CC_LINEAR_LIVE` is set in prod** (env not read this session).

**Ordered missing pieces [Brief 4] — what must be BUILT:**
1. **A hosted swarm runner** — persistent off-Vercel compute (Railway/VM/Actions/queue+container) that runs `claude`+git for minutes-to-hours. **The crux; nothing else in Stage 3 functions until this exists.**
2. **Server-side Linear→execution dispatch** — the cron POSTs the packet to the runner instead of leaving it for a human. *(Depends on 1: nothing to POST to until the runner exists.)*
3. **Flip the live gate, on the right project** — set `CC_LINEAR_LIVE`, reconcile `PROJECT_NAME` to Duncan Perkins Ventures. *(Going live before 1–2 exist would only fire dispatch at a non-existent executor — keep gated until then.)*
4. **Hosted build/verify gauntlet** triggered from the loop (real results, per Evidence Standard). *(Depends on 1–2.)*
5. **Hosted ship step** — branch→push→`gh pr create`→write PR link back to Linear. *(Depends on 4: never ship unverified.)*
6. **Port swarm-memory / soul.md / tiered-context** to the hosted runner (or expose as a service). *(Depends on 1.)*
7. **Replace CLI-shelling bridges** (`hermes`, `gh` binaries in `hermes/kanban` + `in-progress-prs`) with Linear/GitHub API calls.
8. **Autonomous-safety control plane** — server-side guardrails + approval-exec surface (overlaps Stage 2 B3/B7). *(Gates 3's live-flip in practice: do not run unattended without it.)*

---

## Stage 4 — First product ships: **SHORT in code, GATED in law + human sign-off** (and NOT blocked by Stage 2)

**Nearest-to-shippable: ITR Button (Lodgey / "Dmitri") [VERIFIED — Brief 5]:** (1) its separate Sydney Supabase project **reportedly already exists** — `ITR-Dimitri` / `vmkqrzpbeefaruhfhsow`, ap-southeast-2 (DIY has **no** project) `[VERIFIED — Brief 5; not re-queried this session]`; (2) ITR Phase 1 is a self-contained vertical slice, vs DIY Phase 1 **blocked on two external inputs Duncan still owes** (canonical rule list + lender facility terms); (3) prior ITR scaffolding exists to reuse.

**Correction to the mental model [VERIFIED — Brief 5]:** the existing Sydney project is **not** the spec's Dmitri spine — its `partner_events` (1,565 rows) are a **single-partner funnel burst from 01–07 June 2026, dormant since**; none of `intake`/`payments`/`srt`/`professionals` exist there. So Phase 0 is *partly* pre-done (project provisioned) but the schema + no-TFN gate are not.

**The honest distance [VERIFIED — ITR spec §2/§5/§8]:** the gate is the binding constraint, not the code. Both specs sit at `awaiting approval`, and **ITR Phase 1 cannot start until Phase 0 completes — and Phase 0 is a *legal* gate**: no primary law was fetched while writing the spec; every regulatory conclusion is `[INFERENCE]`/`[UNCONFIRMED]`; the no-TFN/tool-not-service posture is "the single largest risk in this venture."

**Ordered path to first ship (ITR Phase 1 deployed) [Brief 5]:**
1. **Human gate** — Phill + Duncan typed sign-off on ITR spec Decision (§2) + the 2 build-shaping open questions (OQ1 guide-only vs myGov-OAuth; OQ2 $30 + name). **Blocks everything below.**
2. **Phase 0(a) — primary-source legal/regulatory map** (UNI-2160): verbatim TASA / TPB / AML-CTF / Privacy-TFN / ACL / ASIC sources + tax-law reviewer sign-off. **The true long pole — external/legal, not code.** *(Depends on 1: don't commission the legal map before the Decision that scopes it.)*
3. **Phase 0(b) — project skeleton** on the existing Sydney project: Next.js scaffold, RLS-on, AES-256, the **no-TFN CI check** that fails the build on any TFN-shaped persistence. *(Can parallel 2, but the no-TFN posture it encodes is set by 2's findings.)*
4. **Phase 1 — thinnest vertical slice** (UNI-2161): Dmitri intake → TFN/ID soft-block → Stripe $30 → encrypted-PDF + unlock-key → one hand-authored SRT to one seeded TPB professional, on a Supabase branch first. *(Depends on 2 and 3.)*
5. **Verify + deploy** — orchestrator re-runs the gauntlet (subagent "green" is `[UNCONFIRMED]` until re-run) → Sydney preview URL. *(Depends on 4.)*

**Sequencing note [VERIFIED — Brief 5]:** both ventures deliberately sit **outside** `apps/web`/`lksfwktwtmyznckodsau`, so **Stage 4 is NOT blocked by the Stage 2 CRM model-drift findings.** First-ship can proceed in parallel with Stage 2/3 — it is gated by legal + human sign-off, not by CRM trustworthiness.

---

## Critical path (what unlocks what)

```
Stage 1 Foundations [CLOSE] ──► essentially in place; doc fixes only (PORTFOLIO.yaml stale)
        │
        ├──────────────► Stage 4 First Product [parallel — NOT gated by Stage 2]
        │                   Human sign-off (1) ─► Legal map / Phase 0a (2, LONG POLE)
        │                   ─► skeleton+no-TFN gate (3) ─► thin slice (4) ─► verify+deploy (5)
        │
        ├──► Stage 2 CRM V1 [PARTIAL]
        │       B1 model-fork decision (Phill) ──gates──► B2 drift-gate+scoping
        │           └─► B3 approval-exec ─► B4 forecast READ ─► B5 digest AI
        │           B7 routes-check + MFA  ──► PII-to-prod go-live gate
        │           (auth = verify only; Xero = consent only; social = optional)
        │
        └──► Stage 3 Autonomous Loop [FAR — largest build; deployed app does NOT yet run the loop]
                (1) HOSTED RUNNER ──gates everything──► (2) dispatch ─► (3) live-gate+project
                ─► (4) hosted gauntlet ─► (5) hosted ship ─► (6) memory port
                ─► (7) API-ify CLI bridges ─► (8) safety control plane (overlaps Stage 2 B3/B7)
```

**Single highest-leverage moves, by stage:**
- **Stage 2:** B1 — the model-fork decision (Phill). Every other Stage-2 item inherits its ambiguity.
- **Stage 3:** Piece 1 — the hosted runner. Without persistent off-Vercel compute, the take-over loop cannot exist regardless of Linear plumbing — **the deployed app does not yet run the loop and cannot until this is built.**
- **Stage 4:** Step 1→2 — Phill+Duncan sign-off, then the legal map. The build is small; the law is the long pole.

---

## What only Phill can do (provider apps, secrets, sign-offs, gated approvals)

**Decisions / sign-offs:**
- **B1 — CRM model-fork decision** (adopt-reality vs honor-spec). Gates all of Stage 2 B2–B5. `[VERIFIED — Brief 2]`
- **ITR spec sign-off** — typed approval of Decision §2 + OQ1 (guide-only vs myGov-OAuth) + OQ2 ($30 + name Dmitri/Dimitri). Gates all of Stage 4. `[VERIFIED — Brief 5]`
- **DIY external inputs** — supply the canonical rule list + lender facility terms Duncan owes (unblocks DIY Phase 1). `[VERIFIED — Brief 5]`
- **Legal/regulatory sign-off** — engage the tax-law reviewer for the ITR Phase 0 primary-source map. `[VERIFIED — Brief 5]`

**Verification only (env reported present; prove it in a browser):**
- **Google login end-to-end** — confirm Supabase→Google provider enabled + GCP consent-screen test users, then one real sign-in. `[UNCONFIRMED until browser-proven — Brief 3]`
- **Confirm `auth_allowlist` rows** in prod (read was correctly gated this session). `[UNCONFIRMED — Brief 3]`

**Provider go-live (external apps + browser consent):**
- **Xero** — per-business browser consent at `/founder/xero` (DR + CARSI). Credentials reported present. `[VERIFIED — Brief 3 for code/creds; consent [UNCONFIRMED] until done]`
- **Social (optional for V1)** — create each provider app; fix the `FACEBOOK_APP_ID`→`META_APP_ID` env-name defect + add `META_APP_SECRET`; add LinkedIn/TikTok/Reddit/YouTube secrets; then consent. `[VERIFIED — Brief 3]`
- **Google Drive Notes (optional)** — set `GOOGLE_DRIVE_VAULT_FOLDER_ID` (absent). `[VERIFIED — Brief 3]`

**Infra / gated approvals:**
- **Provision the hosted runner** (Stage 3 piece 1) — choose + stand up the off-Vercel compute target; set `CC_LINEAR_LIVE` and reconcile `PROJECT_NAME` to Duncan Perkins Ventures. `[VERIFIED — Brief 4; CC_LINEAR_LIVE gate + hardcoded PROJECT_NAME confirmed this session]`
- **Any resource deletion** (e.g. finally decommissioning the stale `unite-hub` registry entries / `unite-hub-sandbox` Vercel project) — runbook gates + typed approval, never autonomous. `[per CLAUDE.md]`
