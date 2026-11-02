// The one sign-in guard for this window, shared by the layout writer and the fleet poll.
import { createSignInGuard } from '../shared/sign-in-guard.ts';

export const signIn = createSignInGuard(() => window.location.assign('/login'));
