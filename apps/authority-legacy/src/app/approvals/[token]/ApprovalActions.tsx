"use client";

import { useState } from 'react';

export default function ApprovalActions({ token }: { token: string }) {
  const [mode, setMode] = useState<'idle' | 'changes' | 'done'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [changesBody, setChangesBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(status: 'approved' | 'changes-requested' | 'rejected') {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/approvals/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(status === 'changes-requested' ? { changes_requested_body: changesBody } : {}),
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || `HTTP ${r.status}`);
        setSubmitting(false);
        return;
      }
      setMode('done');
      window.location.reload();
    } catch (e: any) {
      setError(String(e?.message || e));
      setSubmitting(false);
    }
  }

  if (mode === 'done') {
    return <div className="text-green-400">Recorded. Reloading…</div>;
  }

  if (mode === 'changes') {
    return (
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-400 mb-1 block">What needs to change?</span>
          <textarea
            value={changesBody}
            onChange={e => setChangesBody(e.target.value)}
            rows={6}
            required
            placeholder="Be specific — the team will use this as the brief for the next iteration."
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 font-sans"
          />
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => submit('changes-requested')}
            disabled={changesBody.length < 5 || submitting}
            className="bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded font-semibold"
          >
            Send change request
          </button>
          <button
            onClick={() => setMode('idle')}
            className="text-gray-400 hover:text-white px-4 py-2"
          >
            Cancel
          </button>
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <button
        onClick={() => submit('approved')}
        disabled={submitting}
        className="bg-green-700 hover:bg-green-600 disabled:opacity-40 px-5 py-2 rounded font-semibold"
      >
        ✓ Approve
      </button>
      <button
        onClick={() => setMode('changes')}
        disabled={submitting}
        className="bg-[#222] hover:bg-[#2a2a2a] border border-gray-700 disabled:opacity-40 px-5 py-2 rounded font-semibold"
      >
        ↻ Request changes
      </button>
      <button
        onClick={() => submit('rejected')}
        disabled={submitting}
        className="text-red-400 hover:text-red-300 disabled:opacity-40 px-3 py-2"
      >
        Reject
      </button>
      {error && <div className="text-red-400 text-sm w-full">{error}</div>}
    </div>
  );
}
