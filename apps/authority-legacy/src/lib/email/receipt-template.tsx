// src/lib/email/receipt-template.tsx
//
// React component that renders a branded HTML email receipt for Unite-Hub.
// Uses inline styles for email client compatibility.
// Rendered as a static HTML string so Next.js app-route builds avoid tracing
// server-only React rendering internals from API route code.

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ReceiptLineItem {
  description: string;
  amount: number;       // in cents
  quantity?: number;
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;                // ISO date string
  billingPeriodStart: string;  // ISO date string
  billingPeriodEnd: string;    // ISO date string
  customerName?: string;
  customerEmail: string;
  lineItems: ReceiptLineItem[];
  subtotal: number;            // in cents
  tax: number;                 // in cents
  total: number;               // in cents
  currency: string;            // e.g. 'usd'
  paymentMethodLast4: string;
  paymentMethodBrand?: string; // e.g. 'visa', 'mastercard'
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(amountCents: number, currency: string): string {
  const value = amountCents / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Render to HTML string ──────────────────────────────────────────────────────

export function renderReceiptHtml(data: ReceiptData): string {
  const brandLabel = data.paymentMethodBrand
    ? data.paymentMethodBrand.charAt(0).toUpperCase() + data.paymentMethodBrand.slice(1)
    : 'Card';
  const customerNameHtml = data.customerName
    ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="color:#94a3b8;">Billed to</span><span style="color:#e2e8f0;font-weight:500;text-align:right;">${escapeHtml(data.customerName)}</span></div>`
    : '';
  const lineItemsHtml = data.lineItems
    .map((item) => {
      const quantityHtml = item.quantity && item.quantity > 1
        ? `<span style="color:#64748b;font-size:12px;"> × ${item.quantity}</span>`
        : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;font-size:14px;"><div><span style="color:#e2e8f0;">${escapeHtml(item.description)}</span>${quantityHtml}</div><span style="color:#e2e8f0;font-weight:500;">${formatCurrency(item.amount, data.currency)}</span></div>`;
    })
    .join('');
  const taxHtml = data.tax > 0
    ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;font-size:14px;"><span style="color:#94a3b8;">Tax</span><span style="color:#e2e8f0;font-weight:500;">${formatCurrency(data.tax, data.currency)}</span></div>`
    : '';
  const componentHtml = `<div style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, Helvetica, Arial, sans-serif;color:#e2e8f0;"><div style="max-width:600px;margin:0 auto;padding:40px 20px;"><div style="font-size:24px;font-weight:700;color:#14b8a6;letter-spacing:-0.025em;margin-bottom:8px;">Unite-Hub</div><div style="font-size:13px;color:#64748b;margin-bottom:32px;">Your payment receipt</div><div style="background-color:#1e293b;border-radius:12px;padding:28px;margin-bottom:24px;border:1px solid #334155;"><h1 style="font-size:18px;font-weight:600;color:#f1f5f9;margin-bottom:16px;margin-top:0;">Receipt</h1><div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="color:#94a3b8;">Receipt #</span><span style="color:#e2e8f0;font-weight:500;text-align:right;">${escapeHtml(data.receiptNumber)}</span></div><div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="color:#94a3b8;">Date</span><span style="color:#e2e8f0;font-weight:500;text-align:right;">${formatDate(data.date)}</span></div><div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="color:#94a3b8;">Billing period</span><span style="color:#e2e8f0;font-weight:500;text-align:right;">${formatPeriod(data.billingPeriodStart, data.billingPeriodEnd)}</span></div>${customerNameHtml}<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="color:#94a3b8;">Email</span><span style="color:#e2e8f0;font-weight:500;text-align:right;">${escapeHtml(data.customerEmail)}</span></div></div><div style="background-color:#1e293b;border-radius:12px;padding:28px;margin-bottom:24px;border:1px solid #334155;"><h2 style="font-size:16px;font-weight:600;color:#f1f5f9;margin-bottom:16px;margin-top:0;">Line Items</h2>${lineItemsHtml}<div style="border:none;border-top:1px solid #334155;margin:16px 0;"></div><div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;font-size:14px;"><span style="color:#94a3b8;">Subtotal</span><span style="color:#e2e8f0;font-weight:500;">${formatCurrency(data.subtotal, data.currency)}</span></div>${taxHtml}<div style="border:none;border-top:1px solid #334155;margin:16px 0;"></div><div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;font-size:16px;font-weight:700;"><span style="color:#f1f5f9;">Total</span><span style="color:#14b8a6;font-size:20px;">${formatCurrency(data.total, data.currency)}</span></div></div><div style="background-color:#1e293b;border-radius:12px;padding:28px;margin-bottom:24px;border:1px solid #334155;"><h2 style="font-size:16px;font-weight:600;color:#f1f5f9;margin-bottom:16px;margin-top:0;">Payment Method</h2><div style="display:inline-block;background-color:#1e293b;border:1px solid #334155;border-radius:6px;padding:8px 12px;font-size:14px;color:#e2e8f0;">${escapeHtml(brandLabel)} •••• ${escapeHtml(data.paymentMethodLast4)}</div></div><div style="text-align:center;font-size:12px;color:#64748b;padding-top:16px;line-height:1.6;"><p>Questions? Contact us at <a href="mailto:support@unite-group.com" style="color:#14b8a6;text-decoration:none;">support@unite-group.com</a></p><p>Unite-Hub &middot; Unite Group<br />This is an automated receipt. Please do not reply to this email.</p><p><a href="{{unsubscribeUrl}}" style="color:#14b8a6;text-decoration:none;">Unsubscribe from receipt emails</a></p></div></div></div>`;

  // Wrap in a full HTML document with DOCTYPE for email clients
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unite-Hub Receipt</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .fallback { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0f172a;">
${componentHtml}
</body>
</html>`;
}
