# ShipIt Release Readiness Packet

Run timestamp (UTC): 20260606T064540Z
Target system: Pi-Dev-Ops / 2nd Brain / Margot / Agentic Unite-Group Nexus
Repo: CleanExpo/Unite-Group (Authority-Site / Empire Command Center / Pi-CEO)
Live URL: https://www.unite-group.in
HEAD: d1e26757f6563ffcfcbfeafe1e949bb506fc83be (== origin/main)

## 1. Validation summary
ALL release gates GREEN on current main (fresh evidence, real exit codes):
- type-check exit 0, lint exit 0 (0 errors / 918 warnings), build exit 0
- pipeline tests 23/23 exit 0, full suite 1125 passed / 1 skipped exit 0
- route security 0 unprotected mutating routes exit 0, diff-check exit 0
- GitHub main CI: success on HEAD
- Vercel commit status on HEAD: success (contexts "Vercel – unite-group" and
  "Vercel – unite-group-sandbox") — status checks OBSERVED, not a manual deploy.

## 2. Repo / branch state
- HEAD == origin/main (d1e2675); local and remote fully in sync.
- Working tree clean except untracked ShipIt evidence docs + .shipit_evidence/.
- Open PRs on CleanExpo/Unite-Group: 0.
- No source code changes pending. Nothing to merge or push for the app itself.

## 3. Deployment target
- Mechanism: Vercel git integration — push to `main` auto-deploys. Region syd1.
- Production domain: https://www.unite-group.in (→ 307 → https://unite-group.in/en → HTTP 200).
- No local `.vercel/project.json` linked; deployment is git-driven, not CLI-driven.
- Current main is ALREADY the deployed, live, green state.

## 4. Rollback plan
- Vercel keeps immutable deployments per commit. Rollback = "Promote" a prior
  successful deployment in the Vercel dashboard, OR `git revert <sha>` on a revert branch opened as a PR and merged to main per board governance (direct main push is blocked by branch protection)
  to trigger a new deploy from the reverted tree. Both are non-destructive.
- No DB rollback needed: no production DB mutation is part of this release.

## 5. Database / migration status
- One migration PROPOSAL exists: docs/margot/migration-proposals/
  2026-05-31-tasks-voice-command-sessions-sandbox.sql.
- Status per file header: "PROPOSAL — not applied anywhere yet"; additive/idempotent;
  "Production promotion requires fresh Board approval — do NOT apply to production
  without explicit sign-off from the Board."
- It is NOT required for the named target system's current released state (live
  site serves 200, all CI/Vercel green without it).
- DECISION: DB/migration gate = NOT APPLICABLE to this release. Production DB is
  not touched. Promotion is deferred to sandbox-first validation + a separate,
  named Board approval (this ShipIt grant is not that DB approval).

## 6. Environment readiness (names only)
Required: ANTHROPIC_API_KEY, VAULT_ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY,
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, CRON_SECRET, FOUNDER_USER_ID.
These are configured in Vercel (live site serving 200 + auth redirect confirms
they are present in production). No secret values were read or printed.

## 7. Dashboard / control-plane status
- Live app reachable and serving (HTTP 200 on /en after auth/locale redirect).
- Agentic Nexus local control plane lives in $AGENTIC_NEXUS_PATH
  (separate evidence/audit/dashboard store; out-of-tree for this repo per the
  workspace isolation rule in CLAUDE.md).

## 8. Business readiness
- Application purpose matches Unite-Group Nexus / Pi-CEO command centre. CONFIRMED.
- User-facing state acceptable: live site responds 200; auth redirect is expected
  for the single-tenant founder app.
- No client-facing email sent. No Stripe/payment activation. No claims/orders.

## 9. Remaining risks
- P2: 918 ESLint `no-explicit-any` warnings (quality debt, non-blocking).
- Forward work (not this release): voice-task DB migration proposal awaits
  sandbox validation + Board approval before any prod promotion.

## 10. Final recommendation
GO for ShipIt-complete on the CURRENT released state. The named target system is
already live and green on main; all safe release gates pass. No new code deploy
or DB migration is required or authorized in this run. Recommendation:
`shipit_complete` for the current release; defer the voice-task migration to a
separate sandbox+Board-approval batch.
