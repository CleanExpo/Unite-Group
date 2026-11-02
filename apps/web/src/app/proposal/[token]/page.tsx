import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import '@/styles/public-tokens.css'

import { PROPOSAL_TERMS } from '@/lib/proposals/plans'
import { lookupProposal, type ProposalLookup } from '@/lib/proposals/store'
import { createServiceClient, hasSupabaseServiceConfig } from '@/lib/supabase/service'

import { AcceptPanel } from './accept-panel'
import s from './proposal.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your proposal | Unite Group',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
const dateAu = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Australia/Brisbane' })

async function load(token: string): Promise<ProposalLookup> {
  if (!hasSupabaseServiceConfig()) return { state: 'unavailable' }
  try {
    return await lookupProposal(createServiceClient(), token)
  } catch (err) {
    console.error('[proposals] page load failed:', err instanceof Error ? err.message : err)
    return { state: 'unavailable' }
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.page}>
      <header className={s.header}>
        <span className={s.wordmark}>UNITE GROUP</span>
      </header>
      <main className={s.main}>{children}</main>
    </div>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <section className={s.notice}>
        <h1 className={s.title}>{title}</h1>
        <p className={s.lead}>{body}</p>
      </section>
    </Shell>
  )
}

export default async function ProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await load(token)

  if (found.state === 'not_found') notFound()
  if (found.state === 'unavailable') {
    return <Notice title="Please try again soon" body="We could not load this proposal just now. Your link is still good, so please come back in a few minutes." />
  }
  if (found.state === 'withdrawn') {
    return <Notice title="This proposal has been withdrawn" body="Please talk to your Unite Group contact and we will sort out what comes next." />
  }
  if (found.state === 'expired') {
    return <Notice title="This proposal has expired" body="Please talk to your Unite Group contact and we will send you a fresh one." />
  }
  if (found.state === 'ordered') {
    return found.orderSource === 'paid' ? (
      <Notice title="Thank you, you are all set" body="Your payment is confirmed. We will be in touch about the next steps." />
    ) : (
      <Notice title="Thank you, you are all set" body="Your code has been accepted. We will be in touch about the next steps." />
    )
  }

  const { proposal } = found
  const monthly = proposal.billing_interval === 'month'
  return (
    <Shell>
      <section className={s.hero}>
        <p className={s.eyebrow}>A proposal for {proposal.client_business ?? proposal.client_name}</p>
        <h1 className={s.title}>The {proposal.plan_name} plan</h1>
        <p className={s.lead}>Hello {proposal.client_name}. Here is what we will do for you, what it costs, and how to say yes.</p>
      </section>

      <div className={s.columns}>
        <div>
          <section className={s.section}>
            <h2 className={s.heading}>What is included</h2>
            <ul className={s.list}>
              {proposal.scope.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className={s.section}>
            <h2 className={s.heading}>The terms</h2>
            <ul className={s.terms}>
              {PROPOSAL_TERMS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className={s.small}>
              Read our <a href="/terms-of-service">terms of service</a>. Terms version {proposal.terms_version}.
            </p>
          </section>
        </div>

        <aside className={s.panel}>
          <p className={s.priceLabel}>Your price</p>
          <p className={s.price}>
            {aud.format(proposal.amount_cents / 100)}
            {monthly ? <span className={s.per}> a month</span> : null}
          </p>
          <p className={s.small}>Includes GST. Offer open until {dateAu.format(new Date(proposal.expires_at))}.</p>
          {proposal.price_is_placeholder ? (
            <p className={s.placeholder}>This is a placeholder price and has not been confirmed. Test payments only.</p>
          ) : null}
          <AcceptPanel token={token} defaultName={proposal.client_name} defaultEmail={proposal.client_email} />
        </aside>
      </div>
    </Shell>
  )
}
