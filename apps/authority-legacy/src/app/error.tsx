'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#f0f0f2', background: '#08080a', minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
        Something went wrong
      </h2>
      <p style={{ marginBottom: '1.5rem', color: '#999', maxWidth: '400px' }}>
        An unexpected error occurred. Our team has been notified.
      </p>
      <button
        onClick={reset}
        style={{
          background: '#E11D2E',
          color: '#ffffff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        Try again
      </button>
    </div>
  );
}
