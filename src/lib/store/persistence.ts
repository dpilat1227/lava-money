import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Account, Budget, Institution, RecurringSeries, Transaction } from '@/lib/types';

const STORAGE_KEY = 'lava_finance.v1';

export interface PersistedState {
  institutions: Institution[];
  accounts: Account[];
  transactions: Transaction[];
  recurringSeries: RecurringSeries[];
  budgets: Budget[];
}

export async function loadPersistedState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
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
