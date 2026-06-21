import React from "react";

// Force dynamic rendering for all auth pages — they require session context
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        background: 'var(--surface-canvas)',
        backgroundImage: 'var(--auth-bg-pattern), var(--auth-glow)',
        backgroundSize: 'var(--auth-bg-size), 100% 100%',
      }}
    >
      <div className="w-full max-w-md relative z-10">
        {/* Pi-CEO brand mark — the π symbol */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="mb-3 flex items-center justify-center"
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              background: 'linear-gradient(160deg, #22c55e 0%, #16a34a 55%, #15803d 100%)',
              boxShadow:
                '0 10px 26px rgba(22,163,74,0.32), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 8px rgba(0,0,0,0.20)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1,
                color: '#ffffff',
                textShadow: '0 1px 0 rgba(0,0,0,0.28), 0 -1px 0 rgba(255,255,255,0.35)',
              }}
            >
              π
            </span>
          </div>
          <p
            className="text-[16px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Pi-CEO
          </p>
          <p
            className="text-[10px] font-mono tracking-[0.3em] uppercase mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Unite-Group
          </p>
        </div>

        {/* Auth Card — elevated with green top accent */}
        <div
          className="rounded-sm p-8"
          style={{
            background:   'var(--surface-card)',
            borderLeft:   '1px solid var(--color-border)',
            borderRight:  '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            borderTop:    '2px solid rgba(22, 163, 74, 0.55)',
            boxShadow:    '0 12px 32px rgba(0,0,0,0.06)',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        <p
          className="text-center text-[11px] mt-6 font-mono tracking-wider"
          style={{ color: 'var(--color-text-disabled)' }}
        >
          © 2026 Pi-CEO · Unite-Group. All rights reserved.
        </p>
      </div>
    </div>
  );
}
