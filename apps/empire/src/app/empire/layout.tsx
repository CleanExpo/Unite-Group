import { redirect } from 'next/navigation';

// /empire/* → canonically lives at /en/empire/*
// This layout performs the redirect so /empire lands correctly.
export default function EmpireRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirect bare /empire to localised path handled by middleware
  redirect('/en/empire');
}
