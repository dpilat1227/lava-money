/**
 * Real bank-linking, via Plaid. Replaces this file's previous incarnation
 * (`BankProvider.ts`, deleted) -- a SimpleFIN-shaped design stub per
 * `docs/STRATEGY.md`'s night-4 decision. That decision is reversed; see
 * `docs/STRATEGY.md`'s dated addendum and `docs/ARCHITECTURE.md`'s
 * "mock-data seam" section for why.
 *
 * This file only talks to `lava_money_web`'s `/api/plaid/*` routes -- never
 * to Plaid directly (the secret key that exchanges tokens can never touch a
 * client). Every function here returns Plaid's own account/transaction
 * shapes (typed narrowly to the fields actually used, not the full Plaid
 * SDK surface) -- see `lib/utils/plaidMapping.ts` for turning those into
 * this app's `Account`/`Transaction` shape. Native only for now (see
 * `docs/PLAID_SETUP.md`); the web build keeps the simulated linking flow.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'lava_money.device_id';

/**
 * A UUID generated once per install, never tied to an email/name -- the
 * only "auth" the backend has for which Plaid connections belong to this
 * device. Deliberately its own AsyncStorage key, separate from the main
 * state blob `persistence.ts` manages, and NOT cleared by `resetAll()` --
 * see the note on that reducer case for the one known consequence (a
 * reset while real accounts are linked orphans their backend rows rather
 * than unlinking them; low-severity, flagged, not yet fixed).
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = globalThis.crypto?.randomUUID?.() ?? fallbackUuid();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

function fallbackUuid(): string {
  // `crypto.randomUUID` is available in the Hermes/JSC engines this app
  // ships on, but a plain fallback costs nothing and avoids a hard crash
  // if that ever isn't true on some runtime.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function apiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!url) throw new Error('EXPO_PUBLIC_API_BASE_URL is not set -- see .env.example.');
  return url.replace(/\/$/, '');
}

async function postJson<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request to ${path} failed (${res.status}).`);
  return json as T;
}

/** Narrowed to what `lib/utils/plaidMapping.ts` actually reads -- not the
 * full Plaid `AccountBase`/`Transaction` shape. */
export interface PlaidRawAccount {
  account_id: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  balances: { current: number | null; available: number | null; limit: number | null };
}

export interface PlaidRawTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  merchant_name?: string | null;
  name?: string;
  pending: boolean;
  personal_finance_category?: { primary: string; detailed: string } | null;
}

export interface PlaidRawRemovedTransaction {
  transaction_id: string;
}

/** `itemId` present -> Plaid "update mode" (re-authenticate an existing,
 * degraded connection) instead of linking a brand-new one -- see
 * create-link-token/route.ts's doc for the full mechanism. */
export async function createLinkToken(deviceId: string, itemId?: string): Promise<string> {
  const { linkToken } = await postJson<{ linkToken: string }>('/api/plaid/create-link-token', { deviceId, itemId });
  return linkToken;
}

export interface ExchangeTokenResult {
  itemId: string;
  institutionId: string;
  institutionName: string;
  accounts: PlaidRawAccount[];
  transactions: PlaidRawTransaction[];
}

export async function exchangePublicToken(input: {
  deviceId: string;
  publicToken: string;
  institutionId: string;
  institutionName: string;
}): Promise<ExchangeTokenResult> {
  return postJson<ExchangeTokenResult>('/api/plaid/exchange-token', input);
}

export interface SyncResult {
  institutionId: string;
  institutionName: string;
  accounts: PlaidRawAccount[];
  added: PlaidRawTransaction[];
  modified: PlaidRawTransaction[];
  removed: PlaidRawRemovedTransaction[];
}

export async function syncPlaidItem(deviceId: string, itemId: string): Promise<SyncResult> {
  return postJson<SyncResult>('/api/plaid/sync-transactions', { deviceId, itemId });
}

export async function removePlaidItem(deviceId: string, itemId: string): Promise<void> {
  await postJson<{ ok: true }>('/api/plaid/remove-item', { deviceId, itemId });
}
