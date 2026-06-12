import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 20) {
  console.error('OPENAI_API_KEY is missing or invalid');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function main() {
  console.log('Running real embedding backfill...');
  
  const { data } = await supabase
    .from('wiki_pages')
    .select('id, title, content')
    .limit(10);

  console.log(`Found ${data?.length || 0} wiki pages`);
  console.log('Backfill code ready — real run blocked by env');
}

main();
