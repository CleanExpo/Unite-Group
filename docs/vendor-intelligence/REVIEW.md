# Nexus vendor-intelligence review

Generated: 2026-09-12T17:19:54.396Z

Summary: 36 sources reviewed; 21 material; 14 volatile noise; 1 unchanged.

## Material changes

### anthropic.claude-code.changelog

- Vendor: Anthropic
- Source: https://code.claude.com/docs/en/changelog
- Change: changed
- Prior hash: 3f6f83405e574480ef3eb66c8183dd6c984f9bb6f6fdcaef3d7abd287cf6d236
- Current hash: 91e8e5c6b92128b102a9271642bc7060cb97a6eee44b46a78524fbb8c65ae037

```diff
+ <Update label="2.1.269" description="September 11, 2026">
+ * Added `claude plugin eval`: run a plugin's eval suite against Claude Code and get scored, reproducible results (JSON + HTML report); see `claude plugin eval --help`
+ * Added `/output-style [name]` to list and switch output styles, including over Remote Control and in cloud and other headless sessions
+ * Added a diff of the files a Bash command changed to the Bash tool result when the Bash tool handles file edits (setting `bashEditDiffEnabled`)
+ * Added `OTEL_METRICS_INCLUDE_REPOSITORY` to tag OpenTelemetry metrics and events with `vcs.*` repository attributes; commit events get `vcs.ref.head.*` with `OTEL_LOG_TOOL_DETAILS`
+ * Added `CLAUDE_CODE_GATEWAY_MODEL_DISCOVERY_TIMEOUT_MS` to extend the LLM gateway `/v1/models` discovery timeout (default 3s)
+ * Added a spinner tip suggesting `/focus` for a view with just your prompt, a one-line work summary, and the response
+ * Added `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` (1–256) to raise the Workflow tool's per-run concurrent agent limit for inference-bound fan-outs
+ * Fixed the prompt cache being partially invalidated on the turn after a response was cut off at the output-token limit and automatically resumed
+ * Fixed a case where resuming a session after interrupting Claude mid-thought could change how earlier context was re-sent, hurting prompt-cache reuse
+ * Fixed F1/F2/F4 not working in kitty-protocol terminals and Delete in st, Alt+arrows acting as Escape in rxvt-unicode, and Shift+punctuation typing the unshifted key in WezTerm (regression in 2.1.247)
+ * Fixed remote and headless sessions reporting "waiting for your input" while background agents were still running (set `CLAUDE_CODE_BG_TASKS_REPORT_RUNNING=0` to restore the old behavior)
+ * Fixed the terminal's replies to capability queries (`^[[?1;2c`) appearing as stray text at startup in some terminals
+ * Fixed rows at the top or bottom of the transcript going blank in fullscreen after resizing the terminal
+ * Fixed a deny or ask permission rule starting with `!` applying beyond the settings source that wrote it; such a rule now applies only within its own source, and a bare `!` negation is ignored
+ * Fixed the git status Claude is told after a compaction: it is now the current status, not the one from the start of the session
+ * Fixed synced plugin MCP servers not connecting when a remote session resumes
+ * Fixed resumed headless sessions losing a turn's replies when the model was switched or a request was retried mid-turn
+ * Fixed terminal escape codes, line breaks and oversized text from a background task's on-disk record reaching the task list and task notifications when work is resumed
+ * Fixed CMYK JPEG images failing to attach with "cannot decode"; they are now converted and resized like other JPEGs
+ * Fixed the managed settings approval dialog not naming the collector for a gRPC telemetry endpoint set without a scheme
+ * Fixed plugin `headersHelper` consent prompts showing a URL path that could be misread as a different host
+ * Fixed plugin errors showing `[redacted URL]` in place of a relative Windows path with a folder name that starts with `@`
+ * Fixed missing cursor in the permission-rule, auto-mode-rule, add-directory, session-rename and feedback-review text fields when the terminal's native cursor is enabled
+ * Fixed repeated clicks on a `/fork` receipt, each under a second apart, never backgrounding the session right away while it waited for the current tool to finish
+ * Fixed plugin LSP servers that reject `shutdown` params (e.g. rust-analyzer) being left running at session end; `exit` is now sent even if `shutdown` fails
+ * Fixed the attribution reminder overriding a CLAUDE.md or memory rule against commit and pull request attribution; lines set by managed settings still apply
+ * Fixed prompt suggestions being dropped for text in Japanese, Chinese, Thai and other languages written without spaces between words
+ * Fixed synchronized output being assumed from the terminal's name in GNOME Terminal and Konsole versions that do not support it
+ * Fixed `permission_denials` in `--output-format stream-json` results omitting Read, Edit and Write calls blocked by a path-scoped deny rule
+ * Fixed sessions run through the SDK or the desktop app showing an unknown status in other sessions' agent list
+ * Fixed `/insights` failing on Bedrock, Vertex, Foundry, and gateway deployments whose account can't reach the default Opus model by using the session model there instead
+ * Fixed organization policy limits not loading for the session when another Claude Code process refreshed the login at the same moment
+ * Fixed Claude Desktop sessions using Bedrock, Vertex, or a gateway not getting the contextual "what Claude needs" turn-end notification text
+ * Fixed MCP servers reconnecting when an updated config only changed the order of the server URL's query parameters
+ * Fixed the prompt box's top border splitting into extra lines when viewing a background agent whose name or description has line breaks or is wider than the terminal
+ * Fixed sessions getting permanently stuck on "Prompt is too long" when auto-compaction had no complete earlier exchange to summarize (mostly Agent SDK sessions with very large prompts)
+ * Fixed `/goal` runs silently stalling after API errors, network drops, or token limits: the goal now retries with backoff, or pauses and says why, including until a usage limit resets
+ * Fixed prompt cache misses in cloud sessions by waiting briefly for server configuration before the first request
+ * Fixed `/btw` answers that contained made-up tool calls and output: the side question is now told not to write them, and any that appear are flagged as not executed
… diff truncated (304 added / 0 removed lines)
```

### anthropic.platform.data-retention

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- Change: changed
- Prior hash: 433cd20a2b6f30d93b4c944a869839e3568deb5e5597a4daf9e4ac4b1f0e17c0
- Current hash: 603608f72f4ab8dcd81a0ba610c4fe495e80912ff7589735ddff232e2846eab8

```diff
- Several retention models sit outside the ZDR and HIPAA arrangements described on this page. Data accessible through the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) follows its own retention model. The [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) retains data for 6 years. Chat, file, and project content from claude.ai follows your organization's retention policy set in [claude.ai > Organization settings > Data and privacy](https://claude.ai/admin-settings/data-privacy-controls). [Local session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions) (from sessions on users' machines, in apps such as Cowork and Claude Code) are stored for 6 years by default, or for your organization's custom conversation retention period when a finite one is set (the same claude.ai setting). [Remote session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions) (Cowork in the cloud) are retained for 6 years, unless a user deletes the session sooner. The Compliance API does not capture local sessions for which ZDR is in effect, or any local sessions from organizations with HIPAA readiness enabled.
+ Several retention models sit outside the ZDR and HIPAA arrangements described on this page. Data accessible through the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) follows its own retention model. The [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) retains data for 6 years. Chat, file, and project content from claude.ai follows your organization's retention policy set in [claude.ai > Organization settings > Data and privacy](https://claude.ai/admin-settings/data-privacy-controls), unless a user deletes it sooner. [Local session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions) (from sessions on users' machines, in apps such as Cowork and Claude Code) are stored for 6 years by default, or for your organization's custom conversation retention period when a finite one is set (the same claude.ai setting). [Remote session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions) (Cowork in the cloud) are retained for 6 years, unless a user deletes the session sooner. The Compliance API does not capture local sessions for which ZDR is in effect, or any local sessions from organizations with HIPAA readiness enabled.
```

### anthropic.platform.release-notes

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/release-notes/overview
- Change: changed
- Prior hash: 6ad4dafb0e1ebb480b0fc37f66899ce0169662bc9265b5c3f82256c6d50535ba
- Current hash: 619516d5bcb9664e244aec10bed01abd0729b1b92b4cfd9f67eb61aacc199dbe

```diff
+ ### September 10, 2026
+ * Claude Managed Agents permission policies now include `auto`: the server evaluates each agent or MCP tool call and runs it, denies it, or pauses for your approval. `agent.tool_use` and `agent.mcp_tool_use` events report how each call was evaluated in an `evaluation` field alongside `evaluated_permission`. See [Let the server evaluate each call with `auto`](https://platform.claude.com/docs/en/managed-agents/permission-policies#let-the-server-evaluate-each-call-with-auto).
+ * The `ant` CLI adds `ant beta:sessions connect`, which attaches your terminal to a Claude Managed Agents session. You can follow the session live, send messages, and allow or deny tool calls that are waiting for approval. Pass `--web` to serve the Claude Console's session viewer locally and open the session there instead. See [Connect to a Managed Agents session from your terminal](https://platform.claude.com/docs/en/cli-sdks-libraries/cli/sessions-connect).
+ * [Per-message effort](https://platform.claude.com/docs/en/build-with-claude/effort#change-effort-mid-conversation-beta) changes, in beta, are also available on [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai) for Claude Fable 5.1, Claude Mythos 5.1, and Claude Opus 5, with the same `mid-conversation-output-config-2026-07-01` beta header.
```

### anthropic.platform.token-counting

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/build-with-claude/token-counting
- Change: changed
- Prior hash: b409c3a73340bc01db6373c959b3c889bb4c0d5f5482c424fdfed268cbe5f030
- Current hash: a7a38319017145fd50911f54cc471c9ee6b96ce6fcfc72e568f6a8546e8e29ee

```diff
- [Server tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools) token counts only apply to the first sampling call.
- Token counting supports PDFs with the same [PDF support limitations](https://platform.claude.com/docs/en/build-with-claude/pdf-support#pdf-support-limitations) as the Messages API.
+ This endpoint returns an `invalid_request_error` for a few inputs that the Messages API accepts: [server tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools) such as web search, web fetch, code execution, and tool search (every server tool except the [advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool)), the [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector), and `image` or `document` blocks with a `url` or `file` source. Send images and PDFs as base64 to count them. For requests that use server tools or MCP servers, the Messages API response reports the tokens used in its `usage` object.
+ Token counting supports client tools and the [advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool). Requests that include other [server tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools) return an error. For the advisor tool, the count covers the executor's first sampling call only.
+ Token counting supports base64-encoded PDFs with the same [PDF requirements](https://platform.claude.com/docs/en/build-with-claude/pdf-support#check-pdf-requirements) as the Messages API. This endpoint doesn't support `url` or `file` document sources.
```

### apify.api.v2

- Vendor: Apify
- Source: https://docs.apify.com/api/v2
- Change: changed
- Prior hash: 949c500125ab16a908dc1948db9327d3f019a0f895c0ddfaf429402233e1d770
- Current hash: 6059d957d966b2f79c8be749cc23ecac9dd3ace865584d07d695d655ecebdac4

```diff
- Version: v2-2026-09-02T154542Z
+ Version: v2-2026-09-10T091137Z
```

### exa.docs.index

- Vendor: Exa
- Source: https://exa.ai/docs/llms.txt
- Change: changed
- Prior hash: a60fc40b1adbc761c928a7f484208dca1a9cd9723fa58781c0ab783e862abd0d
- Current hash: b7bd460322a1d5bdd3bad7e422224bf9b11cabfbe587594a6102979d10d727b0

```diff
- - [Get a Webset](https://exa.ai/docs/websets/api/websets/get-a-webset.md)
- - [Update a Webset](https://exa.ai/docs/websets/api/websets/update-a-webset.md)
- - [Get an Enrichment](https://exa.ai/docs/websets/api/websets/enrichments/get-an-enrichment.md)
- - [Create a Webhook](https://exa.ai/docs/websets/api/webhooks/create-a-webhook.md)
- - [Get a Webhook](https://exa.ai/docs/websets/api/webhooks/get-a-webhook.md)
- - [Update a Webhook](https://exa.ai/docs/websets/api/webhooks/update-a-webhook.md)
- - [Delete a Webhook](https://exa.ai/docs/websets/api/webhooks/delete-a-webhook.md)
- - [List webhooks](https://exa.ai/docs/websets/api/webhooks/list-webhooks.md)
+ - [Get a Webset](https://exa.ai/docs/websets/api/websets/get-a-webset.md): Returns a Webset by `id` or `externalId`, including its status, searches, imports, enrichments, and monitors.
+ - [Update a Webset](https://exa.ai/docs/websets/api/websets/update-a-webset.md): Updates the `title` or `metadata` of a Webset. Searches, imports, and enrichments are managed through their own endpoints.
+ - [Get an Enrichment](https://exa.ai/docs/websets/api/websets/enrichments/get-an-enrichment.md): Returns an Enrichment configured on a Webset, including its status, description, format, and options.
+ - [Create a Webhook](https://exa.ai/docs/websets/api/webhooks/create-a-webhook.md): Creates a Webhook that delivers the selected events to your URL as they occur.
+ - [Get a Webhook](https://exa.ai/docs/websets/api/webhooks/get-a-webhook.md): Returns a Webhook by id, including its status, subscribed events, target URL, and metadata. The signing `secret` is not returned.
+ - [Update a Webhook](https://exa.ai/docs/websets/api/webhooks/update-a-webhook.md): Updates the target URL, subscribed events, or metadata of a Webhook. Omitted fields are left unchanged.
+ - [Delete a Webhook](https://exa.ai/docs/websets/api/webhooks/delete-a-webhook.md): Deletes a Webhook. Its status becomes `inactive`, which stops future webhook deliveries to its URL.
+ - [List webhooks](https://exa.ai/docs/websets/api/webhooks/list-webhooks.md): Returns the active Webhooks for your team.
```

### exa.docs.search

- Vendor: Exa
- Source: https://exa.ai/docs/reference/search
- Change: changed
- Prior hash: 68bb3178990f619909564908c08ea73d474b8c9dcbca7572e9d393abaf650a4f
- Current hash: ae6b1d5e9546c3c03ced3b7cfcf43ac069183f80a2f0a11920932bfc2040f3b4

```diff
- A list of search results containing title, URL, published date,
- and author.
- Deprecated legacy field. Current production responses may return
- an empty string; clients should not branch on this value.
- A list of search results containing title, URL, published date,
- and author.
- Deprecated legacy field. Current production responses may return
- an empty string; clients should not branch on this value.
- Estimated website traffic rank within the
- company's primary country.
- Estimated monthly visits for this
- period.
- Start month for this value, formatted as
- YYYY-MM.
- End month for this value, formatted as
- YYYY-MM.
- Resolved publication entity identifier,
- when available.
- Number of works produced at the
- Number of citations for works produced
- at the organization.
- Resolved publication entity identifier,
- when available.
- Number of works citing this publication (incoming
- references).
- Resolved person entity identifier, when
- Number of works this publication cites (outgoing
- references).
- description: A rate limit was exceeded.
+ '503':
+ $ref: '#/components/responses/ServiceUnavailableResponse'
+ - $ref: '#/components/schemas/OutputSchemaText'
+ - $ref: '#/components/schemas/OutputSchemaObject'
+ discriminator:
+ propertyName: type
+ mapping:
+ $ref: '#/components/schemas/OutputSchemaText'
+ object:
+ $ref: '#/components/schemas/OutputSchemaObject'
+ - $ref: '#/components/schemas/SearchSynthesisResponse'
+ - $ref: '#/components/schemas/SearchResultsResponse'
+ - $ref: '#/components/schemas/SearchStreamTextDeltaChunkOutput'
+ - $ref: '#/components/schemas/SearchStreamGroundingChunkOutput'
+ - $ref: '#/components/schemas/SearchStreamResultsChunkOutput'
+ - $ref: '#/components/schemas/SearchStreamResetChunkOutput'
+ - $ref: '#/components/schemas/SearchStreamDoneChunkOutput'
+ - $ref: '#/components/schemas/SearchStreamErrorChunkOutput'
+ discriminator:
+ propertyName: type
+ mapping:
+ text-delta:
+ $ref: '#/components/schemas/SearchStreamTextDeltaChunkOutput'
+ $ref: '#/components/schemas/SearchStreamGroundingChunkOutput'
+ $ref: '#/components/schemas/SearchStreamResultsChunkOutput'
+ stream-reset:
+ $ref: '#/components/schemas/SearchStreamResetChunkOutput'
+ done:
+ $ref: '#/components/schemas/SearchStreamDoneChunkOutput'
+ $ref: '#/components/schemas/SearchStreamErrorChunkOutput'
+ OutputSchemaText:
+ OutputSchemaObject:
+ SearchSynthesisResponse:
+ A list of search results containing title, URL, published date, and
+ author.
+ Deprecated legacy field. Current production responses may return an
+ empty string; clients should not branch on this value.
+ SearchResultsResponse:
+ A list of search results containing title, URL, published date, and
+ author.
… diff truncated (81 added / 29 removed lines)
```

### firecrawl.docs.index

- Vendor: Firecrawl
- Source: https://docs.firecrawl.dev/llms.txt
- Change: changed
- Prior hash: 0ee47209638ef3a11ce3e9bd0c4ddeb30f2ce97fe507d288618f19dec5c39bea
- Current hash: 0b9c074760f7e230feefb337e2fc3df3a4e0be58d5632f0f8666700cea2d71a8

```diff
- - [v2 (165 pages)](https://docs.firecrawl.dev/_llms/en/v2.md): Documentation for v2.
- - [English / v2 (165 pages)](https://docs.firecrawl.dev/_llms/en/v2.md): Documentation for English / v2.
- - [Spanish (165 pages)](https://docs.firecrawl.dev/_llms/es.md): Documentation for Spanish.
- - [Spanish / v2 (165 pages)](https://docs.firecrawl.dev/_llms/es/v2.md): Documentation for Spanish / v2.
- - [French (165 pages)](https://docs.firecrawl.dev/_llms/fr.md): Documentation for French.
- - [French / v2 (165 pages)](https://docs.firecrawl.dev/_llms/fr/v2.md): Documentation for French / v2.
- - [Japanese (165 pages)](https://docs.firecrawl.dev/_llms/ja.md): Documentation for Japanese.
- - [Japanese / v2 (165 pages)](https://docs.firecrawl.dev/_llms/ja/v2.md): Documentation for Japanese / v2.
- - [Brazilian Portuguese (165 pages)](https://docs.firecrawl.dev/_llms/pt-br.md): Documentation for Brazilian Portuguese.
- - [Brazilian Portuguese / v2 (165 pages)](https://docs.firecrawl.dev/_llms/pt-br/v2.md): Documentation for Brazilian Portuguese / v2.
- - [Chinese (165 pages)](https://docs.firecrawl.dev/_llms/zh.md): Documentation for Chinese.
- - [Chinese / v2 (165 pages)](https://docs.firecrawl.dev/_llms/zh/v2.md): Documentation for Chinese / v2.
+ - [v2 (203 pages)](https://docs.firecrawl.dev/_llms/en/v2.md): Documentation for v2.
+ ## v1
+ ### Documentation
+ #### Get Started
+ - [Introduction](https://docs.firecrawl.dev/introduction.md): Search the web, scrape any page, and interact with it, all through one API.
+ - [Get Started](https://docs.firecrawl.dev/mcp-server.md): Set up Firecrawl MCP with keyless access, account sign-in, or an API key.
+ - [Advanced Scraping Guide](https://docs.firecrawl.dev/advanced-scraping-guide.md): Configure scrape options, browser actions, crawl, map, and the agent endpoint with Firecrawl's full API surface.
+ ##### Plans and Billing
+ - [Billing](https://docs.firecrawl.dev/billing.md): How Firecrawl billing, credits, and plans work
+ - [Rate Limits](https://docs.firecrawl.dev/rate-limits.md): Rate limits for different pricing plans and API requests
+ - [Partner Credits](https://docs.firecrawl.dev/partner-credits.md): How Firecrawl partner credits work, including eligibility, expiration, and plan limits
+ ##### Enterprise
+ - [Enterprise](https://docs.firecrawl.dev/enterprise.md): Enterprise plans, security, and features for Firecrawl at scale
+ - [IP Restrictions](https://docs.firecrawl.dev/features/ip-restrictions.md): Restrict your team's API keys to an allowlist of IP addresses or CIDR ranges, so they only work from approved networks. Enforced server-side.
+ - [Key Restrictions](https://docs.firecrawl.dev/features/key-restrictions.md): Lock an individual API key to specific output formats and endpoints. Enforced server-side, with no way for a request to override it.
+ - [Threat Protection](https://docs.firecrawl.dev/features/threat-protection.md): Block requests to risky URLs across every endpoint, using a policy your organization controls. Enforced server-side.
+ - [SIEM Audit Logging](https://docs.firecrawl.dev/features/siem.md): Stream a structured audit event for every scrape your team runs to your own SIEM, starting with Microsoft Sentinel. Delivered server-side.
+ #### Standard Features
+ - [Crawl](https://docs.firecrawl.dev/features/crawl.md): Recursively crawl a website and get content from every page
+ - [Map](https://docs.firecrawl.dev/features/map.md): Input a website and get all the urls on the website - extremely fast
+ - [Search](https://docs.firecrawl.dev/features/search.md): Search the web and get full content from results
+ ##### Scrape
+ - [Scrape](https://docs.firecrawl.dev/features/scrape.md): Turn any url into clean data
+ - [Faster Scraping](https://docs.firecrawl.dev/features/fast-scraping.md): Speed up your scrapes by 500% with the maxAge parameter
+ - [Batch Scrape](https://docs.firecrawl.dev/features/batch-scrape.md): Scrape multiple URLs in a single batch job
+ - [JSON mode - Structured result](https://docs.firecrawl.dev/features/llm-extract.md): Extract structured data from pages via LLMs
+ - [Change Tracking](https://docs.firecrawl.dev/features/change-tracking.md): Detect and monitor changes in web content between scrapes
+ - [Enhanced Mode](https://docs.firecrawl.dev/features/enhanced-mode.md): Use enhanced proxies for reliable scraping on complex sites
+ - [Proxies](https://docs.firecrawl.dev/features/proxies.md): Learn about proxy types, locations, and how Firecrawl selects proxies for your requests.
+ #### Agentic Features
+ - [FIRE-1 Agent (Beta)](https://docs.firecrawl.dev/agents/fire-1.md): AI agent that enables intelligent navigation and interaction with web pages
+ #### Webhooks
+ - [Overview](https://docs.firecrawl.dev/webhooks/overview.md): Real-time notifications for your Firecrawl operations
+ - [Event Types](https://docs.firecrawl.dev/webhooks/events.md): Webhook event reference
+ - [Security](https://docs.firecrawl.dev/webhooks/security.md): Verify webhook authenticity
+ - [Testing](https://docs.firecrawl.dev/webhooks/testing.md): Test and debug webhooks
+ #### Dashboard
+ - [Overview](https://docs.firecrawl.dev/dashboard.md): Overview of the Firecrawl dashboard and its key features
+ ### SDKs
+ #### Overall
```

### firecrawl.product.changelog

- Vendor: Firecrawl
- Source: https://www.firecrawl.dev/changelog
- Change: changed
- Prior hash: 946304cbdfd0615a50a7c5467e041c0fa5c1252d898b051df119455a93d03e40
- Current hash: dd4dc09ca7ff7e0c27c307e97d2c846ca0bf7c06b34e96c17a42325d87600b50

```diff
- 176.8K Sign up
- Session Management - Configurable TTL controls, parallel sessions (up to 20 concurrent), and automatic cleanup. 2 credits per browser minute with 5 minutes free.
+ 179.5K Sign up
+ Session Management - Configurable TTL controls, parallel sessions (up to 20 concurrent), and automatic cleanup. 2 credits per browser minute.
```

### hermes.docs.cli-commands

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/reference/cli-commands
- Change: changed
- Prior hash: e94d8ac78be7d44b7e8620e9ecdb58b28d4caa7d74744ff602769142b9c5066a
- Current hash: 6fcc59e236d51017dd126d5738132af8c92006cd8db45308d9f6525b1c83c4dd

```diff
- Subcommands: add , list , remove , reset , status , logout , spotify . When called with no subcommand, launches the interactive management wizard.
- install <identifier> [--force] [--ref COMMIT_SHA]
- Install a plugin from a Git URL, owner/repo , or a bare index name. Bare names (no slash) are resolved through the community plugin index to owner/repo plus the index-pinned commit; ambiguous names list candidates and exit. --ref accepts only a full 40-character commit SHA, installs that exact immutable revision, and overrides any index pin.
- search [term] [--json] [--capability CAP] [--refresh]
- Search the community plugin index (fuzzy match on name/description/tags; omit term to browse). Fetched from plugins.index_url (default: the NousResearch plugin index), cached under ~/.hermes/cache/ for 24h, falling back to the stale cache and then the bundled seed when offline. Indexed ≠ audited — inclusion is a metadata review only.
- Directly imported: SOUL.md, MEMORY.md, USER.md, AGENTS.md, skills (4 source directories), default model, custom providers, MCP servers, messaging platform tokens and allowlists (Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost), agent defaults (reasoning effort, compression, human delay, timezone, sandbox), session reset policies, approval rules, TTS config, browser settings, tool settings, exec timeout, command allowlist, gateway config, and API keys from 3 sources.
- Create a new profile. --clone copies config, .env , SOUL.md , and skills from the active profile. --clone-all copies all state. --clone-from specifies a source profile and implies config clone unless paired with --clone-all .
+ Delegation in finite chat runs ​
+ When chat answers and exits ( -Q , chat --oneshot , or a query with non-TTY
+ stdio), delegate_task waits for its children and returns their results to the
+ parent in the same turn. Batch children still run in parallel, subject to
+ delegation.max_concurrent_children . The parent can use those results in its
+ final response before the CLI exits.
+ Automatic joining: no opt-in or background-mode override is needed.
+ Interactive TTY chat and messaging sessions keep background delegation.
+ Existing safeguards: delegation limits, timeouts, cancellation, and
+ approvals.single_query_mode still apply. Joining does not auto-approve commands
+ or guarantee successful child outcomes. Inspect results and verify artifacts.
+ Terminal completions: this does not change background terminal notification
+ behavior or the bounded terminal.oneshot_completion_wait_seconds exit wait.
+ That setting is not a delegation timeout.
+ Delegation remains process-local. Interrupting or terminating the parent can
+ cancel unfinished children. Use a durable scheduler for work that must survive
+ the initiating process.
+ Move per-profile standalone gateways onto one multiplexed default gateway ( --multiplex , the default) or roll back from the recorded manifest ( --standalone ). Runs a preflight (duplicate bot tokens, secondary port-binders without a /p/<profile>/ ingress) and changes nothing when blocked. Flags: --dry-run , -y / --yes . See Migrating from per-profile gateways .
+ hermes auth add openai-codex --type oauth --priority 0 # Add an account and try it first
+ hermes auth priority openrouter backup-key 0 # Move a credential to the front of fill_first order
+ hermes auth reset openrouter 2 # Clear the cooldown on one credential
+ hermes auth refresh openai-codex work # Refresh one OAuth credential and clear its cooldown
+ Subcommands: add , list , remove , reset , priority , refresh , status , logout , spotify . When called with no subcommand, launches the interactive management wizard.
+ -k , --keep <N>
+ After a full backup, delete older hermes-backup-*.zip files in the output directory beyond the newest N (default 3; 0 keeps everything). Custom-named zips are never touched.
+ models/ , runtimes/ , node/ at the root of ~/.hermes (and of each profiles/<name>/ ) — regenerable runtime downloads, often tens of GB. Deeper directories with the same names (a skill's models/ ) are kept.
+ Regenerable entries of cache/ at those same roots — model/plugin catalogs, stamps, browser profiles, tool-output spill. Durable artifacts stay in: cache/images , cache/audio , cache/videos , cache/documents , cache/screenshots (media delivered to or received from you) and cache/citations (the grounded-citations ledger). A deeper cache/ (inside a skill) is kept whole.
+ Unix sockets, devices, and symlinks — a zip cannot hold them; before they were excluded, a stray gateway.sock made every full backup report Backup incomplete .
+ install <identifier> [--force] [--ref COMMIT_SHA] [--allow-removed]
+ Install a plugin from the Hermes plugin catalog (bare entry name), a Git URL, or owner/repo shorthand. Catalog names resolve to the entry's repo at its pinned 40-hex commit SHA, show the declared capability summary, and record catalog provenance in a .hermes-catalog.json sidecar. Raw URLs are flagged as custom (unreviewed) sources; --ref (full 40-character commit SHA) pins them. --allow-removed (DANGEROUS) bypasses the removed-plugin blocklist.
+ search [term] [--json]
+ Search the Hermes plugin catalog (matches entry names, descriptions, and declared tools; omit term to list everything). The catalog is curated in-repo ( plugin-catalog/ ), refreshed from the live repo with a 6-hour cache, and falls back to the in-tree copy offline. Cataloged ≠ audited — admission reviews the entry, not the code.
+ Directly imported: SOUL.md, MEMORY.md, USER.md, AGENTS.md, skills (4 source directories), default model, custom providers, MCP servers, messaging platform tokens and allowlists (Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost), agent defaults (reasoning effort, compression, human delay, timezone, sandbox), approval rules, TTS config, browser settings, tool settings, exec timeout, command allowlist, gateway config, and API keys from 3 sources.
+ Create a new profile. --clone copies config, .env , SOUL.md , skills, and the curated MEMORY.md / USER.md memory files from the active profile. --clone-all copies all state. --clone-from specifies a source profile and implies config clone unless paired with --clone-all .
```

### hermes.docs.fallback-providers

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
- Change: changed
- Prior hash: cc2cf1c9050b24954fa57dfed00a53cad4cb4c643586417a3205c019427b1593
- Current hash: 7f248b0215f8ba090127a67882d7d7c2ec25261288cae5171daf4705dfc64f2f

```diff
- Resolves credentials for the fallback provider
- Builds a new API client
- The per-turn retry is reset-aware : when the primary's credentials report a rate-limit reset time that hasn't elapsed yet (subscription windows like Claude Pro/Max's 5-hour blocks or Codex weekly limits report these as hours or days), Hermes skips the doomed retry and stays on the fallback until the reset passes — avoiding two pointless provider switches (and two prompt-cache invalidations) per turn. The moment the reset time elapses, the next turn goes back to the primary automatically. Transient 429s without a reset time keep the existing behavior: a short cooldown, then retry every turn.
- ✔ (subagents inherit the parent fallback chain)
- When a task's provider is set to "auto" (the default), Hermes first tries the main provider + main model for that auxiliary task. If that route is unavailable or later fails with a capacity-style error, Hermes now honors user-configured fallback policy before using the built-in discovery chain:
- fallback_providers / fallback_model → built-in auxiliary discovery chain
- Those built-in chains are a convenience fallback for users who have not declared a task-specific or main fallback policy.
- Every task above follows the same provider / model / base_url pattern. Each task can also declare its own fallback_chain ; if omitted, provider: auto uses the top-level fallback_providers chain before Hermes' built-in auxiliary discovery chain.
- Inherits the parent's fallback_providers chain; optional provider/model override
- delegation.provider / delegation.model
+ Gemini fallback entries accept gemini , google , google-gemini , and
+ google-ai-studio . On Google's native API endpoint, all use the native Gemini
+ client, including its generationConfig.thinkingConfig translation. A custom
+ OpenAI-compatible base URL continues to use the compatible client instead.
+ Resolves credentials for the fallback provider (including named custom providers using key_cmd )
+ Builds a new API client, preserving a dynamic credential source across timeout and request-client rebuilds
+ The per-turn retry is reset-aware : when the primary's credentials report a rate-limit reset time that hasn't elapsed yet (subscription windows like Claude Pro/Max's 5-hour blocks or Codex weekly limits report these as hours or days), Hermes skips the doomed retry and stays on the fallback until the reset passes — avoiding two pointless provider switches (and two prompt-cache invalidations) per turn. Expiry makes the primary eligible for a later retry; it does not schedule a retry or guarantee recovery. Transient 429s without a reset time use an exponential cooldown.
+ When a switch arms that cooldown, the fallback notice includes its approximate remaining duration, for example: Primary retry eligible in ~60 s; recovery is not guaranteed. Non-rate-limit switches and switches from an already-active cross-provider fallback do not announce a new primary cooldown.
+ ✔ ( delegation.fallback_providers when set; otherwise only unpinned children inherit the parent chain; [] disables)
+ When a task's provider is set to "auto" (the default), Hermes first tries the main provider + main model for that auxiliary task. If that route is unavailable or later fails with a capacity-style error, Hermes follows your configured fallback policy and then stops:
+ fallback_providers / fallback_model → skip the task (warn)
+ A billing or quota failure quarantines only the failed custom endpoint for the auxiliary health cooldown, not every route registered as custom . A healthy local endpoint with a different base URL remains eligible for fallback and subsequent auto routing. Aliases for the same custom endpoint share its health state. Built-in providers retain their shared-account health checks.
+ Those built-in chains run only when no main provider is selected ( model.provider: auto or unset). Once you have picked a main provider, an unavailable main route with no fallback_chain / fallback_providers skips the auxiliary task with a warning instead of guessing another provider you happen to be logged into — an expired xAI or Codex session must never bill your Nous Portal or OpenRouter balance behind your back. Declare a fallback if you want one.
+ Every task above follows the same provider / model / base_url pattern. Each task can also declare its own fallback_chain ; if omitted, provider: auto uses the top-level fallback_providers chain (the built-in discovery chain applies only when no main provider is selected).
+ Uses delegation.fallback_providers when declared; otherwise only unpinned children inherit the parent chain
+ delegation.provider / delegation.model / delegation.fallback_providers
```

### hermes.docs.mixture-of-agents

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/mixture-of-agents
- Change: changed
- Prior hash: a0698e3a7f71ca04d183baedfed8631261356d18be8375764503e4f89d816bc8
- Current hash: 7993de6adbe7ccbb3b688f009016ecf78bac5868393533a6e6bf0c66de082a3a

```diff
- max_tokens : 4096
- Tuning advisor speed with reference_max_tokens ​
- Each turn, MoA runs the reference models (advisors) in parallel and then the
- aggregator acts. Advisor generation is the dominant per-turn latency — turn
- wall time correlates strongly with how many tokens the advisors emit, because
- the turn waits for the slowest advisor to finish writing. By default advisors
- are uncapped ( reference_max_tokens unset), so they may write long,
- essay-length advice.
- Set reference_max_tokens on a preset to cap advisor output and give concise
- advice instead. The aggregator only needs the gist of each advisor's
- judgement, so a cap (e.g. 600 ) measurably cuts per-turn wall time with little
- quality impact. It caps advisors only — the acting aggregator's output (the
- user-visible answer) is never capped.
- fast :
- reference_max_tokens : 600 # concise advice → faster turns
- Leave it unset (or 0 /blank) to keep the prior uncapped behavior.
- Configure presets Tuning advisor speed with reference_max_tokens
+ Advisor output ​
+ MoA uses provider-owned output limits. Preset and per-slot output-token cap
+ settings are no longer supported. Provider defaults vary; omission does not
+ always mean the model maximum. Native protocols that require an output limit
+ receive an internal value from Hermes.
+ Configure presets Advisor output
```

### hermes.github.releases

- Vendor: Hermes
- Source: https://github.com/NousResearch/hermes-agent/releases
- Change: changed
- Prior hash: 590f469580856ae86715b7e55377ff0ac6d7b84853e782ce1f29ffd941f30a2e
- Current hash: b3e86efb782c295395e5c2f37278a73d0667ad672bac5224cff47e0be77fed7b

```diff
- 49.7k
- 242k
- Hermes Agent v0.19.1 (v2026.7.30)
- Hermes Agent v0.19.0 (2026.7.20) — The Quicksilver Release
- 112 people reacted
- 84 people reacted
- 68 people reacted
- 42 people reacted
- 54 people reacted
- Hermes Agent v0.19.1 (v2026.7.30)
- Hermes Agent v0.19.1 (v2026.7.30)
- 30 Jul 23:45
- v2026.7.30
- cc4cab2
- Hermes Agent v0.19.1 (v2026.7.30)
- Release Date: July 30, 2026
- Patch release. This tag rolls up the ~1,000+ PRs merged since v0.19.0 into a stable tagged release for downstream consumers (Docker images, hosted deployments, fresh installs).
- Since v2026.7.20 (v0.19.0, July 20): ~2,789 commits · ~4,748 files changed · ~442,000 insertions · ~392,300 deletions on main . This window is dominated by bug-fix and salvage waves across the gateway, voice subsystem, desktop app, and installer, plus continued platform work (Buzz/Nostr channel, FLUX3 video generation and delivery, Telegram media reliability, voice-mode regressions).
- Full curated release notes for this window will ship with v0.20.0 , which will document everything from v0.19.0 onward — highlights, feature areas, and complete contributor credits. Nothing in this window is skipped.
- hermes update
- # or fresh install:
- curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
- Full Changelog : v2026.7.20...v2026.7.30
- 101 people reacted
- Hermes Agent v0.19.0 (2026.7.20) — The Quicksilver Release
- Hermes Agent v0.19.0 (2026.7.20) — The Quicksilver Release
- 20 Jul 18:35
- v2026.7.20
- 3ef6bbd
- This commit was created on GitHub.com and signed with GitHub’s verified signature .
- GPG key ID: B5690EEEBB952194
- Hermes Agent v0.19.0 (v2026.7.20)
- Release Date: July 20, 2026
- Since v0.18.0: ~2,245 commits · ~1,065 merged PRs · ~2,465 files changed · ~300,000 insertions · ~36,000 deletions · ~3,300 issues closed · 450+ community contributors
- The Quicksilver Release. Hermes is the messenger god, and this window we made him move like it. First-turn time-to-first-token dropped ~80% on every platform , reasoning streams live by default, the desktop app got a ~20-PR speed overhaul (14× faster streaming markdown, virtualized diffs, snappy session switching), and the TUI renders markdown incrementally. Around that speed spine: you can now manage your Nous subscription without leaving the terminal , plug Bitwarden and 1Password straight into Hermes, let smart approvals judge flagged commands for you by default, watch your subagents work live , and trust that a finished response survives a gateway crash thanks to a durable delivery ledger. This release also rolls up everything from the v0.18.1 and v0.18.2 infrastructure patch tags — those windows are fully documented here.
- Hermes got dramatically faster — first token in a fraction of the time — Cold-start "Initializing agent..." used to eat ~4.3 seconds before your first turn even reached the model; it's now ~0.9s, an ~80% cut that applies to the CLI, gateway, TUI, desktop, and cron alike. Round 2 attacked what you see while waiting: reasoning models now stream their thinking live by default (no more staring at a spinner for 30 seconds), and the response box paints per token instead of per line. If Hermes ever felt like it took a deep breath before answering, that breath is gone. ( #59332 , #59389 — @teknium1 )
- The desktop app speed wave — 20+ targeted perf PRs — Long replies used to cost 14× more CPU in the markdown splitter than they do now; giant diffs froze the review pane until we virtualized it; switching sessions thrashes layout no more. Streaming no longer re-renders the sidebar and every tool row per token, profile backends pre-warm on hover intent, and boot-hidden panes mount at idle instead of on the cold-start critical path. The net effect: the desktop app feels like a native app under load, even with huge transcripts and busy agents. ( #67154 , #67818 , #65898 , #66033 , #66747 , #67742 and more — @OutThisLife )
- Manage your Nous plan from the terminal — /subscription and /topup — Changing your subscription used to mean a trip to the billing website. Now /subscription opens a full flow right in the TUI or classic CLI: see your plan and remaining allowance, preview exactly what an upgrade costs ("Pay $46.30 & upgrade now") or when a downgrade takes effect, and apply it — with scheduled-change banners and undo. The desktop app got a matching billing settings tab. Your wallet never has to leave the keyboard. ( #51639 , #61054 , #61067 — @alt-glitch )
- Smart approvals are now the default — When Hermes wants to run a flagged command, an LLM reviewer now assesses it independently instead of asking you to approve every single one — and each verdict covers only that exact command, so a later command matching the same pattern gets its own review. Combined with the new user-defined deny rules (which block commands even under yolo mode) and /deny <reason> (which tells the agent why you refused so it course-corrects), day-to-day approval fatigue drops sharply without giving up control. ( #62661 , #59164 , #54518 — @teknium1 )
- Plug your password manager into Hermes — Bitwarden & 1Password secret sources — API keys no longer have to live in a plaintext .env . A new pluggable SecretSource interface lets Hermes fetch secrets from Bitwarden and 1Password ( op:// references) at load time, with multiple vaults enabled simultaneously, deterministic precedence, conflict warnings, and per-variable provenance. This consolidated eleven competing community PRs into one orchestrated interface — future vault providers drop in as plugins. ( #59498 — @teknium1 , 1Password provider salvaged from @hwrdprkns )
+ 50.8k
+ 245k
+ Hermes Agent v0.21.2 (v2026.9.11)
+ Hermes Agent v0.21.1 (v2026.9.7)
+ Hermes Agent v0.21.2 (v2026.9.11)
+ Hermes Agent v0.21.2 (v2026.9.11)
+ 11 Sep 19:20
+ v2026.9.11
+ 939e45c
+ Hermes Agent v0.21.2 (v2026.9.11) — The state.db Patch Release
+ Release Date: September 11, 2026
+ Patch release. v0.21.0 shipped a large rewrite of the session store's connection handling, and for some installs it made state.db fragile: second writers cancelling each other's locks, healthy databases reported as corrupt, one bad row killing sessions list . This release closes that class and rolls up everything else that landed on main in the four days since v0.21.1.
+ Measured at commit 04dd80a977f40b05e5b2054111747af07a61886a , the window since v0.21.1 contains 947 non-merge commits across 1,869 changed files (+182,504 / −15,564) and 312 merged PRs . 140 contributors appear in commits, co-author trailers, or salvage credits.
+ state.db reliability campaign (six PRs, 44 issues closed)
+ If your state.db broke after 0.21.0, this is the release for you. Six PRs fix the root causes rather than the symptoms:
+ No more second writers. Profile gateways wrote hosted-room state into the root state.db every 5 seconds; the dashboard opened a writable handle on startup; cron's lifecycle guard did a raw open() on a live database (which cancels the gateway's POSIX locks — the classic "how to corrupt SQLite" recipe); doctor --fix would checkpoint under a live holder. All four are gone: hosted rooms live in shared-state.db , the dashboard opens read-only first, the guard goes through the tracked connection registry, and doctor --fix refuses a checkpoint it can't prove is safe. ( #108076 — salvage #103489 @RikETS , #102682 @JoaoMarcos44 , #108012 @Halldrix , #105428 @TaoMasterCoder )
+ Healthy WAL databases stop wedging. OpenZFS (deleted) dentries and a close() racing an append_message both produced a sticky DeletedWalGenerationError on a perfectly good store; the read pool was handed out under an unconfirmed journal mode; a transient disk I/O error on WSL2 killed get_session on the first attempt; and a "state.db locked" banner was broadcast after the lock had already cleared. ( #108082 — salvage #107411 @chelsealong , #105578 @ca-shrimp , #105711 @gaoanze888 , #106958 @nikkoxgonzales ; co-authored @QDung210 , @fangliquanflq , @Sahilvishnaliya )
+ FTS damage no longer kills your turn. An error scoped to the full-text-search index was classified as whole-file corruption and fail-closed the conversation. It's now fts_index : search degrades, the index rebuilds later, the transcript store is untouched. Same PR: doctor names structural damage honestly instead of "FTS write corruption", the FTS write probe catches the stale-index shape that passed every check while every write failed, .recover output no longer fails startup on orphan FTS5 shadow tables, header-zeroed databases recover instead of being refused, and the dashboard analytics poller returns a 503 instead of 520K tracebacks a day. ( #108130 — salvage #97843 @SulthanZahran1 + #97841 @Finn763 , #88604 #56824 #103657 @liuhao1024 , #106890 @nftpoetrist , #103321 @jangomango76 , #91413 @leegunwoo98 , #102808 @TaoMasterCoder )
+ One corrupt row no longer kills sessions list , export, or insights. A TEXT timestamp or a 1e30 epoch used to crash the whole listing; malformed marker JSON crashed json_extract ; more than 999 ids crashed bulk delete/prune. One coerce_epoch() helper on every reader (bad rows render ? with a WARNING naming the session), a json_valid guard, IN-list chunking, and batched export hydration. ( #108086 — salvage #106071 @Xipong , #101726 @efe-arv , #94701 @liuhao1024 , #102679 @mssteuer , #100658 @Mi55ed )
+ Sessions never bind to or read another profile's database. The Desktop launch backend could pin itself to the wrong profile's state.db under a HERMES_HOME override race; session_search by bare ID silently scanned every profile and returned someone else's transcript; recovery guidance pointed at the wrong file; profile delete kept a handle open (WinError 32). ( #108074 — salvage #102534 @HexLab98 , #106975 @Sora-bluesky )
+ Opening state.db no longer takes the write lock when nothing needs writing. A one-shot hermes process opening the store behind a busy gateway stalled 4–20 s and then failed with "database is locked". Now 0.01 s. ( #108067 — salvage #106751 @kshitijk4poor , #101881 @jonpol01 )
+ Also in the window from the same subsystem: a fresh state.db no longer publishes FTS tables before owning the rebuild lock ( #106311 ), a handle that lost its WAL generation no longer checkpoints stale frames at shutdown ( #106315 , #106840 ), a clobbered first page is quarantined with its WAL instead of opened destructively ( #106587 ), WAL setup leaves an unverifiable database untouched ( #106568 ), and quarantined handles refuse VACUUM/FTS optimize ( #106343 , #106349 ). Most of these salvaged community diagnoses by @kshitijk4poor .
+ Multi-profile isolation hardening
+ A cluster of fixes for installs running several profiles under one gateway (multiplex): secondary-profile bots no longer inherit the default profile's allow-lists ( #107616 ), adapters no longer send credentials to the default profile's host ( #107617 ), stdio MCP servers no longer receive the default profile's vault secrets ( #107630 ), MEDIA: delivery can no longer attach another profile's .env / auth.json / state.db ( #107609 ), Feishu drive callbacks and /p/<profile>/ webhook replies stay on the routed profile ( #107620 , #107626 ), and secondary profiles no longer get a sibling's Nous bearer from per-process memos ( #107611 ).
+ Desktop backend spawn storms are over
+ Bot Mode used to spawn or dial one backend per profile on launch and on every roster tick, hovering the Bots roster spawned a backend per row, and profile switches could spawn a duplicate primary. ( #108069 , #108107 , #108118 , #108134 , #107969 , #108112 — salvage #102512 , #103634 , #103399 , #107997 and others by @kshitijk4poor )
+ Password-blind credential vault
+ The agent can now sign in, pay, and fill addresses from 1Password, Bitwarden, or the local Hermes vault without ever seeing a secret; two-factor codes come from a saved authenticator key or are asked for in the user's UI ( #106480 , #107585 ). Private git plugins install with the user's stored credentials ( #106981 ).
+ Plugin catalog and one Plugins page
+ A curated, SHA-pinned plugin index with CLI, admission CI, docs and dashboard ( #69446 ); Desktop gets one Plugins page owning agent + desktop plugins, install, catalog and per-commit pinning ( #107212 , #107314 , #107321 ); Radio ships as an opt-in SDK plugin ( #107072 ).
+ Nous free tier and guided first launch
+ Free inference and connectors out of the box with one command to sign in ( #105258 , #105260 ), /login from a chat ( #105261 ), connector tools (Gmail, Linear, Notion, ...) searchable through tool_search ( #106842 ), and a guided first launch behind HERMES_GUEST_ONBOARDING=1 ( #107697 , #107958 , #107985 , #108211 ).
+ 🐛 Notable Bug Fixes
+ Gateway & platforms
+ A bare display: key in config.yaml no longer crashes every gateway turn ( #106305 ); a queued-lane final refused by the platform is recorded and redelivered ( #106316 ); a stalled WebSocket send no longer blocks every later event ( #106581 ); the first turn no longer waits on the Python toolchain probe ( #106556 ).
+ Telegram bots must @mention when bots_require_mention is on, breaking bot-to-bot loops ( #106534 ); Matrix renders LaTeX ( #106515 ); Signal renders markdown tables ( #106538 ); WhatsApp replies to view-once messages keep their quote ( #106541 ); media-only replies report SUCCESS everywhere ( #106557 ).
+ Providers & routing
+ /model and auxiliary auto never bill a provider you didn't select ( #107366 ); never auto-switch to a provider you have no credentials for ( #107281 ); Bedrock Claude/Converse/Mantle models survive /model , fallback and restore ( #107621 , #107658 ); Bedrock Guardrails enforced ( #107815 ).
+ Codex: patch-budget image 400 shrinks and retries ( #106525 ); unentitled primary + fallback no longer oscillate ( #106549 ); Azure Foundry replayed-reasoning rejection classified and pruned ( #106718 @erosika ). MCP OAuth refresh no longer erases the refresh token ( #106185 ). Anthropic clients send exactly one credential ( #107978 ).
+ DeepSeek V4.1 Flash on Nous Portal and OpenRouter pickers ( #107489 ); GPT Image 2.5 via OpenAI and FAL ( #105988 ); Opus 5 / Fable 5.1 on the native Anthropic picker ( #106636 @xxxigm ).
… diff truncated (68 added / 50 removed lines)
```

### openai.api.changelog

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/changelog
- Change: changed
- Prior hash: 5bdc521726ff9dc7c3a2b1f5aca76cb13626f76ef5c56c4d029d7da314097e09
- Current hash: 80ea5dd446e387c7cb1f8fc413a8cd483a2198b3b54b5aba6bdb3c840a6f0961

```diff
- Updated the [Realtime and audio guide](https://developers.openai.com/api/docs/guides/realtime), added a dedicated [Realtime translation guide](https://developers.openai.com/api/docs/guides/realtime-translation), refreshed [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription) for streaming transcripts, and moved realtime prompting guidance into [Using realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting).
- Added dedicated SIP IP ranges for Realtime API. `sip.api.openai.com` does GeoIP routing, and will direct SIP traffic to the closest region. [Learn more](https://developers.openai.com/api/docs/guides/realtime-sip#dedicated-sip-ip-ranges).
+ ### Sep 10
+ You can now set expiration dates when creating project API keys. Administrators can also enforce a maximum key lifetime at the organization or project level in Platform settings, requiring newly created keys to expire within the configured limit. See [production best practices](https://developers.openai.com/api/docs/guides/production-best-practices#api-keys) for guidance on key expiration and rotation.
+ ### Sep 10
+ Released the [Agents API](https://developers.openai.com/api/docs/guides/agents-api/overview) in public beta. Build agents with a managed Codex harness while OpenAI handles session orchestration, context compaction, and recovery.
+ Use durable sessions to continue work across turns, stream progress, and connect your own tools and MCP servers. Run agents in OpenAI-hosted sandboxes or connect a sandbox from your own infrastructure or a supported provider.
+ Start with the [Agents API quickstart](https://developers.openai.com/api/docs/guides/agents-api/quickstart).
+ ### Sep 10
+ Feature · Model: gpt-live-1 · API: v1/live/sessions
+ [GPT-Live 1](https://developers.openai.com/api/docs/models/gpt-live-1) is now generally available in the API. Build full-duplex voice conversations that can continue while a backend model or agent handles reasoning and tools.
+ Use Responses delegation with an OpenAI model, or client delegation to connect your own backend. Voice sessions cost $0.05 per minute, billed per second; backend model and tool usage is charged separately.
+ Start with [GPT-Live](https://developers.openai.com/api/docs/guides/live), [prompting](https://developers.openai.com/api/docs/guides/live-prompting), and [migration guidance](https://developers.openai.com/api/docs/guides/live-migration). See [pricing](https://developers.openai.com/api/docs/pricing) for details.
+ ### Sep 8
+ [Prompt Cache Diagnostics](https://developers.openai.com/api/docs/guides/prompt-caching/diagnostics) is now generally available in the Responses API for GPT-5.6 and later supported models.
+ Compare cache reuse against a previous response, identify reasons for cache misses, and follow troubleshooting guidance to improve cache reuse.
+ ### Sep 8
+ Feature · Model: gpt-image-2.5-sunburst · Model: gpt-image-2.5-flare · API: v1/images · API: v1/responses
+ Released [GPT Image 2.5 Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst) and [GPT Image 2.5 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) for image generation and editing through the Image API and the Responses API image generation tool.
+ Use Sunburst for workflows where editing precision matters most, or Flare for fast, high-quality everyday image generation. Both models support the new `xhigh` and `max` quality settings and use GPT Image 2 token rates. See the [image generation guide](https://developers.openai.com/api/docs/guides/image-generation) and [pricing](https://developers.openai.com/api/docs/pricing#image-generation).
+ ### Sep 8
+ Feature · Model: gpt-rosalind-research
+ GPT-Rosalind (`gpt-rosalind-research`) is now generally available through the [trusted-access program](https://help.openai.com/en/articles/20001193-gpt-rosalind-for-life-sciences-research) for approved internal life sciences research.
+ Standard pricing is $5 per 1M input tokens, $0.50 per 1M cached input tokens, and $25 per 1M output tokens. Billing begins on October 5, 2026. See [pricing](https://developers.openai.com/api/docs/pricing) for details.
+ Updated the [Realtime and audio guide](https://developers.openai.com/api/docs/guides/realtime), added a dedicated [Realtime translation guide](https://developers.openai.com/api/docs/guides/realtime-translation), refreshed [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription) for streaming transcripts, and moved realtime prompting guidance into [Using realtime models](https://developers.openai.com/api/docs/guides/voice-prompting).
+ Added dedicated SIP IP ranges for Realtime API. `sip.api.openai.com` does GeoIP routing, and will direct SIP traffic to the closest region. [Learn more](https://developers.openai.com/api/docs/guides/voice-sip?voice-api=realtime#dedicated-sip-ip-ranges).
```

### openai.api.deprecations

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/deprecations
- Change: changed
- Prior hash: 66a6c1a91573dac1b611d8d0d9fb19356b61930bdbb4b67aa0eab73c904ef5b6
- Current hash: 8a961de0b26e70ce4ca542c2bdd027530f3336aba9bccf5d51bda427b6dff4c7

```diff
- ### 2026-05-08: gpt-5.2-chat-latest and gpt-5.3-chat-latest model snapshots
- ### 2025-11-18: chatgpt-4o-latest snapshot
- ### 2025-11-17: codex-mini-latest model snapshot
- There are a few key differences between the interfaces in the Realtime beta API and the released GA API. See [the migration guide](https://developers.openai.com/api/docs/guides/realtime#beta-to-ga-migration) for the current GA interface and related Realtime docs.
- ### 2025-09-15: gpt-4o-realtime-preview models
- In September, 2025, we notified developers using gpt-4o-realtime-preview models of their deprecation and removal from the API in six months.
- | ------------- | ---------------------------------- | ----------------------- |
- | 2026-05-07 | gpt-4o-realtime-preview | gpt-realtime-1.5 |
- | 2026-05-07 | gpt-4o-realtime-preview-2025-06-03 | gpt-realtime-1.5 |
- | 2026-05-07 | gpt-4o-realtime-preview-2024-12-17 | gpt-realtime-1.5 |
- | 2026-05-07 | gpt-4o-mini-realtime-preview | gpt-realtime-mini |
- | 2026-05-07 | gpt-4o-audio-preview | gpt-audio-1.5 |
- | 2026-05-07 | gpt-4o-mini-audio-preview | gpt-audio-mini |
- ### 2025-06-10: gpt-4o-realtime-preview-2024-10-01
- On June 10th, 2025, we notified developers using gpt-4o-realtime-preview-2024-10-01 of its deprecation and removal from the API in three months.
- | ------------- | ---------------------------------- | ----------------------- |
- | 2025-10-10 | gpt-4o-realtime-preview-2024-10-01 | gpt-realtime-1.5 |
- ### 2025-06-10: gpt-4o-audio-preview-2024-10-01
- ### 2025-04-28: text-moderation
- ### 2025-04-28: o1-preview and o1-mini
+ ### 2026-09-11: GPT-5.4-Cyber
+ The `gpt-5.4-cyber` model is deprecated and will be removed from the API on October 1, 2026. Migrate to `gpt-5.6-cyber` before the shutdown date.
+ | ------------- | --------------- | ----------------------- |
+ | Oct 1, 2026 | `gpt-5.4-cyber` | `gpt-5.6-cyber` |
+ ### 2026-05-08: `gpt-5.2-chat-latest` and `gpt-5.3-chat-latest` model snapshots
+ ### 2025-11-18: `chatgpt-4o-latest` snapshot
+ ### 2025-11-17: `codex-mini-latest` model snapshot
+ The interfaces in the Realtime beta API and the released GA API have a few key differences. See [the migration guide](https://developers.openai.com/api/docs/guides/realtime#beta-to-ga-migration) for the current GA interface and related Realtime docs.
+ ### 2025-09-15: `gpt-4o-realtime-preview` models
+ In September, 2025, we notified developers using `gpt-4o-realtime-preview` models of their deprecation and removal from the API in six months.
+ | ------------- | ------------------------------------ | ----------------------- |
+ | 2026-05-07 | `gpt-4o-realtime-preview` | `gpt-realtime-1.5` |
+ | 2026-05-07 | `gpt-4o-realtime-preview-2025-06-03` | `gpt-realtime-1.5` |
+ | 2026-05-07 | `gpt-4o-realtime-preview-2024-12-17` | `gpt-realtime-1.5` |
+ | 2026-05-07 | `gpt-4o-mini-realtime-preview` | `gpt-realtime-mini` |
+ | 2026-05-07 | `gpt-4o-audio-preview` | `gpt-audio-1.5` |
+ | 2026-05-07 | `gpt-4o-mini-audio-preview` | `gpt-audio-mini` |
+ ### 2025-06-10: `gpt-4o-realtime-preview-2024-10-01`
+ On June 10th, 2025, we notified developers using `gpt-4o-realtime-preview-2024-10-01` of its deprecation and removal from the API in three months.
+ | ------------- | ------------------------------------ | ----------------------- |
+ | 2025-10-10 | `gpt-4o-realtime-preview-2024-10-01` | `gpt-realtime-1.5` |
+ ### 2025-06-10: `gpt-4o-audio-preview-2024-10-01`
+ ### 2025-04-28: `text-moderation`
+ ### 2025-04-28: `o1-preview` and `o1-mini`
```

### openai.api.evals

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/guides/evals
- Change: changed
- Prior hash: fdf33e24dee8d7439dee7c30c7c9da3f0793ce8bf3402ab828cd69c0493b7ab5
- Current hash: 3b9fabdd76b6361bb74318c5f4937902c2717bddc17e56d71909738d2326d3d9

```diff
- {role: :developer, content: instructions},
- {role: :user, content: "My monitor won't turn on - help!"}
- data_source_config: {type: :custom, item_schema: {type: :object, properties: {input: {type: :string}}, required: ["input"]}},
- testing_criteria: [{type: :string_check, name: "mentions_refund", input: "{{sample.output_text}}", operation: :contains, reference: "refund"}]
- source: {type: :file_id, id: "YOUR_FILE_ID"},
- {role: :user, content: "{{ item.ticket_text }}"}
+ content: instructions
+ role: :user,
+ content: "My monitor won't turn on - help!"
+ type: :custom,
+ type: :object,
+ properties: { input: { type: :string } },
+ required: ["input"]
+ type: :string_check,
+ name: "mentions_refund",
+ input: "{{sample.output_text}}",
+ operation: :contains,
+ reference: "refund"
+ source: {
+ type: :file_id,
+ id: "YOUR_FILE_ID"
+ role: :user,
+ content: "{{ item.ticket_text }}"
```

### openai.api.models

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/models/all
- Change: changed
- Prior hash: 4ee5fe4d6acb67da82da3ddcdf40d7b07263efe6d3d12058f720ef843c524278
- Current hash: 6fde90298d97c4219115b601dc5f3ef2ae3bb7ab37a8bcdc419a805a9bf3b773

```diff
- Overview Models Agents Tools Voice & Audio Production API reference
- Overview Models Agents Tools Voice & Audio Production API reference Models
- Realtime prompting guide
- Transcription
- Realtime transcription
- Speech generation
- Connection methods
- WebSocket
- SIP
- Sessions and operations
- Realtime with tools
- Webhooks and server-side controls
- Managing costs
- Prompt caching
- API Partner Setup
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Meet the winners of OpenAI Build Week
+ Overview Models Agents Tools Audio & voice Production API reference
+ Overview Models Agents Tools Audio & voice Production API reference Models
+ Image generation Overview
+ Image prompting
+ Agents API
+ Architecture
+ Configuring Agents
+ Sessions Run and continue sessions
+ Events and items
+ Manage sessions
+ Environments and sandboxes OpenAI-hosted sandboxes
+ Self-hosted sandboxes
+ Sandbox lifecycle
+ Sandbox security
+ Files and artifacts
+ Tools and integrations Web search
+ Functions
+ MCP connections
+ Vaults
+ Observability and usage
+ Tracing
+ GPT-Live
+ Managing sessions
+ Delegation and tools
+ Migrate to GPT-Live
+ Partner integrations
+ Realtime API
+ Tools and MCP
+ Build with voice
+ Custom voices
+ Connections
+ WebSockets
+ Telephony and SIP
+ Server-side controls
+ Audio processing
+ Live transcription
+ Text to speech
+ Audio in Chat Completions
+ Prompt caching Prompt cache diagnostics
+ Campaign Management
```

### openai.api.token-counting

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/guides/token-counting
- Change: changed
- Prior hash: 532908feecb03315a2ca9951cec147d5c02389665439096e7bb42c082597f564
- Current hash: 720270dadf99f2a3e48146fb2e34e1771e63bac011194e44b5ef0e16e340d86b

```diff
- {role: :user, content: "What is 2 + 2?"},
- {role: :assistant, content: "2 + 2 equals 4."},
- {role: :user, content: "What about 3 + 3?"}
- {type: :input_text, text: "Summarize this chart."}
- properties: {location: {type: "string"}},
+ content: "What is 2 + 2?"
+ role: :assistant,
+ content: "2 + 2 equals 4."
+ content: "What about 3 + 3?"
+ type: :input_text,
+ text: "Summarize this chart."
```

### openai.codex.changelog

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/changelog
- Change: changed
- Prior hash: e8b0c9fbf58fb1fae26839a2d290154deb8ee2e374d716f678e02346548840fd
- Current hash: 83e845a615379dab55e3b9d53b7e192997d615b2e5f1b44b57ce89bc5690fdf7

```diff
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- Realtime prompting guide
- Transcription
- Realtime transcription
- Speech generation
- Connection methods
- WebSocket
- SIP
- Sessions and operations
- Realtime with tools
- Webhooks and server-side controls
- Managing costs
- Prompt caching
- API Partner Setup
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Meet the winners of OpenAI Build Week
- li+li]:mt-12"> 2026-09-04
- server instead. To use Codex from Claude Code, use the Codex
- plugin for Claude Code .
- Codex CLI 0.147.0
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.147.0
- Install portable Agent Plugins and search across local, personal, workspace, and remote plugin catalogs. ( #36544 , #36409 , #36919 , #36796 )
- Organize conversations into persistent, manually ordered sections and browse long transcripts incrementally. ( #35722 , #36007 , #36380 , #36948 , #36950 )
- Enable automatically reviewed approvals with the new --approve-for-me CLI flag. ( #36373 )
- Import Cursor-managed skills and synchronize changes to imported Claude and Cursor conversations without creating duplicates. ( #36361 , #36356 , #35623 )
- Support the opt-in MCP 2026-07-28 protocol, including paginated discovery, multi-round requests, and non-blocking server startup. ( #35724 , #35725 , #35590 , #35742 )
- Enable cached web search and remote conversation compaction for Amazon Bedrock. ( #36938 , #36981 )
- Redact secrets and complete bearer tokens from displayed commands and replayed conversation history. ( #36893 , #36908 )
- Prevent lost or stalled terminal input when focus returns, MCP servers initialize, or Ghostty handles keyboard shortcuts. ( #35649 , #35957 , #36834 )
- Correct rendering and cursor positioning for Japanese characters, emoji, hyperlinks, and text near viewport boundaries. ( #35960 , #35962 , #37166 )
- Properly interrupt Windows background processes and handle Windows filesystem paths consistently. ( #35655 , #35851 , #37129 )
- Require explicit trust for unfamiliar local projects and enforce managed authentication restrictions before credentials are used. ( #36960 , #37132 )
- Harden plugin isolation and deny network access when policy updates fail. ( #37027 , #36967 , #36037 )
- Improve the bundled OpenAI documentation skill with targeted official-source lookup and clearer guidance for Codex, model selection, and API workflows. ( #36014 )
- Upgrade the MCP SDK to 3.0.0, Ratatui to 0.30.2, and V8 to 150.4.0. ( #36001 , #35959 , #35831 )
+ Overview Models Agents Tools Audio & voice Production API reference Overview
+ Image generation Overview
+ Image prompting
+ Agents API
+ Architecture
+ Configuring Agents
+ Sessions Run and continue sessions
+ Events and items
+ Manage sessions
+ Environments and sandboxes OpenAI-hosted sandboxes
+ Self-hosted sandboxes
+ Sandbox lifecycle
+ Sandbox security
+ Files and artifacts
+ Tools and integrations Web search
+ Functions
+ MCP connections
+ Vaults
+ Observability and usage
+ Tracing
+ GPT-Live
+ Managing sessions
+ Delegation and tools
+ Migrate to GPT-Live
+ Partner integrations
+ Realtime API
+ Tools and MCP
+ Build with voice
+ Custom voices
+ Connections
+ WebSockets
+ Telephony and SIP
+ Server-side controls
+ Audio processing
+ Live transcription
+ Text to speech
+ Audio in Chat Completions
+ Prompt caching Prompt cache diagnostics
+ Campaign Management
+ Bidding & Budgets
… diff truncated (390 added / 393 removed lines)
```

### openai.codex.models

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/models
- Change: changed
- Prior hash: a1d747122bcb7a290eba962315d8ffb3a0085d204ef5c1e00595f3b047ee8332
- Current hash: 8ca4a78dca8a911cc071e1f9d2510108f631eb2faad45c20d15216ef8210dbd5

```diff
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- Realtime prompting guide
- Transcription
- Realtime transcription
- Speech generation
- Connection methods
- WebSocket
- SIP
- Sessions and operations
- Realtime with tools
- Webhooks and server-side controls
- Managing costs
- Prompt caching
- API Partner Setup
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Meet the winners of OpenAI Build Week
+ Overview Models Agents Tools Audio & voice Production API reference Overview
+ Image generation Overview
+ Image prompting
+ Agents API
+ Architecture
+ Configuring Agents
+ Sessions Run and continue sessions
+ Events and items
+ Manage sessions
+ Environments and sandboxes OpenAI-hosted sandboxes
+ Self-hosted sandboxes
+ Sandbox lifecycle
+ Sandbox security
+ Files and artifacts
+ Tools and integrations Web search
+ Functions
+ MCP connections
+ Vaults
+ Observability and usage
+ Tracing
+ GPT-Live
+ Managing sessions
+ Delegation and tools
+ Migrate to GPT-Live
+ Partner integrations
+ Realtime API
+ Tools and MCP
+ Build with voice
+ Custom voices
+ Connections
+ WebSockets
+ Telephony and SIP
+ Server-side controls
+ Audio processing
+ Live transcription
+ Text to speech
+ Audio in Chat Completions
+ Prompt caching Prompt cache diagnostics
+ Campaign Management
+ Bidding & Budgets
```

### openai.codex.plan-usage

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/pricing
- Change: changed
- Prior hash: 8cac49415a6fc9271c1ac405e9ee3464e585c1c1ee8a97976f1d5f63dc7413e6
- Current hash: f804f16ce11230a73fe504262a874392440206793db9da0a131278448d200555

```diff
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- Realtime prompting guide
- Transcription
- Realtime transcription
- Speech generation
- Connection methods
- WebSocket
- SIP
- Sessions and operations
- Realtime with tools
- Webhooks and server-side controls
- Managing costs
- Prompt caching
- API Partner Setup
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Meet the winners of OpenAI Build Week
- Plus: Approximately 15–30 minutes
- Pro 5x ($100/month): Approximately 1–2.5 hours
- Business: Approximately 45 minutes
- Enterprise / Edu (legacy): Approximately 45 minutes
- individual feature documentation to learn more about geo restrictions.
+ Overview Models Agents Tools Audio & voice Production API reference Overview
+ Image generation Overview
+ Image prompting
+ Agents API
+ Architecture
+ Configuring Agents
+ Sessions Run and continue sessions
+ Events and items
+ Manage sessions
+ Environments and sandboxes OpenAI-hosted sandboxes
+ Self-hosted sandboxes
+ Sandbox lifecycle
+ Sandbox security
+ Files and artifacts
+ Tools and integrations Web search
+ Functions
+ MCP connections
+ Vaults
+ Observability and usage
+ Tracing
+ GPT-Live
+ Managing sessions
+ Delegation and tools
+ Migrate to GPT-Live
+ Partner integrations
+ Realtime API
+ Tools and MCP
+ Build with voice
+ Custom voices
+ Connections
+ WebSockets
+ Telephony and SIP
+ Server-side controls
+ Audio processing
+ Live transcription
+ Text to speech
+ Audio in Chat Completions
+ Prompt caching Prompt cache diagnostics
+ Campaign Management
+ Bidding & Budgets
```

## Volatile noise (ignored)

- `anthropic.claude-code.legal` — https://code.claude.com/docs/en/legal-and-compliance
- `anthropic.platform.access-transparency` — https://platform.claude.com/docs/en/manage-claude/access-transparency
- `anthropic.platform.authentication` — https://platform.claude.com/docs/en/manage-claude/authentication
- `apify.cli.changelog` — https://docs.apify.com/cli/docs/changelog
- `apify.integrations.mcp` — https://docs.apify.com/integrations/mcp
- `apify.platform.changelog` — https://apify.com/change-log?_format=html
- `exa.docs.changelog` — https://exa.ai/docs/changelog
- `exa.docs.contents-retrieval` — https://exa.ai/docs/reference/contents-retrieval
- `firecrawl.github.releases` — https://github.com/firecrawl/firecrawl/releases
- `gemini.api.changelog` — https://ai.google.dev/gemini-api/docs/changelog
- `gemini.api.deprecations` — https://ai.google.dev/gemini-api/docs/deprecations
- `gemini.api.models` — https://ai.google.dev/gemini-api/docs/models
- `gemini.api.rate-limits` — https://ai.google.dev/gemini-api/docs/rate-limits
- `gemini.api.tokens` — https://ai.google.dev/gemini-api/docs/tokens
