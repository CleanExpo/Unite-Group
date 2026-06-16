# Unite-Group Brand Voice — Operator Quickstart

## Source-of-truth

Voice spec lives in the Brain-1 wiki:
- `~/2nd Brain/2nd Brain/Wiki/nexus-human-voice-2026-05-11.md`

That page is canonical. If this README disagrees with it, the wiki wins.

## How the linter works

`npm run brand:lint` walks `src/app/(public)/**` and `src/components/marketing/**`, extracts every
JSX text node and prose-like string literal, and runs it against the rules in
`src/lib/brand/voice-rules.ts`. Errors fail the build; warnings don't.

To regenerate the audit CSV: `npm run brand:lint:csv` (output: `docs/brand/`).

## The five non-negotiables

1. **Open on a named human, not a thesis.** Karen, Toby, Phill, a homeowner in Caboolture.
2. **Three-layer citation discipline.** Verbal + on-screen artefact + named attributor.
3. **Earned anger.** Verdict in the last 20% of any piece.
4. **Aussie register, surgically.** "Look", "right", "mate" — once or twice, never sprinkled.
5. **Direct second-person.** "You", not "stakeholders".

## When the linter false-positives

Each rule's regex is loose enough to catch real prose without catching paths, classnames, or
component-prop strings. If you hit a false positive that genuinely doesn't apply (e.g. the literal
text appears in a screenshot's alt= attribute by necessity), add a `voice-rules-ignore` JSX comment
above the line. **This is an explicit allowlist** — every ignore goes through code review.

## Adding a new rule

1. Add a new entry to `VOICE_RULES` in `src/lib/brand/voice-rules.ts`
2. Include 1-3 positive examples and 1-3 negative examples
3. Run `npm test src/lib/brand/voice-rules.test.ts`
4. Run `npm run brand:lint` against the codebase — fix any new violations

## Forbidden words

Maintained in `FORBIDDEN_WORDS` constant. Source: NRPG BrandConfig + John Coutis BrandConfig +
spec section "Anti-AI-slop shapes". To add a word, edit the constant and re-run the linter.
