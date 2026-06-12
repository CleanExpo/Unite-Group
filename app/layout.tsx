import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "The Fable System",
  description: "Plain-English vision in, verified build-ready spec out.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          background: "#101214",
          color: "#e6e6e6",
        }}
      >
        {children}
      </body>
    </html>
  );
}
