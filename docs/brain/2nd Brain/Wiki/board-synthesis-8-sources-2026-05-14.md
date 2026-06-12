---
type: wiki
updated: 2026-05-14
---

# Board Synthesis — 8 New Sources Ingested 2026-05-14

**Sources read:** 8 YouTube/article notes added by Phill to `Sources/` today. Each got a dedicated researcher; outputs saved to `research-*-2026-05-14.md` files. This page is the **single Board-verdict synthesis** + execution plan.

---

## Verdict matrix

| # | Source | Researcher verdict | Action |
|---|---|---|---|
| 1 | Vercel "vibe coding fix" | 🟡 EVALUATE — it's `vercel-labs/deepsec` OSS SAST CLI, not a platform feature | Manual scan of Stripe webhook + magic-link routes this week (~$20 inference) |
| 2 | Mythos OSS | 🔴 SKIP — brief was wrong; Mythos is Anthropic Project Glasswing (gated, closed). All 4 swap candidates rejected | Build "Glasswing-style rollout protocol" wiki page as the durable lesson |
| 3 | AI medical (MAMMAL) | 🔴 SKIP — IBM model, zero portfolio fit. Pursuing IAQ angle would be AI slop | One-line note in `agency-hierarchy.md` only |
| 4 | 22 Claude SEO prompts | 🟢 ADOPT — 11 collapse into our existing DataForSEO suite; 11 net-new fold to **3 skills + 1 playbook + 2 extensions** | Ship Prompt #14 on CCW `/carpet-cleaning-melbourne` this week (Toby on holiday = zero-disruption ship window) |
| 5 | HF Agent Trains | 🟢 ADOPT (Traces) / 🟡 EVALUATE (trainer) / 🔴 SKIP (preamble fine-tune until Q3 — need ≥5k examples) | Enable HF Traces push tonight + corpus-growth dashboard |
| 6 | 5 AI CEOs 2026 marketing | 🟢 ADOPT — citation frequency replaces rank/click; <1% traffic / 9.7% B2B revenue / GEO ROI −28 → +144% | Ship `marketing-analytics-attribution` v2 with AI citation probes |
| 7 | Anthropic $100B compute (Krishna Rao CFO) | 🟢 SUPPORTS the $2B plan | Decision memo: **STAY on Anthropic through Q2 2027** + migrate Pi-CEO Max→API billing |
| 8 | Pinecone knowledge layer | 🟢 ADOPT META-LESSON (not Pinecone itself) — preamble_trainer is already the right shape; output needs upgrade to typed entities | Extend `preamble_trainer.py` to emit typed-entity JSON (~40 LOC, zero new deps) |

---

## Cross-cutting themes (Board synthesis)

### Theme A — **Knowledge architecture upgrade** (Pinecone + HF agree)

Both #5 and #8 converge: agents waste up to **85% of compute** on rediscovery — re-fetching things they've already seen. The fix is typed-entity emission (`{people, decisions, deadlines, blockers, commitments}` with confirmed-vs-inferred + source provenance), not new vector DBs. **Phill's `preamble_trainer.py` is already 80% there** — it just needs the output schema upgraded.

**Single highest-leverage shift this week:** `preamble_trainer.py` v2 emits `preamble.json` alongside `preamble.md`. ~40 LOC, no new deps. This is the change that unlocks the future fine-tune path (Source #5) and the future agent-callable knowledge API (Source #8).

### Theme B — **Marketing KPI shift: rank → citation-frequency** (5 CEOs + 22 SEO prompts agree)

#4 and #6 both confirm: SEO is now AEO/GEO. Citation frequency in ChatGPT/Perplexity/Claude/Gemini answers is the new ranking metric. Phill needs to **own this metric before competitors notice it exists** (~6-month window). Concrete moves:

- `marketing-analytics-attribution` v2: AI citation probes (run a fixed query set against ChatGPT/Perplexity/Claude/Gemini daily, count citations of client domains)
- `marketing-seo-researcher` → rename + extend to `marketing-aeo-researcher` (citation-target keyword research)
- 3 new SEO skills (`seo-gbp-audit`, `seo-page-fix`, `seo-gbp-posting`) + the playbook
- Client sequencing: **Duncan → CCW (post-26-May) → Bulcs Holdings**

### Theme C — **Strategic stability: Anthropic SUPPORTS the $2B plan** (Source #7)

Rao's interview is substantive (13+ hard numbers): $9B → $30B Q1 ARR, >500% NDR, 9 of Fortune 10, >$100B compute committed (5 GW Google/Broadcom TPU from 2027 + 5 GW Amazon Trainium + xAI Colossus near-term), >90% of Anthropic's own code written by Claude Code. Inference efficiency compounds per Opus gen; pricing is stable (only move was a Opus 4.5 cut → Jevons). **Two real risks:**

1. Anthropic verticalising into "Claude for X" could one day compete with ATIA's SaaS layer — **mitigated by standards-body moat** (industry association sells trust + cert, not software per se)
2. Max-tier sits behind enterprise/API in capacity allocation — **mitigated by migrating Pi-CEO billing to API first-party** (separate Linear ticket)

**Decision memo today:** STAY on Anthropic through Q2 2027 with explicit re-evaluation triggers (price ↑25%, capacity drop, frontier model lag). Filed as `decision_anthropic_stay_through_q2_2027.md`.

### Theme D — **Security hygiene: the highest-stakes routes need a scan** (Source #1)

We just shipped 3 production-facing API routes that handle money + auth: `/api/webhooks/stripe`, `/api/admin/approvals/create`, `/api/approvals/[token]`. Per Source #1, `vercel-labs/deepsec` is an OSS agent-driven SAST CLI — pattern beats the tool, but the pattern is real: cheap regex pre-filter → LLM batch process → Git-aware revalidate. **One $20 manual scan this week** on those 3 routes is high-leverage insurance.

### Theme E — **Skip discipline** (Sources #2, #3)

Mythos and AI-medical produced one-line wiki notes only. Worth flagging because the reflexive temptation was "interesting, let's adopt" — both were correctly killed. Pattern to preserve: **default verdict is 🔴 unless a concrete portfolio fit exists**.

---

## Execution plan (this week, ranked by leverage)

| Priority | Action | Effort | Owner | Skill / file |
|---|---|---|---|---|
| **P0** | `preamble_trainer.py` v2: emit typed-entity `preamble.json` alongside `preamble.md` | 40 LOC + 3 tests | Pi-CEO swarm | `~/Pi-CEO/Pi-Dev-Ops/swarm/inbox/preamble_trainer.py` |
| **P0** | `decision_anthropic_stay_through_q2_2027.md` memory entry | 1 file | This session | `~/.claude/projects/-Users-phill-mac-2nd-Brain/memory/` |
| **P1** | `marketing-analytics-attribution` v2 with AI citation probes | New skill version | This session | `~/.claude/skills/marketing-analytics-attribution/SKILL.md` |
| **P1** | 3 new SEO skills + 1 playbook (`seo-gbp-audit`, `seo-page-fix`, `seo-gbp-posting`, `playbook_local_seo_gsc_review`) | 4 SKILL.md + 1 playbook | This session OR Friday batch | `~/.claude/skills/` |
| **P1** | Test Prompt #14 (On-Page SEO Audit PDF) on CCW `/carpet-cleaning-melbourne` | 1 test run | This week | Manual via existing `seo-report-pdf` skill |
| **P2** | Vercel `deepsec` $20 scan on Stripe webhook + magic-link routes | Single scan | This week | Manual one-off |
| **P2** | Enable HuggingFace Traces push from Pi-CEO swarm | 1 cron config | Friday | `~/Pi-CEO/Pi-Dev-Ops/` |
| **P3** | Linear ticket: migrate Pi-CEO billing Max console → API first-party | Filing only | Now | Linear UNI team |
| **P3** | Pi-CEO corpus-growth dashboard (counts preambles, messages, wiki edits) | Defer | Q3 | Linear ticket |
| **DEFER** | Preamble fine-tune (Qwen-2.5-7B PEFT LoRA) | Skip | Q3 2026 | Needs ≥5k labelled examples first |
| **DEFER** | Migrate swarm onto Hermes Kanban | Skip | ceo-board call when reliability becomes bottleneck | — |

---

## Wiki updates (per `wiki-ingest` skill protocol, cap 10–15 pages)

| Page | Edit summary |
|---|---|
| `pi-ceo-architecture.md` | Add "Knowledge Layer (post-2026-05-14 upgrade)" section — preamble_trainer v2 emits typed entities |
| `agent-memory-patterns.md` (new if missing) | Created — typed-entity emission pattern, bundle loader convention |
| `master-plan-2b-by-2028-v3.md` | Insert new §1.5 "Anthropic trajectory dependency" with the 13 Rao numbers |
| `agency-hierarchy.md` | One-line note: multimodal generalists > specialists when domains causally linked (MAMMAL evidence) |
| `marketing-pack-overview.md` (or new `aeo-geo-pivot.md`) | Citation-frequency KPI replaces rank/click; data: <1% traffic, 9.7% B2B rev, GEO ROI −28→+144% |
| `local-seo-playbook.md` (new) | Aggregation of 11 net-new prompts into 3 skills + 1 playbook structure |
| `hermes-agent.md` | Glasswing-style rollout protocol (lesson from Mythos) — staged 5-tier model trial framework |
| `model-routing.md` (new if missing) | Records what runs where today: claude-sonnet-4-6 for computer-use, qwen3.6-plus Hermes default, gemini-3.1-pro grounded research |
| `index.md` | Add new pages: `aeo-geo-pivot`, `local-seo-playbook`, `agent-memory-patterns`, `glasswing-rollout-protocol` |
| `log.md` | `2026-05-14 ‖ ingest ‖ 8 sources synthesised ‖ knowledge-layer upgrade + AEO/GEO pivot + Anthropic stay-decision` |

Total touched: **10 pages** (within cap).

---

## Memory updates

| Category | New entry | Captures |
|---|---|---|
| `decision_` | `decision_anthropic_stay_through_q2_2027` | Rao interview supports the $2B plan; explicit STAY through Q2 2027 with 3 re-evaluation triggers |
| `playbook_` | `playbook_local_seo_gsc_review` | Recurring Google Search Console review pattern from Prompt #16+ |
| `metric_` | `metric_ai_citation_frequency` | New KPI — AI citation count per query bundle; targets per portfolio brand |

---

## Recommendation

**Implement P0 + the decision memo NOW** (this session) — they're zero-risk, high-compounding, and unlock every subsequent agent improvement. Queue P1 for Friday's batch (after BotFather rate-limit clears and the Duncan deposit flow is unblocked). P2 is opportunistic. Everything else is correctly deferred.

The single most leverage-dense move: **`preamble_trainer.py` v2 typed-entity emission**. Every agent in the Pi-CEO swarm gets cheaper + more reliable retrieval the moment this lands. ~40 LOC. Going now.

— **Synthesised by Claude Opus 4.7 (this session)** based on outputs from 8 parallel deep-research agents.
