"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { parseImplicitFragment, safeNextPath } from "@/lib/auth/implicit-fragment";

// Picks up implicit-flow magic-link sessions (#access_token=…) that the server
// callback can never see, stores them as cookies, then continues to `next`.
export default function ConfirmPage() {
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    const tokens = parseImplicitFragment(window.location.hash);
    const fail = () => {
      const login = new URL("/auth/login", window.location.origin);
      login.searchParams.set("error", "oauth_failed");
      login.searchParams.set("redirectTo", next);
      window.location.replace(login.toString());
    };
    if (!tokens) {
      fail();
      return;
    }
    // Drop the tokens from the address bar / history straight away.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.setSession(tokens).then(({ error }) => {
      if (error) {
        setMessage("That sign-in link has expired.");
        fail();
        return;
      }
      window.location.replace(next);
    });
  }, []);

  return <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{message}</p>;
}
