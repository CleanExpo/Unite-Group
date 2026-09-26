# Nexus vendor-intelligence review

Generated: 2026-09-26T17:21:31.705Z

Summary: 36 sources reviewed; 29 material; 6 volatile noise; 1 unchanged.

## Material changes

### anthropic.claude-code.changelog

- Vendor: Anthropic
- Source: https://code.claude.com/docs/en/changelog
- Change: changed
- Prior hash: 3f6f83405e574480ef3eb66c8183dd6c984f9bb6f6fdcaef3d7abd287cf6d236
- Current hash: ee5c0d9c979991799a171e1675e1f0617239f2b4158a4de90f77e2e089c3d716

```diff
- * Changed hook output over 50K characters to be saved to disk with a file path + preview instead of being injected directly into context
+ <Update label="2.1.283" description="September 25, 2026">
+ * Added `x-claude-code-prompt-id` to the gateway hint headers so LLM gateways can group the requests that serve one user prompt; opt in with `CLAUDE_CODE_GATEWAY_HINT_HEADERS=1`
+ * Added `availableModelsMatch` managed setting: with `"exact"`, an `availableModels` entry allows only the model version it names, so new releases stay blocked until listed
+ * Added `deniedModels` managed setting to block specific models, even when `availableModels` allows them
+ * Added MCP tool, WebFetch and WebSearch outputs to the `tool.output` OpenTelemetry span event when `OTEL_LOG_TOOL_CONTENT=1`
+ * Added `/doctor prompt-audit` (also `/checkup prompt-audit`) to audit your CLAUDE.md files, skills, agents and commands for prompting patterns written for older models
+ * Added click-to-expand for truncated messages from your other sessions in fullscreen mode
+ * Added `path` to `--plugin-dir` load-failure entries in the stream-json `system/init` `plugin_errors`, naming the directory that did not load
+ * Added an opt-in `load_test_mode` block to the Claude apps gateway config: requests are built and signed but not sent upstream, and clients get a canned reply, so a deployment can be load tested
+ * Added a `mantle` upstream provider to the Claude apps gateway for Amazon Bedrock's Mantle endpoint
+ * Fixed SDK sessions losing a deferred tool call or finished tool result when a turn ended early, a held approval prompt after a worker restart, and a non-streaming fallback's `result.usage`
+ * Fixed MCP progress notifications being discarded once a long-running tool call moved to the background; the background task now shows the latest progress
+ * Fixed stdio MCP servers being left running when the session ended while they were still starting
+ * Fixed a brief HTTP 404 from a stateless remote MCP server (for example a proxy mid-redeploy) leaving that server unusable for the rest of the session while still shown as connected
+ * Fixed MCP sign-in for a server with no valid URL failing with an opaque SDK error; `/mcp` no longer offers Authenticate for such servers
+ * Fixed the weekly Fable limit not appearing in `/usage` and the VS Code usage meters when telemetry is disabled
+ * Fixed `/model` accepting Sonnet 4.6 or Sonnet 5 with `[1m]` when the id carried a date or `-v1:0` suffix, in the cases where the plain id was refused
+ * Fixed `/model` picker showing a hardcoded Haiku version and price when `ANTHROPIC_DEFAULT_HAIKU_MODEL` pins a different model
+ * Fixed dynamic workflows started during a model fallback running every agent on the fallback model instead of retrying the configured model
+ * Fixed `DISABLE_PROMPT_CACHING_HAIKU` having no effect when Haiku is the session's main model
+ * Fixed `claude plugin validate` saying Claude Code accepts a plugin or marketplace name it cannot install; such names in `marketplace.json` now fail validation
+ * Fixed `claude plugin validate` passing plugins whose `outputStyles`, `themes`, `monitors`, or `lspServers` paths are missing or point outside the plugin directory
+ * Fixed `claude plugin details` showing 0 MCP servers for plugins that declare their servers in `plugin.json`
+ * Fixed `claude plugin marketplace remove` not saying which installed plugins it uninstalled with the marketplace; it now lists them
+ * Fixed `claude plugin uninstall` removing the other of two installed plugins whose ids differ only in case, with its options and secrets, when the one named had no `enabledPlugins` entry at that scope
+ * Fixed plugins that declare no version being silently restored at their source's newest commit, not the installed one, when their cached files were missing
+ * Fixed user-installed plugins and marketplaces failing to load with "cache-miss" after the home or config directory was moved, for example in bind-mounted devcontainers
+ * Fixed `installed_plugins.json` showing no plugins when it holds a record under an invalid plugin id; such a file loads again
+ * Fixed `installed_plugins.json` being rewritten, losing records, when it holds a record this version cannot read; `claude plugin` commands now name the record and say how to recover
+ * Fixed permission dialogs in screen-reader mode reading quoted commands and paths as if they were the dialog's own text
+ * Fixed `/context` not counting MCP server instructions: they now appear as their own row and count toward the total
+ * Fixed markdown links in the Warp terminal rendering as plain text instead of clickable hyperlinks
+ * Fixed `claude mcp add`, `add-json`, and `remove` reporting success when the user or local config file could not be written, for example inside a sandbox
+ * Fixed the first words of a reply in a cloud session sometimes appearing late instead of streaming as Claude writes them
+ * Fixed Claude's built-in keybindings guide saying chords time out after 1 second instead of 3, and calling `cmd` an alias of `meta`, which could produce `cmd+` shortcuts most terminals never send
+ * Fixed `keybindings.json` silently accepting a misspelled modifier such as `ctl+k`; it now warns in the debug log and suggests the fix
+ * Fixed footer hints still saying "Enter to view" after `footer:openSelected` was rebound or unbound in `keybindings.json`
+ * Fixed keys typed quickly together (type-ahead, key repeat, bursts over ssh or tmux) sometimes being handled against stale state
+ * Fixed worktree checkouts failing certificate verification (for example on Git LFS downloads) when the CA certificate is passed to git as `GIT_CONFIG_COUNT` environment pairs
+ * Fixed sandboxed `git` asking credential helpers to store the sandbox proxy's login, which printed "failed to store"
… diff truncated (1243 added / 1 removed lines)
```

### anthropic.platform.authentication

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/authentication
- Change: changed
- Prior hash: bfedc8ac0f35c27b64d6594a36fb1b06bc2bb1032937edcb148492a04ae34a41
- Current hash: f4a7952462971644cdcfc38f5723ebf0e72f5bf4018d5982125b874672b16f69

```diff
- Store API keys in a secrets manager, rotate them periodically, and disable or delete any key you suspect has leaked. On the [API keys page](https://platform.claude.com/settings/keys), **Disable** is reversible (the Admin API reports the key's `status` as `"inactive"`, and **Re-enable** returns it to `"active"`), while **Delete** is permanent: the key is archived and still appears in [List API Keys](https://platform.claude.com/docs/en/api/admin/api_keys/list) with `status: "archived"`. Expired keys can only be deleted. You can also set an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration) when you create a key to limit how long a leaked credential stays usable.
- "model": "claude-opus-5",
- You can find a workspace's ID in the **ID** column of [Settings → Workspaces](https://platform.claude.com/settings/workspaces) in the Claude Console, or by calling the [List Workspaces](https://platform.claude.com/docs/en/api/admin/workspaces/list) endpoint. List Workspaces omits the Default Workspace; its ID is in the `anthropic-workspace-id` [response header](https://platform.claude.com/docs/en/manage-claude/workspaces#identify-the-workspace-behind-an-api-response) of any request that runs there.
- "model": "claude-opus-5",
- --model claude-opus-5 \
- model="claude-opus-5",
- model: "claude-opus-5",
- Model = Model.ClaudeOpus5,
- Model: anthropic.ModelClaudeOpus5,
- .model(Model.CLAUDE_OPUS_5)
- model: Model::CLAUDE_OPUS_5,
- model: Anthropic::Model::CLAUDE_OPUS_5,
- The Console API keys table shows each key's expiration, and the Admin API reports each key's `expires_at` timestamp on the [List API Keys](https://platform.claude.com/docs/en/api/admin/api_keys/list) and [Retrieve API Key](https://platform.claude.com/docs/en/api/admin/api_keys/retrieve) endpoints, so you can audit and rotate keys before they expire. The field is `null` for keys without an expiration.
+ Store API keys in a secrets manager, rotate them periodically, and disable or delete any key you suspect has leaked. On the [API keys page](https://platform.claude.com/settings/keys), **Disable** is reversible (the Admin API reports the key's `status` as `"inactive"`, and **Re-enable** returns it to `"active"`), while **Delete** is permanent: the key is archived and still appears in [List API Keys](https://platform.claude.com/docs/en/api/beta/organization/api_keys/list) with `status: "archived"`. Expired keys can only be deleted. You can also set an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration) when you create a key to limit how long a leaked credential stays usable.
+ "model": "claude-opus-5-5",
+ You can find a workspace's ID in the **ID** column of [Settings → Workspaces](https://platform.claude.com/settings/workspaces) in the Claude Console, or by calling the [List Workspaces](https://platform.claude.com/docs/en/api/beta/organization/workspaces/list) endpoint. List Workspaces omits the Default Workspace; its ID is in the `anthropic-workspace-id` [response header](https://platform.claude.com/docs/en/manage-claude/workspaces#identify-the-workspace-behind-an-api-response) of any request that runs there.
+ "model": "claude-opus-5-5",
+ --model claude-opus-5-5 \
+ model="claude-opus-5-5",
+ model: "claude-opus-5-5",
+ Model = Model.ClaudeOpus5_5,
+ Model: anthropic.ModelClaudeOpus5_5,
+ .model(Model.CLAUDE_OPUS_5_5)
+ model: Model::CLAUDE_OPUS_5_5,
+ model: Anthropic::Model::CLAUDE_OPUS_5_5,
+ The Console API keys table shows each key's expiration, and the Admin API reports each key's `expires_at` timestamp on the [List API Keys](https://platform.claude.com/docs/en/api/beta/organization/api_keys/list) and [Retrieve API Key](https://platform.claude.com/docs/en/api/beta/organization/api_keys/retrieve) endpoints, so you can audit and rotate keys before they expire. The field is `null` for keys without an expiration.
```

### anthropic.platform.data-retention

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- Change: changed
- Prior hash: 433cd20a2b6f30d93b4c944a869839e3568deb5e5597a4daf9e4ac4b1f0e17c0
- Current hash: ba769a92aced22c0bde02ec9057c9ba442a7e968530358ccb926371ff31762fd

```diff
- Several retention models sit outside the ZDR and HIPAA arrangements described on this page. Data accessible through the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) follows its own retention model. The [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) retains data for 6 years. Chat, file, and project content from claude.ai follows your organization's retention policy set in [claude.ai > Organization settings > Data and privacy](https://claude.ai/admin-settings/data-privacy-controls). [Local session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions) (from sessions on users' machines, in apps such as Cowork and Claude Code) are stored for 6 years by default, or for your organization's custom conversation retention period when a finite one is set (the same claude.ai setting). [Remote session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions) (Cowork in the cloud) are retained for 6 years, unless a user deletes the session sooner. The Compliance API does not capture local sessions for which ZDR is in effect, or any local sessions from organizations with HIPAA readiness enabled.
- | [Context management (compaction)](https://platform.claude.com/docs/en/build-with-claude/compaction) | `/v1/messages` (with `context_management`) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Server-side compaction results are returned and round-tripped statelessly through the API response. |
+ Several retention models sit outside the ZDR and HIPAA arrangements described on this page. Data accessible through the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) follows its own retention model. The [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) retains data for 6 years. Chat, file, and project content from claude.ai follows your organization's retention policy set in [claude.ai > Organization settings > Data and privacy](https://claude.ai/admin-settings/data-privacy-controls), unless a user deletes it sooner. [Local session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions) (from sessions on users' machines, in apps such as Cowork and Claude Code) are stored for 6 years by default, or for your organization's custom conversation retention period when a finite one is set (the same claude.ai setting). [Remote session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions) (Cowork in the cloud) are retained for 6 years, unless a user deletes the session sooner. The Compliance API does not capture local sessions for which ZDR is in effect, or any local sessions from organizations with HIPAA readiness enabled.
+ | [Context management (compaction)](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold) | `/v1/messages` (with `context_management`) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Server-side compaction results are returned and round-tripped statelessly through the API response. |
```

### anthropic.platform.release-notes

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/release-notes/overview
- Change: changed
- Prior hash: 6ad4dafb0e1ebb480b0fc37f66899ce0169662bc9265b5c3f82256c6d50535ba
- Current hash: 01ce16900606ca2796ddfc5d51bd5e818bc0f95a57dc1528426fe1707a48f3bd

```diff
- * The guides for the Claude Enterprise endpoints of the [Admin API](https://platform.claude.com/docs/en/api/admin) ([user management](https://platform.claude.com/docs/en/manage-claude/user-management) and [spend limits](https://platform.claude.com/docs/en/manage-claude/spend-limits-api)), the [Claude Enterprise Analytics API](https://platform.claude.com/docs/en/manage-claude/analytics-api), and the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) now show the `anthropic-version` header; send it on every request to these endpoints, as in the rest of the Claude API. See [API versions](https://platform.claude.com/docs/en/api/versioning).
- * The [Admin API](https://platform.claude.com/docs/en/api/admin) user-management endpoints for **Claude Enterprise** (claude.ai) organizations (members, invites, groups, and custom roles) are out of beta. The `anthropic-beta: ce-user-management-2026-07-13` header is no longer required on group and custom-role requests; requests that still send it are accepted unchanged. See [User management](https://platform.claude.com/docs/en/manage-claude/user-management).
- * We've launched **Claude Opus 5** (`claude-opus-5`), a step-change improvement over Claude Opus 4.8. Claude Opus 5 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) (both the default and the maximum), 128k max output tokens, and [thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) on by default, at $5 / $25 USD per MTok, the same pricing as Claude Opus 4.8. It's available on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws), [Claude on Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/whats-new-opus-5) for new features, behavior changes, and migration guidance, and the [models overview](https://platform.claude.com/docs/en/models/overview) for complete specs.
- * On Claude Opus 5, disabling thinking is allowed only at effort `high` or below: `thinking: {"type": "disabled"}` with effort `xhigh` or `max` returns a 400 error, a breaking change from Claude Opus 4.8. See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/whats-new-opus-5#behavior-changes).
- * We've removed [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) for Claude Opus 4.7. Requests to `claude-opus-4-7` with `speed: "fast"` now return an error; unlike Claude Opus 4.6, they do not fall back to standard speed. Claude Opus 4.7 itself remains available at standard speed. To continue using fast mode, migrate to [Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/migration-guide#migrating-from-claude-opus-47) or Claude Opus 4.8. Read more in [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode#supported-models).
- * You can now manage the people in your **Claude Enterprise** (claude.ai) organization with the [Admin API](https://platform.claude.com/docs/en/api/admin), in beta for all Claude Enterprise organizations: list members and look them up by email address, change a member's role, remove members, send and withdraw invites, manage groups and their membership, and read custom roles. Group and custom-role requests require the `anthropic-beta: ce-user-management-2026-07-13` beta header; member and invite requests take no beta header. An Admin API key with the `read:org_audit` scope can also call every user-management `GET` endpoint. See [User management](https://platform.claude.com/docs/en/manage-claude/user-management).
- * You can now set an expiration when you create an API key or an Admin API key in the [Claude Console](https://platform.claude.com/settings/keys). Choose a preset, a custom duration, or **Never**. For keys with a lifetime of at least 7 days, Anthropic emails the creator before expiration. Existing keys are unaffected. The Admin API reports each key's expiration in the [`expires_at`](https://platform.claude.com/docs/en/api/admin/api_keys/list) field. See [Authentication](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration).
- * We've launched **Claude Fable 5** (`claude-fable-5`), our most capable widely released model, alongside **Claude Mythos 5** (`claude-mythos-5`) for Project Glasswing participants. Both models support a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) by default, 128k max output tokens, and always-on [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking). See [Introducing Claude Fable 5 and Claude Mythos 5](https://platform.claude.com/docs/en/models/fable-5/introducing-claude-fable-5-and-claude-mythos-5) for capabilities, API changes, and availability.
- * We've launched **Claude Opus 4.8** (claude-opus-4-8), our most capable widely released model. Claude Opus 4.8 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) by default on the Claude API, Amazon Bedrock, Google Cloud, and Microsoft Foundry, 128k max output tokens, and the same set of tools and platform features as Claude Opus 4.7. See the [migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide) for baseline settings, features, and migration guidance.
- * We've launched [Claude Opus 4.7](https://www.anthropic.com/news/claude-opus-4-7), our most capable widely released model for complex reasoning and agentic coding, at the same $5 / $25 per MTok pricing as Opus 4.6. See [What's new in Claude Opus 4.7](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7) for capability improvements, new features, and the updated tokenizer. Opus 4.7 includes API breaking changes versus Opus 4.6; see the [migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide) before upgrading.
- * We've launched [Claude Sonnet 4.6](https://www.anthropic.com/news/claude-sonnet-4-6), our latest balanced model combining speed and intelligence for everyday tasks. Sonnet 4.6 delivers improved agentic search performance while consuming fewer tokens. Sonnet 4.6 supports [extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking) and a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) (beta). See [Models & Pricing](https://platform.claude.com/docs/en/about-claude/models) for details.
- * We've launched the [compaction API](https://platform.claude.com/docs/en/build-with-claude/compaction) in beta, providing server-side context summarization for effectively infinite conversations. Available on Opus 4.6.
- * We've launched [Claude Opus 4.5](https://www.anthropic.com/news/claude-opus-4-5), our most intelligent model combining maximum capability with practical performance. Ideal for complex specialized tasks, professional software engineering, and advanced agents. Features step-change improvements in vision, coding, and computer use at a more accessible price point than previous Opus models. Learn more in [Models overview](https://platform.claude.com/docs/en/about-claude/models).
- * We've launched [Claude Haiku 4.5](https://www.anthropic.com/news/claude-haiku-4-5), our fastest and most intelligent Haiku model with near-frontier performance. Ideal for real-time applications, high-volume processing, and cost-sensitive deployments requiring strong reasoning. Learn more in [Models overview](https://platform.claude.com/docs/en/about-claude/models).
- * We've added a new endpoint to the Admin API for retrieving organization information. For details, see the [Organization Info Admin API reference](https://platform.claude.com/docs/en/api/admin-api/organization/get-me).
- * We've launched [Claude Opus 4.1](https://www.anthropic.com/news/claude-opus-4-1), an incremental update to Claude Opus 4 with enhanced capabilities and performance improvements.\* Learn more in [Models overview](https://platform.claude.com/docs/en/about-claude/models).
- * We've launched [Claude Opus 4 and Claude Sonnet 4](https://www.anthropic.com/news/claude-4), our latest models with extended thinking capabilities. Learn more in [Models overview](https://platform.claude.com/docs/en/about-claude/models).
- * We've launched [Claude Sonnet 3.7](https://www.anthropic.com/news/claude-3-7-sonnet), our most intelligent model yet. Claude Sonnet 3.7 can produce near-instant responses or show its extended thinking step-by-step. One model, two ways to think. Learn more about all Claude models in [Models overview](https://platform.claude.com/docs/en/about-claude/models).
- * We've added support for a [delete endpoint](https://platform.claude.com/docs/en/api/deleting-message-batches) in the Message Batches API.
+ ### September 24, 2026
+ * We're resuming billing for refusals that arrive before any output when `stop_details.category` is `"bio"`, `"frontier_llm"`, or `"reasoning_extraction"`, the categories where we measure low volumes of false positives. Mid-stream refusals were already billed. Refusals billed under this change are charged like any other request, at the rates of the model that ran it. Refusals before any output in other categories are still not billed, and fallback credit is unchanged. This change applies on all platforms. See [How refusals are billed](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback#how-refusals-are-billed).
+ * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) local session endpoints are out of beta for Claude for Microsoft 365 sessions in Excel, PowerPoint, Word, and Outlook (`product_surface` values beginning with `office_agents`). See [Sessions on users' machines](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions).
+ * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) no longer returns file names, project document names, or artifact titles. The `filename` and `title` fields on file, project document, and artifact activities are now always empty or omitted, including on activities recorded before this change. To look up a name or title by the ID on the activity, use a Compliance Access Key with the `read:compliance_user_data` scope. See [Understand the Activity object](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed#understand-the-activity-object).
+ ### September 23, 2026
+ * [Cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics) is out of beta on the Claude API and no longer requires the `cache-diagnosis-2026-04-07` beta header. Include the `diagnostics` object on a Messages request to opt in; requests that still send the header work as before. Responses from `POST /v1/messages` now always include the `diagnostics` field, which is `null` when the request did not include the `diagnostics` object.
+ ### September 22, 2026
+ * We've launched **Claude Opus 5.5** (`claude-opus-5-5`), a model for long-running agentic coding and knowledge work. It has a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) by default, 128k max output tokens, and always-on [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking), at $4 / $20 USD per MTok (Claude Opus 5 is $5 / $25). Claude Opus 5.5 is available on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws), [Claude on Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What's new in Claude Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5) for capabilities, API changes, and migration guidance.
+ * On Claude Opus 5.5, thinking can't be disabled: `thinking: {"type": "disabled"}` and `thinking: {"type": "enabled", ...}` return a 400 error. Omit the `thinking` field and control thinking depth with the [effort parameter](https://platform.claude.com/docs/en/build-with-claude/effort). `tool_choice` types `any` and `tool` also return a 400 error, as on Claude Fable 5.1; use `auto` with [strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use). On the Claude API and Google Cloud, [computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) on this model requires the `computer_toolset_20260801` toolset and the earlier `computer_20251124` tool returns a 400 error; on Amazon Bedrock, `computer_20251124` keeps working. See the [migration guide](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-5).
+ * [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) (research preview) is available for Claude Opus 5.5 on the Claude API.
+ * Tools can now be defined inside a [mid-conversation system message](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages#define-tools-in-a-message-beta), in beta on the Claude API with the `inline-tools-2026-09-15` beta header. A `tool_addition` block can carry the tool's full definition (`tool: {"type": "tool_definition", "definition": {...}}`), so you can add a tool, change its schema, or move a server tool to a newer version without editing `tools` or invalidating the prompt cache. The same header covers adding and removing tools by reference. With the MCP connector's `mcp-client-2026-09-15` beta header as well, the definition can be an MCP toolset, and a response records each server's fetched tool list in an `mcp_tool_listing` block, which pins that list when you send it back.
+ ### September 18, 2026
+ * For [cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics), a response to a request that sends the `cache-diagnosis-2026-04-07` beta header now always includes the `diagnostics` field. The field is `null` when the request did not include the `diagnostics` object. Previously the field was omitted in that case.
+ * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) local session endpoints now also return transcripts of Claude in Chrome sessions (`product_surface` value `claude_in_chrome`), in beta for Claude Enterprise organizations, with your existing Compliance Access Key and the `read:compliance_user_data` scope. See [Sessions on users' machines](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions).
+ ### September 14, 2026
+ * The Messages API can now [compact a conversation on demand](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand) on the Claude API, in beta with the `compact-2026-09-04` beta header. Send the top-level `compaction` parameter, and the API returns a signed `compaction` block that summarizes the messages you sent. On later requests, send that block first, in place of those messages. You choose when to compact, the request can run in the background, and you can keep recent turns word for word after the summary. On models with preserved thinking, the thinking in those kept turns can stay valid.
+ * With the `thinking-binding-controls-2026-08-01` beta header, the `input_transformations` response field gains a second entry type, `thinking_mismatch_allowed`. It names a thinking block that failed the prefix check on a request where the API doesn't enforce that check: on Claude Fable 5.1, for example, a request from an account created before August 31, 2026, with `prefix_mismatch_behavior` unset. The block still reaches the model unchanged. Log these entries to find history edits in production traffic before you opt into enforcement. See [Set the mismatch behavior and read `input_transformations`](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking#preserved-thinking-controls).
+ ### September 10, 2026
+ * Claude Managed Agents permission policies now include `auto`: the server evaluates each agent or MCP tool call and runs it, denies it, or pauses for your approval. `agent.tool_use` and `agent.mcp_tool_use` events report how each call was evaluated in an `evaluation` field alongside `evaluated_permission`. See [Let the server evaluate each call with `auto`](https://platform.claude.com/docs/en/managed-agents/permission-policies#let-the-server-evaluate-each-call-with-auto).
+ * Version 1.32.0 of the `ant` CLI adds `ant beta:sessions connect`, which attaches your terminal to a Claude Managed Agents session. You can follow the session live, send messages, and allow or deny tool calls that are waiting for approval. Pass `--web` to serve the Claude Console's session viewer locally and open the session there instead. See [Connect to a Managed Agents session from your terminal](https://platform.claude.com/docs/en/cli-sdks-libraries/cli/sessions-connect).
+ ### September 9, 2026
+ * For [cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics), the API now stores a request's fingerprint only when the request includes the `diagnostics` object. A request that sends only the `cache-diagnosis-2026-04-07` beta header is still accepted, but no fingerprint is stored. A later turn that points `previous_message_id` at it reports `previous_message_not_found`. Include `diagnostics` on every turn, with `"previous_message_id": null` on the first.
+ * [Per-message effort](https://platform.claude.com/docs/en/build-with-claude/effort#change-effort-mid-conversation-beta) changes, in beta, are also available on [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai) for Claude Fable 5.1, Claude Mythos 5.1, and Claude Opus 5, with the same `mid-conversation-output-config-2026-07-01` beta header.
+ * The guides for the Claude Enterprise endpoints of the [Admin API](https://platform.claude.com/docs/en/api/beta/organization) ([user management](https://platform.claude.com/docs/en/manage-claude/user-management) and [spend limits](https://platform.claude.com/docs/en/manage-claude/spend-limits-api)), the [Claude Enterprise Analytics API](https://platform.claude.com/docs/en/manage-claude/analytics-api), and the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) now show the `anthropic-version` header; send it on every request to these endpoints, as in the rest of the Claude API. See [API versions](https://platform.claude.com/docs/en/api/versioning).
+ * The [Admin API](https://platform.claude.com/docs/en/api/beta/organization) user-management endpoints for **Claude Enterprise** (claude.ai) organizations (members, invites, groups, and custom roles) are out of beta. The `anthropic-beta: ce-user-management-2026-07-13` header is no longer required on group and custom-role requests; requests that still send it are accepted unchanged. See [User management](https://platform.claude.com/docs/en/manage-claude/user-management).
+ * We've launched **Claude Opus 5** (`claude-opus-5`), a step-change improvement over Claude Opus 4.8. Claude Opus 5 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) (both the default and the maximum), 128k max output tokens, and [thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) on by default, at $5 / $25 USD per MTok, the same pricing as Claude Opus 4.8. It's available on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws), [Claude on Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/overview) for new features, behavior changes, and migration guidance, and the [models overview](https://platform.claude.com/docs/en/models/overview) for complete specs.
+ * On Claude Opus 5, disabling thinking is allowed only at effort `high` or below: `thinking: {"type": "disabled"}` with effort `xhigh` or `max` returns a 400 error, a breaking change from Claude Opus 4.8. See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/overview).
+ * We've removed [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) for Claude Opus 4.7. Requests to `claude-opus-4-7` with `speed: "fast"` now return an error; unlike Claude Opus 4.6, they do not fall back to standard speed. Claude Opus 4.7 itself remains available at standard speed. To continue using fast mode, migrate to [Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/overview) or Claude Opus 4.8. Read more in [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode#supported-models).
+ * You can now manage the people in your **Claude Enterprise** (claude.ai) organization with the [Admin API](https://platform.claude.com/docs/en/api/beta/organization), in beta for all Claude Enterprise organizations: list members and look them up by email address, change a member's role, remove members, send and withdraw invites, manage groups and their membership, and read custom roles. Group and custom-role requests require the `anthropic-beta: ce-user-management-2026-07-13` beta header; member and invite requests take no beta header. An Admin API key with the `read:org_audit` scope can also call every user-management `GET` endpoint. See [User management](https://platform.claude.com/docs/en/manage-claude/user-management).
+ * You can now set an expiration when you create an API key or an Admin API key in the [Claude Console](https://platform.claude.com/settings/keys). Choose a preset, a custom duration, or **Never**. For keys with a lifetime of at least 7 days, Anthropic emails the creator before expiration. Existing keys are unaffected. The Admin API reports each key's expiration in the [`expires_at`](https://platform.claude.com/docs/en/api/beta/organization/api_keys/list) field. See [Authentication](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration).
+ * We've launched **Claude Fable 5** (`claude-fable-5`), our most capable model open to all customers, alongside **Claude Mythos 5** (`claude-mythos-5`) for Project Glasswing participants. Both models support a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) by default, 128k max output tokens, and always-on [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking). See [Introducing Claude Fable 5 and Claude Mythos 5](https://platform.claude.com/docs/en/models/fable-5/introducing-claude-fable-5-and-claude-mythos-5) for capabilities, API changes, and availability.
+ * We've launched **Claude Opus 4.8** (claude-opus-4-8), our most capable model. Claude Opus 4.8 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) by default on the Claude API, Amazon Bedrock, Google Cloud, and Microsoft Foundry, 128k max output tokens, and the same set of tools and platform features as Claude Opus 4.7. See the [migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide) for baseline settings, features, and migration guidance.
+ * We've launched [Claude Opus 4.7](https://www.anthropic.com/news/claude-opus-4-7), our most capable model for complex reasoning and agentic coding, at the same $5 / $25 per MTok pricing as Opus 4.6. See [What's new in Claude Opus 4.7](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7) for capability improvements, new features, and the updated tokenizer. Opus 4.7 includes API breaking changes versus Opus 4.6; see the [migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide) before upgrading.
+ * We've launched [Claude Sonnet 4.6](https://www.anthropic.com/news/claude-sonnet-4-6), our latest balanced model combining speed and intelligence for everyday tasks. Sonnet 4.6 delivers improved agentic search performance while consuming fewer tokens. Sonnet 4.6 supports [extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking) and a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) (beta). See [Models & Pricing](https://platform.claude.com/docs/en/models/overview) for details.
+ * We've launched the [compaction API](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold) in beta, providing server-side context summarization for effectively infinite conversations. Available on Opus 4.6.
+ * We've launched [Claude Opus 4.5](https://www.anthropic.com/news/claude-opus-4-5), our most intelligent model combining maximum capability with practical performance. Ideal for complex specialized tasks, professional software engineering, and advanced agents. Features step-change improvements in vision, coding, and computer use at a more accessible price point than previous Opus models. Learn more in [Models overview](https://platform.claude.com/docs/en/models/overview).
+ * We've launched [Claude Haiku 4.5](https://www.anthropic.com/news/claude-haiku-4-5), our fastest and most intelligent Haiku model with near-frontier performance. Ideal for real-time applications, high-volume processing, and cost-sensitive deployments requiring strong reasoning. Learn more in [Models overview](https://platform.claude.com/docs/en/models/overview).
+ * We've added a new endpoint to the Admin API for retrieving organization information. For details, see the [Organization Info Admin API reference](https://platform.claude.com/docs/en/api/beta/organization/retrieve).
+ * We've launched [Claude Opus 4.1](https://www.anthropic.com/news/claude-opus-4-1), an incremental update to Claude Opus 4 with enhanced capabilities and performance improvements.\* Learn more in [Models overview](https://platform.claude.com/docs/en/models/overview).
+ * We've launched [Claude Opus 4 and Claude Sonnet 4](https://www.anthropic.com/news/claude-4), our latest models with extended thinking capabilities. Learn more in [Models overview](https://platform.claude.com/docs/en/models/overview).
```

### anthropic.platform.token-counting

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/build-with-claude/token-counting
- Change: changed
- Prior hash: b409c3a73340bc01db6373c959b3c889bb4c0d5f5482c424fdfed268cbe5f030
- Current hash: 7a4c42b6c60e427a71303d466f1b4b7f4c29f431554327c6f1c1d8a56c574eec

```diff
- ## Compatibility
- - [ZDR](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention): eligible (excludes [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements))
- - Platforms: Claude API, Claude Platform on AWS, Amazon Bedrock, Google Cloud, Microsoft Foundry
- The [token counting](https://platform.claude.com/docs/en/api/messages-count-tokens) endpoint accepts the same structured list of inputs for creating a message, including support for system prompts, [tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), [images](https://platform.claude.com/docs/en/build-with-claude/vision), and [PDFs](https://platform.claude.com/docs/en/build-with-claude/pdf-support). The response contains the total number of input tokens.
- "model": "claude-opus-5",
- --model claude-opus-5 \
- model="claude-opus-5",
- model: "claude-opus-5",
- Model = Model.ClaudeOpus5,
- Model: anthropic.ModelClaudeOpus5,
- .model(Model.CLAUDE_OPUS_5)
- model: 'claude-opus-5',
- model: "claude-opus-5",
- [Server tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools) token counts only apply to the first sampling call.
- "model": "claude-opus-5",
- model: claude-opus-5
- model="claude-opus-5",
- model: "claude-opus-5",
- Model = Model.ClaudeOpus5,
- Model: anthropic.ModelClaudeOpus5,
- .model(Model.CLAUDE_OPUS_5)
- model: 'claude-opus-5',
- model: "claude-opus-5",
- "model": "claude-opus-5",
- model: claude-opus-5
- model="claude-opus-5",
- model: "claude-opus-5",
- Model = Model.ClaudeOpus5,
- Model: anthropic.ModelClaudeOpus5,
- .model(Model.CLAUDE_OPUS_5)
- model: 'claude-opus-5',
- model: "claude-opus-5",
- "model": "claude-opus-5",
- model: claude-opus-5
- model="claude-opus-5",
- model: "claude-opus-5",
- Model = Model.ClaudeOpus5,
- Model: anthropic.ModelClaudeOpus5,
- .model(Model.CLAUDE_OPUS_5)
- model: 'claude-opus-5',
+ featureMetadata:
+ status: ga
+ zdr:
+ eligibility: eligible
+ note: Excludes [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements).
+ supportedPlatforms:
+ Claude API: ga
+ Claude Platform on AWS: ga
+ Amazon Bedrock: ga
+ Google Cloud: ga
+ Microsoft Foundry: ga
+ The [token counting](https://platform.claude.com/docs/en/api/messages/count_tokens) endpoint accepts the same structured list of inputs for creating a message, including support for system prompts, [tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), [images](https://platform.claude.com/docs/en/build-with-claude/vision), and [PDFs](https://platform.claude.com/docs/en/build-with-claude/pdf-support). The response contains the total number of input tokens.
+ This endpoint returns an `invalid_request_error` for a few inputs that the Messages API accepts: [server tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools) such as web search, web fetch, code execution, and tool search (every server tool except the [advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool)), the [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector), and `image` or `document` blocks with a `url` or `file` source. Send images and PDFs as base64 to count them. For requests that use server tools or MCP servers, the Messages API response reports the tokens used in its `usage` object.
+ "model": "claude-opus-5-5",
+ --model claude-opus-5-5 \
+ model="claude-opus-5-5",
+ model: "claude-opus-5-5",
+ Model = Model.ClaudeOpus5_5,
+ Model: anthropic.ModelClaudeOpus5_5,
+ .model(Model.CLAUDE_OPUS_5_5)
+ model: 'claude-opus-5-5',
+ model: "claude-opus-5-5",
+ Token counting supports client tools and the [advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool). Requests that include other [server tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools) return an error. For the advisor tool, the count covers the executor's first sampling call only.
+ "model": "claude-opus-5-5",
+ model: claude-opus-5-5
+ model="claude-opus-5-5",
+ model: "claude-opus-5-5",
+ Model = Model.ClaudeOpus5_5,
+ Model: anthropic.ModelClaudeOpus5_5,
+ .model(Model.CLAUDE_OPUS_5_5)
+ model: 'claude-opus-5-5',
+ model: "claude-opus-5-5",
+ "model": "claude-opus-5-5",
+ model: claude-opus-5-5
+ model="claude-opus-5-5",
+ model: "claude-opus-5-5",
+ Model = Model.ClaudeOpus5_5,
+ Model: anthropic.ModelClaudeOpus5_5,
+ .model(Model.CLAUDE_OPUS_5_5)
+ model: 'claude-opus-5-5',
… diff truncated (61 added / 52 removed lines)
```

### apify.api.v2

- Vendor: Apify
- Source: https://docs.apify.com/api/v2
- Change: changed
- Prior hash: 949c500125ab16a908dc1948db9327d3f019a0f895c0ddfaf429402233e1d770
- Current hash: de4e6f234bab18d0c8a2a0c92a6ab94d07d5b97c327c242689669a612b323f09

```diff
- Version: v2-2026-09-02T154542Z
+ Version: v2-2026-09-24T114302Z
```

### apify.integrations.mcp

- Vendor: Apify
- Source: https://docs.apify.com/integrations/mcp
- Change: changed
- Prior hash: 9261c1ad0211ee3bbffaebf46f54684d3bf7480a42a76a9313718233ad411168
- Current hash: d28f314e859d58c7ad805459d357efbaa9e8e3d2af287de6010db3d2f31e6ea2

```diff
- SSE transport deprecated
- Server-Sent Events (SSE) transport will be removed on April 1, 2026. The Apify MCP server now uses Streamable HTTP, in line with the official MCP specification. Visit [mcp.apify.com](https://mcp.apify.com/) to update your client configuration.
- By default, the MCP server loads essential tools for Actor discovery, documentation search, and the RAG Web Browser Actor. You can customize which tools are available by adding parameters to the server URL:
- | ---------------------------------------------------------------- | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
- | `search-actors` | actors | ✅ | Search for Actors in Apify Store |
- | `fetch-actor-details` | actors | ✅ | Retrieve detailed information about a specific Actor, including its input and output schema, README (summary when available, full otherwise), and pricing |
- | `call-actor`\* | actors | ❔ | Call an Actor and get its run results |
- | `search-apify-docs` | docs | ✅ | Search the Apify documentation for relevant pages |
- | `fetch-apify-docs` | docs | ✅ | Fetch the full content of an Apify documentation page by its URL |
- | `get-actor-run` | runs | | Get detailed information about a specific Actor run |
- | `get-actor-run-list` | runs | | Get a list of an Actor's runs, filterable by status |
- | `get-actor-log` | runs | | Retrieve the logs for a specific Actor run |
- | `get-dataset` | storage | | Get metadata about a specific dataset |
- | `get-dataset-items` | storage | | Retrieve items from a dataset with support for filtering and pagination |
- | `get-dataset-schema` | storage | | Generate a JSON schema from dataset items |
- | `get-key-value-store` | storage | | Get metadata about a specific key-value store |
- | `get-key-value-store-keys` | storage | | List the keys within a specific key-value store |
- | `get-key-value-store-record` | storage | | Get the value associated with a specific key in a key-value store |
- | `get-dataset-list` | storage | | List all available datasets for the user |
- | `get-key-value-store-list` | storage | | List all available key-value stores for the user |
- | `get-actor-task` | tasks | | Get a saved Actor task, its publication state, and its public display configuration |
- | `create-actor-task` | tasks | | Create a saved Actor task: a named, reusable Actor configuration |
- | `update-actor-task` | tasks | | Update a task's input, run options, or the display configuration of its landing page |
- | `publish-actor-task` | tasks | | Publish a task on its public landing page |
- | `unpublish-actor-task` | tasks | | Unpublish a task from its public landing page |
- | `get-actor-output`\* | - | ✅ | Retrieve the output from an Actor call which is not included in the output preview of the Actor tool. |
- Retrieving full output
- The `get-actor-output` tool is automatically included with any Actor-related tool, such as `call-actor` or specific Actor tools like `apify-slash-rag-web-browser`. When you call an Actor, you receive an output preview. Depending on the output format and length, the preview may contain the complete output or only a limited version to avoid overwhelming the LLM. To retrieve the full output, use the `get-actor-output` tool with the `datasetId` from the Actor call. This tool supports limit, offset, and field filtering.
+ By default, the MCP server loads the `actors` and `docs` tool categories, the `apify/rag-web-browser` and `apify/web-fetch` Actors, and `report-problem`. You can customize which tools are available by adding parameters to the server URL:
+ | ---------------------------------------------------------------- | ----------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
+ | `search-actors` | `actors` | ✅ | Search for Actors in Apify Store |
+ | `fetch-actor-details` | `actors` | ✅ | Retrieve detailed information about a specific Actor, including its input and output schema, README (summary when available, full otherwise), and pricing |
+ | `call-actor` | `actors` | ✅ | Run an Actor and wait up to `waitSecs` (0-45, default 30) for it to finish. Returns the run status and storage IDs, not the results themselves |
+ | [apify/web-fetch](https://apify.com/apify/web-fetch) | Actor | ✅ | Fetch one http(s) URL and return its full content, rendering JavaScript and bypassing anti-bot protection |
+ | `search-apify-docs` | `docs` | ✅ | Search the Apify documentation for relevant pages |
+ | `fetch-apify-docs` | `docs` | ✅ | Fetch the full content of an Apify documentation page by its URL |
+ | `get-actor-run` | `runs` | | Get detailed information about a specific Actor run |
+ | `get-actor-run-list` | `runs` | | Get a list of an Actor's runs, filterable by status |
+ | `get-actor-run-log` | `runs` | | Retrieve the logs for a specific Actor run |
+ | `abort-actor-run` | `runs` | | Abort a running Actor run |
+ | `get-dataset` | `storage` | | Get metadata about a specific dataset |
+ | `get-dataset-items` | `storage` | | Retrieve items from a dataset with support for filtering and pagination |
+ | `get-dataset-schema` | `storage` | | Generate a JSON schema from dataset items |
+ | `get-key-value-store` | `storage` | | Get metadata about a specific key-value store |
+ | `get-key-value-store-keys` | `storage` | | List the keys within a specific key-value store |
+ | `get-key-value-store-record` | `storage` | | Get the value associated with a specific key in a key-value store |
+ | `get-dataset-list` | `storage` | | List all available datasets for the user |
+ | `get-key-value-store-list` | `storage` | | List all available key-value stores for the user |
+ | `get-actor-task` | `tasks` | | Get a saved Actor task, its publication state, and its public display configuration |
+ | `create-actor-task` | `tasks` | | Create a saved Actor task: a named, reusable Actor configuration |
+ | `update-actor-task` | `tasks` | | Update a task's input, run options, or the display configuration of its landing page |
+ | `publish-actor-task` | `tasks` | | Publish a task on its public landing page |
+ | `unpublish-actor-task` | `tasks` | | Unpublish a task from its public landing page |
+ | `create-schedule` | `schedules` | | Create a schedule that runs Actors and tasks on a cron cadence |
+ | `get-schedule` | `schedules` | | Get a schedule's cron expression, time zone, state, and next run |
+ | `update-schedule` | `schedules` | | Change a schedule's cron expression, time zone, state, or actions |
+ | `delete-schedule` | `schedules` | | Delete a schedule permanently |
+ | `report-problem` | `dev` | ✅ | Report a problem with the MCP server to Apify |
+ Retrieving Actor results
+ `call-actor` returns the run's status and storage IDs, not its output. To read the results, use `get-dataset-items` with the `datasetId` from the run. It supports limit, offset, and field filtering.
+ Whenever `call-actor` or a specific Actor tool such as `apify--rag-web-browser` is loaded, the server also adds `get-actor-run`, `get-dataset-items`, `get-key-value-store-record`, and `abort-actor-run`, even if you didn't select them. A default configuration therefore exposes them too.
```

### exa.docs.changelog

- Vendor: Exa
- Source: https://exa.ai/docs/changelog
- Change: changed
- Prior hash: aff1047f2ff77aef4b95d65a58af004dcdb4475ca08f3f1be7420707f71fedad
- Current hash: f6811fe95c70a0f50831ad99b01301346a394f5d786abf35b374ae5bf8e0a222

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
+ > ## Agent Instructions
+ > The Exa API is served at https://api.exa.ai. Authenticate with `Authorization: Bearer $EXA_API_KEY` (or `x-api-key: $EXA_API_KEY`); create keys at https://dashboard.exa.ai/api-keys.
+ > Prefer the official SDKs, `exa-py` (`pip install exa-py`) and `exa-js` (`npm install exa-js`); both read `EXA_API_KEY` from the environment.
+ > Tool-using agents can call Exa without writing code through the hosted MCP server at https://mcp.exa.ai/mcp, or install the Exa agent skill with `npx skills add exa-labs/agent-skills` (skill file: https://exa.ai/docs/skill.md).
+ > The OpenAPI specs at https://exa.ai/docs/exa-spec.yaml and https://exa.ai/docs/team-management-spec.yaml are the source of truth for request and response schemas.
+ <Update label="September 24, 2026" rss={{ title: "Agent Ultra" }}>
+ ## Agent Ultra
+ Agent Ultra is Exa Agent's highest-effort mode, built for large list building, deep multi-source research, and criteria that are hard to verify. Set `effort: "ultra"` on a run.
+ * **Metered**: billed at standard Agent usage rates, up to a default \$20 per run. Set `budget.maxCostDollars` to change the cap.
+ * **Time budget**: set `budget.maxDurationSeconds` (5 minutes to 3 hours) and the run wraps up with what it has found by then.
+ * **Stop early**: `POST /agent/runs/{id}/stop` ends a run and keeps the results gathered so far.
+ [Read the Agent Ultra guide →](/docs/agent/agent-ultra)
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
… diff truncated (56 added / 209 removed lines)
```

### exa.docs.contents-retrieval

- Vendor: Exa
- Source: https://exa.ai/docs/contents/quickstart.md
- Change: changed
- Prior hash: 60c952eb599af0c78133a64791aa6f2bc06e6c559ea01c08c3305b41dd074bdc
- Current hash: 565bdba3a07ed5ceb99ab1947e2d298b60d0482c3914ddb95077bfb43f87035b

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
+ > ## Agent Instructions
+ > The Exa API is served at https://api.exa.ai. Authenticate with `Authorization: Bearer $EXA_API_KEY` (or `x-api-key: $EXA_API_KEY`); create keys at https://dashboard.exa.ai/api-keys.
+ > Prefer the official SDKs, `exa-py` (`pip install exa-py`) and `exa-js` (`npm install exa-js`); both read `EXA_API_KEY` from the environment.
+ > Tool-using agents can call Exa without writing code through the hosted MCP server at https://mcp.exa.ai/mcp, or install the Exa agent skill with `npx skills add exa-labs/agent-skills` (skill file: https://exa.ai/docs/skill.md).
+ > The OpenAPI specs at https://exa.ai/docs/exa-spec.yaml and https://exa.ai/docs/team-management-spec.yaml are the source of truth for request and response schemas.
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
… diff truncated (231 added / 101 removed lines)
```

### exa.docs.index

- Vendor: Exa
- Source: https://exa.ai/docs/llms.txt
- Change: changed
- Prior hash: a60fc40b1adbc761c928a7f484208dca1a9cd9723fa58781c0ab783e862abd0d
- Current hash: 23eabf5b342c33391ff8907ff3bf01ce49f066b15d948b81e68162d313573c41

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
- - [Code Search Reference](https://exa.ai/docs/reference/verticals/code-for-coding-agents.md): Self-contained reference for coding agents using Exa Code Search
+ > A powerful web search tool designed for agents. Everything optimized to get you token-efficient, accurate results.
+ > ## Agent Instructions
+ > The Exa API is served at https://api.exa.ai. Authenticate with `Authorization: Bearer $EXA_API_KEY` (or `x-api-key: $EXA_API_KEY`); create keys at https://dashboard.exa.ai/api-keys.
+ > Prefer the official SDKs, `exa-py` (`pip install exa-py`) and `exa-js` (`npm install exa-js`); both read `EXA_API_KEY` from the environment.
+ > Tool-using agents can call Exa without writing code through the hosted MCP server at https://mcp.exa.ai/mcp, or install the Exa agent skill with `npx skills add exa-labs/agent-skills` (skill file: https://exa.ai/docs/skill.md).
+ > The OpenAPI specs at https://exa.ai/docs/exa-spec.yaml and https://exa.ai/docs/team-management-spec.yaml are the source of truth for request and response schemas.
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
+ - [Agent Ultra](https://exa.ai/docs/agent/agent-ultra.md): Run Exa Agent at its highest effort for large list building and exhaustive research.
+ - [Exa Connect](https://exa.ai/docs/agent/connect/overview.md): Give your Exa Agent live access to premium data partners, alongside Exa web search, in a single run.
+ - [Fiber.ai](https://exa.ai/docs/agent/connect/fiber.md): Search Fiber.ai's B2B database for companies, people, and LinkedIn profiles.
+ - [Similarweb](https://exa.ai/docs/agent/connect/similarweb.md): Get website traffic estimates, global rankings, and competitor discovery.
+ - [Baselayer](https://exa.ai/docs/agent/connect/baselayer.md): Verify US businesses and retrieve KYB data: officers, registrations, risk scores.
+ - [Polymarket](https://exa.ai/docs/agent/connect/polymarket.md): Get prediction-market odds, price history, order books, and trader positions.
+ - [Macrobond](https://exa.ai/docs/agent/connect/macrobond.md): Search and fetch macroeconomic and financial time series, entity metadata, and release calendars.
+ - [Affiliate.com](https://exa.ai/docs/agent/connect/affiliatecom.md): Search product catalogs across merchants and affiliate networks.
+ - [Particle](https://exa.ai/docs/agent/connect/particle.md): Search podcast transcripts with speaker attribution and timestamps.
+ - [Financial Datasets](https://exa.ai/docs/agent/connect/financialdatasets.md): Structured financial and market data for 27,000+ U.S. tickers: prices, fundamentals, earnings, SEC filings, ownership, and stock screening.
… diff truncated (143 added / 157 removed lines)
```

### exa.docs.search

- Vendor: Exa
- Source: https://exa.ai/docs/reference/search
- Change: changed
- Prior hash: 68bb3178990f619909564908c08ea73d474b8c9dcbca7572e9d393abaf650a4f
- Current hash: 46321af71a50a5e477b6e557b9193337aa6c399d8f1a7ecb9c48d0d8be1e302f

```diff
- <Card title="Get your Exa API key" icon="key" horizontal href="https://dashboard.exa.ai/api-keys" />
- ````yaml post /search
- Deprecated and has no effect; ignored by the API. Must be
- specified in ISO 8601 format.
- Deprecated and has no effect; ignored by the API. Must be
- specified in ISO 8601 format.
- Deprecated: Use highlights or text instead. Returns page
- Deprecated: Use highlights or text instead. Returns page
- maximum: 10000
- Deprecated. Maximum character limit for the context
- string. Maximum supported value is 10000.
- example: 10000
- Deprecated: Use highlights or text instead. Returns page
- A list of search results containing title, URL, published date,
- and author.
- Deprecated legacy field. Current production responses may return
- an empty string; clients should not branch on this value.
- example: ''
- Deprecated. Combined context string from search results. Use
- highlights or text instead.
- A list of search results containing title, URL, published date,
- and author.
- Deprecated legacy field. Current production responses may return
- an empty string; clients should not branch on this value.
- example: ''
- Deprecated. Combined context string from search results. Use
- highlights or text instead.
- maximum: 10000
- Maximum supported value is 10000.
- maximum: 10000
- text returned per URL. Maximum supported value is
- 10000. Not compatible with highlights.dynamic.
- Deprecated and will be removed in a future release.
- Currently mapped to a character budget of about 1333
- Deprecated and will be removed in a future release.
- Currently ignored. Pass highlights: true for default
- highlights, or { query } to guide selection with
- your own query.
- Deprecated: Use highlights or text instead. Returns page
- Deprecated: Use highlights or text instead. Returns page
+ > ## Agent Instructions
+ > The Exa API is served at https://api.exa.ai. Authenticate with `Authorization: Bearer $EXA_API_KEY` (or `x-api-key: $EXA_API_KEY`); create keys at https://dashboard.exa.ai/api-keys.
+ > Prefer the official SDKs, `exa-py` (`pip install exa-py`) and `exa-js` (`npm install exa-js`); both read `EXA_API_KEY` from the environment.
+ > Tool-using agents can call Exa without writing code through the hosted MCP server at https://mcp.exa.ai/mcp, or install the Exa agent skill with `npx skills add exa-labs/agent-skills` (skill file: https://exa.ai/docs/skill.md).
+ > The OpenAPI specs at https://exa.ai/docs/exa-spec.yaml and https://exa.ai/docs/team-management-spec.yaml are the source of truth for request and response schemas.
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
+ description: Deprecated. Ignored by the API.
+ x-exa-lifecycle: deprecated
+ description: Deprecated. Ignored by the API.
+ x-exa-lifecycle: deprecated
+ includeText:
+ - maxItems: 50
+ maxLength: 4096
+ Deprecated. List of strings that must be present in the webpage text
+ of results. Matching is approximate (word-level rather than exact
+ phrase), so a multi-word entry can match pages where its words
+ appear separately. Up to 50 strings, each up to 4096 characters.
+ x-exa-lifecycle: deprecated
+ excludeText:
+ - maxItems: 50
+ maxLength: 4096
+ Deprecated. List of strings that must not be present in the webpage
+ text of results. Matching is approximate (word-level rather than
+ exact phrase). Up to 50 strings, each up to 4096 characters.
+ x-exa-lifecycle: deprecated
+ Deprecated. Use `highlights` or `text` instead. Returns page
+ x-exa-lifecycle: deprecated
… diff truncated (194 added / 71 removed lines)
```

### firecrawl.docs.index

- Vendor: Firecrawl
- Source: https://docs.firecrawl.dev/llms.txt
- Change: changed
- Prior hash: 0ee47209638ef3a11ce3e9bd0c4ddeb30f2ce97fe507d288618f19dec5c39bea
- Current hash: 531b88631e3ab1bf61db7eedf6bad5e19aeb747779f21da9e76835d95f7a1bcd

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
+ - [v2 (204 pages)](https://docs.firecrawl.dev/_llms/en/v2.md): Documentation for v2.
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
- Current hash: 6e00f244609a567853da55a93ed06365cc39f37d9a1ec2446c09141611df6685

```diff
- Introducing the Firecrawl Developer Index, built for supercharging coding agents. Read the announcement →
- 176.8K Sign up
- Session Management - Configurable TTL controls, parallel sessions (up to 20 concurrent), and automatic cleanup. 2 credits per browser minute with 5 minutes free.
+ Introducing Alexandria and our $75M Series B. Read the announcement →
+ 185K Sign up
+ Sep 22, 2026
+ Introducing Alexandria and our $75M Series B
+ Alexandria is the knowledge library for superintelligence. It gives AI agents a common way to discover sources and retrieve information through Firecrawl, bringing together the live web, official data providers, site-specific connectors and our own indexes.
+ More places to look
+ AI agents can search our Research, Developer and Government indexes, query data providers and use specialized tools to reach information beyond individual web pages. We’re continuing to add sources and build more indexes.
+ Across the verticals we tested, AI agents using Alexandria scored 21% higher on answer quality than those using built-in web tools. We used the same model and prompts across 845 tasks, with blind AI judging.
+ Our $75M Series B
+ We raised a $75M Series B led by Smash Capital , with participation by Altos Ventures , Nexus Venture Partners , Y Combinator , Freestyle and Offline Ventures .
+ We’re investing in search and Alexandria, building deeper indexes and retrieval systems and working directly with more knowledge providers. Our goal is to make useful knowledge easier to reach and worth sharing for the people who create it.
+ Try Alexandria or read the full announcement .
+ Session Management - Configurable TTL controls, parallel sessions (up to 20 concurrent), and automatic cleanup. 2 credits per browser minute.
+ Update (August 17, 2026) : The 5-credit price above no longer applies. Enhanced Mode requests are billed at the same 1 credit per request as basic requests, and an automatic escalated retry is not charged separately. See the Enhanced Mode docs .
```

### gemini.api.changelog

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/changelog
- Change: changed
- Prior hash: 0e5a056295d5000f94ffc33972344e95b57c85907fc7720b7ca9e0fdc625edc3
- Current hash: 3dec82d7496a974a4255b60ecb753e2f1f964429117fb03a13353466e3a73889

```diff
- Lyria 3.5 in public preview : Released the next generation of Google's music
- generation model:
- Last updated 2026-09-04 UTC.
+ September 22, 2026
+ Gemini 3.8 Flash TTS and Gemini 3.8 Flash-Lite TTS generally available
+ (GA) : Released our next-generation text-to-speech (TTS) audio models and
+ the Gemini API Voices endpoint ( /v1beta/voices ):
+ Gemini 3.8 Flash TTS
+ ( gemini-3.8-flash-tts ) : Flagship creative TTS model engineered for
+ studio-grade voice fidelity, nuanced acting, regional dialects, and
+ long-form multi-turn stability.
+ Gemini 3.8 Flash-Lite TTS
+ ( gemini-3.8-flash-lite-tts ) : Fast, cost-efficient TTS model built to
+ replace gemini-3.1-flash-tts-preview for high-throughput production
+ and real-time voice agent cascades.
+ Voice design ,
+ Voice replication , and the
+ Extended Voice Library :
+ Create persistent custom vocal personas from text prompts, replicate
+ voices with consent verification, and query 150+ prebuilt and custom
+ voices.
+ See the Text-to-speech guide to get
+ September 18, 2026
+ Gemini 2.5 models access update : To ensure reliable performance for
+ everyone, we are limiting access to the 2.5 models to users who have
+ actively used them in the past. These models are not deprecated and will
+ continue to be served until further notice through the API. For any new
+ projects, use our latest models: 3.5 Flash-Lite or 3.8 Flash. This
+ helps us maintain sufficient capacity for both ongoing legacy workflows and
+ new applications.
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
… diff truncated (82 added / 3 removed lines)
```

### gemini.api.deprecations

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/deprecations
- Change: changed
- Prior hash: 1419e17f5fee62496ccb49f6b1e340498de5f726b2e913d733a08907341c719d
- Current hash: 1896681bb8cee142d81601cf93fca3cb8f2a271c4d363f07322e9e1ce1dd9c5c

```diff
- models in the Gemini API. A " deprecation " is the announcement that we
- no longer provide support for a model, and that it will be " shut down " in
- the near future. Once a model is " shutdown ", it is completely
- turned off, and the endpoint is no longer available.
- April 13, 2026
- Last updated 2026-09-05 UTC.
+ models and for managed agents in the Gemini API. A " deprecation " is the
+ announcement that we no longer provide support for a model, and that it will be
+ " shut down " in the near future. Once a model is " shutdown ", it is
+ completely turned off, and the endpoint is no longer available.
+ gemini-3.8-flash-tts
+ September 22, 2026
+ gemini-3.8-flash-lite-tts
+ September 22, 2026
+ gemini-3.8-live
+ September 15, 2026
+ gemini-3.8-live-extended-thinking
+ September 15, 2026
+ gemini-3.8-flash-tts or gemini-3.8-flash-lite-tts
+ gemini-3.8-live
+ September 15, 2026
+ gemini-3.8-live-extended-thinking
+ September 15, 2026
+ gemini-3.8-live
+ gemini-3.8-live
+ gemini-3.8-live
+ gemini-3.8-live
+ gemini-3.8-flash-tts or gemini-3.8-flash-lite-tts
+ gemini-3.8-flash-tts or gemini-3.8-flash-lite-tts
+ Managed agents
+ Agent
+ Preview agents
+ antigravity-preview-09-2026
+ September 17, 2026
+ antigravity-preview-05-2026
+ October 5, 2026
+ antigravity-preview-09-2026
+ Last updated 2026-09-24 UTC.
```

### gemini.api.models

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/models
- Change: changed
- Prior hash: 9e7c3711087835291ec307d34c1d8616b7a63dec501b96821b9bac81a45d2fb9
- Current hash: 8ff06f19167b1a110d528484aa0cc920007a94db105eb7389ebf2434ba602de0

```diff
- High-quality, low-latency Live API model for real-time dialogue and voice-first AI applications.
- Powerful, low-latency speech generation.
- Our high-quality, low-latency audio-to-audio (A2A) model designed for real-time dialogue and voice-first AI applications.
- Powerful, low-latency speech generation, with natural outputs, steerable prompts, and new expressive audio tags for precise narration control.
- Imagen 4 (Deprecated)
- Text-to-image model featuring fast and ultra-fast generation and exceptional clarity up to 2K resolution.
- antigravity-preview-05-2026
- Last updated 2026-09-04 UTC.
+ Gemini 3.8 Live
+ Default Live API model for most low-latency voice agent experiences without reasoning delays.
+ Gemini 3.8 Live Extended Thinking
+ High-reasoning Live API model for voice interactions, recommended when higher background reasoning is required.
+ Gemini 3.8 Flash TTS
+ Flagship creative text-to-speech model for studio-grade voice fidelity, expressive acting, Voice design, and Voice replication.
+ Gemini 3.8 Flash-Lite TTS
+ Fast, cost-efficient text-to-speech model for high-volume production, real-time voice agent cascades, and Voice replication.
+ Legacy Live API preview model. We recommend updating to Gemini 3.8 Live.
+ Legacy TTS preview model. We recommend updating to Gemini 3.8 Flash TTS or Gemini 3.8 Flash-Lite TTS.
+ Gemini 3.8 Live
+ gemini-3.8-live
+ Gemini 3.8 Live Extended Thinking
+ gemini-3.8-live-extended-thinking
+ Gemini 3.8 Flash TTS
+ gemini-3.8-flash-tts
+ Gemini 3.8 Flash-Lite TTS
+ gemini-3.8-flash-lite-tts
+ Gemini 3.8 Live
+ The default option for most low-latency voice agent experiences and real-time dialogue without reasoning delays.
+ gemini-3.8-live
+ Gemini 3.8 Live Extended Thinking
+ Our high-reasoning audio-to-audio model, recommended when higher background reasoning is required during live interactions.
+ gemini-3.8-live-extended-thinking
+ Gemini 3.8 Flash TTS
+ Flagship creative text-to-speech model for studio-grade voice fidelity, expressive acting, and regional dialects across 130 languages.
+ gemini-3.8-flash-tts
+ Gemini 3.8 Flash-Lite TTS
+ Fast, cost-efficient text-to-speech model built for high-throughput production workloads across 101 languages.
+ gemini-3.8-flash-lite-tts
+ Legacy audio-to-audio preview model. We recommend updating to Gemini 3.8 Live.
+ Legacy text-to-speech preview model. We recommend updating to Gemini 3.8 Flash TTS or Gemini 3.8 Flash-Lite TTS.
+ Imagen 4 (Shut down)
+ Text-to-image model featuring fast and ultra-fast generation (shut down).
+ antigravity-preview-09-2026
+ Last updated 2026-09-24 UTC.
```

### gemini.api.tokens

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/tokens
- Change: changed
- Prior hash: f95180ddfb1e9565726f8c59c593c456a3019f2772ce93c7992c26da1a749a64
- Current hash: 95073147f8cd2cebd33033f556d2f196fdea738aa63b16399bbd02571543c26b

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
+ Go
+ package main
+ import (
+ "context"
+ "fmt"
+ "log"
+ "google.golang.org/genai"
+ func main () {
+ ctx := context . Background ()
+ client , err := genai . NewClient ( ctx , nil )
+ if err != nil {
+ log . Fatal ( err )
+ modelInfo , err := client . Models . Get ( ctx , "gemini-3.8-flash" , nil )
+ if err != nil {
+ log . Fatal ( err )
+ fmt . Printf ( "Input token limit: %d\n" , modelInfo . InputTokenLimit )
+ fmt . Printf ( "Output token limit: %d\n" , modelInfo . OutputTokenLimit )
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
+ Go
+ package main
+ import (
… diff truncated (207 added / 13 removed lines)
```

### hermes.docs.cli-commands

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/reference/cli-commands
- Change: changed
- Prior hash: e94d8ac78be7d44b7e8620e9ecdb58b28d4caa7d74744ff602769142b9c5066a
- Current hash: d551b4f4ea7bf5e86ce3166dc2062e1a8e8b0d4a65ef2bc224e318fcacc2634e

```diff
- Force a provider: auto , openrouter , nous , openai-codex , copilot-acp , copilot , anthropic , gemini , huggingface , novita (aliases novita-ai , novitaai ), openai-api , zai , kimi-coding , kimi-coding-cn , minimax , minimax-cn , minimax-oauth , kilocode , xiaomi , arcee , gmi , upstage (alias solar ), alibaba , alibaba-cn , alibaba-coding-plan (alias alibaba_coding ), alibaba-coding-plan-cn , alibaba-token-plan , alibaba-token-plan-cn , deepseek , nvidia , ollama-cloud , xai (alias grok ), xai-oauth (alias grok-oauth ), qwen-oauth , bedrock , opencode-zen , opencode-go , opencode-free (aliases free , opencode_free ; keyless), commandcode , commandcode-anthropic , ai-gateway , azure-foundry , lmstudio , stepfun , tencent-tokenhub (alias tencent , tokenhub ), router (aliases ramp-router , ramp ), nebius-token-factory (aliases nebius , nebius-tf , tokenfactory ), tencent-tokenplan (aliases tokenplan , tencent-lkeap ).
- Session source tag for filtering (default: cli ). Use tool for third-party integrations that should not appear in user session lists.
- hermes -z "…" --usage-file /path/report.json writes a machine-readable usage report after the run: estimated_cost_usd , input_tokens / output_tokens / cache_read_tokens / cache_write_tokens / reasoning_tokens / total_tokens , api_calls , model , provider , session_id , service_tier , and completed / failed flags. The report is written even when the run fails , so batch pipelines can always account for spend. It has no effect outside -z / --oneshot , and a broken usage write never masks the run's own outcome.
- hermes -z "summarize this repo" --usage-file /tmp/usage.json
- jq .estimated_cost_usd /tmp/usage.json
- --external-supervisor is a restart-policy contract: an in-chat restart or
- service-restart update exits with status 75 , so the wrapper's supervisor must
- hermes send --to telegram "MEDIA:/tmp/screenshot.png"
- hermes send --to telegram "Build chart for today MEDIA:/tmp/chart.png" # with caption
- hermes send --to discord: #ops "MEDIA:/tmp/report.pdf"
- hermes send --to telegram "[[as_document]] MEDIA:/tmp/screenshot.png"
- hermes send --to discord: #ops --file /tmp/report.md
- Download and verify the pinned bws binary. --force re-downloads even if a managed copy already exists.
- Subcommands: add , list , remove , reset , status , logout , spotify . When called with no subcommand, launches the interactive management wizard.
- Resume a paused job and compute its next future run.
- For the full design — comparison with Cline Kanban / Paperclip / NanoClaw / Gemini Enterprise, eight collaboration patterns, four user stories, concurrency correctness proof — see docs/hermes-kanban-v1-spec.pdf in the repository or the Kanban user guide .
- hermes egress install --force # re-download even if already installed
- Subscriptions persist to ~/.hermes/webhook_subscriptions.json and are hot-reloaded by the webhook adapter without a gateway restart.
- hermes backup -o /tmp/hermes.zip # Full backup to specific path
- Delete only the legacy-<timestamp>/ archives produced by the v1→v2 migration.
- get <key> [--json]
- Print a single config value by dotted key (e.g. hermes config get model.default ). --json emits machine-readable output.
- set <key> <value>
- Set a config value.
- Remove a config key, reverting it to the built-in default.
- Set up and manage external memory provider plugins. Available providers: honcho, openviking, mem0, hindsight, holographic, retaindb, byterover, supermemory. Only one external provider can be active at a time. Built-in memory (MEMORY.md/USER.md) is always active.
- cd ~/.hermes/hermes-agent && uv pip install -e '.[acp]'
- Install a catalog entry (e.g. hermes mcp install n8n ).
- install <identifier> [--force] [--ref COMMIT_SHA]
- Install a plugin from a Git URL, owner/repo , or a bare index name. Bare names (no slash) are resolved through the community plugin index to owner/repo plus the index-pinned commit; ambiguous names list candidates and exit. --ref accepts only a full 40-character commit SHA, installs that exact immutable revision, and overrides any index pin.
- search [term] [--json] [--capability CAP] [--refresh]
- Search the community plugin index (fuzzy match on name/description/tags; omit term to browse). Fetched from plugins.index_url (default: the NousResearch plugin index), cached under ~/.hermes/cache/ for 24h, falling back to the stale cache and then the bundled seed when offline. Indexed ≠ audited — inclusion is a metadata review only.
- Pull latest changes for an unpinned installed plugin. Pinned plugins must be reinstalled with --force --ref <new-commit> to move.
- Directly imported: SOUL.md, MEMORY.md, USER.md, AGENTS.md, skills (4 source directories), default model, custom providers, MCP servers, messaging platform tokens and allowlists (Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost), agent defaults (reasoning effort, compression, human delay, timezone, sandbox), session reset policies, approval rules, TTS config, browser settings, tool settings, exec timeout, command allowlist, gateway config, and API keys from 3 sources.
- See the import guide for the full mapping tables.
- Launch the web dashboard — a browser-based UI for managing configuration, API keys, and monitoring sessions. (For a headless backend with no browser UI — e.g. what the desktop app spawns — use hermes serve above.) Requires cd ~/.hermes/hermes-agent && uv pip install -e ".[web]" (FastAPI + Uvicorn). The embedded browser Chat tab is always available and additionally needs the pty extra ( cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]" ) plus a POSIX PTY environment such as Linux, macOS, or WSL2. See Web Dashboard for full documentation.
- Stop running hermes dashboard processes and exit.
- Create a new profile. --clone copies config, .env , SOUL.md , and skills from the active profile. --clone-all copies all state. --clone-from specifies a source profile and implies config clone unless paired with --clone-all .
- Pulls the latest hermes-agent code and reinstalls dependencies in the managed venv, then re-runs the post-install hooks (MCP servers, skills sync, completion install). Safe to run on a live install. Use --check to see whether your checkout is behind origin/main without installing.
- Gateway restart. After a successful update, Hermes attempts to restart all running gateway profiles automatically so they pick up the new code. Use hermes gateway restart when you want to restart a gateway without applying an update.
+ Python dependency commands on this page use a
+ PM-prepared source checkout .
+ After a dependency change, reactivate the checkout and restart Hermes.
+ hermes-agent (legacy single-query runner) ​
+ The install also ships hermes-agent , a minimal runner that sends one query and exits: hermes-agent --query "summarize README.md" (or hermes-agent "summarize README.md" ). hermes-agent --help lists its options ( --model , --base-url , --max-turns , --enabled-toolsets , --disabled-toolsets , --list-tools , --save-trajectories , …) and hermes-agent --version prints the version; neither starts the agent. Run with no query, it prints the same help and exits. For anything else use hermes ( hermes -z <prompt> is the scripted one-shot).
+ hermes codex-runtime
+ Noninteractive counterpart of /codex-runtime : migrate [--dry-run] [--json] regenerates the Hermes-managed block in ~/.codex/config.toml for the selected profile. See Codex app-server runtime .
+ hermes usage
+ Show the configured account's rate-limit windows (the /usage block) without a session; --json for scripts.
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
… diff truncated (221 added / 42 removed lines)
```

### hermes.docs.fallback-providers

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
- Change: changed
- Prior hash: cc2cf1c9050b24954fa57dfed00a53cad4cb4c643586417a3205c019427b1593
- Current hash: 88797d3249fa85350e980d9195e610f06e0121a22a42c2d21a5c9742d8aaf76b

```diff
- OpenCode Free
- opencode-free
- — (keyless, no credential)
- Invalid responses — when the API returns malformed or empty responses repeatedly
- Resolves credentials for the fallback provider
- Builds a new API client
- The per-turn retry is reset-aware : when the primary's credentials report a rate-limit reset time that hasn't elapsed yet (subscription windows like Claude Pro/Max's 5-hour blocks or Codex weekly limits report these as hours or days), Hermes skips the doomed retry and stays on the fallback until the reset passes — avoiding two pointless provider switches (and two prompt-cache invalidations) per turn. The moment the reset time elapses, the next turn goes back to the primary automatically. Transient 429s without a reset time keep the existing behavior: a short cooldown, then retry every turn.
- model : gpt - 5.3 - codex
- CLI sessions
- ✔ (subagents inherit the parent fallback chain)
- ✔ (cron agents inherit configured fallback providers)
- When a task's provider is set to "auto" (the default), Hermes first tries the main provider + main model for that auxiliary task. If that route is unavailable or later fails with a capacity-style error, Hermes now honors user-configured fallback policy before using the built-in discovery chain:
- fallback_providers / fallback_model → built-in auxiliary discovery chain
- Those built-in chains are a convenience fallback for users who have not declared a task-specific or main fallback policy.
- Every task above follows the same provider / model / base_url pattern. Each task can also declare its own fallback_chain ; if omitted, provider: auto uses the top-level fallback_providers chain before Hermes' built-in auxiliary discovery chain.
- Cron jobs inherit your configured fallback_providers chain (or legacy fallback_model ) when they create an agent. To use a different primary provider for a cron job, configure provider and model overrides on the cron job itself:
- See Scheduled Tasks (Cron) for full configuration details.
- fallback_chain (if set) → main agent model → warn + raise, on capacity errors only
- Inherits the parent's fallback_providers chain; optional provider/model override
- delegation.provider / delegation.model
- Inherit the configured fallback_providers chain; optional per-job provider override
- Per-job provider / model
+ When a rate-limit response names its reset time, the primary is benched until exactly then (a provider that says nothing gets the exponential 60 s → 4 h backoff). Optionally, skip the switch when the primary reopens soon:
+ fallback :
+ min_switch_reset_seconds : 120 # 0 (default) = always switch
+ Key
+ Default
+ Effect
+ fallback.min_switch_reset_seconds
+ 0 (off)
+ A rate-limited primary whose declared reset is sooner than this many seconds is not swapped for a fallback; the retry backoff waits out the window instead.
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
+ model : gpt - 5.4
+ CLI sessions (interactive and hermes -z one-shot)
+ ✔ (at startup when the primary's credentials/quota fail, mid-session, and a chain added or edited while a chat is open applies from its next turn)
+ Desktop app / TUI chats
+ ✔ (a chain added or edited while a chat is open applies from its next turn)
+ ✔ ( delegation.fallback_providers when set; otherwise only unpinned children inherit the parent chain; [] disables)
+ ✔ (unpinned jobs inherit the configured chain; a job with its own provider/model/base_url never falls back to it)
+ When a task's provider is set to "auto" (the default), Hermes first tries the main provider + main model for that auxiliary task. If that route is unavailable or later fails with a capacity-style error, Hermes follows your configured fallback policy and then stops:
+ fallback_providers / fallback_model → skip the task (warn)
+ A billing or quota failure quarantines only the failed custom endpoint for the auxiliary health cooldown, not every route registered as custom . A healthy local endpoint with a different base URL remains eligible for fallback and subsequent auto routing. Aliases for the same custom endpoint share its health state. Built-in providers retain their shared-account health checks.
+ Those built-in chains run only when no main provider is selected ( model.provider: auto or unset). Once you have picked a main provider, an unavailable main route with no fallback_chain / fallback_providers skips the auxiliary task with a warning instead of guessing another provider you happen to be logged into — an expired xAI or Codex session must never bill your Nous Portal or OpenRouter balance behind your back. Declare a fallback if you want one.
+ Every task above follows the same provider / model / base_url pattern. Each task can also declare its own fallback_chain ; if omitted, provider: auto uses the top-level fallback_providers chain (the built-in discovery chain applies only when no main provider is selected).
+ Auth errors (HTTP 401) on an explicit provider walk only step 2: if you wrote auxiliary.<task>.fallback_chain , its entries are tried in order (and a chain entry that dies mid-request hands off to the next one); the main agent model and the auto-detection chain are never consulted, because you did not opt that task into them. Without a chain the task fails on the auth error as before. Auth is credential-wide, so chain entries on the same provider label are skipped — point the spare at a different provider (a separate providers: entry counts).
+ Unpinned cron jobs inherit your configured fallback_providers chain (or legacy fallback_model ), both when the primary's credentials fail to resolve before the run and when the provider errors mid-run. A job pinned to its own provider, model or endpoint does not : if that route fails, the run fails (same-provider credential pool rotation still applies). This matches how a pinned delegation child behaves. Pin a cron job with provider and model overrides on the job itself:
+ To keep fallback for a job, leave it unpinned and choose its model with cron.model / cron.model_provider instead. See Scheduled Tasks (Cron) for details.
+ fallback_chain (if set) → main agent model → warn + raise, on capacity errors; auth errors (401) walk fallback_chain only
+ Uses delegation.fallback_providers when declared; otherwise only unpinned children inherit the parent chain
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
- Current hash: 1b32eb799810190ee904c8620e50012c09049711dc8d076cccf076b4fffbc1a0

```diff
- 49.7k
- 242k
- Hermes Agent v0.20.2 (2026.8.16)
- Hermes Agent v0.20.1 (2026.8.13)
- Hermes Agent v0.20.0 (2026.8.3)
- Hermes Agent v0.19.1 (v2026.7.30)
- Hermes Agent v0.19.0 (2026.7.20) — The Quicksilver Release
- 112 people reacted
- 84 people reacted
- 68 people reacted
- 42 people reacted
- Hermes Agent v0.20.2 (2026.8.16)
- Hermes Agent v0.20.2 (2026.8.16)
- 16 Aug 17:33
- v2026.8.16
- df4b651
- Hermes Agent v0.20.2 (v2026.8.16)
- Patch release. This tag rolls up the ~397 PRs merged since v0.20.1 into a stable tagged release for downstream consumers (Docker images, hosted deployments, fresh installs).
- Since v0.20.1 (v2026.8.13, tagged August 13), this window landed ~967 commits across ~1,279 files (+128,522 / −7,622) — ~397 merged PRs of fixes and improvements spanning the desktop app (multi-gateway Connections registry, profile-scoped refreshes, MCP health checks and deep links), the CLI (Windows update probes, Kitty keyboard protocol, chat -c hardening), the gateway (persisted model routes, /loop completion, Telegram DM topics), prompt caching for LiteLLM Claude on the OpenAI wire, cron hardening, auth resolution through profile scopes, and installer robustness on both Linux and Windows.
- Full Changelog : v2026.8.13...v2026.8.16
- 54 people reacted
- Hermes Agent v0.20.1 (2026.8.13)
- Hermes Agent v0.20.1 (2026.8.13)
- 13 Aug 20:37
- v2026.8.13
- f80f453
- Hermes Agent v0.20.1 (v2026.8.13)
- Release Date: August 13, 2026
- Patch release. This tag rolls up the ~656 PRs merged since v0.20.0 into a stable tagged release for downstream consumers (Docker images, hosted deployments, and anyone installing from the latest tag).
- Since v0.20.0 (August 3), this window landed 1,444 commits across ~656 merged PRs , touching 2,172 files (+233,872 / −75,244), and closed ~481 issues . It is a broad stabilization-and-fixes rollup spanning the desktop app, gateway platforms, installers, tool system, and provider catalogs.
- Existing installs: hermes update
- Fresh install: see the installer one-liner in the README
- Full Changelog : v2026.8.3...v2026.8.13
- 89 people reacted
- Hermes Agent v0.20.0 (2026.8.3)
- Hermes Agent v0.20.0 (2026.8.3)
- 03 Aug 16:57
- v2026.8.3
- This tag was signed with the committer’s verified signature .
- Teknium
+ 52.9k
+ 249k
+ Hermes Agent v0.21.5 (v2026.9.24)
+ Hermes Agent v0.21.4 (v2026.9.21)
+ Hermes Agent v0.21.3 (v2026.9.14)
+ Hermes Agent v0.21.2 (v2026.9.11)
+ Hermes Agent v0.21.1 (v2026.9.7)
+ Hermes Agent v0.21.5 (v2026.9.24)
+ Hermes Agent v0.21.5 (v2026.9.24)
+ 24 Sep 10:09
+ v2026.9.24
+ f97608f
+ Hermes Agent v0.21.5 (v2026.9.24)
+ Release Date: September 24, 2026
+ Patch release. This tag rolls up the ~460 PRs merged since v0.21.4 into a stable tagged release for downstream consumers (Docker images, Hermes Cloud, hosted deployments). Full curated notes for this window are deferred to v0.22.0.
+ Measured at commit f97608f178d1ffeca59860195ab7da295f7c8e5f , the window since v0.21.4 contains 1,610 non-merge commits across 4,828 changed files (+164,132 / −149,440), 460 merged PRs and 475 closed issues .
+ Also in the window, undocumented here on purpose: a Desktop plugin SDK wave (composer draft API, session-list and row-decoration slots, sidebar nav prefs, model-pill label providers, typed settings/skills/toolsets/profiles bridges, a sandboxed embed primitive, appearance-settings slot, and a public event bridge for plugin backends); a Simple/Advanced interface mode for Desktop; the Connectors page replacing the MCP tab, with "Connect now" for a freshly installed plugin's MCP servers and installed plugins' tools and skills going live in every open chat; onboarding that offers catalog plugins beside connectors; complete French, German and Spanish Desktop catalogs plus an RTL/LTR text direction setting; custom model entry from the composer and Settings pickers; function-key and dictation voice shortcuts; per-profile stop/start/restart under the host multiplexer and gateway.standalone to opt a profile out; the live dock showing the standing /goal and queued prompts in the CLI and TUI; a kanban design pass with a two-column ticket modal and markdown task text; webhook deliveries mirrored into the target chat session; Bot Screen on hosted -desktop images; GPT-6 Sol/Terra/Luna and Claude Opus 5.5 in the Nous and OpenRouter catalogs; an official Blender Lab integration and NVIDIA app/Broadcast plugins; a long run of hot-path performance work across config loading, the tool registry, gateway message handling and the model picker; and dozens of new community plugins in the catalog.
+ Full curated release notes for this window ship with v0.22.0 , which will document everything from v0.21.0 onward — highlights, feature areas, and complete contributor credits. Nothing in this window is skipped.
+ hermes update (git installs), or re-run the installer one-liner.
+ Docker / Hermes Cloud: images build from this tag ( nousresearch/hermes-agent:v2026.9.24 ).
+ Full changelog: v2026.9.21...v2026.9.24
+ 51 people reacted
+ Hermes Agent v0.21.4 (v2026.9.21)
+ Hermes Agent v0.21.4 (v2026.9.21)
+ 21 Sep 18:10
+ v2026.9.21
+ d337b73
+ Hermes Agent v0.21.4 (v2026.9.21)
+ Release Date: September 21, 2026
+ Patch release. This tag rolls up the ~1,800 PRs merged since v0.21.3 into a stable tagged release for downstream consumers (Docker images, Hermes Cloud, hosted deployments). Full curated notes for this window are deferred to v0.22.0.
+ Measured at commit 4b8a8134009a8727a289bcabeb0019fedd353128 , the window since v0.21.3 contains 5,071 non-merge commits across 5,169 changed files (+312,961 / −62,855), 1,812 merged PRs and 2,116 closed issues .
+ Also in the window, undocumented here on purpose: a host-wide gateway singleton lock with a rendezvous record, and Desktop attaching to the running host backend instead of spawning a second one; one backend-owned connector operation with a setup card on Desktop, TUI and CLI; --format stream-json structured JSONL output for the CLI; skills.auto_load pinning skills into every new session's prompt; a Desktop chat/UI font picker, one-click local engine updates, and plugin uninstall from the Plugins hub; a decline unauthorized-DM behavior for the gateway; a configurable MCP discovery connect cap ( mcp.discovery_concurrency ); session_search after/before bounds plus OR-relaxed recall retry; hermes sessions set-journal-mode ; LTX 2.5 and Kling O3 in the video catalogs; a website page for every catalog plugin and author, with pinned-commit READMEs and added/updated sorting; a dozen new community plugins in the catalog (tailscale, ssh, shodan, terminal, rss, resetwatch, done-bell, kiwi, cognee, Octen); and a large run of profile/multiplex isolation, cron, kanban, Desktop and state.db fixes.
+ Full curated release notes for this window ship with v0.22.0 , which will document everything from v0.21.0 onward — highlights, feature areas, and complete contributor credits. Nothing in this window is skipped.
+ hermes update (git installs), or re-run the installer one-liner.
+ Docker / Hermes Cloud: images build from this tag ( nousresearch/hermes-agent:v2026.9.21 ).
+ Full changelog: v2026.9.14...v2026.9.21
+ 63 people reacted
+ Hermes Agent v0.21.3 (v2026.9.14)
+ Hermes Agent v0.21.3 (v2026.9.14)
+ 14 Sep 16:04
… diff truncated (120 added / 114 removed lines)
```

### openai.api.changelog

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/changelog
- Change: changed
- Prior hash: 5bdc521726ff9dc7c3a2b1f5aca76cb13626f76ef5c56c4d029d7da314097e09
- Current hash: a9fb2f9ca4550d17597584f2b98d438180fa5f54dd7f289b179e09926cb07996

```diff
- Updated the [Realtime and audio guide](https://developers.openai.com/api/docs/guides/realtime), added a dedicated [Realtime translation guide](https://developers.openai.com/api/docs/guides/realtime-translation), refreshed [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription) for streaming transcripts, and moved realtime prompting guidance into [Using realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting).
- Expanded `input_file` support to accept more document, presentation, spreadsheet, code, and text file types. Learn more [here](https://developers.openai.com/api/docs/guides/file-inputs).
- Added dedicated SIP IP ranges for Realtime API. `sip.api.openai.com` does GeoIP routing, and will direct SIP traffic to the closest region. [Learn more](https://developers.openai.com/api/docs/guides/realtime-sip#dedicated-sip-ip-ranges).
+ ### Sep 25
+ Fix · Model: gpt-6-sol · Model: gpt-6-luna
+ Fixed a bug in image encoding that degraded image understanding in [GPT-6 Sol](https://developers.openai.com/api/docs/models/gpt-6-sol) and [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna). This update improves results on visual tasks in the API and Codex, including computer use.
+ If your use cases involve image inputs, we recommend rerunning your evaluations and retrying workflows affected by the issue.
+ ### Sep 22
+ Feature · Model: gpt-6-sol · Model: gpt-6-luna · API: v1/responses · API: v1/chat/completions
+ Released [GPT-6 Sol](https://developers.openai.com/api/docs/models/gpt-6-sol) (`gpt-6-sol`) and [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) (`gpt-6-luna`).
+ These reasoning models accept text and image inputs and generate text through the Responses and Chat Completions APIs.
+ Standard pricing per 1M tokens for prompts with up to 272K input tokens:
+ - GPT-6 Sol: $2 input, $0.20 cached input, and $10 output.
+ - GPT-6 Luna: $0.10 input, $0.01 cached input, and $0.50 output.
+ Compare capabilities in the [model catalog](https://developers.openai.com/api/docs/models), and see [pricing](https://developers.openai.com/api/docs/pricing) for cache writes, longer prompts, and other processing tiers.
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
- Current hash: adbcf18a0dcf4eec91ca1d5e20ced2a9c1217de055a1fe568a2cea53221812b6

```diff
- {role: :developer, content: instructions},
- {role: :user, content: "My monitor won't turn on - help!"}
- data_source_config: {type: :custom, item_schema: {type: :object, properties: {input: {type: :string}}, required: ["input"]}},
- testing_criteria: [{type: :string_check, name: "mentions_refund", input: "{{sample.output_text}}", operation: :contains, reference: "refund"}]
- There are several ways to provide test data for eval runs, but it may be convenient to upload a [JSONL](https://jsonlines.org/) file that contains data in the schema we specified when we created our eval. A sample JSONL file that conforms to the schema we set up is below:
- source: {type: :file_id, id: "YOUR_FILE_ID"},
- {role: :user, content: "{{ item.ticket_text }}"}
- In our simple test, the model reliably generated the content we wanted for a small test case sample. In reality, you will often have to run your eval with more criteria, different prompts, and different data sets. But the process above gives you all the tools you need to build robust evals for your LLM apps!
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
+ You can provide test data for eval runs in several ways, but it may be convenient to upload a [JSONL](https://jsonlines.org/) file that contains data in the schema we specified when we created our eval. A sample JSONL file that conforms to the schema we set up is below:
+ source: {
+ type: :file_id,
+ id: "YOUR_FILE_ID"
+ role: :user,
+ content: "{{ item.ticket_text }}"
+ In our test, the model reliably generated the content we wanted for a small test case sample. In reality, you will often have to run your eval with more criteria, different prompts, and different data sets. But the process above gives you all the tools you need to build robust evals for your LLM apps!
```

### openai.api.models

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/models/all
- Change: changed
- Prior hash: 4ee5fe4d6acb67da82da3ddcdf40d7b07263efe6d3d12058f720ef843c524278
- Current hash: f81d00c63fb6c1f69d57335500458b52d92550ce81c57d81356db133e438af27

```diff
- ChatGPT Start searching API Dashboard
- Overview Models Agents Tools Voice & Audio Production API reference
- Overview Models Agents Tools Voice & Audio Production API reference Models
- Using GPT-6 Astra
- Images and video
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
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Workload identity
- Meetups
- Meetups
- Automating repetitive work at OpenAI with Codex
- Meet the winners of OpenAI Build Week
- Meetups
- Sora 2
- Flagship video generation with synced audio
- Sora 2 Pro
- Most advanced synced-audio video generation
+ Overview Models Agents Tools Audio & voice Production API reference
+ Overview Models Agents Tools Audio & voice Production API reference Models
+ Using GPT-6
+ Images
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
+ WebRTC with WARP
+ WebSockets
+ Telephony and SIP
+ Server-side controls
+ Audio processing
+ Live transcription
… diff truncated (69 added / 37 removed lines)
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
- Current hash: 2ebdcee9a9443bb69804d3ea07fba14f5195c309fd1f36ab7a242ed5f3d6b943

```diff
- ChatGPT Start searching API Dashboard
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- Using GPT-6 Astra
- Images and video
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
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Workload identity
- Meetups
- Meetups
- Automating repetitive work at OpenAI with Codex
- Meet the winners of OpenAI Build Week
- Meetups
- li+li]:mt-12"> 2026-09-04
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.153.4
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.153.3
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.153.2
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.153.1
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.153.0
- Codex CLI 0.152.1
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.152.1
+ Overview Models Agents Tools Audio & voice Production API reference Overview
+ Using GPT-6
+ Images
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
+ WebRTC with WARP
+ WebSockets
+ Telephony and SIP
+ Server-side controls
+ Audio processing
+ Live transcription
+ Text to speech
… diff truncated (1464 added / 1505 removed lines)
```

### openai.codex.models

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/models
- Change: changed
- Prior hash: a1d747122bcb7a290eba962315d8ffb3a0085d204ef5c1e00595f3b047ee8332
- Current hash: 421bf5c06ed5dacd940ca031e5f35fc0be7181fac5b3dad1e74d3830f4c7fab3

```diff
- ChatGPT Start searching API Dashboard
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- Using GPT-6 Astra
- Images and video
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
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Workload identity
- Meetups
- Meetups
- Automating repetitive work at OpenAI with Codex
- Meet the winners of OpenAI Build Week
- Meetups
- In the ChatGPT desktop app, use the model and reasoning control beneath the
- composer to choose an available model and adjust its reasoning effort.
- 5.6 Sol Extra High Selections in this preview don't change your ChatGPT settings. 5.6 Sol Extra High, 5 of 6. Use Left and Right arrow keys to adjust power.
- 5.6 Sol Extra High Selections in this preview don't change your ChatGPT settings. 5.6 Sol Extra High, 5 of 6. Use Left and Right arrow keys to adjust power.
- codex --model gpt-5.6
- codex exec -m gpt-5.6 "Review the current changes"
- Select Reasoning Level for gpt-5.6-sol
- 5.6 Sol Extra High Selections in this preview don't change your ChatGPT settings. 5.6 Sol Extra High, 5 of 6. Use Left and Right arrow keys to adjust power.
+ Overview Models Agents Tools Audio & voice Production API reference Overview
+ Using GPT-6
+ Images
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
+ WebRTC with WARP
+ WebSockets
+ Telephony and SIP
+ Server-side controls
+ Audio processing
+ Live transcription
+ Text to speech
… diff truncated (130 added / 86 removed lines)
```

### openai.codex.plan-usage

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/pricing
- Change: changed
- Prior hash: 8cac49415a6fc9271c1ac405e9ee3464e585c1c1ee8a97976f1d5f63dc7413e6
- Current hash: c07e499a98d5d21dedec3c633a6408c4152dd448a9e0646ad34a38c3d4b34818

```diff
- ChatGPT Start searching API Dashboard
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- Using GPT-6 Astra
- Images and video
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
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- MCP Server
- Workload identity
- Meetups
- Meetups
- Automating repetitive work at OpenAI with Codex
- Meet the winners of OpenAI Build Week
- Meetups
- The GPT-5.6 model family, including Sol, Terra, and Luna
- GPT-5.6 Luna for higher usage limits on lighter-weight or high-volume
- workloads
- Access to GPT-5.3-Codex-Spark (research preview), a fast Codex model
- for day-to-day coding tasks
- Unlimited ChatGPT Voice on the $200/month tier; tasks still draw from
- your Codex usage budget
- recipient's email address, and send the invitation.
+ Overview Models Agents Tools Audio & voice Production API reference Overview
+ Using GPT-6
+ Images
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
+ WebRTC with WARP
+ WebSockets
+ Telephony and SIP
+ Server-side controls
+ Audio processing
+ Live transcription
+ Text to speech
… diff truncated (113 added / 95 removed lines)
```

## Volatile noise (ignored)

- `anthropic.claude-code.legal` — https://code.claude.com/docs/en/legal-and-compliance
- `anthropic.platform.access-transparency` — https://platform.claude.com/docs/en/manage-claude/access-transparency
- `apify.cli.changelog` — https://docs.apify.com/cli/docs/changelog
- `apify.platform.changelog` — https://apify.com/change-log?_format=html
- `firecrawl.github.releases` — https://github.com/firecrawl/firecrawl/releases
- `gemini.api.rate-limits` — https://ai.google.dev/gemini-api/docs/rate-limits
