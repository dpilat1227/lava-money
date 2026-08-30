import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

import { CATEGORIES } from '@/lib/mock/categories';
import { getInstitution, MANUAL_INSTITUTION, MOCK_INSTITUTIONS } from '@/lib/mock/institutions';
import { defaultBudgets, generateBankData } from '@/lib/mock/generator';
import { loadPersistedState, savePersistedState, clearPersistedState } from '@/lib/store/persistence';
import type {
  Account,
  Budget,
  Category,
  Institution,
  ManualAccountInput,
  ManualTransactionInput,
  RecurringSeries,
  Transaction,
} from '@/lib/types';
import type { ParsedTransactionRow } from '@/lib/utils/csv';

interface FinanceState {
  isHydrated: boolean;
  institutions: Institution[];
  accounts: Account[];
  transactions: Transaction[];
  recurringSeries: RecurringSeries[];
  budgets: Budget[];
}

const initialState: FinanceState = {
  isHydrated: false,
  institutions: [],
  accounts: [],
  transactions: [],
  recurringSeries: [],
  budgets: [],
};

type Action =
  | { type: 'HYDRATE'; payload: Omit<FinanceState, 'isHydrated'> }
  | { type: 'LINK_INSTITUTION'; institutionId: string }
  | { type: 'UNLINK_ACCOUNT'; accountId: string }
  | { type: 'CATEGORIZE_TRANSACTION'; transactionId: string; categoryId: string }
  | { type: 'SET_NOTE'; transactionId: string; note: string }
  | { type: 'SET_BUDGET'; categoryId: string; monthlyLimit: number }
  | { type: 'RESET_ALL' }
  | { type: 'ADD_MANUAL_ACCOUNT'; accountId: string; input: ManualAccountInput }
  | { type: 'UPDATE_ACCOUNT_BALANCE'; accountId: string; balance: number }
  | { type: 'ADD_TRANSACTION'; input: ManualTransactionInput }
  | { type: 'UPDATE_TRANSACTION'; transactionId: string; patch: Partial<Pick<Transaction, 'merchantName' | 'amount' | 'date' | 'categoryId'>> }
  | { type: 'DELETE_TRANSACTION'; transactionId: string }
  | { type: 'IMPORT_TRANSACTIONS'; accountId: string; rows: ParsedTransactionRow[] }
  | { type: 'REFRESH_ACCOUNT'; accountId: string }
  | { type: 'REFRESH_ALL_LINKED' };

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
      const institution = getInstitution(action.institutionId);
      const alreadyLinked = state.institutions.some(i => i.id === institution.id);
      const generated = generateBankData(action.institutionId, seedCounter++);
      const budgets = state.budgets.length > 0 ? state.budgets : defaultBudgets();
      return {
        ...state,
        institutions: alreadyLinked ? state.institutions : [...state.institutions, institution],
        accounts: [...state.accounts, ...generated.accounts],
        transactions: [...state.transactions, ...generated.transactions],
        recurringSeries: [...state.recurringSeries, ...generated.recurringSeries],
        budgets,
      };
    }

    case 'UNLINK_ACCOUNT': {
      const accounts = state.accounts.filter(a => a.id !== action.accountId);
      const transactions = state.transactions.filter(t => t.accountId !== action.accountId);
      const recurringSeries = state.recurringSeries.filter(r => r.accountId !== action.accountId);
      const remainingInstitutionIds = new Set(accounts.map(a => a.institutionId));
      const institutions = state.institutions.filter(i => remainingInstitutionIds.has(i.id));
      return { ...state, accounts, transactions, recurringSeries, institutions };
    }

    case 'CATEGORIZE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.transactionId ? { ...t, categoryId: action.categoryId } : t
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
      return {
        ...state,
        institutions: hadManualInstitution ? state.institutions : [...state.institutions, MANUAL_INSTITUTION],
        accounts: [...state.accounts, account],
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
        id: nextId('tx'),
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

    case 'IMPORT_TRANSACTIONS': {
      const imported: Transaction[] = action.rows.map(row => ({
        id: nextId('import'),
        accountId: action.accountId,
        date: row.date,
        merchantName: row.merchantName,
        rawDescription: row.merchantName.toUpperCase(),
        amount: row.amount,
        categoryId: row.amount >= 0 ? 'income' : 'other',
        entrySource: 'import',
      }));
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

    default:
      return state;
  }
}

interface FinanceContextValue extends FinanceState {
  categories: Category[];
  institutionOptions: Institution[];
  linkInstitution: (institutionId: string) => void;
  unlinkAccount: (accountId: string) => void;
  categorizeTransaction: (transactionId: string, categoryId: string) => void;
  setNote: (transactionId: string, note: string) => void;
  setBudget: (categoryId: string, monthlyLimit: number) => void;
  resetAll: () => void;
  /** Returns the new account's id so the caller can navigate straight to it. */
  addManualAccount: (input: ManualAccountInput) => string;
  updateAccountBalance: (accountId: string, balance: number) => void;
  addTransaction: (input: ManualTransactionInput) => void;
  updateTransaction: (transactionId: string, patch: Partial<Pick<Transaction, 'merchantName' | 'amount' | 'date' | 'categoryId'>>) => void;
  deleteTransaction: (transactionId: string) => void;
  importTransactions: (accountId: string, rows: ParsedTransactionRow[]) => void;
  refreshAccount: (accountId: string) => void;
  refreshAllLinked: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    loadPersistedState().then(persisted => {
      dispatch({
        type: 'HYDRATE',
        payload: persisted ?? { institutions: [], accounts: [], transactions: [], recurringSeries: [], budgets: [] },
      });
    });
  }, []);

  useEffect(() => {
    if (!state.isHydrated) return;
    savePersistedState({
      institutions: state.institutions,
      accounts: state.accounts,
      transactions: state.transactions,
      recurringSeries: state.recurringSeries,
      budgets: state.budgets,
    });
  }, [state.isHydrated, state.institutions, state.accounts, state.transactions, state.recurringSeries, state.budgets]);

  const value = useMemo<FinanceContextValue>(
    () => ({
      ...state,
      categories: CATEGORIES,
      institutionOptions: MOCK_INSTITUTIONS,
      linkInstitution: institutionId => dispatch({ type: 'LINK_INSTITUTION', institutionId }),
      unlinkAccount: accountId => dispatch({ type: 'UNLINK_ACCOUNT', accountId }),
      categorizeTransaction: (transactionId, categoryId) => dispatch({ type: 'CATEGORIZE_TRANSACTION', transactionId, categoryId }),
      setNote: (transactionId, note) => dispatch({ type: 'SET_NOTE', transactionId, note }),
      setBudget: (categoryId, monthlyLimit) => dispatch({ type: 'SET_BUDGET', categoryId, monthlyLimit }),
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
      addTransaction: input => dispatch({ type: 'ADD_TRANSACTION', input }),
      updateTransaction: (transactionId, patch) => dispatch({ type: 'UPDATE_TRANSACTION', transactionId, patch }),
      deleteTransaction: transactionId => dispatch({ type: 'DELETE_TRANSACTION', transactionId }),
      importTransactions: (accountId, rows) => dispatch({ type: 'IMPORT_TRANSACTIONS', accountId, rows }),
      refreshAccount: accountId => dispatch({ type: 'REFRESH_ACCOUNT', accountId }),
      refreshAllLinked: () => dispatch({ type: 'REFRESH_ALL_LINKED' }),
    }),
    [state]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance() must be called inside <FinanceProvider>');
  return ctx;
}
