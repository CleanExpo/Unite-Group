# Nexus vendor-intelligence review

Generated: 2026-09-19T17:20:07.340Z

Summary: 36 sources reviewed; 27 material; 8 volatile noise; 1 unchanged.

## Material changes

### anthropic.claude-code.changelog

- Vendor: Anthropic
- Source: https://code.claude.com/docs/en/changelog
- Change: changed
- Prior hash: 3f6f83405e574480ef3eb66c8183dd6c984f9bb6f6fdcaef3d7abd287cf6d236
- Current hash: 718bd67c0fa8ccf4f6e4582351d58a06641c677be59507c0792ebe372415ed5b

```diff
- * Changed hook output over 50K characters to be saved to disk with a file path + preview instead of being injected directly into context
+ <Update label="2.1.278" description="September 19, 2026">
+ * Changed auto mode for Claude API and Enterprise users, and on Bedrock, Vertex, Foundry and gateways, to default to the server-side classifier, which does not charge for classifier overhead (`CLAUDE_CODE_AUTO_MODE_SERVER=0` opts out on Bedrock, Vertex, Foundry and gateways); warns on billed fallback. See [https://code.claude.com/docs/en/auto-mode-classifier-billing](https://code.claude.com/docs/en/auto-mode-classifier-billing)
+ * Added an `Auto mode server` row to `/status` showing whether this session's auto mode classifier runs on the server
+ <Update label="2.1.277" description="September 18, 2026">
+ * Added AGENTS.md support: in a project with no CLAUDE.md, Claude Code reads AGENTS.md instead; change it under "Project instructions" in `/config` (not yet on Bedrock, Vertex or Foundry)
+ * Added `CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY=1` for Claude apps gateways whose only egress is a forward proxy: every outbound request hands the proxy the hostname instead of resolving it locally
+ * Added an optional `headers:` map on Claude apps gateway upstreams, to send static headers to a proxy you run in front of a provider
+ * Added a line saying a background task's update is waiting when it finishes while a panel such as `/tasks` is open
+ * Fixed `claude -p` and Agent SDK sessions that could hang with no result after an internal error; they now report the error and exit with code 1
+ * Fixed conversations failing every request with "text content blocks must be non-empty" when an earlier assistant turn held an empty text block beside other content, including after `--resume`
+ * Fixed being unexpectedly logged out when an older Claude Code build (for example an IDE extension's bundled CLI) runs on the same machine as the current one
+ * Fixed interactive start-up hanging or showing an error for `ANTHROPIC_API_KEY` users when `~/.claude.json` holds a malformed `customApiKeyResponses` value
+ * Fixed update checks erroring every 30 minutes, and `claude update` hanging when a minimum or maximum version is set, if a proxy returns an invalid version; a malformed `minimumVersion` is now ignored
+ * Fixed `claude update` on winget- or apk-managed installs reporting "up to date" when the version lookup failed
+ * Fixed `claude plugin install` sometimes failing and breaking the installed copy when reinstalling a plugin version that a session or another program was using; an unchanged copy is now left alone
+ * Fixed Grep and Glob reporting no matches when the search could not start because the system was out of processes, memory or file handles; they now return an error saying so
+ * Fixed the Write tool silently ending the turn as a declined permission when the target path is an existing directory; it now reports a clear error
+ * Fixed the Edit tool treating an escaped backslash followed by `uXXXX` text as a `\uXXXX` escape, which could make an edit of a non-ASCII character rewrite an escaped backslash sequence instead
+ * Fixed the Edit tool reporting "Invalid regular expression: regular expression too large" instead of "String not found in file" when a very large edit containing non-ASCII text did not match the file
+ * Fixed a turn ending early with "Path contains null bytes" when a tool call's file path contained `\u0000` written as an escape sequence; escaped control characters now stay as literal text
+ * Fixed background sessions (`claude --bg`) exiting when a plugin's LSP server exited or closed its stdin
+ * Fixed a crash ("Type error") when opening `/mcp` or `/plugin manage` with a malformed `claudeAiMcpEverConnected` value in `~/.claude.json`
+ * Fixed a crash at launch when `~/.claude.json` holds a malformed `theme` value
+ * Fixed a crash ("unrecoverable interface error") when the prompt held text containing terminal color codes, for example a prompt recalled from history or text loaded from the external editor
+ * Fixed a crash when resuming a session whose saved history holds an assistant message stored as a plain string
+ * Fixed sessions on slow or heavily loaded machines sometimes exiting with "Claude Code exited after an unrecoverable interface error" when the first spinner appeared
+ * Fixed a rare case where the screen could stop updating for the rest of the session after an internal rendering error
+ * Fixed a rare case on Windows where a turn could stop with an error such as "Out of memory" right after Claude replied, so that reply's tool calls never ran
+ * Fixed sessions continued after `/clear` (restart, `--continue`, `--resume`) missing part of their first message when a SessionStart hook printed output, causing a full prompt-cache miss
+ * Fixed messages from other agents (such as a subagent's SendMessage) that arrived mid-turn showing up below the "Ran N shell commands" row instead of where they arrived
+ * Fixed the "copied" notice not appearing after drag-selecting text in the fullscreen `/resume` picker and other panels that cover the prompt area
+ * Fixed `$TMPDIR` expanding empty in Bash commands that run outside the sandbox while sandboxing is enabled
+ * Fixed WebFetch and WebSearch in Cowork cloud sessions not telling Claude why a request was refused, such as a used-up fetch budget or an admin policy
+ * Fixed the Claude apps gateway's telemetry relay ignoring a collector hostname or domain listed in `NO_PROXY` when a proxy is set
+ * Fixed one malformed `strictKnownMarketplaces` or `blockedMarketplaces` entry silently disabling the whole enterprise marketplace policy
+ * Fixed failed auto-updates leaving large staged downloads behind in `~/.cache/claude/staging`
+ * Fixed `/plugin` not stripping terminal control characters from messages on the Installed tab, such as the error of a failed plugin update
+ * Fixed `/plugin` → Installed and `/skills` crashing when a skill or legacy command is named like a built-in Object property such as `constructor` or `toString`
+ * Fixed `/plugin` closing with no message when every install in a multi-select failed
+ * Fixed uninstalled plugins reappearing as "failed to load" rows in `/plugin` Installed, and Remove not clearing such a row
… diff truncated (769 added / 1 removed lines)
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
- Current hash: bb0955101d7dda1d28bbf150e228c55b1b9bf98936cd472347537c9ff72c2159

```diff
+ ### September 18, 2026
+ * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) local session endpoints now also return transcripts of Claude in Chrome sessions (`product_surface` value `claude_in_chrome`), in beta for Claude Enterprise organizations, with your existing Compliance Access Key and the `read:compliance_user_data` scope. See [Sessions on users' machines](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions).
+ ### September 14, 2026
+ * The Messages API can now [compact a conversation on demand](https://platform.claude.com/docs/en/build-with-claude/compaction#compact-on-demand-with-the-compaction-parameter) on the Claude API, in beta with the `compact-2026-09-04` beta header. Send the top-level `compaction` parameter, and the API returns a signed `compaction` block that summarizes the messages you sent. On later requests, send that block first, in place of those messages. You choose when to compact, the request can run in the background, and you can keep recent turns word for word after the summary. On models with preserved thinking, the thinking in those kept turns can stay valid.
+ ### September 10, 2026
+ * Claude Managed Agents permission policies now include `auto`: the server evaluates each agent or MCP tool call and runs it, denies it, or pauses for your approval. `agent.tool_use` and `agent.mcp_tool_use` events report how each call was evaluated in an `evaluation` field alongside `evaluated_permission`. See [Let the server evaluate each call with `auto`](https://platform.claude.com/docs/en/managed-agents/permission-policies#let-the-server-evaluate-each-call-with-auto).
+ * Version 1.32.0 of the `ant` CLI adds `ant beta:sessions connect`, which attaches your terminal to a Claude Managed Agents session. You can follow the session live, send messages, and allow or deny tool calls that are waiting for approval. Pass `--web` to serve the Claude Console's session viewer locally and open the session there instead. See [Connect to a Managed Agents session from your terminal](https://platform.claude.com/docs/en/cli-sdks-libraries/cli/sessions-connect).
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

### exa.docs.changelog

- Vendor: Exa
- Source: https://exa.ai/docs/changelog
- Change: changed
- Prior hash: aff1047f2ff77aef4b95d65a58af004dcdb4475ca08f3f1be7420707f71fedad
- Current hash: b56ad209921151eef04994fbece6b4aff62f6a008e8fc45744f2733e41008d98

```diff
- <Update
- label="August 2026"
- description={
- <div className="changelog-month-index">
- <div><a href="#dynamic-highlights-research-preview">Dynamic Highlights (research preview)</a></div>
- </div>
- }
- rss={{
- title: "August 2026",
- description: "Dynamic Highlights is a research preview that returns the most useful information across a result set for agents and RAG."
- }}
- >
- [Read the Dynamic Highlights guide →](/docs/reference/contents-api-guide)
- <Update
- label="July 2026"
- description={
- <div className="changelog-month-index">
- <div><a href="#publication-research">Publication research</a></div>
- <div><a href="#exa-agent-and-exa-connect-in-mcp">Exa Agent and Exa Connect in MCP</a></div>
- </div>
- }
- rss={{
- title: "July 2026",
- description: "Expanded publication research with 350M publications, richer organization and people results, and a public retrieval benchmark. Plus Exa Agent and Exa Connect in MCP."
- }}
- >
- Query it via the API with the `publication` [search category](/docs/reference/search-api-guide), or [try it in the dashboard →](https://dashboard.exa.ai/playground/search?type=instant).
- [Read the Exa MCP guide →](/docs/reference/exa-mcp) · [Read the Exa Agent guide →](/docs/reference/agent-api-guide) · [Announcement tweet →](https://x.com/ExaAILabs/status/2072389192458592672)
- <Update
- label="June 2026"
- description={
- <div className="changelog-month-index">
- <div><a href="#introducing-exa-agent">Introducing Exa Agent</a></div>
- <div><a href="#introducing-exa-connect">Introducing Exa Connect</a></div>
- </div>
- }
- rss={{
- title: "June 2026",
- description: "Introducing Exa Agent and Exa Connect, a new class of frontier web research and partner-data workflows accessible via API."
- }}
+ <Update label="August 28, 2026" rss={{ title: "Dynamic Highlights (research preview)" }}>
+ [Read the Dynamic Highlights guide →](/docs/contents/quickstart)
+ <Update label="July 23, 2026" rss={{ title: "Publication research" }}>
+ Query it via the API with the `publication` [search category](/docs/search/quickstart), or [try it in the dashboard →](https://dashboard.exa.ai/playground/search?type=instant).
+ <Update label="July 1, 2026" rss={{ title: "Exa Agent and Exa Connect in MCP" }}>
+ [Read the Exa MCP guide →](/docs/get-started/exa-mcp) · [Read the Exa Agent guide →](/docs/agent/quickstart) · [Announcement tweet →](https://x.com/ExaAILabs/status/2072389192458592672)
+ <Update label="June 24, 2026" rss={{ title: "Introducing Exa Connect" }}>
+ [Read the Exa Connect guide →](/docs/agent/connect/overview) · [Announcement tweet →](https://x.com/ExaAILabs/status/2069842203577651283)
+ <Update label="June 16, 2026" rss={{ title: "Introducing Exa Agent" }}>
+ [Read the Exa Agent API guide →](/docs/agent/quickstart)
+ <Update label="April 1, 2026" rss={{ title: "API Deprecation Notice" }}>
+ <Update label="March 30, 2026" rss={{ title: "Introducing Exa Monitors" }}>
+ [Read the Monitors API guide →](/docs/monitors/quickstart)
+ <Update label="March 4, 2026" rss={{ title: "Exa Deep Revamp" }}>
+ <Update label="March 3, 2026" rss={{ title: "Exa Pricing Update" }}>
+ <Update label="February 5, 2026" rss={{ title: "Introducing Exa Instant Search" }}>
+ [Read the Search API guide →](/docs/search/quickstart) · [Try it in the dashboard →](https://dashboard.exa.ai/playground/search?type=instant)
+ <Update label="February 2, 2026" rss={{ title: "Highlights, content freshness, and MCP updates" }}>
+ [Content freshness docs →](/docs/contents/quickstart#content-freshness) · [Exa MCP →](/docs/get-started/exa-mcp)
+ <Update label="January 21, 2026" rss={{ title: "Introducing Exa Company Search" }}>
+ [Read the Companies & People Search docs →](/docs/search/data/companies-people) · [Read the benchmark blog →](https://exa.ai/blog/company-search-benchmarks)
+ <Update label="December 19, 2025" rss={{ title: "Introducing Exa People Search" }}>
+ [Read the Companies & People Search docs →](/docs/search/data/companies-people) · [Read the benchmark blog →](https://exa.ai/blog/people-search-benchmark)
+ <Update label="November 26, 2025" rss={{ title: "JS SDK: highlights restored" }}>
+ [Read the JavaScript SDK docs →](/docs/sdks/quickstart)
+ <Update label="November 20, 2025" rss={{ title: "New Deep Search Type" }}>
+ <Update label="November 5, 2025" rss={{ title: "Added Language Filtering" }}>
+ [Read the Search API guide →](/docs/search/quickstart)
+ <Update label="October 28, 2025" rss={{ title: "SDK changes: highlights removed and contents returned by default" }}>
+ [Read the Python SDK docs →](/docs/sdks/quickstart)
+ <Update label="August 4, 2025" rss={{ title: "Domain Path Filter Support" }}>
+ <Update label="July 30, 2025" rss={{ title: "Geolocation Filter Support" }}>
+ <Update label="July 29, 2025" rss={{ title: "New Fast Search Type" }}>
+ [Read the Search API guide →](/docs/search/quickstart) · [Try it in the dashboard →](https://dashboard.exa.ai/playground/search?q=blog%20post%20about%20AI\&filters=%7B%22text%22%3A%22true%22%2C%22type%22%3A%22fast%22%2C%22livecrawl%22%3A%22never%22%7D)
+ <Update label="July 21, 2025" rss={{ title: "Score Deprecation in Auto Search" }}>
+ <Update label="June 23, 2025" rss={{ title: "Markdown Contents as Default" }}>
+ [Read the Contents docs →](/docs/contents/quickstart)
+ <Update label="June 7, 2025" rss={{ title: "New Livecrawl Option: Preferred" }}>
+ Historical entry: the `livecrawl` string parameter is now deprecated. For new integrations, use `maxAgeHours` with `livecrawlTimeout`. See [Content Freshness](/docs/contents/quickstart#content-freshness).
+ [Read the Content Freshness docs →](/docs/contents/quickstart#content-freshness)
… diff truncated (44 added / 209 removed lines)
```

### exa.docs.contents-retrieval

- Vendor: Exa
- Source: https://exa.ai/docs/contents/quickstart.md
- Change: changed
- Prior hash: 60c952eb599af0c78133a64791aa6f2bc06e6c559ea01c08c3305b41dd074bdc
- Current hash: 24a96281b311b7ddbc35d85ed09b0470b4dca9e645ce5ada49a23fc57c435f73

```diff
- # Contents Retrieval
- ***
- When using the Exa API, you can request different types of content. On `/search`, content options are nested under `contents`; on `/contents`, the same options are top-level fields because the endpoint already retrieves known URLs.
- ## Text (text=True)
- Returns the full text content of the result, formatted as markdown. It extracts the main content (like article body text) while filtering out navigation elements, pop-ups, and other peripheral text. This is extractive content taken directly from the page's source.
- ### Content Filtering Options
- <Note>
- **Important**: Content filtering options (`verbosity`, `includeSections`, `excludeSections`) require live crawling to take effect. Use `maxAgeHours: 0` to force a fresh crawl for these filters.
- </Note>
- You can control the level of detail and which page sections are included using these options:
- 1. **Verbosity** - Controls overall content detail level:
- * `compact` (default): Most concise output, main content only
- * `standard`: Balanced content with more detail
- * `full`: Complete content including all sections
- 2. **Section Filtering** - Include or exclude specific semantic sections:
- * `includeSections`: Only include content from specified sections
- * `excludeSections`: Remove content from specified sections
- Available section tags:
- * `header` - Page header content
- * `navigation` - Navigation menus
- * `banner` - Banner/hero sections
- * `body` - Main body content
- * `sidebar` - Sidebar content
- * `footer` - Page footer
- * `metadata` - Page metadata
- Example `/search` configuration:
- "query": "latest product updates",
- "contents": {
- "verbosity": "standard",
- "includeSections": ["body", "header"]
- "maxAgeHours": 0
- Equivalent `/contents` configuration:
- "ids": ["https://example.com"],
- "excludeSections": ["navigation", "footer", "sidebar"]
- "maxAgeHours": 0
- ## Summary (summary=True)
- Provides a concise summary generated from the text, tailored to a specific query you provide. This is abstractive content created by processing the source text using Gemini Flash.
- ### Structured Summaries
- You can also request structured summaries by providing a JSON schema. This is `/contents` top-level form:
- "ids": ["https://example.com"],
+ # Contents API
+ > Extract text, highlights, and summaries from any URL.
+ Exa Contents returns clean page content from URLs, handling JavaScript-rendered pages, PDFs, and complex layouts automatically.
+ All contents features are also available in [Exa Search](/docs/search/quickstart) for returned URLs, at no extra charge up to 10 results per search (\$1/1000 pages afterwards). We recommend using Search in this way instead of Contents for web search tool use cases.
+ <Tip>
+ For search results feeding AI context, request `contents: { highlights: true }` on `/search` —
+ Exa sizes each result's excerpts to its relevance. See [Highlights](/docs/search/highlights).
+ </Tip>
+ ## Make your first request
+ Pass one or more URLs or document IDs and request highlights for the parts relevant to your task. In HTTP requests, provide them in `ids`:
+ <CodeGroup>
+ ```python Python theme={null}
+ from exa_py import Exa
+ exa = Exa()
+ result = exa.get_contents(
+ ["https://exa.ai/blog/dynamic-highlights"],
+ highlights={"query": "token efficiency and quality results"},
+ )
+ print(result.results[0].highlights)
+ ```javascript JavaScript theme={null}
+ import Exa from "exa-js";
+ const exa = new Exa();
+ const result = await exa.getContents(
+ ["https://exa.ai/blog/dynamic-highlights"],
+ highlights: {
+ query: "token efficiency and quality results"
+ );
+ console.log(result.results[0].highlights);
+ ```bash cURL theme={null}
+ curl -s -X POST "https://api.exa.ai/contents" \
+ -H "Content-Type: application/json" \
+ -H "Authorization: Bearer $EXA_API_KEY" \
+ -d '{
+ "ids": ["https://exa.ai/blog/dynamic-highlights"],
+ "query": "token efficiency and quality results"
+ }'
+ </CodeGroup>
+ <Accordion title="Example response">
+ "requestId": "e492118ccdedcba5088bfc4357a8a125",
+ "results": [
… diff truncated (210 added / 101 removed lines)
```

### exa.docs.index

- Vendor: Exa
- Source: https://exa.ai/docs/llms.txt
- Change: changed
- Prior hash: a60fc40b1adbc761c928a7f484208dca1a9cd9723fa58781c0ab783e862abd0d
- Current hash: 31edc85de1511cad99b3e53d32ba78baa9f1029127213639f7a198355edf3e21

```diff
- ## Docs
- - [Exa Search API](https://exa.ai/docs/reference/search-api-guide.md): Exa is an SF-based research lab building perfect search.
- - [Search API Reference](https://exa.ai/docs/reference/search-api-guide-for-coding-agents.md): Self-contained reference with best practices and examples for coding agents
- - [Search Best Practices](https://exa.ai/docs/reference/search-best-practices.md): Best practices for using Exa's Search API
- - [Contents API](https://exa.ai/docs/reference/contents-api-guide.md): Extract clean, LLM-ready web content.
- - [Contents API Reference](https://exa.ai/docs/reference/contents-api-guide-for-coding-agents.md): Best practices, examples, and API reference for your coding agent
- - [Contents Best Practices](https://exa.ai/docs/reference/contents-best-practices.md): Best practices for using Exa's Contents API
- - [Exa Agent](https://exa.ai/docs/reference/agent-api-guide.md): Run deep research, list-building, and enrichment workflows that return structured outputs.
- - [Examples](https://exa.ai/docs/reference/agent-api/examples.md): Production Exa Agent examples for list building, KYB intelligence, job postings, and structured outputs.
- - [Websets](https://exa.ai/docs/websets/api-guide.md): Find anything on the web, no matter how complex. Websets searches, verifies, and enriches results automatically.
- - [Websets Reference (For Your Coding Agent)](https://exa.ai/docs/websets/api-guide-for-coding-agents.md): Self-contained reference for coding agents. Websets API architecture, request/response shapes, event flow, and integration patterns.
- - [How Websets Works](https://exa.ai/docs/websets/api/how-it-works.md)
- - [FAQ](https://exa.ai/docs/websets/faq.md): Frequently asked questions about Websets
- - [Websets Best Practices](https://exa.ai/docs/websets/best-practices.md): Best practices for building with the Websets API
- - [Example queries](https://exa.ai/docs/websets/dashboard/websets-example-queries.md): Here are some examples for things to search for, to get you started!
- - [Criteria vs Enrichments](https://exa.ai/docs/websets/dashboard/criteria-versus-enrichments.md)
- - [Integrations](https://exa.ai/docs/websets/dashboard/integrations.md): Connect your Websets with popular CRM and email tools
- - [Creating Enrichments ](https://exa.ai/docs/websets/dashboard/walkthroughs/Creating-enrichments.md): Here's how to create enrichments (also known as Adding Columns).
- - [Exploring your results ](https://exa.ai/docs/websets/dashboard/walkthroughs/Exploring-your-results.md): Explore your Websets matched results, view summaries, criteria justification
- - [Adding and Managing Your Team Members in Websets](https://exa.ai/docs/websets/dashboard/walkthroughs/Managing-Team-Members.md): Here's how to manage your team.
- - [Prompting Websets](https://exa.ai/docs/websets/dashboard/walkthroughs/Prompting.md): Here's how to prompt your query in Websets
- - [Downloading and Sharing Your Results](https://exa.ai/docs/websets/dashboard/walkthroughs/Sharing-and-Downloading-Your-Results.md): Here's how to share or download your results and enrichments.
- - [Monitors](https://exa.ai/docs/reference/monitors-api-guide.md): Schedule recurring Exa searches and get results delivered to your webhook.
- - [Monitors API Reference](https://exa.ai/docs/reference/monitors-api-guide-for-coding-agents.md): Self-contained reference with all endpoints, parameters, and examples for coding agents.
- - [Exa Connect](https://exa.ai/docs/reference/agent-api/connect/overview.md): Give your Exa Agent live access to premium data partners, alongside Exa web search, in a single run.
- - [Fiber.ai](https://exa.ai/docs/reference/agent-api/connect/fiber.md): Search Fiber.ai's B2B database for companies, people, and LinkedIn profiles.
- - [Similarweb](https://exa.ai/docs/reference/agent-api/connect/similarweb.md): Get website traffic estimates, global rankings, and competitor discovery.
- - [Baselayer](https://exa.ai/docs/reference/agent-api/connect/baselayer.md): Verify US businesses and retrieve KYB data: officers, registrations, risk scores.
- - [Polymarket](https://exa.ai/docs/reference/agent-api/connect/polymarket.md): Get prediction-market odds, price history, order books, and trader positions.
- - [Affiliate.com](https://exa.ai/docs/reference/agent-api/connect/affiliatecom.md): Search product catalogs across merchants and affiliate networks.
- - [Particle](https://exa.ai/docs/reference/agent-api/connect/particle.md): Search podcast transcripts with speaker attribution and timestamps.
- - [Financial Datasets](https://exa.ai/docs/reference/agent-api/connect/financialdatasets.md): Structured financial and market data for 27,000+ active and delisted U.S. tickers, including prices, fundamentals, earnings, SEC filings, ownership, and stock screening.
- - [Jinko](https://exa.ai/docs/reference/agent-api/connect/jinko.md): Flight and Hotel search with real-time pricing.
- - [Combining providers](https://exa.ai/docs/reference/agent-api/connect/combining-providers.md): Use several data partners together in a single Exa Agent run.
- - [Additional providers](https://exa.ai/docs/reference/agent-api/connect/additional-partners.md): Exa Connect partners beyond the self-serve provider set.
- - [People Search](https://exa.ai/docs/reference/verticals/people.md)
- - [People Search Reference](https://exa.ai/docs/reference/verticals/people-for-coding-agents.md): Self-contained reference for coding agents using Exa People Search
- - [Company Search](https://exa.ai/docs/reference/verticals/company.md)
- - [Company Search Reference](https://exa.ai/docs/reference/verticals/company-for-coding-agents.md): Self-contained reference for coding agents using Exa Company Search
- - [Code Search](https://exa.ai/docs/reference/verticals/code.md)
+ - [Start building with Exa](https://exa.ai/docs/index.md): A powerful web search tool designed for agents. Everything optimized to get you token-efficient, accurate results.
+ - [Developer quickstart](https://exa.ai/docs/get-started/quickstart.md): Get an API key, then use Exa from your code or your agent.
+ - [Exa MCP](https://exa.ai/docs/get-started/exa-mcp.md): Connect ChatGPT, Codex, Claude, Grok, Cursor, and any other MCP client to Exa's web search, page fetching, Exa Agent, and Exa Connect tools.
+ - [Agent Skills](https://exa.ai/docs/get-started/agent-skills/overview.md): Install Exa skills in Claude Code, Codex, and other coding agents.
+ - [Build with Exa Skill](https://exa.ai/docs/get-started/agent-skills/build-with-exa.md): An agent skill to help developers implement any part of the Exa API platform.
+ - [Exa Search Skill](https://exa.ai/docs/get-started/agent-skills/exa-search.md): Find relevant web pages and return synthesized content in under two seconds with Exa Search.
+ - [Exa Contents Skill](https://exa.ai/docs/get-started/agent-skills/exa-contents.md): Extract page content with Exa Contents when you already have the URLs.
+ - [Exa Search API](https://exa.ai/docs/search/quickstart.md): Search the web in natural language and get clean, relevant page content in one request.
+ - [Deep Search](https://exa.ai/docs/search/deep-search.md): Use iterative search, reasoning, and grounded synthesis for complex research tasks.
+ - [Highlights](https://exa.ai/docs/search/highlights.md): Return query-relevant excerpts from Exa Search results while controlling context size and latency.
+ - [Exa Snapshot](https://exa.ai/docs/search/snapshot.md): Pin Search and Contents to a stored version of a page at a datetime you choose.
+ - [Search Best Practices](https://exa.ai/docs/search/best-practices.md): Tune retrieval quality, latency, context, and synthesis for production Search API integrations.
+ - [Data Index](https://exa.ai/docs/search/data/overview.md): What Exa indexes across the public web and private data sources.
+ - [News](https://exa.ai/docs/search/data/news.md): Find current reporting, industry coverage, and emerging stories with Exa Search.
+ - [Code & Docs](https://exa.ai/docs/search/data/code.md): Find code, technical documentation, and implementation guidance with Exa Search.
+ - [Companies & People](https://exa.ai/docs/search/data/companies-people.md): Find companies, professional profiles, and the relationships between them with Exa Search.
+ - [Financial Markets](https://exa.ai/docs/search/data/financial.md): Find market data, filings, earnings calls, and economic releases with Exa Search.
+ - [Research Publications](https://exa.ai/docs/search/data/research.md): Find academic papers, patents, grants, clinical trials, and regulatory approvals with Exa Search.
+ - [Legal & Public Records](https://exa.ai/docs/search/data/legal.md): Find court opinions, patents, sanctions, government contracts, and other public records with Exa Search.
+ - [Sports, Weather & Places](https://exa.ai/docs/search/data/sports-weather-places.md): Find live sports data, weather forecasts, and local places with Exa Search.
+ - [Cybersecurity](https://exa.ai/docs/search/data/security.md): Find vulnerabilities, advisories, threat reporting, and trust documentation with Exa Search.
+ - [Exa Agent](https://exa.ai/docs/agent/quickstart.md): Run deep research, list-building, and enrichment workflows that return structured outputs.
+ - [Agent Best Practices](https://exa.ai/docs/agent/best-practices.md): Tune query quality, structured output, effort, and cost for production Exa Agent integrations.
+ - [Examples](https://exa.ai/docs/agent/examples.md): Production Exa Agent examples for list building, KYB intelligence, job postings, and structured outputs.
+ - [Exa Connect](https://exa.ai/docs/agent/connect/overview.md): Give your Exa Agent live access to premium data partners, alongside Exa web search, in a single run.
+ - [Fiber.ai](https://exa.ai/docs/agent/connect/fiber.md): Search Fiber.ai's B2B database for companies, people, and LinkedIn profiles.
+ - [Similarweb](https://exa.ai/docs/agent/connect/similarweb.md): Get website traffic estimates, global rankings, and competitor discovery.
+ - [Baselayer](https://exa.ai/docs/agent/connect/baselayer.md): Verify US businesses and retrieve KYB data: officers, registrations, risk scores.
+ - [Polymarket](https://exa.ai/docs/agent/connect/polymarket.md): Get prediction-market odds, price history, order books, and trader positions.
+ - [Affiliate.com](https://exa.ai/docs/agent/connect/affiliatecom.md): Search product catalogs across merchants and affiliate networks.
+ - [Particle](https://exa.ai/docs/agent/connect/particle.md): Search podcast transcripts with speaker attribution and timestamps.
+ - [Financial Datasets](https://exa.ai/docs/agent/connect/financialdatasets.md): Structured financial and market data for 27,000+ U.S. tickers: prices, fundamentals, earnings, SEC filings, ownership, and stock screening.
+ - [Jinko](https://exa.ai/docs/agent/connect/jinko.md): Flight and Hotel search with real-time pricing.
+ - [Combining providers](https://exa.ai/docs/agent/connect/combining-providers.md): Use several data partners together in a single Exa Agent run.
+ - [Additional providers](https://exa.ai/docs/agent/connect/additional-partners.md): Exa Connect partners beyond the self-serve provider set.
+ - [Contents API](https://exa.ai/docs/contents/quickstart.md): Extract text, highlights, and summaries from any URL.
+ - [Monitors API](https://exa.ai/docs/monitors/quickstart.md): Run recurring searches and receive newly discovered results by webhook.
+ - [Batch API](https://exa.ai/docs/batch/quickstart.md): Run Exa API requests asynchronously in batches.
+ - [SDK Quickstart](https://exa.ai/docs/sdks/quickstart.md): Install and use the Exa Python and JavaScript SDKs
+ - [Exa in Claude Code, Web, and Desktop](https://exa.ai/docs/integrations/claude-web-desktop.md): Search the web and read any page with Exa directly from Claude
… diff truncated (135 added / 158 removed lines)
```

### exa.docs.search

- Vendor: Exa
- Source: https://exa.ai/docs/reference/search
- Change: changed
- Prior hash: 68bb3178990f619909564908c08ea73d474b8c9dcbca7572e9d393abaf650a4f
- Current hash: b6a025b94502d8379e3f2e30d167285ac68c9f5ec4e8059b14ee70bfa2755adb

```diff
- <Card title="Get your Exa API key" icon="key" horizontal href="https://dashboard.exa.ai/api-keys" />
- ````yaml post /search
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
+ <Card title="Get your Exa API key" icon="key" horizontal href="https://dashboard.exa.ai/api-keys">
+ Create a key in the dashboard. New accounts start with free credits.
+ </Card>
+ ````yaml exa-spec.yaml POST /search
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
+ - SNAPSHOT_RATE_LIMIT_EXCEEDED
+ - SNAPSHOT_NOT_ON_PLAN
+ - SNAPSHOT_NOT_IN_CONTRACT
+ - SNAPSHOT_TRIAL_EXHAUSTED
+ - SNAPSHOT_TRIAL_CAP_EXCEEDED
+ - SNAPSHOT_RATE_LIMIT_EXCEEDED
… diff truncated (100 added / 31 removed lines)
```

### firecrawl.docs.index

- Vendor: Firecrawl
- Source: https://docs.firecrawl.dev/llms.txt
- Change: changed
- Prior hash: 0ee47209638ef3a11ce3e9bd0c4ddeb30f2ce97fe507d288618f19dec5c39bea
- Current hash: 9cf40b72b34a281846bb71b001334323e1c76aff51f815069a814e0669a6b55e

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
+ - [v2 (202 pages)](https://docs.firecrawl.dev/_llms/en/v2.md): Documentation for v2.
+ ## v1
+ ### Documentation
+ #### Get Started
+ - [Introduction](https://docs.firecrawl.dev/introduction.md): The web data API for AI agents. Search the web, scrape any page, and interact with it through one API.
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
+ #### Webhooks
+ - [Overview](https://docs.firecrawl.dev/webhooks/overview.md): Real-time notifications for your Firecrawl operations
+ - [Event Types](https://docs.firecrawl.dev/webhooks/events.md): Webhook event reference
+ - [Security](https://docs.firecrawl.dev/webhooks/security.md): Verify webhook authenticity
+ - [Testing](https://docs.firecrawl.dev/webhooks/testing.md): Test and debug webhooks
+ #### Dashboard
+ - [Overview](https://docs.firecrawl.dev/dashboard.md): Overview of the Firecrawl dashboard and its key features
+ ### SDKs
+ #### Overall
+ - [Overview](https://docs.firecrawl.dev/sdks/overview.md): Firecrawl SDKs are wrappers around the Firecrawl API to help you easily search, scrape, and interact with the web.
+ #### Official
```

### firecrawl.product.changelog

- Vendor: Firecrawl
- Source: https://www.firecrawl.dev/changelog
- Change: changed
- Prior hash: 946304cbdfd0615a50a7c5467e041c0fa5c1252d898b051df119455a93d03e40
- Current hash: 1b4406574063ac547377cdb0d20c88c5b65b1745aab88b38c1659eb815f1e4d5

```diff
- 176.8K Sign up
- Session Management - Configurable TTL controls, parallel sessions (up to 20 concurrent), and automatic cleanup. 2 credits per browser minute with 5 minutes free.
+ 182.2K Sign up
+ Session Management - Configurable TTL controls, parallel sessions (up to 20 concurrent), and automatic cleanup. 2 credits per browser minute.
+ Update (August 17, 2026) : The 5-credit price above no longer applies. Enhanced Mode requests are billed at the same 1 credit per request as basic requests, and an automatic escalated retry is not charged separately. See the Enhanced Mode docs .
```

### gemini.api.changelog

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/changelog
- Change: changed
- Prior hash: 0e5a056295d5000f94ffc33972344e95b57c85907fc7720b7ca9e0fdc625edc3
- Current hash: 5ae1b9e31c1f9e4df382fbccc2680fbc71c216db322769e75103e63a23a933f6

```diff
- Lyria 3.5 in public preview : Released the next generation of Google's music
- generation model:
- Last updated 2026-09-04 UTC.
+ September 17, 2026
+ Antigravity Agent 09-2026 : Released antigravity-preview-09-2026 ,
+ which replaces and deprecates antigravity-preview-05-2026 .
+ If you run on a remote sandbox ( environment: "remote" ) and read only
+ output_text or model_output steps, update the agent string and nothing
+ else changes.
+ If you run tools locally ( local_environment ) or parse function_call
+ steps, the built-in tools changed. Parameters use PascalCase instead of
+ snake_case, and file edits use line-range replacements instead of full
+ rewrites.
+ Capability
+ 05-2026
+ 09-2026
+ File creation
+ write_file(path, content)
+ write_to_file(TargetFile, CodeContent, Overwrite, Description)
+ File editing
+ write_file(path, content) , full rewrite
+ replace_file_content(TargetFile, StartLine, EndLine, TargetContent, ReplacementContent)
+ File reading
+ read_file(path, offset, limit) , byte offsets
+ view_file(AbsolutePath, StartLine, EndLine, ContentOffset)
+ Directory listing
+ list_files(path)
+ list_dir(DirectoryPath)
+ File and code search
+ None, agents used shell commands
+ find_by_name(SearchDirectory, Pattern, MaxDepth) and grep_search(SearchPath, Query, IsRegex)
+ Shell execution
+ code_execution(command, timeout_seconds)
+ Unchanged
+ Web search
+ google_search(queries)
+ Unchanged
+ See the Antigravity Agent guide.
+ antigravity-preview-05-2026 shuts down on October 5, 2026, tracked on the
+ deprecations page.
+ September 15, 2026
+ Gemini 3.8 Live and Gemini 3.8 Live Extended Thinking generally available
+ (GA) : Released two new audio-to-audio models for real-time voice
```

### gemini.api.deprecations

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/deprecations
- Change: changed
- Prior hash: 1419e17f5fee62496ccb49f6b1e340498de5f726b2e913d733a08907341c719d
- Current hash: bdcf9ee1515d278933ccf8e43aef94bf8a5b11ae69fdccc67e828d1d81a34e79

```diff
- models in the Gemini API. A " deprecation " is the announcement that we
- no longer provide support for a model, and that it will be " shut down " in
- the near future. Once a model is " shutdown ", it is completely
- turned off, and the endpoint is no longer available.
- Last updated 2026-09-05 UTC.
+ models and for managed agents in the Gemini API. A " deprecation " is the
+ announcement that we no longer provide support for a model, and that it will be
+ " shut down " in the near future. Once a model is " shutdown ", it is
+ completely turned off, and the endpoint is no longer available.
+ gemini-3.8-live
+ September 15, 2026
+ gemini-3.8-live-extended-thinking
+ September 15, 2026
+ gemini-3.8-live
+ September 15, 2026
+ gemini-3.8-live-extended-thinking
+ September 15, 2026
+ gemini-3.8-live
+ gemini-3.8-live
+ gemini-3.8-live
+ gemini-3.8-live
+ Managed agents
+ Agent
+ Preview agents
+ antigravity-preview-09-2026
+ September 17, 2026
+ antigravity-preview-05-2026
+ October 5, 2026
+ antigravity-preview-09-2026
+ Last updated 2026-09-17 UTC.
```

### gemini.api.models

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/models
- Change: changed
- Prior hash: 9e7c3711087835291ec307d34c1d8616b7a63dec501b96821b9bac81a45d2fb9
- Current hash: 41c55becbaf4eac6d1b97b8ccb36f0810d5f49211ff590873ceb528db0071eb7

```diff
- High-quality, low-latency Live API model for real-time dialogue and voice-first AI applications.
- Our high-quality, low-latency audio-to-audio (A2A) model designed for real-time dialogue and voice-first AI applications.
- Imagen 4 (Deprecated)
- Text-to-image model featuring fast and ultra-fast generation and exceptional clarity up to 2K resolution.
- Last updated 2026-09-04 UTC.
+ Gemini 3.8 Live
+ Default Live API model for most low-latency voice agent experiences without reasoning delays.
+ Gemini 3.8 Live Extended Thinking
+ High-reasoning Live API model for voice interactions, recommended when higher background reasoning is required.
+ Legacy Live API preview model. We recommend updating to Gemini 3.8 Live.
+ Gemini 3.8 Live
+ gemini-3.8-live
+ Gemini 3.8 Live Extended Thinking
+ gemini-3.8-live-extended-thinking
+ Gemini 3.8 Live
+ The default option for most low-latency voice agent experiences and real-time dialogue without reasoning delays.
+ gemini-3.8-live
+ Gemini 3.8 Live Extended Thinking
+ Our high-reasoning audio-to-audio model, recommended when higher background reasoning is required during live interactions.
+ gemini-3.8-live-extended-thinking
+ Legacy audio-to-audio preview model. We recommend updating to Gemini 3.8 Live.
+ Imagen 4 (Shut down)
+ Text-to-image model featuring fast and ultra-fast generation (shut down).
+ Last updated 2026-09-17 UTC.
```

### gemini.api.tokens

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/tokens
- Change: changed
- Prior hash: f95180ddfb1e9565726f8c59c593c456a3019f2772ce93c7992c26da1a749a64
- Current hash: 423cfa0ed919e7f48ab01616c05864dbe2dca31dfd481feb6fab42c1419660e0

```diff
- . input ( InteractionsInput . of ( "Calculate tokens for this message." ))
- if ( interaction . usage (). isPresent ()) {
- Usage usage = interaction . usage (). get ();
- . input ( InteractionsInput . of ( "Calculate tokens for this message." ))
- if ( interaction . usage (). isPresent ()) {
- Usage usage = interaction . usage (). get ();
- . input ( InteractionsInput . of ( "Calculate tokens for this message." ))
- if ( interaction . usage (). isPresent ()) {
- Usage usage = interaction . usage (). get ();
- . input ( InteractionsInput . of ( "Calculate tokens for this message." ))
- if ( interaction . usage (). isPresent ()) {
- Usage usage = interaction . usage (). get ();
- Last updated 2026-09-04 UTC.
+ import com.google.genai.types.CountTokensResponse ;
+ String prompt = "The quick brown fox jumps over the lazy dog." ;
+ CountTokensResponse countResponse =
+ client . models . countTokens ( "gemini-3.8-flash" , prompt , null );
+ System . out . println ( "total_tokens: " + countResponse . totalTokens (). orElse ( 0 ));
+ . input ( InteractionsInput . of ( prompt ))
+ System . out . println ( interaction . usage (). orElse ( null ));
+ CreateModelInteraction params1 =
+ . input ( InteractionsInput . of ( "Hi, my name is Bob" ))
+ Interaction interaction1 =
+ client . interactions . create ( CreateInteractionRequestBody . of ( params1 )). interaction (). get ();
+ CreateModelInteraction params2 =
+ . input ( InteractionsInput . of ( "What's my name?" ))
+ . previousInteractionId ( interaction1 . id (). orElse ( "" ))
+ Interaction interaction2 =
+ client . interactions . create ( CreateInteractionRequestBody . of ( params2 )). interaction (). get ();
+ // Usage includes tokens from both turns
+ if ( interaction2 . usage (). isPresent ()) {
+ Usage usage = interaction2 . usage (). get ();
+ System . out . println ( "Total tokens: " + usage . totalTokens (). orElse ( 0 ));
+ import com.google.genai.gaos.models.interactions.ImageContent ;
+ import com.google.genai.gaos.models.interactions.ImageContentMimeType ;
+ import com.google.genai.gaos.models.interactions.TextContent ;
+ import com.google.genai.types.Content ;
+ import com.google.genai.types.CountTokensResponse ;
+ import com.google.genai.types.File ;
+ import com.google.genai.types.Part ;
+ import com.google.genai.types.UploadFileConfig ;
+ import java.util.Arrays ;
+ File uploadedFile =
+ client . files . upload (
+ new java . io . File ( "path/to/image.jpg" ),
+ UploadFileConfig . builder (). mimeType ( "image/jpeg" ). build ());
+ // Count tokens for image + text
+ CountTokensResponse countResponse =
+ client . models . countTokens (
+ "gemini-3.8-flash" ,
+ Arrays . asList (
+ Content . fromParts (
+ Part . fromText ( "Tell me about this image" ),
```

### hermes.docs.cli-commands

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/reference/cli-commands
- Change: changed
- Prior hash: e94d8ac78be7d44b7e8620e9ecdb58b28d4caa7d74744ff602769142b9c5066a
- Current hash: e6d4bf3d322352392e5c7a7673339850798e810cbd1603931661c48fcb01e12c

```diff
- Force a provider: auto , openrouter , nous , openai-codex , copilot-acp , copilot , anthropic , gemini , huggingface , novita (aliases novita-ai , novitaai ), openai-api , zai , kimi-coding , kimi-coding-cn , minimax , minimax-cn , minimax-oauth , kilocode , xiaomi , arcee , gmi , upstage (alias solar ), alibaba , alibaba-cn , alibaba-coding-plan (alias alibaba_coding ), alibaba-coding-plan-cn , alibaba-token-plan , alibaba-token-plan-cn , deepseek , nvidia , ollama-cloud , xai (alias grok ), xai-oauth (alias grok-oauth ), qwen-oauth , bedrock , opencode-zen , opencode-go , opencode-free (aliases free , opencode_free ; keyless), commandcode , commandcode-anthropic , ai-gateway , azure-foundry , lmstudio , stepfun , tencent-tokenhub (alias tencent , tokenhub ), router (aliases ramp-router , ramp ), nebius-token-factory (aliases nebius , nebius-tf , tokenfactory ), tencent-tokenplan (aliases tokenplan , tencent-lkeap ).
- Session source tag for filtering (default: cli ). Use tool for third-party integrations that should not appear in user session lists.
- hermes -z "…" --usage-file /path/report.json writes a machine-readable usage report after the run: estimated_cost_usd , input_tokens / output_tokens / cache_read_tokens / cache_write_tokens / reasoning_tokens / total_tokens , api_calls , model , provider , session_id , service_tier , and completed / failed flags. The report is written even when the run fails , so batch pipelines can always account for spend. It has no effect outside -z / --oneshot , and a broken usage write never masks the run's own outcome.
- jq .estimated_cost_usd /tmp/usage.json
- --external-supervisor is a restart-policy contract: an in-chat restart or
- service-restart update exits with status 75 , so the wrapper's supervisor must
- Subcommands: add , list , remove , reset , status , logout , spotify . When called with no subcommand, launches the interactive management wizard.
- Resume a paused job and compute its next future run.
- For the full design — comparison with Cline Kanban / Paperclip / NanoClaw / Gemini Enterprise, eight collaboration patterns, four user stories, concurrency correctness proof — see docs/hermes-kanban-v1-spec.pdf in the repository or the Kanban user guide .
- Subscriptions persist to ~/.hermes/webhook_subscriptions.json and are hot-reloaded by the webhook adapter without a gateway restart.
- Delete only the legacy-<timestamp>/ archives produced by the v1→v2 migration.
- get <key> [--json]
- Print a single config value by dotted key (e.g. hermes config get model.default ). --json emits machine-readable output.
- set <key> <value>
- Set a config value.
- Remove a config key, reverting it to the built-in default.
- Install a catalog entry (e.g. hermes mcp install n8n ).
- install <identifier> [--force] [--ref COMMIT_SHA]
- Install a plugin from a Git URL, owner/repo , or a bare index name. Bare names (no slash) are resolved through the community plugin index to owner/repo plus the index-pinned commit; ambiguous names list candidates and exit. --ref accepts only a full 40-character commit SHA, installs that exact immutable revision, and overrides any index pin.
- search [term] [--json] [--capability CAP] [--refresh]
- Search the community plugin index (fuzzy match on name/description/tags; omit term to browse). Fetched from plugins.index_url (default: the NousResearch plugin index), cached under ~/.hermes/cache/ for 24h, falling back to the stale cache and then the bundled seed when offline. Indexed ≠ audited — inclusion is a metadata review only.
- Directly imported: SOUL.md, MEMORY.md, USER.md, AGENTS.md, skills (4 source directories), default model, custom providers, MCP servers, messaging platform tokens and allowlists (Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost), agent defaults (reasoning effort, compression, human delay, timezone, sandbox), session reset policies, approval rules, TTS config, browser settings, tool settings, exec timeout, command allowlist, gateway config, and API keys from 3 sources.
- See the import guide for the full mapping tables.
- Stop running hermes dashboard processes and exit.
- Create a new profile. --clone copies config, .env , SOUL.md , and skills from the active profile. --clone-all copies all state. --clone-from specifies a source profile and implies config clone unless paired with --clone-all .
- hermes chat hermes -z <prompt> — scripted one-shot
+ hermes codex-runtime
+ Noninteractive counterpart of /codex-runtime : migrate [--dry-run] [--json] regenerates the Hermes-managed block in ~/.codex/config.toml for the selected profile. See Codex app-server runtime .
+ hermes pause / hermes resume
+ Global emergency stop: no new cron fires (built-in ticker, managed-cron webhook, misfire catch-up), kanban dispatch or gateway turns start until resumed; in-flight work is never killed.
+ Force a provider: auto , openrouter , nous , openai-codex (aliases chatgpt , chatgpt-codex ), copilot-acp , copilot , anthropic , gemini , huggingface , novita (aliases novita-ai , novitaai ), openai-api , zai , kimi-coding , kimi-coding-cn , minimax , minimax-cn , minimax-oauth , kilocode , xiaomi , arcee , gmi , upstage (alias solar ), alibaba , alibaba-cn , alibaba-coding-plan (alias alibaba_coding ), alibaba-coding-plan-cn , alibaba-token-plan , alibaba-token-plan-cn , deepseek , nvidia , ollama-cloud , xai (alias grok ), xai-oauth (alias grok-oauth ), qwen-oauth , bedrock , opencode-zen , opencode-go , commandcode , commandcode-anthropic , ai-gateway , azure-foundry , lmstudio , stepfun , tencent-tokenhub (alias tencent , tokenhub ), router (aliases ramp-router , ramp ), nebius-token-factory (aliases nebius , nebius-tf , tokenfactory ), tencent-tokenplan (aliases tokenplan , tencent-lkeap ).
+ --format stream-json
+ Emit structured JSONL for a -q / --query invocation. Implies --quiet ; cannot be combined with --tui .
+ Session source tag for filtering (default: cli ; one-shot runs default to oneshot , which pickers hide). Use tool for third-party integrations that should not appear in user session lists. An explicit --source is always stored as given, even for a one-shot run launched from inside a TUI or Desktop session.
+ hermes chat -q "Inspect this repository" --format stream-json
+ --format stream-json — structured JSONL output ​
+ Use --format stream-json when a program needs to consume progress without
+ scraping terminal output. It requires -q / --query (or --query-file ), implies
+ quiet non-interactive CLI mode, and rejects an explicit --tui request. Every
+ stdout line is one JSON object; diagnostics and the session_id: line stay on stderr.
+ hermes chat -q "Summarize this repository" --format stream-json
+ Every event carries timestamp (Unix epoch milliseconds).
+ Event type
+ Fields
+ system
+ subtype: "init" , model , session_id
+ text
+ text — a streamed assistant text delta
+ tool_use
+ name ; input when the tool arguments are available
+ tool_result
+ name , output (capped at 5000 chars), duration_ms , is_error
+ result
+ session_id , exit_code , text , tokens ( input , output , total , cache_read , cache_write ), duration_ms ; error when the turn failed
+ Once a conversation starts, its terminal record is always result — including
+ exit_code: 130 when it is interrupted with Ctrl-C. Treat that record as the
+ completion signal; the process exit code matches its exit_code .
+ Exit codes for one-shot runs ​
+ When chat answers and exits ( -Q , chat --oneshot , or a query with non-TTY
+ stdio) the process exit code reports the turn's outcome, on both the quiet and
+ the non-quiet path: 0 the turn completed; 1 it failed, stopped partway
+ ( partial ), hit the iteration budget, or never ran (credentials / agent init
+ failed); 130 it was interrupted. A Kanban dispatcher-spawned worker
+ ( HERMES_KANBAN_TASK set) whose turn failed only because the provider was
+ rate-limited, overloaded, returning 5xx, timing out, or the account hit a
+ billing/quota wall, exits
… diff truncated (131 added / 26 removed lines)
```

### hermes.docs.fallback-providers

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
- Change: changed
- Prior hash: cc2cf1c9050b24954fa57dfed00a53cad4cb4c643586417a3205c019427b1593
- Current hash: 81ef39c0f93a136eec57c55efc1404bddc01f6088181aaa83d11aca403e9b8bb

```diff
- OpenCode Free
- opencode-free
- — (keyless, no credential)
- Invalid responses — when the API returns malformed or empty responses repeatedly
- Resolves credentials for the fallback provider
- Builds a new API client
- The per-turn retry is reset-aware : when the primary's credentials report a rate-limit reset time that hasn't elapsed yet (subscription windows like Claude Pro/Max's 5-hour blocks or Codex weekly limits report these as hours or days), Hermes skips the doomed retry and stays on the fallback until the reset passes — avoiding two pointless provider switches (and two prompt-cache invalidations) per turn. The moment the reset time elapses, the next turn goes back to the primary automatically. Transient 429s without a reset time keep the existing behavior: a short cooldown, then retry every turn.
- CLI sessions
- ✔ (subagents inherit the parent fallback chain)
- When a task's provider is set to "auto" (the default), Hermes first tries the main provider + main model for that auxiliary task. If that route is unavailable or later fails with a capacity-style error, Hermes now honors user-configured fallback policy before using the built-in discovery chain:
- fallback_providers / fallback_model → built-in auxiliary discovery chain
- Those built-in chains are a convenience fallback for users who have not declared a task-specific or main fallback policy.
- Every task above follows the same provider / model / base_url pattern. Each task can also declare its own fallback_chain ; if omitted, provider: auto uses the top-level fallback_providers chain before Hermes' built-in auxiliary discovery chain.
- fallback_chain (if set) → main agent model → warn + raise, on capacity errors only
- Inherits the parent's fallback_providers chain; optional provider/model override
- delegation.provider / delegation.model
+ Gemini fallback entries accept gemini , google , google-gemini , and
+ google-ai-studio . On Google's native API endpoint, all use the native Gemini
+ client, including its generationConfig.thinkingConfig translation. A custom
+ OpenAI-compatible base URL continues to use the compatible client instead.
+ Mixture of Agents preset
+ moa ( model = preset name)
+ A configured MoA preset whose aggregator has credentials — the fallback runs the whole preset (references + aggregator), not the aggregator alone
+ Invalid responses — when the API returns malformed or empty responses repeatedly. An HTTP-200 body whose only assistant text is a router's Connect timeout, please try again later. with zero completion tokens counts as invalid too (streamed or not, in the main loop, the iteration-limit summary and auxiliary calls), so it is retried instead of shown as the answer. A streamed refusal (the model declining with an explanation on the refusal channel) is a terminal content_filter result, not an empty response, so it is surfaced rather than retried. On the native Anthropic wire a stop_reason: refusal arrives with an empty body; Hermes reports the reason from the response's stop_details (category and, when present, explanation) in the refusal message and in the log line ( native_stop_reason=… stop_details=… ).
+ Resolves credentials for the fallback provider (including named custom providers using key_cmd )
+ Builds a new API client, preserving a dynamic credential source across timeout and request-client rebuilds
+ Re-resolves the reasoning effort for the fallback model (its agent.reasoning_overrides entry, else the global agent.reasoning_effort )
+ The same re-resolution happens when the CLI falls back at startup because the primary provider's auth fails before the first request: the fallback model is sent its own configured effort, not the primary's. An explicit hermes chat --reasoning <level> is kept across that startup switch — it is your intent for the run.
+ The per-turn retry is reset-aware : when the primary's credentials report a rate-limit reset time that hasn't elapsed yet (subscription windows like Claude Pro/Max's 5-hour blocks or Codex weekly limits report these as hours or days), Hermes skips the doomed retry and stays on the fallback until the reset passes — avoiding two pointless provider switches (and two prompt-cache invalidations) per turn. Expiry makes the primary eligible for a later retry; it does not schedule a retry or guarantee recovery. Transient 429s without a reset time use an exponential cooldown.
+ When a switch arms that cooldown, the fallback notice includes its approximate remaining duration, for example: Primary retry eligible in ~60 s; recovery is not guaranteed. Non-rate-limit switches and switches from an already-active cross-provider fallback do not announce a new primary cooldown.
+ CLI sessions (interactive and hermes -z one-shot)
+ ✔ (at startup when the primary's credentials/quota fail, and mid-session)
+ ✔ ( delegation.fallback_providers when set; otherwise only unpinned children inherit the parent chain; [] disables)
+ When a task's provider is set to "auto" (the default), Hermes first tries the main provider + main model for that auxiliary task. If that route is unavailable or later fails with a capacity-style error, Hermes follows your configured fallback policy and then stops:
+ fallback_providers / fallback_model → skip the task (warn)
+ A billing or quota failure quarantines only the failed custom endpoint for the auxiliary health cooldown, not every route registered as custom . A healthy local endpoint with a different base URL remains eligible for fallback and subsequent auto routing. Aliases for the same custom endpoint share its health state. Built-in providers retain their shared-account health checks.
+ Those built-in chains run only when no main provider is selected ( model.provider: auto or unset). Once you have picked a main provider, an unavailable main route with no fallback_chain / fallback_providers skips the auxiliary task with a warning instead of guessing another provider you happen to be logged into — an expired xAI or Codex session must never bill your Nous Portal or OpenRouter balance behind your back. Declare a fallback if you want one.
+ Every task above follows the same provider / model / base_url pattern. Each task can also declare its own fallback_chain ; if omitted, provider: auto uses the top-level fallback_providers chain (the built-in discovery chain applies only when no main provider is selected).
+ Auth errors (HTTP 401) on an explicit provider walk only step 2: if you wrote auxiliary.<task>.fallback_chain , its entries are tried in order (and a chain entry that dies mid-request hands off to the next one); the main agent model and the auto-detection chain are never consulted, because you did not opt that task into them. Without a chain the task fails on the auth error as before. Auth is credential-wide, so chain entries on the same provider label are skipped — point the spare at a different provider (a separate providers: entry counts).
+ fallback_chain (if set) → main agent model → warn + raise, on capacity errors; auth errors (401) walk fallback_chain only
+ Uses delegation.fallback_providers when declared; otherwise only unpinned children inherit the parent chain
+ delegation.provider / delegation.model / delegation.fallback_providers
```

### hermes.docs.mixture-of-agents

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/mixture-of-agents
- Change: changed
- Prior hash: a0698e3a7f71ca04d183baedfed8631261356d18be8375764503e4f89d816bc8
- Current hash: 957ed6a3cb5004f2089cd01834635f2096796c547577e16cd7537c930932dc7a

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
- The aggregator is the acting model. The reference outputs are appended to the end of the latest user turn as private guidance. Because that text sits at the tail — below the entire stable prefix (system prompt + prior history) — it does not invalidate any cached prefix: the aggregator gets a cache hit on everything above the injection, and only the freshly appended tail is new. That is exactly how every normal turn behaves, where each new user message is also uncached tail tokens.
- So MoA does not sacrifice prompt caching on either call type. Its only real cost is the extra reference calls per iteration — you pay for multiple model perspectives, not for broken caches. The long-lived conversation prefix shared with the rest of Hermes is fully intact.
- Configure presets Tuning advisor speed with reference_max_tokens
+ Who pays for a MoA run
+ The aggregator is billed for the whole run : it runs every step of the tool loop, so almost all of a preset's cost lands on the aggregator's provider. References only advise once per user turn (with the default fanout ). If your main model is on a subscription provider but the aggregator sits elsewhere, the run is billed to the aggregator's provider, not to your subscription — hermes moa configure and hermes moa list print a one-line notice whenever the aggregator's provider differs from model.provider , and the Desktop editor, hermes model , and /model mark the aggregator slot as the acting, billed model.
+ Advisor output ​
+ MoA uses provider-owned output limits. Preset and per-slot output-token cap
+ settings are no longer supported. Provider defaults vary; omission does not
+ always mean the model maximum. Native protocols that require an output limit
+ receive an internal value from Hermes.
+ hermes moa list marks the aggregator as the acting model that carries almost all of the cost and lists references as advising once per user turn (by default). When the aggregator's provider differs from your main model.provider , both list and configure add:
+ Aggregator is on nous; the whole tool loop will be billed there, not to openai-codex.
+ The aggregator is the acting model. The reference outputs are appended as their own trailing user message of private guidance — never merged into your message. Because that block sits at the tail — below the entire stable prefix (system prompt + your message + prior tool history) — it does not invalidate any cached prefix: every request in a tool loop is a byte-identical extension of the previous one minus its guidance block, so the aggregator gets a cache hit on everything above the injection and only the freshly appended tail is new. That is exactly how every normal turn behaves, where each new user message is also uncached tail tokens. Aggregators on the Anthropic Messages, Bedrock Converse or native Gemini wire merge the two adjacent user turns into one message, but as separate content blocks: your message's block is byte-identical to the one later iterations replay, and the guidance block follows it, so the cached prefix still runs through your message.
+ On the OpenAI-compatible wire the request ends user(your message), user(guidance) on the first iteration of a turn. A few chat templates that enforce strict user/assistant alternation (llama.cpp and vLLM Jinja templates, some OpenRouter routes) reject that with a 400 such as Conversation roles must alternate . Hermes recovers on its own: it retries that one request with the two adjacent user messages merged, remembers that aggregator destination (endpoint + model) for the rest of the session so later turns are merged up front, and leaves every other destination on the split, cache-stable shape. The merge is applied only where a destination demanded it, because merging everywhere would reintroduce the prefix divergence described above.
+ So MoA does not sacrifice prompt caching on either call type. Its only real cost is the extra reference calls (once per user turn with the default fanout ) — you pay for multiple model perspectives, not for broken caches. The long-lived conversation prefix shared with the rest of Hermes is fully intact.
+ A preset can be a fallback entry ( fallback_providers: [{provider: moa, model: <preset>}] ). When the primary fails, Hermes activates the preset itself — references and aggregator, with moa://local as the virtual endpoint — the same way /model <preset> --provider moa does. The entry is skipped when the preset does not resolve or its aggregator has no credentials.
+ Configure presets Advisor output
```

### hermes.github.releases

- Vendor: Hermes
- Source: https://github.com/NousResearch/hermes-agent/releases
- Change: changed
- Prior hash: 590f469580856ae86715b7e55377ff0ac6d7b84853e782ce1f29ffd941f30a2e
- Current hash: 55a95dac56c0f7dc64aa5f3eca99868d7ea5ef947799edb8c943d516066a69b9

```diff
- 49.7k
- 242k
- Hermes Agent v0.20.0 (2026.8.3)
- Hermes Agent v0.19.1 (v2026.7.30)
- Hermes Agent v0.19.0 (2026.7.20) — The Quicksilver Release
- 112 people reacted
- 84 people reacted
- 68 people reacted
- 42 people reacted
- 54 people reacted
- Hermes Agent v0.20.0 (2026.8.3)
- Hermes Agent v0.20.0 (2026.8.3)
- 03 Aug 16:57
- v2026.8.3
- This tag was signed with the committer’s verified signature .
- Teknium
- SSH Key Fingerprint: x9xNOpeJhoEAY2gWhmWHZROC3QF3VjOEbmNo9vQ8y2A
- Verified
- Learn about vigilant mode .
- 3c27eb6
- Hermes Agent v0.20.0 (v2026.8.3)
- Release Date: August 3, 2026
- Since v0.19.0: ~3,650 commits · ~1,400 merged PRs · ~5,200 files changed · ~559,000 insertions · ~405,000 deletions · ~1,200 issues closed · 650+ contributors
- The Herald Release. Hermes is the herald of the gods, and this release makes him one in earnest: he speaks (real-time conversational voice with streaming TTS, barge-in, on-device wake words, and hands-free control across the CLI, desktop, and every audio-capable gateway platform), he carries word to other agents (A2A v1.0), he announces events to your systems (signed outbound webhooks), and he cites his sources (grounded research with verifiable citations and fact-checking). Around that spine: the desktop app became a platform (artifacts with live preview, a plugin SDK, quick-entry from anywhere, multiple windows), the CLI got a wave of power commands ( ! shell mode, /init , /diff , /context , /focus ), compression got smarter and gentler, and the tools themselves now recover from their own failures instead of making the model guess. This release rolls up everything from the v0.19.1 infrastructure patch tag — that window is fully documented here.
- Talk to Hermes — streaming, conversational voice with barge-in — Voice mode used to mean: speak, wait for the whole reply to generate, then listen to one long audio file. Now Hermes speaks clause-by-clause as the response streams, you can interrupt it mid-sentence by just talking (it stops, listens, and the model is told you cut in), and busy-aware silence detection means it doesn't talk over you. This works in CLI voice mode, on the desktop, and through gateway adapters. Talking to Hermes finally feels like a conversation, not a voicemail exchange. ( #69511 , #73862 , #74223 , #74000 , #69602 — @teknium1 , @OutThisLife )
- Wake words and hands-free control — Say your own open-vocabulary wake phrase ("hey Hermes", or anything you pick) and Hermes starts listening — detection runs on-device, so no audio leaves your machine while it waits. Multi-profile voice routing means different wake words can reach different profiles, and saying "stop" ends the voice chat on every surface without touching the keyboard. Your terminal is now something you can talk to from across the room. ( #70509 , #73106 , #73933 — @teknium1 )
- Voice on every platform — Send a voice note to Hermes on WhatsApp, Feishu, DingTalk, LINE, QQ, Photon, or Weixin and it's transcribed and answered; auto-TTS replies are delivered platform-aware (opus where platforms want opus, captions attached correctly). STT is now fully configurable — its own hermes tools category, GUI toggles, dashboard dropdowns, unified language resolution so transcripts stop coming back in the wrong language, and OpenAI's gpt-transcribe support. One unified spoken-text preprocessor cleans markdown, code, and URLs out of speech across all TTS providers. ( #73515 , #73508 , #73910 , #73513 , #73067 — @teknium1 )
- Research you can trust — grounded citations with fact-checking — The new grounded-citations skill makes Hermes produce research where every claim is backed by a verifiable source: quotes are matched against the actual page text (not hallucinated), citations link to the exact evidence, and a fact-checking mode turns the same machinery on any document or claim you hand it — it tells you what checks out, what doesn't, and what couldn't be verified. If you use Hermes for research, this is the difference between "sounds right" and "provably sourced." ( #71698 , #77104 — @teknium1 )
- Outbound webhooks — Hermes pushes events to your systems — Until now, integrating with Hermes meant polling or listening on a platform. Now Hermes pushes signed lifecycle events (session activity, turn completions, tool events) to any HTTP endpoint you register — with HMAC signatures so your receiver can verify authenticity. Wire Hermes into your CI, your home automation, your dashboards, or any service that speaks HTTP, with no polling loop. ( #69406 — @teknium1 )
- The desktop app becomes a platform — artifacts, plugin SDK, quick entry — Hermes desktop now renders artifacts : versioned cards with sandboxed live preview in a right-rail viewer, so generated HTML/apps run safely next to the chat. A real plugin SDK landed with Kanban as its founding plugin, ctx.download for handing users files, floating pane placement, and multiple GUI windows. A global-hotkey quick-entry window captures a thought into any session from anywhere in your OS. The desktop stopped being a chat client and started being a workbench. ( #72345 , #61173 , #74413 , #72315 , #68259 , #73143 — @OutThisLife , @teknium1 )
- Hermes speaks Agent-to-Agent — A2A v1.0 — A new bundled plugin implements the Agent-to-Agent protocol, so Hermes can discover, talk to, and be driven by other A2A-compatible agents. This closes issue #514 — one of the oldest open feature requests in the repo. If you're building multi-agent systems with heterogeneous stacks, Hermes now has a standard wire protocol for joining them. ( #77109 — @teknium1 )
- CLI power-user wave — !command runs a shell command instantly without spending a model turn. /init scans your project and generates (or updates) an AGENTS.md . /diff shows staged/all/session changes from any surface, /context breaks down exactly what's filling your context window, /focus gives you a reduced-output view with hidden-line recovery, and Ctrl+S stashes a half-written prompt into a browsable panel. Plus hermes import-agent migrates your Claude Code or Codex CLI setup into Hermes in one command. ( #72257 , #72178 , #72240 , #72242 , #72302 , #72262 , #72190 — @teknium1 , several salvaging long-standing community PRs)
- Correct the agent mid-turn — redirects — If Hermes is heading the wrong way, you no longer have to /stop and re-explain. Type a correction while it works and the active turn is redirected: work in flight is preserved, the original prompt is kept, and the agent course-corrects with your new guidance. Paired with double-ESC draft discard and a composer undo stack, steering feels like editing, not restarting. ( #63104 , #72339 , #74736 — @OutThisLife )
- Tools that fix themselves — A sweep of self-recovery upgrades means the agent wastes far fewer turns on tool friction: truncated terminal output spills to a file the agent can read back, patch detects already-applied edits and diagnoses whitespace mismatches, write_file verifies content on disk, searches that match nothing probe for near-misses and recover, and common failure classes come back with actionable hints. The default tool-calling iteration limit also jumped 90 → 500 — long autonomous runs stopped hitting an artificial wall. ( #77041 , #76998 , #77024 , #77055 , #77011 , #76992 , #72176 — @teknium1 )
- Compression that respects your conversation — Context compression got a deep overhaul: proactive tool-result pruning for large-window models, per-turn micro-compaction that amortizes the cost instead of one giant pause, a guaranteed N-user-message tail so recent conversation always survives, progress-aware timeouts that stop punishing slow summary models, and ghost-skill defense so a pruned skill can never silently haunt a session. Thresholds are now configurable per-model and in absolute tokens. Long sessions stay coherent and stop stalling. ( #70254 , #75345 , #70250 , ...
- iRonin, b, and 197 other contributors
- 177 people reacted
- Hermes Agent v0.19.1 (v2026.7.30)
- Hermes Agent v0.19.1 (v2026.7.30)
- 30 Jul 23:45
+ 51.9k
+ 247k
+ Hermes Agent v0.21.3 (v2026.9.14)
+ Hermes Agent v0.21.2 (v2026.9.11)
+ Hermes Agent v0.21.1 (v2026.9.7)
+ Hermes Agent v0.21.3 (v2026.9.14)
+ Hermes Agent v0.21.3 (v2026.9.14)
+ 14 Sep 16:04
+ v2026.9.14
+ 345cd2b
+ Hermes Agent v0.21.3 (v2026.9.14)
+ Release Date: September 14, 2026
+ Patch release. This tag rolls up the ~338 PRs merged since v0.21.2 into a stable tagged release for downstream consumers (Docker images, Hermes Cloud, hosted deployments). It exists so the remote-gateway sign-in fixes below reach Cloud agents, which auto-update to the newest release tag.
+ What this patch ships for remote Desktop / Cloud users
+ Remote dashboard sessions no longer expire on refresh bursts ( #110061 , fixes #55712 ; salvage #71548 @Doud-FR , #55717 @liuhao1024 ). Both refresh paths on the gateway (cookie gate and the desktop's native bearer route) now coalesce concurrent requests carrying the same rotating refresh token, so a Desktop wake burst can no longer replay an already-rotated token into the Portal's reuse detection and revoke the whole session. Refresh also runs off the event loop, so a slow identity provider no longer freezes /api/status . Pairs with Portal-side NousResearch/hermes-portal#1209 (sliding 30-day idle horizon, 5-minute rotated-token grace).
+ Also requested for this tag
+ Long-lived processes stop leaking duplicate state.db writer handles ( #110934 , fixes #100896 #103339 ; salvage #107974 @kshitijk4poor , mapping @Rroven ): gateway, dashboard/Desktop backend, ACP and CLI readers attach read-only and in-process writers share the registry handle, so the N live SessionDB handles precursor stops firing on a healthy topology.
+ Measured at commit 9b419a2d3c2657c192008e732149d61170b32c01 , the window since v0.21.2 contains 1,036 non-merge commits across 2,642 changed files (+131,690 / −37,096) and 338 merged PRs .
+ Also in the window, undocumented here on purpose: server→client JSON-RPC requests and a Pydantic wire-contract registry with generated TS/OpenRPC for the TUI/Desktop gateway ( #110521 , #110522 ); reasoning-effort selection on every model picker, a composer pill and per-auxiliary control in Desktop; OpenRouter OAuth PKCE login; HEIF/HEIC/AVIF image decoding; the Honcho peer-model setup rework; MCP OAuth refresh tokens bound to their issuer; a daily MCP re-auth nudge in Desktop; Wan 3.0, Kling 3.0 / Kling Image v3, MiniMax H3 Max Turbo, Gemini Omni Flash 1.1 and Meta Muse in the FAL catalogs; Slack pasted tables and the Agent Sessions API; multiplexed-profile isolation and gateway-liveness fixes; and the state.db WAL refusal on cross-VM filesystems.
+ Full curated release notes for this window ship with v0.22.0 , which will document everything from v0.21.0 onward — highlights, feature areas, and complete contributor credits. Nothing in this window is skipped.
+ hermes update (git installs), or re-run the installer one-liner.
+ Docker / Hermes Cloud: images build from this tag ( nousresearch/hermes-agent:v2026.9.14 ).
+ Full changelog: v2026.9.11...v2026.9.14
+ Rroven, liuhao1024, and 2 other contributors
+ 59 people reacted
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
… diff truncated (89 added / 90 removed lines)
```

### openai.api.changelog

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/changelog
- Change: changed
- Prior hash: 5bdc521726ff9dc7c3a2b1f5aca76cb13626f76ef5c56c4d029d7da314097e09
- Current hash: fb750c8d560511060c833e99c6d33876d42fe6b542068e26819f6389fbeeb9f1

```diff
- Updated the [Realtime and audio guide](https://developers.openai.com/api/docs/guides/realtime), added a dedicated [Realtime translation guide](https://developers.openai.com/api/docs/guides/realtime-translation), refreshed [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription) for streaming transcripts, and moved realtime prompting guidance into [Using realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting).
- Expanded `input_file` support to accept more document, presentation, spreadsheet, code, and text file types. Learn more [here](https://developers.openai.com/api/docs/guides/file-inputs).
- Added dedicated SIP IP ranges for Realtime API. `sip.api.openai.com` does GeoIP routing, and will direct SIP traffic to the closest region. [Learn more](https://developers.openai.com/api/docs/guides/realtime-sip#dedicated-sip-ip-ranges).
+ ### Sep 15
+ Added API key creation governance controls at the organization and project levels. Administrators can allow only service-account keys, allow only user-owned project keys, or disable all new API key creation. Organization restrictions take precedence over project settings, and existing API keys are unaffected. See [production best practices](https://developers.openai.com/api/docs/guides/production-best-practices#api-keys) for details.
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
+ Expanded `input_file` support in the Responses API to accept more document, presentation, spreadsheet, code, and text file types. Learn more [here](https://developers.openai.com/api/docs/guides/file-inputs).
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
- Current hash: 637a13fbacdb590110f90062a7b4e00ebbf4fe589618c1af98e7d74d15c1b1a3

```diff
- Overview Models Agents Tools Voice & Audio Production API reference
- Overview Models Agents Tools Voice & Audio Production API reference Models
- MCP and Connectors
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
- Workload identity federation Codex setup
- Federation rules
- Admin API
- API Partner Setup
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Workload identity
- Meetups
- Meetups
- Meet the winners of OpenAI Build Week
- Meetups
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
+ MCP servers
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
… diff truncated (57 added / 30 removed lines)
```

### openai.api.token-counting

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/guides/token-counting
- Change: changed
- Prior hash: 532908feecb03315a2ca9951cec147d5c02389665439096e7bb42c082597f564
- Current hash: d6c99ccc1f75225f070c669e86b16fc7aa23300ffe52a4135a0e5b8fb52e54b5

```diff
- - **Route requests** based on size (e.g., smaller prompts to faster models)
- The [input token count endpoint](https://developers.openai.com/api/reference/python/resources/responses/subresources/input_tokens/methods/count) accepts the same input format as the [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create). Pass text, messages, images, files, tools, or conversations—the API returns the exact count the model will receive.
- - **Model-specific behavior** can change tokenization (e.g., reasoning, caching)
- {role: :user, content: "What is 2 + 2?"},
- {role: :assistant, content: "2 + 2 equals 4."},
- {role: :user, content: "What about 3 + 3?"}
- {type: :input_text, text: "Summarize this chart."}
- properties: {location: {type: "string"}},
- [File inputs](https://developers.openai.com/api/docs/guides/file-inputs)—currently PDFs—are supported. Pass `file_id`, `file_url`, or `file_data` as you would for `responses.create`. The token count reflects the model’s full processed input.
- For full parameters and response shape, see the [Count input tokens API reference](https://developers.openai.com/api/reference/python/resources/responses/subresources/input_tokens/methods/count). The endpoint is:
+ - **Route requests** based on size (for example, smaller prompts to faster models)
+ The [input token count endpoint](https://developers.openai.com/api/reference/resources/responses/subresources/input_tokens/methods/count) accepts the same input format as the [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create). Pass text, messages, images, files, tools, or conversations—the API returns the exact count the model will receive.
+ - **Model-specific behavior** can change tokenization (for example, reasoning, caching)
+ content: "What is 2 + 2?"
+ role: :assistant,
+ content: "2 + 2 equals 4."
+ content: "What about 3 + 3?"
+ type: :input_text,
+ text: "Summarize this chart."
+ [File inputs](https://developers.openai.com/api/docs/guides/file-inputs) (currently PDFs) are supported. Pass `file_id`, `file_url`, or `file_data` as you would for `responses.create`. The token count reflects the model’s full processed input.
+ For full parameters and response shape, see the [Count input tokens API reference](https://developers.openai.com/api/reference/resources/responses/subresources/input_tokens/methods/count). The endpoint is:
```

### openai.codex.changelog

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/changelog
- Change: changed
- Prior hash: e8b0c9fbf58fb1fae26839a2d290154deb8ee2e374d716f678e02346548840fd
- Current hash: 2902728954d4b0e3fb2db00ba5e265bae0e7b53a18b39c3fd97cb03904d00fcc

```diff
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- MCP and Connectors
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
- Workload identity federation Codex setup
- Federation rules
- Admin API
- API Partner Setup
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Workload identity
- Meetups
- Meetups
- Meet the winners of OpenAI Build Week
- Meetups
- li+li]:mt-12"> 2026-09-04
- server instead. To use Codex from Claude Code, use the Codex
- plugin for Claude Code .
- Codex CLI 0.149.0
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.149.0
- Added an interactive codex agents dashboard for searching, starting, opening, renaming, and stopping tasks, with configurable shortcuts. ( #39094 , #39112 , #39114 , #39142 )
- Added /cd , /pwd , and /cwd commands for managing the working directory in TUI sessions. ( #38894 )
- Added codex queue for sending messages to existing local or remote sessions. ( #39092 )
- Expanded Vim editing with character replacement and more change motions such as cw , c$ , and cc . ( #39661 )
- codex doctor now diagnoses endpoint protection, network/proxy failures, desktop app state, and update connectivity. ( #38827 , #38918 , #39060 , #39074 )
- SDK users can now pass exact CLI config overrides and select max or ultra reasoning effort. ( #38817 , #39662 )
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
+ MCP servers
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
+ Workload identity federation Federation rules
… diff truncated (649 added / 1055 removed lines)
```

### openai.codex.models

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/models
- Change: changed
- Prior hash: a1d747122bcb7a290eba962315d8ffb3a0085d204ef5c1e00595f3b047ee8332
- Current hash: e26e66bc08eaad7283a9af23e544156ba7fe0e7b40a2eb6491ac14fdd1325f56

```diff
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- MCP and Connectors
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
- Workload identity federation Codex setup
- Federation rules
- Admin API
- API Partner Setup
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Workload identity
- Meetups
- Meetups
- Meet the winners of OpenAI Build Week
- Meetups
- 5.3 Codex Spark
- Text-only research preview model optimized for near-instant, real-time coding iteration. Available to ChatGPT Pro users.
- codex -m gpt-5.3-codex-spark
- This experiment is off by default and isn't available with Business, Enterprise, or
- needs strong reasoning and tool use when you do not need Sol's full depth. It
- There is no exact mapping from GPT-5.5 reasoning efforts to GPT-5.6. Try a
- familiar task at a lower setting and adjust based on the result.
- don't see Max in your options, you'll have to enable it in your app settings.
- If Ultra doesn't appear in the desktop app's model slider, go to
- aren't affected.
- Previous-generation flagship model for complex coding, computer use, knowledge work, and research workflows.
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
+ MCP servers
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
+ Workload identity federation Federation rules
… diff truncated (72 added / 43 removed lines)
```

### openai.codex.plan-usage

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/pricing
- Change: changed
- Prior hash: 8cac49415a6fc9271c1ac405e9ee3464e585c1c1ee8a97976f1d5f63dc7413e6
- Current hash: d381e61031752cc334281a61ab4eb6ca9457c0c24abf11d9ce19b28ff612bbb0

```diff
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- MCP and Connectors
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
- Workload identity federation Codex setup
- Federation rules
- Admin API
- API Partner Setup
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Workload identity
- Meetups
- Meetups
- Meet the winners of OpenAI Build Week
- Meetups
- Access to GPT-5.3-Codex-Spark (research preview), a fast Codex model
- for day-to-day coding tasks
- Unlimited ChatGPT Voice on the $200/month tier; tasks still draw from
- your Codex usage budget
- recipient's email address, and send the invitation.
- Referrals aren't currently available for ChatGPT Enterprise.
- 30 days after they're granted. Business referrals use separate shared-workspace
- so prompt length alone isn't a reliable estimate.
- Local messages and cloud chats share your plan's usage allowance. Weekly
- depending on image quality and size. GPT-5.3-Codex-Spark is in research preview
- for ChatGPT Pro users only, and isn't available in the API at launch. Because it
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
+ MCP servers
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
+ Workload identity federation Federation rules
… diff truncated (74 added / 67 removed lines)
```

## Volatile noise (ignored)

- `anthropic.claude-code.legal` — https://code.claude.com/docs/en/legal-and-compliance
- `anthropic.platform.access-transparency` — https://platform.claude.com/docs/en/manage-claude/access-transparency
- `anthropic.platform.authentication` — https://platform.claude.com/docs/en/manage-claude/authentication
- `apify.cli.changelog` — https://docs.apify.com/cli/docs/changelog
- `apify.integrations.mcp` — https://docs.apify.com/integrations/mcp
- `apify.platform.changelog` — https://apify.com/change-log?_format=html
- `firecrawl.github.releases` — https://github.com/firecrawl/firecrawl/releases
- `gemini.api.rate-limits` — https://ai.google.dev/gemini-api/docs/rate-limits
