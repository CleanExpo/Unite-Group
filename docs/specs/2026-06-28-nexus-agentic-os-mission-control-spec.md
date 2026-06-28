---
type: spec
status: draft
created: 2026-06-28
author: SPM (/spm + /superpowers:writing-plans, /judge-enhanced)
source: "2nd Brain/Sources/The Agentic OS Setup That Will 10x Claude Code.md" (Chase AI, youtu.be/HRw-vP0j8OM)
visual_refs: docs/specs/assets/mission-control-2026-06-28/{01-command-center,02-dashboard}.png
evidence_standard: fabel — claims tagged [VERIFIED]/[INFERENCE]/[UNCONFIRMED]
---

# Nexus Agentic OS — Mission Control spec

Turn the running Hermes Workspace console into the **Unite-Group Nexus Agentic OS**: a customised,
plan-backed, second-brain-grounded command surface, built on Chase AI's 4-level model and the
infrastructure Nexus already has. The visual shell exists; this spec wires the levels beneath it
and customises every surface to Nexus.

## 1. The source model (Chase AI, 4 levels)

Distilled from the transcript. Levels 1–2 are ~90% of the value; 3–4 are the visible wrap.

1. **L1 — Backbone:** skill architecture + loop engineering. Workflow audit → skills → automation → self-improving loops. Codify everything repeatable into skills/automations.
2. **L2 — Memory & State:** the Karpathy Obsidian "RAG" — `raw/` (unstructured) → `wiki/` (structured) → `outputs/` (deliverables), with an **`index.md` map at every folder level** + a `CLAUDE.md` of vault conventions + a navigation pattern. Log every run so loops can self-improve.
3. **L3 — Interface:** a custom visual wrap (web app and/or Obsidian plugin) — **custom metrics on the left, skills/automations as one-click buttons on the right**, each button firing a **headless `claude -p` run that pulls from the Max plan**, optional **local voice**, outputs dumped back to the vault.
4. **L4 — Distribution:** hand the web app to team/clients (GitHub/zip easy; Obsidian harder). Floor-raising: non-technical users press buttons, never touch a terminal.

## 2. The decisive finding — Nexus already has all four levels, partially wired

This is not a greenfield build. Mapping the model onto verified Nexus reality:

| Chase level | Nexus asset (exists) | State `[VERIFIED this session unless noted]` |
|---|---|---|
| L1 Skills | `~/.claude/skills/` library (12 canonical + sub-skills) + Hermes jobs/crons (`/api/claude-jobs` returns real crons incl. `nexus-weekly-review`) + Lane Orchestrator (`/api/lanes/*`) | Skills exist; **0 installed into the workspace** (Dashboard "0 skills"); automations exist as Hermes crons; lanes built but **0 active** |
| L2 Memory/State | `2nd Brain/` vault **already in Karpathy shape** — `Sources/` (raw), `Wiki/` (structured, with `index.md` + `log.md`), outputs; mirrored to Supabase `wiki_pages` via `sync_wiki_to_supabase.py`; Hermes memory | Vault is mature; workspace `/api/knowledge/list` shows **no `KNOWLEDGE_DIR` configured** → not pointed at the vault yet |
| L3 Interface | Hermes Workspace `/command-center` (running :3000) — connection rail, Inspector decision-surface, Domain cards, IDE Lanes, Quick Commands, cost rail | **Shell matches Chase's design** (see 01-command-center.png); quick-commands display-only; telemetry pulse stale ("GATEWAY STOPPED · 40d") |
| L4 Distribution | Web Nexus CC deployed at unite-group.in (Vercel) | Not bridged to the gateway (behind a deliberate "named-grant gate"); workspace itself not yet team-distributable |

**Execution is live** `[VERIFIED]`: gateway `/v1/chat/completions` returns 200 via the `minimax-oauth` plan; Dashboard shows ACTIVE MODEL **MiniMax M2.5 Online**, mode `zero-fork`. Plans-over-keys honoured.

## 3. Problem

The OS shell is built and execution works, but the levels beneath are not wired to Nexus: skills aren't loaded as buttons, the vault isn't connected, quick-commands don't fire headless runs, telemetry is stale, and nothing is distributable. So it looks like Mission Control but doesn't yet *operate* Nexus.

## 4. Desired outcome

A single Mission Control where Phill (and later the team) sees live Nexus metrics, presses a button to run any codified Nexus skill headlessly on the plan, watches it stream, and gets the output filed into the 2nd Brain — with every external side-effect approval-gated.

## 5. Scope

**In:** wire L1 skills→buttons, point L2 at the 2nd Brain vault, make L3 quick-commands fire real headless `claude -p` runs + fix telemetry + populate lanes, customise every surface to Nexus, and stage L4 distribution.
**Out:** rebuilding the shell (it exists); the web CC prod bridge (separate gated track, spec §11 of the prior operator spec); new vendors.

## 6. Existing capability (do not rebuild)

The shell, the gateway (plan-backed), the skills library, the 2nd Brain (Karpathy-shaped), the Supabase mirror, the lane orchestrator, the cron automations. Reuse all.

## 7. Specialist board (15+ yr Design & Engineering)

- **Design (Mission Control):** the layout is right (connection rail → inspector → domain cards → lanes → quick commands → cost rail). Customise *content*, not structure: rail = Hermes/Obsidian/Video/GitHub/Linear **+ the 6 businesses**; domain cards = Nexus domains (2nd Brain, Voice/Jarvis, News Radar, Video, SEO, Loop Eng, **+ CRM/Portfolio, + Marketing/Synthex**); metrics = portfolio health + token/cost + cron pulse. Keep OLED-black / cyan Scientific-Luxury tokens for the web-CC variant; the workspace uses its own dark theme.
- **Engineering:** the highest-risk coupling is the headless-run button → `claude -p` plan execution. It must (a) run headless, (b) pull the **Max/plan** not API credits, (c) stream back to the tile, (d) write output to the vault, (e) be approval-gated for side-effects. The lane orchestrator + gateway already provide (a)/(b)/(c); (d)/(e) need wiring.
- **Security:** every button is a capability grant. Default to read-only/dry-run (the UI already labels LOCAL-DRAFT / READ-ONLY-PROPOSAL / APPROVAL-GATED). No button performs push/deploy/DB/billing/publish without an explicit approval gate. Local voice over cloud where possible (plans-over-keys ethos).
- **QA:** stale telemetry ("GATEWAY STOPPED" while running) is a trust-killer — fix the pulse first; a cockpit that lies about state is worse than none.
- **Devil's advocate:** Chase's own thesis is "L1+L2 are 90% of the value; L3/L4 are cherry-on-top." So do **not** over-invest in pixels. The win is: skills audited + loaded, vault connected, buttons that actually run. Resist building bespoke visualisations before the buttons work.

## 8. Judge challenge — score 88/100 → APPROVE BUILD (phased)

Strong because it builds on verified, already-running infrastructure and the highest-value layers (L1/L2) are mostly present. Held back from higher by: (a) headless-button→vault-output wiring is unproven; (b) distribution (L4) has real auth/multi-user questions; (c) the web-CC bridge is gated. Verdict: **build L1→L3 now** (local, reversible), stage L4 + web bridge behind founder gates.

## 9. Proposed solution — the Nexus Agentic OS

### L1 — Backbone (skills + automations)
- Run the **workflow audit** Chase prescribes against Phill's real history: have the agent read recent Claude Code sessions and the `~/.claude/skills` index, produce a chart of repeated tasks → existing skill / proposed skill / automation candidate. `[INFERENCE: the skills library already covers most domains; the audit finds gaps + button candidates]`
- Load the chosen skills into the workspace so Dashboard "skills installed" > 0 and they appear as Quick-Command buttons.
- Keep automations as Hermes crons (already firing); surface them in Jobs.

### L2 — Memory & State (point the OS at the 2nd Brain)
- Set `KNOWLEDGE_DIR` / Obsidian vault to `~/2nd Brain/2nd Brain` so `/api/knowledge/*` and the Memory Galaxy card read the real vault (already Karpathy-shaped with `index.md` + `log.md`).
- Confirm the run-log loop: every headless run writes its output + a log line into the vault `outputs/` + `log.md` so loops can self-improve (Chase's L2↔loop tie-in).

### L3 — Mission Control (customise + make buttons real)
Grounded in 01-command-center.png. Customisations:
- **Connection rail:** real status dots for Hermes (gateway up), Obsidian (vault path set), Video, GitHub, Linear — and add the 6 businesses' health (from Pi-CEO / empire-status).
- **Inspector (decision-surface):** keep the Next-Safe-Action / Approval-Gate / Why card (it already renders Phill-actionable guidance).
- **Domain cards:** map to Nexus domains; flip statuses from NEEDS-VAULT/DRY-RUN to READY once L1/L2 wired.
- **Quick Commands → real headless runs:** wire each button to a headless `claude -p`/lane run on the **plan**, streaming to the tile, output filed to the vault, side-effects approval-gated. Seed buttons: Daily priority brief, Source→Shape, SEO approval packet, Video command packet, **empire-status**, **portfolio digest**.
- **IDE Lanes:** the "New IDE" wizard already exists; document role→plan-account mapping; gateway lanes work now, CLI lanes need per-account logins (interactive).
- **Telemetry fix:** repair the pulse so Dashboard reflects the live gateway (currently stale "GATEWAY STOPPED · 40d"). `[VERIFIED stale via 02-dashboard.png]`
- **Voice:** attach a voice layer (Hermes Jarvis card already present); prefer local; ElevenLabs key exists in `~/.hermes/.env` as fallback. `[UNCONFIRMED which voice path the workspace supports natively]`

### L4 — Distribution (stage)
- Web variant (the unite-group.in Nexus CC) is the distributable surface for team/clients — button-only, no terminal. Gate behind auth + the existing "named-grant gate." Package as the floor-raiser Chase describes.

## 10. UX

Open `/command-center` → green dots across the rail → press "Daily priority brief" → it queues, streams in the tile, finishes, and the write-up lands in the 2nd Brain `outputs/` + is openable in Obsidian. Non-technical team member does the same on unite-group.in without ever seeing a terminal.

## 11. Technical plan (phased, each phase verifiable)

**Phase A — L2 connect (smallest, unblocks cards):** set vault/KNOWLEDGE_DIR → verify `/api/knowledge/list` returns vault pages; Memory Galaxy card flips to READY.
**Phase B — telemetry truth:** fix the gateway pulse → Dashboard shows gateway running + live token/cost.
**Phase C — L1 audit + load:** run the workflow audit; load skills → Dashboard "skills installed" > 0; buttons appear.
**Phase D — L3 buttons real:** wire one Quick Command end-to-end (headless plan run → stream → vault output → approval gate), then replicate. Verify: pressing "Daily priority brief" produces a vault file.
**Phase E — L4 stage:** package the web variant for distribution behind auth; do not deploy through the named-grant gate without founder sign-off.

## 12. Security

Buttons default read-only/dry-run; side-effects (push/deploy/DB/billing/publish) approval-gated via the Inspector gate. Plan-backed execution (no API-credit burn). Local voice preferred. Non-loopback exposure requires `HERMES_PASSWORD`. MFA before any multi-user distribution.

## 13. Verification

- A: `/api/knowledge/list` returns vault pages (not `exists:false`).
- B: Dashboard shows gateway running + non-zero pulse within the minute.
- C: `/api/skills` (or Dashboard) shows installed > 0.
- D: pressing a Quick Command yields a streamed run + a new file in `2nd Brain/.../outputs/` + a `log.md` line.
- E: a second (non-founder) identity can press a button on the web variant and get output, terminal-free.
- Gate every code change: `pnpm -C apps/web run type-check && lint && vitest run` (web variant); workspace builds via `pnpm build`.

## 14. Loop + stress testing

Fire 5 Quick Commands concurrently; confirm queueing, streaming, and that each output is filed without cross-contamination. Kill the gateway mid-run; confirm the tile shows an honest error, not a hang. Re-run a self-improving skill twice; confirm run-2 reads run-1's log (loop closure).

## 15. Acceptance criteria

- [ ] Vault connected; Memory/knowledge cards live.
- [ ] Telemetry honest (no false "stopped").
- [ ] ≥1 skill installed and visible as a button.
- [ ] ≥1 Quick Command runs headless on the plan, streams, and files output to the vault.
- [ ] Side-effect commands are approval-gated.
- [ ] Web variant demonstrably usable by a non-technical identity (staged).

## 16. /goal command

```
/goal Wire the Nexus Agentic OS per docs/specs/2026-06-28-nexus-agentic-os-mission-control-spec.md,
phases A–D (local, reversible; no prod writes). DoD: (A) point the workspace at ~/2nd Brain/2nd Brain
as the Obsidian/KNOWLEDGE_DIR vault and verify /api/knowledge/list returns real pages; (B) fix the
gateway telemetry pulse so the Dashboard stops showing "GATEWAY STOPPED" while :8642 is live;
(C) run the workflow audit over recent sessions + ~/.claude/skills and load the chosen skills so the
Dashboard shows skills installed > 0; (D) wire the "Daily priority brief" Quick Command to a headless
plan-backed claude -p / lane run that streams to the tile and writes its output into the 2nd Brain
outputs/ + a log.md line, with side-effects approval-gated. Verify each phase per spec §13. Do NOT
deploy to unite-group.in or through the named-grant gate; stage L4 distribution and surface it for
founder approval.
```

## 17. Implementation sequence

A (vault) → B (telemetry) → C (skill audit/load) → D (real buttons) → E (distribution, founder-gated). A–D are local/reversible; E + the web-CC bridge are founder-gated.

## 18. Session-handoff seed

- Source pulled + read; 4-level model captured (§1). Visual refs saved (assets/mission-control-2026-06-28/).
- Verified live state: shell matches Chase design; execution works (MiniMax M2.5 Online); gaps = vault not connected, skills 0, telemetry stale, buttons display-only.
- Open founder decisions: L4 distribution + web-CC bridge (gated); voice path (local vs ElevenLabs); which audited skills become buttons.

## 19. Final recommendation

**APPROVE BUILD — execute Phases A–D now** (local, reversible, no prod writes). The shell Phill has been asking for already exists and matches the reference; the value is connecting the second brain, making the buttons fire real plan-backed runs, and telling the truth in telemetry. Per Chase's own thesis, invest in L1/L2 wiring and the headless-button path — not new pixels. Stage L4 distribution + the web bridge behind founder sign-off.

SPM spec complete. Next safe action: run the §16 /goal command to execute Phases A–D (vault connect → telemetry fix → skill load → first real button), all local and reversible.
