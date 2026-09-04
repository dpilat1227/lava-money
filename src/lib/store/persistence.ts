import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Account, Budget, Category, Institution, SavingsGoal, Transaction } from '@/lib/types';

// Bumped from 'lava_finance.v1' at the Lava Money rename -- deliberately not
// a migration (pre-launch demo data, nothing worth carrying forward), so
// anyone with the old key just gets a fresh onboarding flow instead of a
// silent, easy-to-miss "state didn't load" bug.
const STORAGE_KEY = 'lava_money.v1';

export interface PersistedState {
  institutions: Institution[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  /** Defaults to `[]` via `??` below for anyone upgrading from a persisted
   * blob written before custom categories existed. */
  customCategories: Category[];
  /** Transaction ids that already got a "spend pause" reflection card (see
   * lib/utils/impause.ts) -- persisted so acknowledging one doesn't come
   * back on next app open. Defaults to `[]` for pre-Impause blobs. */
  acknowledgedPauseIds: string[];
  /** `null` means "not set yet" -- defaults to `null` via `??` below for
   * anyone upgrading from a persisted blob written before this existed. */
  savingsGoal: SavingsGoal | null;
}

export async function loadPersistedState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    // Older persisted blobs predate customCategories/acknowledgedPauseIds --
    // default them so callers never have to null-check.
    return {
      ...parsed,
      customCategories: parsed.customCategories ?? [],
      acknowledgedPauseIds: parsed.acknowledgedPauseIds ?? [],
      savingsGoal: parsed.savingsGoal ?? null,
    };
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
