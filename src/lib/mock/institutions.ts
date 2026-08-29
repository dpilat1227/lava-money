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

export function getInstitution(id: string): Institution {
  return MOCK_INSTITUTIONS.find(i => i.id === id) ?? MOCK_INSTITUTIONS[0];
}
