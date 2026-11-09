"""All words on the BEWG site live here. Edit this file to change copy; build.py turns it into pages.

Facts come from the live bewg.au site (captured 09/11/2026) and from brii.au for Ivi's credentials.
Nothing here is invented: no testimonials, no statistics. Add real Google reviews to REVIEWS when Ivi has them.
"""

BUSINESS = {
    "name": "Building Environmental Wellness Group",
    "short": "BEWG",
    "url": "https://www.bewg.au",
    "email": "consult@bewg.au",
    "phone_office": "03 7075 1932",
    "phone_office_e164": "+61370751932",
    "phone_mobile": "0455 972 408",
    "phone_mobile_e164": "+61455972408",
    "street": "23 Corporate Boulevard",
    "locality": "Bayswater",
    "region": "VIC",
    "postcode": "3153",
    "hours": [("Monday to Friday", "8:30am to 5:00pm"), ("Saturday", "9:00am to 12:00pm"), ("Sunday", "Closed")],
    "hours_schema": ["Mo-Fr 08:30-17:00", "Sa 09:00-12:00"],
    "facebook": "https://www.facebook.com/bewgroup1/",
    "facebook_md": "https://www.facebook.com/Moisturedetective/",
    "area": "Melbourne and across Australia",
}

IVI = {
    "name": "Ivi Sims",
    "role": "Founder and principal investigator",
    "linkedin": "https://www.linkedin.com/in/ivi-sims-4940b833/",
    # Short list shown on home and about. Source: brii.au/trainers/ivi-sims (captured 09/11/2026) and
    # R&R Magazine TradeTalks Ep 25 (02/01/2025).
    "credentials": [
        "IICRC Triple Master Restorer",
        "IICRC and Standards Australia committee member",
        "Board director, Indoor Air Quality Association (IAQA)",
        "More than 25 years in restoration, 15+ in timber floor and structural drying",
    ],
    "bio": (
        "Ivi started in cleaning, moved into restoration and now works on the building science behind moisture, "
        "mould and indoor air. She has dried timber floors, managed major water losses and led mould remediation, "
        "and she helps write the standards the industry works to. She champions restoring over replacing: find "
        "the cause, dry it properly, and save what can be saved."
    ),
    "certifications": [
        "Water Loss Specialist (WLS)", "Contents Loss Specialist (CLS)", "Certified Mold Professional (CMP)",
        "Master Fire & Smoke Restorer (MSR)", "Master Water Restorer (MWR)", "Master Textile Cleaner (MTC)",
    ],
    "standards": [
        "IICRC standards committees: BSR/IICRC S230 (inspection of flooring, subfloors and substrates) and ANSI/IICRC S220 (inspection of hard surface floor coverings)",
        "IICRC field guides: health and safety for cleaning and restoration, and Building Moisture Inspection",
        "Standards Australia committee ME-094 (water damage and mould remediation)",
        "Representative for the Australasian Timber Flooring Association (ATFA)",
        "Board of Directors, Indoor Air Quality Association since 2024 (member since 2008); founding member of the Australian IAQA chapter",
    ],
    "science": [
        "Building physics and psychrometrics training through AIRAH",
        "Studied building science under Dr Joseph Lstiburek (Building Science Corporation, USA)",
        "Hygrothermal modelling with WUFI for walls, roofs and timber floors across Australian climate zones",
        "Works with NCC 2022 Section J condensation provisions, AS 1884, AS 1668 and AS 3959",
    ],
    "press": [
        ("R&R Magazine TradeTalks, Episode 25: From Foundations to Innovations (January 2025)",
         "https://www.randrmagonline.com/articles/91117-from-foundations-to-innovations"),
        ("R&R Magazine, by Ivi Sims: Responding to Melbourne's Holiday Flash Floods (March 2017)",
         "https://www.randrmagonline.com/articles/87283-responding-to-melbournes-holiday-flash-floods"),
    ],
    "video_url": "https://www.randrmagonline.com/articles/91117-from-foundations-to-innovations",
    "video_label": "Watch Ivi on R&R Magazine TradeTalks",
}

# Real projects (source: woodfloordrying.com.au project pages, captured 09/11/2026). Facts only, no embellishment.
CASES = [
    {
        "title": "Three basketball courts kept open while 1,800 m² of timber dried",
        "type": "Commercial", "date": "February 2014", "duration": "28 days",
        "problem": "Water seeped under the basketball courts in wet weather, damaging 1,800 m² of timber.",
        "work": "The courts stayed open every day. A containment area kept players safe, and a generator ran the extraction equipment 24 hours a day.",
        "result": "Cupping reduced within 7 days of fixing the water entry. Four months later the floor was solid with no cupping, so no sand-back was needed, and the business never closed.",
        "image": "case-basketball",
    },
    {
        "title": "Messmate floor peaked 8 cm, training centre stayed open",
        "type": "Commercial", "date": "May 2016", "duration": "17 days",
        "problem": "A leaking door canopy and window trapped moisture under a messmate floor, which peaked up to 8 cm and became a trip hazard.",
        "work": "The centre had to stay open 16 hours a day, so the drying set-up was planned with the business to keep safety risks down while air was moved through the floor.",
        "result": "The floor returned to normal within 2 weeks. No sanding, no replacement, no disruption.",
        "image": "case-messmate",
    },
    {
        "title": "Cupped blackbutt kitchen floor flattened with no sanding",
        "type": "Residential", "date": "July 2015", "duration": "15 days",
        "problem": "Water damage in the kitchen and living room. Blackbutt boards on 3 cm battens over concrete: the battens wicked moisture from the slab and the boards cupped badly.",
        "work": "We looked at the timber species to work out how much energy it would take to draw the moisture out, then dried with mats and blowers.",
        "result": "Cupping came back down in 15 days with no sanding required.",
        "image": "case-blackbutt",
    },
]

# Each problem tile links to a service section and pre-ticks that problem on the booking form.
PROBLEMS = [
    ("mould", "Mould you can see or smell", "Spots on ceilings, a musty room, mould that keeps coming back."),
    ("condensation", "Condensation and damp", "Wet windows, damp walls, rooms that never feel dry."),
    ("floor", "Timber floor lifting or cupping", "Boards rising, gaps opening, a floor that moves with the seasons."),
    ("subfloor", "Subfloor and under-house moisture", "Damp soil, poor airflow, rot or smells from under the house."),
    ("leak", "A leak you can't find", "Stains, wet patches or high readings with no obvious source."),
    ("iaq", "Air quality worries", "Symptoms at home or work and you want to know what is in the air."),
]

SERVICES = [
    {
        "id": "moisture",
        "title": "Moisture inspections",
        "lede": "Find where water is getting in and why the building is not drying.",
        "body": [
            "We map moisture through walls, floors, ceilings and slabs using moisture meters, thermal imaging and "
            "building science principles. The goal is the source, not just the wet patch.",
            "You get a written report with the readings, photos, the likely cause and what to fix first.",
        ],
        "image": "measuring-condensation",
    },
    {
        "id": "mould",
        "title": "Mould inspections and air sampling",
        "lede": "Understand the mould, the moisture behind it and what it means for the people inside.",
        "body": [
            "Mould is a symptom. We look at why moisture is building up, then sample where it adds evidence. Air "
            "samples are analysed by a NATA-accredited laboratory and we interpret the results for you.",
            "Useful after water damage, for visible growth, for insurance or legal matters and to confirm a clean-up "
            "worked.",
        ],
        "image": "mould-sampling",
    },
    {
        "id": "condensation",
        "title": "Condensation and ventilation",
        "lede": "Work out why surfaces are reaching dew point and how to stop it.",
        "body": [
            "We measure temperature, humidity and dew point, check ventilation and airflow (including vane hood "
            "airflow tests) and look for thermal bridging and air leakage.",
        ],
        "image": "vane-hood",
    },
    {
        "id": "subfloor",
        "title": "Subfloor investigations",
        "lede": "What is under your house could be damaging it now.",
        "body": [
            "We check subfloor moisture, ground conditions, drainage and cross-ventilation, and recommend practical "
            "fixes in the right order.",
        ],
        "image": "subfloor",
    },
    {
        "id": "floor",
        "title": "Timber floor and concrete moisture",
        "lede": "Before you replace a floor, find out why it moved.",
        "body": [
            "Timber floors respond to moisture. We test the timber, the subfloor and the slab (including in-situ "
            "concrete relative humidity testing) to find the cause. Often the floor is fine and the water is the "
            "problem.",
        ],
        "image": "concrete",
    },
    {
        "id": "monitoring",
        "title": "Continuous monitoring",
        "lede": "One reading is a snapshot. Monitoring shows what the building does over days and weeks.",
        "body": [
            "We leave loggers in place to track humidity, temperature, dew point and moisture over time. Patterns, "
            "like humidity climbing every night, reveal causes a single visit can miss.",
        ],
        "image": "monitoring",
    },
    {
        "id": "new-build",
        "title": "New-build moisture inspections",
        "lede": "Catch moisture pathways before handover, not after.",
        "body": [
            "Thermal imaging and moisture mapping on new homes and fit-outs to find hidden moisture before floors, "
            "linings and finishes go down.",
        ],
        "image": "ivi-onsite",
    },
]

STEPS = [
    ("Tell us what's happening", "Book online or call. A qualified consultant answers, not a call centre."),
    ("We investigate on site", "Readings, thermal imaging, sampling and monitoring where it adds evidence."),
    ("You get the cause and the fix", "A clear written report with what to do first, and why."),
]

FAQS = [
    (
        "How much does an inspection cost?",
        "It depends on the building and the problem. Book online or call 03 7075 1932 and we will give you a "
        "price before we visit.",
    ),
    (
        "Do you just take a mould sample?",
        "No. A single sample shows one moment in time. We find the moisture behind the mould, then sample where it "
        "adds evidence.",
    ),
    (
        "Are your inspections independent?",
        "Yes. We investigate and report. We do not need to sell you the repair, so the advice is about the cause.",
    ),
    (
        "Where do you work?",
        "We are based in Bayswater, Victoria, and work across Melbourne and Australia. Ask us about your location.",
    ),
    (
        "Can you help with an insurance or legal matter?",
        "Yes. We provide evidence-based reports with readings, photos and laboratory results where needed.",
    ),
]

GROUP = [
    ("Moisture Detective", "Specialist hidden-moisture detection", "https://moisturedetective.com.au/", "logo-moisture-detective"),
    ("Wood Floor Drying", "Timber floor moisture and drying", "https://woodfloordrying.com.au/", "logo-wood-floor-drying"),
]
TRAINING_LINK = ("BRII", "Training for inspection, IAQ and restoration professionals", "https://brii.au/")

GALLERY = ["ivi-onsite", "mould-drywall", "onsite-1", "onsite-2", "mould-swab", "tech", "clt-timber", "onsite-3"]

# Real customer reviews only. Each entry: (quote, name, suburb). Leave empty until Ivi supplies them.
REVIEWS: list = []

CASE_STUDY = {
    "slug": "the-floor-that-kept-lifting",
    "title": "The floor that kept lifting, and the garden that was to blame",
}

PROPERTY_TYPES = ["House", "Apartment or unit", "Townhouse", "Commercial building", "New build", "Other"]
HOW_LONG = ["Less than a month", "1 to 6 months", "More than 6 months", "Not sure"]
HEARD = ["Google", "Referral or word of mouth", "Facebook or LinkedIn", "Builder or insurer", "Other"]

# Social profiles shown in the footer and as schema.org sameAs. Only real, public URLs (verified 09/11/2026).
# Add Instagram/YouTube/Google Business Profile URLs here when Ivi has them.
SOCIALS = [
    ("Facebook", "https://www.facebook.com/bewgroup1/"),
    ("Moisture Detective on Facebook", "https://www.facebook.com/Moisturedetective/"),
    ("Ivi on LinkedIn", "https://www.linkedin.com/in/ivi-sims-4940b833/"),
]
