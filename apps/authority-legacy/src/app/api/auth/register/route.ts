import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/register
 *
 * Self-service signup. Creates a Supabase auth user + public.profiles row,
 * then signs the user in so the session cookies are set.
 *
 * Body: { email, password, firstName, lastName, acceptTerms }
 * Rate limited: 5 attempts per IP per hour.
 */

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
});

// Sanitize: strip HTML tags from string inputs
function sanitize(str: string): string {
  return str.replace(/[<>]/g, '').trim();
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per IP per hour
    const gate = await rateLimit(request, {
      key: 'auth-register',
      ...RATE_LIMITS.authRegister,
    });
    if (!gate.ok) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.', retryAfterMs: gate.retryAfterMs },
        { status: 429 },
      );
    }

    // Parse & validate
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { email, password, firstName, lastName } = {
      ...parsed.data,
      email: sanitize(parsed.data.email),
      firstName: sanitize(parsed.data.firstName),
      lastName: sanitize(parsed.data.lastName),
    };

    // Create user in Supabase auth via service role (bypasses RLS)
    const admin = getAdminClient();
    const { data: userData, error: signUpError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // require email verification
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (signUpError || !userData.user) {
      console.error('register: createUser failed:', signUpError?.message);
      const msg = signUpError?.message?.includes('already registered')
        ? 'An account with this email already exists.'
        : 'Failed to create account. Please try again.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const userId = userData.user.id;

    // Create profile row in public.profiles
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      role: 'user',
    });

    if (profileError) {
      console.error('register: profile insert failed:', profileError.message);
      // Roll back the auth user so we don't leave an orphaned auth record
      try {
        await admin.auth.admin.deleteUser(userId);
        console.log('register: rolled back auth user', userId);
      } catch (rollbackErr) {
        console.error('register: failed to roll back auth user', userId, rollbackErr);
      }
      return NextResponse.json(
        { error: 'Account creation failed. Please try again.' },
        { status: 500 },
      );
    }

    // Sign the user in so session cookies are set via SSR client
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // User created but not signed in — they'll need to verify email or log in manually
      console.warn('register: signInWithPassword failed after createUser:', signInError.message);
      return NextResponse.json({
        success: true,
        needsVerification: true,
        message: 'Account created. Please check your email to verify, then sign in.',
      });
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email },
      message: 'Account created successfully.',
    });
  } catch (err) {
    console.error('register error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
