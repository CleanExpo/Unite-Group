// POST /api/telegram/approval-callback — Telegram inline-keyboard decision callback.
//
// Ported from apps/authority-legacy/src/app/api/telegram/approval-callback/route.ts
// (P4 — docs/convergence/migration-map.md).
//
// ADAPTATION (apps/web):
//   The legacy route is a thin transport over the Phase-1I "personal
//   intelligence" decision-ledger subsystem
//   (@/lib/personal-intelligence/phase-1i-decision-ledger and
//   @/lib/personal-intelligence/approval-gate) plus on-disk gate/ledger JSON
//   files under docs/margot/personal-intelligence/. NONE of that subsystem has
//   been migrated into apps/web, and porting it is well outside this Stripe/
//   webhook scope.
//
//   Per the convergence rule for "route depends on a table/module apps/web
//   doesn't have", this route degrades HONESTLY: it verifies the Telegram bot
//   token is configured, then returns a clear 501 not_connected with a TODO,
//   rather than inventing the ledger or silently succeeding. No fake approval
//   is ever recorded.
//   TODO(convergence): port src/lib/personal-intelligence/* (approval-gate +
//   phase-1i-decision-ledger) and the on-disk gate/ledger files, then restore
//   the verify → append-decision → editMessage flow. See docs/convergence/migration-map.md.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  void _req;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const signingKey = process.env.TELEGRAM_DECISION_SIGNING_KEY;

  if (!token || !signingKey) {
    return NextResponse.json(
      {
        ok: false,
        code: 'ERR_INTERNAL',
        reason: 'TELEGRAM_BOT_TOKEN / TELEGRAM_DECISION_SIGNING_KEY not configured',
      },
      { status: 503 },
    );
  }

  // Decision-ledger subsystem not migrated into apps/web.
  return NextResponse.json(
    {
      ok: false,
      code: 'not_connected',
      reason:
        'personal-intelligence decision-ledger subsystem not migrated in apps/web; ' +
        'approval callbacks cannot be recorded. See docs/convergence/migration-map.md.',
    },
    { status: 501 },
  );
}
