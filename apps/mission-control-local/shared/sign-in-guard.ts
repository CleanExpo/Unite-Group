// Decides whether a signed-out reply may send the window to the login page. Leaving the
// page loses anything not saved, so while this window holds a layout change that is not
// saved, it may not: the user decides first.

export function createSignInGuard(navigate: () => void) {
  let unsaved = false;
  return {
    setUnsaved(value: boolean): void {
      unsaved = value;
    },
    hasUnsaved(): boolean {
      return unsaved;
    },
    /** Goes to the login page unless a change is held. Returns whether it went. */
    signedOut(): boolean {
      if (unsaved) return false;
      navigate();
      return true;
    },
  };
}

export type SignInGuard = ReturnType<typeof createSignInGuard>;
