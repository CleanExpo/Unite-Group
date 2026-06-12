---
type: wiki
updated: 2026-05-15
---

# Skills Architecture Audit (2026-05-15)

Senior-PM audit of the 76-skill `~/.claude/skills/` ecosystem against the Matt Pocock reference repo (`github.com/mattpocock/skills`, 19 skills). The seed problem was already named in [[research-agentic-os-critique-2026-05-14]] §3 ("Skill discoverability gap. 73 skills is enormous; the author warns about exactly this problem with 'awesome claude skills' mega-repos"). This page does the deletion + consolidation work that critique implied. Bench: [[research-browser-use-org-2026-05-15]] is the same source family — small, composable, no abstraction tax — and the bar is [[feedback-tight-code]] (browser-use harness, ~600-1000 lines, 4 core files; "delete more than you add").

Memory rules honoured: [[feedback-no-slack]] · [[feedback-secrets-handling]] · [[feedback-make-calls-not-questions]] · [[feedback-quality-over-quantity]] · [[feedback-substrate-change-discipline]] · [[feedback-botfather-hardwire-2026-05-15]].

Anti-scope respected: no new skills proposed; no skill code touched (design + plan only); no video-skill changes per Phill's explicit "no more videos for now"; no Pilot / agency-tinder-game changes.

Method note: I counted SKILL.md frontmatter + body line totals only — never read skill bodies, per the audit brief. Counts are `wc -l` of `<skill>/SKILL.md`.

---

## 1. Matt Pocock pattern — verbatim extraction

**Repo shape.** 19 skills in **3 flat folders** — `engineering/` (10), `productivity/` (4), `misc/` (5). Each skill is a directory with a `SKILL.md`. No deep nesting; no central index router file in the repo.

**Design philosophy (README, verbatim):** "These skills are designed to be small, easy to adapt, and composable. They work with any model. They're based on decades of engineering experience."

**Failure modes the skills address (README, verbatim):**
- Misalignment between intent and execution
- Agent verbosity
- Non-functional code
- Architectural degradation

**Composition rule (README, verbatim):** "Variables, functions and files are named consistently, using the shared language." Skills compose through shared configuration (set up via `/setup-matt-pocock-skills`) and through domain documents (`CONTEXT.md`, ADRs). For example, `/improve-codebase-architecture` consumes `CONTEXT.md` + `docs/adr/`.

**Three rules implied by the structure (mine, distilled from his layout):**
1. **Flat-by-purpose, not flat-by-flat.** Three folders (engineering / productivity / misc) — enough taxonomy to find a skill, not enough to invite over-categorisation.
2. **One skill, one job.** No skill has a `-orchestrator` companion; no skill that "dispatches" other skills exists in the repo. (Pocock has no orchestrator layer at all — that's a constraint we can't fully match because the marketing + remotion + video stacks are inherently multi-skill, but it's the bar.)
3. **No status frontmatter.** No skill is marked `proposed`, `draft`, or `unknown` — every skill in the repo is either there or it isn't. Compare our 3 `curator-*-unknown` skills (§3).

**Discoverability / indexing.** Pocock does not ship a top-level `skills/index.md`. At 19 skills the folder names are the index. At 76 skills (us) the folder names are no longer enough — that's the [[research-agentic-os-critique-2026-05-14]] finding. This audit is the precondition; the index is the follow-up (out of scope here, in scope for the Board).

---

## 2. Our current skills snapshot

76 SKILL.md files counted across `~/.claude/skills/` (74) + `~/2nd Brain/.agents/skills/` (2 — both symlinked back into `~/.claude/skills/`). The `cua-driver` skill (887 lines) is the largest by 25%; the smallest is `agent-shopping-safe-checkout` (32 lines). Median ≈ 99 lines. Pocock's typical skill is ≪200 lines based on his repo's density. **Median ratio: ours is ~roughly within range; outliers are the audit target.**

Trigger clarity rubric: HIGH = single unambiguous when-to-fire description in frontmatter; MED = description fires for ≥2 distinct triggers; LOW = ambiguous or overlaps another skill's frontmatter.

Verdict: **KEEP** · **CONSOLIDATE → target** · **DELETE** · **SUNSET-30d** (mark for removal if untouched 30d).

| Skill | Lines | Trigger | Last touched | Verdict |
|---|---:|---|---|---|
| cua-driver | 887 | HIGH | 2026-05-13 | KEEP (load-bearing — only macOS-GUI substrate) |
| nlm-skill | 710 | HIGH | 2026-04-14 | KEEP (NotebookLM lane is unique) |
| ceo-board | 349 | HIGH | 2026-05-10 | KEEP (load-bearing decisioning) |
| video-use | 322 | HIGH | 2026-05-15 | KEEP (different lane from Remotion — anti-scope) |
| frontend-slides | 322 | HIGH | 2026-05-11 | KEEP |
| seo | 309 | MED | 2026-05-08 | KEEP (entry skill, dispatches sub-`seo-*`) |
| brand-guardian | 247 | HIGH | 2026-05-11 | KEEP |
| qa-lead | 194 | HIGH | 2026-05-10 | KEEP |
| marketing-orchestrator | 174 | HIGH | 2026-05-10 | KEEP |
| remotion-orchestrator | 163 | MED | 2026-05-05 | CONSOLIDATE → video-director (entry-point overlap, anti-scope — flag only) |
| seo-audit | 156 | HIGH | 2026-05-08 | KEEP |
| composio-cli | 152 | HIGH | 2026-05-01 | KEEP |
| curator-security-unknown | 151 | HIGH | 2026-05-10 | KEEP **but rename** (drop `-unknown`; status=proposed → ship) |
| curator-deployment-unknown | 137 | HIGH | 2026-05-11 | KEEP **but rename** |
| seo-technical | 122 | HIGH | 2026-05-08 | KEEP |
| pm-core | 119 | HIGH | 2026-05-10 | KEEP |
| curator-scheduled-tasks-unknown | 119 | HIGH | 2026-05-10 | KEEP **but rename** |
| semrush | 119 | HIGH | 2026-05-08 | CONSOLIDATE → seo (single SEO entry point) |
| marketing-icp-research | 117 | HIGH | 2026-05-07 | KEEP |
| video-script-writer | 116 | HIGH | 2026-05-14 | KEEP (anti-scope: no video changes) |
| marketing-social-content | 116 | HIGH | 2026-05-10 | KEEP |
| seo-backlinks | 116 | HIGH | 2026-05-08 | KEEP |
| seo-content | 113 | HIGH | 2026-05-08 | KEEP |
| supabase | 112 | HIGH | 2026-05-14 | KEEP |
| seo-competitors | 112 | HIGH | 2026-05-08 | KEEP |
| marketing-launch-runbook | 112 | HIGH | 2026-05-03 | KEEP |
| seo-keywords | 110 | HIGH | 2026-05-08 | KEEP |
| video-director | 109 | HIGH | 2026-05-14 | KEEP (anti-scope — entry point) |
| remotion-colour-family | 109 | MED | 2026-05-10 | CONSOLIDATE → remotion-designer (overlap) |
| video-orchestrator | 107 | MED | 2026-05-14 | CONSOLIDATE → video-director (anti-scope — flag only) |
| video-brand-guardian | 107 | MED | 2026-05-14 | CONSOLIDATE → brand-guardian (anti-scope — flag only) |
| composio-cloud-routine | 107 | HIGH | 2026-04-27 | KEEP |
| marketing-copywriter | 105 | HIGH | 2026-05-15 | KEEP |
| seo-watchlist | 105 | HIGH | 2026-05-08 | KEEP |
| marketing-analytics-attribution | 104 | HIGH | 2026-05-15 | KEEP |
| video-editor | 104 | HIGH | 2026-05-14 | KEEP (anti-scope) |
| notebooklm-overlay | 103 | HIGH | 2026-05-15 | KEEP |
| video-distribution-strategist | 103 | HIGH | 2026-05-14 | KEEP (anti-scope) |
| seo-report | 103 | HIGH | 2026-05-08 | KEEP |
| marketing-positioning | 97 | HIGH | 2026-05-03 | KEEP |
| seo-content-gap | 95 | MED | 2026-05-08 | CONSOLIDATE → seo-content (sub-aspect) |
| remotion-render-pipeline | 94 | HIGH | 2026-05-03 | KEEP |
| marketing-seo-researcher | 94 | MED | 2026-05-03 | CONSOLIDATE → marketing-copywriter + seo (split) |
| seo-report-pdf | 93 | MED | 2026-05-08 | CONSOLIDATE → seo-report (format flag) |
| marketing-channel-strategist | 92 | HIGH | 2026-05-03 | KEEP |
| video-cinematographer | 91 | HIGH | 2026-05-14 | KEEP (anti-scope) |
| stripe-milestone-invoice | 91 | HIGH | 2026-05-14 | KEEP |
| seo-compare | 91 | MED | 2026-05-08 | CONSOLIDATE → seo (sub-aspect) |
| codex-adversarial | 91 | MED | 2026-04-27 | CONSOLIDATE → opus-adversary (Anthropic Max — Opus 4.7 is the routed default per [[feedback-model-routing-max-first]]) |
| remotion-designer | 84 | HIGH | 2026-05-10 | KEEP |
| seo-rankings | 84 | HIGH | 2026-05-08 | KEEP |
| remotion-brand-codify | 83 | HIGH | 2026-05-10 | KEEP |
| seo-page-fix | 82 | HIGH | 2026-05-14 | KEEP |
| design-pressure-test | 82 | HIGH | 2026-04-27 | CONSOLIDATE → opus-adversary (same Opus-subagent pattern, different phase) |
| video-sound-designer | 81 | HIGH | 2026-05-14 | KEEP (anti-scope) |
| marketing-campaign-planner | 81 | HIGH | 2026-05-05 | KEEP |
| opus-adversary | 80 | HIGH | 2026-04-27 | KEEP (consolidation target) |
| video-colorist | 78 | HIGH | 2026-05-14 | KEEP (anti-scope) |
| sow-draft | 77 | HIGH | 2026-05-14 | KEEP |
| seo-quick | 76 | MED | 2026-05-08 | CONSOLIDATE → seo (60-second snapshot is a flag) |
| wiki-ingest | 75 | HIGH | 2026-05-10 | KEEP |
| seo-gbp-posting | 74 | HIGH | 2026-05-14 | KEEP |
| parallel-delegate | 74 | HIGH | 2026-04-27 | KEEP |
| client-portal-provision | 73 | HIGH | 2026-05-14 | KEEP |
| remotion-composition-builder | 73 | HIGH | 2026-05-10 | KEEP |
| remotion-brand-research | 72 | HIGH | 2026-05-05 | KEEP |
| aura | 67 | LOW | 2026-05-07 | SUNSET-30d (0 log refs; description not in frontmatter list above) |
| supabase-postgres-best-practices | 64 | MED | 2026-05-14 | CONSOLIDATE → supabase (sub-aspect of one canonical Supabase skill) |
| seo-gbp-audit | 63 | HIGH | 2026-05-14 | KEEP |
| remotion-screen-storyteller | 62 | HIGH | 2026-05-03 | KEEP |
| connector-routing | 60 | HIGH | 2026-04-27 | KEEP (load-bearing routing rule) |
| remotion-marketing-strategist | 59 | MED | 2026-05-03 | CONSOLIDATE → marketing-channel-strategist (channel = aspect ratio + duration) |
| empire-status | 56 | HIGH | 2026-05-09 | KEEP |
| remotion-motion-language | 54 | MED | 2026-05-03 | CONSOLIDATE → remotion-designer (overlap) |
| empire-ignite | 53 | LOW | 2026-05-09 | SUNSET-30d (0 log refs; description unclear vs empire-status) |
| production-gate | 40 | HIGH | 2026-05-09 | KEEP |
| margot-align | 33 | LOW | 2026-05-09 | SUNSET-30d (0 log refs; description vague) |
| agent-shopping-safe-checkout | 32 | LOW | 2026-05-15 | DELETE (32-line stub; never referenced in 30d log; no portfolio use case) |

**Tallies:** 76 total — **KEEP 51** (3 of which rename to drop `-unknown`) · **CONSOLIDATE 12** · **DELETE 1** · **SUNSET-30d 3** · **anti-scope flagged but unchanged 9** (all `video-*` + `remotion-orchestrator` that overlaps video-director).

---

## 3. Bloat catalog

Ranked by leverage (highest first).

### 3.1 Duplicate-trigger overlap (the headline finding)
- **`video-director` + `video-orchestrator` + `remotion-orchestrator`** all fire on "make a video / I need a video / explainer / promo / social cut". Three skill names match the same intent phrase. Per [[research-agentic-os-critique-2026-05-14]] L48 ("Claude — and Phill — can't easily find the right one"), this is exactly the "awesome claude skills" sprawl Pocock's repo avoids. **Anti-scope holds: do not change in this audit**, but flag for the next video-skill housekeeping pass.
- **`brand-guardian` + `video-brand-guardian`**: same trigger surface (brand voice + factual gate), one is video-scoped. Pocock would have one `brand-guardian` with a `--scope=video` flag, not two skills. **Flagged anti-scope.**
- **`seo` + `semrush` + `seo-quick` + `seo-compare`** all fire on "seo / domain check / rank check / compare domains". `seo` is the entry that dispatches sub-skills; `semrush` overlaps with `seo-keywords`+`seo-rankings`+`seo-content` (all use DataForSEO); `seo-quick` is a 60-second variant of `seo`; `seo-compare` is a sub-mode. Merge target: keep `seo` as single entry, fold `semrush` + `seo-quick` + `seo-compare` + `seo-report-pdf` + `seo-content-gap` in as flags/modes.
- **`opus-adversary` + `design-pressure-test` + `codex-adversarial`** all spawn a higher-tier adversarial subagent. `opus-adversary` is post-implementation Opus review; `design-pressure-test` is pre-implementation Opus review; `codex-adversarial` is Codex (now redundant per [[feedback-model-routing-max-first]] — Claude Max is the routed default). Merge to one `opus-adversary` with `--phase=design|review`.

### 3.2 Single-use skills (zero log refs in 30 days)
Grepped `Wiki/log.md` (439 lines, full history): 14 of 17 audited standalone skills have **0** occurrences. Most-cited skills are `ceo-board` (24 — counting "ceo-architecture" hits skews), `brand-guardian` (4), `qa-lead` (2), `marketing-copywriter` (2). 
- **Zero-ref:** aura · codex-adversarial · composio-cloud-routine · connector-routing · cua-driver · design-pressure-test · empire-ignite · empire-status · margot-align · nlm-skill · notebooklm-overlay · parallel-delegate · production-gate · wiki-ingest.
- **Important caveat:** zero log-ref does **not** mean zero usage — most skill invocations happen in sessions that don't generate a wiki log line. So this list is a triage filter, not a death warrant. Used in this audit only for the SUNSET-30d marking when paired with a LOW/MED trigger and a duplicated lane.

### 3.3 Over-abstracted / orchestrator-on-orchestrator
- **`marketing-seo-researcher`** is the cleanest example: it lives in the marketing pack but defers to the `seo-*` family for actual SEO work. Per Pocock's "one skill, one job" rule, this is a thin glue wrapper. Merge target: have `marketing-copywriter` call `seo` directly for keyword work; delete the glue.
- **`remotion-marketing-strategist`** is "channel strategy for video" — but `marketing-channel-strategist` already exists and already sets aspect-ratio + duration. The two duplicate.
- **`remotion-motion-language` + `remotion-colour-family` vs `remotion-designer`** — all three are visual-design aspects of a Remotion render. `remotion-designer` is the parent; the other two are sub-aspects that should be sections inside the parent's SKILL.md.
- **`supabase-postgres-best-practices` vs `supabase`** — two skills for one substrate. Pocock would have one `supabase` skill with a "Performance" section.

### 3.4 Half-built skills (`-unknown` suffix + `status: proposed` frontmatter)
- `curator-scheduled-tasks-unknown` (119 lines, status=proposed)
- `curator-security-unknown` (151 lines, status=proposed)
- `curator-deployment-unknown` (137 lines, status=proposed)

All three are real, high-value skills with HIGH-clarity triggers — but the **name carries `-unknown`** and the frontmatter still says `status: proposed`. Pocock has no equivalent: every skill in his repo is shipped. **Rename to drop `-unknown`, flip status to active, move on.** This is the single cheapest cleanup in the audit (3 files, ≤5 minutes each).

### 3.5 Stale / orphan skills (referenced in old wiki, not in recent sessions)
- **`agent-shopping-safe-checkout`** (32 lines, last touched 2026-05-15 — but the body is a 32-line stub that's been the same shape since creation). No portfolio use case fits; not the cua-driver lane, not the Synthex creator lane, not the SEO lane. **DELETE.**
- **`aura`** (67 lines, LOW trigger clarity). Description not surfaced in any system reminder. Likely an experiment that never landed. **SUNSET-30d.**
- **`empire-ignite` vs `empire-status`** — two empire-* skills, only one has a clear unique trigger (status snapshot). `empire-ignite` reads like a sibling that doesn't differentiate enough. **SUNSET-30d the ignite variant.**
- **`margot-align`** (33 lines, LOW). Margot context-refresh is a real operation, but a 33-line skill is either right-sized or under-documented; given 0 log refs and a vague description, it reads as under-documented. **SUNSET-30d** (revisit after Wave-1 Margot work confirms it's used).

### 3.6 The Pocock bar — where we don't match
Pocock has 19 skills, we have 76. Even after this audit's deletions + consolidations, we'd land at **≈62**. That's still 3.2× Pocock. The honest answer: we run a portfolio of 6 businesses + ATIA + a video agency + a marketing pack + an SEO pack, and Pocock runs one consulting practice. The bar isn't "match 19" — the bar is **"every skill earns its slot."** This audit makes 16 skills argue for their slot; 4 lose.

---

## 4. Consolidation recommendations

Capped at 12 merges. Each row reduces the surface area without losing capability.

| Merge | Target | Rationale | Est. lines saved |
|---|---|---|---:|
| `semrush` → `seo` | `seo` | Both use DataForSEO; semrush is just the Semrush-flavoured variant. Keep as `--source=semrush` mode. | ~80 |
| `seo-quick` → `seo` | `seo` | 60-sec snapshot is a `--mode=quick` flag, not a separate skill. | ~50 |
| `seo-compare` → `seo` | `seo` | Cross-domain compare is a `--targets=A,B` flag. | ~60 |
| `seo-content-gap` → `seo-content` | `seo-content` | "Gap analysis" is a section inside topical authority. | ~70 |
| `seo-report-pdf` → `seo-report` | `seo-report` | PDF is an output format flag, not a skill. | ~65 |
| `marketing-seo-researcher` → `marketing-copywriter` + `seo` | (split) | Glue wrapper; the two real users (copywriter + seo) take it directly. | ~70 |
| `remotion-colour-family` → `remotion-designer` | `remotion-designer` | Colour family is a design aspect; merge as a section. | ~85 |
| `remotion-motion-language` → `remotion-designer` | `remotion-designer` | Motion language is a design aspect; merge as a section. | ~35 |
| `remotion-marketing-strategist` → `marketing-channel-strategist` | `marketing-channel-strategist` | Channel choice sets ratio + duration; already in the marketing pack's lane. | ~45 |
| `supabase-postgres-best-practices` → `supabase` | `supabase` | One Supabase substrate, one skill, "Performance" section. | ~50 |
| `design-pressure-test` → `opus-adversary` | `opus-adversary` | Same Opus subagent pattern, different phase. Add `--phase=design\|review`. | ~75 |
| `codex-adversarial` → `opus-adversary` | `opus-adversary` | Codex routing is now redundant per [[feedback-model-routing-max-first]] (Claude Max = $0 marginal). | ~85 |

**Total estimated reduction: ~770 lines + 12 directory entries removed.** Discoverability gain: 76 → 64 visible skills.

Anti-scope hold: I did NOT propose the obvious `video-director` ↔ `video-orchestrator` ↔ `remotion-orchestrator` merge, nor `brand-guardian` ↔ `video-brand-guardian`, because Phill said no video changes. Those four would yield another ~440 lines + 3 directory entries if revisited later.

---

## 5. The 5 forks for Phill

Per [[feedback-make-calls-not-questions]] — binary forks with Board-recommended answers. Each is the minimum YES/NO needed to unlock the next action.

### Fork 1 — Execute the 12 consolidations + 1 delete + 3 sunsets above?
- **YES** = 16 skills disappear from the directory; ~770 lines of duplicated trigger-phrasing removed; 76 → 60 skills; the [[research-agentic-os-critique-2026-05-14]] §3 "discoverability gap" gets meaningfully smaller. Cost: ~2-3 hours of skill-file editing (mostly section moves, not rewrites).
- **NO** = leave as-is; revisit at next 90-day decay window.
- **Recommendation: YES.** The marketing-orchestrator + video-director stacks (the load-bearing ones) are untouched; the deletions are all duplicated lanes or never-fired stubs. Rollback is one `git revert`.

### Fork 2 — Rename the three `curator-*-unknown` skills + flip `status: proposed` → active?
- **YES** = `curator-scheduled-tasks-unknown` → `curator-scheduled-tasks`, `curator-security-unknown` → `curator-security`, `curator-deployment-unknown` → `curator-deployment`. 5-minute change per skill.
- **NO** = leave the half-built tag in the system; future Claude sessions keep treating them as not-real.
- **Recommendation: YES.** Cheapest cleanup in the audit. The skills are real, the content is HIGH-trigger, only the name lies.

### Fork 3 — Ship a `~/.claude/skills/index.md` router file?
- **YES** = One markdown table mapping intent phrase → skill name + a 3-line "when to use" per row. Maintained on consolidation events only (low-churn). Becomes Pocock's `CONTEXT.md`-equivalent for the skill ecosystem.
- **NO** = Rely on system-reminder skill names + frontmatter descriptions only; tolerate occasional wrong-skill invocations.
- **Recommendation: YES.** Already named in [[research-agentic-os-critique-2026-05-14]] §7 item 2 as the second-highest leverage move (2 hours of work). This audit produces the precondition (deletions first, index after — wrong order = stale index in 2 weeks).

### Fork 4 — Adopt a 200-line soft cap + 400-line hard cap on SKILL.md?
- **YES** = Anything ≥200 lines triggers a "can this be sectioned, flagged, or merged?" review at write-time. ≥400 lines requires explicit justification in frontmatter. Current outliers (`cua-driver` 887, `nlm-skill` 710) get grandfathered with a note; new outliers must justify.
- **NO** = No cap; let skills grow.
- **Recommendation: YES, soft only — no hard cap yet.** Pocock doesn't publish a cap rule; we shouldn't invent one without seeing it bite. Soft cap at 200 (median is 99, p75 is ~150) catches the next over-build before it ships.

### Fork 5 — Schedule a quarterly skills lint (the same way Wiki gets weekly lint)?
- **YES** = Every 90 days, re-run this audit's method (line counts + log-ref counts + frontmatter clarity) and produce a `skills-architecture-audit-YYYY-MM-DD.md` page. ~1 hour of agent time per quarter.
- **NO** = One-off audit; let entropy creep back.
- **Recommendation: YES.** The decay rule from Brain-1 wiki LINT applies to skills too. Cron candidate: 1st Saturday of each quarter.

---

## 6. Cross-refs

[[research-agentic-os-critique-2026-05-14]] · [[research-browser-use-org-2026-05-15]] · [[pm-synthesis-browser-use-org-2026-05-15]] · [[feedback-tight-code]] · [[feedback-no-slack]] · [[feedback-secrets-handling]] · [[feedback-make-calls-not-questions]] · [[feedback-quality-over-quantity]] · [[feedback-substrate-change-discipline]] · [[feedback-model-routing-max-first]] · [[feedback-design-preferences]] · [[ceo-board]] · [[qa-lead]] · [[brand-guardian]] · [[opus-adversary]]
