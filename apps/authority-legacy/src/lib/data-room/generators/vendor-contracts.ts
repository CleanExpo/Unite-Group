// Vendor contracts inventory generator (UNI-1986, DataRoom 4/7).
//
// Ticket spec: aggregate vendor contracts from Stripe (subscriptions), Xero
// (bills), and Supabase tables (client_invoices, contracts if present).
//
// Today only Stripe is connected — Xero connector and client_invoices /
// contracts tables don't exist yet. This generator builds the structure
// from Stripe and leaves the shape stable so additional sources (when they
// land) only need to push into the `vendors` array.
//
// Pure function: no I/O. The route does the Supabase read + insert into
// data_room_documents with kind='vendor_contracts'.

export interface StripeSubscriptionWithProductRow {
  id: string;
  customer_id: string;
  status: string | null;
  monthly_amount_aud: number | string | null;
  product_name: string | null;
  current_period_end: string | null;
}

export type VendorSource = 'stripe' | 'xero' | 'supabase_invoices' | 'supabase_contracts';

export interface VendorRecord {
  source: VendorSource;
  source_id: string;
  vendor_name: string;
  monthly_cost_aud: number;
  status: string;
  renewal_date: string | null;
  contract_doc_url: string | null;
}

export interface VendorContractsPayload {
  generated_at: string;
  as_of: string;
  vendor_count: number;
  total_monthly_cost_aud: number;
  /** Sources we expected to read; populated with what actually contributed. */
  sources_present: VendorSource[];
  /** Sources spec'd but not yet wired (Xero + Supabase contracts). */
  sources_missing: VendorSource[];
  vendors: VendorRecord[];
}

const ACTIVE_STATUSES = new Set<string>([
  'active',
  'trialing',
  'past_due',
]);

/**
 * Build the vendor-contracts payload from whatever sources are live.
 * Sources are passed individually so the function stays pure; the route
 * decides which Supabase reads succeeded.
 */
export function buildVendorContracts(
  stripeSubscriptions: StripeSubscriptionWithProductRow[],
  asOf: string,
): VendorContractsPayload {
  const sourcesPresent: VendorSource[] = [];
  const sourcesMissing: VendorSource[] = ['xero', 'supabase_invoices', 'supabase_contracts'];
  const vendors: VendorRecord[] = [];

  if (stripeSubscriptions.length > 0) {
    sourcesPresent.push('stripe');
  }

  for (const sub of stripeSubscriptions) {
    if (!sub.status || !ACTIVE_STATUSES.has(sub.status)) continue;
    vendors.push({
      source: 'stripe',
      source_id: sub.id,
      vendor_name: sub.product_name?.trim() || `Stripe subscription ${sub.id}`,
      monthly_cost_aud: round2(toNumber(sub.monthly_amount_aud)),
      status: sub.status,
      renewal_date: sub.current_period_end,
      contract_doc_url: null,
    });
  }

  // Sort by monthly cost desc — largest vendor first is what the operator
  // wants to see when scanning the data-room export.
  vendors.sort((a, b) => b.monthly_cost_aud - a.monthly_cost_aud);

  const totalMonthly = vendors.reduce((acc, v) => acc + v.monthly_cost_aud, 0);

  return {
    generated_at: asOf,
    as_of: asOf,
    vendor_count: vendors.length,
    total_monthly_cost_aud: round2(totalMonthly),
    sources_present: sourcesPresent,
    sources_missing: sourcesMissing,
    vendors,
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
