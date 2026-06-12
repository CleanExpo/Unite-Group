// @ts-nocheck
// POST /api/billing/receipt — Generate and email a branded receipt
//
// Accepts: { stripeInvoiceId: string }
// Fetches the invoice from Stripe, renders the branded receipt template,
// sends via nodemailer using existing SMTP config (sendEmail).
//
// Returns: { success: true } or error

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { safeError } from '@/lib/safeError';
import { sendEmail } from '@/lib/email/sendEmail';
import { renderReceiptHtml, type ReceiptData } from '@/lib/email/receipt-template';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: '2026-04-22.dahlia' as never })
  : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  // 1. Validate user session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
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
    // 3. Fetch invoice from Stripe
    const invoice = await stripe.invoices.retrieve(stripeInvoiceId, {
      expand: ['customer', 'payment_settings.payment_method_types'],
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 4. Verify this invoice belongs to the authenticated user
    const admin = getAdminClient();
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    if (!profile || profile.stripe_customer_id !== customerId) {
      return NextResponse.json({ error: 'Invoice does not belong to your account' }, { status: 403 });
    }

    // 5. Build receipt data from invoice
    const customer = typeof invoice.customer === 'string'
      ? null
      : invoice.customer as Stripe.Customer;

    // Extract line items
    const lineItems = (invoice.lines?.data ?? []).map((line: any) => ({
      description: line.description ?? 'Subscription',
      amount: line.amount,
      quantity: line.quantity ?? 1,
    }));

    // Extract payment method last 4 digits
    let last4 = '****';
    let brand: string | undefined;
    try {
      const charge = typeof invoice.charge === 'string'
        ? await stripe.charges.retrieve(invoice.charge)
        : invoice.charge;
      if (charge?.payment_method_details?.card) {
        last4 = charge.payment_method_details.card.last4;
        brand = charge.payment_method_details.card.brand;
      }
    } catch {
      // Payment details not available — use defaults
    }

    const receiptData: ReceiptData = {
      receiptNumber: invoice.number ?? invoice.id,
      date: new Date(invoice.created * 1000).toISOString(),
      billingPeriodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : new Date(invoice.created * 1000).toISOString(),
      billingPeriodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : new Date(invoice.created * 1000).toISOString(),
      customerName: customer?.name ?? undefined,
      customerEmail: profile.email ?? customer?.email ?? user.email ?? '',
      lineItems,
      subtotal: invoice.subtotal ?? 0,
      tax: invoice.tax ?? 0,
      total: invoice.total ?? 0,
      currency: invoice.currency ?? 'usd',
      paymentMethodLast4: last4,
      paymentMethodBrand: brand,
    };

    // 6. Render HTML and send email
    const html = renderReceiptHtml(receiptData);
    const recipientEmail = profile.email ?? customer?.email ?? user.email ?? '';

    if (!recipientEmail) {
      return NextResponse.json({ error: 'No email address found for receipt' }, { status: 400 });
    }

    const result = await sendEmail({
      to: recipientEmail,
      subject: `Receipt ${receiptData.receiptNumber} — Unite-Hub`,
      html,
    });

    if (!result.success) {
      return NextResponse.json(
        safeError('receipt_email_failed', new Error(result.message)),
        { status: 500 },
      );
    }

    // 7. Log the sent receipt in stripe_events for idempotency tracking
    await admin.from('stripe_events').insert({
      stripe_event_id: `receipt_${invoice.id}_${Date.now()}`,
      type: 'receipt.sent',
      api_version: '2026-04-22.dahlia',
      livemode: !(STRIPE_KEY?.startsWith('sk_test_')),
      payload: {
        invoice_id: invoice.id,
        receipt_number: receiptData.receiptNumber,
        sent_to: recipientEmail,
        sent_at: new Date().toISOString(),
      } as any,
    }).then(({ error }) => {
      // Non-fatal if logging fails
      if (error) console.error('Failed to log receipt event:', error);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      safeError('receipt_generation_failed', err),
      { status: 500 },
    );
  }
}
