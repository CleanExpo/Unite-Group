# Shipit policy vendor scan

Timestamp: 2026-05-27T18:30:41+10:00
Policy: operator_policy_override_effective_immediately

## Result
NEED_APPROVAL

## Active todo/in_progress tasks scanned
- UGN-004 — in_progress — Publish-ready LinkedIn + blog pair — refs: LinkedIn — decision: need_approval
- UGN-007 — in_progress — Publish adapters preflight (LinkedIn/X/CMS) — refs: LinkedIn, X/Twitter, CMS — decision: need_approval
- UGN-008 — in_progress — Daily shipit board synthesis — refs: none — decision: allowed_existing_stack
- UGN-011 — in_progress — EEAT source pack for collision safety article — refs: none — decision: allowed_research_only
- UGN-012 — in_progress — Freeze Unite-Group and migrate required deltas to Unite-Hub — refs: Linear (approved) — decision: allowed_existing_stack

## Need approval updates applied
- UGN-004: status=need_approval; blocked_reason=new_vendor_disallowed_without_explicit_operator_approval; fallback=Continue as internal draft-only content in local vault/repo using existing approved tools; do not connect, schedule, publish, or create LinkedIn account/app/token until Phill explicitly approves that channel.
- UGN-007: status=need_approval; blocked_reason=new_vendor_disallowed_without_explicit_operator_approval; fallback=Audit existing in-repo adapter code/config names and approved-stack paths only; use GitHub/Linear/local docs for evidence; do not create or validate new external LinkedIn/X/CMS accounts, apps, connector platforms, OAuth clients, tokens, or publish paths without Phill approval.

## Compliance summary
- Nango opened/used: no
- New external accounts/services created: no
- Unapproved vendor auth/connectors configured or validated: no
- Production publish/deploy performed: no
- Existing approved stack allowed: GitHub, Linear, Supabase, Railway, Vercel, Telegram, existing Google integrations
- Fallback lane: keep work local/draft-only or use approved stack; require Phill approval for LinkedIn/X/CMS channel integration/publish/account/app/token work.
