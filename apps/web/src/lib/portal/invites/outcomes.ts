// What the database redeem function can answer, and the plain words an owner sees for each.
// Copy is written for a non-technical business owner: what happened, and what to do next.

export const REDEEM_OUTCOMES = [
  'redeemed', 'not_found', 'expired', 'revoked', 'used', 'wrong_email', 'rate_limited', 'needs_second_factor',
] as const
export type RedeemOutcome = (typeof REDEEM_OUTCOMES)[number]

/** Outcomes produced in the app before the database is asked. */
export type RedeemAppOutcome = 'signed_out' | 'no_code' | 'error'

export function isRedeemOutcome(value: unknown): value is RedeemOutcome {
  return typeof value === 'string' && (REDEEM_OUTCOMES as readonly string[]).includes(value)
}

export const REDEEM_COPY: Record<RedeemOutcome | RedeemAppOutcome, { title: string; body: string }> = {
  redeemed: { title: "You're in", body: 'Your business portal is ready. Your plan is free, and nothing is charged.' },
  not_found: { title: "That code didn't work", body: 'Check it matches the code we sent you, letter for letter. Dashes and spaces do not matter.' },
  expired: { title: 'This code has expired', body: 'Codes last 14 days. Reply to the person who sent it and they will send you a new one.' },
  revoked: { title: 'This code was cancelled', body: 'It can no longer be used. Ask the person who sent it for a new one.' },
  used: { title: 'This code has already been used', body: 'Each code works once. If that was you, you are already set up. If not, ask for a new code.' },
  wrong_email: { title: 'This code is for a different email', body: 'Sign out, then sign in with the email address the code was sent to.' },
  rate_limited: { title: 'Too many tries', body: 'For your safety we have paused code checks for 15 minutes. Please try again after that.' },
  needs_second_factor: { title: 'One more step', body: 'Confirm it is you with your authenticator app, then you can claim your portal.' },
  signed_out: { title: 'Please sign in first', body: 'Enter your email and we will send you a sign-in link.' },
  no_code: { title: 'We need your invite code', body: 'Paste the code from your invite to continue.' },
  error: { title: 'Something went wrong on our side', body: 'Nothing was changed. Please try again in a minute.' },
}
