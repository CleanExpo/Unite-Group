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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading Empire Command Center...</p>
        </div>
      </div>
    ),
  }
);

export default function CeoPage() {
  // Server-renders the dark bg immediately — no white flash while JS loads
  return (
    <div className="min-h-screen bg-slate-950">
      <CeoDashboard />
    </div>
  );
}
