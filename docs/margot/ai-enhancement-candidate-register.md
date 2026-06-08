# Margot AI Enhancement Candidate Register

Date: 2026-06-09 05:32 AEST
Project: Unite-Group
Owner: Margot
Scope: Local repo/docs/code evidence only. This register does not adopt a new vendor, connect accounts, run external AI enrichment, write databases, deploy, publish, or contact leads/clients.

## Purpose

This register operationalizes `docs/margot/ai-enhancement-pipeline.md` by converting the first safe AI/automation candidates into a tracked Senior PM queue. It keeps Margot focused on existing assets first, deterministic helpers before probabilistic AI, and explicit approval gates before any client data, production DB, deployment, public publishing, or new vendor work.

## Source anchors

- `docs/margot/AI Enhancement Pipeline`: `docs/margot/ai-enhancement-pipeline.md`
- CRM test matrix: `docs/margot/crm-test-coverage-matrix.md`
- Retrieval policy: `docs/margot/retrieval-rules.md`
- Daily CRM digest template: `docs/margot/daily-crm-digest-template.md`
- Marketing strategy model: `docs/margot/marketing-strategy-operating-model.md`
- Client 2nd Brain model: `docs/margot/client-second-brain-model.md`
- Lead qualification helper: `src/lib/crm/qualify-lead.ts`
- Digest helper: `src/lib/crm/daily-digest.ts`
- Semantic retrieval wrappers: `scripts/margot-semantic-search-wrapper.ts`, `scripts/pi-ceo-semantic-search-wrapper.ts`

## Register statuses

- `watch`: candidate known, not shaped.
- `triage`: value/risk scored from existing assets.
- `sandbox`: local-only mocks/fixtures/tests being built or run.
- `implemented_local`: local deterministic code/docs/tests exist; no production adoption is implied.
- `blocked_approval`: useful, but next action needs a named approval gate.
- `parked`: no current safe business case.
- `rejected`: does not support Unite-Group or violates guardrails.

## Current candidates

| ID | Candidate | Category | Current status | Existing evidence | Value score | Approval / stop gates | Next safe action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AI-CRM-001 | Deterministic lead qualification helper before AI scoring | automation / CRM | `implemented_local` | `src/lib/crm/qualify-lead.ts`; `tests/unit/lib/crm/qualify-lead.test.ts`; matrix row for Lead qualification helper | 13/15: revenue 3, operating 3, data 2, client 2, strategic 3 | Must not auto-convert, overwrite CRM identity, send follow-up, or create client records without Board-approved conversion rules and strong identity gates. | Keep pure helper tests green; add anonymized/approved real lead-category fixtures later; surface only as recommendation in digest/command center. |
| AI-CRM-002 | Daily CRM digest generator with explicit source labels | automation / ops | `implemented_local` | `src/lib/crm/daily-digest.ts`; `docs/margot/daily-crm-digest-template.md`; `tests/unit/lib/crm/daily-digest.test.ts`; `tests/unit/lib/crm/digest-edge-cases.test.ts`; `tests/integration/api/crm-daily-digest.test.ts` | 14/15: revenue 2, operating 3, data 3, client 3, strategic 3 | Must not send messages, publish externally, or read production data outside guarded server routes. Digest output is operator decision support only. | Re-run focused digest tests when summary/PII behavior changes; add integration health sections only after stale-sync thresholds are source-labeled. |
| AI-RET-001 | Retrieval evaluation harness for Margot docs | retrieval / QA | `implemented_local` | `docs/margot/retrieval-rules.md`; `scripts/margot-semantic-search-wrapper.ts`; `src/lib/margot/retrieval-evaluation.ts`; `scripts/margot-retrieval-evaluation-report.ts`; `tests/unit/lib/margot/retrieval-evaluation.test.ts`; `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`; read-first docs; current progress logs; stale-sync helper/page/schema sources; daily CRM digest template/helper sources; Mac Mini recovery status surfaces; answer-shape fixtures for stale-sync, command-center summaries, report handoff, gated-action recommendations, digest operator-only summaries, access-request/new-vendor boundaries, and Mac Mini recovery boundaries; report read-back parser/assertions; inconsistent-count, duplicate summary-row, duplicate overall-status, duplicate handoff-section, duplicate fixture-result-section, missing fixture-result-section, fixture-result row-count/status reconciliation, overall-status contradiction, missing-handoff-block, read-back/safety-proof omission, gated-action overclaim, digest-send/publish/mutation overclaim, access-request/new-vendor overclaim, and Mac Mini recovery/credential overclaim tests | 12/15: revenue 1, operating 3, data 3, client 2, strategic 3 | No external vector vendor or account setup; no client-sensitive corpora without approval; semantic answers must cite exact files or fall back to file reads; command-center/stale-sync/report-handoff/gated-action/digest/access-request/Mac Mini recovery summaries must not overclaim gated progress, skip local evidence read-back, convert local evidence into approval/execution claims, imply automatic sends/public publishing/data mutation, request/approve new vendors/accounts without explicit operator approval, invent recovered artifacts, attempt credentials, or scan the system volume recursively. | Keep the mocked/static fixture, answer-shape, local report-runner, and report read-back gates green; next safe expansion is additional local report corruption/error-path cases or mocked command-center answer-shape cases before live retrieval threshold changes. |
| AI-INT-001 | Integration stale-sync/risk summarizer | automation / integrations | `triage` | `supabase/migrations/20260513000200_integration_schema.sql`; CRM matrix integration-mirrors row; current command-center/digest docs | 12/15: revenue 2, operating 3, data 3, client 1, strategic 3 | Read-only/source-labeled only; no provider mutation, secret reads, Vercel env mutation, or production DB writes; 1Password values must never be stored. | Define local stale thresholds and mocked mirror fixtures before any live provider polling. |
| AI-VOICE-001 | Voice transcript privacy and retention policy before richer summarization | security / voice / CRM | `blocked_approval` | `src/app/api/pi-ceo/margot-voice/task/route.ts`; `tests/integration/api/margot-voice-task.test.ts`; voice/task sandbox validation packet | 12/15: revenue 1, operating 2, data 3, client 3, strategic 3 | Transcript retention/privacy policy, sandbox apply/diff, live RLS/service-role validation, and production promotion are gated. No external LLM summarization of transcripts without explicit approval. | Keep route/schema tests green and add local redaction/privacy fixtures; do not run sandbox/prod wizard subcommands until a named authority/auth gate exists. |

## Candidate AI-CRM-001 operating contract

The lead helper is currently the safest concrete AI-adjacent lane because it is deterministic and already local:

- It performs no network calls.
- It writes no database records.
- It returns recommendation-only score/band/reasons/operator notes.
- It explicitly says not to auto-convert or overwrite CRM identity from the score.
- It treats free-email leads as context-required, not automatically disqualified.
- It flags spam risk without automatically deleting or contacting the lead.

Required display language when surfaced in command center or digest:

```text
Lead score is recommendation-only. Human/Board-approved conversion rules and strong identity checks are required before client creation, follow-up, or CRM identity merge.
```

## Candidate AI-RET-001 fixture contract

The first retrieval evaluation harness is now local-only and implemented in `src/lib/margot/retrieval-evaluation.ts`, with mocked/static coverage in `tests/unit/lib/margot/retrieval-evaluation.test.ts`, a local-only report runner at `scripts/margot-retrieval-evaluation-report.ts`, and a report read-back parser/assertion gate that verifies the generated markdown summary, fixture-result sections, fixture-result row counts/status counts, safety notes, and next-safe-action block before command-center handoff. It now covers source-citation requirements, answer-shape requirements, generated evidence at `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`, and report integrity/error-path checks for malformed rows, internally inconsistent counts, duplicate summary rows, duplicate overall-status rows, duplicate handoff sections, duplicate fixture-result sections, missing fixture-result sections, fixture-result row-count/status reconciliation, explicit unexpected fixture-status rejection, overall-status contradiction, missing-handoff-block, read-back/safety-proof omission, gated-action overclaims, digest-send/publish/mutation overclaims, access-request/new-vendor overclaims, and Mac Mini recovery/credential overclaims.

It pins seven source-citation fixtures:

| Query intent | Expected source file | Required behavior |
| --- | --- | --- |
| Sandbox wizard promotion rule | `CLAUDE.md`; `docs/margot/crm-test-coverage-matrix.md` | Cite sandbox-first wizard and production approval boundary. |
| Mac Mini recovery blocker | `docs/margot/mac-mini-recovery-status.md` | Report SMB/SSH/mount state from latest entry; do not invent recovered artifacts. |
| Lead qualification autonomy boundary | `src/lib/crm/qualify-lead.ts`; `docs/margot/ai-enhancement-candidate-register.md` | Say recommendation-only; no auto-conversion. |
| Connected Teams use-existing-assets rule | `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`; `docs/margot/access-and-data-requirements.md` | Prefer repo/docs/local assets; request access only when specifically blocked. |
| Senior PM daily loop | `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` | State discover -> decide -> route -> verify -> record -> repeat. |
| Integration stale-sync risk summary | `src/lib/runtime/stale-sync-check.ts`; `src/app/[locale]/command-center/layered/page.tsx`; `supabase/migrations/20260513000200_integration_schema.sql` | Distinguish missed cadence, last error, and never-synced mirrors; cite command-center surfacing; do not poll providers/read secrets/write DBs. |
| Command-center current status citation | `docs/margot/MARGOT-COMMAND-CENTER.md`; `docs/margot/ai-enhancement-candidate-register.md`; `docs/margot/morning-report.md` | Cite current rotation guard/register/morning report; preserve sandbox, Mac Mini, and auth blockers without invented live state. |

The source-citation fixture gate treats semantic retrieval as usable only when every required source is cited at or above the `0.76` threshold; otherwise it requires an exact file-read fallback before answering. The answer-shape gate now adds seven mocked/static checks:

| Answer-shape fixture | Required shape | Rejected overclaims |
| --- | --- | --- |
| Integration stale-sync summary | Must name missed cadence, last error, never synced, no provider polling, no secret reads, and no production database writes; must cite stale-sync helper, command-center layered page, and integration schema. | Provider polling completed, credentials loaded, production DB updated, env mutated, Nango. |
| Command-center current status | Must name current rotation guard, sandbox authority/auth, Mac Mini authenticated artifact transport, next safe lane, and local-only retrieval; must cite Command Center, candidate register, and morning report. | Sandbox apply completed, Mac Mini artifacts recovered, production adoption approved, live semantic threshold changed, Nango. |
| Report handoff summary | Must name report read-back, safety notes, next safe action, no live vector search, no external AI calls, and exact file reads before command-center surfacing; must cite the generated AI-RET-001 report, candidate register, and morning report. | Read-back skipped, safety notes optional, live vector search completed, external AI call completed, provider account connected, Nango. |
| Gated-action recommendation | Must frame any action recommendation as local evidence only and explicitly state sandbox apply, production DB writes, deployments, and client-facing sends remain gated; must cite Command Center, progress log, and morning report. | Sandbox apply is approved, production DB write completed, deployment completed, published to client, GitHub push completed, Nango. |
| Daily CRM digest operator-only summary | Must state digest output is operator decision support only, uses explicit source labels, performs no automatic sends or public publishing, stays behind guarded server routes, and does not read production data outside approved routes; must cite the digest template, digest helper, and candidate register. | Digest sent to client, published publicly, production data scraped, email sent automatically, CRM records mutated, Nango. |
| Access-request / new-vendor boundary | Must state use existing assets first, escalation only for a specific blocked task with a named missing source, least-privilege staged request, no new vendor, and fallback using existing tools; must cite Connected Teams rules, access/data requirements, and the candidate register. | Sign up for Nango, new connector platform approved, request broad access, pause until new AI source, external account created. |
| Mac Mini recovery boundary | Must state SMB reachable, SSH unavailable, no authenticated non-system mount, 0 recovered artifacts, no credential prompt, and recovery blocked until authenticated SMB mount or usable SSH or approved export; must cite Mac Mini status, progress log, and morning report. | Artifacts recovered, SSH copied, password entered, credential loaded, secret printed, recursive system-volume scan. |

It performs no live vector search, no external AI calls, no DB access, and no vendor/account setup. The report runner is deterministic/static: it evaluates mocked retrieval candidates and mocked answer text, writes only under `docs/margot/evidence/`, refuses paths outside that safe root, summarizes 7/7 source fixtures plus 7/7 answer-shape fixtures when green, reads the file back, verifies pass/total and fallback/mismatch counts, and fails closed if the markdown summary, fixture-result section boundaries, fixture-result row counts/status counts, safety notes, or next-action evidence do not match the generated summary. The current focused test suite also rejects internally inconsistent summary rows so a malformed report cannot claim impossible counts such as 7 total / 7 pass / 1 needs action, rejects duplicate summary rows that could hide conflicting counts under the same label, rejects duplicate overall-status rows that could hide conflicting handoff state, rejects duplicate `Safety notes` or `Next safe action` sections that could hide contradictory handoff text, rejects duplicate `Source-citation fixture results` or `Answer-shape fixture results` sections that could hide conflicting evidence rows behind a green summary, rejects missing fixture-result sections when summary counts claim evidence rows exist, rejects unexpected fixture-result row statuses before reconciling totals/pass/action counts, rejects truncated or contradictory fixture-result rows that do not reconcile with summary totals/pass/action counts, rejects overall-status contradictions such as `pass` with non-zero action counts or `action_required` with zero action counts, rejects report-handoff summaries that skip read-back/safety proof or overclaim live vector/external AI work, rejects gated-action recommendations that convert local evidence into sandbox apply, production DB, deployment, client publishing, or GitHub push claims, rejects digest summaries that imply automatic client sends, public publishing, production-data scraping, email sending, or CRM mutation, rejects access-request summaries that skip existing assets or approve new vendors/accounts, and rejects Mac Mini recovery summaries that turn SMB reachability into invented recovered artifacts, SSH copy, credential use, secret printing, or recursive system-volume scanning.

## Safety summary

- New vendor introduced: no.
- Nango or connector platform used: no.
- GitHub push/merge/PR mutation: no.
- Vercel deploy/env mutation: no.
- Production DB write or migration: no.
- Sandbox wizard DB-writing/status command: no.
- Secrets printed/stored/read: no.
- Client-facing send/publish/action: no.
- External AI enrichment over client/lead data: no.

## Next safe slice

Expand `AI-RET-001` with additional local report corruption/error-path cases or more mocked command-center answer-shape cases while keeping `AI-CRM-001` / `AI-CRM-002` plus the retrieval report runner/read-back/gated-action boundary gates green and the sandbox voice/task DB boundary gated.
