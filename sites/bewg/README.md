# bewg.au — Building Environmental Wellness Group

Rebuild of Ivi Sims' inspection site (previously Hostinger Website Builder) for the Unite-Group Vercel account.
Static pages built by `build.py` (Python standard library only) plus one Vercel function that sends booking-form
enquiries into the Unite-Group CRM.

## How the website CRM works

```
Visitor fills /book/  →  POST /api/enquiry (this site, same origin)
                      →  POST https://unite-group.in/api/leads  (server to server)
                      →  crm_leads row, additional_data.business_key = "bewg"
                      →  new_lead alert + CRM activity timeline, shows in the CRM inbox with origin "bewg"
```

- No new database tables and no change to `apps/web`: it uses the existing public lead route
  (`apps/web/src/app/api/leads/route.ts`).
- Fields crm_leads has no column for (suburb, postcode, property type, problems, how long, insurance, best call
  time) are written as labelled lines in `message`; the ticked problems also go in `interests`.
- Spam: hidden honeypot field + a 3-second minimum fill time. Bots get a silent 200 and nothing is sent.
- If the CRM can't be reached, the visitor sees a message to call 03 7075 1932. Visitor details are never logged.

## Commands

| Command | What it does |
|---|---|
| `python3 build.py` | Fetch any missing photos into `media-cache/` (WebP), then build `dist/` |
| `python3 build.py --offline` | Build from `media-cache/` only |
| `python3 tests/check_site.py` | Verify the built site (one h1, titles, descriptions, canonicals, links, no hot-linked images, none of the old site's defects) |
| `node --test tests/enquiry.test.js` | Unit tests for the enquiry form → CRM mapping |
| `npm run verify` | All three, offline |

## Images

- Ivi's real photos from the old site are listed in `media.py`. The first build with internet access downloads
  them once into `media-cache/` as WebP. **Commit `media-cache/` after that first build**, so the site no longer
  depends on Hostinger.
- New images come from Phill's ChatGPT Pro account. Prompts and file names: `IMAGE-PROMPTS.md`.
- A missing image is left out of the page. There are never placeholders or hot-links.

## Vercel set-up (one time)

1. Vercel → Unite-Group team → Add New → Project → import `CleanExpo/Unite-Group`.
2. Project name `bewg-website`. **Root Directory `sites/bewg`**. Framework preset: Other.
   `vercel.json` sets the build command (`python3 build.py`) and output (`dist`).
3. Optional env: `UNITE_LEADS_URL` (defaults to `https://unite-group.in/api/leads`).
4. Deploy and check the preview URL. Send one test enquiry and confirm it appears in the CRM inbox as `bewg`.
5. Domain cut-over (only after Ivi approves the preview): add `bewg.au` and `www.bewg.au` to the project.
   **Before changing DNS, copy the existing MX/TXT email records** so consult@bewg.au keeps working.
   Old Hostinger URLs (`/portfolio`, `/blog`, the three article slugs) already 301 to the new pages.

## What changed from the old site

Removed the stock-photo "Lena" testimonial, the template leftovers ("food businesses", "Pomodoro", the repeated
"under your house" copy), the admin-only LinkedIn link, the duplicated page title, the stale © year and the
"only place in Australia" claim. Added a real booking form wired to the CRM, Ivi's bio and credentials, problem
pages for homeowners, LocalBusiness/FAQ/Article structured data, sitemap, robots.txt and llms.txt.

Content for Ivi to supply: real Google reviews (`content.py` → `REVIEWS`), the body of the "continued monitoring"
article (the old site only had its introduction), and her LinkedIn URL.

## Found while capturing the group's sites (09/11/2026) — for Ivi

| Site | Issue | Impact |
|---|---|---|
| moisturedetective.com.au/contact | Email is misspelt: `team@mosiutredectective.com.au` | Every email enquiry bounces |
| moisturedetective.com.au/contact | Office phone link dials `61361390345285`, not 03 7075 1932 | Mobile callers reach a wrong number |
| moisturedetective.com.au/contact | Address typo "basywawter" | Looks careless; hurts local search |
| moisturedetective.com.au | Blog is republished Sensor Innovation (Norway) case studies, each listed up to 3 times | Duplicate content; reads as not their own work |
| moisturedetective.com.au | "Online booking coming soon" | No booking path; could link to bewg.au/book/ today |
| woodfloordrying.com.au | Phone 0413 282 997 differs from the group numbers | UNVERIFIED whether still answered |
| woodfloordrying.com.au | Last edited 2016; "most qualified drying engineers in Australia", "satisfaction guaranteed" | Unbacked claims; stale |
| woodfloordrying.com.au | Membership logos (ATFA, SCRIA, RIA, IICRC Clean Trust) | UNVERIFIED as current; not carried onto bewg.au |

The three Wood Floor Drying projects (2014–2016) are carried onto bewg.au/case-studies/ word for word in facts, with
their photos converted to WebP at build time (Pillow).
