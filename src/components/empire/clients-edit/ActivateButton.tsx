'use client';

// Inline "Activate" button on the /empire/clients index. PATCHes the row
// to status='active' so the founder doesn't have to open the full edit
// form for the common onboarding → active flip.

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

export function ActivateButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activate = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/empire/clients/${slug}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `http_${res.status}`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network_error');
    } finally {
      setPending(false);
    }
  }, [slug, router]);

  if (error) {
    return (
      <span
        role="alert"
        title={error}
        style={{
          color: '#f87171',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
        }}
      >
        Activate failed
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={activate}
      disabled={pending}
      data-activate-button
      style={{
        padding: '3px 8px',
        border: '1px solid #10b981',
        borderRadius: 4,
        background: 'transparent',
        color: '#10b981',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        cursor: pending ? 'wait' : 'pointer',
        opacity: pending ? 0.5 : 1,
      }}
    >
      {pending ? 'Activating…' : 'Activate'}
    </button>
  );
}
