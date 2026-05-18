// POST /api/empire/data-room/pl-summary
//
// Generates the pl_summary document for the M&A data room (UNI-1985).
// Reads integration_stripe_subscriptions (active recurring revenue) and
// integration_stripe_invoices_mtd (monthly billed revenue), calls the
// pure builder, persists to public.data_room_documents with kind='pl_summary'
// and audit_status='pending'.
//
// Auth: founder-only via requireAdmin (mirrors data_room_documents RLS).
// Idempotency: every POST creates a fresh row; UNI-1989's admin UI will
// mark older docs `superseded`.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import {
  buildPlSummary,
  type StripeInvoiceMonthRow,
  type StripeSubscriptionRow,
} from '@/lib/data-room/generators/pl-summary';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const supabase = getAdminClient();
  const asOf = new Date();

  const subsRes = await supabase
    .from('integration_stripe_subscriptions')
    .select('id, customer_id, status, monthly_amount_aud')
    .limit(5_000);

  if (subsRes.error) {
    return NextResponse.json(
      {
        error: 'stripe_subscriptions_query_failed',
        detail: subsRes.error.message,
      },
      { status: 500 },
    );
  }

  const invoicesRes = await supabase
    .from('integration_stripe_invoices_mtd')
    .select('yyyymm, total_aud, paid_aud, outstanding_aud')
    .order('yyyymm', { ascending: true })
    .limit(60);

  if (invoicesRes.error) {
    return NextResponse.json(
      {
        error: 'stripe_invoices_query_failed',
        detail: invoicesRes.error.message,
      },
      { status: 500 },
    );
  }

  const payload = buildPlSummary(
    (subsRes.data ?? []) as StripeSubscriptionRow[],
    (invoicesRes.data ?? []) as StripeInvoiceMonthRow[],
    asOf.toISOString(),
  );

  const firstMonth = payload.monthly_revenue.at(0)?.yyyymm;
  const period_start = firstMonth
    ? `${firstMonth.slice(0, 4)}-${firstMonth.slice(4, 6)}-01`
    : asOf.toISOString().slice(0, 10);

  const inserted = await supabase
    .from('data_room_documents')
    .insert({
      kind: 'pl_summary',
      business_id: null,
      period_start,
      period_end: asOf.toISOString().slice(0, 10),
      payload,
      audit_status: 'pending',
    })
    .select('id, generated_at, audit_status')
    .single();

  if (inserted.error || !inserted.data) {
    return NextResponse.json(
      { error: 'data_room_insert_failed', detail: inserted.error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      document_id: inserted.data.id,
      generated_at: inserted.data.generated_at,
      audit_status: inserted.data.audit_status,
      payload,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
