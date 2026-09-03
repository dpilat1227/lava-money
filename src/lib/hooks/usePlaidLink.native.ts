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
  const refreshPlaidItem = useCallback(
    async (plaidItemId: string) => {
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
      } catch {
        markPlaidItemError(plaidItemId);
      }
    },
    [applyPlaidSync, markPlaidItemError]
  );

  const unlinkPlaidItem = useCallback(async (plaidItemId: string) => {
    const deviceId = await getOrCreateDeviceId();
    await removePlaidItem(deviceId, plaidItemId);
  }, []);

  return { linking, linkBank, refreshPlaidItem, unlinkPlaidItem };
}
