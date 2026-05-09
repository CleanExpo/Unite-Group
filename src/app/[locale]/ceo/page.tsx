import { redirect } from 'next/navigation';

// /en/ceo is superseded by the new Empire Command Center at /en/empire
export default function CeoPage() {
  redirect('/en/empire');
}
