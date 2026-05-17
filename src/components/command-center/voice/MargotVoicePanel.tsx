'use client';

import { createElement, useCallback, useEffect, useMemo, useState } from 'react';

type VoiceState = 'idle' | 'loading' | 'ready' | 'error';

const WIDGET_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed';

export function MargotVoicePanel() {
  const [state, setState] = useState<VoiceState>('idle');
  const [signedUrl, setSignedUrl] = useState('');
  const [error, setError] = useState('');

  const statusLabel = useMemo(() => {
    if (state === 'ready') return 'secure voice ready';
    if (state === 'loading') return 'preparing secure link';
    if (state === 'error') return 'voice unavailable';
    return 'not connected';
  }, [state]);

  useEffect(() => {
    if (document.querySelector('script[data-elevenlabs-convai]')) return;
    const script = document.createElement('script');
    script.src = WIDGET_SRC;
    script.async = true;
    script.type = 'text/javascript';
    script.dataset.elevenlabsConvai = 'true';
    document.body.appendChild(script);
  }, []);

  const prepareSession = useCallback(async () => {
    setState('loading');
    setError('');
    setSignedUrl('');

    try {
      const res = await fetch('/api/pi-ceo/margot-voice/signed-url', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok || !body.signed_url) {
        throw new Error(body.error || 'signed_url_failed');
      }
      setSignedUrl(body.signed_url);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'voice_session_failed');
      setState('error');
    }
  }, []);

  const widgetProps: Record<string, string> = {
    'signed-url': signedUrl,
    variant: 'expanded',
    dismissible: 'false',
    'action-text': 'Talk to Margot',
    'start-call-text': 'Start',
    'end-call-text': 'End',
    'listening-text': 'Listening',
    'speaking-text': 'Margot speaking',
  };

  return (
    <section
      className="flex flex-col gap-3 p-5"
      style={{
        background: 'var(--cc-bg-soft)',
        borderBottom: '1px solid var(--cc-grid)',
      }}
      aria-label="Talk to Margot"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--cc-ink-dim)' }}
          >
            Margot voice
          </p>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cc-ink)' }}>
            Talk to Margot
          </h2>
        </div>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: state === 'ready' ? 'var(--cc-signal)' : 'var(--cc-ink-hush)' }}
        >
          {statusLabel}
        </span>
      </div>

      <button
        type="button"
        onClick={prepareSession}
        disabled={state === 'loading'}
        className="min-h-11 px-3 text-xs font-mono uppercase tracking-[0.18em] disabled:opacity-50"
        style={{
          color: 'var(--cc-bg)',
          background: 'var(--cc-signal)',
          border: '1px solid var(--cc-signal)',
        }}
      >
        {state === 'loading' ? 'Preparing' : 'Start secure voice'}
      </button>

      {state === 'error' ? (
        <p className="text-xs" style={{ color: '#f87171' }}>
          {error}
        </p>
      ) : null}

      {signedUrl ? (
        <div
          className="min-h-[9rem] pt-3"
          style={{ borderTop: '1px solid var(--cc-grid)' }}
        >
          {createElement('elevenlabs-convai', widgetProps)}
        </div>
      ) : null}
    </section>
  );
}
