import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Account, Budget, Category, Institution, Transaction } from '@/lib/types';

const STORAGE_KEY = 'lava_finance.v1';

export interface PersistedState {
  institutions: Institution[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  /** Defaults to `[]` via `??` below for anyone upgrading from a persisted
   * blob written before custom categories existed. */
  customCategories: Category[];
}

export async function loadPersistedState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    // Older persisted blobs predate customCategories -- default it so
    // callers never have to null-check.
    return { ...parsed, customCategories: parsed.customCategories ?? [] };
  } catch {
    return null;
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort -- losing persistence on one write shouldn't crash the app.
  }
}

export async function clearPersistedState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
