import { COMPANY_NAME, companyAbnLabel } from '@/lib/legal/company'

import { CardEnquiryForm } from './enquiry-form'

/** The rendered order page for already-resolved params. Exported so tests render it without a request. */
export function OrderView({ edition, referrer }: { edition: string | null; referrer: string | null }) {
  return (
    <div className="min-h-screen bg-[#fbfaf6] text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="font-mono text-[13px] tracking-[0.15em] text-[#b8431c]">UNITE GROUP</span>
          <a href="/cards" className="text-[14px] font-semibold text-stone-700 hover:text-stone-950">
            See all editions
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <p className="font-mono text-[12px] tracking-[0.14em] text-stone-500">LIVING BUSINESS CARDS</p>
        <h1 className="mt-3 text-[clamp(1.9rem,5vw,2.8rem)] font-semibold leading-[1.1] tracking-[-0.02em]">
          Get your own living card
        </h1>

        <div data-state="orders-offline" className="mt-6 rounded-sm border border-dashed border-[#b8431c] bg-white p-5">
          <p className="font-mono text-[12px] tracking-[0.1em] text-[#b8431c]">NOT ONLINE YET</p>
          <p className="mt-2 text-[16px] font-semibold">We&rsquo;re not taking orders online yet.</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-stone-600">
            Send us your details below and we will contact you to build your card. You approve a private proof before anything
            goes live, and nothing is charged on this page.
          </p>
        </div>

        <div className="mt-10">
          <CardEnquiryForm edition={edition} referrer={referrer} />
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-stone-500 sm:px-6">
          <span>
            {COMPANY_NAME} · {companyAbnLabel()}
          </span>
          <span className="flex gap-4">
            <a href="/privacy-policy" className="hover:text-stone-800">Privacy</a>
            <a href="/terms-of-service" className="hover:text-stone-800">Terms</a>
          </span>
        </div>
      </footer>
    </div>
  )
}
