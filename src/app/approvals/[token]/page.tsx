// Magic-link approval portal — client-facing.
//
// The token in the URL IS the credential. Server component fetches the
// approval row via the admin client; renders the deliverable + 3 buttons.
// Posts back to /api/approvals/[token] which writes the signed-hash audit.
//
// Visual: Gun Metal #1a1a1a + Candy Red accent (Unite-Group brand tokens).
import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import ApprovalActions from './ApprovalActions';

export const dynamic = 'force-dynamic';

async function fetchApproval(token: string) {
  if (!token || token.length < 32 || token.length > 128) return null;
  const admin = getAdminClient();
  const { data } = await admin
    .from('client_approvals')
    .select('id, client_slug, deliverable_id, deliverable_title, deliverable_body, preview_url, proof_video_url, token, expires_at, status, changes_requested_body, signature_hash, responded_at')
    .eq('token', token)
    .maybeSingle();
  return data;
}

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const row = await fetchApproval(token);

  if (!row) {
    notFound();
  }

  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is deterministic at render time
  const expired = new Date(row.expires_at).getTime() < Date.now();
  const isPending = row.status === 'pending' && !expired;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#dc143c] rounded" />
            <span className="font-semibold">Unite-Group</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-400 text-sm">Approval Portal</span>
          </div>
          <div className="text-xs text-gray-500">
            Expires {new Date(row.expires_at).toLocaleString('en-AU')}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-6">
          <span className="text-xs uppercase tracking-wider text-gray-500">
            {row.client_slug} / {row.deliverable_id}
          </span>
        </div>
        <h1 className="text-3xl font-bold mb-6">{row.deliverable_title}</h1>

        {row.proof_video_url && (
          <section className="mb-8 bg-[#222] border border-gray-800 rounded-xl overflow-hidden">
            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={row.proof_video_url}
                controls
                className="w-full h-full"
              />
            </div>
            <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-800">
              Proof video — watch first
            </div>
          </section>
        )}

        {row.deliverable_body && (
          <section className="mb-8 bg-[#222] border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">Summary</h2>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300">
              {row.deliverable_body}
            </div>
          </section>
        )}

        {row.preview_url && (
          <section className="mb-8 bg-[#222] border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">Live preview</h2>
            <a
              href={row.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[#dc143c] hover:underline break-all"
            >
              {row.preview_url} ↗
            </a>
            <p className="text-sm text-gray-500 mt-2">
              Opens in a new tab. Click around — every link works.
            </p>
          </section>
        )}

        <section className="mb-8 bg-[#222] border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Your decision</h2>
          {!isPending ? (
            <div>
              <StatusBanner status={row.status} expired={expired} />
              {row.signature_hash && (
                <div className="mt-4 text-xs text-gray-500 font-mono break-all">
                  Signature hash: {row.signature_hash}
                  <br />
                  Responded: {row.responded_at && new Date(row.responded_at).toLocaleString('en-AU')}
                </div>
              )}
              {row.changes_requested_body && (
                <div className="mt-4 p-4 bg-[#1a1a1a] border border-gray-700 rounded">
                  <div className="text-xs text-gray-500 mb-1">Your change request:</div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">
                    {row.changes_requested_body}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ApprovalActions token={token} />
          )}
        </section>

        <footer className="text-xs text-gray-600 text-center mt-12 pb-6">
          Signed acceptance per the <em>Electronic Transactions Act 1999</em> (Cth).
          Your IP and timestamp are logged for audit.
        </footer>
      </main>
    </div>
  );
}

function StatusBanner({ status, expired }: { status: string; expired: boolean }) {
  if (expired && status === 'pending') {
    return (
      <div className="px-4 py-3 bg-gray-900 border border-gray-700 rounded text-gray-400">
        This approval has expired. Please contact Unite-Group to re-issue.
      </div>
    );
  }
  const config: Record<string, { label: string; class: string }> = {
    approved: { label: '✓ Approved', class: 'bg-green-900 border-green-700 text-green-300' },
    'changes-requested': { label: '↻ Changes requested', class: 'bg-yellow-900 border-yellow-700 text-yellow-300' },
    rejected: { label: '✗ Rejected', class: 'bg-red-900 border-red-700 text-red-300' },
  };
  const c = config[status] || { label: status, class: 'bg-gray-900 border-gray-700 text-gray-300' };
  return (
    <div className={`px-4 py-3 border rounded font-semibold ${c.class}`}>{c.label}</div>
  );
}
