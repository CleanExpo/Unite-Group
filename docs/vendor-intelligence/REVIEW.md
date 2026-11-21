# Nexus vendor-intelligence review

Generated: 2026-11-21T17:17:53.403Z

Summary: 36 sources reviewed; 36 material; 0 volatile noise; 0 unchanged; 0 not fetched.

## Material changes

### anthropic.claude-code.changelog

- Vendor: Anthropic
- Source: https://code.claude.com/docs/en/changelog
- Change: changed
- Prior hash: 3f6f83405e574480ef3eb66c8183dd6c984f9bb6f6fdcaef3d7abd287cf6d236
- Current hash: 2cf17aba2eb5ebb68e4cc094de075971deadf4f0e51753ce092f06cdca6b8ab1

```diff
- This page is generated from the [CHANGELOG.md on GitHub](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md).
- <Update label="2.1.261" description="September 4, 2026">
- </Update>
- <Update label="2.1.260" description="September 3, 2026">
- </Update>
- <Update label="2.1.259" description="September 2, 2026">
- </Update>
- <Update label="2.1.258" description="September 1, 2026">
- </Update>
- <Update label="2.1.257" description="September 1, 2026">
- </Update>
- <Update label="2.1.252" description="August 31, 2026">
- </Update>
- <Update label="2.1.251" description="August 28, 2026">
- </Update>
- <Update label="2.1.250" description="August 28, 2026">
- </Update>
- <Update label="2.1.248" description="August 27, 2026">
- </Update>
- <Update label="2.1.247" description="August 26, 2026">
- </Update>
- <Update label="2.1.246" description="August 25, 2026">
- </Update>
- <Update label="2.1.245" description="August 25, 2026">
- </Update>
- <Update label="2.1.243" description="August 25, 2026">
- </Update>
- <Update label="2.1.241" description="August 23, 2026">
- </Update>
- <Update label="2.1.240" description="August 22, 2026">
- </Update>
- <Update label="2.1.239" description="August 21, 2026">
- </Update>
- <Update label="2.1.238" description="August 20, 2026">
- </Update>
- <Update label="2.1.237" description="August 20, 2026">
- </Update>
- <Update label="2.1.236" description="August 19, 2026">
- </Update>
- <Update label="2.1.235" description="August 18, 2026">
+ This page is generated from the [CHANGELOG.md on GitHub](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md). Longer releases are grouped by type of change, with long lists of improvements and bug fixes collapsed.
+ **2.1.330**
+ November 20, 2026
+ **Added**
+ * Added sign-in to organizations managed in Anthropic's Enterprise Admin Console: after `claude auth login`, Claude Code applies the organization's settings and uses its cloud provider or gateway
+ * Added easel, a built-in mod that draws charts when asked and under MCP metrics results, on Pro, Max and, where available, Team and Enterprise on macOS and Linux; turn automatic charts off in `/config`
+ * Added `CLAUDE_CODE_FULL_SIGN_IN_LINK=1` to print the full sign-in link, if the short one shows an error or a script reads values from it
+ * Self-hosted runner: Added `--start-dir` / `SELF_HOSTED_RUNNER_START_DIR` to have Claude start its work in a folder of a repository, while settings and hooks load as without it
+ * Added a notice in cloud and self-hosted runner sessions when a plugin marketplace can't be fetched because its repository isn't one of the session's
+ * Self-hosted runner: Added a notice when Anthropic-managed git refuses a plugin's own repository, naming the plugin and what to do
+ * Added `commandPrinted` to `claude plugin install --json` results, true when the plugin's install command wrote to stderr, and `commandFailed` when it exited with an error, was killed or timed out
+ * Added `claude_code_self_hosted_runner_order_to_registered_seconds` to the self-hosted runner's `/metrics`: seconds from work order issued to registration accepted, on orchestrator-spawned runners
+ * Added `claude_code_self_hosted_runner_order_to_first_session_seconds` to the self-hosted runner's `/metrics`: seconds from work order to first session handed over, on runners started for a session
+ * \[VSCode] Added `/fork` to fork a conversation after its last reply (anthropics/claude-code#69272)
+ * \[VSCode] Added `/workflows`, which opens the agent map with running workflows
+ * \[VSCode] Added the `claudeCode.escapeStopsClaude` setting; turn it off so Escape does not stop Claude (anthropics/claude-code#91536)
+ * \[VSCode] Added the `claudeCode.pinPrompt` setting to let your message scroll away instead of staying pinned
+ * \[VSCode] Added the `claudeCode.contextUsageThreshold` setting for when the context indicator shows (anthropics/claude-code#93036)
+ * \[VSCode] Added a `prompt` argument to the "Open in Side Bar" command for keybindings and extensions
+ * \[VSCode] Added Move up and Move down to a session group's menu (anthropics/claude-code#98654)
+ **Changed**
+ * Reverted 2.1.329's removal of the automatic retry when `max_tokens` exceeds a model's or gateway's limit
+ * Changed recurring scheduled tasks and `/loop` to run up to 30 days instead of 7 while their session keeps running, and say when they end; tasks made before this release still end at 7 days
+ * Changed more `rm` commands aimed at the root, home, a top-level folder or the working folder to ask for approval; where nobody can answer, they're refused
+ * Changed `deniedMcpServers` name entries to hide only the named claude.ai connector, not others at its URL; to block them all, deny its exact URL
+ * Changed `claude --teleport` in some setups to print the git commands for switching branch instead of running them; with `-p` it exits 1 until you switch
+ * Changed unrecognized model names containing "sonnet" or "haiku" to use the shorter system prompt, like other unrecognized names; `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0` gives every model the full one
+ * Changed skills that Claude runs with a `model` setting, other than `context: fork` skills, to leave subagents, forks, compaction and `/recap` on the session's model
+ * Changed a subagent's model fallback to carry over: agents with no model and forks it then starts run on the fallback, and the agents they start use its Bedrock region
+ * Self-hosted runner: Changed `spawn-runner` hooks to start while earlier ones still run, up to `--hook-concurrency` per orchestrator (4 by default); set it to 1 if yours can't run beside another
+ * Self-hosted runner: Changed Bash commands to skip the file diff when nothing needs it, so transcripts can lack it; set `bashEditDiffEnabled` to true in managed settings to get every diff
+ * Changed self-hosted runners to stop a session's start at once, without trying other runners, when a checkout hook exits with status 108
+ * Changed prompt hooks to accept model aliases such as `haiku` or `sonnet` in their `model` field
+ * Changed `/design-sync`'s fallback build of the reference Storybook to use only a Storybook installed in the project
+ * Changed subagent progress summaries in terminal sessions signed in to a Claude apps gateway to be written from short notes instead of the whole conversation, using far fewer tokens
+ **14 improvements**
+ * Improved the claude.ai sign-in link shown by /login, `claude auth login` and `claude setup-token`: it is now much shorter
+ * Windows: Improved Grep and Glob speed by no longer starting a console host for each built-in ripgrep search on a local path
+ * Improved the speed of file diffs
+ * Improved `/config` search: most settings whose name starts with what you type come first, "effort" finds Model, and "dark" or "light" finds Theme
… diff truncated (6744 added / 788 removed lines)
```

### anthropic.claude-code.legal

- Vendor: Anthropic
- Source: https://code.claude.com/docs/en/legal-and-compliance
- Change: unchanged
- Prior hash: f108f4c2704787c4ab440ad89f4478213d5a12080155111f7debc4e9df491ce6
- Current hash: d932c93b6a564bf3e9bc967627eef920224ee318907921ffe8e217f6dc6962d6

```diff
- * [Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms) - for Free, Pro, and Max users
- If a customer has executed a Business Associate Agreement (BAA) with Anthropic and has [Zero Data Retention (ZDR)](/docs/en/zero-data-retention) enabled for the relevant organization, that BAA extends to the customer's API traffic through Claude Code.
- Claude Code usage is subject to the [Anthropic Usage Policy](https://www.anthropic.com/legal/aup). Advertised usage limits for Pro and Max plans assume ordinary, individual usage of Claude Code and the Agent SDK.
- * **OAuth authentication** is intended exclusively for purchasers of Claude Free, Pro, Max, Team, and Enterprise subscription plans and is designed to support ordinary use of Claude Code and other native Anthropic applications. For the sign-in steps, see [Logging in to your Claude account](https://support.claude.com/en/articles/13189465-logging-in-to-your-claude-account); for how Claude Code performs OAuth authentication, see [Authentication](/docs/en/authentication).
- * **Developers** building products or services that interact with Claude's capabilities, including those using the [Agent SDK](/docs/en/agent-sdk/overview), should use API key authentication through [Claude Console](https://platform.claude.com/) or a supported cloud provider. Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, or Max plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens — sign-in to a Claude account must complete through Anthropic's own flow.
+ * [Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms) - for Free, Pro, Max, and Ultra users
+ If a customer has executed a Business Associate Agreement (BAA) with Anthropic, that BAA extends to Claude Code in two configurations, depending on what is available for your organization:
+ * **HIPAA configuration**: the Claude Code CLI or the Code tab in Claude Desktop, used with a Claude for Enterprise account. The organization must have HIPAA enabled and the HIPAA configuration applied to Claude Code (local mode) and Cowork (local mode). See [Set up Claude Code (local mode) for a HIPAA-ready organization](https://code.claude.com/docs/en/hipaa-setup.md).
+ * **Zero Data Retention**: Claude Code with [Zero Data Retention (ZDR)](https://code.claude.com/docs/en/zero-data-retention.md) enabled for the relevant organization. ZDR isn't available for all organizations.
+ Under the HIPAA configuration, cloud sessions, Remote Control, Claude Code in the Claude mobile app, and Claude Code routed through a third-party cloud provider or a gateway aren't covered. Review the [Implementation Guide](https://trust.anthropic.com/resources?s=l1wrssd9hsbi4gak0tp5a6\&name=%5Banthropic%5D-hipaa-ready-offering-implementation-guide) for a full list of Eligible Services.
+ Claude Code usage is subject to the [Anthropic Usage Policy](https://www.anthropic.com/legal/aup). Advertised usage limits for Pro, Max, and Ultra plans assume ordinary, individual usage of Claude Code and the Agent SDK.
+ * **OAuth authentication** is intended exclusively for purchasers of Claude Free, Pro, Max, Ultra, Team, and Enterprise subscription plans and is designed to support ordinary use of Claude Code and other native Anthropic applications. For the sign-in steps, see [Logging in to your Claude account](https://support.claude.com/en/articles/13189465-logging-in-to-your-claude-account); for how Claude Code performs OAuth authentication, see [Authentication](https://code.claude.com/docs/en/authentication.md).
+ * **Developers** building products or services that interact with Claude's capabilities, including those using the [Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview.md), should use API key authentication through [Claude Console](https://platform.claude.com/) or a supported cloud provider. Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, Max, or Ultra plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens — sign-in to a Claude account must complete through Anthropic's own flow.
```

### anthropic.platform.access-transparency

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/access-transparency
- Change: changed
- Prior hash: edc51d81b95ed110b6da41731c6b6d15ebf57270e1178a9628b7c4339e8a9bae
- Current hash: f3722fbed0165686ca1ebf02c023c54979b5d1feb89b007cf80f4b0da76c4b74
- Surface: Anthropic API compliance — Access Transparency (api-compliance)
- Surface note: Access Transparency is a human-access audit facility covering specific Anthropic API customer-data surfaces only. It is NOT Claude Max usage telemetry and does not cover the excluded consumer/application surfaces. Changes here classify strictly under the API-compliance surface and must never be reported as Max or consumer usage telemetry.
- Explicitly excludes: Claude Max plan usage telemetry; Claude consumer application (Claude.ai) surfaces; Claude Code local session telemetry; Claude mobile and desktop application usage

```diff
- Learn how Access Transparency creates a record of human access to your organization's data by Anthropic personnel, what it covers, and how to receive events through the Compliance API.
- Access Transparency is available to eligible customers on request and is not self-serve. For eligibility, refer to your contract terms or contact your Anthropic account representative.
- * **Human access happens only under a published reason code.**
- * **Human views of your covered content are recorded.** Anthropic's internal tooling that can reach your covered content is instrumented to emit an event on each view.
- * **Events represent human access, not automated processing.** Anthropic's automated safety systems process your content in a secured pipeline with no interactive human access; that processing does not generate `anthropic_access` events. The one event automated processing can initiate is a `cmek_preserve` preservation record (see [CMEK content preservation](https://platform.claude.com/docs/en/manage-claude/access-transparency#cmek-content-preservation)).
- * **Events arrive on your existing feed.** Activities are accessible through your [Compliance API Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed). Existing credentials, audit, export, and SIEM integrations for the Compliance API will still apply.
- * **Covered content:** Access Transparency covers prompt and response content sent through the Claude Messages API or Claude Code sessions. Anthropic's [general ZDR documentation](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) and [ZDR for Claude Code documentation](https://code.claude.com/docs/en/zero-data-retention) explain which APIs and features are covered by ZDR. The same APIs and features are covered by Access Transparency.
- * **Your own organization's activity:** Your API calls, admin actions, and Compliance API reads are covered by standard [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) event types.
- * **Claude consumer products:** Claude Free, Pro, or Max plans.
- * **Partner-operated platforms:** Amazon Bedrock and Google Cloud; refer to those platforms' transparency controls.
- * **Anything ZDR does not cover:** Products that are not covered by ZDR (for example, the Files API, Anthropic-hosted stateful applications, and the Batch API) are not covered by Access Transparency. See [ZDR documentation](https://code.claude.com/docs/en/zero-data-retention#what-zdr-does-not-cover) for additional details.
- --header "x-api-key: $ANTHROPIC_COMPLIANCE_ACCESS_KEY" \
- --header "anthropic-version: 2023-06-01"
- | ------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
- | `created_at` | RFC 3339 string | When the activity became visible in your feed |
- | `resource_details.parent` | string or null | Identifier of the content's parent, for example the conversation ID containing a message. Currently `null` or omitted until resources with parents are supported |
- "organization_uuid": "5b236db4-3fb4-4bf3-a560-b5e266038a15"
- * **A preservation event is written regardless of how the preservation was initiated.** Preservation ordinarily follows human review of the content, but the event is written whether the preservation was initiated by a human reviewer or by an automated safety pipeline: the record reflects that your content's retention state changed, independent of who changed it.
- --header "x-api-key: $ANTHROPIC_COMPLIANCE_ACCESS_KEY" \
- --header "anthropic-version: 2023-06-01"
- "organization_uuid": "00000000-1111-2222-3333-444444444444"
- | -------------------------------- | ------------------------------------------------------------------------------ |
- | ----------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
- | Claude Free, Pro, Max | No | Consumer plans are not eligible |
- | Amazon Bedrock, Google Cloud | No | Partner-operated platforms; refer to those platforms' transparency controls |
- Access Transparency applies from the time it is enabled for your organization. Content already in your retention window at enablement might also generate events when accessed, but Anthropic does not guarantee coverage for content written before enablement. Treat your enablement date as the start of reliable coverage. There might be a delay of up to two hours between enabling Access Transparency and your content being covered.
- `anthropic_access` and `cmek_preserve` events are delivered to your Compliance API feed within two business days of the access or preservation they record. This feed should not be treated as a real-time alerting channel, and the `accessed_at` timestamp reflects when the access occurred, which might be up to two business days before the activity becomes visible in your feed. The `created_at` field reflects the time that the event became visible.
- `anthropic_access` events record human access only. Anthropic's automated safety systems and classifiers continue to process your content as part of normal operation, and that processing does not generate `anthropic_access` events. The one event automated processing can initiate is a `cmek_preserve` preservation record (see [CMEK content preservation](https://platform.claude.com/docs/en/manage-claude/access-transparency#cmek-content-preservation)). An empty feed means no human at Anthropic has viewed your content; it does not mean your content was not processed by automated systems.
- For organizations that also enable CMEK, your cloud KMS audit log (CloudTrail, Cloud Audit Logs, or Azure Monitor) records Anthropic's use of your key. Because keys are cached for short periods during operation, an individual human read does not necessarily produce a distinct KMS decryption entry. Use the Access Transparency feed as the per-access record; your KMS log independently confirms key usage patterns.
- <Accordion title="We are a platform that serves Claude to our own end users. Can we enable Access Transparency?">
- Access Transparency is not available for platform deployments. Contact your Anthropic account representative to discuss your use case.
- <Accordion title="Will I see events for access that happened before we enrolled, or for our older data?">
- Within two business days of the access. Configure any SIEM alerting or scheduled exports with a matching lookback window rather than assuming real-time arrival.
- They are independent. With CMEK, safety preservation outside your key emits a separate `cmek_preserve` event on the same feed. See [CMEK content preservation](https://platform.claude.com/docs/en/manage-claude/access-transparency#cmek-content-preservation) and [CMEK](https://platform.claude.com/docs/en/manage-claude/cmek).
- * [Customer-Managed Encryption Keys (CMEK)](https://platform.claude.com/docs/en/manage-claude/cmek)
+ Learn how Access Transparency creates a record of human access to your organization’s data by Anthropic personnel, what it covers, and how to receive events through the Compliance API.
+ Access Transparency is available to eligible customers on request and is not self-serve. For eligibility, refer to your contract terms or contact your Anthropic account representative. Anthropic also enables Access Transparency when it [approves your whole organization for customer-managed keys](https://platform.claude.com/docs/en/manage-claude/access-transparency#access-transparency-with-customer-managed-keys). You can’t turn Access Transparency off in the Claude Console or through the API.
+ * **Human access occurs only under a published reason code.**
+ * **Human views of your covered content are recorded.** Anthropic’s internal tooling that can reach your covered content is instrumented to emit an event on each view.
+ * **Events represent human access, not automated processing.** Anthropic’s automated safety systems process your content in a secured pipeline with no interactive human access; that processing does not generate `anthropic_access` events. The one event automated processing can initiate is a `cmek_preserve` preservation record (see [CMEK content preservation](https://platform.claude.com/docs/en/manage-claude/access-transparency#cmek-content-preservation)).
+ * **Events arrive on your existing feed.** Activities are accessible through your [Compliance API Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed). Existing credentials, audit, export, and SIEM integrations for the Compliance API still apply.
+ * **Events are tamper-evident.** Each event recorded after your organization’s [transparency log](https://platform.claude.com/docs/en/manage-claude/access-transparency-log) (beta) is created is also committed to that log. The log is an append-only, signed record that you can verify independently of Anthropic’s serving systems.
+ * **Covered content:** Access Transparency covers prompt and response content sent through the Claude Messages API or Claude Code sessions. The [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) page explains which APIs and features are covered by ZDR. The same APIs and features are covered by Access Transparency.
+ * **Your own organization’s activity:** Your API calls, admin actions, and Compliance API reads are covered by standard [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) event types.
+ * **Claude consumer products:** Claude Free, Pro, Max, or Ultra plans.
+ * **Partner-operated platforms:** Claude Models on Google Cloud (Google managed) and Amazon Bedrock. Refer to those platforms’ transparency controls.
+ * **Anything ZDR does not cover:** Products that are not covered by ZDR (for example, the Files API, Anthropic-hosted stateful applications, and the Batch API) are not covered by Access Transparency. See [Zero data retention (ZDR)](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#zero-data-retention-zdr-scope) for additional details.
+ ### Access Transparency with customer-managed keys
+ When Anthropic approves your whole organization for [customer-managed encryption keys](https://platform.claude.com/docs/en/manage-claude/cmek) (CMEK), it also enables Access Transparency for the organization. This happens at approval, before you attach a key, so you don’t need to request Access Transparency separately. Access Transparency still doesn’t cover content in claude.ai. See [What Access Transparency does not cover](https://platform.claude.com/docs/en/manage-claude/access-transparency#what-access-transparency-does-not-cover).
+ Note the following about the approval:
+ * **Linked organizations:** If your organization is linked to a [parent organization](https://platform.claude.com/docs/en/manage-claude/compliance-api-access#which-key-do-you-need), the approval doesn’t guarantee Access Transparency for the other Claude Console organizations linked to that parent, now or later. Some of those organizations might have it.
+ * **Browser calls:** Organizations with Access Transparency enabled cannot call the Claude API directly from a browser. See [Browser-based applications](https://platform.claude.com/docs/en/manage-claude/authentication#browser-based-applications).
+ The approval doesn’t change your Compliance API setting. Anthropic records Access Transparency events even while the Compliance API is off, but you can read them only while it’s on. To read them:
+ 1. [Turn on the Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api-access#set-up-the-compliance-api).
+ 2. Read the [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) with a [Compliance Access Key or an Admin API key](https://platform.claude.com/docs/en/manage-claude/compliance-api-access#which-key-do-you-need). Create an Admin API key after you turn on the Compliance API, because a key created earlier can’t read the feed.
+ On Claude Platform on AWS, ask your Anthropic account representative to turn on the Compliance API. Then read the feed with the [`ListComplianceActivities` IAM action](https://platform.claude.com/docs/en/api/claude-platform-on-aws-iam-actions#compliance).
+ Not every organization that uses CMEK has Access Transparency. For example, it might not be enabled in these cases:
+ * Anthropic approved individual workspaces for CMEK, not your whole organization.
+ * Anthropic approved your organization for CMEK before November 2, 2026.
+ To check, contact your Anthropic account representative.
+ -H "x-api-key: $ANTHROPIC_COMPLIANCE_ACCESS_KEY" \
+ -H "anthropic-version: 2026-10-21"
+ Turning the Compliance API off stops your access to Access Transparency events, not their recording. The Activity Feed returns them after the Compliance API is turned back on.
+ | ----- | ----- | ----- |
+ | `created_at` | RFC 3339 string | When Anthropic recorded the event. An event usually becomes visible in your feed shortly after; see [Timing](https://platform.claude.com/docs/en/manage-claude/access-transparency-log#timing) for when it can lag |
+ | `resource_details.parent` | string or null | Identifier of the content’s parent, for example the conversation ID containing a message. Currently `null` or omitted until resources with parents are supported |
+ | `workspace_uuid` | string | The workspace the content belongs to. UUID format. Present when the access was scoped to a workspace, and absent otherwise. Not one of the transparency log’s [leaf fields](https://platform.claude.com/docs/en/manage-claude/access-transparency-log#how-an-event-becomes-a-leaf), so an inclusion proof does not cover it |
+ | `transparency_log_leaf_index` | integer | The event’s zero-based position in your organization’s transparency log (beta). Present whenever the event has a leaf, and absent otherwise. See [Verify Access Transparency events with the transparency log](https://platform.claude.com/docs/en/manage-claude/access-transparency-log) |
+ | `user_profile_id` | string | The [user profile](https://platform.claude.com/docs/en/manage-claude/user-profiles) the accessed or preserved content was created under. Tagged ID format (`uprof_...`). Present only when the content was created under a user profile |
+ "organization_uuid": "5b236db4-3fb4-4bf3-a560-b5e266038a15",
+ "transparency_log_leaf_index": 41
+ * **A preservation event is written regardless of how the preservation was initiated.** Preservation ordinarily follows human review of the content, but the event is written whether the preservation was initiated by a human reviewer or by an automated safety pipeline: the record reflects that your content’s retention state changed, independent of who changed it.
+ -H "x-api-key: $ANTHROPIC_COMPLIANCE_ACCESS_KEY" \
+ -H "anthropic-version: 2026-10-21"
+ "organization_uuid": "00000000-1111-2222-3333-444444444444",
… diff truncated (58 added / 35 removed lines)
```

### anthropic.platform.authentication

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/authentication
- Change: changed
- Prior hash: bfedc8ac0f35c27b64d6594a36fb1b06bc2bb1032937edcb148492a04ae34a41
- Current hash: af676b9a81cc62b0af7a846492c502314383c5c1400d0a10bdadab1b41af789a

```diff
- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
- | [Workload Identity Federation](https://platform.claude.com/docs/en/manage-claude/authentication#workload-identity-federation) | Short-lived bearer token exchanged from your identity provider's identity token | Production workloads on cloud platforms (AWS, Google Cloud, Azure), CI/CD pipelines, and Kubernetes, where you want to eliminate static secrets |
- | -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
- | **Personal key** | You, the user, with your roles and permissions | Either a single workspace or the workspaces where your role allows API use, chosen when the key is created | You lose access to the organization or, for a single-workspace key, to that workspace. Personal keys are archived when you are removed from the organization. If you are re-invited, create new keys; archived keys are not restored |
- | **Service account key** | A [service account](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation#service-accounts) | Either a single workspace or anything the service account has access to, chosen when the key is created. A service account has access to the Default Workspace and to workspaces it has been added to | The service account is archived or, for a single-workspace key, is removed from that workspace |
- Personal keys and service account keys are identity-backed: each belongs to a user or service account your organization already manages, and every request acts as that identity. When that identity is removed from the organization, the key stops working. This means that keys won't accidentally outlive the people or workloads that own them. Prefer them over workspace keys for new integrations.
- Workspace API keys still work but should be considered legacy; identity-backed keys or [Workload Identity Federation](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation) are preferred. To migrate, see [Replacing workspace API keys](https://platform.claude.com/docs/en/manage-claude/authentication#replacing-workspace-api-keys).
- * **Create a key:** Go to [Settings → API keys](https://platform.claude.com/settings/keys) in the Claude Console and click **Create key**. Name the key and choose an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration). Set **Linked account** to yourself for a personal key, or to a service account for a key shared across multiple users. You can also scope the key to a specific workspace, which lets you skip setting a workspace ID manually in future requests.
- * **Use the key:** Send it as `Authorization: Bearer <key>` on direct HTTP requests, or set the `ANTHROPIC_API_KEY` environment variable and the [client SDKs](https://platform.claude.com/docs/en/cli-sdks-libraries/overview) pick it up automatically.
- anthropic-version: 2023-06-01
- The legacy `x-api-key: YOUR_API_KEY` header is still supported in place of `Authorization`.
- Store API keys in a secrets manager, rotate them periodically, and disable or delete any key you suspect has leaked. On the [API keys page](https://platform.claude.com/settings/keys), **Disable** is reversible (the Admin API reports the key's `status` as `"inactive"`, and **Re-enable** returns it to `"active"`), while **Delete** is permanent: the key is archived and still appears in [List API Keys](https://platform.claude.com/docs/en/api/admin/api_keys/list) with `status: "archived"`. Expired keys can only be deleted. You can also set an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration) when you create a key to limit how long a leaked credential stays usable.
- -H "anthropic-version: 2023-06-01" \
- "model": "claude-opus-5",
- option.WithAPIKey("sk-ant-api03-..."), // defaults to os.LookupEnv("ANTHROPIC_API_KEY")
- import com.anthropic.client.AnthropicClient;
- import com.anthropic.client.okhttp.AnthropicOkHttpClient;
- using Anthropic;
- If your API key isn't scoped to a workspace, you must specify the workspace ID in the `anthropic-workspace-id` header for each request. See the following example for how to set this header in a request or in SDKs.
- The [Admin API](https://platform.claude.com/docs/en/manage-claude/admin-api) accepts a personal key or service account key only if the key isn't scoped to a specific workspace.
- You can find a workspace's ID in the **ID** column of [Settings → Workspaces](https://platform.claude.com/settings/workspaces) in the Claude Console, or by calling the [List Workspaces](https://platform.claude.com/docs/en/api/admin/workspaces/list) endpoint. List Workspaces omits the Default Workspace; its ID is in the `anthropic-workspace-id` [response header](https://platform.claude.com/docs/en/manage-claude/workspaces#identify-the-workspace-behind-an-api-response) of any request that runs there.
- # Required on every request for a multi-workspace key.
- # Omit the anthropic-workspace-id header for a single-workspace key.
- -H "anthropic-version: 2023-06-01" \
- "model": "claude-opus-5",
- # Required on every command for a multi-workspace key.
- # Omit --workspace-id for a single-workspace key.
- --model claude-opus-5 \
- # Required on every request for a multi-workspace key.
- # Omit extra_headers for a single-workspace key.
- model="claude-opus-5",
- // Required on every request for a multi-workspace key.
- // Omit the second argument for a single-workspace key.
- model: "claude-opus-5",
- Model = Model.ClaudeOpus5,
- Messages = [new() { Role = Role.User, Content = "Hello, Claude" }],
- // Required on every request for a multi-workspace key.
- // Call client.Messages.Create(parameters) directly for a single-workspace key.
- // Required on every request for a multi-workspace key.
- // Omit the option for a single-workspace key.
+ | ----- | ----- | ----- |
+ | [Workload Identity Federation (WIF)](https://platform.claude.com/docs/en/manage-claude/authentication#workload-identity-federation) | Short-lived bearer token exchanged from your identity provider’s identity token | Production workloads on cloud platforms (AWS, Google Cloud, and Azure), CI/CD pipelines, and Kubernetes, where you want to eliminate static secrets |
+ | ----- | ----- | ----- | ----- |
+ | **Personal key** | You, the user, with your roles and permissions | Either a single workspace or the workspaces where your role allows API use, chosen when the key is created | You lose access to the organization. A single-workspace key also stops working when you lose access to that workspace or that workspace is archived. Personal keys are archived when you are removed from the organization. If you are re-invited, create new keys; archived keys are not restored |
+ | **Service account key** | A [service account](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation#service-accounts) | Either a single workspace or anything the service account has access to, chosen when the key is created. A service account has access to the Default Workspace and to workspaces it has been added to | The service account is archived. A single-workspace key also stops working when the service account is removed from that workspace or that workspace is archived |
+ Personal keys and service account keys are identity-backed: each belongs to a user or service account your organization already manages, and every request acts as that identity. When that identity is removed from the organization, the key stops working. This means that keys don’t accidentally outlive the people or workloads that own them. Prefer them over workspace keys for new integrations.
+ Workspace API keys work but are legacy. Prefer identity-backed keys or [Workload Identity Federation](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation). To migrate, see [Replacing workspace API keys](https://platform.claude.com/docs/en/manage-claude/authentication#replacing-workspace-api-keys).
+ * **Create a key:** In the Claude Console, go to the [API keys](https://platform.claude.com/settings/keys) page (`platform.claude.com/settings/keys`) and click **Create key**. Name the key and select an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration). Set **Linked account** to yourself for a personal key, or to a service account for a key shared across multiple users. You can also scope the key to a specific workspace, which lets you skip setting a workspace ID manually in future requests.
+ * **Use the key:** Send it as `Authorization: Bearer <key>` on direct HTTP requests, or set the `ANTHROPIC_API_KEY` environment variable and the [client SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/overview) picks it up automatically.
+ anthropic-version: 2026-10-21
+ You can also send the key in the legacy `x-api-key: YOUR_API_KEY` header in place of `Authorization`.
+ Store API keys in a secrets manager, rotate them periodically, and disable or delete any key you suspect has leaked. On the [API keys](https://platform.claude.com/settings/keys) page in the Claude Console, **Disable** is reversible (the Admin API reports the key’s `status` as `"inactive"`, and **Re-enable** returns it to `"active"`), whereas **Delete** is permanent: the key is archived and still appears in [List API Keys](https://platform.claude.com/docs/en/api/organization/api_keys/list) with `status: "archived"`. Expired keys can only be deleted. You can also set an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration) when you create a key to limit how long a leaked credential stays usable. To limit where a leaked key works, turn on [IP allowlisting](https://platform.claude.com/docs/en/manage-claude/ip-allowlist).
+ -H "anthropic-version: 2026-10-21" \
+ "model": "claude-opus-5-5",
+ option.WithAPIKey("my-anthropic-api-key"), // defaults to os.LookupEnv("ANTHROPIC_API_KEY")
+ If your API key isn’t scoped to a workspace, you must specify the workspace ID in the `anthropic-workspace-id` header for each request. See the following example for how to set this header in a request or in the SDK.
+ The [Admin API](https://platform.claude.com/docs/en/manage-claude/admin-api) accepts a personal key or service account key only if the key isn’t scoped to a specific workspace.
+ You can find a workspace’s ID in the **ID** column on the [Workspaces](https://platform.claude.com/settings/workspaces) page (`platform.claude.com/settings/workspaces`) in the Claude Console, or by calling the [List Workspaces](https://platform.claude.com/docs/en/api/organization/workspaces/list) endpoint. List Workspaces includes the Default Workspace only when you pass `include_default=true`; its ID is also in the `anthropic-workspace-id` [response header](https://platform.claude.com/docs/en/manage-claude/workspaces#identify-the-workspace-behind-an-api-response) of any request that runs there.
+ # Required on every request for a key that isn't scoped to a workspace.
+ # Omit the anthropic-workspace-id header for a key scoped to one workspace.
+ -H "anthropic-version: 2026-10-21" \
+ "model": "claude-opus-5-5",
+ # Required on every command for a key that isn't scoped to a workspace.
+ # Omit --workspace-id for a key scoped to one workspace.
+ --model claude-opus-5-5 \
+ # Required on every request for a key that isn't scoped to a workspace.
+ # Omit extra_headers for a key scoped to one workspace.
+ model="claude-opus-5-5",
+ // Required on every request for a key that isn't scoped to a workspace.
+ // Omit the second argument for a key scoped to one workspace.
+ model: "claude-opus-5-5",
+ Model = Model.ClaudeOpus5_5,
+ Messages = [new UserMessageParam { Content = "Hello, Claude" }],
+ // Required on every request for a key that isn't scoped to a workspace.
+ // Call client.Messages.Create(parameters) directly for a key scoped to one workspace.
+ // Required on every request for a key that isn't scoped to a workspace.
+ // Omit the option for a key scoped to one workspace.
+ Model: anthropic.ModelClaudeOpus5_5,
+ // Required on every request for a key that isn't scoped to a workspace.
+ // Omit putAdditionalHeader for a key scoped to one workspace.
… diff truncated (69 added / 67 removed lines)
```

### anthropic.platform.data-retention

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- Change: changed
- Prior hash: 433cd20a2b6f30d93b4c944a869839e3568deb5e5597a4daf9e4ac4b1f0e17c0
- Current hash: c228abfb99db8f1afae1dd7d827d24282476f4708999f5a364106e9cb85fbdb4

```diff
- This page covers the Claude API (`api.anthropic.com`), Claude Platform on AWS, and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry), where Anthropic is the data processor. On Amazon Bedrock and Google Cloud's Agent Platform, the cloud provider is the data processor; refer to those platforms' data retention and compliance documentation for their equivalent controls.
- Anthropic offers two data handling arrangements for the Claude API: [zero data retention (ZDR)](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#zero-data-retention-zdr-scope) and [HIPAA readiness](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#hipaa-readiness). The [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) lists which API features each arrangement covers. For Anthropic's standard retention policies outside these arrangements, see the [commercial data retention policy](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) and the [consumer data retention policy](https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data).
- Different APIs and features have different storage needs. Where a feature does not require storage of customer prompts or responses, it may be eligible for ZDR. Where a feature necessarily requires storage, Anthropic designs for the smallest possible retention footprint under the following commitments:
- * Only what is technically necessary for the feature to work is retained. Conversation content (your prompts and Claude's outputs) is not retained by default; the exception is [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements), which require 30-day retention.
- * Retained data is purged on the shortest practical time to live (TTL), and Anthropic aims to give customers control over how long data is retained. What is held, and the retention duration where a specific TTL applies, is documented on each feature's page.
- Several retention models sit outside the ZDR and HIPAA arrangements described on this page. Data accessible through the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) follows its own retention model. The [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) retains data for 6 years. Chat, file, and project content from claude.ai follows your organization's retention policy set in [claude.ai > Organization settings > Data and privacy](https://claude.ai/admin-settings/data-privacy-controls). [Local session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions) (from sessions on users' machines, in apps such as Cowork and Claude Code) are stored for 6 years by default, or for your organization's custom conversation retention period when a finite one is set (the same claude.ai setting). [Remote session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions) (Cowork in the cloud) are retained for 6 years, unless a user deletes the session sooner. The Compliance API does not capture local sessions for which ZDR is in effect, or any local sessions from organizations with HIPAA readiness enabled.
- * **Claude Messages and Token Counting APIs:** ZDR applies to these endpoints for eligible features listed in the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility). Features that ride on `/v1/messages` but are marked "No" in the table (such as code execution) are not covered.
- * **Claude Code:** ZDR applies when Claude Code is used with API keys from a Commercial organization (an organization under Anthropic's Commercial Terms of Service, as distinct from a consumer Claude account) or through Claude Enterprise with ZDR enabled. If metrics logging is enabled in Claude Code, productivity data such as usage statistics is exempted from ZDR and may be retained. See the [Claude Code ZDR documentation](https://code.claude.com/docs/en/zero-data-retention) for full details.
- * **Claude Managed Agents:** Claude Managed Agents is a stateful resource; session transcripts persist until you delete them.
- * **Claude consumer products:** Claude Free, Pro, and Max plans, including when customers on those plans use Claude's web, desktop, or mobile apps or Claude Code.
- * **Claude Teams and Claude Enterprise product interfaces:** These interfaces are not ZDR-eligible. The exception is Claude Code used through Claude Enterprise with ZDR enabled; see [What ZDR covers](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#what-zdr-covers).
- * **Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, and Claude Mythos 5:** These models require 30-day data retention and are not available under ZDR unless expressly authorized by Anthropic. See [Model-specific data retention requirements](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements).
- * **Third-party integrations:** Data processed by third-party websites, tools, or other integrations is not covered, though some may have similar offerings. Review each service's data handling practices.
- * **Cross-Origin Resource Sharing (CORS):** CORS is not supported for organizations with ZDR arrangements. To make API calls from browser-based applications, route requests through a backend proxy server. See the [API security guidance](https://platform.claude.com/docs/en/api/overview) for proxy patterns and API-key handling.
- The Claude API supports HIPAA-ready integrations for organizations that handle protected health information (PHI). With a signed BAA and a HIPAA-enabled organization, you can use supported API features to process PHI while supporting your organization's HIPAA compliance. Eligible organizations can review and execute the BAA and enable HIPAA readiness directly from the Claude Console. HIPAA readiness applies a broader set of privacy and security safeguards than ZDR (encryption, access controls, and audit logging that protect PHI throughout its lifecycle) rather than requiring immediate deletion. If your organization handles PHI, HIPAA readiness is the arrangement to use; you do not also need ZDR. See the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) for which features each arrangement covers.
- * **Claude consumer products:** Claude Free, Pro, and Max plans.
- * **Partner-operated platforms:** Amazon Bedrock and Google Cloud's Agent Platform. Refer to those platforms' compliance documentation.
- * **Claude Platform on AWS and Microsoft Foundry:** HIPAA readiness is not available on these platforms.
- Protected health information (PHI) includes any individually identifiable health information. In the context of the Claude API, PHI typically appears in message content (prompts and Claude's responses), attached files (images, PDFs), and file names or metadata associated with message content. The following fields are not expected to contain PHI under the BAA: workspace names, user information (name, email, phone number), billing data, and support tickets.
- The error message lists the non-eligible features detected in the request; remove them and retry. The phrase "without Zero Data Retention" is the API's own wording and does not change the resolution. Client-side tools whose Details column in the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) says they are not blocked are accepted but remain outside HIPAA readiness.
- There are two ways to set up HIPAA-ready API access. Most organizations can enable it directly in the Claude Console with Anthropic's standard BAA; organizations that require a negotiated BAA should work with their account team.
- <Step title="Open your organization's privacy settings">
- In [Claude Console > Settings > Privacy](https://platform.claude.com/settings/privacy), organization admins with the HIPAA management permission see a **HIPAA compliance** card. If your organization is eligible but you don't see the option to enable, ask an organization admin to complete these steps.
- If your organization requires a negotiated or custom BAA, or if self-serve enablement isn't available for your organization, contact the [Anthropic sales team](https://claude.com/contact-sales). Anthropic will execute the BAA and enable HIPAA readiness for your organization.
- Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, and Claude Mythos 5 are designated Covered Models (see the [Covered Models support article](https://support.claude.com/en/articles/15425695)) and require 30-day data retention; ZDR is therefore not available for any of them unless expressly authorized by Anthropic. On the Claude API, requests to Claude Fable 5 from an organization whose data retention configuration does not meet this requirement return a `400 invalid_request_error`:
- The 30-day data retention requirement applies wherever Covered Models are offered. On the Claude API (including Claude Platform on AWS), Anthropic handles retained data. On Amazon Bedrock and Google Cloud's Agent Platform, retained data stays within your cloud provider's environment; review each platform's documentation for enablement steps.
- Organizations with a ZDR arrangement can make these models available in a specific workspace by enabling 30-day retention for that workspace only. Other workspaces in the organization keep zero data retention.
- <Step title="Open the workspace's privacy controls">
- In [Claude Console > Settings > Workspaces](https://platform.claude.com/settings/workspaces), select the workspace and open its **Privacy controls** tab.
- Enable the 30-day data retention setting for the workspace.
- The following table lists which Claude API features are eligible for ZDR and HIPAA readiness arrangements.
- * **Yes:** The feature is fully eligible under the arrangement. For ZDR, "Yes" also assumes you are using a model that does not require 30-day data retention; [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements) are not available under ZDR regardless of feature eligibility.
- * **Yes (qualified):** Your prompts and Claude's outputs are not stored, but a bounded technical artifact (named in the Details column) is retained briefly for the feature to function. See [How Anthropic approaches data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#how-anthropic-approaches-data-retention) for the commitments that govern these features.
- * **No:** The feature is not eligible. Under HIPAA readiness, the API blocks requests that include a "No" feature and returns a `400` error, unless the feature's Details column says otherwise. Under ZDR, the API does **not** block these features; using one is a choice to step outside your ZDR arrangement for that specific data, and the feature's own documented retention policy applies. Features marked "No" for ZDR are typically stateful (they store jobs, files, or container state), which is why they cannot be zero-retention.
- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
- | [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) | `/v1/messages` | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
- | [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) | `/v1/messages` | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | |
- | [Advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool) | `/v1/messages` (with `advisor` tool) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Advisor model output is returned in the API response; nothing is stored server-side after the response. |
- | [Agent skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) | `/v1/messages` (with `skills`) / `/v1/skills` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Skill data retained per standard policy. See [Agent skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#data-retention). |
- | [Bash tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool) | `/v1/messages` (with `bash` tool) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | Client-side tool executed in your environment. |
+ This page covers the Claude API (`api.anthropic.com`), Claude Platform on AWS, [Claude Models on Google Cloud (Anthropic managed)](https://platform.claude.com/docs/en/build-with-claude/claude-models-on-google-cloud/anthropic-managed), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry), where Anthropic is the data processor. On Claude Models on Google Cloud (Google managed) and Amazon Bedrock, the cloud provider is the data processor; refer to those platforms’ data retention and compliance documentation for their equivalent controls.
+ Anthropic offers two data handling arrangements for the Claude API: [zero data retention (ZDR)](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#zero-data-retention-zdr-scope) and [HIPAA readiness](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#hipaa-readiness). The [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) lists which API features each arrangement covers. For Anthropic’s standard retention policies outside these arrangements, see the [commercial data retention policy](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) and the [consumer data retention policy](https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data).
+ Different APIs and features have different storage needs. Where a feature does not require storage of customer prompts or responses, it might be eligible for ZDR. Where a feature necessarily requires storage, Anthropic designs for the smallest possible retention footprint under the following commitments:
+ * Only what is technically necessary for the feature to work is retained. Conversation content (your prompts and Claude’s outputs) is not retained by default; the exception is [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements), which require 30-day retention.
+ * Retained data is purged on the shortest practical time to live (TTL), and Anthropic aims to give customers control over how long data is retained. What is held, and the retention duration where a specific TTL applies, is documented on each feature’s page.
+ Several retention models sit outside the ZDR and HIPAA arrangements described on this page. Data accessible through the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) follows its own retention model. The [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) retains data for 6 years. Chat, file, and project content from claude.ai follows your organization’s retention policy set in [claude.ai > Organization settings > Data and privacy](https://claude.ai/admin-settings/data-privacy-controls), unless a user deletes it sooner. [Local session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions) come from sessions on users’ machines, in apps such as Cowork and Claude Code. These transcripts are stored for 6 years by default, or for your organization’s custom conversation retention period when a finite one is set (the same claude.ai setting). [Remote session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions) (Cowork in the cloud and Claude Tag) have no default retention period. See [Retention and deletion](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retention-and-deletion). The Compliance API does not capture local sessions for which ZDR is in effect. For organizations with HIPAA readiness enabled, it captures Cowork and Claude Code local sessions only and stores their transcripts for 30 days.
+ Organizations with a ZDR arrangement cannot call the Claude API directly from a browser: the API rejects their cross-origin (CORS) requests. To call the API from a web application, send the requests from your own back end. See [Browser-based applications](https://platform.claude.com/docs/en/manage-claude/authentication#browser-based-applications).
+ * **Claude Messages and Token Counting APIs:** ZDR applies to these endpoints for eligible features listed in the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility). Features that use `/v1/messages` but are marked “No” in the table (such as code execution) are not covered.
+ * **Claude Code with API keys:** ZDR applies when Claude Code is used with API keys from a Commercial organization (an organization under Anthropic’s Commercial Terms of Service, as distinct from a consumer Claude account). If metrics logging is enabled in Claude Code, productivity data such as usage statistics is exempted from ZDR and may be retained. Claude Code on Claude Enterprise is not covered by this arrangement and has a separate ZDR offering; see [What ZDR does not cover](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#what-zdr-does-not-cover).
+ * **Claude Models on Google Cloud (Anthropic managed):** [Claude Models on Google Cloud (Anthropic managed)](https://platform.claude.com/docs/en/build-with-claude/claude-models-on-google-cloud/anthropic-managed) follows the same data retention policy as the first-party Claude API. ZDR is available on request; contact your Anthropic account representative to enable it.
+ * **Claude Managed Agents:** Claude Managed Agents is a stateful resource; session transcripts persist until you delete them. The exception is self-hosted Claude Managed Agents, where you store the transcripts yourself, as [How long data is kept](https://platform.claude.com/docs/en/managed-agents/self-hosted-data-and-access#how-long-data-is-kept) describes.
+ * **Claude consumer products:** Claude Free, Pro, Max, and Ultra plans, including when customers on those plans use Claude’s web, desktop, or mobile apps or Claude Code.
+ * **Claude Teams and Claude Enterprise product interfaces:** These interfaces are not ZDR-eligible. The one exception is Claude Code on Claude Enterprise, which has its own ZDR offering, separate from the ZDR arrangement described on this page. That offering is available only to qualified accounts on Claude Enterprise and requires separate enablement by Anthropic. See the [Claude Code ZDR documentation](https://code.claude.com/docs/en/zero-data-retention), which applies to Claude Enterprise organizations only.
+ * **Claude Fable 5.2, Claude Mythos 5.2, Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, and Claude Mythos 5:** These models require 30-day data retention and are not available under ZDR unless expressly authorized by Anthropic. See [Model-specific data retention requirements](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements).
+ * **Third-party integrations:** Data processed by third-party websites, tools, or other integrations is not covered, though some may have similar offerings. Review each service’s data handling practices.
+ The Claude API supports HIPAA-ready integrations for organizations that handle protected health information (PHI). With a signed BAA and a HIPAA-enabled organization, you can use supported API features to process PHI while supporting your organization’s HIPAA compliance. Eligible organizations can review and execute the BAA and enable HIPAA readiness directly from the Claude Console. HIPAA readiness applies a broader set of privacy and security safeguards than ZDR (encryption, access controls, and audit logging that protect PHI throughout its lifecycle) rather than requiring immediate deletion. If your organization handles PHI, HIPAA readiness is the arrangement to use; you do not also need ZDR. See the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) for which features each arrangement covers.
+ * **Claude in Microsoft Foundry:** [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry) (Hosted on Anthropic or Hosted on Azure) is an eligible service for customers with a BAA with Anthropic plus the HIPAA configuration enabled on the Azure subscription. Request the HIPAA configuration through your Anthropic account team. For requirements and covered features, see the [HIPAA Implementation Guide](https://trust.anthropic.com/resources).
+ * **Claude consumer products:** Claude Free, Pro, Max, and Ultra plans.
+ * **Partner-operated platforms:** Claude Models on Google Cloud (Google managed) and Amazon Bedrock. Refer to those platforms’ compliance documentation.
+ * **Claude Platform on AWS:** HIPAA readiness is not available on Claude Platform on AWS.
+ Protected health information (PHI) includes any individually identifiable health information. In the context of the Claude API, PHI typically appears in message content (prompts and Claude’s responses), attached files (images, PDFs), and file names or metadata associated with message content. The following fields are not expected to contain PHI under the BAA: workspace names, user information (name, email, phone number), billing data, and support tickets.
+ The error message lists the non-eligible features detected in the request; remove them and retry. The phrase “without Zero Data Retention” is the API’s own wording and does not change the resolution. Client-side tools whose Details column in the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) says they are not blocked are accepted but remain outside HIPAA readiness.
+ There are two ways to set up HIPAA-ready API access. Most organizations can enable it directly in the Claude Console with Anthropic’s standard BAA; organizations that require a negotiated BAA should work with their account team.
+ <Step title="Open your organization’s HIPAA settings">
+ In the Claude Console, go to the [Data privacy](https://platform.claude.com/settings/data-privacy) page (`platform.claude.com/settings/data-privacy`). Organization admins with the HIPAA management permission see a **HIPAA compliance** card there. If the address opens a different page, the card is on that page. If that page has a dropdown menu at the top and you don’t see the card, select **Organization** from it. If your organization is eligible but you can’t open the page or find the option, ask an organization admin to complete these steps.
+ If your organization requires a negotiated or custom BAA, or if self-serve enablement isn’t available for your organization, contact the [Anthropic sales team](https://claude.com/contact-sales). Anthropic executes the BAA and enables HIPAA readiness for your organization.
+ Claude Fable 5.2, Claude Mythos 5.2, Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, and Claude Mythos 5 are designated Covered Models. See the [Covered Models support article](https://support.claude.com/en/articles/15425695). They require 30-day data retention. ZDR is therefore not available for any of them unless expressly authorized by Anthropic. On the Claude API, requests to Claude Fable 5 from an organization whose data retention configuration does not meet this requirement return a `400 invalid_request_error`:
+ The 30-day data retention requirement applies wherever Covered Models are offered. On the Claude API (including Claude Platform on AWS), Anthropic handles retained data. On Amazon Bedrock and Google Cloud’s Agent Platform, retained data stays within your cloud provider’s environment; review each platform’s documentation for enablement steps.
+ Organizations with a ZDR arrangement can make these models available in a specific workspace by enabling 30-day retention for that workspace only. Other workspaces in the organization keep zero data retention. The Default Workspace always follows the organization’s setting, so use another workspace.
+ <Step title="Open the workspace’s data retention settings">
+ In the Claude Console, go to the [Data retention](https://platform.claude.com/settings/privacy) page (`platform.claude.com/settings/privacy`) and select the workspace from the dropdown menu at the top of the page.
+ Select **Standard data retention** (30-day retention) and click **Save**. A confirmation dialog box then asks you to review and accept the terms that apply to data retention for the workspace. Data retention turns on for the workspace only after you accept them.
+ The following tables list which Claude API features are eligible for ZDR and HIPAA readiness arrangements. They split the features as the [Features overview](https://platform.claude.com/docs/en/build-with-claude/overview) does.
+ * **Yes:** The feature is fully eligible under the arrangement. For ZDR, “Yes” also assumes you are using a model that does not require 30-day data retention; [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements) are not available under ZDR regardless of feature eligibility.
+ * **Yes (qualified):** Your prompts and Claude’s outputs are not stored, but a bounded technical artifact (named in the Details column) is retained briefly for the feature to function. See [How Anthropic approaches data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#how-anthropic-approaches-data-retention) for the commitments that govern these features.
+ * **No:** The feature is not eligible. Under HIPAA readiness, the API blocks requests that include a “No” feature and returns a `400` error, unless the feature’s Details column says otherwise. Under ZDR, the API does **not** block these features; using one is a choice to step outside your ZDR arrangement for that specific data, and the feature’s own documented retention policy applies. Features marked “No” for ZDR are typically stateful (they store jobs, files, or container state), which is why they cannot be zero-retention.
+ ### Platform features
+ This section lists features that relate to both the [Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) and [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview). Some are available in only one of them. This table gives each feature’s eligibility in the Messages API. In Claude Managed Agents, no feature is eligible for ZDR or HIPAA readiness, except for self-hosted Managed Agents under ZDR. See the Claude Managed Agents row under [Managed Agents features](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#managed-agents-features).
+ | :---- | :---- | :---- | :---- | :---- |
+ | [Advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool) | `/v1/messages` with `advisor` tool | Yes | No | Advisor model output is returned in the API response; nothing is stored server-side after the response. |
… diff truncated (93 added / 80 removed lines)
```

### anthropic.platform.release-notes

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/release-notes/overview
- Change: changed
- Prior hash: 6ad4dafb0e1ebb480b0fc37f66899ce0169662bc9265b5c3f82256c6d50535ba
- Current hash: 55c40331d7017bb8920646312e50b6f6570228cf0797efb3882994ca24b40f3e

```diff
- * We've launched **Claude Fable 5.1** (`claude-fable-5-1`), the successor to Claude Fable 5 for long-running agentic coding, knowledge work, and research, alongside **Claude Mythos 5.1** (`claude-mythos-5-1`) for Project Glasswing participants. Both models support a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) by default, 128k max output tokens, and always-on [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking), at $10 / $50 USD per MTok, the same as Claude Fable 5, with cache reads cut to $0.25 per MTok. Claude Fable 5.1 is available on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws), [Claude on Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What's new in Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1) for capabilities, API changes, and migration guidance.
- * On Claude Fable 5.1 and Claude Mythos 5.1, `tool_choice` types `any` and `tool` aren't supported and return a 400 error. `auto` and `none` are unchanged. To guarantee schema-conformant tool inputs, use [strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use) or [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
- * Thinking blocks produced by Claude Fable 5.1 and Claude Mythos 5.1 are preserved only for the model that produced them or a newer one: earlier models can't read them, and the API drops one replayed to an earlier model. Claude Fable 5.1 accepts thinking blocks from Claude Opus 5, Claude Fable 5, Claude Mythos 5, and earlier Claude models. On Claude Fable 5.1, the API also [checks that nothing before a block has changed](https://platform.claude.com/docs/en/build-with-claude/thinking#preserved-in-conversation): for new accounts created on or after August 31, 2026, replaying one after the `system` prompt, `tools`, or an earlier message changed returns a 400 error. With the `thinking-binding-controls-2026-08-01` beta header, dropped blocks are reported in an `input_transformations` response field, and `thinking.block_binding.prefix_mismatch_behavior` chooses between rejecting and dropping blocks whose history changed. See [Preserved thinking](https://platform.claude.com/docs/en/build-with-claude/thinking#preserved-thinking).
- * [Turn-scoped system messages](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages#turn-scoped-system-messages) are in beta (`mid-conversation-system-clear-at-2026-08-21` header). Set `clear_at: "next_user_message"` on a mid-conversation `role: "system"` message and it renders for the current turn only, then stays in the history at no token cost. Per-turn reminders don't accumulate and don't invalidate the prompt cache or later thinking blocks.
- * Text generated by Claude Fable 5.1 and Claude Mythos 5.1 carries Anthropic's text watermark, and supported image, video, and audio files that Claude produces through the [code execution tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool) carry C2PA Content Credentials when you retrieve them through the [Files API](https://platform.claude.com/docs/en/build-with-claude/files) on the Claude API. Marking requires no changes to your requests or response handling.
- * Like Claude Fable 5, both models require 30-day data retention and aren't available under zero data retention unless expressly authorized by Anthropic. See [Model-specific data retention requirements](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements).
- * The guides for the Claude Enterprise endpoints of the [Admin API](https://platform.claude.com/docs/en/api/admin) ([user management](https://platform.claude.com/docs/en/manage-claude/user-management) and [spend limits](https://platform.claude.com/docs/en/manage-claude/spend-limits-api)), the [Claude Enterprise Analytics API](https://platform.claude.com/docs/en/manage-claude/analytics-api), and the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) now show the `anthropic-version` header; send it on every request to these endpoints, as in the rest of the Claude API. See [API versions](https://platform.claude.com/docs/en/api/versioning).
- - You can now create **personal keys** and **service account keys** in the Claude Console. They act as you or as a [service account](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation#service-accounts), with the same permissions, and stop working when the linked account is removed from an organization. This lets organization admins more easily track usage for each account, and ensure key usage is legitimate. These API keys can be scoped to a specific workspace or [work on admin endpoints and across any workspace](https://platform.claude.com/docs/en/manage-claude/authentication#select-a-workspace) the account has access to. Workspace API keys remain supported as a legacy option. See [API keys](https://platform.claude.com/docs/en/manage-claude/authentication#api-keys) for more information.
- * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) local session endpoints now also return transcripts of Claude Science sessions (`product_surface` value `claude_science`) and Claude for Microsoft 365 sessions in Excel, PowerPoint, Word, and Outlook (`product_surface` values beginning with `office_agents`), in beta for Claude Enterprise organizations, with your existing Compliance Access Key and the `read:compliance_user_data` scope. See [Sessions on users' machines](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions).
- - The [Admin API](https://platform.claude.com/docs/en/manage-claude/admin-api) is now available in the `ant` CLI and the Python, TypeScript, C#, Go, Java, PHP, and Ruby SDKs under `client.beta.organization`. They cover organization info, members, invites, workspaces and workspace members, API keys, rate limits, service accounts, workload identity federation issuers and rules, and customer-managed encryption keys. Usage and cost reports and the Claude Enterprise user-management and analytics endpoints remain curl-only. The CLI and SDKs read an Admin API key from `ANTHROPIC_API_KEY` or an `org:admin` OAuth token from `ANTHROPIC_AUTH_TOKEN`.
- * We've released **v1.0 of the [Python SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/python)**. The SDK's HTTP layer moves from `httpx` to [httpx2](https://httpx2.pydantic.dev), a maintained, API-compatible fork: build custom `http_client`, `Timeout`, and transport objects from `httpx2` (the `DefaultHttpxClient` helpers are unchanged), and call `httpx2.alias_httpx()` at startup if you rely on tracing or mocking libraries that patch `httpx`. v1.0 requires Python 3.10 or later and removes long-deprecated surface, including the legacy Text Completions API, the `temperature`, `top_p`, and `top_k` parameters on Messages methods, and the tool runner's client-side `compaction_control`. On the async client, `.with_raw_response` results now need `await response.parse()`, and `AnthropicBedrock` now raises an error when no AWS region is configured instead of defaulting to `us-east-1`. See the [v1 migration guide](https://github.com/anthropics/anthropic-sdk-python/blob/main/MIGRATION.md) for every change with before-and-after snippets.
- * The [computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) and [browser use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool) toolsets (`computer_toolset_20260801` and `browser_toolset_20260801`) are now available on [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai) for Claude Fable 5, Claude Mythos 5, Claude Opus 5, Claude Sonnet 5, and Claude Opus 4.8. Requests use the same `tools` entries as on the Claude API.
- * We've launched the [browser use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool) (`browser_toolset_20260801`), a client toolset for driving a browser that your application hosts. It works inside a browser viewport rather than a whole desktop, reading the page itself (its accessibility tree, elements, forms, and tabs) and adding element references, form input, tab management, download reporting, and opt-in file upload on top of screenshot-and-click control.
- * The [Admin API](https://platform.claude.com/docs/en/api/admin) user-management endpoints for **Claude Enterprise** (claude.ai) organizations (members, invites, groups, and custom roles) are out of beta. The `anthropic-beta: ce-user-management-2026-07-13` header is no longer required on group and custom-role requests; requests that still send it are accepted unchanged. See [User management](https://platform.claude.com/docs/en/manage-claude/user-management).
- * You can now restrict which sites a Claude Managed Agents agent's `web_search` and `web_fetch` tools can reach. Set `allowed_domains` or `blocked_domains` on the tool's entry in the `agent_toolset_20260401` `configs` array; `web_fetch` also accepts `max_content_tokens` and `web_search` accepts `user_location`. Each `configs` entry is identified by its `name` and typed by an optional `type`, and requests that pass only `name`, `enabled`, and `permission_policy` continue to work; in the typed SDKs, `configs` entries become per-tool types. See [Restrict web search and web fetch domains](https://platform.claude.com/docs/en/managed-agents/tools#restrict-web-search-and-web-fetch-domains).
- * Claude Managed Agents sessions that run in a [self-hosted sandbox](https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes) can now attach [memory stores](https://platform.claude.com/docs/en/managed-agents/memory). The Python, TypeScript, and Go SDK workers download each attached store into the sandbox at its `mount_path` and sync the agent's changes back to the store. See [Use memory stores](https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes#use-memory-stores).
- * The session viewer in the Claude Console has been redesigned with a timeline minimap, a transcript grouped by model request, and an Inspector panel for session details and cost, raw events, per-tool statistics, mounted resources, and per-thread activity. See [Console observability](https://platform.claude.com/docs/en/managed-agents/events-and-streaming#console-observability).
- * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) now returns transcripts of Cowork and Claude Code sessions that run on your users' machines, in beta for Claude Enterprise organizations. `GET /v1/compliance/apps/sessions/local` lists sessions across your organization, `GET /v1/compliance/apps/sessions/local/{session_id}` retrieves one session's metadata, and `GET /v1/compliance/apps/sessions/local/{session_id}/messages` returns its transcript, all with your existing Compliance Access Key and the `read:compliance_user_data` scope. See [Sessions on users' machines](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions).
- * We've added the `anthropic-workspace-id` response header to the Claude API. It carries the `wrkspc_`-prefixed ID of the workspace that the request's API key or access token resolved to, including your organization's Default Workspace. See [Identify the workspace behind an API response](https://platform.claude.com/docs/en/manage-claude/workspaces#identify-the-workspace-behind-an-api-response).
- * The introductory pricing for **Claude Sonnet 5** ($2 / $10 per MTok) is now the standard price: the previously scheduled increase to $3 / $15 per MTok on September 1, 2026 will not occur. See [Pricing](https://platform.claude.com/docs/en/about-claude/pricing).
- * You can now set a budget on a Claude Managed Agents session: a hard cap on the session's spend, priced at public list rates. A session that reaches its budget pauses with the `budget_reached` stop reason instead of starting new model requests; changing or removing the budget resumes it. Deployments accept the same budget and apply it to each session they start. See [Session budgets](https://platform.claude.com/docs/en/managed-agents/budgets).
- * You can now give a Claude Managed Agents session an advisor: a model at least as capable as the agent's own that the session's primary thread can consult mid-turn for strategic guidance. Configure it as a `{"type": "advisor"}` entry in the agent's multiagent roster, naming the `model` to consult. See [Give the session an advisor](https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration#give-the-session-an-advisor).
- * You can now control where model inference runs for a Claude Managed Agents agent. Set `inference_geo` inside the `model` object when you [create the agent](https://platform.claude.com/docs/en/managed-agents/agent-setup#pin-the-inference-geo), or [override it for a single session](https://platform.claude.com/docs/en/managed-agents/sessions#pin-the-inference-geo-for-a-session). See [Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency) for the available geos and pricing.
- * **Inference hooks** are now in beta for Claude Enterprise organizations. Point Claude at your organization's AI security server, and each governed prompt across claude.ai, Cowork, and Claude Code is held for the server's allow or deny verdict before inference proceeds. Requests are signed, failure handling is configurable, and every denial is recorded in the compliance [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed). See [Inference hooks](https://platform.claude.com/docs/en/manage-claude/inference-hooks).
- * We've retired the Claude Opus 4.1 model (`claude-opus-4-1-20250805`). All requests to this model on the Claude API will now return an error. We recommend upgrading to [Claude Opus 5](https://platform.claude.com/docs/en/models/overview#latest-models-comparison). Researchers can request ongoing access through the [External Researcher Access Program](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program).
- * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) now returns transcripts of Cowork sessions started on claude.ai web or mobile, in beta for Claude Enterprise organizations. `GET /v1/compliance/apps/sessions/remote` lists sessions and `GET /v1/compliance/apps/sessions/remote/{session_id}/messages` returns one session's transcript, using your existing Compliance Access Key with the `read:compliance_user_data` scope. See [Sessions in the cloud](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions).
- * [Dreams](https://platform.claude.com/docs/en/managed-agents/dreams) (research preview) now supports Claude Opus 5. See [Supported models](https://platform.claude.com/docs/en/managed-agents/dreams#limits).
- * We've launched **Claude Opus 5** (`claude-opus-5`), a step-change improvement over Claude Opus 4.8. Claude Opus 5 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) (both the default and the maximum), 128k max output tokens, and [thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) on by default, at $5 / $25 USD per MTok, the same pricing as Claude Opus 4.8. It's available on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws), [Claude on Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/whats-new-opus-5) for new features, behavior changes, and migration guidance, and the [models overview](https://platform.claude.com/docs/en/models/overview) for complete specs.
- * On Claude Opus 5, disabling thinking is allowed only at effort `high` or below: `thinking: {"type": "disabled"}` with effort `xhigh` or `max` returns a 400 error, a breaking change from Claude Opus 4.8. See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/whats-new-opus-5#behavior-changes).
- * The `fallbacks` parameter now supports a `"default"` mode, which applies Anthropic's recommended fallback models by refusal category. Server-side fallback is in beta, and the `"default"` mode requires the `server-side-fallback-2026-07-01` beta header. See [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback).
- * We've removed [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) for Claude Opus 4.7. Requests to `claude-opus-4-7` with `speed: "fast"` now return an error; unlike Claude Opus 4.6, they do not fall back to standard speed. Claude Opus 4.7 itself remains available at standard speed. To continue using fast mode, migrate to [Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/migration-guide#migrating-from-claude-opus-47) or Claude Opus 4.8. Read more in [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode#supported-models).
- * You can now set an `effort` level on a Claude Managed Agents agent's model configuration. Pass `effort` inside the `model` object when you [create the agent](https://platform.claude.com/docs/en/managed-agents/agent-setup#create-an-agent). See [Effort levels](https://platform.claude.com/docs/en/build-with-claude/effort#effort-levels) for what each level does.
- * Webhooks for Claude Managed Agents now cover the environment and memory store lifecycle: four `environment.*` event types and three `memory_store.*` event types. You can react to environment and memory store lifecycle changes without polling. See the Environment events and Memory store events tabs in [Subscribe to webhooks](https://platform.claude.com/docs/en/managed-agents/webhooks#supported-event-types).
- * When creating a Claude Managed Agents session, you can now [seed it with initial events](https://platform.claude.com/docs/en/managed-agents/sessions#seed-the-session-with-initial-events). Pass `initial_events` on `POST /v1/sessions` with up to 50 `user.message` and `user.define_outcome` events. A non-empty list starts the agent loop in the same call, so you don't need a separate send-events request to start work.
- * Claude Managed Agents session thread event streams now support [event deltas](https://platform.claude.com/docs/en/managed-agents/events-and-streaming#event-deltas). `GET /v1/sessions/{session_id}/threads/{thread_id}/stream` accepts the same `event_deltas[]` query parameter as the session-level stream, so you can preview a subagent's text as the model generates it. A connection previews only the thread it's reading. See [Preview session thread events](https://platform.claude.com/docs/en/managed-agents/events-and-streaming#preview-session-thread-events).
- * The legacy **Workbench** ([platform.claude.com/workbench](https://platform.claude.com/workbench)) in the Claude Console is being sunset with access ending on August 17, 2026. Saved prompts, variables, and evals are not supported in the updated [Workbench](https://platform.claude.com/playground). You can export any data you want to keep from the banner and under your **Organizational Settings**. For more, see [How do I use the Workbench?](https://support.claude.com/en/articles/8606378-how-do-i-use-the-workbench) in the Claude Help Center.
- * [Mid-conversation system messages](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages) are available on Claude Fable 5, Claude Mythos 5, and Claude Opus 4.8, on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), and [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai). No beta header is required. This corrects earlier availability notes.
- * You can now manage the people in your **Claude Enterprise** (claude.ai) organization with the [Admin API](https://platform.claude.com/docs/en/api/admin), in beta for all Claude Enterprise organizations: list members and look them up by email address, change a member's role, remove members, send and withdraw invites, manage groups and their membership, and read custom roles. Group and custom-role requests require the `anthropic-beta: ce-user-management-2026-07-13` beta header; member and invite requests take no beta header. An Admin API key with the `read:org_audit` scope can also call every user-management `GET` endpoint. See [User management](https://platform.claude.com/docs/en/manage-claude/user-management).
- * [Dreams](https://platform.claude.com/docs/en/managed-agents/dreams) (research preview) now supports Claude Fable 5 and Claude Sonnet 5. See [Supported models](https://platform.claude.com/docs/en/managed-agents/dreams#limits).
- * We've expanded the [Access Transparency](https://platform.claude.com/docs/en/manage-claude/access-transparency) documentation of `cmek_preserve` events with a filter example, an example event payload, and two preservation reason codes (`policy_violation_investigation`, `csae_report`). The documentation now also clarifies that a preservation event is written whether the preservation was initiated by a human reviewer or an automated safety pipeline. See [CMEK content preservation](https://platform.claude.com/docs/en/manage-claude/access-transparency#cmek-content-preservation).
+ ### November 17, 2026
+ * We’ve launched [Linked billing](https://platform.claude.com/docs/en/manage-claude/oauth-apps/organization-billing-connections) in beta with the `user-profiles-billing-2026-10-01` beta header. Your customers can now pay for the Claude usage in your app through their own Claude organization. Once a customer links their organization, set `billing_policy` on each `/v1/messages` or `/v1/chat/completions` request to choose who pays. In the Claude Console, customers can set a spend cap for your app or unlink your app. Linked billing works for customers whose organization pays Anthropic directly for API usage.
+ ### November 16, 2026
+ * Text generated by Claude Opus 4.6, Claude Opus 4.5, Claude Sonnet 4.5, and Claude Haiku 4.5 carries Anthropic’s text watermark on supported platforms. [How Claude marks AI-generated content](https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content) lists those platforms. If a request to one of these models sets `temperature`, `top_p`, or `top_k` to a non-default value, the text might not carry the watermark. See [Text watermark](https://platform.claude.com/docs/en/build-with-claude/text-watermark).
+ ### November 12, 2026
+ * We’ve launched [self-hosted Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/self-hosted). You run the whole Managed Agents service, not only [self-hosted sandboxes](https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes), on your own infrastructure, and you store agents, sessions, and session history there. The server sends model requests to the provider that you choose, which is Anthropic by default. To request access, contact your Anthropic account team.
+ ### November 9, 2026
+ * We’ve launched **Claude Fable 5.2** (`claude-fable-5-2`), built for demanding reasoning and long-horizon agentic work. **Claude Mythos 5.2** (`claude-mythos-5-2`) offers the same capabilities only to organizations verified through Anthropic’s verification programs, such as the [Cyber Verification Program](https://support.claude.com/en/articles/14604842). Both models have a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows), 128k max output tokens, and always-on [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking). They cost $8 USD per MTok of input and $40 USD per MTok of output (Claude Fable 5.1 and Claude Mythos 5.1 cost $10 USD per MTok of input and $50 USD per MTok of output). Claude Fable 5.2 is available on the Claude API, [Amazon Bedrock (`bedrock-runtime`)](https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock-legacy), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws), [Claude Models on Google Cloud (Anthropic managed)](https://platform.claude.com/docs/en/build-with-claude/claude-models-on-google-cloud/anthropic-managed), [Claude Models on Google Cloud (Google managed)](https://platform.claude.com/docs/en/build-with-claude/claude-models-on-google-cloud/google-managed), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What’s new in Claude Fable 5.2](https://platform.claude.com/docs/en/models/fable-5-2/whats-new-fable-5-2) for API changes and migration guidance. For model-specific prompting patterns, see [Prompting Claude Fable 5.2](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2).
+ * Claude Fable 5.2 and Claude Mythos 5.2 enforce the [prefix check](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking#prefix-check) for every account, whatever its age. Claude Fable 5.1 returns the error by default on accounts created on or after August 31, 2026 (see [When `prefix_mismatch_behavior` is unset](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking#enforcement)). If your code edits the `system` prompt, `tools`, or an earlier message and then sends back a Claude Fable 5.2 or Claude Mythos 5.2 thinking block from a later turn, the request returns a 400 error. Before you switch, [check whether your code edits the prefix](https://platform.claude.com/docs/en/models/fable-5-2/migration-guide#fable-5-2-preserved-thinking).
+ * Claude Fable 5.2 and Claude Mythos 5.2 read other models’ thinking blocks on the Claude API and Claude Models on Google Cloud (Google managed). So on those platforms, a conversation that moves onto either model keeps its reasoning. The other models include Claude Opus 5.5, Claude Sonnet 5.5, and Claude Haiku 5.5.
+ * No other model reads thinking blocks from Claude Fable 5.2 or Claude Mythos 5.2. When a conversation moves from either one to a model outside this pair, the API drops those blocks. That includes a move to Claude Opus 5.5 or Claude Fable 5.1. The request still succeeds. See [Switching models mid-conversation](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking#switching-models).
+ * Claude Fable 5.2 and Claude Mythos 5.2 support computer use through the `computer_toolset_20260801` toolset. A request that declares the earlier `computer_20251124` tool returns a 400 error on every platform except Amazon Bedrock, where the earlier tool still works. See [Migrate from `computer_20251124`](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool#migrate-from-computer-20251124).
+ * With the [advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool), which is in beta, a Claude Fable 5.2 or Claude Mythos 5.2 executor accepts only Claude Fable 5.2 or Claude Mythos 5.2 as its advisor. Any other advisor returns a 400 error, so set the advisor’s `model` to one of these two models when you move an executor to them. Every executor model accepts Claude Fable 5.2 as its advisor. See [Model compatibility](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool#model-compatibility).
+ * Both models require 30-day data retention, like Claude Fable 5.1 and Claude Mythos 5.1. They aren’t available under zero data retention unless expressly authorized by Anthropic. See [Model-specific data retention requirements](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements).
+ * Thinking blocks that Claude Fable 5.2 and Claude Mythos 5.2 produce work only in the account that produced them, or in an account linked to it. See [Preserved thinking](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking#account-bound-thinking).
+ * [Dreams](https://platform.claude.com/docs/en/managed-agents/dreams) (research preview) now supports Claude Fable 5.2. See [Supported models](https://platform.claude.com/docs/en/managed-agents/dreams#feature-availability).
+ * We’ve launched [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) for Claude Fable 5.2 in Messages API requests on the Claude API. Fast mode delivers up to 2.5x higher output tokens per second, at $16 USD per MTok of input and $80 USD per MTok of output. Set `speed: "fast"` on your request, with no beta header.
+ ### November 5, 2026
+ * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) now includes Security posture data, in beta for Claude Enterprise organizations. The [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) records changes to attestations on the **Security posture** page in claude.ai **Organization settings**. The `GET /v1/compliance/organizations/{organization_id}/security_posture` endpoint returns an organization’s current Security posture results. See [Security posture in the Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-security-posture/overview).
+ * You can now set up an IP allowlist for your organization in the Claude Console, in beta. Requests to covered services from addresses not on your list are refused, which limits where a leaked API key can be used. Add IPv4 and IPv6 addresses or CIDR ranges, up to 1,000 per organization. See [IP allowlisting](https://platform.claude.com/docs/en/manage-claude/ip-allowlist) for what’s covered and how to set it up.
+ * You can now sign a member of your Claude Enterprise (claude.ai) organization out of Claude everywhere with the Admin API. This capability is in beta. See the [Admin API reference](https://platform.claude.com/docs/en/api/beta/organization). The member stays in the organization and can sign in again. See [Sign a member out everywhere](https://platform.claude.com/docs/en/manage-claude/user-management#sign-a-member-out-everywhere) for the beta header and what the request doesn’t end.
+ ### November 3, 2026
+ * Text generated by Claude Mythos 5, Claude Opus 4.7, and Claude Sonnet 4.6 carries Anthropic’s text watermark on the platforms listed in [How Claude marks AI-generated content](https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content). On Claude Sonnet 4.6, text generated for a request that sets `temperature`, `top_p`, or `top_k` to a non-default value might not carry it. See [Text watermark](https://platform.claude.com/docs/en/build-with-claude/text-watermark).
+ ### November 2, 2026
+ * Long conversations and agent loops on the Messages API can now send smaller requests and get a lower time to first token with [message threads](https://platform.claude.com/docs/en/build-with-claude/message-threads), in beta with the `message-threads-2026-08-12` beta header. The API keeps the conversation on the server, so each later request sends only the new messages. A thread expires 5 minutes after its last request and is deleted no more than 1 hour after its last use. Message threads are available on the Claude API, [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws), Claude Models on Google Cloud (Anthropic managed), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry).
+ ### October 30, 2026
+ * We’ve deprecated [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) for Claude Opus 4.8, with removal on November 30, 2026. After removal, requests to `claude-opus-4-8` with `speed: "fast"` will return an error. To continue using fast mode, migrate to [Claude Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide#migrating-from-claude-opus-4-8). Read more in [Fast mode model availability](https://platform.claude.com/docs/en/build-with-claude/fast-mode#supported-models).
+ ### October 29, 2026
+ * We’ve launched the [Usage and Cost Analytics API](https://platform.claude.com/docs/en/manage-claude/usage-cost-analytics-api) in beta with the `analytics-usage-cost-2026-08-24` beta header. Its `/v1/organizations/analytics/usage` and `/v1/organizations/analytics/cost` endpoints report token usage and cost for Claude Console and Claude Enterprise organizations. You can filter and group results by dimensions such as model, workspace, API key, and the user or service account behind each request.
+ * The [Usage and Cost API](https://platform.claude.com/docs/en/manage-claude/usage-cost-api) is now a legacy API, and so are the `usage_report`, `cost_report`, `user_usage_report`, and `user_cost_report` endpoints of the [Claude Enterprise Analytics API](https://platform.claude.com/docs/en/manage-claude/analytics-api). All of them remain supported. To move an existing integration, see [Migrate from the Usage and Cost API](https://platform.claude.com/docs/en/manage-claude/usage-cost-analytics-api#migrate-from-usage-cost-api) or [Migrate from the Claude Enterprise usage and cost reports](https://platform.claude.com/docs/en/manage-claude/usage-cost-analytics-api#migrate-from-enterprise-analytics-reports).
+ ### October 28, 2026
+ * We’ve raised the [maximum request size](https://platform.claude.com/docs/en/api/overview#request-size-limits) for the Messages API and the Token Counting API from 32 MB to 128 MB on the first-party Claude API.
+ ### October 23, 2026
+ * The [Claude Tag API](https://platform.claude.com/docs/en/manage-claude/claude-tag-api) is available in beta for Claude Enterprise organizations with the `experimental-claude-tag-2026-10-21` beta header. Its `/v1/organizations/claude_tag/` endpoints read and change [Claude Tag](https://claude.com/docs/claude-tag/overview) settings on Slack channels and Slack workspaces, show which settings apply in a channel and where each comes from, and attach Access bundles. Call it with an Admin API key that your primary owner creates in claude.ai with the `read:claude_tag` or `write:claude_tag` scope. It is not available to Claude Platform (Claude Console) organizations.
+ ### October 22, 2026
+ * We’ve launched [Claude Models on Google Cloud (Anthropic managed)](https://platform.claude.com/docs/en/build-with-claude/claude-models-on-google-cloud/anthropic-managed), the Claude API operated by Anthropic and reached through your Google Cloud project. Google Cloud IAM controls access. Google Cloud Marketplace handles billing.
+ * [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) is available for Claude Opus 5.5 on Claude Models on Google Cloud (Anthropic managed).
+ ### October 21, 2026
+ * We’ve released API version `2026-10-21`. [Migrating to API version 2026-10-21](https://platform.claude.com/docs/en/api/migration-2026-10-21) shows how to upgrade.
+ * We’ve released new versions of the [client SDKs](https://platform.claude.com/docs/en/cli-sdks-libraries/overview) and the [`ant` CLI](https://platform.claude.com/docs/en/cli-sdks-libraries/cli/quickstart) that send API version `2026-10-21` by default: Python SDK 2.0.0, TypeScript SDK 1.0.0, C# SDK 13.0.0, Go SDK 2.0.0, Java SDK 3.0.0, PHP SDK 1.0.0, Ruby SDK 2.0.0, and `ant` CLI 2.0.0. See [Switch to 2026-10-21](https://platform.claude.com/docs/en/api/migration-2026-10-21#upgrade).
… diff truncated (353 added / 245 removed lines)
```

### anthropic.platform.token-counting

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/build-with-claude/token-counting
- Change: changed
- Prior hash: b409c3a73340bc01db6373c959b3c889bb4c0d5f5482c424fdfed268cbe5f030
- Current hash: d9e052b0db0f2fc2a43fba5c7851d9f8c74f444231a53ca977820abf37746f17

```diff
- ## Compatibility
- - [ZDR](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention): eligible (excludes [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements))
- - Platforms: Claude API, Claude Platform on AWS, Amazon Bedrock, Google Cloud, Microsoft Foundry
- The [token counting](https://platform.claude.com/docs/en/api/messages-count-tokens) endpoint accepts the same structured list of inputs for creating a message, including support for system prompts, [tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), [images](https://platform.claude.com/docs/en/build-with-claude/vision), and [PDFs](https://platform.claude.com/docs/en/build-with-claude/pdf-support). The response contains the total number of input tokens.
- Token counts may include tokens added automatically by Anthropic for system optimizations. **You are not billed for system-added tokens**. Billing reflects only your content.
- -H "anthropic-version: 2023-06-01" \
- "model": "claude-opus-5",
- --model claude-opus-5 \
- model="claude-opus-5",
- model: "claude-opus-5",
- Model = Model.ClaudeOpus5,
- Messages = [new() { Role = Role.User, Content = "Hello, Claude" }]
- Model: anthropic.ModelClaudeOpus5,
- .model(Model.CLAUDE_OPUS_5)
- model: 'claude-opus-5',
- model: "claude-opus-5",
- [Server tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools) token counts only apply to the first sampling call.
- -H "anthropic-version: 2023-06-01" \
- "model": "claude-opus-5",
- model: claude-opus-5
- model="claude-opus-5",
- model: "claude-opus-5",
- Model = Model.ClaudeOpus5,
- Messages = [new() { Role = Role.User, Content = "What's the weather like in San Francisco?" }]
- Model: anthropic.ModelClaudeOpus5,
- .model(Model.CLAUDE_OPUS_5)
- model: 'claude-opus-5',
- model: "claude-opus-5",
- IMAGE_URL="https://platform.claude.com/docs/images/vision-example.jpg"
- IMAGE_MEDIA_TYPE="image/jpeg"
- IMAGE_BASE64=$(curl -s "$IMAGE_URL" | base64 | tr -d '\n')
- -H "anthropic-version: 2023-06-01" \
- "model": "claude-opus-5",
- "media_type": "$IMAGE_MEDIA_TYPE",
- IMAGE_URL="https://platform.claude.com/docs/images/vision-example.jpg"
- curl -s "$IMAGE_URL" -o ./vision-example.jpg
- model: claude-opus-5
- model="claude-opus-5",
- model: "claude-opus-5",
- Model = Model.ClaudeOpus5,
+ featureMetadata:
+ status: stable
+ zdr:
+ eligibility: eligible
+ note: Excludes [Covered Models](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements). Count tokens before sending requests.
+ supportedModels:
+ - claude-fable-5-2
+ - claude-mythos-5-2
+ - claude-fable-5-1
+ - claude-mythos-5-1
+ - claude-fable-5
+ - claude-mythos-5
+ - claude-mythos-preview
+ - claude-opus-5-5
+ - claude-opus-5
+ - claude-sonnet-5-5
+ - claude-sonnet-5
+ - claude-haiku-5-5
+ - claude-haiku-4-5-20251001
+ - claude-opus-4-8
+ - claude-opus-4-7
+ - claude-opus-4-6
+ - claude-sonnet-4-6
+ - claude-opus-4-5-20251101
+ - claude-sonnet-4-5-20250929
+ supportedPlatforms:
+ Claude API: stable
+ Amazon Bedrock: stable
+ Amazon Bedrock (bedrock-runtime): stable
+ Claude Platform on AWS: stable
+ Claude Models on Google Cloud (Anthropic managed): stable
+ Claude Models on Google Cloud (Google managed): stable
+ Microsoft Foundry: stable
+ The [token counting](https://platform.claude.com/docs/en/api/messages/count_tokens) endpoint accepts the same structured list of inputs for creating a message, including support for system prompts, [tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), [images](https://platform.claude.com/docs/en/build-with-claude/vision), and [PDFs](https://platform.claude.com/docs/en/build-with-claude/pdf-support). The response contains the total number of [input tokens](https://platform.claude.com/docs/en/api/messages/count_tokens#message_tokens_count.input_tokens).
+ (See the `messages/count_tokens` method in [the API reference](https://platform.claude.com/docs/en/api/messages/count_tokens).)
+ This endpoint returns an `invalid_request_error` for a few inputs that the Messages API accepts:
+ * [Server tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools) such as web search, web fetch, code execution, and tool search (every server tool except the [advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool))
+ * The [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
+ * `image` or `document` blocks with a `url` or `file` source
+ Send images and PDFs as base64 to count them. For requests that use server tools or MCP servers, the Messages API response reports the tokens used in its [`usage`](https://platform.claude.com/docs/en/api/messages/create#message.usage) object.
… diff truncated (146 added / 97 removed lines)
```

### apify.api.v2

- Vendor: Apify
- Source: https://docs.apify.com/api/v2
- Change: changed
- Prior hash: 949c500125ab16a908dc1948db9327d3f019a0f895c0ddfaf429402233e1d770
- Current hash: 18654a81371504c2fc7b5845a37b5084a1308df458eaa0f06a907d1b03cf5c72

```diff
- Version: v2-2026-09-02T154542Z
- **You can find your API token on the [Integrations](https://console.apify.com/settings/integrations) page in the Apify Console.**
- * Add the token to your request's `Authorization` header as `Bearer <token>`. E.g., `Authorization: Bearer xxxxxxx`. [More info](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization). (Recommended).
- To run an Actor, send a POST request to the Run Actor endpoint using either the Actor ID code (e.g. `vKg4IjxZbEYTYeW8T`) or its name (e.g. `janedoe~my-actor`):
- Optionally, you can include the query parameters described in the Run Actor section to customize your run.
- 1. Run an Actor or task using the Run Actor or Run task API endpoints.
- 2. Monitor the Actor run by periodically polling its progress using the Get run API endpoint.
- 3. Fetch the results from the Get items API endpoint using the `defaultDatasetId`, which you receive in the Run request response. Additional data may be stored in a key-value store. You can fetch them from the Get record API endpoint using the `defaultKeyValueStoreId` and the store's `key`.
- **Note**: Instead of periodic polling, you can also run your Actor or task synchronously. This will ensure that the request waits for 300 seconds (5 minutes) for the run to finish and returns its output. If the run takes longer, the request will time out and throw an error.
- However, there are a few explicitly described exceptions, such as Get dataset items or Key-value store Get record API endpoints, which return data in other formats. In case of an error, the response has the HTTP status code in the range of 4xx or 5xx and the `data` property is replaced with `error`. For example:
- All API endpoints that return a list of records (e.g. Get list of Actors) enforce pagination in order to limit the size of their responses.
- Most of these API endpoints are paginated using the `offset` and `limit` query parameters. The only exception is Get list of keys, which is paginated using the `exclusiveStartKey` query parameter.
- The records in the [key-value store](https://docs.apify.com/platform/storage/key-value-store) are not ordered based on numerical indexes, but rather by their keys in the UTF-8 binary order. Therefore the Get list of keys API endpoint only supports pagination using the following query parameters:
- The Apify API uses common HTTP status codes: `2xx` range for success, `4xx` range for errors caused by the caller (invalid requests) and `5xx` range for server errors (these are rare). Each error response contains a JSON object defining the `error` property, which is an object with the `type` and `message` properties that contain the error code and a human-readable error description, respectively.
- | `400` | `invalid-request` | POST data must be a JSON object |
- | `400` | `invalid-value` | Invalid value provided: Comments required |
- | `400` | `invalid-record-key` | Record key contains invalid character |
- | `401` | `token-not-provided` | Authentication token was not provided |
- | `404` | `record-not-found` | Store was not found |
- | `429` | `rate-limit-exceeded` | You have exceeded the rate limit of ... requests per second |
- | `405` | `method-not-allowed` | This API endpoint can only be accessed using the following HTTP methods: OPTIONS, POST |
- * CRUD (get, put, delete) operations on key-value store records
- * Run Actor
- * Run Actor task asynchronously
- * Run Actor task synchronously
- * Metamorph Actor run
- * Push items to dataset
- * CRUD (add, get, update, delete) operations on requests in request queues
- 3. If the response has status code not equal to `429` then you are done. Otherwise:
- Bearer token provided in the `Authorization` header (e.g., `Authorization: Bearer your_token`—recommended). [More info](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization).
- Use your API token to authenticate requests. You can find it on the [Integrations page](https://console.apify.com/account#/integrations) in Apify Console. This method is more secure than query parameters, as headers are not logged in browser history or server logs.
- Use your API token to authenticate requests. You can find it on the [Integrations page](https://console.apify.com/account#/integrations) in Apify Console.
+ - [Actors](https://docs.apify.com/api/v2/actor-runtime-api-actors.md)
+ - [Actor versions](https://docs.apify.com/api/v2/actor-runtime-api-actor-versions.md)
+ - [Actor builds](https://docs.apify.com/api/v2/actor-runtime-api-actor-builds.md)
+ - [Actor runs](https://docs.apify.com/api/v2/actor-runtime-api-actor-runs.md)
+ - [Actor tasks](https://docs.apify.com/api/v2/actor-runtime-api-actor-tasks.md)
+ - [Webhooks](https://docs.apify.com/api/v2/actor-runtime-api-webhooks.md)
+ - [Schedules](https://docs.apify.com/api/v2/actor-runtime-api-schedules.md)
+ - [Logs](https://docs.apify.com/api/v2/actor-runtime-api-logs.md)
+ - [Users](https://docs.apify.com/api/v2/actor-runtime-api-users.md)
+ - [Datasets](https://docs.apify.com/api/v2/actor-runtime-api-datasets.md)
+ - [Key-value stores](https://docs.apify.com/api/v2/actor-runtime-api-key-value-stores.md)
+ - [Request queues](https://docs.apify.com/api/v2/actor-runtime-api-request-queues.md)
+ Version: v2-2026-11-18T151559Z
+ **You can create an API token on the [Integrations](https://console.apify.com/settings/integrations) page in the Apify Console.** The Console shows the token only once, right after you create or rotate it, so copy it and store it somewhere safe. For details, see [API token](https://docs.apify.com/integrations/api#api-token).
+ * *(Recommended)* Add the token to your request's `Authorization` header as `Bearer <token>`. E.g., `Authorization: Bearer xxxxxxx`. For details, see the [Authorization header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization) on MDN.
+ Agents can also pay once with x402 or the [Machine Payments Protocol (MPP)](https://docs.apify.com/integrations/mpp) and receive a temporary API token with a fixed spend cap from the Apify Agent General Interface (AGI) at [https://agi.apify.com](https://agi.apify.com). Use that token as a regular `Bearer` token.
+ To run an Actor, send a POST request to the [Run Actor](https://docs.apify.com/api/v2/actors-runs-post.md) endpoint using either the Actor ID code (e.g. `vKg4IjxZbEYTYeW8T`) or its name (e.g. `janedoe~my-actor`):
+ Optionally, you can include the query parameters described in the [Run Actor](https://docs.apify.com/api/v2/actors-runs-post.md) section to customize your run.
+ 1. Run an Actor or task using the [Run Actor](https://docs.apify.com/api/v2/actors-runs-post.md) or [Run Actor task](https://docs.apify.com/api/v2/actor-task-runs-post.md) API endpoints.
+ 2. Monitor the Actor run by periodically polling its progress using the [Get Actor run](https://docs.apify.com/api/v2/actor-run-get.md) API endpoint.
+ 3. Fetch the results from the [Get dataset items](https://docs.apify.com/api/v2/dataset-items-get.md) API endpoint using the `defaultDatasetId`, which you receive in the Run request response. Additional data may be stored in a key-value store. You can fetch them from the [Get key-value store record](https://docs.apify.com/api/v2/key-value-store-record-get.md) API endpoint using the `defaultKeyValueStoreId` and the store's `key`.
+ **Note**: Instead of periodic polling, you can also run your Actor or task synchronously with the [Run Actor synchronously and get key-value store record](https://docs.apify.com/api/v2/actor-run-sync-post.md) or [Run Actor task synchronously and get key-value store record](https://docs.apify.com/api/v2/actor-task-run-sync-post.md) endpoint. This will ensure that the request waits for 300 seconds (5 minutes) for the run to finish and returns its output. If the run takes longer, the request will time out and throw an error.
+ However, there are a few explicitly described exceptions, such as [Get dataset items](https://docs.apify.com/api/v2/dataset-items-get.md) or [Get key-value store record](https://docs.apify.com/api/v2/key-value-store-record-get.md) API endpoints, which return data in other formats. In case of an error, the response has the HTTP status code in the range of 4xx or 5xx and the `data` property is replaced with `error`. For example:
+ All API endpoints that return a list of records (e.g. [Get list of Actors](https://docs.apify.com/api/v2/actors-get.md)) enforce pagination in order to limit the size of their responses.
+ Most of these API endpoints are paginated using the `offset` and `limit` query parameters. The only exception is [Get list of key-value store keys](https://docs.apify.com/api/v2/key-value-store-keys-get.md), which is paginated using the `exclusiveStartKey` query parameter.
+ The records in the [key-value store](https://docs.apify.com/platform/storage/key-value-store) are not ordered based on numerical indexes, but rather by their keys in the UTF-8 binary order. Therefore the [Get list of key-value store keys](https://docs.apify.com/api/v2/key-value-store-keys-get.md) API endpoint only supports pagination using the following query parameters:
+ The Apify API uses common HTTP status codes: 2xx range for success, 4xx range for errors caused by the caller (invalid requests) and 5xx range for server errors (these are rare). Each error response contains a JSON object defining the `error` property, which is an object with the `type` and `message` properties that contain the error code and a human-readable error description, respectively.
+ | 400 | `invalid-request` | POST data must be a JSON object |
+ | 400 | `invalid-value` | Invalid value provided: Comments required |
+ | 400 | `invalid-record-key` | Record key contains invalid character |
+ | 401 | `token-not-provided` | Authentication token was not provided |
+ | 404 | `record-not-found` | Store was not found |
+ | 429 | `rate-limit-exceeded` | You have exceeded the rate limit of ... requests per second |
+ | 405 | `method-not-allowed` | This API endpoint can only be accessed using the following HTTP methods: OPTIONS, POST |
+ These endpoints have a rate limit of *35 requests per second per resource*:
+ * [Batch add requests to request queue](https://docs.apify.com/api/v2/request-queue-requests-batch-post.md)
+ * [Batch delete requests from request queue](https://docs.apify.com/api/v2/request-queue-requests-batch-delete.md)
+ * [Get and lock request queue head](https://docs.apify.com/api/v2/request-queue-head-lock-post.md)
+ These endpoints have a rate limit of *100 requests per second per resource*:
+ * [Download key-value store records](https://docs.apify.com/api/v2/key-value-store-records-get.md) (ZIP archive)
… diff truncated (61 added / 32 removed lines)
```

### apify.cli.changelog

- Vendor: Apify
- Source: https://docs.apify.com/cli/docs/changelog
- Change: changed
- Prior hash: 3b6f317698a5c8c74202e33297d996fcbd42816b21f2498095f2e379ba3b3896
- Current hash: e8bf1f544779990c725d22ab0f1ab4e1f822f68eaf374d97b25cf300cd8e2160

```diff
- * Enrich cli\_command\_push telemetry with actorId and wasCreated ([#1152](https://github.com/apify/apify-cli/pull/1152)) ([a3931bf](https://github.com/apify/apify-cli/commit/a3931bf6fa840bff115955dddbccb9a949233c70)) by [@patrikbraborec](https://github.com/patrikbraborec), closes [#1151](https://github.com/apify/apify-cli/issues/1151)
- * `apify run -p` runs actor, if apify\_storage doesn't exist
- * 🎉<!-- --> New commands to manage secret environment variables: `apify secrets:add`, `apify secrets:rm`.
- * Added template named hello\_word
- * apify run takes APIFY\_USER\_ID and APIFY\_TOKEN as environments variables, if client is logged locally
+ ### [1.13.0](https://github.com/apify/apify-cli/releases/tag/v1.13.0) (2026-11-18)[](#1130-2026-11-18)
+ * Add apify server commands for Server Actors ([#1522](https://github.com/apify/apify-cli/pull/1522)) ([1253156](https://github.com/apify/apify-cli/commit/125315652f3741f3bc26f7106170e8e4cee097d4)) by [@l2ysho](https://github.com/l2ysho), closes [#1553](https://github.com/apify/apify-cli/issues/1553)
+ * **create:** Suggest apify run --server for Server Actors ([#1598](https://github.com/apify/apify-cli/pull/1598)) ([d2fb49c](https://github.com/apify/apify-cli/commit/d2fb49ccb359b782ea04ed8d162cd7c1c01aee20)) by [@l2ysho](https://github.com/l2ysho), closes [#1590](https://github.com/apify/apify-cli/issues/1590)
+ * **actors pull:** Reject source file names that escape the target directory ([#1589](https://github.com/apify/apify-cli/pull/1589)) ([e1c5f59](https://github.com/apify/apify-cli/commit/e1c5f59c50dfeca5e6e16fd4e4e6b16441a8f7bc)) by [@l2ysho](https://github.com/l2ysho), closes [#1191](https://github.com/apify/apify-cli/issues/1191)
+ ### [1.12.0](https://github.com/apify/apify-cli/releases/tag/v1.12.0) (2026-11-12)[](#1120-2026-11-12)
+ * Validate `actor.json` paths before `apify push` uploads anything ([#1503](https://github.com/apify/apify-cli/pull/1503)) ([3bff862](https://github.com/apify/apify-cli/commit/3bff862dab81fc7bc6ba6228191f7e74e729da27)) by [@DaveHanns](https://github.com/DaveHanns), closes [#1500](https://github.com/apify/apify-cli/issues/1500)
+ * Let `apify push` select which Actors to push in a repository with several ([#1504](https://github.com/apify/apify-cli/pull/1504)) ([85405bf](https://github.com/apify/apify-cli/commit/85405bf9e6c62caa684ba6aceaca8dc2a46c33b9)) by [@DaveHanns](https://github.com/DaveHanns), closes [#1499](https://github.com/apify/apify-cli/issues/1499)
+ * Push monorepo Actors by uploading the repository root with `actorPath` ([#1505](https://github.com/apify/apify-cli/pull/1505)) ([13d2577](https://github.com/apify/apify-cli/commit/13d25778d9cb86fde5d790a9b8b35b445fc43bb1)) by [@DaveHanns](https://github.com/DaveHanns), closes [#1525](https://github.com/apify/apify-cli/issues/1525)
+ * Isolate detectAiAgent test from ambient environment ([#1421](https://github.com/apify/apify-cli/pull/1421)) ([7e944ac](https://github.com/apify/apify-cli/commit/7e944aca9b7069c32b23ed617b23adcbbab580da)) by [@l2ysho](https://github.com/l2ysho)
+ * Leave out every gitignored file when apify push collects files ([#1537](https://github.com/apify/apify-cli/pull/1537)) ([1668bd5](https://github.com/apify/apify-cli/commit/1668bd534c86b1be06c8491d356c2428bc244aa2)) by [@DaveHanns](https://github.com/DaveHanns), closes [#1536](https://github.com/apify/apify-cli/issues/1536)
+ * Zip symlinked files as their content and finish writing the zip before upload ([#1549](https://github.com/apify/apify-cli/pull/1549)) ([cd0dad4](https://github.com/apify/apify-cli/commit/cd0dad49de1870ae9bb174606c2bf16049a1fb59)) by [@DaveHanns](https://github.com/DaveHanns), closes [#1548](https://github.com/apify/apify-cli/issues/1548)
+ * Settle the job log stream promise when the connection drops ([#1561](https://github.com/apify/apify-cli/pull/1561)) ([3f4a024](https://github.com/apify/apify-cli/commit/3f4a024c568c59b3f6c2a70a4618dacdf43c15d5)) by [@l2ysho](https://github.com/l2ysho)
+ * Make the Actor context fallback error generic and actionable ([#1563](https://github.com/apify/apify-cli/pull/1563)) ([9d3eee5](https://github.com/apify/apify-cli/commit/9d3eee55be8b2e79feddbe5404216dcdb4449202)) by [@l2ysho](https://github.com/l2ysho)
+ * Leave out .git at any depth when apify push collects files ([#1551](https://github.com/apify/apify-cli/pull/1551)) ([d72a751](https://github.com/apify/apify-cli/commit/d72a7510b204ca5ba7358b8a4be548de1af51f45)) by [@DaveHanns](https://github.com/DaveHanns), closes [#1550](https://github.com/apify/apify-cli/issues/1550)
+ * Say personal token instead of long-lived in `apify mcp install` ([#1583](https://github.com/apify/apify-cli/pull/1583)) ([be03664](https://github.com/apify/apify-cli/commit/be03664bbcac00816a509fb5ef00f4e40e829b4f)) by [@l2ysho](https://github.com/l2ysho)
+ * Lazy-load actor-memory-expression ([#1541](https://github.com/apify/apify-cli/pull/1541)) ([9190b28](https://github.com/apify/apify-cli/commit/9190b28a2d0ec52dcda6a4560bf9dd680056d476)) by [@JuanGalilea](https://github.com/JuanGalilea)
+ ### [1.11.0](https://github.com/apify/apify-cli/releases/tag/v1.11.0) (2026-10-29)[](#1110-2026-10-29)
+ * Require Node.js 22 or newer ([#1403](https://github.com/apify/apify-cli/pull/1403)) ([f26ca62](https://github.com/apify/apify-cli/commit/f26ca62569253eb62c39c011a00a8e9e7d95a705)) by [@l2ysho](https://github.com/l2ysho)
+ * Add --apply-env-vars-to-build flag to push (#734) ([#1345](https://github.com/apify/apify-cli/pull/1345)) ([216cc15](https://github.com/apify/apify-cli/commit/216cc155ecbcabcc750b124a9f56ff8a9f3fd930)) by [@MatousMarik](https://github.com/MatousMarik)
+ * Read applyEnvVarsToBuild from actor.json in push (#734) ([#1346](https://github.com/apify/apify-cli/pull/1346)) ([4e9f83d](https://github.com/apify/apify-cli/commit/4e9f83de3a13d00f36ecc8c9821f60a73261d1bf)) by [@MatousMarik](https://github.com/MatousMarik), closes [#734](https://github.com/apify/apify-cli/issues/734)
+ * One token resolution order across every command ([#1431](https://github.com/apify/apify-cli/pull/1431)) ([c01872b](https://github.com/apify/apify-cli/commit/c01872bdc3fa684197aadb4ff7035599d7498fcd)) by [@l2ysho](https://github.com/l2ysho), closes [#720](https://github.com/apify/apify-cli/issues/720), [#1418](https://github.com/apify/apify-cli/issues/1418)
+ * Auth.json v2 with profiles keyed by user ID ([#1434](https://github.com/apify/apify-cli/pull/1434)) ([56475cc](https://github.com/apify/apify-cli/commit/56475ccf0258a096e1742d06a9f6c16c65c4793c)) by [@l2ysho](https://github.com/l2ysho), closes [#1383](https://github.com/apify/apify-cli/issues/1383), [#1419](https://github.com/apify/apify-cli/issues/1419)
+ * Key secrets by user ID on both backends ([#1450](https://github.com/apify/apify-cli/pull/1450)) ([3cfddd5](https://github.com/apify/apify-cli/commit/3cfddd52e0db4f1fe5f7ea06b2ad4a78fba1e98e)) by [@l2ysho](https://github.com/l2ysho), closes [#1383](https://github.com/apify/apify-cli/issues/1383), [#1420](https://github.com/apify/apify-cli/issues/1420)
+ * Make token login additive across accounts ([#1458](https://github.com/apify/apify-cli/pull/1458)) ([4708c1c](https://github.com/apify/apify-cli/commit/4708c1cac78e327003287e11f74461b75a915252)) by [@l2ysho](https://github.com/l2ysho), closes [#1297](https://github.com/apify/apify-cli/issues/1297), [#1386](https://github.com/apify/apify-cli/issues/1386)
+ * Add --profile, auth switch, auth list and per-account logout ([#1459](https://github.com/apify/apify-cli/pull/1459)) ([22812c6](https://github.com/apify/apify-cli/commit/22812c6e276b6bc830fb85682c9fac5ee7cfddd3)) by [@l2ysho](https://github.com/l2ysho), closes [#1297](https://github.com/apify/apify-cli/issues/1297), [#1384](https://github.com/apify/apify-cli/issues/1384)
+ * Log in through OAuth 2.0 device code by default ([#1402](https://github.com/apify/apify-cli/pull/1402)) ([75603a8](https://github.com/apify/apify-cli/commit/75603a8e7d1241958e39ce432ffbaa3569a49fc8)) by [@vladfrangu](https://github.com/vladfrangu), closes [#1385](https://github.com/apify/apify-cli/issues/1385)
+ * Detect `dockerContextDir` in `apify push` and refuse monorepo Actors before any write ([#1502](https://github.com/apify/apify-cli/pull/1502)) ([bd0f69d](https://github.com/apify/apify-cli/commit/bd0f69d5bfeaa274a0e4b1689ab3574c80835d18)) by [@DaveHanns](https://github.com/DaveHanns), closes [#1524](https://github.com/apify/apify-cli/issues/1524)
+ * Warn before `apify mcp install` embeds an expiring OAuth token ([#1529](https://github.com/apify/apify-cli/pull/1529)) ([556263b](https://github.com/apify/apify-cli/commit/556263bf9775ba3b3253e4ca791f6caf7d701d21)) by [@l2ysho](https://github.com/l2ysho)
+ * **run:** Purge local stores from the correct directory ([#1404](https://github.com/apify/apify-cli/pull/1404)) ([d292f92](https://github.com/apify/apify-cli/commit/d292f92f76e4f523e8ccabd3308d2f5f54eaf1a5)) by [@l2ysho](https://github.com/l2ysho)
+ * Restore retry backoff when removing files ([#1394](https://github.com/apify/apify-cli/pull/1394)) ([7c97865](https://github.com/apify/apify-cli/commit/7c978655b2ab38f1265364bc830501a96ab15abe)) by [@roli-lpci](https://github.com/roli-lpci), closes [#1319](https://github.com/apify/apify-cli/issues/1319)
+ * **kvs:** Write record metadata sidecars for input files ([#1416](https://github.com/apify/apify-cli/pull/1416)) ([e9fb806](https://github.com/apify/apify-cli/commit/e9fb8068064acd1565afe1b5c41b84797ecbb3d8)) by [@janbuchar](https://github.com/janbuchar)
+ * **create:** Make the local-only source option say nothing is uploaded ([#1397](https://github.com/apify/apify-cli/pull/1397)) ([44ea854](https://github.com/apify/apify-cli/commit/44ea85470dc21df5481ee1978310b7721bde7406)) by [@l2ysho](https://github.com/l2ysho), closes [#1396](https://github.com/apify/apify-cli/issues/1396)
+ * **deps:** Align devEngines pnpm with packageManager to 11.11.0 ([#1412](https://github.com/apify/apify-cli/pull/1412)) ([05669c4](https://github.com/apify/apify-cli/commit/05669c4458e35762ba78c2a7ed2f895a6f01c85f)) by [@l2ysho](https://github.com/l2ysho)
+ * **actors ls:** Do not crash when an Actor record has no stats ([#1435](https://github.com/apify/apify-cli/pull/1435)) ([af22f50](https://github.com/apify/apify-cli/commit/af22f5009dd7ccf2a87d1e009f009785099a4256)) by [@l2ysho](https://github.com/l2ysho)
+ * Include $schema line in actor.json generated by `apify init` ([#1507](https://github.com/apify/apify-cli/pull/1507)) ([a97643d](https://github.com/apify/apify-cli/commit/a97643da127b1c7c87018a08681d3c3b7c7d6d7a)) by [@janbuchar](https://github.com/janbuchar)
+ * **actors info:** Follow the Actor's default build for --input and --readme ([#1473](https://github.com/apify/apify-cli/pull/1473)) ([6cb3b29](https://github.com/apify/apify-cli/commit/6cb3b29e5402a53fdfd7b027aef903109bfd5443)) by [@l2ysho](https://github.com/l2ysho), closes [#1454](https://github.com/apify/apify-cli/issues/1454)
+ * **init:** Stop the name prompt looping when stdin is not a TTY ([#1479](https://github.com/apify/apify-cli/pull/1479)) ([23d6b54](https://github.com/apify/apify-cli/commit/23d6b543fd68c566fe0e7be57a084adcfedbbe4e)) by [@l2ysho](https://github.com/l2ysho)
+ * Report the real Actor name length limit ([#1484](https://github.com/apify/apify-cli/pull/1484)) ([9f312ec](https://github.com/apify/apify-cli/commit/9f312ece9dcf6db6909dc5f1dcd005ee5b4543bc)) by [@l2ysho](https://github.com/l2ysho)
+ * Stop `apify upgrade` reporting success after a failed binary write ([#1462](https://github.com/apify/apify-cli/pull/1462)) ([84e7fb0](https://github.com/apify/apify-cli/commit/84e7fb026d2e770135104754af1d09201eaa6455)) by [@l2ysho](https://github.com/l2ysho), closes [#1460](https://github.com/apify/apify-cli/issues/1460)
+ * Send --timeout 0 (no timeout) to the API in call, actors start and task run ([#1491](https://github.com/apify/apify-cli/pull/1491)) ([6a54259](https://github.com/apify/apify-cli/commit/6a5425998e7150344e07647a412328481ab83103)) by [@Pijukatel](https://github.com/Pijukatel)
```

### apify.integrations.mcp

- Vendor: Apify
- Source: https://docs.apify.com/mcp
- Change: changed
- Prior hash: 9261c1ad0211ee3bbffaebf46f54684d3bf7480a42a76a9313718233ad411168
- Current hash: 8b6767ed8b9bf38984fc9d638342c003223c30cbf861d7ae2bff5bda8eb6f597

```diff
- url: https://docs.apify.com/integrations/mcp.md
- - [Integrations](https://docs.apify.com/integrations.md)
- - [AI](https://docs.apify.com/integrations/ai.md)
- previous: [Build with connectors](https://docs.apify.com/integrations/mcp-connectors/use-in-actors.md)
- next: [Milvus](https://docs.apify.com/integrations/milvus.md)
- Help keep this page up to date
- This integration uses a third-party service. If you find outdated content, please [submit an issue on GitHub](https://github.com/apify/apify-docs/issues).
- The MCP server intentionally excludes two categories of Actors from search and execution:
- * *Full-permission Actors* - excluded for security. Running a [full-permission Actor](https://docs.apify.com/actors/running/permissions.md#full-permission-actors) is a decision you approve personally, so an LLM can't make it on your behalf.
- * *Rental Actors* - excluded because their subscription-based model doesn't fit the sporadic, on-demand way the MCP server runs Actors.
- Before connecting your AI to Apify, you'll need three things:
- * *An Apify account* - Sign up for an Apify account, if you don't have one.
- * *Apify API token* - Get your API token from the **API & Integrations** section in [Apify Console](https://console.apify.com/settings/integrations). This token authorizes the MCP server to run Actors on your behalf. Make sure to keep it secure.
- * *MCP client* - An AI agent or client that supports Model Context Protocol (MCP) This could be Anthropic's Claude for Desktop, a VS Code extension with MCP support, or any application that implements the MCP specification. The [official MCP documentation](https://modelcontextprotocol.io/clients) maintains a list of compatible clients.
- You can connect to the Apify MCP server in two ways: use our hosted service using Streamable HTTP with OAuth, or run the server locally for development and testing using local stdio.
- SSE transport deprecated
- Server-Sent Events (SSE) transport will be removed on April 1, 2026. The Apify MCP server now uses Streamable HTTP, in line with the official MCP specification. Visit [mcp.apify.com](https://mcp.apify.com/) to update your client configuration.
- Replace `<APIFY_TOKEN>` with your actual Apify API token from the [API & Integrations section](https://console.apify.com/settings/integrations).
- Quick setup options
- *MCP server configuration for other clients*: Use the [UI configuration tool](https://mcp.apify.com/) to select Actors and tools, then copy the configuration to your client.
- #### Client configuration
- Here's how to add the Apify MCP server to popular text editors and AI assistants:
- **Cursor**
- One-click installation
- The [Apify UI configurator](https://mcp.apify.com/) offers a one-click install button for Cursor that automatically applies the configuration to your client.
- To add Apify MCP server to Cursor manually:
- 1. Create or open the `.cursor/mcp.json` file.
- 2. Add the following to the configuration file:
- To use a bearer token instead of signing in, add an `Authorization` header with your [Apify API token](https://console.apify.com/settings/integrations):
- **VS Code**
- One-click installation
- The [Apify UI configurator](https://mcp.apify.com/) offers a one-click install button for VS Code that automatically applies the configuration to your client.
- VS Code supports MCP through GitHub Copilot's agent mode (requires Copilot subscription):
- 1. Ensure you have GitHub Copilot installed
- 2. Open Command Palette (`CMD`/`CTRL` + `Shift` + `P`) and run *MCP: Open User Configuration* command.
- * This will open `mcp.json` file in your user profile. If the file does not exist, VS Code creates it for you.
- 3. Add the following to the configuration file:
- To use a bearer token instead of signing in, add an `Authorization` header with your [Apify API token](https://console.apify.com/settings/integrations):
- **Claude Desktop**
- [Add a custom connector](https://support.claude.com/en/articles/11175166) in Claude Desktop and use `https://mcp.apify.com` as the server URL. On first connection, your browser opens to sign in to Apify and authorize the connection.
+ url: https://docs.apify.com/mcp.md
+ previous: [Plugins](https://docs.apify.com/agents/plugins.md)
+ next: [Agent Skills](https://docs.apify.com/agents/skills.md)
+ To connect a coding agent such as Claude Code, Cursor, GitHub Copilot, or Codex, install the [Apify plugin](https://docs.apify.com/agents/plugins.md) instead. It sets up this server together with [Agent Skills](https://docs.apify.com/agents/skills.md) in one step.
+ Due to security reasons, the MCP server intentionally excludes full-permission Actors from search and execution. Running a [full-permission Actor](https://docs.apify.com/actors/running/permissions.md#full-permission-actors) is a decision you approve personally, so an LLM can't make it on your behalf.
+ Before connecting your AI to Apify, you need:
+ * *An Apify account* - You need one unless your agent uses only the tools that work without an account or pays through agentic payments. Sign up for an Apify account, if you don't have one.
+ * *MCP client* - An AI agent or client that supports Model Context Protocol (MCP). This could be [claude.ai](https://docs.apify.com/integrations/claude-ai.md), [Claude Desktop](https://docs.apify.com/integrations/claude-desktop.md), [VS Code](https://docs.apify.com/integrations/vscode.md) with MCP support, or any application that implements the MCP specification. The [official MCP documentation](https://modelcontextprotocol.io/clients) maintains a list of compatible clients.
+ * *Apify API token* (optional) - Only needed for the local stdio server or the Bearer token option. The recommended remote connection signs you in with OAuth instead. [Create an API token](https://docs.apify.com/integrations/api.md#create-api-token) in Apify Console.
+ To discover Actors and search the documentation, you can connect without an account. To run Actors, connect in one of two ways: use the hosted Apify service with Streamable HTTP with OAuth, or run the server locally for development and testing with local stdio.
+ ### Use without an account
+ The Apify MCP server accepts requests without an API token when the `tools` query parameter (see Tool selection) contains only tools enabled for unauthenticated use. These tools cover Actor discovery, documentation lookup, and the Apify API reference:
+ * `apify-api-search`
+ * `apify-api-details`
+ If the `tools` parameter includes any other tool, or you connect to the default endpoint, the server requires an API token. Running Actors and accessing storage or run data always requires authentication, so use one of the methods below when you're ready to run Actors.
+ Replace `<APIFY_TOKEN>` with your [Apify API token](https://docs.apify.com/integrations/api.md#create-api-token).
+ For a client-specific configuration, use the [MCP configurator](https://mcp.apify.com/): pick the Actors and tools you need, then copy the generated configuration into your client. If you use the [Apify CLI](https://docs.apify.com/cli), `apify mcp install <client>` writes the configuration for you, for example `apify mcp install cursor`.
+ Agents can pay for Actor runs without an Apify account. They buy a prepaid, spend-capped API token from [Apify AGI](https://agi.apify.com) and use it like a regular API token, so it runs any Actor that uses [limited permissions](https://docs.apify.com/actors/development/permissions.md).
+ Pass the token to the MCP server in the `Authorization` header:
+ "Authorization": "Bearer <PREPAID_TOKEN>"
+ For supported payment protocols and spending limits, read [Agentic payments](https://docs.apify.com/agents/payments.md).
+ By default, the MCP server loads the `actors` and `docs` tool categories, the `apify/web-search` and `apify/web-fetch` Actors, and `report-problem`. To choose different tools, set the `tools` parameter in the server URL. The parameter replaces the default selection instead of adding to it, so list everything you want to load:
+ `https://mcp.apify.com?tools=actors,docs,apify/web-search,apify/web-fetch`
+ For instance, `https://mcp.apify.com?tools=storage` loads only the storage tools, without `search-actors` or `call-actor`. The default Actors don't belong to any category, so `?tools=actors,docs` also drops them.
+ Each Actor you select with the `tools` parameter becomes a tool of its own, named `{username}--{actor-name}`. For example, the server exposes `apify/web-search` as `apify--web-search`. The server replaces dots in the username with `-dot-` and shortens names longer than 64 characters by adding a hash suffix to keep them unique.
+ To select your tools visually, use the [MCP configurator](https://mcp.apify.com/), then copy the generated configuration to your client.
+ | ---------------------------------------------------------------- | ----------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+ | `search-actors` | `actors` | ✅ | Search for Actors in Apify Store |
+ | `fetch-actor-details` | `actors` | ✅ | Retrieve detailed information about a specific Actor, including its input and output schema, README (summary when available, full otherwise), and pricing |
+ | `call-actor` | `actors` | ✅ | Run an Actor and wait up to `waitSecs` (0-45, default 30) for it to finish. Pass run limits (`memory`, `timeout`, `maxItems`, `maxTotalChargeUsd`) in `callOptions`, not in the Actor input. Returns the run status and storage IDs, not the results themselves |
+ | `fetch-actor-mcp-tool-list` | `actors` | ✅ | List the tools of an Actor that runs an MCP server, with their schemas, annotations, and metadata |
+ | `call-actor-mcp-tool` | `actors` | ✅ | Call one tool on an Actor's MCP server and return its result |
+ | `send-server-actor-request` | `actors` | ✅ | Send one HTTP request to a Server Actor's API, as documented by its API schema, and return the response |
+ | [apify/web-search](https://apify.com/apify/web-search) | Actor | ✅ | Search the web and return the results in the response, without starting an Actor run |
+ | [apify/web-fetch](https://apify.com/apify/web-fetch) | Actor | ✅ | Fetch one http(s) URL and return its full content, rendering JavaScript and bypassing anti-bot protection |
+ | [apify/rag-web-browser](https://apify.com/apify/rag-web-browser) | Actor | | Search the web and return the content of the top results |
+ | `search-apify-docs` | `docs` | ✅ | Search the Apify documentation for relevant pages |
+ | `fetch-apify-docs` | `docs` | ✅ | Fetch the full content of an Apify documentation page by its URL |
+ | `get-actor-run` | `runs` | | Get detailed information about a specific Actor run |
+ | `get-actor-run-list` | `runs` | | Get a list of an Actor's runs, filterable by status |
… diff truncated (83 added / 93 removed lines)
```

### apify.platform.changelog

- Vendor: Apify
- Source: https://apify.com/change-log?_format=html
- Change: changed
- Prior hash: f3bda27cce65c8e39a6e2e671e1ac6759d86d776ddc03115474733c3a87bd926
- Current hash: bbead0ded4d6cb77073a9f73a12a21544b00be13a22441f02ab0940ff9eabd9a

```diff
- Jul 21, 2026
- Apify AI (beta) is live. Describe what you need and get results
- Until now, finding the right Actor on Apify Store meant browsing, comparing, and filling out long input forms before you knew if it was the one you needed.
- Apify AI fixes that. Ask in plain English from the search bar on Apify Store or in the Dashboard widget. It picks the right Actor, fills in the inputs, runs it, and returns the dataset for you.
- Read more
- Jun 26, 2026
- Pay for Apify Actors with x402
- AI agents can now run and pay for eligible Apify Actors in USDC on the Base   network. No Apify account, billing, or API key required. Payments use the open x402 protocol   and settle at the time of request, over both Apify MCP server and the Apify API.
- The fastest and easiest way is to use Coinbase Agentic Wallet CLI   :
- npx awal
- npx skills add coinbase/agentic-wallet-skills
- To get started, give this skill to your agent: apify.it/x402-awal .
- If you're building Actors, you can review the eligibility criteria   to make sure yours can accept agentic payments. For more information, see the docs   and blog post   .
- Jun 25, 2026
- New Actor creation flow
- Creating Actors on Apify is now easier. The creation flow guides you to the most relevant template based on what you want to build and your preferred language. You get to the right template faster, without choice overload.
- If you're an experienced Actor developer, you can still browse the full template list by clicking Browse all templates in the top-right corner.
- Jun 24, 2026
- Publish tasks for your Actor to get more users
- As an Actor creator, you can now publish tasks. It's a new way to get your Actor found on Apify Store. Each published task gets its own page on Apify Store, indexed by search engines and readable by AI agents. That means more ways for people to find your Actor, beyond just the main Actor page. This has two key benefits:
- Shows visitors a concrete, ready-to-run example of how to use your Actor
- Drives organic traffic by targeting specific, long-tail search queries
- The key is naming your tasks around what users actually search for. For example, RAG Web Browser has three published tasks:
- Web search to markdown - targets users looking for markdown-formatted output
- RAG: search a specific website - showcases the site input parameter
- Web Fetch Tool for AI Agent - highlights the Actor's web fetch capability
- Publish a task now: https://docs.apify.com/platform/actors/publishing/publish-task
- Martin Sabo
+ Nov 16, 2026
+ A new way to use Apify with Server Actors
+ A new way to use Apify with Server Actors
+ Server Actors are now available in Apify Store. They send web data back for every request, with no run to start. Many Actors you already use work this way, because their creators turned it on. For developers, each Server Actor   works like any API. Send an HTTP request to its server URL and get the data in the response.
+ Send many requests at once. Server Actors labeled Multi-tenant run on the creator’s account and serve all their users. Your requests don’t use your concurrent-run limits. You pay only the Actor's prices, like per search.
+ Works in apps, agents, and workflows. Call Server Actors from your app, connect AI agents through the Apify MCP server   , or add an HTTP request step in your workflow automation tool.
+ Get the answer you need. An AI agent can check a live page mid-conversation, or an app can look up a profile or a set of reviews when a user needs it.
+ Try Server Actors
+ Browse Server Actors in Apify Store   . Open an Actor's Server tab to try a request.
+ For Actor creators
+ Want your Actor to work this way too? Enable the server interface, formerly Actor Standby, in your Actor's Settings tab, or start from a Server Actor template. Charge per event to earn from users on paid plans. Read how to develop Server Actors   .
+ Oct 30, 2026
+ Apify Store API: new search backend and breaking changes
+ On November 15,  GET /v2/store  in the Apify API moves to a new search backend. This includes calls through apify-client . The Apify MCP server already uses the new backend.
+ Search ranks Actors by how well they match the query and returns one page of the closest matches. Responses also drop fields that added noise to agent context. Both changes can break existing integrations.
+ The path, the  search  parameter, and the  { data: { items, total, count, offset, limit, desc } }  response envelope stay the same.
+ When you pass a  search  query
+ Listing without  search  keeps paging and accurate totals. With  search :
+ One page only, with a maximum of 100 items.   limit  is capped at 100 (it was 1,000),  offset  is ignored without an error, and there's no second page. Filter your results with  category ,  username , or  pricingModel  instead of paging.
+ total  and  count  change meaning.  Both now equal the number of items returned, not the number of matches. A loop that fetches until  offset >= total  stops after one request.
+ New ranking.  The order and the set of results differ from before. For authenticated calls, ranking is personalized to your account. Results are cached for 5 minutes.
+ All calls
+ sortBy  is ignored.  The API still accepts it without an error, but it has no effect. Search results come back by relevance, and listings without  search  come back in Apify Store order. Sort on your side if you need a specific order.
+ category  values changed.   category  now takes comma-separated category IDs, case-insensitive, and an Actor must match all of them. Old keys such as  SOCIAL_MEDIA  still work, and an unknown value returns a  400  error. Categories are assigned automatically from a larger list, so the same category can return different Actors than before.
+ Item fields changed
+ {
+ - "actorReviewRating" : 4.7 ,
+ - "actorReviewCount" : 370 ,
+ - "bookmarkCount" : 2298 ,
+ + "isVerified" : true ,
+ + "readmeSummary" : "Extract data from TikTok videos…" ,
+ "stats" : {
+ "totalUsers" : 369123 ,
+ "actorReviewRating" : 4.7 ,
+ "actorReviewCount" : 370 ,
+ - "bookmarkCount" : 2298 ,
+ - "totalBuilds" : 3831 ,
+ - "publicActorRunStats30Days" : { … }
+ }
+ }
… diff truncated (72 added / 28 removed lines)
```

### apify.sdk.javascript.changelog

- Vendor: Apify
- Source: https://docs.apify.com/sdk/js/reference/changelog
- Change: unchanged
- Prior hash: ec5d64ffd9e0fc089a1bcd19f051ef87a96474f34e3056b0b3b66c7cc6bc5b42
- Current hash: 0a481d6a9b075eb0669655ce3a9ddc8ef5b132f6afd939aa0e087882e50ec72b

```diff
- * `Apify.metamorph()` is now just a shortcut for running `ApifyClient.task(taskId).metamorph(input, options)`, while also taking the ACTOR\_RUN\_ID inside env vars into account
+ * `Apify.metamorph()` is now just a shortcut for running `ApifyClient.task(taskId).metamorph(input, options)`, while also taking the ACTOR_RUN_ID inside env vars into account
```

### exa.docs.changelog

- Vendor: Exa
- Source: https://exa.ai/docs/changelog
- Change: unchanged
- Prior hash: aff1047f2ff77aef4b95d65a58af004dcdb4475ca08f3f1be7420707f71fedad
- Current hash: 08227a7bf0e26ffcd6cf8b6418e279be214e1c2d2a694b28fbd7a93c29c54c52

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
- [Read the Dynamic Highlights guide →](/docs/reference/contents-api-guide)
- </Update>
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
- Query it via the API with the `publication` [search category](/docs/reference/search-api-guide), or [try it in the dashboard →](https://dashboard.exa.ai/playground/search?type=instant).
- [Read the Exa MCP guide →](/docs/reference/exa-mcp) · [Read the Exa Agent guide →](/docs/reference/agent-api-guide) · [Announcement tweet →](https://x.com/ExaAILabs/status/2072389192458592672)
- </Update>
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
+ > The Exa API is served at https://api.exa.ai. Authenticate with `Authorization: Bearer $EXA_API_KEY` (or `x-api-key: $EXA_API_KEY`); create keys at https://dashboard.exa.ai/api-keys?utm_source=docs&utm_medium=docs&utm_campaign=markdown_instructions. Every way an agent can get access to Exa is described at https://exa.ai/auth.md.
+ > Prefer the official SDKs, `exa-py` (`pip install exa-py`) and `exa-js` (`npm install exa-js`); both read `EXA_API_KEY` from the environment.
+ > Tool-using agents can call Exa without writing code through the hosted MCP server at https://mcp.exa.ai/mcp, or install the Exa agent skill with `npx skills add exa-labs/agent-skills` (skill file: https://exa.ai/docs/skill.md).
+ > The OpenAPI specs at https://exa.ai/docs/exa-spec.yaml and https://exa.ai/docs/team-management-spec.yaml are the source of truth for request and response schemas.
+ **November 13, 2026**
+ ## Exa Search in the EU
+ Exa Search is now available in the European Union.
+ [Talk to sales →](https://exa.ai/contact/sales) · [Read the announcement →](https://exa.ai/blog/eu-data-residency)
+ **October 29, 2026**
+ ## Monitors v2
+ Monitors now cost \$2 / 1k requests, down from \$15, and deliver fewer, more relevant updates. Existing monitors keep working with no code changes.
+ * **Full index coverage**: monitors search the entire Exa index, including places, podcasts, and product listings.
+ * **Stricter filtering**: each run drops pages the monitor has already returned, then keeps only pages that are relevant, come from a legitimate source, add new information, and match the event's timing.
+ * **Structured output**: each run returns a summary, or JSON matching your `outputSchema`, with sources and confidence in `output.grounding`.
+ [Read the Monitors guide →](https://exa.ai/docs/monitors/quickstart.md) · [Read the announcement →](https://exa.ai/blog/monitors-v2)
+ **October 29, 2026**
+ ## Exa Podcasts
+ Exa's index now includes 3.2 million podcast episodes from 119,000 shows, with full transcripts. New episodes are added soon after they air.
+ * **Structured results**: show and episode titles, publisher, description, hosts and guests, publish date, duration, and the full transcript with speaker labels.
+ * **No extra cost**: podcast results are available on every endpoint at no additional charge. Ask for podcast content in the query.
+ [Explore search data →](https://exa.ai/docs/search/data/overview.md) · [Try it in the dashboard →](https://dashboard.exa.ai/playground/search?q=podcast%20episodes%20where%20founders%20discuss%20pricing%20mistakes\&utm_source=docs\&utm_medium=docs\&utm_campaign=changelog) · [Read the announcement →](https://exa.ai/blog/podcast-search)
+ **October 19, 2026**
+ ## Lite search, recommended search types, and search warnings
+ The search types we recommend are now `lite`, `auto`, and `deep`, and `/search` tells developers when a request doesn't do what they expect.
+ `lite` is a new search type for latency- and cost-sensitive projects. Set `type: "lite"` on `/search`.
+ * **Pricing**: \$4 / 1k requests with up to 10 results, plus \$1 / 1k results above 10.
+ * **Cached content**: `lite` serves page content from Exa's cache and never fetches a page live.
+ * **A focused parameter set**: query, result count, highlights and text, categories (including `company` and `people`), domain and published-date filters, location, and moderation. The guide lists every supported parameter. A parameter `lite` does not support returns a `400` that names it, so an option never silently fails to apply.
+ `fast`, `instant`, and `deep-reasoning` are legacy and keep working at their current prices. Each has an alternative for new requests:
+ * **`instant`**: use `lite`.
+ * **`fast`**: use `lite`, which runs the same search as `fast`, or `auto` when the request needs a parameter `lite` does not support.
+ * **`deep-reasoning`**: use `deep`, or [Exa Agent](https://exa.ai/docs/agent/quickstart.md) for long-running research, list building and multi-hop enrichment.
+ Search responses now explain themselves, to you and to your agent:
+ * **Warnings**: the `warnings` array flags request fields that have no effect, such as `startCrawlDate`, and says what to send instead.
+ * **Notices**: the `notices` array tells the model reading the results how they were produced, such as when no page matched a `site:` operator and the search ran without it.
+ * **SDK support**: `exa-py` and `exa-js` 2.26.0 log each warning once, so ignored fields surface during development. Their web search tools pass notices to the model with the results.
+ * **Deprecated options flagged**: TypeScript marks ignored options as `@deprecated`, and Python raises a `DeprecationWarning` before the request is sent.
+ [Read the Lite guide →](https://exa.ai/docs/search/quickstart.md#lite) · [Read about warnings and notices →](https://exa.ai/docs/search/best-practices.md#warnings-and-notices) · [Configure SDK warnings →](https://exa.ai/docs/sdks/quickstart.md#warnings)
+ **October 5, 2026**
… diff truncated (116 added / 217 removed lines)
```

### exa.docs.contents-retrieval

- Vendor: Exa
- Source: https://exa.ai/docs/contents/quickstart.md
- Change: unchanged
- Prior hash: 60c952eb599af0c78133a64791aa6f2bc06e6c559ea01c08c3305b41dd074bdc
- Current hash: 211ad5eec7ba74c71c7a641a1da0cbbc485c2a16b3eb470cca2af0d2bfe17252

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
- ```json theme={null}
- "query": "latest product updates",
- "contents": {
- "text": {
- "verbosity": "standard",
- "includeSections": ["body", "header"]
- },
- "maxAgeHours": 0
- Equivalent `/contents` configuration:
- ```json theme={null}
- "ids": ["https://example.com"],
- "text": {
- "excludeSections": ["navigation", "footer", "sidebar"]
- },
+ > ## Agent Instructions
+ > The Exa API is served at https://api.exa.ai. Authenticate with `Authorization: Bearer $EXA_API_KEY` (or `x-api-key: $EXA_API_KEY`); create keys at https://dashboard.exa.ai/api-keys?utm_source=docs&utm_medium=docs&utm_campaign=markdown_instructions. Every way an agent can get access to Exa is described at https://exa.ai/auth.md.
+ > Prefer the official SDKs, `exa-py` (`pip install exa-py`) and `exa-js` (`npm install exa-js`); both read `EXA_API_KEY` from the environment.
+ > Tool-using agents can call Exa without writing code through the hosted MCP server at https://mcp.exa.ai/mcp, or install the Exa agent skill with `npx skills add exa-labs/agent-skills` (skill file: https://exa.ai/docs/skill.md).
+ > The OpenAPI specs at https://exa.ai/docs/exa-spec.yaml and https://exa.ai/docs/team-management-spec.yaml are the source of truth for request and response schemas.
+ # Contents API
+ > Extract text, highlights, and summaries from any URL.
+ Exa Contents is a content extraction API that returns clean page content from URLs, handling JavaScript-rendered pages, PDFs, and complex layouts automatically.
+ All contents features are also available in [Exa Search](https://exa.ai/docs/search/quickstart.md) for returned URLs, at no extra charge up to 10 results per search (\$1/1000 pages afterwards). We recommend using Search in this way instead of Contents for web search tool use cases.
+ > [!TIP]
+ >
+ > For search results feeding AI context, request `contents: { highlights: true }` on `/search` —
+ > Exa sizes each result's excerpts to its relevance. See [Highlights](https://exa.ai/docs/search/highlights.md).
+ ## Make your first request
+ Pass one or more URLs or document IDs and request highlights for the parts relevant to your task. In HTTP requests, provide them in `ids`:
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
… diff truncated (283 added / 121 removed lines)
```

### exa.docs.index

- Vendor: Exa
- Source: https://exa.ai/docs/llms.txt
- Change: changed
- Prior hash: a60fc40b1adbc761c928a7f484208dca1a9cd9723fa58781c0ab783e862abd0d
- Current hash: 0d037fa197190858bddad45d263f14a7a01d6bd3536d4a1f0dcbeb8479fa5f02

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
+ > The Exa API is served at https://api.exa.ai. Authenticate with `Authorization: Bearer $EXA_API_KEY` (or `x-api-key: $EXA_API_KEY`); create keys at https://dashboard.exa.ai/api-keys?utm_source=docs&utm_medium=docs&utm_campaign=markdown_instructions. Every way an agent can get access to Exa is described at https://exa.ai/auth.md.
+ > Prefer the official SDKs, `exa-py` (`pip install exa-py`) and `exa-js` (`npm install exa-js`); both read `EXA_API_KEY` from the environment.
+ > Tool-using agents can call Exa without writing code through the hosted MCP server at https://mcp.exa.ai/mcp, or install the Exa agent skill with `npx skills add exa-labs/agent-skills` (skill file: https://exa.ai/docs/skill.md).
+ > The OpenAPI specs at https://exa.ai/docs/exa-spec.yaml and https://exa.ai/docs/team-management-spec.yaml are the source of truth for request and response schemas.
+ - [Start building with Exa](https://exa.ai/docs/index.md): A powerful web search tool designed for agents. Everything optimized to get you token-efficient, accurate results.
+ - [Developer quickstart](https://exa.ai/docs/get-started/quickstart.md): Get an API key, then use Exa from your code or your agent.
+ - [Exa MCP](https://exa.ai/docs/get-started/exa-mcp.md): Exa MCP server: connect ChatGPT, Codex, Claude, Grok, Cursor, and any other MCP client to Exa's web search, page fetching, Exa Agent, and Exa Connect tools.
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
+ - [Companies & People](https://exa.ai/docs/search/data/companies-people.md): Find companies, professional profiles, and the relationships between them with Exa Search. Covers people search, company search, and recruiting.
+ - [Financial Markets](https://exa.ai/docs/search/data/financial.md): Find market data, filings, earnings calls, and economic releases with Exa Search.
+ - [Research Publications](https://exa.ai/docs/search/data/research.md): Find academic papers, patents, grants, clinical trials, and regulatory approvals with Exa Search.
+ - [Legal & Public Records](https://exa.ai/docs/search/data/legal.md): Find legal entities, court opinions, patents, sanctions, government contracts, and other public records with Exa Search.
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
… diff truncated (151 added / 158 removed lines)
```

### exa.docs.search

- Vendor: Exa
- Source: https://exa.ai/docs/reference/search
- Change: changed
- Prior hash: 68bb3178990f619909564908c08ea73d474b8c9dcbca7572e9d393abaf650a4f
- Current hash: 0394b52725ea2d408d9ff24d03baa71874eae563e8f5f12b86751215be13a53b

```diff
- <Card title="Get your Exa API key" icon="key" horizontal href="https://dashboard.exa.ai/api-keys" />
- ````yaml post /search
- tags: []
- example:
- requestId: b5947044c4b78efa9552a7c89b306d95
- - title: A Comprehensive Overview of Large Language Models
- url: https://arxiv.org/pdf/2307.06435.pdf
- publishedDate: '2023-11-16T01:36:32.547Z'
- author: >-
- Humza Naveed, University of Engineering and Technology
- (UET), Lahore, Pakistan
- id: https://arxiv.org/abs/2307.06435
- image: https://arxiv.org/pdf/2307.06435.pdf/page_1.png
- favicon: https://arxiv.org/favicon.ico
- text: >-
- Abstract Large Language Models (LLMs) have recently
- demonstrated remarkable capabilities...
- - Such requirements have limited their adoption...
- summary: >-
- This overview paper on Large Language Models (LLMs)
- highlights key developments...
- resolvedSearchType: neural
- total: 0.007
- neural: 0.007
- Payment required. For API-key requests this is the standard error
- envelope (out of credits or a budget exceeded). On x402-priced
- endpoints, requests without an API key instead receive an x402
- payment challenge with tag `X402_PAYMENT_REQUIRED`: the envelope
- extended with x402 payment metadata (`x402Version`, `resource`,
- `accepts`, and optional `extensions`) describing how to pay for the
- example:
- - arxiv.org
- - exa.ai/blog
- example:
- - docs.python.org/3
- Deprecated and has no effect; ignored by the API. Must be
- specified in ISO 8601 format.
- example: '2023-01-01T00:00:00.000Z'
- Deprecated and has no effect; ignored by the API. Must be
- specified in ISO 8601 format.
+ > ## Agent Instructions
+ > The Exa API is served at https://api.exa.ai. Authenticate with `Authorization: Bearer $EXA_API_KEY` (or `x-api-key: $EXA_API_KEY`); create keys at https://dashboard.exa.ai/api-keys?utm_source=docs&utm_medium=docs&utm_campaign=markdown_instructions. Every way an agent can get access to Exa is described at https://exa.ai/auth.md.
+ > Prefer the official SDKs, `exa-py` (`pip install exa-py`) and `exa-js` (`npm install exa-js`); both read `EXA_API_KEY` from the environment.
+ > Tool-using agents can call Exa without writing code through the hosted MCP server at https://mcp.exa.ai/mcp, or install the Exa agent skill with `npx skills add exa-labs/agent-skills` (skill file: https://exa.ai/docs/skill.md).
+ > The OpenAPI specs at https://exa.ai/docs/exa-spec.yaml and https://exa.ai/docs/team-management-spec.yaml are the source of truth for request and response schemas.
+ > [card] [Get your Exa API key](https://dashboard.exa.ai/api-keys?utm_source=docs\&utm_medium=docs\&utm_campaign=get_key_card)
+ >
+ > Create a key in the dashboard. New accounts start with free credits.
+ ````yaml exa-spec.yaml POST /search
+ Payment required. API-key requests receive the standard error
+ envelope when the team is out of credits or a spending budget is
+ exceeded. On x402-priced endpoints, requests without an API key
+ receive an x402 payment challenge with tag `X402_PAYMENT_REQUIRED`
+ that describes how to pay.
+ '403':
+ $ref: '#/components/responses/ForbiddenResponse'
+ '503':
+ $ref: '#/components/responses/ServiceUnavailableResponse'
+ x-codeSamples:
+ - lang: bash
+ source: |-
+ curl -X POST https://api.exa.ai/search \
+ -H "x-api-key: $EXA_API_KEY" \
+ -H "Content-Type: application/json" \
+ -d '{
+ "query": "<query>",
+ "type": "auto",
+ "contents": {
+ "highlights": true
+ }
+ }'
+ - lang: javascript
+ source: |-
+ import Exa from "exa-js";
+ const exa = new Exa(process.env.EXA_API_KEY);
+ const result = await exa.search("<query>", {
+ type: "auto",
+ contents: { highlights: true },
+ });
+ - lang: python
… diff truncated (473 added / 372 removed lines)
```

### firecrawl.docs.index

- Vendor: Firecrawl
- Source: https://docs.firecrawl.dev/llms.txt
- Change: changed
- Prior hash: 0ee47209638ef3a11ce3e9bd0c4ddeb30f2ce97fe507d288618f19dec5c39bea
- Current hash: fe7fbbe39463ed0c4646eb9599a0128a616c9e851a3155b7e9e2c5b73dcb5c26

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
+ - [v2 (253 pages)](https://docs.firecrawl.dev/_llms/en/v2.txt): Documentation, SDKs, API Reference, Build with AI.
+ ## v1
+ - [English / v2 (253 pages)](https://docs.firecrawl.dev/_llms/en/v2.txt): Documentation, SDKs, API Reference, Build with AI.
+ - [English / v2 / Documentation (140 pages)](https://docs.firecrawl.dev/_llms/en/v2/documentation.txt): Get Started, Core Endpoints, More, Quickstarts, Developer Guides, Webhooks, Use Cases, Other, Contributing.
+ - [Spanish (246 pages)](https://docs.firecrawl.dev/_llms/es.txt): v2, v1.
+ - [Spanish / v2 (246 pages)](https://docs.firecrawl.dev/_llms/es/v2.txt): Documentación, SDKs, Referencia de la API, Crear con IA.
+ - [Spanish / v2 / Documentación (136 pages)](https://docs.firecrawl.dev/_llms/es/v2/documentacion.txt): Primeros pasos, Endpoints principales, Más, Inicios rápidos, Guías para desarrolladores, Webhooks, Casos de uso, Otros, Contribuciones.
+ - [French (246 pages)](https://docs.firecrawl.dev/_llms/fr.txt): v2, v1.
+ - [French / v2 (246 pages)](https://docs.firecrawl.dev/_llms/fr/v2.txt): Documentation, SDKs, Référence de l’API, Créer avec l’IA.
+ - [French / v2 / Documentation (136 pages)](https://docs.firecrawl.dev/_llms/fr/v2/documentation.txt): Prise en main, Points de terminaison de base, Plus, Démarrages rapides, Guides développeur, Webhooks, Cas d'utilisation, Autres, Contribuer.
+ - [Japanese (246 pages)](https://docs.firecrawl.dev/_llms/ja.txt): v2, v1.
+ - [Japanese / v2 (246 pages)](https://docs.firecrawl.dev/_llms/ja/v2.txt): ドキュメント, SDK, APIリファレンス, AIで構築.
+ - [Brazilian Portuguese (246 pages)](https://docs.firecrawl.dev/_llms/pt-br.txt): v2, v1.
+ - [Brazilian Portuguese / v2 (246 pages)](https://docs.firecrawl.dev/_llms/pt-br/v2.txt): Documentação, SDKs, Referência da API, Desenvolva com IA.
+ - [Brazilian Portuguese / v2 / Documentação (136 pages)](https://docs.firecrawl.dev/_llms/pt-br/v2/documentacao.txt): Primeiros passos, Endpoints principais, Mais, Guias de início rápido, Guias para desenvolvedores, Webhooks, Casos de uso, Outros, Como contribuir.
+ - [Chinese (246 pages)](https://docs.firecrawl.dev/_llms/zh.txt): v2, v1.
+ - [Chinese / v2 (246 pages)](https://docs.firecrawl.dev/_llms/zh/v2.txt): 文档, SDK, API 参考, 使用 AI 构建.
+ This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.
```

### firecrawl.github.releases

- Vendor: Firecrawl
- Source: https://github.com/firecrawl/firecrawl/releases
- Change: changed
- Prior hash: 5057be387b05021d313e046f69305f39e31b4c7eb4dc7fe4f64d051d57480343
- Current hash: 660375fd585f44d7dcc96653ae0332b22863744b53802db3d56ab92b5244df1a

```diff
- firecrawl
- /
- firecrawl
- Public
- Notifications
- You must be signed in to change notification settings
- Fork
- 9.7k
- Star
- 177k
- Releases: firecrawl/firecrawl
- Release list
- Jump to release
- 35 people reacted
+ Repository navigation
+ Releases
+ 36 people reacted
```

### firecrawl.product.changelog

- Vendor: Firecrawl
- Source: https://www.firecrawl.dev/changelog
- Change: changed
- Prior hash: 946304cbdfd0615a50a7c5467e041c0fa5c1252d898b051df119455a93d03e40
- Current hash: 7197e0122bad4c142f5797905ff8dc9d4dc6bf0d96c014f7e13ed2799fd04fb6

```diff
- Changelog | Firecrawl
- Introducing the Firecrawl Developer Index, built for supercharging coding agents. Read the announcement →
- 176.8K Sign up
- Changelog
- Aug 20, 2026
- Firecrawl Developer Index
- The Firecrawl Developer Index is now available, a specialized index for coding agents. It covers 70M+ artifacts across READMEs, external documentation, issues, pull requests, and OpenAPI specs, with semantic retrieval and metadata filters. Your AI agents answer questions about code behavior, API contracts, error messages, and known bugs from primary sources instead of general web pages.
- Highlights
- Highest recall of any major coding-specific index. Scores 0.63 recall@10 across the 1,179 real developer queries in our open DevDex benchmark , ahead of every other provider we tested.
- 70M+ artifacts. READMEs, docs, issues, PRs, and OpenAPI specs from the most popular public repos and documentation sites, refreshed continuously with most sources updated daily.
- Answers with passages. Every result carries a stable id, a url, and the matched passages in markdown, so your agents act on the answer without a second scrape.
- Rich filters in the API. Scope by result type, repository, documentation source, language, topic, license, minimum stars, and more. These are API-only; agents on the CLI and MCP perform best without them.
- Keyless to start. No API key needed to try it; add one for higher rate limits. A developer search costs 2 credits per 10 results.
- Available everywhere you build. Query it through the API at /search/developer , plus the CLI, MCP, and SDKs, or install the companion skill with npx -y firecrawl-cli@latest setup developer-index .
- Read the full blog here .
- Aug 13, 2026
- Life Sciences in Firecrawl Research Index
- The Life Sciences category is now available in Firecrawl Research Index . It covers 41M+ papers across the drug discovery, clinical trial, and biology literature. Your AI agents get citable papers back for a query and can pull the full text on demand. The whole index is also free to use now.
- Highlights
- High-recall retrieval. The index hits 90% recall@10 on our paper-retrieval eval, so your AI agents find more of what matters on the first page of results.
- Millions of life sciences papers. The corpus holds 41M+ papers from authoritative sources and refreshes daily, so your AI agents only cite domain-specific literature.
- Abstract to full text. Your AI agents search abstracts to find the right papers, then pull the full text to verify a claim against the source.
- No DIY stack. Research Index stands in for the source APIs plus the parsing and ranking you would otherwise build yourself.
- Free to use. Every category is free, the AI and ML literature it already carried alongside the new Life Sciences papers.
- Available everywhere you build. Query it through the API at /search/research , plus the CLI, MCP, and SDKs.
- Read the full blog here .
- Jul 22, 2026
- Introducing our most accurate /search yet
- Firecrawl /search now returns the excerpts that best answer your query from each result. Agents using it achieve state-of-the-art accuracy on SimpleQA while using 10x fewer tokens than processing full pages.
- Highlights
- Custom relevance model — A custom model scores every paragraph, list, and table against your query, returning the most relevant excerpts structured and ready for your agent to use.
- State-of-the-art accuracy on SimpleQA — Agents using Firecrawl /search score 94.7% on SimpleQA, higher than any other provider.
- 10x fewer tokens than full pages — The relevant excerpts returned by /search take up far less of your agent's context window and are cheaper and faster to reason over.
- Nothing to change in your code — The API shape is unchanged, so existing /search calls get better results automatically.
- Read the full announcement here .
- Jul 1, 2026
- Web-scale /monitor
- Web-scale /monitor watches the entire web for you. Define search queries and a goal, and Firecrawl pings you or your agent the moment something new comes online.
- Highlights
- Always-on web search — Give /monitor search queries and a goal , and it searches the entire web on your schedule, alerting you when something new matches.
+ # Firecrawl Changelog
+ Product updates from Firecrawl, newest first. Each entry links to its own markdown page.
+ - [Firecrawl Alexandria now covers 4,000,000+ podcast episodes](/changelog/alexandria-podcasts.md) (November 20, 2026): Firecrawl Alexandria now covers 4,000,000+ podcast episodes, with 150K+ new episodes every week, same-day takes, and exact quotes with timestamps.
+ - [Introducing the Firecrawl plugin for Grok Bot](/changelog/grok-bot-mcp.md) (November 19, 2026): Give your agents 3,300+ data tools, specialized indexes and the live web, and lift answer quality 21% through Alexandria in the Grok Bot marketplace.
+ - [Introducing Firecrawl Local](/changelog/firecrawl-local.md) (November 18, 2026): Firecrawl rebuilt for agents to scrape locally. Rust based, 37x faster (vs self-hosted), 230x less memory, 100% open source.
+ - [Introducing UltraSearch for agents](/changelog/ultrasearch.md) (November 17, 2026): UltraSearch for agents. Search results come with data snippets on 250M+ people, 75M+ companies, 150K+ stocks with live prices and more.
+ - [Firecrawl Alexandria now covers 75M+ companies](/changelog/company-data-relaunch.md) (November 13, 2026): Firecrawl Alexandria now covers 75M+ companies. Get headcount, revenue, funding and tech stack in ~0.5 seconds, with 3,000+ tools and provider waterfalls.
+ - [Introducing Firecrawl MCP v3](/changelog/firecrawl-mcp-v3.md) (November 12, 2026): Give your agents 3000+ tools with automatic provider waterfalls, 60x higher rate limits, 4x more usage, and parallel subtasks. Available for every harness.
+ - [AI/ML Research Index in ChatGPT & Claude](/changelog/ai-ml-research-index.md) (November 11, 2026): Ask ChatGPT, Claude, or any agent harness with Firecrawl to find the right AI/ML paper, even one posted today, and read its full text.
+ - [Introducing job search tools for ChatGPT & Claude](/changelog/job-tools.md) (November 10, 2026): Match your resume to 7M+ open roles, find execs to email from 250M+ people and see what they care about before you reach out.
+ - [200K GitHub stars, and 2,000 plushies to say thanks](/changelog/200k-github-stars.md) (November 9, 2026): We hit 200K GitHub stars, so we made 2,000 plushies to say thanks, and you can claim yours with the Firecrawl plugin while supplies last.
+ - [Introducing SEC filings for ChatGPT and Claude](/changelog/sec-filings.md) (November 6, 2026): Give your AI agents SEC filings from 8,000+ public companies: 10-Ks, 8-Ks, insider trades and 13F holdings in Alexandria.
+ - [Introducing free life sciences research for ChatGPT and Claude](/changelog/life-sciences-research.md) (November 5, 2026): Ask ChatGPT or Claude about a drug, disease or gene and get answers drawn from 41M+ life sciences research papers in one step.
+ - [Legal Retrieval Benchmark: three search APIs on 581 official-document requests](/changelog/legal-retrieval-benchmark.md) (November 4, 2026): Three search APIs on 581 legal research requests, scored against the official document. The Government & Legal Index leads on gold@1 and gold@10.
+ - [Introducing free Election Records in Alexandria](/changelog/election-records-launch.md) (November 3, 2026): Ask your AI agents about all 470 House and Senate races: results as each state reports, who funds each campaign and how incumbents voted.
+ - [Introducing headless Clay for agents](/changelog/headless-clay.md) (November 2, 2026): Build and run all of your enrichment flows in ChatGPT and Claude. Search 250M+ people and 26M+ companies, with 1,000 free credits a month.
+ - [Firecrawl is now live in eve](/changelog/eve-integration.md) (October 30, 2026): Firecrawl is now an integration in eve, Vercel's open-source agent framework. One command gives your agents the web and beyond with Alexandria.
+ - [Introducing Cybersecurity Data in Alexandria](/changelog/cyber-security-data-pack.md) (October 29, 2026): Your Codex and Claude Code agents can now check your code's dependencies for 400,000+ vulnerabilities and patch them before attackers find them.
+ - [Introducing Directory](/changelog/introducing-directory.md) (October 28, 2026): Free recruiting data for ChatGPT and Claude. Describe a role and get a shortlist from 250M+ profiles in Alexandria, with experience and work emails.
+ - [Introducing the Government & Legal Index](/changelog/government-legal-index.md) (October 22, 2026): Give your AI agents statutes, regulations, local codes and court opinions from 30 million US government pages, free to search in ChatGPT, Claude and the API.
+ - [The Company Enrichment Benchmark](/changelog/company-enrichment-benchmark.md) (October 21, 2026): We tested the leading company enrichment providers on hundreds of U.S. companies to see who delivers accurate data and where information is missing.
+ - [Free People Data for ChatGPT and Claude](/changelog/people-data-relaunch.md) (October 20, 2026): Give your AI agents access to 270M+ company and people records in Alexandria, with 1,000 free credits a month through the Firecrawl plugin.
+ - [Firecrawl for Google Cloud](/changelog/google-cloud-launch.md) (October 19, 2026): We're partnering with Google Cloud to give Gemini and ADK agents data from the web and beyond, available on Google Cloud Marketplace.
+ - [Introducing Fireround](/changelog/fireround.md) (October 15, 2026): Fireround is a new company funding data provider built by Firecrawl. Follow new rounds and research investors in ChatGPT and Claude through Alexandria.
+ - [Introducing the Marketing Data Pack in Alexandria](/changelog/alexandria-marketing-data-pack.md) (October 13, 2026): Uncover what gets traffic and attention, shape your SEO and GEO strategy, and create content and visuals with better references in ChatGPT or Claude.
+ - [Introducing Universal Scrape](/changelog/universal-scrape.md) (October 8, 2026): Web pages, files and a growing set of Alexandria providers, all with one Firecrawl API.
+ - [Fantasy sports data is live in Alexandria](/changelog/alexandria-fantasy-sports.md) (October 6, 2026): Use fantasy rankings, projections, sports betting odds and live news in ChatGPT or Claude to research your next lineup with Firecrawl.
+ - [People and company enrichment in Alexandria](/changelog/alexandria-people-enrichment.md) (October 1, 2026): Apollo, FullEnrich, and Data Legion give your agents people search, work email lookup, and company enrichment through Firecrawl.
+ - [Alexandria and the Developer Index are now in ChatGPT and Codex](/changelog/alexandria-chatgpt-codex.md) (September 29, 2026): Use the Firecrawl plugin to search and scrape the web, access 100+ Alexandria data providers, and research code with the Developer Index in ChatGPT and Codex.
+ - [Alexandria is now in Claude and Claude Code](/changelog/alexandria-claude.md) (September 24, 2026): Give Claude access to 100+ data providers and Firecrawl's specialized indexes alongside live web search and scraping.
+ - [Introducing Alexandria and our $75M Series B](/changelog/introducing-alexandria-series-b.md) (September 22, 2026): Meet Alexandria, the knowledge library for superintelligence, and our $75M Series B to invest in search and broader access to knowledge.
+ - [Firecrawl Developer Index](/changelog/developer-index-launch.md) (August 20, 2026): 70M+ primary sources across GitHub repos, docs, issues, and PRs, with the highest recall of any major coding-specific index.
+ - [Life Sciences in Firecrawl Research Index](/changelog/research-index-life-sciences-launch.md) (August 13, 2026): 41M+ papers across the drug discovery, clinical trial, and biology literature at 90% recall@10, and the whole index is free to use.
+ - [Introducing our most accurate /search yet](/changelog/improved-search-launch.md) (July 22, 2026): A new custom relevance model returns the excerpts that best answer your query. Agents using Firecrawl /search score 94.7% on SimpleQA, higher than with any other provider tested, while using 10x fewer tokens.
+ - [Web-scale /monitor](/changelog/web-monitoring-launch.md) (July 1, 2026): Always-on search across the entire web: define a query and goal, and get pinged or webhooked the moment something relevant comes online.
+ - [v2.11.0 is live](/changelog/v211.md) (June 24, 2026): Firecrawl v2.11.0 ships the Firecrawl Research Index, keyless endpoint access, automatic PII redaction, a deterministicJson format, and video discovery on any page - plus much more.
+ - [Firecrawl Research Index](/changelog/research-index-launch.md) (June 16, 2026): A specialized research index for AI agents: 3M+ arXiv papers and the GitHub code behind them, with state-of-the-art recall on arXivQA at comparable cost.
+ - [Introducing /monitor](/changelog/monitoring.md) (May 26, 2026): Notify your AI agent via webhook the moment a page or site changes, and use up to 90% fewer LLM tokens by only ingesting what actually changes.
+ - [v2.10 is live](/changelog/v210.md) (May 15, 2026): Firecrawl v2.10 ships the /parse endpoint, Lockdown Mode, Question and Highlights formats, and four new official SDKs.
+ - [Highlights Format](/changelog/highlights-format.md) (May 8, 2026): A new format for /scrape that returns the exact sentences, code blocks, and table rows on a page matching your query, verbatim, with up to 100x fewer tokens than a full scrape.
… diff truncated (99 added / 716 removed lines)
```

### gemini.api.changelog

- Vendor: Gemini
- Source: https://aistudio.google.com/docs/changelog
- Change: changed
- Prior hash: 0e5a056295d5000f94ffc33972344e95b57c85907fc7720b7ca9e0fdc625edc3
- Current hash: 6bc3aaf087d16da7bcc55457b135da12b3d123f365f11291fef212aecc168f5f

```diff
- Release notes | Gemini API | Google AI for Developers
- Skip to main content
- English
- Deutsch
- Español – América Latina
- Français
- Indonesia
- Italiano
- Polski
- Português – Brasil
- Shqip
- Tiếng Việt
- Türkçe
- Русский
- עברית
- العربيّة
- فارسی
- हिंदी
- বাংলা
- ภาษาไทย
- 中文 – 简体
- 中文 – 繁體
- 日本語
- 한국어
- Get API key
- Cookbook
- Community
- Gemini 3.8 Flash is now available. Try it out .
- Home
- Gemini API
- Docs
- Send feedback
- Release notes
- September 3, 2026
- Lyria 3.5 in public preview : Released the next generation of Google's music
- generation model:
- lyria-3.5 :
- Full-length song generation with improved musical coherence, natural vocals,
- and fine-grained duration and structural control.
- The model supports text and image inputs and generates high-fidelity 44.1 kHz
+ > ## AI Agent Context
+ > - Full documentation index: https://aistudio.google.com/llms.txt
+ > - Gemini Docs MCP server (consistent live info): https://gemini-api-docs-mcp.dev
+ > - Coding agent skills & setup guide: https://aistudio.google.com/docs/coding-agents.md
+ # Release notes
+ ## November 19, 2026 {% id="11-19-2026" %}
+ * **Genie 4 (`genie-4`) generally available (GA)**: Released
+ [Genie 4](/docs/models/genie-4) (`genie-4`) on the
+ [Interactions API](/docs/genie) (`v1beta`) for real-time interactive world
+ generation, streaming steerable 24 fps 16:9 video with synchronized
+ 48 kHz stereo audio over WebRTC and WebSockets. Seed worlds from text, a
+ 16:9 reference image, or both, and steer live with WASD/arrow keys and
+ mid-session text events. Available on the paid tier at
+ [pricing](/docs/pricing#genie-4) of $1.50 per 1M input tokens, $9.00
+ per 1M text output tokens, and $17.50 per 1M video output tokens
+ (~$0.10/sec, stereo audio included); see
+ [Interactive world generation with Genie 4](/docs/genie), the
+ [Genie 4 prompt and controls guide](/docs/genie-prompting), and
+ [rate limits](/docs/rate-limits#genie-4).
+ * **Tool retrieval (Preview)**: The Interactions API can now search your tool
+ library and load function schemas on demand, so large tool sets no longer
+ have to be sent in full on every request. Mark tools with `defer_loading:
+ true` and add a `{"type": "tool_search"}` tool to let Gemini retrieve
+ schemas for you, or set `execution: "client"` to run your own retrieval
+ logic. Remote MCP servers support `defer_loading` as well.
+ Tool Retrieval works with Gemini 3.6 and later models, including all Gemini
+ 4 models, in the Interactions API. See the
+ [Tool retrieval](/docs/tool-retrieval) guide.
+ ## November 18, 2026 {% id="11-18-2026" %}
+ * **Gemini 4 Neon (`gemini-4-neon`) generally available (GA)**: Released
+ [Gemini 4 Neon](/docs/models/gemini-4-neon) (`gemini-4-neon`), bringing
+ frontier-level intelligence with fast end-to-end task completion across
+ complex software engineering, knowledge work, and science workflows.
+ Available on the paid tier at [pricing](/docs/pricing#gemini-4-neon) of
+ $3.00 per 1M input tokens and $15.00 per 1M output tokens, `gemini-4-neon`
+ supports four [thinking levels](/docs/thinking#understanding-thinking-levels)
+ (`low`, `medium`, default `high`, and `xhigh`), a unified 1M-token context
+ window, and long decode up to 1M tokens. See
+ [What's new in Gemini 4 Neon](/docs/whats-new-gemini-4-neon) to get started.
+ * **Multimodal file processing and slicing**: You can now pass Microsoft
… diff truncated (1133 added / 876 removed lines)
```

### gemini.api.deprecations

- Vendor: Gemini
- Source: https://aistudio.google.com/docs/deprecations
- Change: changed
- Prior hash: 1419e17f5fee62496ccb49f6b1e340498de5f726b2e913d733a08907341c719d
- Current hash: 7d4db66565922a2b13917cb365c318ceb3b6426dbb61203e82b973cfb87925e8

```diff
- Gemini deprecations | Gemini API | Google AI for Developers
- Skip to main content
- English
- Deutsch
- Español – América Latina
- Français
- Indonesia
- Italiano
- Polski
- Português – Brasil
- Shqip
- Tiếng Việt
- Türkçe
- Русский
- עברית
- العربيّة
- فارسی
- हिंदी
- বাংলা
- ภาษาไทย
- 中文 – 简体
- 中文 – 繁體
- 日本語
- 한국어
- Get API key
- Cookbook
- Community
- Gemini 3.8 Flash is now available. Try it out .
- Home
- Gemini API
- Docs
- Send feedback
- Gemini deprecations
- This page lists the known deprecation schedules for stable (GA) and preview
- models in the Gemini API. A " deprecation " is the announcement that we
- no longer provide support for a model, and that it will be " shut down " in
- the near future. Once a model is " shutdown ", it is completely
- turned off, and the endpoint is no longer available.
- Deprecation announcements are made on the
- Release notes page, and the announced earliest
+ > ## AI Agent Context
+ > - Full documentation index: https://aistudio.google.com/llms.txt
+ > - Gemini Docs MCP server (consistent live info): https://gemini-api-docs-mcp.dev
+ > - Coding agent skills & setup guide: https://aistudio.google.com/docs/coding-agents.md
+ # Gemini deprecations
+ This page lists the known deprecation schedules for [stable
+ (GA)](/docs/models#stable) and [preview](/docs/models#preview) models and for
+ managed agents in the Gemini API. A "**deprecation**" is the announcement that
+ we no longer provide support for a model, and that it will be "**shut down**" in
+ the near future. Once a model is "**shutdown**", it is completely turned off, and
+ the endpoint is no longer available.
+ Deprecation announcements are made on the [Release notes](/docs/changelog) page,
+ and the announced earliest shutdown dates are tracked on this page. To pick an upgrade target for your workload, see [Choosing a model](/docs/choosing-a-model#upgrade-paths).
+ Already-shutdown models and agents are listed under the **Deprecated models**
+ and **Deprecated agents** sections.
+ {% callout type="note" %}
+ Note: The **shutdown dates listed in the table indicate the *earliest possible
+ dates* on which a model might be retired**. We will communicate the exact
+ shutdown date to users with advance notice to ensure a smooth transition to a
+ replacement model.
+ {% /callout %}
+ ## Gemini 4 models {% id="gemini-4-models" %}
+ {% table %}
+ * Model
+ * Release date
+ * Shutdown date
+ * Recommended replacement
+ ---
+ * `gemini-4-neon`
+ * November 18, 2026
+ * No shutdown date announced
+ *
+ ---
+ * `gemini-4-hydrogen`
+ * November 12, 2026
+ * No shutdown date announced
+ *
+ ---
+ * `gemini-4-carbon`
+ * November 10, 2026
… diff truncated (736 added / 380 removed lines)
```

### gemini.api.models

- Vendor: Gemini
- Source: https://aistudio.google.com/docs/models
- Change: changed
- Prior hash: 9e7c3711087835291ec307d34c1d8616b7a63dec501b96821b9bac81a45d2fb9
- Current hash: 67811c9407eebf43ffa166970b323fe1c32a3cb6a004a7040b23915bee5d4ba6

```diff
- Models | Gemini API | Google AI for Developers
- Skip to main content
- English
- Deutsch
- Español – América Latina
- Français
- Indonesia
- Italiano
- Polski
- Português – Brasil
- Shqip
- Tiếng Việt
- Türkçe
- Русский
- עברית
- العربيّة
- فارسی
- हिंदी
- বাংলা
- ภาษาไทย
- 中文 – 简体
- 中文 – 繁體
- 日本語
- 한국어
- Get API key
- Cookbook
- Community
- Gemini 3.8 Flash is now available. Try it out .
- Home
- Gemini API
- Docs
- Send feedback
- Models
- This guide introduces all the models available through the Gemini API.
- Gemini 3
- Stable
- Gemini 3.8 Flash
- Our most intelligent Flash model, engineered for long-horizon software engineering, autonomous agents, and complex enterprise workflows.
- New Stable
- Gemini 3.7 Flash
+ > ## AI Agent Context
+ > - Full documentation index: https://aistudio.google.com/llms.txt
+ > - Gemini Docs MCP server (consistent live info): https://gemini-api-docs-mcp.dev
+ > - Coding agent skills & setup guide: https://aistudio.google.com/docs/coding-agents.md
+ # Models
+ Not sure where to start? Read [Choosing a model](/docs/choosing-a-model) to compare reasoning depth, speed, and cost across Gemini models, or see [Latest Gemini models](/docs/latest-model).
+ ## Gemini 4 {% id="gemini-4" %}
+ {% card-grid columns="3" %}
+ {% card description="Our strongest reasoning model, built for complex software engineering, multimodal knowledge work, scientific reasoning, and cybersecurity defense." title="Gemini 4 Carbon" variant="model-card" %}
+ {% section class="model-specs" %}
+ * *Model code* **gemini-4-carbon**
+ * *Context* **1M tokens**
+ * *Max output* **64K / 1M tokens**
+ * *Modalities* **Text, Image, Audio, Video, PDF**
+ {% /section %}
+ {% section class="card-actions" %}
+ {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-4-carbon" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/models/gemini-4-carbon" icon="arrow_forward" tooltip="View models" variant="icon-primary" /%}
+ {% /section %}
+ {% /card %}
+ {% card description="Frontier-level intelligence with fast end-to-end task completion across complex software engineering, knowledge work, and science workflows." title="Gemini 4 Neon" variant="model-card" %}
+ {% section class="model-specs" %}
+ * *Model code* **gemini-4-neon**
+ * *Context* **1M tokens**
+ * *Max output* **64K / 1M tokens**
+ * *Modalities* **Text, Image, Audio, Video, PDF**
+ {% /section %}
+ {% section class="card-actions" %}
+ {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-4-neon" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/models/gemini-4-neon" icon="arrow_forward" tooltip="View models" variant="icon-primary" /%}
+ {% /section %}
+ {% /card %}
+ {% card description="Brings cutting-edge intelligence to everyone, with speed and efficiency for everyday coding and agentic workflows." title="Gemini 4 Hydrogen" variant="model-card" %}
+ {% section class="model-specs" %}
+ * *Model code* **gemini-4-hydrogen**
+ * *Context* **1M tokens**
+ * *Max output* **64K / 1M tokens**
+ * *Modalities* **Text, Image, Audio, Video, PDF**
+ {% /section %}
+ {% section class="card-actions" %}
+ {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-4-hydrogen" variant="primary" %}Try in AI Studio{% /button %} {% button href="/docs/models/gemini-4-hydrogen" icon="arrow_forward" tooltip="View models" variant="icon-primary" /%}
+ {% /section %}
… diff truncated (477 added / 294 removed lines)
```

### gemini.api.rate-limits

- Vendor: Gemini
- Source: https://aistudio.google.com/docs/rate-limits
- Change: changed
- Prior hash: 83459731700624cf0a0b103347724da7f0058a90929990d72f3794c0f95fba18
- Current hash: 6d1dfd7d7189f913a806528d7d110606704a982a4b51bb7b38329ad4a782d1f9

```diff
- Rate limits | Gemini API | Google AI for Developers
- Skip to main content
- English
- Deutsch
- Español – América Latina
- Français
- Indonesia
- Italiano
- Polski
- Português – Brasil
- Shqip
- Tiếng Việt
- Türkçe
- Русский
- עברית
- العربيّة
- فارسی
- हिंदी
- বাংলা
- ภาษาไทย
- 中文 – 简体
- 中文 – 繁體
- 日本語
- 한국어
- Get API key
- Cookbook
- Community
- Gemini 3.8 Flash is now available. Try it out .
- Home
- Gemini API
- Docs
- Send feedback
- Rate limits
- View your active rate limits in AI Studio
- How rate limits work
- Requests per minute ( RPM )
- Tokens per minute (input) ( TPM )
- Requests per day ( RPD )
- Rate limits are applied per project, not per API key. Requests per day ( RPD )
- conceptually similar to TPM. Other models might have a token per day limit (TPD).
+ > ## AI Agent Context
+ > - Full documentation index: https://aistudio.google.com/llms.txt
+ > - Gemini Docs MCP server (consistent live info): https://gemini-api-docs-mcp.dev
+ > - Coding agent skills & setup guide: https://aistudio.google.com/docs/coding-agents.md
+ # Rate limits
+ {% button href="https://aistudio.google.com/rate-limit?timeRange=last-28-days" variant="primary" %}View your active rate limits in AI Studio{% /button %}
+ ## How rate limits work {% id="how-rate-limits-work" %}
+ * Requests per minute (**RPM**)
+ * Tokens per minute (input) (**TPM**)
+ * Requests per day (**RPD**)
+ Rate limits are applied per project, not per API key. Requests per day (**RPD**)
+ conceptually similar to TPM. Other models might have a token per day limit
+ (TPD). Built-in tools also have specific rate limits. For example, Grounding
+ with Google Search on Gemini 3 and newer models is subject to a default limit of
+ 1,500 requests per day (RPD) per project on the Gemini Developer API (see
+ [Grounding with Google Search](/docs/google-search#pricing)).
+ ### Spend-based rate limits {% id="spend-rate-limits" %}
+ history and [usage tier](/docs/rate-limits#usage-tiers).
+ [usage tier](/docs/rate-limits#usage-tiers). These limits are evaluated on a rolling 10-minute
+ | Usage tier | Spend rate limit (per 10 minutes) |
+ | :--- | :--- |
+ | **Free** | N/A |
+ | **Tier 1** | $10 |
+ | **Tier 2** | $200 |
+ | **Tier 3** | $200 |
+ If you hit a spend-based rate limit, the API returns a `429 RESOURCE_EXHAUSTED`
+ * Wait and retry after a short period.
+ * Reduce the rate of expensive requests, for example by using smaller context
+ windows or shorter outputs.
+ * If you consistently hit this limit during normal usage,
+ [request a rate limit increase](/docs/rate-limits#request-rate-limit-increase).
+ ## Usage tiers {% id="usage-tiers" %}
+ | Usage tier | Qualification | [Billing tier cap](/docs/billing#tier-spend-caps) |
+ | :--- | :--- | :--- |
+ | **Free** | [Active project](/docs/api-key#google-cloud-projects) or free trial; some projects need [verification](/docs/verification) | N/A |
+ | **Tier 1** | [Set up and link an active billing account](/docs/billing#setup-billing) | $250 |
+ | **Tier 2** | Paid $100 + 3 days from first successful payment | $2,000 |
+ | **Tier 3** | Paid $1,000 + 30 days from first successful payment | $20,000 - $100,000+ |
+ ## Gemini API rate limits {% id="current-rate-limits" %}
+ {% button href="https://aistudio.google.com/rate-limit?timeRange=last-28-days" variant="primary" %}View your active rate limits in AI Studio{% /button %}
… diff truncated (384 added / 252 removed lines)
```

### gemini.api.tokens

- Vendor: Gemini
- Source: https://aistudio.google.com/docs/tokens
- Change: changed
- Prior hash: f95180ddfb1e9565726f8c59c593c456a3019f2772ce93c7992c26da1a749a64
- Current hash: 14bf8d9d8f983b03e7590b0bd800f653bfc44122def850b915b79df68e2a0e4d

```diff
- Understand and count tokens | Gemini API | Google AI for Developers
- Skip to main content
- English
- Deutsch
- Español – América Latina
- Français
- Indonesia
- Italiano
- Polski
- Português – Brasil
- Shqip
- Tiếng Việt
- Türkçe
- Русский
- עברית
- العربيّة
- فارسی
- हिंदी
- বাংলা
- ภาษาไทย
- 中文 – 简体
- 中文 – 繁體
- 日本語
- 한국어
- Get API key
- Cookbook
- Community
- Gemini 3.8 Flash is now available. Try it out .
- Home
- Gemini API
- Docs
- Send feedback
- Understand and count tokens
- called a token .
- For Gemini models, a token is equivalent to about 4 characters.
- 100 tokens is equal to about 60-80 English words.
- About tokens
- Tokens can be single characters like z or whole words like cat . Long words
- tokenization .
- When billing is enabled, the cost of a call to the Gemini API is
+ > ## AI Agent Context
+ > - Full documentation index: https://aistudio.google.com/llms.txt
+ > - Gemini Docs MCP server (consistent live info): https://gemini-api-docs-mcp.dev
+ > - Coding agent skills & setup guide: https://aistudio.google.com/docs/coding-agents.md
+ # Understand and count tokens
+ called a *token*.
+ **For Gemini models, a token is equivalent to about 4 characters.
+ 100 tokens is equal to about 60-80 English words.**
+ ## About tokens {% id="about-tokens" %}
+ Tokens can be single characters like `z` or whole words like `cat`. Long words
+ *tokenization*.
+ When billing is enabled, the [cost of a call to the Gemini API](/docs/pricing) is
+ ## Count tokens {% id="count-tokens" %}
+ * **Call `count_tokens` with the input of the request.** Returns the total
+ number of tokens in *the input only*. Make this call before sending input
+ * **Use the `usage` on the interaction response.** Returns token
+ counts for input (`total_input_tokens`), output (`total_output_tokens`),
+ thinking (`total_thought_tokens`), cached content
+ (`total_cached_tokens`), tool use (`total_tool_use_tokens`),
+ and total (`total_tokens`).
+ ### Count text tokens {% id="text-tokens" %}
+ {% tabs %}
+ {% tab label="Python" %}
+ ```python
+ client = genai.Client()
+ total_tokens = client.models.count_tokens(
+ model="gemini-4-hydrogen",
+ contents=prompt
+ print("total_tokens:", total_tokens.total_tokens)
+ interaction = client.interactions.create(
+ model="gemini-4-hydrogen",
+ input=prompt
+ print(interaction.usage)
+ ```
+ {% /tab %}
+ {% tab label="JavaScript" %}
+ ```javascript
+ import { GoogleGenAI } from '@google/genai';
+ const client = new GoogleGenAI({});
+ const prompt = "The quick brown fox jumps over the lazy dog.";
… diff truncated (730 added / 299 removed lines)
```

### hermes.docs.cli-commands

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/reference/cli-commands
- Change: changed
- Prior hash: e94d8ac78be7d44b7e8620e9ecdb58b28d4caa7d74744ff602769142b9c5066a
- Current hash: 729897a55370d93a0a133db9f7c465104a715f4e27625e28a017f404ec5ce754

```diff
- Diagnose and (optionally) rewrite config.yaml to replace references to retired models or deprecated settings (e.g. migrate xai ).
- Manage named, multi-folder workspaces (projects). Anchors desktop session grouping and, when bound to a kanban board, gives tasks a deterministic worktree + branch convention. State is per-profile.
- Manage MCP server configurations and run Hermes as an MCP server.
- OpenClaw migration helpers.
- Import a Claude Code ( ~/.claude ) or Codex CLI ( ~/.codex ) setup.
- Pull latest code and reinstall dependencies. --check previews without installing; --backup takes a pre-pull HERMES_HOME snapshot.
- Force a provider: auto , openrouter , nous , openai-codex , copilot-acp , copilot , anthropic , gemini , huggingface , novita (aliases novita-ai , novitaai ), openai-api , zai , kimi-coding , kimi-coding-cn , minimax , minimax-cn , minimax-oauth , kilocode , xiaomi , arcee , gmi , upstage (alias solar ), alibaba , alibaba-cn , alibaba-coding-plan (alias alibaba_coding ), alibaba-coding-plan-cn , alibaba-token-plan , alibaba-token-plan-cn , deepseek , nvidia , ollama-cloud , xai (alias grok ), xai-oauth (alias grok-oauth ), qwen-oauth , bedrock , opencode-zen , opencode-go , opencode-free (aliases free , opencode_free ; keyless), commandcode , commandcode-anthropic , ai-gateway , azure-foundry , lmstudio , stepfun , tencent-tokenhub (alias tencent , tokenhub ), router (aliases ramp-router , ramp ), nebius-token-factory (aliases nebius , nebius-tf , tokenfactory ), tencent-tokenplan (aliases tokenplan , tencent-lkeap ).
- Troubleshooting mode: disable ALL customizations — user config, rules/memory injection, plugins, shell hooks, and MCP servers (implies --ignore-user-config and --ignore-rules ). Use to isolate whether a problem comes from your setup or from Hermes itself.
- Session source tag for filtering (default: cli ). Use tool for third-party integrations that should not appear in user session lists.
- Maximum tool-calling iterations per conversation turn (default: 500, or agent.max_turns in config).
- hermes chat --safe-mode -q "Is this bug mine or Hermes'?"
- hermes -z "…" --usage-file /path/report.json writes a machine-readable usage report after the run: estimated_cost_usd , input_tokens / output_tokens / cache_read_tokens / cache_write_tokens / reasoning_tokens / total_tokens , api_calls , model , provider , session_id , service_tier , and completed / failed flags. The report is written even when the run fails , so batch pipelines can always account for spend. It has no effect outside -z / --oneshot , and a broken usage write never masks the run's own outcome.
- hermes -z "summarize this repo" --usage-file /tmp/usage.json
- jq .estimated_cost_usd /tmp/usage.json
- add a new provider (OpenRouter, Anthropic, Copilot, DeepSeek, custom, etc.)
- log into OAuth-backed providers (Anthropic, Copilot, Codex, Nous Portal)
- If you've only configured OpenRouter, /model will only show OpenRouter models. To add another provider (Anthropic, DeepSeek, Copilot, etc.), exit your session and run hermes model from the terminal.
- --external-supervisor is a restart-policy contract: an in-chat restart or
- service-restart update exits with status 75 , so the wrapper's supervisor must
- hermes send --to telegram "MEDIA:/tmp/screenshot.png"
- hermes send --to telegram "Build chart for today MEDIA:/tmp/chart.png" # with caption
- hermes send --to discord: #ops "MEDIA:/tmp/report.pdf"
- hermes send --to telegram "[[as_document]] MEDIA:/tmp/screenshot.png"
- hermes send --to discord: #ops --file /tmp/report.md
- Download and verify the pinned bws binary. --force re-downloads even if a managed copy already exists.
- hermes migrate < type >
- Diagnose and (optionally) rewrite the active config.yaml to replace references to retired models or deprecated settings. A timestamped backup of the original config.yaml is taken before any rewrite (skip with --no-backup ).
- Not to be confused with hermes claw migrate (one-shot import of OpenClaw configuration into Hermes) — hermes migrate is the top-level config-rewrite command.
- hermes auth spotify # Authenticate Hermes with Spotify via PKCE
- Subcommands: add , list , remove , reset , status , logout , spotify . When called with no subcommand, launches the interactive management wizard.
- hermes status [ --all ] [ --deep ]
- Show all details in a shareable redacted format.
- Run deeper checks that may take longer.
- Resume a paused job and compute its next future run.
- Create a new task on the active board. Flags: --body , --assignee , --parent (repeatable), --workspace scratch|worktree|dir:<path> , --tenant , --priority , --triage , --idempotency-key , --max-runtime , --max-retries , --skill (repeatable).
- For the full design — comparison with Cline Kanban / Paperclip / NanoClaw / Gemini Enterprise, eight collaboration patterns, four user stories, concurrency correctness proof — see docs/hermes-kanban-v1-spec.pdf in the repository or the Kanban user guide .
- hermes egress install --force # re-download even if already installed
- Projects are human-named workspaces that can span multiple folders / repos. They anchor desktop session grouping and, when bound to a kanban board, give tasks a deterministic worktree + branch convention. State is per-profile.
- Bind a kanban board to this project.
- Create a webhook route. Returns the URL and HMAC secret to configure on your service.
+ Python dependency commands on this page use a
+ PM-prepared source checkout .
+ After a dependency change, reactivate the checkout and restart Hermes.
+ hermes-agent (legacy single-query runner) ​
+ The install also ships hermes-agent , a minimal runner that sends one query and exits: hermes-agent --query "summarize README.md" (or hermes-agent "summarize README.md" ). hermes-agent --help lists its options ( --model , --base-url , --max-turns , --enabled-toolsets , --disabled-toolsets , --list-tools , --save-trajectories , …) and hermes-agent --version prints the version; neither starts the agent. Run with no query, it prints the same help and exits. For anything else use hermes ( hermes -z <prompt> is the scripted one-shot).
+ Move over from another agent ( migrate grok-bot , migrate claude-code , ... or bare to detect), or rewrite config.yaml for retired models and deprecated settings ( migrate xai ).
+ hermes codex-runtime
+ Noninteractive counterpart of /codex-runtime : migrate [--dry-run] [--json] regenerates the Hermes-managed block in ~/.codex/config.toml for the selected profile. See Codex app-server runtime .
+ hermes usage
+ Show the configured account's rate-limit windows (the /usage block) without a session; --json for scripts.
+ hermes pause / hermes resume
+ Global emergency stop: no new cron fires (built-in ticker, managed-cron webhook, misfire catch-up), kanban dispatch or gateway turns start until resumed. Interactive CLI, TUI and Desktop turns are gateway turns, so they are held too, and each surface shows "Hermes is paused" with the reason and "run hermes resume ". Turns already running finish; in-flight work is never killed.
+ Manage named, multi-folder workspaces (projects). Anchors desktop session grouping; kanban tasks linked to a project with a primary folder default to a deterministic worktree + branch. State is per-profile.
+ Manage MCP server configurations. Running Hermes as an MCP server is the mcp-serve plugin .
+ hermes connectors
+ List, connect, rename and disconnect hosted connector accounts.
+ hermes clipboard image
+ Write this machine's clipboard image to a file ( --json for scripts). Device-local: no gateway, no session store.
+ OpenClaw migration ( migrate , cleanup ), from the agent-importers plugin; hermes claw migrate is the same as hermes import-agent openclaw .
+ Import an OpenClaw, Claude Code, Codex CLI or Cursor setup (from the agent-importers plugin).
+ hermes webapp
+ Open the Desktop workspace in a browser, served by the gateway.
+ Update to the latest stable release (or the selected channel) and reinstall dependencies. --check previews without installing; --backup takes a pre-pull HERMES_HOME snapshot.
+ Force a provider: auto , openrouter , nous , openai-codex (aliases chatgpt , chatgpt-codex ), anthropic , gemini , huggingface , novita (aliases novita-ai , novitaai ), openai-api , zai , kimi-coding , kimi-coding-cn , minimax , minimax-cn , minimax-oauth , kilocode , xiaomi , arcee , gmi , upstage (alias solar ), alibaba , alibaba-cn , alibaba-coding-plan (alias alibaba_coding ), alibaba-coding-plan-cn , alibaba-token-plan , alibaba-token-plan-cn , deepseek , nvidia , ollama-cloud , xai (alias grok ), xai-oauth (alias grok-oauth ), qwen-oauth , bedrock , opencode-zen , opencode-go , commandcode , commandcode-anthropic , ai-gateway , azure-foundry , lmstudio , stepfun , tencent-tokenhub (alias tencent , tokenhub ), router (aliases ramp-router , ramp ), nebius-token-factory (aliases nebius , nebius-tf , tokenfactory ), tencent-tokenplan (aliases tokenplan , tencent-lkeap ).
+ --format stream-json
+ Emit structured JSONL for a -q / --query invocation. Implies --quiet ; cannot be combined with --tui .
+ Troubleshooting mode: disable ALL customizations — user config, rules/memory injection, plugins, shell hooks, and MCP servers (implies --ignore-user-config and --ignore-rules ). The gateway freezes code defaults plus your explicit options into the session and runs the turn in an isolated worker process that never reads the profile, so a broken config.yaml cannot block it. Requires an explicit --model (there is no profile default to inherit); pair with --provider custom --base-url <url> --api-key <key> for a fully explicit endpoint.
+ --base-url <url> / --api-key <key>
+ Explicit OpenAI-compatible endpoint and launch-only key for --provider custom . The key is held in the running gateway's memory for this session and never written to disk.
+ Session source tag for filtering (default: cli ; one-shot runs default to oneshot , which pickers hide). Use tool for third-party integrations that should not appear in user session lists. An explicit --source is always stored as given, even for a one-shot run launched from inside a TUI or Desktop session.
+ Maximum tool-calling iterations per conversation turn (default: unlimited, or agent.max_turns in config).
+ hermes chat -q "Inspect this repository" --format stream-json
+ hermes chat --safe-mode --model gpt-4.1 -q "Is this bug mine or Hermes'?"
+ hermes chat --safe-mode --provider custom --base-url http://127.0.0.1:8000/v1 --model local -q "Isolate against a local server"
+ --format stream-json — structured JSONL output ​
+ Use --format stream-json when a program needs to consume progress without
+ scraping terminal output. It requires -q / --query (or --query-file ), implies
+ quiet non-interactive CLI mode, and rejects an explicit --tui request. Every
+ stdout line is one JSON object; diagnostics and the session_id: line stay on stderr.
+ hermes chat -q "Summarize this repository" --format stream-json
… diff truncated (482 added / 107 removed lines)
```

### hermes.docs.fallback-providers

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
- Change: changed
- Prior hash: cc2cf1c9050b24954fa57dfed00a53cad4cb4c643586417a3205c019427b1593
- Current hash: 0e6bb8ba8b4765665909831bdf2dfb92acce417d72db79939c9c14e6a7450f36

```diff
- hermes fallback reuses the provider picker from hermes model — same provider list, same credential prompts, same validation. Use the subcommands add , list (alias ls ), remove (alias rm ), and clear to manage the chain. Changes persist under the top-level fallback_providers: list in config.yaml .
- GitHub Copilot
- copilot
- COPILOT_GITHUB_TOKEN , GH_TOKEN , or GITHUB_TOKEN
- GitHub Copilot ACP
- copilot-acp
- External process (editor integration)
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
- Skills Hub
- Skill search and discovery
- auxiliary.skills_hub
- When a task's provider is set to "auto" (the default), Hermes first tries the main provider + main model for that auxiliary task. If that route is unavailable or later fails with a capacity-style error, Hermes now honors user-configured fallback policy before using the built-in discovery chain:
- fallback_providers / fallback_model → built-in auxiliary discovery chain
- Built-in text discovery chain (compression, web extract, title generation, etc.):
- Those built-in chains are a convenience fallback for users who have not declared a task-specific or main fallback policy.
- skills_hub :
- Every task above follows the same provider / model / base_url pattern. Each task can also declare its own fallback_chain ; if omitted, provider: auto uses the top-level fallback_providers chain before Hermes' built-in auxiliary discovery chain.
- base_url takes precedence over provider . Hermes uses the configured api_key for authentication, falling back to OPENAI_API_KEY if not set. It does not reuse OPENROUTER_API_KEY for custom endpoints.
- Cron jobs inherit your configured fallback_providers chain (or legacy fallback_model ) when they create an agent. To use a different primary provider for a cron job, configure provider and model overrides on the cron job itself:
- See Scheduled Tasks (Cron) for full configuration details.
- fallback_chain (if set) → main agent model → warn + raise, on capacity errors only
- Skills hub
- auxiliary.skills_hub
- Inherits the parent's fallback_providers chain; optional provider/model override
- delegation.provider / delegation.model
- Inherit the configured fallback_providers chain; optional per-job provider override
- Per-job provider / model
+ hermes fallback reuses the provider picker from hermes model — same provider list, same credential prompts, same validation. Use the subcommands add , list (alias ls ), remove (alias rm ), and clear to manage the chain, and check to verify it (see Checking the chain ). Changes persist under the top-level fallback_providers: list in config.yaml .
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
+ Checking the chain ​
+ hermes fallback check reports whether each entry would work if the fallback switch reached it, without starting an agent session:
+ hermes fallback check # static: resolve each entry and its credentials, no inference
+ hermes fallback check --live # also send one minimal request per entry, in parallel
+ hermes fallback check --live --json
+ Each entry resolves exactly as the fallback switch resolves it (its provider , model , base_url and api_key / key_env ), and the chain is never walked, so one entry can't hide another. --live sends one short completion per statically ready entry over that provider's own API (OpenAI-compatible, Anthropic Messages, Codex Responses, Bedrock, ACP). It is not retried (SDK retries are off; an Anthropic endpoint that refuses streaming gets the one non-streaming resend the adapter always makes) and never answered by another provider. An empty or malformed answer, one with a failed / cancelled status, or one that reports an error on the choice (OpenRouter's finish_reason: "error" ) counts as a failure ( incomplete , a token cap, still counts as answered); a provider error relayed in an HTTP 200 body is reported like the request error it describes. An entry fails as model_mismatch when the provider reports a different model (a dated snapshot of the requested model, such as gpt-4o-2024-08-06 for gpt-4o , still counts as a match). The model check is skipped where the reported model proves nothing: Anthropic Messages and Codex Responses adapters don't expose the serving model, Azure reports the base model rather than your deployment name, router meta-models ( openrouter/auto , @preset/... , <model>@preset/... ) answer under the model they picked, Bedrock ARNs aren't echoed back, and local or private-network servers (llama.cpp, LM Studio, Ollama, a LAN box) often report a placeholder. The live request uses the provider's request_timeout_seconds when set (as the switch does), else 30 seconds; on a streamed request the timeout applies to each read, not the whole answer. A static pass for Bedrock (AWS SDK credential chain) or an external-process provider only means the route resolves; use --live to prove it. Static mode sends no inference request, but it resolves credentials the way a session does, so an expiring OAuth token may be refreshed and saved. Entries with provider: auto (backend picked per call) or provider: moa (a fan-out preset) are not one fixed route, so they are never sent a live request and keep their static verdict. The live request goes to the client the fallback switch would build; for Nous and Codex entries that client uses your stored login, as the switch does.
+ The command exits with status 1 when any entry is not ready, so cron jobs and CI can gate on it. --json prints profile , live , ready , checked_at and one result per entry ( provider , model , base_url , api_mode , auth_source , configured , auth_ready , inference_ready , latency_ms , model_returned , error_class , error , ready , status ). status is ready , ready (static) , config , auth , model_mismatch , live_response (an answer with no usable completion) or live_<reason> for a failed request ( live_auth , live_timeout , live_rate_limit , live_model_not_found , ...). Credentials are never printed, and provider error text is redacted. Use hermes -p <profile> fallback check to check another profile's chain.
+ Local llama.cpp (managed)
+ llamacpp (aliases llama.cpp , llama-cpp )
+ The local model server Hermes manages (Desktop Settings → Providers → Local models ), no base_url needed. If it is not running the entry is skipped — Hermes never sends the local model name to another provider
+ Mixture of Agents preset
+ moa ( model = preset name)
+ A configured MoA preset whose aggregator has credentials — the fallback runs the whole preset (references + aggregator), not the aggregator alone
+ Invalid responses — when the API returns malformed or empty responses repeatedly. An HTTP-200 body whose only assistant text is a router's Connect timeout, please try again later. with zero completion tokens counts as invalid too (streamed or not, in the main loop, the iteration-limit summary and auxiliary calls), so it is retried instead of shown as the answer. A streamed refusal (the model declining with an explanation on the refusal channel) is a terminal content_filter result, not an empty response, so it is surfaced rather than retried. On the native Anthropic wire a stop_reason: refusal arrives with an empty body; Hermes reports the reason from the response's stop_details (category and, when present, explanation) in the refusal message and in the log line ( native_stop_reason=… stop_details=… ).
+ Resolves credentials for the fallback provider (including named custom providers using key_cmd )
+ Builds a new API client, preserving a dynamic credential source across timeout and request-client rebuilds
+ Re-resolves the reasoning effort for the fallback model (its agent.reasoning_overrides entry, else the global agent.reasoning_effort )
+ Every surface (CLI, TUI, Desktop, messaging platforms) shows a notice the moment the switch happens, before the fallback model starts answering, for example: ⚠️ Model fallback: qwen4-max via alibaba could not respond (rate limit: HTTP 429: quota exceeded); using grok-5 via xai. The parenthesis carries the provider's own error, shortened and with secrets masked. A switch decided while the chat is being set up (the primary's credentials fail before your message is sent) is announced at the start of that turn. The notice is display-only: it never enters the conversation the model reads. Like every warning, it is hidden when display.suppress_warning_notifications is on. Background turns that run without a message from you (a finished background process, a plugin's scheduled check) never show it, since most of them end without a reply; the switch is still written to the log. If the fallback is still answering when you next send a message (a quota error keeps it for a cooldown), that turn shows the notice before it runs.
+ The same re-resolution happens when the CLI falls back at startup because the primary provider's auth fails before the first request: the fallback model is sent its own configured effort, not the primary's. An explicit hermes chat --reasoning <level> is kept across that startup switch — it is your intent for the run.
+ The per-turn retry is reset-aware : when the primary's credentials report a rate-limit reset time that hasn't elapsed yet (subscription windows like Claude Pro/Max's 5-hour blocks or Codex weekly limits report these as hours or days), Hermes skips the doomed retry and stays on the fallback until the reset passes — avoiding two pointless provider switches (and two prompt-cache invalidations) per turn. Expiry makes the primary eligible for a later retry; it does not schedule a retry or guarantee recovery. Transient 429s without a reset time use an exponential cooldown.
+ When a switch arms that cooldown, the fallback notice includes its approximate remaining duration, for example: Primary retry eligible in ~60 s; recovery is not guaranteed. Non-rate-limit switches and switches from an already-active cross-provider fallback do not announce a new primary cooldown.
+ model : gpt - 5.4
+ CLI sessions (interactive and hermes -z one-shot)
+ ✔ (at startup when the primary's credentials/quota fail, mid-session, and a chain added or edited while a chat is open applies from its next turn)
+ Desktop app / TUI chats
+ ✔ (a chain added or edited while a chat is open applies from its next turn)
… diff truncated (61 added / 37 removed lines)
```

### hermes.docs.mixture-of-agents

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/mixture-of-agents
- Change: unchanged
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
- Current hash: b63ca1a6100455b575247d2ad560cc98fed8adbb1691147b34bb511e468b41f1

```diff
- NousResearch
- /
- hermes-agent
- Public
- Notifications
- You must be signed in to change notification settings
- Fork
- 49.7k
- Star
- 242k
- Releases: NousResearch/hermes-agent
- Release list
- Jump to release
- Hermes Agent v0.21.0 (v2026.8.31)
- Hermes Agent v0.20.6 (v2026.8.27)
- Hermes Agent v0.20.5 (v2026.8.19)
- Hermes Agent v0.20.4 (2026.8.18)
- Hermes Agent v0.20.3 (2026.8.16.2)
- Hermes Agent v0.20.2 (2026.8.16)
- Hermes Agent v0.20.1 (2026.8.13)
- Hermes Agent v0.20.0 (2026.8.3)
- Hermes Agent v0.19.1 (v2026.7.30)
- Hermes Agent v0.19.0 (2026.7.20) — The Quicksilver Release
- Hermes Agent v0.21.0 (v2026.8.31)
- Hermes Agent v0.21.0 (v2026.8.31)
- 31 Aug 19:29
- v2026.8.31
- 29112be
- Hermes Agent v0.21.0 (v2026.8.31)
- Release Date: August 31, 2026
- Since v0.20.0: ~5,800 commits · ~2,475 merged PRs · ~5,680 files changed · ~869,000 insertions · ~135,000 deletions · ~2,100 issues closed · 760+ contributors
- The Pantheon Release. v0.20.0 made Hermes the herald — he spoke, and he carried word to other agents. In v0.21.0 the gods assemble. Bot Mode ships built into the desktop app: a society of named agents with their own faces and group chats, where your bots talk to each other — and to you — like a team, not a toolbox. Around that spine: cron jobs gained memory and continuity so scheduled agents actually learn between runs, subagents can be steered live mid-flight, the MCP surface became a real command center, and the agent can now drive the desktop's own browser. This release rolls up everything from the v0.20.1–v0.20.6 infrastructure patch tags — those windows are fully documented here.
- ✨ Highlights
- Bot Mode — your agents become a society, built in — Bot Mode is now a bundled, default-on part of the desktop app: every agent profile gets a name, a deterministic avatar face (with randomize/lock controls), and a place in a shared roster. Create Discord-style group chats where multiple bots and you talk in one room, @-mention any bot from the composer, and give rooms names and pictures. Before, "multi-agent" meant plumbing; now it looks like a chat app full of coworkers. ( #87886 , #88243 , #89386 , #96726 — @teknium1 , @OutThisLife , @dokterdok )
- hermes peer — bot-to-bot DMs between your agents — Any Hermes agent can now message any other by handle, across profiles and gateways, from the CLI or from inside a conversation. Ask your research bot to hand findings to your coding bot and get the reply back where you can read it. Replies land in each agent's canonical Bot Chat, so conversations between agents are durable and inspectable, not fire-and-forget. ( #88725 , #88178 , #91487 — @teknium1 )
- Cron jobs that remember — Scheduled jobs stopped being goldfish. Cron agents now load and update persistent memory like every other agent, continuity=true carries each run's output into the next (so a monitor can dedupe against what it already reported), every job gets a durable notepad scratchpad, monitor-mode jobs skip the LLM entirely when nothing changed, and cron output can land in a bot's canonical Bot Chat — where the bot actually responds. Your 9am briefing job now knows what it told you yesterday. ( #91447 , #80774 , #81139 , #81138 , #91487 — @teknium1 , @smwbev )
- Steer your subagents while they run — delegate_task gained live orchestration: list running children, steer one mid-flight with a course correction, or stop it early and keep the partial result. Add optional JSON-schema validation on child outputs, per-delegation cost surfaced in results, and raised defaults (250 iterations, 10 concurrent children) — delegation went from fire-and-pray to actually managed parallel work. ( #85232 , #81144 , #81142 , #86506 , #86745 — @teknium1 )
- The MCP command center — MCP servers and the catalog merged into one coherent desktop page with drag-in "paste anything" import, background health checks that nudge you to re-auth before a tool call fails, a fleet cost/usage overlay showing schema token estimates and 30-day usage per server, and hermes:// deep links that install an MCP server with explicit confirmation. Managing twenty MCP servers used to be config-file archaeology; now it's a dashboard. ( #87525 , #87572 , #87576 , #87579 , #87581 — @teknium1 )
- A CLI power wave — Ctrl+P opens a fuzzy command palette, the /model picker filters as you type, /status shows reasoning mode, pending approvals, and context usage, and the status bar can display live cache-hit %, latency, and tokens/sec with per-field toggles. Plus: a global emergency stop, session pin/unpin, rotating task-oriented composer placeholders — and Ghostty-level terminal pets , because a companion should have a companion. ( #90730 , #90717 , #90745 , #98250 , #98282 , #97666 — @teknium1 , and salvaged community work)
- The agent drives the desktop's browser — The in-app browser stopped being a window the agent could only look at: Hermes now navigates, clicks, and reads it directly, and pages can be popped out to your system browser with full link context menus. Ask it to walk a docs site or debug a web app and watch it happen inside your own app. ( #90197 , #89366 — @OutThisLife , @ethernet8023 )
+ Repository navigation
+ Releases
+ Hermes Agent v0.23.3
+ Hermes Agent v0.23.3
+ 20 Nov 00:34
+ Immutable
+ release. Only release title and notes can be modified.
+ v0.23.3
+ caafe53
+ Hermes Agent v0.23.3
+ Release Date: November 19, 2026
+ Patch release. This tag rolls up the ~370 PRs merged since v0.23.2 into a stable release for the GitHub release (CLI and installers), the Microsoft Store app, Docker and Hermes Cloud. Full curated notes for this window ship with v0.24.0.
+ Measured at commit caafe5389ae , the window since v0.23.2 contains 1,657 non-merge commits across 3,948 changed files (+222,379 / −96,154), 370 merged PRs and 60 closed issues .
+ Also in the window, undocumented here on purpose: one prompt-cache lifecycle controller (warming through long tool runs, compaction of idle chats before the 1h cache expires, Nous Portal on the full 1h lifecycle, prompt_caching.cache_ttl defaulting to auto ), compaction that archives the tool results it drops, the proactive tool-result prune on by default, a one-question first-run CLI setup with the free tier included, GPT-6.2 Astra and Sol (+ Pro) on OpenRouter and Nous Portal, a "Waiting on teammates" strip above Bot Chat composers, the Linux AppImage agent payload run from a stable per-build copy, the storage layer split behind a persistence interface with its SQLite backend, dependency security bumps (oauthlib, opentelemetry, tornado), and a large batch of new plugin-catalog entries.
+ Full curated release notes for this window ship with v0.24.0 , which will document everything from v0.23.0 onward — highlights, feature areas, and complete contributor credits. Nothing in this window is skipped.
+ Microsoft Store app: updates through the Store.
+ Desktop app installed from the installer (.exe / .dmg): no change in this release; it updates with the next bundled release.
+ CLI: hermes update , or re-run the installer one-liner.
+ Docker / Hermes Cloud: nousresearch/hermes-agent:stable (or :latest ).
+ Full Changelog : v0.23.2...v0.23.3
+ 3
+ 30 people reacted
+ Hermes Agent canary v0.23.3+canary.20261120T064609Z
+ Hermes Agent canary v0.23.3+canary.20261120T064609Z
+ Pre-release
+ Pre-release
+ github-actions
+ 20 Nov 07:49
+ Immutable
+ release. Only release title and notes can be modified.
+ v0.23.3+canary.20261120T064609Z
+ 32dbc1d
+ Hermes Agent v0.23.3+canary.20261120T064609Z (v0.23.3+canary.20261120T064609Z)
+ Release Date: November 20, 2026
+ Downloads
+ Hermes Desktop
+ OS
+ Architecture
+ Download
+ macOS
… diff truncated (612 added / 227 removed lines)
```

### openai.api.changelog

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/changelog
- Change: changed
- Prior hash: 5bdc521726ff9dc7c3a2b1f5aca76cb13626f76ef5c56c4d029d7da314097e09
- Current hash: acb69c2ca6a74f46de994b1dd6cf533eb49bb1156ecffeb69c7ab7e11b3498a5

```diff
- API customers can now select regional processing for an individual request by using a prefixed domain with an API key from a project having Global geography. Existing eligibility, data retention control, endpoint, and model support requirements continue to apply. Learn more in the [data controls guide](https://developers.openai.com/api/docs/guides/your-data#select-a-processing-region-per-request).
- Released [GPT Transcribe](https://developers.openai.com/api/docs/models/gpt-transcribe) for accurate file transcription and final transcripts of committed Realtime turns, along with [GPT Live Transcribe](https://developers.openai.com/api/docs/models/gpt-live-transcribe) for low-latency streaming transcription.
- Updated the [Realtime and audio guide](https://developers.openai.com/api/docs/guides/realtime), added a dedicated [Realtime translation guide](https://developers.openai.com/api/docs/guides/realtime-translation), refreshed [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription) for streaming transcripts, and moved realtime prompting guidance into [Using realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting).
- Expanded the Sora API with reusable character references, longer generations up to `20` seconds, `1080p` output for `sora-2-pro`, video extensions, and Batch API support for `POST /v1/videos`. `1080p` generations on `sora-2-pro` are billed at `$0.70` per second. Learn more [here](https://developers.openai.com/api/docs/guides/video-generation).
- Added `POST /v1/videos/edits` for editing existing videos. This will replace `POST /v1/videos/{video_id}/remix`, which will be deprecated in `6` months. Learn more [here](https://developers.openai.com/api/docs/guides/video-generation#edit-existing-videos).
- Expanded `input_file` support to accept more document, presentation, spreadsheet, code, and text file types. Learn more [here](https://developers.openai.com/api/docs/guides/file-inputs).
- Added dedicated SIP IP ranges for Realtime API. `sip.api.openai.com` does GeoIP routing, and will direct SIP traffic to the closest region. [Learn more](https://developers.openai.com/api/docs/guides/realtime-sip#dedicated-sip-ip-ranges).
- Released [UK data residency](https://platform.openai.com/docs/guides/your-data#data-residency-controls).
- Released [GPT-5 Pro](https://developers.openai.com/api/docs/models/gpt-5-pro), a version of [GPT-5](https://developers.openai.com/api/docs/models/gpt-5) that uses more compute to think harder and provide consistently better answers.
- Launched [v1/videos](https://developers.openai.com/api/docs/guides/video-generation) for rich, detailed, and dynamic video generation and remixing with our latest [Sora 2](https://developers.openai.com/api/docs/models/sora-2) and [Sora 2 Pro](https://developers.openai.com/api/docs/models/sora-2-pro) models.
- Added support for image and file as a [tool call output](https://developers.openai.com/api/docs/docs/guides/function-calling#how-it-works) in Responses API.
- Released [o3-deep-research](https://developers.openai.com/api/docs/models/o3-deep-research) and [o4-mini-deep-research](https://developers.openai.com/api/docs/models/o4-mini-deep-research), deep research variants of our o-series reasoning models optimized for deep analysis and research tasks. Learn more in the [deep research guide](https://developers.openai.com/api/docs/guides/deep-research).
- Launched support for [reinforcement fine-tuning](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning). Learn about available [fine-tuning methods](https://developers.openai.com/api/docs/guides/model-optimization). [gpt-4.1-nano](https://developers.openai.com/api/docs/models/gpt-4.1-nano) is now available for fine-tuning.
- Introducing data residency in Europe. Read more [here](https://platform.openai.com/docs/guides/your-data).
- Launched Preference Fine-tuning using [Direct Preference Optimization (DPO)](https://developers.openai.com/api/docs/guides/model-optimization#preference).
- [Image fine-tuning](https://developers.openai.com/api/docs/guides/model-optimization#vision): Fine-tune GPT-4o with images and text to improve vision capabilities.
- Assistants API now supports [including file search results used by the file search tool, and customizing ranking behavior](https://developers.openai.com/api/docs/assistants/migration#improve-file-search-result-relevance-with-chunk-ranking).
- [Parallel function calling](https://developers.openai.com/api/docs/guides/function-calling#configure-parallel-function-calling) can be disabled in Chat Completions and the Assistants API by passing `parallel_tool_calls=false`.
- Added support for [file search customizations](https://developers.openai.com/api/docs/assistants/migration#customizing-file-search-settings).
- Added a new [function calling option `tool_choice: "required"`](https://developers.openai.com/api/docs/guides/function-calling#function-calling-behavior) to the Chat Completions and Assistants APIs.
- Released [GPT-4 Turbo Preview](https://developers.openai.com/api/docs/models/gpt-4-turbo), [updated GPT-3.5 Turbo](https://developers.openai.com/api/docs/models/gpt-3-5-turbo), [GPT-4 Turbo with Vision](https://developers.openai.com/api/docs/guides/images-vision), [Assistants API](https://developers.openai.com/api/docs/assistants/migration), [DALL·E 3 in the API](https://developers.openai.com/api/docs/models/dall-e-3), and [text-to-speech API](https://developers.openai.com/api/docs/guides/text-to-speech)
- Added [function calling support](https://developers.openai.com/api/docs/guides/model-optimization#fine-tuning-examples) to the Fine-tuning API
+ ## November, 2026
+ ### Nov 19
+ Feature · Model: gpt-live-1.1 · API: v1/live/sessions
+ [GPT-Live-1.1](https://developers.openai.com/api/docs/models/gpt-live-1.1) improves pronunciation, accent consistency, and transcription in multilingual voice conversations. Use `gpt-live-1.1` in an existing Live session configuration and [describe in plain language when to delegate](https://developers.openai.com/api/docs/guides/live-prompting#recommended-prompt-structure) to your backend.
+ [Configure standby](https://developers.openai.com/api/docs/guides/live-conversations#configure-standby) for GPT-Live-1 and GPT-Live-1.1 WebRTC sessions to pause inference during inactivity and resume when someone speaks.
+ ### Nov 17
+ Feature · Model: gpt-6.2-astra · Model: gpt-6.2-sol · API: v1/responses · API: v1/chat/completions
+ Use [GPT-6.2 Astra](https://developers.openai.com/api/docs/models/gpt-6.2-astra) for demanding reasoning and coding tasks, or [GPT-6.2 Sol](https://developers.openai.com/api/docs/models/gpt-6.2-sol) for everyday coding and agent workflows. Both models support the Responses API and Chat Completions. Tool calling requires the Responses API.
+ GPT-6.2 changes how the Responses API preserves reasoning when you edit a conversation’s prefix and how it handles the top-level `instructions` field. See the [GPT-6.2 migration guide](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6.2-astra#gpt-6.2-astra-migration-quickstart) for details and recommended updates to your integration.
+ ### Nov 17
+ Feature · Model: gpt-6.2-astra · Model: gpt-6.2-sol · Model: gpt-6.1-terra · Model: gpt-6-luna · API: v1/responses
+ Choose a two-hour or eight-hour [background completion window](https://developers.openai.com/api/docs/guides/background#use-discounted-completion-windows) in the Responses API public beta. Model token rates are 30% lower than Standard for the two-hour window and 40% lower for the eight-hour window.
+ New models will not support [Flex processing](https://developers.openai.com/api/docs/guides/flex-processing). Flex remains available on supported models while the beta winds down.
+ ### Nov 16
+ Feature · Model: omni-moderation-csam-latest · API: v1/moderations
+ Approved organizations can use the [OpenAI CSAM Image Classifier](https://developers.openai.com/api/docs/guides/csam-classifier) at no cost to help prioritize images for human review. The model returns separate signals for potential child sexual abuse material (CSAM) and potential AI-generated CSAM.
+ ### Nov 5
+ Feature · Model: gpt-6-cyber
+ Use [GPT-6 Cyber](https://developers.openai.com/api/docs/models/gpt-6-cyber) to investigate vulnerabilities, reproduce them in an authorized test environment, and verify fixes. See [Daybreak setup](https://developers.openai.com/api/docs/guides/daybreak#set-up-gpt-6-cyber) before sending your first request.
+ Feature · Model: gpt-image-2.6-sunburst · Model: gpt-image-2.6-flare · API: v1/images/generations · API: v1/images/edits
+ Released [GPT-Image-2.6 Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst) and [GPT-Image-2.6 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.6-flare) for image generation and editing, with adjustable complexity, SVG generation, and animated GIF generation. Added markup-guided editing for supported GPT-Image-2.5 and GPT-Image-2.6 models.
+ See the [image generation guide](https://developers.openai.com/api/docs/guides/image-generation#gpt-image-26).
+ ### Nov 2
+ Feature · Model: gpt-live-1 · API: v1/live/sessions
+ Outbound SIP calling is now available to all organizations through the Live API. Connect GPT-Live to a phone number through your SIP provider. See the [SIP guide](https://developers.openai.com/api/docs/guides/voice-sip?api=live#place-an-outbound-call).
+ ## October, 2026
+ Update · API: v1/agents · API: v1/agents/sessions
+ You can now [update the tools in an existing session](https://developers.openai.com/api/docs/guides/agents-api/configuration#update-settings-for-an-existing-session) in the Agents API public beta. Updates replace the full tool list. Function tools and MCP servers change on the next model call; built-in tools change by the next turn.
+ Context compaction now runs in the background by default. Set `compaction.async` to `false` for blocking compaction. Background compaction may increase token usage.
+ Added opt-in experimental time awareness. Set `experimental.time_awareness` to `true` to give the model periodic current-time reminders. It is disabled by default. See the [agent configuration reference](https://developers.openai.com/api/reference/resources/beta/subresources/agents/methods/create) for compaction and experimental settings.
+ Feature · API: v1/agents/sessions
+ Added automatic review for eligible Agents API projects. Set the session's `review` field to `"auto_review"` to have a model approve or deny supported tool and permission requests based on conversation intent and risk. See the [automatic review guide](https://developers.openai.com/api/docs/guides/agents-api/sessions/approvals) for supported requests, limitations, and additional token billing.
+ Feature · Model: gpt-6-rosalind
+ Released [GPT-6 Rosalind](https://developers.openai.com/api/docs/pricing#life-sciences-models), bringing specialized biological reasoning with scientific tool use to complex life sciences research. Access is available to organizations approved for Rosalind Research through the [trusted-access program](https://help.openai.com/en/articles/20001193-gpt-rosalind-for-life-sciences-research) for internal research by authorized users.
+ ### Oct 28
+ Eligible ChatGPT Pro and Business subscribers can now claim up to $500 per month in free API credits as a subscription benefit. Activate the benefit from ChatGPT or API Platform by linking an API organization you own. See [API credits for ChatGPT subscribers](https://developers.openai.com/api/docs/guides/chatgpt-api-credits) for credit amounts, eligibility, and how to claim.
+ ### Oct 26
+ Feature · Model: gpt-6.1-terra · API: v1/responses · API: v1/chat/completions
+ Released [GPT-6.1 Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra), a fast, efficient model for visual reasoning, precise computer use, and clear, natural writing.
+ See the [GPT-6 guide](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra#gpt-61-terra) for prompting and migration guidance.
… diff truncated (148 added / 22 removed lines)
```

### openai.api.deprecations

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/deprecations
- Change: changed
- Prior hash: 66a6c1a91573dac1b611d8d0d9fb19356b61930bdbb4b67aa0eab73c904ef5b6
- Current hash: e0993448feaf940e2700d3c6ee92954b95882eeb9602175eed71c8df39a77919

```diff
- As we launch safer and more capable models, we regularly retire older models. Software relying on OpenAI models may need occasional updates to keep working. Impacted customers will always be notified by email and in our documentation along with [blog posts](https://openai.com/blog) for larger changes.
- This page lists all API deprecations, along with recommended replacements.
- - **Specialized variants of generally available models:** At least 3 months. Examples include chat variants such as `gpt-5.1-chat-latest`, Codex variants such as `gpt-5.3-codex`, and deep research variants such as `o3-deep-research`.
- If safety or compliance concerns require us to retire a model sooner, we will provide as much notice as reasonably possible.
- These notice periods give customers time to evaluate recommended replacement models, test application behavior, and complete migrations before a model is no longer available. In some cases, developers may be able to provision dedicated capacity for continued access after a model's shutdown date. To explore this option, [contact our sales team](https://openai.com/contact-sales/).
- ## Deprecation vs. legacy
- We use the term "deprecation" to refer to the process of retiring a model or endpoint. When we announce that a model or endpoint is being deprecated, it immediately becomes deprecated. All deprecated models and endpoints will also have a shut down date. At the time of the shut down, the model or endpoint will no longer be accessible.
- We use the terms "sunset" and "shut down" interchangeably to mean a model or endpoint is no longer accessible.
- We use the term "legacy" to refer to models and endpoints that no longer receive updates. We tag endpoints and models as legacy to signal to developers where we're moving as a platform and that they should likely migrate to newer models or endpoints. You can expect that a legacy model or endpoint will be deprecated at some point in the future.
- Upcoming deprecations are listed below, with the most recent announcements at the top.
- ### 2026-08-26: Transcription models
- On August 26, 2026, we notified developers using `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, and `gpt-4o-transcribe-diarize` of their deprecation and removal from the API on February 26, 2027.
- For information about the recommended replacements, see the [transcription guide](https://developers.openai.com/api/docs/guides/transcription).
- | Shutdown date | Model / system | Recommended replacement |
- | ------------- | --------------------------- | ----------------------------------------- |
- | Feb 26, 2027 | `whisper-1` | `gpt-live-transcribe` or `gpt-transcribe` |
- | Feb 26, 2027 | `gpt-4o-transcribe` | `gpt-live-transcribe` or `gpt-transcribe` |
- | Feb 26, 2027 | `gpt-4o-mini-transcribe` | `gpt-live-transcribe` or `gpt-transcribe` |
- | Feb 26, 2027 | `gpt-4o-transcribe-diarize` | `gpt-live-transcribe` or `gpt-transcribe` |
- ### 2026-07-20: Legacy audio, realtime, and transcription models
- On July 20, 2026, we notified developers using legacy audio, realtime, and transcription model families and snapshots of their deprecation and removal from the API on January 20, 2027.
- | Shutdown date | Model family / snapshot | Recommended replacement |
- | ------------- | ----------------------------------- | ----------------------------------- |
- | Jan 20, 2027 | `gpt-realtime` | `gpt-realtime-2.1` |
- | Jan 20, 2027 | `gpt-audio` | `gpt-audio-1.5` |
- | Jan 20, 2027 | `gpt-4o-audio` | `gpt-audio-1.5` |
- | Jan 20, 2027 | `gpt-4o-realtime` | `gpt-realtime-2.1` |
- | Jan 20, 2027 | `gpt-realtime-mini` | `gpt-realtime-2.1-mini` |
- | Jan 20, 2027 | `gpt-audio-mini` | `gpt-audio-1.5` |
- | Jan 20, 2027 | `gpt-4o-mini-realtime` | `gpt-realtime-2.1-mini` |
- | Jan 20, 2027 | `gpt-4o-mini-audio` | `gpt-audio-1.5` |
- | Jan 20, 2027 | `gpt-4o-mini-transcribe-2025-03-20` | `gpt-4o-mini-transcribe-2025-12-15` |
- ### 2026-06-11: GPT-5 and o3 model deprecations
- On June 11, 2026, we notified developers using older GPT-5 and o3 model snapshots of their deprecation and removal from the API on December 11, 2026.
- | Shutdown date | Model / system | Recommended replacement |
- | ------------- | ----------------------- | ------------------------------------- |
- | Dec 11, 2026 | `gpt-5-2025-08-07` | `gpt-5.6-sol` |
- | Dec 11, 2026 | `gpt-5-mini-2025-08-07` | `gpt-5.6-terra` |
- | Dec 11, 2026 | `gpt-5-nano-2025-08-07` | `gpt-5.6-luna` |
- | Dec 11, 2026 | `gpt-5-pro-2025-10-06` | `gpt-5.6-sol` (`reasoning.mode: pro`) |
+ As we launch safer and more capable models, we regularly retire older models. Software relying on OpenAI models may need occasional updates to keep working. Impacted customers will always be notified by email and in our documentation.
+ Each model has one of three lifecycle states.
+ - **Active.** You can use the model through the API. OpenAI hasn't announced its retirement.
+ - **Deprecated.** OpenAI has announced the model's retirement. You can still use it until its shutdown date.
+ - **Shutdown.** The model no longer accepts requests through the standard API.
+ For deprecation notice periods and help migrating to a replacement model, see the [deprecation policy](#model-deprecation-notice-periods) and [migration guidance](#migration-guidance) below.
+ See [feature and endpoint deprecations](#feature-and-endpoint-deprecations) for other upcoming API shutdowns.
+ | Shutdown date | Affected model | Status | Recommended replacement | Notice date |
+ | ---------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ------------ |
+ | **Dec 1, 2026** | `gpt-image-1-mini` | Deprecated | `gpt-image-2.6-sunburst` or `gpt-image-2.6-flare` | Jun 2, 2026 |
+ | **Dec 1, 2026** | `gpt-image-1.5`, `gpt-image-1.5-2025-12-16` | Deprecated | `gpt-image-2.6-sunburst` or `gpt-image-2.6-flare` | Jun 2, 2026 |
+ | **Dec 1, 2026** | `chatgpt-image-latest` | Deprecated | `gpt-image-2.6-sunburst` or `gpt-image-2.6-flare` | Jun 2, 2026 |
+ | **Dec 11, 2026** | `gpt-5`, `gpt-5-2025-08-07` | Deprecated | `gpt-6.1-sol` | Jun 11, 2026 |
+ | **Dec 11, 2026** | `gpt-5-mini`, `gpt-5-mini-2025-08-07` | Deprecated | `gpt-6.1-terra` | Jun 11, 2026 |
+ | **Dec 11, 2026** | `gpt-5-nano`, `gpt-5-nano-2025-08-07` | Deprecated | `gpt-6-luna` | Jun 11, 2026 |
+ | **Dec 11, 2026** | `gpt-5-pro`, `gpt-5-pro-2025-10-06` | Deprecated | `gpt-6.1-sol` (`reasoning.mode: pro`) in the Responses API | Jun 11, 2026 |
+ | **Dec 11, 2026** | `o3`, `o3-2025-04-16` | Deprecated | `gpt-6.1-sol` | Jun 11, 2026 |
+ | **Dec 11, 2026** | `o3-pro`, `o3-pro-2025-06-10` | Deprecated | `gpt-6.1-sol` (`reasoning.mode: pro`) in the Responses API | Jun 11, 2026 |
+ | **Jan 6, 2027** | `tts-1` | Deprecated | `gpt-realtime-2.1-mini` | Oct 1, 2026 |
+ | **Jan 6, 2027** | `tts-1-hd` | Deprecated | `gpt-realtime-2.1-mini` | Oct 1, 2026 |
+ | **Jan 6, 2027** | `gpt-4o-mini-tts`, `gpt-4o-mini-tts-2025-03-20`, `gpt-4o-mini-tts-2025-12-15` | Deprecated | `gpt-realtime-2.1-mini` | Oct 1, 2026 |
+ | **Jan 14, 2027** | GPT-4o (`gpt-4o-2024-08-06`, `gpt-4o-2024-11-20`) | Deprecated | `gpt-6-luna` | Oct 14, 2026 |
+ | **Jan 14, 2027** | GPT-4o mini (`gpt-4o-mini-2024-07-18`) | Deprecated | `gpt-6-luna` | Oct 14, 2026 |
+ | **Jan 14, 2027** | GPT-4.1 (`gpt-4.1-2025-04-14`) | Deprecated | `gpt-6-luna` | Oct 14, 2026 |
+ | **Jan 14, 2027** | GPT-4.1 mini (`gpt-4.1-mini-2025-04-14`) | Deprecated | `gpt-6-luna` | Oct 14, 2026 |
+ | **Jan 20, 2027** | `gpt-realtime`, `gpt-realtime-2025-08-28` | Deprecated | `gpt-realtime-2.1` | Jul 20, 2026 |
+ | **Jan 20, 2027** | `gpt-audio`, `gpt-audio-2025-08-28` | Deprecated | `gpt-audio-1.5` | Jul 20, 2026 |
+ | **Jan 20, 2027** | `gpt-4o-audio` | Deprecated | `gpt-audio-1.5` | Jul 20, 2026 |
+ | **Jan 20, 2027** | `gpt-4o-realtime` | Deprecated | `gpt-realtime-2.1` | Jul 20, 2026 |
+ | **Jan 20, 2027** | `gpt-realtime-mini`, `gpt-realtime-mini-2025-12-15` | Deprecated | `gpt-realtime-2.1-mini` | Jul 20, 2026 |
+ | **Jan 20, 2027** | `gpt-audio-mini`, `gpt-audio-mini-2025-12-15` | Deprecated | `gpt-audio-1.5` | Jul 20, 2026 |
+ | **Jan 20, 2027** | `gpt-4o-mini-realtime` | Deprecated | `gpt-realtime-2.1-mini` | Jul 20, 2026 |
+ | **Jan 20, 2027** | `gpt-4o-mini-audio` | Deprecated | `gpt-audio-1.5` | Jul 20, 2026 |
+ | **Jan 20, 2027** | `gpt-4o-mini-transcribe-2025-03-20` | Deprecated | `gpt-4o-mini-transcribe-2025-12-15` | Jul 20, 2026 |
+ | **Feb 1, 2027** | `gpt-5.5-cyber-preview` | Deprecated | The most capable cyber model available to you. | Nov 5, 2026 |
+ | **Feb 10, 2027** | `gpt-image-2`, `gpt-image-2-2026-04-21` | Deprecated | `gpt-image-2.6-sunburst` or `gpt-image-2.6-flare` | Nov 10, 2026 |
+ | **Feb 26, 2027** | `whisper-1` | Deprecated | `gpt-live-transcribe` or `gpt-transcribe` | Aug 26, 2026 |
+ | **Feb 26, 2027** | `gpt-4o-transcribe` | Deprecated | `gpt-live-transcribe` or `gpt-transcribe` | Aug 26, 2026 |
+ | **Feb 26, 2027** | `gpt-4o-mini-transcribe`, `gpt-4o-mini-transcribe-2025-12-15` | Deprecated | `gpt-live-transcribe` or `gpt-transcribe` | Aug 26, 2026 |
+ | **Feb 26, 2027** | `gpt-4o-transcribe-diarize` | Deprecated | `gpt-live-transcribe` or `gpt-transcribe` | Aug 26, 2026 |
… diff truncated (192 added / 335 removed lines)
```

### openai.api.evals

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/guides/evals
- Change: changed
- Prior hash: fdf33e24dee8d7439dee7c30c7c9da3f0793ce8bf3402ab828cd69c0493b7ab5
- Current hash: 28b6ba4c40cd07894fa0085f543200a6fc36d7fb714e92017ac72d4777886774

```diff
- ```javascript
- model: "gpt-6-astra",
- model="gpt-6-astra",
- Model: "gpt-6-astra",
- .model("gpt-6-astra")
- "gpt-6-astra",
- model: "gpt-6-astra",
- {role: :developer, content: instructions},
- {role: :user, content: "My monitor won't turn on - help!"}
- "model": "gpt-6-astra",
- ```javascript
- data_source_config: {type: :custom, item_schema: {type: :object, properties: {input: {type: :string}}, required: ["input"]}},
- testing_criteria: [{type: :string_check, name: "mentions_refund", input: "{{sample.output_text}}", operation: :contains, reference: "refund"}]
- There are several ways to provide test data for eval runs, but it may be convenient to upload a [JSONL](https://jsonlines.org/) file that contains data in the schema we specified when we created our eval. A sample JSONL file that conforms to the schema we set up is below:
- ```javascript
- ```javascript
- model: "gpt-6-astra",
- "model": "gpt-6-astra",
- source: {type: :file_id, id: "YOUR_FILE_ID"},
- {role: :user, content: "{{ item.ticket_text }}"}
- model: "gpt-6-astra"
- "model": "gpt-6-astra",
- ```javascript
- In our simple test, the model reliably generated the content we wanted for a small test case sample. In reality, you will often have to run your eval with more criteria, different prompts, and different data sets. But the process above gives you all the tools you need to build robust evals for your LLM apps!
- [Cookbook: Detecting prompt regressions
- Keep tabs on the performance of your prompts as you iterate on them.](https://developers.openai.com/cookbook/examples/evaluation/use-cases/regression)
- [Cookbook: Bulk model and prompt experimentation
- Compare the results of many different prompts and models at once.](https://developers.openai.com/cookbook/examples/evaluation/use-cases/bulk-experimentation)
- [Cookbook: Monitoring stored completions
- Examine stored completions to test for prompt regressions.](https://developers.openai.com/cookbook/examples/evaluation/use-cases/completion-monitoring)
- [Fine-tuning
- Improve a model's ability to generate responses tailored to your use case.](https://developers.openai.com/api/docs/guides/model-optimization)
- [Model distillation
- Learn how to distill large model results to smaller, cheaper, and faster
- models.](https://developers.openai.com/api/docs/guides/supervised-fine-tuning#distilling-from-a-larger-model)
+ ```typescript
+ model: "gpt-6.2-astra",
+ model="gpt-6.2-astra",
+ Model: "gpt-6.2-astra",
+ .model("gpt-6.2-astra")
+ "gpt-6.2-astra",
+ model: "gpt-6.2-astra",
+ content: instructions
+ role: :user,
+ content: "My monitor won't turn on - help!"
+ "model": "gpt-6.2-astra",
+ ```typescript
+ import com.openai.core.JsonValue;
+ import com.openai.models.evals.EvalCreateParams;
+ import com.openai.models.graders.gradermodels.StringCheckGrader;
+ import java.util.Map;
+ var eval =
+ .evals()
+ EvalCreateParams.builder()
+ .name("IT Ticket Categorization")
+ .dataSourceConfig(
+ EvalCreateParams.DataSourceConfig.Custom.builder()
+ .itemSchema(
+ EvalCreateParams.DataSourceConfig.Custom.ItemSchema.builder()
+ .additionalProperties(
+ Map.of(
+ "type", JsonValue.from("object"),
+ "properties",
+ JsonValue.from(
+ Map.of(
+ "ticket_text",
+ Map.of("type", "string"),
+ "correct_label",
+ Map.of("type", "string"))),
+ "required",
+ JsonValue.from(
+ List.of("ticket_text", "correct_label"))))
+ .build())
+ .includeSampleSchema(true)
+ .build())
… diff truncated (140 added / 35 removed lines)
```

### openai.api.models

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/models/all
- Change: changed
- Prior hash: 4ee5fe4d6acb67da82da3ddcdf40d7b07263efe6d3d12058f720ef843c524278
- Current hash: 354c9479562b27ea970bdc8b6f898602879f4750a631b55ec90de8a742cf27b5

```diff
- ChatGPT Start searching API Dashboard
- Overview Models Agents Tools Voice & Audio Production API reference
- Overview Models Agents Tools Voice & Audio Production API reference Models
- Using GPT-6 Astra
- Reinforcement fine-tuning
- RFT use cases
- Images and video
- Deep research
- MCP and Connectors
- Local shell
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
- Docs Use cases Docs
- Plugins Workspace Agents Commerce Ads Select...
- File Upload
- Products
- Feeds
- Products
- Promotions
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- Overview Features Configuration Developers Security Administration Use Cases Resources Overview
- Remote
- Codex cloud
+ Language
+ Loading languages…
+ Theme
+ Overview Models Agents Tools Audio & voice Production API reference
+ Docs Models
+ Using GPT-6.2
+ API credits for ChatGPT subscribers
+ Decisions API
+ Cloud providers
+ Images
+ Image generation Overview
+ Image prompting
+ CSAM classifier
+ Agents API
+ Architecture
+ Configuring Agents
+ Sessions Run and continue sessions
+ Events and items
+ Manage sessions
+ Scheduled automations
+ Automatic review
+ Environments and sandboxes OpenAI-hosted sandboxes
+ Self-hosted sandboxes
+ Sandbox lifecycle
+ Pre-warm sandboxes
+ Sandbox security
+ Files and artifacts
+ Tools and integrations Web search
+ Functions
+ MCP connections
+ Vaults
+ Observability and usage
+ Tracing
+ Errors and recovery
+ API reference
+ Bedrock Managed Agents
+ MCP servers
+ Computer use Integration recipes
+ Driver reference
+ GPT-Live
… diff truncated (289 added / 101 removed lines)
```

### openai.api.token-counting

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/guides/token-counting
- Change: changed
- Prior hash: 532908feecb03315a2ca9951cec147d5c02389665439096e7bb42c082597f564
- Current hash: 9d53704b52b9fcc28df49785ee54c942eeb0a635042f87930f252b099e223479

```diff
- - **Route requests** based on size (e.g., smaller prompts to faster models)
- The [input token count endpoint](https://developers.openai.com/api/reference/python/resources/responses/subresources/input_tokens/methods/count) accepts the same input format as the [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create). Pass text, messages, images, files, tools, or conversations—the API returns the exact count the model will receive.
- - **Model-specific behavior** can change tokenization (e.g., reasoning, caching)
- ```javascript
- model: "gpt-6-astra",
- model="gpt-6-astra", input="Tell me a joke."
- Model: openai.String("gpt-6-astra"),
- .model("gpt-6-astra")
- model: "gpt-6-astra",
- "model": "gpt-6-astra",
- --model gpt-6-astra \
- ```javascript
- model: "gpt-6-astra",
- model="gpt-6-astra",
- Model: openai.String("gpt-6-astra"),
- .model("gpt-6-astra")
- {role: :user, content: "What is 2 + 2?"},
- {role: :assistant, content: "2 + 2 equals 4."},
- {role: :user, content: "What about 3 + 3?"}
- model: "gpt-6-astra",
- "model": "gpt-6-astra",
- model: gpt-6-astra
- ```javascript
- model: "gpt-6-astra",
- model="gpt-6-astra",
- Model: openai.String("gpt-6-astra"),
- .model("gpt-6-astra")
- model: "gpt-6-astra",
- "model": "gpt-6-astra",
- model: gpt-6-astra
- ```javascript
- model: "gpt-6-astra",
- model="gpt-6-astra",
- Model: openai.String("gpt-6-astra"),
- .model("gpt-6-astra")
- model: "gpt-6-astra",
- {type: :input_text, text: "Summarize this chart."}
- "model": "gpt-6-astra",
- model: gpt-6-astra
- ```javascript
+ - **Route requests** based on size (for example, smaller prompts to faster models)
+ The [input token count endpoint](https://developers.openai.com/api/reference/resources/responses/subresources/input_tokens/methods/count) accepts the same input format as the [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create). Pass text, messages, images, files, tools, or conversations—the API returns the exact count the model will receive.
+ - **Model-specific behavior** can change tokenization (for example, reasoning, caching)
+ ```typescript
+ model: "gpt-6.2-astra",
+ model="gpt-6.2-astra", input="Tell me a joke."
+ Model: openai.String("gpt-6.2-astra"),
+ .model("gpt-6.2-astra")
+ model: "gpt-6.2-astra",
+ "model": "gpt-6.2-astra",
+ --model gpt-6.2-astra \
+ ```typescript
+ model: "gpt-6.2-astra",
+ model="gpt-6.2-astra",
+ Model: openai.String("gpt-6.2-astra"),
+ .model("gpt-6.2-astra")
+ content: "What is 2 + 2?"
+ role: :assistant,
+ content: "2 + 2 equals 4."
+ content: "What about 3 + 3?"
+ model: "gpt-6.2-astra",
+ "model": "gpt-6.2-astra",
+ model: gpt-6.2-astra
+ ```typescript
+ model: "gpt-6.2-astra",
+ model="gpt-6.2-astra",
+ Model: openai.String("gpt-6.2-astra"),
+ .model("gpt-6.2-astra")
+ model: "gpt-6.2-astra",
+ "model": "gpt-6.2-astra",
+ model: gpt-6.2-astra
+ ```typescript
+ model: "gpt-6.2-astra",
+ model="gpt-6.2-astra",
+ Model: openai.String("gpt-6.2-astra"),
+ .model("gpt-6.2-astra")
+ model: "gpt-6.2-astra",
+ type: :input_text,
+ text: "Summarize this chart."
+ "model": "gpt-6.2-astra",
… diff truncated (52 added / 50 removed lines)
```

### openai.codex.changelog

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/changelog
- Change: changed
- Prior hash: e8b0c9fbf58fb1fae26839a2d290154deb8ee2e374d716f678e02346548840fd
- Current hash: 6d941fde7661d73770c27bbd6ed7355f220049c45e326ee24d48368401b36058

```diff
- ChatGPT Start searching API Dashboard
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- Using GPT-6 Astra
- Reinforcement fine-tuning
- RFT use cases
- Images and video
- Deep research
- MCP and Connectors
- Local shell
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
- Docs Use cases Docs
- Plugins Workspace Agents Commerce Ads Select...
- File Upload
- Products
- Feeds
- Products
- Promotions
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- Overview Features Configuration Developers Security Administration Use Cases Resources Overview
- Remote
- Codex cloud
- Cloud environment
+ Language
+ Loading languages…
+ Theme
+ Docs Overview
+ Using GPT-6.2
+ API credits for ChatGPT subscribers
+ Decisions API
+ Cloud providers
+ Images
+ Image generation Overview
+ Image prompting
+ CSAM classifier
+ Agents API
+ Architecture
+ Configuring Agents
+ Sessions Run and continue sessions
+ Events and items
+ Manage sessions
+ Scheduled automations
+ Automatic review
+ Environments and sandboxes OpenAI-hosted sandboxes
+ Self-hosted sandboxes
+ Sandbox lifecycle
+ Pre-warm sandboxes
+ Sandbox security
+ Files and artifacts
+ Tools and integrations Web search
+ Functions
+ MCP connections
+ Vaults
+ Observability and usage
+ Tracing
+ Errors and recovery
+ API reference
+ Bedrock Managed Agents
+ MCP servers
+ Computer use Integration recipes
+ Driver reference
+ GPT-Live
+ Managing sessions
… diff truncated (5877 added / 169 removed lines)
```

### openai.codex.models

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/models
- Change: changed
- Prior hash: a1d747122bcb7a290eba962315d8ffb3a0085d204ef5c1e00595f3b047ee8332
- Current hash: 431bf29fe7539dd1a4cb0b3dcb841036e73bcac83f4d530a19a3b2311b9571f8

```diff
- ChatGPT Start searching API Dashboard
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- Using GPT-6 Astra
- Reinforcement fine-tuning
- RFT use cases
- Images and video
- Deep research
- MCP and Connectors
- Local shell
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
- Docs Use cases Docs
- Plugins Workspace Agents Commerce Ads Select...
- File Upload
- Products
- Feeds
- Products
- Promotions
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- Overview Features Configuration Developers Security Administration Use Cases Resources Overview
- Remote
- Codex cloud
- Cloud environment
+ Language
+ Loading languages…
+ Theme
+ Docs Overview
+ Using GPT-6.2
+ API credits for ChatGPT subscribers
+ Decisions API
+ Cloud providers
+ Images
+ Image generation Overview
+ Image prompting
+ CSAM classifier
+ Agents API
+ Architecture
+ Configuring Agents
+ Sessions Run and continue sessions
+ Events and items
+ Manage sessions
+ Scheduled automations
+ Automatic review
+ Environments and sandboxes OpenAI-hosted sandboxes
+ Self-hosted sandboxes
+ Sandbox lifecycle
+ Pre-warm sandboxes
+ Sandbox security
+ Files and artifacts
+ Tools and integrations Web search
+ Functions
+ MCP connections
+ Vaults
+ Observability and usage
+ Tracing
+ Errors and recovery
+ API reference
+ Bedrock Managed Agents
+ MCP servers
+ Computer use Integration recipes
+ Driver reference
+ GPT-Live
+ Managing sessions
… diff truncated (359 added / 182 removed lines)
```

### openai.codex.plan-usage

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/pricing
- Change: changed
- Prior hash: 8cac49415a6fc9271c1ac405e9ee3464e585c1c1ee8a97976f1d5f63dc7413e6
- Current hash: 72b1166d94b4a5fd40ac26418f91d704605d5e3349fa2bc265010bc88565af35

```diff
- ChatGPT Start searching API Dashboard
- Overview Models Agents Tools Voice & Audio Production API reference Overview
- Using GPT-6 Astra
- Reinforcement fine-tuning
- RFT use cases
- Images and video
- Deep research
- MCP and Connectors
- Local shell
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
- Docs Use cases Docs
- Plugins Workspace Agents Commerce Ads Select...
- File Upload
- Products
- Feeds
- Products
- Promotions
- Bulk API
- Delta Feeds API
- Campaign Targeting
- Conversion-Optimized Campaigns
- Custom Audiences
- Overview Features Configuration Developers Security Administration Use Cases Resources Overview
- Remote
- Cloud environment
- MCP Server
+ Language
+ Loading languages…
+ Theme
+ Docs Overview
+ Using GPT-6.2
+ API credits for ChatGPT subscribers
+ Decisions API
+ Cloud providers
+ Images
+ Image generation Overview
+ Image prompting
+ CSAM classifier
+ Agents API
+ Architecture
+ Configuring Agents
+ Sessions Run and continue sessions
+ Events and items
+ Manage sessions
+ Scheduled automations
+ Automatic review
+ Environments and sandboxes OpenAI-hosted sandboxes
+ Self-hosted sandboxes
+ Sandbox lifecycle
+ Pre-warm sandboxes
+ Sandbox security
+ Files and artifacts
+ Tools and integrations Web search
+ Functions
+ MCP connections
+ Vaults
+ Observability and usage
+ Tracing
+ Errors and recovery
+ API reference
+ Bedrock Managed Agents
+ MCP servers
+ Computer use Integration recipes
+ Driver reference
+ GPT-Live
+ Managing sessions
… diff truncated (353 added / 207 removed lines)
```

## Volatile noise (ignored)

_None._
