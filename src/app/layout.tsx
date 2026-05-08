import { defaultMetadata, viewport } from "@/lib/metadata"
import type { Metadata } from "next"

export const metadata: Metadata = defaultMetadata;
export { viewport };

// Root layout — renders children directly.
// All locale routing is handled by [locale]/layout.tsx and the middleware.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
