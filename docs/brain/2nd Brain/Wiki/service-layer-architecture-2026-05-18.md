---
type: wiki
updated: 2026-05-18
---

## Update 2026-05-18 evening — Anthropic gateway fully closed out

The Multi-model fallback path is now consumed via the gateway, not bypassed. New helper + 5 consumer migrations + 2 docs PRs landed sequentially:

- **#1121** docs: telemetry pattern in `.claude/STANDARDS.md` — services surface `usage` from `Anthropic.Message.usage`; routes log via existing `logAiUsage` / `prisma.usageEvent.create`. Gateway stays telemetry-free.
- **#1122** feat: `callAnthropicWithFallback` in `lib/services/ai/anthropic-gateway.ts` — wraps `tryClaudeModels` with the same `ServiceResult<Anthropic.Message, AnthropicReason>` envelope `callAnthropic` uses. Accepts `models?`, `agentName?`, `enableCacheMetrics?`. Status 429 → `RATE_LIMITED`, 529 → `MODEL_OVERLOADED`, else `API_ERROR`.
- **#1123–#1127** refactor: all 5 fallback consumers migrated to the new helper (`generate-interview-question`, `suggest-next-interview-question`, `validate-interview-response`, `analyse-technician-report`, `generate-enhanced-report`). Each PR is one service, ~100 LOC removed, behaviour-preserving, 4–5 tests rewritten to mock the gateway.
- **#1128** docs: simplified "Multi-model fallback routes" paragraph in STANDARDS.md — removed the "pragmatic deviation" caveat that pointed to future Phase-4 work; that work is now done.

**Verified on main at 2026-05-18 05:35 UTC:**
- 19 task services under `lib/services/ai/**` — 17 in the root + 2 under `lib/services/ai/standards/`.
- `new Anthropic({apiKey})` appears only in `anthropic-gateway.ts` (3 call sites, one per helper). Zero in task services (`grep -rn "new Anthropic" lib/services/ai/`).
- `tryClaudeModels` is no longer called by any task service — only via the gateway. The one remaining reference in `generate-interview-question.ts` is a docstring mention.
- The only direct `@anthropic-ai/sdk` import in `app/api/**` is `app/api/webhooks/github/route.ts` — legitimate signature verification, do not migrate.

**Pattern lesson — vitest `mockResolvedValueOnce` queue is not cleared by `vi.clearAllMocks()`.** When a `mockResolvedValueOnce` / `mockRejectedValueOnce` is queued in one test and never consumed (e.g. the override-skip path), the value persists into the next test and is consumed there by the first invocation, leading to silent wrong-path execution. Fix: in `beforeEach`, call `vi.mocked(<fn>).mockReset()` on every mock that ever gets `*ValueOnce` queued — not just `vi.clearAllMocks()`. Applied to `anthropic-gateway-fallback.test.ts` after a 7/8-passing failure that wasted ~5 min triaging.

**Pattern lesson — branch off the feature branch when stacking PRs.** Consumer migration #1123 was prepped while wrapper #1122 was still in CI; the only way to type-check the migration was to branch off `feat/gateway-fallback` (the wrapper branch). Once #1122 merged to main, `git rebase origin/main` cleanly fast-forwarded the consumer branch onto main. Repeatable: stack draft PRs on the WIP feature branch, rebase the moment the dependency lands.



# Service Layer Architecture (2026-05-18)

Codified pattern for RA's API surface, drawn from David Ondrej's Convex/Next.js content. Substrate-agnostic. Now a portfolio-wide Claude skill at `~/.claude/skills/service-layer-architecture/SKILL.md`.

## One-sentence definition

**The route handler decides _what to do and who is allowed to do it_; the service module decides _how to do it_ and returns a structured `ServiceResult<T, E>` the handler can interpret.**

## The two layers

### Action layer (route handler / Convex action / FastAPI endpoint)

Owns: authentication, authorisation/ownership, status-transition policy, audit events, persistence orchestration, user-facing error policy (HTTP code mapping), telemetry.

Does NOT own: network retries, credential lookup, readiness probes, worker provisioning, pure validation, restart/teardown helpers.

### Service-module layer (`lib/services/<domain>/<concern>.ts`)

Owns: gateway credential reads, runtime setup, pure validation, readiness probes, restart/teardown helpers, retry policy, structured-result contract.

Cardinal rule: **a service module never reads `request`, `session`, or `cookies`.** Every dependency is a function argument. Action handlers never import third-party SDKs directly — the service module wraps the SDK.

```typescript
export type ServiceResult<T, E extends string = string> =
  | { ok: true; data: T }
  | { ok: false; reason: E; detail?: string; retryAfterMs?: number; cause?: unknown };
```

## Verbatim Ondrej (Margot deep-research synthesis)

**Decorate-with-Convex walkthrough (May 2025):**
> "This is the generate decorated image function it's an internal action and on convex actions are effectual which means that they can run for I think 10 minutes but they can't directly access the database they have to go via mutations or queries to do that... I have to do this use nodes um directive on this convex action which means that this is all going to run within a node context as opposed to a um V8 isolate context"

**Next.js 16 / RSC content:**
> "To avoid 'Dependency Hell,' Server Actions should stay minimal. Treat them like Controllers in a modular backend — keep the business logic in a dedicated Service Layer."

**Anthropic Agent SDK overview (Feb 2026):**
> "It was already there baked into the project because of the way convex is set up so claude code which is what I was using for the project really understood what was going on."

The "dispatcher runtime setup / readiness probes / teardown helpers" jargon is NOT verbatim Ondrej — it's standard enterprise framing the skill folds in for parity with worker-pool / model-server / cron systems. Skill flags this explicitly so future readers know which parts are quoted vs synthesised.

## Cross-stack mapping

| Substrate | Action layer | Service-module layer |
|---|---|---|
| Convex | `convex/<domain>.ts` action / mutation | `convex/_services/<domain>/<concern>.ts` |
| Next.js App Router | `app/api/<domain>/route.ts` or Server Action | `lib/services/<domain>/<concern>.ts` |
| FastAPI | `app/server/routes/<domain>.py` endpoint | `app/server/services/<domain>/<concern>.py` |
| NestJS | `<Domain>Controller` | `<Domain>Service` |

## Anti-patterns this prevents

- **Fat action** (400+ line handler that does everything) — split into action + service.
- **Copy-paste credential reads** — one `lib/services/<provider>/credentials.ts` instead of N inline call sites.
- **Throw-and-catch ladder** — return `{ ok: false, reason: "..." }` instead.
- **Inline retry loops** — service module owns retry policy.
- **DB-write inside provisioning helper** — helper returns the new status; action decides whether to persist.

## Saga compensation (cross-service rollback)

When an action calls two service modules in sequence and the second fails, the action — not the service — owns the rollback. Two cases:

1. **Single-DB transaction:** action opens `prisma.$transaction` and threads the transaction client to both modules. If module B returns `{ ok: false }`, action throws or returns its own structured failure → transaction rolls back automatically.
2. **Cross-system (no shared transaction, e.g. Stripe + Supabase):** **Saga pattern.** Each successful module exposes a `compensate()` / inverse helper. Failure → action calls compensators in reverse order (`BillingService.refund(chargeId)` after `ProvisioningService.spinUp` failed).

## Theoretical roots

David Ondrej's framing is a practitioner's distillation of three traditions:

- **Domain-Driven Design (Vaughn Vernon, Eric Evans):** application-service (orchestration) vs domain-service (pure logic) distinction.
- **Hexagonal Architecture (Alistair Cockburn):** actions = inbound adapters; services = use-case core; integrations = outbound adapters.
- **Clean Architecture (Robert C. Martin):** actions = interface adapters; services = use-case interactors.

Plus the Convex runtime model: queries/mutations in a V8 isolate (deterministic, no side effects); actions in Node with full side-effect capability. Same separation, enforced at runtime rather than convention.

## RA's implementation status (as of 2026-05-18 / PR #1117)

| Service module | Bucket | Status |
|---|---|---|
| `lib/services/_shared/result.ts` | foundation | ✅ |
| `lib/services/xero/credentials.ts` | gateway-credential read | ✅ |
| `lib/services/xero/tenant.ts` | ID lookup | ✅ |
| `lib/services/inspection/validate-submission.ts` | pure validation | ✅ |
| `lib/services/ai/anthropic-gateway.ts` | SDK gateway (batch + streaming + apiKey override) | ✅ |
| `lib/services/ai/classify-inspection.ts` | wave-1 batch | ✅ |
| `lib/services/ai/group-readings.ts` | wave-1 batch | ✅ |
| `lib/services/ai/draft-support-ticket.ts` | wave-1 batch (platform-key) | ✅ |
| `lib/services/ai/generate-scope.ts` | wave-2 streaming | ✅ |
| `lib/services/ai/extract-reading.ts` | wave-2 vision batch | ✅ |
| `lib/services/ai/import-sketch-from-image.ts` | wave-2 vision batch | ✅ |
| `lib/services/ai/auto-classify-photo.ts` | wave-2 vision batch | ✅ |
| `lib/services/ai/analyse-support-ticket.ts` | wave-2 batch (graceful-degradation) | ✅ |
| `lib/services/ai/report-synopsis.ts` | wave-3 batch (hybrid key flow) | ✅ |

49/49 tests across `lib/services/ai/` at HEAD. Remaining wave-3 routes (10) queued; each lands as its own PR per 2026-05-18 atomic-PR granularity directive.

## Related

- [[restore-assist]] — RA-specific Service Layer rollout history + RA-4970 RLS migration.
- [[pi-ceo-architecture]] — Three-layer system; Service Layer pattern feeds Senior Agents layer.
- [[research-agentic-os-critique-2026-05-14]] — Karpathy CLAUDE.md framing that informed this session's slim rewrite.
