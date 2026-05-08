"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import LanguageSwitcher from "./LanguageSwitcher";
import { Locale, defaultLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";

type NavLink = { href: string; label: string };

const PRIMARY_LINKS: NavLink[] = [
  { href: "/about", label: "About" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

function isActiveHref(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  // Strip locale prefix (e.g. "/en/about" -> "/about") for comparison.
  const stripped = pathname.replace(/^\/(en|es|fr)(?=\/|$)/, "") || "/";
  if (href === "/") return stripped === "/";
  return stripped === href || stripped.startsWith(`${href}/`);
}

export default function Navigation() {
  const params = useParams();
  const pathname = usePathname();
  const currentLocale = (params?.locale as Locale) || defaultLocale;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabaseClient.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    getUser();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setMobileOpen(false);
    router.push("/");
  };

  const linkClass = (href: string) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      "text-foreground/70 hover:text-foreground hover:bg-accent",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isActiveHref(pathname, href) && "bg-muted text-foreground"
    );

  const mobileLinkClass = (href: string) =>
    cn(
      "block rounded-md px-3 py-2 text-base font-medium transition-colors",
      "text-foreground/80 hover:text-foreground hover:bg-accent",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      isActiveHref(pathname, href) && "bg-muted text-foreground"
    );

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold text-foreground transition-colors hover:text-foreground/80"
          >
            Unite Group
          </Link>

          <div className="hidden sm:flex sm:items-center sm:gap-1">
            {PRIMARY_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href)}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden sm:flex sm:items-center sm:gap-2">
          <LanguageSwitcher currentLocale={currentLocale} />

          {!loading && (
            <>
              {user ? (
                <>
                  <Link href="/dashboard" className={linkClass("/dashboard")}>
                    Dashboard
                  </Link>
                  {user.email?.endsWith("@ccw.com.au") && (
                    <Link href="/clients/ccw" className={linkClass("/clients/ccw")}>
                      Client Portal
                    </Link>
                  )}
                  <Button variant="destructive" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className={linkClass("/login")}>
                    Login
                  </Link>
                  <Button asChild size="sm">
                    <Link href="/register">Register</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-3/4 sm:max-w-sm">
            <SheetTitle className="text-base font-semibold text-foreground">
              Menu
            </SheetTitle>

            <div className="mt-6 flex flex-col gap-1">
              {PRIMARY_LINKS.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link href={link.href} className={mobileLinkClass(link.href)}>
                    {link.label}
                  </Link>
                </SheetClose>
              ))}

              {!loading && user && (
                <SheetClose asChild>
                  <Link href="/dashboard" className={mobileLinkClass("/dashboard")}>
                    Dashboard
                  </Link>
                </SheetClose>
              )}
              {!loading && user?.email?.endsWith("@ccw.com.au") && (
                <SheetClose asChild>
                  <Link href="/clients/ccw" className={mobileLinkClass("/clients/ccw")}>
                    Client Portal
                  </Link>
                </SheetClose>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <LanguageSwitcher currentLocale={currentLocale} />
            </div>

            {!loading && (
              <div className="mt-6 flex flex-col gap-2">
                {user ? (
                  <Button variant="destructive" onClick={handleLogout}>
                    Logout
                  </Button>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button asChild variant="outline">
                        <Link href="/login">Login</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild>
                        <Link href="/register">Register</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
