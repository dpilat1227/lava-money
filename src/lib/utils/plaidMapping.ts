/**
 * Plaid's account/transaction shapes -> this app's `Account`/`Transaction`
 * (see `lib/types.ts`'s header comment on why the latter already leans
 * Plaid-adjacent). Two things this file exists specifically to get right:
 *
 * 1. Sign convention -- Plaid returns positive `amount` for money leaving
 *    an account, negative for money coming in. This app uses the opposite,
 *    intuitive convention everywhere internally. Negate here, at the
 *    adapter boundary, never anywhere else.
 * 2. Category assignment -- Plaid's own `personal_finance_category` is
 *    deliberately *not* trusted directly. Every Plaid transaction runs
 *    through the same rules-based `categorizeMerchant()` CSV import uses,
 *    for the same reason: a category with a visible, correctable "why" the
 *    user can see beats an opaque third-party taxonomy, even when that
 *    taxonomy is reasonable. `Transaction.categoryGuess` gets set exactly
 *    like an imported row's does.
 */
import { categorizeMerchant } from '@/lib/utils/categorizer';
import type { Account, AccountType, Transaction } from '@/lib/types';
import type { PlaidRawAccount, PlaidRawTransaction } from '@/lib/providers/plaidProvider';

function mapAccountType(plaidType: string, plaidSubtype: string | null): AccountType {
  if (plaidType === 'credit') return 'credit_card';
  if (plaidType === 'investment') return 'investment';
  if (plaidType === 'loan') return 'loan';
  if (plaidType === 'depository') return plaidSubtype === 'savings' ? 'savings' : 'checking';
  return 'cash';
}

export function mapPlaidAccount(raw: PlaidRawAccount, institutionId: string, plaidItemId: string): Account {
  const now = new Date().toISOString();
  return {
    id: raw.account_id,
    institutionId,
    name: raw.name,
    mask: raw.mask ?? '····',
    type: mapAccountType(raw.type, raw.subtype),
    // Plaid's `balances.current` is already a positive magnitude for
    // credit/loan accounts (what's owed) the same way this app's `balance`
    // field expects -- no sign flip needed here, only for transaction
    // amounts (see file header).
    balance: raw.balances.current ?? 0,
    creditLimit: raw.balances.limit ?? undefined,
    source: 'linked',
    syncStatus: 'synced',
    lastSyncedAt: now,
    plaidItemId,
  };
}

export function mapPlaidTransaction(raw: PlaidRawTransaction): Transaction {
  const merchantName = raw.merchant_name?.trim() || raw.name?.trim() || 'Transaction';
  const rawDescription = raw.name ?? merchantName;
  const amount = -raw.amount; // see file header
  const guess = categorizeMerchant(merchantName, amount, rawDescription);

  return {
    id: raw.transaction_id,
    accountId: raw.account_id,
    date: raw.date,
    merchantName,
    rawDescription,
    amount,
    categoryId: guess.categoryId,
    isPending: raw.pending || undefined,
    entrySource: 'linked',
    categoryGuess: { reason: guess.reason, confidence: guess.confidence },
  };
}

export function mapPlaidAccounts(raw: PlaidRawAccount[], institutionId: string, plaidItemId: string): Account[] {
  return raw.map(a => mapPlaidAccount(a, institutionId, plaidItemId));
}

export function mapPlaidTransactions(raw: PlaidRawTransaction[]): Transaction[] {
  return raw.map(mapPlaidTransaction);
}
