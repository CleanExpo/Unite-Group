# Unite-Group Voice Audit — 2026-05-13

Pre-rewrite baseline. Source: `npm run brand:lint:csv` → `voice-audit-2026-05-13.csv`.

## Summary

| Severity | Count |
| --- | ---: |
| error | 0 |
| warn  | 0 |
| **Total** | **0** |

Result: `✓ brand-guardian: 0 violations`.

## Why the baseline is empty

The Unite-Group Nexus app does not yet have public-facing marketing pages. The
linter walks:

- `src/app/[locale]/page.tsx` — currently a server-side `redirect()` to `/en/ceo`. No prose.
- `src/app/[locale]/about/**` — does not exist (created in Task 6).
- `src/app/[locale]/services/**` — does not exist (created in Task 7).
- `src/app/[locale]/contact/**` — does not exist (created in Task 8).
- `src/app/(public)/**` — convention referenced in the plan but not present in this repo.
- `src/components/marketing/**` — contains `LeadGenerationForm.tsx` (form copy only) and
  `PullQuote.tsx` (citation primitive — no prose).

The originating plan was written against a `(public)` route group that was never
created. This codebase uses `src/app/[locale]/<section>/page.tsx` (the convention
already proven by `[locale]/empire/` and `[locale]/ceo/`). The linter target glob
was updated in this same task to walk the locale-prefixed paths.

## Top offending files

| File | Errors | Warnings |
| --- | ---: | ---: |
| _(none — no public marketing pages exist yet)_ | 0 | 0 |

## Rule breakdown

| Rule ID | Hits |
| --- | ---: |
| forbidden-words | 0 |
| stakeholders | 0 |
| compound-abstraction | 0 |
| parallel-triplet | 0 |
| em-dash-throwaway | 0 |
| today-fast-paced | 0 |
| important-to-note | 0 |
| hedge-stack | 0 |
| rhetorical-audience-question | 0 |

## Rewrite priorities (recast as first-write priorities)

Because there are no existing landing pages, Plan 4 Tasks 5–10 are first-writes
against the Nexus Human Voice Spec v1 rather than rewrites. The acceptance
criteria still hold: every new page must pass `npm run brand:lint` with
`errors=0`.

1. **Homepage** (`src/app/[locale]/page.tsx`) — replace the bare `redirect()` with
   a real public landing page that opens on Karen, ends on a verdict, exits to
   `/en/ceo` only for authenticated CEO users (out-of-scope for this plan).
2. **Hero component** (`src/components/marketing/Hero.tsx`) — Karen opener.
3. **About** (`src/app/[locale]/about/page.tsx`) — Phill origin story.
4. **Services index + per-service** — named-operator structure.
5. **Contact** — Phill on the desk.
6. **FeatureGrid + CTABlock** — strip slop, named-operator pattern.

## Post-rewrite audit

After Tasks 5–10 ship, regenerate the CSV:

```bash
npm run brand:lint:csv
mv docs/brand/voice-audit-2026-05-13.csv docs/brand/voice-audit-2026-05-13-post.csv
```

The delta between pre and post is the deliverable. With a true zero baseline,
the post-audit must also be zero — every new sentence must clear the linter
before merge.
