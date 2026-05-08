'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

const SUPABASE_URL = 'https://lksfwktwtmyznckodsau.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc2Z3a3R3dG15em5ja29kc2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MTE1MDksImV4cCI6MjA3ODQ4NzUwOX0.l2KIokOpdMAUFXR9rnFqyIt9zH2hdFX8eHc-oi-UtTw';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
  );
}

export const supabaseClient = createClient();
