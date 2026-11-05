// What a paid order sets up (UNI-3146). A Business Pack order opens the owner's account and emails its private link. A
// staff-card order adds its seats to the one account with the same buyer email. Limits, named in
// docs/guides/card-payment-links.md: a different email, or two accounts on one email, is not guessed at; the founder
// is told and links it by hand. Safe to run again for the same order, so a Stripe retry heals a failed run.

import { leadAlertEmailTo, mailtrapFromEmail, sendEmail } from '@/lib/integrations/mailtrap'

import { manageLink, newCardToken, type Admin } from './staff-actions'

export type ProvisionOutcome = 'account_created' | 'account_link_replaced' | 'account_exists' | 'seats_added' | 'seats_exist' | 'unlinked' | 'skipped_no_email' | 'not_applied'

/** PostgREST and Postgres codes for a table or function that does not exist yet, meaning the founder-gated migration is not applied. */
const NOT_APPLIED = new Set(['42P01', '42883', 'PGRST202', 'PGRST205'])
const isNotApplied = (error: { code?: string } | null | undefined) => Boolean(error?.code && NOT_APPLIED.has(error.code))

type OrderRow = { id: string; founder_id: string; tier: string; customer_email: string | null; livemode: boolean; quantity?: number | null }

async function mail(to: string, fromName: string, subject: string, lines: string[], category: string): Promise<boolean> {
  try {
    const id = await sendEmail({
      to: { email: to },
      from: { email: mailtrapFromEmail(), name: fromName },
      subject,
      text: lines.join('\n\n'),
      html: lines.map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join(''),
      categories: [category],
    })
    return id !== null
  } catch (err) {
    console.error(`[cards] ${category} email failed:`, err instanceof Error ? err.message : err)
    return false
  }
}

const tellFounder = (order: OrderRow, line: string) =>
  mail(leadAlertEmailTo(), 'Unite-Group orders', `${order.livemode ? '' : '[TEST] '}Card order needs you`, [`Order ${order.id}: ${line}`], 'card-order-link-alert')

/** The founder must hear about a paid order nothing was set up for. If this alert fails too, throw so Stripe retries. */
async function alertOrThrow(order: OrderRow, line: string): Promise<void> {
  if (!(await tellFounder(order, line))) throw new Error(`card order alert failed for order ${order.id}`)
}

/** Longer than a request can live (300s on this host), so a claim this old belongs to a request that has died. */
const CLAIM_LEASE_MS = 10 * 60 * 1000

/**
 * Only the hash is stored, so a link that was never delivered cannot be sent again; a retry replaces the token instead.
 * One delivery at a time holds a claim on the row. A retry that finds a live claim throws, so Stripe tries again later and
 * cannot replace a link that is being emailed right now. A link confirmed sent is never replaced.
 */
async function replaceUndeliveredLink(admin: Admin, order: OrderRow, email: string): Promise<ProvisionOutcome> {
  const { data, error } = await admin
    .from('card_business_accounts')
    .select('owner_link_sent_at, owner_link_claimed_at')
    .eq('order_id', order.id)
    .eq('founder_id', order.founder_id)
    .maybeSingle()
  if (error) throw new Error(`card account read failed: ${error.message}`)
  if (!data) throw new Error('card account read failed: the account for this order was not found')
  const row = data as { owner_link_sent_at: string | null; owner_link_claimed_at: string | null }
  if (row.owner_link_sent_at) return 'account_exists'
  const claimedAt = row.owner_link_claimed_at
  if (claimedAt && Date.now() - new Date(claimedAt).getTime() < CLAIM_LEASE_MS) {
    throw new Error(`card account link delivery in progress for order ${order.id}`)
  }
  const { token, hash } = newCardToken()
  const claim = admin
    .from('card_business_accounts')
    .update({ owner_token_hash: hash, owner_link_claimed_at: new Date().toISOString() })
    .eq('order_id', order.id)
    .eq('founder_id', order.founder_id)
    .is('owner_link_sent_at', null)
  // Compare-and-set on the claim we just read, so of two retries only one wins.
  const replaced = await (claimedAt ? claim.eq('owner_link_claimed_at', claimedAt) : claim.is('owner_link_claimed_at', null)).select('id')
  if (replaced.error) throw new Error(`card account link replace failed: ${replaced.error.message}`)
  if (!replaced.data?.length) throw new Error(`card account link delivery in progress for order ${order.id}`)
  await deliverOwnerLink(admin, order, email, token, hash)
  return 'account_link_replaced'
}

async function openAccount(admin: Admin, order: OrderRow, email: string): Promise<ProvisionOutcome> {
  const { token, hash } = newCardToken()
  const { error } = await admin.from('card_business_accounts').insert({
    founder_id: order.founder_id,
    order_id: order.id,
    livemode: order.livemode,
    owner_email: email,
    owner_token_hash: hash,
    owner_link_claimed_at: new Date().toISOString(),
  })
  if (error) {
    if (isNotApplied(error)) return 'not_applied'
    if ((error as { code?: string }).code === '23505') return replaceUndeliveredLink(admin, order, email)
    throw new Error(`card account insert failed: ${error.message}`)
  }
  await deliverOwnerLink(admin, order, email, token, hash)
  return 'account_created'
}

async function deliverOwnerLink(admin: Admin, order: OrderRow, email: string, token: string, hash: string): Promise<void> {
  const sent = await mail(
    email,
    'Margot at Unite-Group',
    `${order.livemode ? '' : '[TEST] '}Your Business Pack account link`,
    [
      'This private link is your main account for your living card. Keep it safe: anyone with it can change your business details.',
      manageLink(token),
      'Your business name, logo, phone, website, address and offer are set there, and any change reaches every staff card. Staff cards you buy with this email address appear there too.',
      'Kind regards,',
      'Margot, Unite-Group',
    ],
    'card-account-link',
  )
  if (!sent) {
    // Give up the claim so the next retry need not wait out the lease. If this fails the lease still expires.
    await admin.from('card_business_accounts').update({ owner_link_claimed_at: null }).eq('order_id', order.id).eq('owner_token_hash', hash)
    // The alert carries the order id, never the link. Throwing makes the webhook answer 500, so Stripe retries with a new token.
    await tellFounder(order, 'the Business Pack account link email did not send. Stripe will retry; if it runs out of retries, set a new owner link (docs/guides/card-payment-links.md).')
    throw new Error(`card account link email failed for order ${order.id}`)
  }
  // Bound to this token: a request whose claim was taken over must not mark a link it did not send. If the mark fails, the
  // lease runs out and a retry sends a newer link; the owner gets two emails and the newest works.
  const marked = await admin.from('card_business_accounts').update({ owner_link_sent_at: new Date().toISOString() }).eq('order_id', order.id).eq('owner_token_hash', hash)
  if (marked.error) throw new Error(`card account link mark failed: ${marked.error.message}`)
}

async function addSeats(admin: Admin, order: OrderRow, email: string): Promise<ProvisionOutcome> {
  const { data: matches, error } = await admin
    .from('card_business_accounts')
    .select('id')
    .eq('founder_id', order.founder_id)
    .eq('owner_email', email)
    .eq('livemode', order.livemode)
  if (error) {
    if (isNotApplied(error)) return 'not_applied'
    throw new Error(`card account lookup failed: ${error.message}`)
  }
  if (!matches || matches.length !== 1) {
    await alertOrThrow(order, `${order.quantity ?? 1} staff card(s) paid, but ${matches?.length ?? 0} Business Pack accounts match the buyer's email. Link it by hand (docs/guides/card-payment-links.md).`)
    return 'unlinked'
  }
  const added = await admin.rpc('card_provision_staff_cards', { p_order_id: order.id, p_account_id: matches[0].id })
  if (added.error) {
    if (isNotApplied(added.error)) return 'not_applied'
    throw new Error(`staff card provision failed: ${added.error.message}`)
  }
  if (!added.data) return 'seats_exist'
  const told = await mail(
    email,
    'Margot at Unite-Group',
    `${order.livemode ? '' : '[TEST] '}Your staff cards are ready to set up`,
    [
      `${added.data} staff card${added.data === 1 ? ' is' : 's are'} now on your Business Pack account. Open your account link, make a link for each staff member and send it to them.`,
      'Kind regards,',
      'Margot, Unite-Group',
    ],
    'card-staff-seats',
  )
  // The seats are saved and show on the owner's account, and a retry would find nothing new to announce, so tell the founder.
  if (!told) await tellFounder(order, `${added.data} staff card(s) were added, but the email telling the owner did not send.`)
  return 'seats_added'
}

/**
 * Set up the account or seats for a recorded order. A Starter pack order sets up nothing. Throws on a real failure, so the
 * webhook answers 500 and Stripe retries. While the migration is unapplied the order still records, but the founder is told
 * that nothing was set up (and the webhook throws if that alert fails), so a paid order is never set up silently by no one.
 */
export async function provisionCardOrder(admin: Admin, stripeSessionId: string): Promise<ProvisionOutcome | 'none'> {
  const { data, error } = await admin
    .from('card_orders')
    .select('id, founder_id, tier, customer_email, livemode, quantity')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle()
  if (error) throw new Error(`card order read failed: ${error.message}`)
  if (!data) throw new Error('card order read failed: the recorded order was not found')
  const order = data as OrderRow
  if (order.tier !== 'custom' && order.tier !== 'extra_business') return 'none'
  const email = order.customer_email?.trim().toLowerCase()
  if (!email) {
    await alertOrThrow(order, 'Stripe recorded no buyer email, so no account or staff card was set up.')
    return 'skipped_no_email'
  }
  const outcome = order.tier === 'custom' ? await openAccount(admin, order, email) : await addSeats(admin, order, email)
  if (outcome === 'not_applied') {
    console.warn('[cards] business account tables are not applied: order recorded, no account or staff card set up')
    // A redelivery runs set-up again (the duplicate path in paid-order.ts), so resending the event after the migration works.
    await alertOrThrow(
      order,
      'the business account tables are not applied yet, so no account or staff card was set up for this paid order. Apply the card migrations, then resend this Stripe event to set it up (docs/guides/card-payment-links.md).',
    )
  }
  return outcome
}
