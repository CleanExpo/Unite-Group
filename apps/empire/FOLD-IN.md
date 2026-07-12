# apps/empire — Authority-Site / Empire (Mission Control) app

Point-in-time fold-in of the standalone Authority-Site / "Empire Command Center"
Next.js app (founder cockpit, Mission Control, `command-center/*` topology,
`api/empire/*`, Pi-CEO surfaces, `mission-control:linear-loop` worker) into the
monorepo.

> **Retired 12/07/2026:** the folded-in `mission-control:linear-loop` execution
> lane is retained only as a refusal tombstone. CRM `cc_tasks` is authoritative;
> OWNEST is a design/test contract only. No replacement execution lane is live;
> a future canary cannot be considered until credential migration, dedicated
> isolation, brokered authority, and independent verification are proven.

- **Source:** branch `margot/digest-sensitive-copy-redaction-20260616` — the
  divergent autonomous-churn line (~330 commits off `main`) — snapshotted via
  `git archive` on 2026-06-16. Full backup bundle:
  `~/Unite-Hub-deletion-backups/empire-margot-20260616-2052.bundle`.
- **Why:** the Mission Control Linear issues (UNI-2146/2147/2148/2149/2150)
  target this app's `command-center/*` + `api/empire/*` surfaces, which were not
  in the monorepo. Folding it in freezes the divergence and gives those issues a
  clean, PR-able base on `main`.

## Follow-ups (not in this PR)
- Wire a Monorepo CI job for `apps/empire` (type-check/lint/test/build).
- Prune residual root-meta inert in a sub-app (nested `.github/`, `.husky/`).
- Resolve the `package.json` "name" (`unite-group`) if it clashes downstream.
