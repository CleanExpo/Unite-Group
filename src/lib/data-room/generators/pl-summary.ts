// P&L summary generator (UNI-1985, DataRoom 3/7).
//
// The ticket spec says "read public.financial_records" but that table does
// not exist yet (Xero connector ticket is downstream). Until it does, we
// derive a P&L from the two integration tables that ARE live and that
// every other empire dashboard reads:
//
//   public.integration_stripe_subscriptions  — active recurring revenue
//   public.integration_stripe_invoices_mtd   — one row per month with
//                                              total/paid/outstanding AUD
//
// When `financial_records` lands we add it as an additional input rather
// than replacing this — Stripe will always be the source of truth for
// recurring revenue.
//
// Pure function: no I/O. The route handler does the Supabase reads and the
// data_room_documents insert; this file is the maths so it can be tested
// in isolation.

export interface StripeSubscriptionRow {
  id: string;
  customer_id: string;
  status: string | null;
  monthly_amount_aud: number | string | null;
}

export interface StripeInvoiceMonthRow {
  yyyymm: string;                 // '202605'
  total_aud: number | string | null;
  paid_aud: number | string | null;
  outstanding_aud: number | string | null;
}

export interface PlMonth {
  yyyymm: string;
  revenue_total_aud: number;
  revenue_paid_aud: number;
  revenue_outstanding_aud: number;
}

export interface PlSummaryPayload {
  generated_at: string;
  as_of: string;
  /** Sum of monthly_amount_aud across active subscriptions. */
  mrr_aud: number;
  /** mrr_aud × 12. */
  arr_aud: number;
  /** Number of active subscriptions feeding MRR. */
  active_subscription_count: number;
  /** Monthly invoiced revenue trail (oldest → newest). */
  monthly_revenue: PlMonth[];
  /**
   * Average paid revenue across the most recent 3 months (or fewer if the
   * history is shorter). Used as the proxy for monthly cash receipts.
   */
  trailing_3mo_avg_paid_aud: number;
  /** Sum of outstanding_aud across all months in the trail. */
  outstanding_total_aud: number;
  /**
   * Burn/runway are intentionally `null` here — they require an OPEX
   * source we don't have yet (Xero bills, payroll). The shape leaves the
   * key so UNI-1989's renderer doesn't have to special-case its presence.
   */
  burn_aud_per_month: number | null;
  runway_months: number | null;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<string>([
  'active',
  'trialing',
  'past_due', // still billing; count it
]);

export function buildPlSummary(
  subscriptions: StripeSubscriptionRow[],
  invoiceMonths: StripeInvoiceMonthRow[],
  asOf: string,
): PlSummaryPayload {
  const activeSubs = subscriptions.filter(
    (s) => s.status !== null && ACTIVE_SUBSCRIPTION_STATUSES.has(s.status),
  );
  const mrr_aud = activeSubs.reduce(
    (acc, s) => acc + toNumber(s.monthly_amount_aud),
    0,
  );

  const monthly_revenue: PlMonth[] = [...invoiceMonths]
    .sort((a, b) => (a.yyyymm < b.yyyymm ? -1 : a.yyyymm > b.yyyymm ? 1 : 0))
    .map((row) => ({
      yyyymm: row.yyyymm,
      revenue_total_aud: round2(toNumber(row.total_aud)),
      revenue_paid_aud: round2(toNumber(row.paid_aud)),
      revenue_outstanding_aud: round2(toNumber(row.outstanding_aud)),
    }));

  const lastThree = monthly_revenue.slice(-3);
  const trailing_3mo_avg_paid_aud =
    lastThree.length === 0
      ? 0
      : round2(
          lastThree.reduce((acc, m) => acc + m.revenue_paid_aud, 0) /
            lastThree.length,
        );

  const outstanding_total_aud = round2(
    monthly_revenue.reduce((acc, m) => acc + m.revenue_outstanding_aud, 0),
  );

  return {
    generated_at: asOf,
    as_of: asOf,
    mrr_aud: round2(mrr_aud),
    arr_aud: round2(mrr_aud * 12),
    active_subscription_count: activeSubs.length,
    monthly_revenue,
    trailing_3mo_avg_paid_aud,
    outstanding_total_aud,
    burn_aud_per_month: null,
    runway_months: null,
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
