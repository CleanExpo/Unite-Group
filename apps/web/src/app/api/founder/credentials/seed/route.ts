// src/app/api/founder/credentials/seed/route.ts
//
// Credential harvest — the seeding endpoint (UNI-2373 credential-harvest Lane A).
//
// POST a credential the estate already holds so it lands on the Nexus plane
// WITHOUT re-entering it through an OAuth consent screen. Two targets:
//   { target: 'vault',  service, label, value }  → encrypted row in credentials_vault
//   { target: 'social', platform, ... }          → row in social_channels (via upsertChannel)
//
// Why this endpoint exists (and why it must): Vercel Sensitive vars are
// write-only, so VAULT_ENCRYPTION_KEY cannot be read back by any local script —
// the only place that can produce ciphertext prod can later decrypt is the
// deployed app itself. This route is that server-side crypto boundary.
//
// DORMANT BY DEFAULT: gated behind CREDENTIAL_SEED_ENABLED. Unset (the prod
// default) ⇒ the endpoint 404s and is invisible. "Merging this arms nothing."
// The go-live flip + the seeding run are a founder decision, disarmed again
// afterwards (see the spec's Lane B/C runbook).
//
// Security: founder session (getUser → 401) AND founder allow-list
// (hasPrivateAccess → 403). Payloads are NEVER logged or echoed — only the
// non-secret descriptor (target/service/label) is returned. Write-then-confirm:
// the upsert reads back the row it wrote; a failed persist surfaces a 500,
// never a green 200 over nothing.

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/supabase/server'
import { hasPrivateAccess } from '@/lib/auth/private-access'
import { encrypt } from '@/lib/vault'
import { createServiceClient } from '@/lib/supabase/service'
import { upsertChannel } from '@/lib/integrations/social/channels'

export const dynamic = 'force-dynamic'

function isArmed(): boolean {
  return process.env.CREDENTIAL_SEED_ENABLED?.trim() === 'true'
}

// A seeded value is either a raw string (an API key / token) or a structured
// token object (e.g. Google StoredTokens { access_token, refresh_token, ... }).
// Both are stored as a single encrypted string in credentials_vault.
const vaultSchema = z.object({
  target: z.literal('vault'),
  service: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(128),
  // notes/email is the human-readable account handle stored on the row.
  notes: z.string().trim().max(256).optional(),
  businessKey: z.string().trim().max(64).optional(),
  value: z.union([z.string().min(1), z.record(z.string(), z.unknown())]),
})

const socialSchema = z.object({
  target: z.literal('social'),
  platform: z.string().trim().min(1).max(32),
  businessKey: z.string().trim().min(1).max(64),
  channelId: z.string().trim().min(1).max(128),
  channelName: z.string().trim().min(1).max(256),
  handle: z.string().trim().max(128).nullish(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).nullish(),
  expiresAt: z.number().int().nonnegative(),
})

const bodySchema = z.discriminatedUnion('target', [vaultSchema, socialSchema])

export async function POST(request: Request) {
  // Dormant-by-default: an unarmed endpoint is indistinguishable from absent.
  if (!isArmed()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!hasPrivateAccess({ id: user.id, email: user.email })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    // zod's message names the failing field, never the value.
    return NextResponse.json(
      { error: `Invalid payload: ${parsed.error.issues[0]?.message ?? 'validation failed'}` },
      { status: 400 },
    )
  }
  const body = parsed.data

  try {
    if (body.target === 'social') {
      // Reuse the exact OAuth-callback write path (encodes tokens itself).
      await upsertChannel({
        founderId: user.id,
        platform: body.platform,
        businessKey: body.businessKey,
        channelId: body.channelId,
        channelName: body.channelName,
        handle: body.handle ?? null,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken ?? null,
        expiresAt: body.expiresAt,
        metadata: { seeded_at: new Date().toISOString(), source: 'credential-seed' },
      })

      // Write-then-confirm: the row must be readable back before we report success.
      const supabase = createServiceClient()
      const { data: confirm } = await supabase
        .from('social_channels')
        .select('id')
        .eq('founder_id', user.id)
        .eq('platform', body.platform)
        .eq('channel_id', body.channelId)
        .maybeSingle()
      if (!confirm) {
        return NextResponse.json({ error: 'Seed did not persist' }, { status: 500 })
      }
      return NextResponse.json(
        { seeded: { target: 'social', platform: body.platform, channelId: body.channelId } },
        { status: 201 },
      )
    }

    // target === 'vault'
    const plaintext = typeof body.value === 'string' ? body.value : JSON.stringify(body.value)
    const payload = encrypt(plaintext)

    const supabase = createServiceClient()
    const { data: written, error } = await supabase
      .from('credentials_vault')
      .upsert(
        {
          founder_id: user.id,
          business_id: null,
          service: body.service,
          label: body.label,
          encrypted_value: payload.encryptedValue,
          iv: payload.iv,
          salt: payload.salt,
          notes: body.notes ?? null,
          metadata: {
            ...(body.notes ? { email: body.notes } : {}),
            ...(body.businessKey ? { businessKey: body.businessKey } : {}),
            seeded_at: new Date().toISOString(),
            source: 'credential-seed',
          },
          last_accessed_at: new Date().toISOString(),
        },
        { onConflict: 'founder_id,service,label' },
      )
      .select('id, service, label')
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: sanitiseError(error, 'Failed to seed credential') },
        { status: 500 },
      )
    }
    if (!written) {
      return NextResponse.json({ error: 'Seed did not persist' }, { status: 500 })
    }

    return NextResponse.json(
      { seeded: { target: 'vault', service: written.service, label: written.label } },
      { status: 201 },
    )
  } catch (err) {
    // sanitiseError strips any secret material from the surfaced message.
    return NextResponse.json(
      { error: sanitiseError(err, 'Failed to seed credential') },
      { status: 500 },
    )
  }
}
