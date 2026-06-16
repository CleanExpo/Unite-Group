# Unite-Group Mission Control Operating Blueprint

Date: 2026-06-16

## Outcome

Unite-Group Mission Control becomes the daily business cockpit for Phill. It should show every active business, client, project, agent, provider, and blocked dependency in one visual operating layer. Work should be generated from Mission Control, routed through Pi-CEO and Hermes, tracked in Linear, reflected in the relevant project, and summarized back to Mission Control.

## Senior Agent Council Synthesis

### Senior PM

Mission Control must become the work generator, not just the dashboard. A user should enter a business outcome, pick or infer the target project/client, and receive a routed execution packet with owner agent, Linear issue, project links, approvals, usage budget, and completion proof.

### CRM Architect

The CRM spine already has client creation through `POST /api/empire/clients`, but onboarding currently stops at a `nexus_clients` row and audit action. The missing layer is a client launch packet: Telegram group/channel provisioning, project workspace links, provider readiness, brand portal, first campaign/tasks, and a visible onboarding state.

### Agent Orchestrator

The topology has Margot, Pi-CEO Board, Hermes, and senior agents, but the UI still relies on seed topology and lightweight harness reads. The system needs a live agent dispatch ledger: idle, running, blocked, waiting for approval, done, plus current task and source evidence.

### Provider Operations

Claude Max, MiniMax Max, Google Gemini, OpenAI, and OpenRouter are not interchangeable. Mission Control needs a usage and capability board that tracks plan type, approximate remaining capacity, cost risk, best-use lanes, model/provider fallback, and blocked credentials without exposing secrets.

### UX Lead

Phill is visual. The default Mission Control view should use maps, meters, rails, and status tiles rather than dense tables. Text should support the picture, not carry the whole meaning. The first screen should answer: what is running, what is blocked, which project needs attention, and what can the AI do next?

### Security / Governance

Agents should never receive broad write credentials for CRM truth. They should create recommendations, draft work packets, and approval-required actions. Mutation paths must remain gated, auditable, and linked to the final source-of-truth system: Supabase for CRM, Linear for execution, project repos for implementation, and provider dashboards for usage truth.

## Verified Current System

- `src/components/command-center/CommandCenterShell.tsx` already lays out Global Status, KPI strip, AgentTopology, HermesControlPanel, HermesDashboardWrapper, Business360, Daily CRM Digest, Margot Voice, and Activity Log.
- `src/app/api/empire/source-matrix/route.ts` already aggregates GitHub, Linear, Vercel, Railway, and Supabase across the canonical portfolio.
- `src/app/api/empire/businesses/route.ts` already reads portfolio health from `businesses` and `pi_ceo_health_snapshots`.
- `src/app/api/empire/clients/route.ts` already creates `nexus_clients` and records an audit action.
- `src/app/api/empire/senior-agents/route.ts` currently reads CFO/CTO/CMO harness snapshots and returns a lightweight agent brief.
- `src/components/command-center/topology/topology-data.ts` is still seed topology; live wiring is marked deferred.

## Missing Operating Components

1. Mission Control work generator
   - Input: plain business outcome.
   - Output: routed work packet with project/client, senior agent, Linear issue, provider budget, approval gates, and evidence path.

2. Live project switcher
   - Every project/client should be visible as a card or lane with health, work queue, source adapters, active agent, and next action.
   - Canonical projects should not be hardcoded forever; Mission Control should read the portfolio registry/businesses source.

3. Provider usage cockpit
   - Track Claude Max, MiniMax Max, Google Gemini, OpenAI, and OpenRouter.
   - Show status as visual meters: available, near limit, blocked, unknown.
   - Record plan type, reset cadence, best-use lane, last used, usage estimate/source, and fallback route.

4. Hermes and Pi-CEO operating handoff
   - Hermes should watch, remind, scout, and dispatch.
   - Pi-CEO should plan, decompose, route, and evaluate.
   - Mission Control should show which one owns the next step and why.

5. Client onboarding packet
   - Create CRM client.
   - Create or link Telegram destination.
   - Create Linear project/work queue.
   - Link project repo/source adapters.
   - Create first onboarding tasks and first AI-generated work plan.
   - Show onboarding completion as a visual checklist.

6. Live agent activity map
   - Replace seed-only topology with a live agent/task ledger.
   - Include state, current task, source system, project, provider, started time, blocked reason, and output link.

7. Completion and cleanup loop
   - When scoped work is complete, the system should close the Linear project or task batch with a final summary.
   - Stale, duplicate, and completed work should not continue to clutter the queue.

## Build Order

1. Connect the existing Linear autonomous loop to the Unite-Group Mission Control work generator.
2. Add provider usage cockpit API and UI.
3. Convert the seed agent topology into a live agent operations map.
4. Expand client creation into a full onboarding packet with Telegram and project workspace links.
5. Replace hardcoded project lists with the portfolio registry/businesses source where safe.
6. Add final completion summaries and project closure checks.

## Non-Negotiables

- No secret values in UI, logs, Linear, or generated work packets.
- Agent writes to CRM truth require approved server routes.
- Linear remains execution truth.
- Supabase remains CRM truth.
- Provider usage numbers must declare whether they are live, estimated, manually entered, or unavailable.
- The default view must be visual-first and understandable without engineering knowledge.
