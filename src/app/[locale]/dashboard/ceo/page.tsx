"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CeoLocaleRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/ceo");
  }, [router]);
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  );
}
