"""Every image on the site, where it came from, and how to fetch it.

Rule (Premium Visual & Motion Standard): real media only, self-hosted, never hot-linked.
These are Ivi's own photos from the old Hostinger site. build.py downloads each one once, as WebP,
into media-cache/ (commit that folder after the first successful fetch), then copies it into dist/media/.
New images come from Phill's ChatGPT Pro account: see IMAGE-PROMPTS.md, then drop the file in media-cache/
using the id below as the file name (for example media-cache/hero-home.webp) and set source to "generated".
"""

ZYRO = "https://assets.zyrosite.com/cdn-cgi/image/format=webp,width={w},quality=78/UBoyo99OxXdo06Vh/{file}"

# id: (original file on the old site, width to fetch, source, credit, alt text)
MEDIA = {
    "logo-bewg": ("bewg---logo-3ObbaCdFxwTHsHgg.png", 480, "client", "BEWG", "Building Environmental Wellness Group logo"),
    "ivi-onsite": ("ivi-photot-64ik2QzxdrCZaiM7.jpeg", 1400, "client", "BEWG", "Ivi Sims inspecting a building on site"),
    "mould-drywall": ("mould_drywall-UvTuLCUYNODUJLMt.jpg", 1200, "client", "BEWG", "Mould growth on plasterboard found during an inspection"),
    "onsite-1": ("img-20241212-wa0009-cSunk3gwG1g8Qdh4.jpg", 1200, "client", "BEWG", "Investigation under a house"),
    "onsite-2": ("577029359_122178546482452784_5690373285726552434_n-C9NqIFfKImVJP8Od.jpg", 1200, "client", "BEWG", "Moisture testing on a concrete slab"),
    "onsite-3": ("img_4562-NunnXV6PmPIHRUIf.JPG", 1200, "client", "BEWG", "BEWG investigator at work on site"),
    "mould-sampling": ("mould_sampling-pU3bj8Aozhl9Ll3V.jpg", 1200, "client", "BEWG", "Air sampling for mould spores indoors"),
    "mould-swab": ("mould_swab_testing-NOitmNXE6H4mBy9W.jpg", 1200, "client", "BEWG", "Surface swab test for mould"),
    "measuring-condensation": ("measuring-condensation-in-buildings-lJUSo8ySJq4KtTqB.webp", 1200, "client", "BEWG", "Measuring condensation risk on a wall surface"),
    "tech": ("tech-d20QUjKq50hF8SNx.jpg", 1200, "client", "BEWG", "Moisture monitoring equipment in use"),
    "vane-hood": ("vne-test-H3g63KhMBsuZYmGj.jpg", 1200, "client", "BEWG", "Vane hood airflow test on a ventilation outlet"),
    "clt-timber": ("clt-timber-zuBok24dr7MVfqrr.jpg", 1200, "client", "BEWG", "Moisture testing cross-laminated timber"),
    "logo-moisture-detective": ("logo-with-r-ChJcGeOsfROCKITq.png", 480, "client", "Moisture Detective", "Moisture Detective logo"),
    "logo-wood-floor-drying": ("logo-TSsowZMhhu2qJE9o.jpg", 480, "client", "Wood Floor Drying", "Wood Floor Drying logo"),
    "post-floor": ("chatgpt-image-may-17-2026-09_58_23-pm-smGEF0zMthLta7R4.png", 1400, "generated", "BEWG (ChatGPT)", "Diagram of garden irrigation water reaching a timber floor"),
    "post-monitoring": ("a22fa707-8a6f-4186-ba48-5186a5b13ec0-BJPTKEBANIrlWTcp.png", 1400, "generated", "BEWG (ChatGPT)", "Environmental monitoring logger in a room"),
    "post-mould": ("f2448aa8-fcd8-4d7d-a661-1600c14d9566-75PFZYPrgBEWlVXR.png", 1400, "generated", "BEWG (ChatGPT)", "Mould sampling in a building"),
}

# Slots waiting for new ChatGPT Pro images (see IMAGE-PROMPTS.md). Until the file exists in media-cache/,
# the page falls back to the real photo named here, so nothing ever renders as a placeholder.
SLOTS = {
    "hero-home": ("ivi-onsite", "Investigator using a thermal camera on a damp ceiling in a Melbourne home"),
    "subfloor": ("onsite-1", "Subfloor investigation under a house"),
    "concrete": ("onsite-2", "In-situ relative humidity testing on a concrete slab"),
    "monitoring": ("tech", "Data logger tracking humidity and temperature in a room"),
}
