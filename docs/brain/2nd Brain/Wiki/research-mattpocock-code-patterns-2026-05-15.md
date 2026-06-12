---
type: wiki
updated: 2026-05-15
---

# Matt Pocock — Code Patterns (2026-05-15)

Deep-code extraction across Matt Pocock's top public TS repos. Architecture-level findings already live in [[skills-architecture-audit-2026-05-15]]; this page is strictly about IDIOMS on the line — what to copy into Synthex / Pi-Dev-Ops / Unite-Group / CCW-CRM / CARSI / Pilot-bot **today**. Bench: [[feedback-tight-code]]. Source: [[mattpocock-overview]] (Sources/, ingested 2026-05-15).

5 repos deep-dived. 16 source files cited verbatim. 17 patterns in the register. **15 WebFetch-equivalent calls** (gh api raw fetches, free under Anthropic Max).

---

## 1. Headline

**One concept = one file = one test file, named the same.** Across `mattpocock/sandcastle` (96 src files, 38 paired `*.test.ts`), every load-bearing concept is a single ≤500-line file with a co-located `.test.ts` sibling, exported through a thin `src/index.ts` barrel that lists `export { … } from "./X.js"` then `export type { … } from "./X.js"` (value and type exports split by line — `src/index.ts:1-3` vs `src/index.ts:2-9`). No `__tests__/` folder, no `lib/`, no `utils/` grab-bag — the filename **is** the module boundary. Where to copy: Pi-Dev-Ops/swarm (Python — same rule applies: one_thing.py + test_one_thing.py), CCW-CRM `apps/web/src` (TS — direct port), and Synthex `packages/brand-config/src/brands/{slug}.ts` (already follows it; lock it as a rule).

---

## 2. The 5 repos

| Repo | Stars | Lang | What it is | Single most important pattern |
|---|---:|---|---|---|
| `mattpocock/skills` | 82k | Markdown | 19 skills in flat 3-folder layout (engineering / productivity / misc) | **"One skill, one job; every skill in `README.md` + `plugin.json` or it doesn't exist."** — `skills/CLAUDE.md` lines 1-13. No `-orchestrator` skills. |
| `mattpocock/ts-reset` | 8.5k | TypeScript | Per-fix `.d.ts` entrypoints that monkey-patch TS lib types | **Per-fix module + single `recommended.d.ts` barrel of `/// <reference path="…" />` lines.** — `src/entrypoints/recommended.d.ts:1-11` (11 lines, one reference per fix, nothing else). |
| `mattpocock/sandcastle` | 4.3k | TypeScript | TS library to run AI coding agents in sandboxes | **`Data.TaggedError` from `effect` for every domain error + co-located `.test.ts`.** — `src/errors.ts:3-7` `class ExecError extends Data.TaggedError("ExecError")<{readonly message: string; readonly command: string}>`. |
| `mattpocock/dictionary-of-ai-coding` | 1.6k | TypeScript+MD | One markdown file per term, generator script rebuilds README | **Glossary-as-source-of-truth — `CONTEXT.md` lifted into runtime as `dictionary/<Term>.md`.** Term names are PascalCase nouns; the README is generated, never hand-edited (`.github/workflows/readme-fresh.yml`). |
| `mattpocock/course-video-manager` | private | TypeScript | His personal video-editor app — 26 issues closed May 2026 | "Slice-N" issue-pattern: features land as `Pitches slice 1: schema/repo CRUD/list/sidebar`, `slice 2: detail page`, `slice 3: filters/sort`, `slice 4: thumbnails`, `slice 5: pre-fill` — vertical slices, not horizontal layers (mirrors his TDD skill verbatim — see Issues #782-#786). |

---

## 3. The pattern register

| # | Pattern | Where in Matt's code | Where in our portfolio | Adoption cost |
|---|---|---|---|---|
| 1 | **One concept, one file, one sibling test** — co-located `Foo.ts` + `Foo.test.ts`, no `__tests__/` dir | `sandcastle/src/Orchestrator.ts` ↔ `Orchestrator.test.ts`; `errors.ts` ↔ `errors.test.ts` (96 src files, 38 tests) | CCW-CRM (most tests are isolated in `tests/`), Pi-Dev-Ops swarm (no test files for most modules — replicate as `<mod>.py` + `test_<mod>.py` sibling) | Low — convention, not code |
| 2 | **Public-surface barrel `src/index.ts` with values first, types second** — value `export { run }` then `export type { RunOptions, RunResult }` from same module | `sandcastle/src/index.ts:1-2` `export { run } from "./run.js";` then lines 3-9 `export type { RunOptions, RunResult, … } from "./run.js";` | Synthex `packages/brand-config/src/index.ts`, CCW-CRM `apps/web/src/index.ts` — currently mix values + types unstructured | Low — refactor 1 file per package |
| 3 | **Branded `_tag` discriminator on union types** for runtime + compile-time discrimination | `sandcastle/src/Output.ts:7-19` `readonly _tag: "object"` vs `readonly _tag: "string"`; switched on at `extractStructuredOutput.ts:23` `if (definition._tag === "object")` | Pi-Dev-Ops swarm dispatch (currently uses string-typed `kind` field — should be branded discriminant), Hermes event types | Low — TS-only |
| 4 | **`Data.TaggedError` from `effect`** for every domain error — auto-extends `Error`, gets a `._tag` field, works with `Effect.catchTag` | `sandcastle/src/errors.ts:3-100+` — 11 separate tagged errors with structured fields (`message`, `command`, `timeoutMs`, `preservedWorktreePath`) | CCW-CRM, Synthex (only if migrating to Effect). For non-Effect projects: same idea via plain `class XError extends Error { readonly _tag = "XError" as const; … }` | Med — add `effect` dep OR strip to plain class form |
| 5 | **Errors carry recovery context, not just messages** — `AgentError.preservedWorktreePath` so the caller can recover state without losing side effects | `sandcastle/src/errors.ts:48-55` `class AgentError extends Data.TaggedError("AgentError")<{readonly message: string; readonly preservedWorktreePath?: string}>` | Hermes failures (currently lose context — error message + nothing). RA-2947 floor-plan failures need to carry `originalImagePath` + `partialOverlayPath`. Pilot bot needs `pendingSuggestionId` | Med — design call per error class |
| 6 | **Single-purpose pure module < 50 lines** when the function does one thing — `raceAbortSignal` is 46 lines, `resolveCwd` is 47 lines, both export ONE thing | `sandcastle/src/raceAbortSignal.ts` (46 LOC, exports `raceAbortSignal`); `sandcastle/src/resolveCwd.ts` (47 LOC, exports `resolveCwd` + `CwdError`) | Pi-Dev-Ops `swarm/*` (many 200-400 line files mix unrelated functions). Synthex utility files | Low — split-not-edit |
| 7 | **Type-test files inside the test suite** — runtime test file using `Expect<Equal<typeof result, number[]>>` to verify the TYPE not the value | `ts-reset/src/tests/filter-boolean.ts:1-12` `doNotExecute(() => { const result = arr.filter(Boolean); type tests = [Expect<Equal<typeof result, number[]>>]; })` | Synthex BrandConfig — currently no type-tests; adding 5 type-tests per brand catches voice-token regressions at compile time | Low — copy `tests/utils.ts` verbatim |
| 8 | **`doNotExecute(() => {})` wrapper for type-only assertions** — runs zero code but typechecks the body | `ts-reset/src/tests/utils.ts:38` `export const doNotExecute = (func: () => any) => {};` | Same as #7 | Low |
| 9 | **`Equal<X, Y>` two-conditional-types trick** — the canonical TS-deep-equality primitive | `ts-reset/src/tests/utils.ts:7-9` `export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;` | Synthex codegen output verifier, Pi-Dev-Ops typed-entity schema verifier | Low — copy 3 lines |
| 10 | **Public namespace as `const` object, not class** — `Output.object({...})` + `Output.string({...})` as factory funcs on a const | `sandcastle/src/Output.ts:34-67` `export const Output = { object: <S extends StandardSchemaV1>(opts) => ({ _tag: "object", … }), string: (opts) => ({ _tag: "string", … }) } as const;` | Pi-Dev-Ops swarm dispatch (currently exposes 7 free functions; collapse to `Dispatch.run(...)` + `Dispatch.cancel(...)`), Synthex `Brand.colour()` / `Brand.token()` | Low |
| 11 | **JSDoc with usage examples ABOVE the export, not separate docs** — every public export has a ```ts fenced example in its JSDoc | `sandcastle/src/Output.ts:30-43` — 14-line JSDoc on `Output` with full code example before the const | CCW-CRM API helpers (no JSDoc), Pi-Dev-Ops swarm public functions (no examples). Cheapest doc improvement available | Low |
| 12 | **`/** @internal */` is not used — instead, just don't export it** — non-exported helpers (`extractObject`, `extractString`, `findLastTagContent`) live in the same file as the public function | `sandcastle/src/extractStructuredOutput.ts:23-79` — `extractStructuredOutput` is exported; `extractObject` and `extractString` are file-local | Synthex (over-exports from `packages/brand-config/src/brands/`), Pi-Dev-Ops swarm (every module exports every helper) | Low — delete `export ` keywords |
| 13 | **Section-divider comment blocks** for files > 100 lines — `// ---…---` followed by `// Object extraction` | `sandcastle/src/Output.ts:3-5`, `:27-29`; `extractStructuredOutput.ts:35-37`, `:79-81` | Currently absent across portfolio. Wiki pages already do this with `##` — apply to TS too | Zero — pure annotation |
| 14 | **`Record<string, Const>` lookup for switch-or-map decisions** — `TOOL_ARG_FIELDS: Record<string, string> = { Bash: "command", WebSearch: "query", … }` instead of a switch statement | `sandcastle/src/AgentProvider.ts:8-13` | Hermes router (currently 30-line if-chain), Synthex channel-to-aspect-ratio mapping (currently `if`), CCW-CRM Shopify→Xero field map | Low |
| 15 | **`as const` on exported config objects** to lock the type as the literal union, not `string` | `sandcastle/src/Output.ts:67` `} as const;` (entire `Output` object) — same trick on `BUILT_IN_PROMPT_ARG_KEYS` referenced in `run.ts:43` | Brand tokens (`COLOURS = { warmCream: "#F5EFE0", gunMetal: "#1E2226" } as const`), Hermes job-kind enums | Zero — add 2 words |
| 16 | **`ubiquitous-language` glossary file (`CONTEXT.md`) at repo root** that defines every domain term + the words to *avoid* | `sandcastle/CONTEXT.md` defines **Sandcastle / Sandbox / Host / Agent / Sandbox provider / Bind-mount / Isolated / Worktree / Source branch / Target branch** — each with `_Avoid_:` line listing forbidden synonyms | Pi-Dev-Ops (no glossary — terms like "worker / agent / bot / dispatcher" are used interchangeably, exactly the failure mode Pocock's `CONTEXT.md` fixes), CCW-CRM (Toby's terms vs Shopify terms drift) | Low — 1 doc file per repo |
| 17 | **ADR folder `docs/adr/` numbered sequentially** with stable filenames — `0001-per-step-timeouts.md`, `0002-cwd-option.md`, never renamed | `sandcastle/docs/adr/` lists 14 ADRs (0001-0014) — each is a tiny doc anchoring one decision | Pi-Dev-Ops has scattered design notes in PR bodies that get lost. CCW-CRM has zero ADRs. Synthex has implicit decisions across `CLAUDE.md` files | Low — new dir, no code |

---

## 4. Top 5 immediate wins (next 7-14 days)

### Win 1 — Lift `Equal<X,Y>` + `doNotExecute` into Synthex brand-config tests
- **Target:** `Synthex/packages/brand-config/src/brands/__type-tests__/voice.type-test.ts` (new)
- **Current:** Zero type-tests across the 6 brand configs. Voice-token regressions show up at runtime, not compile time.
- **After:** Copy `ts-reset/src/tests/utils.ts:1-38` verbatim into `packages/brand-config/src/tests/utils.ts`. One `voice.type-test.ts` per brand with 3-5 `Expect<Equal<...>>` assertions on the BrandConfig shape.
- **Effort:** 90 minutes (one brand, copy-paste rest).
- **Risk:** None — type-only file, costs zero runtime.

### Win 2 — Convert Pi-Dev-Ops swarm errors to plain `_tag` discriminated classes
- **Target:** `Pi-Dev-Ops/swarm/errors.py` (new)
- **Current:** Swarm modules raise vanilla `Exception` / `RuntimeError` with a string message; Hermes loses recovery context every time a job fails.
- **After:** One file with 8-12 dataclass-style errors, each carrying recovery context (`job_id`, `partial_state_path`, etc.), Python equivalent of `sandcastle/src/errors.ts:3-100+`. Hermes can then `match e: case JobTimeoutError(timeout_ms, …)` deterministically.
- **Effort:** 3 hours (write the classes + migrate the 5 highest-traffic swarm dispatch sites).
- **Risk:** Low — additive; old `except Exception:` paths still work during cutover. Honours [[feedback-substrate-change-discipline]] — shadow-run before flipping dispatcher to depend on tags.

### Win 3 — Ship a `CONTEXT.md` glossary for Pi-Dev-Ops
- **Target:** `Pi-Dev-Ops/CONTEXT.md` (new) — copy the `sandcastle/CONTEXT.md` shape
- **Current:** "worker / agent / bot / dispatcher / orchestrator / swarm / Hermes / Margot" all overlap in usage; new Claude sessions ask Phill what each means.
- **After:** ~12 terms locked. Each `**Term**:` + 1-sentence definition + `_Avoid_:` list. Becomes the file new Claude sessions read after `CLAUDE.md`.
- **Effort:** 60-90 minutes.
- **Risk:** None.

### Win 4 — Add `as const` to all Synthex token exports + barrel-split index files
- **Target:** `Synthex/packages/brand-config/src/brands/*.ts` (~6 files) + `Synthex/packages/brand-config/src/index.ts`
- **Current:** Tokens type as `{ warmCream: string }` instead of `{ readonly warmCream: "#F5EFE0" }`. Downstream `Brand.colour("invalid")` typo not caught at compile time.
- **After:** `as const` on every token block. `index.ts` becomes values-first / types-second like `sandcastle/src/index.ts:1-9`.
- **Effort:** 45 minutes.
- **Risk:** None — additive type narrowing only.

### Win 5 — Adopt `Record<string, Const>` lookup over if-chains in Hermes router
- **Target:** `Pi-Dev-Ops/swarm/hermes_dispatch.py` (the if-chain that maps job-kind → handler)
- **Current:** 20-30 line if-elif-else mapping job-kind strings to functions; new job-kinds require editing the chain.
- **After:** Module-level `JOB_HANDLERS: dict[str, Callable] = {…}`; dispatch becomes `JOB_HANDLERS[kind](payload)`. Matches `AgentProvider.ts:8-13` `TOOL_ARG_FIELDS`.
- **Effort:** 2 hours including shadow-dispatch parity test per [[feedback-substrate-change-discipline]] (≥50 dispatches).
- **Risk:** Med — load-bearing path. Substrate-change discipline applies: shadow-run before cutover.

---

## 5. Anti-recommendations (don't copy)

1. **Don't import `effect` into non-Effect codebases just to get `Data.TaggedError`.** It's a ~200KB dep with a steep learning curve. Use the plain `class XError extends Error { readonly _tag = "XError" as const }` pattern instead. Only adopt `effect` itself if the project is rewriting its async layer (Synthex isn't, CCW-CRM isn't, Pi-Dev-Ops is Python).

2. **Don't try to apply the `.d.ts`-only entrypoint pattern (ts-reset) to non-library code.** It only makes sense for ambient module augmentation. CCW-CRM and Synthex are app code, not libs that ship types.

3. **Don't copy the `Slice-N` issue-pattern verbatim into Linear** when the issue size is < 1 day. Pocock's slices are each a half-day of work. Sub-half-day issues should stay as single tickets. Apply to RA-2947 floor-plan (multi-week, slices fit) but NOT to CCW Hour-1 provisioner work (each task is < 2h).

4. **Don't adopt the `as const` + branded `_tag` pattern in Python.** Python's structural typing doesn't make discriminated unions work the same way. Use `@dataclass(frozen=True)` + `match` statements instead — different tool, same outcome.

5. **Don't ship per-file `*.test.ts` siblings for trivial config files.** `tsconfig.json`, `package.json`, single-export type aliases don't need them. Pocock's pattern is for behavioural modules. Synthex's `brands/{slug}.ts` files are config — no test sibling needed; the `__type-tests__/voice.type-test.ts` covers the shape.

---

## 6. Cross-refs

[[skills-architecture-audit-2026-05-15]] · [[board-deliberation-skills-architecture-2026-05-15]] · [[research-browser-use-org-2026-05-15]] · [[research-browser-harness-pm-synthesis-2026-05-14]] · [[research-agentic-os-critique-2026-05-14]] · [[feedback-tight-code]] · [[feedback-substrate-change-discipline]] · [[feedback-quality-over-quantity]] · [[feedback-make-calls-not-questions]] · [[feedback-audit-verification]] · [[project-nexus]] · [[project-pi-ceo]] · [[mattpocock-overview]]
