'use client'

import { useCallback, useEffect, useState } from 'react'

import s from './proposal-desk.module.css'

type Plan = { id: string; name: string; amountCents: number; isPlaceholder: boolean }
type Lead = { id: string; label: string }
type ProposalRow = {
  id: string
  client_name: string
  client_business: string | null
  plan_name: string
  amount_cents: number
  expires_at: string
  withdrawn_at: string | null
  website_orders: { source: string } | { source: string }[] | null
}

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
const dateAu = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Australia/Brisbane' })

function statusOf(row: ProposalRow): string {
  const order = Array.isArray(row.website_orders) ? row.website_orders[0] : row.website_orders
  if (order) return order.source === 'paid' ? 'Paid' : 'Accepted with a code'
  if (row.withdrawn_at) return 'Withdrawn'
  if (new Date(row.expires_at) <= new Date()) return 'Expired'
  return 'Open'
}

async function send(url: string, method: string, body?: object): Promise<Record<string, string>> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'That did not work. Please try again.')
  return json
}

export function ProposalDesk({ plans, leads }: { plans: Plan[]; leads: Lead[] }) {
  const [rows, setRows] = useState<ProposalRow[] | null>(null)
  const [leadId, setLeadId] = useState('')
  const [planId, setPlanId] = useState(plans[0]?.id ?? '')
  const [link, setLink] = useState<string | null>(null)
  const [code, setCode] = useState<{ proposalId: string; value: string; expiresAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const json = await send('/api/founder/proposals', 'GET')
      setRows(json.proposals as unknown as ProposalRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load proposals')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function run(action: () => Promise<void>) {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work. Please try again.')
    }
    await refresh()
  }

  return (
    <div className={s.desk}>
      <h1 className={s.title}>Proposals</h1>
      <p className={s.note}>Nothing is sent from here. Copy the link or code and send it yourself.</p>

      <form
        className={s.form}
        onSubmit={(event) => {
          event.preventDefault()
          void run(async () => {
            const json = await send('/api/founder/proposals', 'POST', { leadId, planId })
            setLink(`${window.location.origin}${json.path}`)
            setCode(null)
          })
        }}
      >
        <label className={s.field}>
          Lead
          <select className={s.input} value={leadId} onChange={(e) => setLeadId(e.target.value)} required>
            <option value="">Choose a lead</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.label}</option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Plan
          <select className={s.input} value={planId} onChange={(e) => setPlanId(e.target.value)} required>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}, {aud.format(plan.amountCents / 100)}{plan.isPlaceholder ? ' (placeholder)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button className={s.button} type="submit">Create proposal</button>
      </form>

      {error ? <p className={s.error} role="alert">{error}</p> : null}

      {link ? (
        <p className={s.once}>
          Proposal link, shown only this once: <code className={s.secret}>{link}</code>
        </p>
      ) : null}
      {code ? (
        <p className={s.once}>
          Single-use code, shown only this once: <code className={s.secret}>{code.value}</code> (expires {dateAu.format(new Date(code.expiresAt))})
        </p>
      ) : null}

      {rows === null ? (
        error ? null : <p className={s.note}>Loading proposals</p>
      ) : rows.length === 0 ? (
        <p className={s.note}>No proposals yet.</p>
      ) : (
        <table className={s.table}>
          <thead>
            <tr><th>Client</th><th>Plan</th><th>Price</th><th>Open until</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const open = statusOf(row) === 'Open'
              return (
                <tr key={row.id}>
                  <td>{row.client_business ?? row.client_name}</td>
                  <td>{row.plan_name}</td>
                  <td>{aud.format(row.amount_cents / 100)}</td>
                  <td>{dateAu.format(new Date(row.expires_at))}</td>
                  <td>{statusOf(row)}</td>
                  <td className={s.actions}>
                    {open ? (
                      <>
                        <button
                          className={s.link}
                          type="button"
                          onClick={() => void run(async () => {
                            const json = await send(`/api/founder/proposals/${row.id}/comp-codes`, 'POST', {})
                            setCode({ proposalId: row.id, value: json.code, expiresAt: json.expiresAt })
                            setLink(null)
                          })}
                        >
                          Make a code
                        </button>
                        <button
                          className={s.link}
                          type="button"
                          onClick={() => void run(async () => {
                            const json = (await send(`/api/founder/proposals/${row.id}`, 'PATCH')) as unknown as { checkoutClosed: boolean }
                            if (!json.checkoutClosed) {
                              throw new Error('Withdrawn, but its Stripe payment page could not be closed. If it is paid, the payment will be flagged for a refund.')
                            }
                          })}
                        >
                          Withdraw
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
