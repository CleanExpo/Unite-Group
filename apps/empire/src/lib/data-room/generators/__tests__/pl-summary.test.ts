import {
  buildPlSummary,
  type StripeInvoiceMonthRow,
  type StripeSubscriptionRow,
} from '../pl-summary';

const AS_OF = '2026-05-18T00:00:00.000Z';

function sub(
  overrides: Partial<StripeSubscriptionRow> = {},
): StripeSubscriptionRow {
  return {
    id: 'sub_test',
    customer_id: 'cus_test',
    status: 'active',
    monthly_amount_aud: 100,
    ...overrides,
  };
}

function month(
  yyyymm: string,
  overrides: Partial<StripeInvoiceMonthRow> = {},
): StripeInvoiceMonthRow {
  return {
    yyyymm,
    total_aud: 0,
    paid_aud: 0,
    outstanding_aud: 0,
    ...overrides,
  };
}

describe('buildPlSummary', () => {
  it('returns zero MRR/ARR with empty inputs', () => {
    const out = buildPlSummary([], [], AS_OF);
    expect(out.mrr_aud).toBe(0);
    expect(out.arr_aud).toBe(0);
    expect(out.active_subscription_count).toBe(0);
    expect(out.monthly_revenue).toEqual([]);
    expect(out.trailing_3mo_avg_paid_aud).toBe(0);
  });

  it('counts active + trialing + past_due as MRR contributors', () => {
    const out = buildPlSummary(
      [
        sub({ status: 'active', monthly_amount_aud: 100 }),
        sub({ status: 'trialing', monthly_amount_aud: 50 }),
        sub({ status: 'past_due', monthly_amount_aud: 25 }),
        sub({ status: 'canceled', monthly_amount_aud: 999 }),
        sub({ status: 'incomplete_expired', monthly_amount_aud: 999 }),
      ],
      [],
      AS_OF,
    );
    expect(out.active_subscription_count).toBe(3);
    expect(out.mrr_aud).toBe(175);
    expect(out.arr_aud).toBe(2100);
  });

  it('coerces string and null monthly_amount_aud safely', () => {
    const out = buildPlSummary(
      [
        sub({ monthly_amount_aud: '100.50' }),
        sub({ monthly_amount_aud: null }),
        sub({ monthly_amount_aud: 'garbage' }),
      ],
      [],
      AS_OF,
    );
    expect(out.mrr_aud).toBe(100.5);
  });

  it('sorts monthly_revenue oldest → newest by yyyymm', () => {
    const out = buildPlSummary(
      [],
      [
        month('202604', { paid_aud: 200 }),
        month('202602', { paid_aud: 100 }),
        month('202605', { paid_aud: 300 }),
        month('202603', { paid_aud: 150 }),
      ],
      AS_OF,
    );
    expect(out.monthly_revenue.map((m) => m.yyyymm)).toEqual([
      '202602',
      '202603',
      '202604',
      '202605',
    ]);
  });

  it('averages paid_aud over the trailing 3 months', () => {
    const out = buildPlSummary(
      [],
      [
        month('202602', { paid_aud: 100 }),
        month('202603', { paid_aud: 200 }),
        month('202604', { paid_aud: 300 }),
        month('202605', { paid_aud: 600 }),
      ],
      AS_OF,
    );
    // Trailing 3 = 202603..202605 → (200+300+600)/3 = 366.67
    expect(out.trailing_3mo_avg_paid_aud).toBe(366.67);
  });

  it('handles fewer than 3 months of history', () => {
    const out = buildPlSummary(
      [],
      [
        month('202604', { paid_aud: 400 }),
        month('202605', { paid_aud: 600 }),
      ],
      AS_OF,
    );
    expect(out.trailing_3mo_avg_paid_aud).toBe(500);
  });

  it('sums outstanding_aud across the full trail', () => {
    const out = buildPlSummary(
      [],
      [
        month('202603', { outstanding_aud: 100 }),
        month('202604', { outstanding_aud: '50.50' }),
        month('202605', { outstanding_aud: 25 }),
      ],
      AS_OF,
    );
    expect(out.outstanding_total_aud).toBe(175.5);
  });

  it('leaves burn_aud_per_month and runway_months null (no OPEX source yet)', () => {
    const out = buildPlSummary(
      [sub({ monthly_amount_aud: 1000 })],
      [month('202605', { paid_aud: 1000 })],
      AS_OF,
    );
    expect(out.burn_aud_per_month).toBeNull();
    expect(out.runway_months).toBeNull();
  });

  it('rounds money to 2 decimal places', () => {
    const out = buildPlSummary(
      [sub({ monthly_amount_aud: 33.333 })],
      [month('202605', { paid_aud: 99.999 })],
      AS_OF,
    );
    expect(out.mrr_aud).toBe(33.33);
    expect(out.arr_aud).toBe(400);
    expect(out.monthly_revenue[0].revenue_paid_aud).toBe(100);
  });
});
