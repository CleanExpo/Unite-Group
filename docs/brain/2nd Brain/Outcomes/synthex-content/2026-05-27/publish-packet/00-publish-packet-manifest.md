# Synthex publish packet — 2026-05-27

Provider override requested: do not use openai-codex/gpt-5.5; use fallback Anthropic/OpenRouter working tier.
Execution note: this packet is filesystem-only and policy-derived from the approved calibration files in the parent folder.

Canonical policy file: /Users/phillmcgurk/Synthex/docs/marketing/synthex-rules-v1.md
Source batch: /Users/phillmcgurk/2nd-brain/Outcomes/synthex-content/2026-05-27
Output folder: /Users/phillmcgurk/2nd-brain/Outcomes/synthex-content/2026-05-27/publish-packet

## Contents

| File | Source | Action | Status |
|---|---|---|---|
| 01-linkedin-approval-workflow-publish-packet.md | 01-linkedin-post-approval-workflow.md | Build publish packet from APPROVE_TO_QUEUE | QUEUE_READY_INTERNAL_DRAFT |
| 02-x-content-handoff-publish-packet.md | 04-x-post-content-handoff.md | Build publish packet from APPROVE_TO_QUEUE | QUEUE_READY_INTERNAL_DRAFT |
| 03-linkedin-platform-integrations-v2.md | 02-linkedin-post-platform-integrations.md | Generate v2 for REVIEW_REQUIRED | NEED_APPROVAL_BEFORE_PUBLIC |
| 04-x-performance-claim-v2.md | 05-x-post-performance-claim-review.md | Generate v2 for REVIEW_REQUIRED | NEED_APPROVAL_BEFORE_PUBLIC |
| 05-blog-content-operating-system-v2.md | 06-blog-draft-content-operating-system.md | Generate v2 for REVIEW_REQUIRED | NEED_APPROVAL_BEFORE_PUBLIC |
| 06-ad-variant-set-v2.md | 07-ad-variant-set.md | Generate v2 for REVIEW_REQUIRED | NEED_APPROVAL_BEFORE_PUBLIC |
| 07-blocked-guaranteed-viral-remediation-note.md | 03-linkedin-post-guaranteed-viral-blocked.md | Blocked remediation note | BLOCKED_ORIGINAL_NOT_FOR_QUEUE |

## Queue rule

APPROVE_TO_QUEUE means safe for internal draft queue only. It does not authorize autopublish. Human scheduling/publication review remains required unless a separate approved autopublish policy exists for the exact channel and asset type.
