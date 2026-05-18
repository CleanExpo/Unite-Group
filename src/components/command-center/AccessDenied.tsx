// Explicit forbidden UX for /[locale]/command-center. Rendered when a Supabase
// session resolves to an email that is NOT on ALLOWED_ADMINS. Per UNI-2022,
// authenticated non-admin users must see an unambiguous "you cannot access
// this" — never the partially-interactive shell behind a wall of 401s.

export function AccessDenied({ actorEmail }: { actorEmail: string }) {
  return (
    <main
      role="alert"
      aria-labelledby="cc-forbidden-title"
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--cc-bg)', color: 'var(--cc-ink)' }}
    >
      <span
        className="font-mono text-[11px] uppercase tracking-[0.22em] mb-3"
        style={{ color: 'var(--cc-ink-dim)' }}
      >
        access denied · 403
      </span>
      <h1
        id="cc-forbidden-title"
        className="text-2xl font-semibold mb-2"
      >
        Command Center is admin-only
      </h1>
      <p
        className="max-w-md text-sm leading-relaxed"
        style={{ color: 'var(--cc-ink-dim)' }}
      >
        You are signed in as <strong>{actorEmail}</strong>, but this account is
        not on the operator allow-list. Sign in with an admin account to
        continue.
      </p>
      <a
        href="/en/login?next=/en/command-center"
        className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] underline"
        style={{ color: 'var(--cc-ink)' }}
      >
        switch account →
      </a>
    </main>
  );
}
