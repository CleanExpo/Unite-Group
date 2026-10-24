# Business Card reference scout — 24/10/2026

Status: partial. Ten public source pages were retrieved today. No screenshot was produced: macOS sandbox policy prevents both cached Chromium builds from starting. The headless shell reports `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)` before any navigation. A visual top-ten ranking cannot be substantiated without captures.

Grounded 24/10/2026: source structures and public action links were retrieved from the ten URLs in scout.json; Chromium launch failed before navigation — web retrieval in this session and validation.json.
Waterline: research partial; capture and visual verification blocked; no release stage claimed.

## Ten references

| # | Source | Pattern to inspect | Qualification |
| --- | --- | --- | --- |
| 01 | [V1CE](https://v1ce.co/nfc-cards) | Product close-ups, video and a direct shop path | Maker showcase |
| 02 | [dot.cards](https://dotcards.net/) | Physical card to digital profile storytelling | Maker showcase |
| 03 | [Blinq](https://blinq.me/) | Phone mockups and profile customisation | Maker showcase; several product routes |
| 04 | [Wave Metal](https://wavecards.com.au/product/metal-smart-business-card/) | Material hero, video and an order section | Australian maker product page |
| 05 | [Mobilo](https://www.mobilocard.com/) | Card and contact-exchange interface demonstrations | Maker showcase; team-oriented |
| 06 | [HiHello](https://www.hihello.com/features/digital-business-cards) | Branded profile examples on phones and video | Maker showcase |
| 07 | [Designjoy](https://www.designjoy.co/) | Process, portfolio and one membership offer | Join today links directly to Stripe; checkout not opened |
| 08 | [ManyPixels](https://www.manypixels.co/pricing) | Consistent pricing and inclusion panels | Public sales page; Get Started leads to signup; payment not verified |
| 09 | [Design Buffs](https://www.designbuffs.com/pricing) | Defined capacity per plan | Public sales page; Get Started leads to signup; payment not verified |
| 10 | [Draftss](https://draftss.com/) | Work, process and plans on one page | Public service offer; signup/payment not verified; broader scope and more promotion |

These are research candidates, not ten visually approved winners. Observations in scout.json are hypotheses based on retrieved structure and image descriptions. The four offer pages sell one recurring creative-service proposition, sometimes with several tiers. They are not all strict one-package, direct-checkout pages. Card makers were acceptable under the requested showcase exception. No customer profile containing personal details was collected.

## Provisional shortlist of five

1. Wave Metal: closest reference for an Australian premium card offer, combining physical presentation, video and an order section.
2. V1CE: useful for making the object and tap interaction feel tangible through product media.
3. HiHello: useful for the actual digital-card hierarchy and phone presentation.
4. Designjoy: strongest verified single-offer structure and direct purchase link.
5. ManyPixels: useful for clear inclusions and plan hierarchy; simplify to one package for this offer.

The other five add comparisons: dot.cards for device-to-profile continuity, Blinq for editor mockups, Mobilo for exchange demonstrations, Design Buffs for capacity clarity and Draftss for the whole-page sales sequence. Do not reproduce branding, assets, layouts or copy. Study the underlying hierarchy and interaction patterns only.

## Capture and checks

capture.mjs uses cached Playwright and cached Chromium headless shell with fresh contexts, no saved authentication, 1440x900 desktop and 390x844 mobile, device scale 1, full-page screenshots, network idle followed by two seconds, obvious reject-only cookie handling, lazy-media scrolling, and PNG decoding with Sharp. Its check requires more than 30 KiB, at least 32 sampled pixel colours and the exact viewport width. Browser scratch files stay under this folder and are removed on failure/exit.

From the work folder, in a session whose host policy permits Chromium launch:

```sh
/Users/phill-mac/.nvm/versions/node/v24.14.1/bin/node evidence/business-card-gold/scout/capture.mjs
/Users/phill-mac/.nvm/versions/node/v24.14.1/bin/node evidence/business-card-gold/scout/capture.mjs --verify
```

Do not weaken the sandbox or replace headless capture with an authenticated browser session. The current manifest deliberately uses null for capture timestamps and image paths. A successful capture replaces those nulls and records page titles, response status, cookie handling and action links in inspection.json. Visual review is still needed after the numerical checks, including rejecting error pages, blank sections, overlays and unsuitable purchase paths. Video/motion quality cannot be judged from still screenshots alone.

## Completion report

Reviewed: AGENTS.md instructions, CLAUDE.md, SOURCE-OF-TRUTH.md, NORTH-STAR.md, FOUNDER-QUEUE.md, ground-truth-standard.md, nexus-conventions, model-router, unlazy, browser-harness and Playwright guidance; ten public references plus rejected candidates.

Changed: only capture.mjs, scout.json, validation.json and this README under the requested output folder; appended SCOUT lines to the explicitly authorised LEAD-STATUS.log. No product code changed.

Checks: capture script syntax passed with exit 0. Both browser launches failed before navigation. No image validation or visual review passed. Manifest fields and six-card/four-offer split were checked locally.

Assumptions and risks: maker showcase pages count as cards; signup links are provisional buying paths, not verified checkout; visual quality and responsiveness remain unverified. Design Pickle was rejected because its current pricing route is consultation-led. Reel Unlimited was rejected after redirecting to Renlar. No login, purchase, push, PR or deployment occurred.

Next executable step: run the two commands above in an authorised Chromium-capable session, inspect all 20 captures and replace any weak candidate or non-buyable offer page. Nothing is marked complete until that evidence exists.
