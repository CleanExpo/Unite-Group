import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSignInGuard } from './sign-in-guard.ts';

test('sign-in guard: goes to the login page only when no change is held', () => {
  let went = 0;
  const guard = createSignInGuard(() => (went += 1));
  assert.equal(guard.signedOut(), true);
  assert.equal(went, 1);
  guard.setUnsaved(true);
  assert.equal(guard.hasUnsaved(), true);
  assert.equal(guard.signedOut(), false);
  assert.equal(went, 1);
  guard.setUnsaved(false);
  assert.equal(guard.signedOut(), true);
  assert.equal(went, 2);
});
