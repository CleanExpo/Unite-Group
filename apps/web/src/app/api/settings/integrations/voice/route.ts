// GET/PUT /api/settings/integrations/voice
// Founder-scoped per-account copywriter voice (task 21 / UNI-2153).
//   GET  ?account_email=<mailbox>  → { isCustom, voice }
//   PUT  { account_email, name, signOff, toneGuidelines, neverDo } → { success }
// The stored voice a Margot draft written FROM that mailbox would use. Ships
// DARK — editing a voice never sends or drafts anything on its own.

import { NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import {
  getAccountVoice,
  getStoredAccountVoice,
  saveAccountVoice,
  DEFAULT_FOUNDER_VOICE,
} from '@/lib/margot/account-voice';
import type { FounderVoice } from '@/lib/margot/draft-reply-prompt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const accountEmail = new URL(request.url).searchParams
    .get('account_email')
    ?.trim();
  if (!accountEmail) {
    return NextResponse.json(
      { error: 'account_email is required' },
      { status: 400 }
    );
  }

  try {
    const stored = await getStoredAccountVoice(user.id, accountEmail);
    return NextResponse.json({
      isCustom: stored !== null,
      voice: stored ?? DEFAULT_FOUNDER_VOICE,
    });
  } catch (err) {
    console.error('[settings/integrations/voice] GET error:', err);
    return NextResponse.json({ error: 'Failed to load voice' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: {
    account_email?: string;
    name?: string;
    signOff?: string;
    toneGuidelines?: unknown;
    neverDo?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const accountEmail = body.account_email?.trim();
  if (!accountEmail) {
    return NextResponse.json(
      { error: 'account_email is required' },
      { status: 400 }
    );
  }

  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      : [];

  const voice: FounderVoice = {
    name: (body.name ?? '').trim() || DEFAULT_FOUNDER_VOICE.name,
    signOff: (body.signOff ?? '').trim() || DEFAULT_FOUNDER_VOICE.signOff,
    toneGuidelines: asStringArray(body.toneGuidelines),
    neverDo: asStringArray(body.neverDo),
  };

  try {
    await saveAccountVoice(user.id, accountEmail, voice);
    const saved = await getAccountVoice(user.id, accountEmail);
    return NextResponse.json({ success: true, voice: saved });
  } catch (err) {
    console.error('[settings/integrations/voice] PUT error:', err);
    return NextResponse.json({ error: 'Failed to save voice' }, { status: 500 });
  }
}
