# 2nd Brain — Unite-Group Nexus shaping vault

This is an Obsidian-compatible markdown vault AND a git repo. Agents and humans read/write the same files. Folders are flat by purpose — do not nest deeper without a reason.

## OKF navigation — read this FIRST

This vault is an [OKF](https://github.com/google/open-knowledge-format) (Open Knowledge Format) knowledge layer. To find anything, **navigate the index, do not keyword-match across the tree** — that is slower, costs more tokens, and surfaces duplicates.

1. **Start at the folder's `index.md`.** Every folder has one (`type: index` in its frontmatter). It lists that folder's concepts (with one-line descriptions) and its subfolders (each linked to its own `index.md`). Read the index, decide what you need, then open only that file. Walk down through subfolder indexes the same way.
2. **Read frontmatter before content.** Each concept file carries `name`/`title` + `description` frontmatter. Read descriptions first to pick the right file; open the body second.
3. **One concept per file.** Each file is one thing with a `type` field (`sketch`/`grill`/`pitch`/`decision`/`persona`/`source`/`outcome`/`output`/`index`). Don't mix topics in a file — it breaks targeted loading.
4. **Indexes are generated, not hand-edited.** `index.md` files carrying the `<!-- okf:generated -->` marker are produced by `apps/workspace/scripts/okf-index.py`; re-run that script after adding/moving content rather than editing them by hand. A hand-authored `index.md` (no marker) is left untouched by the generator.

## Folder purpose (SSOT)

| Folder | What goes here | When |
|---|---|---|
| `Sources/` | Raw imported source material (books, articles, transcripts, PDFs extracted to text). Read-only after import. | When Phill drops a source in, or an agent pulls one via WebFetch. |
| `Sketches/` | **Fat-marker sketches** of Nexus components (Shape Up §Ch4). One file per component. Low fidelity on purpose. | First artifact before any code. |
| `Grills/` | Transcripts of `/grill-me` sessions on sketches. Q+A format. Includes decided/deferred summary at end. | Immediately after a sketch is drafted. |
| `Pitches/` | Shape Up pitch documents — sketch + grill outcomes + rabbit holes + no-gos + appetite. Linear-epic-ready. | After grill resolves. |
| `Decisions/` | ADRs (Architecture Decision Records) for ratified decisions. One per major call. | Once a pitch ships its first slice. |
| `Personas/` | Per-product brand-essence charters (used by Pi-CEO `swarm/personas/*.py`). Authoritative source. | When a new product joins the Discovery loop. |
| `Outcomes/` | Outcome notes — what shipped, what worked, what broke, revenue/usage signal. Feeds the board's next cycle. | After each shipped PR's first 14 days. |

## File naming

- `NN-short-slug.md` where `NN` is a 2-digit ordinal (`01-`, `02-`) so files sort by topic order in the Obsidian sidebar.
- Date-prefixed only for `Sources/` (which represent fixed-point snapshots) and `Outcomes/` (chronological): `YYYY-MM-DD-slug.md`.

## Frontmatter convention

Every Sketch / Grill / Pitch / Decision / Persona file uses YAML frontmatter:

```yaml
---
type: sketch | grill | pitch | decision | persona | source | outcome
component: per-product-persona-template
status: draft | shaped | ratified | shipped | retired
appetite: 1d | 3d | 1w | 2w | 6w   # Shape Up appetite (only on pitches)
rabbit_holes: []                    # known unknowns surfaced during grill
no_gos: []                          # explicit scope exclusions
linear_epic: SYN-XXX | DR-XXX | ... # when promoted to Linear
created: YYYY-MM-DD
---
```

## Workflow

```
Sources/<topic>   →  read by humans + agents (context input)
        ↓
Sketches/NN-X.md  ←  drafted by Claude (fat-marker, words-not-pictures)
        ↓
Grills/NN-X.md    ←  /grill-me run on the sketch — one Q at a time, Phill answers
        ↓
Pitches/NN-X.md   ←  shaped doc with rabbit holes + no-gos documented
        ↓
Linear epic        ←  /to-issues style — break pitch into atomic slices
        ↓
First slice PR     ←  thinnest end-to-end vertical slice ships first
        ↓
Outcomes/<date>-X.md ←  what happened in the first 14 days post-ship
        ↓
(feeds next cycle's Sources via the swarm's Discovery loop)
```

## Hard rules

1. **Never skip the grill.** No code writing without a grill transcript in the same component's folder. If you'd be writing code, you should be sketching.
2. **Fat marker means fat marker.** Sketches use words, lists, ASCII boxes. Never wireframes, never code blocks more than 5 lines. The constraint is the point.
3. **Rabbit holes are first-class.** If you don't know, write `RABBIT HOLE:` and the question. Don't fake-answer.
4. **No-gos are mandatory.** A sketch without an explicit `NO-GOS:` section is incomplete.
5. **Appetite is a number, not vibes.** Every pitch declares its time budget (1d, 3d, 1w, 2w, 6w). If you can't pick, the work isn't shaped.
6. **One pitch per Linear epic.** A pitch maps to exactly one epic. If a pitch is too big for one epic, the pitch is too big — re-shape.

## How agents should use this vault

- Read `Sources/` for primary material before shaping.
- Read `Pitches/` and `Decisions/` for ratified context.
- Write to `Sketches/` and `Grills/` freely (these are working drafts).
- Promote to `Pitches/` and `Decisions/` only after Phill ratifies.
- Refer to vault content by relative path in Linear tickets / PR descriptions so future-agents can re-load context.

## Where this vault lives

- **Local canonical:** `/Users/phillmcgurk/2nd-brain/`
- **Git remote:** (TBD — Phill to decide push target)
- **Obsidian open-as-vault:** point Obsidian at `/Users/phillmcgurk/2nd-brain/` (the `.obsidian/` subdir holds settings)

## Bootstrap status

- 2026-05-26: vault initialized. Source folder seeded with Shape Up fidelity extract + grill-me pattern extract from session research.
