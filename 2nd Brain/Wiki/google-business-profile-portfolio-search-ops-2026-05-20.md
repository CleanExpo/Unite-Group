---
type: wiki
updated: 2026-05-20
---

# Google Business Profile Portfolio Search Ops

Purpose: make every portfolio Google Business Profile complete, policy-safe, and useful for Search, Maps, AEO/GEO, Synthex local SEO automation, and client reporting.

## Source Ingest

- `Sources/google business profile.md` proves the Google Search UI account visible during capture showed managed profiles for CARSI, Disaster Recovery, and Synthex.
- `Sources/Get Listed on Google - Google Business Profile.md` confirms the current Google value loop: claim or manage the profile, personalise it with hours/photos/posts, show services/products, and use profile insights to understand customer discovery.
- `Sources/22 Claude Prompts That Can Rank Any Local Business (Free Stack).md` contributes the local SEO operating method: build a business brain first, then run category, attribute, competitor review, photo, service, post, Search Console, backlink, and on-page audits with human verification.

## Official 2026 Rules

- Google says local ranking is driven by relevance, distance, and prominence; the controllable lever is complete, accurate profile information that explains what the business does, where it operates, and when customers can engage.
- Google requires profiles to represent the real-world business accurately: use the real business name, accurate address or service area, the fewest categories needed to describe the core business, and one profile per real business/location.
- Business names must not be stuffed with keywords, locations, phone numbers, URLs, marketing taglines, store codes, hours, or service lists.
- Categories matter for discovery, but the primary category must describe the business itself, not every service it sells. Additional categories should cover true departments or major service lines only.
- Profile edits can be made in Search/Maps by the Google account linked to a verified Business Profile; some edits may require verification or review before they go live.
- API updates require a real `locations/{locationId}` resource and a narrow `updateMask`; `validateOnly=true` should be used before any write whenever possible.

## Current Access Reality

Synthex currently has active Google Business Profile OAuth grants for the Disaster Recovery / NRPG context and Unite-Group, but the active API account exposed during the audit is a personal account that returns no editable GBP locations through the Business Information API. That means the system can prove OAuth reachability, but cannot safely update CARSI, Disaster Recovery, Synthex, Unite-Group, or RestoreAssist profile fields yet.

Live field edits are therefore blocked until the owning Google Business account is connected and returns the actual location resources. The visible Google Search UI source showing CARSI, Disaster Recovery, and Synthex profiles is useful evidence, but it is not enough for safe API writes.

## Portfolio State

- [[dr-nrpg]]: Google stack is connected through the NRPG organization row and valid for Disaster Recovery / NRPG context. GBP location editability still needs owner-location visibility before profile patches.
- [[carsi]]: Source capture shows a visible profile, but Synthex does not currently have a reusable active GBP grant for CARSI. Needs owner account reconnect.
- [[synthex]]: Source capture shows a visible profile, but Synthex does not currently have an active Synthex-org GBP grant. Needs owner account reconnect.
- [[unite-crm]]: Unite-Group has active GBP OAuth reachability, but no editable API locations were visible in the current audit. Needs owner-location visibility before edits.
- [[restore-assist]]: Legacy GBP row was inactive with no reusable refresh token. Needs reconnect if RestoreAssist has or needs a profile.

## 100 Percent Profile Checklist

Each business needs this verified before Synthex automation can call it complete:

- Ownership: correct Google account is owner or manager; profile is verified; API returns `locations/{locationId}`.
- NAP: exact name, address or service area, primary phone, website URL, and appointment/contact links match the real-world business and website.
- Categories: one specific primary category, minimal accurate secondary categories, no category stuffing.
- Services/products: core offers listed with plain-language descriptions; no unsupported or duplicate service items.
- Hours: regular hours, holiday/special hours, and service-area rules are current.
- Attributes: only true attributes selected; competitor attributes are research prompts, not automatic truth.
- Description: concise real-world positioning, no exaggerated claims, no private data, no keyword spam.
- Visuals: logo, cover image, real work/product/team photos, and recent updates pass licensing and consent.
- Posts: useful updates/offers/events published on a cadence that matches the business, with UTM links where appropriate.
- Reviews: response cadence, escalation path for negative reviews, and Synthex AI reply drafts reviewed before publishing.
- Evidence: every live edit has a source, confidence state, and approval gate.

## Synthex Automation Rule

Synthex should generate profile audits, draft updates, post calendars, review responses, and competitor gap reports before it writes anything. Live writes require:

1. A verified owner/manager grant for the correct business organization.
2. A returned GBP location resource name.
3. Evidence-backed fields and a human approval gate.
4. `validateOnly=true` dry-run success when the API supports it.
5. Audit logging of old value, proposed value, source, approver, and API result.

This keeps [[synthex]] useful as the automation augmentation layer without mixing business grants or risking profile suspension.

## Links

- [[businesses-overview]]
- [[synthex]]
- [[dr-nrpg]]
- [[carsi]]
- [[unite-crm]]
- [[search-aeo-geo-optimizer]]
- [[research-22-claude-seo-prompts-2026-05-14]]
