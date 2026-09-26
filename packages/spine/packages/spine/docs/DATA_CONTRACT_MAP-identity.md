# DATA_CONTRACT_MAP — identity section (RA-7753 slice 1a)

What each product's records become in the spine, and the key the resolver deduplicates on.
Written for the engineer building the slice 1b source adapters. Nothing here is wired yet:
slice 1a ships the tables and rules only, and no adapter reads a product database.

**Provenance.** The per-source rows below come from the RA-7753 spec
(`SPEC_SLICE1_IDENTITY.md` §11, Pi-Dev-Ops `.harness/project3b/discovery/`), whose data seat read
the product schemas on 26/09/2026. They are **[UNCONFIRMED] against live databases** until a
slice 1b adapter reads each source and its fixture proves the mapping. RestoreAssist has its own
fuller map: [`../../docs/RA-FIELD-MAPPING.md`](../../docs/RA-FIELD-MAPPING.md).

## Conventions (all sources)

| Rule | Detail |
|---|---|
| Lineage | Every source row maps to exactly one `core.source_record` (UNIQUE `source_system`, `source_pk`). No separate product-account link table. |
| `source_pk` | `Model:<id>` — model-prefixed so different entity streams from one product never collide on one keyspace. |
| Re-point | A linked `source_pk` is never moved to a different party. A conflict keeps the existing link and queues `core.identity_audit` review (strangler/0005). |
| Merge keys | ABN is the only hard key. Email merges only when it is not a role address (`migrate.role_email`); otherwise under-merge and queue review. |
| Credential numbers | Never a `core.party_identifier`. A reused (type, issuer, number) across two holders is flagged for review, not merged. |

## Per-source dedup keys

| Source | Person key | Business key | Business record in the spine |
|---|---|---|---|
| CARSI | `LmsUser.email` | **none** — `LmsTeam` has no ABN | No organization is minted from CARSI alone. A team links to a business only through a person who also appears in a source that carries an ABN. |
| DR-NRPG | `User.email` | **OPEN — D-16.** Candidates: `Contractor` (ABN), `Workspace` (seats), `Tenant` | Default taken by /spm, pending Phill's ruling: **Contractor** for identity and credentials; **Workspace** for seats (slice 2). |
| RestoreAssist | per `RA-FIELD-MAPPING.md` §2 (`User`) | per `RA-FIELD-MAPPING.md` §1 (`Organization.abn`) | Tenant anchor is itself an open RA decision (Organization vs Workspace) — see that file's §1. |

## Where each fact lands (slice 1a tables)

| Fact | Spine table | Notes |
|---|---|---|
| A person worked at a business, from/to | `core.employment` | One row per stint; at most one open per (person, org). Closed only by `core.end_employment()`, which also sets `org_membership.status = 'left'`. |
| A credential and how we know it | `core.credential` | `verification_class` (how we know) is separate from `status` (whether it stands). Verified classes need `verified_at` + `verification_method` + `evidence_ref`. |
| CARSI completion credit claimed by the provider | `carsi.training_credential.iicrc_credits` | Provider claim only. Not acceptance. |
| CEC eligibility and acceptance by the recognising body | `carsi.cec_claim` | Keyed to `carsi.enrollment`. Acceptance needs evidence + body reference. |

## Gaps named for slice 1b and later

- **D-16** (DR-NRPG business anchor) is a default, not a ruling.
- **D-15** (a former employer loses all visibility of the worker's credentials and CEC records) is a default, not a ruling.
- CARSI has no tenure history source; `core.employment` rows for CARSI teams will have no source until one is named.
- Self-reported fields in the product schemas (IICRC numbers entered by users) map to `verification_class = 'SELF_REPORTED'` until an issuer check exists.
- Linking real accounts needs a Spec 05 load, a consent basis and an APP 6/8 review before any adapter runs against real data.
