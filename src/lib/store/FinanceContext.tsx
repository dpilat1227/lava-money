import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

import { CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/mock/categories';
import { getInstitution, MANUAL_INSTITUTION, MOCK_INSTITUTIONS } from '@/lib/mock/institutions';
import { defaultBudgets, generateBankData } from '@/lib/mock/generator';
import { loadPersistedState, savePersistedState, clearPersistedState } from '@/lib/store/persistence';
import { categorizeMerchant } from '@/lib/utils/categorizer';
import { detectRecurringSeries } from '@/lib/utils/recurring';
import type {
  Account,
  Budget,
  Category,
  CustomCategoryInput,
  Institution,
  ManualAccountInput,
  ManualTransactionInput,
  RecurringSeries,
  SavingsGoal,
  Transaction,
} from '@/lib/types';
import type { ParsedTransactionRow } from '@/lib/utils/csv';

interface FinanceState {
  isHydrated: boolean;
  institutions: Institution[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  customCategories: Category[];
  /** See lib/utils/impause.ts / PersistedState -- transaction ids that have
   * already shown their one-time "spend pause" reflection card. */
  acknowledgedPauseIds: string[];
  /** `null` -- not set yet. See lib/types.ts's SavingsGoal doc. */
  savingsGoal: SavingsGoal | null;
}

const initialState: FinanceState = {
  isHydrated: false,
  institutions: [],
  accounts: [],
  transactions: [],
  budgets: [],
  customCategories: [],
  acknowledgedPauseIds: [],
  savingsGoal: null,
};

type Action =
  | { type: 'HYDRATE'; payload: Omit<FinanceState, 'isHydrated'> }
  | { type: 'LINK_INSTITUTION'; institutionId: string }
  | { type: 'UNLINK_ACCOUNT'; accountId: string }
  | { type: 'LINK_PLAID_ITEM'; institution: Institution; accounts: Account[]; transactions: Transaction[] }
  | {
      type: 'SYNC_PLAID_TRANSACTIONS';
      plaidItemId: string;
      accounts: Account[];
      added: Transaction[];
      modified: Transaction[];
      removedIds: string[];
    }
  | { type: 'PLAID_SYNC_ERROR'; plaidItemId: string }
  | { type: 'CATEGORIZE_TRANSACTION'; transactionId: string; categoryId: string }
  | { type: 'SET_NOTE'; transactionId: string; note: string }
  | { type: 'SET_BUDGET'; categoryId: string; monthlyLimit: number }
  | { type: 'SET_SAVINGS_GOAL'; goal: SavingsGoal | null }
  | { type: 'RESET_ALL' }
  | { type: 'ADD_MANUAL_ACCOUNT'; accountId: string; input: ManualAccountInput }
  | { type: 'UPDATE_ACCOUNT_BALANCE'; accountId: string; balance: number }
  | { type: 'ADD_TRANSACTION'; transactionId: string; input: ManualTransactionInput }
  | { type: 'UPDATE_TRANSACTION'; transactionId: string; patch: Partial<Pick<Transaction, 'merchantName' | 'amount' | 'date' | 'categoryId'>> }
  | { type: 'DELETE_TRANSACTION'; transactionId: string }
  | { type: 'SET_TRANSACTION_HIDDEN'; transactionId: string; hidden: boolean }
  | { type: 'IMPORT_TRANSACTIONS'; accountId: string; rows: ParsedTransactionRow[] }
  | { type: 'REFRESH_ACCOUNT'; accountId: string }
  | { type: 'REFRESH_ALL_LINKED' }
  | { type: 'ADD_CUSTOM_CATEGORY'; category: Category }
  | { type: 'UPDATE_CUSTOM_CATEGORY'; categoryId: string; patch: Partial<Pick<Category, 'name' | 'emoji' | 'color'>> }
  | { type: 'DELETE_CUSTOM_CATEGORY'; categoryId: string }
  | { type: 'ACKNOWLEDGE_PAUSE'; transactionId: string };

let seedCounter = Date.now();
let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

/** Simulated refresh outcome for a linked account -- almost always succeeds,
 * since there's no real provider to fail against; the small failure chance
 * exists so "Refresh" doesn't feel fake-perfect and the error-state UI stays
 * reachable without waiting for the initial random rolls to produce one. A
 * failed refresh does NOT move `lastSyncedAt` forward -- that timestamp
 * means "last successful sync," so a failure has to leave it where it was. */
function simulateRefresh(previousSyncedAt: string): { syncStatus: 'synced' | 'error'; lastSyncedAt: string } {
  const failed = Math.random() < 0.08;
  return failed
    ? { syncStatus: 'error', lastSyncedAt: previousSyncedAt }
    : { syncStatus: 'synced', lastSyncedAt: new Date().toISOString() };
}

function reducer(state: FinanceState, action: Action): FinanceState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isHydrated: true };

    case 'LINK_INSTITUTION': {
      const institution = getInstitution(state.institutions, action.institutionId);
      const alreadyLinked = state.institutions.some(i => i.id === institution.id);
      // Fixed bills (rent, utilities, payroll, gym) only get generated for
      // the *first* linked institution -- see `GenerateBankDataOptions` --
      // and any subscription a previously linked institution already rolled
      // is excluded so a second bank can't independently re-pick "Netflix"
      // and produce two identical charges. Real accounts don't need this
      // (a real bank connection reports whatever it reports); this is
      // purely to keep the mock generator's *combination* of multiple
      // linked institutions believable.
      const linkedBankCount = state.institutions.filter(i => i.id !== MANUAL_INSTITUTION.id).length;
      const existingSubscriptionNames = [
        ...new Set(state.transactions.filter(t => t.categoryId === 'subscriptions').map(t => t.merchantName)),
      ];
      const generated = generateBankData(action.institutionId, seedCounter++, {
        includeFixedBills: linkedBankCount === 0,
        excludeSubscriptionNames: existingSubscriptionNames,
      });
      const budgets = state.budgets.length > 0 ? state.budgets : defaultBudgets();
      return {
        ...state,
        institutions: alreadyLinked ? state.institutions : [...state.institutions, institution],
        accounts: [...state.accounts, ...generated.accounts],
        transactions: [...state.transactions, ...generated.transactions],
        budgets,
      };
    }

    case 'UNLINK_ACCOUNT': {
      // A real Plaid Item is the unit of revocation -- one bank login can
      // yield several accounts (checking + savings from the same
      // password), and removing the Item on Plaid's side (done by the
      // caller before this dispatches, see account/[id].tsx) revokes all
      // of them together. Cascading here too keeps local state matching
      // what's actually still connected -- a lone sibling account with no
      // way to ever refresh again would be a worse outcome than removing
      // it alongside the one the user actually tapped.
      const target = state.accounts.find(a => a.id === action.accountId);
      const removedIds = new Set(
        target?.plaidItemId ? state.accounts.filter(a => a.plaidItemId === target.plaidItemId).map(a => a.id) : [action.accountId]
      );
      const accounts = state.accounts.filter(a => !removedIds.has(a.id));
      const transactions = state.transactions.filter(t => !removedIds.has(t.accountId));
      const remainingInstitutionIds = new Set(accounts.map(a => a.institutionId));
      const institutions = state.institutions.filter(i => remainingInstitutionIds.has(i.id));
      return { ...state, accounts, transactions, institutions };
    }

    case 'LINK_PLAID_ITEM': {
      const alreadyLinked = state.institutions.some(i => i.id === action.institution.id);
      const budgets = state.budgets.length > 0 ? state.budgets : defaultBudgets();
      return {
        ...state,
        institutions: alreadyLinked ? state.institutions : [...state.institutions, action.institution],
        accounts: [...state.accounts, ...action.accounts],
        transactions: [...action.transactions, ...state.transactions],
        budgets,
      };
    }

    case 'SYNC_PLAID_TRANSACTIONS': {
      const removedIds = new Set(action.removedIds);
      const modifiedById = new Map(action.modified.map(t => [t.id, t]));
      const accountUpdateById = new Map(action.accounts.map(a => [a.id, a]));
      const existingAccountIds = new Set(state.accounts.map(a => a.id));
      // Not just an update -- an Item's very first sync can come back
      // with zero accounts if Plaid hadn't finished producing them yet
      // (see exchange-token's retry comment). A later refresh is what
      // actually surfaces those accounts for the first time, so any
      // account id not already in state needs to be *added*, not silently
      // dropped because `.map` only ever touches accounts already there.
      const newAccounts = action.accounts.filter(a => !existingAccountIds.has(a.id));
      return {
        ...state,
        transactions: [
          ...action.added,
          ...state.transactions.filter(t => !removedIds.has(t.id)).map(t => modifiedById.get(t.id) ?? t),
        ],
        accounts: [
          ...state.accounts.map(a => {
            const updated = accountUpdateById.get(a.id);
            return updated ? { ...a, balance: updated.balance, creditLimit: updated.creditLimit, syncStatus: 'synced' as const, lastSyncedAt: updated.lastSyncedAt } : a;
          }),
          ...newAccounts,
        ],
      };
    }

    case 'PLAID_SYNC_ERROR': {
      return {
        ...state,
        accounts: state.accounts.map(a => (a.plaidItemId === action.plaidItemId ? { ...a, syncStatus: 'error' } : a)),
      };
    }

    case 'CATEGORIZE_TRANSACTION':
      return {
        ...state,
        // A human just picked this category -- whatever the categorizer
        // guessed (right or wrong) no longer applies, so drop it rather
        // than show a stale "why" explanation for a guess that's no longer
        // in effect.
        transactions: state.transactions.map(t =>
          t.id === action.transactionId ? { ...t, categoryId: action.categoryId, categoryGuess: undefined } : t
        ),
      };

    case 'SET_NOTE':
      return {
        ...state,
        transactions: state.transactions.map(t => (t.id === action.transactionId ? { ...t, notes: action.note } : t)),
      };

    case 'SET_BUDGET': {
      const exists = state.budgets.some(b => b.categoryId === action.categoryId);
      const budgets = exists
        ? state.budgets.map(b => (b.categoryId === action.categoryId ? { ...b, monthlyLimit: action.monthlyLimit } : b))
        : [...state.budgets, { categoryId: action.categoryId, monthlyLimit: action.monthlyLimit }];
      return { ...state, budgets };
    }

    case 'SET_SAVINGS_GOAL':
      return { ...state, savingsGoal: action.goal };

    case 'RESET_ALL':
      return { ...initialState, isHydrated: true };

    case 'ADD_MANUAL_ACCOUNT': {
      const { input } = action;
      const account: Account = {
        id: action.accountId,
        institutionId: MANUAL_INSTITUTION.id,
        name: input.name.trim() || 'Manual account',
        mask: '····',
        type: input.type,
        balance: Math.round(input.balance * 100) / 100,
        creditLimit: input.creditLimit,
        source: 'manual',
        syncStatus: 'manual',
        lastSyncedAt: new Date().toISOString(),
      };
      const hadManualInstitution = state.institutions.some(i => i.id === MANUAL_INSTITUTION.id);
      // LINK_INSTITUTION above has always seeded starter budgets for anyone
      // who links a bank; manual-only accounts never got the same
      // treatment, so someone who only adds a manual account (the actual
      // real-device screenshot that surfaced this) opens Budgets to a bare
      // wall of "add a budget" rows and nothing else -- same fix, same
      // condition (never overwrite budgets someone already set).
      const budgets = state.budgets.length > 0 ? state.budgets : defaultBudgets();
      return {
        ...state,
        institutions: hadManualInstitution ? state.institutions : [...state.institutions, MANUAL_INSTITUTION],
        accounts: [...state.accounts, account],
        budgets,
      };
    }

    case 'UPDATE_ACCOUNT_BALANCE': {
      return {
        ...state,
        accounts: state.accounts.map(a =>
          a.id === action.accountId ? { ...a, balance: Math.round(action.balance * 100) / 100, lastSyncedAt: new Date().toISOString() } : a
        ),
      };
    }

    case 'ADD_TRANSACTION': {
      const { input } = action;
      const transaction: Transaction = {
        id: action.transactionId,
        accountId: input.accountId,
        date: input.date,
        merchantName: input.merchantName.trim() || 'Transaction',
        rawDescription: input.merchantName.toUpperCase(),
        amount: Math.round(input.amount * 100) / 100,
        categoryId: input.categoryId,
        notes: input.notes,
        entrySource: 'manual',
      };
      return { ...state, transactions: [transaction, ...state.transactions] };
    }

    case 'UPDATE_TRANSACTION': {
      return {
        ...state,
        transactions: state.transactions.map(t => (t.id === action.transactionId ? { ...t, ...action.patch } : t)),
      };
    }

    case 'DELETE_TRANSACTION': {
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.transactionId) };
    }

    case 'SET_TRANSACTION_HIDDEN': {
      return {
        ...state,
        transactions: state.transactions.map(t => (t.id === action.transactionId ? { ...t, hidden: action.hidden } : t)),
      };
    }

    case 'IMPORT_TRANSACTIONS': {
      const imported: Transaction[] = action.rows.map(row => {
        const guess = categorizeMerchant(row.merchantName, row.amount);
        return {
          id: nextId('import'),
          accountId: action.accountId,
          date: row.date,
          merchantName: row.merchantName,
          rawDescription: row.merchantName.toUpperCase(),
          amount: row.amount,
          categoryId: guess.categoryId,
          entrySource: 'import',
          categoryGuess: { reason: guess.reason, confidence: guess.confidence },
        };
      });
      return { ...state, transactions: [...imported, ...state.transactions] };
    }

    case 'REFRESH_ACCOUNT': {
      return {
        ...state,
        accounts: state.accounts.map(a => {
          if (a.id !== action.accountId || a.source !== 'linked') return a;
          return { ...a, ...simulateRefresh(a.lastSyncedAt) };
        }),
      };
    }

    case 'REFRESH_ALL_LINKED': {
      return {
        ...state,
        accounts: state.accounts.map(a => (a.source === 'linked' ? { ...a, ...simulateRefresh(a.lastSyncedAt) } : a)),
      };
    }

    case 'ADD_CUSTOM_CATEGORY': {
      const nameTaken = [...CATEGORIES, ...state.customCategories].some(
        c => c.name.toLowerCase() === action.category.name.toLowerCase()
      );
      if (nameTaken) return state;
      return { ...state, customCategories: [...state.customCategories, action.category] };
    }

    case 'UPDATE_CUSTOM_CATEGORY': {
      // Design-audit-round-4: custom categories could be deleted but never
      // renamed/recolored/re-iconed after creation -- the only editable
      // thing about them was whether they existed at all. Name collisions
      // get the same case-insensitive check ADD_CUSTOM_CATEGORY uses,
      // ignoring the category's own current name so re-saving without
      // actually changing it never trips the guard.
      if (action.patch.name != null) {
        const nextName = action.patch.name.trim();
        const nameTaken = [...CATEGORIES, ...state.customCategories].some(
          c => c.id !== action.categoryId && c.name.toLowerCase() === nextName.toLowerCase()
        );
        if (nameTaken || !nextName) return state;
      }
      return {
        ...state,
        customCategories: state.customCategories.map(c =>
          c.id === action.categoryId ? { ...c, ...action.patch, name: action.patch.name?.trim() ?? c.name } : c
        ),
      };
    }

    case 'ACKNOWLEDGE_PAUSE': {
      if (state.acknowledgedPauseIds.includes(action.transactionId)) return state;
      return { ...state, acknowledgedPauseIds: [...state.acknowledgedPauseIds, action.transactionId] };
    }

    case 'DELETE_CUSTOM_CATEGORY': {
      // Reassign anything pointing at the deleted category to "other" and
      // drop its budget row, rather than leaving dangling categoryIds that
      // every downstream lookup would otherwise need a null-check for.
      return {
        ...state,
        customCategories: state.customCategories.filter(c => c.id !== action.categoryId),
        transactions: state.transactions.map(t =>
          t.categoryId === action.categoryId ? { ...t, categoryId: 'other' } : t
        ),
        budgets: state.budgets.filter(b => b.categoryId !== action.categoryId),
      };
    }

    default:
      return state;
  }
}

interface FinanceContextValue extends FinanceState {
  /** Fixed starter categories + everything in `customCategories`, merged.
   * Use this (not the static `CATEGORIES` export) for any category lookup
   * or picker list -- it's the only list that knows about categories the
   * user created. */
  categories: Category[];
  /** Same idea, filtered to `group === 'expense'` -- what every category
   * picker (add transaction, set budget, CSV row re-categorize) should
   * actually render, since custom categories are expense-only. */
  expenseCategories: Category[];
  /** Detected live from `transactions`/`accounts` on every change -- see
   * `lib/utils/recurring.ts`. Not part of persisted state. */
  recurringSeries: RecurringSeries[];
  institutionOptions: Institution[];
  linkInstitution: (institutionId: string) => void;
  unlinkAccount: (accountId: string) => void;
  /** Merges the result of a completed real Plaid Link session (see
   * `lib/hooks/usePlaidLink.ts`) into state. Purely local/synchronous --
   * every network call (create-link-token, exchange-token) already
   * happened by the time this is called, matching the rest of this
   * reducer's "no async in the reducer itself" rule. */
  linkPlaidAccounts: (input: { institution: Institution; accounts: Account[]; transactions: Transaction[] }) => void;
  /** Merges a completed `/api/plaid/sync-transactions` result. Same rule --
   * the network call already happened; this only updates state. */
  applyPlaidSync: (input: { plaidItemId: string; accounts: Account[]; added: Transaction[]; modified: Transaction[]; removedIds: string[] }) => void;
  markPlaidItemError: (plaidItemId: string) => void;
  categorizeTransaction: (transactionId: string, categoryId: string) => void;
  setNote: (transactionId: string, note: string) => void;
  setBudget: (categoryId: string, monthlyLimit: number) => void;
  /** `null` clears the goal entirely (distinct from a $0 target). */
  setSavingsGoal: (goal: SavingsGoal | null) => void;
  resetAll: () => void;
  /** Returns the new account's id so the caller can navigate straight to it. */
  addManualAccount: (input: ManualAccountInput) => string;
  updateAccountBalance: (accountId: string, balance: number) => void;
  /** Returns the new transaction's id -- callers (the manual add-transaction
   * sheet) need it to build a "spend pause" prompt for the exact row just
   * created, not just "the newest transaction," which could race against
   * something else touching state first. */
  addTransaction: (input: ManualTransactionInput) => string;
  updateTransaction: (transactionId: string, patch: Partial<Pick<Transaction, 'merchantName' | 'amount' | 'date' | 'categoryId'>>) => void;
  deleteTransaction: (transactionId: string) => void;
  /** Reversible -- see Transaction.hidden's doc for why this exists
   * alongside (not instead of) deleteTransaction. */
  hideTransaction: (transactionId: string) => void;
  unhideTransaction: (transactionId: string) => void;
  importTransactions: (accountId: string, rows: ParsedTransactionRow[]) => void;
  refreshAccount: (accountId: string) => void;
  refreshAllLinked: () => void;
  /** Returns the new category's id, or null if the name collided with an
   * existing category (case-insensitive) and nothing was created. */
  addCustomCategory: (input: CustomCategoryInput) => string | null;
  /** Returns false (and leaves state untouched) if the new name collides
   * with another existing category, same rule as `addCustomCategory`. */
  updateCustomCategory: (categoryId: string, patch: Partial<Pick<Category, 'name' | 'emoji' | 'color'>>) => boolean;
  deleteCustomCategory: (categoryId: string) => void;
  acknowledgePause: (transactionId: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    loadPersistedState().then(persisted => {
      dispatch({
        type: 'HYDRATE',
        payload: persisted ?? {
          institutions: [],
          accounts: [],
          transactions: [],
          budgets: [],
          customCategories: [],
          acknowledgedPauseIds: [],
          savingsGoal: null,
        },
      });
    });
  }, []);

  useEffect(() => {
    if (!state.isHydrated) return;
    savePersistedState({
      institutions: state.institutions,
      accounts: state.accounts,
      transactions: state.transactions,
      budgets: state.budgets,
      customCategories: state.customCategories,
      acknowledgedPauseIds: state.acknowledgedPauseIds,
      savingsGoal: state.savingsGoal,
    });
  }, [
    state.isHydrated,
    state.institutions,
    state.accounts,
    state.transactions,
    state.budgets,
    state.customCategories,
    state.acknowledgedPauseIds,
    state.savingsGoal,
  ]);

  const recurringSeries = useMemo(
    () => detectRecurringSeries(state.transactions, state.accounts),
    [state.transactions, state.accounts]
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      ...state,
      categories: [...CATEGORIES, ...state.customCategories],
      expenseCategories: [...EXPENSE_CATEGORIES, ...state.customCategories],
      recurringSeries,
      institutionOptions: MOCK_INSTITUTIONS,
      linkInstitution: institutionId => dispatch({ type: 'LINK_INSTITUTION', institutionId }),
      unlinkAccount: accountId => dispatch({ type: 'UNLINK_ACCOUNT', accountId }),
      linkPlaidAccounts: ({ institution, accounts, transactions }) => dispatch({ type: 'LINK_PLAID_ITEM', institution, accounts, transactions }),
      applyPlaidSync: ({ plaidItemId, accounts, added, modified, removedIds }) =>
        dispatch({ type: 'SYNC_PLAID_TRANSACTIONS', plaidItemId, accounts, added, modified, removedIds }),
      markPlaidItemError: plaidItemId => dispatch({ type: 'PLAID_SYNC_ERROR', plaidItemId }),
      categorizeTransaction: (transactionId, categoryId) => dispatch({ type: 'CATEGORIZE_TRANSACTION', transactionId, categoryId }),
      setNote: (transactionId, note) => dispatch({ type: 'SET_NOTE', transactionId, note }),
      setBudget: (categoryId, monthlyLimit) => dispatch({ type: 'SET_BUDGET', categoryId, monthlyLimit }),
      setSavingsGoal: goal => dispatch({ type: 'SET_SAVINGS_GOAL', goal }),
      resetAll: () => {
        clearPersistedState();
        dispatch({ type: 'RESET_ALL' });
      },
      addManualAccount: input => {
        const accountId = nextId('manual');
        dispatch({ type: 'ADD_MANUAL_ACCOUNT', accountId, input });
        return accountId;
      },
      updateAccountBalance: (accountId, balance) => dispatch({ type: 'UPDATE_ACCOUNT_BALANCE', accountId, balance }),
      addTransaction: input => {
        const transactionId = nextId('tx');
        dispatch({ type: 'ADD_TRANSACTION', transactionId, input });
        return transactionId;
      },
      updateTransaction: (transactionId, patch) => dispatch({ type: 'UPDATE_TRANSACTION', transactionId, patch }),
      deleteTransaction: transactionId => dispatch({ type: 'DELETE_TRANSACTION', transactionId }),
      hideTransaction: transactionId => dispatch({ type: 'SET_TRANSACTION_HIDDEN', transactionId, hidden: true }),
      unhideTransaction: transactionId => dispatch({ type: 'SET_TRANSACTION_HIDDEN', transactionId, hidden: false }),
      importTransactions: (accountId, rows) => dispatch({ type: 'IMPORT_TRANSACTIONS', accountId, rows }),
      refreshAccount: accountId => dispatch({ type: 'REFRESH_ACCOUNT', accountId }),
      refreshAllLinked: () => dispatch({ type: 'REFRESH_ALL_LINKED' }),
      addCustomCategory: input => {
        const name = input.name.trim();
        if (!name) return null;
        const nameTaken = [...CATEGORIES, ...state.customCategories].some(
          c => c.name.toLowerCase() === name.toLowerCase()
        );
        if (nameTaken) return null;
        const id = nextId('cat');
        dispatch({
          type: 'ADD_CUSTOM_CATEGORY',
          category: { id, name, emoji: input.emoji || '🏷️', color: input.color, group: 'expense', isCustom: true },
        });
        return id;
      },
      updateCustomCategory: (categoryId, patch) => {
        if (patch.name != null) {
          const nextName = patch.name.trim();
          if (!nextName) return false;
          const nameTaken = [...CATEGORIES, ...state.customCategories].some(
            c => c.id !== categoryId && c.name.toLowerCase() === nextName.toLowerCase()
          );
          if (nameTaken) return false;
        }
        dispatch({ type: 'UPDATE_CUSTOM_CATEGORY', categoryId, patch });
        return true;
      },
      deleteCustomCategory: categoryId => dispatch({ type: 'DELETE_CUSTOM_CATEGORY', categoryId }),
      acknowledgePause: transactionId => dispatch({ type: 'ACKNOWLEDGE_PAUSE', transactionId }),
    }),
    [state, recurringSeries]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance() must be called inside <FinanceProvider>');
  return ctx;
}
