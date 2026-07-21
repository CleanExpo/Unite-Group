// GET /api/settings/integrations/signature?account=<mailbox>&slogan=<optional>
// Founder-scoped preview of an account's email signature footer (UNI-2153).
//   business account → { html }         — the rendered, email-safe signature
//   personal account → { html: null }   — signatures apply to business accounts
// `slogan` overrides the stored/default slogan for a live preview only; it does
// NOT persist (the voice PUT persists). Nothing here sends or drafts email.

import { NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { accountByEmail } from '@/lib/email-accounts';
import { getAccountSignature, DEFAULT_SLOGAN } from '@/lib/email/signature';
import { getAccountSlogan } from '@/lib/margot/account-voice';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const account = params.get('account')?.trim();
  if (!account) {
    return NextResponse.json({ error: 'account is required' }, { status: 400 });
  }

  const resolved = accountByEmail(account);
  if (!resolved) {
    return NextResponse.json({ error: 'unknown account' }, { status: 400 });
  }
  if (resolved.scope === 'personal') {
    return NextResponse.json({
      html: null,
      note: 'Signatures apply to business accounts only',
    });
  }

  try {
    const slogan = params.get('slogan')?.trim();
    // Return the effective stored slogan so the editor hydrates the founder's
    // saved value instead of the proposed default (else a re-save clobbers it).
    const storedSlogan = slogan ? undefined : (await getAccountSlogan(user.id, account))?.trim();
    const html = await getAccountSignature(
      user.id,
      account,
      slogan ? { slogan } : undefined
    );
    return NextResponse.json({ html, slogan: slogan || storedSlogan || DEFAULT_SLOGAN });
  } catch (err) {
    console.error('[settings/integrations/signature] GET error:', err);
    return NextResponse.json(
      { error: 'Failed to render signature' },
      { status: 500 }
    );
  }
}
