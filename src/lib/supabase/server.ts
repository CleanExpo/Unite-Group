import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = 'https://lksfwktwtmyznckodsau.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc2Z3a3R3dG15em5ja29kc2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MTE1MDksImV4cCI6MjA3ODQ4NzUwOX0.l2KIokOpdMAUFXR9rnFqyIt9zH2hdFX8eHc-oi-UtTw';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
    {
      cookies: {
        // getAll() is required for chunked cookie support (@supabase/ssr ≥ 0.5)
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — safe to ignore
          }
        },
      },
    }
  );
}

// Legacy alias
export { createClient as createServerClientAlias };
