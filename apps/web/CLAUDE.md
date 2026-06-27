# Unite-Group Nexus

@.portfolio/PORTFOLIO.yaml

## Identity (Portfolio SSOT)
**Canonical name:** Unite-Group Nexus _(decided 2026-06-27; supersedes the former "Unite-Hub")_
**Aliases this project answers to:** "Unite-Hub", "Unite Hub", "Unite Group", "Unite-Group", "Unite-Group CRM", "the CRM", "Marketing CRM", "Nexus"
**Canonical repo/path:** `CleanExpo/Unite-Group` → `apps/web` (post-convergence; the former `CleanExpo/Unite-Hub` repo is wound down)

> If the user uses any alias, this is what they mean.
> Do NOT create new repos or clones. Do NOT create folders matching
> `local.do_not_clone_to[]` in `.portfolio/PORTFOLIO.yaml`.

> **Sibling product:** Authority-Site (at `D:\Authority-Site`, repo `CleanExpo/Unite-Group`) is a SEPARATE product.
> Despite the repo name `Unite-Group`, that's the EMPIRE COMMAND CENTER, not this CRM.
> If the user asks about Empire / CEO dashboard / Pi-CEO / portfolio metrics → switch to that project.
> Otherwise (CRM / contacts / drip campaigns / email AI / marketing) → stay here.

---

## NorthStar Doctrine

**The NorthStar:** a real, comprehensive, working founder CRM **in production** where **every section is GREEN** —
real data + auth + founder-scope + loading/error + verify-pass. **200 ≠ real**: a rendered page or green CI
tick is not evidence; real founder-scoped data behind auth is.

**No-Invaders rule** — reject all seven on sight:
1. No fake-as-real (mock/hardcoded data shown as live) — surface `source`, prefer honest "not_connected".
2. No scope-creep — build only what's asked.
3. No new dependencies — use what's in the repo.
4. No duplicate systems — search before creating.
5. No new repos/clones — one canonical repo per product.
6. No shortcut hacks — no `|| true`, `--no-verify`, swallowed errors, bypassed gates.
7. No speculative crons/skills — don't scaffold for unconnected sources/providers.

**Consult [`.skills/custom/northstar-navigator`](.skills/custom/northstar-navigator/SKILL.md) before deciding
what to build, skip, or finish.** It holds the full Definition of GREEN, the Navigation Loop, and the substrate map.

---


## Identity
Private founder CRM for Phill McGurk. NOT a public SaaS. One user.
Stack: Next.js 16 App Router (src/ root), React 19, Supabase, Vercel, Tailwind CSS, pnpm monorepo. No FastAPI, no Python backend.
Design: Scientific Luxury — OLED Black `#050505`, Cyan `#00F5FF`, `rounded-sm` only.
Locale: en-AU | DD/MM/YYYY | AUD | AEST/AEDT

## Agent Routing Rules
ALWAYS delegate to subagents. Never do the work yourself.

### Parallel dispatch (ALL conditions met):
- 3+ unrelated tasks across different domains
- No shared state between tasks
- Clear file boundaries with no overlap

### Sequential dispatch (ANY condition triggers):
- Tasks have dependencies (B needs output from A)
- Shared files or state (merge conflict risk)
- Unclear scope (need to understand before proceeding)

## Subagent Invocation Protocol
Every dispatch MUST include:
1. Exact scope (which files, which routes)
2. Success criteria (what done looks like)
3. Relevant file references
4. Constraints (what NOT to touch)

## Available Agents — Nexus Rebuild Team
- `project-manager`    — planning, specs, Linear issues, roadmap
- `senior-fullstack`   — Next.js/React/Supabase implementation
- `database-architect` — schema, migrations, RLS, type generation
- `frontend-designer`  — UI components, Notion sidebar, layouts
- `api-integrations`   — Xero, Gmail, Calendar, Stripe, Linear, social
- `code-auditor`       — forensic audit, dead code, security scan (READ ONLY)
- `devops-engineer`    — Vercel, CI/CD, env config, monitoring
- `qa-tester`          — E2E tests, smoke tests, verification gate

## Existing Specialist Agents (pre-rebuild)
See `.claude/agents/` for: frontend-specialist, database-specialist,
security-auditor, test-engineer, verification, spec-builder,
deploy-guardian, orchestrator, and 23 others (31 total).

## Critical Rules
- DB queries: always `.eq('founder_id', founderId)` — NEVER workspace_id
- Auth: Supabase PKCE server-side only. Single-tenant.
- Source of truth: `.claude/memory/CONSTITUTION.md`

## Environment Variables (Vercel)
NEVER delete or modify these without understanding the impact:
- `ANTHROPIC_API_KEY` — Claude API. Powers Bron, Advisory, Strategy, Experiments. CRITICAL.
- `VAULT_ENCRYPTION_KEY` — AES-256-GCM encryption for credentials vault. CRITICAL.
- `SUPABASE_SERVICE_ROLE_KEY` — Bypasses RLS for server-side operations. CRITICAL.
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL. PUBLIC.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key. PUBLIC.
- `CRON_SECRET` — Validates scheduled jobs (bookkeeper). CRITICAL.
- `FOUNDER_USER_ID` — Founder's Supabase auth UUID. Used by CRON jobs.

Integration keys (optional — features degrade gracefully):
- `XERO_CLIENT_ID/SECRET` — Xero accounting OAuth
- `GOOGLE_CLIENT_ID/SECRET` — Gmail + Calendar OAuth
- `LINEAR_API_KEY` — Linear issue tracking sync
- `FACEBOOK_APP_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET` — Social OAuth

## Vault Index

Wiki-link syntax for O(1) asset discovery. Canonical index: `.claude/VAULT-INDEX.md`

**Resolution rules**:
- `[[orchestrator]]` → `.claude/agents/orchestrator/agent.md`
- `[[type/id]]` → `.claude/{type}/{id}` (e.g., `[[rules/core]]` → `.claude/rules/core.md`)
- `[[id#section]]` → Asset file, specific heading (e.g., `[[orchestrator#routing]]`)
- Fuzzy threshold: 0.8 (handles plurals, case variation)

**When to use**: Before searching the codebase, check the Vault Index for known assets.

## Human Goal Translation

Map common outcome phrases to concrete checklists:

| Phrase | Translates To |
|--------|--------------|
| "Make it work" | Type-check passes + tests pass + no runtime errors |
| "Ship it" | Verify → commit → push → create PR → deploy |
| "Clean this up" | Lint + format + remove dead code + simplify |
| "Is this safe?" | Security audit + RLS check + env var audit + OWASP scan |
| "Make it fast" | Lighthouse audit + bundle analysis + query optimisation |
| "Make it pretty" | Design tokens compliance + Scientific Luxury review + responsive check |

## Blueprint-First Protocol

For structured task execution, use the Blueprint DAG system:

- **Blueprints**: `.claude/blueprints/` — DAGs for feature, bugfix, migration, refactor
- **Minion command**: `/minion` — One-shot execution with hard iteration caps
- **Harness protocol**: `.claude/AGENT_HARNESS.md` — Multi-agent convergence for complex tasks (3+ agents)
- **Routing**: Orchestrator decides — simple tasks → Minion, complex tasks → Harness
