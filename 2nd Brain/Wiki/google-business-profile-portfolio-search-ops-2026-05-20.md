---
type: wiki
updated: 2026-05-20
---

# Google Business Profile Portfolio Search Ops

Purpose: make every eligible portfolio Google Business Profile complete, policy-safe, and useful for Search, Maps, AEO/GEO, Synthex local SEO automation, client onboarding, contractor onboarding, and portfolio reporting.

## Founder Correction

Phill clarified on 2026-05-20 that the portfolio is not a location-based storefront model. Disaster Recovery / NRPG must be set up as an online-first, service-area and marketplace/onboarding operation: clients and contractors should be able to join digitally, while search visibility targets the real locations where services are offered.

This changes the operating rule: do not create or optimise fake storefront profiles. Use service-area GBP only where the business is eligible and can prove real service delivery. Use website/location landing pages, Search Console, structured data, content, citations, reviews, and contractor/service-area proof to win locations where GBP is not the right substrate.

## Source Ingest

- `Sources/google business profile.md` proves the Google Search UI account visible during capture showed managed profiles for CARSI, Disaster Recovery, and Synthex.
- `Sources/Get Listed on Google - Google Business Profile.md` confirms the current Google value loop: claim or manage the profile, personalise it with hours/photos/posts, show services/products, and use profile insights to understand customer discovery.
- `Sources/22 Claude Prompts That Can Rank Any Local Business (Free Stack).md` contributes the local SEO operating method: build a business brain first, then run category, attribute, competitor review, photo, service, post, Search Console, backlink, and on-page audits with human verification.

## Official 2026 Rules

- Google says local ranking is driven by relevance, distance, and prominence; the controllable lever is complete, accurate profile information that explains what the business does, where it operates, and when customers can engage.
- Google requires profiles to represent the real-world business accurately: use the real business name, accurate address or service area, the fewest categories needed to describe the core business, and one profile per real business/location.
- If the business does not serve customers at its address, Google lets the address be hidden and a service area shown instead. The hidden address still needs to be real for verification and ownership.
- Pure online businesses that do not make in-person contact with customers are not the same as service-area businesses. For those, Search/GSC/location pages are the correct search substrate, not invented GBP locations.
- Business names must not be stuffed with keywords, locations, phone numbers, URLs, marketing taglines, store codes, hours, or service lists.
- Categories matter for discovery, but the primary category must describe the business itself, not every service it sells. Additional categories should cover true departments or major service lines only.
- Profile edits can be made in Search/Maps by the Google account linked to a verified Business Profile; some edits may require verification or review before they go live.
- API updates require a real `locations/{locationId}` resource and a narrow `updateMask`; `validateOnly=true` should be used before any write whenever possible.

## Current Access Reality

Synthex currently has active Google Business Profile OAuth grants for the Disaster Recovery / NRPG context and Unite-Group, but the active API account exposed during the audit is a personal account that returns no editable GBP locations through the Business Information API. That means the system can prove OAuth reachability, but cannot safely update CARSI, Disaster Recovery, Synthex, Unite-Group, or RestoreAssist profile fields yet.

Live field edits are therefore blocked until the owning Google Business account is connected and returns the actual location resources. The visible Google Search UI source showing CARSI, Disaster Recovery, and Synthex profiles is useful evidence, but it is not enough for safe API writes. When the owning profile is connected, the first edit pass must check whether the profile is service-area, hybrid, storefront, or online-only, and hide the public address if customers are not served there.

## Portfolio State

- [[dr-nrpg]]: Google stack is connected through the NRPG organization row and valid for Disaster Recovery / NRPG context. Treat as online-first service-area/marketplace search, not storefront. GBP editability still needs owner-location visibility before profile patches; location dominance should primarily come from service-area proof, city/service landing pages, GSC, reviews, contractor network evidence, and onboarding funnels.
- [[carsi]]: Source capture shows a visible profile, but Synthex does not currently have a reusable active GBP grant for CARSI. Needs owner account reconnect.
- [[synthex]]: Source capture shows a visible profile, but Synthex does not currently have an active Synthex-org GBP grant. Needs owner account reconnect.
- [[unite-crm]]: Unite-Group has active GBP OAuth reachability, but no editable API locations were visible in the current audit. Needs owner-location visibility before edits.
- [[restore-assist]]: Legacy GBP row was inactive with no reusable refresh token. Needs reconnect if RestoreAssist has or needs a profile.

## 100 Percent Profile Checklist

Each business needs this verified before Synthex automation can call it complete:

- Ownership: correct Google account is owner or manager; profile is verified; API returns `locations/{locationId}` where GBP is eligible.
- Business model: storefront, hybrid, service-area, or online-only is explicitly recorded before edits. Storefront-only assumptions are forbidden.
- NAP/service area: exact name, hidden/visible address decision, service area, primary phone, website URL, and appointment/contact links match the real-world business and website.
- Categories: one specific primary category, minimal accurate secondary categories, no category stuffing.
- Services/products: core offers listed with plain-language descriptions; no unsupported, duplicate, or location-stuffed service items.
- Hours: regular hours, holiday/special hours, and service-area rules are current.
- Attributes: only true attributes selected; competitor attributes are research prompts, not automatic truth.
- Description: concise real-world positioning, no exaggerated claims, no private data, no keyword spam.
- Visuals: logo, cover image, real work/product/team photos, and recent updates pass licensing and consent.
- Posts: useful updates/offers/events published on a cadence that matches the business, with UTM links where appropriate.
- Reviews: response cadence, escalation path for negative reviews, and Synthex AI reply drafts reviewed before publishing.
- Evidence: every live edit has a source, confidence state, and approval gate. Service-area claims need proof from real delivery, contractor coverage, client intake, or operational capacity.

## Disaster Recovery / NRPG Search-Dominance Setup

Goal: make Disaster Recovery / NRPG the authority layer for client and contractor onboarding across targeted service locations without pretending to be a shopfront.

- Use [[dr-nrpg]] as the national authority and onboarding brand: client intake, contractor applications, standards, certification, resources, and service-area matching.
- Build location/service pages for high-value terms such as water damage restoration, storm damage response, flood restoration, mould remediation, structural drying, emergency make-safe, and insurance restoration in each target city/region.
- Each page needs real-world evidence: service capability, contractor coverage, response expectations, standards, FAQs, photos where licensed, schema, internal links, and clear client/contractor CTAs.
- Use GBP only as an eligible service-area profile with hidden address where customers are not served at the address. Do not create fake city profiles.
- Use Search Console, GBP insights where available, reviews, calls/forms, contractor applications, and client onboarding completions as the learning loop.
- Synthex should generate drafts for service-area pages, GBP posts, review replies, contractor onboarding content, and local SEO reports, then route through evidence/brand/QA approval before publishing.

## Synthex Automation Rule

Synthex should generate profile audits, draft updates, post calendars, review responses, and competitor gap reports before it writes anything. Live writes require:

1. A verified owner/manager grant for the correct business organization.
2. A returned GBP location resource name.
3. Evidence-backed fields and a human approval gate.
4. `validateOnly=true` dry-run success when the API supports it.
5. Audit logging of old value, proposed value, source, approver, and API result.

This keeps [[synthex]] useful as the automation augmentation layer without mixing business grants, pretending online-only businesses are storefronts, or risking profile suspension.

## Links

- [[businesses-overview]]
- [[synthex]]
- [[dr-nrpg]]
- [[carsi]]
- [[unite-crm]]
- [[search-aeo-geo-optimizer]]
- [[research-22-claude-seo-prompts-2026-05-14]]
