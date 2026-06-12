---
type: wiki
updated: 2026-05-08
---

# Decision Frameworks

How decisions flow through the Pi-CEO system.

## Decision rights table

| Decision | Who decides | Gate |
|---|---|---|
| Spend ≤ $1k/day | CFO autonomous | — |
| Spend $1k–$50k/day | Board deliberation → directive | [[founder]] reaction-gated brief |
| Spend > $50k/day or capital raise | [[founder]] | HITL |
| Standard PR → feature branch | Layer 3 auto | — |
| PR → production main | Board deliberation | HITL on architecture-significant |
| Hire/fire (1099 contractor) | Board deliberation | HITL final |
| M&A target identification | Board deliberation | HITL go/no-go |
| Customer churn-save offer > $5k | Board deliberation | HITL on enterprise |
| Brand voice / public statement | Board drafts | HITL final |
| Issue triage / rejection | Triage skill | `.out-of-scope` directory match |
| Issue → AFK agent execution | Maintainer | `ready for agent` label + agent brief |

## ceo-board skill

9 specialist personas: CEO, Revenue, Product Strategist, Technical Architect, Contrarian, Compounder, Custom Oracle, Market Strategist, Moonshot.

Used whenever: "help me decide", "what should we do about", "strategic options", "go/no-go", or any high-stakes question. Uncertainty in → decision memo out.

## Backlog Triage skill

The Triage skill, created by [[Matt Pocock]], manages GitHub issues and Jira backlogs to convert human ideas into actionable tasks for AFK agents like [[Sand Castle]]. The system enforces a strict state machine via labels, requiring exactly one category role (`bug`, `enhancement`) and one state role per ticket. State roles comprise `needs triage` (maintainer review pending), `needs info` (reporter bottleneck), `ready for agent` (fully specified), `ready for human` (manual implementation), and `won't fix`. 

Advancing an issue to `ready for agent` mandates completing a standardized agent brief template. AFK agents exclusively process tickets explicitly bearing the `ready for agent` label. The triage agent evaluates proposed enhancements against a `.out-of-scope` repository directory acting as Architectural Decision Records ([[ADR]]) to automatically reject and close incompatible features. Operators monitor LLM context budgets, typically limiting triage sessions to roughly 100K tokens. Unverified bug reports trigger a separate "diagnose" skill for autonomous reproduction via stack traces prior to agent assignment.

## HITL gate mechanism

Every outbound message goes through `telegram-draft-for-review`. [[founder]] approves via Telegram 👍 or rejects with ❌. 24h timeout → expired, nothing sent, logged.

## Reaction-approval loop (Scribe role)

Scribe drafts; CoS routes to [[founder]] via Telegram; [[founder]] reacts. No send without approval. Kill-switch (`TAO_SWARM_ENABLED=0`) halts sends, not drafts.

## Claude Code Action Permissions

[[Claude Code]] executes agentic terminal tasks directly using plain English prompts. Permission frameworks balance safety and execution speed, configured via the `/permissions` command or by directly editing `/.settings.json` (which can be checked into the repository to sync team access). The nuclear `--dangerously-skip-permissions` flag grants complete unrestricted access but is explicitly avoided per creator [[Boris Cherny]]. 

*   **Preapproved (Auto):** Reading files/folders, running dev servers, running tests, and executing git operations (commits, GitHub uploads).
*   **Gated (HITL):** Installing new packages, deleting files/folders, and touching the internet (API calls, sending data).
*   **Basic Commands:** Launch with `claude`, exit with `Ctrl+C` twice.

## Algorithmic Decision Frameworks

Algorithmic decision-making often follows structured, multi-stage processes, such as financial modeling or predictive analytics. These frameworks require defined inputs, iterative processing, and quantifiable outputs.

**Key Components:**
1. **Data Ingestion:** Gathering diverse, structured data sets (e.g., market data, historical records).
2. **Feature Engineering:** Transforming raw data into predictive variables.
3. **Model Training:** Selecting and optimizing algorithms (e.g., time-series analysis, regression).
4. **Validation & Backtesting:** Testing model performance against historical data to assess robustness.

**Example: Predictive Market Modeling**
*   **Objective:** Forecast future asset price movements.
*   **Process:** Models analyze historical price action, volume, and macroeconomic indicators.
*   **Output:** A probability distribution of potential future states, guiding risk assessment and investment decisions.

**Risk Management Integration:**
All algorithmic decisions must pass through a risk layer that quantifies potential downside exposure, ensuring that the potential reward outweighs the calculated risk.

***
*Note: The original text was preserved and the new section was added.*