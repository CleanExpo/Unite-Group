'use client';

/**
 * SYN-519: Vercel Analytics custom event for Authority Hub routes.
 * Fires authority_hub_first_paint with client_slug and load_time_ms.
 */

import { useEffect } from 'react';

interface AuthorityHubAnalyticsProps {
  clientSlug: string;
}

// Vercel Analytics global type (injected by @vercel/analytics script)
declare global {
  interface Window {
    va?: (event: string, properties?: Record<string, string | number | boolean>) => void;
  }
}

export function AuthorityHubAnalytics({ clientSlug }: AuthorityHubAnalyticsProps) {
  useEffect(() => {
    const startTime = performance.now();
    requestAnimationFrame(() => {
      const loadTimeMs = Math.round(performance.now() - startTime);
      window.va?.('authority_hub_first_paint', {
        client_slug: clientSlug,
        load_time_ms: loadTimeMs,
      });
    });
  }, [clientSlug]);

  return null;
}
