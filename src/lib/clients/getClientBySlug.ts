/**
 * SYN-512: Client Authority Hub — Supabase fetch by slug
 * Uses service role client for compatibility with generateStaticParams.
 */
import { createClient } from '@supabase/supabase-js';

export interface ClientRecord {
  id: string;
  slug: string;
  name: string;
  business_name: string;
  industry: string;
  phone: string | null;
  website_url: string | null;
  address_street: string | null;
  address_suburb: string | null;
  address_state: string | null;
  address_postcode: string | null;
  address_country: string;
  geo_lat: number | null;
  geo_lng: number | null;
  opening_hours_json: string[] | null; // e.g. ["Mo-Fr 09:00-17:00"]
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export async function getClientBySlug(slug: string): Promise<ClientRecord | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as ClientRecord;
}
