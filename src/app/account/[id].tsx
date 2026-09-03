import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountBalanceHero } from '@/components/account/AccountBalanceHero';
import { CardArt } from '@/components/account/CardArt';
import { PausePrompt } from '@/components/impause/PausePrompt';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { Amount, Atmosphere, Button, CategoryIcon, GlassSurface, Icon, Text } from '@/components/ui';
import { WebPageShell } from '@/components/web/DesktopShell';
import { Breakpoints, Colors, Radius, Spacing } from '@/constants/theme';
import { useGroupedTransactions } from '@/hooks/useFinanceSelectors';
import { useEscapeToClose } from '@/lib/hooks/useEscapeToClose';
import { usePlaidLink } from '@/lib/hooks/usePlaidLink';
import { findCategory } from '@/lib/mock/categories';
import { getInstitution } from '@/lib/mock/institutions';
import { useFinance } from '@/lib/store/FinanceContext';
import { isAssetAccount, type Transaction } from '@/lib/types';
import { parseTransactionsCsv, type ParsedTransactionRow } from '@/lib/utils/csv';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDayLabel } from '@/lib/utils/date';
import { buildPauseContext, isPauseEligible, type PauseContext } from '@/lib/utils/impause';
import { buildAccountBalanceHistory } from '@/lib/utils/netWorth';
import { presentSyncStatus } from '@/lib/utils/sync';

type SheetName = 'none' | 'add-transaction' | 'edit-balance' | 'csv-preview';

function daySubtotalLabel(txs: Transaction[]): string {
  const net = txs.reduce((s, t) => s + t.amount, 0);
  return `${formatCurrency(net, { compact: true })} net`;
}

export default function AccountDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Breakpoints.wide;
  const { accounts, institutions, transactions, categories, budgets, unlinkAccount, refreshAccount, importTransactions, acknowledgePause } = useFinance();
  const { refreshPlaidItem, unlinkPlaidItem } = usePlaidLink();
  const [sheet, setSheet] = useState<SheetName>('none');
  const [refreshing, setRefreshing] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ fileName: string; rows: ParsedTransactionRow[]; warnings: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [pausePrompt, setPausePrompt] = useState<{ transactionId: string; context: PauseContext } | null>(null);

  const account = accounts.find(a => a.id === id);
  const groups = useGroupedTransactions('', account?.id);
  const history = useMemo(() => (account ? buildAccountBalanceHistory(account, transactions, 6) : []), [account, transactions]);

  if (!account) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text variant="body" color={Colors.text3}>
            Account not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const institution = getInstitution(institutions, account.institutionId);
  const isManual = account.source === 'manual';
  const isCard = account.type === 'credit_card';
  const status = presentSyncStatus(account);
  const displayBalance = isAssetAccount(account.type) ? account.balance : -account.balance;

  const doRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Real Plaid connections sync for real; mock-linked accounts keep the
    // simulated delay/random-failure behavior they've always had.
    if (account.plaidItemId) {
      refreshPlaidItem(account.plaidItemId).finally(() => setRefreshing(false));
      return;
    }
    setTimeout(() => {
      refreshAccount(account.id);
      setRefreshing(false);
    }, 700);
  };

  const pickCsv = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      let content: string | null = null;
      if (Platform.OS === 'web' && asset.file) {
        content = await asset.file.text();
      } else if (asset.base64) {
        content = decodeBase64(asset.base64);
      } else {
        content = await FileSystem.readAsStringAsync(asset.uri);
      }
      if (!content) {
        Alert.alert('Couldn\u2019t read that file', 'Try exporting it again as a plain CSV.');
        return;
      }

      const parsed = parseTransactionsCsv(content);
      setCsvPreview({ fileName: asset.name, rows: parsed.rows, warnings: parsed.warnings });
      setSheet('csv-preview');
    } catch {
      Alert.alert('Import failed', 'Something went wrong reading that file.');
    }
  };

  const confirmImport = () => {
    if (!csvPreview) return;
    setImporting(true);
    setTimeout(() => {
      importTransactions(account.id, csvPreview.rows);
      setImporting(false);
      setSheet('none');
      setCsvPreview(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 250);
  };

  const handleTransactionAdded = (tx: Transaction) => {
    if (!isPauseEligible(tx)) return;
    const category = findCategory(categories, tx.categoryId);
    // `tx` isn't in `transactions` yet (state hasn't re-rendered from the
    // dispatch inside addTransaction()) -- splice it in ourselves so the
    // month total/occurrence count include the transaction that just
    // triggered this prompt.
    setPausePrompt({ transactionId: tx.id, context: buildPauseContext(tx, [...transactions, tx], budgets, category) });
  };

  const confirmUnlink = () => {
    const plaidItemId = account.plaidItemId;
    const message = plaidItemId
      ? `This will disconnect every account from this bank connection, not just ${account.name}. Remove it and its transaction history from this device?`
      : `Remove ${account.name} and its transaction history from this device?`;
    Alert.alert(isManual ? 'Remove account' : 'Unlink account', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isManual ? 'Remove' : 'Unlink',
        style: 'destructive',
        onPress: async () => {
          // Only remove locally once the real Item is actually revoked --
          // Plaid bills per active Item monthly, so a lost network call
          // here should mean "still shows as linked, try again," not a UI
          // that quietly moves on while the connection (and its cost)
          // keeps existing server-side with no way left to reach it.
          if (plaidItemId) {
            try {
              await unlinkPlaidItem(plaidItemId);
            } catch {
              Alert.alert('Could not unlink', 'Check your connection and try again.');
              return;
            }
          }
          unlinkAccount(account.id);
          router.back();
        },
      },
    ]);
  };

  const hero = (
    <View style={{ alignItems: 'center' }}>
      {isCard ? (
        <>
          <CardArt institutionName={institution.name} accountName={account.name} mask={account.mask} color={institution.color} />
          <View style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
            <Amount amount={displayBalance} variant="display" neutral />
            {account.creditLimit ? (
              <Text variant="caption" color={Colors.text4} style={{ marginTop: 2 }}>
                of {formatCurrency(account.creditLimit, { compact: true })} limit
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Text variant="caption" color={Colors.text3}>
            {account.name}
          </Text>
          <View style={{ marginTop: 2, width: '100%' }}>
            <AccountBalanceHero balance={displayBalance} color={institution.color} history={history} />
          </View>
          <Text variant="micro" color={Colors.text4} style={{ marginTop: Spacing.sm }}>
            {institution.name}
            {isManual ? '' : ` •••• ${account.mask}`}
          </Text>
        </>
      )}
    </View>
  );

  const body = (
    <>
      {hero}

      <View style={styles.statusRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text variant="caption" color={status.color}>
            {status.label}
          </Text>
        </View>
        {isManual ? (
          <Pressable onPress={() => setSheet('edit-balance')}>
            <Text variant="caption" color={Colors.orange} weight="semibold">
              Edit balance
            </Text>
          </Pressable>
        ) : status.actionable || refreshing ? (
          <Pressable onPress={doRefresh} disabled={refreshing} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {refreshing ? <ActivityIndicator size="small" color={Colors.orange} /> : null}
            <Text variant="caption" color={Colors.orange} weight="semibold">
              {refreshing ? 'Refreshing…' : 'Refresh now'}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={doRefresh}>
            <Text variant="caption" color={Colors.text4}>
              Refresh
            </Text>
          </Pressable>
        )}
      </View>

      {isManual && (
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
          <View style={{ flex: 1 }}>
            <Button label="+ Add transaction" variant="secondary" fullWidth onPress={() => setSheet('add-transaction')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Import CSV" variant="secondary" fullWidth onPress={pickCsv} />
          </View>
        </View>
      )}

      <Text variant="caption" color={Colors.text3} style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>
        Transactions
      </Text>
      {groups.length === 0 ? (
        <View style={styles.emptyTx}>
          <Text variant="body" color={Colors.text3} style={{ textAlign: 'center' }}>
            {isManual ? 'No transactions yet. Add one, or import a CSV export from your bank.' : 'No transactions on this account.'}
          </Text>
        </View>
      ) : (
        groups.map((group, gi) => (
          <View key={group.date} style={{ marginBottom: Spacing.md }}>
            <View style={[styles.dayHeaderRow, gi > 0 && { marginTop: Spacing.sm }]}>
              <Text variant="micro" weight="semibold" color={Colors.text3} style={styles.dayHeaderLabel}>
                {formatDayLabel(group.date)}
              </Text>
              <Text variant="micro" color={Colors.text4} style={styles.dayHeaderLabel}>
                {daySubtotalLabel(group.transactions)}
              </Text>
            </View>
            {group.transactions.map(tx => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                categories={categories}
                onPress={() => router.push(`/transaction/${tx.id}`)}
                statusNote={tx.entrySource === 'import' ? 'Imported' : tx.entrySource === 'manual' ? 'Manual' : undefined}
              />
            ))}
          </View>
        ))
      )}

      <Pressable onPress={confirmUnlink} style={styles.dangerRow}>
        <Icon name="trash" size={15} color={Colors.red} />
        <Text variant="body" color={Colors.red} weight="semibold">
          {isManual ? 'Remove account' : 'Unlink account'}
        </Text>
      </Pressable>
    </>
  );

  const sheets = (
    <>
      {sheet === 'add-transaction' && (
        <AddTransactionSheet accountId={account.id} onClose={() => setSheet('none')} onAdded={handleTransactionAdded} />
      )}
      {sheet === 'edit-balance' && <EditBalanceSheet account={account} onClose={() => setSheet('none')} />}
      {sheet === 'csv-preview' && csvPreview && (
        <CsvPreviewSheet
          preview={csvPreview}
          importing={importing}
          onCancel={() => {
            setSheet('none');
            setCsvPreview(null);
          }}
          onConfirm={confirmImport}
        />
      )}
      {pausePrompt && (
        <PausePrompt
          context={pausePrompt.context}
          onDismiss={() => {
            acknowledgePause(pausePrompt.transactionId);
            setPausePrompt(null);
          }}
        />
      )}
    </>
  );

  // Wide web only: this route is a sibling Stack.Screen outside the
  // `(tabs)` group (see app/_layout.tsx), so it used to render chrome-less
  // full-screen with no sidebar at all -- per Drew's call, this should read
  // as a real section of the app (like dashboard), not a small popup, so it
  // gets the same sidebar shell + max-width column as everywhere else
  // instead of a centered `Dialog` (contrast with transaction/[id].tsx).
  if (isWideWeb) {
    return (
      <WebPageShell>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.webScroll}>
          <Pressable onPress={() => router.back()} style={styles.webBackRow} hitSlop={8}>
            <Icon name="chevronLeft" size={13} color={Colors.text3} />
            <Text variant="caption" color={Colors.text3}>
              Back
            </Text>
          </Pressable>
          {body}
        </ScrollView>
        {sheets}
      </WebPageShell>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Atmosphere />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" color={Colors.text3}>
            Close
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}>{body}</ScrollView>

      {sheets}
    </SafeAreaView>
  );
}

function decodeBase64(base64: string): string {
  try {
    // atob exists on web; React Native's global scope also polyfills it via Expo.
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

function AddTransactionSheet({
  accountId,
  onClose,
  onAdded,
}: {
  accountId: string;
  onClose: () => void;
  onAdded: (tx: Transaction) => void;
}) {
  const { addTransaction, expenseCategories } = useFinance();
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [isSpend, setIsSpend] = useState(true);
  const [categoryId, setCategoryId] = useState(expenseCategories[0].id);

  const amountNumber = Number(amount.replace(/[^0-9.]/g, ''));
  const isValid = merchantName.trim().length > 0 && amount.trim().length > 0 && !Number.isNaN(amountNumber) && amountNumber > 0;

  return (
    <Sheet onClose={onClose} title="Add transaction">
      <FieldLabel text="Merchant" />
      <TextInput
        value={merchantName}
        onChangeText={setMerchantName}
        placeholder="e.g. Trader Joe's"
        placeholderTextColor={Colors.text4}
        style={sheetStyles.input}
        autoFocus
      />

      <FieldLabel text="Amount" style={{ marginTop: Spacing.md }} />
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Pressable onPress={() => setIsSpend(true)} style={[sheetStyles.togglePill, isSpend && sheetStyles.togglePillActive]}>
          <Text variant="caption" weight="medium" color={isSpend ? Colors.text1 : Colors.text3}>
            Spend
          </Text>
        </Pressable>
        <Pressable onPress={() => setIsSpend(false)} style={[sheetStyles.togglePill, !isSpend && sheetStyles.togglePillActive]}>
          <Text variant="caption" weight="medium" color={!isSpend ? Colors.green : Colors.text3}>
            Income
          </Text>
        </Pressable>
      </View>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        placeholderTextColor={Colors.text4}
        keyboardType="decimal-pad"
        style={[sheetStyles.input, { marginTop: Spacing.sm }]}
      />

      <FieldLabel text="Category" style={{ marginTop: Spacing.md }} />
      <View style={sheetStyles.pillRow}>
        {expenseCategories.map(c => (
          <Pressable
            key={c.id}
            onPress={() => setCategoryId(c.id)}
            style={[sheetStyles.categoryPill, c.id === categoryId && { borderColor: c.color, backgroundColor: `${c.color}18` }]}
          >
            <CategoryIcon id={c.id} emoji={c.emoji} color={c.color} size={18} />
            <Text variant="micro" weight="medium" color={c.id === categoryId ? c.color : Colors.text2}>
              {c.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ marginTop: Spacing.lg }}>
        <Button
          label="Add transaction"
          fullWidth
          disabled={!isValid}
          onPress={() => {
            const date = new Date().toISOString().slice(0, 10);
            const amount = isSpend ? -Math.abs(amountNumber) : Math.abs(amountNumber);
            const finalCategoryId = isSpend ? categoryId : 'income';
            const transactionId = addTransaction({
              accountId,
              date,
              merchantName: merchantName.trim(),
              amount,
              categoryId: finalCategoryId,
            });
            onAdded({
              id: transactionId,
              accountId,
              date,
              merchantName: merchantName.trim() || 'Transaction',
              rawDescription: merchantName.trim().toUpperCase(),
              amount,
              categoryId: finalCategoryId,
              entrySource: 'manual',
            });
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

function EditBalanceSheet({ account, onClose }: { account: { id: string; balance: number; type: string }; onClose: () => void }) {
  const { updateAccountBalance } = useFinance();
  const [value, setValue] = useState(String(account.balance));
  const isDebt = account.type === 'credit_card' || account.type === 'loan';
  const numberValue = Number(value.replace(/[^0-9.]/g, ''));
  const isValid = value.trim().length > 0 && !Number.isNaN(numberValue);

  return (
    <Sheet onClose={onClose} title="Edit balance">
      <FieldLabel text={isDebt ? 'Current balance owed' : 'Current balance'} />
      <TextInput
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        placeholderTextColor={Colors.text4}
        style={sheetStyles.input}
        autoFocus
      />
      <View style={{ marginTop: Spacing.lg }}>
        <Button
          label="Save"
          fullWidth
          disabled={!isValid}
          onPress={() => {
            updateAccountBalance(account.id, Math.abs(numberValue));
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

function CsvPreviewSheet({
  preview,
  importing,
  onCancel,
  onConfirm,
}: {
  preview: { fileName: string; rows: ParsedTransactionRow[]; warnings: string[] };
  importing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet onClose={onCancel} title="Import preview">
      <Text variant="body" color={Colors.text2}>
        {preview.fileName}
      </Text>
      <Text variant="title" style={{ marginTop: Spacing.sm }}>
        {preview.rows.length} transaction{preview.rows.length === 1 ? '' : 's'} found
      </Text>
      {preview.warnings.length > 0 && (
        <View style={{ marginTop: Spacing.sm, gap: 4 }}>
          {preview.warnings.map((w, i) => (
            <Text key={i} variant="caption" color={Colors.amber}>
              {w}
            </Text>
          ))}
        </View>
      )}
      {preview.rows.length > 0 && (
        <View style={{ marginTop: Spacing.md, gap: 6 }}>
          {preview.rows.slice(0, 4).map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" color={Colors.text3} numberOfLines={1} style={{ flex: 1 }}>
                {r.merchantName}
              </Text>
              <Amount amount={r.amount} variant="caption" />
            </View>
          ))}
          {preview.rows.length > 4 && (
            <Text variant="micro" color={Colors.text4}>
              +{preview.rows.length - 4} more
            </Text>
          )}
        </View>
      )}
      <View style={{ marginTop: Spacing.lg, flexDirection: 'row', gap: Spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button label="Cancel" variant="secondary" fullWidth onPress={onCancel} disabled={importing} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={importing ? 'Importing…' : `Import ${preview.rows.length}`}
            fullWidth
            disabled={preview.rows.length === 0 || importing}
            onPress={onConfirm}
          />
        </View>
      </View>
    </Sheet>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEscapeToClose(onClose);
  return (
    <View style={sheetStyles.overlay}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      <GlassSurface radius={Radius.xl} style={sheetStyles.sheet}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
          <Text variant="title">{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text variant="body" color={Colors.text3}>
              Close
            </Text>
          </Pressable>
        </View>
        {children}
      </GlassSurface>
    </View>
  );
}

function FieldLabel({ text, style }: { text: string; style?: object }) {
  return (
    <Text variant="caption" color={Colors.text3} style={[{ marginBottom: 6 }, style]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm, alignItems: 'flex-end' },
  centered: { alignItems: 'center', marginBottom: Spacing.lg },
  webScroll: { padding: Spacing.xl, maxWidth: 720, width: '100%', alignSelf: 'center', paddingBottom: Spacing.xxxl },
  webBackRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.lg, alignSelf: 'flex-start' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  emptyTx: { paddingVertical: Spacing.xl, paddingHorizontal: Spacing.md },
  dayHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  dayHeaderLabel: { paddingBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  dangerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.redSoft,
    alignItems: 'center',
  },
});

const sheetStyles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    // No-op on mobile (screen width is already under this) -- on web-wide
    // this was stretching edge-to-edge across the whole browser window
    // behind the sidebar shell, the same full-bleed-popup bug fixed
    // elsewhere for transaction/account/link-account modals.
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  input: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    color: Colors.text1,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  togglePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  togglePillActive: { backgroundColor: Colors.surface3, borderColor: Colors.border3 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border1,
    backgroundColor: Colors.surface2,
  },
});
