# Three Workstreams Sequenced (post Plan 2)

> Date: 2026-05-12 — written after Plan 2 (Integration Mesh) shipped.
> Covers: token wiring, Plan 3 execution, Plan 4 execution. Anchors against
> the existing plan files for Plan 3 and Plan 4 — does not duplicate their
> content.

## Dependency graph

```
  [WS1: 4 tokens + Hermes 1P cron]   ← Phill, ~30 min
            │
            ▼  (crons fire for 24-48h, integration_* tables populate)
  [WS2: Plan 3 — Developer Activity View]   ← Claude swarm, ~6-8h actual
            │
            ▼
  [Plan 3 verified + shipped]

  [WS3: Plan 4 — Voice rewrite]     ← Phill voice + Claude scaffold, ~3-5 days
            │  (independent — no DB dependency, can start in parallel with WS2)
            ▼
  [Plan 4 verified + shipped]
```

**Recommended sequencing:**
1. **Tonight (~30 min):** WS1 — set tokens + write Hermes 1P cron
2. **Tomorrow + next 24h passive:** crons fire, data accumulates
3. **Day 2-3:** WS2 swarm cycle
4. **Day 2-5 in parallel with WS2:** WS3 voice rewrites

---

## Workstream 1 — Token wiring (Phill action, tonight)

**Goal:** unblock 3 of 9 integration crons currently returning empty syncs, plus wire the 1Password Hermes cron.

### Tokens to set on Vercel prod

Each via `https://vercel.com/unite-group/unite-group/settings/environment-variables`. Production target only.

| Env var | Where to get | Scope |
|---|---|---|
| `RAILWAY_INTEGRATION_TOKEN` | https://railway.com/account/tokens — "Create token" | Read all projects/services |
| `RAILWAY_PROJECT_IDS` | Railway dashboard → each project → Settings → Project ID. Comma-separate. | (no scope; just a list) |
| `DIGITALOCEAN_INTEGRATION_TOKEN` | https://cloud.digitalocean.com/account/api/tokens — "Generate New Token" | Read scope on Apps, Droplets, Databases |
| `COMPOSIO_API_KEY` | https://app.composio.dev/settings/api-keys | Default |

**Verification:** after each is set, the next cron run (5m for Railway, 15m for DO, hourly for Composio) populates the matching `integration_*` tables. Check `https://supabase.com/dashboard/project/lksfwktwtmyznckodsau/editor` → `integration_railway_services` etc.

### 1Password Hermes cron

`op` CLI doesn't exist in Vercel serverless — the 1P sync runs from Phill's Mac mini via Hermes.

**Two files needed** (Claude can write both as a one-shot task):

1. `~/.hermes/scripts/sync_1password_to_supabase.py`:
   - Uses `op item list --vault X --format json` for each vault in a hardcoded list (or `OP_VAULTS` env)
   - POSTs to `https://lksfwktwtmyznckodsau.supabase.co/rest/v1/integration_onepassword_index` with the `SUPABASE_UNITE_GROUP_SERVICE_KEY` from `~/.hermes/.env`
   - NAMES ONLY — never reads item values
   - Insert-then-sweep pattern (insert with new `fetched_at`, then DELETE `WHERE fetched_at < runTimestamp`)
   - Outputs `[SILENT]` on success to suppress Telegram delivery per Phill's cron conventions

2. `~/.hermes/cron/jobs.json` entry:
   - Name: `Unite-Group 1Password sync`
   - Schedule: `0 4 * * *` (4am AEST daily)
   - Command: `python3 ~/.hermes/scripts/sync_1password_to_supabase.py`
   - Deliver: `telegram` (only on non-silent — i.e. on error)

**Verification:** Hermes cron list shows the new job; first run logs into `~/.hermes/logs/agent.log`; `integration_onepassword_index` populates overnight.

---

## Workstream 2 — Plan 3 — Developer Activity View

**Plan doc:** `docs/superpowers/plans/2026-05-12-unite-group-developer-activity.md` (already exists, 15 tasks).

**Pre-requisite:** Plan 2 integration_github_* + integration_linear_* tables must have data (24-48h of crons firing).

### Sequencing inside Plan 3

| Phase | Tasks | Effort | Pattern |
|---|---|---|---|
| Already shipped | Tasks 3, 4, 5 (types + branch-ticket resolver + activity aggregator + tests) | ✅ done | Earlier swarm |
| Wave A | Task 1 (schema migration) + Task 2 (seed Rana profile) | ~20 min | Single subagent |
| Wave B | Task 6 (repository.buildSnapshot) + Task 7 (API endpoints) | ~30 min | 2 parallel subagents |
| Wave C | Tasks 8-12 (UI components + pages + sidebar) | ~45 min | 3 parallel subagents |
| Wave D | Task 14 (branch-map seeding hook into GitHub sync) + Task 15 (E2E test) | ~25 min | 1 subagent |

Total: ~2 hours wall time + 4 opus-adversary cycles (~30 min) = ~2.5h.

### Verification gates

- Wave A: 2 new tables + Rana row exist via SQL
- Wave B: `GET /api/empire/developers` returns Rana's snapshot with real commit counts (from accumulated integration_github_commits)
- Wave C: `/en/empire/developers` renders with Rana's card + 14-day sparkline
- Wave D: cua-driver visual check of the page (per Phill's computer_use interest)

### Promotion gate

opus-adversary on the full Plan 3 batch before promoting Task 1 schema to prod. Then `apply` via wizard, then `promote` via wizard.

---

## Workstream 3 — Plan 4 — Voice landing rewrite

**Plan doc:** `docs/superpowers/plans/2026-05-12-unite-group-voice-landing-rewrite.md` (already exists, 13 tasks).

**No DB dependency** — can start immediately, in parallel with WS2.

### Split: Claude scaffolds vs Phill voices

| Type | Owner | Tasks |
|---|---|---|
| **Already shipped** | Claude | T1 (voice-rules.ts), T2 (tests), T3 (linter), T9 (PullQuote), T12 (CI), T13 (operator README) |
| **Mechanical** | Claude | T4 (audit CSV from current state — empty since marketing pages don't exist yet), T11 (final lint verify) |
| **Voice — needs Phill** | Phill writes, Claude lints + applies | T5 (homepage rewrite), T6 (About), T7 (Services), T8 (Contact), T10 (FeatureGrid + CTABlock) |

### The collaboration pattern for voice tasks

For each voice task:

1. **Claude:** drafts copy strictly following the Nexus Human Voice Spec v1, runs through brand-guardian linter, surfaces draft to Phill
2. **Phill:** red-lines in one pass (named-human opener stays, verdict moves, em-dashes audited, Aussie register used surgically)
3. **Claude:** applies Phill's edits + re-runs linter to verify 0 errors
4. **Phill:** final 30-second visual review via cua-driver screenshot of the page

Cycle time: ~30 min per page × 5 pages = ~2.5h of Phill time across the week. Claude work asynchronous.

### Voice content gap surfaced earlier

`src/components/marketing/` only contains `LeadGenerationForm.tsx` — no pre-existing `Hero.tsx`, `FeatureGrid.tsx`, `CTABlock.tsx`. Plan 4 Tasks 5 + 10 will need to create these components from scratch, not rewrite existing ones.

### Verification

- Per-page: `npm run brand:lint` returns 0 errors before merge
- Final: visual diff via cua-driver against `unite-group.in` baseline (Claude captures screenshot, Phill confirms)
- CI gate (already shipped in Plan 4 T12): pushes that reintroduce slop are blocked

---

## Coordination

**Daily Margot brief** (already wired via Hermes + margot-align skill): each morning, Margot reports Plan 2 cron-success rate, Plan 3 ticket progress (when filed), Plan 4 page status.

**Per-workstream Linear tickets:** when Phill is ready, Claude files individual Linear tickets per Plan 3 + Plan 4 task so the Pi-Dev-Ops Builder swarm can also pick them up at its 3-PR/day cadence (durable beyond any single session).

**Quality discipline:** every wave runs through opus-adversary before promotion-to-prod. Cycle-1 + cycle-2 lessons (state-row clobber, RLS bound to wrong role, explicit onConflict, per-entity try/catch, insert-then-sweep) are now canonical patterns — explicitly briefed to every subagent.

## Stopping points

Three clean breakpoints if you want to pause:

1. **After WS1** (tokens set, 1P Hermes wired) — Plan 2 fully operational
2. **After WS2** — full Pi-CEO observability of Rana's work
3. **After WS3** — landing voice locked in, CI gate enforces

Each is a complete deliverable on its own. None blocks the others.
