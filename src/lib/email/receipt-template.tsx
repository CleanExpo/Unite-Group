// src/lib/email/receipt-template.tsx
//
// React component that renders a branded HTML email receipt for Unite-Hub.
// Uses inline styles for email client compatibility.
// Rendered as a static HTML string so Next.js app-route builds do not import
// react-dom/server from route code.

import React from 'react';
import { renderToString } from 'react-dom/server';

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

// ── Styles (inline for email compat) ──────────────────────────────────────────

const S = {
  body: {
    margin: '0',
    padding: '0',
    backgroundColor: '#0f172a', // slate-950
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#e2e8f0',           // slate-200
  } as React.CSSProperties,
  wrapper: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
  } as React.CSSProperties,
  logo: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#14b8a6',           // teal-500
    letterSpacing: '-0.025em',
    marginBottom: '8px',
  } as React.CSSProperties,
  tagline: {
    fontSize: '13px',
    color: '#64748b',           // slate-500
    marginBottom: '32px',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#1e293b', // slate-800
    borderRadius: '12px',
    padding: '28px',
    marginBottom: '24px',
    border: '1px solid #334155', // slate-700
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#f1f5f9',           // slate-100
    marginBottom: '16px',
    marginTop: '0',
  } as React.CSSProperties,
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  } as React.CSSProperties,
  metaLabel: {
    color: '#94a3b8',           // slate-400
  } as React.CSSProperties,
  metaValue: {
    color: '#e2e8f0',           // slate-200
    fontWeight: 500,
    textAlign: 'right' as const,
  } as React.CSSProperties,
  divider: {
    border: 'none',
    borderTop: '1px solid #334155',
    margin: '16px 0',
  } as React.CSSProperties,
  lineItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    fontSize: '14px',
  } as React.CSSProperties,
  lineItemDesc: {
    color: '#e2e8f0',
  } as React.CSSProperties,
  lineItemQty: {
    color: '#64748b',
    fontSize: '12px',
  } as React.CSSProperties,
  lineItemAmount: {
    color: '#e2e8f0',
    fontWeight: 500,
  } as React.CSSProperties,
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    fontSize: '16px',
    fontWeight: 700,
  } as React.CSSProperties,
  totalAmount: {
    color: '#14b8a6',           // teal-500
    fontSize: '20px',
  } as React.CSSProperties,
  paymentBadge: {
    display: 'inline-block',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#e2e8f0',
  } as React.CSSProperties,
  footer: {
    textAlign: 'center' as const,
    fontSize: '12px',
    color: '#64748b',           // slate-500
    paddingTop: '16px',
    lineHeight: '1.6',
  } as React.CSSProperties,
  footerLink: {
    color: '#14b8a6',
    textDecoration: 'none',
  } as React.CSSProperties,
};

// ── Component ──────────────────────────────────────────────────────────────────

export function ReceiptEmail({ data }: { data: ReceiptData }) {
  const {
    receiptNumber,
    date,
    billingPeriodStart,
    billingPeriodEnd,
    customerName,
    customerEmail,
    lineItems,
    subtotal,
    tax,
    total,
    currency,
    paymentMethodLast4,
    paymentMethodBrand,
  } = data;

  const brandLabel = paymentMethodBrand
    ? paymentMethodBrand.charAt(0).toUpperCase() + paymentMethodBrand.slice(1)
    : 'Card';

  return (
    <div style={S.body}>
      <div style={S.wrapper}>
        {/* Logo / Brand */}
        <div style={S.logo}>Unite-Hub</div>
        <div style={S.tagline}>Your payment receipt</div>

        {/* Receipt details card */}
        <div style={S.card}>
          <h1 style={S.sectionTitle}>Receipt</h1>

          <div style={S.metaRow}>
            <span style={S.metaLabel}>Receipt #</span>
            <span style={S.metaValue}>{receiptNumber}</span>
          </div>
          <div style={S.metaRow}>
            <span style={S.metaLabel}>Date</span>
            <span style={S.metaValue}>{formatDate(date)}</span>
          </div>
          <div style={S.metaRow}>
            <span style={S.metaLabel}>Billing period</span>
            <span style={S.metaValue}>{formatPeriod(billingPeriodStart, billingPeriodEnd)}</span>
          </div>
          {customerName && (
            <div style={S.metaRow}>
              <span style={S.metaLabel}>Billed to</span>
              <span style={S.metaValue}>{customerName}</span>
            </div>
          )}
          <div style={S.metaRow}>
            <span style={S.metaLabel}>Email</span>
            <span style={S.metaValue}>{customerEmail}</span>
          </div>
        </div>

        {/* Line items card */}
        <div style={S.card}>
          <h2 style={{ ...S.sectionTitle, fontSize: '16px' }}>Line Items</h2>

          {lineItems.map((item, i) => (
            <div key={i} style={S.lineItemRow}>
              <div>
                <span style={S.lineItemDesc}>{item.description}</span>
                {item.quantity && item.quantity > 1 && (
                  <span style={S.lineItemQty}> × {item.quantity}</span>
                )}
              </div>
              <span style={S.lineItemAmount}>
                {formatCurrency(item.amount, currency)}
              </span>
            </div>
          ))}

          <div style={S.divider} />

          {/* Subtotal */}
          <div style={S.lineItemRow}>
            <span style={S.metaLabel}>Subtotal</span>
            <span style={S.lineItemAmount}>{formatCurrency(subtotal, currency)}</span>
          </div>

          {/* Tax */}
          {tax > 0 && (
            <div style={S.lineItemRow}>
              <span style={S.metaLabel}>Tax</span>
              <span style={S.lineItemAmount}>{formatCurrency(tax, currency)}</span>
            </div>
          )}

          <div style={S.divider} />

          {/* Total */}
          <div style={S.totalRow}>
            <span style={{ color: '#f1f5f9' }}>Total</span>
            <span style={S.totalAmount}>{formatCurrency(total, currency)}</span>
          </div>
        </div>

        {/* Payment method card */}
        <div style={S.card}>
          <h2 style={{ ...S.sectionTitle, fontSize: '16px' }}>Payment Method</h2>
          <div style={S.paymentBadge}>
            {brandLabel} •••• {paymentMethodLast4}
          </div>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:support@unite-group.com" style={S.footerLink}>
              support@unite-group.com
            </a>
          </p>
          <p>
            Unite-Hub &middot; Unite Group<br />
            This is an automated receipt. Please do not reply to this email.
          </p>
          <p>
            <a href="{{unsubscribeUrl}}" style={S.footerLink}>
              Unsubscribe from receipt emails
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Render to HTML string ──────────────────────────────────────────────────────

export function renderReceiptHtml(data: ReceiptData): string {
  const componentHtml = renderToString(<ReceiptEmail data={data} />);

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
