// POST /api/empire/data-room/vendor-contracts
//
// Generates the vendor_contracts document for the M&A data room (UNI-1986).
// Currently reads integration_stripe_subscriptions only — Xero + contract
// tables don't exist yet; the payload declares which sources were missing.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import {
  buildVendorContracts,
  type StripeSubscriptionWithProductRow,
} from '@/lib/data-room/generators/vendor-contracts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const supabase = getAdminClient();
  const asOf = new Date();

  const subsRes = await supabase
    .from('integration_stripe_subscriptions')
    .select('id, customer_id, status, monthly_amount_aud, product_name, current_period_end')
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

  const payload = buildVendorContracts(
    (subsRes.data ?? []) as StripeSubscriptionWithProductRow[],
    asOf.toISOString(),
  );

  const inserted = await supabase
    .from('data_room_documents')
    .insert({
      kind: 'vendor_contracts',
      business_id: null,
      period_start: null,
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
