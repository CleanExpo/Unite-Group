---
type: wiki
updated: 2026-05-13
---

# Now — What's Firing Right Now

Last refreshed: **2026-05-13** (morning+midday+afternoon — Margot model switch from Gemma 4 → qwen3:14b after Llama 70B OOM + RestoreAssist sandbox DB recovery; see [[pathway-to-2b-2026-2028]] for the $2B operating filter all agents now read). This page is updated frequently. For 90-day horizon see [[operational-priorities-q2-2026]]; for multi-quarter horizon see [[wave-roadmap]].

## RestoreAssist sandbox recovered (2026-05-13 afternoon)

Sandbox `restoreassist-sandbox` was down for ~5h with `P1001: Can't reach database server` after `DATABASE_URL` got blanked on Vercel prod env. Fixed via `~/fix-ra-db.zsh` — one-command recovery script (auto-detect Supabase project, build pooler + direct URLs, write to Vercel, store in 1P, redeploy). Active sandbox Supabase = `udooysjajglluvuxkijp`. PR #957 also shipped: Next.js error.tsx boundaries on `/login` + `/signup` catch the React render crash from the iOS Apple/Google OAuth path (root cause of "site shuts down" symptom that triggered the precautionary revert #941). Sandbox LIVE at `https://restoreassist-sandbox.vercel.app`. Prod (`restoreassist`) `DATABASE_URL` still empty — separate fix when ready. See [[restore-assist]].

## Margot model live: qwen3:14b (NOT Llama 70B — OOM on Mac mini)

Llama 3.3 70B (39.6GB) OOMs this 24GB Mac mini — `model runner has unexpectedly stopped`. Deleted from disk. Gemma 4 (latest, 26b) hallucinates over its own in-context data — invents pathway content. Switched to qwen3:14b (8.6GB, 40K context) — passes 7/7 verbatim pathway-quote test. See [[pi-ceo-architecture]] §Margot Model Selection.

## Founder Directive 2026-05-13 — Captured in [[pathway-to-2b-2026-2028]] (NEW)

Five non-negotiable operating constraints, codified across all senior-agent SKILL.md files:
1. **NO AD SPEND.** CMO bot blocks every adspend request via `TAO_NO_AD_SPEND=1` default; Synthex is the in-house marketing engine.
2. **VETTED CLIENTS ONLY.** Phill personally vets every onboarding.
3. **VIDEO-FIRST for Phill** (learning-difficulty accessibility) — NotebookLM 7am brief + Margot ElevenLabs voice + the new 7:15am audit cron.
4. **AGENTS EXECUTE.** Phill = ideas man; Margot → Pi-CEO Board → 25 senior agents own execution.
5. **CRITICAL-ONLY updates.** 6-pager `SIX_PAGER_SILENT_ON_CLEAN=1` default — only 🔴/🚨 markers ping Telegram.

## Agent Empowerment Wave Shipped (2026-05-13 morning, plan at `docs/superpowers/plans/2026-05-13-agent-empowerment-pathway-alignment.md`)

T1-T6 from the plan all landed on `Pi-Dev-Ops:feat/internal-pivot-2026-05-11`:
- T1 — Margot model bumped `gemma4:latest → gemma4:26b` via `TAO_CHEAP_LOCAL_MODEL` (Llama 3.3 70B pull in flight, ~89%; flip to that once landed).
- T2 — Pathway hot-pin via `swarm/margot_context.py`: every Margot turn now has the $2B PATHWAY block at the top of the system prompt. Filesystem + Supabase wiki_pages fallback.
- T3 — Decision-rights quick-reference tables in `skills/{cs-tier1,cfo,cmo-growth,cto}/SKILL.md` showing autonomous vs HITL boundary per action class.
- T4 — `swarm/scout/internalisation_pipeline.py` — Scout-tagged Linear tickets → Synthex content brief in our voice (Pillar 2 of pathway). TDD scaffold; Phase B wires LLM calls.
- T5 — `~/.hermes/scripts/notebooklm_daily_audit.py` + cron at 07:15 AEST — silent on pass, 🚨 on miss/short/corrupt.
- T6 — `swarm/board/{personas,wiring}.py` — Wave 5.4 Pi-CEO Board (9-persona) scaffold. dispatch() is stub; Phase B will wire LLM calls per persona.

Commits: `a114da9 → 9968b3c → f5d93aa → c6725b8` (and earlier `6ce346c` for Margot prompt fix + 6-pager silent-on-clean).

## Production Stability Wins (2026-05-13 ~07:00)

- **GitHub seeder rate-limit fixed** (`a65d651` on main) — `shouldRunBranchSeeder()` gates the branch-map seeder to ≥20h since max(last_seen_at). Daily cadence instead of hourly, saving ~24× GitHub API quota. Verified: cron now completes in 37s (was timing out at 60s), 0 rate-limit errors.
- **Vercel integration token rotated to a CLASSIC personal access token** (1-year expiry) after the previous OAuth token died. Deployed `unite-group-51q2imii4-unite-group.vercel.app`. Token stored in 1Password under `VERCEL_INTEGRATION_TOKEN` in vault `Unite-Group-Infrastructure` (pending — `op` interactive signin needed for that step).
- **Integration mesh: 8/8 GREEN.** First full clean state today. Total rows synced: 38,956 (composio 0 · digitalocean 9 · github 2,953 · linear 4,691 · railway 13 · stripe 1 · supabase 29,262 · vercel 2,127).

## Plan 4 Marketing Site — LIVE (2026-05-13 morning)

Public-facing landing pages shipped to prod and accessible at `/en`, `/en/about`, `/en/services`, `/en/services/{crm,cert,disputes,leads}`, `/en/contact`. All open on a named human (Karen / Phill / Toby / a foreman in Bondi) per Nexus Human Voice Spec v1. Brand-guardian linter at 0 violations across all 7 marketing files. Per-page metadata + og: tags inherit the voice (no more "Empire Command Center" social cards). Empire sidebar hidden on public + auth pages via root-layout `headers().get('x-pathname')` check. Robots `noindex` preserved during soft-launch — flip when Phill approves copy. The voice tasks (T5-T8, T10) were shipped as plan-spec drafts; you red-line specific lines via git anytime. See [[nexus-human-voice-2026-05-11]] for the spec and [[unite-group-nexus-architecture]] for the route map.

## Wave 5.2 CCW First-Client — LIVE (2026-05-13 morning)

CS-tier1 + 6-pager now have a real CCW data path:
- `ccw_support_tickets` table on Unite-Group Supabase (RLS service-role, updated_at trigger)
- `~/.hermes/scripts/toby-watch.py` extended to persist every new Toby email via Composio Gmail → Supabase; single-shot Telegram alert preserved
- New provider `swarm/providers/ccw_supabase.py` (Pi-Dev-Ops) emits `business_id="ccw-crm"` per CS cycle from open-ticket count + avg first-response + escalated count
- 6-pager pins `ccw-crm ⭐` first in per-business CS listing via `SIX_PAGER_PRIORITY_BUSINESSES=ccw-crm` (default)
- Reconciled single business_id to `ccw-crm` (was double-rendering with both `ccw` and `ccw-crm` before).

Toby on holidays 11–17 May 2026 (back Mon 18 May — corrected 2026-05-14, a week earlier than first thought). Backfill returned zero historical emails — clean slate for when he returns. **First cadence call must be moved from Tue 26 May to Mon 18 May or Tue 19 May 10am AEST.** Demo-readiness deadline collapsed by 8 days — see [[ccw-crm-board-synthesis-2026-05-14]] for the 4-day sprint plan.

## Margot Voice — LIVE (2026-05-13 morning)

Margot now speaks via ElevenLabs (`compose_margot_voice_reply` in `swarm/voice_compose.py`). Reply text routes through emoji-strip + currency/percentage normalisation + abbreviation expansion, then POSTs to `eleven_turbo_v2_5` at the voice ID in `ELEVENLABS_VOICE_ID`. 800-char cap per reply (≈1-minute audio) keeps voice notes short. Voice attached alongside text reply when `MARGOT_VOICE_REPLY_ENABLED=1`. Today's wiki-ingest brief was the first voice-enabled Margot delivery.

## Pi-CEO Observability of Engineering (2026-05-13)

Plan 3 (Developer Activity View) fully shipped + visually verified. Live page `/en/empire/developers` renders per-developer commit cadence, per-repo split, open-PR queue, and branch→ticket map across the empire. First developer wired = Rana Muzamil (`mmlrana00@gmail.com` — git author, `ranamuzamil1199@gmail.com` — profile key). Live snapshot 2026-05-13: 953 commits/30d (CCW-CRM 807 + CARSI 146), 95 today. Wave D's branch-map seeder runs daily inside the GitHub cron, populating `developer_branch_map` automatically; Linear ticket linkage requires `[A-Z]{2,5}-\d+` in branch name — Rana's current `feature/<slug>` pattern means LINEAR column is empty until a ticket-keyed convention is adopted (flag for Toby on Mon 18 May / Tue 19 May cadence call — corrected 2026-05-14). See [[pi-ceo-architecture]].

## Active Linear Epics

### RestoreAssist — LiDAR + GPS-Stitch Epic (RA-2970)
Parent ticket RA-2970. Children: RA-2954, RA-2971, RA-2972, RA-2973, RA-2974. Goal: pre-load floor plan via Apple RoomPlan / LiDAR + GPS-stitched perimeter, fall back to listing scrape when LiDAR unavailable. Feeds the IICRC damage-overlay PencilKit module. Cross-product unlock for [[dr-nrpg]] (site differentiator) and [[carsi]] (cert training content). See [[floor-plan-workstream]] and [[restore-assist]].

### Floor Plan Workstream (RA-2947 epic)
Shipped this week:
- **RA-2966** — ✅ shipped, PR #937
- **RA-2967** — ✅ shipped, PR #938
- **RA-2975** — ✅ shipped, PR #939 (stacked on #937)

In flight: RA-2970 children (LiDAR + GPS-stitch sub-epic). RA-2951 (third-party listing scrape) remains owner-gated due to realestate.com.au / domain.com.au ToS risk.

## Active PRs on RestoreAssist (open)
Live state queried via `gh pr list --repo CleanExpo/RestoreAssist --state open`. The floor-plan stack (PRs #937 / #938 / #939) is merged; the next wave is the RA-2970 LiDAR + GPS-stitch series. Verify open PR list at runtime — this page is a pointer, not a snapshot.

## Active Content Initiatives

Two sibling derivative-content programmes now running concurrently:

1. **[[iicrc-content-initiative]]** — IICRC standards → derivative content (videos, courses, SEO pages, podcasts). Margot research in flight (see below).
2. **[[iaq-building-science-initiative]]** — NEW (2026-05-11, 16-source ingest). IAQ + Building Science → derivative content. Anchored on [[founder|Phill]]'s IAQ Magazine Australia editorial committee seat — the portfolio's strongest E.E.A.T. signal. Topic pillars: wildfire smoke, mould detection, HVAC + IAQ, NCC compliance, climate-IAQ coupling.

## Margot Research Jobs Firing Today

Four [[margot-deep-research|deep_research_max]] jobs in flight, all serving the [[iicrc-content-initiative]]:

1. **IICRC IP safe-harbour** — Can we publish derivative content based on IICRC standards (S100, S220, S500, S520 etc.) without infringing? Defines the editorial perimeter for the entire content programme.
2. **E.E.A.T. AU roadmap** — Path to 100% Experience-Expertise-Authoritativeness-Trustworthiness in the AU restoration vertical. Feeds [[seo-linkable-assets]] and the [[industry-association-vision-2026]] media pillar.
3. **IICRC standards catalog mapping** — Standard-by-standard map of what each S-number covers, current edition, derivative angles (video / podcast / course / page).
4. **AI multimodal pipeline** — Voice + vision + sensor stream integration for autonomous restoration documentation (feeds [[restore-assist]] LiDAR + Encircle-class workflows).

Job IDs are stored against the [[iicrc-content-initiative]] page when results land. Topic-only references kept here.

## Association Expansion (2026-05-11)

Two events landed today:
1. **John Coutis confirmed as spokesman** for the [[industry-association-vision-2026|ANZ Industry Association]] — Australia's leading inspirational speaker ("Half a Body, Full of Life", johncoutis.com). Available immediately. Will anchor YouTube channel + podcast + conference keynote + awards MC. Brand-config codify in flight at `Synthex/packages/brand-config/src/brands/coutis.ts` (separate agent).
2. **Scope expanded** to biggest-ANZ-association-any-sector — adds owned media masthead (Prime Creative template), advocacy AGA (RIA template), COSBOA affiliation (federal policy access), and member-services bundle (marketing + branding + tech as service) on top of existing cert + events scope. See [[association-launch-plan-2026]] for Waves 0–4 execution.

Wave-0 (this week) deliverables: Coutis contract drafted, BrandConfig + design.md merged, landing page live, first Coutis video published, ≥50 interest-list signups.

## CCW Holiday Window (11–17 May 2026 — Toby back Mon 18 May)

**No outreach until Mon 18 May.** Toby Bredhauer (CCW POC, future Industry Association co-founder) on holidays 11–17 May 2026 (corrected 2026-05-14 from previous "back 26 May" assumption — a week earlier than first thought). First weekly cadence call must be moved from Tue 26 May to **Mon 18 May or Tue 19 May 10am AEST**. Demo-readiness deadline collapsed by 8 days; Stripe-in-v1 and the CCW scope-cut sprint must finish by Mon 18 May 10am AEST. Telegram alerts on [[ccw]] tickets remain on; nothing proactive goes out the door. See [[ccw]] and [[ccw-crm-board-synthesis-2026-05-14]].

## Production Status

**Green.** Vercel git integration re-linked to `CleanExpo/Unite-Group` (was pointed at the old `Unite-Hub` repo and silently failing webhook deploys); push → deploy chain restored 2026-05-13. 9 integration crons live (github, vercel, railway, linear, digitalocean, stripe, supabase, composio, onepassword via Hermes). GitHub cron `maxDuration` bumped 60s→300s after Wave D seeder began enumerating branches per-repo. `.limit(5000)` cap with warn-log added to commits query (Rana at 953/30d, was 50 commits away from silent PostgREST truncation).

## Cross-refs

[[exit-thesis]] · [[wave-roadmap]] · [[operational-priorities-q2-2026]] · [[ccw]] · [[restore-assist]] · [[pi-ceo-architecture]] · [[floor-plan-workstream]] · [[iicrc-content-initiative]] · [[iaq-building-science-initiative]] · [[industry-association-vision-2026]] · [[association-launch-plan-2026]] · [[founder]]
