/**
 * Web stub -- real Plaid linking is native-only for v1 (see
 * docs/PLAID_SETUP.md); the web build keeps the simulated linking flow.
 * Matches `usePlaidLink.native.ts`'s exported shape so any calling code
 * can import `usePlaidLink` without a platform branch of its own, even
 * though the web UI should never actually surface a path that calls
 * `linkBank()` here.
 */
export type PlaidLinkOutcome = { ok: true } | { ok: false; cancelled?: boolean; error?: string };

export function usePlaidLink() {
  const unavailable = async (): Promise<PlaidLinkOutcome> => ({ ok: false, error: 'Real bank linking is only available in the mobile app right now.' });
  return {
    linking: false,
    linkBank: unavailable,
    refreshAllPlaidItems: async () => {},
    unlinkPlaidItem: async () => {},
    // Matches usePlaidLink.native.ts's shape (design-audit-round-4's
    // update-mode re-auth) -- web never has a real degraded Plaid item to
    // reconnect, so this is unreachable in practice, same as `linkBank`.
    reauthenticate: unavailable,
  };
}
