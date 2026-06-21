import React from "react";
import Image from "next/image";

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
        {/* Pi-CEO logo (official brand image — sphere + wordmark) */}
        <div className="flex justify-center mb-8">
          <div
            className="overflow-hidden rounded-md"
            style={{
              border: '1px solid var(--color-border)',
              boxShadow: '0 14px 36px rgba(20, 28, 64, 0.28)',
              lineHeight: 0,
            }}
          >
            <Image
              src="/logos/pi-ceo.png"
              alt="Pi-CEO — AI Operations Platform · Unite-Group"
              width={800}
              height={480}
              priority
              className="block"
              style={{ width: 400, height: 'auto' }}
            />
          </div>
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
