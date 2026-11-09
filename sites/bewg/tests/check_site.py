#!/usr/bin/env python3
"""Verifier for the built site (run after build.py). Exit code 0 = all checks pass; 1 = at least one failed.

Checks every page in dist/ for: one <h1>, a <title> without the old duplicated text, a meta description,
a canonical URL, internal links that resolve, no hot-linked images, and none of the old site's defects.
"""
import re
import sys
from pathlib import Path

DIST = Path(__file__).resolve().parent.parent / "dist"
BANNED = [
    "food businesses", "Pomodoro", "Lena", "local farmer", "only place in Australia", "My post content",
    "linkedin.com/company/18909778/admin", "BEWG Australia | Moisture", "zyrosite.com", "unsplash.com",
]
REQUIRED_PAGES = ["index.html", "services/index.html", "case-studies/index.html", "resources/index.html",
                  "about/index.html", "book/index.html", "book/thanks/index.html", "contact/index.html",
                  "privacy/index.html", "404.html", "sitemap.xml", "robots.txt", "llms.txt", "service-areas/index.html"]
sys.path.insert(0, str(DIST.parent))
from pillars import PILLARS  # noqa: E402
REQUIRED_PAGES += [f"services/{p['slug']}/index.html" for p in PILLARS]

fails = []
for rel in REQUIRED_PAGES:
    if not (DIST / rel).exists():
        fails.append(f"missing {rel}")

pages = sorted(DIST.rglob("*.html"))
for p in pages:
    rel = p.relative_to(DIST).as_posix()
    t = p.read_text(encoding="utf-8")
    if t.count("<h1") != 1:
        fails.append(f"{rel}: expected 1 <h1>, found {t.count('<h1')}")
    if not re.search(r"<title>[^<]{10,}</title>", t):
        fails.append(f"{rel}: missing title")
    if '<meta name="description" content="' not in t:
        fails.append(f"{rel}: missing description")
    if 'rel="canonical"' not in t:
        fails.append(f"{rel}: missing canonical")
    for b in BANNED:
        if b.lower() in t.lower():
            fails.append(f"{rel}: contains banned text '{b}'")
    for src in re.findall(r'<img[^>]+src="([^"]+)"', t):
        if src.startswith("http"):
            fails.append(f"{rel}: hot-linked image {src}")
        elif not (DIST / src.lstrip("/")).exists():
            fails.append(f"{rel}: image not found {src}")
    for href in re.findall(r'href="(/[^"#?]*)', t):
        target = DIST / href.lstrip("/")
        if href.endswith((".css", ".js", ".svg", ".xml", ".txt", ".webp")):
            ok = target.exists()
        else:
            ok = (target / "index.html").exists() or target.with_suffix(".html").exists() or href == "/"
        if not ok:
            fails.append(f"{rel}: broken link {href}")

import json  # noqa: E402
for p in pages:
    rel = p.relative_to(DIST).as_posix()
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', p.read_text(encoding="utf-8"), re.S):
        try:
            json.loads(block)
        except ValueError:
            fails.append(f"{rel}: invalid JSON-LD")
for pl in PILLARS:
    f = DIST / f"services/{pl['slug']}/index.html"
    if not f.exists():
        continue
    t = f.read_text(encoding="utf-8")
    for need in ['"@type": "Service"', '"@type": "FAQPage"', '"@type": "BreadcrumbList"', f"/book/?service={pl['service_id']}"]:
        if need not in t:
            fails.append(f"services/{pl['slug']}: missing {need}")
    words = len(re.sub(r"<[^>]+>", " ", t.split("<main", 1)[1].split("</main>", 1)[0]).split())
    if words < 450:
        fails.append(f"services/{pl['slug']}: thin page ({words} words < 450)")
sm = (DIST / "sitemap.xml").read_text(encoding="utf-8") if (DIST / "sitemap.xml").exists() else ""
for pl in PILLARS:
    if f"/services/{pl['slug']}/" not in sm:
        fails.append(f"sitemap missing {pl['slug']}")

book = (DIST / "book/index.html").read_text(encoding="utf-8") if (DIST / "book/index.html").exists() else ""
for field in ["first_name", "email", "phone", "suburb", "consent", "company_website", 'action="/api/enquiry"']:
    if field not in book:
        fails.append(f"book: form field/attr missing: {field}")

import os  # noqa: E402
if os.environ.get("REQUIRE_MEDIA"):
    import media as M  # noqa: E402
    gone = [m for m in M.MEDIA if not (DIST / "media" / f"{m}.webp").exists()]
    if gone:
        fails.append(f"missing {len(gone)}/{len(M.MEDIA)} real photos: {', '.join(gone)}")

for f in (DIST / "media").glob("*") if (DIST / "media").exists() else []:
    if f.stat().st_size > 450 * 1024:
        fails.append(f"media over 450 KB budget: {f.name} ({f.stat().st_size // 1024} KB)")

print(f"checked {len(pages)} HTML pages, {len(REQUIRED_PAGES)} required files")
if fails:
    print(f"FAIL {len(fails)}:")
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("PASS: all checks")
