// @ts-nocheck
// src/app/api/webhooks/stripe/receipt-handler.ts
//
// Utility to handle Stripe invoice.payment_succeeded webhook events
// by generating and sending a branded receipt email.
//
// Idempotent: checks stripe_events for an existing receipt.sent record
// for the given invoice before sending.

import Stripe from 'stripe';
import { renderReceiptHtml, type ReceiptData } from '@/lib/email/receipt-template';
import { sendEmail } from '@/lib/email/sendEmail';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

/**
 * Handle invoice.payment_succeeded — sends a branded receipt email.
 * Returns true if receipt was sent, false if skipped (already sent or error).
 */
export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  admin: any,
): Promise<boolean> {
  // 1. Idempotency check: see if we already sent a receipt for this invoice
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
    // 2. Resolve the customer email via profiles table
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    let recipientEmail = '';
    let customerName: string | undefined;

    if (customerId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('email, full_name, stripe_customer_id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        recipientEmail = profile.email ?? '';
        customerName = profile.full_name ?? undefined;
      }
    }

    // Fallback: expand customer from Stripe invoice
    if (!recipientEmail) {
      const stripeClient = STRIPE_KEY
        ? new Stripe(STRIPE_KEY, { apiVersion: '2026-04-22.dahlia' as never })
        : null;

      if (stripeClient && invoice.customer_email) {
        recipientEmail = invoice.customer_email;
      } else if (stripeClient && customerId) {
        try {
          const customer = await stripeClient.customers.retrieve(customerId) as Stripe.Customer;
          if (!customer.deleted) {
            recipientEmail = customer.email ?? '';
            customerName = customerName ?? customer.name ?? undefined;
          }
        } catch {
          // Customer retrieval failed — skip
        }
      }
    }

    if (!recipientEmail) {
      console.error(`No email found for invoice ${invoice.id} (customer: ${customerId})`);
      return false;
    }

    // 3. Extract line items
    const lineItems = (invoice.lines?.data ?? []).map((line: any) => ({
      description: line.description ?? 'Subscription',
      amount: line.amount,
      quantity: line.quantity ?? 1,
    }));

    // 4. Extract payment method details
    let last4 = '****';
    let brand: string | undefined;

    if (STRIPE_KEY && invoice.charge) {
      try {
        const stripeClient = new Stripe(STRIPE_KEY, { apiVersion: '2026-04-22.dahlia' as never });
        const chargeId = typeof invoice.charge === 'string' ? invoice.charge : invoice.charge.id;
        const charge = await stripeClient.charges.retrieve(chargeId);
        if (charge?.payment_method_details?.card) {
          last4 = charge.payment_method_details.card.last4;
          brand = charge.payment_method_details.card.brand;
        }
      } catch {
        // Payment details not available
      }
    }

    // 5. Build receipt data
    const receiptData: ReceiptData = {
      receiptNumber: invoice.number ?? invoice.id,
      date: new Date(invoice.created * 1000).toISOString(),
      billingPeriodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : new Date(invoice.created * 1000).toISOString(),
      billingPeriodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : new Date(invoice.created * 1000).toISOString(),
      customerName,
      customerEmail: recipientEmail,
      lineItems,
      subtotal: invoice.subtotal ?? 0,
      tax: invoice.tax ?? 0,
      total: invoice.total ?? 0,
      currency: invoice.currency ?? 'usd',
      paymentMethodLast4: last4,
      paymentMethodBrand: brand,
    };

    // 6. Render and send
    const html = renderReceiptHtml(receiptData);
    const result = await sendEmail({
      to: recipientEmail,
      subject: `Receipt ${receiptData.receiptNumber} — Unite-Hub`,
      html,
    });

    if (!result.success) {
      console.error(`Failed to send receipt for invoice ${invoice.id}: ${result.message}`);
      return false;
    }

    // 7. Log the receipt sent event for idempotency
    await admin.from('stripe_events').insert({
      stripe_event_id: `receipt_${invoice.id}_${Date.now()}`,
      type: 'receipt.sent',
      api_version: invoice.api_version ?? '2026-04-22.dahlia',
      livemode: !(STRIPE_KEY?.startsWith('sk_test_')),
      payload: {
        invoice_id: invoice.id,
        receipt_number: receiptData.receiptNumber,
        sent_to: recipientEmail,
        sent_at: new Date().toISOString(),
      } as any,
    });

    console.log(`Receipt sent for invoice ${invoice.id} to ${recipientEmail}`);
    return true;
  } catch (err) {
    console.error(`Error generating receipt for invoice ${invoice.id}:`, err);
    return false;
  }
}
