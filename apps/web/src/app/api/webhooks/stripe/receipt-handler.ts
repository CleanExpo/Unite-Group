// src/app/api/webhooks/stripe/receipt-handler.ts
//
// Ported from apps/authority-legacy/src/app/api/webhooks/stripe/receipt-handler.ts
// (P1 — docs/convergence/migration-map.md).
//
// Utility to handle Stripe invoice.payment_succeeded webhook events by
// generating and sending a branded receipt email.
//
// Idempotent: checks stripe_events for an existing receipt.sent record for the
// given invoice before sending.
//
// ADAPTATION (apps/web):
//   - The legacy handler resolved the recipient via a `profiles` table
//     (profiles.stripe_customer_id → email/full_name). apps/web has no such
//     `profiles` table, so recipient resolution falls back to Stripe itself
//     (invoice.customer_email, then customers.retrieve). This is the honest
//     source of truth — NOT mock data. If no email can be resolved the receipt
//     is skipped (returns false) and logged.
//   - The legacy renderReceiptHtml / sendEmail from @/lib/email/* were not
//     ported. A minimal inline receipt renderer is provided, and email is sent
//     via apps/web's SendGrid wrapper (@/lib/integrations/sendgrid). A sender
//     address is required: RECEIPT_FROM_EMAIL (falls back to SENDGRID_FROM_EMAIL).
//     If no sender is configured the send is skipped honestly (not_connected).

import Stripe from 'stripe';
import { sendEmail } from '@/lib/integrations/sendgrid';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

interface ReceiptLineItem {
  description: string;
  amount: number;
  quantity: number;
}

interface ReceiptData {
  receiptNumber: string;
  date: string;
  customerName?: string;
  customerEmail: string;
  lineItems: ReceiptLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentMethodLast4: string;
  paymentMethodBrand?: string;
}

function fmtAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

// Minimal inline receipt template (legacy @/lib/email/receipt-template not ported).
function renderReceiptHtml(d: ReceiptData): string {
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
  ${d.customerName ? `<p>Billed to: ${d.customerName} (${d.customerEmail})</p>` : `<p>Billed to: ${d.customerEmail}</p>`}
  <table style="width:100%;border-collapse:collapse">${rows}</table>
  <hr/>
  <p style="text-align:right">Subtotal: ${fmtAmount(d.subtotal, d.currency)}</p>
  <p style="text-align:right">Tax: ${fmtAmount(d.tax, d.currency)}</p>
  <p style="text-align:right"><strong>Total: ${fmtAmount(d.total, d.currency)}</strong></p>
  <p>Payment method: ${card}</p>
  <p style="color:#666;font-size:12px">Thank you — Unite Group.</p>
  </body></html>`;
}

/**
 * Handle invoice.payment_succeeded — sends a branded receipt email.
 * Returns true if a receipt was sent, false if skipped (already sent, no
 * recipient, sender not configured, or error).
 */
export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  admin: { from: (table: string) => any },
): Promise<boolean> {
  // 1. Idempotency check: see if we already sent a receipt for this invoice.
  const { data: existingReceipts } = await admin
    .from('stripe_events')
    .select('id')
    .eq('type', 'receipt.sent')
    .filter('payload->>invoice_id', 'eq', invoice.id)
    .limit(1);

  if (existingReceipts && existingReceipts.length > 0) {
    console.log(`Receipt already sent for invoice ${invoice.id}, skipping.`);
    return false;
  }

  try {
    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

    let recipientEmail = '';
    let customerName: string | undefined;

    // Resolve recipient from Stripe (apps/web has no `profiles` table — Stripe
    // is the honest source of truth here).
    const stripeClient = STRIPE_KEY
      ? new Stripe(STRIPE_KEY, { apiVersion: '2026-05-27.dahlia' })
      : null;

    if (invoice.customer_email) {
      recipientEmail = invoice.customer_email;
    } else if (stripeClient && customerId) {
      try {
        const customer = (await stripeClient.customers.retrieve(customerId)) as Stripe.Customer;
        if (!customer.deleted) {
          recipientEmail = customer.email ?? '';
          customerName = customer.name ?? undefined;
        }
      } catch {
        // Customer retrieval failed — skip.
      }
    }

    if (!recipientEmail) {
      console.error(`No email found for invoice ${invoice.id} (customer: ${customerId})`);
      return false;
    }

    // Line items.
    const lineItems: ReceiptLineItem[] = (invoice.lines?.data ?? []).map((line) => ({
      description: line.description ?? 'Subscription',
      amount: line.amount,
      quantity: line.quantity ?? 1,
    }));

    // Payment method details (best-effort).
    let last4 = '****';
    let brand: string | undefined;
    const charge = (invoice as unknown as { charge?: string | { id: string } }).charge;
    if (stripeClient && charge) {
      try {
        const chargeId = typeof charge === 'string' ? charge : charge.id;
        const ch = await stripeClient.charges.retrieve(chargeId);
        if (ch?.payment_method_details?.card) {
          last4 = ch.payment_method_details.card.last4 ?? '****';
          brand = ch.payment_method_details.card.brand ?? undefined;
        }
      } catch {
        // Payment details not available.
      }
    }

    const receiptData: ReceiptData = {
      receiptNumber: invoice.number ?? invoice.id ?? 'receipt',
      date: new Date(invoice.created * 1000).toISOString(),
      customerName,
      customerEmail: recipientEmail,
      lineItems,
      subtotal: invoice.subtotal ?? 0,
      tax: (invoice as unknown as { tax?: number }).tax ?? 0,
      total: invoice.total ?? 0,
      currency: invoice.currency ?? 'aud',
      paymentMethodLast4: last4,
      paymentMethodBrand: brand,
    };

    // Sender — honest dependency check (No-Invaders: no silent fake-send).
    const fromEmail = process.env.RECEIPT_FROM_EMAIL ?? process.env.SENDGRID_FROM_EMAIL;
    if (!fromEmail) {
      console.warn(
        `[receipt] not_connected: no RECEIPT_FROM_EMAIL/SENDGRID_FROM_EMAIL configured; ` +
          `skipping receipt for invoice ${invoice.id}.`,
      );
      return false;
    }

    const html = renderReceiptHtml(receiptData);
    let messageId: string;
    try {
      messageId = await sendEmail({
        to: { email: recipientEmail, name: customerName },
        from: { email: fromEmail, name: 'Unite Group' },
        subject: `Receipt ${receiptData.receiptNumber} — Unite Group`,
        html,
      });
    } catch (sendErr) {
      console.error(`Failed to send receipt for invoice ${invoice.id}:`, sendErr);
      return false;
    }

    // Log the receipt.sent event for idempotency.
    await admin.from('stripe_events').insert({
      stripe_event_id: `receipt_${invoice.id}_${Date.now()}`,
      type: 'receipt.sent',
      api_version: '2026-04-22.dahlia',
      livemode: !STRIPE_KEY?.startsWith('sk_test_'),
      payload: {
        invoice_id: invoice.id,
        receipt_number: receiptData.receiptNumber,
        sent_to: recipientEmail,
        message_id: messageId,
        sent_at: new Date().toISOString(),
      },
    });

    console.log(`Receipt sent for invoice ${invoice.id} to ${recipientEmail}`);
    return true;
  } catch (err) {
    console.error(`Error generating receipt for invoice ${invoice.id}:`, err);
    return false;
  }
}
