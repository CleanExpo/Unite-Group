import type { Metadata } from "next";

// The founder's own sign-in: never indexed, and never described as a customer login.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
