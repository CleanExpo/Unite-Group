'use client';

import React, { useState } from 'react';

interface FounderActionModalProps {
  cardId: string;
  cardTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, data?: any) => Promise<void>;
}

export default function FounderActionModal({ 
  cardId, 
  cardTitle, 
  isOpen, 
  onClose, 
  onAction 
}: FounderActionModalProps) {
  
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P2');
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const actions = [
    { id: 'approve', label: 'Approve', color: 'emerald' },
    { id: 'reject', label: 'Reject', color: 'rose' },
    { id: 'request_changes', label: 'Request Changes', color: 'amber' },
    { id: 'block', label: 'Block', color: 'red' },
    { id: 'set_priority', label: 'Set Priority', color: 'violet' },
    { id: 'add_note', label: 'Add Note', color: 'slate' },
  ];

  const handleSubmit = async () => {
    if (!selectedAction) return;

    setLoading(true);
    try {
      const actionData = {
        action: selectedAction,
        note,
        priority,
        blockReason,
      };
      await onAction(selectedAction, actionData);
      onClose();
      setSelectedAction('');
      setNote('');
      setBlockReason('');
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111] p-8">
        <div className="mb-6">
          <div className="text-sm text-white/50">Card</div>
          <div className="font-semibold text-xl tracking-tight pr-8">{cardTitle}</div>
        </div>

        <div className="mb-6">
          <div className="text-sm text-white/60 mb-3">Choose action</div>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => setSelectedAction(action.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  selectedAction === action.id
                    ? 'bg-white text-black'
                    : 'border border-white/20 hover:bg-white/5'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {selectedAction === 'block' && (
          <div className="mb-6">
            <textarea
              placeholder="Block reason (required)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full h-20 rounded-lg border border-white/10 bg-black p-4 text-sm placeholder:text-white/40"
            />
          </div>
        )}

        {selectedAction === 'set_priority' && (
          <div className="mb-6 flex gap-2">
            {['P0', 'P1', 'P2', 'P3'].map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p as any)}
                className={`flex-1 rounded border py-2 text-sm ${
                  priority === p ? 'border-white bg-white text-black' : 'border-white/20'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {(selectedAction === 'add_note' || selectedAction === 'request_changes') && (
          <div className="mb-6">
            <textarea
              placeholder="Add your note or comments..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-24 rounded-lg border border-white/10 bg-black p-4 text-sm placeholder:text-white/40"
            />
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/20 py-3 text-sm hover:bg-white/5"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedAction || loading}
            className="flex-1 rounded-full bg-white py-3 text-sm font-medium text-black disabled:opacity-40"
          >
            {loading ? 'Processing...' : 'Confirm Action'}
          </button>
        </div>
      </div>
    </div>
  );
}
