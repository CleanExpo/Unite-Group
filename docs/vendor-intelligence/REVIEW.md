# Nexus vendor-intelligence review

Generated: 2026-08-15T17:23:38.050Z

Summary: 36 sources reviewed; 27 material; 7 volatile noise; 2 unchanged.

## Material changes

### anthropic.claude-code.changelog

- Vendor: Anthropic
- Source: https://code.claude.com/docs/en/changelog
- Change: changed
- Prior hash: 377c76e54b9a7c2a094da84cd6a234bb3e839c18dc343cb387c7d90feb6f7912
- Current hash: c80c24ed4c0885a9b451ccd74de4311fe1840447666c67d41fb1923da14dcdf2

```diff
+ <Update label="2.1.233" description="August 14, 2026">
+ * Added GitLab merge request URL support to the `--worktree` flag and the `claude agents` view (where MRs display as `!N`)
+ * Added an opt-in `forward_user_identity` apps gateway setting on Anthropic upstreams that sends the signed-in user's identity as headers, so a proxy behind the gateway can attribute spend per user
+ * Added opt-in memory cgroup support for Bash tool commands on Linux (`CLAUDE_CODE_TOOL_MEMORY_LIMIT`) so a runaway build can't stall the session
+ * Added `CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS` environment variable to configure the WebFetch session URL cache TTL (default unchanged: 15 minutes)
+ * Fixed cloud sessions occasionally being marked as lost when the environment shut down while Claude was waiting on a permission prompt
+ * Fixed MCP v2 connections endlessly reopening the subscriptions/listen stream against servers that terminate long-held streams on a fixed timeout (e.g. serverless hosts)
+ * Fixed Notification hooks not firing for permission prompts when running under Claude Desktop or VS Code
+ * Fixed idle sessions on Linux sometimes keeping one CPU core at 100% when sandboxing is enabled
+ * Fixed bundled skill aliases like `/checkup` and `/review` reporting "Unknown command" in `-p` mode or with plugins/MCP loaded when a user or project skill shadows the bundled skill
+ * Fixed skill/command argument substitution to prevent argument values from being re-expanded as template markers
+ * Fixed Windows paths spelled with the NT `\??\` device prefix bypassing UNC path validation, closing an NTLM credential-leak vector
+ * Improved `claude self-hosted-runner` session start time: the session branch is now created without rewriting the working tree, and two server round trips no longer block the agent's launch
+ * Improved apps gateway error forwarding: 400/413 errors from Vertex, Foundry, and Claude Platform on AWS upstreams now carry the upstream's own message; fixes a bug with auto-compact on apps gateway
+ * Improved `claude plugin validate` to check a bare `.claude/skills` directory, reporting SKILL.md files whose frontmatter fails to parse
+ * Improved screen reader mode: the `/effort` selector renders as a numbered list with a typed-number prompt, and hint and dialog text is no longer clipped
+ * Improved print mode diagnostics: a `[claude-code:unrecognized_model]` line is written to stderr when a request goes out for a model ID Claude Code doesn't recognize; map it with `modelOverrides` to silence
+ * Changed the GitHub app setup tip to no longer appear in repositories whose origin remote is on gitlab.com or bitbucket.org; the enterprise marketplace tip now covers non-GitHub internal git hosts
+ * Todo/task-tracking tools (TaskCreate/Get/Update/List, TodoWrite) are no longer available on Opus 4.8, Sonnet 5, Fable 5, Mythos 5, and newer models; set `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` to bring them back
+ * Windows: fixed auto mode repeatedly stopping for manual approval on ordinary `cd <dir> && <command> > file` Bash commands (a 2.1.232 regression)
+ * Reverted the 2.1.232 Bash permission changes for Cygwin-style symlinks on Windows and for input redirections (`< file`); a narrower version will return in a later release
+ <Update label="2.1.232" description="August 13, 2026">
+ * Subagent forking is now on by default: a `subagent_type: "fork"` subagent inherits the full conversation and prompt cache, and non-teammate agent spawns in interactive sessions now run in the background by default
+ * Type `@` in the prompt to mention another Claude session by name; Claude then uses `SendMessage` to reach that session directly
+ * `SendMessage` now delivers to a bare name that exactly matches one live session, instead of asking to confirm with a ref first
+ * Interactive sessions on one machine now keep unique names: starting or renaming a session to a name another live session already uses gives it a `name-word-word` variant and tells you
+ * Added `/config` rows for "Dialog expiry" and "Messages from your other sessions" (cross-session inbound accept/hold/refuse)
+ * Added secret redaction for GitLab token families (`glrt-`, `gloas-`, `glptt-`, `glagent-`, `glimt-`, `glsoat-`, `glcbt-`, `glft-`, `glffct-`) and full redaction of routable `glpat-`/`gldt-` tokens; the `glab` CLI config store gets the same sandbox and credential-path protection as `gh`
+ * Added GitLab support to plugin marketplaces: bare `gitlab.com` repo URLs (including nested subgroups) now clone like `github.com` URLs, and clone auth-failure hints name your actual git host
+ * Settings: `additionalMarketplaces` and `allowedMarketplaces` are now accepted as friendlier aliases for `extraKnownMarketplaces` and `strictKnownMarketplaces`
+ * Enterprise policy: a url-typed `blockedMarketplaces` entry for a bare repo URL keeps blocking that URL when the CLI classifies it as a git clone
+ * Gateway: the `desktop:` overlay now accepts every released Desktop setting (was 11 hand-listed keys), validated at boot against Desktop's own schema; unknown or invalid keys fail boot
+ * Gateway: empty `managed.policies[].match.groups`/`admin.admin_groups` entries and malformed `email_domain` values (empty, or containing `@`, whitespace, or commas) now fail at boot instead of silently matching no one or granting admin access
+ * Fable 5 is offered as an advisor in `/advisor` again for organizations with Fable access, with usage-credits consent set up through `/model fable`
+ * Fixed a PowerShell permission bypass where variable-writing parameters could silently overwrite `$PSDefaultParameterValues` and redirect later commands' file access
+ * Fixed a Windows permission bypass where Git Bash followed Cygwin-style symlinks that path validation saw as regular files; writes through them now require permission approval
+ * Fixed nested git repositories inheriting trust from a parent directory; each repository now requires its own trust confirmation
+ * Fixed MCP connections hanging for the full 30-second connect timeout when a server fails to answer or sends a malformed reply to the protocol-version probe
+ * Fixed Remote Control sessions hosted by a bridge inside a cloud session inheriting that session's transcript or credentials
+ * Fixed Remote Control sessions started from Claude Desktop or an IDE appearing as a new claude.ai session each time the local session was resumed; they now reattach to the existing one
… diff truncated (131 added / 0 removed lines)
```

### anthropic.platform.access-transparency

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/access-transparency
- Change: changed
- Prior hash: 4f7977a34ccfec25bdda80b3b908ab8ca9c0d0014e2d6701b5d86fa16bc93a48
- Current hash: fb85db257149c86ca53a4b14bc8430d712a793e354f52dd7ff75f1d04bf0b6c2
- Surface: Anthropic API compliance — Access Transparency (api-compliance)
- Surface note: Access Transparency is a human-access audit facility covering specific Anthropic API customer-data surfaces only. It is NOT Claude Max usage telemetry and does not cover the excluded consumer/application surfaces. Changes here classify strictly under the API-compliance surface and must never be reported as Max or consumer usage telemetry.
- Explicitly excludes: Claude Max plan usage telemetry; Claude consumer application (Claude.ai) surfaces; Claude Code local session telemetry; Claude mobile and desktop application usage

```diff
- # Access Transparency
- Receive an audit record of human access to your organization's data by Anthropic personnel through the Compliance API.
- * Each human view of your retained data (see [covered content](#what-access-transparency-covers)) by an Anthropic employee writes an `anthropic_access` activity to your [Compliance API Activity Feed](/docs/en/manage-claude/compliance-activity-feed).
- * Access occurs only for safety review or incident response. See [Reason codes](#reason-codes).
- * **Events represent human access, not automated processing.** Anthropic's automated safety systems process your content in a secured pipeline with no interactive human access; that processing does not generate `anthropic_access` events. The one event automated processing can initiate is a `cmek_preserve` preservation record (see [CMEK content preservation](#cmek-content-preservation)).
- * **Events arrive on your existing feed.** Activities are accessible through your [Compliance API Activity Feed](/docs/en/manage-claude/compliance-activity-feed). Existing credentials, audit, export, and SIEM integrations for the Compliance API will still apply.
- * **Covered content:** Access Transparency covers prompt and response content sent through the Claude Messages API or Claude Code sessions. Anthropic's [general ZDR documentation](/docs/en/manage-claude/api-and-data-retention) and [ZDR for Claude Code documentation](https://code.claude.com/docs/en/zero-data-retention) explain which APIs and features are covered by ZDR. The same APIs and features are covered by Access Transparency.
- * **Automated processing:** Model serving, safety classifiers, and abuse-detection pipelines process your content as part of normal operation and do not generate `anthropic_access` events. Preservation initiated by automated processing does generate a `cmek_preserve` event (see [CMEK content preservation](#cmek-content-preservation)).
- * **Your own organization's activity:** Your API calls, admin actions, and Compliance API reads are covered by standard [Activity Feed](/docs/en/manage-claude/compliance-activity-feed) event types.
- Pagination, date-range filtering (`created_at.gte` / `.lt`), and the response envelope (`has_more`, `first_id`, `last_id`) are shared with the rest of the Activity Feed. See [Query the Activity Feed](/docs/en/manage-claude/compliance-activity-feed).
- | `reason_code` | enum | See [Reason codes](#reason-codes) |
- * **A preservation event is written to your feed.** When content is preserved, an event with type `cmek_preserve` is written to your Compliance API Activity Feed. Preservation events carry the same fields as an `anthropic_access` event; only the event type differs, so a parser that handles one handles both. See [Reason codes](#reason-codes).
- `anthropic_access` events record human access only. Anthropic's automated safety systems and classifiers continue to process your content as part of normal operation, and that processing does not generate `anthropic_access` events. The one event automated processing can initiate is a `cmek_preserve` preservation record (see [CMEK content preservation](#cmek-content-preservation)). An empty feed means no human at Anthropic has viewed your content; it does not mean your content was not processed by automated systems.
- Use the `resource_details.id` field. It contains the same message ID (`msg_...`) that the [Messages API](/docs/en/api/messages/create) returns in the `id` field of every response body. To make this useful, log `id` in your own systems alongside your internal metadata, such as the application, end user, or conversation that produced the request. When an event arrives, join its `resource_details.id` against your logs to identify exactly which request was viewed.
- They are independent. With CMEK, safety preservation outside your key emits a separate `cmek_preserve` event on the same feed. See [CMEK content preservation](#cmek-content-preservation) and [CMEK](/docs/en/manage-claude/cmek).
- * [Compliance API overview](/docs/en/manage-claude/compliance-api)
- * [Activity Feed](/docs/en/manage-claude/compliance-activity-feed)
- * [API and data retention](/docs/en/manage-claude/api-and-data-retention)
- * [Customer-Managed Encryption Keys (CMEK)](/docs/en/manage-claude/cmek)
+ title: Access Transparency
+ url: https://platform.claude.com/docs/en/manage-claude/access-transparency
+ description: Receive an audit record of human access to your organization's data by Anthropic personnel through the Compliance API.
+ * Each human view of your retained data (see [covered content](https://platform.claude.com/docs/en/manage-claude/access-transparency#what-access-transparency-covers)) by an Anthropic employee writes an `anthropic_access` activity to your [Compliance API Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed).
+ * Access occurs only for safety review or incident response. See [Reason codes](https://platform.claude.com/docs/en/manage-claude/access-transparency#reason-codes).
+ * **Events represent human access, not automated processing.** Anthropic's automated safety systems process your content in a secured pipeline with no interactive human access; that processing does not generate `anthropic_access` events. The one event automated processing can initiate is a `cmek_preserve` preservation record (see [CMEK content preservation](https://platform.claude.com/docs/en/manage-claude/access-transparency#cmek-content-preservation)).
+ * **Events arrive on your existing feed.** Activities are accessible through your [Compliance API Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed). Existing credentials, audit, export, and SIEM integrations for the Compliance API will still apply.
+ * **Covered content:** Access Transparency covers prompt and response content sent through the Claude Messages API or Claude Code sessions. Anthropic's [general ZDR documentation](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) and [ZDR for Claude Code documentation](https://code.claude.com/docs/en/zero-data-retention) explain which APIs and features are covered by ZDR. The same APIs and features are covered by Access Transparency.
+ * **Automated processing:** Model serving, safety classifiers, and abuse-detection pipelines process your content as part of normal operation and do not generate `anthropic_access` events. Preservation initiated by automated processing does generate a `cmek_preserve` event (see [CMEK content preservation](https://platform.claude.com/docs/en/manage-claude/access-transparency#cmek-content-preservation)).
+ * **Your own organization's activity:** Your API calls, admin actions, and Compliance API reads are covered by standard [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) event types.
+ Pagination, date-range filtering (`created_at.gte` / `.lt`), and the response envelope (`has_more`, `first_id`, `last_id`) are shared with the rest of the Activity Feed. See [Query the Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed).
+ | `reason_code` | enum | See [Reason codes](https://platform.claude.com/docs/en/manage-claude/access-transparency#reason-codes) |
+ * **A preservation event is written to your feed.** When content is preserved, an event with type `cmek_preserve` is written to your Compliance API Activity Feed. Preservation events carry the same fields as an `anthropic_access` event; only the event type differs, so a parser that handles one handles both. See [Reason codes](https://platform.claude.com/docs/en/manage-claude/access-transparency#reason-codes).
+ `anthropic_access` events record human access only. Anthropic's automated safety systems and classifiers continue to process your content as part of normal operation, and that processing does not generate `anthropic_access` events. The one event automated processing can initiate is a `cmek_preserve` preservation record (see [CMEK content preservation](https://platform.claude.com/docs/en/manage-claude/access-transparency#cmek-content-preservation)). An empty feed means no human at Anthropic has viewed your content; it does not mean your content was not processed by automated systems.
+ Use the `resource_details.id` field. It contains the same message ID (`msg_...`) that the [Messages API](https://platform.claude.com/docs/en/api/messages/create) returns in the `id` field of every response body. To make this useful, log `id` in your own systems alongside your internal metadata, such as the application, end user, or conversation that produced the request. When an event arrives, join its `resource_details.id` against your logs to identify exactly which request was viewed.
+ They are independent. With CMEK, safety preservation outside your key emits a separate `cmek_preserve` event on the same feed. See [CMEK content preservation](https://platform.claude.com/docs/en/manage-claude/access-transparency#cmek-content-preservation) and [CMEK](https://platform.claude.com/docs/en/manage-claude/cmek).
+ * [Compliance API overview](https://platform.claude.com/docs/en/manage-claude/compliance-api)
+ * [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed)
+ * [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
+ * [Customer-Managed Encryption Keys (CMEK)](https://platform.claude.com/docs/en/manage-claude/cmek)
```

### anthropic.platform.authentication

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/authentication
- Change: changed
- Prior hash: 3dfa852df89193be1ba0415ffa7e131fe2e7d118d5fa02feb4f8957805c8bb83
- Current hash: f2ccf0c17cf163c589edf43e2e3c18378e3c954277231227bb43f7e0319be84b

```diff
- # Authentication
- Authenticate to the Claude API with API keys, Workload Identity Federation, or App Attest.
- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
- | [API key](#api-keys) | Static `sk-ant-api...` secret in the `x-api-key` header | Local development, prototyping, scripts, and single-tenant servers where you control secret storage |
- | [Workload Identity Federation](#workload-identity-federation) | Short-lived bearer token exchanged from your identity provider's identity token | Production workloads on cloud platforms (AWS, Google Cloud, Azure), CI/CD pipelines, and Kubernetes, where you want to eliminate static secrets |
- | [App Attest](#app-attest) | Short-lived access token issued to a genuine, attested installation of your registered iOS or macOS app | iOS and macOS apps distributed to end users, where the app calls the Claude API directly with no back end or proxy |
- * **Create a key:** Go to [Settings → API keys](https://platform.claude.com/settings/keys) in the Claude Console. You choose an [expiration](#key-expiration) as part of creation. Use [workspaces](https://platform.claude.com/settings/workspaces) to scope keys by project or environment.
- * **Send the key:** Set the `x-api-key` header on direct HTTP requests, or set the `ANTHROPIC_API_KEY` environment variable and the [client SDKs](/docs/en/cli-sdks-libraries/overview) pick it up automatically.
- Store API keys in a secrets manager, rotate them periodically, and revoke any key you suspect has leaked. You can also set an [expiration](#key-expiration) when you create a key to limit how long a leaked credential stays usable.
- When you create an API key from the [API keys page](https://platform.claude.com/settings/keys) in the Claude Console, you choose an expiration: a preset (3 hours, 1 day, 7 days, or 30 days), a custom duration, or **Never** for keys you store in a secrets manager and rotate yourself. If your organization has a maximum expiration policy, the Console limits presets and custom durations to the policy maximum, and **Never** is unavailable. Existing keys keep their current behavior; expiration is set at creation time and cannot be changed afterward. The same expiration choice applies when you [create an Admin API key](/docs/en/manage-claude/admin-api-keys) in the Claude Console.
- The Console API keys table shows each key's expiration, and the Admin API reports each key's `expires_at` timestamp on the [List API Keys](/docs/en/api/admin/api_keys/list) and [Retrieve API Key](/docs/en/api/admin/api_keys/retrieve) endpoints, so you can audit and rotate keys before they expire. The field is `null` for keys without an expiration.
- To configure federation, you create three resources in the Claude Console (a service account, a federation issuer, and a federation rule) and then point your SDK at the rule. See [Workload Identity Federation](/docs/en/manage-claude/workload-identity-federation) for the full setup walkthrough.
- App Attest authenticates iOS and macOS apps that call the Claude API directly from the device. Each installation proves that it is a genuine, unmodified build of an app you registered in the Claude Console, using Apple's App Attest service. Anthropic then issues the device a short-lived access token that bills usage to your workspace. Tokens are scoped to your workspace, expire after one hour, and authorize only [Messages API](/docs/en/api/messages/create) calls.
- To register your app and get a client ID, see [App Attest for iOS and macOS apps](/docs/en/manage-claude/app-attest).
- <Card title="Set up Workload Identity Federation" icon="lock" href="/docs/en/manage-claude/workload-identity-federation">
- <Card title="Identity provider guides" icon="cloud" href="/docs/en/manage-claude/workload-identity-federation#identity-providers">
- <Card title="WIF reference" icon="book" href="/docs/en/manage-claude/wif-reference">
- <Card title="App Attest for iOS and macOS apps" icon="fingerprint" href="/docs/en/manage-claude/app-attest">
- <Card title="Client SDKs" icon="code" href="/docs/en/cli-sdks-libraries/overview">
+ title: Authentication
+ url: https://platform.claude.com/docs/en/manage-claude/authentication
+ description: Authenticate to the Claude API with API keys, Workload Identity Federation, or App Attest.
+ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
+ | [API key](https://platform.claude.com/docs/en/manage-claude/authentication#api-keys) | Static `sk-ant-api...` secret in the `x-api-key` header | Local development, prototyping, scripts, and single-tenant servers where you control secret storage |
+ | [Workload Identity Federation](https://platform.claude.com/docs/en/manage-claude/authentication#workload-identity-federation) | Short-lived bearer token exchanged from your identity provider's identity token | Production workloads on cloud platforms (AWS, Google Cloud, Azure), CI/CD pipelines, and Kubernetes, where you want to eliminate static secrets |
+ | [App Attest](https://platform.claude.com/docs/en/manage-claude/authentication#app-attest) | Short-lived access token issued to a genuine, attested installation of your registered iOS or macOS app | iOS and macOS apps distributed to end users, where the app calls the Claude API directly with no back end or proxy |
+ * **Create a key:** Go to [Settings → API keys](https://platform.claude.com/settings/keys) in the Claude Console. You choose an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration) as part of creation. Use [workspaces](https://platform.claude.com/settings/workspaces) to scope keys by project or environment.
+ * **Send the key:** Set the `x-api-key` header on direct HTTP requests, or set the `ANTHROPIC_API_KEY` environment variable and the [client SDKs](https://platform.claude.com/docs/en/cli-sdks-libraries/overview) pick it up automatically.
+ Store API keys in a secrets manager, rotate them periodically, and revoke any key you suspect has leaked. You can also set an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration) when you create a key to limit how long a leaked credential stays usable.
+ When you create an API key from the [API keys page](https://platform.claude.com/settings/keys) in the Claude Console, you choose an expiration: a preset (3 hours, 1 day, 7 days, or 30 days), a custom duration, or **Never** for keys you store in a secrets manager and rotate yourself. If your organization has a maximum expiration policy, the Console limits presets and custom durations to the policy maximum, and **Never** is unavailable. Existing keys keep their current behavior; expiration is set at creation time and cannot be changed afterward. The same expiration choice applies when you [create an Admin API key](https://platform.claude.com/docs/en/manage-claude/admin-api-keys) in the Claude Console.
+ The Console API keys table shows each key's expiration, and the Admin API reports each key's `expires_at` timestamp on the [List API Keys](https://platform.claude.com/docs/en/api/admin/api_keys/list) and [Retrieve API Key](https://platform.claude.com/docs/en/api/admin/api_keys/retrieve) endpoints, so you can audit and rotate keys before they expire. The field is `null` for keys without an expiration.
+ To configure federation, you create three resources in the Claude Console (a service account, a federation issuer, and a federation rule) and then point your SDK at the rule. See [Workload Identity Federation](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation) for the full setup walkthrough.
+ App Attest authenticates iOS and macOS apps that call the Claude API directly from the device. Each installation proves that it is a genuine, unmodified build of an app you registered in the Claude Console, using Apple's App Attest service. Anthropic then issues the device a short-lived access token that bills usage to your workspace. Tokens are scoped to your workspace, expire after one hour, and authorize only [Messages API](https://platform.claude.com/docs/en/api/messages/create) calls.
+ To register your app and get a client ID, see [App Attest for iOS and macOS apps](https://platform.claude.com/docs/en/manage-claude/app-attest).
+ <Card title="Set up Workload Identity Federation" icon="lock" href="https://platform.claude.com/docs/en/manage-claude/workload-identity-federation">
+ <Card title="Identity provider guides" icon="cloud" href="https://platform.claude.com/docs/en/manage-claude/workload-identity-federation#identity-providers">
+ <Card title="WIF reference" icon="book" href="https://platform.claude.com/docs/en/manage-claude/wif-reference">
+ <Card title="App Attest for iOS and macOS apps" icon="fingerprint" href="https://platform.claude.com/docs/en/manage-claude/app-attest">
+ <Card title="Client SDKs" icon="code" href="https://platform.claude.com/docs/en/cli-sdks-libraries/overview">
```

### anthropic.platform.data-retention

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- Change: changed
- Prior hash: 77b8028f0a90f165deba8a0fd4d360e76cbe3bf2459cdfd6495b20e5029de4aa
- Current hash: 49cd0a59f8f2b7ed7f526f64c5e6f663329a3096b2600b210f7e8185f4949391

```diff
- # API and data retention
- Learn about how Anthropic's APIs and associated features retain data, including information about zero data retention (ZDR) and HIPAA-ready API access.
- This page covers the Claude API (`api.anthropic.com`), Claude Platform on AWS, and [Claude in Microsoft Foundry](/docs/en/build-with-claude/claude-in-microsoft-foundry), where Anthropic is the data processor. On Amazon Bedrock and Google Cloud's Agent Platform, the cloud provider is the data processor; refer to those platforms' data retention and compliance documentation for their equivalent controls.
- Anthropic offers two data handling arrangements for the Claude API: [zero data retention (ZDR)](#zero-data-retention-zdr-scope) and [HIPAA readiness](#hipaa-readiness). The [feature eligibility table](#feature-eligibility) lists which API features each arrangement covers. For Anthropic's standard retention policies outside these arrangements, see the [commercial data retention policy](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) and the [consumer data retention policy](https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data).
- * Only what is technically necessary for the feature to work is retained. Conversation content (your prompts and Claude's outputs) is not retained by default; the exception is [Covered Models](#model-specific-data-retention-requirements), which require 30-day retention.
- Several retention models sit outside the ZDR and HIPAA arrangements described on this page. Data accessible through the [Compliance API](/docs/en/manage-claude/compliance-api) follows its own retention model: the [Activity Feed](/docs/en/manage-claude/compliance-activity-feed) and [remote session transcripts](/docs/en/manage-claude/compliance-content-data#retrieve-remote-sessions) retain data for 6 years, and chat, file, and project content from claude.ai follows your organization's retention policy set in [claude.ai > Organization settings > Data and privacy](https://claude.ai/admin-settings/data-privacy-controls).
- * **Claude Messages and Token Counting APIs:** ZDR applies to these endpoints for eligible features listed in the [feature eligibility table](#feature-eligibility). Features that ride on `/v1/messages` but are marked "No" in the table (such as code execution) are not covered.
- * **Claude Platform on AWS:** [Claude Platform on AWS](/docs/en/build-with-claude/claude-platform-on-aws) follows the same data retention policy as the first-party Claude API. ZDR is available on request; contact your Anthropic account representative to enable it.
- * **Claude Teams and Claude Enterprise product interfaces:** These interfaces are not ZDR-eligible. The exception is Claude Code used through Claude Enterprise with ZDR enabled; see [What ZDR covers](#what-zdr-covers).
- * **Claude Fable 5 and Claude Mythos 5:** These models require 30-day data retention and are not available under ZDR. See [Model-specific data retention requirements](#model-specific-data-retention-requirements).
- * **Cross-Origin Resource Sharing (CORS):** CORS is not supported for organizations with ZDR arrangements. To make API calls from browser-based applications, route requests through a backend proxy server. See the [API security guidance](/docs/en/api/overview) for proxy patterns and API-key handling.
- * **Flagged content and legal holds:** See [Retention regardless of arrangement](#retention-regardless-of-arrangement).
- The Claude API supports HIPAA-ready integrations for organizations that handle protected health information (PHI). With a signed BAA and a HIPAA-enabled organization, you can use supported API features to process PHI while supporting your organization's HIPAA compliance. Eligible organizations can review and execute the BAA and enable HIPAA readiness directly from the Claude Console. HIPAA readiness applies a broader set of privacy and security safeguards than ZDR (encryption, access controls, and audit logging that protect PHI throughout its lifecycle) rather than requiring immediate deletion. If your organization handles PHI, HIPAA readiness is the arrangement to use; you do not also need ZDR. See the [feature eligibility table](#feature-eligibility) for which features each arrangement covers.
- * **Claude API:** HIPAA readiness applies to the Claude API (`api.anthropic.com`) for eligible features listed in the [feature eligibility table](#feature-eligibility).
- * **Beta features:** Features in beta are generally not covered under the BAA unless explicitly listed as eligible in the [feature eligibility table](#feature-eligibility).
- * **Flagged content and legal holds:** See [Retention regardless of arrangement](#retention-regardless-of-arrangement).
- When using [structured outputs](/docs/en/build-with-claude/structured-outputs) or tools with `strict: true`, the API compiles JSON schemas into grammars that are cached separately from message content. These cached schemas do not receive the same PHI protections as prompts and responses. **Do not include PHI in JSON schema definitions.** This restriction applies to schema property names, `enum` values, `const` values, and `pattern` regular expressions. Patient-specific information should appear only in message content, where it is protected under HIPAA safeguards.
- HIPAA readiness controls are applied to your organization as soon as you accept. Once HIPAA readiness is enabled for your organization, the configuration is permanent and cannot be disabled by an administrator. The API automatically enforces feature restrictions, returning an error for requests that use non-eligible features. See [HIPAA error handling](#hipaa-error-handling).
- Whichever path you use, confirm which features are supported in the [feature eligibility table](#feature-eligibility) and review the [PHI handling guidelines](#phi-handling-guidelines) for features that restrict where PHI can appear. For detailed configuration and compliance requirements, refer to the [HIPAA Implementation Guide](https://trust.anthropic.com/resources).
- * **Yes:** The feature is fully eligible under the arrangement. For ZDR, "Yes" also assumes you are using a model that does not require 30-day data retention; [Covered Models](#model-specific-data-retention-requirements) are not available under ZDR regardless of feature eligibility.
- * **Yes (qualified):** Your prompts and Claude's outputs are not stored, but a bounded technical artifact (named in the Details column) is retained briefly for the feature to function. See [How Anthropic approaches data retention](#how-anthropic-approaches-data-retention) for the commitments that govern these features.
- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
- | [1M token context window](/docs/en/build-with-claude/context-windows) | `/v1/messages` | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
- | [Adaptive thinking](/docs/en/build-with-claude/thinking) | `/v1/messages` | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
- | [Advisor tool](/docs/en/agents-and-tools/tool-use/advisor-tool) | `/v1/messages` (with `advisor` tool) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Advisor model output is returned in the API response; nothing is stored server-side after the response. |
- | [Agent skills](/docs/en/agents-and-tools/agent-skills/overview) | `/v1/messages` (with `skills`) / `/v1/skills` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Skill data retained per standard policy. See [Agent skills](/docs/en/agents-and-tools/agent-skills/overview#data-retention). |
- | [Bash tool](/docs/en/agents-and-tools/tool-use/bash-tool) | `/v1/messages` (with `bash` tool) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | Client-side tool executed in your environment. |
- | [Batch processing](/docs/en/build-with-claude/batch-processing) | `/v1/messages/batches` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | 29-day retention; async storage required. See [Batch processing](/docs/en/build-with-claude/batch-processing#data-retention). |
- | [Cache diagnostics](/docs/en/build-with-claude/cache-diagnostics) | `/v1/messages` (with `diagnostics`) | <Eligible status="qualified">Yes (qualified)</Eligible> | <Eligible status="no">No</Eligible> | Your prompts and Claude's outputs are not stored. A fingerprint of cryptographic hashes and token-count estimates is retained briefly to enable comparison against the next request. See [Cache diagnostics](/docs/en/build-with-claude/cache-diagnostics#data-retention). |
- | [Citations](/docs/en/build-with-claude/citations) | `/v1/messages` | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
- | [Claude Managed Agents](/docs/en/managed-agents/overview) | `/v1/agents`, `/v1/sessions`, `/v1/environments` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Sessions are stateful resources; transcripts persist until you delete them. Applies to all Managed Agents sub-features, including [Self-hosted sandboxes](/docs/en/managed-agents/self-hosted-sandboxes). |
- | [Code execution](/docs/en/agents-and-tools/tool-use/code-execution-tool) | `/v1/messages` (with `code_execution` tool) | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Container data retained up to 30 days. See [Code execution](/docs/en/agents-and-tools/tool-use/code-execution-tool#data-retention). |
- | [Computer use](/docs/en/agents-and-tools/tool-use/computer-use-tool) | `/v1/messages` (with `computer` tool) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Client-side tool where screenshots and files are captured and stored in your environment, not by Anthropic. See [Computer use](/docs/en/agents-and-tools/tool-use/computer-use-tool#data-retention). |
- | [Context editing](/docs/en/build-with-claude/context-editing) | `/v1/messages` (with `context_management`) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Context edits (tool use clearing and thinking clearing) are applied in real time. |
- | [Context management (compaction)](/docs/en/build-with-claude/compaction) | `/v1/messages` (with `context_management`) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Server-side compaction results are returned and round-tripped statelessly through the API response. |
- | [Data residency](/docs/en/manage-claude/data-residency) | `/v1/messages` (with `inference_geo`) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
- | [Effort](/docs/en/build-with-claude/effort) | `/v1/messages` (with `effort`) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
- | [Fast mode](/docs/en/build-with-claude/fast-mode) | `/v1/messages` (with `speed: "fast"`) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | Same Messages API endpoint with faster inference. ZDR applies regardless of speed setting. |
- | [Files API](/docs/en/build-with-claude/files) | `/v1/files` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Files retained until explicitly deleted. See [Files API](/docs/en/build-with-claude/files#data-retention). |
- | [Fine-grained tool streaming](/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming) | `/v1/messages` | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
+ title: API and data retention
+ url: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
+ description: Learn about how Anthropic's APIs and associated features retain data, including information about zero data retention (ZDR) and HIPAA-ready API access.
+ This page covers the Claude API (`api.anthropic.com`), Claude Platform on AWS, and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry), where Anthropic is the data processor. On Amazon Bedrock and Google Cloud's Agent Platform, the cloud provider is the data processor; refer to those platforms' data retention and compliance documentation for their equivalent controls.
+ Anthropic offers two data handling arrangements for the Claude API: [zero data retention (ZDR)](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#zero-data-retention-zdr-scope) and [HIPAA readiness](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#hipaa-readiness). The [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) lists which API features each arrangement covers. For Anthropic's standard retention policies outside these arrangements, see the [commercial data retention policy](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) and the [consumer data retention policy](https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data).
+ * Only what is technically necessary for the feature to work is retained. Conversation content (your prompts and Claude's outputs) is not retained by default; the exception is [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements), which require 30-day retention.
+ Several retention models sit outside the ZDR and HIPAA arrangements described on this page. Data accessible through the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) follows its own retention model. The [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) retains data for 6 years. Chat, file, and project content from claude.ai follows your organization's retention policy set in [claude.ai > Organization settings > Data and privacy](https://claude.ai/admin-settings/data-privacy-controls). [Local session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions) (Cowork and Claude Code on users' machines) are stored for 6 years by default, or for your organization's custom conversation retention period when a finite one is set (the same claude.ai setting). [Remote session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions) (Cowork in the cloud) are retained for 6 years. The Compliance API does not capture local sessions for which ZDR is in effect, or any local sessions from organizations with HIPAA readiness enabled.
+ * **Claude Messages and Token Counting APIs:** ZDR applies to these endpoints for eligible features listed in the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility). Features that ride on `/v1/messages` but are marked "No" in the table (such as code execution) are not covered.
+ * **Claude Platform on AWS:** [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws) follows the same data retention policy as the first-party Claude API. ZDR is available on request; contact your Anthropic account representative to enable it.
+ * **Claude Teams and Claude Enterprise product interfaces:** These interfaces are not ZDR-eligible. The exception is Claude Code used through Claude Enterprise with ZDR enabled; see [What ZDR covers](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#what-zdr-covers).
+ * **Claude Fable 5 and Claude Mythos 5:** These models require 30-day data retention and are not available under ZDR. See [Model-specific data retention requirements](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements).
+ * **Cross-Origin Resource Sharing (CORS):** CORS is not supported for organizations with ZDR arrangements. To make API calls from browser-based applications, route requests through a backend proxy server. See the [API security guidance](https://platform.claude.com/docs/en/api/overview) for proxy patterns and API-key handling.
+ * **Flagged content and legal holds:** See [Retention regardless of arrangement](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#retention-regardless-of-arrangement).
+ The Claude API supports HIPAA-ready integrations for organizations that handle protected health information (PHI). With a signed BAA and a HIPAA-enabled organization, you can use supported API features to process PHI while supporting your organization's HIPAA compliance. Eligible organizations can review and execute the BAA and enable HIPAA readiness directly from the Claude Console. HIPAA readiness applies a broader set of privacy and security safeguards than ZDR (encryption, access controls, and audit logging that protect PHI throughout its lifecycle) rather than requiring immediate deletion. If your organization handles PHI, HIPAA readiness is the arrangement to use; you do not also need ZDR. See the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) for which features each arrangement covers.
+ * **Claude API:** HIPAA readiness applies to the Claude API (`api.anthropic.com`) for eligible features listed in the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility).
+ * **Beta features:** Features in beta are generally not covered under the BAA unless explicitly listed as eligible in the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility).
+ * **Flagged content and legal holds:** See [Retention regardless of arrangement](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#retention-regardless-of-arrangement).
+ When using [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) or tools with `strict: true`, the API compiles JSON schemas into grammars that are cached separately from message content. These cached schemas do not receive the same PHI protections as prompts and responses. **Do not include PHI in JSON schema definitions.** This restriction applies to schema property names, `enum` values, `const` values, and `pattern` regular expressions. Patient-specific information should appear only in message content, where it is protected under HIPAA safeguards.
+ HIPAA readiness controls are applied to your organization as soon as you accept. Once HIPAA readiness is enabled for your organization, the configuration is permanent and cannot be disabled by an administrator. The API automatically enforces feature restrictions, returning an error for requests that use non-eligible features. See [HIPAA error handling](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#hipaa-error-handling).
+ Whichever path you use, confirm which features are supported in the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) and review the [PHI handling guidelines](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#phi-handling-guidelines) for features that restrict where PHI can appear. For detailed configuration and compliance requirements, refer to the [HIPAA Implementation Guide](https://trust.anthropic.com/resources).
+ * **Yes:** The feature is fully eligible under the arrangement. For ZDR, "Yes" also assumes you are using a model that does not require 30-day data retention; [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements) are not available under ZDR regardless of feature eligibility.
+ * **Yes (qualified):** Your prompts and Claude's outputs are not stored, but a bounded technical artifact (named in the Details column) is retained briefly for the feature to function. See [How Anthropic approaches data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#how-anthropic-approaches-data-retention) for the commitments that govern these features.
+ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+ | [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) | `/v1/messages` | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
+ | [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) | `/v1/messages` | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
+ | [Advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool) | `/v1/messages` (with `advisor` tool) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Advisor model output is returned in the API response; nothing is stored server-side after the response. |
+ | [Agent skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) | `/v1/messages` (with `skills`) / `/v1/skills` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Skill data retained per standard policy. See [Agent skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#data-retention). |
+ | [Bash tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool) | `/v1/messages` (with `bash` tool) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | Client-side tool executed in your environment. |
+ | [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) | `/v1/messages/batches` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | 29-day retention; async storage required. See [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing#data-retention). |
+ | [Cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics) | `/v1/messages` (with `diagnostics`) | <Eligible status="qualified">Yes (qualified)</Eligible> | <Eligible status="no">No</Eligible> | Your prompts and Claude's outputs are not stored. A fingerprint of cryptographic hashes and token-count estimates is retained briefly to enable comparison against the next request. See [Cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics#data-retention). |
+ | [Citations](https://platform.claude.com/docs/en/build-with-claude/citations) | `/v1/messages` | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
+ | [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview) | `/v1/agents`, `/v1/sessions`, `/v1/environments` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Sessions are stateful resources; transcripts persist until you delete them. Applies to all Managed Agents sub-features, including [Self-hosted sandboxes](https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes). |
+ | [Code execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool) | `/v1/messages` (with `code_execution` tool) | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Container data retained up to 30 days. See [Code execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool#data-retention). |
+ | [Computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) | `/v1/messages` (with `computer` tool) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | Client-side tool where screenshots and files are captured and stored in your environment, not by Anthropic. See [Computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool#data-retention). |
+ | [Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing) | `/v1/messages` (with `context_management`) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Context edits (tool use clearing and thinking clearing) are applied in real time. |
+ | [Context management (compaction)](https://platform.claude.com/docs/en/build-with-claude/compaction) | `/v1/messages` (with `context_management`) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Server-side compaction results are returned and round-tripped statelessly through the API response. |
+ | [Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency) | `/v1/messages` (with `inference_geo`) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
+ | [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) | `/v1/messages` (with `effort`) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
+ | [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) | `/v1/messages` (with `speed: "fast"`) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | Same Messages API endpoint with faster inference. ZDR applies regardless of speed setting. |
+ | [Files API](https://platform.claude.com/docs/en/build-with-claude/files) | `/v1/files` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Files retained until explicitly deleted. See [Files API](https://platform.claude.com/docs/en/build-with-claude/files#data-retention). |
… diff truncated (66 added / 65 removed lines)
```

### anthropic.platform.release-notes

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/release-notes/overview
- Change: changed
- Prior hash: e00133604c86cf6a9cf5474857687d869b608a79263ab7df3871b9344984d0d3
- Current hash: 69bed00add900550b00b736d3da4a747a215df7fc72454c4f074e45e3eab50a2

```diff
- # Claude Platform release notes
- Updates to the Claude Platform, including the Claude API, client SDKs, and the Claude Console.
- * You can now set a budget on a Claude Managed Agents session: a hard cap on the session's spend, priced at public list rates. A session that reaches its budget pauses with the `budget_reached` stop reason instead of starting new model requests; changing or removing the budget resumes it. Deployments accept the same budget and apply it to each session they start. See [Session budgets](/docs/en/managed-agents/budgets).
- * You can now give a Claude Managed Agents session an advisor: a model at least as capable as the agent's own that the session's primary thread can consult mid-turn for strategic guidance. Configure it as a `{"type": "advisor"}` entry in the agent's multiagent roster, naming the `model` to consult. See [Give the session an advisor](/docs/en/managed-agents/multiagent-orchestration#give-the-session-an-advisor).
- * You can now control where model inference runs for a Claude Managed Agents agent. Set `inference_geo` inside the `model` object when you [create the agent](/docs/en/managed-agents/agent-setup#create-an-agent), or override it for a single session. See [Data residency](/docs/en/manage-claude/data-residency) for the available geos and pricing.
- * Claude Managed Agents sessions can now [load skills from a GitHub repository](/docs/en/managed-agents/skills#load-skills-from-a-github-repository). When a session [mounts a repository](/docs/en/managed-agents/github), any skills in its root `.claude/skills` directory are discovered automatically at session start and available to the agent for that session.
- * **Inference hooks** are now in beta for Claude Enterprise organizations. Point Claude at your organization's AI security server, and each governed prompt across claude.ai, Cowork, and Claude Code is held for the server's allow or deny verdict before inference proceeds. Requests are signed, failure handling is configurable, and every denial is recorded in the compliance [Activity Feed](/docs/en/manage-claude/compliance-activity-feed). See [Inference hooks](/docs/en/manage-claude/inference-hooks).
- - We've retired the Claude Opus 4.1 model (`claude-opus-4-1-20250805`). All requests to this model will now return an error. We recommend upgrading to [Claude Opus 5](/docs/en/about-claude/models/overview#latest-models-comparison). Researchers can request ongoing access through the [External Researcher Access Program](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program).
- * [Dreams](/docs/en/managed-agents/dreams) (research preview) now supports Claude Opus 5. See [Supported models](/docs/en/managed-agents/dreams#limits).
- * We've launched **Claude Opus 5** (`claude-opus-5`), a step-change improvement over Claude Opus 4.8. Claude Opus 5 supports a [1M token context window](/docs/en/build-with-claude/context-windows) (both the default and the maximum), 128k max output tokens, and [thinking](/docs/en/build-with-claude/thinking) on by default, at $5 / $25 per MTok, the same pricing as Claude Opus 4.8. It's available on the Claude API, [Claude in Amazon Bedrock](/docs/en/build-with-claude/claude-in-amazon-bedrock), [Claude on Google Cloud](/docs/en/build-with-claude/claude-on-vertex-ai), and [Claude in Microsoft Foundry](/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What's new in Claude Opus 5](/docs/en/about-claude/models/whats-new-opus-5) for new features, behavior changes, and migration guidance, and the [models overview](/docs/en/about-claude/models/overview) for complete specs.
- * On Claude Opus 5, disabling thinking is allowed only at effort `high` or below: `thinking: {"type": "disabled"}` with effort `xhigh` or `max` returns a 400 error, a breaking change from Claude Opus 4.8. See [What's new in Claude Opus 5](/docs/en/about-claude/models/whats-new-opus-5#behavior-changes).
- * [Effort](/docs/en/build-with-claude/effort) is the primary control for steering Claude Opus 5: the model supports the full ladder (`low`, `medium`, `high`, `xhigh`, `max`), with `max` for capability-critical work.
- * The `fallbacks` parameter now supports a `"default"` mode, which applies Anthropic's recommended fallback models by refusal category. Server-side fallback is in beta, and the `"default"` mode requires the `server-side-fallback-2026-07-01` beta header. See [Refusals and fallback](/docs/en/build-with-claude/refusals-and-fallback).
- * We've removed [fast mode](/docs/en/build-with-claude/fast-mode) for Claude Opus 4.7. Requests to `claude-opus-4-7` with `speed: "fast"` now return an error; unlike Claude Opus 4.6, they do not fall back to standard speed. Claude Opus 4.7 itself remains available at standard speed. To continue using fast mode, migrate to [Claude Opus 5](/docs/en/about-claude/models/migration-guide#migrating-from-claude-opus-47) or Claude Opus 4.8. Read more in [Fast mode](/docs/en/build-with-claude/fast-mode#supported-models).
- * You can now set an `effort` level on a Claude Managed Agents agent's model configuration. Pass `effort` inside the `model` object when you [create the agent](/docs/en/managed-agents/agent-setup#create-an-agent). See [Effort levels](/docs/en/build-with-claude/effort#effort-levels) for what each level does.
- * Webhooks for Claude Managed Agents now cover the environment and memory store lifecycle: four `environment.*` event types and three `memory_store.*` event types. You can react to environment and memory store lifecycle changes without polling. See the Environment events and Memory store events tabs in [Subscribe to webhooks](/docs/en/managed-agents/webhooks#supported-event-types).
- * When creating a Claude Managed Agents session, you can now [seed it with initial events](/docs/en/managed-agents/sessions#seed-the-session-with-initial-events). Pass `initial_events` on `POST /v1/sessions` with up to 50 `user.message` and `user.define_outcome` events. A non-empty list starts the agent loop in the same call, so you don't need a separate send-events request to start work.
- * The `version` field is now optional when [updating a Claude Managed Agents agent](/docs/en/managed-agents/agent-setup#update-an-agent). Supply it for optimistic concurrency (a mismatch returns a 409 error), or omit it to apply the update unconditionally. See [Update semantics](/docs/en/managed-agents/agent-setup#update-semantics).
- * Claude Managed Agents session thread event streams now support [event deltas](/docs/en/managed-agents/events-and-streaming#event-deltas). `GET /v1/sessions/{session_id}/threads/{thread_id}/stream` accepts the same `event_deltas[]` query parameter as the session-level stream, so you can preview a subagent's text as the model generates it. A connection previews only the thread it's reading. See [Preview session thread events](/docs/en/managed-agents/events-and-streaming#preview-session-thread-events).
- * [Mid-conversation system messages](/docs/en/build-with-claude/mid-conversation-system-messages) are available on Claude Fable 5, Claude Mythos 5, and Claude Opus 4.8, on the Claude API, [Claude in Amazon Bedrock](/docs/en/build-with-claude/claude-in-amazon-bedrock), and [Google Cloud](/docs/en/build-with-claude/claude-on-vertex-ai). No beta header is required. This corrects earlier availability notes.
- * You can now manage the people in your **Claude Enterprise** (claude.ai) organization with the [Admin API](/docs/en/api/admin), in beta for all Claude Enterprise organizations: list members and look them up by email address, change a member's role, remove members, send and withdraw invites, manage groups and their membership, and read custom roles. Group and custom-role requests require the `anthropic-beta: ce-user-management-2026-07-13` beta header; member and invite requests take no beta header. An Admin API key with the `read:org_audit` scope can also call every user-management `GET` endpoint. See [User management](/docs/en/manage-claude/user-management).
- * [Dreams](/docs/en/managed-agents/dreams) (research preview) now supports Claude Fable 5 and Claude Sonnet 5. See [Supported models](/docs/en/managed-agents/dreams#limits).
- * We've expanded the [Access Transparency](/docs/en/manage-claude/access-transparency) documentation of `cmek_preserve` events with a filter example, an example event payload, and two preservation reason codes (`policy_violation_investigation`, `csae_report`). The documentation now also clarifies that a preservation event is written whether the preservation was initiated by a human reviewer or an automated safety pipeline. See [CMEK content preservation](/docs/en/manage-claude/access-transparency#cmek-content-preservation).
- * You can now set an expiration when you create an API key or an Admin API key in the [Claude Console](https://platform.claude.com/settings/keys). Choose a preset, a custom duration, or **Never**. For keys with a lifetime of at least 7 days, Anthropic emails the creator before expiration. Existing keys are unaffected. The Admin API reports each key's expiration in the [`expires_at`](/docs/en/api/admin/api_keys/list) field. See [Authentication](/docs/en/manage-claude/authentication#key-expiration).
- * We've added the `agent-memory-2026-07-22` beta header, which changes how [listing memories](/docs/en/managed-agents/memory#list-memories) (`GET /v1/memory_stores/{memory_store_id}/memories`) behaves: results are returned in a stable, server-defined order and the `order_by` and `order` parameters are ignored; `depth` accepts only `0`, `1`, or being omitted (other values return a `400` error); and `path_prefix` must end with `/` and matches whole path segments instead of a substring. Page cursors issued without the header aren't valid with it, so restart from the first page when you adopt it. On memory store endpoints, `agent-memory-2026-07-22` replaces `managed-agents-2026-04-01`; sending both returns a `400` error. On July 22, 2026, the `managed-agents-2026-04-01` header adopts the same list behavior. See [Beta headers](/docs/en/api/beta-headers#endpoint-specific-headers).
- * We've launched **Claude Sonnet 5** (`claude-sonnet-5`), the next generation of our Sonnet model family, at introductory pricing of $2 / $10 per MTok through August 31, 2026 (standard $3 / $15 thereafter). Claude Sonnet 5 supports a [1M token context window](/docs/en/build-with-claude/context-windows), 128k max output tokens, and the same set of tools and platform features as Claude Sonnet 4.6, except [Priority Tier](/docs/en/api/service-tiers#supported-models), which is not available on Claude Sonnet 5. Three behavior changes apply when migrating: [adaptive thinking](/docs/en/build-with-claude/thinking) is now on by default; manual extended thinking (`thinking: {type: "enabled", budget_tokens: N}`) is removed and returns a 400 error (it was deprecated on Sonnet 4.6); and setting sampling parameters (`temperature`, `top_p`, `top_k`) to non-default values returns a 400 error. Claude Sonnet 5 also uses a new tokenizer that produces approximately 30% more tokens for the same text. The exact increase depends on the content and workload shape. See [What's new in Claude Sonnet 5](/docs/en/about-claude/models/whats-new-sonnet-5) for details and migration guidance. For behavioral differences and model-specific prompting patterns, see [Prompting Claude Sonnet 5](/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5).
- * Claude Managed Agents session event streams now support [event deltas](/docs/en/managed-agents/events-and-streaming#event-deltas). Opt in with the `event_deltas[]` query parameter on `GET /v1/sessions/{session_id}/events/stream`. The `event_start` and `event_delta` events preview an agent message's text as it's generated, before the complete `agent.message` event arrives.
- * [Listing sessions](/docs/en/managed-agents/session-operations#listing-sessions) for Claude Managed Agents now supports backward pagination. `GET /v1/sessions` returns a `prev_page` cursor alongside `next_page`; pass it as the `page` parameter to return to the previous page. See [Pagination](/docs/en/api/overview#pagination).
- * When creating a Claude Managed Agents session, you can now [override the agent's configuration for that session](/docs/en/managed-agents/sessions#override-agent-configuration-for-a-session). Pass `agent` with `type: "agent_with_overrides"` to replace the model, system prompt, tools, MCP servers, or skills for a single session. The agent itself is unchanged.
- * Claude Managed Agents vaults now support an `injection_location` setting on [environment variable credentials](/docs/en/managed-agents/vaults#add-a-credential) (the Environment variable tab). It controls whether the credential's value is substituted, at egress, into the agent's outbound request headers, the request body, or both.
- * Webhooks for Claude Managed Agents now cover the agent, deployment, and deployment run lifecycle. You can react to a newly published agent version, a paused deployment, or a failed scheduled run without polling. See the Agent events, Deployment events, and Deployment run events tabs in [Subscribe to webhooks](/docs/en/managed-agents/webhooks#supported-event-types).
- * We've removed [fast mode](/docs/en/build-with-claude/fast-mode) for Claude Opus 4.6. Requests to `claude-opus-4-6` with `speed: "fast"` no longer run at fast speed or premium pricing: they run at standard speed, are billed at standard rates, and do not return an error. The response's `usage.speed` field reports the speed used. To continue using fast mode, migrate to [Claude Opus 4.8](/docs/en/about-claude/models/migration-guide). Read more in [Fast mode](/docs/en/build-with-claude/fast-mode#supported-models).
- * We've raised [rate limits](/docs/en/api/rate-limits) across the Claude API. Claude Sonnet and Claude Haiku rate limits now match Claude Opus at every usage tier, and usage tiers have been consolidated into three: Start, Build, and Scale. Most organizations move to a higher tier, no organization receives lower limits than before, and no action is required. You can view your tier and current limits in the [Claude Console](/settings/limits).
- * We've deprecated [fast mode](/docs/en/build-with-claude/fast-mode) for Claude Opus 4.7, with removal on July 24, 2026. After removal, requests to `claude-opus-4-7` with `speed: "fast"` will return an error. Migrate to fast mode for Claude Opus 4.8. Read more in [Fast mode](/docs/en/build-with-claude/fast-mode#supported-models).
- * **MCP tunnels** (research preview): the management API moved from `/v1/organizations/tunnels` on the Admin API to `/v1/tunnels` on the Claude API. The new surface uses the `anthropic-beta: mcp-tunnels-2026-06-22` header and the `workspace:manage_tunnels` WIF scope. The previous surface remains available during a migration window. See the [Tunnels API reference](/docs/en/api/beta/tunnels).
- * The Python, TypeScript, Go, Java, Ruby, PHP, and C# SDKs now include support for `code_execution_20260120`, the [code execution tool](/docs/en/agents-and-tools/tool-use/code-execution-tool) version that adds REPL state persistence and is the minimum version for [programmatic tool calling](/docs/en/agents-and-tools/tool-use/programmatic-tool-calling). To adopt it, set the tool's `type` to `code_execution_20260120`; no beta header is required. It's available on Claude Fable 5, Claude Mythos 5, Claude Opus 4.5 and newer, and Claude Sonnet 4.5 and newer; see the [model compatibility table](/docs/en/agents-and-tools/tool-use/code-execution-tool#model-compatibility).
- * We've retired the Claude Sonnet 4 model (`claude-sonnet-4-20250514`) and the Claude Opus 4 model (`claude-opus-4-20250514`). All requests to these models will now return an error. We recommend upgrading to [Claude Sonnet 4.6](/docs/en/about-claude/models/overview#latest-models-comparison) and [Claude Opus 4.8](/docs/en/about-claude/models/overview#latest-models-comparison) respectively. Researchers can request ongoing access through the [External Researcher Access Program](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program).
- * The [code execution tool](/docs/en/agents-and-tools/tool-use/code-execution-tool) now supports `code_execution_20260521`, which discloses the 90-second per-cell execution time limit in the tool description so Claude can budget long-running cells. No beta header is required.
- * The [web search tool](/docs/en/agents-and-tools/tool-use/web-search-tool) and [web fetch tool](/docs/en/agents-and-tools/tool-use/web-fetch-tool) now support `web_search_20260318` and `web_fetch_20260318`, adding a `response_inclusion` parameter to drop consumed result blocks from the API response for agentic workflows. No beta header is required.
- * The `GET /v1/environments/{id}/work` endpoint, which lists pending work for a [self-hosted sandbox](/docs/en/managed-agents/self-hosted-sandboxes), is now available on [Claude Platform on AWS](/docs/en/build-with-claude/claude-platform-on-aws). See [IAM actions for Claude Platform on AWS](/docs/en/api/claude-platform-on-aws-iam-actions) for the `GetEnvironment` action that authorizes it.
+ title: Claude Platform release notes
+ url: https://platform.claude.com/docs/en/release-notes/overview
+ description: Updates to the Claude Platform, including the Claude API, client SDKs, and the Claude Console.
+ ### August 11, 2026
+ * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) now returns transcripts of Cowork and Claude Code sessions that run on your users' machines, in beta for Claude Enterprise organizations. `GET /v1/compliance/apps/sessions/local` lists sessions across your organization, `GET /v1/compliance/apps/sessions/local/{session_id}` retrieves one session's metadata, and `GET /v1/compliance/apps/sessions/local/{session_id}/messages` returns its transcript, all with your existing Compliance Access Key and the `read:compliance_user_data` scope. See [Sessions on users' machines](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions).
+ * We've added the `anthropic-workspace-id` response header to the Claude API. It carries the `wrkspc_`-prefixed ID of the workspace that the request's API key or access token resolved to, including your organization's Default Workspace. See [Identify the workspace behind an API response](https://platform.claude.com/docs/en/manage-claude/workspaces#identify-the-workspace-behind-an-api-response).
+ ### August 10, 2026
+ * The introductory pricing for **Claude Sonnet 5** ($2 / $10 per MTok) is now the standard price: the previously scheduled increase to $3 / $15 per MTok on September 1, 2026 will not occur. See [Pricing](https://platform.claude.com/docs/en/about-claude/pricing).
+ * You can now set a budget on a Claude Managed Agents session: a hard cap on the session's spend, priced at public list rates. A session that reaches its budget pauses with the `budget_reached` stop reason instead of starting new model requests; changing or removing the budget resumes it. Deployments accept the same budget and apply it to each session they start. See [Session budgets](https://platform.claude.com/docs/en/managed-agents/budgets).
+ * You can now give a Claude Managed Agents session an advisor: a model at least as capable as the agent's own that the session's primary thread can consult mid-turn for strategic guidance. Configure it as a `{"type": "advisor"}` entry in the agent's multiagent roster, naming the `model` to consult. See [Give the session an advisor](https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration#give-the-session-an-advisor).
+ * You can now control where model inference runs for a Claude Managed Agents agent. Set `inference_geo` inside the `model` object when you [create the agent](https://platform.claude.com/docs/en/managed-agents/agent-setup#pin-the-inference-geo), or [override it for a single session](https://platform.claude.com/docs/en/managed-agents/sessions#pin-the-inference-geo-for-a-session). See [Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency) for the available geos and pricing.
+ * Claude Managed Agents sessions can now [load skills from a GitHub repository](https://platform.claude.com/docs/en/managed-agents/skills#load-skills-from-a-github-repository). When a session [mounts a repository](https://platform.claude.com/docs/en/managed-agents/github), any skills in its root `.claude/skills` directory are discovered automatically at session start and available to the agent for that session.
+ * **Inference hooks** are now in beta for Claude Enterprise organizations. Point Claude at your organization's AI security server, and each governed prompt across claude.ai, Cowork, and Claude Code is held for the server's allow or deny verdict before inference proceeds. Requests are signed, failure handling is configurable, and every denial is recorded in the compliance [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed). See [Inference hooks](https://platform.claude.com/docs/en/manage-claude/inference-hooks).
+ * We've retired the Claude Opus 4.1 model (`claude-opus-4-1-20250805`). All requests to this model on the Claude API will now return an error. We recommend upgrading to [Claude Opus 5](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison). Researchers can request ongoing access through the [External Researcher Access Program](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program).
+ ### August 3, 2026
+ * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) now returns transcripts of Cowork sessions started on claude.ai web or mobile, in beta for Claude Enterprise organizations. `GET /v1/compliance/apps/sessions/remote` lists sessions and `GET /v1/compliance/apps/sessions/remote/{session_id}/messages` returns one session's transcript, using your existing Compliance Access Key with the `read:compliance_user_data` scope. See [Sessions in the cloud](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions).
+ * [Dreams](https://platform.claude.com/docs/en/managed-agents/dreams) (research preview) now supports Claude Opus 5. See [Supported models](https://platform.claude.com/docs/en/managed-agents/dreams#limits).
+ * We've launched **Claude Opus 5** (`claude-opus-5`), a step-change improvement over Claude Opus 4.8. Claude Opus 5 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) (both the default and the maximum), 128k max output tokens, and [thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) on by default, at $5 / $25 USD per MTok, the same pricing as Claude Opus 4.8. It's available on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Claude on Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5) for new features, behavior changes, and migration guidance, and the [models overview](https://platform.claude.com/docs/en/about-claude/models/overview) for complete specs.
+ * On Claude Opus 5, disabling thinking is allowed only at effort `high` or below: `thinking: {"type": "disabled"}` with effort `xhigh` or `max` returns a 400 error, a breaking change from Claude Opus 4.8. See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5#behavior-changes).
+ * [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) is the primary control for steering Claude Opus 5: the model supports the full ladder (`low`, `medium`, `high`, `xhigh`, `max`), with `max` for capability-critical work.
+ * The `fallbacks` parameter now supports a `"default"` mode, which applies Anthropic's recommended fallback models by refusal category. Server-side fallback is in beta, and the `"default"` mode requires the `server-side-fallback-2026-07-01` beta header. See [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback).
+ * We've removed [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) for Claude Opus 4.7. Requests to `claude-opus-4-7` with `speed: "fast"` now return an error; unlike Claude Opus 4.6, they do not fall back to standard speed. Claude Opus 4.7 itself remains available at standard speed. To continue using fast mode, migrate to [Claude Opus 5](https://platform.claude.com/docs/en/about-claude/models/migration-guide#migrating-from-claude-opus-47) or Claude Opus 4.8. Read more in [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode#supported-models).
+ * You can now set an `effort` level on a Claude Managed Agents agent's model configuration. Pass `effort` inside the `model` object when you [create the agent](https://platform.claude.com/docs/en/managed-agents/agent-setup#create-an-agent). See [Effort levels](https://platform.claude.com/docs/en/build-with-claude/effort#effort-levels) for what each level does.
+ * Webhooks for Claude Managed Agents now cover the environment and memory store lifecycle: four `environment.*` event types and three `memory_store.*` event types. You can react to environment and memory store lifecycle changes without polling. See the Environment events and Memory store events tabs in [Subscribe to webhooks](https://platform.claude.com/docs/en/managed-agents/webhooks#supported-event-types).
+ * When creating a Claude Managed Agents session, you can now [seed it with initial events](https://platform.claude.com/docs/en/managed-agents/sessions#seed-the-session-with-initial-events). Pass `initial_events` on `POST /v1/sessions` with up to 50 `user.message` and `user.define_outcome` events. A non-empty list starts the agent loop in the same call, so you don't need a separate send-events request to start work.
+ * The `version` field is now optional when [updating a Claude Managed Agents agent](https://platform.claude.com/docs/en/managed-agents/agent-setup#update-an-agent). Supply it for optimistic concurrency (a mismatch returns a 409 error), or omit it to apply the update unconditionally. See [Update semantics](https://platform.claude.com/docs/en/managed-agents/agent-setup#update-semantics).
+ * Claude Managed Agents session thread event streams now support [event deltas](https://platform.claude.com/docs/en/managed-agents/events-and-streaming#event-deltas). `GET /v1/sessions/{session_id}/threads/{thread_id}/stream` accepts the same `event_deltas[]` query parameter as the session-level stream, so you can preview a subagent's text as the model generates it. A connection previews only the thread it's reading. See [Preview session thread events](https://platform.claude.com/docs/en/managed-agents/events-and-streaming#preview-session-thread-events).
+ * [Mid-conversation system messages](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages) are available on Claude Fable 5, Claude Mythos 5, and Claude Opus 4.8, on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), and [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai). No beta header is required. This corrects earlier availability notes.
+ * You can now manage the people in your **Claude Enterprise** (claude.ai) organization with the [Admin API](https://platform.claude.com/docs/en/api/admin), in beta for all Claude Enterprise organizations: list members and look them up by email address, change a member's role, remove members, send and withdraw invites, manage groups and their membership, and read custom roles. Group and custom-role requests require the `anthropic-beta: ce-user-management-2026-07-13` beta header; member and invite requests take no beta header. An Admin API key with the `read:org_audit` scope can also call every user-management `GET` endpoint. See [User management](https://platform.claude.com/docs/en/manage-claude/user-management).
+ * [Dreams](https://platform.claude.com/docs/en/managed-agents/dreams) (research preview) now supports Claude Fable 5 and Claude Sonnet 5. See [Supported models](https://platform.claude.com/docs/en/managed-agents/dreams#limits).
+ * We've expanded the [Access Transparency](https://platform.claude.com/docs/en/manage-claude/access-transparency) documentation of `cmek_preserve` events with a filter example, an example event payload, and two preservation reason codes (`policy_violation_investigation`, `csae_report`). The documentation now also clarifies that a preservation event is written whether the preservation was initiated by a human reviewer or an automated safety pipeline. See [CMEK content preservation](https://platform.claude.com/docs/en/manage-claude/access-transparency#cmek-content-preservation).
+ * You can now set an expiration when you create an API key or an Admin API key in the [Claude Console](https://platform.claude.com/settings/keys). Choose a preset, a custom duration, or **Never**. For keys with a lifetime of at least 7 days, Anthropic emails the creator before expiration. Existing keys are unaffected. The Admin API reports each key's expiration in the [`expires_at`](https://platform.claude.com/docs/en/api/admin/api_keys/list) field. See [Authentication](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration).
+ * We've added the `agent-memory-2026-07-22` beta header, which changes how [listing memories](https://platform.claude.com/docs/en/managed-agents/memory#list-memories) (`GET /v1/memory_stores/{memory_store_id}/memories`) behaves: results are returned in a stable, server-defined order and the `order_by` and `order` parameters are ignored; `depth` accepts only `0`, `1`, or being omitted (other values return a `400` error); and `path_prefix` must end with `/` and matches whole path segments instead of a substring. Page cursors issued without the header aren't valid with it, so restart from the first page when you adopt it. On memory store endpoints, `agent-memory-2026-07-22` replaces `managed-agents-2026-04-01`; sending both returns a `400` error. On July 22, 2026, the `managed-agents-2026-04-01` header adopts the same list behavior. See [Beta headers](https://platform.claude.com/docs/en/api/beta-headers#endpoint-specific-headers).
+ * We've launched **Claude Sonnet 5** (`claude-sonnet-5`), the next generation of our Sonnet model family, at introductory pricing of $2 / $10 per MTok (made the standard price on August 10, 2026). Claude Sonnet 5 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows), 128k max output tokens, and the same set of tools and platform features as Claude Sonnet 4.6, except [Priority Tier](https://platform.claude.com/docs/en/api/service-tiers#supported-models), which is not available on Claude Sonnet 5. Three behavior changes apply when migrating: [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) is now on by default; manual extended thinking (`thinking: {type: "enabled", budget_tokens: N}`) is removed and returns a 400 error (it was deprecated on Sonnet 4.6); and setting sampling parameters (`temperature`, `top_p`, `top_k`) to non-default values returns a 400 error. Claude Sonnet 5 also uses a new tokenizer that produces approximately 30% more tokens for the same text. The exact increase depends on the content and workload shape. See [What's new in Claude Sonnet 5](https://platform.claude.com/docs/en/about-claude/models/whats-new-sonnet-5) for details and migration guidance. For behavioral differences and model-specific prompting patterns, see [Prompting Claude Sonnet 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5).
+ * Claude Managed Agents session event streams now support [event deltas](https://platform.claude.com/docs/en/managed-agents/events-and-streaming#event-deltas). Opt in with the `event_deltas[]` query parameter on `GET /v1/sessions/{session_id}/events/stream`. The `event_start` and `event_delta` events preview an agent message's text as it's generated, before the complete `agent.message` event arrives.
+ * [Listing sessions](https://platform.claude.com/docs/en/managed-agents/session-operations#listing-sessions) for Claude Managed Agents now supports backward pagination. `GET /v1/sessions` returns a `prev_page` cursor alongside `next_page`; pass it as the `page` parameter to return to the previous page. See [Pagination](https://platform.claude.com/docs/en/api/overview#pagination).
+ * When creating a Claude Managed Agents session, you can now [override the agent's configuration for that session](https://platform.claude.com/docs/en/managed-agents/sessions#override-agent-configuration-for-a-session). Pass `agent` with `type: "agent_with_overrides"` to replace the model, system prompt, tools, MCP servers, or skills for a single session. The agent itself is unchanged.
+ * Claude Managed Agents vaults now support an `injection_location` setting on [environment variable credentials](https://platform.claude.com/docs/en/managed-agents/vaults#add-a-credential) (the Environment variable tab). It controls whether the credential's value is substituted, at egress, into the agent's outbound request headers, the request body, or both.
+ * Webhooks for Claude Managed Agents now cover the agent, deployment, and deployment run lifecycle. You can react to a newly published agent version, a paused deployment, or a failed scheduled run without polling. See the Agent events, Deployment events, and Deployment run events tabs in [Subscribe to webhooks](https://platform.claude.com/docs/en/managed-agents/webhooks#supported-event-types).
+ * We've removed [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) for Claude Opus 4.6. Requests to `claude-opus-4-6` with `speed: "fast"` no longer run at fast speed or premium pricing: they run at standard speed, are billed at standard rates, and do not return an error. The response's `usage.speed` field reports the speed used. To continue using fast mode, migrate to [Claude Opus 4.8](https://platform.claude.com/docs/en/about-claude/models/migration-guide). Read more in [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode#supported-models).
… diff truncated (203 added / 195 removed lines)
```

### anthropic.platform.token-counting

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/build-with-claude/token-counting
- Change: changed
- Prior hash: 69289750b82156e0ae82bcdb7b7eee34fdd892f8069868f1fda7b72172847c8d
- Current hash: 5b3a644ba8d7a22730b83f535c44ab20c21dce808832fb657f8da65b58435f14

```diff
- # Token counting
- Count the tokens in a message before you send it to Claude. Use token counts to manage rate limits and costs, make model routing decisions, and fit prompts to a target length.
- - [ZDR](/docs/en/manage-claude/api-and-data-retention): eligible (excludes [Covered Models](/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements))
- The [token counting](/docs/en/api/messages-count-tokens) endpoint accepts the same structured list of inputs for creating a message, including support for system prompts, [tools](/docs/en/agents-and-tools/tool-use/overview), [images](/docs/en/build-with-claude/vision), and [PDFs](/docs/en/build-with-claude/pdf-support). The response contains the total number of input tokens.
- All [active models](/docs/en/about-claude/models/overview) support token counting, including Claude Opus 5 and Claude Sonnet 5.
- [Server tool](/docs/en/agents-and-tools/tool-use/server-tools) token counts only apply to the first sampling call.
- See [Thinking and the context window](/docs/en/build-with-claude/thinking#thinking-and-the-context-window) for more details.
- AnthropicClient client = new()
- ApiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY")
- Token counting supports PDFs with the same [PDF support limitations](/docs/en/build-with-claude/pdf-support#pdf-support-limitations) as the Messages API.
- Token counting is **free to use** but subject to requests per minute rate limits based on your [usage tier](/docs/en/api/rate-limits#rate-limits). If you need higher limits, use **Request rate limit increase** on the [Rate limits](/settings/limits) page.
- <Card title="Count message tokens" icon="code" href="/docs/en/api/messages-count-tokens">
- <Card title="Context windows" icon="arrows-maximize" href="/docs/en/build-with-claude/context-windows">
- <Card title="Rate limits" icon="gauge" href="/docs/en/api/rate-limits">
- <Card title="Prompt caching" icon="database" href="/docs/en/build-with-claude/prompt-caching">
+ title: Token counting
+ url: https://platform.claude.com/docs/en/build-with-claude/token-counting
+ description: Count the tokens in a message before you send it to Claude. Use token counts to manage rate limits and costs, make model routing decisions, and fit prompts to a target length.
+ - [ZDR](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention): eligible (excludes [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements))
+ The [token counting](https://platform.claude.com/docs/en/api/messages-count-tokens) endpoint accepts the same structured list of inputs for creating a message, including support for system prompts, [tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), [images](https://platform.claude.com/docs/en/build-with-claude/vision), and [PDFs](https://platform.claude.com/docs/en/build-with-claude/pdf-support). The response contains the total number of input tokens.
+ All [active models](https://platform.claude.com/docs/en/about-claude/models/overview) support token counting, including Claude Opus 5 and Claude Sonnet 5.
+ [Server tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools) token counts only apply to the first sampling call.
+ See [Thinking and the context window](https://platform.claude.com/docs/en/build-with-claude/thinking#thinking-and-the-context-window) for more details.
+ Token counting supports PDFs with the same [PDF support limitations](https://platform.claude.com/docs/en/build-with-claude/pdf-support#pdf-support-limitations) as the Messages API.
+ Token counting is **free to use** but subject to requests per minute rate limits based on your [usage tier](https://platform.claude.com/docs/en/api/rate-limits#rate-limits). If you need higher limits, use **Request rate limit increase** on the [Rate limits](https://platform.claude.com/settings/limits) page.
+ <Card title="Count message tokens" icon="code" href="https://platform.claude.com/docs/en/api/messages-count-tokens">
+ <Card title="Context windows" icon="arrows-maximize" href="https://platform.claude.com/docs/en/build-with-claude/context-windows">
+ <Card title="Rate limits" icon="gauge" href="https://platform.claude.com/docs/en/api/rate-limits">
+ <Card title="Prompt caching" icon="database" href="https://platform.claude.com/docs/en/build-with-claude/prompt-caching">
```

### apify.cli.changelog

- Vendor: Apify
- Source: https://docs.apify.com/cli/docs/changelog
- Change: changed
- Prior hash: 0433e3ffc873d5bf32806ebc6c0f88e2c06a34fea7773ac57daadcb2965fb164
- Current hash: 44adf1694ec7572a6df5607422e53278ef1992718ebec86bfd8ad197c2589136

```diff
+ ### [1.8.0](https://github.com/apify/apify-cli/releases/tag/v1.8.0) (2026-08-11)[](#180-2026-08-11)
+ * **cli:** Display actor usage stats in actors info command ([#1243](https://github.com/apify/apify-cli/pull/1243)) ([4d13d89](https://github.com/apify/apify-cli/commit/4d13d89f40ae4b87459fb9e134b6c7529a2e3f7b)) by [@MQ37](https://github.com/MQ37)
+ * Add `APIFY_CONSOLE_URL` env variable for local actor runtime ([#1276](https://github.com/apify/apify-cli/pull/1276)) ([79ad1a0](https://github.com/apify/apify-cli/commit/79ad1a0dd4631ca404462601ffea916eac204352)) by [@Pijukatel](https://github.com/Pijukatel)
+ * Support uv-managed Python Actors in apify create ([#1274](https://github.com/apify/apify-cli/pull/1274)) ([6deabe6](https://github.com/apify/apify-cli/commit/6deabe6ac91da6269136bd00fe6970062a5d9e6d)) by [@vdusek](https://github.com/vdusek)
+ * Surface `apify help --skill` in the main help menu ([#1302](https://github.com/apify/apify-cli/pull/1302)) ([d9d3807](https://github.com/apify/apify-cli/commit/d9d3807dd1e4ca30e527418acc93454eb867c975)) by [@patrikbraborec](https://github.com/patrikbraborec), closes [#1301](https://github.com/apify/apify-cli/issues/1301)
+ * Reduce npm install size (69.4 → 57.9 MB) and report install size on releases ([#1304](https://github.com/apify/apify-cli/pull/1304)) ([5368bc7](https://github.com/apify/apify-cli/commit/5368bc7a034f8df6475dd0742fb84cdd00345f69)) by [@jancurn](https://github.com/jancurn), closes [#1306](https://github.com/apify/apify-cli/issues/1306)
+ * **create:** Guided wizard with use-case and language filters ([#1278](https://github.com/apify/apify-cli/pull/1278)) ([84647b9](https://github.com/apify/apify-cli/commit/84647b9022d1838232d050bad626e0b25db2bfa7)) by [@l2ysho](https://github.com/l2ysho), closes [#1236](https://github.com/apify/apify-cli/issues/1236)
+ * Single apify-cli bundle + native Windows ARM64 (supersedes #1057) ([#1169](https://github.com/apify/apify-cli/pull/1169)) ([aab5d58](https://github.com/apify/apify-cli/commit/aab5d584ceb2cf7f4568f3dcbfc47e2ade5adc18)) by [@vladfrangu](https://github.com/vladfrangu), closes [#1221](https://github.com/apify/apify-cli/issues/1221)
+ * **cli:** Exit cleanly when stdin is an open pipe that never closes ([#1294](https://github.com/apify/apify-cli/pull/1294)) ([8a3ef6b](https://github.com/apify/apify-cli/commit/8a3ef6b7ef36e198f5306ccb5902a12d8542a443)) by [@artogahr](https://github.com/artogahr)
+ #### 🚀 Features[](#-features-13)
+ #### 🐛 Bug Fixes[](#-bug-fixes-20)
```

### apify.integrations.mcp

- Vendor: Apify
- Source: https://docs.apify.com/integrations/mcp
- Change: changed
- Prior hash: 0ed16839411edebb8da86bd5f882abdf663a2f4d7070f5517212cb0b205bb4cf
- Current hash: 822eaa42b6c0ac899d0baa7363e111886e9aa7023d961ce522438324199ba077

```diff
- Agentic payments allow AI agents to autonomously pay for Actor runs without requiring an Apify API token. The Apify MCP server supports two payment methods:
- * [x402 protocol](https://docs.apify.com/integrations/x402.md) - Direct on-chain payments using USDC on the [Base](https://www.base.org/) blockchain via the open [x402](https://www.x402.org/) standard.
- * [Skyfire](https://docs.apify.com/integrations/skyfire.md) - Managed payment tokens through the [Skyfire](https://www.skyfire.xyz/) payment platform.
+ Agentic payments allow AI agents to autonomously pay for Actor runs without requiring an Apify API token:
+ * [AGI](https://docs.apify.com/integrations/x402.md) - buy a prepaid Apify API token from [Apify AGI](https://agi.apify.com) with an x402 or MPP payment, then use it against this MCP server or the Apify API directly. Recommended for most agents - works for any Actor, not just Pay Per Event ones.
+ * [Skyfire](https://docs.apify.com/integrations/skyfire.md) - managed payment tokens through the [Skyfire](https://www.skyfire.xyz/) payment platform.
+ The MCP server also has its own Direct x402 support (per-request, no minted token, Pay Per Event Actors only) via [mcpc](https://github.com/apify/mcp-cli) - see the [Apify MCP Server README](https://github.com/apify/apify-mcp-server#-agentic-payments) for setup.
```

### exa.docs.index

- Vendor: Exa
- Source: https://exa.ai/docs/llms.txt
- Change: changed
- Prior hash: 04c61502bb8c40f867ac8dbb01dd4d2a544c7243ff0acbb7e8981e7ccdc0383b
- Current hash: db63ac7041377e84c1e31f6c59f11861c99bd39842fd96b69a6bb2cc1102b160

```diff
- - [Websets](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/websets.md)
- - [Build with Exa](https://exa.ai/docs/reference/agent-skills/build-with-exa.md): Build applications and agents with Exa's full API platform — search, contents, answer, context, Agent API, monitors, websets, and the SDKs.
+ - [Build with Exa](https://exa.ai/docs/reference/agent-skills/build-with-exa.md): Build applications and agents with Exa's full API platform: search, contents, answer, context, Agent API, monitors, websets, and the SDKs.
+ - [OpenHuman](https://exa.ai/docs/integrations/openhuman.md): Give the OpenHuman agent live web search with Exa, either managed or with your own Exa API key.
+ - [Migrate websets to agent](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/migrate-websets-to-agent.md)
```

### firecrawl.docs.index

- Vendor: Firecrawl
- Source: https://docs.firecrawl.dev/llms.txt
- Change: changed
- Prior hash: b1451a13abab624d049e2ed5796fd62de54a542b33001e2b51342133f35e4ce7
- Current hash: 8d6e66ab5dd802f86c318f0ae15d08e1bc93eeb4731362fdbac99c1139efc555

```diff
- - [Debug Firecrawl with Ask](https://docs.firecrawl.dev/features/ask.md): Agentic debugging for your Firecrawl integration
- - [Human MCP](https://docs.firecrawl.dev/mcp-server/human-mcp.md): Connect your agent to Firecrawl MCP. Sign in to get started.
+ - [Introduction](https://docs.firecrawl.dev/introduction.md): Search the web, scrape any page, and interact with it, all through one API.
+ - [Get Started](https://docs.firecrawl.dev/mcp-server.md): Set up Firecrawl MCP with keyless access, account sign-in, or an API key.
+ - [For Agents](https://docs.firecrawl.dev/mcp-server/keyless.md): Agents can start instantly, no API key required. Add an API key to unlock more usage.
+ - [For Humans](https://docs.firecrawl.dev/mcp-server/oauth.md): Sign in via your browser.
+ - [Advanced Scraping Guide](https://docs.firecrawl.dev/advanced-scraping-guide.md): Configure scrape options, browser actions, crawl, map, and the agent endpoint with Firecrawl's full API surface.
+ - [Billing](https://docs.firecrawl.dev/billing.md): How Firecrawl billing, credits, and plans work
+ - [Rate Limits](https://docs.firecrawl.dev/rate-limits.md): Rate limits for different pricing plans and API requests
+ - [Partner Credits](https://docs.firecrawl.dev/partner-credits.md): How Firecrawl partner credits work, including eligibility, expiration, and plan limits
+ - [Enterprise](https://docs.firecrawl.dev/enterprise.md): Enterprise plans, security, and features for Firecrawl at scale
+ - [IP Restrictions](https://docs.firecrawl.dev/features/ip-restrictions.md): Restrict your team's API keys to an allowlist of IP addresses or CIDR ranges, so they only work from approved networks. Enforced server-side.
+ - [Key Restrictions](https://docs.firecrawl.dev/features/key-restrictions.md): Lock an individual API key to specific output formats and endpoints. Enforced server-side, with no way for a request to override it.
+ - [Threat Protection](https://docs.firecrawl.dev/features/threat-protection.md): Block requests to risky URLs across every endpoint, using a policy your organization controls. Enforced server-side.
+ - [SIEM Audit Logging](https://docs.firecrawl.dev/features/siem.md): Stream a structured audit event for every scrape your team runs to your own SIEM, starting with Microsoft Sentinel. Delivered server-side.
+ - [Search](https://docs.firecrawl.dev/features/search.md): Search the web and get full content from results
+ - [Scrape](https://docs.firecrawl.dev/features/scrape.md): Turn any url into clean data
+ - [Faster Scraping](https://docs.firecrawl.dev/features/fast-scraping.md): Speed up your scrapes by 500% with the maxAge parameter
+ - [Batch Scrape](https://docs.firecrawl.dev/features/batch-scrape.md): Scrape multiple URLs in a single batch job
+ - [JSON mode - Structured result](https://docs.firecrawl.dev/features/llm-extract.md): Extract structured data from pages via LLMs
+ - [Change Tracking](https://docs.firecrawl.dev/features/change-tracking.md): Detect and monitor changes in web content between scrapes
+ - [Enhanced Mode](https://docs.firecrawl.dev/features/enhanced-mode.md): Use enhanced proxies for reliable scraping on complex sites
+ - [Proxies](https://docs.firecrawl.dev/features/proxies.md): Learn about proxy types, locations, and how Firecrawl selects proxies for your requests.
+ - [Map](https://docs.firecrawl.dev/features/map.md): Input a website and get all the urls on the website - extremely fast
+ - [Crawl](https://docs.firecrawl.dev/features/crawl.md): Recursively crawl a website and get content from every page
+ - [Overview](https://docs.firecrawl.dev/webhooks/overview.md): Real-time notifications for your Firecrawl operations
+ - [Event Types](https://docs.firecrawl.dev/webhooks/events.md): Webhook event reference
+ - [Security](https://docs.firecrawl.dev/webhooks/security.md): Verify webhook authenticity
+ - [Testing](https://docs.firecrawl.dev/webhooks/testing.md): Test and debug webhooks
+ - [Overview](https://docs.firecrawl.dev/dashboard.md): Overview of the Firecrawl dashboard and its key features
+ - [Debug Firecrawl with Ask](https://docs.firecrawl.dev/features/ask.md): Debug a failed job or any Firecrawl integration issue with an agentic support API
+ - [Overview](https://docs.firecrawl.dev/sdks/overview.md): Firecrawl SDKs are wrappers around the Firecrawl API to help you easily search, scrape, and interact with the web.
+ - [Python](https://docs.firecrawl.dev/sdks/python.md): Firecrawl Python SDK is a wrapper around the Firecrawl API to help you easily turn websites into markdown.
+ - [Node](https://docs.firecrawl.dev/sdks/node.md): Scrape, crawl, and extract structured data from websites using the Firecrawl Node SDK.
+ - [Go](https://docs.firecrawl.dev/sdks/go.md): Firecrawl Go SDK is a wrapper around the Firecrawl API to help you easily turn websites into markdown.
+ - [Java](https://docs.firecrawl.dev/sdks/java.md): Firecrawl Java SDK is a wrapper around the Firecrawl API to help you easily turn websites into markdown.
+ - [Ruby](https://docs.firecrawl.dev/sdks/ruby.md): Firecrawl Ruby SDK is a wrapper around the Firecrawl API to help you easily turn websites into markdown.
+ - [Rust](https://docs.firecrawl.dev/sdks/rust.md): Firecrawl Rust SDK is a wrapper around the Firecrawl API to help you easily turn websites into markdown.
+ - [.NET](https://docs.firecrawl.dev/sdks/dotnet.md): Firecrawl .NET SDK is a wrapper around the Firecrawl API to help you easily turn websites into markdown.
+ - [PHP](https://docs.firecrawl.dev/sdks/php.md): Firecrawl PHP SDK is a wrapper around the Firecrawl API to help you easily turn websites into markdown.
+ - [Elixir](https://docs.firecrawl.dev/sdks/elixir.md): Firecrawl Elixir SDK is an auto-generated client for the Firecrawl API v2, built with Req and NimbleOptions.
+ - [FIRE-1 Agent (Beta)](https://docs.firecrawl.dev/agents/fire-1.md): AI agent that enables intelligent navigation and interaction with web pages
```

### firecrawl.github.releases

- Vendor: Firecrawl
- Source: https://github.com/firecrawl/firecrawl/releases
- Change: changed
- Prior hash: e6ca9b5e8b89b9982784d722cf17f9d5d082df6db91b774e84a441c4c80903c7
- Current hash: 490d1431d0f2d494debbbf729c78e371294c7829dc5ac43e7f842a2303bba212

```diff
- Type / to search
- 9.2k
- 164k
+ Search
+ 9.4k
+ 168k
```

### firecrawl.product.changelog

- Vendor: Firecrawl
- Source: https://www.firecrawl.dev/changelog
- Change: changed
- Prior hash: 54444dfbd634715168b3ad883ba97cc5222ec9729f2cea16bc9f0a90488df550
- Current hash: 77cc831faa353adb24eea1c7295fa7e66b27af56504226048982d601861da8af

```diff
- 163.6K Sign up
+ 167.7K Sign up
+ Aug 13, 2026
+ Life Sciences in Firecrawl Research Index
+ The Life Sciences category is now available in Firecrawl Research Index . It covers 41M+ papers across the drug discovery, clinical trial, and biology literature. Your AI agents get citable papers back for a query and can pull the full text on demand. The whole index is also free to use now.
+ High-recall retrieval. The index hits 90% recall@10 on our paper-retrieval eval, so your AI agents find more of what matters on the first page of results.
+ Millions of life sciences papers. The corpus holds 41M+ papers from authoritative sources and refreshes daily, so your AI agents only cite domain-specific literature.
+ Abstract to full text. Your AI agents search abstracts to find the right papers, then pull the full text to verify a claim against the source.
+ No DIY stack. Research Index stands in for the source APIs plus the parsing and ranking you would otherwise build yourself.
+ Free to use. Every category is free, the AI and ML literature it already carried alongside the new Life Sciences papers.
+ Available everywhere you build. Query it through the API at /search/research , plus the CLI, MCP, and SDKs.
```

### gemini.api.changelog

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/changelog
- Change: changed
- Prior hash: fb0b2d4901e8e2fa36f07b5fc6ebfc660e94df2e401dac7a98f0c07d6ba1edf2
- Current hash: 586227f92a3be04734702e2e1f3af29c2d1420933dab40d3f4c35af433a5dc5e

```diff
- Launched the Gemini Deep Research Agent in preview. It can
- Last updated 2026-07-30 UTC.
+ August 13, 2026
+ Gemini 3.7 Flash generally available (GA) : Released our most
+ intelligent workhorse model yet for coding and agents:
+ Gemini 3.7 Flash ( gemini-3.7-flash ): Substantial improvements
+ across software engineering, web development, and agentic workflows,
+ available at an introductory price through December 31, 2026.
+ Gemini 3.7 Flash model page
+ and the Latest model guide .
+ Launched the Gemini Deep Research agent in preview. It can
+ Last updated 2026-08-13 UTC.
```

### gemini.api.deprecations

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/deprecations
- Change: changed
- Prior hash: ac05ba25acd20e4fbce4258cd980487ca260e0642a8b2b541873a2ec86b3c27f
- Current hash: f27ba1b45bc1226cf2a56b6bc81e8717c1623a3355b6bc4ab878f9c75444dfd8

```diff
- Last updated 2026-08-03 UTC.
+ gemini-3.7-flash
+ August 2026
+ Last updated 2026-08-13 UTC.
```

### gemini.api.models

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/models
- Change: changed
- Prior hash: 98c1c93d02321d8caf5eece7d89be77f66fd330eaaf5bbad9e8190ae5c96dd29
- Current hash: 7eb1cd8efbdfcf496829c497e162ca01e80f532a9b486216fb45930cc839b3cf

```diff
- Our latest model that balances speed with intelligence to deliver strong performance in agentic and multimodal tasks.
- Most intelligent model for sustained frontier performance on agentic and coding tasks.
- Last updated 2026-08-05 UTC.
+ Gemini 3.7 Flash
+ Our latest and most capable Flash model, built for complex coding, agentic workflows, and reliable multi-step execution.
+ New Stable
+ Our previous-generation Flash model, balancing speed and multimodal capabilities across general agentic and everyday tasks.
+ Our legacy Flash model, providing baseline speed and foundational performance for routine, high-throughput workloads.
+ Gemini 3.7 Flash
+ gemini-3.7-flash
+ Last updated 2026-08-14 UTC.
```

### gemini.api.rate-limits

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/rate-limits
- Change: changed
- Prior hash: a04f9c69320b01fc033c7de1f7ed35679c4b5eb8798b7f018c4302445ca54ef1
- Current hash: 8b69470da94934d23714f0fecca7c9bddabcc7c3cf041823d7e0be2c05578751

```diff
- Last updated 2026-07-21 UTC.
+ Gemini 3.7 Flash
+ Last updated 2026-08-13 UTC.
```

### hermes.docs.cli-commands

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/reference/cli-commands
- Change: changed
- Prior hash: 74388655a56f44c5bfde919d83f40e940c79d5ba84f2610fbd9ab502f267426f
- Current hash: 034f491a8f8649401f64744bfcd59620bcc3ca657eddc5f52fdc07bbf1be6d11

```diff
- This is the human / scripting surface. Agent workers spawned by the dispatcher drive the board through a dedicated kanban_* toolset ( kanban_show , kanban_complete , kanban_block , kanban_create , kanban_link , kanban_comment , kanban_heartbeat ; orchestrator profiles also get kanban_list and kanban_unblock ) instead of shelling to hermes kanban . Workers have HERMES_KANBAN_BOARD pinned in their env so they physically cannot see other boards.
- Return a blocked or scheduled task to ready (or todo if dependencies are still open).
- install <identifier> [--force]
- Install a plugin from a Git URL or owner/repo .
- Pull latest changes for an installed plugin.
+ This is the human / scripting surface. Agent workers spawned by the dispatcher drive the board through a dedicated kanban_* toolset ( kanban_show , kanban_complete , kanban_request_review , kanban_request_changes , kanban_block , kanban_create , kanban_link , kanban_comment , kanban_heartbeat ; orchestrator profiles also get kanban_list and kanban_unblock ) instead of shelling to hermes kanban . Workers have HERMES_KANBAN_BOARD pinned in their env so they physically cannot see other boards.
+ request-review <id>
+ Move a task to review with a reviewer handoff — NOT a block. Flags: --summary , --metadata , --reviewer (reassigns before review dispatch).
+ request-changes <id> <reason>
+ Reviewer verdict for an active review run: close the review attempt and route the task back to its original implementer.
+ reopen-review <id>...
+ Send review task(s) back for changes ( review → ready/todo). Flag: --reason (appended as a comment).
+ Restore a blocked task to its source phase ( review or ready ), or todo while dependencies remain open.
+ install <identifier> [--force] [--ref COMMIT_SHA]
+ Install a plugin from a Git URL, owner/repo , or a bare index name. Bare names (no slash) are resolved through the community plugin index to owner/repo plus the index-pinned commit; ambiguous names list candidates and exit. --ref accepts only a full 40-character commit SHA, installs that exact immutable revision, and overrides any index pin.
+ search [term] [--json] [--capability CAP] [--refresh]
+ Search the community plugin index (fuzzy match on name/description/tags; omit term to browse). Fetched from plugins.index_url (default: the NousResearch plugin index), cached under ~/.hermes/cache/ for 24h, falling back to the stale cache and then the bundled seed when offline. Indexed ≠ audited — inclusion is a metadata review only.
+ Pull latest changes for an unpinned installed plugin. Pinned plugins must be reinstalled with --force --ref <new-commit> to move.
+ doctor [path-or-id] [--ci]
+ Validate a native plugin through the real manifest parser, loader, and registration path. --ci exits 1 on errors.
+ pack install <path-or-url> [--force]
+ Install a plugin pack ( hermes-pack.yaml ) — a declarative set of plugins each pinned to an exact 40-character commit SHA. Shows a mandatory review screen (every plugin, source, pinned ref, declared capabilities), asks one confirmation for the pack contents, then runs ordinary pinned installs. Each plugin's declared capabilities still go through the standard per-plugin consent — a pack never bulk-grants. Partial failures are reported per plugin; exits non-zero when any plugin failed. Interactive only (no --yes ).
+ pack export [--enabled-only] [--name NAME]
+ Emit a pack YAML on stdout from the current install: repo + exact SHA of each git-installed plugin plus sanitized non-secret plugins.entries config. Local-only plugins (no git provenance) are listed as warning comments, never as installable entries. Secrets, capability grants, and allow_* gates are always stripped.
+ pack show <path-or-url>
+ Dry-run: parse, validate, and display a pack without installing anything.
+ Git installs also record only their canonical source, exact installed revision, and
+ pin status in the profile-local plugins/.install-metadata.json sidecar. It does
+ not contain plugin config, environment values, secrets, or capability grants.
+ repair-routing
+ Re-attach gateway conversations stranded in session rows that lost their routing identity (a chat "jumping back in time" after a restart). Dry-run by default; --apply performs the adoptions (stop the gateway first); --max-gap-seconds N tunes the contiguity window. Only unambiguous cases are repaired. See Sessions → Repair Stranded Gateway Sessions .
```

### hermes.docs.fallback-providers

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
- Change: changed
- Prior hash: cb102152e9695606a4bd7c31096b7288e6de92bdcbed457fc56631502f8b3ac1
- Current hash: c81638336d4a008613917aab5a2ab93b1b688d2466c6ba15c5a8cabcb83a784a

```diff
- hermes model (ChatGPT OAuth)
- hermes model → Codex
+ hermes model → ChatGPT or Codex Subscription (ChatGPT OAuth)
+ hermes model → ChatGPT or Codex Subscription
```

### hermes.github.releases

- Vendor: Hermes
- Source: https://github.com/NousResearch/hermes-agent/releases
- Change: changed
- Prior hash: e572c37307c1d3fb2694b67c4acc8d78debd48f102e308d0b8c987c25eb03d90
- Current hash: 67692cb7e307e65329a16b4926d6bb2655e2bccf80a9a46f7e6346c21fa6fc7c

```diff
- Type / to search
- 44.6k
- 228k
- Hermes Agent v0.15.1 (2026.5.29) — The Patch Release
- 137 people reacted
- 99 people reacted
- 164 people reacted
- Hermes Agent v0.15.1 (2026.5.29) — The Patch Release
- Hermes Agent v0.15.1 (2026.5.29) — The Patch Release
- 29 May 01:12
- v2026.5.29
- e71a2bd
- Hermes Agent v0.15.1 (v2026.5.29)
- Since v0.15.0: 28 commits · 21 merged PRs · hotfix release · 9 contributors
- The Patch Release. A same-day hotfix for v0.15.0. Headline fix: the dashboard infinite-reload loop that hit anyone running v0.15.0 in loopback mode (Docker, hosted Hermes, fresh installs). A handful of other v0.15.0 follow-ups go along for the ride — kanban worker SIGTERM, /model picker unification, /yolo session bypass, the full 19,932-entry skills.sh catalog, .md media delivery restoration, gateway probe-stepdown safety, web-URL redaction passthrough, kanban worker vision on referenced images, hindsight observation-default. Docker users get an explicit --insecure opt-in env var (no more bind-host inference), MCP server bare-command PATH resolution, and arm64 PR-build cache fixes.
- Dashboard 401 reload loop fixed — In loopback mode the dashboard's identity probe ( /api/auth/me ) returns 401 by design, but v0.15.0's stale-token reload guard treated every 401 as a rotated session token and full-page-reloaded to pick up a fresh one. Every successful sibling call cleared the one-shot reload guard, so the page reload-looped forever (Firefox: "Navigated to /sessions" storm; Chrome: React re-render storm). Fix adds an allowUnauthorized opt-out to fetchJSON that skips only the loopback stale-token reload — 401 still throws so AuthWidget swallows it, gated-mode login_url redirects are unaffected. Closes #34206 , #34202 . ( #30698 — @austinpickett )
- Docker dashboard --insecure is now an explicit env opt-in, never derived from bind host — Previously the Docker entrypoint inferred --insecure when the dashboard bound to a non-loopback host. That conflated "I want LAN access" with "I want to disable the same-origin guard." The fix splits them: bind host is bind host, and disabling the dashboard's loopback auth requires an explicit HERMES_DASHBOARD_INSECURE=1 . Existing setups that genuinely wanted insecure binding must now set the env var. ( #34188 , #34204 — @benbarclay )
- MCP bare command resolution under Docker — MCP servers configured with bare commands ( npx , npm , node ) now resolve against /usr/local/bin so they actually launch inside the Docker image where those binaries live. v0.15.0 left these failing silently in containers when the agent's effective PATH didn't include the Node toolchain location. ( #34186 — @benbarclay )
- Skills page sidebar / source pills restored — A stale useMemo dependency in the new dashboard skills page collapsed the source pills and category sidebar to "All" only. Fixed; both surfaces now reflect the live catalog state. ( #34194 )
- Kanban worker can be killed again — SIGTERM on a kanban worker was being absorbed by an intermediate process and the worker stayed running. Closes #28181 . ( #34045 )
- Full skills.sh catalog (858 → 19,932 entries) — The skills hub page was pulling a partial paginated catalog. The fetch now walks the sitemap, so all 19,932 skills.sh entries surface in the picker instead of just the first 858. ( #34025 )
- Dashboard / Web
- /api/auth/me 401 no longer triggers reload loop in loopback mode — ( #30698 — @austinpickett )
- Skills page source pills + category sidebar restored — stale useMemo dep ( #34194 )
- Docker
- --insecure is now explicit opt-in via env var , not derived from bind host ( #34188 — @benbarclay )
- Dashboard test suite repaired to match the insecure-opt-in fix ( #34204 — @benbarclay )
- arm64 PR builds skip the GHA cache to avoid cache-thrash on cross-arch builders ( #33704 — @BROCCOLO1D )
- MCP
- Bare npx / npm / node resolve against /usr/local/bin for Docker compatibility ( #34186 — @benbarclay )
- Kanban
- Worker SIGTERM actually terminates the process ( #34045 )
- Workers receive images referenced in task bodies for vision-capable models ( #34210 )
- Gateway
- .md files deliver again — media-delivery validation defaults to denylist-only instead of an overly-narrow allowlist ( #34022 )
- Probe stepdown safety — on a context-overflow without an explicit provider context limit, the agent no longer steps down to a smaller model based on an unknown ceiling (salvage of #33673 ) ( #33826 )
- CLI
- /yolo mid-session enables the per-session bypass instead of just toggling the env var (which the running agent had already snapshotted) ( #33931 — @kshitijk4poor )
- /model and hermes model show the same list , plus disk cache for picker startup ( #33867 )
- Skills
+ Search
+ 45.8k
+ 231k
+ Hermes Agent v0.20.1 (2026.8.13)
+ Hermes Agent v0.20.1 (2026.8.13)
+ Hermes Agent v0.20.1 (2026.8.13)
+ 13 Aug 20:37
+ v2026.8.13
+ f80f453
+ Hermes Agent v0.20.1 (v2026.8.13)
+ Release Date: August 13, 2026
+ Patch release. This tag rolls up the ~656 PRs merged since v0.20.0 into a stable tagged release for downstream consumers (Docker images, hosted deployments, and anyone installing from the latest tag).
+ Since v0.20.0 (August 3), this window landed 1,444 commits across ~656 merged PRs , touching 2,172 files (+233,872 / −75,244), and closed ~481 issues . It is a broad stabilization-and-fixes rollup spanning the desktop app, gateway platforms, installers, tool system, and provider catalogs.
+ Full curated release notes for this window will ship with v0.21.0 , which will document everything from v0.20.0 onward — highlights, feature areas, and complete contributor credits. Nothing in this window is skipped.
+ Existing installs: hermes update
+ Fresh install: see the installer one-liner in the README
+ Full Changelog : v2026.8.3...v2026.8.13
+ 75 people reacted
+ 171 people reacted
+ 101 people reacted
+ 167 people reacted
… diff truncated (21 added / 69 removed lines)
```

### openai.api.changelog

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/changelog
- Change: changed
- Prior hash: 3cd0a372ecf5b8c1f3ead270f0500f562de8a4ff0ef78a5e5ea46da7475c831b
- Current hash: 62bafab0b995ce1398c60badf1296ae923ac3f30bed0c37499d15c8d235362da

```diff
- Fast mode now supports long-context requests for GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna. As of today, long-context prompts exceeding 272K tokens can run in [Fast mode](https://developers-site-git-agent-add-gpt-5-6-fast-long-c-d938fe-openai.vercel.app/api/docs/guides/fast-mode), delivering speeds up to 2.5× faster than the Standard tier. See [pricing details](https://developers-site-git-agent-add-gpt-5-6-fast-long-c-d938fe-openai.vercel.app/api/docs/pricing?latest-pricing=fast).
+ ### Aug 13
+ Announced Ultrafast mode, a new API service tier for GPT-5.6 Sol that runs up to 14x faster than Standard processing. Available in limited preview to select customers. Sign up to receive updates on Ultrafast mode [here](https://openai.com/form/ultrafast/).
+ Feature · Model: gpt-5.6-cyber · Model: daybreak-red-latest · Model: daybreak-blue-latest · API: v1/responses
+ Daybreak now offers two access tiers for approved defenders: Daybreak Blue and Daybreak Red. Use them to move from security findings to validated fixes in explicitly authorized engagements.
+ Start with Daybreak Blue for most defensive security work. It provides access to general-purpose models such as GPT-5.6 Sol for vulnerability discovery, secure code review, detection engineering, incident response, malware analysis, and patch validation. Read more [here](https://developers.openai.com/api/docs/models/daybreak-blue-latest).
+ Daybreak Red provides separately approved access to purpose-trained models such as [GPT-5.6 Cyber](https://developers.openai.com/api/docs/models/gpt-5.6-cyber) for authorized vulnerability reproduction, exploit validation, penetration testing, red teaming, and complex system analysis.
+ These models require separate approval and provisioning. You can apply to join the Daybreak program [here](https://openai.com/daybreak/). More details on pricing [here](https://developers.openai.com/api/docs/pricing).
+ Updated the **chat-latest** snapshot, which points to the latest model available in ChatGPT for Plus and Pro users. We recommend leveraging [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) for production API usage, but feel free to use this model to test the latest improvements for chat use cases. The underlying model snapshot will be regularly updated. Read more [here](https://developers.openai.com/api/docs/models/chat-latest).
+ Fast mode now supports long-context requests for GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna. As of today, long-context prompts exceeding 272K tokens can run in [Fast mode](https://developers.openai.com/api/docs/guides/fast-mode), delivering speeds up to 2.5× faster than the Standard tier. See [pricing details](https://developers.openai.com/api/docs/pricing).
```

### openai.api.deprecations

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/deprecations
- Change: changed
- Prior hash: 68b1be679e323af809e6e37533ecfc25b4f0c1413dd708ba28034344cbe37f26
- Current hash: 4fc34212ee878b48b1671d45f1d5bc65e755f15ea86460006549dfc57d1d1d59

```diff
+ (new source — no prior snapshot to diff)
```

### openai.api.evals

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/guides/evals
- Change: changed
- Prior hash: 8c101f45529bc3543f6674a6c7bcf37dcdfed44edaf2456a23fa9943a29e5153
- Current hash: 299a41625f6a4a78b18a9685b0b9c55a0a45fb76fe759436fac88e2cd25a28a1

```diff
+ ```ruby
+ require "openai"
+ client = OpenAI::Client.new
+ instructions = <<~INSTRUCTIONS
+ ticket below, categorize the request as Hardware, Software, or Other.
+ Respond with only one of those words.
+ INSTRUCTIONS
+ {role: :developer, content: instructions},
+ {role: :user, content: "My monitor won't turn on - help!"}
+ puts(response.output_text)
+ ```ruby
+ require "openai"
+ client = OpenAI::Client.new
+ evaluation = client.evals.create(
+ name: "Support answer quality",
+ data_source_config: {type: :custom, item_schema: {type: :object, properties: {input: {type: :string}}, required: ["input"]}},
+ testing_criteria: [{type: :string_check, name: "mentions_refund", input: "{{sample.output_text}}", operation: :contains, reference: "refund"}]
+ puts(evaluation.id)
+ ```ruby
+ require "openai"
+ require "pathname"
+ client = OpenAI::Client.new
+ file = Pathname("tickets.jsonl")
+ uploaded = client.files.create(file: file, purpose: :evals)
+ puts(uploaded.id)
+ ```ruby
+ require "openai"
+ client = OpenAI::Client.new
+ type: :responses,
+ source: {type: :file_id, id: "YOUR_FILE_ID"},
+ type: :template,
+ role: :developer,
+ content: "Categorize the ticket as Hardware, Software, or Other."
+ {role: :user, content: "{{ item.ticket_text }}"}
+ model: "gpt-5.6"
+ puts(run.id)
+ ```ruby
+ require "openai"
+ client = OpenAI::Client.new
+ run = client.evals.runs.retrieve("YOUR_RUN_ID", eval_id: "YOUR_EVAL_ID")
```

### openai.api.models

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/models/all
- Change: changed
- Prior hash: 6ef11d4b97363bb0127bcf0d63125d1f02a800da77a10147873f6514acce0b3f
- Current hash: ddb9538f9539e22b9cdc42810839a7a02a1f679db6029f88ec3e391e6b6d727b

```diff
- Chronicle
- Safety
- Cyber Safety
- Access tokens
+ IP allowlist
+ Submit a Claude Code plugin
+ Computer History
+ Linux
+ Cyber safety
+ Models & Trusted Access
+ Recommended configuration
+ ChatGPT Work Overview
+ Personal Access Tokens
+ GPTs and Sharing
+ OpenAI Daybreak
+ Frontier cyber models for defenders
+ GPT-5.6 Cyber
+ Our most advanced cybersecurity model for authorized vulnerability research and security testing.
+ Daybreak Red
+ An alias for advanced cybersecurity models for authorized vulnerability research and security testing.
+ Daybreak Blue
+ An alias for frontier general-purpose models with safeguards for defensive cybersecurity work.
```

### openai.api.token-counting

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/guides/token-counting
- Change: changed
- Prior hash: d485cb6f3b207044b242c23fce407b2b268de170cfc12975773977def94b14c0
- Current hash: 27c4c36c68aa3d4ef82c9c3c6982fc41e7c9257ce4d8dd7898c08e274f89ecba

```diff
+ ```ruby
+ require "openai"
+ client = OpenAI::Client.new
+ count = client.responses.input_tokens.count(
+ input: "Tell me a joke."
+ puts(count.input_tokens)
+ ```ruby
+ require "openai"
+ client = OpenAI::Client.new
+ conversation = [
+ {role: :user, content: "What is 2 + 2?"},
+ {role: :assistant, content: "2 + 2 equals 4."},
+ {role: :user, content: "What about 3 + 3?"}
+ count = client.responses.input_tokens.count(
+ input: conversation
+ puts(count.input_tokens)
+ ```ruby
+ require "openai"
+ client = OpenAI::Client.new
+ count = client.responses.input_tokens.count(
+ input: "Explain quantum computing in one sentence."
+ puts(count.input_tokens)
+ ```ruby
+ require "openai"
+ client = OpenAI::Client.new
+ count = client.responses.input_tokens.count(
+ role: :user,
+ type: :input_image,
+ image_url: "https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg",
+ detail: :auto
+ {type: :input_text, text: "Summarize this chart."}
+ puts(count.input_tokens)
+ ```ruby
+ require "openai"
+ client = OpenAI::Client.new
+ count = client.responses.input_tokens.count(
+ type: :function,
+ properties: {location: {type: "string"}},
+ additionalProperties: false
+ puts(count.input_tokens)
```

### openai.codex.changelog

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/changelog
- Change: changed
- Prior hash: d8efbba9e20ca65f688a00c5add35a91aab76cbf2b96cc1e247803c2296f18a5
- Current hash: 2da006560239d41037e3d2610546b1d861c406a20c4a5ff8e935b7a206eb7dc6

```diff
- Chronicle
- Safety
- Cyber Safety
- Access tokens
- li+li]:mt-12"> 2026-08-07
- li+li]:mt-12"> 2026-06-29
- Codex CLI 0.142.4
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.142.4
- No user-facing changes were identified for this release.
- Full Changelog: rust-v0.142.3...rust-v0.142.4
- 2026-06-26
- Codex CLI 0.142.3
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.142.3
- Maintenance-only patch release with no user-facing changes since 0.142.2.
- Full Changelog: rust-v0.142.2...rust-v0.142.3
- 2026-06-25
- 2026-06-25
- Codex CLI 0.142.2
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.142.2
- MCP tools now use tool search by default when supported, improving tool discovery while preserving compatibility with older models and providers. ( #29486 )
- macOS authentication clients can honor system proxy, PAC, and WPAD settings when respect_system_proxy is enabled. ( #26709 )
- Plugins can provide dedicated dark-mode logos through local manifests and remote catalogs. ( #29488 )
- Apps can display richer safety-buffering UI using server-provided visibility and faster-model metadata. ( #29473 )
- Remote plugin catalogs now return curated featured-plugin rankings. ( #29485 )
- Expired Amazon Bedrock credentials now produce actionable recovery guidance instead of a generic authorization error. ( #28992 )
- Remote stdio MCP servers now accept absolute working directories written in the remote platform’s path format. ( #29493 )
- Remote HTTP(S) image inputs now return clear model-visible validation errors; inline data URLs and local images remain supported. ( #29417 , #29419 )
- PowerShell commands containing executable AST regions the safety classifier cannot inspect now require approval. ( #24092 )
- Code Mode now warns when the selected model lacks the required metadata. ( #29490 )
- Updated bundled OpenSSL and esbuild dependencies to patched releases. ( #29487 , #29489 )
- Successful formatter runs are now quiet while failures still show diagnostics. ( #29467 )
- Full Changelog: rust-v0.142.1...rust-v0.142.2
- 2026-06-25
- Codex CLI 0.142.1
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.142.1
- Added opt-in Windows system proxy support for authentication, including PAC, WPAD, static proxies, and bypass rules. ( #26708 )
- Full Changelog: rust-v0.142.0...rust-v0.142.1
+ IP allowlist
+ Submit a Claude Code plugin
+ Computer History
+ Linux
+ Cyber safety
+ Models & Trusted Access
+ Recommended configuration
+ ChatGPT Work Overview
+ Personal Access Tokens
+ GPTs and Sharing
+ li+li]:mt-12"> 2026-08-13
+ Computer History
+ Computer History is an opt-in feature
+ in the ChatGPT desktop app on macOS that turns activity across apps and
+ websites into memories and a timeline that ChatGPT and Codex can use. Choose
+ which apps and websites contribute, pause collection, and review or delete
+ your history at any time.
+ Computer History is available to ChatGPT Pro, Business, and Enterprise users.
+ Business and Enterprise administrators must enable access before workspace
+ members can turn it on. Initial availability excludes the European Economic Area (EEA),
+ Switzerland, and the United Kingdom.
+ 2026-08-11
+ Linux desktop preview and agent imports
+ Install the ChatGPT desktop app on Linux
+ The ChatGPT desktop app for Linux is available in
+ preview for supported Ubuntu, Debian, and Fedora desktop distributions on x64
+ and ARM64 processors. Download the .deb or .rpm package for your
+ distribution, then sign in to work with projects, local files, and Codex.
+ Import setup and recent work from other agents
+ The desktop app supports Claude Code , Claude Cowork , and
+ Cursor . Import instructions, settings, skills, plugins, projects, and
+ recent work , then turn on automatic updates in
+ Settings > Import to keep imported work in sync.
+ Codex CLI can also import supported setup and recent chats from Claude Code
+ and Cursor with /import .
+ 2026-08-10
+ Introducing Daybreak Blue and Daybreak Red
+ Daybreak now offers two access tiers for approved defenders: Daybreak Blue and
+ Daybreak Red. Use them to move from security findings to validated fixes in
+ explicitly authorized engagements.
… diff truncated (67 added / 37 removed lines)
```

### openai.codex.models

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/models
- Change: changed
- Prior hash: d874fe486c2dc088b00cc715543b16af688819e317215f851c058657ae80d558
- Current hash: 950329102a6b2e1e5f9f1bf88f819fa9bcbfc41ad8ee99850992319eb22ac2ef

```diff
- Chronicle
- Safety
- Cyber Safety
- Access tokens
+ IP allowlist
+ Submit a Claude Code plugin
+ Computer History
+ Linux
+ Cyber safety
+ Models & Trusted Access
+ Recommended configuration
+ ChatGPT Work Overview
+ Personal Access Tokens
+ GPTs and Sharing
```

### openai.codex.plan-usage

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/pricing
- Change: changed
- Prior hash: 7324f922c72e7cb5ba5540053f1c3f8e2826ffd4ca4c01ae9f67daf5df390ca3
- Current hash: 80706b64e61c061cb18d651ee94a58c882a54d51738ac9ed573123e52a38de1d

```diff
- Chronicle
- Safety
- Cyber Safety
- Access tokens
- Chronicle
- Chronicle
+ IP allowlist
+ Submit a Claude Code plugin
+ Computer History
+ Linux
+ Cyber safety
+ Models & Trusted Access
+ Recommended configuration
+ ChatGPT Work Overview
+ Personal Access Tokens
+ GPTs and Sharing
+ Daybreak Blue
+ Daybreak Red
+ 312.5 credits
+ 1875 credits
+ Daybreak access requires Trusted Access for
+ Cyber approval.
+ Daybreak Blue uses GPT-5.6 Sol credit rates. Daybreak Red requires
+ separate approval and provisioning.
+ Computer History
+ Computer History
```

## Volatile noise (ignored)

- `anthropic.claude-code.legal` — https://code.claude.com/docs/en/legal-and-compliance
- `apify.api.v2` — https://docs.apify.com/api/v2
- `apify.platform.changelog` — https://apify.com/change-log?_format=html
- `exa.docs.changelog` — https://exa.ai/docs/changelog
- `exa.docs.search` — https://exa.ai/docs/reference/search
- `gemini.api.tokens` — https://ai.google.dev/gemini-api/docs/tokens
- `hermes.docs.mixture-of-agents` — https://hermes-agent.nousresearch.com/docs/user-guide/features/mixture-of-agents
