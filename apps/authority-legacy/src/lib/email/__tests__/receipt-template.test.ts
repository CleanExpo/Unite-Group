import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderReceiptHtml, type ReceiptData } from '../receipt-template';

function sampleReceipt(overrides: Partial<ReceiptData> = {}): ReceiptData {
  return {
    receiptNumber: 'R-1001',
    date: '2026-05-31T12:00:00.000Z',
    billingPeriodStart: '2026-05-01T00:00:00.000Z',
    billingPeriodEnd: '2026-05-31T23:59:59.000Z',
    customerName: 'Acme <Ops>',
    customerEmail: 'billing@example.com',
    lineItems: [
      { description: 'CRM Command Spine', amount: 12500, quantity: 2 },
    ],
    subtotal: 25000,
    tax: 5000,
    total: 30000,
    currency: 'usd',
    paymentMethodLast4: '4242',
    paymentMethodBrand: 'visa',
    ...overrides,
  };
}

describe('receipt-template route build compatibility', () => {
  it('keeps route-imported receipt rendering free of react-dom/server', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/email/receipt-template.tsx'), 'utf8');

    expect(source).not.toContain('react-dom/server');
    expect(source).not.toContain('renderToString');
  });

  it('renders a full receipt HTML document without leaking raw customer markup', () => {
    const html = renderReceiptHtml(sampleReceipt());

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Unite-Hub Receipt');
    expect(html).toContain('R-1001');
    expect(html).toContain('CRM Command Spine');
    expect(html).toContain('$300.00');
    expect(html).toContain('Visa');
    expect(html).toContain('•••• 4242');
    expect(html).toContain('Acme &lt;Ops&gt;');
    expect(html).not.toContain('Acme <Ops>');
  });
});
