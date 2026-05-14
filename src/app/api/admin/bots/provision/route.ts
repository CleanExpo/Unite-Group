// @ts-nocheck
// POST /api/admin/bots/provision
//
// Enqueues a new ContextBot for the swarm to provision. Inserts a row into
// public.context_bots with provision_status='pending' — the Pi-CEO swarm worker
// (swarm/inbox/provisioner.py) picks it up, drives BotFather via Chrome MCP,
// captures the token, and emails the t.me/<bot> link to the client.
//
// Auth: caller's Supabase session email must be in ALLOWED_ADMINS.
//
// Body shape (all required unless noted):
//   {
//     kind: 'portfolio' | 'client' | 'partner',
//     brand: 'pi-ceo' | 'unite-group',
//     context_id: string,                  // slug, e.g. 'ccw'
//     context_label: string,               // display, e.g. 'CCW'
//     client_email?: string,               // recipient of t.me/<bot> link
//     client_display_name?: string,        // 'Toby Carstairs'
//     linear_team_key?: string,
//     wiki_section?: string,
//     greeting_template?: string,
//     authorized_chat_ids?: number[],
//   }
//
// Returns 201 { id, bot_username_hint, status: 'pending' }
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ALLOWED_ADMINS = new Set<string>([
  'contact@unite-group.in',
  'phill.mcgurk@gmail.com',
]);

const KIND_VALUES = new Set(['portfolio', 'client', 'partner']);
const BRAND_VALUES = new Set(['pi-ceo', 'unite-group']);
const CONTEXT_ID_RE = /^[a-z0-9][a-z0-9-]{1,30}$/;

function slugToBotUsernameHint(kind: string, brand: string, contextId: string): string {
  // The actual bot username is decided by the swarm worker when it drives
  // BotFather; this is just the slug we'll *attempt* to register first.
  const pascalContext = contextId
    .split('-')
    .filter(Boolean)
    .map(s => s[0].toUpperCase() + s.slice(1))
    .join('');
  const prefix = brand === 'unite-group' ? 'UniteGroup' : 'PiCeo';
  return `${prefix}${pascalContext}Bot`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — must be a signed-in admin
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json(
        { error: 'unauthorized — sign in required' },
        { status: 401 }
      );
    }
    if (!user.email || !ALLOWED_ADMINS.has(user.email)) {
      return NextResponse.json(
        { error: 'forbidden — admin access only' },
        { status: 403 }
      );
    }

    // 2. Validate body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
    }
    const {
      kind, brand, context_id, context_label,
      client_email, client_display_name,
      linear_team_key, wiki_section,
      greeting_template, authorized_chat_ids,
    } = body;

    if (!KIND_VALUES.has(kind)) {
      return NextResponse.json({ error: `kind must be one of: ${[...KIND_VALUES].join(',')}` }, { status: 400 });
    }
    if (!BRAND_VALUES.has(brand)) {
      return NextResponse.json({ error: `brand must be one of: ${[...BRAND_VALUES].join(',')}` }, { status: 400 });
    }
    if (typeof context_id !== 'string' || !CONTEXT_ID_RE.test(context_id)) {
      return NextResponse.json({ error: 'context_id must be a 2-31 char lowercase slug' }, { status: 400 });
    }
    if (typeof context_label !== 'string' || context_label.length < 1 || context_label.length > 60) {
      return NextResponse.json({ error: 'context_label must be 1-60 chars' }, { status: 400 });
    }
    if (kind === 'client' && (!client_email || typeof client_email !== 'string')) {
      return NextResponse.json({ error: 'client_email required for kind=client' }, { status: 400 });
    }

    const botUsernameHint = slugToBotUsernameHint(kind, brand, context_id);

    // 3. Insert pending row with service-role client (bypasses RLS for admin
    // operations — auth gate above ensures only Phill can hit this)
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('context_bots')
      .insert({
        bot_username: botUsernameHint,
        bot_token: 'pending-provision',  // overwritten by worker once minted
        kind,
        brand,
        context_id,
        context_label,
        linear_team_key: linear_team_key || null,
        wiki_section: wiki_section || null,
        greeting_template:
          greeting_template
          || `Got it. Filed to ${context_label}. I'll start working on it now and ping back.`,
        authorized_chat_ids: Array.isArray(authorized_chat_ids) ? authorized_chat_ids : [],
        intake_enabled: kind !== 'function',
        provision_status: 'pending',
        client_email: client_email || null,
        client_display_name: client_display_name || null,
        metadata: {
          enqueued_by: user.email,
          enqueued_at: new Date().toISOString(),
        },
      })
      .select('id,bot_username,provision_status,context_id')
      .single();

    if (error) {
      const conflict = error.message?.toLowerCase().includes('duplicate');
      return NextResponse.json(
        { error: error.message, code: conflict ? 'conflict' : 'insert_failed' },
        { status: conflict ? 409 : 500 }
      );
    }

    return NextResponse.json(
      {
        id: data.id,
        bot_username_hint: data.bot_username,
        context_id: data.context_id,
        status: data.provision_status,
        next: 'The Pi-CEO swarm will mint this bot via BotFather and email the t.me link within 5 minutes.',
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: 'unexpected', detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}

// GET /api/admin/bots/provision — list pending provisions (handy for the worker
// and for the admin UI to poll status).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !ALLOWED_ADMINS.has(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('context_bots')
    .select('id,bot_username,context_id,context_label,kind,brand,client_email,provision_status,provision_error,provisioned_at,created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bots: data });
}
