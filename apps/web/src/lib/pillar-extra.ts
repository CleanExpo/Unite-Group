import type { Pillar, PillarFaq } from '@/lib/public-site'

export type PillarStep = { title: string; body: string }
export type PillarLink = { href: string; label: string; desc: string }
export type PillarRichCard = { title: string; body: string }
export type PillarDeliverable = { title: string; body: string }
export type PillarCheckpoint = { label: string; detail: string }
export type PillarProblem = { title: string; body: string; signal: string }
export type PillarCapability = { body: string; includes: readonly string[] }

export type PillarExtra = {
  shipNote: string
  scope: string
  scopeDeep: string
  scopePillars: readonly PillarRichCard[]
  capabilityDetail: readonly PillarCapability[]
  searchExamples: readonly string[]
  channels: readonly PillarRichCard[]
  fitCriteria: readonly string[]
  problemsRich: readonly PillarProblem[]
  processLead: string
  howItWorks: readonly PillarStep[]
  beforeAfter: { withoutLabel: string; withLabel: string; without: readonly string[]; with: readonly string[] }
  deliverablesRich: readonly PillarDeliverable[]
  outcomesRich: readonly PillarRichCard[]
  checkpointsRich: readonly PillarCheckpoint[]
  measures: readonly string[]
  extraFaq: readonly PillarFaq[]
  related: readonly PillarLink[]
}

export const PILLAR_EXTRA: Record<Pillar['slug'], PillarExtra> = {
  visibility: {
    shipNote:
      'Visibility is on the roadmap. You can still improve findability today with a living card, accurate pricing pages, and a clean contact path.',
    scope:
      'Visibility is the findability layer: one accurate story about your business wherever someone searches — organic, maps, directories, and generative answers.',
    scopeDeep:
      'Most SMBs do not need another SEO dashboard. They need mismatched phone numbers fixed, categories chosen correctly, and copy assistants can quote without inventing a shopfront you closed years ago.',
    scopePillars: [
      {
        title: 'Google & maps',
        body: 'Business Profile, local pack, and site pages that agree on name, phone, hours, and service area.',
      },
      {
        title: 'Directories & citations',
        body: 'Top AU/NZ listings checked for duplicates, stale addresses, and wrong categories.',
      },
      {
        title: 'AI & assistants',
        body: 'What ChatGPT-style answers say about you today — and which sources they are copying.',
      },
    ],
    capabilityDetail: [
      {
        body: 'We snapshot index status, profile completeness, and the ten listings that show up most for your name.',
        includes: ['Screenshot set with URLs', 'Conflicts flagged in red', 'Mobile speed on money pages'],
      },
      {
        body: 'Structured data and on-page copy only where it matches what you actually sell and where you operate.',
        includes: ['Schema that reflects reality', 'No suburb stuffing', 'Plain-language page titles'],
      },
      {
        body: 'A single NAP source your team, agency, and suppliers can all copy from.',
        includes: ['Approved blurbs', 'Category list', 'Service area rules'],
      },
    ],
    searchExamples: [
      'plumber south brisbane',
      'who does video business cards in sydney',
      'accountant near me open saturday',
      'best cafe in newtown reviews',
      'is [your business] legit',
    ],
    channels: [
      { title: 'Organic search', body: 'Desktop and mobile results for branded and category queries.' },
      { title: 'Maps', body: 'Profile views, calls, and direction requests from Google Maps.' },
      { title: 'Assistants', body: 'Answers that cite directories, your site, or neither.' },
      { title: 'Referral follow-up', body: 'What someone sees when they search you five minutes after a meeting.' },
    ],
    fitCriteria: [
      'You win work on reputation but look invisible online.',
      'You are opening a second location or rebranding.',
      'You paid for ads and the landing page does not match the ad.',
    ],
    problemsRich: [
      {
        title: 'Mobile experience fails the referral test',
        body: 'Someone taps your link from a text message and gets a slow, broken layout or a PDF.',
        signal: 'Bounce within seconds on phone traffic',
      },
      {
        title: 'Facts disagree across the web',
        body: 'Your website shows one phone number, Google another, and a directory still lists your old name.',
        signal: 'Customers call the wrong line or show up on a closed address',
      },
      {
        title: 'Assistants summarise you from junk',
        body: 'AI tools pull from outdated aggregators or a competitor with a similar name.',
        signal: 'Wrong hours, wrong services, wrong suburb',
      },
    ],
    processLead: 'A visibility engagement is written work first — evidence, fixes, and handover — not a slide deck of keyword counts.',
    howItWorks: [
      {
        title: 'Baseline capture',
        body: 'We record how you appear today across search, maps, directories, and assistant answers for your category.',
      },
      {
        title: 'Gap list',
        body: 'You receive a prioritised list ranked by enquiry impact: wrong numbers, thin pages, slow renders, bad citations.',
      },
      {
        title: 'Fix and align',
        body: 'We correct facts at the source and align copy across site, profile, and listings you control.',
      },
      {
        title: 'Handover',
        body: 'You keep one reference document so the next card, page, or staff member does not invent new facts.',
      },
    ],
    beforeAfter: {
      withoutLabel: 'Without the layer',
      withLabel: 'With the layer',
      without: ['Five different phones on page one of Google', 'Generic homepage title', 'No idea what AI says about you'],
      with: ['One NAP source the team trusts', 'Local titles that match services', 'Assistant correction playbook'],
    },
    deliverablesRich: [
      { title: 'Visibility audit PDF', body: 'Screenshots, URLs, and notes readable by a non-technical owner.' },
      { title: 'NAP & category checklist', body: 'Staff-ready list for onboarding and supplier briefs.' },
      { title: 'Schema recommendations', body: 'Only on pages that exist — no fake locations.' },
      { title: 'Assistant prompt sheet', body: 'What to publish or dispute when AI gets you wrong.' },
      { title: '90-day fix order', body: 'Ranked by likely enquiry impact, not vanity scores.' },
      { title: 'Reuse pack', body: 'Approved blurbs for cards, email, and social bios.' },
    ],
    outcomesRich: [
      {
        title: 'Confidence in the facts',
        body: 'You know what the internet says before a customer does.',
      },
      {
        title: 'Faster fixes',
        body: 'A short list instead of forty open SEO tabs.',
      },
      {
        title: 'Reusable copy',
        body: 'One tone for site, listings, and living cards.',
      },
    ],
    checkpointsRich: [
      { label: 'Mobile speed on key URLs', detail: 'Measured on throttled 4G against agreed thresholds.' },
      { label: 'Profile vs website', detail: 'Phone, hours, and name match on Google and your site.' },
      { label: 'Directory conflicts', detail: 'No conflicting legal name in top ten hits.' },
      { label: 'Page titles', detail: 'Unique titles with locality and service cues.' },
    ],
    measures: [
      'Indexed pages vs submitted sitemap',
      'Profile completeness score where available',
      'CWV field or lab data on home and contact',
      'Branded search result ownership (site + profile)',
      'Assistant answer snapshots dated in the audit',
    ],
    extraFaq: [
      {
        q: 'Do you work outside Australia and New Zealand?',
        a: 'Our public work targets AU/NZ SMBs. Ask us if you operate elsewhere — we will say plainly if we can help.',
      },
      {
        q: 'Will you write blog posts every week?',
        a: 'Not by default. We prioritise accuracy and core pages before volume content.',
      },
    ],
    related: [
      { href: '/solutions/experience', label: 'Experience', desc: 'Pages and cards people actually open on a phone.' },
      { href: '/solutions/conversion', label: 'Conversion', desc: 'Living cards with QR and one clear enquire path.' },
      { href: '/pricing', label: 'Pricing', desc: 'Starter plan and add-ons in AUD with GST called out.' },
      { href: '/#contact', label: 'Contact', desc: 'Ask us to review what shows up for your business name today.' },
    ],
  },
  experience: {
    shipNote:
      'Living business cards are live in the showroom. Broader Experience tooling for multi-page sites is still coming — ask on pricing or contact.',
    scope:
      'Experience is how your business feels in the first scroll: type, rhythm, film, and load time on the device your customer already holds.',
    scopeDeep:
      'Referrals arrive on phones. If the first screen looks like a template, borrowed stock, or a desktop site shrunk down, you lose trust before you speak.',
    scopePillars: [
      { title: 'Film & motion', body: 'Living cards and hero media that load lazily and respect reduced motion.' },
      { title: 'Type & rhythm', body: 'Readable scale, contrast, and spacing on 390px widths first.' },
      { title: 'Owned assets', body: 'Self-hosted media with credits — no mystery placeholders.' },
    ],
    capabilityDetail: [
      {
        body: 'Showroom editions and custom films end on your brand, not ours — with a private proof step.',
        includes: ['Edition or custom path', 'Your logo on last frame', 'QR + vCard on cards'],
      },
      {
        body: 'Layout built from real content widths, not lorem ipsum stand-ins.',
        includes: ['Tap targets ≥ 44px', 'Focus order tested', 'Reduced-motion fallbacks'],
      },
      {
        body: 'Media manifest discipline: every file listed with source, credit, and alt.',
        includes: ['Budget caps honoured', 'AVIF/WebP preference', 'No hot-linked stock'],
      },
    ],
    searchExamples: [
      'video business card australia',
      'digital business card with qr code',
      'mobile first website for tradie',
      'premium email signature design',
      'business card that plays video',
    ],
    channels: [
      { title: 'Text & DM', body: 'Link someone opens from iMessage, WhatsApp, or Messenger.' },
      { title: 'QR & print', body: 'Cards, flyers, and signage that resolve to film-first URLs.' },
      { title: 'Email', body: 'Signatures and footers that match the site and card.' },
      { title: 'Social bio', body: 'One owned link instead of link-in-bio clutter.' },
    ],
    fitCriteria: [
      'You are embarrassed to send your current link after a great meeting.',
      'You invest in appearance on-site but online looks generic.',
      'You want one visual language across card, site, and email.',
    ],
    problemsRich: [
      {
        title: 'Desktop-first regret',
        body: 'The site was signed off on a laptop; customers only ever see it on a phone.',
        signal: 'Horizontal scroll, tiny type, broken hero',
      },
      {
        title: 'Borrowed visuals',
        body: 'Stock people and clip-art cards signal “we did not invest here”.',
        signal: 'Low trust after warm referrals',
      },
      {
        title: 'Heavy pages',
        body: 'Unoptimised video and images destroy first impression speed.',
        signal: 'Abandon before they read your name',
      },
    ],
    processLead: 'Experience work starts with the moment you want someone to feel — then we pick media and type to match, never the reverse.',
    howItWorks: [
      { title: 'Brief the moment', body: 'Trade, tone, and the one action visible above the fold.' },
      { title: 'Media plan', body: 'Client, stock, or approved generated assets — listed and credited.' },
      { title: 'Build phone-first', body: 'Narrow screen layout, then scale up for tablet and desktop.' },
      { title: 'Proof before public', body: 'Private review link; nothing ships without your yes.' },
    ],
    beforeAfter: {
      withoutLabel: 'Common starting point',
      withLabel: 'Experience standard',
      without: ['Generic template and stock heroes', 'PDF card attachments', 'Inconsistent fonts'],
      with: ['Film or photo you would text a client', 'One type system', 'Manifested, credited media'],
    },
    deliverablesRich: [
      { title: 'Layout & type spec', body: 'Sizes, colours, and components your team can reuse.' },
      { title: 'Living card or page build', body: 'Hosted, proofed, and linked from QR where applicable.' },
      { title: 'Performance notes', body: 'What we measured and what to watch after launch.' },
      { title: 'Accessibility pass', body: 'Contrast, focus, and motion preferences documented.' },
      { title: 'Signature alignment', body: 'Optional match to email signatures on pricing.' },
      { title: 'Showroom path', body: 'Clear upgrade from edition card to custom film if needed.' },
    ],
    outcomesRich: [
      { title: 'Proud to share', body: 'A link you send in the car park after a meeting.' },
      { title: 'Fast enough', body: 'First paint that does not waste the referral.' },
      { title: 'Extendable', body: 'Same look on card, site, and inbox.' },
    ],
    checkpointsRich: [
      { label: 'LCP on 4G throttle', detail: 'Hero within agreed budget on real devices.' },
      { label: '390px readability', detail: 'Body text legible without zoom.' },
      { label: 'Media manifest', detail: 'Every asset has alt, credit, and source.' },
      { label: 'Hosting', detail: 'Self-hosted files only on customer URLs.' },
    ],
    measures: [
      'LCP / CLS on primary templates',
      'Tap target audit on forms and CTAs',
      'Media weight per page vs budget',
      'Proof approval timestamp before go-live',
    ],
    extraFaq: [
      {
        q: 'Can you match my existing brand guidelines?',
        a: 'Yes — send your palette, logo files, and any mandatory type. We flag conflicts early.',
      },
      {
        q: 'Do you redesign logos?',
        a: 'No. We work with what you have unless you commission separate brand work.',
      },
    ],
    related: [
      { href: '/cards', label: 'Living cards showroom', desc: 'Nine openers — yours ends on your logo.' },
      { href: '/cards/order', label: 'Order a card', desc: 'Pick an edition and send your details.' },
      { href: '/signatures', label: 'Email signatures', desc: 'Match the site and card in every reply.' },
      { href: '/solutions/conversion', label: 'Conversion', desc: 'Turn that first impression into an enquiry.' },
    ],
  },
  conversion: {
    shipNote: 'Living business cards are live today. Wider automation and inbox tooling ships with the rest of the stack.',
    scope:
      'Conversion is the path from attention to action: one primary button, honest pricing, forms that land with context, and follow-up that does not depend on sticky notes.',
    scopeDeep:
      'Traffic is not the bottleneck for most SMBs — the next click is. We optimise for one obvious action per screen and an inbox that preserves context.',
    scopePillars: [
      { title: 'Living cards', body: 'Film, contact save, call, and email on a hosted link with QR.' },
      { title: 'Forms & inbox', body: 'Interest types, consent, and privacy notice on every submit.' },
      { title: 'Honest pricing', body: 'GST-inclusive card tiers and Starter plan on public pricing.' },
    ],
    capabilityDetail: [
      {
        body: 'Each public route carries one primary CTA with analytics labels.',
        includes: ['Hero → order or contact', 'Pricing → ask or order', 'Tracked labels'],
      },
      {
        body: 'Enquiries include interest, contact fields, and collection notice.',
        includes: ['Home form', 'Card order flow', 'Grow form where applicable'],
      },
      {
        body: 'Payment and entity transparency before money moves.',
        includes: ['ABN on footer', 'GST on tiers', 'Card terms linked'],
      },
    ],
    searchExamples: [
      'order video business card australia',
      'living business card price',
      'digital card with vcard',
      'business card qr code video',
      'unite group card order',
    ],
    channels: [
      { title: 'Card link & QR', body: 'Print, events, and vehicles that resolve to your film.' },
      { title: 'Website forms', body: 'Home and pricing paths into one email inbox.' },
      { title: 'Stripe checkout', body: 'When payment links are live — otherwise enquiry-first.' },
      { title: 'Bots demo', body: 'Lead follow-up bot on /bots for after-hours replies.' },
    ],
    fitCriteria: [
      'People say “I will look you up” and never do.',
      'Enquiries arrive scattered across DMs and voicemail.',
      'You run ads but the landing page sells something different.',
    ],
    problemsRich: [
      {
        title: 'Unclear next step',
        body: 'Multiple equal buttons, or contact buried below stock paragraphs.',
        signal: 'High views, flat enquiries',
      },
      {
        title: 'Fragmented inbox',
        body: 'No single thread when a customer tries twice on different channels.',
        signal: 'Duplicate or lost leads',
      },
      {
        title: 'Surprise pricing',
        body: 'GST, hosting, or entity hidden until checkout.',
        signal: 'Cart abandon and trust complaints',
      },
    ],
    processLead: 'Conversion is live for cards today: pick, brief, proof, publish — with terms you can forward to finance.',
    howItWorks: [
      { title: 'Choose the surface', body: 'Card order, pricing question, or home contact — each has one primary path.' },
      { title: 'Send assets', body: 'Logo, contacts, and edition choice; custom film if needed.' },
      { title: 'Approve proof', body: 'Private URL; you check film, copy, and links.' },
      { title: 'Publish and share', body: '12 months hosting, QR, vCard; renewal optional per terms.' },
    ],
    beforeAfter: {
      withoutLabel: 'Before',
      withLabel: 'After',
      without: ['Photo of a paper card', '“Email us” with no form', 'DMs lost in social apps'],
      with: ['Film ending on your logo', 'Tracked form with interest type', 'Hosted link + QR kit'],
    },
    deliverablesRich: [
      { title: 'Hosted living card', body: 'Call, email, save, optional multi-business links.' },
      { title: 'QR & share kit', body: 'Files sized for print and social.' },
      { title: 'Order terms', body: 'Hosting, renewal, and approval in plain English.' },
      { title: 'Checkout when enabled', body: 'Stripe links with GST-inclusive display.' },
      { title: 'Confirmation email', body: 'What happens next, without jargon.' },
      { title: 'Inbox context', body: 'Submissions tagged by interest where forms are used.' },
    ],
    outcomesRich: [
      { title: 'Measurable CTA', body: 'You know which button or QR drove the enquiry.' },
      { title: 'Finance-ready', body: 'GST and entity visible before pay.' },
      { title: 'Shareable', body: 'A link you are willing to put on a ute.' },
    ],
    checkpointsRich: [
      { label: 'One primary CTA', detail: 'Per screen, labelled for analytics.' },
      { label: 'GST & entity', detail: 'Visible on pricing and order paths.' },
      { label: 'Form contract', detail: 'Required fields and consent on submit.' },
      { label: 'Terms linked', detail: 'Card order terms reachable from order and FAQ.' },
    ],
    measures: [
      'CTA click labels by route',
      'Form submit success vs validation errors',
      'Card order funnel: edition selected → submit',
      'Time from submit to first human reply (internal)',
    ],
    extraFaq: [
      {
        q: 'Can I pay monthly for the card?',
        a: 'No. The card is one-off with 12 months hosting. The Starter plan is separate monthly services.',
      },
      {
        q: 'Do you integrate with my CRM?',
        a: 'Public conversion focuses on inbox and card hosting today. Deeper CRM sync is roadmap — ask us what is possible now.',
      },
    ],
    related: [
      { href: '/cards', label: 'Showroom', desc: 'Watch every edition before you order.' },
      { href: '/cards/order', label: 'Order flow', desc: 'Edition picker and enquiry form.' },
      { href: '/cards/terms', label: 'Card terms', desc: 'Hosting, renewal, and approval rules.' },
      { href: '/bots', label: 'Bots', desc: 'Try lead follow-up — live demo on the site.' },
    ],
  },
  intelligence: {
    shipNote:
      'Intelligence is coming for customers. Until then, ask us via contact — we will be honest about what we can see from public surfaces only.',
    scope:
      'Intelligence is a periodic plain-language read: where enquiries came from, which pages helped, and what to fix next.',
    scopeDeep:
      'Founders do not need another login they check once. They need an email they can forward that says what changed and what to fix first.',
    scopePillars: [
      { title: 'Enquiry sources', body: 'Forms, card views, and referrers grouped the way you sell.' },
      { title: 'Page performance', body: 'What people opened before they wrote or called.' },
      { title: 'Decisions', body: 'Three fixes tied to revenue paths — not fifty graphs.' },
    ],
    capabilityDetail: [
      {
        body: 'Summaries written for owners, not analysts — readable in under five minutes.',
        includes: ['Plain English', 'No BI certification required', 'Forwarded to contractors'],
      },
      {
        body: 'Tags that match how you actually classify work.',
        includes: ['Card vs pricing vs general', 'AU/NZ context', 'No vanity metrics alone'],
      },
      {
        body: 'Recommendations cite evidence.',
        includes: ['URL or source named', 'Priority order', 'Owner for each fix'],
      },
    ],
    searchExamples: [
      'where are my website leads coming from',
      'simple marketing report small business',
      'which pages get enquiries',
      'marketing analytics without dashboard',
      'monthly seo report plain english',
    ],
    channels: [
      { title: 'Email summary', body: 'Periodic narrative with top pages and sources.' },
      { title: 'Enquiry exports', body: 'When you need raw detail behind the story.' },
      { title: 'Card analytics', body: 'Views and saves when hosting provides them.' },
      { title: 'Workshop call', body: 'Optional review of the summary and next actions.' },
    ],
    fitCriteria: [
      'You export CSVs quarterly and still cannot explain the trend.',
      'Agencies send decks you never open.',
      'You want to brief a contractor in one forwardable email.',
    ],
    problemsRich: [
      {
        title: 'Graphs without decisions',
        body: 'Analytics tools show curves but not what to do Monday morning.',
        signal: 'Dashboard login once a quarter',
      },
      {
        title: 'Empty CRM',
        body: 'Pipeline tools abandoned because nobody maintained them.',
        signal: 'Leads only in personal inboxes',
      },
      {
        title: 'No link to changes',
        body: 'You redesigned a page but cannot tell if enquiries moved.',
        signal: 'Guesswork after every site edit',
      },
    ],
    processLead: 'When Intelligence ships, it connects sources you already use — then writes the story, not another widget.',
    howItWorks: [
      { title: 'Connect sources', body: 'Inbox, public pages, and card views — approved trackers only.' },
      { title: 'Tag reality', body: 'Interests aligned to how you sell.' },
      { title: 'Write the summary', body: 'Narrative plus three prioritized fixes.' },
      { title: 'Review together', body: 'Optional Q&A without CSV homework.' },
    ],
    beforeAfter: {
      withoutLabel: 'Typical today',
      withLabel: 'With Intelligence',
      without: ['50-tab analytics', 'Stale CRM', 'Agency PDFs unread'],
      with: ['Five-minute email', 'Evidence-backed fixes', 'Shared language for staff'],
    },
    deliverablesRich: [
      { title: 'Period summary', body: 'Email-ready prose with date range stated.' },
      { title: 'Source breakdown', body: 'Referrers and forms in plain labels.' },
      { title: 'Page leaderboard', body: 'What was opened most before enquire.' },
      { title: 'Fix list', body: 'Ordered by impact, each tied to a URL or source.' },
      { title: 'Retention notes', body: 'What we keep and delete per privacy policy.' },
      { title: 'Handover to Visibility', body: 'When findability is the root cause, we say so.' },
    ],
    outcomesRich: [
      { title: 'Forwardable', body: 'Staff and suppliers get the same story.' },
      { title: 'Actionable', body: 'Every metric paired with a next step.' },
      { title: 'Honest scope', body: 'No founder-only data in customer reports.' },
    ],
    checkpointsRich: [
      { label: 'Evidence cited', detail: 'Each recommendation names a source.' },
      { label: 'Read time', detail: 'Summary scannable in under five minutes.' },
      { label: 'Privacy', detail: 'Matches published collection notice.' },
      { label: 'No false precision', detail: 'We do not invent customer counts.' },
    ],
    measures: [
      'Enquiry count by interest type',
      'Top referrers and landing paths',
      'Card views / saves where available',
      'Form abandon vs success',
      'Week-on-week change called out in prose',
    ],
    extraFaq: [
      {
        q: 'Will you access my Google Analytics?',
        a: 'Only with your approval and the minimum scopes needed. We say what we need and why.',
      },
      {
        q: 'Is this BI software?',
        a: 'No. It is a written service layer on top of sources you already have.',
      },
    ],
    related: [
      { href: '/solutions/visibility', label: 'Visibility', desc: 'Fix what search and assistants get wrong.' },
      { href: '/pricing', label: 'Pricing', desc: 'See what is billable today versus roadmap.' },
      { href: '/bots', label: 'Bots', desc: 'Automate follow-up while Intelligence matures.' },
      { href: '/#contact', label: 'Contact', desc: 'Ask what we can summarise from your current tools.' },
    ],
  },
}
