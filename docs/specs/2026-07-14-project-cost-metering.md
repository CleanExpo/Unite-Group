# Spec — Project Cost Metering & Clean-Data Foundation (Unite-Group Nexus CRM)

**Status:** DRAFT · **Date:** 2026-07-14 · **Owner:** Founder (Phill) · **Author:** Claude (Opus 4.8)
**Program:** Unite-Group Nexus CRM — Operations Layer
**Related workstreams (separate specs):** WS2 Email capture + Margot email agent + calendar/Kanban/Telegram · WS3 Estate data cleanse

---

## 1. North Star

Every project/business in the Nexus has a **true, per-project P&L** built from **clean** data: all costs attributed to the right business, all revenue matched, no cross-pollinated ("dirty") records. Decisions (which businesses earn their keep, where the burn is) run on numbers we trust.

> Today the data is cross-pollinated (e.g. RestoreAssist's GBP resolves to Disaster Recovery's listings; a decommissioned `unite-hub` still runs as a live Vercel project). This spec fixes the **cost/attribution** half; WS3 handles the broader cleanse.

## 2. Goals / Non-goals

**Goals**
- Per-business, per-period **cost** capture across all sources (extensible — "there are just so many").
- Per-business **revenue** capture (Stripe) → per-project P&L.
- **Attribution engine** that maps every cost to a business (incl. shared-resource splitting) and flags what it can't map.
- **Cost-leak & anomaly alerts** (orphaned projects, decommissioned-but-billing, spikes).
- A **quarantine-first** data-quality workflow (detect → quarantine → founder-gate fix → verify).

**Non-goals (this spec)**
- Writing to / mutating any source billing system (read-only only).
- Automated deletion of "dirty" data (always founder-gated, WS3).
- The email/agent/calendar/Kanban/Telegram layer (WS2).

## 3. Success criteria (measurable)
1. Each in-scope business shows a monthly cost total broken down by source, in **AUD**.
2. ≥95% of ingested cost records are auto-attributed to a business; the rest land in an **Unattributed** queue (never silently dropped).
3. Revenue (Stripe) matched per business → P&L (revenue − cost) per project per month.
4. Cost-leak alerts fire for: projects with no owning business, decommissioned businesses still incurring cost, >X% MoM spikes.
5. Zero writes to any source system during ingestion (audited).

## 4. Constraints & safety (binding)
- **Read-only ingestion** via connected MCP tokens / scoped API keys. **No typing account passwords into login forms** — ever.
- Sources not reachable by an existing token (e.g. ElevenLabs, Twilio, some registrars) require a **scoped, read-only API key** the founder provisions — a **credential gate**, surfaced not bypassed. No credential-hunting across envs ([[media-gen-credential-hygiene]]).
- All source secrets live in the platform secret store (Vercel/1Password) — never in repo, never logged.
- Any write to *our* CRM DB that changes/deletes existing records is **founder-gated** ([[fake-data-cleanse-initiative]]); ingestion only inserts into new metering tables.
- Currency **AUD**; dates **DD/MM/YYYY**; AU English.

## 5. Scope

**Businesses (client-facing):** Synthex, RestoreAssist, CCW, Unite-Group, Disaster Recovery, NRPG, CARSI, ATO, DIY Home Loan (Home-Loan-Essentials), ITR-Button.
**Internal cost centres (not billed to a client, but metered):** Pi-Dev-Ops, Fabel, Plaud, Nexus/live-nexus, brain-1, sandboxes.
**Unmapped (must be resolved):** `cruise-ship-discount-finder` (owner?), `unite-hub` (decommissioned — teardown candidate).

**Cost sources (tiered by reachability):**

| Tier | Source | Reach today | Notes |
|------|--------|-------------|-------|
| A (MCP/token now) | **Vercel** | ✅ connected MCP | per-project usage/bandwidth/functions |
| A | **Stripe** | ✅ MCP (/mcp) | revenue + processing fees (P&L income side) |
| A | **Railway** | ✅ MCP | backend/service usage |
| A | **Supabase** | ✅ MCP | DB/project costs |
| B (needs scoped key) | **Anthropic / OpenAI** | key gate | LLM API spend + subscriptions |
| B | **ElevenLabs** | key gate | voice API |
| B | **Twilio** | key gate | phone/SMS |
| B | **Domain registrars / other SaaS** | key gate | registrations, misc |

## 6. Architecture

```
[ Source Adapters ]  →  [ Ingestion (read-only, scheduled) ]  →  [ raw_cost_events ]
        |                                                              |
   wayfinder (discovery/mapping: which accounts/projects exist,        v
   which business owns them)                              [ Attribution / Allocation engine ]
                                                                       |
                                                       [ cost_records (attributed, AUD) ] ──► [ Dashboards / P&L / Alerts ]
                                                                       |
                                                       [ Unattributed queue ] ──► founder resolves
```

- **CostSourceAdapter interface** (pluggable — this is the "so many sources" answer):
  `id`, `listAccounts()`, `fetchCosts(period) → RawCostEvent[]`, `reachability: 'token' | 'key-gate'`, `nativeCurrency`.
  Each source (Vercel, Stripe, Railway, …) implements it. New source = new adapter, no core change.
- **wayfinder** = the discovery/mapping layer: enumerates accounts/projects across sources and proposes the project→business mapping (the founder-named skill; folds in here once located). Until then, a static mapping table seeded from the Vercel inventory (§10) does the job.
- **Ingestion**: scheduled (cron), read-only, idempotent (dedupe on `source+externalId+period`). FX to AUD at period rate.
- **Attribution engine**: rule-based (project→business map) + shared-cost **allocation policy** (e.g. `dr-nrpg-platform` split DR/NRPG; a shared LLM key split by usage or by a fixed ratio). Anything unmatched → Unattributed queue.

## 7. Data model (new tables — insert-only during ingestion)

- `cost_source` — registry (id, name, reachability, native_currency, enabled).
- `raw_cost_event` — source, external_id, period_start/end, amount, currency, raw_json, ingested_at. (immutable audit)
- `cost_record` — business_id, cost_source_id, period, amount_aud, allocation_note, raw_cost_event_id. (attributed, queryable)
- `allocation_rule` — matches raw events → business(es) with split weights.
- `unattributed_cost` — raw events the engine couldn't map (founder resolves → becomes an allocation_rule).
- `revenue_record` — business_id, period, amount_aud, stripe_ref. (P&L income)
- `data_quality_flag` — entity, rule, severity, status(open/quarantined/resolved), evidence. (drives the cleanse)

*Foreign key to the existing business/org entity — location TBD (see Open Decisions).*

## 8. Cleanup workflow (quarantine-first — the "clean data" ask)
1. **Detect** — rules over ingested + CRM data: orphaned project (no business), decommissioned business still costing, duplicate/cross-pollinated linkage (e.g. RA↔DR GBP), unmapped project.
2. **Quarantine** — write a `data_quality_flag` (status=quarantined) + evidence. **Never delete.**
3. **Founder gate** — surface the flag with the exact fix; founder approves.
4. **Fix + verify** — apply the approved change, re-run the detection rule to confirm resolved.

**Seed findings (already proven this session):**
- RestoreAssist GBP connection resolves to DR/NRPG listings → mis-attribution risk.
- `unite-hub` decommissioned but a live Vercel project → cost leak.
- `cruise-ship-discount-finder` unmapped to a business.

## 9. Phases
- **P0 — Read-only inventory** *(started)*: enumerate sources + projects; seed project→business map. Vercel done (§10).
- **P1 — Core + Tier-A adapters**: data model + Vercel + Stripe adapters + attribution engine + Unattributed queue. First real per-project cost + revenue.
- **P2 — Tier-A complete**: Railway + Supabase adapters; allocation rules for shared resources.
- **P3 — Tier-B (key-gated)**: Anthropic/OpenAI, ElevenLabs, Twilio, domains — each behind a founder-provisioned scoped key.
- **P4 — Dashboard + alerts**: per-project P&L, burn, cost-leak alerts.
- **P5 — Cleanse workflow live**: detection rules + quarantine queue wired to the founder gate.

## 10. Findings so far — Vercel footprint (P0)
21 projects on team `unite-group`, mapping: Synthex(synthex,+sandbox) · RestoreAssist(restoreassist,+sandbox) · CCW(ccw-crm-web,+sandbox) · Unite-Group(unite-group,+sandbox) · DR/NRPG(disaster-recovery, dr-nrpg-platform, dr-nrpg-sandbox) · CARSI(carsi-web) · ATO(ato-app) · DIY Home Loan(home-loan-essentials) · ITR-Button(dimitri-itr-sandbox) · internal(pi-dev-ops, fabel-prompt-engineer, plaud-processor, live-nexus) · **unite-hub ⚠️ cost leak** · **cruise-ship-discount-finder ⚠️ unmapped**.

## 11. Open decisions (need founder)
1. **Target app** — where does metering live? `unite-group` (Authority Hub), `NEXUS`/`live-nexus`, or Synthex's existing multi-tenant DB (where the business/org entities + tenants already are)? *Recommendation:* attach to wherever the canonical business/org entity lives to avoid a duplicate tenant list — appears to be Synthex; confirm.
2. **wayfinder skill** — exact repo/path (not found in any CleanExpo repo tree as of this date).
3. **Allocation policy** for shared resources (dr-nrpg, shared LLM keys): usage-based vs fixed ratio.
4. **Tier-B credentials** — which scoped read-only keys the founder will provision (Anthropic, OpenAI, ElevenLabs, Twilio, registrars).

## 12. Related workstream (captured, spec next)
**WS2 — Email + Margot agent + surfaces:** capture *all* inboxes (today the Gmail connector only sees phill.mcgurk@gmail.com — [[gmail-mcp-account-scope]]); a per-business **Margot agent** that drafts/replies in the founder's voice (confirm-before-send); route to **calendar**, a **Kanban** board, and **Telegram**. To be specced separately; shares the same safety model (draft-review gate, no autonomous sends).
