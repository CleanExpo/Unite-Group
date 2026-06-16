import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const DELIVERABLE_ID = 'ccw-service-busy-2026-06-12';
const DELIVERABLE_TITLE = 'CCW Service Department Busy — 3-Lane Approval';
const NOTIFIED_EMAIL = 'contact@ccw.com.au';
const MAGIC_LINK_BASE = 'https://unite-group.com.au/approvals/ccw-service-busy-2026-06-12';

const deliverableBody = {
  client: 'CCW',
  contact: 'Toby',
  lanes: [
    {
      lane_id: 'lane-1',
      title: 'Operational brief',
      what_is_this: 'Workshop capacity, service baseline, and the operating numbers Toby needs to confirm before any public work starts.',
      source_doc: 'CCW-SERVICE-OPERATIONAL-BRIEF',
    },
    {
      lane_id: 'lane-2',
      title: 'Landing copy',
      what_is_this: 'The servicing landing page copy that will be implemented in the CCW CRM app once Toby signs off.',
      source_doc: 'CCW-SERVICING-LANDING-COPY',
    },
    {
      lane_id: 'lane-3',
      title: 'Content calendar',
      what_is_this: 'The 6-week content plan that needs Phill’s human brand-voice gate before Synthex queues it.',
      source_doc: 'CCW-SERVICE-CONTENT-CALENDAR',
    },
  ],
};

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function randomUrlSafeToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

async function main() {
  // Accept either the prod-app env names (from .env.local) OR the agent-vault names.
  // This way Phill can run the script with no env overrides if .env.local is loaded.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Vercel CLI's `vercel env pull` wraps values in double-quotes; strip them so the JWT is valid.
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^"|"$/g, '').trim();
  const founderId = process.env.CCW_FOUNDER_ID || process.env.FOUNDER_USER_ID;
  if (!url || !serviceRoleKey || !founderId) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, or CCW_FOUNDER_ID (or FOUNDER_USER_ID). Load .env.local or set the env vars explicitly.');
  }
  if (serviceRoleKey.length < 100) {
    throw new Error(`SUPABASE_SERVICE_ROLE_KEY looks wrong: length ${serviceRoleKey.length} (expected 200+). Re-check the value.`);
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const token = randomUrlSafeToken();
  const tokenHash = sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const row = {
    client_slug: 'ccw-crm',
    deliverable_id: DELIVERABLE_ID,
    deliverable_title: DELIVERABLE_TITLE,
    deliverable_body: deliverableBody,
    token,
    token_hash: tokenHash,
    status: 'pending',
    notified_email: NOTIFIED_EMAIL,
    notified_at: now.toISOString(),
    expires_at: expiresAt,
    created_by: founderId,
  };

  // DRY RUN: --dry-run flag prints the row + would-be magic link, does NOT insert.
  // Use this to verify env vars + connectivity without writing to prod.
  if (process.argv.includes('--dry-run')) {
    console.log('--- DRY RUN — no DB write will occur ---');
    console.log(`URL:        ${url}`);
    console.log(`Key length: ${serviceRoleKey.length}`);
    console.log(`Founder ID: ${founderId}`);
    console.log(`Token:      ${token.slice(0, 12)}...${token.slice(-8)} (len ${token.length})`);
    console.log(`Token hash: ${tokenHash.slice(0, 16)}...`);
    console.log(`Expires:    ${expiresAt}`);
    console.log(`Row preview (excludes token):`);
    const { token: _t, ...safe } = row;
    console.log(JSON.stringify(safe, null, 2));

    // Smoke-test the connection: a SELECT against client_approvals (read-only).
    const { data, error: pingError } = await supabase
      .from('client_approvals')
      .select('id')
      .limit(1);
    if (pingError) {
      console.error(`\n!!! Connection test FAILED: ${pingError.message}`);
      console.error('!!! Aborting — env vars are reachable but the key/URL pair is invalid.');
      process.exit(2);
    }
    console.log(`\n--- DRY RUN OK — connection verified, table 'client_approvals' reachable (${data?.length ?? 0} existing rows visible) ---`);
    console.log(`Would have inserted with magic link: ${MAGIC_LINK_BASE}/${token}`);
    return;
  }

  const { error } = await supabase.from('client_approvals').insert(row);
  if (error) throw error;

  console.log(`${MAGIC_LINK_BASE}/${token}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
