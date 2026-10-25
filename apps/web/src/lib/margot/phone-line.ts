// Server-side reader for the Margot AI phone line (UNI-2996).
// The number is public contact information, not a secret, but it must never show as a
// placeholder: unset, blank or malformed means "no line yet" and every slot renders nothing.
// Read this on the server and pass the result down as a prop; do not read it in client code.

export const E164 = /^\+[1-9]\d{7,14}$/

export function readMargotPhoneNumber(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.MARGOT_PHONE_NUMBER?.trim()
  return value && E164.test(value) ? value : null
}
