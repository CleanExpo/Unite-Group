---
type: wiki
updated: 2026-05-14
---

# Tangential research sweep — 2026-05-14

Six tangential sources + one curiosity, each with 100–200 word summary + Phill-fit verdict. Sources are in `2nd Brain/Sources/` and cited with line numbers.

## Claude New AI SEO Goals Update is Insane!

**What it is.** Julian Goldie walkthrough of Claude Code's new `/goal` slash-command — a "goal completion" loop where Claude works autonomously across turns until a separate evaluator model judges every condition met (`Claude New AI SEO Goals Update is Insane!.md:24–26, 47–58`). Contrasts `/goal` (loops until verified done) vs `/loop` (runs on timer until stopped) vs `auto` mode (auto-approves tool calls but doesn't re-trigger turns); the killer combo is `/goal + auto` for hands-off autonomy (`:101–143`). Demo: one prompt produced a full SEO website package — homepage + 5 landing pages + 20 blog outlines + internal-link map + schema + meta-tag enforcement under 60/155 chars (`:61–69`). Goldie's framing: "Goal SEO Stack" = verifiable target → orchestrator loop → baked-in proof → SOP injection (`:107–123`). Cancels any prior `/goal` if you fire a new one (`:101`). Warns it burns tokens fast (`:91–93`).

**Phill-fit verdict.** Adopt — but as a process pattern, not a replacement skill. (See SEO Goals deep-dive below.)

**If adopt: what changes.** Add `/goal` invocation pattern to `seo-page-fix` (and `pm-core` for non-SEO tasks). No new skill needed.

---

## Schema Doesn't Boost AI Citations (New Ahrefs Study)

**What it is.** Edward Sturm walks through Ahrefs' May 11 2026 study: 1,885 pages added JSON-LD schema between Aug 2025 and Mar 2026, matched against ~4,000 control pages, citations tracked across Google AI Overviews, AI Mode, and ChatGPT (`Schema Doesn't Boost AI Citations.md:18–34, 90–96`). Result: no statistically significant citation lift on AI Mode (+2.4%) or ChatGPT (+2.2%, both indistinguishable from zero), and a small −4.6% decline on AI Overviews (`:94–100`). Four separate statistical tests, same conclusion. A related Search Engine Land experiment confirmed ChatGPT/Claude/Perplexity/Gemini/Google AI Mode all ignore JSON-LD during live retrieval — only visible HTML is extracted (`:127–134`). The 53% correlation between cited pages and schema is confounded by the fact that technically-sophisticated sites also build authority + content + links (`:137–141`). Sturm: add schema only if target SERPs use it for rich-result clicks; otherwise focus on relevance, authority, and reducing pogo-sticking (`:143–158`).

**Phill-fit verdict.** Adopt the conclusion — kill schema-as-AI-citation-tactic.

**If adopt: what changes.** Update `[[ai-citation-frequency]]` metric page: schema is NOT a citation lever. Audit `seo-page-fix` and any portfolio SEO playbook for "add schema for AI" advice and strip it. Add to `[[playbook-local-seo-gsc-review]]`: schema is for SERP rich results only, not AI visibility. Cross-reference `[[feedback-audit-verification]]` — this is exactly the kind of "everyone says so" claim that didn't survive a controlled test.

---

## Google Just Leaked This AI Video Model (Seedance 2 Has a Problem)

**What it is.** AI Samson covers the Gemini-leaked "Google Omni" video model — UI attribution flipped from Veo 3.1 to Omni and revealed text-prompt video editing à la Nano Banana (`Google Just Leaked This AI Video Model.md:69–76`). Previews show strong text fidelity (whiteboard math demo with accurately tracked chalk strokes) and realistic eating physics (`:79–98`). Expected official launch at Google I/O ~1 week out. Multimodal-by-name: can take an existing video or audio track as a reference and edit via text prompt (`:103–110`). Bulk of the video is a Happy Horse (Alibaba) vs Seedance 2 bake-off — Happy Horse wins on audio synchronization, Seedance 2 wins on aesthetic/cinematic realism and complex camera moves (`:155–263`). Both still fail at hand-object interaction (elephant painter strokes, book-stamp continuity) (`:219–242`). Sponsor block for Higgsfield MCP (claude.ai cloud connector) (`:182–217`).

**Phill-fit verdict.** Explore later — wait for the actual Google Omni release; do not act on a leak.

**If explore: what changes.** Add Omni to the "models to evaluate at Google I/O 2026" watchlist for the Video Agency. No skill change yet — `remotion-orchestrator` substrate stays unchanged. When Omni ships GA, `video-cinematographer` source-selection logic gets a new option alongside Remotion / Hyperframes / Seedance. Happy Horse via Higgsfield MCP could be useful for audio-heavy briefs (running-shoe ad style) — keep as `video-sound-designer` companion. Skip the Higgsfield MCP cloud-connector path on principle — `[[reference_composio_connections]]` is the cross-env default.

---

## Mythos unleashed on Opensource

**Cross-reference check.** `Wiki/research-mythos-opensource-2026-05-14.md` already exists from an earlier session with a fully-formed verdict: SKIP all Pi-CEO model swaps; Mythos is closed-weight Anthropic (Project Glasswing), not the Nous-style open-weights release the title implies. Stenberg's curl test: 5 claimed vulns → 1 low-sev CVE + 3 false positives + 1 reclassified bug. Conclusion: "primarily marketing… not a significant dent." The existing page also extracted four architectural takeaways: confidence ≠ correctness telemetry, denial-of-attention as a sibling principle to `[[no-repeating-alerts]]`, Glasswing-style staged model-pin rollout, and the pre-existing-tooling effect (`research-mythos-opensource-2026-05-14.md:13–40`).

**Does the new source change the verdict?** No. The Sources file (`Mythos unleashed on Opensource.md:41–99`) is the same Primeagen video the earlier wiki page already ingested — same Stenberg article (`:65–66`), same 5→1 confirmed-vuln collapse (`:81–84`), same "primarily marketing" conclusion (`:91–95`). The existing wiki page stands. No update needed.

**Phill-fit verdict.** Already covered — see `[[research-mythos-opensource-2026-05-14]]`.

---

## The biggest AI breakthrough in medicine & drug discovery

**What it is.** AI Search deep-dive on MAMMAL — an IBM biology foundation model (Nature, May 2026) trained on ~2B samples from antibody, protein, small-molecule, and gene-expression databases (`The biggest AI breakthrough in medicine & drug discovery.md:90–96`). Uses a modular tokenizer with chemistry/genetics/protein sub-dictionaries that merge into a shared embedding space (`:106–113`). State-of-the-art on 11/11 benchmarks. Beat the specialist MolFormer on blood-brain-barrier penetration + ClinTox FDA-approval prediction — the generalist outperformed the specialist (`:121–132`). Most striking result: predicted that carfilzomib (an FDA-approved blood-cancer drug, never tested on solid tumours) would be the most potent of 4 unseen drugs across 805 solid-tumour cell types — and a real-life experiment confirmed the ranking with ~95% accuracy (`:151–168`). Beat AlphaFold 3 on 5/7 antibody-binding targets, because MAMMAL handles intrinsically-disordered ("floppy") protein regions that AlphaFold's static-structure training cannot (`:188–204`). Can also generate new antibody CDR sequences — 19% improvement on the hardest CDR-H3 region (`:218–228`).

**Phill-fit verdict.** No-fit (operationally) — but signal-worthy for the empire thesis. Unite-Group is not in pharma. Filing under "AI-is-actually-changing-everything" macro evidence.

**If signal: what changes.** Add one-line note to `[[user-profile]]` macro-thesis backing — "drug discovery becomes the next AI-eaten field after software." No skill changes. If `[[project-industry-association]]` (ANZ industry body) ever expands into adjacent property-services verticals like environmental health / mould remediation, MAMMAL-style multimodal generalists become relevant for the science layer; not now.

---

## How Google Tracks Everything You Do and How to Stop It

**What it is.** Proton-branded explainer (sponsored content, effectively) walking through Google's data collection across Search, Chrome, YouTube, Gmail, Maps, Docs (`How Google Tracks Everything You Do.md:56–138`). Two "backdoors" framing: (1) Gmail's relationship with US government — FISA Section 702 + national security letters + administrative subpoenas can pull metadata without a judge (`:105–113`); (2) the ad-bid-stream — Google broadcasts GPS coordinates hundreds of times per day in real-time-bidding requests that data brokers harvest (`:118–123`). The forward-looking concern: Gemini's "personal intelligence" combines all six surfaces into one searchable index, and Google's own support docs admit connected-app data is used to train generative models (`:131–137`). Practical mitigations: sign out for searches, kill Chrome sign-in, turn off Maps timeline + per-app location, "Ask before displaying external images" in Gmail, turn off Workspace smart features (`:81–123`).

**Phill-fit verdict.** No-fit operationally — Phill is deep in the Google stack (contact@unite-group.in is Gmail, Pi-CEO uses Workspace, portfolio sites run Google Analytics). Acknowledged, not actionable.

**If signal: what changes.** Nothing in the swarm. But one strategic note worth filing: data-broker concern is a *positioning input* for any future privacy-adjacent product or client. If Duncan's Dimitri / Otto product or any ATO-APP feature touches financial-data privacy, the Proton angle becomes a competitive frame. No wiki changes today.

---

## Your Font File Is Secretly a Program

One-sentence curiosity. Font files are tiny TrueType-VM programs (not data), and the practical takeaway is `font-display` + size-adjust/ascent-override descriptors fix cumulative layout shift on font swap, which factors into Core Web Vitals and therefore search ranking (`Your Font File Is Secretly a Program.md:138–148`) — file under `seo-page-fix` "if CWV is failing, check font swap CLS" footnote, otherwise skip.

---

## Top 3 cross-cutting takeaways

1. **`/goal` + autonomous verification is the new shape of agent work.** Goldie's SEO demo and Stenberg's "5 confirmed vulns → 1 actual" both prove the same thing from opposite ends: agents either run with a verifier or they hallucinate confident wrong answers. Wire every autonomous skill in the stack so it has a separate evaluator gate before claiming done. Already aligned with `[[feedback-audit-verification]]` and `[[feedback-quality-over-quantity]]`.
2. **The "received wisdom" SEO playbook has at least two empirically-busted line items now.** Schema-for-AI-citations is dead (Ahrefs), and FAQ schema is being deprecated by Google (Edward Sturm episode, referenced `:144–148`). Audit every SEO skill + every portfolio SEO doc for both claims and strip them. Replace with: relevance + authority + low pogo-sticking + CWV fixes (including the font-swap one).
3. **Generalist multimodal foundation models beat specialists in their own domain.** MAMMAL beating MolFormer on chemistry while *also* knowing genes and proteins is the same lesson as Claude Sonnet 4.6 outperforming most coding-specific models — multimodal context is leverage, not noise. Translates directly to Unite-Group's video agency: one generalist model with brand-context inputs beats a stack of single-purpose tools.

---

## SEO Goals specific deep-dive

**Current stack:** Phill has three GBP/page-level skills (`seo-gbp-audit`, `seo-page-fix`, `seo-gbp-posting`) plus the DataForSEO orchestrator suite (`seo`, `seo-audit`, `seo-technical`, `seo-backlinks`, `seo-content`, `seo-keywords`, `seo-competitors`, `seo-watchlist`, `seo-compare`, `seo-quick`, `seo-content-gap`, `seo-rankings`, `seo-report`, `seo-report-pdf`, `seo-gbp-posting`).

**Does `/goal` replace, extend, or compete?**

**Extends — does not replace.** `/goal` is a Claude Code execution primitive (a slash command + loop pattern), not an SEO skill. It's orthogonal to the DataForSEO stack: DataForSEO provides ground-truth data; `/goal` provides autonomous execution-until-verified. Goldie's framing collapses "SEO = content generation," but Phill's stack is much wider — competitor analysis, backlink audits, technical crawls, rank tracking — none of which `/goal` improves on its own.

**Where `/goal` genuinely adds leverage:**

- **`seo-page-fix`** is the prime candidate. Today the skill audits a page and outputs fixes; with `/goal`, it can fix → re-crawl → verify → loop until on-page criteria pass. Action: add a `/goal`-style verification gate to `seo-page-fix` for "every fix is verified by re-running the audit, don't stop until score crosses threshold."
- **`seo-content` + `seo-keywords`** gap-closing: `/goal` could orchestrate "write N articles targeting these gaps, each passing readability + internal-link + meta-tag checks, don't stop until all N ship." This is the closest Goldie-style use case.
- **`seo-gbp-posting`** is too low-frequency to need `/goal` — it's already cron'd.

**Where `/goal` does NOT fit:**

- Audits (`seo-audit`, `seo-technical`, `seo-backlinks`) are read-only data pulls — there's no completion-loop to run.
- Decision skills (`seo-compare`, `seo-quick`) are single-shot synthesis.

**Verdict: EXTEND.** Add `/goal`-pattern verification loops to two existing skills (`seo-page-fix`, and a new `seo-content` execution variant for batch article generation). Do not replace any DataForSEO skill. Do not adopt Goldie's "AI assisted SEO is SEO" framing wholesale — the Ahrefs schema study above is exactly the kind of evidence Goldie waves past.

---

## Recommended next move

Update `seo-page-fix` with a `/goal`-style verification gate (audit → fix → re-audit → loop until threshold), strip schema-for-AI-citation advice from any SEO playbook page, and re-run the Ahrefs conclusion through `[[ai-citation-frequency]]` so the metric methodology is corrected before Margot quotes it externally.
