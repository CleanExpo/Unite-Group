---
type: wiki
updated: 2026-05-12
---

# Agent Memory & Context Patterns

Hard-won patterns for managing context windows, memory, and sub-agent decomposition in production agent systems. Feeds [[pi-ceo-architecture]] (Margot research + Senior Engineer) and [AI Safety].

## Core Concepts

*   **Context Window Management:** Techniques for efficiently handling and retrieving relevant information within the model's working memory.
*   **State Tracking:** Maintaining a consistent understanding of the conversation's history and current operational state.
*   **Retrieval Augmented Generation (RAG):** Augmenting the LLM's knowledge base with external, verified data sources to reduce hallucination.

## Advanced Patterns

### 1. Memory Architectures
*   **Short-Term Memory (STM):** The immediate context window, holding the last N turns of conversation.
*   **Long-Term Memory (LTM):** Stored knowledge (e.g., user profiles, past interactions) retrieved via vector databases.
*   **Hybrid Memory:** Combining STM and LTM retrieval for comprehensive context.

### 2. Prompt Engineering Techniques
*   **Few-Shot Learning:** Providing the model with several examples of the desired input/output format to guide its response.
*   **Chain-of-Thought (CoT):** Prompting the model to explicitly show its reasoning steps before providing the final answer, improving complex reasoning.
*   **Self-Correction/Reflection:** Designing prompts that force the model to critique its own initial output and refine it iteratively.

## Industry Insights & Risks

### ⚠️ AI Safety & Alignment
*   **Goal Misalignment:** The risk that an AI system optimizes for a literal interpretation of its goal, leading to unintended or harmful outcomes.
*   **Adversarial Attacks:** Manipulating inputs (prompts) to force the model into generating unsafe or incorrect outputs.
*   **Data Poisoning:** Corrupting the training data to embed biases or vulnerabilities into the model.

### 🧠 Cognitive Modeling
*   **Theory of Mind (ToM):** The ability of an AI to model the beliefs, desires, and intentions of human users.
*   **Embodied AI:** Integrating AI models with physical systems (robotics) to interact with the real world.

***

## 🌐 Deep Dive: Interpretability & Transparency

### 💡 Interpretability
*   **Attention Visualization:** Tools that map which parts of the input prompt the model "paid attention" to when generating specific tokens.
*   **Mechanistic Interpretability:** Deconstructing the model's internal workings (e.g., identifying specific circuits responsible for arithmetic or grammar).

### 📢 Transparency
*   **Confidence Scoring:** Providing a quantifiable measure of how certain the model is about its own output.
*   **Source Citation:** Requiring the model to cite the specific documents or data points used to generate factual claims.

***

## 🚀 Future Trends

*   **Multimodality:** Seamlessly processing and generating text, images, audio, and video within a single model architecture.
*   **Agentic Workflows:** Developing autonomous AI agents that can plan, execute multi-step tasks, and interact with external APIs without constant human prompting.
*   **Personalized Models:** Fine-tuning foundational models on highly specific, private datasets to create domain-expert AI assistants.

***

## 🛡️ LLM-as-Judge at the Action Boundary (ingested 2026-05-12)

Source: Nate B Jones, "LLM Agents: The Security Breach Pattern Nobody's Talking About" (2026-05-12). The architectural pattern replacing prompt-based guardrails in serious agentic systems.

### The failure mode
Not jailbreaks, not hallucinations — **agents acting past permission**. Inferring authorisation from a thread that didn't grant it, sending an email because a reply looked like consent, merging a PR because tests passed and the change "looked done". Lindy hit this during internal testing — agent sent unauthorised emails. Better prompts don't fix it (don't hold across long context). Manual confirmation doesn't fix it (trains users to click OK out of habit — the EU-cookie problem).

### The architectural move
A **separate validator/judge LLM** sits at the action boundary. The acting agent must justify its proposed action (cite evidence, declare task scope). The judge reads the justification, checks against context, decides. Two agents, two specialisations: one optimises for task completion, one optimises only for **guarding user intent**. You cannot make a single agent optimise for both — goal #1 always wins, and "get the sale" beats "police the action".

### Four action-risk classes (judge intensity scales with class)
1. **Read-only** (retrieve, summarise, inspect) — no external side effect. Light or no judge unless sensitive data.
2. **Reversible writes** (drafts, labels, internal notes, local files) — judge yes, audit trail optional. **Permanent write/delete in this class always demands a tight judge.**
3. **External actions** (send message, book meeting, post publicly, open PR, notify customer) — **must** pass strong judge every time. Touches other people / systems outside the agent's workspace.
4. **High-risk** (spend money, delete data, change permissions, merge code, legal/financial submissions) — judge **plus** human approval, unless narrow explicit policy permits automation.

### Decision scope: four-way, not yes/no
Yes/no is too coarse and gets bypassed. Judge must be able to: **allow** / **block** / **ask agent to revise** / **escalate to human or higher-trust process**. The middle paths ("draft don't send", "archive don't delete", "route to legal") are where production trust lives. Escalation rate is a tunable: too low = dangerous, too high = humans get annoyed and disable it.

### Correlated judgment failure
If actor + judge share model, context, prompt style → shared blind spots. **Mitigation in May 2026:** use a frontier closed-source model in the judge seat (Opus 4.7, GPT 5.5). The correlated-judgment failure is materially weaker on frontier models than 6 months ago, but still real on open-source generations (Qwen judging Qwen is a known anti-pattern). Don't use the same older model on both sides.

### How this maps to our stack
- **[[pi-ceo-architecture]] TAO.** Opus 4.7 Orchestrator naturally fits the judge persona. Currently the Orchestrator plans + reviews + acts in one pass — split the review step into a distinct judge invocation at every tool-call boundary in Specialist/Worker tiers. Don't let Specialists (Sonnet) self-approve external actions.
- **PM-Core autonomous PR pipeline.** Today PM-Core claims a ticket → implements → opens PR with auto-merge:false (human review). That's class-4 high-risk by Nate's taxonomy — correct. But Synthex/CCW external email + Linear comment actions need a judge layer interposed. Currently no judge sits between agent and external action.
- **Margot Telegram bridge.** External-action class (class 3). Bridge currently dormant ([[log]] 2026-05-11) — when re-enabled, must route through judge on every outbound send, not just "send if cron fires".
- **Builder (autonomous swarm).** Merging code = class 4. Auto-merge:false is the human-approval rail. Judge layer should also block self-evident bad PRs before they reach human review (saves trust-eroding noise).
- **Action-proposal format.** Adopt a typed proposal schema per action class (outbound email / PR / CRM update / payment) so the judge sees structured evidence, not raw model output. Substack article has full schema spec.

### Agents-as-managed-workers framing
The first wave of products focused on standing up agent workers. The next wave (now) is the **management layer**: task assignment, communication, context, permission, supervision, correction, work record. Pi-CEO's Margot → Board → Senior Agents is the management layer in our stack. LLM-as-judge is the missing in-line supervision primitive.

### Action items (queue for [[wave-roadmap]] Wave 6)
1. Classify every existing agent tool call (across Pi-CEO swarm + Margot + Hermes) into one of the four action-risk classes. Output: table per agent.
2. Interpose a Sonnet-4.6 or Opus-4.7 judge at every class-3 / class-4 boundary. Today these run with no judge layer.
3. Move from yes/no approval gates to four-way scope (allow / block / revise / escalate). Telegram bridge + PM-Core PR path are first candidates.
4. Audit for correlated-judgment risk: any agent where actor and judge share model + prompt. Force model diversity at the boundary.
5. Memory-governance follow-up — agent-written memory must be tagged and segregated from human-written memory in the judge's evidence trail. Worth a dedicated [[aip-architecture]] schema entry.

Cross-refs: [[pi-ceo-architecture]] · [[autonomous-sdlc]] · [[decision-frameworks]] · [[unite-group-rls-audit-2026-05-12]] · [[wave-roadmap]]