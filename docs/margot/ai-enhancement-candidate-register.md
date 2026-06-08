# Margot AI Enhancement Candidate Register

Date: 2026-06-08 21:44 AEST
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
| AI-RET-001 | Retrieval evaluation harness for Margot docs | retrieval / QA | `implemented_local` | `docs/margot/retrieval-rules.md`; `scripts/margot-semantic-search-wrapper.ts`; `src/lib/margot/retrieval-evaluation.ts`; `scripts/margot-retrieval-evaluation-report.ts`; `tests/unit/lib/margot/retrieval-evaluation.test.ts`; `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`; read-first docs; current progress logs; stale-sync helper/page/schema sources; answer-shape fixtures for stale-sync, command-center summaries, and report handoff; report read-back parser/assertions; inconsistent-count, missing-handoff-block, and read-back/safety-proof omission tests | 12/15: revenue 1, operating 3, data 3, client 2, strategic 3 | No external vector vendor or account setup; no client-sensitive corpora without approval; semantic answers must cite exact files or fall back to file reads; command-center/stale-sync/report-handoff summaries must not overclaim gated progress or skip local evidence read-back. | Keep the mocked/static fixture, answer-shape, local report-runner, and report read-back gates green; next safe expansion is more mocked command-center answer shapes or additional report corruption/error-path cases before changing thresholds or live retrieval behavior. |
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

The first retrieval evaluation harness is now local-only and implemented in `src/lib/margot/retrieval-evaluation.ts`, with mocked/static coverage in `tests/unit/lib/margot/retrieval-evaluation.test.ts`, a local-only report runner at `scripts/margot-retrieval-evaluation-report.ts`, and a report read-back parser/assertion gate that verifies the generated markdown summary, safety notes, and next-safe-action block before command-center handoff. It now covers source-citation requirements, answer-shape requirements, generated evidence at `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`, and report integrity/error-path checks for malformed rows, internally inconsistent pass/action counts, missing safety/next-action blocks, and handoff wording that skips read-back/safety proof.

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

The source-citation fixture gate treats semantic retrieval as usable only when every required source is cited at or above the `0.76` threshold; otherwise it requires an exact file-read fallback before answering. The answer-shape gate now adds three mocked/static checks:

| Answer-shape fixture | Required shape | Rejected overclaims |
| --- | --- | --- |
| Integration stale-sync summary | Must name missed cadence, last error, never synced, no provider polling, no secret reads, and no production database writes; must cite stale-sync helper, command-center layered page, and integration schema. | Provider polling completed, credentials loaded, production DB updated, env mutated, Nango. |
| Command-center current status | Must name current rotation guard, sandbox authority/auth, Mac Mini authenticated artifact transport, next safe lane, and local-only retrieval; must cite Command Center, candidate register, and morning report. | Sandbox apply completed, Mac Mini artifacts recovered, production adoption approved, live semantic threshold changed, Nango. |
| Report handoff summary | Must name report read-back, safety notes, next safe action, no live vector search, no external AI calls, and exact file reads before command-center surfacing; must cite the generated AI-RET-001 report, candidate register, and morning report. | Read-back skipped, safety notes optional, live vector search completed, external AI call completed, provider account connected, Nango. |

It performs no live vector search, no external AI calls, no DB access, and no vendor/account setup. The report runner is deterministic/static: it evaluates mocked retrieval candidates and mocked answer text, writes only under `docs/margot/evidence/`, refuses paths outside that safe root, summarizes 7/7 source fixtures plus 3/3 answer-shape fixtures when green, reads the file back, verifies pass/total and fallback/mismatch counts, and fails closed if the markdown summary/safety/next-action blocks do not match the generated summary. The current focused test suite also rejects internally inconsistent summary rows so a malformed report cannot claim impossible counts such as 7 total / 7 pass / 1 needs action, and rejects report-handoff summaries that skip read-back/safety proof or overclaim live vector/external AI work.

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

Expand `AI-RET-001` with more mocked command-center answer-shape cases or local report integrity cases while keeping `AI-CRM-001` / `AI-CRM-002` plus the retrieval report runner/read-back gate green and the sandbox voice/task DB boundary gated.
