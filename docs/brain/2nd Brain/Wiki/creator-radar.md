---
updated: 2026-05-11
---

### **New Entry: Cal Rueb (Anthropic Applied AI)**

**Role:** Core Claude Code contributor at Anthropic; led Applied AI team since late 2024.
**Source:** `Sources/This Anthropic Engineer Uses Claude Code Differently Than Everyone Else.md` (Ionuț Dogariu interview, May 2026).
**Why watch:** This is the source for what Anthropic-internal Claude Code workflow actually looks like — not a YouTuber's interpretation. Owns the system prompts, tool descriptions, and tool-result formatting; works on evaluation pipeline for prompt changes.
**Key signals:**
- Anthropic engineers run 2–4 Claudes in parallel via tmux + shared `ticket.md` handoff.
- Internal Coo CLI is referenced in their team's `claude.md` — confirms CLI-tool-as-context pattern beats MCP-server.
- "Think between tool calls" landed in Claude 4 — explicitly prompt for it on debug passes.
- Auto-accept mode + per-command allowlist is the team's velocity unlock.
- Claude.md updates: with Claude 4 instruction-following improved, prune your existing claude.md (some prompts no longer needed).

See [[claude-code-guide]] § Anthropic-Internal Patterns and [[system-opportunities-2026-05-11]].

---

### **New Entry: Edward Sturm (The Edward Show)**

**Role:** SEO Strategist, Content Creator, and Digital Marketer
**Focus:** Link building, SEO strategy, content marketing, and "Linkable Assets."

---

#### **Core Philosophy: The "Linkable Asset" Strategy**
Edward specializes in creating high-value, utility-driven content designed specifically to earn backlinks naturally. Instead of traditional outreach, he focuses on building tools, calculators, and data-driven assets that journalists and bloggers *want* to cite, thereby building domain authority through organic utility.

#### **Key Concepts & Strategies**

**1. Linkable Assets (The "Magnet" Strategy)**
*   **Definition:** Creating high-utility web tools, calculators, or original data reports that serve as natural citations for other websites.
*   **The Goal:** To move away from "begging" for links via outreach and move toward "earning" links via utility.
*   **Examples of Assets:**
    *   **Calculators:** (e.g., a mortgage calculator, a ROI calculator, or a calorie calculator).
    *   **Data Studies:** Publishing original research or industry reports that journalists need to cite.
    *   **Visualizations/Infographics:** Complex data turned into easy-to-understand visuals.
    *   **Templates/Checklists:** Highly useful, downloadable resources.

**2. The "Utility-First" SEO Workflow**
*   **Identify Gaps:** Find topics where people are searching for a *solution* (a tool or a number) rather than just an article.
*   **Build the Asset:** Develop a simple, functional web tool (e.g., `sleepytai.me` or a mortgage calculator).
*   **Distribute via "The Hub & Spoke":** Use the asset as the "Hub" and create "Spoke" content (blog posts, social media, PR) that points back to the tool.
*   **Redirect Strategy:** Once an asset gains authority, redirect the standalone domain (e.g., `toolname.com`) to a subfolder on the main brand site (e.g., `brand.com/tool`) to consolidate all earned "link juice" into the main domain.

**3. The "Redirect & Consolidate" Tactic**
*   When a standalone tool or domain (like `sleepytai.me`) becomes a powerhouse of backlinks, redirect it to a specific path on your primary domain. This transfers the massive accumulated authority directly to your main brand site, boosting the rankings of your entire ecosystem.

#### **Notable Case Studies & Examples**
*   **The Sleepy.me Example:** Created a simple sleep calculator tool. The tool gained massive organic backlinks from news sites and health blogs. By redirecting that authority, the parent brand's SEO authority skyrocketed.
*   **The "Hub & Spoke" Content Model:** Using high-level data studies to drive traffic to specific service pages.

#### **Key Tools & Frameworks**
*   **Linkable Asset Framework:** Identify $\rightarrow$ Build $\rightarrow$ Promote $\rightarrow$ Redirect.
*   **The "Calculator" Framework:** Finding high-volume "How much/How many" queries and building functional web-based solutions to answer them.

---

### **New Entry: Leon van Zyl**

**Role:** Developer, Content Creator, and Educator
**Focus:** [[Agentic Coding]], [[Local AI]] models, and automated app development.

#### **Core Project: [[LocalForge]]**
*   **Definition:** A free, open-source coding agent (repository at `github.com/leonvanzyl/localforge`) that runs entirely on local AI models via [[LM Studio]] or [[Ollama]], eliminating the need for expensive API tokens from frontier models like Claude Code or [[GPT-5.5]].
*   **Workflow:** Users describe an app, and the AI agent automatically breaks the complex task into individual features, adds them to a Kanban board, and implements them in parallel on autopilot.
*   **Visual Testing:** The agent utilizes multi-modal capabilities to open a browser, visually test the application end-to-end, and capture screenshots for review.

#### **Key Concepts & Strategies**

**1. The Shift to [[Local AI]]**
*   Frontier models are becoming prohibitively expensive for heavy coding tasks, with models like [[GPT-5.5]] doubling previous costs and usage limits being hit rapidly.
*   Consumer-grade hardware (e.g., an RTX 4070 GPU) can effectively run specialized 27B-35B parameter open-source models capable of robust tool calling and multi-modal code generation.

**2. Recommended Models & Setup**
*   **Models:** Qwen 3.6 (35B parameter model highly recommended) or JML4 (specifically the 31B parameter version, as smaller variants fail at tool calling).
*   **Execution Environments:** [[LM Studio]] is preferred over [[Ollama]], as Ollama currently experiences a bug where it defaults to CPU processing instead of proper GPU utilization for these specific tasks.
*   **Configuration:** Users must manually increase the model's context length setting in [[LM Studio]] (which defaults to around 4,000 tokens), as coding agents require massive upfront context limits for system prompts and tool definitions.

**3. Education & Community**
*   Leon runs the **Agentic Labs** community on Skool, offering an Agentic Coding Masterclass, weekly lab challenges, and live Q&As.

---

### **New Entry: AI Founders**

**Role:** AI Business Education and Community
**Focus:** [[AI Business Models]], maximizing profit per hour, and turning AI into leverage.

#### **Core Philosophy: Profit Per Hour**
*   Optimizing strictly for top-line revenue often results in an "expensive job" or "profitable prison."
*   The truest metric for scalability is "profit per hour," which measures how much income grows when a [[founder]] stops trading time for money.
*   AI businesses exist on a scalability spectrum determined by who executes the work post-payment: Custom (build for one) $\rightarrow$ Productized (middle) $\rightarrow$ [[SaaS]] (build once, software does the work).

#### **Top 5 AI Business Models of 2026 (Ranked by Profit Per Hour)**
**1. Vertical AI Micro [[SaaS]]:** The highest profit-per-hour model according to Super Frameworks' 2026 analysis, offering the highest scalability by detaching income from time.
**2. Outcome-Based AI Consulting:** High-level consulting tied to delivering specific business outcomes rather than charging hourly rates.
**3. Custom AI App Development:** Building tailored applications using rapid development platforms like Bolt.new.
**4. Productized AI Services:** Standardized, middle-ground service offerings where deliverables are fixed.
**5. [[AI Automation Agency]] (AIAA):** Building client workflows and agents using platforms like Make.com, Zapier, and n8n. Agencies charge monthly retainers of a few thousand dollars per client, yielding 50-60% gross margins (per Sidekick accounting benchmarks) and allowing solo operators with 6-10 clients to achieve six-figure revenues.

#### **Ecosystem & Communities**
*   **AI Founders HQ:** A central hub offering practical AI education, execution frameworks, and free/paid [[founder]] communities.

---
**Related Notes:**
*   *See: **[[Link Building Strategies]]***
*   *See: **[[Content Marketing (Utility-Driven)]]***
*   *See: **[[SEO Authority Building]]***
*   *See: **[[Agentic Coding]]***
*   *See: **[[Local AI]]***
*   *See: **[[AI Business Models]]***
*   *See: **[[AI Automation Agency]]***
*   *See: **[[SaaS]]***