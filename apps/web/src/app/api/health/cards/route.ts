// src/app/api/health/cards/route.ts
// Card order readiness: is everything the card order flow needs actually in place?
// GET /api/health/cards
// Auth: Founder-only. Returns BOOLEANS ONLY: never an env value, a row or a database error message.
//
// A column or table that does not exist yet reads false and the route still answers 200, so it can be
// watched before the founder-gated migrations are applied. schema_checked is false when the database could
// not be asked at all (service key unset, network, permissions): the schema flags then mean "unknown", so an
// outage cannot be mistaken for a migration that has not been applied.

import { NextResponse } from 'next/server'

import { hasPrivateAccess } from '@/lib/auth/private-access'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export const CARD_ENV_NAMES = [
  'STRIPE_CARD_PAYMENT_LINK_IDS',
  'STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID',
  'STRIPE_PAYMENT_LINK_CARD_READY',
  'STRIPE_PAYMENT_LINK_CARD_CUSTOM',
  'STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS',
  'STRIPE_PAYMENT_LINK_CARD_NFC_TAP',
  'STRIPE_WEBHOOK_SECRET',
  'MAILTRAP_API_KEY',
] as const

/** The columns added by migration 20261030120000_card_order_intakes_payload_delivery. */
export const INTAKE_PAYLOAD_COLUMNS = [
  'film',
  'contact_details',
  'logo_link',
  'brief',
  'delivery_state',
  'provider_message_id',
  'delivered_at',
] as const

// What the database API answers for a column (42703, PGRST204) or a table (42P01, PGRST205) that is not there.
const NOT_THERE = new Set(['42703', 'PGRST204', '42P01', 'PGRST205'])

type Probe = 'exists' | 'missing' | 'unknown'

function envSet(name: string): boolean {
  const value = process.env[name]?.trim()
  return !!value && !value.startsWith('your-') && !value.startsWith('***')
}

/** limit(0): the database resolves the column but sends back no row. A GET, because a HEAD response has no error code. */
async function probe(run: () => PromiseLike<{ error: { code?: string } | null }>): Promise<Probe> {
  try {
    const { error } = await run()
    if (!error) return 'exists'
    if (error.code && NOT_THERE.has(error.code)) return 'missing'
    console.error('[health/cards] schema probe failed:', error.code ?? 'no code')
    return 'unknown'
  } catch (err) {
    console.error('[health/cards] schema probe failed:', err instanceof Error ? err.name : 'unknown error')
    return 'unknown'
  }
}

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  // '/api/health' is in the proxy's PUBLIC_PATHS and this is a segment-child of it, so the proxy's founder gate
  // does not run here. This route applies the same check itself, as /api/health/connectors does.
  if (!hasPrivateAccess({ id: user.id, email: user.email })) {
    return NextResponse.json({ error: 'Forbidden', message: 'This Unite-Hub CRM is private.' }, { status: 403 })
  }

  const env = Object.fromEntries(CARD_ENV_NAMES.map((name) => [name, envSet(name)]))

  let columnProbes: Probe[] = INTAKE_PAYLOAD_COLUMNS.map(() => 'unknown')
  let tableProbe: Probe = 'unknown'
  try {
    const admin = createServiceClient()
    ;[columnProbes, tableProbe] = await Promise.all([
      Promise.all(INTAKE_PAYLOAD_COLUMNS.map((column) => probe(() => admin.from('card_order_intakes').select(column).limit(0)))),
      probe(() => admin.from('card_order_emails').select('id').limit(0)),
    ])
  } catch (err) {
    console.error('[health/cards] could not reach the database:', err instanceof Error ? err.name : 'unknown error')
  }

  return NextResponse.json({
    env,
    card_order_intakes_columns: Object.fromEntries(INTAKE_PAYLOAD_COLUMNS.map((column, i) => [column, columnProbes[i] === 'exists'])),
    card_order_emails_table: tableProbe === 'exists',
    schema_checked: ![...columnProbes, tableProbe].includes('unknown'),
  })
}
