# Nested workflow retirement — 12 July 2026

GitHub Actions executes workflow files only from the repository-root
`.github/workflows/` directory. Seventeen workflow files carried into nested
subtrees therefore provided no checks, schedules, alerts, deployments, or
security coverage. They were removed instead of preserving phantom automation.

## Replacement map

| Nested surface | Disposition |
|---|---|
| `apps/web`, `apps/workspace`, `apps/spec-board` package CI | Enforced by root `.github/workflows/ci.yml` with each package's locked manager and working directory. |
| `packages/spine` CI | Moved to the root CI as a Node 24 type-check and test job. Database integration tests receive only the dedicated non-production secret and never fall back to production. |
| Web and workspace dependency/security scans | Active lockfiles are audited for high-severity advisories in root CI; weekly Dependabot coverage is declared at the repository root. |
| Web health, smoke, and Lighthouse jobs | Retired. They targeted the deleted `unite-hub-sandbox.vercel.app` deployment and could not run from their nested location. A current production canary requires a separately reviewed root workflow and an explicit target. |
| Workspace image publication | Retired. It referenced the former standalone workspace repository/image and would have published mutable `latest` tags. Image publication requires a reviewed root release workflow and immutable provenance. |
| Empire CI, review board, Deepsec, design lint, and JWT rotation | Retired. `apps/empire` is reference-only. The JWT job also represented unattended production credential mutation and is not authorised from this repository. |
| Brain `kd-sync` | Retired. `docs/brain` is residual material; the canonical vault is external to this checkout. No nested job may mutate its former Supabase target. |

Removal does not claim that every former intention has a replacement. The
table deliberately distinguishes enforced coverage from retired or future
work. Any new schedule, deployment, external message, or production mutation
must be added as a root workflow with least privilege, immutable action pins,
bounded inputs, and an explicit owner.
