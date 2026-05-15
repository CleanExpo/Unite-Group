---
type: wiki
updated: 2026-05-11
---

# AIP First-Slice Ontology — Concrete Schema

Plan-agent output 2026-05-11. Companion to [[aip-architecture]]. Grounded in today's [[Google Account sprawl audit]] (Tasks #10/#15/#17).

**Status (2026-05-11):**
- ✅ Architectural decisions LOCKED (see § below)
- ✅ Day-1 scaffold shipped — `feat/aip-day-1-scaffold` merged to `main` at `4c5cd03`, migrations applied to Pi-CEO Supabase (`zbryrmxmgfmslqzizsto`)
- 🔁 **Days 2-5 PAUSED — pivoted per Margot's Path D Hybrid recommendation** (see [[aip-architecture]] § "Build vs buy — DECIDED"). Custom action runtime / MCP server / file-watcher work re-shaped to fire through Palantir Foundry's Logic-functions API once Foundry is procured. Day-1 typed primitives + Supabase tables retain their role as the **transactional / hot-path layer** in the hybrid architecture.
- ⏳ Critical path is now Foundry procurement (AU sales contact, Foundry-AU region confirmation, contract). Day-1 work is operational; no further Day-2+ code until procurement track produces a Foundry tenancy.

## 1. Ontology primitives (the vocabulary)

Four base concepts. Every higher-order type composes from these.

```ts
// packages/aip-core/src/types/primitives.ts

export interface Entity<TKind extends string = string, TProps = unknown> {
  uri: string;             // aip://unite-group/{kind}/{id}
  kind: TKind;             // discriminator
  id: string;              // ULID, stable across renames
  properties: TProps;
  created_at: string;
  updated_at: string;
  source: SourceRef;
}

export type Property =
  | { kind: "string";   value: string }
  | { kind: "number";   value: number }
  | { kind: "boolean";  value: boolean }
  | { kind: "json";     value: unknown }
  | { kind: "datetime"; value: string }
  | { kind: "embedding"; value: number[]; dim: 1536 }
  | { kind: "ref";      value: string };

export interface Relationship<TKind extends string = string, TProps = unknown> {
  uri: string;
  kind: TKind;
  from_uri: string;
  to_uri: string;
  cardinality: "1:1" | "N:1" | "1:N" | "N:N";
  properties?: TProps;
  created_at: string;
}

export interface Action<TName extends string, TParams, TResult> {
  name: TName;
  params: TParams;
  permission: string;      // dot-namespaced gate
  execute: (ctx: ActionContext, p: TParams) => Promise<TResult>;
  audit_fields: AuditMeta;
}

export interface SourceRef {
  origin: "wiki" | "audit" | "mcp" | "manual" | "agent";
  ref: string;
  ingested_at: string;
}
```

Postgres — three core tables:

```sql
create table aip_entities (
  uri          text primary key,
  kind         text not null,
  id           text not null,
  properties   jsonb not null default '{}'::jsonb,
  source       jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (kind, id)
);
create index aip_entities_kind_idx on aip_entities (kind);
create index aip_entities_props_gin on aip_entities using gin (properties jsonb_path_ops);

create table aip_relationships (
  uri          text primary key,
  kind         text not null,
  from_uri     text not null references aip_entities(uri) on delete cascade,
  to_uri       text not null references aip_entities(uri) on delete cascade,
  cardinality  text not null check (cardinality in ('1:1','N:1','1:N','N:N')),
  properties   jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (kind, from_uri, to_uri)
);
create index aip_rel_from_idx on aip_relationships (from_uri, kind);
create index aip_rel_to_idx   on aip_relationships (to_uri, kind);

create table aip_action_log (
  id           bigserial primary key,
  action       text not null,
  actor        text not null,
  params       jsonb not null,
  permission   text not null,
  affected     text[] not null,
  before_hash  text,
  after_hash   text,
  result       jsonb,
  error        text,
  started_at   timestamptz not null,
  ended_at     timestamptz
);
create index aip_action_log_actor_idx on aip_action_log (actor, started_at desc);
```

**Why this shape:** jsonb properties keep the schema portable; hot fields can promote to generated columns per-kind without breaking the API; three-table base is open-standard SQL — no Supabase lock-in.

## 2. First-slice entity types (Google account audit)

Five concrete kinds:

- `GoogleIdentityEntity` — email, kind (workspace/personal/service), onepassword_item_id?, recovery_email?, last_active_at?
- `GcpProjectEntity` — project_number, project_id, owner_identity_uri, billing_account?
- `VercelProjectEntity` — vercel_project_id, slug, team_id, current_git_sha?, framework
- `OAuthClientEntity` — client_id, secret_rotated_at?, authorized_origins[], authorized_redirect_uris[], status, gcp_project_uri
- `PortfolioServiceEntity` — slug (dr/nrpg/carsi/ccw/synthex/unite/ra), brand_name, current_git_sha?, status, wiki_page_path?

Per-kind Postgres views (auto-generated, exposed as `/rest/v1/v_google_identity` etc.).

## 3. Relationships

| Relationship | Cardinality | Edge Properties |
|---|---|---|
| `OAuthClient.belongsTo(GcpProject)` | 1:1 | — |
| `GcpProject.ownedBy(GoogleIdentity)` | N:1 | since_date |
| `VercelProject.ownedBy(GoogleIdentity)` | N:1 | role |
| `PortfolioService.deploysTo(VercelProject)` | 1:1 | — |
| `PortfolioService.authsVia(OAuthClient)` | 1:N | purpose |
| `PortfolioService.usesGcp(GcpProject)` | 1:N | — |
| `GoogleIdentity.recoversTo(GoogleIdentity)` | N:1 | — |

All relationships live in the single `aip_relationships` table. Traversal via typed Postgres CTE or GraphQL resolver — one round-trip resolves the OAuth-client → GCP-project → owning-identity chain (the question today's audit needed).

## 4. Actions — the seven verbs

Actions are the **only** write path. Each: typed params (zod), permission gate, audit (before/after hashes), logged to `aip_action_log`.

1. **`RotateOAuthSecret(client_uri, reason)`** — perm `workspace.secrets.rotate`. Regenerates in GCP → 1Password → Vercel env → redeploys.
2. **`MigrateVercelOwner(vercel_project_uri, from_id_uri, to_id_uri)`** — perm `vercel.team.owner`. Invites new owner, demotes old, updates ownedBy edge.
3. **`LinkSourceToWiki(entity_uri, wiki_page_slug)`** — perm `wiki.link`. Wiki→Entity binding helper.
4. **`SaveToOnePassword(item_data, owning_entity_uri)`** — perm `secrets.write`. Creates 1P item, writes back item_id.
5. **`RunMargotResearch(topic, audience, related_entity_uris)`** — perm `research.deep`. Returns interaction_id, creates ResearchInteraction entity.
6. **`SeedAuditFinding(kind, properties, source)`** — perm `audit.seed`. Idempotent upsert for manual audit data.
7. **`AssertRelationship(from_uri, kind, to_uri, properties)`** — perm `ontology.write`. Atomic edge create/update with cardinality enforcement.

LLM-agent invocation JSON:
```json
{
  "action": "RotateOAuthSecret",
  "params": { "client_uri": "aip://unite-group/OAuthClient/carsi-prod", "reason": "Q2 rotation" },
  "actor": "agent://pi-ceo/margot",
  "idempotency_key": "rot-carsi-prod-2026Q2"
}
```

## 5. Wiki↔Entity bridge contract

- Wiki page frontmatter MAY declare `aip_uri:` — that page is the canonical human document for that Entity
- Structured facts live in a fenced ```aip block (parseable as YAML); prose stays as markdown body
- **v1 — Wiki → Entity (one-way):** file-watcher on `~/2nd Brain/2nd Brain/Wiki/` reads frontmatter + fenced block on save, calls `SeedAuditFinding` / `AssertRelationship`
- **v2 — Entity → Wiki (deferred):** Action executions emit markdown-patch events; follow-up job rewrites the fenced block (frontmatter + fenced split = safe to overwrite the machine portion without touching prose)
- `[[wikilinks]]` between pages translate to `Relationship` rows on save

## 6. Build location + 5-day sequence

**Location:** `~/Pi-CEO/Pi-Dev-Ops/aip/` (NOT a new repo). Shares Supabase + Vercel + MCP server registration with the swarm. Self-contained workspace — lifts out cleanly later if Phill wants to extract.

```
~/Pi-CEO/Pi-Dev-Ops/aip/
  src/types/{primitives,entities,relationships}.ts
  src/api/route.ts          # /aip/entities, /aip/traverse, /aip/actions/:name
  src/actions/*.ts          # 7 first-slice actions
  src/mcp/aip-server.ts     # MCP wrapper: aip_get_entity, aip_list, aip_traverse, aip_invoke_action, aip_log_tail
  src/seed/audit-2026-05-11.ts

~/Pi-CEO/Pi-Dev-Ops/supabase/migrations/
  20260512_aip_core.sql
  20260512_aip_views.sql
  20260512_aip_apply_action.sql
```

**Day-by-day:**

- **Day 1:** migrations + types + seed script. Audit findings land in DB.
- **Day 2:** `/aip/entities` + `/aip/traverse` read endpoints + zod validators.
- **Day 3:** action runtime + first three actions (Seed, Assert, LinkToWiki).
- **Day 4:** MCP server + register in Pi-CEO swarm. Margot can query.
- **Day 5:** remaining 4 actions + Wiki frontmatter file-watcher (Wiki→Entity only).

**Week-1 shippable:** `GET /aip/entities/aip://unite-group/PortfolioService/carsi?expand=deploysTo,authsVia,belongsTo,ownedBy` returns the full ownership chain in one round-trip.

## 7. What this isn't yet

- Not Palantir Workshop (no-code app builder) — slice 3+
- Not data integration pipelines — slice 2; seed scripts + file-watcher only for now
- Not multi-tenant — single tenant `unite-group` hard-coded in URIs
- Not Entity→Wiki sync — v1 is Wiki→Entity only
- Not pgvector semantic search — embedding Property kind wired, index lands slice 2
- Not Foundry-style branching/versioning — `aip_action_log` gives audit, not full history snapshots

## Architectural decisions — LOCKED 2026-05-11 (Phill)

Three calls that thread through every entity, every relationship, every log row. Decided before Day-1 code:

1. **URI scheme — `aip://unite-group/{kind}/{id}`** (opaque, MCP-routed). Reason: mirrors Foundry's URN pattern, doesn't trap us into HTTP, works locally without DNS, and an HTTPS resolver can be added later without breaking existing references. Reverse migration would be much harder.
2. **Wiki ↔ Entity bridge — frontmatter + fenced ```aip block** (single-file). Reason: preserves the "one place to read" Obsidian principle, no sidecar clutter, existing INGEST/LINT patterns keep working unchanged. v1 is Wiki→Entity only; if v2 Entity→Wiki write-back proves brittle, sidecar is the documented escape hatch.
3. **Permission model — Supabase RLS now, `aip_grants` later.** Reason: ship the slice in week-1 on the auth surface that's already mature. Plan an explicit upgrade path to per-Entity `aip_grants` when role-based scoping starts to bite (multi-tenant, fine-grained delegation, or Foundry-parity audit demands).

## Critical files (for the build agent to scaffold once approved)

- `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/aip/src/types/primitives.ts`
- `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/aip/src/types/entities.ts`
- `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/supabase/migrations/20260512_aip_core.sql`
- `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/aip/src/api/route.ts`
- `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/aip/src/mcp/aip-server.ts`

## Cross-refs

- [[aip-architecture]] — parent vision page
- [[pi-ceo-architecture]] — co-located with the AIP under Pi-Dev-Ops
- [[agent-memory-patterns]] — pgvector embeddings will land here
- [[Google Account sprawl audit]] — the source data for first-slice seed
