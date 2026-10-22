import type { Metadata } from 'next'

import { COMPANY_NAME, companyAbnLabel } from '@/lib/legal/company'

import { EditionTile } from './edition-tile'
import { EDITIONS } from './editions'

export const metadata: Metadata = {
  title: 'Living business cards | Unite Group',
  description:
    'A business card that opens on a short film ending on your logo. See all ten editions and the signature reveal, then ask us to build yours.',
  alternates: { canonical: 'https://unite-group.in/cards' },
  robots: { index: true, follow: true },
}

const STEPS = [
  { title: 'Pick an opener', body: 'Choose the edition you like. Yours ends on your own logo, not ours.' },
  { title: 'Send your details', body: 'Your logo, colours, contact details and the businesses you want linked.' },
  { title: 'Approve a proof', body: 'We build your card and send you a private link to check before anything goes live.' },
]

export default function CardsShowroomPage() {
  const [signature, ...editions] = EDITIONS
  return (
    <div className="min-h-screen bg-[#0b0d10] text-stone-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="font-mono text-[13px] tracking-[0.15em] text-[#ff8a5c]">UNITE GROUP</span>
          <a
            href="/cards/order"
            className="rounded-sm border border-[#e55a2b] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#e55a2b]"
          >
            Get your own card
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pt-20 md:grid-cols-[1fr_minmax(0,22rem)] md:items-center">
          <div>
            <p className="font-mono text-[12px] tracking-[0.14em] text-stone-400">LIVING BUSINESS CARDS</p>
            <h1 className="mt-4 max-w-2xl text-[clamp(2.1rem,5.4vw,3.6rem)] font-semibold leading-[1.08] tracking-[-0.025em]">
              A business card that opens like a film and ends on your logo.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-stone-300">
              One link or QR code. It plays a short opener, then shows your details, saves to contacts in one tap, and links to
              your businesses. Tap any edition below to watch it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/cards/order"
                className="inline-flex min-h-12 items-center rounded-sm bg-[#e55a2b] px-7 text-[15px] font-semibold text-white hover:bg-[#cf4b1f]"
              >
                Get your own card
              </a>
              <a
                href="#editions"
                className="inline-flex min-h-12 items-center rounded-sm border border-white/20 px-7 text-[15px] font-semibold text-stone-100 hover:border-white/40"
              >
                See the editions
              </a>
            </div>
          </div>
          <EditionTile edition={signature} />
        </section>

        <section id="editions" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-[-0.015em]">Ten editions</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-stone-400">
            Every example ends on the Unite Group logo. Yours ends on your own. Each clip is AI-generated in Higgsfield and runs
            for about four seconds.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {editions.map((edition) => (
              <EditionTile key={edition.name} edition={edition} />
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <p className="font-mono text-[12px] tracking-[0.14em] text-[#ff8a5c]">STEP {i + 1}</p>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-stone-300">{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-stone-400 sm:px-6">
          <span>
            {COMPANY_NAME} · {companyAbnLabel()}
          </span>
          <span className="flex gap-4">
            <a href="/privacy-policy" className="hover:text-white">Privacy</a>
            <a href="/terms-of-service" className="hover:text-white">Terms</a>
          </span>
        </div>
      </footer>
    </div>
  )
}
