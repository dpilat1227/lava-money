import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { getCategory } from '@/lib/mock/categories';
import { getInstitution } from '@/lib/mock/institutions';
import type { Account, Budget, Institution, RecurringSeries, Transaction } from '@/lib/types';
import { transactionsToCsv } from '@/lib/utils/csv';

/**
 * The whole point of the data-ownership stance is hollow if there's no real
 * way to get your data back out. This is that way -- a full JSON snapshot
 * (everything the app has stored) and a plain CSV of just the transactions,
 * both written to a temp file and handed to the OS share sheet so the user
 * decides where it goes (Files, email, AirDrop, etc.) rather than the app
 * silently uploading it anywhere.
 */
export interface ExportableState {
  institutions: Institution[];
  accounts: Account[];
  transactions: Transaction[];
  recurringSeries: RecurringSeries[];
  budgets: Budget[];
}

async function shareTextFile(fileName: string, mimeType: string, content: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  const canShare = await Sharing.isAvailableAsync();
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, content);
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: fileName });
    return true;
  }
  return false;
}

export async function exportAllDataAsJson(state: ExportableState): Promise<boolean> {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Lava Finance',
    version: 1,
    ...state,
  };
  return shareTextFile('lava-finance-export.json', 'application/json', JSON.stringify(payload, null, 2));
}

export async function exportTransactionsAsCsv(transactions: Transaction[], accounts: Account[]): Promise<boolean> {
  const accountById = new Map(accounts.map(a => [a.id, a]));
  const rows = [...transactions]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(t => {
      const account = accountById.get(t.accountId);
      return {
        date: t.date,
        merchantName: t.merchantName,
        amount: t.amount,
        categoryName: getCategory(t.categoryId).name,
        accountName: account ? `${account.name} (${getInstitution(account.institutionId).name})` : 'Unknown',
      };
    });
  return shareTextFile('lava-finance-transactions.csv', 'text/csv', transactionsToCsv(rows));
}
