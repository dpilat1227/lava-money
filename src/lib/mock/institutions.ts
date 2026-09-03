import { Colors } from '@/constants/theme';
import type { Institution } from '@/lib/types';

/**
 * Fictional institutions, deliberately not real bank names/logos -- this is
 * a mock linking flow (see lib/store/linking.ts), not a Plaid integration,
 * and shipping something that looks like it's really linked to Chase or
 * BofA would be misleading even in a demo.
 */
export const MOCK_INSTITUTIONS: Institution[] = [
  { id: 'north-star-bank', name: 'North Star Bank', color: Colors.blue },
  { id: 'harbor-credit-union', name: 'Harbor Credit Union', color: Colors.green },
  { id: 'basalt-financial', name: 'Basalt Financial', color: Colors.orange },
  { id: 'meridian-trust', name: 'Meridian Trust', color: Colors.purple },
  { id: 'anchor-savings', name: 'Anchor Savings', color: Colors.pink },
  { id: 'ledger-one', name: 'Ledger One', color: Colors.amber },
];

/**
 * Not a bank -- the placeholder "institution" every manually-added account
 * belongs to, so the rest of the app (which groups accounts by
 * institutionId) doesn't need a separate code path for accounts that were
 * never linked to anything. Rendered in the UI as "Manually tracked," never
 * as if it were a real financial institution.
 */
export const MANUAL_INSTITUTION: Institution = {
  id: 'manual-entry',
  name: 'Manually tracked',
  color: Colors.text3,
};

/**
 * `institutions` is `useFinance()`'s merged list (fixed mock list + any
 * real Plaid institutions linked this session -- see `LINK_PLAID_ITEM` in
 * FinanceContext.tsx) -- same "pass the caller's merged list in" pattern
 * `findCategory(categories, id)` already uses for custom categories, and
 * for the same reason: a static lookup against only the fixed mock list
 * would silently resolve every real bank to whichever mock institution
 * happens to be first, which is worse than an honest "not found" fallback.
 */
export function getInstitution(institutions: Institution[], id: string): Institution {
  if (id === MANUAL_INSTITUTION.id) return MANUAL_INSTITUTION;
  return institutions.find(i => i.id === id) ?? MOCK_INSTITUTIONS.find(i => i.id === id) ?? MOCK_INSTITUTIONS[0];
}
