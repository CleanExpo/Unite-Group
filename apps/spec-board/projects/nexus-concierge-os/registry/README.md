# Nexus Concierge OS — vertical-pack registry (UNI-2170 §3c)

One checked-in manifest per vertical. Each `<slug>.json` is the source of truth for that
vertical's `vertical_pack` row (schema template `../migrations/0001_core_schema.sql`): a
vertical inserts its row **from** its manifest, it does not hand-author `domain_map` in the DB.

## OQ3 — resolved

Core spec open question 3 asked whether `vertical_pack.domain_map` is a DB row or a **checked-in
manifest file** (lean: checked-in). This registry resolves it: **checked-in.** The manifest file
is the SSOT; the DB row is a projection of it. Rationale: `domain_map` is architecture, not
runtime data — it belongs in review/diff/version control, not typed into a table by hand.

## Field contract (mirrors each pack's §6c)

| Field | Meaning |
|---|---|
| `slug` | unique vertical id (matches `vertical_pack.slug`) |
| `domain_map` | object mapping each vertical concept → the core table it lands on (`case`/`srt`/`handoff`/`srt_return`) |
| `kb_ref` | pointer to the vertical's knowledge base |
| `panel_ref` | description of the vertical's `provider` panel |
| `regime` | named regulatory regimes (array) |
| `regime_status` | `named_unconfirmed` = named but primary text not fetched (each pack's R1); `signed` only after legal sign-off |
| `data_plane` | where the vertical's data lives (`project`/`region`/`tenancy`) — each vertical is isolated (core §2) |
| `source_spec` | the pack §6c this manifest is drawn from |
| `issue` | the pack's tracking issue |

## Present manifests

- `lodgey.json` — UNI-2171 (merged #606)
- `restoreassist.json` — RA-6812 (merged #607)

Phase-4 verticals (CCW, CARSI, ATIA, DR-NRPG) are notes-only in the core spec — no manifest
until each is scoped as its own pack. `regime_status` stays `named_unconfirmed` for every
vertical until Lens + a lawyer sign that vertical's regime.
