---
name: ato
description: Brand context for the ITR Button tax app (ato-ai.app) — write on-voice, factually-grounded, compliance-safe content. Fires when producing content for this AI tax-return-intake tool (org slug `ato` in credential-triage event routing). Loads brand, voice, key entities, and the CRITICAL guardrail that separates it from the government ATO and keeps every claim inside TASA s90-5 (tool, not tax-agent service).
---

# ato — ITR Button (ato-ai.app) brand context

An AI-assisted **tax-return intake tool** on `ato-ai.app`. Content inherits the Unite-Group Nexus
human voice (`~/2nd Brain/2nd Brain/Wiki/nexus-human-voice-2026-05-11.md`) and layers the facts
below. **Compliance framing is load-bearing** — see the guardrail.

## Brand

- **Name / URL:** the **ITR Button** — `ato-ai.app`. (`ato` is the internal org slug; the product is the ITR Button, NOT the government "ATO".)
- **Product:** two AI agents behind a button that sits on approved **partner** websites (finance brokers, banks, tax agents, financial planners, lawyers, payroll-tax employers) and walks a client end-to-end from pre-fill to lodgement to post-lodgement planning.

## Voice

Nexus human voice for **partner businesses** and **end clients**: plain, reassuring, and rigorously
non-advisory. Precision over persuasion — every claim about what the tool does must be exact,
because the audience includes regulated professionals.

## Key entities (real)

- The **ITR Button**; the two AI agents (incl. "Dimitri").
- **MyGov OAuth** connection to the ATO to pull pre-fill data.
- Constrained intake flow: responses limited to **Yes / No / Tell me more** (not free chat); handles curly items (FBT, CGT, crypto, D13 deductions).
- Hands the completed packet to the client's chosen **Tax Agent in XPM (Xero Practice Manager)** for ID/AML/TFN and lodgement.

## What NOT to claim (CRITICAL)

- It is **NOT** the Australian Taxation Office and is **NOT** affiliated with, endorsed by, or acting for the government ATO. It merely *connects to* the ATO via MyGov OAuth for pre-fill.
- Under **TASA s90-5** it is a **tool, not a registered tax-agent service**. The registered **Tax Agent** owns the tax advice and the lodgement.
- Do **not** claim the app gives tax advice, lodges on its own authority, or replaces a tax agent.
- Do **not** imply guaranteed refunds, outcomes, or ATO acceptance.
- Do **not** invent partner names or integrations beyond MyGov (pre-fill) and XPM (hand-off) without a source.
