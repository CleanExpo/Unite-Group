---
type: wiki
updated: 2026-05-14
---

# Research — Browser Harness PM Synthesis (2026-05-14)

Senior PM assessment of `browser-use/browser-harness` against Phill's portfolio. Source material: David Andre × Magnus Mueller podcast (`Sources/Browser Harness, Clearly Explained (and how it 10x'd my agent).md`, line numbers cited inline), the repo README, `install.md`, `SKILL.md`, and the two strategic posts on `browser-use.com`. Wiki-first per [[feedback-wiki-first]]; existing tooling read from [[hermes-agent]], [[mcp-ecosystem]], [[computer-use-integration-2026-05-13]], [[floor-plan-workstream]], [[carsi-discovery-audit-2026-05-14]], [[ccw-crm-board-synthesis-2026-05-14]], [[project-contextbot-platform]].

Headline call: **PILOT** as a globally-installed Claude Code skill (shape C), Margot-first (shape B) as the wedge use case. Do **not** rip out [[hermes-agent]]'s `computer_use` or [[mcp-ecosystem|Chrome DevTools MCP]] — they keep their lanes.

## 1. Executive summary

Browser-harness is a ~1k-line Chrome DevTools Protocol (CDP) wrapper plus an `agent-workspace/` directory the agent edits at runtime. Two genuinely new mechanics versus what's already in the stack:

1. **The agent edits its own browser tool surface mid-task.** When a helper is missing, it writes one into `agent-workspace/agent_helpers.py` and re-tries. This is structurally different from Playwright MCP, Chrome DevTools MCP, and Hermes `browser`, which all give the agent a fixed API surface. (`Self-healing harness…md:15-27`)
2. **Domain skills as a community-PR substrate.** When `BH_DOMAIN_SKILLS=1` is set, `goto_url` surfaces site-specific playbooks by host (`Self-healing harness…md:78-80`). Community-contributed via PR. This is the "agents that learn" thesis.

What is incremental: it's still CDP over a websocket. Hermes already has a `browser` toolset on Browserbase ([[hermes-agent]] line 35), Chrome DevTools MCP already attaches to a real Chrome ([[mcp-ecosystem]] tier-1 row), Playwright MCP exists. The novelty is the self-editing surface and the install-as-a-skill shape, not the underlying CDP plumbing.

The absorption risk: Magnus himself says *"cloud codeex they will 100% do exactly the same thing here"* (`Sources/Browser Harness…md:248-250`). He gives no timeframe. The Anthropic and OpenAI browser-tool roadmaps point to native absorption inside 6-12 months for the agent-edits-its-tools pattern. **This makes browser-harness a 6-12 month wedge, not a 3-year platform bet.** Adoption shape should match: install as a skill (cheap to install, cheap to rip out), do not refactor product code around it.

The reason to adopt now anyway: the alternative is doing nothing and waiting for native absorption, which costs us the wedge window where Margot's research and the RA-2947 scrape are presently blocked. (~248 words)

## 2. The two-layer thesis

Browser-harness ships two patterns; they have very different strategic value.

### Layer 1 — The CDP harness (browser-harness proper)

The thin CDP wrapper plus self-editing helpers. Fits below the [[hermes-agent|Hermes]] `browser` toolset abstraction; competes directly with [[mcp-ecosystem|Chrome DevTools MCP]] and Playwright MCP for the "drive a real Chrome" slot. **Value to Phill's stack: moderate.** It solves a real but narrow class of browser tasks (signature fields, native dialogs, complex iframes, file uploads — examples Magnus walks through at `Sources/Browser Harness…md:222-240`). Unblocks where Chrome DevTools MCP currently can't recover from a missing helper.

### Layer 2 — The agent-prompts-you Telegram interface ("agency")

Magnus's actual product bet — not the harness. The agent runs 24/7, monitors connected services (Slack, Gmail, WhatsApp), and prompts the human via Telegram with Tinder-style yes/no swipes (`Sources/Browser Harness…md:62-78, 332-336`). Magnus's burrito ordering, his Codex-rename email outreach, and his weekly Slack-monitoring pattern all run through this surface, not the harness.

**Value to Phill's stack: HIGH.** Phill already has the substrate ([[project-contextbot-platform]] — 4/5 phases shipped 2026-05-14). Margot's [[computer-use-integration-2026-05-13|`[SCREEN:` sentinel pattern]] already runs Phill-typed intents through Hermes. What Margot is **not** doing yet: proactively prompting Phill with "should I send this email?" / "should I file this PR comment?" / "should I close this ticket?" without Phill prompting first.

This is the interface gap [[autonomy-gap-audit-2026-05-14]] flags (L1.6 → L4.2 ladder). Magnus has shipped the inversion — agent-prompts-human, not human-prompts-agent. **This pattern is worth more to Phill than the harness itself.** Importable without adopting `browser-harness` the package.

**Honest separation:** the Layer-1 install gets us the wedge for [[floor-plan-workstream|RA-2947]]-class blocked work and Margot's Reddit/paywall research. The Layer-2 pattern is a Margot upgrade independent of whether browser-harness ships at all.

## 3. Per-product fit matrix

Fit options: HIGH-NOW · HIGH-NEXT-Q · MEDIUM · LOW · NO-FIT.

| Product | Browser-task volume | Current pain | BH fit | Priority |
|---|---|---|---|---|
| **Margot research** | High (5-15 sessions/day) | Reddit blocks WebFetch, paywalls return error pages, LinkedIn returns login wall, Twitter rate-limits, competitor monitoring patchy | **HIGH-NOW** | P0 — single highest leverage point |
| **RA-2947 floor-plan scraper** | Medium (per-job, dozens/week at scale) | realestate.com.au + domain.com.au owner-gated (RA-2951) due to ToS+anti-bot risk; [[floor-plan-workstream]] line 19-20 confirms this is paused | **HIGH-NOW** | P0 — unblocks paused workstream |
| **NRPG / ATIA competitor monitoring** | Medium (weekly) | iicrc.org, restorationindustry.org, prime-creative.com.au, RIA, ISSA — paywalled or JS-heavy; current [[mcp-ecosystem|WebFetch]] returns thin content | **HIGH-NEXT-Q** | P1 — Pillar 1 of [[master-plan-2b-by-2028-v3]] |
| **CCW-CRM** | Low-medium | Cin7 web-only features (per task spec), supplier portals (Xero/Cin7 partner consoles), Stripe Tax setup | **MEDIUM** | P2 — orthogonal to Mon-18-May sprint per [[ccw-crm-board-synthesis-2026-05-14]] |
| **CARSI WordPress import pipeline** | Low (one-off batch) | "Started but broken" per [[carsi-discovery-audit-2026-05-14]]; WP-CLI / REST API likely a cleaner path than browser | **LOW** | P3 — API-first is better; only BH if WP API gated |
| **Synthex distribution** | Low | LinkedIn/X/IG posting — Composio already covers via API per [[reference-composio-connections]] | **LOW** | P3 — Composio wins |
| **Duncan Dimitri / ATO-APP accountant portals** | Low-medium (per-engagement) | Xero/MYOB partner consoles, ATO portal — many web-only, no API for ATO portal at all | **HIGH-NEXT-Q** | P1 — gated on Duncan signing per [[project-duncan-perkins]] |
| **Pi-CEO swarm (autonomous loop)** | High in aggregate (research, screenshots, form-fills across all the above) | Each agent currently dispatches through Margot → Hermes; no opinionated "give me a browser" tool | **MEDIUM** | P2 — fits as a skill agents opt into per-task |
| **DR / NRPG site ops** | Low | Mostly static content, Vercel + WordPress — no live browser-task volume | **NO-FIT** | — |

**Top-3 highest-fit:** Margot research · RA-2947 floor-plan · ATO/MYOB/Xero partner portals (Duncan).

## 4. Comparison vs existing tools

| Layer | Tool | What it does | Cost | Replace / coexist with BH? |
|---|---|---|---|---|
| macOS GUI | [[hermes-agent]] `computer_use` (via [[computer-use-integration-2026-05-13|`screen_dispatch`]]) | AX-tree + screen recording → mouse/keyboard on real macOS apps; pinned to Anthropic API | $$$ (Anthropic API tokens, per [[feedback-model-routing-max-first]]) | **Coexist.** BH is browser-only; Hermes drives all native macOS apps (Finder, Mail, Numbers, etc.). Different lane. |
| Real Chrome attach | [[mcp-ecosystem|Chrome DevTools MCP]] | Attaches to a Chrome instance with persisted auth in a dedicated profile; used for Stripe 2FA, Vercel env mgmt | $0 (free MCP) | **Coexist with overlap.** Chrome DevTools MCP wins where the agent needs to reuse a persistent Phill-authenticated session. BH wins where the agent needs to write a missing helper mid-task. Different failure modes. |
| Browser-as-headless | Playwright MCP | Accessibility-tree driven Chromium, ephemeral | $0 | **BH replaces.** Playwright MCP is the weakest of the three browser options for our use cases — listed in [[mcp-ecosystem]] but not actively used. If BH ships, Playwright MCP can be uninstalled. |
| Cross-app API glue | [[reference-composio-connections|Composio]] | API-level access to Gmail, Linear, Slack-equivalents-we-don't-use, etc. Cross-env, two Gmail accounts wired (`phill.mcgurk` + `Zenithfresh25`) per [[reference-composio-workaround]] | $0 (free tier; user-key) | **Coexist — different layer.** Composio is API not browser. BH is the fallback when a service has no API or the API is gated (Cin7 web features, ATO portal, Xero partner console). |
| Search + scrape | WebFetch / WebSearch | Built-in Claude tools; rate-limited, opaque to paywalls, weak on Reddit/X/LinkedIn | $0 | **Coexist.** WebFetch is the right tool for static marketing pages, repo READMEs, public docs. BH is the right tool when WebFetch returns a login wall or paywall. Margot keeps both. |
| Headless Hermes browser | [[hermes-agent]] `browser` toolset (Browserbase backend) | Stealth + proxies; new in 0.13.0 ([[hermes-agent]] line 35) | $$ (Browserbase) | **Coexist with overlap.** Hermes browser is the existing answer; we just haven't exercised it heavily. BH is more agent-controlled (self-editing). Run them as siblings; let the better tool win on observable success rate. |
| `claude --print` + skill | Claude Code globally-installed skill | Per [[feedback-model-routing-max-first]]: $0 marginal on Claude Max. The native shape BH installs as. | $0 | **BH installs as exactly this.** Not a competitor — the substrate. |

The map is: Hermes owns native macOS, Composio owns APIs, Chrome DevTools MCP owns authenticated-session reuse, BH owns "thin CDP with self-editing helpers" for browser tasks with novel edge cases. No tool gets ripped out.

## 5. Adoption shapes

### A. Pilot one — RA-2947 floor-plan scraper

- **Scope:** wire BH for realestate.com.au + domain.com.au listing → floor-plan extraction. The owner-gated workstream per [[floor-plan-workstream]] line 19-20.
- **Effort:** 1-2 days (BH install + 1 domain-skill + integration into the RA-2970 sub-epic).
- **Risk:** ToS — anti-bot detection on realestate.com.au is non-trivial. Stealth browser via Browser Use Cloud free tier (3 concurrent, captcha, proxies — `Self-healing harness…md:51-54`) lowers but does not eliminate.
- **Rollback:** delete the BH install + remove the domain-skill. Workstream returns to its current paused state.
- **Success metric:** 70%+ extraction success across 50 sample listings; zero CAPTCHA-hand-offs to Phill.
- **Verdict:** valuable but narrow. Doesn't prove BH for the rest of the portfolio.

### B. Margot first — wire BH as Margot's research browser

- **Scope:** Margot's research pipeline ([[hermes-agent]] cron jobs: 3 daily research + 5 weekly research = 8 jobs) currently uses WebFetch + WebSearch. Add BH as a `[BROWSER:` sentinel pattern mirroring the existing `[SCREEN:` sentinel from [[computer-use-integration-2026-05-13]]. Margot decides per-research-task whether to dispatch to BH (Reddit/paywall/LinkedIn/X) or stay on WebFetch (static pages).
- **Effort:** 2-3 days (BH install + sentinel handler + Margot system-prompt update + audit-log wiring matching `~/.hermes/screen_audit.jsonl` pattern).
- **Risk:** Margot is on `llama-3.3-70b` ([[hermes-agent]] line 77) which doesn't reliably tool-call — same constraint that forced the script-pre-fetch pattern. **Mitigation:** BH dispatch goes through a Python wrapper, not direct tool-call from Margot. Reuses the `screen_dispatch` shape verbatim. Verified-feasible.
- **Rollback:** disable the sentinel; remove the Python wrapper; Margot falls back to WebFetch + WebSearch. Zero data loss.
- **Success metric:** at the next [[hermes-agent|Margot Quarterly SWOT]] (next: Q3 2026), Margot cites ≥5 sources that current pipeline can't reach (Reddit threads, paywalled FT/WSJ/Substack, LinkedIn competitor analysis, X founder threads).
- **Verdict:** highest leverage for the cost. Fixes the single biggest research gap and exercises BH against real workload before committing to broader rollout.

### C. Cross-cutting Skill — install BH globally as `~/.claude/skills/browser-harness`

- **Scope:** Install per `install.md` as a Claude Code skill at user-scope (`~/.claude/CLAUDE.md` import per `install.md`). Every project across `~/Pi-CEO/`, `~/Synthex-Brain-2/`, `~/2nd Brain/`, and the swarm gets opt-in access. Per-task: any agent that needs a real browser writes `Use browser-harness to …` and the harness self-attaches.
- **Effort:** 30-60 min install + verify with `browser-harness --doctor`.
- **Risk:** ungated availability. Any agent in any project can now drive Phill's real Chrome. **Mitigation:** Way 2 isolated profile per `install.md` (`BU_CDP_URL=http://127.0.0.1:9222` + non-default `--user-data-dir`); production swarm jobs must use the isolated profile, never Way 1. Mirrors the kill-switch pattern in [[computer-use-integration-2026-05-13]] (`TAO_SCREEN_DISABLED=1`) — add `BH_DISABLED=1` equivalent.
- **Rollback:** `uv tool uninstall browser-harness` + delete the skill import.
- **Success metric:** by 2026-06-14 (1 month), ≥3 distinct portfolio products have used BH at least once with logged success.
- **Verdict:** lowest-cost, highest-optionality. Lets the workload decide what fits.

### Recommendation: B + C combined.

**Install as a global skill (C) AND wire Margot's research-browser sentinel (B).** Skip A (RA-2947) until B is proven — RA-2947's anti-bot risk profile is higher than Margot's research targets, and we want BH validated on the easier targets first. Once B is shipping for 2-3 weeks with a clean audit log, revisit A for RA-2947.

Order of operations:
1. **Day 1** — Install BH at user-scope (Way 2 isolated profile only, with `BU_CDP_URL` env + non-default profile dir). `browser-harness --doctor` clean. Sign up for Browser Use Cloud free tier key (`BROWSER_USE_API_KEY` in `~/.hermes/.env`). Per [[feedback-secrets-handling]] never paste keys in chat — write directly to gitignored env.
2. **Day 2** — Wire `[BROWSER:` sentinel in Margot mirroring `[SCREEN:`. Python wrapper at `~/.hermes/scripts/browser_dispatch.py`. Audit log at `~/.hermes/browser_audit.jsonl`. Kill-switch env var `TAO_BROWSER_DISABLED=1`.
3. **Day 3** — Update Margot system prompt with decision rule: WebFetch first; if returns login wall / paywall / <500 chars of body content / source domain ∈ {reddit, x, linkedin, ft, wsj}, dispatch to `[BROWSER:`. One sample research run; verify audit log entry; verify rollback.
4. **Weeks 1-3** — observe. Daily check of `browser_audit.jsonl` for failure rate, helper-self-write count, captcha rate, ToS-triggered blocks.
5. **Week 4** — if green, scope RA-2947 pilot (shape A).

## 6. Anti-recommendations

Things we explicitly do **NOT** do:

- **Don't rip out Hermes `computer_use`.** It owns native macOS GUI work and is wired into the swarm via [[computer-use-integration-2026-05-13|`screen_dispatch`]]. BH is browser-only. They're not substitutes. Pin per [[feedback-model-routing-max-first]] cost-routing memory keeps `computer_use` on Anthropic API for the load-bearing path.
- **Don't replace Composio for email/Linear.** BH is a browser tool. Composio is the API layer for Gmail + Linear + similar services per [[reference-composio-connections]] (`phill.mcgurk@gmail.com` key 2026-05-13). They sit at different layers. Replacing Composio with browser automation for email would be slower, more fragile, and break the cron-job pattern in [[hermes-agent]].
- **Don't pay for Browser Use Cloud yet.** Free tier (`Self-healing harness…md:51-54`): 3 concurrent browsers, proxies, captcha solving, no card required. That covers the pilot. Upgrade only if observed failure rate in Margot pilot points to a stealth/proxy gap the free tier can't cover.
- **Don't drag BH into the Monday 18 May 10am AEST CCW deadline.** Per [[ccw-crm-board-synthesis-2026-05-14]] the CCW sprint is locked on 8 P0 / 12 P1 / 8 P2 actions; BH is orthogonal — a Margot/research-layer investment with no path to the CCW demo. Different workstream.
- **Don't replace [[mcp-ecosystem|Chrome DevTools MCP]] for Phill's persistent-session work.** Chrome DevTools MCP's value is the authenticated profile at `~/.cache/chrome-devtools-mcp/chrome-profile` — Stripe 2FA, Vercel env, Linear UI. BH's Way 2 isolated profile loses that auth state. Two different lanes.
- **Don't hand-author BH domain skills.** Per `Self-healing harness…md:71`: *"Skills are written by the harness, not by you."* Authoring them by hand violates the design and produces skills that don't match what actually works in the browser. Let the harness file them; PR-back upstream when valuable.
- **Don't propose Slack for any of the routing.** Per [[feedback-no-slack]]. Telegram is the surface.
- **Don't enable `BH_DOMAIN_SKILLS=1` in shape C without a review pass.** Community-PR'd skills could contain selectors with PII or anti-bot evasions that put us on a ToS-violation list. Run with the flag off until we audit at least 3 community skills.
- **Don't claim "BH handles X" without verifying.** Per [[feedback-audit-verification]]: the "one HF founder said no task fails" quote (`Sources/Browser Harness…md:41-42`) is anecdote. Magnus also says he's the kind of person who "would spend 100 hours automating something which saves me one hour" (`Sources/Browser Harness…md:102`). Treat capability claims as hypotheses until the audit log shows a green run.
- **Don't import the Layer-2 "agency" pattern by installing browser-harness.** That pattern is independent of the harness package — it's a Margot upgrade. Track it separately as a Margot work-item rather than coupling it to the BH install.

## 7. Five Phill-only questions

Yes/no or pick-one for the ratification gate:

1. **Adoption shape — B+C combined, A deferred.** Install BH as a global skill **and** wire Margot's `[BROWSER:` sentinel as the first workload. RA-2947 pilot deferred to week 4. **Y / N?**
2. **Browser Use Cloud free tier — sign up now.** Free tier (3 concurrent browsers, captcha, proxies) under the existing `contact@unite-group.in` account. Key stored in `~/.hermes/.env` per [[feedback-secrets-handling]]. **Y / N?**
3. **Way 2 isolated profile only for production swarm.** Way 1 (Phill's real Chrome profile) reserved for interactive Phill-driven sessions, never autonomous swarm jobs. **Y / N?**
4. **Layer-2 "agency" pattern — separate Margot work-item.** The agent-prompts-Phill Tinder pattern (Magnus's actual product) gets a separate ticket against Margot, not bundled into the BH install. **Y / N?**
5. **Pick: Margot pilot success metric** — (a) ≥5 previously-unreachable sources cited at next Quarterly SWOT, or (b) Margot's weekly-research jobs show ≥30% fewer "thin content" hits in `browser_audit.jsonl`, or (c) ≥1 successful Reddit + ≥1 successful LinkedIn extraction in week 1. **a / b / c?**

## 8. Cross-refs

[[hermes-agent]] · [[mcp-ecosystem]] · [[computer-use-integration-2026-05-13]] · [[autonomy-gap-audit-2026-05-14]] · [[project-contextbot-platform]] · [[floor-plan-workstream]] · [[carsi-discovery-audit-2026-05-14]] · [[ccw-crm-board-synthesis-2026-05-14]] · [[ccw-crm-board-synthesis-2026-05-14]] · [[master-plan-2b-by-2028-v3]] · [[project-duncan-perkins]] · [[reference-composio-connections]] · [[reference-composio-workaround]] · [[feedback-wiki-first]] · [[feedback-no-slack]] · [[feedback-secrets-handling]] · [[feedback-model-routing-max-first]] · [[feedback-design-preferences]] · [[feedback-authorization-scope]] · [[feedback-make-calls-not-questions]] · [[feedback-audit-verification]] · [[pi-ceo-architecture]] · [[autonomous-operations-2026]]

## Recommendation (1-sentence headline)

**PILOT** — install browser-harness as a global Claude Code skill (shape C) and wire Margot's research pipeline as the first workload (shape B), Way 2 isolated profile only, ratification on Phill's 5 questions.
