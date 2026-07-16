/**
 * Per-account copywriter voice accessor (task 21 / UNI-2153).
 *
 * Resolves the founder-voice config for a specific mailbox so a Margot draft
 * written FROM an account speaks in that account's register. When no row exists,
 * falls back to DEFAULT_FOUNDER_VOICE. Founder-scoped, service-role writes.
 *
 * The `email_account_voice` table is not in the generated Database types yet
 * (regenerate after the migration lands on a DB branch), so the client is used
 * with explicit row typing here — keeps type-check green without regen.
 */

import { createServiceClient } from '@/lib/supabase/service';

import type { FounderVoice } from './draft-reply-prompt';

interface EmailAccountVoiceRow {
  name: string | null;
  sign_off: string | null;
  tone_guidelines: string[] | null;
  never_do: string[] | null;
}

/**
 * The estate default voice — the labelled fallback when an account has no
 * stored voice. Folds the nexus-copywriter register into the tone guidelines:
 * concise, warm, evidence-honest, never invent facts.
 */
export const DEFAULT_FOUNDER_VOICE: FounderVoice = {
  name: 'Phill',
  signOff: 'Cheers, Phill',
  toneGuidelines: [
    'Concise — say it in as few words as carry the meaning; cut filler and hedging.',
    'Warm and direct — match the sender’s register, human not corporate.',
    'Evidence-honest — only state what the thread supports; never invent facts, prices, dates, or commitments.',
    'Plain Australian English — active voice, no jargon or AI throat-clearing.',
  ],
  neverDo: [
    'Never invent facts, figures, prices, or dates not present in the thread.',
    'Never over-promise or commit to timelines the founder has not confirmed.',
    'Never sound automated, salesy, or like a template.',
  ],
};

function rowToVoice(row: EmailAccountVoiceRow): FounderVoice {
  return {
    name: row.name ?? DEFAULT_FOUNDER_VOICE.name,
    signOff: row.sign_off ?? DEFAULT_FOUNDER_VOICE.signOff,
    toneGuidelines: row.tone_guidelines ?? [],
    neverDo: row.never_do ?? [],
  };
}

/**
 * The stored voice for an account, or `null` when none is set. Lets callers
 * distinguish a custom voice from the default (e.g. the settings empty state).
 */
export async function getStoredAccountVoice(
  founderId: string,
  email: string
): Promise<FounderVoice | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;
  const { data, error } = await db
    .from('email_account_voice')
    .select('name, sign_off, tone_guidelines, never_do')
    .eq('founder_id', founderId)
    .eq('account_email', email)
    .maybeSingle();
  if (error) throw new Error(`email_account_voice select: ${error.message}`);
  if (!data) return null;
  return rowToVoice(data as EmailAccountVoiceRow);
}

/** The voice for an account — the stored voice, or DEFAULT_FOUNDER_VOICE. */
export async function getAccountVoice(
  founderId: string,
  email: string
): Promise<FounderVoice> {
  const stored = await getStoredAccountVoice(founderId, email);
  return stored ?? DEFAULT_FOUNDER_VOICE;
}

/** Upsert an account's voice on the (founder_id, account_email) composite key. */
export async function saveAccountVoice(
  founderId: string,
  email: string,
  voice: FounderVoice
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;
  const { error } = await db.from('email_account_voice').upsert(
    {
      founder_id: founderId,
      account_email: email,
      name: voice.name,
      sign_off: voice.signOff,
      tone_guidelines: voice.toneGuidelines,
      never_do: voice.neverDo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'founder_id,account_email' }
  );
  if (error) throw new Error(`email_account_voice upsert: ${error.message}`);
}
