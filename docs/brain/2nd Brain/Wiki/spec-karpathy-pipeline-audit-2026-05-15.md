---
type: wiki
updated: 2026-05-15
---

# Karpathy-style LLM Wiki Pipeline — Audit + Build Spec

## 1. Headline

Phill already runs ~85% of the Karpathy-style pipeline. **L2 + L3 + L4 are SHIPPED**; only **L1 (auto-scrape) is a genuine gap** — every Source today lands in `Sources/` via manual Obsidian Clippings, not via a scheduled VPS scraper. The YouTuber's framing makes this sound like a from-scratch build; for Phill it's a single Hermes cron job to add. Anti-rebuild: do not touch the wiki-ingest skill, the 6am Pi-CEO Daily Briefing cron (`e27b7d7b60f7`), the 7am NotebookLM video cron (`e06a95deac75`), the Friday Margot Week-in-Review (`087896dda594`), or the existing `sync_wiki_to_supabase.py` — they already cover L3 + L4.

## 2. Layer-by-layer audit

| Layer | Spec intent | Phill's actual coverage | Verdict |
|---|---|---|---|
| **L1 — Data Collection** | VPS scraper auto-pulls YouTube + X + LinkedIn on a schedule into raw storage | **NONE.** `ls ~/.hermes/scripts/` returns 9 scripts (linear, margot-weekly, notebooklm, seo-brief, toby-watch, health-check, 1password sync, lint, skills-lint) — zero scrape patterns. `grep -i "scrape\|youtube\|twitter\|linkedin\|x\.com" ~/.hermes/cron/jobs.json` → 0 hits. Sources land via manual Obsidian Clippings + ad-hoc paste. | **GAP** |
| **L2 — Raw Storage** | NAS raw folder, untouched | `/Users/phill-mac/2nd Brain/2nd Brain/Sources/` exists with 15 active items + `Sources/Completed/` archive holding **247 ingested files**. Convention enforced by `2nd Brain/CLAUDE.md` L43: "`Sources/` files are immutable — never edit them, only ingest from them." | **HAVE** |
| **L3 — Local AI Processing** | Local model organises raw → wiki pages | `2nd Brain/CLAUDE.md` defines **3 named ops**: INGEST (read → edit pages → log), QUERY (Margot pre-research), LINT (weekly cron, Sat). Backed by `wiki-ingest` skill + `sync_wiki_to_supabase.py` (137 wiki_pages synced to Supabase `lksfwktwtmyznckodsau` this morning per log.md 2026-05-15). | **HAVE** |
| **L4 — Frontier Triage** | Daily Opus executive summary | **3 cron jobs already firing:** `e27b7d7b60f7` Pi-CEO Daily Briefing 6am AEST (74 runs, last_status=ok) reads ZTE + portfolio health + wiki log tail + urgent Linear; `e06a95deac75` NotebookLM Video 7am AEST (22 runs, last_status=ok); `087896dda594` Margot Week-in-Review Friday 4pm (5 runs). Plus `ceo-board` skill for ad-hoc strategic triage. | **HAVE** |

## 3. Gap register

Ranked by leverage / effort. Only genuine gaps surfaced.

1. **L1 auto-scrape (single gap).** Today every Source is human-keystroked. Phill watches a YouTube video → clips it → drops into `Sources/`. The Karpathy pipeline says: a scheduled job watches a small allowlist of channels/handles, pulls transcript or post text, drops into `Sources/` overnight. Build proposal: one Hermes cron job `sources_auto_scrape.py`, channel allowlist in YAML, output `Sources/auto/YYYY-MM-DD-<source>-<slug>.md`, lets the existing INGEST flow pick it up untouched. ≤200 lines.

2. **L1 source-provenance metadata (sub-gap).** Existing manually-clipped Sources carry no machine-readable origin / URL / capture-date frontmatter. Auto-scraped Sources should set the precedent. Build proposal: lock a Sources frontmatter schema (`source_url`, `captured_at`, `channel`, `kind: youtube|x|linkedin|manual`) and have the scraper write it; document in `2nd Brain/CLAUDE.md` so manual clippings catch up over time. Zero new code — schema-only.

That's it. The audit surfaces **one real build** and **one zero-code schema lock**. Everything else in Phill's stack already satisfies the Karpathy spec.

## 4. Build spec

### Wave 1 — `sources_auto_scrape.py` (≤200 lines, post-Mon-18 demo)

**What:** A single Hermes cron job. Reads `~/.hermes/sources_allowlist.yaml` (3 sections: youtube channels, x handles, linkedin profiles). For each entry, fetches new items since `last_seen_at` (persisted in `~/.hermes/state/sources_scrape_state.json`). Writes one markdown file per item into `2nd Brain/Sources/auto/` with locked frontmatter. Idempotent. Skips on auth fail. Logs to `~/.hermes/logs/sources_scrape.log`.

**Existing tools that handle it:**
- **Hermes cron** — register as new job in `~/.hermes/cron/jobs.json` (same shape as `e27b7d7b60f7`). Schedule: `0 21 * * *` (7am AEST).
- **YouTube transcript** — `youtube-transcript-api` Python package (no auth required for public videos). Resolve channel → recent uploads via `yt-dlp --flat-playlist` (already on Phill's box per Hermes deps).
- **X (Twitter)** — Composio `TWITTER_USER_TWEETS` slug (per `[[reference-composio-connections]]`; Composio is the cross-env default).
- **LinkedIn** — no clean API; deferred. Open question in §6 Fork 3.
- **Auth** — all keys via `~/.hermes/.env` per `[[feedback-secrets-handling]]`. No paste-in-chat.
- **Wiki ingest** — once the file lands in `Sources/auto/`, existing INGEST flow + `wiki-ingest` skill handles the rest. **Zero changes to L3.**

**Per [[feedback-substrate-change-discipline]]:**
- **Shadow-run:** first 50 scrape rounds write to `Sources/auto-shadow/` (not seen by INGEST). Human spot-check 5 random files. Promote only after parity gate.
- **Rollback flag:** `~/.hermes/state/sources_scrape_state.json` carries `enabled: bool`; cron checks it first. Single-line disable from Telegram or shell.
- **Sprint-window check:** does NOT fire during Toby Mon-18 demo window (defer first promote to Tue 19 May earliest).
- **Source-restore:** N/A — net-new script, no existing .pyc.
- **Fork-private pin:** N/A — uses pinned PyPI deps in `~/.hermes` venv.

**Per [[feedback-tight-code]]:**
- ≤200 lines (browser-use bar; budget breakdown: 30 lines main, 60 youtube, 50 x, 40 frontmatter writer, 20 state). LinkedIn deferred — would breach cap.
- No retry framework. No abstraction layer. Per-source function, direct call.
- Single file `~/.hermes/scripts/sources_auto_scrape.py`. No package, no module split.

**Verification gate before promote:**
1. 50 shadow runs complete.
2. 5 hand-picked items show URL → transcript → frontmatter parity.
3. Log file shows zero unhandled exceptions across the 50.
4. `~/.hermes/state/sources_scrape_state.json` consistent across runs.
5. Phill greenlight in Telegram.

**Anti-scope (do NOT do in Wave 1):**
- No LinkedIn (Fork 3).
- No semantic dedupe (next wave only if duplicates appear).
- No auto-tagging — INGEST already handles topic routing.
- No "watch new channels live" — single 7am sweep is enough.
- No Telegram notification on each scrape — would breach `[[feedback-no-repeating-alerts]]`. Only the Friday Week-in-Review summarises the scrape count.

### Wave 2 (conditional) — Sources frontmatter schema lock

Pure documentation. Append to `2nd Brain/CLAUDE.md` a Sources frontmatter block:
```
source_url: <canonical url>
captured_at: YYYY-MM-DD
channel: <handle or url>
kind: youtube|x|linkedin|manual|paste
```
Backfill optional — manual clippings can catch up over time. Auto-scrape Wave 1 writes this from day 1. **Zero code. ~10 lines docs.** Only fires if Wave 1 promotes.

## 5. Anti-recommendations

- **Do NOT rebuild L2.** `Sources/` + `Sources/Completed/` already works at 247-file scale.
- **Do NOT touch the wiki-ingest skill.** It is L3. It works.
- **Do NOT add a separate L4 triage.** Three crons (`e27b7d7b60f7`, `e06a95deac75`, `087896dda594`) cover daily + weekly + video. Adding a fourth violates `[[feedback-no-repeating-alerts]]`.
- **Do NOT bring in a vector DB for Sources.** The Karpathy pattern is filesystem-first. `sync_wiki_to_supabase.py` already mirrors Wiki pages to Supabase for Margot retrieval; Sources are immutable raw data and don't need indexing until INGEST decides what's signal.
- **Do NOT propose a VPS for L1.** Phill's box runs Hermes 24/7; a remote VPS is a substrate change without payoff. The YouTuber's "VPS" framing is incidental to the architecture, not load-bearing.
- **Do NOT propose Slack, BotFather mints (hard-wired until 14:00 AEST today), video-skill changes, or new Telegram bots.** Per anti-scope.
- **Do NOT auto-INGEST.** The skill is designed for human-in-the-loop ingest (Margot proposes, Phill ratifies). Auto-scrape stops at L2.

## 6. Three forks for Phill

1. **Build Wave 1 `sources_auto_scrape.py` post-Mon-18 demo?**
   - Board recommendation: **YES.** Closes the only genuine gap. ≤200 lines. Shadow-run pattern de-risks it. Single rollback flag.

2. **Wire X (Twitter) auto-scrape in Wave 1 alongside YouTube?**
   - Board recommendation: **YES.** Composio `TWITTER_USER_TWEETS` already connected per `[[reference-composio-connections]]`. Zero net-new auth. Adds maybe 50 LOC.

3. **Wire LinkedIn auto-scrape in Wave 1?**
   - Board recommendation: **NO — defer to Wave 3.** LinkedIn has no clean API. Options are all 3rd-party scrapers (Phantombuster, Proxycurl) costing ~$50/mo per profile. Doesn't pass `[[budget-constraints]]` without Phill explicitly funding. Manual clipping continues for LinkedIn until a free-tier path opens or LinkedIn ships native RSS.

## 7. Cross-refs

- `[[feedback-tight-code]]` — 200-line cap; browser-use bar.
- `[[feedback-substrate-change-discipline]]` — shadow-run before promote; rollback flag; sprint-window check.
- `[[feedback-secrets-handling]]` — all keys via `~/.hermes/.env`; no chat-paste.
- `[[feedback-no-repeating-alerts]]` — no per-scrape Telegram pings.
- `[[feedback-quality-over-quantity]]` — 50-run shadow parity gate before promote.
- `[[feedback-audit-verification]]` — every finding above cites the actual cron job ID, the actual file path, the actual command run.
- `[[reference-composio-connections]]` — Twitter slug already connected.
- `[[project-hermes-mcp-state]]` — Hermes cron substrate.
- `[[incident-botfather-rate-limit-2026-05-14]]` — no BotFather mints until 14:00 AEST today.
- `[[ccw-holiday-window]]` — no CCW-facing changes during Toby holiday; demo Mon 18 May.
- `[[research-agentic-os-critique-2026-05-14]]` — adjacent: Mobbin's MCP critique covers a different surface, not Sources.
