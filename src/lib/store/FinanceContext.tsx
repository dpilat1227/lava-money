import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

import { CATEGORIES } from '@/lib/mock/categories';
import { getInstitution, MOCK_INSTITUTIONS } from '@/lib/mock/institutions';
import { defaultBudgets, generateBankData } from '@/lib/mock/generator';
import { loadPersistedState, savePersistedState, clearPersistedState } from '@/lib/store/persistence';
import type { Account, Budget, Category, Institution, RecurringSeries, Transaction } from '@/lib/types';

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
  | { type: 'RESET_ALL' };

let seedCounter = Date.now();

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
