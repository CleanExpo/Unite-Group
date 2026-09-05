# Unite-Group Pixel Office: research and implementation direction

Checked 6 September 2026. This document accompanies a standalone design proposal. The package changes documentation and a local concept only; it does not change the running office, installed extension, application runtime or agent configuration.

## What is actually running

The installed VS Code extension and global standalone CLI are both Pixel Agents **1.4.1**. This matches the latest published upstream release checked today. I viewed the standalone companion on its loopback browser server; native VS Code panel capture was unavailable. The companion shares the saved office layout, but has its own session/settings namespace. This is evidence of the companion view, not a claim that I inspected the native VS Code panel. [Release v1.4.1](https://github.com/pixel-agents-hq/pixel-agents/releases/tag/v1.4.1)

Your saved layout is 21 × 12 tiles with 36 furniture items. It has no painted named Areas, although settings contain a frontend-to-Engineering area mapping. No external asset directories are configured. Persistent character labels and the optional headless-agent ghost display are off. Watching sessions is already enabled, and Claude hooks are configured. These observations came from selected non-secret local configuration fields.

The visible office has a dark surrounding canvas, a wood-floor workspace and a blue-floor meeting/lounge area. The characters are attractive, but their purpose is hard to read at a glance without names and assignment details.

An existing local `tiers.json` already describes SPM, Senior Agent and Sub-agent palette bands. A targeted search found no literal reference to that filename in the installed extension or CLI source bundles. Treat it as evidence of an earlier customisation idea, not proof that the current runtime applies those role rules; a separate bridge or dynamic reader would need to be identified and verified.

## What the existing product can already do

| Enhancement | Existing capability or custom work? | Suggested use |
| --- | --- | --- |
| Persistent names, colours and layout | Existing controls | Make people and roles recognisable |
| Named Areas and workspace mappings | Existing controls | Separate Engineering, Board and Operations |
| Original signs, furniture and decorations | Supported external asset packs | Add Unite signage, department markers and a release wall |
| Agent teams, role badges and context/token gauges | Already supported | Use available telemetry without rebuilding it |
| Owner decision tray and mission inspector | Custom frontend work | Explain what needs your decision and what happens next |
| All authorised GitHub repositories | Application integration | Populate from the real connected account; retain search and access boundaries |
| Codex/Hermes live activity | Provider/telemetry adapter work | Represent real sessions and assignments accurately |

The README documents Areas, editable layouts, external assets and the browser/VS Code surfaces. Team and context-gauge support appears in the changelog, so these should not be treated as missing features. A context gauge is not evidence of remaining account allowance or billing budget. [Project documentation](https://github.com/pixel-agents-hq/pixel-agents), [Changelog](https://github.com/pixel-agents-hq/pixel-agents/blob/main/CHANGELOG.md)

The external asset format supports furniture manifests, PNG artwork, rotations, animation and placement on a 16-pixel tile grid. Its visual asset manager can help assemble the manifests. This is a useful route for a branded art pack, but it is not a general plugin system for adding arbitrary business panels. Original artwork would avoid dependence on a third-party art pack. [External asset documentation](https://github.com/pixel-agents-hq/pixel-agents/blob/main/docs/external-assets.md)

## The design I recommend

Keep the pixel office as the visual overview and place a readable owner interface around it. Use daylight surfaces, eucalyptus green, blue and restrained plum accents. Keep long instructions and evidence in ordinary readable text outside the pixel scene.

1. **Margot's brief desk:** plain-language idea entry plus preset requirements. Every selected preset remains visible in the brief before submission.
2. **Named departments:** Board, delivery and operations areas, with persistent names and roles. Location is a visual grouping; it does not itself grant permissions or assign work.
3. **Agent inspector:** clicking a person shows the linked mission, repository, responsible owner, current step, blocker, next action and source freshness.
4. **Owner decision tray:** prioritised requests with reasons and consequences. Real approvals use the existing authoritative approval process.
5. **Delivery ribbon and evidence wall:** distinguish brief, review, approval, assignment, build, verification and release. Mark delivery complete only when the required release evidence is present.
6. **Accessible roster:** the same essential information in keyboard-accessible text, including mobile and reduced-motion support.

The interactive concept uses explicit sample data and local-only interactions. It demonstrates the proposed owner layer; it is not a connected extension or a working dispatch system.

## Integration findings in Unite-Group

There are already two office implementations in the workspace source. The active grid/roundtable/war-room renderer is [office-view.tsx](../../../apps/workspace/src/screens/gateway/components/office-view.tsx). It has agent status, task displays and click callbacks, but retains legacy workspace branding. An older SVG scene also exists in [isometric-office.tsx](../../../apps/workspace/src/components/agent-swarm/isometric-office.tsx). The latter was not found mounted in the inspected imports.

The delivery worktree has a [harness API adapter](../../../apps/workspace/src/lib/harness-api.ts) with observed connection and session information. Its current implementation is Hermes-specific despite a broader provider type. Agent clicks in the inspected hub lead to a generic conductor page rather than the selected mission. The two local checkouts differ, so the implementation should first identify the deployed source and consolidate deliberately.

Mission Control already has [agent events](../../../apps/web/src/lib/command-centre/agent-events.ts), [execution sessions](../../../apps/web/src/lib/command-centre/sessions.ts) and [gateway presence](../../../apps/web/src/lib/operator-gateway/presence.ts). These provide useful foundations for mission links and freshness, but were not found feeding the office renderer. Reuse these records rather than creating another competing mission database.

## Technical approach and boundaries

Pixel Agents separates its React/Canvas frontend from the host using a transport interface. Custom owner panels would require maintained source changes; protocol additions should follow its schema/type generation process. The documented development workflow supports frontend iteration in isolation. MIT applies to the code; artwork licences must be respected separately. [Contributor guide](https://github.com/pixel-agents-hq/pixel-agents/blob/main/CONTRIBUTING.md), [Code licence](https://github.com/pixel-agents-hq/pixel-agents/blob/main/LICENSE)

The current provider interface ships a Claude HookProvider. Other providers require implementation. Its turn-end event describes the end of an agent turn, not a shipped product. Preserve that distinction when mapping character animation to business status. [Provider source](https://github.com/pixel-agents-hq/pixel-agents/blob/main/core/src/provider.ts)

Recommended flow: real local provider events → authenticated outbound relay → existing founder-scoped Mission Control records → office and inspector. Join by stable session and mission identifiers, not display names. Keep local terminal/control credentials local. The transport already exposes connection lifecycle states that can inform a fresh/stale/disconnected indicator. [Transport source](https://github.com/pixel-agents-hq/pixel-agents/blob/main/core/src/transport.ts)

## Delivery order and acceptance checks

**Small:** configure labels and painted Areas; create an original brand asset pack. Confirm names remain legible and workspace mappings place agents correctly.

**Medium:** choose the canonical owner-facing office renderer, add the inspector and decision tray, and connect existing mission/session data. Confirm clicking an agent opens the correct mission, unavailable data is stated clearly, repository selection reflects authorised access, and mobile/keyboard access works.

**Larger:** implement and test real Codex/Hermes telemetry adapters and reconcile assignment/release evidence. Confirm reconnects do not duplicate sessions, stale agents remain visibly stale, approvals retain audit records, and a completed tool call cannot mark a mission shipped.

The prototype is the reviewable design step. Live dispatch, account-wide repository access and verified delivery remain implementation work, and are not claimed by the sample screen.
