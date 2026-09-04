import { createPlaidLinkSession } from 'react-native-plaid-link-sdk';
import { useCallback, useState } from 'react';

import { ChartPalette } from '@/constants/theme';
import { useFinance } from '@/lib/store/FinanceContext';
import { createLinkToken, exchangePublicToken, getOrCreateDeviceId, removePlaidItem, syncPlaidItem } from '@/lib/providers/plaidProvider';
import { mapPlaidAccounts, mapPlaidTransactions } from '@/lib/utils/plaidMapping';

/**
 * The real "Connect a bank" flow: create-link-token -> open Plaid Link ->
 * exchange-token -> merge into FinanceContext. Every step after the user
 * completes Link happens here so the calling screen only needs to call
 * `linkBank()` and handle the outcome, not orchestrate five async steps
 * itself.
 *
 * `.native.ts` -- Metro/Expo resolve this file only on iOS/Android; see
 * `usePlaidLink.web.ts` for the platform this SDK doesn't support (see
 * docs/PLAID_SETUP.md: real linking is native-only for v1). Splitting the
 * file, not just branching inside one, keeps `react-native-plaid-link-sdk`
 * (native-code-only, no web build) out of the web bundle's import graph
 * entirely -- a runtime `Platform.OS` check alone doesn't prevent a
 * bundler from still trying to resolve a static top-level import.
 */

/** No real institution logo/color available from Plaid without a second
 * API call this app doesn't need for anything else -- hashing the
 * institution id into the same `ChartPalette` used for category colors
 * gives each real bank a stable, distinct accent instead of every real
 * connection defaulting to the same neutral tone. */
function colorForInstitution(institutionId: string): string {
  let hash = 0;
  for (let i = 0; i < institutionId.length; i++) hash = (hash * 31 + institutionId.charCodeAt(i)) >>> 0;
  return ChartPalette[hash % ChartPalette.length];
}

export type PlaidLinkOutcome = { ok: true } | { ok: false; cancelled?: boolean; error?: string };

export function usePlaidLink() {
  const { linkPlaidAccounts, applyPlaidSync, markPlaidItemError } = useFinance();
  const [linking, setLinking] = useState(false);

  const linkBank = useCallback(async (): Promise<PlaidLinkOutcome> => {
    setLinking(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const linkToken = await createLinkToken(deviceId);

      return await new Promise<PlaidLinkOutcome>(resolve => {
        createPlaidLinkSession({
          token: linkToken,
          onSuccess: async success => {
            try {
              const institutionId = success.metadata.institution?.id ?? 'unknown';
              const institutionName = success.metadata.institution?.name ?? 'Linked bank';
              const result = await exchangePublicToken({ deviceId, publicToken: success.publicToken, institutionId, institutionName });
              linkPlaidAccounts({
                institution: { id: institutionId, name: institutionName, color: colorForInstitution(institutionId) },
                accounts: mapPlaidAccounts(result.accounts, institutionId, result.itemId),
                transactions: mapPlaidTransactions(result.transactions),
              });
              resolve({ ok: true });
            } catch (err) {
              resolve({ ok: false, error: err instanceof Error ? err.message : 'Could not finish linking that account.' });
            }
          },
          onExit: exit => {
            resolve(exit.error ? { ok: false, error: exit.error.displayMessage ?? exit.error.errorMessage } : { ok: false, cancelled: true });
          },
          onEvent: () => {},
        }).then(session => session.open());
      });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not start linking.' };
    } finally {
      setLinking(false);
    }
  }, [linkPlaidAccounts]);

  /** One Plaid Item at a time -- several accounts can share one
   * `plaidItemId` (one bank login, several accounts), so this already
   * refreshes every account under it in a single Plaid API call, not just
   * the one the caller may have had in hand. Refreshing *all* linked Items
   * at once (e.g. for a future Home pull-to-refresh) is just
   * `Promise.all(uniqueItemIds.map(refreshPlaidItem))` from a caller that
   * has the account list -- not built out here since nothing needs it yet. */
  // Returns whether the sync actually succeeded -- `reauthenticate` below
  // needs this to know whether a successful re-auth was *also* followed
  // by a successful sync, rather than reporting "reconnected" for a
  // reconnect whose immediate follow-up sync silently failed.
  const refreshPlaidItem = useCallback(
    async (plaidItemId: string): Promise<boolean> => {
      const deviceId = await getOrCreateDeviceId();
      try {
        const result = await syncPlaidItem(deviceId, plaidItemId);
        // `institutionId` comes straight from the backend's stored Item
        // row, not a lookup through `accounts` -- if the initial link
        // came back before Plaid had finished producing this Item's first
        // account (see exchange-token's retry comment), there'd be no
        // existing account to derive it from yet on exactly this call.
        applyPlaidSync({
          plaidItemId,
          accounts: mapPlaidAccounts(result.accounts, result.institutionId, plaidItemId),
          added: mapPlaidTransactions(result.added),
          modified: mapPlaidTransactions(result.modified),
          removedIds: result.removed.map(r => r.transaction_id),
        });
        return true;
      } catch {
        markPlaidItemError(plaidItemId);
        return false;
      }
    },
    [applyPlaidSync, markPlaidItemError]
  );

  const unlinkPlaidItem = useCallback(async (plaidItemId: string) => {
    const deviceId = await getOrCreateDeviceId();
    await removePlaidItem(deviceId, plaidItemId);
  }, []);

  /**
   * Design-audit-round-4: the only recovery path a degraded ("Connection
   * issue") item had before this was `refreshPlaidItem` retrying
   * `transactions/sync` -- which, for the actual failure mode that status
   * means (ITEM_LOGIN_REQUIRED: the bank needs fresh credentials), just
   * fails again and again with no user-facing explanation. Plaid's
   * "update mode" is the real fix -- same Link UI, but scoped to
   * re-authenticating one existing Item instead of creating a new one
   * (see create-link-token/route.ts). `onSuccess` re-syncs immediately so
   * the account flips back to "synced" in the same flow, instead of
   * requiring a second manual refresh after reconnecting.
   */
  const reauthenticate = useCallback(
    async (plaidItemId: string): Promise<PlaidLinkOutcome> => {
      setLinking(true);
      try {
        const deviceId = await getOrCreateDeviceId();
        const linkToken = await createLinkToken(deviceId, plaidItemId);

        return await new Promise<PlaidLinkOutcome>(resolve => {
          createPlaidLinkSession({
            token: linkToken,
            onSuccess: async () => {
              const synced = await refreshPlaidItem(plaidItemId);
              resolve(synced ? { ok: true } : { ok: false, error: 'Reconnected, but the next sync failed -- try refreshing again.' });
            },
            onExit: exit => {
              resolve(exit.error ? { ok: false, error: exit.error.displayMessage ?? exit.error.errorMessage } : { ok: false, cancelled: true });
            },
            onEvent: () => {},
          }).then(session => session.open());
        });
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Could not start reconnecting.' };
      } finally {
        setLinking(false);
      }
    },
    [refreshPlaidItem]
  );

  return { linking, linkBank, refreshPlaidItem, unlinkPlaidItem, reauthenticate };
}
