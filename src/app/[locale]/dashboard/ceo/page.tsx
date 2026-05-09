"use client";
import dynamic from 'next/dynamic';

// CeoDashboard loads entirely client-side (ssr:false) to prevent recharts SSR crashes.
// The outer div is server-rendered and gives an immediate dark background,
// eliminating the white flash before the client JS loads.
const CeoDashboard = dynamic(
  () => import('@/components/ceo/CeoDashboard'),
  {
    ssr: false,
    loading: () => (
      <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, border: "2px solid #1d4ed8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#52525b", fontSize: 13 }}>Loading Empire Command Center...</p>
        </div>
      </div>
    ),
  }
);

export default function CeoPage() {
  // Server-renders the dark bg immediately — no white flash while JS loads
  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)" }}>
      <CeoDashboard />
    </div>
  );
}
