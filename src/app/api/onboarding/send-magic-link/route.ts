import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/sendEmail';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/send-magic-link
 *
 * Sends a Unite-Group onboarding magic link to a new client contact.
 * Token: crypto.randomBytes(32).toString('hex') + base64-encoded payload.
 * Payload encodes { clientSlug, contactEmail, expiresAt }.
 * Resume URL: ${NEXT_PUBLIC_APP_URL}/clients/${clientSlug}?token=${secureToken}
 * Expiry: 24 hours.
 *
 * Body: { slug: string; email: string; name: string }
 *
 * Pattern ported from DR-NRPG: apps/web/app/api/client/onboarding/send-resume-link/route.ts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, email, name } = body ?? {};

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ success: false, error: 'slug required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'email required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'name required' }, { status: 400 });
    }

    // 1. Generate secure token (24h expiry)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const payload = {
      clientSlug: slug,
      contactEmail: email,
      expiresAt: expiresAt.getTime(),
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const secureToken = `${token}.${encodedPayload}`;

    // 2. Build resume URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://unite-group.in';
    const resumeUrl = `${appUrl}/clients/${slug}?token=${encodeURIComponent(secureToken)}`;

    // 3. Unite-Group branded email (Gun Metal #1a1a1a + Candy Red accent)
    const firstName = name.split(' ')[0];
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Unite-Group</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
    <div style="background: #1a1a1a; padding: 32px; border-radius: 8px 8px 0 0; border-top: 4px solid #E11D2E;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: -0.02em;">Welcome to Unite-Group</h1>
        <p style="margin: 8px 0 0 0; color: #b3b3b3; font-size: 13px;">Continue your onboarding</p>
    </div>

    <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 15px;">Hi <strong>${firstName}</strong>,</p>

        <p style="font-size: 14px; color: #333;">Your client portal is ready. Click the button below to access your engagement dashboard and pick up where we left off:</p>

        <div style="text-align: center; margin: 32px 0;">
            <a href="${resumeUrl}"
               style="display: inline-block; background-color: #E11D2E; color: #ffffff; text-decoration: none;
                      padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.01em;">
                Open Your Portal &rarr;
            </a>
        </div>

        <div style="background: #faf6f6; border-left: 3px solid #E11D2E; padding: 14px 16px; margin: 24px 0;">
            <p style="margin: 0; color: #1a1a1a; font-size: 13px;">
                <strong>This link expires in 24 hours</strong><br>
                <span style="color: #666;">For security, treat it like a password &mdash; don't share it.</span>
            </p>
        </div>

        <p style="font-size: 12px; color: #999; margin-top: 28px;">
            If you didn't expect this email, you can safely ignore it. Questions? Email Phill direct at
            <a href="mailto:contact@unite-group.in" style="color: #E11D2E; text-decoration: none;">contact@unite-group.in</a>.
        </p>
    </div>

    <div style="text-align: center; padding: 16px 0; font-size: 11px; color: #999;">
        Unite-Group &middot; AI-powered agency services
    </div>
</body>
</html>
    `;

    const result = await sendEmail({
      to: email,
      subject: 'Welcome to Unite-Group — Continue your onboarding',
      html,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Magic link sent to ${email}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('send-magic-link error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
