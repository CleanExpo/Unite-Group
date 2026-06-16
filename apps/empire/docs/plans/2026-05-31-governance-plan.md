# Unite-Group Project Governance Plan
## Structured Task Registry with Compliance, Legal & Technical Review Columns

> **Date:** 2026-05-31
> **Status:** Post-DR Foundation, Pre-React19/Next16 Migration
> **Branch Active:** `margot/tasks-voice-schema-proposal` (DR complete → migration branch next)

---

## Column Definitions

| Column | Definition |
|--------|-----------|
| **Task ID** | Unique identifier |
| **Deliverable** | What must be produced |
| **Functionality Best Practices** | Industry-standard approach, DRY/YAGNI/TDD, security posture, accessibility, performance |
| **Delivered Timeline** | Estimated effort / deadline / milestone gate |
| **Project Scope** | In-scope vs out-of-scope boundaries |
| **Defining Success** | Quantifiable acceptance criteria |
| **Reporting on Compliance / Regulation** | SOC 2, GDPR (AU Privacy Act), ISO 27001, PCI-DSS (Stripe) alignment |
| **Legal Professional Considerations** | Contracts, IP, liability, client data handling, Board approvals |
| **Overview & Technical Reviews** | Architecture, complexity, risk level, high/low dev warnings, upgrade path |

---

## Phase A: Disaster Recovery (COMPLETED)

### A.0. Executive Summary — DR Phase

| Field | Value |
|-------|-------|
| **Timeline** | 2026-05-31 (single-session swarm execution) |
| **Swarm Agents Deployed** | 5 (DR Validator, Backup Engineer, Security Auditor, Documentation Enhancer, Health Monitor) |
| **Commits** | 3 (`0d86eac` → `bd64652` → `ca488e1`) |
| **Files Created** | 12 new artifacts |
| **P0 Fixes Applied** | 5 (gitleaks, Deepsec, branch protection, stale project IDs, backup tooling) |

### A.1. DR Assessment & Documentation

| Task ID | Deliverable | Functionality Best Practices | Delivered Timeline | Project Scope | Defining Success | Reporting on Compliance / Regulation | Legal Professional Considerations | Overview & Technical Reviews |
|---------|------------|------------------------------|-------------------|---------------|------------------|--------------------------------------|-----------------------------------|-----------------------------|
| DR-001 | DR Maturity Assessment (`docs/margot/disaster-recovery-assessment.md`) | NIST SP 800-34 Rev 1, ISO 27031 business continuity, tiered maturity model (1 reactive → 3 proactive) | Completed 2026-05-31 | In: 13-component inventory, 16-risk register, RTO/RPO targets. Out: active incident response (separate runbook) | Documented RTO (15-60 min), RPO (currently ~24h, target <1h with PITR), 4-phase 90-day roadmap | ISO 27001 A.17.1 (info security continuity), SOC 2 CC7.2 (system monitoring), AU Privacy Act — data availability obligation | Board must approve PITR addon (~$10/month); all client data in Supabase covered by existing DPA; no new vendor onboarding | **HIGH COMPLEXITY** — 13 components × 4 maturity levels × 3 time horizons. Scoring is subjective; requires quarterly review. |
| DR-002 | Master DR Runbook (`docs/runbooks/disaster-recovery.md`) | 16-scenario coverage, decision trees per scenario, rollback procedures, contact rosters | Completed 2026-05-31 | In: DB corruption, Vercel failure, credential leak, local dev loss, AI gateway outage, security breach, Mac Mini loss. Out: third-party SaaS outages (e.g., Stripe, ElevenLabs) | Every scenario has: trigger condition, recovery steps, validation checklist, estimated recovery time, escalation path | SOC 2 CC6.1 (logical access), CC7.4 (system recovery), PCI-DSS 12.10.1 (incident response plan) | Credential leak scenario requires immediate rotation auth from 1Password; legal must be notified if client PII exposed. Client notification SLA: 72h under AU Privacy Act. | **MODERATE COMPLEXITY** — Scenarios are well-structured but untested in live incident. Quarterly drills required. |
| DR-003 | Environment Inventory (`docs/runbooks/environment-inventory.md`) | 40+ env vars mapped to authoritative source, encrypted backup procedure (GPG), rotation log | Completed 2026-05-31 | In: Supabase, Vercel, Stripe, ElevenLabs, Telegram, Linear, NextAuth, CDN. Out: local `.env.local` files (ephemeral by design) | Every production env var has: source system, rotation date, last verified date, responsible party. Backup encrypted at rest. | ISO 27001 A.9.4.3 (password management), SOC 2 CC6.7 (encryption), AU Privacy Act — personal data storage security | 1Password is sole source of credential truth; legal review of 1Password Business Terms completed. No credential may be stored in plaintext outside 1Password. | **LOW COMPLEXITY** — Inventory is static list. Risk: drift if env vars added without updating doc. Must be auto-validated monthly. |
| DR-004 | API Key Inventory (`docs/runbooks/api-key-inventory.md`) | 12 active keys catalogued, rotation procedures defined, stale/revoked tracking | Completed 2026-05-31 | In: Production API keys with rotation cadence. Out: service-account keys (separate IAM register) | Every key has: scope, creation date, expiry date, rotation procedure, revocation path. Quarterly review scheduled. | PCI-DSS 3.6 (key management), SOC 2 CC6.7, ISO 27001 A.10.1.2 (key management) | Stripe keys: restricted-key policy in place. ElevenLabs keys: usage caps active. All keys subject to immediate rotation on personnel change. | **LOW COMPLEXITY** — Straightforward registry. Warning: rotation procedures are documented but not automated. |

### A.2. Security Pipeline Fixes

| Task ID | Deliverable | Functionality Best Practices | Delivered Timeline | Project Scope | Defining Success | Reporting on Compliance / Regulation | Legal Professional Considerations | Overview & Technical Reviews |
|---------|------------|------------------------------|-------------------|---------------|------------------|--------------------------------------|-----------------------------------|-----------------------------|
| DR-005 | gitleaks Pre-Commit Hook | Scan staged changes only (`--staged --redact --no-banner`), deduplicated, no false positives | Completed 2026-05-31 | In: All commits to `margot/*` branches and main. Out: historical commit audit (one-time separate task) | Zero secrets committed since installation. Pre-commit blocks on match. Hook runs in <2s per commit. | SOC 2 CC6.1 (logical access), CC6.6 (security infrastructure / software), ISO 27001 A.12.6.1 (management of technical vulnerabilities) | gitleaks is static analysis only — does not encrypt at rest or in transit. Complementary to 1Password, not replacement. | **LOW COMPLEXITY** — Single binary install. Ongoing risk: rule set becomes stale. Update quarterly. |
| DR-006 | Deepsec Weekly Scan Fix | Runs from `.deepsec/` workspace, explicit project-id, auto-creates labels, type-aware analysis | Completed 2026-05-31 | In: 1,845 matches across 510 files. Out: production runtime monitoring (separate SAST/DAST tooling) | Scan completes in CI within 10 minutes. Results posted as GitHub issue with severity labels. Critical findings auto-escalate. | ISO 27001 A.12.6.1, SOC 2 CC7.1 (security operations), PCI-DSS 6.5 (address common coding vulnerabilities) | 1,845 matches require triage. Deepsec is a linter, not a legal guarantee. Findings must be reviewed by engineering before legal exposure assessment. | **MODERATE COMPLEXITY** — 1,845 matches is high noise. Requires `pnpm deepsec process` to dedupe. Risk: alert fatigue → ignored findings. |
| DR-007 | GitHub Branch Protection | `required_approving_review_count=1`, `enforce_admins=true`, `require_last_push_approval=true`, linear history, conversation resolution | Completed 2026-05-31 | In: `main` branch only. Out: feature branches (free to force-push by authors). | No direct push to `main` since enforcement. All merges have at least one approving review. Admin override logged. | SOC 2 CC6.1, CC6.3 (access removal), ISO 27001 A.9.1.2 (access to networks), PCI-DSS 8.2 (additional security measures) | Force-push disabled protects against history rewrite attacks. Admin enforcement means Phill's merges also require review — critical for audit trail. | **LOW COMPLEXITY** — Single API call. Warning: `require_last_push_approval` may block hotfixes. Emergency bypass procedure documented in DR runbook. |
| DR-008 | Stale Supabase Project ID Remediation | Replaced invalid `uqfgdezadpkiadugufbs` with active production ref `lksfwktwtmyznckodsau` across 4 files | Completed 2026-05-31 | In: `package.json` (gen:types, check:schema-drift), `scripts/safe-migrate.sh`, `lib/database.types.ts`. Out: historical migrations referencing old project. | `npm run gen:types` produces types from active production schema. `npm run check:schema-drift` passes. Safe-migrate targets correct project. | SOC 2 CC7.2 (system monitoring), ISO 27001 A.12.1.2 (change management) | Stale reference could have caused accidental writes to non-existent project or fallback to default. Fix removes ambiguity for audit. | **LOW COMPLEXITY** — Find/replace. Warning: this was a live configuration drift. Root cause: project deletion without updating codebase references. |

### A.3. Backup & Restore Infrastructure

| Task ID | Deliverable | Functionality Best Practices | Delivered Timeline | Project Scope | Defining Success | Reporting on Compliance / Regulation | Legal Professional Considerations | Overview & Technical Reviews |
|---------|------------|------------------------------|-------------------|---------------|------------------|--------------------------------------|-----------------------------------|-----------------------------|
| DR-009 | Backup Healthcheck Script | Daily validation: Supabase backup age, pg_dump connectivity, sandbox table count, Telegram alert on failure | Completed 2026-05-31 | In: Automated daily check, Telegram notification. Out: automatic restoration (manual runbook only) | Script runs without error. Detects backup age >24h. Alerts within 5 minutes of detection. | SOC 2 CC7.2 (system monitoring), AU Privacy Act — data availability, ISO 27001 A.12.3.1 (info backup) | Backup scripts must not log connection strings. Telegram bot channel is private. Healthcheck is read-only — no data modification. | **MODERATE COMPLEXITY** — Shell script with external dependencies (psql, Telegram). Risk: script itself becomes stale. Review monthly. |
| DR-010 | RestoreAssist Verification Script | Weekly deep validation: Supabase backup status API, pg_dump extraction test, sandbox restore simulation | Completed 2026-05-31 | In: Weekly execution, 5 bug fixes from swarm. Out: full production restore (requires Board approval + downtime window) | 5 bugs fixed. Script exits 0 on success, non-zero on any failure. Output logged with timestamp. | SOC 2 CC7.4 (recovery procedures), ISO 27001 A.17.1.3 (verify backup procedures) | Weekly restore test touches sandbox DB only (`xgqwfwqumliuguzhshwv`). Production restore requires explicit Board authorization and client notification if >15 min downtime. | **MODERATE COMPLEXITY** — 169 lines of shell. Swarm found 5 bugs indicating lack of prior review. Warning: sandbox and production schemas may diverge over time — sync quarterly. |
| DR-011 | PostgreSQL 17.4 Binary Installation | `psql` and `pg_dump` installed to `~/.local/bin` with libraries in `~/.local/lib`, macOS `DYLD_LIBRARY_PATH` configured | Completed 2026-05-31 | In: Local CLI tooling. Out: Server-side Supabase tooling (uses Supabase-managed binaries). | `pg_dump --version` returns 17.4. `psql` connects to pooler successfully. No sudo required. | ISO 27001 A.12.5.1 (installation of software), SOC 2 CC7.1 | Binary installation is user-scoped (`~/.local`) — does not affect system integrity. No license violation (PostgreSQL MIT-like license). | **LOW COMPLEXITY** — Download and extract. Warning: macOS Gatekeeper may block unsigned binaries. Currently bypassed via terminal; may need notarization check after OS update. |
| DR-012 | PITR Enablement (PENDING BOARD) | Enable Point-in-Time Recovery on Supabase production project | BLOCKED pending Board decision | In: Supabase Pro addon (~$10/month). Out: third-party backup solutions | PITR enabled. RPO <1 hour. WAL continuous archiving confirmed. | SOC 2 CC7.2 (backup coverage), AU Privacy Act — data resilience requirement, PCI-DSS 9.5 (backup media storage) if cardholder data | ~$120/year operational cost. Must be approved in Board minutes. PITR is a contractual feature of Supabase — no new vendor needed (approved). | **LOW COMPLEXITY** — Single dashboard toggle. **HIGH IMPACT** — RPO improvement from 24h to <1h. Deferred due to cost approval requirement. |

---

## Phase B: React 19 / Next.js 16 Migration (PLANNED)

### B.0. Executive Summary — Migration Phase

| Field | Value |
|-------|-------|
| **Timeline** | 2–3 days active work + 1 day smoke testing |
| **Branch** | `margot/react-19-next-16-migration` (from `main`) |
| **Phases** | 5 (0: Hardening, 1: React 19, 2: Next.js 16, 3: Peer Deps, 4: QA, 5: Docs) |
| **Tasks** | 21 bite-sized tasks |
| **Estimated Risk** | MEDIUM (codemod handles 162 forwardRef; manual work on 9 React.FC + Next.js API changes) |

### B.1. Pre-Migration Hardening

| Task ID | Deliverable | Functionality Best Practices | Delivered Timeline | Project Scope | Defining Success | Reporting on Compliance / Regulation | Legal Professional Considerations | Overview & Technical Reviews |
|---------|------------|------------------------------|-------------------|---------------|------------------|--------------------------------------|-----------------------------------|-----------------------------|
| MIG-001 | Migration Branch Creation | Isolated branch from `main`, package-lock backup, clean working tree | 15 min | In: Branch `margot/react-19-next-16-migration`. Out: Feature development unrelated to migration | `git status` clean. `package-lock.json.pre-migration.backup` committed. | SOC 2 CC7.2 (change management), ISO 27001 A.12.1.2 | All migration work auditable via branch history. Rollback procedure documented. | **LOW COMPLEXITY** — Branching only. |
| MIG-002 | Baseline Verification | Build, type-check, lint, tests all pass before touching any dependency | 30 min | In: Current state validation. Out: Fixing existing failures | `npm run build` succeeds. `npm run type-check` clean. `npm test` all pass. `npm run lint` clean. | SOC 2 CC7.2, ISO 27001 A.12.6.1 | Baseline proves any post-migration failure is caused by upgrade, not pre-existing. | **LOW COMPLEXITY** — Verification only. May expose pre-existing issues that must be fixed before migration proceeds. |
| MIG-003 | Breaking-Change Inventory | forwardRef count (162), React.FC count (9), use client count (144), legacy API audit | 30 min | In: Automated counts. Out: Manual code review of each usage | Documented inventory committed to `docs/plans/`. Each risky dependency (tsparticles, xyflow, framer-motion) assessed for R19 compat. | ISO 27001 A.12.5.1 (software installation planning) | Assessment identifies whether third-party libs require license-compatible upgrades. | **MODERATE COMPLEXITY** — 162 forwardRef instances mostly in shadcn/ui. Automated codemod handles majority. Manual review needed for edge cases. |

### B.2. React 18 → 19 Core Upgrade

| Task ID | Deliverable | Functionality Best Practices | Delivered Timeline | Project Scope | Defining Success | Reporting on Compliance / Regulation | Legal Professional Considerations | Overview & Technical Reviews |
|---------|------------|------------------------------|-------------------|---------------|------------------|--------------------------------------|-----------------------------------|-----------------------------|
| MIG-004 | React Core Bump | `react` 18.2.0 → 19.2.6, `react-dom` 18.2.0 → 19.2.6, `@types/react` 18.2.0 → 19.2.15, `@types/react-dom` 18.2.0 → 19.2.3 | 30 min | In: Core React packages only. Out: Peer dependencies, Next.js | No peer dependency conflicts. `npm ls react react-dom` shows single v19 tree. | ISO 27001 A.12.5.1 | React is MIT licensed — no legal concern. | **LOW COMPLEXITY** — Single npm install. **HIGH RISK POINT** — All downstream packages must accept React 19 peer. |
| MIG-005 | forwardRef → ref Codemod | `@react/codemod@latest legacy src/` applied | 1 hour | In: All 162 forwardRef usages. Out: Components that don't use ref (can be simplified further) | Type-check passes after codemod. No runtime errors in dev server. | SOC 2 CC6.6 (secure development), ISO 27001 A.14.2.9 (system acceptance testing) | Automated code changes require code review before merge. Codemod is from Meta — trusted source. | **MODERATE COMPLEXITY** — Codemod is 80% effective. Remaining 20% (32 instances) need manual fix. Risk: ref typing becomes `any` if not carefully reviewed. |
| MIG-006 | React.FC Removal | Convert 9 `React.FC` usages to plain function types | 30 min | In: 9 files with explicit React.FC. Out: Implicit FC patterns | Type-check clean. No implicit `children` prop lost. | SOC 2 CC6.6 | No legal concern. | **LOW COMPLEXITY** — Pattern replacement. Warning: FC provides implicit `children` — verify each component still accepts children if needed. |
| MIG-007 | CSSProperties Import Fix | Resolve any `React.CSSProperties` → `CSSProperties` import changes if React 19 requires | 15 min (if needed) | In: ~25 inline style typings. Out: CSS module styles | No type errors on style objects. | N/A | N/A | **LOW COMPLEXITY** — May be no-op if React 19 maintains backward compat. |
| MIG-008 | Phase 1 Gate | Build, type-check, tests, lint all pass with React 19 alone | 30 min | In: Verification. Out: Next.js changes | All gates green. Tag `phase1-react19` created. | SOC 2 CC7.2 (change validation), ISO 27001 A.12.6.1 | Gate ensures React 19 is stable before introducing Next.js variables. | **LOW COMPLEXITY** — Verification. |

### B.3. Next.js 15 → 16 Upgrade

| Task ID | Deliverable | Functionality Best Practices | Delivered Timeline | Project Scope | Defining Success | Reporting on Compliance / Regulation | Legal Professional Considerations | Overview & Technical Reviews |
|---------|------------|------------------------------|-------------------|---------------|------------------|--------------------------------------|-----------------------------------|-----------------------------|
| MIG-009 | Next.js Core Bump | `next` 15.5.18 → 16.2.6, `eslint-config-next` 15.5.15 → 16.2.6 | 30 min | In: Next.js framework + ESLint config. Out: Turbopack config changes (deferred) | `npm ls next` shows v16. No unmet peer deps. | ISO 27001 A.12.5.1 | Next.js is MIT licensed. | **LOW COMPLEXITY** — Install. **HIGH RISK POINT** — Next.js 16 may have breaking App Router changes. |
| MIG-010 | next.config.js Compatibility | Review `images.domains` deprecation, `distDir`, webpack config. Migrate to `images.remotePatterns` if warned. | 1 hour | In: `next.config.js`. Out: Feature code | Build succeeds with no deprecation warnings. | SOC 2 CC7.2 | Configuration changes may affect CDN domains — verify no client CDN disruption. | **MODERATE COMPLEXITY** — Config only. Warning: `images.domains` → `remotePatterns` change affects all image optimization. Must test production image loading. |
| MIG-011 | App Router API Changes | Audit `headers()`/`cookies()` async requirements, `params` Promise handling in dynamic routes | 1–2 hours | In: `src/app/**/*.tsx`, `src/app/api/**/*.ts`. Out: `src/lib/**` (used by pages but not page signatures) | Build passes. Runtime tests for `/`, `/command-center`, `/api/crm/daily-digest` pass. | SOC 2 CC6.6, CC7.1 | API route changes may affect data handling — ensure no PII logging introduced. | **HIGH COMPLEXITY** — Next.js 16 may enforce `await headers()` / `await cookies()` in Server Components. Requires scanning all 144 Server Components. Risk: missed `await` causes runtime error, not build error. |
| MIG-012 | Phase 2 Gate | Build, type-check, tests, lint all pass with Next.js 16 | 30 min | Verification | All gates green. Tag `phase2-next16` created. | SOC 2 CC7.2 | Validates Next.js 16 stability. | **LOW COMPLEXITY** — Verification. |

### B.4. Peer Dependency Reconciliation

| Task ID | Deliverable | Functionality Best Practices | Delivered Timeline | Project Scope | Defining Success | Reporting on Compliance / Regulation | Legal Professional Considerations | Overview & Technical Reviews |
|---------|------------|------------------------------|-------------------|---------------|------------------|--------------------------------------|-----------------------------------|-----------------------------|
| MIG-013 | Radix UI Slot Update | `@radix-ui/react-slot` 1.2.3 → 1.2.4 | 15 min | Single package | No peer warnings. shadcn/ui components render correctly. | N/A | N/A | **LOW COMPLEXITY** — Patch update. |
| MIG-014 | React Hook Form Update | `react-hook-form` 7.56.4 → 7.76.1, `@hookform/resolvers` 5.0.1 → 5.4.0 | 15 min | Two packages | Forms submit correctly. Validation behavior unchanged. | N/A | N/A | **LOW COMPLEXITY** — Minor version. Test form validation on `/contact` and portal forms. |
| MIG-015 | next-intl Update | `next-intl` 4.11.1 → 4.13.0 | 15 min | Single package | i18n routing works. Locale switching functional. | N/A | N/A | **LOW COMPLEXITY** — Minor version. |
| MIG-016 | lucide-react Update | `lucide-react` 0.511.0 → 1.17.0 | 15 min | Single package | All icons render. No bundle size regression >10%. | N/A | N/A | **LOW COMPLEXITY** — Major version jump (0.x → 1.x) but icons are stable. Verify icon names haven't changed. |
| MIG-017 | Peer Warning Audit | `npm ls` clean — no React 18 peer requirements left | 30 min | All dependencies | Zero peer dependency warnings related to React version. | N/A | N/A | **MODERATE COMPLEXITY** — May require overriding peer deps for legacy packages (e.g., @tsparticles/react v3). Document any `--legacy-peer-deps` usage. |

### B.5. Quality Assurance

| Task ID | Deliverable | Functionality Best Practices | Delivered Timeline | Project Scope | Defining Success | Reporting on Compliance / Regulation | Legal Professional Considerations | Overview & Technical Reviews |
|---------|------------|------------------------------|-------------------|---------------|------------------|--------------------------------------|-----------------------------------|-----------------------------|
| MIG-018 | Production Build Verification | Clean `rm -rf .next && npm run build` with 0 errors, 0 new warnings | 15 min | Build pipeline | Build artifact size ±10% of pre-migration. No console warnings. | SOC 2 CC7.2 (system operations) | Build output is what deploys to Vercel. Must match pre-migration behavior. | **LOW COMPLEXITY** — Build. Warning: Next.js 16 may change output structure. Verify `_next/static` paths. |
| MIG-019 | Dev Server Smoke Test | `npm run dev`, curl `/`, `/command-center`, `/api/crm/daily-digest` | 30 min | Runtime validation | All endpoints return 200 with valid content. No hydration errors in browser console. | SOC 2 CC7.2 | Smoke test touches live Supabase via API routes — read-only, no data mutation. | **MODERATE COMPLEXITY** — Requires dev server + local env. Hydration errors (React 19 strict mode) may surface. |
| MIG-020 | Test Suite Verification | `npm test` and `npm run test:all` pass | 30 min | Test pipeline | 100% test pass rate. No new snapshot failures. | SOC 2 CC6.6 (secure development), ISO 27001 A.14.2.9 | Tests validate business logic — failures may indicate regression in client data handling. | **MODERATE COMPLEXITY** — Jest with jsdom. React 19 may change component lifecycle timing. |
| MIG-021 | Type-Check Verification | `npm run type-check` (tsc --noEmit) passes | 15 min | Type safety | 0 TypeScript errors, 0 new warnings. | SOC 2 CC6.6 | Type safety prevents runtime errors that could expose data. | **LOW COMPLEXITY** — Type check. |

### B.6. Documentation & Handoff

| Task ID | Deliverable | Functionality Best Practices | Delivered Timeline | Project Scope | Defining Success | Reporting on Compliance / Regulation | Legal Professional Considerations | Overview & Technical Reviews |
|---------|------------|------------------------------|-------------------|---------------|------------------|--------------------------------------|-----------------------------------|-----------------------------|
| MIG-022 | Migration Report | `docs/margot/react-19-next-16-migration-report.md` with change log, verification checklist, rollback procedure | 1 hour | Documentation | Report reviewed and approved. Rollback procedure tested (at least documented). | SOC 2 CC7.2 (change documentation), ISO 27001 A.12.1.1 (change management procedures) | Report serves as audit trail for framework upgrade. Required for SOC 2 Type II evidence. | **LOW COMPLEXITY** — Documentation. |
| MIG-023 | Skill Update | `nexus-security-dr` skill updated with migration record | 15 min | Skill maintenance | Skill references migration branch and report. | N/A | N/A | **LOW COMPLEXITY** — Skill patch. |
| MIG-024 | Final Push | Branch pushed to origin, PR opened for review | 15 min | Git workflow | PR passes CI. At least one reviewer approves. | SOC 2 CC6.1, CC6.3 | PR review is mandatory per branch protection. No direct push to main. | **LOW COMPLEXITY** — Git operations. |

### B.7. Post-Migration Work (Deferred)

| Task ID | Deliverable | Functionality Best Practices | Delivered Timeline | Project Scope | Defining Success | Reporting on Compliance / Regulation | Legal Professional Considerations | Overview & Technical Reviews |
|---------|------------|------------------------------|-------------------|---------------|------------------|--------------------------------------|-----------------------------------|-----------------------------|
| POST-001 | TailwindCSS v4 Migration | 3.x → 4.x with CSS-based config, no `tailwind.config.js` | 2–3 days | Out of scope for React/Next migration. Separate plan required. | Design system renders identically. Bundle size reduced. | N/A | N/A | **HIGH COMPLEXITY** — Breaking config changes. Plugin API different. `tailwindcss-animate` compatibility unknown. **DEFERRED**. |
| POST-002 | @tsparticles/react v3 → v4 | Upgrade if v3 fails with React 19, or remove if unused | 2–4 hours | Evaluate bundle usage first | Either v4 working or package removed from bundle. | N/A | N/A | **MODERATE COMPLEXITY** — Major version upgrade with API changes. Check if tsparticles is actually rendered on any page before upgrading. |
| POST-003 | Remaining 76 Outdated Dependencies | Batch-update remaining npm packages post-migration | 2–3 days | After React/Next stable | `npm audit` shows 0 moderate+ vulns. `npm outdated` shows only major versions. | SOC 2 CC6.6, PCI-DSS 6.5 | Security updates may be mandatory for PCI compliance if vulnerabilities affect payment flows. | **MODERATE COMPLEXITY** — Batch updates risk regression. Requires phased approach similar to React/Next migration. |

---

## Cross-Cutting Concerns

### Security Posture

| Concern | Current State | Target State | Owner |
|---------|--------------|--------------|-------|
| Secret scanning (gitleaks) | ACTIVE — pre-commit hook | Keep active | Engineering |
| Dependency vulnerability scanning (Deepsec) | FIXED — 1,845 matches need triage | <100 critical matches | Engineering |
| Branch protection | ENFORCED — 1 reviewer, admin rules | Keep enforced | Engineering |
| npm audit | 76 outdated, 3 moderate XSS | 0 moderate+ | Engineering |
| SSL certificate | Valid until 2026-07-27 (57 days) | Auto-renewal configured | DevOps |

### Compliance Mapping

| Standard | Requirement | Evidence Location |
|----------|-------------|-------------------|
| **SOC 2 Type II** | CC6.1 Logical access, CC6.3 Access removal, CC6.6 Security infrastructure, CC6.7 Encryption, CC7.1 Security operations, CC7.2 System monitoring, CC7.4 System recovery | `docs/runbooks/`, `.github/workflows/`, branch protection settings |
| **ISO 27001:2022** | A.9.1.2 Access to networks, A.9.4.3 Password management, A.10.1.2 Key management, A.12.1.1 Change management, A.12.1.2 Change management procedures, A.12.3.1 Info backup, A.12.5.1 Installation of software, A.12.6.1 Management of technical vulnerabilities, A.14.2.9 System acceptance testing, A.17.1.1 Planning, A.17.1.3 Verify backup procedures | Migration plan, DR runbooks, env inventory, API key inventory |
| **AU Privacy Act 1988** | APP 11 Security, APP 1 Openness | DR assessment, incident response procedures |
| **PCI-DSS v4.0** | 3.6 Key management, 6.5 Address common coding vulnerabilities, 8.2 Additional security measures, 9.5 Backup media storage, 12.10.1 Incident response plan | API key inventory, branch protection, DR runbook |

### Legal Professional Checklist

| Item | Status | Notes |
|------|--------|-------|
| Supabase DPA (Data Processing Addendum) | Active | Standard Supabase terms |
| Stripe Terms of Service | Active | Restricted API keys in use |
| 1Password Business Terms | Active | SSO not yet configured |
| ElevenLabs Terms | Active | Usage caps configured |
| Vercel Terms | Active | Pro plan |
| GitHub Enterprise/Pro Terms | Active | Branch protection enabled |
| AU Privacy Act compliance | In progress | Incident response covers 72h notification |
| Client data handling policy | Draft | Needs legal review before SOC 2 audit |
| PITR cost approval | Board decision pending (~$10/month) | Minutes required |

---

## Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|------------|--------|------------|-------|
| R01 | React 19 codemod misses edge cases | Medium | Medium | Manual review of all 162 forwardRef; type-check gate | Engineering |
| R02 | Next.js 16 App Router API breaking change undetected | Medium | High | Comprehensive smoke test of all dynamic routes; `headers()`/`cookies()` audit | Engineering |
| R03 | Peer dependency conflict blocks build | Low | High | Phase 3 dedicated reconciliation; `--legacy-peer-deps` as last resort | Engineering |
| R04 | @tsparticles/react v3 incompatible with React 19 | Medium | Low | Evaluate removal if unused; upgrade to v4 if critical | Engineering |
| R05 | Bundle size regression | Medium | Low | Compare `next build` output size pre/post migration | Engineering |
| R06 | Test flakiness from React 19 timing changes | Medium | Low | Run tests 3×; fix flaky tests before migration | Engineering |
| R07 | Mac Mini hardware failure during migration | Low | High | All work is in GitHub; no local-only state. DR runbook covers this. | Phill |
| R08 | PITR not approved → 24h RPO persists | Medium | Medium | Document in risk register; quarterly Board review | Board |
| R09 | Deepsec 1,845 matches create alert fatigue | High | Medium | Triage to <100 critical; weekly review cadence | Security Lead |
| R10 | 76 outdated dependencies include exploitable vuln | Medium | High | Separate dependency update sprint post-migration | Engineering |

---

## Decision Log

| Date | Decision | Rationale | Approved By |
|------|----------|-----------|-------------|
| 2026-05-31 | Use `~/.local/bin` for PostgreSQL binaries | No brew available; user-scoped avoids sudo; portable | Engineering |
| 2026-05-31 | Fix `core.hooksPath` from `.husky/_` to `.githooks` | `.husky/_` was generic loader; gitleaks hook was dormant in `.githooks/` | Engineering |
| 2026-05-31 | Use JSON payload for GitHub branch protection API | CLI `-f` sends strings; API rejects string "true" for boolean fields | Engineering |
| 2026-05-31 | Replace stale Supabase project ID everywhere | Type generation and migrations targeted non-existent project | Engineering |
| 2026-05-31 | Defer TailwindCSS v4 to separate migration | Different breaking changes; needs design system regression testing | Engineering |
| 2026-05-31 | PITR enablement requires Board approval | ~$10/month cost; budget authority rests with Board | Board (pending) |
| 2026-05-31 | React 19 / Next.js 16 migration precedes dependency batch update | Framework upgrade is higher leverage; dependency updates may depend on framework peer requirements | Engineering |

---

## Next Actions (Immediate)

1. **Board Member approval:** Approve React 19 / Next.js 16 migration execution (this plan)
2. **Board Member approval:** Approve PITR enablement (~$10/month)
3. **Engineering:** Execute Phase 0 (Task MIG-001 through MIG-003) — branch creation, baseline verification, inventory
4. **Engineering:** Execute Phase 1 (Task MIG-004 through MIG-008) — React 19 upgrade with codemod
5. **Engineering:** Gate at Phase 1 — all green before Next.js 16

---

*Plan generated: 2026-05-31*  
*Author: Senior Project Manager (Hermes Agent)*  
*Review: Engineering Lead + Board Member required before execution*
