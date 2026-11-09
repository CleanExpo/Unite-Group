#!/usr/bin/env python3
"""Build the BEWG static site into dist/.  Standard library only, so it runs on Vercel and on any Mac.

    python3 build.py            # fetch any missing photos into media-cache/, then build
    python3 build.py --offline  # build from media-cache/ only (no network)

Pages are plain HTML. The booking form posts to /api/enquiry (api/enquiry.js), which forwards the lead into the
Unite-Group CRM (crm_leads, business_key "bewg").
"""
from __future__ import annotations

import datetime as dt
import html
import json
import shutil
import sys
import urllib.request
from pathlib import Path

import os

sys.path.insert(0, str(Path(__file__).resolve().parent / '.pydeps'))  # Pillow installed here on Vercel

import content as C
import media as M
from pillars import PILLARS, SERVICE_AREAS
from posts import POSTS

POST_BY_SLUG = {p['slug']: p for p in POSTS}

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
CACHE = ROOT / "media-cache"
STATIC = ROOT / "static"
SITE = C.BUSINESS["url"]
YEAR = dt.date.today().year
PRIVACY_UPDATED = "09/11/2026"  # change only when the notice's wording changes
e = html.escape

# --------------------------------------------------------------------------- media

def fetch_media(offline: bool) -> list[str]:
    """Download each real photo once (as WebP) into media-cache/. Returns ids that are still missing."""
    CACHE.mkdir(exist_ok=True)
    missing = []
    for mid, (file, width, *_rest) in M.MEDIA.items():
        target = CACHE / f"{mid}.webp"
        if target.exists() and target.stat().st_size > 0:
            continue
        if offline:
            missing.append(mid)
            continue
        is_wfd = file.startswith("wfd:")
        url = M.WFD.format(file=file[4:]) if is_wfd else M.ZYRO.format(w=width, file=file)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "bewg-site-build"})
            with urllib.request.urlopen(req, timeout=20) as r:
                data = r.read()
            if not data:
                raise ValueError("empty")
            if is_wfd:
                data = to_webp(data, width)  # raises if Pillow is unavailable: image is left out, never shipped as a big JPG
            elif len(data) > 200 * 1024:
                try:
                    data = to_webp(data, min(width, 1400))  # keep within the media budget when Pillow is present
                except Exception:
                    pass
            target.write_bytes(data)
            print(f"  fetched {mid} ({len(data)//1024} KB)")
        except Exception as exc:  # network blocked or file gone: build still succeeds, image is left out
            print(f"  WARN could not fetch {mid}: {type(exc).__name__}")
            missing.append(mid)
    return missing


def to_webp(data: bytes, width: int, max_bytes: int = 400 * 1024) -> bytes:
    """Re-encode to WebP, stepping quality and size down until the file fits the media budget."""
    import io
    from PIL import Image  # installed into .pydeps by vercel.json installCommand; optional locally
    src = Image.open(io.BytesIO(data)).convert("RGB")
    out = b""
    for w, q in ((width, 72), (width, 60), (min(width, 1200), 55), (1000, 50), (800, 45)):
        im = src if src.width <= w else src.resize((w, round(src.height * w / src.width)))
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=q, method=6)
        out = buf.getvalue()
        if len(out) <= max_bytes:
            break
    return out


def have(mid: str) -> bool:
    return (CACHE / f"{mid}.webp").exists()


def resolve(mid: str) -> str | None:
    """Slot ids fall back to a real photo until the ChatGPT image is dropped into media-cache/."""
    if have(mid):
        return mid
    if mid in M.SLOTS and have(M.SLOTS[mid][0]):
        return M.SLOTS[mid][0]
    return None


def alt_for(mid: str) -> str:
    if mid in M.MEDIA:
        return M.MEDIA[mid][4]
    if mid in M.SLOTS:
        return M.SLOTS[mid][1]
    return ""


def fig(mid: str, cls: str = "split-media", sizes: str = "(min-width: 900px) 45vw, 100vw", eager: bool = False) -> str:
    """A figure only when the real image exists; otherwise nothing (the layout collapses to one column)."""
    tag = img(mid, "cover", eager=eager, sizes=sizes)
    return f'<figure class="{cls}">{tag}</figure>' if tag else ""


def img(mid: str, cls: str = "", eager: bool = False, sizes: str = "100vw") -> str:
    real = resolve(mid)
    if not real:
        return ""  # never a placeholder
    loading = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    alt = alt_for(mid) or alt_for(real)
    return f'<img src="/media/{real}.webp" alt="{e(alt)}" class="{cls}" {loading} sizes="{sizes}">'


# --------------------------------------------------------------------------- layout

NAV = [("/services/", "Services"), ("/service-areas/", "Areas"), ("/case-studies/", "Our work"), ("/resources/", "Resources"),
       ("/about/", "About Ivi"), ("/contact/", "Contact")]


def local_business_schema() -> dict:
    b = C.BUSINESS
    return {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "@id": f"{SITE}/#business",
        "name": b["name"],
        "alternateName": b["short"],
        "url": SITE + "/",
        "email": b["email"],
        "telephone": b["phone_office_e164"],
        "address": {"@type": "PostalAddress", "streetAddress": b["street"], "addressLocality": b["locality"],
                    "addressRegion": b["region"], "postalCode": b["postcode"], "addressCountry": "AU"},
        "openingHours": b["hours_schema"],
        "areaServed": [{"@type": "City", "name": "Melbourne"}, {"@type": "Country", "name": "Australia"}],
        "founder": {"@type": "Person", "name": C.IVI["name"], "jobTitle": C.IVI["role"], "sameAs": [C.IVI["linkedin"]]},
        "sameAs": [u for _n, u in C.SOCIALS],
        **({"logo": f"{SITE}/media/logo-bewg.webp"} if have("logo-bewg") else {}),
    }


def consoles_head() -> str:
    """Search Console, Bing Webmaster and GA4 switch on from Vercel env vars at build time; nothing is hard-coded."""
    out = []
    if os.environ.get("GOOGLE_SITE_VERIFICATION"):
        out.append(f'<meta name="google-site-verification" content="{e(os.environ["GOOGLE_SITE_VERIFICATION"])}">')
    if os.environ.get("BING_SITE_VERIFICATION"):
        out.append(f'<meta name="msvalidate.01" content="{e(os.environ["BING_SITE_VERIFICATION"])}">')
    ga = os.environ.get("GA4_MEASUREMENT_ID", "").strip()
    if ga and ga.replace("-", "").isalnum():
        out.append(f'<script async src="https://www.googletagmanager.com/gtag/js?id={ga}"></script>'
                   f'<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}'
                   f'gtag("js",new Date());gtag("config","{ga}",{{anonymize_ip:true}});</script>')
    return "\n".join(out)


def crumbs(items: list[tuple[str, str]]) -> tuple[str, dict]:
    html_ = '<nav class="crumbs" aria-label="Breadcrumb">' + " / ".join(
        f'<a href="{u}">{e(n)}</a>' if i < len(items) - 1 else f'<span>{e(n)}</span>' for i, (n, u) in enumerate(items)) + "</nav>"
    schema = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i, "name": n, "item": SITE + u} for i, (n, u) in enumerate(items, 1)]}
    return html_, schema


def page(path: str, title: str, description: str, body: str, schema: list[dict] | None = None,
         og_image: str | None = None) -> None:
    full_title = title if title.endswith("BEWG") else f"{title} | BEWG"
    canonical = SITE + path
    og = resolve(og_image or "hero-home")
    schemas = "".join(
        f'<script type="application/ld+json">{json.dumps(s, ensure_ascii=False).replace("</", "<\\/")}</script>' for s in (schema or [])
    )
    nav = "".join(
        f'<a href="{href}"{" aria-current=\"page\"" if path.startswith(href) else ""}>{label}</a>' for href, label in NAV
    )
    logo = (f'<img src="/media/logo-bewg.webp" alt="" width="40" height="40" data-pv-allow="logo">'
            if have("logo-bewg") else "")
    doc = f"""<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full_title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_AU">
<meta property="og:site_name" content="{e(C.BUSINESS['name'])}">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{canonical}">
{f'<meta property="og:image" content="{SITE}/media/{og}.webp">' if og else ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1f3b34">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Manrope:wght@400;500;600;700&display=swap">
<script>document.documentElement.classList.add("js")</script>
<link rel="stylesheet" href="/site.css">
{consoles_head()}
{schemas}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="/">{logo}<span><b>BEWG</b><small>Building Environmental Wellness Group</small></span></a>
    <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav id="nav" class="nav">{nav}<a class="btn btn-sm" href="/book/">Book an inspection</a></nav>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="foot">
  <div class="wrap foot-grid">
    <div>
      <p class="foot-brand">{e(C.BUSINESS['name'])}</p>
      <p>Independent moisture, mould, condensation and indoor air quality investigations. {e(C.BUSINESS['area'])}.</p>
      <p><a class="btn" href="/book/">Book an inspection</a></p>
    </div>
    <div>
      <h2 class="foot-h">Contact</h2>
      <p><a href="tel:{C.BUSINESS['phone_office_e164']}">{C.BUSINESS['phone_office']}</a><br>
      <a href="tel:{C.BUSINESS['phone_mobile_e164']}">{C.BUSINESS['phone_mobile']}</a><br>
      <a href="mailto:{C.BUSINESS['email']}">{C.BUSINESS['email']}</a></p>
      <p>{C.BUSINESS['street']}<br>{C.BUSINESS['locality']} {C.BUSINESS['region']} {C.BUSINESS['postcode']}</p>
    </div>
    <div>
      <h2 class="foot-h">Hours</h2>
      <p>{'<br>'.join(f'{d}: {h}' for d, h in C.BUSINESS['hours'])}</p>
      <h2 class="foot-h">Our group</h2>
      <p>{'<br>'.join(f'<a href="{u}" rel="noopener">{n}</a>' for n, _d, u, _l in C.GROUP)}<br>
      Training: <a href="{C.TRAINING_LINK[2]}" rel="noopener">{C.TRAINING_LINK[0]}</a></p>
    </div>
  </div>
  <div class="wrap foot-base">
    <p>© {YEAR} {e(C.BUSINESS['name'])} · <a href="/privacy/">Privacy</a> · {' · '.join(f'<a href="{u}" rel="noopener" data-track="social:{e(n)}">{e(n)}</a>' for n, u in C.SOCIALS)}</p>
  </div>
</footer>
<script src="/site.js" defer></script>
<script>window.va=window.va||function(){{(window.vaq=window.vaq||[]).push(arguments)}};</script>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/_vercel/speed-insights/script.js"></script>
</body>
</html>
"""
    out = DIST / path.strip("/") / "index.html" if path != "/" else DIST / "index.html"
    if path == "/404/":
        out = DIST / "404.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding="utf-8")
    PAGES.append(path)


PAGES: list[str] = []

# --------------------------------------------------------------------------- sections

def cta_band(text: str = "Tell us what you're dealing with. A qualified consultant will call you back.") -> str:
    return f"""<section class="band"><div class="wrap band-in">
<div><h2>Find the cause, not just the symptom.</h2><p>{e(text)}</p></div>
<div class="band-actions"><a class="btn btn-light" href="/book/">Book an inspection</a>
<a class="btn btn-ghost" href="tel:{C.BUSINESS['phone_office_e164']}">Call {C.BUSINESS['phone_office']}</a></div>
</div></section>"""


def ivi_block() -> str:
    creds = "".join(f"<li>{e(c)}</li>" for c in C.IVI["credentials"])
    return f"""<section class="sec"><div class="wrap split">
{fig('ivi-onsite')}
<div class="split-text reveal">
<p class="eyebrow">Who you're dealing with</p>
<h2>Ivi Sims, {e(C.IVI['role'].lower())}</h2>
<p>{e(C.IVI['bio'])}</p>
<ul class="ticks">{creds}</ul>
<p><a href="{C.IVI['video_url']}" rel="noopener">{e(C.IVI['video_label'])} →</a> · <a href="/about/#credentials">Full credentials</a></p>
</div></div></section>"""


def faq_block() -> tuple[str, dict]:
    items = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in C.FAQS)
    schema = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in C.FAQS]}
    return f'<section class="sec"><div class="wrap narrow"><h2>Common questions</h2><div class="faq">{items}</div></div></section>', schema


def reviews_block() -> str:
    if not C.REVIEWS:
        return ""  # real reviews only; nothing shows until Ivi supplies them
    cards = "".join(f'<blockquote class="review"><p>{e(q)}</p><footer>{e(n)}, {e(s)}</footer></blockquote>'
                    for q, n, s in C.REVIEWS)
    return f'<section class="sec alt"><div class="wrap"><h2>What clients say</h2><div class="cards">{cards}</div></div></section>'


# --------------------------------------------------------------------------- pages

def build_home() -> None:
    tiles = "".join(
        f'<a class="tile reveal" href="{pillar_for_problem(pid)}"><h3>{e(t)}</h3><p>{e(d)}</p><span>Find the cause →</span></a>'
        for pid, t, d in C.PROBLEMS)
    steps = "".join(f'<li class="reveal"><b>{i}</b><h3>{e(t)}</h3><p>{e(d)}</p></li>'
                    for i, (t, d) in enumerate(C.STEPS, 1))
    group = "".join(
        f'<a class="group-card" href="{u}" rel="noopener">{img(l, "group-logo", sizes="120px")}<b>{e(n)}</b><span>{e(d)}</span></a>'
        for n, d, u, l in C.GROUP)
    post = POSTS[0]
    faq_html, faq_schema = faq_block()
    body = f"""
<section class="hero">
  <div class="hero-media">{img('hero-home', 'cover', eager=True)}</div>
  <div class="wrap hero-in">
    <p class="eyebrow">Moisture · Mould · Condensation · Indoor air quality</p>
    <h1>We find the moisture others miss.</h1>
    <p class="hero-lede">Independent building science investigations for homes and workplaces. We find the root cause, explain it plainly and tell you what to fix first.</p>
    <div class="hero-actions"><a class="btn" href="/book/">Book an inspection</a>
    <a class="btn btn-ghost-light" href="tel:{C.BUSINESS['phone_office_e164']}">Call {C.BUSINESS['phone_office']}</a></div>
    <p class="hero-note">Led by Ivi Sims, IICRC Triple Master Restorer · Bayswater VIC · {e(C.BUSINESS['area'])}</p>
  </div>
</section>
<section class="sec"><div class="wrap">
  <p class="eyebrow">What's going on in your building?</p>
  <h2>Pick the problem. We'll find the cause.</h2>
  <div class="tiles">{tiles}</div>
</div></section>
<section class="sec alt"><div class="wrap">
  <h2>How it works</h2>
  <ol class="steps">{steps}</ol>
</div></section>
{ivi_block()}
<section class="sec alt"><div class="wrap split rev">
  {fig(post['image'])}
  <div class="split-text reveal">
    <p class="eyebrow">Case study</p>
    <h2>The floor that kept lifting</h2>
    <p>The builder was being asked to replace a timber floor. We traced the moisture to the garden irrigation outside. The owner avoided an unnecessary replacement.</p>
    <p><a class="btn btn-outline" href="/resources/{post['slug']}/">Read the case study</a> <a href="/case-studies/">See 3 more projects →</a></p>
  </div>
</div></section>
{reviews_block()}
{faq_html}
<section class="sec"><div class="wrap">
  <h2>Part of one specialist group</h2>
  <div class="group">{group}</div>
  <p class="muted">Training for professionals is run separately by <a href="{C.TRAINING_LINK[2]}" rel="noopener">BRII</a>.</p>
</div></section>
{cta_band()}
"""
    page("/", "Moisture, Mould & Indoor Air Quality Inspections Melbourne | BEWG",
         "Independent moisture, mould, condensation and indoor air quality inspections in Melbourne and across "
         "Australia. Led by IICRC Triple Master Restorer Ivi Sims. Book online.",
         body, [local_business_schema(), faq_schema])


def pillar_for_problem(pid: str) -> str:
    for p in PILLARS:
        if p["problem_id"] == pid:
            return f"/services/{p['slug']}/"
    return "/book/"


def build_services() -> None:
    cards = "".join(f"""<a class="svc-card reveal" href="/services/{p['slug']}/">{img(p['image'], 'cover', sizes='(min-width: 900px) 33vw, 100vw')}
<div><h2>{e(p['nav'])}</h2><p>{e(p['lede'])}</p><span>Read more →</span></div></a>""" for p in PILLARS)
    bc, bcs = crumbs([("Home", "/"), ("Services", "/services/")])
    body = f"""<section class="page-head"><div class="wrap">{bc}<p class="eyebrow">Services</p>
<h1>Investigations that find the cause</h1>
<p class="hero-lede">Every BEWG investigation uses building science to explain why a building is wet, mouldy or unhealthy, and what to do about it. Pick the problem you're dealing with.</p></div></section>
<section class="sec"><div class="wrap svc-grid">{cards}</div></section>{cta_band()}"""
    schema = {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": [
        {"@type": "ListItem", "position": i, "url": f"{SITE}/services/{p['slug']}/", "name": p["title"]}
        for i, p in enumerate(PILLARS, 1)]}
    page("/services/", "Inspection Services: Mould, Moisture, Condensation, Subfloor, IAQ",
         "Independent mould, moisture, condensation, subfloor, timber floor, indoor air quality and new-build "
         "inspections in Melbourne, plus continuous monitoring.", body, [schema, bcs], og_image="mould-sampling")
    for p in PILLARS:
        build_pillar(p)


def build_pillar(p: dict) -> None:
    url = f"/services/{p['slug']}/"
    bc, bcs = crumbs([("Home", "/"), ("Services", "/services/"), (p["nav"], url)])
    signs = "".join(f"<li>{e(x)}</li>" for x in p["signs"])
    causes = "".join(f"<div class='cause'><h3>{e(t)}</h3><p>{e(d)}</p></div>" for t, d in p["causes"])
    method = "".join(f"<li><b>{e(t)}.</b> {e(d)}</li>" for t, d in p["method"])
    gets = "".join(f"<li>{e(x)}</li>" for x in p["deliverables"])
    faqs = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in p["faqs"])
    related = "".join(f'<li><a href="/resources/{POST_BY_SLUG[s]["slug"]}/">{e(POST_BY_SLUG[s]["title"])}</a></li>'
                      for s in p["related_posts"] if s in POST_BY_SLUG)
    others = "".join(f'<li><a href="/services/{o["slug"]}/">{e(o["nav"])}</a></li>' for o in PILLARS if o is not p)
    book = f"/book/?service={p['service_id']}&problem={p['problem_id']}"
    body = f"""<section class="pillar-hero"><div class="wrap split">
<div class="split-text">{bc}<p class="eyebrow">{e(p['nav'])}</p><h1>{e(p['title'])}</h1>
<p class="hero-lede">{e(p['lede'])}</p>
<p><a class="btn" href="{book}" data-track="cta:book:{p['slug']}">Book this inspection</a>
<a class="btn btn-outline" href="tel:{C.BUSINESS['phone_office_e164']}" data-track="cta:call:{p['slug']}">Call {C.BUSINESS['phone_office']}</a></p></div>
{fig(p['image'], eager=True)}</div></section>
<section class="sec"><div class="wrap two-col">
<div><h2>Signs to look for</h2><ul class="ticks">{signs}</ul></div>
<div class="callout"><h2>Why our approach is different</h2><p>{e(p['why'])}</p></div></div></section>
<section class="sec alt"><div class="wrap"><h2>Common causes</h2><div class="causes">{causes}</div></div></section>
<section class="sec"><div class="wrap two-col">
<div><h2>How we investigate</h2><ol class="method">{method}</ol></div>
<div><h2>What you get</h2><ul class="ticks">{gets}</ul>
<p class="muted">Led by {e(C.IVI['name'])}, {e(C.IVI['credentials'][0])}. <a href="/about/#credentials">Credentials</a></p></div></div></section>
{cases_html() if p.get('show_cases') else ''}
<section class="sec alt"><div class="wrap narrow"><h2>Questions about {e(p['nav'].lower())}</h2><div class="faq">{faqs}</div></div></section>
<section class="sec"><div class="wrap two-col">
<div><h2>Read more</h2><ul class="links">{related}</ul></div>
<div><h2>Other investigations</h2><ul class="links">{others}</ul></div></div></section>
{cta_band()}"""
    service = {"@context": "https://schema.org", "@type": "Service", "name": p["title"], "serviceType": p["nav"],
               "description": p["description"], "url": SITE + url, "provider": {"@id": f"{SITE}/#business"},
               "areaServed": [{"@type": "City", "name": "Melbourne"}, {"@type": "State", "name": "Victoria"}]}
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faqs"]]}
    page(url, p["meta_title"], p["description"], body, [service, faq, bcs], og_image=p["image"])


def build_service_areas() -> None:
    bc, bcs = crumbs([("Home", "/"), ("Service areas", "/service-areas/")])
    rows = "".join(f"<div class='area'><h2>{e(r)}</h2><p>{e(sub)}</p></div>" for r, sub in SERVICE_AREAS)
    pills = "".join(f'<a href="/services/{p["slug"]}/">{e(p["nav"])}</a>' for p in PILLARS)
    body = f"""<section class="page-head"><div class="wrap">{bc}<p class="eyebrow">Service areas</p>
<h1>Moisture and mould investigations across Melbourne</h1>
<p class="hero-lede">Based in {C.BUSINESS['locality']} in Melbourne's east. We work across Melbourne and Victoria, and interstate by arrangement.</p></div></section>
<section class="sec"><div class="wrap areas">{rows}</div>
<div class="wrap"><p class="muted">Don't see your suburb? Call {C.BUSINESS['phone_office']} or <a href="/book/">book online</a> and tell us where the property is.</p>
<h2>What we investigate</h2><nav class="jump">{pills}</nav></div></section>{cta_band()}"""
    page("/service-areas/", "Service Areas: Melbourne & Victoria",
         "BEWG investigates moisture, mould, condensation and indoor air quality across Melbourne's eastern, "
         "inner, south-east, northern and western suburbs, regional Victoria and interstate by arrangement.",
         body, [local_business_schema(), bcs])


def cases_html() -> str:
    cards = []
    for c in C.CASES:
        facts = f'<dl class="facts"><div><dt>Type</dt><dd>{e(c["type"])}</dd></div><div><dt>When</dt><dd>{e(c["date"])}</dd></div><div><dt>Drying time</dt><dd>{e(c["duration"])}</dd></div></dl>'
        cards.append(f"""<article class="case reveal">{fig(c['image'], 'case-media', '(min-width: 900px) 33vw, 100vw')}
<div class="case-body"><h3>{e(c['title'])}</h3>{facts}
<p><b>The problem.</b> {e(c['problem'])}</p><p><b>What was done.</b> {e(c['work'])}</p><p><b>The result.</b> {e(c['result'])}</p></div></article>""")
    return f"""<section class="sec"><div class="wrap"><p class="eyebrow">Timber floor projects</p>
<h2>Restore, don't replace</h2><p class="lede">Three drying projects by Wood Floor Drying, part of our group, where the floor was saved and the business or family kept going.</p>
<div class="cases">{''.join(cards)}</div></div></section>"""


def build_case_studies() -> None:
    gallery = "".join(f'<figure class="g-item">{img(g, "cover", sizes="(min-width: 900px) 25vw, 50vw")}</figure>'
                      for g in C.GALLERY if resolve(g))
    post = POSTS[0]
    body = f"""<section class="page-head"><div class="wrap"><p class="eyebrow">Our work</p>
<h1>Real jobs. Real findings.</h1>
<p class="hero-lede">To investigate, educate and protect, because healthy buildings build healthy lives.</p></div></section>
<section class="sec"><div class="wrap split">
{fig(post['image'])}
<div class="split-text reveal"><p class="eyebrow">Case study</p><h2>{e(post['title'])}</h2><p>{e(post['summary'])}</p>
<p><a class="btn btn-outline" href="/resources/{post['slug']}/">Read the case study</a></p></div></div></section>
{cases_html()}
{f'<section class="sec alt"><div class="wrap"><h2>On site</h2><div class="gallery">{gallery}</div></div></section>' if gallery else ''}
{cta_band()}"""
    page("/case-studies/", "Our Work and Case Studies",
         "Real BEWG moisture and mould investigations: what we found, how we found it and what the owner did next.",
         body, og_image="onsite-1")


def build_resources() -> None:
    cards = "".join(f"""<a class="post-card" href="/resources/{p['slug']}/">{img(p['image'], 'cover', sizes='(min-width: 900px) 33vw, 100vw')}
<div><time datetime="{p['date']}">{dt.date.fromisoformat(p['date']).strftime('%d/%m/%Y')}</time><h2>{e(p['title'])}</h2><p>{e(p['summary'])}</p></div></a>"""
                    for p in POSTS)
    body = f"""<section class="page-head"><div class="wrap"><p class="eyebrow">Resources</p><h1>Building science, explained plainly</h1></div></section>
<section class="sec"><div class="wrap posts">{cards}</div></section>{cta_band()}"""
    page("/resources/", "Resources: Moisture, Mould and Building Science Articles",
         "Articles from Ivi Sims and the BEWG team on moisture, mould sampling, monitoring and timber floors.", body)
    for p in POSTS:
        art = {"@context": "https://schema.org", "@type": "Article", "headline": p["title"], "description": p["summary"],
               "datePublished": p["date"], "author": {"@type": "Person" if p["author"] == "Ivi Sims" else "Organization", "name": p["author"]},
               "publisher": {"@id": f"{SITE}/#business"}, "mainEntityOfPage": f"{SITE}/resources/{p['slug']}/"}
        body = f"""<article class="article"><div class="wrap narrow">
<p class="eyebrow"><a href="/resources/">Resources</a></p><h1>{e(p['title'])}</h1>
<p class="meta">{e(p['author'])} · <time datetime="{p['date']}">{dt.date.fromisoformat(p['date']).strftime('%d/%m/%Y')}</time></p>
</div>{fig(p['image'], 'wrap article-media', '100vw', True)}
<div class="wrap narrow prose">{p['html']}</div></article>{cta_band()}"""
        page(f"/resources/{p['slug']}/", p["title"], p["summary"], body, [art], og_image=p["image"])


def build_about() -> None:
    body = f"""<section class="page-head"><div class="wrap"><p class="eyebrow">About</p>
<h1>Field investigators. Educators. Problem solvers.</h1>
<p class="hero-lede">BEWG investigates moisture, mould, condensation and indoor air quality using building science, and explains what it finds in plain language.</p></div></section>
{ivi_block()}
<section class="sec alt"><div class="wrap narrow">
<h2>How we work</h2>
<p>We don't guess. We use moisture meters, thermal imaging, air sampling analysed by a NATA-accredited laboratory, airflow testing and continuous monitoring to find exactly where moisture is coming from and why.</p>
<p>Our inspections report the cause, not a sales pitch. Where drying or restoration is needed, our group company Wood Floor Drying can quote, and you are free to use any contractor you choose.</p>
<p>Every call is answered by a qualified consultant who understands your problem. No call centres.</p>
</div></section>
<section id="credentials" class="sec"><div class="wrap cred-grid">
<div><h2>IICRC certifications</h2><ul class="ticks">{''.join(f"<li>{e(x)}</li>" for x in C.IVI['certifications'])}</ul></div>
<div><h2>Standards and industry roles</h2><ul class="ticks">{''.join(f"<li>{e(x)}</li>" for x in C.IVI['standards'])}</ul></div>
<div><h2>Building science</h2><ul class="ticks">{''.join(f"<li>{e(x)}</li>" for x in C.IVI['science'])}</ul></div>
<div><h2>In the press</h2><ul class="ticks">{''.join(f'<li><a href="{u}" rel="noopener">{e(t)}</a></li>' for t, u in C.IVI['press'])}</ul>
<p><a href="{C.IVI['linkedin']}" rel="noopener">Ivi on LinkedIn →</a></p></div>
</div></section>{cta_band()}"""
    person = {"@context": "https://schema.org", "@type": "Person", "name": C.IVI["name"], "jobTitle": C.IVI["role"],
              "worksFor": {"@id": f"{SITE}/#business"}, "description": C.IVI["bio"],
              "sameAs": [C.IVI["linkedin"]],
              "hasCredential": [{"@type": "EducationalOccupationalCredential", "name": x} for x in C.IVI["certifications"]],
              "memberOf": [{"@type": "Organization", "name": "Indoor Air Quality Association"},
                           {"@type": "Organization", "name": "Standards Australia committee ME-094"}]}
    page("/about/", "About BEWG and Ivi Sims",
         "Meet Ivi Sims, IICRC Triple Master Restorer, IAQA board director and founder of Building Environmental Wellness Group, "
         "and how BEWG investigates moisture and mould.", body, [person], og_image="ivi-onsite")


def options(values: list[str]) -> str:
    return "".join(f"<option>{e(v)}</option>" for v in values)


def build_book() -> None:
    problems = "".join(
        f'<label class="check"><input type="checkbox" name="problems" value="{pid}"> {e(t)}</label>' for pid, t, _ in C.PROBLEMS)
    services = "".join(f'<option value="{s["id"]}">{e(s["title"])}</option>' for s in C.SERVICES)
    body = f"""<section class="page-head"><div class="wrap narrow"><p class="eyebrow">Book an inspection</p>
<h1>Tell us what's happening</h1>
<p class="hero-lede">It takes about two minutes. A qualified consultant will call you back, usually within one business day.</p></div></section>
<section class="sec"><div class="wrap narrow">
<form id="enquiry" class="form" action="/api/enquiry" method="post" novalidate>
  <fieldset><legend>What's the problem?</legend><div class="checks">{problems}</div>
  <label>Service you're after (optional)<select name="service"><option value="">Not sure</option>{services}</select></label>
  <label>How long has it been going on?<select name="how_long"><option value="">Choose</option>{options(C.HOW_LONG)}</select></label>
  <label>Anything else we should know?<textarea name="message" rows="4" maxlength="2000"></textarea></label></fieldset>
  <fieldset><legend>The property</legend>
  <div class="row"><label>Suburb<input name="suburb" required autocomplete="address-level2"></label>
  <label>Postcode<input name="postcode" inputmode="numeric" pattern="[0-9]{{4}}" maxlength="4" autocomplete="postal-code"></label></div>
  <label>Property type<select name="property_type"><option value="">Choose</option>{options(C.PROPERTY_TYPES)}</select></label>
  <label class="check"><input type="checkbox" name="insurance" value="yes"> This is part of an insurance claim or legal matter</label></fieldset>
  <fieldset><legend>Your details</legend>
  <div class="row"><label>First name<input name="first_name" required autocomplete="given-name"></label>
  <label>Last name<input name="last_name" autocomplete="family-name"></label></div>
  <div class="row"><label>Phone<input name="phone" type="tel" required autocomplete="tel"></label>
  <label>Email<input name="email" type="email" required autocomplete="email"></label></div>
  <label>Best time to call<select name="call_time"><option value="">Any time</option><option>Morning</option><option>Afternoon</option></select></label>
  <label>How did you hear about us?<select name="heard"><option value="">Choose</option>{options(C.HEARD)}</select></label></fieldset>
  <div class="hp" aria-hidden="true"><label>Leave this empty<input name="company_website" tabindex="-1" autocomplete="off"></label></div>
  <label class="check consent"><input type="checkbox" name="consent" value="yes" required> I agree BEWG may contact me about this enquiry. See our <a href="/privacy/">privacy notice</a>.</label>
  <button class="btn" type="submit">Send my enquiry</button>
  <p class="form-status" role="status" aria-live="polite"></p>
</form>
<p class="muted">Prefer to talk? Call <a href="tel:{C.BUSINESS['phone_office_e164']}">{C.BUSINESS['phone_office']}</a> or <a href="tel:{C.BUSINESS['phone_mobile_e164']}">{C.BUSINESS['phone_mobile']}</a>.</p>
</div></section>"""
    page("/book/", "Book a Moisture or Mould Inspection",
         "Book an independent moisture, mould, condensation or indoor air quality inspection with BEWG. Two-minute form, "
         "call-back from a qualified consultant.", body)
    thanks = f"""<section class="page-head"><div class="wrap narrow"><p class="eyebrow">Enquiry sent</p>
<h1>Thanks. We've got your enquiry.</h1>
<p class="hero-lede">A qualified consultant will call you back, usually within one business day. If it's urgent, call {C.BUSINESS['phone_office']}.</p>
<p><a class="btn btn-outline" href="/resources/">Read our resources while you wait</a></p></div></section>"""
    page("/book/thanks/", "Enquiry received", "Thanks for contacting BEWG.", thanks)


def build_contact() -> None:
    hours = "".join(f"<tr><th>{d}</th><td>{h}</td></tr>" for d, h in C.BUSINESS["hours"])
    b = C.BUSINESS
    body = f"""<section class="page-head"><div class="wrap"><p class="eyebrow">Contact</p><h1>Speak with a specialist</h1>
<p class="hero-lede">Mould, musty smells, high humidity, condensation, water damage or air quality worries: we can help investigate and manage it.</p></div></section>
<section class="sec"><div class="wrap contact-grid">
<div><h2>Call or email</h2><p class="big"><a href="tel:{b['phone_office_e164']}">{b['phone_office']}</a></p>
<p>Mobile <a href="tel:{b['phone_mobile_e164']}">{b['phone_mobile']}</a><br><a href="mailto:{b['email']}">{b['email']}</a></p>
<p><a class="btn" href="/book/">Book an inspection online</a></p></div>
<div><h2>Visit</h2><p>{b['street']}<br>{b['locality']} {b['region']} {b['postcode']}</p>
<h2>Opening hours</h2><table class="hours">{hours}</table></div></div></section>"""
    page("/contact/", "Contact BEWG", "Contact Building Environmental Wellness Group in Bayswater VIC: "
         f"{b['phone_office']}, {b['email']}. Open Monday to Saturday.", body, [local_business_schema()])


def build_privacy() -> None:
    body = f"""<section class="page-head"><div class="wrap narrow"><p class="eyebrow">Privacy</p><h1>Privacy notice</h1></div></section>
<section class="sec"><div class="wrap narrow prose">
<p>When you send an enquiry, we collect your name, contact details, property suburb and postcode, and what you tell us about the problem. We use it to respond to your enquiry and arrange an inspection.</p>
<p>Your enquiry is stored in our customer management system, operated for us by Unite-Group. Our service providers may process it outside Australia. We do not sell your information. We only send marketing if you have agreed to it.</p>
<p>We measure how the site is used with Vercel Web Analytics (no cookies, no personal data) and, if switched on, Google Analytics with IP anonymisation. These tell us which pages help people, not who you are.</p>
<p>You can ask to see, correct or delete your information at any time: email <a href="mailto:{C.BUSINESS['email']}">{C.BUSINESS['email']}</a> or call {C.BUSINESS['phone_office']}.</p>
<p class="muted">Last updated {PRIVACY_UPDATED}.</p>
</div></section>"""
    page("/privacy/", "Privacy notice", "How BEWG collects and uses the information you send us.", body)


def build_404() -> None:
    body = """<section class="page-head"><div class="wrap narrow"><h1>That page has moved</h1>
<p class="hero-lede">Try the <a href="/">home page</a>, our <a href="/services/">services</a> or <a href="/book/">book an inspection</a>.</p></div></section>"""
    page("/404/", "Page not found", "This page could not be found.", body)


def build_meta_files() -> None:
    urls = [p for p in PAGES if p not in ("/404/", "/book/thanks/")]
    today = dt.date.today().isoformat()
    sm = "".join(f"<url><loc>{SITE}{p}</loc><lastmod>{today}</lastmod></url>" for p in urls)
    (DIST / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sm}</urlset>',
        encoding="utf-8")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    services = "\n".join(f"- [{p['title']}]({SITE}/services/{p['slug']}/): {p['lede']}" for p in PILLARS)
    (DIST / "llms.txt").write_text(
        f"# {C.BUSINESS['name']} (BEWG)\n\n> Independent moisture, mould, condensation and indoor air quality "
        f"investigations. Based in {C.BUSINESS['locality']} {C.BUSINESS['region']}; {C.BUSINESS['area']}. "
        f"Led by {C.IVI['name']}, {', '.join(C.IVI['credentials'][:2])}.\n\n## Services\n{services}\n\n"
        f"## Contact\n- Phone: {C.BUSINESS['phone_office']}\n- Email: {C.BUSINESS['email']}\n- Book: {SITE}/book/\n",
        encoding="utf-8")


def main() -> int:
    offline = "--offline" in sys.argv
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    print("media:")
    missing = fetch_media(offline)
    (DIST / "media").mkdir()
    for f in CACHE.glob("*.webp"):
        shutil.copy2(f, DIST / "media" / f.name)
    for f in STATIC.iterdir():
        shutil.copy2(f, DIST / f.name)
    build_home(); build_services(); build_case_studies(); build_resources(); build_about()
    build_book(); build_contact(); build_privacy(); build_service_areas(); build_404(); build_meta_files()
    print(f"built {len(PAGES)} pages into dist/; media present {len(M.MEDIA) - len(missing)}/{len(M.MEDIA)}")
    if missing:
        print("  missing media (left out of pages, never hot-linked): " + ", ".join(missing))
        if os.environ.get("VERCEL") and len(missing) > len(M.MEDIA) // 2:
            print("FAIL: most real photos are missing on a Vercel build; commit media-cache/ or fix the source")
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
