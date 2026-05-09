import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized admin client — never throws at module load time.
// The guard runs when getAdminClient() is first called (inside a request handler),
// not when the module is imported during Next.js static analysis.
let _adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');

  _adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}

// Backwards-compatible export — resolved lazily on first property access.
// Code that does `supabaseAdmin.from(...)` will trigger lazy init at call time.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getAdminClient() as Record<string | symbol, unknown>)[prop];
  },
});
