# Nexus vendor-intelligence review

Generated: 2026-09-05T17:19:07.733Z

Summary: 36 sources reviewed; 34 material; 1 volatile noise; 1 unchanged.

## Material changes

### anthropic.claude-code.changelog

- Vendor: Anthropic
- Source: https://code.claude.com/docs/en/changelog
- Change: changed
- Prior hash: c80c24ed4c0885a9b451ccd74de4311fe1840447666c67d41fb1923da14dcdf2
- Current hash: 3f6f83405e574480ef3eb66c8183dd6c984f9bb6f6fdcaef3d7abd287cf6d236

```diff
+ <Update label="2.1.261" description="September 4, 2026">
+ * Added an "Organization policy" line to `/status` and `claude doctor` that says why your organization's policy could not be loaded, such as a proxy not passing the endpoint through
+ * Added `bashOutputMaxChars` and `taskOutputMaxChars` settings to raise how much command and background-task output Claude receives inline before it is saved to a file, up to 128K characters
+ * Added `--append-subagent-system-prompt-file` to read the subagent system prompt from a file, for prompts too large to pass on the command line
+ * Added `/skill-doctor` to show which loaded skills go unused and what they cost in context, so you can prune them
+ * Fixed typed or pasted characters occasionally landing out of order or being dropped during fast input or key repeat
+ * Fixed `/add-dir <subdirectory>` printing a false "couldn't be resolved" error when the working directory is on a `/net` automount
+ * Fixed the Bedrock setup wizard hanging when AWS or an AWS credential helper never responds (it now times out with a clear error), and its model checks failing behind a TLS-inspecting proxy
+ * Fixed cloud sessions discarding a plugin synced from claude.ai when managed settings force-enable it in `enabledPlugins`, then falling back to a marketplace clone that could fail
+ * Fixed being unable to delete the character immediately before an inline `[Image #N]` chip in the prompt input
+ * Fixed resuming a session losing hook output and other context around parallel tool calls, which changed the resumed request
+ * Fixed Remote Control showing a stale permission mode when a phone, browser, or claude.ai app attaches to a terminal session or after the mode changes in the terminal
+ * Fixed Remote Control sessions showing as still working (stuck spinner and Stop button) after stopping a turn from a connected phone or browser, or after a local slash command like `/clear`
+ * Fixed SDK and cloud sessions ignoring a Stop or interrupt sent just after the first prompt, before the turn had started; the turn now stops instead of running to completion
+ * Fixed Remote Control uploading a session pulled with `/teleport` into the connected session, which appeared appended to the original on phone and web
+ * Fixed Remote Control's inbound event stream failing behind TLS-inspecting corporate proxies on native Windows
+ * Fixed Remote Control sessions showing the default effort level on claude.ai when the effort comes from settings
+ * Fixed `gcpAuthRefresh` opening a browser at startup when the Google credential check was slow, even though the credential was still valid
+ * Fixed claude.ai connectors staying absent for the whole session when the startup connector fetch timed out — the CLI now retries in the background
+ * Fixed sustained high CPU usage when a background agent could not be resumed and its wake-up was retried in a tight loop
+ * Fixed feature flags gated to a newer version occasionally applying to an older Claude Code version running on the same machine
+ * Fixed `/usage` and the VS Code usage panel dropping a model-specific weekly limit row when the usage endpoint is rate limited or when opened right after startup
+ * Fixed `claude -p --resume <file>` adopting a malformed session ID recorded in the transcript; it now resumes under a fresh session ID instead
+ * Fixed the terminal progress indicator (iTerm2, Ghostty, ConEmu) showing the session as finished while a background workflow or agent was still running
+ * Fixed a rare layout glitch where a box could render with the wrong height after its container switched between row and column direction
+ * Fixed Claude apps gateway client IP when a trusted proxy appends a port to `X-Forwarded-For`; with an access list set, an unreadable entry now gets 403
+ * Fixed Claude apps gateway telling Claude Desktop to export OpenTelemetry as JSON even when the terminal CLI uses protobuf, so protobuf-only collectors rejected Desktop's data
+ * Fixed Desktop and web showing a session as busy while it only watches an artifact for updates
+ * Fixed Claude in Chrome `file_upload` failing with "paths: expected array, received undefined" in local Cowork sessions run from the Claude Desktop app
+ * Fixed `SendMessage` to an offline Remote Control session on another machine reading as delivered; the result now says delivery is queued until that machine reconnects
+ * Fixed plugin install hints from CLIs run in background Bash commands: they are now detected, and the raw `<claude-code-hint>` tag no longer leaks into the conversation
+ * Fixed in-process agent-team teammates re-sending their first-turn tool and skill announcements on the second turn, which changed the request prefix and missed the prompt cache
+ * Improved the `/model` picker and the VS Code model pill to show a model's name instead of its raw Bedrock, Vertex AI, or LLM gateway ID when Claude Code recognizes it
+ * Improved startup on Google Vertex AI when `GOOGLE_APPLICATION_CREDENTIALS` is set: API client creation no longer re-runs Google Cloud project discovery or spawns extra `gcloud` processes
+ * Improved streaming performance: already-rendered blocks are no longer re-checked by layout on each update
+ * Improved the dangerous-`rm` safety prompt to also catch `rm -rf` on positional parameters and inside double-quoted `sh -c` scripts
+ * Improved handling when the API sends no response headers: the retry now waits up to `API_TIMEOUT_MS` (10 minutes by default) instead of another 3 minutes, and the messages say what to change
+ * Changed a Claude apps gateway 403 on the managed settings load (at startup or after `/login`) to say Claude Code may not be enabled for the organization, instead of advising a new sign-in
+ * Changed machines whose managed settings pin `forceLoginMethod: "gateway"` to ignore a leftover API key or claude.ai login and ask for `/login`; Bedrock, Vertex AI, and Foundry sessions are unaffected
+ * Changed auto mode to treat a link that packs content into a public diagram renderer's URL as an upload to that site: no longer auto-approved unless you asked for it
… diff truncated (778 added / 0 removed lines)
```

### anthropic.claude-code.legal

- Vendor: Anthropic
- Source: https://code.claude.com/docs/en/legal-and-compliance
- Change: changed
- Prior hash: e7bcf9bca1f73eeb7f2123348681504178f7786125e806da4140cd55db908ba9
- Current hash: f108f4c2704787c4ab440ad89f4478213d5a12080155111f7debc4e9df491ce6

```diff
- * [Commercial Terms](https://www.anthropic.com/legal/commercial-terms) - for Team, Enterprise, and Claude API users
- If a customer has a Business Associate Agreement (BAA) with us, and wants to use Claude Code, the BAA will automatically extend to cover Claude Code if the customer has executed a BAA and has [Zero Data Retention (ZDR)](/docs/en/zero-data-retention) activated. The BAA will be applicable to that customer's API traffic flowing through Claude Code. ZDR is enabled on a per-organization basis, so each organization must have ZDR enabled separately to be covered under the BAA.
- * **Developers** building products or services that interact with Claude's capabilities, including those using the [Agent SDK](/docs/en/agent-sdk/overview), should use API key authentication through [Claude Console](https://platform.claude.com/) or a supported cloud provider. Anthropic does not permit third-party developers to offer Claude.ai login or to route requests through Free, Pro, or Max plan credentials on behalf of their users.
+ * [Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms) - for Team, Enterprise, and Claude API users
+ ### Can customers offer Claude Code in their products?
+ Unless we've mutually agreed otherwise, preinstalling or running Claude Code in your products or services (e.g. in hosted sandboxes or other agent infrastructure) requires agreeing to our [Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms) and complying with the conditions below:
+ * **The Claude Code binary must not be modified.** Claude Code must be installed and run as published by Anthropic, and customers may not remove, disable, or restrict any authentication method built into it (including methods that permit signing in with a Claude account or the user's own API key).
+ * **Customers may not pay for, resell, or intermediate Claude usage on their end users' behalf.** Each end user must authenticate with their own Anthropic API key, Claude subscription plan credentials, or 3P inference provider credential (Amazon Bedrock, Google Cloud's Agent Platform, Microsoft Foundry). That usage is billed directly to the end user under their own agreement with Anthropic or, for third-party inference providers, with the applicable provider.
+ **Using the Claude Code name and logo.** You can accurately say, in plain text, that your product has Claude Code preinstalled or that it runs Claude Code. But you can't use the Claude Code or Anthropic names or logos as part of your own product, feature, or company name, in your own logo, or in a way that suggests Anthropic built, endorses, or is partnered with your product. Any other use of Anthropic's names or logos is governed by our [Trademark Guidelines](https://www.anthropic.com/legal/trademark-guidelines) and requires our written permission.
+ Claude Code remains governed by Anthropic's standard terms (see the License and Commercial agreements sections above) regardless of the platform through which it is accessed.
+ If a customer has executed a Business Associate Agreement (BAA) with Anthropic and has [Zero Data Retention (ZDR)](/docs/en/zero-data-retention) enabled for the relevant organization, that BAA extends to the customer's API traffic through Claude Code.
+ * **Developers** building products or services that interact with Claude's capabilities, including those using the [Agent SDK](/docs/en/agent-sdk/overview), should use API key authentication through [Claude Console](https://platform.claude.com/) or a supported cloud provider. Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, or Max plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens — sign-in to a Claude account must complete through Anthropic's own flow.
+ This does not restrict how customers provision and manage their own API keys or third-party inference provider credentials — for example, configuring an API key in a development environment, secrets manager, or machine image for use by the customer's own authorized users — provided the resulting usage is billed to the key owner under their agreement with Anthropic (or the applicable provider) and is not resold or intermediated as described above. Nor does it prevent an end user from signing in to the unmodified Claude Code binary with their own Claude subscription, including where a platform hosts Claude Code as described under *Can customers offer Claude Code in their products?* above.
```

### anthropic.platform.access-transparency

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/access-transparency
- Change: changed
- Prior hash: fb85db257149c86ca53a4b14bc8430d712a793e354f52dd7ff75f1d04bf0b6c2
- Current hash: edc51d81b95ed110b6da41731c6b6d15ebf57270e1178a9628b7c4339e8a9bae
- Surface: Anthropic API compliance — Access Transparency (api-compliance)
- Surface note: Access Transparency is a human-access audit facility covering specific Anthropic API customer-data surfaces only. It is NOT Claude Max usage telemetry and does not cover the excluded consumer/application surfaces. Changes here classify strictly under the API-compliance surface and must never be reported as Max or consumer usage telemetry.
- Explicitly excludes: Claude Max plan usage telemetry; Claude consumer application (Claude.ai) surfaces; Claude Code local session telemetry; Claude mobile and desktop application usage

```diff
- --header "x-api-key: $ANTHROPIC_COMPLIANCE_ACCESS_KEY"
- --header "x-api-key: $ANTHROPIC_COMPLIANCE_ACCESS_KEY"
- | Anthropic Workbench | No | The Workbench stores data in data stores that are not covered by Access Transparency |
+ --header "x-api-key: $ANTHROPIC_COMPLIANCE_ACCESS_KEY" \
+ --header "anthropic-version: 2023-06-01"
+ --header "x-api-key: $ANTHROPIC_COMPLIANCE_ACCESS_KEY" \
+ --header "anthropic-version: 2023-06-01"
+ | Playground (Claude Console) | No | Not covered |
```

### anthropic.platform.authentication

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/authentication
- Change: changed
- Prior hash: f2ccf0c17cf163c589edf43e2e3c18378e3c954277231227bb43f7e0319be84b
- Current hash: bfedc8ac0f35c27b64d6594a36fb1b06bc2bb1032937edcb148492a04ae34a41

```diff
- | [API key](https://platform.claude.com/docs/en/manage-claude/authentication#api-keys) | Static `sk-ant-api...` secret in the `x-api-key` header | Local development, prototyping, scripts, and single-tenant servers where you control secret storage |
- API keys and Workload Identity Federation grant the same access to Claude API endpoints. Choose API keys to get started quickly, and move to Workload Identity Federation when your workload already has a platform-issued identity you can federate. Use App Attest for iOS and macOS apps you distribute to end users.
- API keys are static secrets that you generate in the Claude Console and pass on every request.
- * **Create a key:** Go to [Settings → API keys](https://platform.claude.com/settings/keys) in the Claude Console. You choose an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration) as part of creation. Use [workspaces](https://platform.claude.com/settings/workspaces) to scope keys by project or environment.
- * **Send the key:** Set the `x-api-key` header on direct HTTP requests, or set the `ANTHROPIC_API_KEY` environment variable and the [client SDKs](https://platform.claude.com/docs/en/cli-sdks-libraries/overview) pick it up automatically.
- x-api-key: YOUR_API_KEY
- Store API keys in a secrets manager, rotate them periodically, and revoke any key you suspect has leaked. You can also set an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration) when you create a key to limit how long a leaked credential stays usable.
- Expiration limits the lifetime of a leaked credential, but it is not a substitute for secret hygiene. Regardless of expiration, store keys in a secrets manager and revoke any key you suspect has leaked.
+ | [API key](https://platform.claude.com/docs/en/manage-claude/authentication#api-keys) | Static `sk-ant-api...` secret sent as a bearer token in the `Authorization` header | Local development, prototyping, scripts, and servers where you control secret storage |
+ API keys and Workload Identity Federation grant the same access to Claude API endpoints. Choose API keys to get started quickly: a personal key for your own development, or a service account key for anything shared. Move to Workload Identity Federation when your workload already has a platform-issued identity you can federate. Use App Attest for iOS and macOS apps you distribute to end users.
+ API keys are static secrets that you generate in the Claude Console and send on every request as a bearer token in the `Authorization` header.
+ ### Key types
+ When you create a key, you choose its type, which determines what the key can do, where it works, and when it stops working:
+ | Key type | Acts as | Works in | Stops working when |
+ | -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
+ | **Personal key** | You, the user, with your roles and permissions | Either a single workspace or the workspaces where your role allows API use, chosen when the key is created | You lose access to the organization or, for a single-workspace key, to that workspace. Personal keys are archived when you are removed from the organization. If you are re-invited, create new keys; archived keys are not restored |
+ | **Service account key** | A [service account](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation#service-accounts) | Either a single workspace or anything the service account has access to, chosen when the key is created. A service account has access to the Default Workspace and to workspaces it has been added to | The service account is archived or, for a single-workspace key, is removed from that workspace |
+ | **Workspace key** (legacy) | No one: it belongs to the workspace it was created in | That workspace | It expires, is disabled or deleted, or its workspace is archived, regardless of whether its creator leaves the organization |
+ Personal keys and service account keys are identity-backed: each belongs to a user or service account your organization already manages, and every request acts as that identity. When that identity is removed from the organization, the key stops working. This means that keys won't accidentally outlive the people or workloads that own them. Prefer them over workspace keys for new integrations.
+ Use a personal key for your own development and scripts. A shared personal key acts as one person and breaks when they leave. For shared or automated workloads (CI, production services), have an organization admin create a service account so the workload has its own identity.
+ Workspace API keys still work but should be considered legacy; identity-backed keys or [Workload Identity Federation](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation) are preferred. To migrate, see [Replacing workspace API keys](https://platform.claude.com/docs/en/manage-claude/authentication#replacing-workspace-api-keys).
+ ### Create and use a key
+ * **Create a key:** Go to [Settings → API keys](https://platform.claude.com/settings/keys) in the Claude Console and click **Create key**. Name the key and choose an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration). Set **Linked account** to yourself for a personal key, or to a service account for a key shared across multiple users. You can also scope the key to a specific workspace, which lets you skip setting a workspace ID manually in future requests.
+ * **Use the key:** Send it as `Authorization: Bearer <key>` on direct HTTP requests, or set the `ANTHROPIC_API_KEY` environment variable and the [client SDKs](https://platform.claude.com/docs/en/cli-sdks-libraries/overview) pick it up automatically.
+ Authorization: Bearer YOUR_API_KEY
+ The legacy `x-api-key: YOUR_API_KEY` header is still supported in place of `Authorization`.
+ Store API keys in a secrets manager, rotate them periodically, and disable or delete any key you suspect has leaked. On the [API keys page](https://platform.claude.com/settings/keys), **Disable** is reversible (the Admin API reports the key's `status` as `"inactive"`, and **Re-enable** returns it to `"active"`), while **Delete** is permanent: the key is archived and still appears in [List API Keys](https://platform.claude.com/docs/en/api/admin/api_keys/list) with `status: "archived"`. Expired keys can only be deleted. You can also set an [expiration](https://platform.claude.com/docs/en/manage-claude/authentication#key-expiration) when you create a key to limit how long a leaked credential stays usable.
+ ### Select a workspace
+ API keys that are created for a specific workspace only work in that workspace, and API requests using these keys can omit the workspace ID.
+ If your API key isn't scoped to a workspace, you must specify the workspace ID in the `anthropic-workspace-id` header for each request. See the following example for how to set this header in a request or in SDKs.
+ The [Admin API](https://platform.claude.com/docs/en/manage-claude/admin-api) accepts a personal key or service account key only if the key isn't scoped to a specific workspace.
+ You can find a workspace's ID in the **ID** column of [Settings → Workspaces](https://platform.claude.com/settings/workspaces) in the Claude Console, or by calling the [List Workspaces](https://platform.claude.com/docs/en/api/admin/workspaces/list) endpoint. List Workspaces omits the Default Workspace; its ID is in the `anthropic-workspace-id` [response header](https://platform.claude.com/docs/en/manage-claude/workspaces#identify-the-workspace-behind-an-api-response) of any request that runs there.
+ # Required on every request for a multi-workspace key.
+ # Omit the anthropic-workspace-id header for a single-workspace key.
+ -H "anthropic-workspace-id: wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ" \
+ # Required on every command for a multi-workspace key.
+ # Omit --workspace-id for a single-workspace key.
+ ant messages create \
+ --workspace-id wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ \
+ --model claude-opus-5 \
+ --max-tokens 1024 \
+ --message '{role: user, content: "Hello, Claude"}'
+ client = Anthropic() # reads ANTHROPIC_API_KEY
+ # Required on every request for a multi-workspace key.
+ # Omit extra_headers for a single-workspace key.
+ message = client.messages.create(
+ model="claude-opus-5",
+ max_tokens=1024,
… diff truncated (164 added / 8 removed lines)
```

### anthropic.platform.data-retention

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- Change: changed
- Prior hash: 49cd0a59f8f2b7ed7f526f64c5e6f663329a3096b2600b210f7e8185f4949391
- Current hash: 433cd20a2b6f30d93b4c944a869839e3568deb5e5597a4daf9e4ac4b1f0e17c0

```diff
- Several retention models sit outside the ZDR and HIPAA arrangements described on this page. Data accessible through the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) follows its own retention model. The [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) retains data for 6 years. Chat, file, and project content from claude.ai follows your organization's retention policy set in [claude.ai > Organization settings > Data and privacy](https://claude.ai/admin-settings/data-privacy-controls). [Local session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions) (Cowork and Claude Code on users' machines) are stored for 6 years by default, or for your organization's custom conversation retention period when a finite one is set (the same claude.ai setting). [Remote session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions) (Cowork in the cloud) are retained for 6 years. The Compliance API does not capture local sessions for which ZDR is in effect, or any local sessions from organizations with HIPAA readiness enabled.
- * **Console and Workbench:** Any usage on Claude Console or the Workbench prompt-testing interface.
- * **Claude Fable 5 and Claude Mythos 5:** These models require 30-day data retention and are not available under ZDR. See [Model-specific data retention requirements](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements).
- * **Console and Workbench:** Usage through the Claude Console interface (enabling HIPAA readiness from Console settings is supported; processing PHI through the Console is not covered).
- The error message lists the non-eligible features detected in the request; remove them and retry. The phrase "without Zero Data Retention" is the API's own wording and does not change the resolution.
- HIPAA readiness controls are applied to your organization as soon as you accept. Once HIPAA readiness is enabled for your organization, the configuration is permanent and cannot be disabled by an administrator. The API automatically enforces feature restrictions, returning an error for requests that use non-eligible features. See [HIPAA error handling](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#hipaa-error-handling).
- Claude Fable 5 and Claude Mythos 5 are designated Covered Models (see the [Covered Models support article](https://support.claude.com/en/articles/15425695)) and require 30-day data retention; ZDR is therefore not available for either model. On the Claude API, requests to Claude Fable 5 from an organization whose data retention configuration does not meet this requirement return a `400 invalid_request_error`:
- Organizations with a ZDR arrangement can make Claude Fable 5 and Claude Mythos 5 available in a specific workspace by enabling 30-day retention for that workspace only. Other workspaces in the organization keep zero data retention.
- Requests to Claude Fable 5 and Claude Mythos 5 from this workspace now succeed. Workspaces without an override continue to follow the organization default.
- * **No:** The feature is not eligible. Under HIPAA readiness, the API blocks requests that include a "No" feature and returns a `400` error. Under ZDR, the API does **not** block these features; using one is a choice to step outside your ZDR arrangement for that specific data, and the feature's own documented retention policy applies. Features marked "No" for ZDR are typically stateful (they store jobs, files, or container state), which is why they cannot be zero-retention.
- | [Computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) | `/v1/messages` (with `computer` tool) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | Client-side tool where screenshots and files are captured and stored in your environment, not by Anthropic. See [Computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool#data-retention). |
- | [Files API](https://platform.claude.com/docs/en/build-with-claude/files) | `/v1/files` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Files retained until explicitly deleted. See [Files API](https://platform.claude.com/docs/en/build-with-claude/files#data-retention). |
- | [Web fetch](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool) | `/v1/messages` (with `web_fetch` tool) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Fetched web content returned in the API response. [Dynamic filtering](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool#dynamic-filtering) is not eligible for ZDR or HIPAA. Website publishers may retain request data (such as fetched URLs and request metadata) according to their own policies. |
- The API returns a `400` error with an `invalid_request_error` type. The error message identifies which features are not available. Remove the non-eligible features from your request and retry. See [HIPAA error handling](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#hipaa-error-handling).
- No. HIPAA readiness is enforced at the organization level and automatically blocks all non-eligible features. Use a separate organization for workloads that do not require HIPAA readiness.
- * [Files API reference](https://platform.claude.com/docs/en/api/beta/files/upload)
+ Several retention models sit outside the ZDR and HIPAA arrangements described on this page. Data accessible through the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) follows its own retention model. The [Activity Feed](https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed) retains data for 6 years. Chat, file, and project content from claude.ai follows your organization's retention policy set in [claude.ai > Organization settings > Data and privacy](https://claude.ai/admin-settings/data-privacy-controls). [Local session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions) (from sessions on users' machines, in apps such as Cowork and Claude Code) are stored for 6 years by default, or for your organization's custom conversation retention period when a finite one is set (the same claude.ai setting). [Remote session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-remote-sessions) (Cowork in the cloud) are retained for 6 years, unless a user deletes the session sooner. The Compliance API does not capture local sessions for which ZDR is in effect, or any local sessions from organizations with HIPAA readiness enabled.
+ * **Claude Console:** Any usage in the Claude Console, including playground.
+ * **Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, and Claude Mythos 5:** These models require 30-day data retention and are not available under ZDR unless expressly authorized by Anthropic. See [Model-specific data retention requirements](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements).
+ * **Claude Console:** Usage through the Claude Console interface (enabling HIPAA readiness from Console settings is supported; processing PHI through the Console is not covered).
+ The error message lists the non-eligible features detected in the request; remove them and retry. The phrase "without Zero Data Retention" is the API's own wording and does not change the resolution. Client-side tools whose Details column in the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) says they are not blocked are accepted but remain outside HIPAA readiness.
+ HIPAA readiness controls are applied to your organization as soon as you accept. Once HIPAA readiness is enabled for your organization, the configuration is permanent and cannot be disabled by an administrator. The API automatically enforces feature restrictions, returning an error for requests that use non-eligible features. See [HIPAA error handling](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#hipaa-error-handling) for the error and the client-side tool exception.
+ Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, and Claude Mythos 5 are designated Covered Models (see the [Covered Models support article](https://support.claude.com/en/articles/15425695)) and require 30-day data retention; ZDR is therefore not available for any of them unless expressly authorized by Anthropic. On the Claude API, requests to Claude Fable 5 from an organization whose data retention configuration does not meet this requirement return a `400 invalid_request_error`:
+ Organizations with a ZDR arrangement can make these models available in a specific workspace by enabling 30-day retention for that workspace only. Other workspaces in the organization keep zero data retention.
+ Requests to Covered Models from this workspace now succeed. Workspaces without an override continue to follow the organization default.
+ * **No:** The feature is not eligible. Under HIPAA readiness, the API blocks requests that include a "No" feature and returns a `400` error, unless the feature's Details column says otherwise. Under ZDR, the API does **not** block these features; using one is a choice to step outside your ZDR arrangement for that specific data, and the feature's own documented retention policy applies. Features marked "No" for ZDR are typically stateful (they store jobs, files, or container state), which is why they cannot be zero-retention.
+ | [Browser use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool) | `/v1/messages` (with `browser` toolset) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Client-side tool. Anthropic does not run browser actions or retain page content beyond standard API handling. Not covered under HIPAA readiness; requests that include the browser use tool are not blocked. See [Browser use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool#data-retention). |
+ | [Computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) | `/v1/messages` (with `computer` toolset or tool) | <Eligible>Yes</Eligible> | <Eligible>Yes</Eligible> | Client-side tool where screenshots and files are captured and stored in your environment, not by Anthropic. See [Computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool#data-retention). |
+ | [Files API](https://platform.claude.com/docs/en/build-with-claude/files) | `/v1/files` | <Eligible status="no">No</Eligible> | <Eligible status="no">No</Eligible> | Files retained until explicitly deleted or they reach their configured expiration. See [Files API](https://platform.claude.com/docs/en/build-with-claude/files#data-retention). |
+ | [Web fetch](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool) | `/v1/messages` (with `web_fetch` tool) | <Eligible>Yes</Eligible> | <Eligible status="no">No</Eligible> | Fetched web content returned in the API response. [Dynamic filtering](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool#dynamic-filtering) is not eligible for ZDR or HIPAA. Website publishers may retain request data (such as fetched URLs and request metadata) according to their own policies. |
+ The API returns a `400` error with an `invalid_request_error` type, except for the client-side tools whose Details column in the [feature eligibility table](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#feature-eligibility) says they are not blocked (those are accepted but remain outside HIPAA readiness). The error message identifies which features are not available. Remove those features from your request and retry. See [HIPAA error handling](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#hipaa-error-handling).
+ No. HIPAA readiness is enforced at the organization level and automatically blocks non-eligible features (client-side tools noted in the table's Details column are the exception: they are not blocked, but they are still outside HIPAA readiness). Use a separate organization for workloads that do not require HIPAA readiness.
+ * [Files API reference](https://platform.claude.com/docs/en/api/files/upload)
```

### anthropic.platform.release-notes

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/release-notes/overview
- Change: changed
- Prior hash: 69bed00add900550b00b736d3da4a747a215df7fc72454c4f074e45e3eab50a2
- Current hash: 6ad4dafb0e1ebb480b0fc37f66899ce0169662bc9265b5c3f82256c6d50535ba

```diff
- * We've retired the Claude Opus 4.1 model (`claude-opus-4-1-20250805`). All requests to this model on the Claude API will now return an error. We recommend upgrading to [Claude Opus 5](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison). Researchers can request ongoing access through the [External Researcher Access Program](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program).
- * We've launched **Claude Opus 5** (`claude-opus-5`), a step-change improvement over Claude Opus 4.8. Claude Opus 5 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) (both the default and the maximum), 128k max output tokens, and [thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) on by default, at $5 / $25 USD per MTok, the same pricing as Claude Opus 4.8. It's available on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Claude on Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5) for new features, behavior changes, and migration guidance, and the [models overview](https://platform.claude.com/docs/en/about-claude/models/overview) for complete specs.
- * On Claude Opus 5, disabling thinking is allowed only at effort `high` or below: `thinking: {"type": "disabled"}` with effort `xhigh` or `max` returns a 400 error, a breaking change from Claude Opus 4.8. See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5#behavior-changes).
- * We've removed [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) for Claude Opus 4.7. Requests to `claude-opus-4-7` with `speed: "fast"` now return an error; unlike Claude Opus 4.6, they do not fall back to standard speed. Claude Opus 4.7 itself remains available at standard speed. To continue using fast mode, migrate to [Claude Opus 5](https://platform.claude.com/docs/en/about-claude/models/migration-guide#migrating-from-claude-opus-47) or Claude Opus 4.8. Read more in [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode#supported-models).
- * We've launched **Claude Sonnet 5** (`claude-sonnet-5`), the next generation of our Sonnet model family, at introductory pricing of $2 / $10 per MTok (made the standard price on August 10, 2026). Claude Sonnet 5 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows), 128k max output tokens, and the same set of tools and platform features as Claude Sonnet 4.6, except [Priority Tier](https://platform.claude.com/docs/en/api/service-tiers#supported-models), which is not available on Claude Sonnet 5. Three behavior changes apply when migrating: [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) is now on by default; manual extended thinking (`thinking: {type: "enabled", budget_tokens: N}`) is removed and returns a 400 error (it was deprecated on Sonnet 4.6); and setting sampling parameters (`temperature`, `top_p`, `top_k`) to non-default values returns a 400 error. Claude Sonnet 5 also uses a new tokenizer that produces approximately 30% more tokens for the same text. The exact increase depends on the content and workload shape. See [What's new in Claude Sonnet 5](https://platform.claude.com/docs/en/about-claude/models/whats-new-sonnet-5) for details and migration guidance. For behavioral differences and model-specific prompting patterns, see [Prompting Claude Sonnet 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5).
- * The Python, TypeScript, Go, Java, Ruby, PHP, and C# SDKs now include support for `code_execution_20260120`, the [code execution tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool) version that adds REPL state persistence and is the minimum version for [programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling). To adopt it, set the tool's `type` to `code_execution_20260120`; no beta header is required. It's available on Claude Fable 5, Claude Mythos 5, Claude Opus 4.5 and newer, and Claude Sonnet 4.5 and newer; see the [model compatibility table](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool#model-compatibility).
- * We've retired the Claude Sonnet 4 model (`claude-sonnet-4-20250514`) and the Claude Opus 4 model (`claude-opus-4-20250514`). All requests to these models on the Claude API will now return an error. We recommend upgrading to [Claude Sonnet 4.6](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison) and [Claude Opus 4.8](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison) respectively. Researchers can request ongoing access through the [External Researcher Access Program](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program).
- * We've launched **Claude Fable 5** (`claude-fable-5`), our most capable widely released model, alongside **Claude Mythos 5** (`claude-mythos-5`) for Project Glasswing participants. Both models support a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) by default, 128k max output tokens, and always-on [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking). See [Introducing Claude Fable 5 and Claude Mythos 5](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5) for capabilities, API changes, and availability.
- * On Claude Fable 5 and Claude Mythos 5, [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) is the only thinking mode: `thinking: {"type": "disabled"}` is not supported, and manual extended thinking budgets and assistant prefill are not supported (both return a 400 error). See [Migrating from Claude Mythos Preview to Claude Mythos 5](https://platform.claude.com/docs/en/about-claude/models/migration-guide#migrating-from-claude-mythos-preview).
- * We've launched **Claude Opus 4.8** (claude-opus-4-8), our most capable generally available model. Claude Opus 4.8 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) by default on the Claude API, Amazon Bedrock, Google Cloud, and Microsoft Foundry, 128k max output tokens, and the same set of tools and platform features as Claude Opus 4.7. See the [migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide) for baseline settings, features, and migration guidance.
- * [Workload Identity Federation](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation) is now generally available. Authenticate workloads to the Claude API with short-lived OIDC tokens from your own identity provider (AWS IAM, Google Cloud, GitHub Actions, Kubernetes, Microsoft Entra ID, Okta, SPIFFE, and more) instead of long-lived static API keys. Configure issuers and federation rules in the Claude Console, and the SDK handles token exchange and refresh automatically. See [Authentication](https://platform.claude.com/docs/en/manage-claude/authentication).
- * We've retired the 1M token context window beta (`context-1m-2025-08-07`) for Claude Sonnet 4.5 and Claude Sonnet 4. The beta header now has no effect on these models, and requests exceeding the standard 200k-token context window return an error. To use the 1M context window, migrate to [Claude Sonnet 4.6](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison) or [Claude Opus 4.6](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison), where it's generally available at standard pricing with no beta header required.
- * We've retired the Claude Haiku 3 model (`claude-3-haiku-20240307`). All requests to this model will now return an error. We recommend upgrading to [Claude Haiku 4.5](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison).
- * We've launched [Claude Opus 4.7](https://www.anthropic.com/news/claude-opus-4-7), our most capable generally available model for complex reasoning and agentic coding, at the same $5 / $25 per MTok pricing as Opus 4.6. See [What's new in Claude Opus 4.7](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7) for capability improvements, new features, and the updated tokenizer. Opus 4.7 includes API breaking changes versus Opus 4.6; see the [migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide) before upgrading.
- * We announced the deprecation of the Claude Sonnet 4 model (`claude-sonnet-4-20250514`) and the Claude Opus 4 model (`claude-opus-4-20250514`), with retirement on the Claude API scheduled for June 15, 2026. We recommend migrating to [Claude Sonnet 4.6](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison) and [Claude Opus 4.8](https://platform.claude.com/docs/en/about-claude/models/migration-guide) respectively. Read more in [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations).
- * We're retiring the 1M token context window beta for Claude Sonnet 4.5 and Claude Sonnet 4 on **April 30, 2026**. After that date, the `context-1m-2025-08-07` beta header will have no effect on these models, and requests that exceed the standard 200k-token context window will return an error. To continue using 1M context windows, migrate to [Claude Sonnet 4.6](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison) or [Claude Opus 4.6](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison), which support the full 1M token context window at standard pricing with no beta header required.
- * The [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) is now generally available for Claude Opus 4.6 and Sonnet 4.6 at standard pricing. Requests over 200k tokens work automatically for these models with no beta header required. The 1M token context window remains in beta for Claude Sonnet 4.5 and Sonnet 4.
- * We've retired the Claude Sonnet 3.7 model (`claude-3-7-sonnet-20250219`) and the Claude Haiku 3.5 model (`claude-3-5-haiku-20241022`). All requests to Claude Sonnet 3.7 will now return an error. Requests to Claude Haiku 3.5 on the Claude API will now return an error; it remains available on Amazon Bedrock and Google Cloud. We recommend upgrading to [Claude Sonnet 4.6](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison) and [Claude Haiku 4.5](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison) respectively. Researchers can request ongoing access through the [External Researcher Access Program](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program).
- * We announced the deprecation of the Claude Haiku 3 model (`claude-3-haiku-20240307`), with retirement scheduled for April 20, 2026. We recommend migrating to [Claude Haiku 4.5](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison). Read more in [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations).
- * The [web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) and [programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling) are now generally available (no beta header required). Web search and web fetch now support [dynamic filtering](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool#dynamic-filtering), which uses code execution to filter results before they reach the context window for better performance and reduced token cost.
- * The [code execution tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool), [web fetch tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool), [tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool), [tool use examples](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#providing-tool-use-examples), and [memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool) are now generally available (no beta header required).
- * The [effort parameter](https://platform.claude.com/docs/en/build-with-claude/effort) is now generally available (no beta header required) and supports Claude Opus 4.6. Effort replaces `budget_tokens` for controlling thinking depth on new models.
- * [Fine-grained tool streaming](https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming) is now generally available on all models and platforms (no beta header required).
- * [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) are now generally available on the Claude API for Claude Sonnet 4.5, Claude Opus 4.5, and Claude Haiku 4.5. GA includes expanded schema support, improved grammar compilation latency, and a simplified integration path with no beta header required. The `output_format` parameter has moved to `output_config.format`. Existing beta users can continue using the beta header during the transition period. Structured outputs remain in public beta on Amazon Bedrock and Microsoft Foundry.
- * We've retired the Claude Opus 3 model (`claude-3-opus-20240229`). All requests to this model will now return an error. We recommend upgrading to [Claude Opus 4.5](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison), which offers significantly improved intelligence at a third of the cost. Researchers can request ongoing access to Claude Opus 3 on the API through the [External Researcher Access Program](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program).
- * Search result content blocks are now generally available on Amazon Bedrock. Learn more in [Search results](https://platform.claude.com/docs/en/build-with-claude/search-results).
- * Learn more in [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) and [API reference](https://platform.claude.com/docs/en/api/skills/create-skill)
- * We've launched [Claude Sonnet 4.5](https://www.anthropic.com/news/claude-sonnet-4-5), our best model for complex agents and coding, with the highest intelligence across most tasks. Learn more in the [models overview](https://platform.claude.com/docs/en/about-claude/models/overview).
- * The 1-hour cache duration for prompt caching is now generally available. You can now use the extended cache TTL without a beta header. Learn more in [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#1-hour-cache-duration).
- * Search result content blocks are now generally available on the Claude API and Vertex AI. This feature enables natural citations for RAG applications with proper source attribution. The beta header `search-results-2025-06-09` is no longer required. Learn more in [Search results](https://platform.claude.com/docs/en/build-with-claude/search-results).
- * We've moved our [Go SDK](https://github.com/anthropics/anthropic-sdk-go) from beta to GA.
- * We've moved our [Ruby SDK](https://github.com/anthropics/anthropic-sdk-ruby) from beta to GA.
- * We've moved our [Java SDK](https://github.com/anthropics/anthropic-sdk-java) from beta to GA.
- The following features are now generally available in the Claude API:
- * [Models API](https://platform.claude.com/docs/en/api/models/list): Query available models, validate model IDs, and resolve [model aliases](https://platform.claude.com/docs/en/about-claude/models/overview) to their canonical model IDs.
- * We've moved 8,192 token outputs from beta to general availability for Claude Sonnet 3.5.
- * [Claude Sonnet 3.5](https://www.anthropic.com/news/claude-3-5-sonnet), our most intelligent model yet, is now generally available across the Claude API, Amazon Bedrock, and Vertex AI.
- * [Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) is now generally available across the Claude API, Amazon Bedrock, and Vertex AI.
+ The Claude Platform release notes list changes to the Claude API, the client SDKs, and the Claude Console, newest first.
+ ### September 3, 2026
+ * Version 1.30.0 of the `ant` CLI adds `ant apply`, which creates and updates agents, environments, skills, memory stores, and deployments from files in your repository. Describe each resource in a file, run `ant apply`, and approve the plan it prints. Commit the `claude-lock.json` lockfile it writes so that later runs, on your machine or in CI, update the same resources instead of creating new ones. See [Manage resources as code with ant apply](https://platform.claude.com/docs/en/cli-sdks-libraries/cli/apply).
+ ### September 1, 2026
+ * We've launched **Claude Fable 5.1** (`claude-fable-5-1`), the successor to Claude Fable 5 for long-running agentic coding, knowledge work, and research, alongside **Claude Mythos 5.1** (`claude-mythos-5-1`) for Project Glasswing participants. Both models support a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) by default, 128k max output tokens, and always-on [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/thinking), at $10 / $50 USD per MTok, the same as Claude Fable 5, with cache reads cut to $0.25 per MTok. Claude Fable 5.1 is available on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws), [Claude on Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What's new in Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1) for capabilities, API changes, and migration guidance.
+ * Prompt cache reads on Claude Fable 5.1 and Claude Mythos 5.1 cost $0.25 USD per million tokens: 0.025x the base input price, compared with 0.1x on other models. Cache writes are unchanged. See [Prompt caching pricing](https://platform.claude.com/docs/en/about-claude/pricing#prompt-caching).
+ * On Claude Fable 5.1 and Claude Mythos 5.1, `tool_choice` types `any` and `tool` aren't supported and return a 400 error. `auto` and `none` are unchanged. To guarantee schema-conformant tool inputs, use [strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use) or [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
+ * Thinking blocks produced by Claude Fable 5.1 and Claude Mythos 5.1 are preserved only for the model that produced them or a newer one: earlier models can't read them, and the API drops one replayed to an earlier model. Claude Fable 5.1 accepts thinking blocks from Claude Opus 5, Claude Fable 5, Claude Mythos 5, and earlier Claude models. On Claude Fable 5.1, the API also [checks that nothing before a block has changed](https://platform.claude.com/docs/en/build-with-claude/thinking#preserved-in-conversation): for new accounts created on or after August 31, 2026, replaying one after the `system` prompt, `tools`, or an earlier message changed returns a 400 error. With the `thinking-binding-controls-2026-08-01` beta header, dropped blocks are reported in an `input_transformations` response field, and `thinking.block_binding.prefix_mismatch_behavior` chooses between rejecting and dropping blocks whose history changed. See [Preserved thinking](https://platform.claude.com/docs/en/build-with-claude/thinking#preserved-thinking).
+ * Per-message effort changes are in beta on Claude Fable 5.1, Claude Mythos 5.1, and Claude Opus 5 on the Claude API. Add a `role: "system"` message with `output_config.effort` inside `messages` to change effort for later turns while preserving the prompt cache. Include the `mid-conversation-output-config-2026-07-01` beta header in your requests. See [Per-message effort](https://platform.claude.com/docs/en/build-with-claude/effort#change-effort-mid-conversation-beta).
+ * [Turn-scoped system messages](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages#turn-scoped-system-messages) are in beta (`mid-conversation-system-clear-at-2026-08-21` header). Set `clear_at: "next_user_message"` on a mid-conversation `role: "system"` message and it renders for the current turn only, then stays in the history at no token cost. Per-turn reminders don't accumulate and don't invalidate the prompt cache or later thinking blocks.
+ * `thinking.display` accepts a third value, `"updates"`, in beta (`thinking-display-updates-2026-08-18` header). Reasoning comes back with an empty `thinking` field, as under `"omitted"`, and the short progress updates that Claude Fable 5.1, Claude Mythos 5.1, and Claude Fable 5 write between tool calls come back as text, at most one `thinking` block before a tool call. See [Progress updates between tool calls](https://platform.claude.com/docs/en/build-with-claude/thinking#progress-updates).
+ * Text generated by Claude Fable 5.1 and Claude Mythos 5.1 carries Anthropic's text watermark, and supported image, video, and audio files that Claude produces through the [code execution tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool) carry C2PA Content Credentials when you retrieve them through the [Files API](https://platform.claude.com/docs/en/build-with-claude/files) on the Claude API. Marking requires no changes to your requests or response handling.
+ * Like Claude Fable 5, both models require 30-day data retention and aren't available under zero data retention unless expressly authorized by Anthropic. See [Model-specific data retention requirements](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention#model-specific-data-retention-requirements).
+ * The guides for the Claude Enterprise endpoints of the [Admin API](https://platform.claude.com/docs/en/api/admin) ([user management](https://platform.claude.com/docs/en/manage-claude/user-management) and [spend limits](https://platform.claude.com/docs/en/manage-claude/spend-limits-api)), the [Claude Enterprise Analytics API](https://platform.claude.com/docs/en/manage-claude/analytics-api), and the [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) now show the `anthropic-version` header; send it on every request to these endpoints, as in the rest of the Claude API. See [API versions](https://platform.claude.com/docs/en/api/versioning).
+ ### August 27, 2026
+ * In Python SDK 1.2.0, TypeScript SDK 0.122.0, Go SDK 1.68.0, Java SDK 2.59.0, Ruby SDK 1.67.0, and C# SDK 12.44.0, `client.beta.files` and `client.beta.skills` no longer send the `files-api-2025-04-14` and `skills-2025-10-02` beta headers and return the same shapes as `client.files` and `client.skills`. With this change, `client.beta.skills.delete()` deletes a Skill together with all of its versions, and the beta Messages type `BetaSkill` (the container Skill reference) is renamed `BetaContainerSkill`. Requests that still send the beta headers keep receiving the beta shapes. See [Migrate from `files-api-2025-04-14`](https://platform.claude.com/docs/en/build-with-claude/files#migrate-from-files-api-2025-04-14) and [Migrate from `skills-2025-10-02`](https://platform.claude.com/docs/en/build-with-claude/skills-guide#migrate-from-skills-2025-10-02).
+ - You can now create **personal keys** and **service account keys** in the Claude Console. They act as you or as a [service account](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation#service-accounts), with the same permissions, and stop working when the linked account is removed from an organization. This lets organization admins more easily track usage for each account, and ensure key usage is legitimate. These API keys can be scoped to a specific workspace or [work on admin endpoints and across any workspace](https://platform.claude.com/docs/en/manage-claude/authentication#select-a-workspace) the account has access to. Workspace API keys remain supported as a legacy option. See [API keys](https://platform.claude.com/docs/en/manage-claude/authentication#api-keys) for more information.
+ ### August 26, 2026
+ * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) session endpoints are out of beta for Cowork and Claude Code sessions. See [Retrieve session transcripts](https://platform.claude.com/docs/en/manage-claude/compliance-sessions).
+ * The [Compliance API](https://platform.claude.com/docs/en/manage-claude/compliance-api) local session endpoints now also return transcripts of Claude Science sessions (`product_surface` value `claude_science`) and Claude for Microsoft 365 sessions in Excel, PowerPoint, Word, and Outlook (`product_surface` values beginning with `office_agents`), in beta for Claude Enterprise organizations, with your existing Compliance Access Key and the `read:compliance_user_data` scope. See [Sessions on users' machines](https://platform.claude.com/docs/en/manage-claude/compliance-sessions#retrieve-local-sessions).
+ - The [Admin API](https://platform.claude.com/docs/en/manage-claude/admin-api) is now available in the `ant` CLI and the Python, TypeScript, C#, Go, Java, PHP, and Ruby SDKs under `client.beta.organization`. They cover organization info, members, invites, workspaces and workspace members, API keys, rate limits, service accounts, workload identity federation issuers and rules, and customer-managed encryption keys. Usage and cost reports and the Claude Enterprise user-management and analytics endpoints remain curl-only. The CLI and SDKs read an Admin API key from `ANTHROPIC_API_KEY` or an `org:admin` OAuth token from `ANTHROPIC_AUTH_TOKEN`.
+ ### August 20, 2026
+ * We've released **v1.0 of the [Python SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/python)**. The SDK's HTTP layer moves from `httpx` to [httpx2](https://httpx2.pydantic.dev), a maintained, API-compatible fork: build custom `http_client`, `Timeout`, and transport objects from `httpx2` (the `DefaultHttpxClient` helpers are unchanged), and call `httpx2.alias_httpx()` at startup if you rely on tracing or mocking libraries that patch `httpx`. v1.0 requires Python 3.10 or later and removes long-deprecated surface, including the legacy Text Completions API, the `temperature`, `top_p`, and `top_k` parameters on Messages methods, and the tool runner's client-side `compaction_control`. On the async client, `.with_raw_response` results now need `await response.parse()`, and `AnthropicBedrock` now raises an error when no AWS region is configured instead of defaulting to `us-east-1`. See the [v1 migration guide](https://github.com/anthropics/anthropic-sdk-python/blob/main/MIGRATION.md) for every change with before-and-after snippets.
+ * The [computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) and [browser use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool) toolsets (`computer_toolset_20260801` and `browser_toolset_20260801`) are now available on [Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai) for Claude Fable 5, Claude Mythos 5, Claude Opus 5, Claude Sonnet 5, and Claude Opus 4.8. Requests use the same `tools` entries as on the Claude API.
+ ### August 19, 2026
+ * The [computer use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) is out of beta on the Claude API as the `computer_toolset_20260801` toolset: no beta header, batch actions (several actions in one turn), `zoom` enabled by default, and per-member configuration through `configs`. Earlier beta versions remain available. Upgrading an existing integration changes the request shape and tool handling; see [Migrate from `computer_20251124`](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool#migrate-from-computer-20251124).
+ * We've launched the [browser use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool) (`browser_toolset_20260801`), a client toolset for driving a browser that your application hosts. It works inside a browser viewport rather than a whole desktop, reading the page itself (its accessibility tree, elements, forms, and tabs) and adding element references, form input, tab management, download reporting, and opt-in file upload on top of screenshot-and-click control.
+ * Both toolsets are available for Claude Fable 5, Claude Mythos 5, Claude Opus 5, Claude Sonnet 5, and Claude Opus 4.8 on the Claude API.
+ * The [Files API](https://platform.claude.com/docs/en/build-with-claude/files) is out of beta on the Claude API. Requests to the `/v1/files` endpoints, and Messages API requests that reference an uploaded file, no longer require the `files-api-2025-04-14` beta header. Requests sent without the header use the current response format: [file expiration](https://platform.claude.com/docs/en/build-with-claude/files#file-expiration) (set `expires_in_seconds` when you upload a file; file objects report `expires_at`), and `page` and `next_page` [pagination](https://platform.claude.com/docs/en/api/overview#pagination) plus an `ids[]` filter when you [list files](https://platform.claude.com/docs/en/build-with-claude/files#list-files). `/v1/files` requests that still send the beta header keep working and return the previous response format. To move an existing integration off the header, see [Migrate from `files-api-2025-04-14`](https://platform.claude.com/docs/en/build-with-claude/files#migrate-from-files-api-2025-04-14).
+ * [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) and the Skills API (`/v1/skills`) are out of beta on the Claude API. Requests no longer require the `skills-2025-10-02` beta header, including Messages API requests that load Skills through the `container` parameter. Requests that still send the header continue to work unchanged. See [Using Agent Skills with the API](https://platform.claude.com/docs/en/build-with-claude/skills-guide). To move an existing integration off the header, see [Migrate from `skills-2025-10-02`](https://platform.claude.com/docs/en/build-with-claude/skills-guide#migrate-from-skills-2025-10-02).
+ * The [Admin API](https://platform.claude.com/docs/en/api/admin) user-management endpoints for **Claude Enterprise** (claude.ai) organizations (members, invites, groups, and custom roles) are out of beta. The `anthropic-beta: ce-user-management-2026-07-13` header is no longer required on group and custom-role requests; requests that still send it are accepted unchanged. See [User management](https://platform.claude.com/docs/en/manage-claude/user-management).
+ * You can now restrict which sites a Claude Managed Agents agent's `web_search` and `web_fetch` tools can reach. Set `allowed_domains` or `blocked_domains` on the tool's entry in the `agent_toolset_20260401` `configs` array; `web_fetch` also accepts `max_content_tokens` and `web_search` accepts `user_location`. Each `configs` entry is identified by its `name` and typed by an optional `type`, and requests that pass only `name`, `enabled`, and `permission_policy` continue to work; in the typed SDKs, `configs` entries become per-tool types. See [Restrict web search and web fetch domains](https://platform.claude.com/docs/en/managed-agents/tools#restrict-web-search-and-web-fetch-domains).
+ * Claude Managed Agents sessions that run in a [self-hosted sandbox](https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes) can now attach [memory stores](https://platform.claude.com/docs/en/managed-agents/memory). The Python, TypeScript, and Go SDK workers download each attached store into the sandbox at its `mount_path` and sync the agent's changes back to the store. See [Use memory stores](https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes#use-memory-stores).
+ * The session viewer in the Claude Console has been redesigned with a timeline minimap, a transcript grouped by model request, and an Inspector panel for session details and cost, raw events, per-tool statistics, mounted resources, and per-thread activity. See [Console observability](https://platform.claude.com/docs/en/managed-agents/events-and-streaming#console-observability).
+ ### August 18, 2026
+ * Workbench is now [**playground**](https://platform.claude.com/playground) in the Claude Console. Playground supports every Messages API parameter and includes templates that demonstrate API features such as code execution and web search. It shows the full SDK request and the API response for each run, to help you understand the API and build with it. For more, see the [Claude Help Center](https://support.claude.com/en/articles/8606378-how-do-i-use-playground) or try it at [platform.claude.com/playground](https://platform.claude.com/playground).
+ * We've retired the Claude Opus 4.1 model (`claude-opus-4-1-20250805`). All requests to this model on the Claude API will now return an error. We recommend upgrading to [Claude Opus 5](https://platform.claude.com/docs/en/models/overview#latest-models-comparison). Researchers can request ongoing access through the [External Researcher Access Program](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program).
+ * We've launched **Claude Opus 5** (`claude-opus-5`), a step-change improvement over Claude Opus 4.8. Claude Opus 5 supports a [1M token context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) (both the default and the maximum), 128k max output tokens, and [thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) on by default, at $5 / $25 USD per MTok, the same pricing as Claude Opus 4.8. It's available on the Claude API, [Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock), [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws), [Claude on Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai), and [Claude in Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/whats-new-opus-5) for new features, behavior changes, and migration guidance, and the [models overview](https://platform.claude.com/docs/en/models/overview) for complete specs.
+ * On Claude Opus 5, disabling thinking is allowed only at effort `high` or below: `thinking: {"type": "disabled"}` with effort `xhigh` or `max` returns a 400 error, a breaking change from Claude Opus 4.8. See [What's new in Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/whats-new-opus-5#behavior-changes).
+ * We've removed [fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) for Claude Opus 4.7. Requests to `claude-opus-4-7` with `speed: "fast"` now return an error; unlike Claude Opus 4.6, they do not fall back to standard speed. Claude Opus 4.7 itself remains available at standard speed. To continue using fast mode, migrate to [Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/migration-guide#migrating-from-claude-opus-47) or Claude Opus 4.8. Read more in [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode#supported-models).
… diff truncated (74 added / 38 removed lines)
```

### anthropic.platform.token-counting

- Vendor: Anthropic
- Source: https://platform.claude.com/docs/en/build-with-claude/token-counting
- Change: changed
- Prior hash: 5b3a644ba8d7a22730b83f535c44ab20c21dce808832fb657f8da65b58435f14
- Current hash: b409c3a73340bc01db6373c959b3c889bb4c0d5f5482c424fdfed268cbe5f030

```diff
- All [active models](https://platform.claude.com/docs/en/about-claude/models/overview) support token counting, including Claude Opus 5 and Claude Sonnet 5.
- import httpx
- image_data = base64.standard_b64encode(httpx.get(image_url).content).decode("utf-8")
- * Thinking blocks from **previous** assistant turns are ignored and **do not** count toward your input tokens
- "model": "claude-sonnet-4-6",
- "type": "enabled",
- "budget_tokens": 16000
- model: claude-sonnet-4-6
- type: enabled
- budget_tokens: 16000
- model="claude-sonnet-4-6",
- thinking={"type": "enabled", "budget_tokens": 16000},
- model: "claude-sonnet-4-6",
- type: "enabled",
- budget_tokens: 16000
- Model = Model.ClaudeSonnet4_6,
- Thinking = new ThinkingConfigEnabled(budgetTokens: 16000),
- Model: anthropic.ModelClaudeSonnet4_6,
- Thinking: anthropic.ThinkingConfigParamOfEnabled(16000),
- .model(Model.CLAUDE_SONNET_4_6)
- .enabledThinking(16000)
- model: 'claude-sonnet-4-6',
- thinking: [
- 'type' => 'enabled',
- 'budget_tokens' => 16000
- model: "claude-sonnet-4-6",
- type: "enabled",
- budget_tokens: 16000
- ## Token counts on Claude Fable 5 and Claude Mythos 5
- Claude Fable 5 and Claude Mythos 5 use the tokenizer introduced with Claude Opus 4.7, which produces roughly 30 percent more tokens than models before Claude Opus 4.7 for the same text. The exact increase depends on the content and workload shape. The token counting endpoint returns the count under the tokenizer of the `model` you pass, so to measure the difference for your workload, count the same request twice: once with your current model and once with `model: "claude-fable-5"` (or `"claude-mythos-5"`), and compare the two `input_tokens` values.
- **Billing and migration:** Usage and billing on Claude Fable 5 and Claude Mythos 5 reflect this tokenizer's counts. If you're migrating from a model before Claude Opus 4.7, the same content consumes roughly 30 percent more tokens. The exact increase depends on the content and workload shape. When migrating a workload to Claude Fable 5 and Claude Mythos 5, don't reuse token counts measured on a model before Claude Opus 4.7 to estimate costs or context window fit. Count your prompts with `model: "claude-fable-5"` (or `"claude-mythos-5"`).
- | Start | 2,000 |
- | Build | 4,000 |
- | Scale | 8,000 |
+ All [active models](https://platform.claude.com/docs/en/models/overview) support token counting.
+ import httpx2
+ image_data = base64.standard_b64encode(httpx2.get(image_url).content).decode("utf-8")
+ An embedded image block that sets [`"oversized_image": "error"`](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates#oversized-image-error) is rejected at count time exactly as the Messages API would reject it.
+ * Thinking blocks from **previous** assistant turns count toward your input tokens on models that [keep all prior turns](https://platform.claude.com/docs/en/build-with-claude/thinking#thinking-block-preservation-by-model); on models that keep only the last turn, the API strips them and they do **not** count
+ "type": "adaptive"
+ type: adaptive
+ thinking={"type": "adaptive"},
+ thinking: { type: "adaptive" },
+ Thinking = new ThinkingConfigAdaptive(),
+ Thinking: anthropic.ThinkingConfigParamUnion{
+ OfAdaptive: &anthropic.ThinkingConfigAdaptiveParam{},
+ import com.anthropic.models.messages.ThinkingConfigAdaptive;
+ .thinking(ThinkingConfigAdaptive.builder().build())
+ thinking: ['type' => 'adaptive'],
+ type: "adaptive"
+ ## Token counts on Claude Fable and Claude Mythos models
+ Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, and Claude Mythos 5 share the tokenizer introduced with Claude Opus 4.7. A prompt counts the same on all four, and roughly 30 percent higher than on models before Claude Opus 4.7 (the exact increase depends on the content). The token counting endpoint counts under the tokenizer of the `model` you pass. To measure the difference for your workload, count the same request twice, once with your current model and once with the model you plan to move to, and compare the two `input_tokens` values.
+ **Billing and migration:** Usage and billing on these models reflect this tokenizer's counts. When migrating from a model before Claude Opus 4.7, don't reuse token counts measured on the older model to estimate costs or context window fit. Count your prompts with the `model` ID you plan to use (for example, `"claude-fable-5-1"`).
+ | Start | 5,000 |
+ | Build | 10,000 |
+ | Scale | 20,000 |
```

### apify.api.v2

- Vendor: Apify
- Source: https://docs.apify.com/api/v2
- Change: changed
- Prior hash: 8287b97ee8c355313a26c0b7efdb39933820f718fb522fe29836d166ba621be5
- Current hash: 949c500125ab16a908dc1948db9327d3f019a0f895c0ddfaf429402233e1d770

```diff
- Version: v2-2026-08-05T133145Z
+ Version: v2-2026-09-02T154542Z
```

### apify.cli.changelog

- Vendor: Apify
- Source: https://docs.apify.com/cli/docs/changelog
- Change: changed
- Prior hash: 44adf1694ec7572a6df5607422e53278ef1992718ebec86bfd8ad197c2589136
- Current hash: 3b6f317698a5c8c74202e33297d996fcbd42816b21f2498095f2e379ba3b3896

```diff
+ ### [1.10.0](https://github.com/apify/apify-cli/releases/tag/v1.10.0) (2026-09-02)[](#1100-2026-09-02)
+ * Re-prompt for a repository name when the provider rejects it ([#1373](https://github.com/apify/apify-cli/pull/1373)) ([e8b9d9b](https://github.com/apify/apify-cli/commit/e8b9d9b52dcced3bc4213c8a613dbbd80cfec6d1)) by [@l2ysho](https://github.com/l2ysho), closes [#1372](https://github.com/apify/apify-cli/issues/1372)
+ * Add GitLab and Bitbucket to `--source` ([#1356](https://github.com/apify/apify-cli/pull/1356)) ([fec0ea8](https://github.com/apify/apify-cli/commit/fec0ea89a92beac54d1eb7ba0df5c2fcbc5d47c2)) by [@l2ysho](https://github.com/l2ysho)
+ * Ask before `apify push` drops a Git source ([#1378](https://github.com/apify/apify-cli/pull/1378)) ([6667817](https://github.com/apify/apify-cli/commit/6667817c2cd42417f8349b269423ca838cd35390)) by [@l2ysho](https://github.com/l2ysho), closes [#1142](https://github.com/apify/apify-cli/issues/1142)
+ * Turn on automatic builds for a Git-sourced Actor ([#1377](https://github.com/apify/apify-cli/pull/1377)) ([5bb642e](https://github.com/apify/apify-cli/commit/5bb642ecd1028314f1958608487272848b1ffcd1)) by [@l2ysho](https://github.com/l2ysho), closes [#1355](https://github.com/apify/apify-cli/issues/1355)
+ * Connect the right Apify account in `apify create --source github` ([#1371](https://github.com/apify/apify-cli/pull/1371)) ([87dd140](https://github.com/apify/apify-cli/commit/87dd140f1666c78d548008b14c9bf349d3be5281)) by [@l2ysho](https://github.com/l2ysho), closes [#1370](https://github.com/apify/apify-cli/issues/1370)
+ ### [1.9.0](https://github.com/apify/apify-cli/releases/tag/v1.9.0) (2026-08-27)[](#190-2026-08-27)
+ * **install:** Single-bundle install/upgrade scripts ([#1219](https://github.com/apify/apify-cli/pull/1219)) ([bb346ec](https://github.com/apify/apify-cli/commit/bb346ec0a538d4494ab39503d25685bd3a179f36)) by [@vladfrangu](https://github.com/vladfrangu)
+ * Add task publish and unpublish commands ([#1317](https://github.com/apify/apify-cli/pull/1317)) ([b5bbc08](https://github.com/apify/apify-cli/commit/b5bbc08407cea88d88aeeed728a89bef7810dbb4)) by [@Janjiran](https://github.com/Janjiran)
+ * **create:** Machine-readable --json output and hidden --origin flag ([#1280](https://github.com/apify/apify-cli/pull/1280)) ([1255d2f](https://github.com/apify/apify-cli/commit/1255d2f5fb3dc07127b7894f995e55925bf34f20)) by [@l2ysho](https://github.com/l2ysho), closes [#1238](https://github.com/apify/apify-cli/issues/1238)
+ * Warn rental Actor publishers about the rental model sunset ([#1347](https://github.com/apify/apify-cli/pull/1347)) ([ffc6605](https://github.com/apify/apify-cli/commit/ffc66050cc4fb4740d16c53059b51b89ac96149d)) by [@patrikbraborec](https://github.com/patrikbraborec), closes [#1344](https://github.com/apify/apify-cli/issues/1344)
+ * Add `--source github` to create Git-sourced Actors ([#1348](https://github.com/apify/apify-cli/pull/1348)) ([4502c46](https://github.com/apify/apify-cli/commit/4502c468ecfe8d4e0282b28150291cf056792888)) by [@l2ysho](https://github.com/l2ysho), closes [#1237](https://github.com/apify/apify-cli/issues/1237)
+ * Validate actors search choice flags ([#1332](https://github.com/apify/apify-cli/pull/1332)) ([0e25909](https://github.com/apify/apify-cli/commit/0e25909488e495000a6a860fc96a48fc09f63fe2)) by [@kuntal1461](https://github.com/kuntal1461), closes [#1322](https://github.com/apify/apify-cli/issues/1322)
+ * Allow tilde in inline JSON input ([#1331](https://github.com/apify/apify-cli/pull/1331)) ([99f3cc1](https://github.com/apify/apify-cli/commit/99f3cc18f1cfa8d6ff22f91f6f3bb917cbdf3e4b)) by [@kuntal1461](https://github.com/kuntal1461), closes [#1281](https://github.com/apify/apify-cli/issues/1281)
+ #### 🚀 Features[](#-features-14)
+ #### 🐛 Bug Fixes[](#-bug-fixes-21)
+ #### 🚀 Features[](#-features-15)
+ #### 🐛 Bug Fixes[](#-bug-fixes-22)
```

### apify.integrations.mcp

- Vendor: Apify
- Source: https://docs.apify.com/integrations/mcp
- Change: changed
- Prior hash: 822eaa42b6c0ac899d0baa7363e111886e9aa7023d961ce522438324199ba077
- Current hash: 9261c1ad0211ee3bbffaebf46f54684d3bf7480a42a76a9313718233ad411168

```diff
- ## Quick start
- You can connect to the Apify MCP server in two ways: use our hosted service for a quick and easy setup using Streamable HTTP with OAuth, or run the server locally for development and testing using local stdio.
- Provide the server URL `https://mcp.apify.com`. You will be redirected to your browser to sign in to your Apify account and approve the connection.
- When you connect for the first time, you'll be redirected to your browser to sign in to Apify and authorize the connection. This OAuth flow ensures secure authentication without exposing your API token.
- * OAuth
- * Bearer token
- When you connect for the first time, you'll be redirected to your browser to sign in to Apify and authorize the connection. This OAuth flow ensures secure authentication without exposing your API token.
- When you connect for the first time, you'll be redirected to your browser to sign in to Apify and authorize the connection. This OAuth flow ensures secure authentication without exposing your API token.
- * OAuth
- * Bearer token
- When you connect for the first time, you'll be redirected to your browser to sign in to Apify and authorize the connection. This OAuth flow ensures secure authentication without exposing your API token.
- When you connect for the first time, you'll be redirected to your browser to sign in to Apify and authorize the connection. This OAuth flow ensures secure authentication without exposing your API token.
+ ## Connect and authorize
+ You can connect to the Apify MCP server in two ways: use our hosted service using Streamable HTTP with OAuth, or run the server locally for development and testing using local stdio.
+ Add `https://mcp.apify.com` to your MCP client. On first connection, your browser opens so you can sign in to Apify and approve access. To authorize without signing in, use your Apify API token instead.
+ This flow authorizes the server without putting your API token in the client configuration.
+ To use a bearer token instead of signing in, add an `Authorization` header with your [Apify API token](https://console.apify.com/settings/integrations):
+ To use a bearer token instead of signing in, add an `Authorization` header with your [Apify API token](https://console.apify.com/settings/integrations):
+ | `get-actor-task` | tasks | | Get a saved Actor task, its publication state, and its public display configuration |
+ | `create-actor-task` | tasks | | Create a saved Actor task: a named, reusable Actor configuration |
+ | `update-actor-task` | tasks | | Update a task's input, run options, or the display configuration of its landing page |
+ | `publish-actor-task` | tasks | | Publish a task on its public landing page |
+ | `unpublish-actor-task` | tasks | | Unpublish a task from its public landing page |
```

### apify.platform.changelog

- Vendor: Apify
- Source: https://apify.com/change-log?_format=html
- Change: changed
- Prior hash: 117dc61ca8f496558b92d2f78e7c718e09e3f94b3a26010d6388c72cf8aa93dd
- Current hash: f3bda27cce65c8e39a6e2e671e1ac6759d86d776ddc03115474733c3a87bd926

```diff
- Jun 9, 2026
- MCP connectors are live. Actors now work where you do.
- Integrations
- Apify Actors work on the open web - any public page, no login. But until now, anything that required a login (Notion, Slack, GitHub) had to happen outside Apify.
- MCP connectors fix that. They use the open Model Context Protocol to securely connect apps to specific Actors. The Actor reads and writes through a proxy in a single run - it never sees your credentials.
- Authenticate an MCP Server in Settings > API & Integrations
- Select Actors that support MCP connectors
- Select your previously authenticated MCP connector to use within the Actor
- Watch your Actor work within your MCP-connected tools
- Connect your first app →
- Griffin Trent
+ Sep 3, 2026
+ Create an Actor with a Git repo in a few clicks
+ When you create a new Actor in Apify Console or with the Apify CLI, you can now pick GitHub, GitLab, or Bitbucket, and Apify sets up the whole Git workflow for you.
+ Why it matters
+ Builds on your first push. The build pipeline is configured for you. You push a commit, and Apify builds the Actor.
+ Your own repository from day one. From the start, you get pull requests, reviews, CI, and everything else you already do with Git.
+ No manual wiring. The old flow meant creating the repository yourself, adding the template code, and pasting the Git URL into the Actor's Source tab. Private repositories also needed the SSH URL and a deployment key. All of that now happens automatically.
+ One flow in Apify Console and the Apify CLI. Whether you start in the browser or the terminal, you end up in the same place: code in your repo, builds running on push.
+ In Apify Console, click Develop new . The flow walks you through creating an Actor:
+ What do you want to build? A web scraper, an AI agent, an API and data pipeline, or browser automation.
+ Which language do you prefer? TypeScript, JavaScript, or Python.
+ Here's your best match. Templates matched to your answers, so you start from working code instead of browsing a template gallery.
+ Where do you want to host your code? This is the new part.
+ Pick Git and choose GitHub, GitLab, or Bitbucket. You authorize the provider through OAuth, select the account or organization the repository should live under, and Apify does the rest: creates the repository, pushes the Actor template code, and configures the build. The new repository is private. You can make it public later in your provider's settings.
+ The apify create command in the Apify CLI walks you through the same choices and gives the same result: a repository under your account with the template code pushed and builds configured.
+ If you don't want Git, Create without Git is still there: Clone locally or Host on Apify.
+ Learn more
+ The new feature is live for everyone, on every plan. Open actor.new   , and see for yourself. Or get the latest version of the Apify CLI and run apify create in your terminal. Read more   about the new flow in the blog post.
```

### exa.docs.changelog

- Vendor: Exa
- Source: https://exa.ai/docs/changelog
- Change: changed
- Prior hash: 9b8f9a0ceb5c2884000b2184d0bbf584cd2bf85f2188c9d60a1148f15ebaa748
- Current hash: aff1047f2ff77aef4b95d65a58af004dcdb4475ca08f3f1be7420707f71fedad

```diff
+ label="August 2026"
+ <div><a href="#dynamic-highlights-research-preview">Dynamic Highlights (research preview)</a></div>
+ title: "August 2026",
+ description: "Dynamic Highlights is a research preview that returns the most useful information across a result set for agents and RAG."
+ ## Dynamic Highlights (research preview)
+ Dynamic Highlights selects excerpts across the complete result set instead of treating each page independently. It gives more of the shared context budget to useful sources and gives less context to sources that only repeat information already returned.
+ * **Single-turn RAG**: about 49% better token efficiency and 2.4% higher downstream quality with Exa Auto across coding and general QA evaluations.
+ * **Agents**: about 30% fewer tokens across complete agent trajectories and 1% higher quality across BrowseComp, WideSearch, and internal company and people evaluations.
+ Requests that set `dynamic: true` require the `Exa-Beta: dynamic-highlights-2026-08-28` header.
+ [Read the Dynamic Highlights guide →](/docs/reference/contents-api-guide)
```

### exa.docs.contents-retrieval

- Vendor: Exa
- Source: https://exa.ai/docs/reference/contents-retrieval
- Change: changed
- Prior hash: f5ab74cebc766818387ba5ed5927557255f489517a3ca3c4f71b95ed5d2b4f7d
- Current hash: 60c952eb599af0c78133a64791aa6f2bc06e6c559ea01c08c3305b41dd074bdc

```diff
- You can configure highlights in two ways:
- 1. **Simple boolean** (`highlights=True` in SDKs): Returns default highlights based on the search query
- 2. **Detailed configuration** (pass as an object): include `query` to guide selection and `maxCharacters` to cap highlight length
+ ### Dynamic Highlights
+ Dynamic Highlights is available as a research preview on `/search` and `/contents`. Include the `Exa-Beta: dynamic-highlights-2026-08-28` header on every request that sets `dynamic: true`.
+ Regular highlights select excerpts from each page independently. Dynamic Highlights allocates context across all requested pages, giving more space to useful information and less to redundant results.
+ Enable it with `dynamic: true`:
+ "ids": [
+ "https://www.baseten.co/blog/how-to-optimize-llm-inference-speed-and-reduce-costs-in-production/",
+ "https://blog.cloudflare.com/smaller-faster-safer-models/"
+ ],
+ "highlights": {"dynamic": true}
+ The model sizes and distributes the output automatically, so `dynamic: true` is incompatible with `maxCharacters`.
+ You can configure highlights in three ways:
+ 1. **Simple boolean** (`highlights=True` in SDKs): use the request query to select highlights
+ 2. **Per-page configuration**: use `query` to guide selection or `maxCharacters` for a page-level limit
+ 3. **Dynamic configuration**: set `dynamic: true` to allocate context across the result set
```

### exa.docs.index

- Vendor: Exa
- Source: https://exa.ai/docs/llms.txt
- Change: changed
- Prior hash: db63ac7041377e84c1e31f6c59f11861c99bd39842fd96b69a6bb2cc1102b160
- Current hash: a60fc40b1adbc761c928a7f484208dca1a9cd9723fa58781c0ab783e862abd0d

```diff
- - [Jinko](https://exa.ai/docs/reference/agent-api/connect/jinko.md): Discover travel destinations from your departure airports, ranked by lowest available fare.
- - [OpenAI Tool Calling](https://exa.ai/docs/reference/openai-tool-calling.md): Use OpenAI tool calling to add Exa web search to your application.
- - [Anthropic Tool Calling](https://exa.ai/docs/reference/anthropic-tool-calling.md): Use Claude tool use to add Exa web search to your application.
- - [OpenAI Responses API](https://exa.ai/docs/reference/openai-responses-api-with-exa.md): Use Exa with OpenAI's Responses API - both as a web search tool and for direct research capabilities.
- - [Agent](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/agent.md)
- - [Answer](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/answer.md)
- - [Common mistakes](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/common-mistakes.md)
- - [Contents](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/contents.md)
- - [Context](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/context.md)
- - [Http requests](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/http-requests.md)
- - [Migrate websets to agent](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/migrate-websets-to-agent.md)
- - [Models and modes](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/models-and-modes.md)
- - [Monitors](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/monitors.md)
- - [Openai compat](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/openai-compat.md)
- - [Prompting and patterns](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/prompting-and-patterns.md)
- - [Sdks](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/sdks.md)
- - [Search](https://exa.ai/docs/.mintlify/skills/build-with-exa/references/search.md)
- - [openapi](https://exa.ai/docs/api-reference/openapi.json)
+ - [Polymarket](https://exa.ai/docs/reference/agent-api/connect/polymarket.md): Get prediction-market odds, price history, order books, and trader positions.
+ - [Jinko](https://exa.ai/docs/reference/agent-api/connect/jinko.md): Flight and Hotel search with real-time pricing.
+ - [Exa in Codex and ChatGPT](https://exa.ai/docs/integrations/chatgpt-codex.md): Search the web, read any page, and research with Exa directly from Codex and ChatGPT.
+ - [fx by Vercel Labs](https://exa.ai/docs/integrations/fx.md): Add Exa web search to fx, Vercel Labs' native coding agent, with the hosted Exa MCP server.
+ - [OpenAI Tool Calling](https://exa.ai/docs/reference/openai-tool-calling.md): Use OpenAI tool calling to add Exa web search and page contents to your application.
+ - [Anthropic Tool Calling](https://exa.ai/docs/reference/anthropic-tool-calling.md): Use Claude tool use to add Exa web search and page contents to your application.
+ - [Enterprise Managed Auth for Claude](https://exa.ai/docs/reference/mcp-enterprise-managed-auth.md): Set up Enterprise Managed Auth (EMA) so Claude connects to Exa MCP through your identity provider, with no per-user OAuth login or consent screen. Includes Okta Cross App Access (XAA) setup.
+ - [Batch API](https://exa.ai/docs/reference/batches.md): Run Exa API requests asynchronously in batches.
+ - [Stop a run](https://exa.ai/docs/reference/agent-api/stop-a-run.md): Gracefully stop a running Agent run and keep the results gathered so far.
+ - [Create a batch](https://exa.ai/docs/reference/batches/create-a-batch.md): Submit a batch of Exa API requests to run asynchronously.
+ - [List batches](https://exa.ai/docs/reference/batches/list-batches.md): Retrieve a paginated list of batches for your team.
+ - [Get a batch](https://exa.ai/docs/reference/batches/get-a-batch.md): Retrieve a batch by ID.
+ - [Cancel a batch](https://exa.ai/docs/reference/batches/cancel-a-batch.md): Cancel an in-progress batch.
+ - [Delete a batch](https://exa.ai/docs/reference/batches/delete-a-batch.md): Delete a batch in a terminal status.
+ - [2026 08 24 design button behavioral stability](https://exa.ai/docs/superpowers/plans/2026-08-24-design-button-behavioral-stability.md)
```

### exa.docs.search

- Vendor: Exa
- Source: https://exa.ai/docs/reference/search
- Change: changed
- Prior hash: 9f4dc1c9a590ea21086e3a6d78c866bf7f349b5e1ffa9ddef633d95ab313586f
- Current hash: 68bb3178990f619909564908c08ea73d474b8c9dcbca7572e9d393abaf650a4f

```diff
- description: Payment Required
- x-codeSamples:
- - lang: bash
- label: Simple search with contents
- source: |-
- curl -X POST 'https://api.exa.ai/search' \
- -H 'x-api-key: YOUR-EXA-API-KEY' \
- -H 'Content-Type: application/json' \
- -d '{
- "query": "Latest research in LLMs",
- "contents": {
- "highlights": true
- }
- }'
- - lang: python
- label: Simple search with contents
- source: |-
- # pip install exa-py
- from exa_py import Exa
- exa = Exa(api_key='YOUR_EXA_API_KEY')
- results = exa.search(
- "Latest research in LLMs",
- contents={"highlights": True}
- )
- print(results)
- - lang: javascript
- label: Simple search with contents
- source: |-
- // npm install exa-js
- import Exa from 'exa-js';
- const exa = new Exa('YOUR_EXA_API_KEY');
- const results = await exa.search(
- 'Latest research in LLMs',
- { contents: { highlights: true } }
- );
- console.log(results);
- - lang: bash
- label: Advanced search with filters
- source: |-
- curl --request POST \
+ headers:
+ x-request-id:
+ $ref: '#/components/headers/XRequestId'
+ x-exa-queued:
+ $ref: '#/components/headers/XExaQueued'
+ x-exa-queue-ms:
+ $ref: '#/components/headers/XExaQueueMs'
+ '400':
+ $ref: '#/components/responses/BadRequestResponse'
+ '401':
+ $ref: '#/components/responses/UnauthorizedResponse'
+ Payment required. For API-key requests this is the standard error
+ envelope (out of credits or a budget exceeded). On x402-priced
+ endpoints, requests without an API key instead receive an x402
+ payment challenge with tag `X402_PAYMENT_REQUIRED`: the envelope
+ extended with x402 payment metadata (`x402Version`, `resource`,
+ `accepts`, and optional `extensions`) describing how to pay for the
+ request.
+ headers:
+ x-request-id:
+ $ref: '#/components/headers/XRequestId'
+ - $ref: '#/components/schemas/ErrorResponse'
+ - $ref: '#/components/schemas/X402PaymentChallenge'
+ '429':
+ $ref: '#/components/responses/TooManyRequestsResponse'
+ '500':
+ $ref: '#/components/responses/InternalServerErrorResponse'
+ Server-side processing time in milliseconds, measured at the
+ gateway. Covers retrieval but may exclude later phases such as
+ structured output synthesis, so it can be lower than end-to-end
+ request latency.
+ example: 312.4
+ Server-side processing time in milliseconds, measured at the
+ gateway. Covers retrieval but may exclude later phases such as
+ structured output synthesis, so it can be lower than end-to-end
+ request latency.
+ example: 312.4
+ Server-side processing time in milliseconds, measured at the
+ gateway. Covers retrieval but may exclude later phases such as
+ structured output synthesis, so it can be lower than end-to-end
… diff truncated (261 added / 255 removed lines)
```

### firecrawl.docs.index

- Vendor: Firecrawl
- Source: https://docs.firecrawl.dev/llms.txt
- Change: changed
- Prior hash: 8d6e66ab5dd802f86c318f0ae15d08e1bc93eeb4731362fdbac99c1139efc555
- Current hash: 0ee47209638ef3a11ce3e9bd0c4ddeb30f2ce97fe507d288618f19dec5c39bea

```diff
- ## Docs
- - [Introduction](https://docs.firecrawl.dev/introduction.md): Search the web, scrape any page, and interact with it, all through one API.
- - [Get Started](https://docs.firecrawl.dev/mcp-server.md): Set up Firecrawl MCP with keyless access, account sign-in, or an API key.
- - [For Agents](https://docs.firecrawl.dev/mcp-server/keyless.md): Agents can start instantly, no API key required. Add an API key to unlock more usage.
- - [For Humans](https://docs.firecrawl.dev/mcp-server/oauth.md): Sign in via your browser.
- - [CLI](https://docs.firecrawl.dev/sdks/cli.md): Firecrawl skills are an easy way for AI agents such as Claude Code, Antigravity and OpenCode to use Firecrawl through the CLI.
- - [Build with AI](https://docs.firecrawl.dev/ai-onboarding.md): Everything you need to onboard your AI agent to Firecrawl.
- - [Advanced Scraping Guide](https://docs.firecrawl.dev/advanced-scraping-guide.md): Configure scrape options, browser actions, crawl, map, and the agent endpoint with Firecrawl's full API surface.
- - [Billing](https://docs.firecrawl.dev/billing.md): How Firecrawl billing, credits, and plans work
- - [Rate Limits](https://docs.firecrawl.dev/rate-limits.md): Rate limits for different pricing plans and API requests
- - [Partner Credits](https://docs.firecrawl.dev/partner-credits.md): How Firecrawl partner credits work, including eligibility, expiration, and plan limits
- - [Enterprise](https://docs.firecrawl.dev/enterprise.md): Enterprise plans, security, and features for Firecrawl at scale
- - [IP Restrictions](https://docs.firecrawl.dev/features/ip-restrictions.md): Restrict your team's API keys to an allowlist of IP addresses or CIDR ranges, so they only work from approved networks. Enforced server-side.
- - [Key Restrictions](https://docs.firecrawl.dev/features/key-restrictions.md): Lock an individual API key to specific output formats and endpoints. Enforced server-side, with no way for a request to override it.
- - [Threat Protection](https://docs.firecrawl.dev/features/threat-protection.md): Block requests to risky URLs across every endpoint, using a policy your organization controls. Enforced server-side.
- - [SIEM Audit Logging](https://docs.firecrawl.dev/features/siem.md): Stream a structured audit event for every scrape your team runs to your own SIEM, starting with Microsoft Sentinel. Delivered server-side.
- - [Search](https://docs.firecrawl.dev/features/search.md): Search the web and get full content from results
- - [Search Highlights](https://docs.firecrawl.dev/features/search-highlights.md): Return query-relevant passages instead of plain website descriptions
- - [Research Index](https://docs.firecrawl.dev/features/research.md): Search papers, read paper passages, and find related work
- - [Developer Index](https://docs.firecrawl.dev/features/developer.md): Search issues, merged pull requests, repository READMEs, and curated documentation sites
- - [Scrape](https://docs.firecrawl.dev/features/scrape.md): Turn any url into clean data
- - [Faster Scraping](https://docs.firecrawl.dev/features/fast-scraping.md): Speed up your scrapes by 500% with the maxAge parameter
- - [Batch Scrape](https://docs.firecrawl.dev/features/batch-scrape.md): Scrape multiple URLs in a single batch job
- - [JSON mode - Structured result](https://docs.firecrawl.dev/features/llm-extract.md): Extract structured data from pages via LLMs
- - [Change Tracking](https://docs.firecrawl.dev/features/change-tracking.md): Detect and monitor changes in web content between scrapes
- - [Enhanced Mode](https://docs.firecrawl.dev/features/enhanced-mode.md): Use enhanced proxies for reliable scraping on complex sites
- - [Lockdown Mode](https://docs.firecrawl.dev/features/lockdown.md): Cache-only scrape mode for compliance and air-gapped environments. No outbound traffic.
- - [PII Redaction](https://docs.firecrawl.dev/features/pii-redaction.md): Redact personally identifiable information from scrape and parse output
- - [Proxies](https://docs.firecrawl.dev/features/proxies.md): Learn about proxy types, locations, and how Firecrawl selects proxies for your requests.
- - [Document Parsing](https://docs.firecrawl.dev/features/document-parsing.md): Learn about document parsing capabilities.
- - [Monitoring](https://docs.firecrawl.dev/features/monitoring.md): Schedule recurring checks, detect changes, and get notified by webhook or email
- - [Page monitoring](https://docs.firecrawl.dev/features/monitoring-page.md): Watch known URLs and get alerted on meaningful page changes
- - [Website monitoring](https://docs.firecrawl.dev/features/monitoring-website.md): Crawl a website on a schedule and detect changes across every discovered page
- - [Entire web-scale monitoring](https://docs.firecrawl.dev/features/monitoring-web-scale.md): Run always-on web searches and alert when new matching results appear
- - [Interact after scraping](https://docs.firecrawl.dev/features/interact.md): Interact with a page you fetched by prompting or running code.
- - [Parse](https://docs.firecrawl.dev/features/parse.md): Upload a local or non-public document and convert it into clean, LLM-ready data
- - [Map](https://docs.firecrawl.dev/features/map.md): Input a website and get all the urls on the website - extremely fast
- - [Crawl](https://docs.firecrawl.dev/features/crawl.md): Recursively crawl a website and get content from every page
- - [Node.js](https://docs.firecrawl.dev/quickstarts/nodejs.md): Get started with Firecrawl in Node.js. Scrape, search, and interact with web data using the official SDK.
- - [Next.js](https://docs.firecrawl.dev/quickstarts/nextjs.md): Use Firecrawl with Next.js to scrape, search, and interact with web data in your React application.
+ - [v2 (165 pages)](https://docs.firecrawl.dev/_llms/en/v2.md): Documentation for v2.
+ - [v2-openapi](/api-reference/v2-openapi.json)
+ - [webhooks-openapi](/api-reference/webhooks-openapi.json)
+ - [v1-openapi](/api-reference/v1-openapi.json)
+ - [v1-openapi](/es/api-reference/v1-openapi.json)
+ - [v0-openapi](/es/v0/api-reference/v0-openapi.json)
+ - [v1-openapi](/es/v1/api-reference/v1-openapi.json)
+ - [v2-openapi](/es/v1/api-reference/v2-openapi.json)
+ - [v1-openapi](/fr/api-reference/v1-openapi.json)
+ - [v0-openapi](/fr/v0/api-reference/v0-openapi.json)
+ - [v1-openapi](/fr/v1/api-reference/v1-openapi.json)
+ - [v2-openapi](/fr/v1/api-reference/v2-openapi.json)
+ - [v1-openapi](/ja/api-reference/v1-openapi.json)
+ - [v0-openapi](/ja/v0/api-reference/v0-openapi.json)
+ - [v1-openapi](/ja/v1/api-reference/v1-openapi.json)
+ - [v2-openapi](/ja/v1/api-reference/v2-openapi.json)
+ - [v1-openapi](/pt-BR/api-reference/v1-openapi.json)
+ - [v0-openapi](/pt-BR/v0/api-reference/v0-openapi.json)
+ - [v1-openapi](/pt-BR/v1/api-reference/v1-openapi.json)
+ - [v2-openapi](/pt-BR/v1/api-reference/v2-openapi.json)
+ - [v0-openapi](/v0/api-reference/v0-openapi.json)
+ - [v1-openapi](/v1/api-reference/v1-openapi.json)
+ - [v2-openapi](/v1/api-reference/v2-openapi.json)
+ - [v1-openapi](/zh/api-reference/v1-openapi.json)
+ - [v0-openapi](/zh/v0/api-reference/v0-openapi.json)
+ - [v1-openapi](/zh/v1/api-reference/v1-openapi.json)
+ - [v2-openapi](/zh/v1/api-reference/v2-openapi.json)
+ - [Integrations](https://www.firecrawl.dev/app)
+ > The links below point to documentation indexes. Follow each `/_llms/` index recursively until you reach documentation pages.
+ ## Indexes
+ - [English / v2 (165 pages)](https://docs.firecrawl.dev/_llms/en/v2.md): Documentation for English / v2.
+ - [Spanish (165 pages)](https://docs.firecrawl.dev/_llms/es.md): Documentation for Spanish.
+ - [Spanish / v2 (165 pages)](https://docs.firecrawl.dev/_llms/es/v2.md): Documentation for Spanish / v2.
+ - [French (165 pages)](https://docs.firecrawl.dev/_llms/fr.md): Documentation for French.
+ - [French / v2 (165 pages)](https://docs.firecrawl.dev/_llms/fr/v2.md): Documentation for French / v2.
+ - [Japanese (165 pages)](https://docs.firecrawl.dev/_llms/ja.md): Documentation for Japanese.
+ - [Japanese / v2 (165 pages)](https://docs.firecrawl.dev/_llms/ja/v2.md): Documentation for Japanese / v2.
+ - [Brazilian Portuguese (165 pages)](https://docs.firecrawl.dev/_llms/pt-br.md): Documentation for Brazilian Portuguese.
+ - [Brazilian Portuguese / v2 (165 pages)](https://docs.firecrawl.dev/_llms/pt-br/v2.md): Documentation for Brazilian Portuguese / v2.
+ - [Chinese (165 pages)](https://docs.firecrawl.dev/_llms/zh.md): Documentation for Chinese.
… diff truncated (41 added / 224 removed lines)
```

### firecrawl.github.releases

- Vendor: Firecrawl
- Source: https://github.com/firecrawl/firecrawl/releases
- Change: changed
- Prior hash: 490d1431d0f2d494debbbf729c78e371294c7829dc5ac43e7f842a2303bba212
- Current hash: 5057be387b05021d313e046f69305f39e31b4c7eb4dc7fe4f64d051d57480343

```diff
- 9.4k
- 168k
- 54 people reacted
+ 9.7k
+ 177k
+ 53 people reacted
```

### firecrawl.product.changelog

- Vendor: Firecrawl
- Source: https://www.firecrawl.dev/changelog
- Change: changed
- Prior hash: 77cc831faa353adb24eea1c7295fa7e66b27af56504226048982d601861da8af
- Current hash: 946304cbdfd0615a50a7c5467e041c0fa5c1252d898b051df119455a93d03e40

```diff
- Introducing our most accurate /search yet. Read the announcement →
- 167.7K Sign up
- Firestarter Example - Open Source Chatbot building platform. Repo here.
+ Introducing the Firecrawl Developer Index, built for supercharging coding agents. Read the announcement →
+ 176.8K Sign up
+ Aug 20, 2026
+ Firecrawl Developer Index
+ The Firecrawl Developer Index is now available, a specialized index for coding agents. It covers 70M+ artifacts across READMEs, external documentation, issues, pull requests, and OpenAPI specs, with semantic retrieval and metadata filters. Your AI agents answer questions about code behavior, API contracts, error messages, and known bugs from primary sources instead of general web pages.
+ Highest recall of any major coding-specific index. Scores 0.63 recall@10 across the 1,179 real developer queries in our open DevDex benchmark , ahead of every other provider we tested.
+ 70M+ artifacts. READMEs, docs, issues, PRs, and OpenAPI specs from the most popular public repos and documentation sites, refreshed continuously with most sources updated daily.
+ Answers with passages. Every result carries a stable id, a url, and the matched passages in markdown, so your agents act on the answer without a second scrape.
+ Rich filters in the API. Scope by result type, repository, documentation source, language, topic, license, minimum stars, and more. These are API-only; agents on the CLI and MCP perform best without them.
+ Keyless to start. No API key needed to try it; add one for higher rate limits. A developer search costs 2 credits per 10 results.
+ Available everywhere you build. Query it through the API at /search/developer , plus the CLI, MCP, and SDKs, or install the companion skill with npx -y firecrawl-cli@latest setup developer-index .
```

### gemini.api.changelog

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/changelog
- Change: changed
- Prior hash: 586227f92a3be04734702e2e1f3af29c2d1420933dab40d3f4c35af433a5dc5e
- Current hash: 0e5a056295d5000f94ffc33972344e95b57c85907fc7720b7ca9e0fdc625edc3

```diff
- The Interactions API is now generally available. We recommend using this API for access to all the latest features and models.
- Semantic Retriever
- Last updated 2026-08-13 UTC.
+ Gemini 3.8 Flash is now available. Try it out .
+ September 3, 2026
+ Lyria 3.5 in public preview : Released the next generation of Google's music
+ generation model:
+ lyria-3.5 :
+ Full-length song generation with improved musical coherence, natural vocals,
+ and fine-grained duration and structural control.
+ The model supports text and image inputs and generates high-fidelity 44.1 kHz
+ stereo audio. See the Music generation
+ guide for details and code samples.
+ September 2, 2026
+ Gemini 3.8 Flash generally available (GA) : Released
+ gemini-3.8-flash , our most intelligent Flash model, engineered for
+ long-horizon software engineering, autonomous agents, and complex enterprise
+ workflows.
+ Gemini 3.8 Flash model page and
+ the Latest model guide .
+ September 1, 2026
+ Agentic video understanding : Released agentic video understanding for
+ Gemini 3.7 Flash, 3.6 Flash, and 3.5 Flash-Lite across the Interactions and
+ GenerateContent APIs. The model dynamically navigates video timelines,
+ requesting transcripts, frames, or audio tracks on demand. This approach uses
+ up to 88% fewer tokens for long-form content compared to static processing.
+ Agentic video understanding guide.
+ August 27, 2026
+ Gemini Omni Flash generally available (GA) : Released
+ gemini-omni-1.1-flash , the GA version of our fast, conversational video
+ generation and editing model. This release includes significant new
+ capabilities:
+ Video extension : Seamlessly extend existing videos by generating
+ continuations at the end of a clip using the extend task or directly
+ with a prompt.
+ Interpolation (first + last frame) : Generate a video transitioning
+ between two images using the image_to_video task with up to 2 images.
+ Resolution control : New resolution parameter in video_config
+ supports 360p , 720p (default), 1080p , and 4k outputs.
+ 1080p and 4K outputs are generated using upscaling.
+ The existing gemini-omni-flash-preview endpoint will be deprecated on
+ September 30, 2026.
+ Gemini Omni Flash model page
```

### gemini.api.deprecations

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/deprecations
- Change: changed
- Prior hash: f27ba1b45bc1226cf2a56b6bc81e8717c1623a3355b6bc4ab878f9c75444dfd8
- Current hash: 1419e17f5fee62496ccb49f6b1e340498de5f726b2e913d733a08907341c719d

```diff
- The Interactions API is now generally available. We recommend using this API for access to all the latest features and models.
- Last updated 2026-08-13 UTC.
+ Gemini 3.8 Flash is now available. Try it out .
+ gemini-3.8-flash
+ September 2, 2026
+ August 13, 2026
+ gemini-3.5-transcribe-live
+ gemini-3.5-live-translate-preview
+ June 2026
+ gemini-3.5-transcribe
+ Gemini Omni Flash models
+ gemini-omni-1.1-flash
+ August 27, 2026
+ Deprecated models
+ gemini-omni-flash-preview
+ September 30, 2026
+ gemini-omni-1.1-flash
+ lyria-3.5
+ September 3, 2026
+ lyria-3.5
+ Last updated 2026-09-05 UTC.
```

### gemini.api.models

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/models
- Change: changed
- Prior hash: 7eb1cd8efbdfcf496829c497e162ca01e80f532a9b486216fb45930cc839b3cf
- Current hash: 9e7c3711087835291ec307d34c1d8616b7a63dec501b96821b9bac81a45d2fb9

```diff
- The Interactions API is now generally available. We recommend using this API for access to all the latest features and models.
- Our latest and most capable Flash model, built for complex coding, agentic workflows, and reliable multi-step execution.
- New Preview
- New Preview
- New Preview
- Fast, conversational video generation and editing. Turn text and images into video, and refine results through natural language.
- New Preview
- gemini-omni-flash
- Fast, conversational video generation and editing. Turn text and images into video, and refine results through natural language.
- gemini-omni-flash
- Last updated 2026-08-14 UTC.
+ Gemini 3.8 Flash is now available. Try it out .
+ Gemini 3.8 Flash
+ Our most intelligent Flash model, engineered for long-horizon software engineering, autonomous agents, and complex enterprise workflows.
+ Our previous-generation Flash model for complex coding, agentic workflows, and reliable multi-step execution.
+ Gemini 3.5 Transcribe
+ Low-latency speech-to-text model with utterance-based language detection, speaker diarization, and word timestamps.
+ New
+ New
+ New
+ Fast video generation, editing, keyframe interpolation, and extension with native audio.
+ New
+ Gemini 3.8 Flash
+ gemini-3.8-flash
+ gemini-omni-1.1-flash
+ Gemini 3.5 Transcribe
+ gemini-3.5-transcribe
+ gemini-3.5-transcribe-live
+ Gemini 3.5 Transcribe
+ Low-latency speech-to-text model with utterance-based language detection, speaker diarization, word-level timestamps, and custom vocabulary biasing.
+ gemini-3.5-transcribe
+ gemini-3.5-transcribe-live
+ Fast video generation, editing, keyframe interpolation, and extension with native audio.
+ gemini-omni-1.1-flash
+ Lyria 3.5
+ lyria-3.5
+ Previous generation music generation model for full-length songs.
+ Last updated 2026-09-04 UTC.
```

### gemini.api.rate-limits

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/rate-limits
- Change: changed
- Prior hash: 8b69470da94934d23714f0fecca7c9bddabcc7c3cf041823d7e0be2c05578751
- Current hash: 83459731700624cf0a0b103347724da7f0058a90929990d72f3794c0f95fba18

```diff
- The Interactions API is now generally available. We recommend using this API for access to all the latest features and models.
- Last updated 2026-08-13 UTC.
+ Gemini 3.8 Flash is now available. Try it out .
+ $50
+ Gemini 3.8 Flash
+ Gemini 3.8 Flash
+ Gemini 3.8 Flash
+ Last updated 2026-09-02 UTC.
```

### gemini.api.tokens

- Vendor: Gemini
- Source: https://ai.google.dev/gemini-api/docs/tokens
- Change: changed
- Prior hash: 5de1a023e1b845f9beeadb63e2e3fc84b62489adb591bd1d4f2cfbc16c0c7278
- Current hash: f95180ddfb1e9565726f8c59c593c456a3019f2772ce93c7992c26da1a749a64

```diff
- The Interactions API is now generally available. We recommend using this API for access to all the latest features and models.
- model = "gemini-3.6-flash" ,
- model = "gemini-3.6-flash" ,
- model : "gemini-3.6-flash" ,
- model : "gemini-3.6-flash" ,
- curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:countTokens" \
- model = "gemini-3.6-flash" ,
- model = "gemini-3.6-flash" ,
- model : "gemini-3.6-flash" ,
- model : "gemini-3.6-flash" ,
- Video : 263 tokens per second
- model = "gemini-3.6-flash" ,
- model = "gemini-3.6-flash" ,
- model : "gemini-3.6-flash" ,
- model = "gemini-3.6-flash" ,
- # A 60-second video is approximately 263 * 60 = 15,780 tokens
- model = "gemini-3.6-flash" ,
- model = "gemini-3.6-flash" ,
- model = "gemini-3.6-flash" ,
- model = "gemini-3.6-flash" ,
- model = "gemini-3.6-flash" ,
- model = "gemini-3.6-flash" ,
- model_info = client . models . get ( model = "gemini-3.6-flash" )
- const modelInfo = await client . models . get ({ model : "gemini-3.6-flash" });
- Last updated 2026-07-30 UTC.
+ Gemini 3.8 Flash is now available. Try it out .
+ model = "gemini-3.8-flash" ,
+ model = "gemini-3.8-flash" ,
+ model : "gemini-3.8-flash" ,
+ model : "gemini-3.8-flash" ,
+ Java
+ import com.google.genai.Client ;
+ import com.google.genai.gaos.models.interactions.CreateModelInteraction ;
+ import com.google.genai.gaos.models.interactions.Interaction ;
+ import com.google.genai.gaos.models.interactions.InteractionsInput ;
+ import com.google.genai.gaos.models.interactions.Model ;
+ import com.google.genai.gaos.models.interactions.Usage ;
+ import com.google.genai.gaos.models.operations.CreateInteractionRequestBody ;
+ Client client = new Client ();
+ CreateModelInteraction params =
+ CreateModelInteraction . builder ()
+ . model ( Model . of ( "gemini-3.8-flash" ))
+ . input ( InteractionsInput . of ( "Calculate tokens for this message." ))
+ . build ();
+ Interaction interaction =
+ client . interactions . create ( CreateInteractionRequestBody . of ( params )). interaction (). get ();
+ if ( interaction . usage (). isPresent ()) {
+ Usage usage = interaction . usage (). get ();
+ System . out . println ( "Input tokens: " + usage . totalInputTokens (). orElse ( 0 ));
+ System . out . println ( "Output tokens: " + usage . totalOutputTokens (). orElse ( 0 ));
+ curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:countTokens" \
+ model = "gemini-3.8-flash" ,
+ model = "gemini-3.8-flash" ,
+ model : "gemini-3.8-flash" ,
+ model : "gemini-3.8-flash" ,
+ Java
+ import com.google.genai.Client ;
+ import com.google.genai.gaos.models.interactions.CreateModelInteraction ;
+ import com.google.genai.gaos.models.interactions.Interaction ;
+ import com.google.genai.gaos.models.interactions.InteractionsInput ;
+ import com.google.genai.gaos.models.interactions.Model ;
+ import com.google.genai.gaos.models.interactions.Usage ;
+ import com.google.genai.gaos.models.operations.CreateInteractionRequestBody ;
+ Client client = new Client ();
+ CreateModelInteraction params =
… diff truncated (125 added / 25 removed lines)
```

### hermes.docs.cli-commands

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/reference/cli-commands
- Change: changed
- Prior hash: 034f491a8f8649401f64744bfcd59620bcc3ca657eddc5f52fdc07bbf1be6d11
- Current hash: e94d8ac78be7d44b7e8620e9ecdb58b28d4caa7d74744ff602769142b9c5066a

```diff
- hermes version
- One-shot, non-interactive prompt.
- Force a provider: auto , openrouter , nous , openai-codex , copilot-acp , copilot , anthropic , gemini , huggingface , novita (aliases novita-ai , novitaai ), openai-api , zai , kimi-coding , kimi-coding-cn , minimax , minimax-cn , minimax-oauth , kilocode , xiaomi , arcee , gmi , upstage (alias solar ), alibaba , alibaba-coding-plan (alias alibaba_coding ), deepseek , nvidia , ollama-cloud , xai (alias grok ), xai-oauth (alias grok-oauth ), qwen-oauth , bedrock , opencode-zen , opencode-go , ai-gateway , azure-foundry , lmstudio , stepfun , tencent-tokenhub (alias tencent , tokenhub ).
- hermes chat -q "Summarize the latest PRs"
- Same agent, same tools, same skills — just strips every interactive / cosmetic layer. If you need tool output in the transcript too, use hermes chat -q instead; -z is explicitly for "I only want the final answer".
- hermes cron < list | create | edit | pause | resume | run | remove | status | tick >
- Create a scheduled job from a prompt, optionally attaching one or more skills via repeated --skill .
- Update a job's schedule, prompt, name, delivery, repeat count, or attached skills. Supports --clear-skills , --add-skill , and --remove-skill .
- Create a zip archive of your Hermes configuration, skills, sessions, and data. The backup excludes the hermes-agent codebase itself.
- Interactive session picker with search and resume.
- hermes update [ --gateway ] [ --check ] [ --no-backup ] [ --backup ] [ --yes ]
- hermes version
- hermes import Examples
+ hermes peer
+ Register peer Hermes gateways on other machines and DM their agents' canonical Bot Chats ( hermes peer dm <peer>[/<agent>] "…" ). The transport behind cross-machine bot-to-bot messaging.
+ hermes --version
+ Seed the session with a prompt. On a real TTY the prompt is submitted literally as the first turn of a normal interactive session (it is never parsed as a slash command or ! shell escape) and the session stays open — ideal for OS launchers and desktop integrations. With --oneshot , -Q , or non-TTY stdio it answers and exits.
+ --query-file PATH
+ Read the query from a file ( - = stdin). Nothing is shell-interpreted, so quotes, $(...) , and backticks arrive verbatim — use this for programmatic or untrusted message bodies (Bot Mode teammate DMs use it). Mutually exclusive with -q .
+ --oneshot
+ With -q / --query-file : answer the query and exit (the pre-0.21 single-query behavior) instead of seeding an interactive session. Implied on non-TTY stdio and by -Q .
+ Force a provider: auto , openrouter , nous , openai-codex , copilot-acp , copilot , anthropic , gemini , huggingface , novita (aliases novita-ai , novitaai ), openai-api , zai , kimi-coding , kimi-coding-cn , minimax , minimax-cn , minimax-oauth , kilocode , xiaomi , arcee , gmi , upstage (alias solar ), alibaba , alibaba-cn , alibaba-coding-plan (alias alibaba_coding ), alibaba-coding-plan-cn , alibaba-token-plan , alibaba-token-plan-cn , deepseek , nvidia , ollama-cloud , xai (alias grok ), xai-oauth (alias grok-oauth ), qwen-oauth , bedrock , opencode-zen , opencode-go , opencode-free (aliases free , opencode_free ; keyless), commandcode , commandcode-anthropic , ai-gateway , azure-foundry , lmstudio , stepfun , tencent-tokenhub (alias tencent , tokenhub ), router (aliases ramp-router , ramp ), nebius-token-factory (aliases nebius , nebius-tf , tokenfactory ), tencent-tokenplan (aliases tokenplan , tencent-lkeap ).
+ hermes chat -q "Summarize the latest PRs" # seeds an interactive session
+ hermes chat --oneshot -q "Summarize the latest PRs" # answer and exit
+ Same agent, same tools, same skills — just strips every interactive / cosmetic layer. If you need tool output in the transcript too, use hermes chat --oneshot -q instead; -z is explicitly for "I only want the final answer".
+ hermes peer ​
+ hermes peer add < name > --url http://host:port --key < API_SERVER_KEY >
+ hermes peer list
+ hermes peer dm < peer > [ / < agent > ] "message"
+ hermes peer run < peer > [ / < agent > ] --idempotency-key < key > "message"
+ hermes peer status < peer > [ / < agent > ] < run_id >
+ hermes peer stop < peer > [ / < agent > ] < run_id >
+ hermes peer remove < name >
+ Bot-to-bot DMs across machines. Register another Hermes gateway (any machine
+ running the api_server platform) as a peer , then message its agents:
+ hermes peer dm resolves the remote agent's canonical Bot Chat session
+ over the peer's API server, runs one agent turn there, and prints the reply
+ on stdout — the cross-machine twin of the local
+ hermes -p <bot> chat --in ~ -c "Bot Chat" … bot-messaging command.
+ <peer> alone targets the peer gateway's main agent;
+ <peer>/<agent> targets a named profile on a multiplexed peer (routed via
+ its /p/<profile>/ mirror).
+ add <name> --url <URL> [--key <KEY>] [--note TEXT]
+ Register or update a peer. The URL goes to config.yaml ( bot_peers ); the key is stored as HERMES_PEER_<NAME>_KEY in ~/.hermes/.env .
+ List peers and whether each has a key configured.
+ dm <peer>[/<agent>] [message]
+ Message the peer agent's canonical Bot Chat and print the reply ( --json for machine-readable output; message falls back to stdin).
+ run <peer>[/<agent>] [message]
+ Start a long canonical Bot Chat turn asynchronously and return its run_id , session ID, and idempotency key ( --json supported). Reuse --idempotency-key when retrying the same request.
+ status <peer>[/<agent>] <run_id>
+ Poll an asynchronous peer run and print its final output when complete ( --json supported).
+ stop <peer>[/<agent>] <run_id>
+ Stop the exact asynchronous peer run without targeting another turn ( --json supported).
… diff truncated (110 added / 13 removed lines)
```

### hermes.docs.fallback-providers

- Vendor: Hermes
- Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
- Change: changed
- Prior hash: c81638336d4a008613917aab5a2ab93b1b688d2466c6ba15c5a8cabcb83a784a
- Current hash: cc2cf1c9050b24954fa57dfed00a53cad4cb4c643586417a3205c019427b1593

```diff
- Auxiliary task fallback — independent provider resolution for side tasks like vision, compression, and web extraction
- Web Extract
- Web page summarization
- auxiliary.web_extract
- web_extract :
- Web extraction
- auxiliary.web_extract
+ Auxiliary task fallback — independent provider resolution for side tasks like vision and compression
+ CommandCode
+ commandcode (alias commandcode-chat ; Claude via commandcode-anthropic )
+ COMMANDCODE_API_KEY
+ OpenCode Free
+ opencode-free
+ — (keyless, no credential)
+ Ramp Router
+ router
+ RAMP_ROUTER_API_KEY
+ Nebius Token Factory
+ nebius-token-factory
+ NEBIUS_API_KEY
+ Tencent TokenPlan
+ tencent-tokenplan
+ TOKENPLAN_API_KEY
+ Review
+ /review reviewer subagent (full agent, not a single LLM call)
+ auxiliary.review
```

### hermes.github.releases

- Vendor: Hermes
- Source: https://github.com/NousResearch/hermes-agent/releases
- Change: changed
- Prior hash: 67692cb7e307e65329a16b4926d6bb2655e2bccf80a9a46f7e6346c21fa6fc7c
- Current hash: 590f469580856ae86715b7e55377ff0ac6d7b84853e782ce1f29ffd941f30a2e

```diff
- 45.8k
- 231k
- Hermes Agent v0.18.2 (2026.7.7.2)
- Hermes Agent v0.18.1 (2026.7.7)
- Hermes Agent v0.18.0 (2026.7.1) — The Judgment Release
- Hermes Agent v0.17.0 (v2026.6.19)
- Hermes Agent v0.16.0 (2026.6.5) — The Surface Release
- Hermes Agent v0.15.2 (2026.5.29.2)
- 75 people reacted
- 171 people reacted
- Hermes Agent v0.18.2 (2026.7.7.2)
- Hermes Agent v0.18.2 (2026.7.7.2)
- 08 Jul 03:11
- v2026.7.7.2
- 9de9c25
- Hermes Agent v0.18.2 (v2026.7.7.2)
- Release Date: July 7, 2026
- Same-day patch on top of v0.18.1, picking up the WhatsApp Baileys dependency fix needed for tagged-release Docker builds.
- What's in this patch
- fix(whatsapp): unpin Baileys from git commit, use published 7.0.0-rc13 ( #60643 ) — the WhatsApp bridge dependency now installs from the published npm release instead of a pinned git commit, making installs and Docker image builds reliable.
- Full curated release notes for the entire post-v0.18.0 window ship with v0.19.0.
- hermes update # existing installs
- pip install -U hermes-agent
- Full Changelog : v2026.7.7...v2026.7.7.2
- 90 people reacted
- Hermes Agent v0.18.1 (2026.7.7)
- Hermes Agent v0.18.1 (2026.7.7)
- 08 Jul 01:15
- v2026.7.7
- f9eca7e
- Hermes Agent v0.18.1 (v2026.7.7)
- Release Date: July 7, 2026
- Patch release. This tag rolls up the ~660 PRs merged since v0.18.0 (July 1) — bug fixes, hardening, and in-progress feature work — into a stable tagged release for downstream consumers (Docker images, hosted deployments, PyPI installs).
- This is an infrastructure-driven patch tag rather than a fully curated release. Since v0.18.0 shipped six days ago, main has accumulated roughly 667 commits across ~990 files (+89.5k/−10.4k lines) , including installer/updater self-healing on Windows, dashboard and gateway fixes, WhatsApp dashboard pairing, MCP and provider fixes, and a large volume of stability work.
- Full curated release notes for this window will ship with v0.19.0 , which will document everything from v0.18.0 onward — highlights, feature areas, and complete contributor credits. Nothing in this window is skipped; it's documented in the next minor release.
- hermes update # existing installs
- pip install -U hermes-agent
- Full Changelog : v2026.7.1...v2026.7.7
- 25 people reacted
- Hermes Agent v0.18.0 (2026.7.1) — The Judgment Release
+ 49.7k
+ 242k
+ Hermes Agent v0.21.0 (v2026.8.31)
+ Hermes Agent v0.20.6 (v2026.8.27)
+ Hermes Agent v0.20.5 (v2026.8.19)
+ Hermes Agent v0.20.4 (2026.8.18)
+ Hermes Agent v0.20.3 (2026.8.16.2)
+ Hermes Agent v0.20.2 (2026.8.16)
+ Hermes Agent v0.21.0 (v2026.8.31)
+ Hermes Agent v0.21.0 (v2026.8.31)
+ 31 Aug 19:29
+ v2026.8.31
+ 29112be
+ Hermes Agent v0.21.0 (v2026.8.31)
+ Release Date: August 31, 2026
+ Since v0.20.0: ~5,800 commits · ~2,475 merged PRs · ~5,680 files changed · ~869,000 insertions · ~135,000 deletions · ~2,100 issues closed · 760+ contributors
+ The Pantheon Release. v0.20.0 made Hermes the herald — he spoke, and he carried word to other agents. In v0.21.0 the gods assemble. Bot Mode ships built into the desktop app: a society of named agents with their own faces and group chats, where your bots talk to each other — and to you — like a team, not a toolbox. Around that spine: cron jobs gained memory and continuity so scheduled agents actually learn between runs, subagents can be steered live mid-flight, the MCP surface became a real command center, and the agent can now drive the desktop's own browser. This release rolls up everything from the v0.20.1–v0.20.6 infrastructure patch tags — those windows are fully documented here.
+ Bot Mode — your agents become a society, built in — Bot Mode is now a bundled, default-on part of the desktop app: every agent profile gets a name, a deterministic avatar face (with randomize/lock controls), and a place in a shared roster. Create Discord-style group chats where multiple bots and you talk in one room, @-mention any bot from the composer, and give rooms names and pictures. Before, "multi-agent" meant plumbing; now it looks like a chat app full of coworkers. ( #87886 , #88243 , #89386 , #96726 — @teknium1 , @OutThisLife , @dokterdok )
+ hermes peer — bot-to-bot DMs between your agents — Any Hermes agent can now message any other by handle, across profiles and gateways, from the CLI or from inside a conversation. Ask your research bot to hand findings to your coding bot and get the reply back where you can read it. Replies land in each agent's canonical Bot Chat, so conversations between agents are durable and inspectable, not fire-and-forget. ( #88725 , #88178 , #91487 — @teknium1 )
+ Cron jobs that remember — Scheduled jobs stopped being goldfish. Cron agents now load and update persistent memory like every other agent, continuity=true carries each run's output into the next (so a monitor can dedupe against what it already reported), every job gets a durable notepad scratchpad, monitor-mode jobs skip the LLM entirely when nothing changed, and cron output can land in a bot's canonical Bot Chat — where the bot actually responds. Your 9am briefing job now knows what it told you yesterday. ( #91447 , #80774 , #81139 , #81138 , #91487 — @teknium1 , @smwbev )
+ Steer your subagents while they run — delegate_task gained live orchestration: list running children, steer one mid-flight with a course correction, or stop it early and keep the partial result. Add optional JSON-schema validation on child outputs, per-delegation cost surfaced in results, and raised defaults (250 iterations, 10 concurrent children) — delegation went from fire-and-pray to actually managed parallel work. ( #85232 , #81144 , #81142 , #86506 , #86745 — @teknium1 )
+ The MCP command center — MCP servers and the catalog merged into one coherent desktop page with drag-in "paste anything" import, background health checks that nudge you to re-auth before a tool call fails, a fleet cost/usage overlay showing schema token estimates and 30-day usage per server, and hermes:// deep links that install an MCP server with explicit confirmation. Managing twenty MCP servers used to be config-file archaeology; now it's a dashboard. ( #87525 , #87572 , #87576 , #87579 , #87581 — @teknium1 )
+ A CLI power wave — Ctrl+P opens a fuzzy command palette, the /model picker filters as you type, /status shows reasoning mode, pending approvals, and context usage, and the status bar can display live cache-hit %, latency, and tokens/sec with per-field toggles. Plus: a global emergency stop, session pin/unpin, rotating task-oriented composer placeholders — and Ghostty-level terminal pets , because a companion should have a companion. ( #90730 , #90717 , #90745 , #98250 , #98282 , #97666 — @teknium1 , and salvaged community work)
+ The agent drives the desktop's browser — The in-app browser stopped being a window the agent could only look at: Hermes now navigates, clicks, and reads it directly, and pages can be popped out to your system browser with full link context menus. Ask it to walk a docs site or debug a web app and watch it happen inside your own app. ( #90197 , #89366 — @OutThisLife , @ethernet8023 )
+ Six new providers and a model catalog wave — Meta Model API (Muse Spark) arrives as a built-in provider, alongside CommandCode, Tencent TokenPlan, Nebius Token Factory, Ramp Router, and Actual Computer. The catalogs picked up GLM-5.3-Flash, qwen3.8-max/flash, Gemini 3.7 Flash, MiniMax M3 free, and Nemotron 3.5 Lightning — and model_overrides lets you patch any model's context window or pricing yourself without waiting on a release. ( #88565 , #88308 , #97917 , #97916 , #97915 , #85560 — @teknium1 and community)
+ Security hardening across the board — Protected agent-instruction files (AGENTS.md, skills, memory stores) now always require write approval so a prompt-injected agent can't quietly rewrite its own standing orders. A deep redaction sweep closed secret-leak gaps across terminal errors, .env file reads, checkpoints, and ACP logs; the approval system learned Windows destructive commands; and macOS permission grants finally survive updates via a stable TCC signing identity. ( #81152 , #80965 , #84428 , #95091 — @teknium1 and community)
+ 🏗️ Core Agent & Architecture
+ Providers & Models
+ New providers: Actual Computer inference ( #79644 , salvage of #26491 ), CommandCode with GOAT/Pro/Max plans ( #88308 , salvage of #32909 ), Meta Model API (Muse Spark) as a built-in provider plugin ( #88565 ), Tencent TokenPlan ( #97917 ), Nebius Token Factory ( #97916 ), and Ramp Router ( #97915 ).
+ Model catalog wave: qwen3.8-max and qwen3.8-flash ( #78024 , #96979 ), Gemini 3.7 Flash ( #85526 ), GLM-5.3-Flash across OpenRouter/Nous/z.ai/OpenCode ( #95621 , #96293 ), MiniMax M3 + Inkling free SKUs ( #96264 ), Nemotron 3.5 Lightning ( #84645 ), Meta Muse Spark 1.2 ( #88600 ).
+ Per-model metadata overrides via model_overrides config — patch context windows, pricing, or capabilities for any model without waiting on a release ( #85560 ).
+ Data-training-tier warnings — a unified selection-guard registry warns you across every picker surface when a model trains on your data ( #85917 ).
+ Pip-installed model providers discovered via entry points — third parties can ship providers as packages ( #85504 , salvage ...
+ assimovt, dhanesh, and 196 other contributors
+ 112 people reacted
+ Hermes Agent v0.20.6 (v2026.8.27)
+ Hermes Agent v0.20.6 (v2026.8.27)
+ 27 Aug 12:06
+ v2026.8.27
+ 5fc308a
… diff truncated (103 added / 153 removed lines)
```

### openai.api.changelog

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/changelog
- Change: changed
- Prior hash: 62bafab0b995ce1398c60badf1296ae923ac3f30bed0c37499d15c8d235362da
- Current hash: 5bdc521726ff9dc7c3a2b1f5aca76cb13626f76ef5c56c4d029d7da314097e09

```diff
- Feature · Model: gpt-5.6-cyber · Model: daybreak-red-latest · Model: daybreak-blue-latest · API: v1/responses
- Start with Daybreak Blue for most defensive security work. It provides access to general-purpose models such as GPT-5.6 Sol for vulnerability discovery, secure code review, detection engineering, incident response, malware analysis, and patch validation. Read more [here](https://developers.openai.com/api/docs/models/daybreak-blue-latest).
- Released the [GPT-5.6 model family](https://developers.openai.com/api/docs/guides/latest-model), including GPT-5.6 Sol for frontier capability, GPT-5.6 Terra for a balance of intelligence and cost, and GPT-5.6 Luna for efficient, high-volume workloads. The `gpt-5.6` alias routes requests to `gpt-5.6-sol`.
- - Announced plans to bring all [Assistants API](https://developers.openai.com/api/docs/assistants) features to the easier to use [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses), with an anticipated sunset date for Assistants in 2026 (after achieving full feature parity).
- Assistants API now supports [including file search results used by the file search tool, and customizing ranking behavior](https://developers.openai.com/api/docs/assistants/tools/file-search#improve-file-search-result-relevance-with-chunk-ranking).
- Added support for [file search customizations](https://developers.openai.com/api/docs/assistants/tools/file-search#customizing-file-search-settings).
+ ## September, 2026
+ ### Sep 3
+ Feature · Model: gpt-6-astra · API: v1/responses · API: v1/chat/completions
+ Released [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra), our most capable model, built for the hardest end-to-end work.
+ Use GPT-6 Astra for reasoning, coding, computer use, research, and document creation. It combines these capabilities to carry complex tasks from an initial request to a finished result, using the context and tools you provide.
+ Key changes to consider when migrating:
+ - GPT-6 Astra does not support the `none` reasoning effort level.
+ - GPT-6 Astra does not support custom `temperature` or `top_p` values or log probabilities (`logprobs`).
+ - Tool calling requires the Responses API. If you use tools with Chat Completions, follow the [Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses).
+ - [Misalignment monitoring](https://developers.openai.com/api/docs/guides/safety-checks/misalignment-monitoring) asynchronously checks for potential issues during agent work in supported Responses API requests. Checks can trigger safety alerts or stop a conversation for review.
+ Start with [Using GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model) for capabilities, prompting, and migration guidance. Explore [computer use](https://developers.openai.com/api/docs/guides/tools-computer-use) for browser and desktop workflows, and see [pricing](https://developers.openai.com/api/docs/pricing) for available inference tiers.
+ ### Sep 3
+ Added new controls for long-running work with GPT-6 Astra in the Responses API:
+ - [Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling): Let the model continue working while your application runs function or custom tools, then return results as they become available.
+ - [Mid-turn steering](https://developers.openai.com/api/docs/guides/steering): Send additional instructions while a response is in progress over WebSockets, so the model can incorporate corrections or changing requirements.
+ - [Change reasoning effort mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation): Increase effort for difficult work or reduce it for routine follow-ups while preserving the cached prompt prefix.
+ ### Sep 2
+ Updated API errors so applications can distinguish traffic that increases too quickly from temporary model overload.
+ Traffic that increases too quickly can return a `429` error with the `slow_down` code. Temporary model overload returns a `503` error with the `server_is_overloaded` code. Both responses may include `Retry-After`. When the header is present, wait at least as long as it specifies before retrying. If it's missing, use exponential backoff. See the [error codes guide](https://developers.openai.com/api/docs/guides/error-codes) and [rate limits guide](https://developers.openai.com/api/docs/guides/rate-limits).
+ ### Sep 1
+ Connections to `api.openai.com` can now use IPv6.
+ [Mutual TLS (mTLS)](https://developers.openai.com/api/docs/guides/mutual-tls) and [X.509 workload identity federation](https://developers.openai.com/api/docs/guides/workload-identity-federation/x509) are now generally available for the OpenAI API. Configure certificates and X.509 identity providers directly in the [Platform console](https://platform.openai.com/settings/organization/security), with access controlled by your organization's roles and permissions.
+ ### Aug 26
+ Update · Model: whisper-1 · Model: gpt-4o-transcribe · Model: gpt-4o-mini-transcribe · Model: gpt-4o-transcribe-diarize · API: v1/audio/transcriptions · API: v1/realtime
+ Announced the deprecation of `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, and `gpt-4o-transcribe-diarize`. These models will shut down on February 26, 2027. Migrate to [`gpt-live-transcribe`](https://developers.openai.com/api/docs/models/gpt-live-transcribe) or [`gpt-transcribe`](https://developers.openai.com/api/docs/models/gpt-transcribe). See the [transcription guide](https://developers.openai.com/api/docs/guides/transcription) and [deprecations page](https://developers.openai.com/api/docs/deprecations).
+ The Assistants API shut down on August 26, 2026. Migrate to the Responses API and Conversations API using the [migration guide](https://developers.openai.com/api/docs/assistants/migration).
+ API customers can now select regional processing for an individual request by using a prefixed domain with an API key from a project having Global geography. Existing eligibility, data retention control, endpoint, and model support requirements continue to apply. Learn more in the [data controls guide](https://developers.openai.com/api/docs/guides/your-data#select-a-processing-region-per-request).
+ Update · Model: gpt-5.6-sol
+ GPT-5.6 Sol now costs $4 per million input tokens and $20 per million output tokens, representing 20% lower input pricing and 33% lower output pricing. GPT-5.6 Sol’s promotional pricing is available at least through November 21, 2026. See [pricing details](https://developers.openai.com/api/docs/pricing).
+ Released the [Prompt Caching dashboard](https://platform.openai.com/usage?usage_section=prompt-caching) on the OpenAI API platform. Track your cache hit rate over time, cache reads per write, and the breakdown of cache-read, cache-write, and uncached tokens to understand your caching efficiency and identify opportunities to improve. Filter metrics by model and service tier.
+ Update · Model: gpt-image-2 · Model: gpt-image-2-2026-04-21 · API: v1/images/generations · API: v1/images/edits · API: v1/responses
+ Transparent backgrounds are now available in preview for `gpt-image-2` and `gpt-image-2-2026-04-21` in the Images API and the Responses API image generation tool. Set `background` to `transparent` and use `png` or `webp` output; `jpeg` does not support transparent backgrounds. Learn more in the [image generation guide](https://developers.openai.com/api/docs/guides/image-generation#customize-image-output).
+ Feature · Model: gpt-5.6-cyber · Model: gpt-daybreak-red-latest · Model: gpt-daybreak-blue-latest · API: v1/responses
+ Start with Daybreak Blue for most defensive security work. It provides access to general-purpose models such as GPT-5.6 Sol for vulnerability discovery, secure code review, detection engineering, incident response, malware analysis, and patch validation. Read more [here](https://developers.openai.com/api/docs/models/gpt-daybreak-blue-latest).
+ Released the [GPT-5.6 model family](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6), including GPT-5.6 Sol for frontier capability, GPT-5.6 Terra for a balance of intelligence and cost, and GPT-5.6 Luna for efficient, high-volume workloads. The `gpt-5.6` alias routes requests to `gpt-5.6-sol`.
+ - Announced plans to bring all [Assistants API](https://developers.openai.com/api/docs/assistants/migration) features to the easier to use [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses), with an anticipated sunset date for Assistants in 2026 (after achieving full feature parity).
+ Assistants API now supports [including file search results used by the file search tool, and customizing ranking behavior](https://developers.openai.com/api/docs/assistants/migration#improve-file-search-result-relevance-with-chunk-ranking).
+ Added support for [file search customizations](https://developers.openai.com/api/docs/assistants/migration#customizing-file-search-settings).
```

### openai.api.deprecations

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/deprecations
- Change: changed
- Prior hash: 4fc34212ee878b48b1671d45f1d5bc65e755f15ea86460006549dfc57d1d1d59
- Current hash: 66a6c1a91573dac1b611d8d0d9fb19356b61930bdbb4b67aa0eab73c904ef5b6

```diff
+ ### 2026-08-26: Transcription models
+ On August 26, 2026, we notified developers using `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, and `gpt-4o-transcribe-diarize` of their deprecation and removal from the API on February 26, 2027.
+ For information about the recommended replacements, see the [transcription guide](https://developers.openai.com/api/docs/guides/transcription).
+ | ------------- | --------------------------- | ----------------------------------------- |
+ | Feb 26, 2027 | `whisper-1` | `gpt-live-transcribe` or `gpt-transcribe` |
+ | Feb 26, 2027 | `gpt-4o-transcribe` | `gpt-live-transcribe` or `gpt-transcribe` |
+ | Feb 26, 2027 | `gpt-4o-mini-transcribe` | `gpt-live-transcribe` or `gpt-transcribe` |
+ | Feb 26, 2027 | `gpt-4o-transcribe-diarize` | `gpt-live-transcribe` or `gpt-transcribe` |
```

### openai.api.evals

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/guides/evals
- Change: changed
- Prior hash: 299a41625f6a4a78b18a9685b0b9c55a0a45fb76fe759436fac88e2cd25a28a1
- Current hash: fdf33e24dee8d7439dee7c30c7c9da3f0793ce8bf3402ab828cd69c0493b7ab5

```diff
- model: "gpt-5.6",
- model="gpt-5.6",
- Model: "gpt-5.6",
- model: "gpt-5.6",
- "model": "gpt-5.6",
- Explanation: data_source_config parameter
- Explanation: testing_criteria parameter
- model: "gpt-5.6",
- "model": "gpt-5.6",
- model: "gpt-5.6"
- "model": "gpt-5.6",
+ model: "gpt-6-astra",
+ model="gpt-6-astra",
+ Model: "gpt-6-astra",
+ ```java
+ import com.openai.client.OpenAIClient;
+ import com.openai.client.okhttp.OpenAIOkHttpClient;
+ import com.openai.models.responses.EasyInputMessage;
+ import com.openai.models.responses.ResponseCreateParams;
+ import com.openai.models.responses.ResponseInputItem;
+ import java.util.List;
+ ResponseCreateParams params =
+ ResponseCreateParams.builder()
+ .model("gpt-6-astra")
+ .inputOfResponse(
+ List.of(
+ ResponseInputItem.ofEasyInputMessage(
+ EasyInputMessage.builder()
+ .role(EasyInputMessage.Role.DEVELOPER)
+ .content(
+ "You are an expert in categorizing IT support tickets. Categorize each request as Hardware, Software, or Other. Respond with only one of those words.")
+ .build()),
+ ResponseInputItem.ofEasyInputMessage(
+ EasyInputMessage.builder()
+ .role(EasyInputMessage.Role.USER)
+ .content("My monitor won't turn on - help!")
+ .build())))
+ .build();
+ client.responses().create(params).output().stream()
+ .flatMap(item -> item.message().stream())
+ .flatMap(message -> message.content().stream())
+ .flatMap(content -> content.outputText().stream())
+ .forEach(text -> System.out.println(text.text()));
+ ```csharp
+ using OpenAI.Responses;
+ #pragma warning disable OPENAI001
+ string key = Environment.GetEnvironmentVariable("OPENAI_API_KEY")!;
+ ResponsesClient client = new(key);
+ ResponseResult response = await client.CreateResponseAsync(
+ "gpt-6-astra",
+ [
```

### openai.api.models

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/models/all
- Change: changed
- Prior hash: ddb9538f9539e22b9cdc42810839a7a02a1f679db6029f88ec3e391e6b6d727b
- Current hash: 4ee5fe4d6acb67da82da3ddcdf40d7b07263efe6d3d12058f720ef843c524278

```diff
- Using GPT-5.6
- Deep dive
- Images and vision
- Safety checks Cybersecurity checks
- Under 18 API Guidance
- Workload identity federation X.509 certificates (beta)
- Chrome extension
- Custom Code Review rules for Codex
- Mastering remote engineering work from your phone
- Making private MCP servers reachable without making them public
- How Perplexity Brought Voice Search to Millions Using the Realtime API
- Designing delightful frontends with GPT-5.4
- Browse all available models and compare their capabilities.
- Frontier models
- OpenAI's most advanced models, recommended for most tasks.
- Frontier model for complex professional work
- GPT Image 2
- GPT-Realtime-2.1 mini
- GPT Live Transcribe
- gpt-audio-1.5
- GPT Transcribe
- GPT-4o mini Transcribe
- Speech-to-text model powered by GPT-4o mini
- GPT-4o mini TTS
- Text-to-speech model powered by GPT-4o mini
- Frontier cyber models for defenders
- An alias for frontier general-purpose models with safeguards for defensive cybersecurity work.
- GPT-5.4 mini
- Previous frontier model for professional work with configurable reasoning effort
- GPT-5 mini
- Near-frontier intelligence for cost sensitive, low latency, high volume workloads
- GPT-4.1 mini
- GPT-4o mini
- gpt-audio
- GPT Image 1.5
- gpt-image-1-mini
- GPT Image 1
- Fast, cost-efficient reasoning model, succeeded by GPT-5 mini
- GPT-Realtime mini
- gpt-audio-mini
+ Using GPT-6 Astra
+ Mid-turn steering
+ Images and vision Image input cost calculator
+ Async tool calling
+ Safety checks Safety classifiers
+ Cybersecurity checks
+ Misalignment monitoring
+ Under-18 guidance
+ CSAM guidance
+ Mutual TLS
+ Workload identity federation Codex setup
+ Federation rules
+ Admin API
+ X.509 certificates
+ Custom Audiences
+ Browser extension
+ Site tools (WebMCP)
+ GitLab (Beta)
+ GitLab CI/CD
+ ChatGPT Work
+ ChatGPT Work cloud security
+ ChatGPT Work local security
+ ChatGPT Work: usage and cost
+ Workload identity
+ User lifecycle management
+ Plugin management
+ Admin plugin
+ Architectural visualization with Astra
+ Building games with Astra
+ Meet Rosalind Workbench: Empowering every scientist to be their own research team
+ Automating repetitive work at OpenAI with Codex
+ Meet the winners of OpenAI Build Week
+ Life sciences
+ Browse models and compare their capabilities.
+ Flagship models
+ Compare capabilities and specifications.
+ GPT-6 Astra
+ Our most capable model, built for the hardest end-to-end work
+ Flagship model for complex professional work
+ GPT-Image-2
… diff truncated (67 added / 44 removed lines)
```

### openai.api.token-counting

- Vendor: OpenAI
- Source: https://developers.openai.com/api/docs/guides/token-counting
- Change: changed
- Prior hash: 27c4c36c68aa3d4ef82c9c3c6982fc41e7c9257ce4d8dd7898c08e274f89ecba
- Current hash: 532908feecb03315a2ca9951cec147d5c02389665439096e7bb42c082597f564

```diff
- model: "gpt-5.6",
- model="gpt-5.6", input="Tell me a joke."
- Model: openai.String("gpt-5.6"),
- model: "gpt-5.6",
- "model": "gpt-5.6",
- --model gpt-5.6 \
- model: "gpt-5.6",
- model="gpt-5.6",
- Model: openai.String("gpt-5.6"),
- model: "gpt-5.6",
- "model": "gpt-5.6",
- model: gpt-5.6
- model: "gpt-5.6",
- model="gpt-5.6",
- Model: openai.String("gpt-5.6"),
- model: "gpt-5.6",
- "model": "gpt-5.6",
- model: gpt-5.6
- model: "gpt-5.6",
- model="gpt-5.6",
- Model: openai.String("gpt-5.6"),
- model: "gpt-5.6",
- "model": "gpt-5.6",
- model: gpt-5.6
- model: "gpt-5.6",
- model="gpt-5.6",
- Model: openai.String("gpt-5.6"),
- model: "gpt-5.6",
- "model": "gpt-5.6",
- model: gpt-5.6
+ model: "gpt-6-astra",
+ model="gpt-6-astra", input="Tell me a joke."
+ Model: openai.String("gpt-6-astra"),
+ ```java
+ import com.openai.client.OpenAIClient;
+ import com.openai.client.okhttp.OpenAIOkHttpClient;
+ import com.openai.models.responses.inputtokens.InputTokenCountParams;
+ var count =
+ client
+ .responses()
+ .inputTokens()
+ .count(
+ InputTokenCountParams.builder()
+ .model("gpt-6-astra")
+ .input("Tell me a joke.")
+ .build());
+ System.out.println(count.inputTokens());
+ model: "gpt-6-astra",
+ "model": "gpt-6-astra",
+ --model gpt-6-astra \
+ model: "gpt-6-astra",
+ model="gpt-6-astra",
+ Model: openai.String("gpt-6-astra"),
+ ```java
+ import com.openai.client.OpenAIClient;
+ import com.openai.client.okhttp.OpenAIOkHttpClient;
+ import com.openai.models.responses.EasyInputMessage;
+ import com.openai.models.responses.ResponseInputItem;
+ import com.openai.models.responses.inputtokens.InputTokenCountParams;
+ import java.util.List;
+ var count =
+ client
+ .responses()
+ .inputTokens()
+ .count(
+ InputTokenCountParams.builder()
+ .model("gpt-6-astra")
+ .inputOfResponseInputItems(
+ List.of(
+ ResponseInputItem.ofEasyInputMessage(
… diff truncated (157 added / 30 removed lines)
```

### openai.codex.changelog

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/changelog
- Change: changed
- Prior hash: 2da006560239d41037e3d2610546b1d861c406a20c4a5ff8e935b7a206eb7dc6
- Current hash: e8b0c9fbf58fb1fae26839a2d290154deb8ee2e374d716f678e02346548840fd

```diff
- Using GPT-5.6
- Deep dive
- Images and vision
- Safety checks Cybersecurity checks
- Under 18 API Guidance
- Workload identity federation X.509 certificates (beta)
- Chrome extension
- Custom Code Review rules for Codex
- Mastering remote engineering work from your phone
- Making private MCP servers reachable without making them public
- How Perplexity Brought Voice Search to Millions Using the Realtime API
- Designing delightful frontends with GPT-5.4
- August 2026 July 2026 June 2026 May 2026 April 2026 March 2026 February 2026 January 2026 December 2025 November 2025 October 2025 September 2025 August 2025 June 2025 May 2025
- li+li]:mt-12"> 2026-08-13
- and provisioning; Daybreak Blue access doesn’t grant access to Daybreak Red.
- Type in the built-in browser’s address bar to revisit pages from your
- browsing history or search Google when there’s no match.
- Added a new “Activity view” in the sidebar to view which chats you engaged with recently and require attention. Click the bell or use Cmd / Ctrl + Opt + U to change to the new view.
- picture, if available. You must still review and approve each plugin’s requested
- Codex CLI 0.146.0
- pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.146.0
- Name new sessions with /new or /clear , pin important threads, and switch between side conversations without closing them. ( #34605 , #34840 , #35011 )
- Support Agent Plugins manifests, workspace plugin publishing, and additional plugin marketplaces for Amazon Bedrock and Claude Code. ( #35105 , #35254 , #34931 , #34979 )
- Fork threads with paginated history, including temporary forks that do not appear in thread listings. ( #35220 , #35251 )
- Connect app-server to remote Code Mode hosts over WebSocket. ( #35078 , #35098 )
- Enable standalone web search for compatible custom model providers. ( #34846 )
- Discover executor-provided skills and securely read their associated resources, including explicitly selected skills. ( #35184 , #35198 )
- Honor configured proxies across authentication, plugin downloads, MCP authorization, remote execution, WebSockets, redirects, and LM Studio connections. ( #34479 , #34509 , #34655 , #34678 , #35023 , #35056 , #35239 )
- Keep MCP connections and Apps tools current when authentication or configuration changes, reconnecting closed servers without restarting healthy connections. ( #34952 , #34957 , #35028 , #35144 , #35146 , #35151 )
- Preserve submitted messages, final responses, failed-turn errors, imported timestamps, and approval settings across interruptions, replay, imports, and forks. ( #34839 , #34777 , #35524 , #34989 , #34664 )
- Improve terminal responsiveness and rendering, including nonblocking interrupts, keyboard handling, narrow layouts, hyperlinks, and refreshed mention results. ( #35000 , #35021 , #34775 , #34778 , #35365 , #35375 )
- Fix Windows navigation keys, reliably terminate sandboxed process trees, and preserve proxy settings during security reviews. ( #34625 , #34624 , #35036 )
- Retain more available skills under tight context budgets and warn when skill catalogs must be truncated. ( #34732 , #34738 , #34997 )
- Document shared HTTP-client usage, proxy-aware connection pooling, and safe outbound request handling. ( #34669 )
- Clarify Windows drive-letter canonicalization for PathUri values. ( #34667 )
- Publish release artifacts, channel metadata, and installer aliases through OpenAI-hosted release infrastructure, with GitHub fallback. ( #34505 , #34508 , #34729 , #34910 )
- Sign and notarize bundled macOS helper executables before packaging. ( #35264 )
- Reduce app-server serialization overhead and unnecessary request-building allocations. ( #34761 , #34766 , #34825 )
- Add enterprise-plan recognition and administrator controls for in-app updates. ( #35238 , #35537 )
- Full Changelog: rust-v0.145.0...rust-v0.146.0
+ Using GPT-6 Astra
+ Mid-turn steering
+ Images and vision Image input cost calculator
+ Async tool calling
+ Safety checks Safety classifiers
+ Cybersecurity checks
+ Misalignment monitoring
+ Under-18 guidance
+ CSAM guidance
+ Mutual TLS
+ Workload identity federation Codex setup
+ Federation rules
+ Admin API
+ X.509 certificates
+ Custom Audiences
+ Browser extension
+ Site tools (WebMCP)
+ GitLab (Beta)
+ GitLab CI/CD
+ ChatGPT Work
+ ChatGPT Work cloud security
+ ChatGPT Work local security
+ ChatGPT Work: usage and cost
+ Workload identity
+ User lifecycle management
+ Plugin management
+ Admin plugin
+ Architectural visualization with Astra
+ Building games with Astra
+ Meet Rosalind Workbench: Empowering every scientist to be their own research team
+ Automating repetitive work at OpenAI with Codex
+ Meet the winners of OpenAI Build Week
+ Life sciences
+ September 2026 August 2026 July 2026 June 2026 May 2026 April 2026 March 2026 February 2026 January 2026 December 2025 November 2025 October 2025 September 2025 August 2025 June 2025 May 2025
+ September 2026
+ li+li]:mt-12"> 2026-09-04
+ Codex CLI 0.153.4
+ pre]:w-full [&>pre]:max-w-full [&>pre]:mb-0 pt-4"> $ npm install -g @openai/codex@0.153.4
+ Fixed Astra’s visibility in the bundled model picker and made it the bundled default when no model is explicitly configured. ( #42874 )
+ Updated Astra’s guidance to use asynchronous questions only when the tool is available in the session. ( #42878 )
… diff truncated (1366 added / 1093 removed lines)
```

### openai.codex.models

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/models
- Change: changed
- Prior hash: 950329102a6b2e1e5f9f1bf88f819fa9bcbfc41ad8ee99850992319eb22ac2ef
- Current hash: a1d747122bcb7a290eba962315d8ffb3a0085d204ef5c1e00595f3b047ee8332

```diff
- Using GPT-5.6
- Deep dive
- Images and vision
- Safety checks Cybersecurity checks
- Under 18 API Guidance
- Workload identity federation X.509 certificates (beta)
- Chrome extension
- Custom Code Review rules for Codex
- Mastering remote engineering work from your phone
- Making private MCP servers reachable without making them public
- How Perplexity Brought Voice Search to Millions Using the Realtime API
- Designing delightful frontends with GPT-5.4
- Flagship GPT-5.6 model with the strongest capability for complex coding, computer use, research, and cybersecurity.
- Start with the default Power setting, which uses gpt-5.6-sol with medium
- reasoning. Move toward Smarter for deeper reasoning or Faster for
- faster, lower-cost work. Open Advanced when you want gpt-5.6-luna or a
- specific model, reasoning effort, or speed.
- Choosing Sol, Terra, and Luna
- Codex offers three GPT-5.6 models: Sol for detail and polish, Terra as the
- everyday workhorse, and Luna for clear, repeatable work. If you are unsure,
- start with Sol.
- needs strong reasoning and tool use when you do not need Sol’s full depth. It
- don’t see Max in your options, you’ll have to enable it in your app settings.
- If Ultra doesn’t appear in the desktop app’s model slider, go to
- aren’t affected.
- Previous-generation frontier model for complex coding, computer use, knowledge work, and research workflows.
- Frontier model for professional work with strong coding, reasoning, tool use, and agentic workflow capabilities.
- The OpenAI API and Codex authenticated with your own API key aren’t affected
- model entry to your configuration file. If you don’t specify a model, the
- Currently, you can’t change the default model for Codex cloud chats.
+ Using GPT-6 Astra
+ Mid-turn steering
+ Images and vision Image input cost calculator
+ Async tool calling
+ Safety checks Safety classifiers
+ Cybersecurity checks
+ Misalignment monitoring
+ Under-18 guidance
+ CSAM guidance
+ Mutual TLS
+ Workload identity federation Codex setup
+ Federation rules
+ Admin API
+ X.509 certificates
+ Custom Audiences
+ Browser extension
+ Site tools (WebMCP)
+ GitLab (Beta)
+ GitLab CI/CD
+ ChatGPT Work
+ ChatGPT Work cloud security
+ ChatGPT Work local security
+ ChatGPT Work: usage and cost
+ Workload identity
+ User lifecycle management
+ Plugin management
+ Admin plugin
+ Architectural visualization with Astra
+ Building games with Astra
+ Meet Rosalind Workbench: Empowering every scientist to be their own research team
+ Automating repetitive work at OpenAI with Codex
+ Meet the winners of OpenAI Build Week
+ Life sciences
+ Astra
+ Our most capable model for complex work across code, apps, and research, combining advanced reasoning, computer use, and stronger judgment.
+ codex -m gpt-6-astra
+ The most capable GPT-5.6 model for complex coding, computer use, research, and cybersecurity.
+ Availability depends on the rollout, your sign-in method, and your client.
+ See pricing for plan access and usage, and
+ workspace model availability
… diff truncated (77 added / 30 removed lines)
```

### openai.codex.plan-usage

- Vendor: OpenAI
- Source: https://learn.chatgpt.com/docs/pricing
- Change: changed
- Prior hash: 80706b64e61c061cb18d651ee94a58c882a54d51738ac9ed573123e52a38de1d
- Current hash: 8cac49415a6fc9271c1ac405e9ee3464e585c1c1ee8a97976f1d5f63dc7413e6

```diff
- Using GPT-5.6
- Deep dive
- Images and vision
- Safety checks Cybersecurity checks
- Under 18 API Guidance
- Workload identity federation X.509 certificates (beta)
- Chrome extension
- Custom Code Review rules for Codex
- Mastering remote engineering work from your phone
- Making private MCP servers reachable without making them public
- How Perplexity Brought Voice Search to Millions Using the Realtime API
- Designing delightful frontends with GPT-5.4
- Pay only for the tokens Codex uses, based on API
- Pay only for the tokens Codex uses, based on API
- recipient’s email address, and send the invitation.
- Referrals aren’t currently available for ChatGPT Enterprise.
- 30 days after they’re granted. Business referrals use separate shared-workspace
- so prompt length alone isn’t a reliable estimate.
- Plus Pro 5x Pro 20x Business API Key
- Local Messages * / 5h
- Cloud chats * / 5h
- Code Reviews / 5h
- Not available
- Not available
- Not available
- Not available
- Not available
- Not available
- Not available
- Not available
- Not available
- Not available
- Not available
- Not available
- *The usage limits for local messages and cloud chats share a
- five-hour window . Additional weekly limits may apply.
- For Enterprise/Edu users with flexible pricing, there are no
- fixed rate limits - usage scales with
- credits
- Enterprise and Edu plans without flexible pricing have the same
+ Using GPT-6 Astra
+ Mid-turn steering
+ Images and vision Image input cost calculator
+ Async tool calling
+ Safety checks Safety classifiers
+ Cybersecurity checks
+ Misalignment monitoring
+ Under-18 guidance
+ CSAM guidance
+ Mutual TLS
+ Workload identity federation Codex setup
+ Federation rules
+ Admin API
+ X.509 certificates
+ Custom Audiences
+ Browser extension
+ Site tools (WebMCP)
+ GitLab (Beta)
+ GitLab CI/CD
+ ChatGPT Work
+ ChatGPT Work cloud security
+ ChatGPT Work local security
+ ChatGPT Work: usage and cost
+ Workload identity
+ User lifecycle management
+ Plugin management
+ Admin plugin
+ Architectural visualization with Astra
+ Building games with Astra
+ Meet Rosalind Workbench: Empowering every scientist to be their own research team
+ Automating repetitive work at OpenAI with Codex
+ Meet the winners of OpenAI Build Week
+ Life sciences
+ Pay for Codex usage based on API pricing
+ Pay for Codex usage based on API pricing
+ recipient's email address, and send the invitation.
+ Referrals aren't currently available for ChatGPT Enterprise.
+ 30 days after they're granted. Business referrals use separate shared-workspace
+ so prompt length alone isn't a reliable estimate.
+ The estimates below show local messages per five-hour period. Cloud chats on
… diff truncated (90 added / 149 removed lines)
```

## Volatile noise (ignored)

- `hermes.docs.mixture-of-agents` — https://hermes-agent.nousresearch.com/docs/user-guide/features/mixture-of-agents
