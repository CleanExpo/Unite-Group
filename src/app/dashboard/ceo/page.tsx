"use client";
import dynamic from 'next/dynamic';

// Load the CEO dashboard entirely on the client — prevents SSR crashes
// from recharts and other browser-only APIs
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
  return <CeoDashboard />;
}
