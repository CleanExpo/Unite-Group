// Server-only helper that lists every nexus_clients row for the
// /empire/clients index page (UNI-1995 follow-up). Bypasses requireAdmin
// — calling page is admin-gated.

import { getAdminClient } from '@/lib/supabase/admin';
import { normalizeBrandConfig, type BrandConfig } from '@/types/brand-config';

export type NexusClientStatus = 'active' | 'paused' | 'churned' | 'onboarding';

export interface NexusClientRow {
  id: string;
  slug: string;
  company_name: string;
  status: NexusClientStatus;
  contact_email: string | null;
  website_url: string | null;
  onboarded_at: string | null;
  created_at: string;
  brand_config: BrandConfig;
}

export interface ListNexusClientsResult {
  clients: NexusClientRow[];
  fetchedAt: string;
}

export async function listNexusClients(): Promise<ListNexusClientsResult | null> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('nexus_clients')
      .select('id, slug, company_name, status, contact_email, website_url, onboarded_at, created_at, brand_config')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return null;

    const rows = (data ?? []) as Array<Omit<NexusClientRow, 'brand_config'> & { brand_config: unknown }>;
    const clients: NexusClientRow[] = rows.map((r) => ({
      ...r,
      brand_config: normalizeBrandConfig(r.brand_config),
    }));

    return {
      clients,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
