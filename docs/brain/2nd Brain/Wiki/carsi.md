---
type: wiki
updated: 2026-05-11
---

# CARSI — Online Training LMS

IICRC-aligned CEC learning platform for cleaning and restoration professionals in Australia. Delivers structured courses → enrolment → lessons → progress tracking → certificates.

**GitHub:** CleanExpo/carsi  
**Version:** 1.0.0  
**License:** MIT  
**Author:** Philip McGurk; Technical Lead: Rana Muzamil  
**Deployment:** Docker + DigitalOcean App Platform

## What It Is

CARSI is a modern LMS for restoration and cleaning professionals. Public course catalogue (SEO-first), Stripe-backed checkout for paid training, WordPress/WooCommerce import pipeline, admin analytics dashboard. Completion generates certificates.

## Certification Integration

CARSI is the **mandatory platform component (25 points)** within the NRPG 100-point certification system. All NRPG-certified specialists must complete CARSI education beyond IICRC credentials. NRPG onboarding framework (now archived at CleanExpo/NRPG-Onboarding-Framework) referenced CARSI as core educational infrastructure.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5.7, Tailwind CSS 4
- **Database:** PostgreSQL 15
- **ORM:** Prisma 7.6
- **Payments:** Stripe (checkout + webhooks)
- **Deployment:** Docker multi-stage + DigitalOcean App Platform (`app.yaml`)
- **Node:** 22.x, npm >=10
- **Testing:** Playwright

## Key Features

- Public SEO-first course catalogue + sitemap/robots
- Learner enrolment (free or paid) + structured learning flows
- Module/lesson progress tracking
- Certificate generation on completion
- Admin dashboard: users, enrolments, completion analytics
- WordPress/WooCommerce import pipeline (keeps course data in sync)
- Optional OpenAI API key for AI features

## Architecture Notes

- Prisma client generated on install/build (`postinstall` + build script)
- Production build sequence: `prisma generate` → `prisma migrate deploy` → `next build`
- Build-time secrets required (`RUN_AND_BUILD_TIME`) for Prisma client generation and static metadata
- `NEXT_PUBLIC_FRONTEND_URL` must be a real absolute URL (not empty)

## Course Pillars (May 2026)

CARSI's IICRC-aligned catalogue is now joined by a new **IAQ + Building Science** pillar (see [[iaq-building-science-initiative]]). Candidate course modules drawn from the AU/global IAQ source base:

- **Wildfire smoke assessment & restoration** — Dr Joe Spurgeon protocol (sampling, soot/char/aldehyde, persistence)
- **Mould inspection & detection** — including canine detection (Hank Nolan IAQAA ep6), mould in underground environments (Ash Boss-Handley)
- **HVAC + IAQ** — AS 1668.2 (AU), EN 16798-3 (EU), ISO 16890 filter selection, MERV-A real-world ratings
- **NCC compliance for IAQ remediation** — performance-based code references for ventilation, energy efficiency, and health-amenity provisions
- **IICRC S520 + AU mould context** — mould-illness clinical arc (Dr Mali Rezaei / Brandon Chappo references)

Authority anchor: [[founder|Phill]]'s IAQ Magazine Australia editorial committee seat. Schema.org `Person` author markup must reflect.

## Media and Resources

![banner](https://www.iaqmagazine.com.au/images/may2025banner.jpg)

- [Clean Indoor Air in Buildings: Can this be Achieved?](http://www.iaqmagazine.com.au/flipbook/May2025.html)
- [From Macro to Micro: Bridging the Gap from Field to Microscope](http://www.iaqmagazine.com.au/flipbook/May2025.html)

[![logo](https://www.iaqmagazine.com.au/images/scan-iq.jpg)](http://www.iaqmagazine.com.au/flipbook/May2025.html)

[Open Flipbook](http://www.iaqmagazine.com.au/flipbook/May2025.html)

## Videos / Articles

![img](https://www.iaqmagazine.com.au/images/video-img3.jpg)

[![icon](https://www.iaqmagazine.com.au/images/play-icon.png)](https://youtu.be/tdl6BWwA1js)

![img](https://www.iaqmagazine.com.au/images/video-img4.jpg)

[![icon](https://www.iaqmagazine.com.au/images/play-icon.png)](https://youtu.be/bJxEDPumcvw)

![img](https://www.iaqmagazine.com.au/images/video-img1.jpg)

[![icon](https://www.iaqmagazine.com.au/images/play-icon.png)](https://youtu.be/LjiVoF3o_3I)

![img](https://www.iaqmagazine.com.au/images/video-img2.jpg)

[![icon](https://www.iaqmagazine.com.au/images/play-icon.png)](https://youtu.be/lifr2d5uxLA)

## Older Issues

 [![older-img](https://www.iaqmagazine.com.au/images/may2023cover.jpg)](http://www.iaqmagazine.com.au/flipbook/May2023.html)May 2023 IssueNovember 2022 Issue

⛌ ![logo](https://www.iaqmagazine.com.au/images/logo-black.png)

## Cross-refs

[[businesses-overview]] · [[dr-nrpg]] · [[restoration-industry-context]] · [[voice-klark-brown]] · [[iaq-building-science-initiative]] · [[iicrc-content-initiative]] · [[founder]]