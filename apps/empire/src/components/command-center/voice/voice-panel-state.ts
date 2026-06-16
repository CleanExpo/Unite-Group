// Margot voice panel state machine.
//
// The rendered React component (`MargotVoicePanel.tsx`) drives a small
// state machine through four states:
//
//   idle -> loading -> (ready | error)
//
// `error -> loading` is allowed so the operator can retry without a page
// reload; `ready -> loading` is intentionally NOT allowed because once the
// ElevenLabs ConvAI widget is mounted on a signed URL it must not be
// knocked off by a stale fetch resolution (this is the regression that
// originally motivated the reducer extraction).
//
// The reducer is intentionally pure: it takes a `VoicePanelState` snapshot
// plus a `VoicePanelEvent` and returns a fresh snapshot. All side effects
// (the actual `fetch` call, the `mapMargotFailure` classification) live in
// the component; the reducer only decides the next state, the next
// `signedUrl` value, and the next `failure` render payload.

import { mapMargotFailure, type FailureRender } from './failure-taxonomy';

export type VoicePanelState = 'idle' | 'loading' | 'ready' | 'error';

export const initialVoicePanelState: VoicePanelState = 'idle';

export interface VoicePanelSnapshot {
  state: VoicePanelState;
  signedUrl: string;
  failure: FailureRender | null;
}

export const initialVoicePanelSnapshot: VoicePanelSnapshot = {
  state: initialVoicePanelState,
  signedUrl: '',
  failure: null,
};

/**
 * The result of the signed-url fetch — what the component hands to the
 * reducer after `await fetch(...)` resolves or throws.
 */
export interface VoicePanelFetchResult {
  ok: boolean;
  status: number | null;
  errorCode: string | null;
  signedUrl: string | null;
}

export type VoicePanelEvent =
  | { kind: 'START' }
  | { kind: 'FETCH_RESOLVED'; result: VoicePanelFetchResult };

/**
 * Pure state-machine reducer. See the test file for the full contract
 * (`src/components/command-center/voice/__tests__/voice-panel-state.test.ts`).
 */
export function reduceVoicePanelState(
  prev: VoicePanelSnapshot,
  event: VoicePanelEvent,
): VoicePanelSnapshot {
  if (event.kind === 'START') {
    // Once ready, keep the mounted widget and signed URL stable; duplicate
    // clicks or stale UI events must not tear down an active voice session.
    if (prev.state === 'ready') {
      return prev;
    }

    // Allow START for idle/error retry and for loading idempotency. The UI
    // also disables the button while loading, so duplicate START is a
    // defensive state-machine guard rather than the normal UX path.
    return {
      state: 'loading',
      signedUrl: '',
      failure: null,
    };
  }

  // event.kind === 'FETCH_RESOLVED'
  // A stale event from a previous mount must not resurrect a fresh panel
  // (e.g. a slow signed-url fetch resolving after the operator has
  // already closed and re-opened the panel).
  if (prev.state !== 'loading') {
    return prev;
  }

  const { result } = event;

  if (result.ok && result.signedUrl) {
    return {
      state: 'ready',
      signedUrl: result.signedUrl,
      failure: null,
    };
  }

  return {
    state: 'error',
    signedUrl: '',
    failure: mapMargotFailure(result.status, result.errorCode),
  };
}
