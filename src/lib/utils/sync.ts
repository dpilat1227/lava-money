import { Colors } from '@/constants/theme';
import type { Account } from '@/lib/types';

/** How long ago -> a short "2h ago" / "3d ago" style label, capped at
 * "weeks" since anything older is already flagged as an error, not
 * meaningfully described by its exact age. */
export function timeAgoShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks}w ago`;
}

export interface SyncPresentation {
  label: string;
  color: string;
  /** Whether tapping the status should offer a "Refresh now" action. */
  actionable: boolean;
}

export function presentSyncStatus(account: Account): SyncPresentation {
  if (account.source === 'manual') {
    return { label: `Manual · updated ${timeAgoShort(account.lastSyncedAt)}`, color: Colors.text4, actionable: false };
  }
  switch (account.syncStatus) {
    case 'synced':
      return { label: `Synced ${timeAgoShort(account.lastSyncedAt)}`, color: Colors.text4, actionable: false };
    case 'stale':
      return { label: `Stale · last synced ${timeAgoShort(account.lastSyncedAt)}`, color: Colors.amber, actionable: true };
    case 'error':
      return { label: `Connection issue · synced ${timeAgoShort(account.lastSyncedAt)}`, color: Colors.red, actionable: true };
    default:
      return { label: 'Synced', color: Colors.text4, actionable: false };
  }
}

/** True when an account's connection needs the user's attention -- drives
 * the Home-screen banner and the Settings "Refresh all" badge count. */
export function needsAttention(account: Account): boolean {
  return account.source === 'linked' && (account.syncStatus === 'stale' || account.syncStatus === 'error');
}
