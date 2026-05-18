import {
  buildVendorContracts,
  type StripeSubscriptionWithProductRow,
} from '../vendor-contracts';

const AS_OF = '2026-05-18T00:00:00.000Z';

function sub(
  overrides: Partial<StripeSubscriptionWithProductRow> = {},
): StripeSubscriptionWithProductRow {
  return {
    id: 'sub_test',
    customer_id: 'cus_test',
    status: 'active',
    monthly_amount_aud: 100,
    product_name: 'Test Vendor',
    current_period_end: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildVendorContracts', () => {
  it('returns an empty inventory with no inputs', () => {
    const out = buildVendorContracts([], AS_OF);
    expect(out.vendor_count).toBe(0);
    expect(out.total_monthly_cost_aud).toBe(0);
    expect(out.vendors).toEqual([]);
    expect(out.sources_present).toEqual([]);
  });

  it('marks Xero and Supabase contract sources as missing until they land', () => {
    const out = buildVendorContracts([sub()], AS_OF);
    expect(out.sources_missing).toEqual([
      'xero',
      'supabase_invoices',
      'supabase_contracts',
    ]);
  });

  it('reports stripe as present when stripe rows arrive (even if all filtered)', () => {
    const out = buildVendorContracts([sub({ status: 'canceled' })], AS_OF);
    expect(out.sources_present).toEqual(['stripe']);
    expect(out.vendor_count).toBe(0);
  });

  it('only emits active+trialing+past_due subscriptions', () => {
    const out = buildVendorContracts(
      [
        sub({ id: 's1', status: 'active' }),
        sub({ id: 's2', status: 'trialing' }),
        sub({ id: 's3', status: 'past_due' }),
        sub({ id: 's4', status: 'canceled' }),
        sub({ id: 's5', status: 'incomplete_expired' }),
      ],
      AS_OF,
    );
    expect(out.vendors.map((v) => v.source_id).sort()).toEqual(['s1', 's2', 's3']);
  });

  it('sorts vendors by monthly cost descending', () => {
    const out = buildVendorContracts(
      [
        sub({ id: 's_small', monthly_amount_aud: 25 }),
        sub({ id: 's_big', monthly_amount_aud: 500 }),
        sub({ id: 's_mid', monthly_amount_aud: 100 }),
      ],
      AS_OF,
    );
    expect(out.vendors.map((v) => v.source_id)).toEqual([
      's_big',
      's_mid',
      's_small',
    ]);
  });

  it('falls back to a synthetic vendor name when product_name is missing', () => {
    const out = buildVendorContracts(
      [
        sub({ id: 'sub_123', product_name: null }),
        sub({ id: 'sub_456', product_name: '  ' }),
      ],
      AS_OF,
    );
    expect(out.vendors[0].vendor_name).toMatch(/^Stripe subscription sub_/);
    expect(out.vendors[1].vendor_name).toMatch(/^Stripe subscription sub_/);
  });

  it('passes the renewal date straight through from current_period_end', () => {
    const out = buildVendorContracts(
      [sub({ current_period_end: '2026-12-31T23:59:59.000Z' })],
      AS_OF,
    );
    expect(out.vendors[0].renewal_date).toBe('2026-12-31T23:59:59.000Z');
  });

  it('coerces string + null monthly_amount_aud safely', () => {
    const out = buildVendorContracts(
      [
        sub({ id: 's1', monthly_amount_aud: '250.50' }),
        sub({ id: 's2', monthly_amount_aud: null }),
        sub({ id: 's3', monthly_amount_aud: 'garbage' }),
      ],
      AS_OF,
    );
    expect(out.total_monthly_cost_aud).toBe(250.5);
    expect(out.vendors.find((v) => v.source_id === 's2')!.monthly_cost_aud).toBe(0);
  });

  it('leaves contract_doc_url null on every Stripe vendor (no contract source yet)', () => {
    const out = buildVendorContracts(
      [sub({ id: 's1' }), sub({ id: 's2' })],
      AS_OF,
    );
    for (const v of out.vendors) {
      expect(v.contract_doc_url).toBeNull();
    }
  });

  it('rounds money to 2 decimal places', () => {
    const out = buildVendorContracts(
      [sub({ monthly_amount_aud: 33.333 })],
      AS_OF,
    );
    expect(out.vendors[0].monthly_cost_aud).toBe(33.33);
    expect(out.total_monthly_cost_aud).toBe(33.33);
  });
});
