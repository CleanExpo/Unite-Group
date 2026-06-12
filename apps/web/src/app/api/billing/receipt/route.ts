// POST /api/billing/receipt — Generate and email a branded receipt.
//
// Ported from apps/authority-legacy/src/app/api/billing/receipt/route.ts (P1 —
// docs/convergence/migration-map.md).
//
// Accepts: { stripeInvoiceId: string }
// Fetches the invoice from Stripe, renders a branded receipt, sends via email.
//
// ADAPTATION (apps/web):
//   - getUser() + 401, createServiceClient(), safeError() inlined.
//   - Ownership is verified against `profiles.stripe_customer_id`. apps/web has
//     NO `profiles` table → honest 503 not_connected on missing relation, so we
//     never email a receipt we can't prove belongs to the caller.
//   - renderReceiptHtml is inlined (legacy @/lib/email/receipt-template not
//     ported); email goes via apps/web's SendGrid wrapper. A sender is required
//     (RECEIPT_FROM_EMAIL / SENDGRID_FROM_EMAIL) — missing → 503 not_connected.
//   TODO(convergence): migrate profiles billing columns + a shared receipt
//   template. See docs/convergence/migration-map.md.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUser } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/integrations/sendgrid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: '2026-05-27.dahlia' })
  : null;

function safeError(code: string, err: unknown): { error: string; detail?: string } {
  const detail =
    err instanceof Error ? err.message : typeof err === 'string' ? err : undefined;
  return detail ? { error: code, detail } : { error: code };
}

function fmtAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function renderReceiptHtml(d: {
  receiptNumber: string;
  date: string;
  customerName?: string;
  customerEmail: string;
  lineItems: Array<{ description: string; amount: number; quantity: number }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentMethodLast4: string;
  paymentMethodBrand?: string;
}): string {
  const rows = d.lineItems
    .map(
      (li) =>
        `<tr><td>${li.description} × ${li.quantity}</td><td style="text-align:right">${fmtAmount(li.amount, d.currency)}</td></tr>`,
    )
    .join('');
  const card = d.paymentMethodBrand
    ? `${d.paymentMethodBrand} ···· ${d.paymentMethodLast4}`
    : `···· ${d.paymentMethodLast4}`;
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111">
  <h2>Receipt ${d.receiptNumber}</h2>
  <p>Date: ${new Date(d.date).toLocaleDateString('en-AU')}</p>
  <p>Billed to: ${d.customerName ? `${d.customerName} (${d.customerEmail})` : d.customerEmail}</p>
  <table style="width:100%;border-collapse:collapse">${rows}</table>
  <hr/>
  <p style="text-align:right">Subtotal: ${fmtAmount(d.subtotal, d.currency)}</p>
  <p style="text-align:right">Tax: ${fmtAmount(d.tax, d.currency)}</p>
  <p style="text-align:right"><strong>Total: ${fmtAmount(d.total, d.currency)}</strong></p>
  <p>Payment method: ${card}</p>
  <p style="color:#666;font-size:12px">Thank you — Unite Group.</p>
  </body></html>`;
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'not_connected', reason: 'Stripe not configured' }, { status: 503 });
  }

  // 1. Validate user session.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body.
  let body: { stripeInvoiceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { stripeInvoiceId } = body;
  if (!stripeInvoiceId || typeof stripeInvoiceId !== 'string') {
    return NextResponse.json({ error: 'stripeInvoiceId is required' }, { status: 400 });
  }

  try {
    // 3. Fetch invoice from Stripe.
    const invoice = await stripe.invoices.retrieve(stripeInvoiceId, { expand: ['customer'] });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 4. Verify this invoice belongs to the authenticated user (via profiles).
    const admin = createServiceClient();
    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    if (profileErr && (profileErr as { code?: string }).code === '42P01') {
      return NextResponse.json(
        { error: 'not_connected', reason: 'profiles table not migrated in apps/web' },
        { status: 503 },
      );
    }
    if (!profile || profile.stripe_customer_id !== customerId) {
      return NextResponse.json(
        { error: 'Invoice does not belong to your account' },
        { status: 403 },
      );
    }

    // 5. Build receipt data.
    const customer =
      typeof invoice.customer === 'string' ? null : (invoice.customer as Stripe.Customer | null);

    const lineItems = (invoice.lines?.data ?? []).map((line) => ({
      description: line.description ?? 'Subscription',
      amount: line.amount,
      quantity: line.quantity ?? 1,
    }));

    let last4 = '****';
    let brand: string | undefined;
    try {
      const charge = (invoice as unknown as { charge?: string | { id: string } }).charge;
      if (charge) {
        const chargeId = typeof charge === 'string' ? charge : charge.id;
        const ch = await stripe.charges.retrieve(chargeId);
        if (ch?.payment_method_details?.card) {
          last4 = ch.payment_method_details.card.last4 ?? '****';
          brand = ch.payment_method_details.card.brand ?? undefined;
        }
      }
    } catch {
      // Payment details not available — use defaults.
    }

    const recipientEmail =
      (profile.email as string | undefined) ?? customer?.email ?? user.email ?? '';
    if (!recipientEmail) {
      return NextResponse.json({ error: 'No email address found for receipt' }, { status: 400 });
    }

    const fromEmail = process.env.RECEIPT_FROM_EMAIL ?? process.env.SENDGRID_FROM_EMAIL;
    if (!fromEmail) {
      return NextResponse.json(
        { error: 'not_connected', reason: 'No RECEIPT_FROM_EMAIL/SENDGRID_FROM_EMAIL configured' },
        { status: 503 },
      );
    }

    const html = renderReceiptHtml({
      receiptNumber: invoice.number ?? invoice.id ?? 'receipt',
      date: new Date(invoice.created * 1000).toISOString(),
      customerName: customer?.name ?? undefined,
      customerEmail: recipientEmail,
      lineItems,
      subtotal: invoice.subtotal ?? 0,
      tax: (invoice as unknown as { tax?: number }).tax ?? 0,
      total: invoice.total ?? 0,
      currency: invoice.currency ?? 'aud',
      paymentMethodLast4: last4,
      paymentMethodBrand: brand,
    });

    let messageId: string;
    try {
      messageId = await sendEmail({
        to: { email: recipientEmail, name: customer?.name ?? undefined },
        from: { email: fromEmail, name: 'Unite Group' },
        subject: `Receipt ${invoice.number ?? invoice.id} — Unite Group`,
        html,
      });
    } catch (sendErr) {
      return NextResponse.json(safeError('receipt_email_failed', sendErr), { status: 500 });
    }

    // 6. Log the sent receipt for idempotency tracking.
    await admin
      .from('stripe_events')
      .insert({
        stripe_event_id: `receipt_${invoice.id}_${Date.now()}`,
        type: 'receipt.sent',
        api_version: '2026-04-22.dahlia',
        livemode: !STRIPE_KEY?.startsWith('sk_test_'),
        payload: {
          invoice_id: invoice.id,
          receipt_number: invoice.number ?? invoice.id,
          sent_to: recipientEmail,
          message_id: messageId,
          sent_at: new Date().toISOString(),
        },
      })
      .then(({ error }) => {
        if (error) console.error('Failed to log receipt event:', error);
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(safeError('receipt_generation_failed', err), { status: 500 });
  }
}
