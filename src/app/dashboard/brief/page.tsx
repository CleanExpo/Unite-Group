"use client";

import Link from "next/link";

export default function SixPagerBrief() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 text-white">
      <h1 className="text-3xl font-bold">6-Pager Brief</h1>
      <p className="text-slate-400 text-center max-w-sm">
        The weekly empire 6-pager brief will be generated and displayed here.
      </p>
      <Link
        href="/dashboard/ceo"
        className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors text-sm"
      >
        Back to Command Center
      </Link>
    </div>
  );
}
