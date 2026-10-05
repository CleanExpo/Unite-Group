import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

/**
 * Public AI-Website page (UNI-2925; spec docs/superpowers/specs/2026-07-10-ai-websites-design.md
 * §5.4(0)). The ONLY public page on this otherwise founder-gated app — the proxy
 * exemption is the exact path `/aiw` (see `isAiwPublicPage` in `@/lib/aiw/public-paths`).
 *
 * Ships dark:
 *   - AIW_PAGE_ENABLED !== 'true'           → 404 (notFound)
 *   - enabled, NEXT_PUBLIC_AIW_SITE_KEY empty → page renders with no chat widget
 *   - enabled and key set                     → embeds /widget/nexus-agent.js with the key
 *
 * The copy below is also the RAG corpus for the site agent, so it states only what
 * an AI website is — no prices, statistics, testimonials or delivery promises.
 */

export const metadata: Metadata = {
  title: 'AI Websites — Unite-Group',
  description:
    'An AI website is a small-business website with a chat assistant grounded in the business’s own information, lead capture into a CRM, and automated follow-up.',
}

const CONTACT_EMAIL = 'contact@unite-group.in'
const WIDGET_SRC = '/widget/nexus-agent.js'

const SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: 'What an AI website is',
    paragraphs: [
      'An AI website is a small-business website that looks and reads like a normal website, with working parts underneath that answer visitors and capture enquiries.',
      'Unite-Group is building AI websites for small businesses. This page describes what one is made of.',
    ],
  },
  {
    heading: 'A chat assistant that answers from the business’s own information',
    paragraphs: [
      'Each AI website carries a chat assistant. It answers visitor questions using the business’s own information: its services, pricing, opening hours, frequently asked questions and reviews.',
      'The assistant is read-only. It answers questions; it cannot read or change customer records.',
    ],
  },
  {
    heading: 'A voice option',
    paragraphs: [
      'A “talk to us” button can open a voice conversation in the browser, so a visitor can speak instead of type.',
    ],
  },
  {
    heading: 'Lead capture into a CRM',
    paragraphs: [
      'When a visitor wants to be contacted, they leave their details through a plain form, click-to-call or the chat. Those details go into the business’s CRM, so every enquiry lands in one place.',
    ],
  },
  {
    heading: 'Automated follow-up',
    paragraphs: [
      'When a new lead is created, a follow-up sequence starts automatically — email first, with SMS planned later.',
    ],
  },
  {
    heading: 'Built from a Google Business Profile',
    paragraphs: [
      'An AI website can be generated from a business’s Google Business Profile. The listing and its reviews are fetched, the copy is written from the customers’ own words, and the site is produced with the chat assistant already embedded.',
    ],
  },
]

export default async function AiwPage() {
  if (process.env.AIW_PAGE_ENABLED !== 'true') {
    notFound()
  }

  const siteKey = (process.env.NEXT_PUBLIC_AIW_SITE_KEY ?? '').trim()
  // The proxy's CSP is nonce + 'strict-dynamic', which ignores 'self' — an
  // un-nonced <script src> would be silently refused by the browser.
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <span className="font-mono text-xs tracking-[0.15em] text-muted-foreground">UNITE-GROUP</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-semibold tracking-tight mb-4">AI websites</h1>
        <p className="text-muted-foreground mb-12">
          A small-business website with a chat assistant, lead capture into a CRM, and automated follow-up.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.heading} className="mb-10">
            <h2 className="text-lg font-semibold mb-3">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-muted-foreground mb-3">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="mt-14 rounded-sm border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">Get in touch</h2>
          <p className="leading-relaxed text-muted-foreground">
            Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2 text-foreground">
              {CONTACT_EMAIL}
            </a>
            {siteKey ? ', or use the chat button at the bottom right of this page.' : '.'}
          </p>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-6 flex gap-6 text-xs text-muted-foreground">
          <Link href="/privacy-policy" className="hover:text-foreground">Privacy policy</Link>
          <Link href="/terms-of-service" className="hover:text-foreground">Terms of service</Link>
        </div>
      </footer>

      {/* Widget contract: public/widget/nexus-agent.js reads data-site-key from
          document.currentScript, so this must stay a classic script. It never
          auto-opens (spec §5.2(4)) — the panel opens only on a click. */}
      {siteKey ? <script src={WIDGET_SRC} data-site-key={siteKey} nonce={nonce} async /> : null}
    </div>
  )
}
