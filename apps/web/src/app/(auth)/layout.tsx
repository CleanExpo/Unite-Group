import React from "react";
import Image from "next/image";

// Force dynamic rendering for all auth pages — they require session context
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Cinematic Pi-CEO hero — the same orange landing face as the Pi-Dev-Ops
          dashboard, so the two surfaces stop reading as two different products. */}
      <Image
        src="/pi-ceo-hero.webp"
        alt="Pi CEO"
        fill
        priority
        quality={85}
        sizes="100vw"
        className="object-cover object-center"
        style={{ zIndex: 0 }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.74) 55%, rgba(10,10,10,0.93) 100%)',
          zIndex: 1,
        }}
      />

      <div className="w-full max-w-md relative" style={{ zIndex: 10 }}>
        {/* Brand mark — the approved Unite-Group Nexus emblem (orange cracked U on
            navy) from the brand pack, replacing the earlier orange π tile. */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="mb-3 relative overflow-hidden"
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              boxShadow: '0 10px 30px rgba(249,115,22,0.40)',
            }}
          >
            <Image
              src="/logos/unite-group-nexus-emblem-256.png"
              alt="Unite-Group Nexus"
              fill
              priority
              sizes="76px"
            />
          </div>
          <p
            className="font-bold leading-none"
            style={{
              fontSize: 'clamp(32px, 6vw, 52px)',
              color: '#fafafa',
              letterSpacing: '0.06em',
              textShadow: '0 2px 28px rgba(0,0,0,0.85)',
            }}
          >
            PI CEO
          </p>
          <p
            className="text-[10px] font-mono tracking-[0.32em] uppercase mt-2"
            style={{ color: '#f97316' }}
          >
            Unite-Group Nexus
          </p>
        </div>

        {/* Auth card — kept light (var tokens) so the form + Google button stay
            legible and the auth flow is untouched; only the chrome changed. */}
        <div
          className="rounded-sm p-8"
          style={{
            background:   'var(--surface-card)',
            borderLeft:   '1px solid var(--color-border)',
            borderRight:  '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            borderTop:    '2px solid #f97316',
            boxShadow:    '0 16px 48px rgba(0,0,0,0.45)',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        <p
          className="text-center text-[11px] mt-6 font-mono tracking-wider"
          style={{ color: 'rgba(250,250,250,0.55)' }}
        >
          © 2026 Pi-CEO · Unite-Group. All rights reserved.
        </p>
      </div>
    </div>
  );
}
